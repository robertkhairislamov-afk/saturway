# Dice Jobs Scraper

**Scrape Dice.com jobs by keyword and location.** Get title, company, salary, skills, location, description, job URL and posting date. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape US tech jobs from **Dice.com** the way you search on the website: keywords, location, distance and every Dice filter. Get the title, company, location, workplace type, employment type, **salary as numbers**, **skills**, full description, posting and expiry dates and the job link. Dice shows at most 750 jobs per search; this scraper splits big searches and **gets them all**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Dice scraper do?

- 🔎 **Search like on dice.com**: keywords, location and radius, or paste any dice.com search link with its filters.
- 🎛️ **All Dice filters**: remote, hybrid or on-site; full-time, part-time, contract or third party; posted today, in 3 or 7 days; direct hire or recruiter; Easy Apply; visa sponsorship.
- ♾️ **Beyond 750 results**: big searches are split by employer and employment type and merged without duplicates.
- 💰 **Salary as numbers**: "$$68 - $68.25 per hour" becomes `{ "min": 68, "max": 68.25, "currency": "USD", "interval": "hour" }`.
- 🧠 **Skills** listed on each job, such as Python, Apache Kafka or AWS.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so jobs from company career sites and job boards fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | DATA ENGINEER |
| `companyName` | AaraTechnologies Inc |
| `location` | Virginia Beach, Virginia, USA |
| `remote` / `workplaceType` | true / hybrid |
| `employmentType` / `employerType` | contract / Direct Hire |
| `salary` | `{ "min": 65000, "max": 75000, "currency": "USD", "interval": "year" }` |
| `skills` | Amazon Redshift, Amazon S3, Data Engineering, … |
| `postedAt` / `updatedAt` / `validThrough` | 2026-09-23 / 2026-09-23 / 2026-10-24 |
| `easyApply` | true |
| `jobUrl` | https://www.dice.com/job-detail/8686974e-… |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Dice jobs

1. Enter **search keywords**, for example `python developer`, one search per line. Or paste links of searches you made on dice.com.
2. Optionally set a **location** and **distance**, and pick **Dice filters** such as Remote or Contract.
3. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for this and the other job scrapers, which all share one output format: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["python developer", "data engineer"],
  "location": "New York, NY",
  "radius": 50,
  "workplaceTypes": ["Remote", "Hybrid"],
  "employmentTypes": ["FULLTIME"],
  "postedDate": "SEVEN",
  "onlyWithSalary": true
}
```

### Example output

```json
{
  "ats": "dice",
  "company": "5373bd70-cbb2-5dd3-bdde-e83685131c78",
  "companyName": "AaraTechnologies Inc",
  "jobId": "8686974e-3d05-4502-ab10-fa247bf498fd",
  "requisitionId": null,
  "title": "DATA ENGINEER",
  "department": null,
  "team": null,
  "location": "Virginia Beach, Virginia, USA",
  "locations": ["Virginia Beach, Virginia, USA"],
  "remote": true,
  "workplaceType": "hybrid",
  "employmentType": "contract",
  "salary": { "min": 65000, "max": 75000, "currency": "USD", "interval": "year", "text": "$65,000 - $75,000", "source": "listing" },
  "postedAt": "2026-09-23T13:25:10.000Z",
  "updatedAt": "2026-09-23T13:25:10.000Z",
  "jobUrl": "https://www.dice.com/job-detail/8686974e-3d05-4502-ab10-fa247bf498fd",
  "applyUrl": "https://www.dice.com/job-detail/8686974e-3d05-4502-ab10-fa247bf498fd",
  "descriptionText": "Data Engineer Healthcare (2-3 Years Experience)…",
  "descriptionHtml": "<html>…",
  "skills": ["Amazon Redshift", "Amazon S3", "Amazon Web Services", "Analytical Skill", "Data Engineering", "Data Integration"],
  "easyApply": true,
  "employerType": "Direct Hire",
  "validThrough": "2026-10-24T13:25:10.000Z",
  "companyLogoUrl": "https://d3qscgr6xsioh.cloudfront.net/Cc9qr4NeQYuTPwnOLcJn_….png",
  "scrapedAt": "2026-09-24T17:05:07.622Z"
}
```

## Use cases

- **Tech recruiting and staffing**: see every new contract and full-time role for your stack, every morning.
- **Job alerts and niche job boards**: publish fresh tech jobs by skill, city or remote status.
- **Sales and lead generation**: companies hiring for a technology are buying tools and services around it.
- **Salary and skills research**: compare rates and pay ranges by skill, location and contract type.
- **Labor market analytics**: track demand for skills such as Python, Kafka or Kubernetes over time.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.45 per 1,000 jobs on Starter, $0.40 on Scale and $0.35 on Business, which is the "from" price shown in Apify Store. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details** to skip the job pages. You still get title, company, location, salary, dates and a short summary.
- **Stricter results**: Dice searches job descriptions too. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why not just ask an AI chatbot?** A chatbot with web search reads a few pages and retells them, so it finds a handful of jobs. In our test in October 2026, a chatbot asked for every nurse and dental assistant job in Adelaide listed about 10; our [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper), which shares this Actor's code, returned 1,480 from SEEK, Indeed, Glassdoor and LinkedIn in three minutes, each with its link and date. This Actor gives you every job the site shows for your search, word for word and in the same fields every time, so you can load them into a spreadsheet, database or CRM, get only new jobs on a schedule, and pay a fixed price per 1,000 jobs instead of paying an AI to read every page. AI agents use it the same way: through Apify's MCP server, an agent can call this Actor whenever it needs real job data.

**Why do some jobs have no salary?** Many listings say "Depends on Experience". When a rate or range is given, it is parsed into numbers; `salary.text` keeps the original wording.

**Does it collect recruiter contact details?** No. It saves the job listing and the company, not the names, emails or phone numbers of recruiters.

**Is it legal to scrape Dice?** The Actor reads the public job listings Dice shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
