# Foundit Jobs Scraper

**Scrape Foundit (formerly Monster India, Monster Gulf and Monster Singapore) jobs by keyword and city.** Get title, company, salary as numbers, years of experience, skills, role, function and industry, number of applicants, every location, the full description and the job link. India, the United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain, Egypt, Singapore, Malaysia, the Philippines and Hong Kong. Export to JSON, CSV or Excel, or use the API. **$2 per 1,000 jobs, no start fee.**

Scrape jobs from **Foundit**, one of India's largest job sites and Monster's successor in the Gulf and Southeast Asia, the way you search on it: keywords such as `java developer`, `accountant` or `sales executive`, a city such as `Bangalore`, `Pune`, `Dubai` or `Riyadh`, and Foundit's filters for experience, work from home and date posted. Each job comes with the **experience it asks for in years**, the **salary as numbers** where the employer states it (most jobs in Singapore and Malaysia, some in India), the **skills**, the **number of applicants**, the employer type (company or consultant) and the closing date. With descriptions on, you also get the **full description**, every location with its state and the skills as the employer listed them. Up to 100 jobs per request, so big searches return thousands of jobs. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Foundit scraper do?

- 🔎 **Search like on the website**: keywords and one or more cities, or paste any Foundit search link, such as `https://www.foundit.in/srp/results?query=java%20developer&locations=Pune`.
- 🌏 **12 countries on 6 Foundit sites**: India (foundit.in), the Gulf countries and Egypt (founditgulf.com), Singapore, Malaysia, the Philippines and Hong Kong. Pick the country from a list.
- 🎓 **Experience**: the years each job asks for as numbers, and a filter for jobs that fit your years of experience.
- 💰 **Salaries as numbers**: pay the employer states becomes `{ "min": 2000000, "max": 2500000, "currency": "INR", "interval": "year" }`.
- 🧠 **Skills, roles and industries**: Foundit's skill tags, roles, functions and industries for matching and analytics.
- 👥 **Applicants**: how many people have applied, with quick-apply and urgently-hiring flags.
- 🎛️ **Foundit filters**: experience, work from home and date posted, sorted by relevance or newest first.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so Foundit jobs, other job boards and company career sites fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Data Analyst - Power Platform/Power Apps |
| `companyName` / `employerType` | TQuanta Technologies Private Limited / company |
| `location` / `city` / `state` / `country` | Bengaluru, Karnataka, India / Bengaluru / Karnataka / IN |
| `experienceYearsMin` / `experienceYearsMax` | 5 / 12 |
| `salary` | `{ "min": 2000000, "max": 2500000, "currency": "INR", "interval": "year" }` |
| `employmentType` / `jobTypes` | full-time / Permanent Job |
| `skills` | Power Platform, Power Automate, SQL, SAP HANA, Web API |
| `roles` / `functions` / `industries` | Data Analyst / Analytics/Business Intelligence / … |
| `applicants` / `quickApply` / `urgentlyHiring` | 187 / true / false |
| `postedAt` / `validThrough` | 2026-09-15 / 2026-11-13 |
| `jobUrl` / `applyUrl` / `companyUrl` | the job on Foundit, the application page, the company's jobs on Foundit |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Foundit jobs

