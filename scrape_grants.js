/**
 * JHTV Grant Monthly Scraper
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrapes 17 grant program websites that have no public API, extracts
 * deadlines and open/closed status, and merges results into grants_live.json.
 *
 * Designed to complement fetch_grants.js (weekly API run).
 * This script only writes to grants it covers — API-sourced grants are
 * preserved untouched.
 *
 * Grants covered:
 *   Maryland:          mii, mscrf, builder, inclusion, rbii, mmf
 *   Federal (static):  arpah, barda, carbx, fda_cdc, va_sbir
 *   Disease Found.:    aha, alz, mjff, cfft
 *   Private Found.:    wellcome, bwf, coulter
 *
 * Writes: grants_live.json  (merged — existing data preserved)
 * Run:    node scrape_grants.js
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ── HTTP fetch ────────────────────────────────────────────────────────────────
function fetchPage(url, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 5) return resolve({ ok: false, html: '', status: 'MAX_REDIRECTS' });
    const lib     = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'JHTV-GrantFinder/1.0 (educational research tool; contact: jhtv@jhu.edu)',
        'Accept':     'text/html,application/xhtml+xml,*/*',
      },
      timeout: 20000,
    };
    const req = lib.get(url, options, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetchPage(next, redirects + 1));
      }
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ ok: res.statusCode === 200, html: raw, status: res.statusCode }));
    });
    req.on('error', e  => resolve({ ok: false, html: '', status: 'ERR', msg: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, html: '', status: 'TIMEOUT' }); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Text extraction helpers ───────────────────────────────────────────────────

/** Strip HTML tags and collapse whitespace for text analysis */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi,  ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&mdash;/g, '—')
    .replace(/\s{2,}/g,  ' ')
    .trim();
}

/**
 * Find date strings near deadline/application keywords.
 * Returns the first plausible match, or null.
 */
function findNearbyDate(text) {
  // Common date patterns
  const datePatterns = [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{4}/g,
    /\b\d{4}-\d{2}-\d{2}/g,
  ];

  // Look within 200-char windows around deadline keywords
  const keywordRe = /deadline|due date|applications? due|submissions? due|letters? of intent|apply by|closes?(?:\s+on)?|receipt date|submission date/gi;
  let match;
  const windows = [];
  while ((match = keywordRe.exec(text)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end   = Math.min(text.length, match.index + 250);
    windows.push(text.slice(start, end));
  }
  if (windows.length === 0) windows.push(text.slice(0, 2000)); // fallback: scan start of page

  for (const window of windows) {
    for (const pat of datePatterns) {
      pat.lastIndex = 0;
      const d = pat.exec(window);
      if (d) return d[0].trim();
    }
  }
  return null;
}

/**
 * Infer open/rolling/closed status from page text.
 * Returns 'open' | 'rolling' | 'closed' | 'unknown'
 */
function inferStatus(text) {
  const lower = text.toLowerCase();

  // Strong closed signals
  if (/\b(closed|not\s+accepting|no\s+longer\s+accept|deadline\s+has\s+passed|submissions?\s+closed|funding\s+cycle\s+closed)\b/.test(lower)) {
    return 'closed';
  }
  // Rolling / always open
  if (/\b(rolling\s+(basis|submission|review|deadline|acceptance)|accepted\s+on\s+a\s+rolling|open\s+year.?round|no\s+deadline|anytime)\b/.test(lower)) {
    return 'rolling';
  }
  // Active open signals
  if (/\b(now\s+accepting|currently\s+accepting|applications?\s+(are\s+)?open|apply\s+now|submit\s+your\s+(application|proposal)|open\s+for\s+(applications?|submissions?))\b/.test(lower)) {
    return 'open';
  }
  return 'unknown';
}

/** Format a raw date string for display */
function fmtDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

/** Days until a date string */
function daysUntil(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d - Date.now()) / 86400000);
  } catch { return null; }
}

