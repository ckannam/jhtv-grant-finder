---
name: grant-deadline-updater
description: >
  Use this skill whenever the user wants to refresh or update grant deadline data
  for the JHTV Grant Finder tool. Trigger on phrases like "update grant deadlines",
  "refresh grant data", "check grant deadlines", "scrape grant sites", "update
  grants_live.json", "what are the current grant deadlines", or any request to
  pull fresh deadline/status information for the 18 static grant programs tracked
  in the JHTV Grant Finder. Also trigger if the user says something like "the
  grant tool is showing stale data" or "update the live badges on the grant tool".
  Always use this skill — not a manual web search — when the goal is to write
  updated deadline data back to grants_live.json.
---

# Grant Deadline Updater

## What this skill does

You are updating the live deadline data for the JHTV Grant Finder tool, a web app
used by Johns Hopkins Technology Ventures to help biotech startup founders understand
their grant options. The tool reads from `grants_live.json` on page load — your job
is to visit each grant program's website, read it the way a smart analyst would, and
write back structured deadline/status data.

The `grants_live.json` file lives at:
`/Users/colekannam/Documents/Grant Finder/grants_live.json`

## How to read each grant website

For each grant, do the following:

1. **Fetch the page** using `mcp__workspace__web_fetch`. If the result is a mostly-empty
   shell (JavaScript-rendered, just navigation links, no real content), switch to
   `mcp__Claude_in_Chrome__navigate` + `mcp__Claude_in_Chrome__get_page_text` to get
   the fully-rendered page.

2. **Read it like an analyst** — don't just pattern-match for dates. Ask yourself:
   - Is this program currently accepting applications? Is there an active round?
   - Is there a specific deadline date stated anywhere? (Could be in prose, a table,
     a sidebar, an FAQ, a PDF link you should fetch)
   - Is this a rolling program (no fixed deadline, always accepting)?
   - Is it closed right now, with a future cycle opening later?

3. **Follow one level of links if needed.** If the homepage says "Apply here" or
   "See current opportunities," follow that link to find the actual deadline. Don't
   go deeper than one hop.

4. **Be honest about uncertainty.** If you genuinely can't determine the deadline
   from what's on the page, say so via `notes` rather than guessing. "Could not
   determine deadline — see website" is a valid and useful result.

## Grant list

Visit each grant in this order. The primary URL is listed first; try it first.
If it returns a 404 or redirect to a homepage, try the fallback.

| Grant ID     | Program Name                              | Primary URL                                                    | What to look for |
|-------------|-------------------------------------------|----------------------------------------------------------------|-----------------|
| `mii`        | TEDCO Maryland Innovation Initiative      | https://www.tedco.md/program/maryland-innovation-initiative/   | Quarterly deadlines: Jan 15, Apr 15, Jul 15, Oct 15 — confirm these are still current |
| `mscrf`      | Maryland Stem Cell Research Fund          | https://www.mscrf.org/funding-opportunities                    | Current funding cycle, LOI or application deadline |
| `builder`    | TEDCO Pre-Seed Builder Fund               | https://www.tedco.md/program/social-impact-funds/              | Rolling equity — confirm program still active |
| `inclusion`  | TEDCO Inclusion Fund                      | https://www.tedco.md/program/social-impact-funds/              | Rolling equity — confirm program still active |
| `rbii`       | TEDCO Rural Business Innovation (RBII)    | https://www.tedco.md/program/rural-business-innovation-initiative/ | Rolling — contact regional mentor |
| `mmf`        | Maryland Momentum Fund                    | https://www.usmd.edu/momentum/                                 | Cycle dates, rolling vs fixed |
| `arpah`      | ARPA-H SBIR/STTR                          | https://arpa-h.gov/explore-funding/sbir-sttr                   | Open solicitations, current deadline |
| `barda`      | BARDA / BARDA DRIVe                       | https://medicalcountermeasures.gov/barda/funding               | Rolling BAA status, any specific windows |
| `carbx`      | CARB-X Antimicrobial Accelerator          | https://carb-x.org/apply/                                      | Current round number, LOI/application deadline |
| `fda_cdc`    | FDA/CDC Joint SBIR                        | https://seed.nih.gov/funding-opportunities/fda-sbir-sttr       | Open NOFO, deadline |
| `va_sbir`    | VA SBIR/STTR                              | https://www.va.gov/orod/sbirsttr.asp                           | Current solicitation cycle |
| `aha`        | American Heart Association Grants         | https://professional.heart.org/en/research-programs/aha-funding-opportunities | Current cycle deadlines by mechanism |
| `alz`        | Alzheimer's Association Research Grants   | https://www.alz.org/research/for_researchers/grants_programs   | LOI deadline, application deadline, current cycle year |
| `mjff`       | Michael J. Fox Foundation                 | https://www.michaeljfox.org/grants                             | Rolling pre-proposals, any specific open cycles |
| `cfft`       | Cystic Fibrosis Foundation Therapeutics   | https://www.cff.org/researchers                                | Rolling contract model, current intake status |
| `wellcome`   | Wellcome Leap Health Programs             | https://wellcomeleap.org/programs/                             | Which programs are currently open, their deadlines |
| `bwf`        | Burroughs Wellcome Fund                   | https://www.bwfund.org/grant-programs/                         | Which mechanisms are open, annual cycle dates |
| `coulter`    | JHU-Coulter Translational Partnership     | https://cbid.bme.jhu.edu/research/translational-research/coulter-program/ | Annual cycle, LOI or application deadline |

