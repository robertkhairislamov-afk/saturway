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