// ── Build a result object ─────────────────────────────────────────────────────
function buildResult(id, { status, deadlineRaw, notes, source, urls }) {
  const deadline = deadlineRaw ? fmtDate(deadlineRaw) : null;
  const days     = deadlineRaw ? daysUntil(deadlineRaw) : null;

  let deadlineLabel;
  if (status === 'rolling') {
    deadlineLabel = 'Rolling — see website';
  } else if (deadline && days !== null) {
    deadlineLabel = days > 0
      ? `${deadline} · ${days}d remaining`
      : `${deadline} · deadline passed`;
  } else if (deadline) {
    deadlineLabel = deadline;
  } else if (status === 'open') {
    deadlineLabel = 'Open — see website';
  } else if (status === 'closed') {
    deadlineLabel = 'Closed — check website for next cycle';
  } else {
    deadlineLabel = 'See website for deadlines';
  }

  return {
    status,
    nextDeadline:  deadline,
    daysUntil:     days,
    deadlineLabel,
    notes:         notes || null,
    source:        source || urls[0],
    fetchedAt:     new Date().toISOString(),
    scrapedUrls:   urls,
  };
}

// ── Grant scrapers ────────────────────────────────────────────────────────────
// Each returns a result object or null on failure.

async function scrapeTEDCO_MII() {
  const url = 'https://www.tedco.md/program/maryland-innovation-initiative/';
  console.log(`  GET ${url}`);
  const res = await fetchPage(url);
  if (!res.ok) return { status: 'unknown', notes: `Fetch failed (${res.status})`, urls: [url] };

  const text = stripHtml(res.html);
  const status = inferStatus(text);
  const raw    = findNearbyDate(text);

  // MII is quarterly: Jan 15, Apr 15, Jul 15, Oct 15 — if not found in page, set known schedule
  const deadlineRaw = raw || null;
  const notes = raw
    ? null
    : 'Quarterly deadlines: Jan 15 · Apr 15 · Jul 15 · Oct 15 — verify on site';

  return buildResult('mii', {
    status: status === 'unknown' ? 'open' : status,
    deadlineRaw,
    notes,
    source: url,
    urls: [url],
  });
}

async function scrapeMSCRF() {
  const urls = [
    'https://www.mscrf.org/funding-opportunities',
    'https://www.mscrf.org/request-for-proposals',
    'https://www.mscrf.org/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) continue;
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('mscrf', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      source: url,
      urls,
    });
  }
  return buildResult('mscrf', { status: 'unknown', urls, notes: 'Could not fetch page' });
}

async function scrapeTEDCO_Builder() {
  const url = 'https://www.tedco.md/program/social-impact-funds/';
  console.log(`  GET ${url}`);
  const res = await fetchPage(url);
  if (!res.ok) return buildResult('builder', { status: 'rolling', urls: [url], notes: 'Rolling equity investments — no fixed deadline' });
  const text = stripHtml(res.html);
  return buildResult('builder', {
    status: 'rolling',
    deadlineRaw: null,
    notes: 'Equity investment, rolling — contact TEDCO directly',
    source: url,
    urls: [url],
  });
}

async function scrapeTEDCO_Inclusion() {
  const url = 'https://www.tedco.md/program/social-impact-funds/';
  console.log(`  GET ${url} (Inclusion Fund)`);
  // Same page as Builder Fund; rolling investment
  const res = await fetchPage(url);
  return buildResult('inclusion', {
    status: 'rolling',
    deadlineRaw: null,
    notes: 'Equity investment, rolling — contact TEDCO directly',
    source: url,
    urls: [url],
  });
}

async function scrapeTEDCO_RBII() {
  const url = 'https://www.tedco.md/program/rural-business-innovation-initiative/';
  console.log(`  GET ${url}`);
  const res = await fetchPage(url);
  if (!res.ok) return buildResult('rbii', { status: 'rolling', urls: [url], notes: 'Contact regional RBII mentor to begin' });
  const text = stripHtml(res.html);
  const status = inferStatus(text);
  return buildResult('rbii', {
    status: status === 'unknown' ? 'rolling' : status,
    deadlineRaw: null,
    notes: 'Contact regional RBII mentor — 90-day mentoring precedes funding',
    source: url,
    urls: [url],
  });
}

