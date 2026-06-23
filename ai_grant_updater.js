/**
 * JHTV AI Grant Deadline Updater
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses the Claude API (tool use) to visit each of the 18 non-API grant program
 * websites and extract current deadline / status data. Replaces the manual
 * Claude Code skill (grant-deadline-updater.skill) for scheduled GitHub Actions runs.
 *
 * Grants covered: the same 18 programs handled by scrape_grants.js
 *   Maryland:         mii, mscrf, builder, inclusion, rbii, mmf
 *   Federal (static): arpah, barda, carbx, fda_cdc, va_sbir
 *   Disease Fdn:      aha, alz, mjff, cfft
 *   Private Fdn:      wellcome, bwf, coulter
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 * Run:       node ai_grant_updater.js
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const https     = require('https');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

const client  = new Anthropic();
const outPath = path.join(__dirname, 'grants_live.json');

// ── Grant list (mirrors SKILL.md) ─────────────────────────────────────────────
const GRANTS = [
  { id: 'mii',       name: 'TEDCO Maryland Innovation Initiative',       url: 'https://www.tedco.md/program/maryland-innovation-initiative/',            hint: 'Quarterly deadlines: Jan 15, Apr 15, Jul 15, Oct 15 — confirm still current' },
  { id: 'mii_joint',name: 'MII – Tech Assessment (Joint)',             url: 'https://www.tedco.md/program/maryland-innovation-initiative/',            hint: 'Same quarterly deadlines as MII (Jan 15, Apr 15, Jul 15, Oct 15) — confirm for joint USM track' },
  { id: 'mii_cf',   name: 'MII – Company Formation',                   url: 'https://www.tedco.md/program/maryland-innovation-initiative/',            hint: 'Same quarterly deadlines as MII (Jan 15, Apr 15, Jul 15, Oct 15) — confirm for company formation track' },
  { id: 'bii',      name: 'Baltimore Innovation Initiative (BII)',     url: 'https://www.tedco.md/program/baltimore-innovation-initiative/',           hint: 'BII has its own RFA timeline, not quarterly — check for current open cycle and LOI/application deadline' },
  { id: 'sbir_match',name: 'TEDCO SBIR/STTR Matching Funds',          url: 'https://www.tedco.md/program/maryland-sbir-sttr-incentive-program/',      hint: 'Own quarterly application windows — look for current open window dates on TEDCO site' },
  { id: 'mscrf',    name: 'Maryland Stem Cell Research Fund',            url: 'https://www.mscrf.org/funding-opportunities',                            hint: 'Current funding cycle, LOI or application deadline' },
  { id: 'builder',  name: 'TEDCO Pre-Seed Builder Fund',                 url: 'https://www.tedco.md/program/social-impact-funds/',                       hint: 'Rolling equity — confirm program still active' },
  { id: 'inclusion',name: 'TEDCO Inclusion Fund',                        url: 'https://www.tedco.md/program/social-impact-funds/',                       hint: 'Rolling equity — confirm program still active' },
  { id: 'rbii',     name: 'TEDCO Rural Business Innovation Initiative',  url: 'https://www.tedco.md/program/rural-business-innovation-initiative/',      hint: 'Rolling — contact regional mentor' },
  { id: 'mmf',      name: 'Maryland Momentum Fund',                      url: 'https://www.usmd.edu/momentum/',                                          hint: 'Cycle dates, rolling vs fixed' },
  { id: 'arpah',    name: 'ARPA-H SBIR/STTR',                            url: 'https://arpa-h.gov/explore-funding/sbir-sttr',                            hint: 'Open solicitations, current deadline' },
  { id: 'barda',    name: 'BARDA / BARDA DRIVe',                         url: 'https://medicalcountermeasures.gov/barda/funding',                        hint: 'Rolling BAA status, any specific windows' },
  { id: 'carbx',    name: 'CARB-X Antimicrobial Accelerator',            url: 'https://carb-x.org/apply/',                                               hint: 'Current round number, LOI/application deadline' },
  { id: 'fda_cdc',  name: 'FDA/CDC Joint SBIR',                          url: 'https://seed.nih.gov/funding-opportunities/fda-sbir-sttr',                hint: 'Open NOFO, deadline' },
  { id: 'va_sbir',  name: 'VA SBIR/STTR',                                url: 'https://www.va.gov/orod/sbirsttr.asp',                                    hint: 'Current solicitation cycle' },
  { id: 'aha',      name: 'American Heart Association Grants',            url: 'https://professional.heart.org/en/research-programs/aha-funding-opportunities', hint: 'Current cycle deadlines by mechanism' },
  { id: 'alz',      name: "Alzheimer's Association Research Grants",      url: 'https://www.alz.org/research/for_researchers/grants_programs',            hint: 'LOI deadline, application deadline, current cycle year' },
  { id: 'mjff',     name: 'Michael J. Fox Foundation',                   url: 'https://www.michaeljfox.org/grants',                                      hint: 'Rolling pre-proposals, any specific open cycles' },
  { id: 'cfft',     name: 'Cystic Fibrosis Foundation Therapeutics',     url: 'https://www.cff.org/researchers',                                         hint: 'Rolling contract model, current intake status' },
  { id: 'wellcome', name: 'Wellcome Leap Health Programs',               url: 'https://wellcomeleap.org/programs/',                                       hint: 'Which programs currently open, deadlines' },
  { id: 'bwf',      name: 'Burroughs Wellcome Fund',                     url: 'https://www.bwfund.org/grant-programs/',                                  hint: 'Which mechanisms open, annual cycle dates' },
  { id: 'coulter',  name: 'JHU-Coulter Translational Partnership',       url: 'https://cbid.bme.jhu.edu/research/translational-research/coulter-program/', hint: 'Annual cycle, LOI or application deadline' },
];

const SYSTEM_PROMPT = `You are an analyst updating live deadline data for the JHTV Grant Finder tool, used by Johns Hopkins Technology Ventures to help biotech startup founders.

Your job: visit a grant program's website using the web_fetch tool, read it like an expert analyst, and return structured JSON with the current deadline and status.

Rules:
- Follow one level of links if needed (e.g., "Apply here" → deadline page). Don't go deeper.
- Distinguish "rolling" (always accepting) from "unknown" (couldn't determine). These are different.
- Be honest: if you can't find the deadline, say so via "unknown" + a note.
- Include context in deadlineLabel beyond just a date (e.g., LOI vs full application).
- Return ONLY valid JSON in the required schema. No explanation text outside the JSON.

Output schema (return ONLY this JSON object):
{
  "status": "open | rolling | closed | unknown",
  "nextDeadline": "Mon DD, YYYY",
  "daysUntil": 45,
  "deadlineLabel": "Human-readable string for founders",
  "notes": "Optional clarification",
  "source": "The URL you read",
  "fetchedAt": "<ISO timestamp>"
}

Omit nextDeadline and daysUntil if there is no specific date. Set fetchedAt to the current ISO timestamp.`;

// ── HTTP fetch helper ──────────────────────────────────────────────────────────
function fetchPage(url, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 5) return resolve({ ok: false, text: '', status: 'MAX_REDIRECTS' });
    const lib     = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'JHTV-GrantFinder/1.0 (educational research; contact: jhtv@jhu.edu)',
        'Accept':     'text/html,application/xhtml+xml,*/*',
      },
      timeout: 20000,
    };
    const req = lib.get(url, options, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetchPage(next, redirects + 1));
      }
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ ok: res.statusCode === 200, text: raw, status: res.statusCode }));
    });
    req.on('error', e  => resolve({ ok: false, text: '', status: 'ERR', msg: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, text: '', status: 'TIMEOUT' }); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Strip HTML tags and collapse whitespace — reduces token count
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function daysUntil(str) {
  if (!str) return null;
  try { return Math.ceil((new Date(str) - Date.now()) / 86400000); } catch { return null; }
}

// ── Agentic loop for a single grant ───────────────────────────────────────────
async function checkGrant(grant) {
  const now = new Date().toISOString();
  const messages = [
    {
      role: 'user',
      content: `Check the deadline and application status for this grant program:

Grant: ${grant.name}
Grant ID: ${grant.id}
Primary URL: ${grant.url}
What to look for: ${grant.hint}

Use the web_fetch tool to fetch the page, then return the JSON result. Current date: ${now.slice(0, 10)}.`,
    },
  ];

  const tools = [
    {
      name: 'web_fetch',
      description: 'Fetch a web page and return its text content.',
      input_schema: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The URL to fetch' } },
        required: ['url'],
      },
    },
  ];

  let iterations = 0;
  while (iterations < 6) {
    iterations++;
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        throw new Error(`JSON parse failed for ${grant.id}: ${parseErr.message} — raw: ${jsonMatch[0].slice(0, 100)}`);
      }
      // Ensure daysUntil is computed if nextDeadline is provided
      if (result.nextDeadline && !result.daysUntil) {
        result.daysUntil = daysUntil(result.nextDeadline);
      }
      result.fetchedAt = now;
      return result;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const toolUse of toolUses) {
        const url  = toolUse.input.url;
        console.log(`      → fetching ${url}`);
        const page = await fetchPage(url);
        const text = page.ok ? stripHtml(page.text).slice(0, 18000) : `[HTTP ${page.status}${page.msg ? ': ' + page.msg : ''}]`;
        toolResults.push({
          type:        'tool_result',
          tool_use_id: toolUse.id,
          content:     text,
        });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason
    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }

  throw new Error(`Max iterations reached for ${grant.id}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('🤖 JHTV AI Grant Deadline Updater');
  console.log('   Started:', new Date().toISOString(), '\n');

  // Read existing grants_live.json and preserve all existing data
  let existing = { grants: {} };
  try { existing = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch {}

  const live = {
    lastUpdated:   existing.lastUpdated,   // preserve — set by fetch_grants.js
    lastScrapedAt: new Date().toISOString(),
    grants:        { ...existing.grants }, // seed with all existing data
  };

  const summary = { open: [], rolling: [], closed: [], unknown: [], error: [] };

  for (const grant of GRANTS) {
    process.stdout.write(`   ${grant.id.padEnd(12)}`);
    try {
      const result = await checkGrant(grant);
      live.grants[grant.id] = { ...(live.grants[grant.id] || {}), ...result };
      const icon = { open: '🟢', rolling: '🔵', closed: '🔴', unknown: '⚪' }[result.status] || '⚪';
      console.log(`${icon} ${result.status.padEnd(10)} ${result.deadlineLabel || ''}`);
      summary[result.status]?.push(grant.id);
    } catch (err) {
      console.log(`❌ error: ${err.message.slice(0, 80)}`);
      summary.error.push(grant.id);
    }
    await sleep(1500); // polite pause between grants
  }

  // Write output
  fs.writeFileSync(outPath, JSON.stringify(live, null, 2));

  const total = GRANTS.length - summary.error.length;
  console.log(`\n✅ Updated ${total}/${GRANTS.length} grants in grants_live.json`);
  if (summary.open.length)    console.log(`🟢 Open (${summary.open.length}):    ${summary.open.join(', ')}`);
  if (summary.rolling.length) console.log(`🔵 Rolling (${summary.rolling.length}): ${summary.rolling.join(', ')}`);
  if (summary.closed.length)  console.log(`🔴 Closed (${summary.closed.length}):  ${summary.closed.join(', ')}`);
  if (summary.unknown.length) console.log(`⚪ Unknown (${summary.unknown.length}): ${summary.unknown.join(', ')}`);
  if (summary.error.length)   console.log(`❌ Failed (${summary.error.length}):  ${summary.error.join(', ')}`);

  if (summary.error.length === GRANTS.length) process.exit(1);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
