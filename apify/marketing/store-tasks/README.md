# Public example tasks (task landing pages)

Each published task has its own landing page, `apify.com/robertosan16/<actor>/examples/<task>`, indexed by
Google and readable by AI agents, and shows in the Actor's **Example tasks** tab. Apify's Actor quality
check "Publish a task for your Actor" was the only failing check on our Actors (25.10). Limits: 10 per
Actor, 100 per account.

- `build.py` — the specs: title (goal of the user, not the Actor), description, SEO title and description,
  input, fields shown on the page, dataset view. `python3 build.py` writes `tasks.json` and checks lengths.
- `publish.mjs` — creates or updates and publishes the tasks (`APIFY_TOKEN` in the environment).
  `node publish.mjs [task-name ...]`.
- `run-all.mjs` — runs every task once and reports status and items.

The pilot task `google-news-company-monitor` (Google News, company and brand alerts) was created by hand
on 25.10 and is not in `build.py`.
