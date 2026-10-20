# n8n templates: titles and descriptions for the n8n template library

The workflow files are next to this file; `build-templates.mjs` builds them from the Code node files in `code/`. All three were run on 13.10 in a local n8n 2.42.7 with the Apify community node 0.7.0 against the live Actors (Google Sheets and Slack replaced by empty nodes, since there are no accounts for them here).

Submitting: sign in on n8n.io, open the Creator portal, "Share new template", paste the workflow JSON, then the title and the description below. n8n reviews each template (first by AI, then by a person) and takes one at a time.

---

## 1. Get daily Indeed job alerts in Google Sheets with Apify

File: `indeed-job-alerts-google-sheets.json`

```markdown
## Who is this for
Job seekers, recruiters and anyone who follows hiring in a field or a city and wants the new Indeed jobs in a spreadsheet every morning, without checking Indeed by hand.

## What it does
Every morning the workflow runs the [Indeed Jobs Scraper](https://apify.com/robertosan16/indeed-jobs-scraper) on Apify with your keywords, country and city, and appends the new jobs to a Google Sheet: title, company, location, salary, job type, remote, date posted, the Indeed link and the apply link. The scraper remembers what it returned before (`onlyNew`), so each job lands in the sheet once. It covers 62 countries.

## How to set up
1. Create a free Apify account and add your Apify credential to the **Search Indeed** node: the API token from Apify Console, or OAuth on n8n Cloud. The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. Edit the search in **Search Indeed**: `searchQueries`, `country` (a two-letter code such as `US`, `GB` or `DE`) and `location`.
3. Create a Google Sheet whose first row is: Title, Company, Location, Salary, Job type, Remote, Posted, Job link, Apply link. Select it in **Add to sheet**.
4. Activate the workflow.

## Requirements
- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 jobs.
- A Google account for Google Sheets.

## How to customize
- Add filters to the search: `jobTypes`, `workplaceTypes`, `experienceLevels` or `distance`.
- Change the time in **Every morning**.
- Send the jobs to Airtable, Notion or email instead of Google Sheets.
```

---

## 2. Send new Glassdoor jobs at top-rated companies to Slack with Apify

File: `glassdoor-top-rated-jobs-slack.json`

```markdown
## Who is this for
Teams and job seekers who want to hear about new jobs only at companies their employees rate well, in a Slack channel they already read.

## What it does
Every weekday morning the workflow runs the [Glassdoor Jobs Scraper](https://apify.com/robertosan16/glassdoor-jobs-scraper) on Apify for new remote jobs at companies rated 4 stars or more on Glassdoor. A Code node turns them into one Slack message, best-rated companies first, with links, the company rating and the salary or Glassdoor's salary estimate. With `onlyNew`, each job is posted once; on days without new jobs nothing is posted.

## How to set up
1. Create a free Apify account and add your Apify credential to the **Search Glassdoor** node: the API token from Apify Console, or OAuth on n8n Cloud. The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. Edit the search in **Search Glassdoor**: `searchQueries`, `country`, and `remoteOnly` or a `location`.
3. Connect Slack in **Post to Slack** and choose the channel.
4. Activate the workflow.

## Requirements
- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 jobs.
- A Slack workspace.

## How to customize
- `minCompanyRating` takes 1 to 4.
- Add `jobTypes` or `experienceLevels` to the search, or search a city instead of remote jobs.
- Post to Microsoft Teams, Discord or email instead of Slack.
```

---

## 3. Find companies hiring on Glassdoor and save them as sales leads in Google Sheets

File: `glassdoor-hiring-companies-leads.json`

```markdown
## Who is this for
Sales and business development teams who sell to companies that are growing a certain team. A company hiring SDRs is building a sales team; a company hiring nurses is expanding care. Hiring is a buying signal.

## What it does
Every Monday the workflow runs the [Glassdoor Jobs Scraper](https://apify.com/robertosan16/glassdoor-jobs-scraper) on Apify for jobs posted in the last 7 days for the role you choose. A Code node groups the jobs by company and keeps one row per company in Google Sheets: number of open jobs, job titles, locations, Glassdoor rating, size, revenue, industry, website, headquarters and the Glassdoor company page. Companies already in the sheet are updated, new ones are added.

## How to set up
1. Create a free Apify account and add your Apify credential to the **Search Glassdoor** node: the API token from Apify Console, or OAuth on n8n Cloud. The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. Set the role you sell to in `searchQueries`, plus `country` and optionally a `location`.
3. Create a Google Sheet whose first row is: Company, Open jobs, Rating, Size, Revenue, Industry, Website, Headquarters, Glassdoor page, Latest posting, Job titles, Locations, Updated. Select it in **Save leads**.
4. Activate the workflow.

## Requirements
- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 jobs, so 500 jobs a week cost $0.50.
- A Google account for Google Sheets.

## How to customize
- Search several roles at once: `searchQueries` takes a list.
- Keep only companies of a certain size or industry with a Filter node after **One row per company**.
- Send new companies to your CRM, such as HubSpot or Pipedrive, instead of a sheet.
```

---

## 4. Find jobs abroad that can sponsor your visa and draft the emails with Apify, AI and Gmail

File: `jobs-abroad-visa-sponsorship-gmail-drafts.json`

Tested 19.10 in a local n8n 2.42.7 with the Apify community node 0.7.0 against the live All-in-One Jobs Scraper (Adelaide, sales roles): 40 jobs → 38 unique → 9 skipped by the work-rights screen with exact quotes → 29 checked → 5 drafts. The two AI steps were replaced by stubs with the same output shape (no OpenAI key here); the real AI nodes load and stop only at the missing credential. Google Sheets and Gmail were replaced by empty nodes; the Gmail subject and body expressions were checked in a Set node.

