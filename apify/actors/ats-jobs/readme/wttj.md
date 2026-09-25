# Welcome to the Jungle Jobs Scraper

**Scrape Welcome to the Jungle jobs by keyword, country or company.** Get title, company, salary, remote policy, skills, tools, full description and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **Welcome to the Jungle** (`welcometothejungle.com`), the job site of startups and tech companies in France, the UK, the US and the rest of Europe. Search by keywords with the site's filters (country, contract type, experience, remote policy, salary), or get all jobs of the companies you choose. Every job comes with the **salary as numbers**, **skills and tools**, experience and education level, the company's industry and size, the full description and the apply link. Welcome to the Jungle shows at most 100 jobs per search; this scraper splits big searches to **get many more**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Welcome to the Jungle scraper do?

- 🔎 **Search like on the website**: keywords such as `product manager` or `développeur python`, one search per line, with the site's own filters.
- 🎛️ **Filters**: countries, contract type (permanent, internship, apprenticeship / alternance, freelance, temporary / CDD, VIE), years of experience, remote policy (full remote, hybrid, occasional, none), minimum yearly salary and posting date.
- 🏢 **All jobs of a company**: enter names like `doctolib` or `back-market`, or paste the company page link.
- ♾️ **Beyond 100 results**: big searches are split by country, contract type and experience level, then merged without duplicates.
- 💰 **Salary as numbers**: `min`, `max`, `currency` and `interval` (year, month, day). Obvious typos from employers are fixed: "45 per year" becomes 45,000.
- 🧠 **Skills and tools** listed on each job, such as SQL, Python, Power BI or Figma, plus experience level, education level, contract length and start date.
- 🏷️ **Company data**: industry, number of employees, short summary and logo.
- 🆕 **Only new jobs since the last run**: for job alerts and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so jobs from company career sites and job boards fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Senior Data Analyst (H/F) |
| `companyName` / `company` | Vroomly / vroomly |
| `department` | Data / Business Intelligence |
| `location` / `locations` | Paris, France |
| `remote` / `workplaceType` | false / hybrid |
| `employmentType` | full-time |
| `salary` | `{ "min": 65000, "max": 75000, "currency": "EUR", "interval": "year" }` |
| `skills` / `tools` | Data visualization / Metabase, DBT, Snowflake, SQL, Python |
| `experienceLevel` / `educationLevel` | 4 to 5 years / Bac+5 (master) |
| `companyIndustry` / `companySize` | Automotive, E-commerce, Digital / 123 |
| `postedAt` / `updatedAt` | 2026-08-11T07:52:21.000Z |
| `jobUrl` / `applyUrl` | https://www.welcometothejungle.com/en/companies/vroomly/jobs/… |
| `descriptionText` / `descriptionHtml` | full job description with key missions and profile |

## How to scrape Welcome to the Jungle jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or enter **companies**, for example `doctolib`.
2. Optionally pick **countries** (`FR`, `GB`, `US`, `ES`, `DE`…), **contract types**, **experience**, **remote policy**, a **minimum salary** or a **date range**.
3. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "searchQueries": ["data analyst", "product manager"],
  "countries": ["FR", "BE"],
  "contractTypes": ["full_time"],
  "remoteTypes": ["partial", "fulltime"],
  "minSalary": 45000,
  "postedWithinDays": 7
}
```

### Example output

```json
{
  "ats": "wttj",
  "company": "vroomly",
  "companyName": "Vroomly",
  "jobId": "1f754256-24f3-4f80-8597-64adf596a375",
  "requisitionId": "VROOM_eX2176K",
  "title": "Senior Data Analyst (H/F)",
  "department": "Data / Business Intelligence",
  "team": null,
  "location": "Paris, France",
  "locations": ["Paris, France"],
  "remote": false,
  "workplaceType": "hybrid",
  "employmentType": "full-time",
  "salary": { "min": 65000, "max": 75000, "currency": "EUR", "interval": "year", "text": "EUR 65,000–75,000 per year", "source": "listing" },
  "postedAt": "2026-08-11T07:52:21.000Z",
  "updatedAt": "2026-09-24T16:36:35.727Z",
  "jobUrl": "https://www.welcometothejungle.com/en/companies/vroomly/jobs/senior-data-analyst-h-f_paris_VROOM_eX2176K",
  "applyUrl": "https://jobs.vroomly.com/jobs/7765649-senior-data-analyst-h-f",
  "descriptionText": "Tu rejoindras notre équipe data, en pleine structuration…",
  "descriptionHtml": "<p>Tu rejoindras notre <strong>équipe data</strong>…",
  "skills": ["Data visualization", "Problem-solving skills"],
  "tools": ["Metabase", "DBT", "Fivetran", "Snowflake", "SQL", "Python"],
  "experienceLevel": "4 to 5 years",
  "educationLevel": null,
  "contractDurationMonths": null,
  "startDate": null,
  "language": "fr",
  "companyIndustry": "Automotive, E-commerce, Digital",
  "companySize": 123,
  "companySummary": "Plateforme digitale pour connecter garagistes, clients et fournisseurs.",
  "companyLogoUrl": "https://cdn-images.welcometothejungle.com/…",
  "scrapedAt": "2026-09-25T07:32:43.783Z"
}
```

## Use cases

- **Recruiting and staffing agencies**: see new roles at French and European startups every morning, by skill and city.
- **Job alerts and niche job boards**: publish fresh startup jobs by keyword, contract type or remote policy.
- **Sales and lead generation**: a company hiring data engineers or salespeople is growing and buying. Company size and industry are included.
- **Salary research**: compare pay by role, city, experience and contract type in France and Europe.
- **Internship and alternance boards**: collect internships and apprenticeships with their length and start date.
- **Labor market analytics**: track demand for skills and tools such as SQL, Python or Figma over time.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details** to skip the job pages. You still get title, company, location, contract, salary, dates and links.
- **Big searches**: add countries. Each country is searched separately, so more jobs are found.
- **Stricter results**: the site also matches similar titles. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Which countries are covered?** All countries with jobs on Welcome to the Jungle. Most jobs are in France, the US and the UK; there are also jobs in Spain, Germany, the Netherlands, Belgium and other countries.

**Why do some jobs have no salary?** Companies decide whether to publish pay. When they do, it is saved as numbers; turn on **Only jobs with a salary** to keep only those jobs.

**Does it collect personal data?** No. It saves job listings and company information, not names or contact details of recruiters or employees.

**Is it legal to scrape Welcome to the Jungle?** The Actor reads the public job listings the site shows to every visitor. Job postings are public business information. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