async function scrapeMMF() {
  const urls = [
    'https://usmd.edu/momentum',
    'https://www.usmd.edu/momentum/',
    'https://www.momentum.usmd.edu/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) continue;
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('mmf', {
      status: status === 'unknown' ? 'rolling' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Rolling equity program — verify cycle on site',
      source: url,
      urls,
    });
  }
  return buildResult('mmf', { status: 'unknown', urls, notes: 'Could not fetch page' });
}

async function scrapeARPAH() {
  const urls = [
    'https://arpa-h.gov/explore-funding/sbir-sttr',
    'https://arpa-h.gov/explore-funding',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('arpah', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      source: url,
      urls,
    });
  }
  return buildResult('arpah', { status: 'unknown', urls, notes: 'See arpa-h.gov for current solicitations' });
}

async function scrapeBARDA() {
  const urls = [
    'https://medicalcountermeasures.gov/barda/funding',
    'https://medicalcountermeasures.gov/barda/barda-broad-agency-announcement-baa-hhs-barda-2024-888',
    'https://medicalcountermeasures.gov/barda/industry/fundingopportunities/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('barda', {
      status: status === 'unknown' ? 'rolling' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Rolling BAAs — BARDA DRIVe and main BAA are continuously open',
      source: url,
      urls,
    });
  }
  return buildResult('barda', {
    status: 'rolling',
    urls,
    notes: 'Rolling BAAs — see medicalcountermeasures.gov for open solicitations',
  });
}

async function scrapeCARBX() {
  const urls = [
    'https://carb-x.org/apply/',
    'https://carb-x.org/apply',
    'https://carb-x.org/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('carbx', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Annual funding rounds (typically Q1 and Q4) — verify on carb-x.org',
      source: url,
      urls,
    });
  }
  return buildResult('carbx', { status: 'unknown', urls, notes: 'See carb-x.org for current rounds' });
}

async function scrapeFDA_CDC() {
  const url = 'https://seed.nih.gov/funding-opportunities/fda-sbir-sttr';
  console.log(`  GET ${url}`);
  const res = await fetchPage(url);
  if (!res.ok) return buildResult('fda_cdc', {
    status: 'open',
    urls: [url],
    notes: 'Check seed.nih.gov for current FDA/CDC SBIR joint NOFOs',
  });
  const text = stripHtml(res.html);
  const status = inferStatus(text);
  const raw    = findNearbyDate(text);
  return buildResult('fda_cdc', {
    status: status === 'unknown' ? 'open' : status,
    deadlineRaw: raw,
    source: url,
    urls: [url],
  });
}

async function scrapeVA_SBIR() {
  const url = 'https://www.va.gov/orod/sbirsttr.asp';
  console.log(`  GET ${url}`);
  const res = await fetchPage(url);
  if (!res.ok) return buildResult('va_sbir', {
    status: 'open',
    urls: [url, 'https://sbir.gov/agencies/VA'],
    notes: 'Check sbir.gov/agencies/VA for open VA solicitations',
  });
  const text = stripHtml(res.html);
  const status = inferStatus(text);
  const raw    = findNearbyDate(text);
  return buildResult('va_sbir', {
    status: status === 'unknown' ? 'open' : status,
    deadlineRaw: raw,
    source: url,
    urls: [url],
  });
}

async function scrapeAHA() {
  const urls = [
    'https://professional.heart.org/en/research-programs/aha-funding-opportunities',
    'https://professional.heart.org/en/research-programs',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('aha', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Annual cycles with rolling pre-proposals — verify at heart.org/research',
      source: url,
      urls,
    });
  }
  return buildResult('aha', { status: 'unknown', urls, notes: 'See heart.org/professional/research for current cycles' });
}

