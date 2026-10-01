# All-in-One Jobs Scraper

**Search LinkedIn, Indeed and 8 more job boards at once, plus company career sites.** Enter keywords and countries, and get jobs from LinkedIn, Indeed, Dice, Welcome to the Jungle, StepStone, SEEK, Jobstreet, JobsDB, Reed and InfoJobs, plus the Greenhouse, Lever, Ashby or Workday career sites of the companies you add, in one format, with duplicates across sites removed. Salary as numbers, full descriptions, apply links. **$1 per 1,000 jobs, no start fee.**

One search, many job sites: the Actor sends your keywords to every job board that covers your countries, reads the career sites of the companies you list, and merges everything into one clean table. A job with the same title, company and city on two sites is saved once, and duplicates are free. Each job keeps its source, so you always know where it came from. Run it on a schedule to get **only new jobs** from all sites at once. No browser, no login.

## What can this all-in-one jobs scraper do?

- 🌍 **62 countries, 10 job boards searched by keyword**: pick countries, and every board that covers them is searched (see the table below).
- 🔗 **LinkedIn included**: public LinkedIn job listings in every country, without login, with seniority, job function and number of applicants. The residential proxies LinkedIn needs are included in the price.
- 🌐 **Indeed included**: Indeed jobs in all 62 countries, with salaries, job types, benefits and company size, even past Indeed's limit of about 1,000 jobs per search.
- 🔎 **One simple input**: keywords, countries and, for one country, a city. No site-specific settings needed.
- 🏢 **Company career sites by link**: paste any Greenhouse, Lever, Ashby or Workday job board link; the system is recognized automatically. These systems have no search across companies, so only the companies you add are read. Your keywords pick their jobs by title.
- 🧹 **Duplicates removed**: a job with the same title, company and city from two sites or two searches is saved once, and you do not pay for it. The FAQ explains what this match can miss.
- 💰 **Salary as numbers** in the local currency: "$120k - $140k p.a.", "RM 3,800 – RM 5,000 per month" or "€75,000-85,000" become `min`, `max`, `currency` and `interval`.
- 🎛️ **Filters for all sites**: remote only, posted in the last N days, only jobs with a salary, title must contain, exclude words. LinkedIn is left out of remote searches, because it does not show visitors which jobs are remote.
- 📋 **A report for every run**: the status message names any site that failed, and the **Run summary** on the Output tab lists every site with jobs found, matched and saved.
- 🆕 **Only new jobs since the last run**: one daily job alert across all sites.
- 🏷️ **Source of every job** in the `ats` field: `linkedin`, `indeed`, `dice`, `wttj`, `stepstone`, `seek`, `jobstreet`, `jobsdb`, `reed`, `infojobs`, `greenhouse`, `lever`, `ashby` or `workday`.

## Which sites cover which countries?

| Countries | Job sites |
|---|---|
| Every country in this table | LinkedIn, Indeed |
| United States | Dice, Welcome to the Jungle |
| Germany | StepStone, Welcome to the Jungle |
| United Kingdom | Reed, Welcome to the Jungle |
| Spain | InfoJobs (a city that is a province, such as Madrid, searches that province), Welcome to the Jungle |
| Ireland, France, Belgium, Netherlands, Luxembourg, Italy, Canada | Welcome to the Jungle |
| Australia, New Zealand | SEEK |
| Malaysia, Singapore, Philippines, Indonesia | Jobstreet |
| Hong Kong, Thailand | JobsDB |
| Austria, Switzerland, Portugal, Poland, Czechia, Hungary, Romania, Greece, Ukraine, Sweden, Denmark, Norway, Finland, Türkiye, Israel, United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Egypt, Morocco, Nigeria, South Africa, India, Pakistan, Japan, South Korea, China, Taiwan, Vietnam, Brazil, Mexico, Argentina, Chile, Colombia, Peru, Ecuador, Uruguay, Venezuela, Costa Rica, Panama | LinkedIn and Indeed only |
| Any country | Greenhouse, Lever, Ashby and Workday career sites you add |

## What data does it extract?

| Field | Example |
|---|---|
| `ats` | dice (the site the job came from) |
| `title` | Human Capital and Personnel Data Analyst |
| `companyName` | Booz Allen Hamilton |
| `location` / `locations` | Springfield, Virginia, USA |
| `remote` / `workplaceType` | false / onsite |
| `employmentType` | full-time |
| `salary` | `{ "min": 77600, "max": 176000, "currency": "USD", "interval": "year" }` |
| `postedAt` / `validThrough` | 2026-09-18 / 2026-10-28 |
| `jobUrl` / `applyUrl` | https://www.dice.com/job-detail/b707fbf4-… |
| `descriptionText` / `descriptionHtml` | full job description |

Each site adds its own extra fields, such as `seniorityLevel`, `industries` and `applicants` on LinkedIn, `jobTypes`, `benefits` and `companySize` on Indeed, `skills` on Dice, `benefits` on StepStone, `companyIndustry` and `companySize` on SEEK, Jobstreet and JobsDB, or `department` on company career sites.

