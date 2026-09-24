# Greenhouse Jobs Scraper

Scrape every open job from any company that hires with **Greenhouse**: title, department, office locations, **salary range**, full description, posting date and apply link. Add several companies at once, filter by keyword, location, remote or date, and run it on a schedule to get **only new jobs**. Fast and reliable: it reads the official public Greenhouse job board API, with no browser and no login.

## What can this Greenhouse scraper do?

- 🏢 **Scrape many companies in one run**: Airbnb, Stripe, Figma, Discord, Datadog and thousands of other Greenhouse boards.
- 💰 **Salary ranges**: the structured pay ranges companies publish on Greenhouse (pay transparency), plus ranges found in the description text, as `min`, `max`, `currency` and `interval`.
- 🔎 **Filters**: title keywords, excluded words, locations, remote only, departments, posted in the last N days, only jobs with a salary.
- 🆕 **Only new jobs since the last run**: perfect for job alerts, recruiting pipelines and hiring signals.
- 🧾 **Clean text and HTML descriptions**: the escaped Greenhouse HTML is decoded for you.
- 🔗 **Accepts any link format**: `airbnb`, `boards.greenhouse.io/airbnb`, `job-boards.greenhouse.io/figma`, embedded boards (`?for=discord`) or job links.
- 🧩 **Same output as our [Lever](https://apify.com/robertosan16/lever-jobs-scraper), [Ashby](https://apify.com/robertosan16/ashby-jobs-scraper) and [Workday](https://apify.com/robertosan16/workday-jobs-scraper) scrapers**, so you can merge jobs from all four systems into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Account Manager |
| `companyName` / `company` | Airbnb / airbnb |
| `department` | Business Development |
| `location` / `locations` | London, United Kingdom |
| `remote` / `workplaceType` | false / hybrid |
| `salary` | `{ "min": 46000, "max": 54000, "currency": "GBP", "interval": "year" }` |
| `postedAt` / `updatedAt` | 2026-09-09T08:35:19.000Z |
| `jobUrl` / `applyUrl` | https://careers.airbnb.com/positions/8184174?gh_jid=8184174 |
| `descriptionText` / `descriptionHtml` | full job description |
| `jobId` / `requisitionId` | 8184174 |

## How to scrape Greenhouse jobs

1. Add the companies: the board name (`airbnb`) or any Greenhouse link. The board name is the part after `greenhouse.io/` in the company's job links.
2. Optionally set filters: keywords such as `engineer` or `product manager`, locations such as `London` or `Remote`, a date range.
3. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "companies": ["airbnb", "https://job-boards.greenhouse.io/figma", "stripe"],
  "keywords": ["engineer", "data scientist"],
  "locations": ["United States", "Remote"],
  "postedWithinDays": 7
}
```

### Example output

```json
{
  "ats": "greenhouse",
  "company": "airbnb",
  "companyName": "Airbnb",
  "jobId": "8184174",
  "requisitionId": "MULTI",
  "title": "Account Manager",
  "department": "Business Development",
  "team": null,
  "location": "London, United Kingdom",
  "locations": ["London, United Kingdom"],
  "remote": false,
  "workplaceType": "hybrid",
  "employmentType": null,
  "salary": { "min": 46000, "max": 54000, "currency": "GBP", "interval": "year", "text": "GBP 46,000–54,000 per year", "source": "ats" },
  "postedAt": "2026-09-09T08:35:19.000Z",
  "updatedAt": "2026-09-18T08:55:55.000Z",
  "jobUrl": "https://careers.airbnb.com/positions/8184174?gh_jid=8184174",
  "applyUrl": "https://careers.airbnb.com/positions/8184174?gh_jid=8184174",
  "descriptionText": "Airbnb was born in 2007 when two hosts welcomed three guests…",
  "descriptionHtml": "<div class=\"content-intro\">…",
  "scrapedAt": "2026-09-24T15:20:21.292Z"
}
```

## Use cases

- **Job boards and aggregators**: keep a niche job board filled with fresh roles from hand-picked companies.
- **Recruiting and sourcing**: watch target companies and react the day a role opens.
- **Sales and lead generation**: hiring is a buying signal. Find companies hiring for roles your product serves.
- **Salary research**: collect pay ranges by role, location and company.
- **Market and competitor research**: track which teams your competitors are growing.
- **AI agents and job alerts**: feed structured jobs into an LLM, a Slack alert or a spreadsheet.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. No start fee and no monthly rent. Jobs that don't match your filters are free. The Apify free plan covers thousands of jobs every month.

## Tips

- **Job alerts**: save the input as a task, turn on **Only new jobs since the last run** and add a schedule, for example every morning. Each run returns only the jobs posted since the previous one.
- **Salary data only**: turn on **Only jobs with a salary**.
- **Smaller results**: turn off **Include job descriptions**.
- **Many companies**: add as many boards as you like; they are scraped in parallel. A run summary with jobs found and errors per company is saved in the key-value store as `SUMMARY`.

## FAQ

**How do I find a company's Greenhouse board name?** Open any job of the company. If the link contains `greenhouse.io/<name>` or `gh_jid=`, the company uses Greenhouse, and `<name>` is the board name. For a company's own careers site with `gh_jid` links, the board name is often the company name, for example `stripe`.

**Is it legal to scrape Greenhouse?** The Actor reads the public job board API that Greenhouse offers for publishing jobs. Job postings are public business information, not personal data. Check the terms that apply to your use case.

**Why is `salary` empty for some jobs?** Not every company publishes pay. When a range is published on Greenhouse or written in the description, it is extracted; `salary.source` tells you which.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
