# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A single-page grant eligibility diagnostic tool for Johns Hopkins Technology Ventures (JHTV). It helps biotech startup founders determine which grants they qualify for. Deployed via GitHub Pages at `ckannam/jhtv-grant-finder`.

## Running things

```bash
# Run the eligibility logic stress test (12 personas, pass/fail report)
node stress_test.js

# Fetch live data for the 6 API-sourced federal grants (writes grants_live.json)
node fetch_grants.js

# Scrape deadlines for the 18 non-API grant websites (merges into grants_live.json)
node scrape_grants.js

# Open the tool locally
open jhtv_grant_eligibility.html
```

No build step, no dependencies, no `package.json`. Everything runs in Node.js (built-ins only) or directly in the browser.

## Architecture

**`jhtv_grant_eligibility.html`** — the entire frontend in one file (HTML + CSS + JS). Key sections in the script block:

- `loadLiveData()` / `applyLiveData()` — fetches `grants_live.json` on page load and overlays live deadline/status onto grants
- `selectStage()` / `showLanding()` / `updateFormForStage()` — stage-gate landing screen logic (Pre-Co vs Co-Investment mode)
- `collectData()` — reads all form fields into a plain object `d`
- `getGrants(d)` — the core eligibility engine; takes the form data object, returns an array of 26 grant objects each with `{id, title, org, cat, s, amount, deadline, tags, r[]}` where `s` is `eligible | conditional | ineligible` and `r` is the array of pass/warn/fail reasons
- `renderResults(grants)` — renders the results panel; filters by `stage` global (hides advanced programs in pre-co mode) — this is where display filtering happens, never in `getGrants()`
- `cardHTML(g)` — renders a single grant card
- `getConflicts(pursuing, allGrants)` — conflict detection across 7 rules (pick-one, equivalent-work, sequential, disclose)
- `evaluate()` — called on every form change; orchestrates `collectData → getGrants → applyLiveData → renderResults`

**`grants_live.json`** — the data file the HTML reads. Top-level fields: `lastUpdated` (set by `fetch_grants.js`) and `lastScrapedAt` (set by `scrape_grants.js`), plus a `grants` object keyed by grant ID.

**`fetch_grants.js`** — hits three APIs (grants.gov search2, NIH Reporter v2, NSF Awards) for the 6 federal grants that have public APIs: `nih_sbir`, `nih_sttr`, `nsf_sbir`, `dod_sbir`, `darpa`, `doe_sbir`. Reads existing `grants_live.json` first and merges results to avoid wiping data on API failure.

**`scrape_grants.js`** — scrapes 18 grant websites that have no API (Maryland programs, disease foundations, private foundations). Also merges into existing `grants_live.json`.

**`stress_test.js`** — standalone Node script that duplicates the `getGrants()` logic and runs 12 founder personas to verify eligibility outcomes. Run this after any change to grant logic in the HTML to catch regressions. Note: this file has its own copy of the grant logic — if you change eligibility rules in `jhtv_grant_eligibility.html`, you must manually sync those changes to `stress_test.js`.

## GitHub Actions

Two automated workflows in `.github/workflows/`:

- **`refresh_grants.yml`** — runs every Tuesday at 8 AM ET; executes `fetch_grants.js` and commits updated `grants_live.json`
- **`scrape_grants.yml`** — runs on the 1st of each month at 8 AM ET; executes `scrape_grants.js` and commits updated `grants_live.json`

Both use `permissions: contents: write` and native `git push` (no third-party push action).

## Stage-gate and grant filtering

The `stage` global (`'pre_co'` or `'co'`) controls two things:
1. Which form fields are visible (`updateFormForStage()`)
2. Which grants appear in results (`renderResults()` checks `PRE_CO_HIDE` set)

`PRE_CO_HIDE = ['barda','carbx','darpa','arpah','fda_cdc','va_sbir']` — these are shown in a collapsed "Advanced Programs" section in pre-co mode.
`CO_FIT = ['barda','carbx','darpa','arpah']` — these get a "Co-stage fit" badge in co mode.

**Never filter grants inside `getGrants()`** — filtering belongs in `renderResults()` so `stress_test.js` still sees all grants.

## Updating grant deadline data manually

The `grant-deadline-updater` Claude skill (`grant-deadline-updater.skill`) automates manual scraping when `scrape_grants.js` fails or data is stale. Invoke it via the skill system to visit each grant website and write structured results back to `grants_live.json`.