1. Enter **job titles or keywords**, one search per line, for example `java developer`. Or paste links of searches you made on Foundit.
2. Pick the **country** and optionally enter a **city** such as `Bangalore` or `Dubai`. Separate several cities with `;`.
3. Optionally set **your experience** in years, **work from home only**, **sort by newest** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for our job scrapers: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data analyst", "business analyst"],
  "country": "IN",
  "location": "Bangalore; Hyderabad",
  "experienceYears": 3,
  "postedWithinDays": 7,
  "sortBy": "date"
}
```

Countries are two-letter codes: `IN`, `AE`, `SA`, `QA`, `KW`, `OM`, `BH`, `EG`, `SG`, `MY`, `PH` and `HK`. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "foundit",
  "company": "317943",
  "companyName": "TQuanta Technologies Private Limited",
  "jobId": "67148388",
  "title": "Data Analyst - Power Platform/Power Apps",
  "department": "Analytics/Business Intelligence",
  "location": "Bengaluru, Karnataka, India",
  "locations": ["Bengaluru, Karnataka, India"],
  "remote": false,
  "workplaceType": null,
  "employmentType": "full-time",
  "salary": { "min": 2000000, "max": 2500000, "currency": "INR", "interval": "year", "text": "INR 2,000,000–2,500,000 per year", "source": "listing" },
  "postedAt": "2026-09-15T07:22:59.000Z",
  "jobUrl": "https://www.foundit.in/job/data-analyst-power-platform-power-apps-tquanta-technologies-private-limited-bengaluru-bangalore-67148388",
  "applyUrl": "https://www.foundit.in/job/data-analyst-power-platform-power-apps-tquanta-technologies-private-limited-bengaluru-bangalore-67148388",
  "descriptionText": "Job Description\n\nPrimary Responsibilities:\n• Ability to interact closely with Business Stakeholder on understanding their business requirements…",
  "descriptionHtml": "<p><strong>Job Description</strong></p><p><em>Primary Responsibilities:</em></p><ul><li>…",
  "experienceYearsMin": 5,
  "experienceYearsMax": 12,
  "jobTypes": ["Permanent Job"],
  "roles": ["Data Analyst"],
  "functions": ["Analytics/Business Intelligence"],
  "industries": [],
  "skills": ["Power Platform", "Power Automate", "Data Driven", "Sql", "Canvas", "Sap Hana", "Web Api"],
  "applicants": 187,
  "validThrough": "2026-11-13T18:30:00.000Z",
  "quickApply": true,
  "urgentlyHiring": false,
  "city": "Bengaluru",
  "state": "Karnataka",
  "country": "IN",
  "employerType": "company",
  "companyUrl": "https://www.foundit.in/search/tquanta-technologies-private-limited-317943-jobs-career",
  "scrapedAt": "2026-10-13T11:20:41.902Z"
}
```

## Use cases

- **Recruitment and staffing agencies**: every new role in your field and city in India, the Gulf or Southeast Asia each morning, with experience, skills and applicant counts.
- **Job seekers**: new jobs that fit your years of experience, newest first.
- **Salary and skills research**: compare pay, experience and skills by role, city and country.
- **Sales and lead generation**: companies that hire are growing. The employer type tells companies from recruitment consultants.
- **Labor market analytics**: track demand by role, function, industry and city across India and the Gulf.
- **AI agents**: give an agent one tool that searches jobs in India and the Gulf.

## How much does it cost?

You pay only for the jobs you get: **$2 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $1.80 per 1,000 jobs on Starter, $1.60 on Scale and $1.40 on Business, which is the "from" price shown in Apify Store. There is no start fee. The same job found by two searches is saved once, and you do not pay for duplicates or for jobs filtered out by your settings. The Apify free plan covers about 2,500 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run**, sort by newest and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Faster runs**: turn off **Include job descriptions**. The description, every location and the listed skills need one request per job; without them you still get title, company, salary, experience, skills tags, applicants and dates, at about 100 jobs per request.
- **Big searches**: Foundit shows about 10,000 jobs per search. For more, search city by city or add filters.
- **Stricter results**: Foundit also matches skills and descriptions. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do many jobs in India have no salary?** Most employers in India do not publish pay on Foundit. `salary` holds only pay the employer states; in Singapore and Malaysia most jobs have it. **Only jobs with a salary** keeps jobs with stated pay only.

**Why is the Gulf one site?** Foundit runs one site, founditgulf.com, for the Gulf countries and Egypt. Pick the country, and the Actor searches that country there, or enter a city such as `Dubai` or `Riyadh`.

**Does it collect recruiter contact details?** No. Foundit shows the recruiter's name on some jobs and hides employers' emails and phone numbers; the Actor reads none of them, and there are no fields for people's names, emails or phone numbers.

**Is it legal to scrape Foundit?** The Actor reads the public job listings Foundit shows to every visitor, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Foundit or Monster.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