async function scrapeAlzheimers() {
  const urls = [
    'https://www.alz.org/research/for_researchers/grants_programs',
    'https://www.alz.org/research/for_researchers/grants',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('alz', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Annual Letter of Intent cycle — verify at alz.org/research',
      source: url,
      urls,
    });
  }
  return buildResult('alz', { status: 'unknown', urls, notes: 'See alz.org/research for current LOI and application deadlines' });
}

async function scrapeMJFF() {
  const urls = [
    'https://www.michaeljfox.org/grants',
    'https://www.michaeljfox.org/research-grants',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('mjff', {
      status: status === 'unknown' ? 'rolling' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Rolling pre-proposals via PPMI portal — verify at michaeljfox.org/grants',
      source: url,
      urls,
    });
  }
  return buildResult('mjff', { status: 'rolling', urls, notes: 'Rolling pre-proposals — see michaeljfox.org/grants' });
}

async function scrapeCFFT() {
  const urls = [
    'https://www.cff.org/researchers/therapeutics-development-program',
    'https://www.cff.org/researchers',
    'https://www.cff.org/funding-opportunities',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('cfft', {
      status: status === 'unknown' ? 'rolling' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Rolling contract model — initial meeting required — cff.org/researchers',
      source: url,
      urls,
    });
  }
  return buildResult('cfft', { status: 'rolling', urls, notes: 'Rolling — initiate via cff.org/researchers' });
}

async function scrapeWellcome() {
  const urls = [
    'https://wellcomeleap.org/programs/',
    'https://wellcomeleap.org/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('wellcome', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Program-specific deadlines — check active programs at wellcomeleap.org',
      source: url,
      urls,
    });
  }
  return buildResult('wellcome', { status: 'unknown', urls, notes: 'See wellcomeleap.org/programs for active solicitations' });
}

async function scrapeBWF() {
  const urls = [
    'https://www.bwfund.org/grant-programs/',
    'https://www.bwfund.org/funding-opportunities/',
    'https://www.bwfund.org/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('bwf', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Annual cycles — verify at bwfund.org/grant-programs',
      source: url,
      urls,
    });
  }
  return buildResult('bwf', { status: 'unknown', urls, notes: 'See bwfund.org for current cycles' });
}

async function scrapeCoulter() {
  const urls = [
    'https://cbid.bme.jhu.edu/research/translational-research/coulter-program/',
    'https://cbid.bme.jhu.edu/',
  ];
  for (const url of urls) {
    console.log(`  GET ${url}`);
    const res = await fetchPage(url);
    if (!res.ok) { await sleep(1500); continue; }
    const text = stripHtml(res.html);
    const status = inferStatus(text);
    const raw    = findNearbyDate(text);
    return buildResult('coulter', {
      status: status === 'unknown' ? 'open' : status,
      deadlineRaw: raw,
      notes: raw ? null : 'Annual cycle — JHU BME faculty + postdoc teams — cbid.bme.jhu.edu',
      source: url,
      urls,
    });
  }
  return buildResult('coulter', { status: 'unknown', urls, notes: 'See cbid.bme.jhu.edu for annual cycle dates' });
}