**Polite browsing:** Add a ~1 second pause between site visits. These are nonprofit and
government sites — be a considerate guest.

## Output format

For each grant, produce a result object. The full schema:

```json
{
  "status": "open | rolling | closed | unknown",
  "nextDeadline": "Mon DD, YYYY",
  "daysUntil": 45,
  "deadlineLabel": "Human-readable string shown in the tool",
  "notes": "Optional clarification (e.g., 'LOI due before full application')",
  "source": "The URL you read to get this data",
  "fetchedAt": "2026-06-08T13:00:00.000Z"
}
```

**Choosing `status`:**
- `open` — there is an active, specific deadline coming up
- `rolling` — no fixed deadline; program accepts applications continuously
- `closed` — current cycle is over; next cycle not yet announced
- `unknown` — you genuinely could not determine status from the page

**Writing `deadlineLabel`** — this is what founders see in the tool, so make it useful:
- For open with deadline: `"Oct 15, 2026 · LOI due · CARB-X Round 9"` (add context if available)
- For rolling: `"Rolling — applications accepted anytime"` or `"Rolling — contact program office"`
- For closed: `"Closed — next cycle TBD · check website"` or `"FY26 cycle closed · FY27 opens ~Sep 2026"`
- For unknown: `"See website for current deadlines"`

**Omit `nextDeadline` and `daysUntil`** if there is no specific date (rolling, closed, unknown).

## Merging and writing the file

1. **Read the existing `grants_live.json`** first. It contains API-sourced data for
   federal grants (nih_sbir, nih_sttr, nsf_sbir, dod_sbir, darpa, doe_sbir) that
   should be left untouched — only overwrite the 18 grants in this skill's list.

2. **Merge strategy:** For each grant you scraped, do a shallow merge:
   - Keep any existing fields not in your result (e.g., `recentAwardCount`, `winnerData`
     from the NIH Reporter API)
   - Your scraped fields (`status`, `deadlineLabel`, `nextDeadline`, `daysUntil`,
     `notes`, `source`, `fetchedAt`) overwrite the existing values

3. **Update the top-level timestamps:**
   - `lastScrapedAt`: set to right now (ISO string)
   - Leave `lastUpdated` as-is (that's updated by the weekly API script)

4. **Write the merged result** back to
   `/Users/colekannam/Documents/Grant Finder/grants_live.json`

5. **Commit and push to GitHub** so the live GitHub Pages site reflects the update.
   Run the following using the Bash tool:
   ```bash
   cd "/Users/colekannam/Documents/Grant Finder" && \
   git add grants_live.json && \
   git commit -m "chore: update grant deadlines [$(date +%Y-%m-%d)]" && \
   git push
   ```
   If the commit fails because there are no changes (grants_live.json was identical
   to the previous version), that's fine — skip without error.

6. **Report back** with a summary: how many grants updated, how many are open vs
   rolling vs closed vs unknown, and call out any that need manual attention.

## Example output summary

```
✅ Updated 18 grants in grants_live.json

🟢 Open (5):    mii, mscrf, arpah, carbx, bwf
🔵 Rolling (7): builder, inclusion, rbii, mmf, barda, mjff, cfft
🔴 Closed (2):  alz (FY26 cycle closed, FY27 opens Sep 2026), wellcome (no active program)
⚪ Unknown (4): fda_cdc, va_sbir, aha, coulter (JS-rendered, could not extract)

⚠ Manual check recommended: fda_cdc, va_sbir, aha, coulter
```

## What good looks like

A well-executed run of this skill:
- Visits the actual deadline page, not just the grant homepage
- Distinguishes between "rolling program" and "we don't know the deadline" — these
  are different and founders care about the difference
- Captures context in `deadlineLabel` beyond just a date (e.g., "LOI first, then
  full app" is important for planning)
- Flags programs that appear to have been discontinued or defunded rather than
  silently marking them rolling
- Finishes in under 10 minutes for all 18 grants
