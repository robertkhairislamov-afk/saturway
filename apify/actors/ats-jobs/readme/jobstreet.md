# Jobstreet Jobs Scraper

**Scrape Jobstreet jobs in Malaysia, Singapore, the Philippines and Indonesia by keyword and location.** Get title, company, salary as numbers, work type, classification, full description, expiry date and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **Jobstreet**, the leading job site in Southeast Asia (`my.jobstreet.com`, `sg.jobstreet.com`, `ph.jobstreet.com`, `id.jobstreet.com`), the way you search on the website: keywords, location and every Jobstreet filter. Each job comes with the **salary as numbers** in the local currency (for example "RM 10,000 – RM 15,000 per month"), work type, work arrangement, classification, location, the full description, the expiry date and the company's industry, size and website. Jobstreet shows at most 550 jobs per search; this scraper splits big searches to **get them all**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Jobstreet scraper do?

- 🔎 **Search like on the website**: keywords such as `software engineer` or `accountant`, a city or region, or paste any Jobstreet search link.
- 🌏 **Four countries**: Malaysia, Singapore, the Philippines and Indonesia. Salaries come in MYR, SGD, PHP or IDR, and in USD when a job in Malaysia, the Philippines or Indonesia pays in dollars.
- 🎛️ **All Jobstreet filters**: classification, work type (full time, part time, contract/temp, casual), work arrangement (on-site, hybrid, remote), date listed and minimum salary per month, year or hour. Sort by newest or by relevance.
- ♾️ **Beyond 550 results**: big searches are split by classification, work type and salary band, then merged without duplicates.
- 💰 **Salary as numbers**: "RM 3,800 – RM 5,000 per month" becomes `{ "min": 3800, "max": 5000, "currency": "MYR", "interval": "month" }`. Labels such as "Rp 5.250.000", "₱40,000" or "30k-35k/month" are understood too.
- 🏢 **Company profile**: industry, number of employees, website and the company's rating on the site.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so jobs from company career sites and job boards fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | System Analyst, Digital Banking |
| `companyName` | United Overseas Bank |
| `department` / `subClassification` | Banking & Financial Services / Banking - Business |
| `location` / `state` / `country` | Kuala Lumpur City Centre, Kuala Lumpur / Kuala Lumpur / Malaysia |
| `workplaceType` / `employmentType` | onsite / full-time |
| `salary` | `{ "min": 10000, "max": 15000, "currency": "MYR", "interval": "month" }` |
| `postedAt` / `validThrough` | 2026-09-03 / 2026-10-03 |
| `companyIndustry` / `companySize` / `companyWebsite` | Banking & Credit / 1,001-5,000 employees / http://www.uob.com.my |
| `jobUrl` / `applyUrl` | https://my.jobstreet.com/job/94398283 |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Jobstreet jobs

1. Enter **job titles or keywords**, one search per line, for example `accountant`. Or paste links of searches you made on Jobstreet.
2. Pick the **country** and optionally a **location** such as `Kuala Lumpur`, `Penang`, `Makati City` or `Jakarta Raya`.
3. Optionally choose **classifications**, **work types**, **work arrangements**, a **minimum salary** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "searchQueries": ["software engineer", "accountant"],
  "country": "MY",
  "location": "Kuala Lumpur",
  "workTypes": ["242"],
  "postedWithinDays": 7,
  "onlyWithSalary": true
}
```

Work types are `242` full time, `243` part time, `244` contract/temp and `245` casual/vacation. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "jobstreet",
  "company": "60798117",
  "companyName": "United Overseas Bank",
  "jobId": "94398283",
  "title": "System Analyst, Digital Banking",
  "department": "Banking & Financial Services",
  "location": "Kuala Lumpur City Centre, Kuala Lumpur",
  "locations": ["Kuala Lumpur City Centre, Kuala Lumpur"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 10000, "max": 15000, "currency": "MYR", "interval": "month", "text": "RM 10,000 – RM 15,000 per month", "source": "listing" },
  "postedAt": "2026-09-03T08:55:11.521Z",
  "jobUrl": "https://my.jobstreet.com/job/94398283",
  "applyUrl": "https://my.jobstreet.com/job/94398283/apply",
  "descriptionText": "About Us:\n\nUOB Innovation Hub 2 (InnoHub2) is a UOB-wholly owned subsidiary and a Centre of Excellence based in Malaysia…",
  "descriptionHtml": "<p><strong>About Us:</strong></p>…",
  "subClassification": "Banking - Business",
  "suburb": "Kuala Lumpur City Centre",
  "state": "Kuala Lumpur",
  "country": "Malaysia",
  "validThrough": "2026-10-03T13:59:59.999Z",
  "companyIndustry": "Banking & Credit",
  "companySize": "1,001-5,000 employees",
  "companyWebsite": "http://www.uob.com.my",
  "companyRating": 4,
  "companyReviewCount": 246,
  "companyLogoUrl": "https://bx-branding-gateway.cloud.seek.com.au/….1/jdpLogo",
  "scrapedAt": "2026-09-26T10:49:12.514Z"
}
```

## Use cases

- **Recruitment agencies**: see every new role in your sector and city each morning, with pay and company size.
- **Job boards and aggregators**: fill a Malaysian, Singaporean, Filipino or Indonesian job board with fresh listings.
- **Sales and lead generation**: companies hiring are growing. Industry, size and website turn job ads into leads.
- **Salary research**: compare monthly pay by role, classification, city and work type across four countries.
- **Labor market analytics**: track demand by classification, location and work arrangement over time.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details**. You still get title, company, location, salary, work type and date.
- **Stricter results**: Jobstreet also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Several countries**: run one search per country, or save a task for each.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have no salary?** Many ads show text such as "Competitive" instead of numbers. When numbers are given, they are parsed; `salary.text` keeps the original wording.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers, and they are not requested. The job description is saved as the employer wrote it.

**Is it legal to scrape Jobstreet?** The Actor reads the public job listings Jobstreet shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
