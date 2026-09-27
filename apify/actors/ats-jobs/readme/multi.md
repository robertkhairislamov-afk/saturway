# All-in-One Jobs Scraper

**Search 10 job sites at once.** Enter keywords and countries, and get jobs from Dice, Welcome to the Jungle, StepStone, SEEK, Jobstreet and JobsDB, plus any Greenhouse, Lever, Ashby or Workday career site you add, in one format, without duplicates. Salary as numbers, full descriptions, apply links. **$1 per 1,000 jobs, no start fee.**

One search, many job sites: the Actor sends your keywords to every job board that covers your countries, reads the career sites of the companies you list, and merges everything into one clean table. The same job posted on two sites is saved once, and duplicates are free. Each job keeps its source, so you always know where it came from. Run it on a schedule to get **only new jobs** from all sites at once. No browser, no login.

## What can this all-in-one jobs scraper do?

- 🌍 **19 countries, 10 job sites**: pick countries, and the right sites are searched for each one (see the table below).
- 🔎 **One simple input**: keywords, countries and, for one country, a city. No site-specific settings needed.
- 🏢 **Company career sites by link**: paste any Greenhouse, Lever, Ashby or Workday job board link; the system is recognized automatically. Your keywords pick jobs by title.
- 🧹 **No duplicates**: the same job from two sites or two searches is saved once, and you do not pay for duplicates.
- 💰 **Salary as numbers** in the local currency: "$120k - $140k p.a.", "RM 3,800 – RM 5,000 per month" or "€75,000-85,000" become `min`, `max`, `currency` and `interval`.
- 🎛️ **Filters for all sites**: remote only, posted in the last N days, only jobs with a salary, title must contain, exclude words.
- 🆕 **Only new jobs since the last run**: one daily job alert across all sites.
- 🏷️ **Source of every job** in the `ats` field: `dice`, `wttj`, `stepstone`, `seek`, `jobstreet`, `jobsdb`, `greenhouse`, `lever`, `ashby` or `workday`.

## Which sites cover which countries?

| Countries | Job sites |
|---|---|
| United States | Dice, Welcome to the Jungle |
| Germany | StepStone, Welcome to the Jungle |
| United Kingdom, Ireland, France, Belgium, Netherlands, Luxembourg, Spain, Italy, Canada | Welcome to the Jungle |
| Australia, New Zealand | SEEK |
| Malaysia, Singapore, Philippines, Indonesia | Jobstreet |
| Hong Kong, Thailand | JobsDB |
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

Each site adds its own extra fields, such as `skills` on Dice, `benefits` on StepStone, `companyIndustry` and `companySize` on SEEK, Jobstreet and JobsDB, or `department` on company career sites.

## How to scrape jobs from many sites at once

1. Enter **job titles or keywords**, one search per line, for example `data analyst`.
2. Pick the **countries**. For a single country you can add a **city or region**, such as `Berlin` or `Sydney NSW`.
3. Optionally add **company career site links**, limit the **job sites**, or turn on **remote only**, **only jobs with a salary** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

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

```json
{
  "ats": "dice",
  "company": "3ea34b07-fec0-5f54-a0e9-202d447a70d7",
  "companyName": "Booz Allen Hamilton",
  "jobId": "b707fbf4-050d-439f-9593-e4777bf0e0d7",
  "title": "Human Capital and Personnel Data Analyst",
  "location": "Springfield, Virginia, USA",
  "locations": ["Springfield, Virginia, USA"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 77600, "max": 176000, "currency": "USD", "interval": "year", "text": "USD 77,600.00 - 176,000.00 per year", "source": "listing" },
  "postedAt": "2026-09-18T14:49:45.000Z",
  "updatedAt": "2026-09-27T08:10:08.000Z",
  "jobUrl": "https://www.dice.com/job-detail/b707fbf4-050d-439f-9593-e4777bf0e0d7",
  "applyUrl": "https://www.dice.com/job-detail/b707fbf4-050d-439f-9593-e4777bf0e0d7",
  "descriptionText": "Job Number: R0249209\n\nHuman Capital and Personnel Data Analyst\nThe Opportunity:…",
  "descriptionHtml": "<b>Job Number: R0249209</b>…",
  "skills": ["HR Analytics", "SQL", "Python", "Tableau", "Data Analysis"],
  "employerType": "Direct Hire",
  "validThrough": "2026-10-28T08:10:08.000Z",
  "scrapedAt": "2026-09-27T11:14:02.769Z"
}
```

In the same run, a StepStone job from Berlin ("€75,000-85,000" as EUR per year), a SEEK job from Melbourne (AUD) and a Jobstreet job from Singapore ("$3,800 – $4,500 per month" as SGD per month) arrive in the same format.

## Use cases

- **International recruiting**: one daily feed of new roles for a skill across the US, Europe and Asia-Pacific.
- **Job boards and aggregators**: fill a multi-country job board from one Actor and one schema.
- **Labor market research**: compare demand and pay for a role across countries and sites.
- **Sales and lead generation**: find companies hiring for a function in many markets at once.
- **AI agents**: give an agent one tool that searches every supported job site.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. There is no start fee. Duplicates and jobs filtered out by your settings are free. The Apify free plan covers about 5,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule.
- **Big searches**: set **Maximum jobs per search or career site** to keep every site in the results.
- **Site-specific filters**: for filters that only one site has, such as SEEK classifications or StepStone contract types, use our single-site scrapers listed at the end of this page. They have the same output.
- **Errors per source**: if one site fails, the others still run. See the `SUMMARY` record in the run's key-value store.

## FAQ

**Why are LinkedIn and Indeed not included?** This Actor covers job sites with reliable public access. LinkedIn and Indeed are not supported.

**How are duplicates found?** Two jobs are the same when title, company and city match after normalizing case, accents and punctuation. Jobs from the same search are never merged, so several openings with one title stay.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers. The job description is saved as the employer wrote it.

**Is it legal to scrape these sites?** The Actor reads public job listings that the sites show to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
