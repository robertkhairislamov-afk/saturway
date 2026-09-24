# Lever Jobs Scraper

Scrape every open job from any company that hires with **Lever** (`jobs.lever.co`): title, team, department, locations, workplace type, commitment, **salary range**, full description, posting date and apply link. Add several companies at once, filter by keyword, location, remote or date, and run it on a schedule to get **only new jobs**. It reads the official public Lever postings API: fast, stable, no browser and no login.

## What can this Lever scraper do?

- 🏢 **Scrape many companies in one run**: Palantir, Zoox, Spotify and every other company with a `jobs.lever.co` page, including EU sites on `jobs.eu.lever.co`.
- 💰 **Salary ranges**: the pay range companies publish on Lever, plus ranges found in the description, as `min`, `max`, `currency` and `interval` (year or hour).
- 🔎 **Filters**: title keywords, excluded words, locations, remote only, teams and departments, posted in the last N days, only jobs with a salary.
- 🆕 **Only new jobs since the last run**: made for job alerts and monitoring.
- 🏷️ **Real company names** from the job site, workplace type (on-site, hybrid, remote) and commitment (full-time, contract, internship).
- 🧾 **Complete descriptions**: the intro, every requirements and responsibilities list, pay notes and the closing text, as plain text and HTML.
- 🧩 **Same output as our [Greenhouse](https://apify.com/robertosan16/greenhouse-jobs-scraper), [Ashby](https://apify.com/robertosan16/ashby-jobs-scraper) and [Workday](https://apify.com/robertosan16/workday-jobs-scraper) scrapers**, so jobs from all four systems fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Autonomy System Test Engineer |
| `companyName` / `company` | Zoox / zoox |
| `department` / `team` | Software / Software Platforms and Product |
| `location` / `locations` | Foster City, CA |
| `remote` / `workplaceType` | false / hybrid |
| `employmentType` | full-time |
| `salary` | `{ "min": 144000, "max": 193000, "currency": "USD", "interval": "year" }` |
| `postedAt` | 2026-05-04T23:11:01.125Z |
| `jobUrl` / `applyUrl` | https://jobs.lever.co/zoox/f4746da4-… |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Lever jobs

1. Add the companies: the name from the link (`zoox` in `jobs.lever.co/zoox`) or the whole link.
2. Optionally set filters: keywords such as `engineer` or `account executive`, locations such as `CA` or `Remote`, teams, a date range.
3. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "companies": ["zoox", "https://jobs.lever.co/palantir", "spotify"],
  "keywords": ["engineer", "scientist"],
  "excludeKeywords": ["intern"],
  "locations": ["California", "Remote"]
}
```

### Example output

```json
{
  "ats": "lever",
  "company": "zoox",
  "companyName": "Zoox",
  "jobId": "f4746da4-8eb8-43e2-b7ce-bf3c7cf9640d",
  "requisitionId": null,
  "title": "Autonomy System Test Engineer",
  "department": "Software",
  "team": "Software Platforms and Product",
  "location": "Foster City, CA",
  "locations": ["Foster City, CA"],
  "remote": false,
  "workplaceType": "hybrid",
  "employmentType": "full-time",
  "salary": { "min": 144000, "max": 193000, "currency": "USD", "interval": "year", "text": "USD 144,000–193,000 per year", "source": "ats" },
  "postedAt": "2026-05-04T23:11:01.125Z",
  "updatedAt": null,
  "jobUrl": "https://jobs.lever.co/zoox/f4746da4-8eb8-43e2-b7ce-bf3c7cf9640d",
  "applyUrl": "https://jobs.lever.co/zoox/f4746da4-8eb8-43e2-b7ce-bf3c7cf9640d/apply",
  "descriptionText": "Autonomous vehicles have some of the largest, most complex software ever shipped…",
  "descriptionHtml": "<div>…",
  "scrapedAt": "2026-09-24T15:24:02.118Z"
}
```

## Use cases

- **Job alerts and niche job boards**: publish new roles from your favorite startups automatically.
- **Recruiting**: track target companies and see new openings the day they appear.
- **Sales prospecting**: a company hiring SDRs, data engineers or security staff is a warm lead for the right product.
- **Compensation research**: compare pay ranges by role, team and city.
- **Competitive intelligence**: follow which teams and locations competitors invest in.
- **LLM and agent workflows**: structured, clean job data for classification, matching and summaries.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. No start fee and no monthly rent. Jobs filtered out by your settings are free. The Apify free plan covers thousands of jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and schedule it. Connect the dataset to Slack, email, Google Sheets or Zapier through Apify integrations.
- **Only paid transparency roles**: turn on **Only jobs with a salary**.
- **Lighter results**: turn off **Include job descriptions**.
- **Errors per company**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**How do I know a company uses Lever?** Its job links start with `jobs.lever.co/<name>/`. The `<name>` part is what you enter.

**Is it legal to scrape Lever?** The Actor uses the public postings API that Lever provides for publishing jobs. Job postings are public business information, not personal data. Check the terms that apply to your use case.

**Why do some jobs have no salary?** Companies decide whether to publish pay. When a range is set on Lever or written in the description, it is extracted, and `salary.source` says where it came from.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
