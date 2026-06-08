/**
 * JHTV Grant Live Data Fetcher
 * ─────────────────────────────────────────────────────────────────────────────
 * Sources:
 *   grants.gov search2 API  → open SBIR/STTR solicitations + deadlines
 *   NIH Reporter API v2     → Maryland-based SBIR/STTR recent award winners
 *   NSF Awards API          → NSF SBIR recent award winners
 *
 * Note: SBIR.gov API (api.www.sbir.gov) is excluded — returning HTTP 429
 *       (under maintenance as of June 2026). Re-add when it comes back online.
 *
 * Writes: grants_live.json  (consumed by jhtv_grant_eligibility.html)
 * Run:    node fetch_grants.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'JHTV-GrantFinder/1.0 (educational tool)' },
      timeout: 15000,
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ ok: false, status: res.statusCode, data: null, raw: raw.slice(0, 300) });
        }
      });
    });
    req.on('error', e => resolve({ ok: false, status: 'ERR', data: null, msg: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT', data: null }); });
  });
}

function post(url, body) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(body);
    const urlObj  = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':     'JHTV-GrantFinder/1.0',
      },
      timeout: 15000,
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ ok: false, status: res.statusCode, data: null, raw: raw.slice(0, 300) });
        }
      });
    });
    req.on('error', e => resolve({ ok: false, status: 'ERR', data: null, msg: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT', data: null }); });
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fmtDate(str) {
  if (!str) return null;
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return str; }
}

function daysUntil(str) {
  if (!str) return null;
  try { return Math.ceil((new Date(str) - Date.now()) / 86400000); }
  catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GRANTS.GOV  —  open SBIR/STTR solicitations with deadlines
//    POST https://api.grants.gov/v1/api/search2
//
//    Returns active grant opportunities including NIH SBIR/STTR parent FOAs,
//    DARPA BAAs, and other federal SBIR programs.
//    Note: BARDA and ARPA-H do not currently post on grants.gov; they use
//    their own portals (barda.hhs.gov and arpa-h.gov).
// ─────────────────────────────────────────────────────────────────────────────

// Maps grants.gov agencyCode + title keywords to our grant IDs
function classifyGrantsGovOpp(opp) {
  const agency = (opp.agencyCode || '').toUpperCase();
  const title  = (opp.title || '').toUpperCase();

  if (agency.includes('NIH') || agency === 'HHS-NIH11') {
    if (title.includes('STTR') && !title.includes('SBIR')) return 'nih_sttr';
    if (title.includes('SBIR') || title.includes('SMALL BUSINESS INNOVATION')) return 'nih_sbir';
  }
  if (agency.includes('DARPA')) return 'darpa';
  if (agency === 'NSF') return 'nsf_sbir';
  if (agency.includes('DOD-') && !agency.includes('DARPA')) return 'dod_sbir';
  if (agency.includes('DOE') || agency.includes('PAMS-SC')) return 'doe_sbir';
  if (agency.includes('VA') || agency.includes('VHA')) return 'va_sbir';
  if (agency.includes('FDA') || agency.includes('CDC')) return 'fda_cdc';
  return null;
}

async function fetchGrantsGov() {
  const url  = 'https://api.grants.gov/v1/api/search2';
  const body = { keyword: 'SBIR', oppStatuses: 'posted', rows: 50, startRecordNum: 0 };
  console.log(`     POST ${url}  {keyword:"SBIR", oppStatuses:"posted"}`);

  const res = await post(url, body);
  if (!res.ok || !res.data) {
    console.log(`     ⚠ grants.gov: status=${res.status} ${res.msg || res.raw || ''}`);
    return [];
  }

  const hits = res.data?.data?.oppHits || [];
  console.log(`     → ${hits.length} open SBIR opportunities returned (total: ${res.data?.data?.hitCount})`);
  return hits;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NIH REPORTER  —  Maryland SBIR/STTR awarded projects (FY 2024–present)
//    POST https://api.reporter.nih.gov/v2/projects/search
//
//    org_names filter is non-functional in the v2 API for sub-award partners.
//    Maryland state filter (org_states) returns JHU-area companies that have
//    received NIH SBIR/STTR awards — the most relevant set for JHTV users.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchNIHReporter() {
  const currentYear = new Date().getFullYear();
  const body = {
    criteria: {
      org_states:     ['MD'],
      activity_codes: ['R43', 'R44', 'R41', 'R42'],
      fiscal_years:   [currentYear - 2, currentYear - 1, currentYear],
    },
    include_fields: [
      'ProjectNum', 'ProjectTitle', 'Organization',
      'AwardAmount', 'FiscalYear', 'ActivityCode',
    ],
    offset: 0,
    limit:  50,
  };
  console.log('     POST https://api.reporter.nih.gov/v2/projects/search');
  const res = await post('https://api.reporter.nih.gov/v2/projects/search', body);
  if (!res.ok || !res.data) {
    console.log(`     ⚠ NIH Reporter: status=${res.status} ${res.msg || res.raw || ''}`);
    return [];
  }
  console.log(`     → total matching: ${res.data.meta?.total}`);
  return res.data.results || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NSF AWARDS API
//    GET https://api.nsf.gov/services/v1/awards.json
//
//    Correct params: rpp (not rows), printFields (not fields),
//    awardeeStateCode (not stateCode).
// ─────────────────────────────────────────────────────────────────────────────
async function fetchNSFAwards() {
  const url = 'https://api.nsf.gov/services/v1/awards.json?keyword=SBIR&rpp=25&printFields=id,title,awardeeName,fundsObligatedAmt,date,awardeeStateCode';
  console.log(`     GET ${url}`);
  const res = await get(url);
  if (!res.ok || !res.data) {
    console.log(`     ⚠ NSF Awards: status=${res.status} ${res.msg || res.raw || ''}`);
    return [];
  }
  const awards = res.data?.response?.award || [];
  console.log(`     → ${awards.length} NSF awards returned`);
  return awards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 JHTV Grant Live Data Fetcher');
  console.log('   Started:', new Date().toISOString(), '\n');

  const live = {
    lastUpdated: new Date().toISOString(),
    grants: {},
  };

  // ── Step 1: grants.gov — open SBIR/STTR solicitations ─────────────────────
  console.log('📡 Step 1 — grants.gov: open SBIR/STTR solicitations (deadlines)\n');

  const govOpps = await fetchGrantsGov();
  const oppsByGrant = {};

  for (const opp of govOpps) {
    const grantId = classifyGrantsGovOpp(opp);
    if (!grantId) continue;
    if (!oppsByGrant[grantId]) oppsByGrant[grantId] = [];
    oppsByGrant[grantId].push(opp);
  }

  for (const [grantId, opps] of Object.entries(oppsByGrant)) {
    // Pick the soonest real deadline
    const withDates = opps.filter(o => o.closeDate);
    const sorted    = withDates.sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate));
    const next      = sorted[0] || opps[0];
    const days      = next?.closeDate ? daysUntil(next.closeDate) : null;
    const deadline  = next?.closeDate ? fmtDate(next.closeDate) : 'Rolling';

    live.grants[grantId] = {
      ...(live.grants[grantId] || {}),
      status:        'open',
      nextDeadline:  deadline,
      daysUntil:     days,
      openTopics:    opps.length,
      deadlineLabel: days
        ? `${deadline} · ${opps.length} open solicitation${opps.length > 1 ? 's' : ''}`
        : `Rolling · ${opps.length} open solicitation${opps.length > 1 ? 's' : ''}`,
      source:        'grants.gov',
    };
    console.log(`   ✓ ${grantId}: deadline ${deadline}${days ? ` (${days} days)` : ''} · ${opps.length} listings`);
  }

  const missingGrants = ['nih_sbir', 'nih_sttr', 'nsf_sbir', 'dod_sbir', 'darpa', 'doe_sbir', 'va_sbir', 'fda_cdc']
    .filter(id => !oppsByGrant[id]);
  for (const id of missingGrants) {
    console.log(`   – ${id}: no open listings on grants.gov`);
  }

  // BARDA and ARPA-H note
  console.log('\n   ℹ BARDA / ARPA-H: use their own portals (barda.hhs.gov, arpa-h.gov)');
  console.log('     These do not post standard grants on grants.gov.');

  // ── Step 2: NIH Reporter — Maryland SBIR/STTR awardees ────────────────────
  console.log('\n📡 Step 2 — NIH Reporter: Maryland SBIR/STTR recent awards\n');
  const nihAwards = await fetchNIHReporter();

  if (nihAwards.length > 0) {
    console.log(`   ✓ ${nihAwards.length} Maryland NIH SBIR/STTR awards found`);
    nihAwards.slice(0, 6).forEach(a =>
      console.log(`     · FY${a.fiscal_year} ${a.activity_code}: ${a.project_title?.slice(0, 55)} — ${a.organization?.org_name} ($${(a.award_amount || 0).toLocaleString()})`)
    );

    const sbir = nihAwards.filter(a => ['R43', 'R44'].includes(a.activity_code));
    const sttr = nihAwards.filter(a => ['R41', 'R42'].includes(a.activity_code));

    const makeWinnerData = (subset) => ({
      totalRecentAwards: subset.length,
      recentProjects: subset.slice(0, 6).map(a => ({
        company:   a.organization?.org_name,
        title:     a.project_title,
        amount:    a.award_amount,
        year:      a.fiscal_year,
        mechanism: a.activity_code,
      })),
      source: 'nih-reporter',
    });

    if (sbir.length > 0) {
      live.grants['nih_sbir'] = {
        ...(live.grants['nih_sbir'] || {}),
        recentAwardCount: sbir.length,
        avgAwardAmount:   Math.round(sbir.reduce((s, a) => s + (a.award_amount || 0), 0) / sbir.length),
        winnerData:       makeWinnerData(sbir),
      };
    }
    if (sttr.length > 0) {
      live.grants['nih_sttr'] = {
        ...(live.grants['nih_sttr'] || {}),
        recentAwardCount: sttr.length,
        avgAwardAmount:   Math.round(sttr.reduce((s, a) => s + (a.award_amount || 0), 0) / sttr.length),
        winnerData:       makeWinnerData(sttr),
      };
    }
  } else {
    console.log('   – No Maryland NIH awards returned');
  }

  // ── Step 3: NSF Awards API ─────────────────────────────────────────────────
  console.log('\n📡 Step 3 — NSF Awards API: recent SBIR awards\n');
  const nsfAwards = await fetchNSFAwards();

  if (nsfAwards.length > 0) {
    console.log(`   ✓ ${nsfAwards.length} NSF SBIR awards found`);
    nsfAwards.slice(0, 4).forEach(a =>
      console.log(`     · ${a.awardeeName} — ${a.title?.slice(0, 55)} ($${parseInt(a.fundsObligatedAmt || '0').toLocaleString()})`)
    );

    const avgNSF = Math.round(
      nsfAwards.reduce((s, a) => s + parseInt(a.fundsObligatedAmt || '0'), 0) / nsfAwards.length
    );

    live.grants['nsf_sbir'] = {
      ...(live.grants['nsf_sbir'] || {}),
      recentAwardCount: nsfAwards.length,
      avgAwardAmount:   avgNSF,
      nsfWinners: nsfAwards.slice(0, 5).map(a => ({
        org:    a.awardeeName,
        title:  a.title,
        amount: parseInt(a.fundsObligatedAmt || '0'),
        state:  a.awardeeStateCode,
      })),
    };
  } else {
    console.log('   – No NSF awards returned');
  }

  // ── Write output ───────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'grants_live.json');
  fs.writeFileSync(outPath, JSON.stringify(live, null, 2));

  const count = Object.keys(live.grants).length;
  console.log(`\n✅ Done — ${count} grants have live data`);
  console.log(`   Written: ${outPath}`);
  console.log(`   Timestamp: ${live.lastUpdated}`);

  console.log('\n── Summary ─────────────────────────────────────────────────────');
  for (const [id, data] of Object.entries(live.grants)) {
    const parts = [];
    if (data.deadlineLabel)    parts.push(`deadline: ${data.deadlineLabel}`);
    if (data.recentAwardCount) parts.push(`${data.recentAwardCount} recent awards`);
    if (data.winnerData)       parts.push(`${data.winnerData.totalRecentAwards} MD winners`);
    if (data.nsfWinners)       parts.push(`${data.nsfWinners.length} NSF winners`);
    console.log(`  ${id}: ${parts.join(' · ') || '(data attached)'}`);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
