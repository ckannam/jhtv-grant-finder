# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page grant eligibility diagnostic tool for Johns Hopkins Technology Ventures (JHTV). It helps biotech startup founders determine which grants they qualify for. Deployed via GitHub Pages at `ckannam/jhtv-grant-finder`.

## Running things

```bash
# Install npm dependency (only needed once, or after cloning)
npm install

# Run the eligibility logic stress test (8 personas, 192 checks)
node stress_test.js          # or: npm test

# Fetch live data for the 6 API-sourced federal grants (writes grants_live.json)
node fetch_grants.js         # or: npm run fetch

# Scrape deadlines for the 18 non-API grant websites (merges into grants_live.json)
node scrape_grants.js        # or: npm run scrape

# AI-powered grant deadline updater (requires ANTHROPIC_API_KEY env var)
node ai_grant_updater.js     # or: npm run ai-update

# Open the tool locally
open jhtv_grant_eligibility.html
```

One npm dependency: `@anthropic-ai/sdk` (used only by `ai_grant_updater.js`). All other scripts use Node.js built-ins only.

## Architecture

**`jhtv_grant_eligibility.html`** — the entire frontend in one file (HTML + CSS + JS). Key sections in the script block:

- `loadLiveData()` / `applyLiveData()` — fetches `grants_live.json` on page load and overlays live deadline/status onto grants
- `selectStage()` / `showLanding()` / `updateFormForStage()` — stage-gate landing screen logic (Pre-Co vs Co-Investment mode)
- `collectData()` — reads all form fields into a plain object `d`
- `getGrants(d)` — the core eligibility engine; takes the form data object, returns an array of 28 grant objects each with `{id, title, org, cat, s, amount, deadline, tags, r[]}` where `s` is `eligible | conditional | ineligible` and `r` is the array of pass/warn/fail reasons
- `renderResults(grants, browseMode)` — renders the results panel; in browse mode (empty form) shows all grants as a catalog without eligibility scoring; otherwise groups by eligible/conditional/ineligible. Stage filtering (PRE_CO_HIDE) applies in both modes. Never filter grants in `getGrants()`.
- `cardHTML(g, browseMode)` — renders a single grant card; in browse mode hides status pill, reasons list, and conflict badges so cards show as neutral catalog entries
- `getConflicts(pursuing, allGrants)` — conflict detection across 7 rules (pick-one, equivalent-work, sequential, disclose)
- `evaluate()` — called on every form change; sets `browseMode = !anyFieldFilled`, then orchestrates `getGrants → applyLiveData → renderResults(grants, browseMode)`

**`grants_live.json`** — the data file the HTML reads. Top-level fields: `lastUpdated` (set by `fetch_grants.js`) and `lastScrapedAt` (set by `scrape_grants.js`), plus a `grants` object keyed by grant ID.

**`fetch_grants.js`** — hits three APIs (grants.gov search2, NIH Reporter v2, NSF Awards) for the 6 federal grants that have public APIs: `nih_sbir`, `nih_sttr`, `nsf_sbir`, `dod_sbir`, `darpa`, `doe_sbir`. Reads existing `grants_live.json` first and merges results to avoid wiping data on API failure.

**`scrape_grants.js`** — scrapes 18 grant websites that have no API (Maryland programs, disease foundations, private foundations). Also merges into existing `grants_live.json`.

**`ai_grant_updater.js`** — uses the Claude API (`claude-haiku-4-5-20251001`) with a `web_fetch` tool to visit the same 18 grant websites and extract deadline/status data via AI inference rather than code parsing. More accurate than `scrape_grants.js` for sites with dynamic content. Requires `ANTHROPIC_API_KEY` env var. Runs on a quarterly schedule in CI; can also be triggered manually.

**`stress_test.js`** — runs 8 founder personas against `getGrants()` and verifies 192 expected outcomes. Extracts `getGrants()` directly from `jhtv_grant_eligibility.html` at runtime using `new Function()`, so it always stays in sync with the HTML — no manual code duplication needed.

## GitHub Actions

Three automated workflows in `.github/workflows/`:

| Workflow | Schedule | Script | Covers |
|---|---|---|---|
| `refresh_grants.yml` | Every Tuesday 8 AM ET | `fetch_grants.js` | 6 federal API grants |
| `scrape_grants.yml` | 1st of month 8 AM ET | `scrape_grants.js` | 18 scraped grants |
| `ai_deadline_updater.yml` | Jan/Apr/Jul/Oct 1st 8 AM ET | `ai_grant_updater.js` | Same 18 grants, AI-read |

All three use `permissions: contents: write` and native `git push`. `ai_deadline_updater.yml` requires an Anthropic API key stored as the `PERSONAL_DEV` repository secret (Settings → Secrets and variables → Actions). The workflow maps it to the `ANTHROPIC_API_KEY` env var that the SDK reads.

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
