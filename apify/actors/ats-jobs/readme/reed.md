# Reed Jobs Scraper

**Scrape Reed.co.uk jobs in the UK by keyword and location.** Get title, company, salary as numbers, contract type, working hours, hybrid or remote, sector, full description, expiry date and apply link. Export to JSON, CSV or Excel, or use the API. **$1 per 1,000 jobs, no start fee.**

Scrape jobs from **Reed**, one of the UK's largest job sites (reed.co.uk), the way you search on the website: keywords, location and every Reed filter. Each job comes with the **salary as numbers** per year, day or hour, the contract type (permanent, contract or temporary), working hours, whether the job is **on-site, hybrid or remote**, the sector, county and region, the full description and the expiry date. Salaries that the employer hides stay empty instead of showing numbers the site keeps behind them. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Reed scraper do?

- 🔎 **Search like on the website**: keywords such as `data analyst` or `care assistant`, a town, city, county or postcode with a distance, or paste any reed.co.uk search link.
- 🎛️ **All Reed filters**: salary range, permanent, contract or temporary, full-time or part-time, direct employers or recruitment agencies, graduate jobs and date posted.
- 💰 **Salary as numbers**: "£125,000 - £160,000 per annum" becomes `{ "min": 125000, "max": 160000, "currency": "GBP", "interval": "year" }`. Day rates and hourly pay keep their period.
- 🙈 **Only salaries the employer shows**: for "Competitive salary" or "Salary negotiable" the salary stays empty. The site still carries numbers for those jobs, sometimes wrong ones such as £70,000 to £900,000.
- 🏢 **Hybrid and remote**: on-site, hybrid or remote for every job, plus sector, category, county, region and whether an agency or the employer posted it.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so jobs from company career sites and job boards fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Python Developer |
| `companyName` | McGregor Boyall |
| `location` / `county` / `region` | London / London / South East England |
| `workplaceType` / `employmentType` | onsite / full-time |
| `contractType` / `hours` | Permanent / full-time |
| `salary` | `{ "min": 125000, "max": 160000, "currency": "GBP", "interval": "year" }` |
| `postedAt` / `validThrough` | 2026-08-26 / 2026-10-07 |
| `sector` / `category` | Software Developer / Information Technology / Developer / Python Developer |
| `postedBy` / `easyApply` | agency / true |
| `jobUrl` / `applyUrl` | https://www.reed.co.uk/jobs/python-developer/57280155 |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Reed jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or paste links of searches you made on reed.co.uk.
2. Enter a **location** such as `London`, `Greater Manchester` or a postcode, and optionally a **distance** in miles.
3. Optionally choose a **salary range**, **job types**, **working hours**, **posted by** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for this and the other job scrapers, which all share one output format: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["python developer", "data engineer"],
  "location": "London",
  "distance": 20,
  "minSalary": 60000,
  "jobTypes": ["perm"],
  "postedWithinDays": 7
}
```

Job types are `perm`, `contract` and `temp`; working hours `fulltime` and `parttime`; posted by `direct` or `agency`. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "reed",
  "company": "457096",
  "companyName": "McGregor Boyall",
  "jobId": "57280155",
  "title": "Python Developer",
  "department": "IT & Telecoms",
  "location": "London",
  "locations": ["London"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 125000, "max": 160000, "currency": "GBP", "interval": "year", "text": "£ 125,000 - £ 160,000 per annum", "source": "listing" },
  "postedAt": "2026-08-26T14:59:12.087Z",
  "updatedAt": "2026-09-07T15:02:17.643Z",
  "jobUrl": "https://www.reed.co.uk/jobs/python-developer/57280155",
  "applyUrl": "https://www.reed.co.uk/jobs/python-developer/57280155",
  "descriptionText": "Python, React, SQL, AWS, Compliance, Market Surveillance\n\nMcGregor Boyall are partnered with a fast-growing multi-strategy…",
  "descriptionHtml": "<p><strong>Python, React, SQL, AWS, Compliance, Market Surveillance </strong></p>…",
  "contractType": "Permanent",
  "hours": "full-time",
  "sector": "Software Developer",
  "category": "Information Technology / Developer / Python Developer",
  "county": "London",
  "region": "South East England",
  "country": "United Kingdom",
  "postedBy": "agency",
  "easyApply": true,
  "reference": "37833JT",
  "validThrough": "2026-10-07T23:55:00",
  "companyUrl": "https://www.reed.co.uk/jobs/mcgregor-boyall-associates-limited/p20741",
  "scrapedAt": "2026-09-28T12:44:18.467Z"
}
```

## Use cases

- **Recruitment agencies**: see every new role in your sector and region each morning, with salary and contract type.
- **Job boards and aggregators**: fill a UK job board with fresh Reed listings.
- **Salary research**: compare UK pay by role, sector, region, contract type and hybrid or on-site work.
- **Sales and lead generation**: companies hiring are growing. Sector and company pages turn job ads into leads.
- **Labor market analytics**: track demand by sector, region and working pattern over time.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.90 per 1,000 jobs on Starter, $0.80 on Scale and $0.70 on Business, which is the "from" price shown in Apify Store. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 5,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details**. You still get title, company, location, salary, hybrid or remote, contract type and date.
- **Stricter results**: Reed also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have no salary?** Employers can hide the salary on Reed ("Competitive salary" or "Salary negotiable"). The Actor then leaves the salary empty, because the numbers behind it are not shown on the site and are often wrong.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers. The job description is saved as the employer wrote it.

**Is it legal to scrape Reed?** The Actor reads the public job listings Reed shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