// ── Grant registry ────────────────────────────────────────────────────────────
const SCRAPERS = [
  { id: 'mii',       label: 'TEDCO MII',                  fn: scrapeTEDCO_MII    },
  { id: 'mscrf',     label: 'MSCRF',                      fn: scrapeMSCRF        },
  { id: 'builder',   label: 'TEDCO Builder Fund',         fn: scrapeTEDCO_Builder },
  { id: 'inclusion', label: 'TEDCO Inclusion Fund',       fn: scrapeTEDCO_Inclusion },
  { id: 'rbii',      label: 'TEDCO RBII',                 fn: scrapeTEDCO_RBII   },
  { id: 'mmf',       label: 'Maryland Momentum Fund',     fn: scrapeMMF          },
  { id: 'arpah',     label: 'ARPA-H',                     fn: scrapeARPAH        },
  { id: 'barda',     label: 'BARDA',                      fn: scrapeBARDA        },
  { id: 'carbx',     label: 'CARB-X',                     fn: scrapeCARBX        },
  { id: 'fda_cdc',   label: 'FDA/CDC SBIR',               fn: scrapeFDA_CDC      },
  { id: 'va_sbir',   label: 'VA SBIR',                    fn: scrapeVA_SBIR      },
  { id: 'aha',       label: 'AHA Research Grants',        fn: scrapeAHA          },
  { id: 'alz',       label: "Alzheimer's Association",    fn: scrapeAlzheimers   },
  { id: 'mjff',      label: 'Michael J. Fox Foundation',  fn: scrapeMJFF         },
  { id: 'cfft',      label: 'CFF Therapeutics',           fn: scrapeCFFT         },
  { id: 'wellcome',  label: 'Wellcome Leap',              fn: scrapeWellcome     },
  { id: 'bwf',       label: 'Burroughs Wellcome Fund',    fn: scrapeBWF          },
  { id: 'coulter',   label: 'JHU-Coulter Partnership',    fn: scrapeCoulter      },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 JHTV Grant Monthly Scraper');
  console.log('   Started:', new Date().toISOString(), '\n');

  // Load existing grants_live.json (preserves API-sourced data)
  const outPath  = path.join(__dirname, 'grants_live.json');
  let existing   = { lastUpdated: new Date().toISOString(), grants: {} };
  if (fs.existsSync(outPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      console.log(`📂 Loaded existing grants_live.json (${Object.keys(existing.grants).length} grants)\n`);
    } catch (e) {
      console.log('⚠ Could not parse existing grants_live.json — starting fresh\n');
    }
  } else {
    console.log('📂 No existing grants_live.json — will create fresh\n');
  }

  const results  = {};
  const errors   = [];
  const statuses = { open: 0, rolling: 0, closed: 0, unknown: 0 };

  for (const { id, label, fn } of SCRAPERS) {
    process.stdout.write(`\n⏳ ${label} (${id})\n`);
    try {
      const result = await fn();
      results[id]  = result;
      statuses[result.status] = (statuses[result.status] || 0) + 1;

      const icon = result.status === 'open'    ? '🟢'
                 : result.status === 'rolling' ? '🔵'
                 : result.status === 'closed'  ? '🔴'
                 : '⚪';
      console.log(`   ${icon} ${result.status.toUpperCase()} · ${result.deadlineLabel}`);
      if (result.notes) console.log(`      ℹ ${result.notes}`);
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errors.push({ id, label, error: err.message });
      results[id] = {
        status: 'unknown',
        deadlineLabel: 'See website',
        fetchedAt: new Date().toISOString(),
        error: err.message,
      };
    }
    // Polite delay between requests
    await sleep(1200);
  }

  // Merge: scraped data over existing (preserve API data like nih_sbir, nih_sttr)
  const merged = {
    ...existing,
    lastScrapedAt: new Date().toISOString(),
    grants: { ...existing.grants },
  };
  for (const [id, data] of Object.entries(results)) {
    merged.grants[id] = {
      ...(existing.grants[id] || {}),  // preserve any existing fields (e.g., recentAwardCount from APIs)
      ...data,                          // scrape data overwrites deadline/status
    };
  }

  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));

  const total = Object.keys(merged.grants).length;
  console.log(`\n✅ Done — ${total} grants total in grants_live.json`);
  console.log(`   Scraped: ${SCRAPERS.length} sites`);
  console.log(`   Status breakdown: 🟢 ${statuses.open || 0} open · 🔵 ${statuses.rolling || 0} rolling · 🔴 ${statuses.closed || 0} closed · ⚪ ${statuses.unknown || 0} unknown`);
  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} scrape error(s):`);
    errors.forEach(e => console.log(`   · ${e.label}: ${e.error}`));
  }

  console.log('\n── Scraped deadlines ───────────────────────────────────────');
  for (const [id, data] of Object.entries(results)) {
    console.log(`  ${id}: ${data.deadlineLabel || '—'}`);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
