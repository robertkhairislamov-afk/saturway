# Ashby Jobs Scraper

**Scrape all jobs of any company on Ashby.** Get title, department, locations, compensation, description, apply link and posting date. Export to JSON, CSV or Excel, or use the API. **$1 per 1,000 jobs, no start fee.**

Scrape every open job from any company that hires with **Ashby** (`jobs.ashbyhq.com`): title, department, team, all locations, workplace type, employment type, **compensation**, full description, publish date and apply link. Add many companies at once, filter by keyword, location, remote or date, and run it on a schedule to get **only new jobs**. It reads the official public Ashby job posting API, so it is fast and stable, with no browser and no login.

## What can this Ashby scraper do?

- 🏢 **Scrape many startups in one run**: Ramp, Notion, OpenAI, Linear, The Browser Company and every other company with a `jobs.ashbyhq.com` page.
- 💰 **Compensation**: the salary range Ashby shows on the job (for example "$211.4K – $290.6K • Offers Equity") as `min`, `max`, `currency` and `interval`, plus ranges written in the description.
- 🌍 **All locations**: the main location and every secondary location, with the remote flag and workplace type (on-site, hybrid, remote).
- 🔎 **Filters**: title keywords, excluded words, locations, remote only, departments and teams, posted in the last N days, only jobs with a salary.
- 🆕 **Only new jobs since the last run**: for job alerts and hiring-signal monitoring.
- 🏷️ **Company names** as shown on the job board.
- 🧩 **Same output as our [Greenhouse](https://apify.com/robertosan16/greenhouse-jobs-scraper), [Lever](https://apify.com/robertosan16/lever-jobs-scraper) and [Workday](https://apify.com/robertosan16/workday-jobs-scraper) scrapers**, so jobs from all four systems merge into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Security Engineer, Cloud |
| `companyName` / `company` | Ramp / ramp |
| `department` / `team` | Engineering / Backend |
| `location` / `locations` | New York, NY (HQ); Remote (US); Miami, FL |
| `remote` / `workplaceType` | true / hybrid |
| `employmentType` | full-time |
| `salary` | `{ "min": 211400, "max": 290600, "currency": "USD", "interval": "year" }` |
| `postedAt` | 2026-04-07T17:12:35.753Z |
| `jobUrl` / `applyUrl` | https://jobs.ashbyhq.com/ramp/34413f8d-… |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Ashby jobs

1. Add the companies: the board name from the link (`ramp` in `jobs.ashbyhq.com/ramp`) or the whole link.
2. Optionally set filters: keywords such as `engineer` or `designer`, locations such as `New York` or `Remote`, departments, a date range.
3. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "companies": ["ramp", "https://jobs.ashbyhq.com/notion", "linear"],
  "keywords": ["engineer*"],
  "remoteOnly": true,
  "onlyWithSalary": true
}
```

### Example output

```json
{
  "ats": "ashby",
  "company": "ramp",
  "companyName": "Ramp",
  "jobId": "34413f8d-26bf-4bbc-8ade-eb309a0e2245",
  "requisitionId": null,
  "title": "Security Engineer, Cloud",
  "department": "Engineering",
  "team": "Backend",
  "location": "New York, NY (HQ)",
  "locations": ["New York, NY (HQ)", "Remote (Canada)", "Remote (US)", "Miami, FL"],
  "remote": true,
  "workplaceType": "hybrid",
  "employmentType": "full-time",
  "salary": { "min": 211400, "max": 290600, "currency": "USD", "interval": "year", "text": "$211.4K - $290.6K", "source": "ats" },
  "postedAt": "2026-04-07T17:12:35.753Z",
  "updatedAt": null,
  "jobUrl": "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245",
  "applyUrl": "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245/application",
  "descriptionText": "ABOUT RAMP\n\nRamp is building the smart infrastructure for finance teams…",
  "descriptionHtml": "<h1><strong>About Ramp</strong></h1>…",
  "scrapedAt": "2026-09-24T15:26:40.520Z"
}
```

## Use cases

- **Startup job boards**: many fast-growing startups use Ashby. Build a curated board or newsletter of their roles.
- **Recruiting and talent intelligence**: see what top startups hire for and how much they pay.
- **Sales prospecting**: startups hiring for a function are buying tools for it. Turn job posts into leads.
- **Compensation benchmarks**: Ashby boards publish salary ranges more often than most systems.
- **Investors and analysts**: track hiring velocity across a portfolio or a market.
- **AI pipelines**: clean, structured jobs for matching, tagging and summaries.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. No start fee and no monthly rent. Jobs filtered out by your settings are free. The Apify free plan covers thousands of jobs every month.

## Tips

- **Job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Salary data**: turn on **Only jobs with a salary**.
- **Lighter results**: turn off **Include job descriptions**.
- **Errors per company**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**How do I know a company uses Ashby?** Its job links start with `jobs.ashbyhq.com/<name>/`. Enter `<name>`; upper or lower case does not matter, and names with spaces work too.

**Is it legal to scrape Ashby?** The Actor uses the public job posting API Ashby provides for publishing jobs. Job postings are public business information, not personal data. Check the terms that apply to your use case.

**Why do some jobs have no salary?** Companies choose whether to show compensation. When it is shown on Ashby or written in the description, it is extracted, and `salary.source` says where it came from.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