## How to scrape jobs from many sites at once

1. Enter **job titles or keywords**, one search per line, for example `data analyst`.
2. Pick the **countries**. For a single country you can add a **city or region**, such as `Berlin` or `Sydney NSW`.
3. Optionally add **company career site links**, limit the **job sites**, or turn on **remote only**, **only jobs with a salary** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples, from salary medians in five countries to every job of a company from its career site: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data analyst"],
  "countries": ["US", "DE", "AU", "SG"],
  "companies": ["https://boards.greenhouse.io/airbnb"],
  "postedWithinDays": 7,
  "onlyWithSalary": true
}
```

### Example output

Four of the 80 jobs from one run on 1 October 2026 (`data analyst` in the US, the UK and Germany), shortened to the main fields. Every job has all the fields of the table above.

```json
[
  {
    "ats": "indeed",
    "title": "Public Health Data Analyst",
    "companyName": "VAAS Professionals, LLC",
    "location": "Atlanta, GA 30312",
    "remote": false,
    "workplaceType": "hybrid",
    "employmentType": "full-time",
    "salary": {"min": 85000, "max": 110000, "currency": "USD", "interval": "year", "text": "USD 85,000–110,000 per year"},
    "postedAt": "2026-09-30T05:00:00.000Z",
    "jobUrl": "https://www.indeed.com/viewjob?jk=936496ffedd5d6f2"
  },
  {
    "ats": "reed",
    "title": "Data Analyst",
    "companyName": "Adecco",
    "location": "Barking",
    "remote": false,
    "workplaceType": "hybrid",
    "employmentType": "temporary",
    "salary": {"min": 300, "max": 350, "currency": "GBP", "interval": "day", "text": "GBP 300–350 per day"},
    "postedAt": "2026-09-29T13:30:56.117Z",
    "jobUrl": "https://www.reed.co.uk/jobs/data-analyst/57402964"
  },
  {
    "ats": "stepstone",
    "title": "Projektmanager mit Schwerpunkt Data Analyst (m/w/d) Airbus",
    "companyName": "expertum GmbH",
    "location": "Hamburg",
    "remote": false,
    "workplaceType": null,
    "employmentType": null,
    "salary": null,
    "postedAt": "2026-10-01T01:45:47.000Z",
    "jobUrl": "https://www.stepstone.de/stellenangebote--Projektmanager-mit-Schwerpunkt-Data-Analyst-m-w-d-Airbus-Hamburg-expertum-GmbH--14559857-inline.html"
  },
  {
    "ats": "linkedin",
    "title": "Data Analyst",
    "companyName": "Zelis",
    "location": "Cottonwood Heights, UT",
    "remote": false,
    "workplaceType": null,
    "employmentType": null,
    "salary": null,
    "postedAt": "2026-10-01T00:40:18.943Z",
    "jobUrl": "https://www.linkedin.com/jobs/view/4472640743/"
  }
]
```

Each job keeps its source in `ats`, and every salary keeps its currency and period: a yearly range in US dollars from Indeed, a day rate in pounds from Reed. The same run also returned jobs from Dice and Welcome to the Jungle.

## Use cases

- **International recruiting**: one daily feed of new roles for a skill across the US, Europe and Asia-Pacific.
- **Job boards and aggregators**: fill a multi-country job board from one Actor and one schema.
- **Labor market research**: compare demand and pay for a role across countries and sites.
- **Sales and lead generation**: find companies hiring for a function in many markets at once.
- **AI agents**: give an agent one tool that searches every supported job site.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.90 per 1,000 jobs on Starter, $0.80 on Scale and $0.70 on Business, which is the "from" price shown in Apify Store. There is no start fee, and the residential proxies for LinkedIn are included. Duplicates and jobs filtered out by your settings are free. The Apify free plan covers about 5,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule.
- **Big searches**: set **Maximum jobs per search or career site** to keep every site in the results.
- **Site-specific filters**: for filters that only one site has, such as SEEK classifications or StepStone contract types, use our single-site scrapers listed at the end of this page. They have the same output.
- **Errors per source**: if one site fails, the others still run. The status message names it, and the **Run summary** on the Output tab shows the error.

## FAQ

**Why are there no LinkedIn jobs in remote searches?** LinkedIn does not show visitors who are not logged in which jobs are remote, so **Remote jobs only** leaves LinkedIn out. To find remote LinkedIn jobs, add `remote` to your keywords instead.

**How are duplicates found?** Two jobs are the same when title, company and city match after normalizing case, accents and punctuation. Jobs from the same search are never merged, so several openings with one title stay. The match catches the usual case of one job posted on several sites. It can miss a job whose title or company is written differently on two sites, and it merges two different openings with the same title, company and city found on two sites.

**What if a site fails?** The other sites still run, and the run finishes with their jobs. The status message names the sites that failed, and the **Run summary** on the Output tab lists every site and career site with jobs found, matched and saved, and the error. A run fails only when every site fails.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers. The job description is saved as the employer wrote it.

**Is it legal to scrape these sites?** The Actor reads public job listings that the sites show to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
