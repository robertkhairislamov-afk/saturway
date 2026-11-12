# Claude: how we work in this repository

The owner (Mozart Standard Co., Pattaya, Thailand) runs an Apify Store portfolio on the account
`robertosan16` and talks in Russian: answer in Russian, short and plain, outcome first.

## Where things are

- `apify/PLAN.md`: the full history and status of every Actor, decision and open task. **Read its
  last sections first** (newest at the end).
- `apify/actors/*`: one folder per Actor (code, `.actor` schemas, README, tests: `npm test`).
- `apify/marketing/icon-prompts.md`: icon prompts, numbered; the owner generates and uploads icons.
- Work branch: `claude/gifted-dirac-sv0ed6` (commit and push there; no pull requests unless asked).

## Deploying to Apify

- The API token is the `APIFY_TOKEN` environment variable. Never print, log or commit it, and never
  ask for tokens or passwords in chat.
- Deploy = upload the Actor folder as source files (`PUT /v2/acts/{id}/versions/0.1` with
  `sourceType: SOURCE_FILES`, skipping `node_modules`, `storage`, `test`), then build tag `latest`.
- New Actors are created **private**. The owner publishes them, uploads icons and posts. Prices:
  pay per event `apify-default-dataset-item`, tiers FREE/BRONZE/SILVER/GOLD+ (e.g. $5, 4.50, 4,
  3.50 per 1000). Price changes are the owner's decision.
- Test on the platform with real runs (empty input and a real input) before saying it works.

## Rules (agreed with the owner)

- Respect robots.txt. No CAPTCHA solving, no bot-protection bypass (DataDome, Cloudflare,
  "Security check" pages): drop such sources. Send an honest User-Agent naming the tool, not a
  browser imitation. Read sites at a gentle pace.
- Do not use undocumented internal APIs behind protected forms. Do not bypass country access
  rules: data.dubai (ex Dubai Pulse) is officially for users inside the UAE; the owner's friend in
  Dubai downloads it there and passes the open files.
- No personal data of private people: no owners, no individual developers' contacts, no private
  sellers' names or phones. Agencies and companies are fine.
- Open data licences: Dubai's Open Data Licence allows commercial products built on the data but
  forbids selling the raw data; sell analysis, not raw rows, and credit the source.
- Never disable TLS checks or unset HTTPS_PROXY. If a safety check denies an action, do not
  work around it; report it.
- No fake runs, users or reviews; no money spent on ads; no mass automated outreach. Do not write
  or translate review text for sites that forbid AI-written reviews; remind about incentive
  disclosure.
- The owner's email support@mozartstandard.com is private: do not send it to outside services
  without asking (it is fine as the support address inside our own READMEs).
- Thai property Actor: internal use only. Bangkok runs are manual (no schedule).
- Check facts before claiming them; when a result is uncertain, say so.

## Open work (12.11.2026)

1. **UAE Property Deals** (`apify/actors/uae-property-deals`): code and tests ready, not yet on
   Apify (the token was rotated after Apify's security incident of 9–11.11). Create the private
   Actor, price $5 per 1000 listings like `telegram-channel-analytics`, deploy, test on Dubai Marina
   and on Abu Dhabi, then give the owner the icon prompt (next number in icon-prompts.md).
2. **DLD CSV**: the owner downloads transaction CSVs from dubailand.gov.ae by hand (the search has a
   reCAPTCHA) and uploads them to the Apify key-value store; add CSV input to the UAE Actor once
   the first file arrives. The friend in Dubai checks which DLD datasets data.dubai offers.
3. **Store check on 17.11** (scheduled in the earlier session): users and search positions of
   Google Play Developer Leads, ASO Keyword Rank Tracker, Telegram Channel Analytics and Website
   Marketing Audit against competitors.
4. Reviews offer (Apify, $20): G2 reviews of 10.11 in moderation; TrustRadius pending; no reply
   from Oliver at Apify yet.
5. Thai property: Pattaya weekly schedule runs on Mondays with page checks.
