# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page grant eligibility diagnostic tool for Johns Hopkins Technology Ventures (JHTV). It helps biotech startup founders determine which grants they qualify for. Deployed via GitHub Pages at `ckannam/jhtv-grant-finder`.

## Running things

```bash
# Install npm dependency (only needed once, or after cloning)
npm install

# Run the eligibility logic stress test (8 personas, 224 checks)
node stress_test.js          # or: npm test

# Fetch live data for the 6 API-sourced federal grants (writes grants_live.json)
node fetch_grants.js         # or: npm run fetch

# Scrape deadlines for the 22 non-API grant websites (merges into grants_live.json)
node scrape_grants.js        # or: npm run scrape

# AI-powered grant deadline updater (requires ANTHROPIC_API_KEY env var)
node ai_grant_updater.js     # or: npm run ai-update

# Open the tool locally
open jhtv_grant_eligibility.html
```

One npm dependency: `@anthropic-ai/sdk` (used only by `ai_grant_updater.js`). All other scripts use Node.js built-ins only. `index.html` is a meta-refresh redirect to `jhtv_grant_eligibility.html`.

## Architecture

**`jhtv_grant_eligibility.html`** — the frontend (HTML + CSS + JS), loading the eligibility engine from `grant_engine.js` via script tag. Key sections in the script block:

- `loadLiveData()` / `applyLiveData()` — fetches `grants_live.json` on page load and overlays live deadline/status onto grants
- `selectStage()` / `showLanding()` / `updateFormForStage()` — stage-gate landing screen logic (Pre-Co vs Co-Investment mode)
- `collectData()` — reads all form fields into a plain object `d`
- URL hash restore on `DOMContentLoaded` — `#stage=pre_co&ventureStage=…` prefills the form and skips the landing screen; used by JHTV Second Brain deep links. `evaluate()` writes the current form (incl. stage) back into the hash.
- `renderResults(grants, browseMode)` — renders the results panel; in browse mode (empty form) shows all grants as a catalog without eligibility scoring; otherwise groups by eligible/conditional/ineligible. Stage filtering (PRE_CO_HIDE) applies in both modes. Never filter grants in `getGrants()`.
- `cardHTML(g, browseMode)` — renders a single grant card; in browse mode hides status pill, reasons list, and conflict badges so cards show as neutral catalog entries
- `getConflicts(pursuing, allGrants)` — conflict detection across 7 rules (pick-one, equivalent-work, sequential, disclose)
- `evaluate()` — called on every form change; sets `browseMode = !anyFieldFilled`, then orchestrates `getGrants → applyLiveData → renderResults(grants, browseMode)`

**`grant_engine.js`** — `getGrants(d)`, the core eligibility engine; takes the form data object, returns an array of 28 grant objects each with `{id, title, org, cat, s, amount, deadline, tags, r[]}` where `s` is `eligible | conditional | ineligible` and `r` is the array of pass/warn/fail reasons. Loaded by the HTML via script tag and `require()`d directly by `stress_test.js`. **Shared cross-repo:** the JHTV Second Brain (`ckannam/VC_Matching_Second_Brain`) fetches this file and `grants_live.json` from the deployed site for per-tech preliminary grant screens — renaming the file or changing `getGrants()`'s signature breaks that consumer.

**`grants_live.json`** — the data file the HTML reads. Top-level fields: `lastUpdated` (set by `fetch_grants.js`) and `lastScrapedAt` (set by `scrape_grants.js`), plus a `grants` object keyed by grant ID.

**`fetch_grants.js`** — hits three APIs (grants.gov search2, NIH Reporter v2, NSF Awards) for the 6 federal grants that have public APIs: `nih_sbir`, `nih_sttr`, `nsf_sbir`, `dod_sbir`, `darpa`, `doe_sbir`. Reads existing `grants_live.json` first and merges results to avoid wiping data on API failure.

**`scrape_grants.js`** — scrapes the 22 grant websites that have no API (Maryland programs, disease foundations, private foundations). Also merges into existing `grants_live.json`. Grants whose scrape fails are simply left out of the merge; the HTML falls back to each grant's hardcoded deadline string, so `grants_live.json` may legitimately contain fewer than 28 keys.

**`ai_grant_updater.js`** — uses the Claude API (`claude-haiku-4-5-20251001`) with a `web_fetch` tool to visit 22 non-API grant websites and extract deadline/status data via AI inference rather than code parsing (more accurate than `scrape_grants.js` for dynamic content). Requires `ANTHROPIC_API_KEY` env var. Exits 0 on partial success (exits 1 only if every grant fails). Runs on a quarterly schedule in CI; can also be triggered manually.

**`stress_test.js`** — runs 8 founder personas against `getGrants()` and verifies 224 expected outcomes (8 × 28 grants). Requires the engine directly via `require('./grant_engine.js')`.

## All grant IDs

These are the 28 IDs used as keys in `getGrants()`, `grants_live.json`, and stress test expectations:

