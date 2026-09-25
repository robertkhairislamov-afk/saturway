# SEEK Jobs Scraper

**Scrape SEEK jobs in Australia and New Zealand by keyword and location.** Get title, company, salary as numbers, work type, classification, full description, expiry date and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **SEEK**, the biggest job site in Australia and New Zealand (`seek.com.au`, `seek.co.nz`), the way you search on the website: keywords, location and every SEEK filter. Each job comes with the **salary as numbers** (SEEK shows pay as free text, such as "$120k - $140k p.a. + Super"), work type, work arrangement, classification, suburb, state and postcode, the full description, the expiry date and the company's industry, size and website. SEEK shows at most 550 jobs per search; this scraper splits big searches to **get them all**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this SEEK scraper do?

- 🔎 **Search like on the website**: keywords such as `registered nurse` or `python developer`, a suburb, city or state, or paste any seek.com.au or seek.co.nz search link.
- 🌏 **Australia and New Zealand**: pick the country; salaries come in AUD or NZD.
- 🎛️ **All SEEK filters**: classification, work type (full time, part time, contract/temp, casual), work arrangement (on-site, hybrid, remote), date listed and minimum salary per year, month or hour. Sort by newest or by relevance.
- ♾️ **Beyond 550 results**: big searches are split by classification, work type and salary band, then merged without duplicates.
- 💰 **Salary as numbers**: "$120k - $140k p.a. + Super" becomes `{ "min": 120000, "max": 140000, "currency": "AUD", "interval": "year" }`. Hourly, daily and fortnightly pay are recognized too.
- 🏢 **Company profile**: industry, number of employees, website and the company's SEEK rating.
- 📍 **Suburb, state and postcode** of every job, ready for maps and regional reports.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our [Greenhouse](https://apify.com/robertosan16/greenhouse-jobs-scraper), [Lever](https://apify.com/robertosan16/lever-jobs-scraper), [Ashby](https://apify.com/robertosan16/ashby-jobs-scraper), [Workday](https://apify.com/robertosan16/workday-jobs-scraper), [Dice](https://apify.com/robertosan16/dice-jobs-scraper) and [Welcome to the Jungle](https://apify.com/robertosan16/welcome-to-the-jungle-jobs-scraper) scrapers**, so jobs from all of them fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Registered Nurse - PACU/Anaesthetics |
| `companyName` | Mater Group |
| `department` / `subClassification` | Healthcare & Medical / Nursing - Theatre & Recovery |
| `location` / `suburb` / `state` / `postcode` | Springfield, Brisbane QLD / Springfield / Queensland / 4300 |
| `workplaceType` / `employmentType` | onsite / full-time |
| `salary` | `{ "min": 44.06, "max": 56.52, "currency": "AUD", "interval": "hour" }` |
| `bulletPoints` | the three selling points shown on SEEK |
| `postedAt` / `validThrough` | 2026-09-25 / 2026-10-09 |
| `companyIndustry` / `companySize` / `companyWebsite` | Healthcare Services / More than 10,000 employees / http://mater.org.au/ |
| `jobUrl` / `applyUrl` | https://www.seek.com.au/job/94881142 |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape SEEK jobs

1. Enter **job titles or keywords**, one search per line, for example `registered nurse`. Or paste links of searches you made on SEEK.
2. Pick the **country** and optionally a **location** such as `Sydney NSW` or `All Melbourne VIC`.
3. Optionally choose **classifications**, **work types**, **work arrangements**, a **minimum salary** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "searchQueries": ["registered nurse", "data analyst"],
  "country": "AU",
  "location": "Brisbane QLD",
  "workTypes": ["242", "243"],
  "postedWithinDays": 7,
  "onlyWithSalary": true
}
```

Work types are `242` full time, `243` part time, `244` contract/temp and `245` casual/vacation. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "seek",
  "company": "20898315",
  "companyName": "Mater Group",
  "jobId": "94881142",
  "title": "Registered Nurse - PACU/Anaesthetics",
  "department": "Healthcare & Medical",
  "location": "Springfield, Brisbane QLD",
  "locations": ["Springfield, Brisbane QLD"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 44.06, "max": 56.52, "currency": "AUD", "interval": "hour", "text": "$44.06 - $56.52 per hour + super + benefits!", "source": "listing" },
  "postedAt": "2026-09-25T06:39:14.587Z",
  "jobUrl": "https://www.seek.com.au/job/94881142",
  "applyUrl": "https://www.seek.com.au/job/94881142/apply",
  "descriptionText": "About the role\n\nMater Hospital Springfield has an exciting opportunity for experienced Registered Nurses…",
  "descriptionHtml": "<p><strong>About the role</strong></p>…",
  "subClassification": "Nursing - Theatre & Recovery",
  "bulletPoints": [
    "Make a difference and join Mater Hospital Springfield's new public hospital!",
    "Increase take-home pay with tax-free NFP Salary Packaging up to $15,900",
    "Permanent full-time or part-time opportunity based at Springfield!"
  ],
  "suburb": "Springfield",
  "state": "Queensland",
  "postcode": "4300",
  "country": "Australia",
  "validThrough": "2026-10-09T13:55:00.000Z",
  "companyIndustry": "Healthcare Services",
  "companySize": "More than 10,000 employees",
  "companyWebsite": "http://mater.org.au/",
  "companyRating": 2.3,
  "companyReviewCount": 189,
  "companyLogoUrl": "https://bx-branding-gateway.cloud.seek.com.au/….1/jdpLogo",
  "scrapedAt": "2026-09-25T17:15:58.793Z"
}
```

## Use cases

- **Recruitment agencies**: see every new role in your sector and region each morning, with pay and company size.
- **Job boards and aggregators**: fill an Australian or New Zealand job board with fresh SEEK listings.
- **Sales and lead generation**: companies hiring are growing. Industry, size and website turn job ads into leads.
- **Salary research**: compare pay by role, classification, state and work type, with hourly and yearly rates as numbers.
- **Labor market analytics**: track demand by classification, suburb and work arrangement over time.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details**. You still get title, company, location, salary, work type, date and the selling points.
- **Stricter results**: SEEK also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Location names**: use them as SEEK shows them, such as `Sydney NSW`, `All Sydney NSW` (the whole region) or `Western Australia WA`. The log warns you when SEEK does not know a location.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have no salary?** Many ads show text such as "Competitive salary" instead of numbers. When numbers are given, they are parsed; `salary.text` keeps SEEK's original wording.

**Does it collect recruiter contact details?** No. It saves the job ad and company information, not phone numbers or names of recruiters.

**Is it legal to scrape SEEK?** The Actor reads the public job listings SEEK shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
