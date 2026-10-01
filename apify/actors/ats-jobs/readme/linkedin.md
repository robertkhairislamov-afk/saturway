# LinkedIn Jobs Scraper

**Scrape public LinkedIn job listings by keyword and location, without login or cookies.** Get title, company, location, seniority, employment type, job function, industry, number of applicants, salary as numbers, full description and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **LinkedIn**, the largest job site in the world, the way you search on linkedin.com/jobs: keywords, location and filters. The Actor reads only the public job pages LinkedIn shows to visitors who are not logged in, so there is no account to connect and nothing to ban. Each job comes with the full description, seniority, employment type, job function, industries, the number of applicants and the salary as numbers when the job states one. LinkedIn lists at most 1,000 jobs per search; for the United States this scraper searches **state by state to get more**. Run it on a schedule to get **only new jobs**.

## What can this LinkedIn jobs scraper do?

- 🔎 **Search like on the website**: keywords such as `data analyst` or `registered nurse`, any country, region or city, or paste any linkedin.com/jobs search link.
- 🔓 **No login, no cookies**: only public job listings. Your LinkedIn account is never used.
- 🎛️ **Filters that really work**: date posted, Easy Apply only, distance around a city, job type and experience level. LinkedIn ignores job type and experience level for visitors who are not logged in, so the Actor checks them on every job page; jobs that do not match are skipped and free.
- ♾️ **Beyond 1,000 results in the US**: a search of the whole United States that reaches LinkedIn's limit is searched again in each state, then merged without duplicates.
- 📄 **Full job details**: description as text and HTML, seniority, employment type, job function, industries, number of applicants, and whether you apply with Easy Apply or on the company site.
- 💰 **Salary as numbers**: pay ranges from the listing or the description, such as "$81,499.00 - $138,549.00", become `min`, `max`, `currency` and `interval`.
- 🛡️ **Built not to break**: requests go through rotating residential proxy addresses, and a blocked or empty page is tried again from another one. If a job page still fails, the job is saved with the search result data instead of being lost.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so LinkedIn jobs and jobs from other boards and career sites fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Data Analyst |
| `companyName` / `companyUrl` | ICF / https://www.linkedin.com/company/icf-international |
| `location` | Silver Spring, MD |
| `seniorityLevel` / `employmentType` | Entry level / full-time |
| `jobFunction` / `industries` | Information Technology / Business Consulting and Services |
| `applicants` / `applicantsCount` | Over 200 applicants / 200 |
| `salary` | `{ "min": 81499, "max": 138549, "currency": "USD", "interval": "year" }` |
| `postedAt` | 2026-09-24 |
| `easyApply` | false (apply on the company site) |
| `jobUrl` / `applyUrl` | https://www.linkedin.com/jobs/view/4470050151/ |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape LinkedIn jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or paste links of searches you made on linkedin.com/jobs.
2. Enter a **location** such as `United States`, `London, England, United Kingdom` or `Berlin`. Leave it empty to search worldwide.
3. Optionally choose a **date range**, **Easy Apply only**, a **distance**, **job types** or **experience levels**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for this and the other job scrapers, which all share one output format: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data analyst", "business intelligence analyst"],
  "location": "United States",
  "jobTypes": ["F"],
  "experienceLevels": ["2", "3"],
  "postedWithinDays": 7
}
```

Job types are `F` full-time, `P` part-time, `C` contract, `T` temporary, `V` volunteer, `I` internship and `O` other; experience goes from `1` internship to `6` executive. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "linkedin",
  "company": "icf-international",
  "companyName": "ICF",
  "jobId": "4470050151",
  "title": "Data Analyst",
  "department": "Information Technology",
  "location": "Silver Spring, MD",
  "locations": ["Silver Spring, MD"],
  "remote": false,
  "workplaceType": null,
  "employmentType": "full-time",
  "salary": { "min": 81499, "max": 138549, "currency": "USD", "interval": "year", "text": "$81,499.00 - $138,549.00", "source": "description" },
  "postedAt": "2026-09-24T00:00:00.000Z",
  "jobUrl": "https://www.linkedin.com/jobs/view/4470050151/",
  "applyUrl": "https://www.linkedin.com/jobs/view/4470050151/",
  "descriptionText": "Description\n\nICF is seeking a Data Analyst to support an enterprise learning data and analytics platform…",
  "descriptionHtml": "<strong>Description<br><br></strong>ICF is seeking a Data Analyst…",
  "seniorityLevel": null,
  "jobFunction": "Information Technology",
  "industries": "Business Consulting and Services",
  "applicants": "Over 200 applicants",
  "applicantsCount": 200,
  "easyApply": false,
  "insights": ["Actively Hiring"],
  "reposted": false,
  "companyUrl": "https://www.linkedin.com/company/icf-international",
  "companyLogoUrl": "https://media.licdn.com/dms/image/v2/D4E0BAQH2RAazN8LIPA/company-logo_100_100/…",
  "scrapedAt": "2026-09-27T16:13:14.753Z"
}
```

`seniorityLevel` is empty when LinkedIn shows "Not Applicable". LinkedIn does not show visitors whether a job is on-site, hybrid or remote, so `workplaceType` stays empty.

## Use cases

- **Recruiters and staffing agencies**: see every new role for your niche and region each morning, with the number of applicants.
- **Job boards and aggregators**: fill a job board with fresh listings from the largest job site.
- **Sales and lead generation**: companies hiring are growing. Industries and company pages turn job ads into leads.
- **Labor market research**: track demand, seniority and pay by role, industry and location over time.
- **AI agents**: give an agent one tool to search LinkedIn jobs.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.45 per 1,000 jobs on Starter, $0.40 on Scale and $0.35 on Business, which is the "from" price shown in Apify Store. There is no start fee, and the residential proxies are included in the price. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details**. You still get title, company, location, date and link, about ten times faster.
- **Stricter results**: LinkedIn also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Complete big searches**: searches of the whole United States continue state by state by themselves. Elsewhere, search by region or city, or use **Posted in the last days**, when a search has more than 1,000 jobs. With job type or experience level filters, a search reads the first 1,000 jobs LinkedIn lists.
- **Remote jobs**: LinkedIn does not show visitors which jobs are remote. Add `remote` to your keywords, for example `remote data analyst`.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Do I need a LinkedIn account or cookies?** No. The Actor reads the public job pages that LinkedIn shows to everyone without login. It never logs in, so no account can be restricted.

**Does it collect data about people?** No. Names, profiles and photos of job posters, recruiters and employees are not collected. Only job listings and the companies that post them.

**Why do some jobs have no salary?** LinkedIn shows pay only when the employer adds it. Many employers state it in the description, and the Actor reads it from there; `salary.source` says where it came from.

**Why does LinkedIn show a different number of jobs?** The count on the website is rounded ("11,000+"), and LinkedIn lists at most 1,000 jobs per search. See the tip on big searches above.

**Is it legal to scrape LinkedIn?** The Actor reads only public job listings that LinkedIn shows to every visitor, without login, and collects no personal data. Check LinkedIn's terms and the laws that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.

*This Actor is not affiliated with, endorsed or sponsored by LinkedIn. LinkedIn is a trademark of LinkedIn Corporation.*