| ID | Program | Category |
|---|---|---|
| `mii` | MII – Validation | Maryland / TEDCO |
| `mii_joint` | MII – Joint | Maryland / TEDCO |
| `mii_cf` | MII – Company Formation | Maryland / TEDCO |
| `bii` | Baltimore Innovation Initiative | Maryland / TEDCO |
| `sbir_match` | TEDCO SBIR/STTR Matching Funds | Maryland / TEDCO |
| `mscrf` | Maryland Stem Cell Research Fund | Maryland / TEDCO |
| `builder` | TEDCO Pre-Seed Builder Fund | Maryland / TEDCO |
| `inclusion` | TEDCO Inclusion Fund | Maryland / TEDCO |
| `rbii` | TEDCO Rural Business Innovation Initiative | Maryland / TEDCO |
| `nih_sbir` | NIH SBIR Phase I (R43) | Federal |
| `nih_sttr` | NIH STTR Phase I (R41) | Federal |
| `nsf_sbir` | NSF SBIR / STTR Phase I | Federal |
| `arpah` | ARPA-H SBIR / STTR | Federal |
| `dod_sbir` | DOD SBIR / STTR | Federal |
| `darpa` | DARPA BTO SBIR | Federal |
| `fda_cdc` | FDA / CDC Joint SBIR | Federal |
| `doe_sbir` | DOE SBIR / STTR | Federal |
| `barda` | BARDA DRIVe SBIR | Federal |
| `carbx` | CARB-X | Private |
| `va_sbir` | VA SBIR / STTR | Federal |
| `coulter` | Coulter Translational Partnership | JHU |
| `mmf` | Maryland Medical / MEDAAF | Maryland |
| `aha` | American Heart Association | Disease Foundation |
| `alz` | Alzheimer's Association | Disease Foundation |
| `mjff` | Michael J. Fox Foundation | Disease Foundation |
| `cfft` | Cystic Fibrosis Foundation | Disease Foundation |
| `wellcome` | Wellcome Leap | Private |
| `bwf` | Burroughs Wellcome Fund | Private |

## Adding a new grant

1. Add a new block inside `getGrants(d)` in `grant_engine.js` using the same `{id, title, org, cat, s, amount, deadline, tags, r[]}` shape. Follow the existing section comment style (`// ── N. Grant Name ───`).
2. Add the new grant ID to all 8 persona `expected` objects in `stress_test.js`. Every persona must have an expected outcome for every grant — a missing key will silently pass as if the grant doesn't exist.
3. If the grant should be hidden in pre-co mode, add its ID to `PRE_CO_HIDE`. If it gets a co-stage fit badge, add it to `CO_FIT`.
4. If live deadline data is needed, add a fetch/scrape entry in `fetch_grants.js` or `scrape_grants.js`.
5. Run `npm test` to verify all expectations before committing.

## GitHub Actions

Three automated workflows in `.github/workflows/`:

| Workflow | Schedule | Script | Covers |
|---|---|---|---|
| `refresh_grants.yml` | Every Tuesday 8 AM ET | `fetch_grants.js` | 6 federal API grants |
| `scrape_grants.yml` | 1st of month 8 AM ET | `scrape_grants.js` | 22 scraped grants |
| `ai_deadline_updater.yml` | Jan/Apr/Jul/Oct 1st 8 AM ET | `ai_grant_updater.js` | Same 22 grants, AI-read |

All three use `actions/checkout@v5`, `actions/setup-node@v5` (Node.js 24), `permissions: contents: write`, and native `git push`. They share the `grants-data` concurrency group and run `git pull --rebase` before pushing, because the monthly scrape and quarterly AI update fire at the same time on Jan/Apr/Jul/Oct 1st and would otherwise race on `grants_live.json` (this caused the 2026-07-01 scrape failure). `ai_deadline_updater.yml` requires an Anthropic API key stored as the `PERSONAL_DEV` repository secret (Settings → Secrets and variables → Actions). The workflow maps it to the `ANTHROPIC_API_KEY` env var that the SDK reads.

## Stage-gate and grant filtering

The `stage` global (`'pre_co'` or `'co'`) controls two things:
1. Which form fields are visible (`updateFormForStage()`)
2. Which grants appear in results (`renderResults()` checks `PRE_CO_HIDE` set)

`PRE_CO_HIDE = ['barda','carbx','darpa','arpah','fda_cdc','va_sbir']` — these are shown in a collapsed "Advanced Programs" section in pre-co mode.
`CO_FIT = ['barda','carbx','darpa','arpah']` — these get a "Co-stage fit" badge in co mode.

**Never filter grants inside `getGrants()`** — filtering belongs in `renderResults()` so `stress_test.js` still sees all grants.

Two form fields drive Maryland-specific grants beyond `marylandBased`: `baltimoreArea` (yes/no, shown when `marylandBased='yes'`) controls BII eligibility; `hasSbirPhaseI` (yes/no) controls TEDCO SBIR/STTR Match eligibility.

## Updating grant deadline data manually

The `grant-deadline-updater` Claude Code skill (`grant-deadline-updater/SKILL.md`) visits each grant website interactively when you need a one-off refresh. The automated equivalent is `ai_grant_updater.js`, which the quarterly CI workflow runs headlessly using the same logic.

> **Known staleness:** the skill's grant table still lists only 18 grants — it predates the 4 Maryland grants added later (`mii_joint`, `mii_cf`, `bii`, `sbir_match`). The authoritative 22-grant list is the `GRANTS` array in `ai_grant_updater.js`; cross-check against it when running the skill.
