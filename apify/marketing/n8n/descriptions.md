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

## 5. Find companies building a team on LinkedIn, Indeed and Glassdoor and research them as sales leads with AI

File: `hiring-signal-sales-leads.json` (replaces template 3, which n8n rejected as too basic; rebuilt 21.10 on the All-in-One Jobs Scraper)

Tested 21.10 in a local n8n 2.42.7 with the Apify community node 0.7.0 against the live All-in-One Jobs Scraper (SDR, account executive and head of sales jobs, US, LinkedIn + Indeed + Glassdoor): 300 companies → compared with eight "saved" rows (4 GROWING, 3 STEADY, 1 SLOWING; one marked Customer and one Not a fit were skipped) → 130 fit the ideal customer → 15 hot leads, best score first → 15 home pages read (12 with text) → AI notes → 300 rows to the sheet → one Slack message. The sheet read and the AI step were stubs with the same output shape; with the real AI node and no OpenAI key, every lead is still saved and posted, marked "AI step failed". A failed Apify search posts a Slack alert. Google Sheets and Slack were empty nodes.

n8n's creator team says the canvas preview may not render for templates with community nodes (the Apify node is one), and asks for a public link to a screenshot of the whole canvas at the top of the description. It is the first line below.

```markdown
![Workflow canvas](https://raw.githubusercontent.com/robertkhairislamov-afk/saturway/claude/gifted-dirac-sv0ed6/apify/marketing/n8n/screenshots/hiring-signal-sales-leads.png)

## Who is this for
Sales and business development teams, agencies and founders who sell to companies that are growing a team. A company that starts hiring SDRs is building a sales team; one hiring a Head of Sales is about to buy tools and training for it. Hiring is a buying signal, and the best moment to reach out is when it starts.

## What it does
Every Monday:
1. The [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper) on Apify searches LinkedIn, Indeed and Glassdoor for jobs posted in the last 7 days in the roles you track and returns **one row per hiring company**: open jobs, jobs this week, teams, job titles, places, pay range, size, industry, website and the job sites it posts on. Staffing agencies and "Confidential" employers are left out.
2. **Score the companies** compares each company with your Google Sheet (NEW, GROWING, SLOWING or STEADY), checks your ideal customer (size, industry, jobs this week) and scores the hiring signal from 0 to 100: new jobs, growth since last week, posting on several job sites, senior roles such as "Head of Sales" (a team being built) and a matching industry. Companies you marked **Customer**, **Not a fit**, **Lost** or **Do not contact** in the sheet are never offered again.
3. For the best hot leads, up to your weekly limit, the workflow reads the company's home page, and AI writes what the company does, the team being built, why now, an angle for your offer, **who to contact** (a job title, never a person's name) and an email opener. Facts come only from the data.
4. Every company is added or updated in the sheet by name. Your **Status** column and older AI notes are never overwritten.
5. One Slack message sums up the week: how many companies are new, growing or slowing, then the hot leads, high priority and best score first. In a quiet week it says so. If the search fails, Slack gets an alert instead.

## How to set up
1. Create a free Apify account and add your Apify credential to **Find hiring companies** (API token or OAuth). The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. Fill in **Your ideal customer**: what you sell, the roles your buyers hire (comma-separated), countries, an optional location, job sites, company size, industries and the limits.
3. Add an OpenAI credential to **OpenAI Chat Model**, or swap in Anthropic, Gemini or another chat model.
4. Create a Google Sheet and paste this header row into row 1: `Company, Score, Signal, Hot lead, Status, Priority, What they do, Team being built, Why now, Angle, Contact title, Opener, Open jobs, New this week, Previous open jobs, Fits ICP, Teams hiring, Senior roles, Job titles, Locations, Pay range, Job sites, Size, Industry, Revenue, Rating, Website, Company page, Example job, Latest posting, First seen, Updated` (one column each). Select the sheet in **Read saved leads** and **Save leads**.
5. Connect Slack and pick a channel in **Post to Slack** and **Alert: search failed**, then activate the workflow.

## Requirements
- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 companies in this mode, so 300 companies a week cost about $0.30.
- An OpenAI API key or another chat model. AI runs only on hot leads, 15 a week by default.
- A Google account for Google Sheets and a Slack workspace.

## How to customize
- Track any team: "data engineer" for data tools, "registered nurse" for healthcare staffing, "warehouse associate" for logistics software.
- Other countries and job sites: `countries` takes codes such as US, GB, DE, AU; leave `jobSites` empty to use every site that covers them (SEEK, StepStone, Reed and more).
- Change the score or what counts as a hot lead in **Score the companies** and **Your ideal customer** (`minScore`, `maxAiLeadsPerWeek`).
- Send hot leads to HubSpot, Pipedrive or a lemlist campaign instead of Slack.
```
