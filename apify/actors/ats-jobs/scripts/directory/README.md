# Career Page directory

How `src/data/careers-directory.json` (the companies behind "Search all companies") is built. Run
from an empty work folder with `APIFY_TOKEN` set; the working files are written there.

1. `node harvest.mjs <batch> US,GB,DE,...` and `node harvest.mjs <batch> xing`: starts our Indeed
   (one run per country, or `US:California` for a state) and XING Actors on 60 job titles. Their
   apply links lead to company career sites. Cost in November 2026: about $0.10–0.16 per run.
2. `node extract.mjs`: reads the runs' apply links and keeps the boards on Greenhouse, Lever,
   Ashby, Workday, Personio and Teamtailor (`boards-raw.json`). Greenhouse short links (grnh.se)
   are resolved with one request each.
3. `node validate.mjs`: checks every found board and every board already in the directory on its
   system's public API or feed, 8 at a time with a pause; keeps boards with open jobs
   (`directory-checked.json`, results cached in `check-cache.json`).
4. `node build-directory.mjs`: writes the directory, with company names cleaned
   ("Jobs at Acme GmbH" → "Acme GmbH").

Then update the count in `scripts/actors.mjs` and the READMEs, run `npm test`, build and deploy.