```markdown
## Who is this for
People looking for work in another country who need an employer to sponsor their work visa. Most job ads never say whether they sponsor, and many quietly rule foreign candidates out ("citizens or permanent residents only", "full working rights required"). Recruiters and career coaches who help such candidates can use it too.

## What it does
Every morning the workflow runs the [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper) on Apify (LinkedIn, Indeed, Glassdoor, SEEK and more in one call, duplicates removed) and then:
1. Screens each ad with rules, not AI: ads that require citizenship, permanent residency, existing or unrestricted work rights or a security clearance, or say they do not sponsor, are skipped with the exact quote. The salary is split into guaranteed base and extras (OTE, bonus, commission).
2. Has AI check the remaining jobs against your profile: a fit score, the sponsorship status (YES, YES_CONDITIONAL, ASK, NO) with the sentence that decided it, missing requirements and seniority.
3. Keeps two separate scores, fit and visa, and labels every job APPLY, ASK SPONSORSHIP FIRST, REVIEW, LOW PRIORITY or SKIP in a Google Sheet.
4. Writes short, honest emails for the best few jobs a day and saves them as Gmail drafts. Nothing is sent automatically.

## How to set up
1. Create a free Apify account and add your Apify credential to **Search job sites** (API token or OAuth). The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. In **Your profile**, replace the example with your CV summary and set `minBaseSalary` and `maxDraftsPerDay`.
3. In **Search job sites**, set the job titles, `countries` and `location`.
4. Add an OpenAI credential to **OpenAI Chat Model**, or swap in Anthropic, Gemini or another chat model.
5. Create a Google Sheet whose first row is: Job link, Found, Recommendation, Priority, Fit, Visa, Sponsorship, Evidence, Missing, Why, Title, Company, Location, Base salary, Extra pay, Apply link, Status. Select it in **Update job tracker**.
6. Connect Gmail in **Save Gmail draft** and activate the workflow.

## Requirements
- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 jobs.
- An OpenAI API key or another chat model. AI runs only on jobs that pass the screen.
- A Google account for Google Sheets and Gmail.

## How to customize
- Already have the right to work there? Set `needsVisaSponsorship` to false and the screen skips nothing.
- Change the rules in **Rank jobs**, for example the fit score needed for an email.
- Send the best jobs to Slack or Telegram instead of drafting emails, or add a Wait node to review them first.
```

---

## 5. Find companies building a team from Glassdoor jobs and research them as sales leads with AI

File: `glassdoor-hiring-signal-leads.json` (replaces template 3, which n8n rejected as too basic)

Tested 20.10 in a local n8n 2.42.7 with the Apify community node 0.7.0 against the live Glassdoor Jobs Scraper (SDR and account executive jobs, US): 80 jobs → 73 companies → compared with six "saved" rows → 3 GROWING, 3 STEADY, 67 NEW → 2 hot leads (fit + new or growing) → AI notes → one Slack message. The sheet read and the AI step were stubs with the same output shape; the real AI node loads and stops only at the missing OpenAI key. Google Sheets and Slack were empty nodes.

```markdown
## Who is this for
Sales and business development teams who sell to companies that are growing a certain team. A company hiring SDRs is building a sales team; a company hiring nurses is expanding care. Hiring is a buying signal, and the best moment is when a company starts hiring or hires more.

## What it does
Every Monday the workflow runs the [Glassdoor Jobs Scraper](https://apify.com/robertosan16/glassdoor-jobs-scraper) on Apify for last week's jobs in the roles you track, and then:
1. Makes one row per company with the number of open jobs, job titles, places, Glassdoor rating, size, revenue, industry and website.
2. Compares with your Google Sheet: NEW companies, GROWING ones (more open jobs than last time) and STEADY ones, and checks each against your ideal customer (size, industry, open jobs).
3. For hot leads only (fit and NEW or GROWING), AI writes a priority, why now, an angle for what you sell and an email opener, from the hiring data alone.
4. Saves every company to the sheet, matched by name, and posts the hottest leads to Slack.

## How to set up
1. Create a free Apify account and add your Apify credential to **Search Glassdoor** (API token or OAuth). The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. In **Search Glassdoor**, set the roles your buyers hire for, the `country` and optionally a `location`.
3. In **Your ideal customer**, describe what you sell and set `minEmployees`, `industries` and `minOpenJobs`.
4. Add an OpenAI credential to **OpenAI Chat Model**, or swap in another chat model.
5. Create a Google Sheet whose first row is: Company, Signal, Open jobs, Previous open jobs, Fits ICP, Priority, Why now, Angle, Opener, Rating, Size, Revenue, Industry, Website, Headquarters, Glassdoor page, Latest posting, Job titles, Locations, First seen, Updated, Status. Select it in **Read saved leads** and **Save leads**.
6. Connect Slack in **Post to Slack** and activate the workflow.

## Requirements
- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 jobs, so 500 jobs a week cost $0.50.
- An OpenAI API key or another chat model. AI runs only on hot leads, usually a handful a week.
- A Google account for Google Sheets and a Slack workspace.

## How to customize
- Track several roles at once: `searchQueries` takes a list.
- Change what counts as a hot lead in **Compare with last week** or **Hot lead?**.
- Send hot leads to HubSpot, Pipedrive or a lemlist campaign instead of Slack.
```
