# JobsDB Jobs Scraper

**Scrape JobsDB jobs in Hong Kong and Thailand by keyword and location.** Get title, company, salary as numbers, work type, classification, full description, expiry date and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **JobsDB** (`hk.jobsdb.com`, `th.jobsdb.com`), the way you search on the website: keywords, location and every JobsDB filter. Each job comes with the **salary as numbers** in HKD or THB (for example "$20,000 – $30,000 per month"), work type, work arrangement, classification, district, the full description, the expiry date and the company's industry, size and website. JobsDB shows at most 550 jobs per search; this scraper splits big searches to **get them all**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this JobsDB scraper do?

- 🔎 **Search like on the website**: keywords such as `accountant` or `software engineer`, a district or city, or paste any JobsDB search link.
- 🌏 **Hong Kong and Thailand**: pick the country; salaries come in HKD or THB.
- 🎛️ **All JobsDB filters**: classification, work type (full time, part time, contract/temp, casual), work arrangement (on-site, hybrid, remote), date listed and minimum salary per month, year or hour. Sort by newest or by relevance.
- ♾️ **Beyond 550 results**: big searches are split by classification, work type and salary band, then merged without duplicates.
- 💰 **Salary as numbers**: "$20,000 – $30,000 per month" becomes `{ "min": 20000, "max": 30000, "currency": "HKD", "interval": "month" }`. Labels such as "30k-35k/month", "$400k - $500k p.a." or "฿24,000 per month" are understood too.
- 🏢 **Company profile**: industry, number of employees, website and the company's rating on the site.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so jobs from company career sites and job boards fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Corporate Services Manager |
| `companyName` | Urban Coffee Roaster |
| `department` / `subClassification` | Accounting / Financial Managers & Controllers |
| `location` / `suburb` / `state` | Tai Kok Tsui, Yau Tsim Mong District / Tai Kok Tsui / Yau Tsim Mong District |
| `workplaceType` / `employmentType` | onsite / full-time |
| `salary` | `{ "min": 25000, "max": 25000, "currency": "HKD", "interval": "month" }` |
| `postedAt` / `validThrough` | 2026-09-16 / 2026-10-16 |
| `companyIndustry` / `companySize` | Drinks Retail / 11-50 employees |
| `jobUrl` / `applyUrl` | https://hk.jobsdb.com/job/94677274 |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape JobsDB jobs

1. Enter **job titles or keywords**, one search per line, for example `accountant`. Or paste links of searches you made on JobsDB.
2. Pick the **country** and optionally a **location** such as `Kowloon`, `Hong Kong Island` or `Bangkok`.
3. Optionally choose **classifications**, **work types**, **work arrangements**, a **minimum salary** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "searchQueries": ["accountant", "marketing manager"],
  "country": "HK",
  "location": "Kowloon",
  "workTypes": ["242"],
  "postedWithinDays": 7,
  "onlyWithSalary": true
}
```

Work types are `242` full time, `243` part time, `244` contract/temp and `245` casual/vacation. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "jobsdb",
  "company": "60179574",
  "companyName": "Urban Coffee Roaster",
  "jobId": "94677274",
  "title": "Corporate Services Manager",
  "department": "Accounting",
  "location": "Tai Kok Tsui, Yau Tsim Mong District",
  "locations": ["Tai Kok Tsui, Yau Tsim Mong District"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 25000, "max": 25000, "currency": "HKD", "interval": "month", "text": "$25,000 per month", "source": "listing" },
  "postedAt": "2026-09-16T11:25:42.311Z",
  "jobUrl": "https://hk.jobsdb.com/job/94677274",
  "applyUrl": "https://hk.jobsdb.com/job/94677274/apply",
  "descriptionText": "About the Company\n\nWe are a rapidly growing F&B brand operating a network of popular cafes and specialty restaurants…",
  "descriptionHtml": "<p>About the Company</p>…",
  "subClassification": "Financial Managers & Controllers",
  "suburb": "Tai Kok Tsui",
  "state": "Yau Tsim Mong District",
  "country": "Hong Kong SAR",
  "validThrough": "2026-10-16T12:59:59.999Z",
  "companyIndustry": "Drinks Retail",
  "companySize": "11-50 employees",
  "companyLogoUrl": "https://bx-branding-gateway.cloud.seek.com.au/….1/jdpLogo",
  "scrapedAt": "2026-09-26T10:50:30.934Z"
}
```

## Use cases

- **Recruitment agencies and headhunters**: see every new role in Hong Kong or Thailand each morning, with pay and company size.
- **Job boards and aggregators**: fill a Hong Kong or Thai job board with fresh JobsDB listings.
- **Sales and lead generation**: companies hiring are growing. Industry, size and website turn job ads into leads.
- **Salary research**: compare monthly pay by role, classification, district and work type.
- **Labor market analytics**: track demand by classification and location over time.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details**. You still get title, company, location, salary, work type and date.
- **Stricter results**: JobsDB also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have no salary?** Many ads show text such as "Competitive" instead of numbers. When numbers are given, they are parsed; `salary.text` keeps the original wording.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers, and they are not requested. The job description is saved as the employer wrote it.

**Is it legal to scrape JobsDB?** The Actor reads the public job listings JobsDB shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
