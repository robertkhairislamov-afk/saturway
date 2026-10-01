# Indeed Jobs Scraper

**Scrape Indeed jobs in 62 countries by keyword and location.** Get title, company, salary as numbers, job type, remote or hybrid, experience level, benefits, company size, full description and the employer's apply link. Export to JSON, CSV or Excel, or use the API. **$1 per 1,000 jobs, no start fee.**

Scrape jobs from **Indeed**, one of the world's largest job sites, the way you search on it: keywords, location, distance and Indeed's filters, in the United States, the United Kingdom, Canada, Australia, India, Germany, France and 55 more countries. Each job comes with the **salary as numbers** per year, month, week, day or hour, its job types, whether it is **remote, hybrid or in-person**, the experience level, benefits and schedule, the company's size, revenue, website and logo, the full description and the link to apply on the employer's site. Indeed shows at most about 1,000 jobs per search; this Actor keeps going with the older jobs, so **big searches go past that limit**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Indeed scraper do?

- 🔎 **Search like on the website**: keywords such as `data analyst` or `registered nurse`, a city, state or postal code with a distance, or paste any Indeed search link from any country.
- 🌍 **62 countries**: Indeed sites from the United States and the United Kingdom to India, Brazil, Japan and the United Arab Emirates. Pick the country from a list.
- 🎛️ **Indeed filters**: job type (full-time, part-time, contract, temporary, internship and more), remote, hybrid or in-person, experience level, "Easily apply" and date posted. Pick several job types to get jobs of any of them.
- ♾️ **Past the 1,000-job limit**: Indeed stops a search after about 1,000 jobs. The Actor reads the newest jobs first and goes on with the older ones in further rounds.
- 💰 **Salary as numbers**: pay the employer states becomes `{ "min": 145000, "max": 188000, "currency": "USD", "interval": "year" }`, also "from" and "up to" amounts. Indeed's own estimates are left out.
- 🏢 **Company details**: company size, revenue, website, logo and Indeed company page for every job that has them.
- 🎁 **Benefits and schedule**: health insurance, paid time off, retirement plans, day or night shifts and more, as lists.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so Indeed jobs, other job boards and company career sites fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Commercial Lending Functional SME, VP |
| `companyName` / `companySize` / `companyRevenue` | MUFG / 10,000+ / more than $10B (USD) |
| `location` / `city` / `state` / `country` | Jersey City, NJ / Jersey City / NJ / US |
| `workplaceType` / `employmentType` / `jobTypes` | hybrid / full-time / Full-time |
| `seniorityLevel` | Mid-level |
| `salary` | `{ "min": 145000, "max": 188000, "currency": "USD", "interval": "year" }` |
| `benefits` / `schedule` | Health insurance, Paid holidays, Retirement plan… / Monday to Friday |
| `attributes` | the skills, education and licenses Indeed tags the job with |
| `postedAt` / `listedAt` | 2026-09-29 / 2026-09-29 |
| `easyApply` / `urgentlyHiring` | false / false |
| `jobUrl` / `applyUrl` | https://www.indeed.com/viewjob?jk=0b715796b467e24a / the job on the employer's site |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Indeed jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or paste links of searches you made on Indeed in any country.
2. Pick the **country** and optionally enter a **location** such as `New York, NY`, `London` or `Berlin`, and a **distance**.
3. Optionally choose **job types**, **remote, hybrid or in-person**, an **experience level**, **Easily apply only** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples, from pay in five countries to 4,994 jobs past the 1,000-job limit: [How to Scrape Indeed Job Postings in 62 Countries with Python](https://medium.com/@robertkhairislamov/how-to-scrape-indeed-job-postings-in-62-countries-with-python-f038c81f8554). For Indeed, LinkedIn and 12 more job sites in one format: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data analyst", "business analyst"],
  "country": "US",
  "location": "New York, NY",
  "distance": 25,
  "jobTypes": ["fulltime"],
  "workplaceTypes": ["hybrid", "remote"],
  "postedWithinDays": 7
}
```

Countries are two-letter codes such as `US`, `GB`, `CA`, `IN` or `DE`. Job types are `fulltime`, `parttime`, `permanent`, `contract`, `temporary`, `internship`, `apprenticeship`, `seasonal`, `freelance`, `fixedterm`, `casual` and `perdiem`; workplaces `remote`, `hybrid` and `onsite`; experience levels `none`, `entry`, `mid` and `senior`. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "indeed",
  "company": "Mufg",
  "companyName": "MUFG",
  "jobId": "0b715796b467e24a",
  "title": "Commercial Lending Functional SME, VP",
  "department": "Data & Database",
  "location": "Jersey City, NJ",
  "locations": ["Jersey City, NJ"],
  "remote": false,
  "workplaceType": "hybrid",
  "employmentType": "full-time",
  "salary": { "min": 145000, "max": 188000, "currency": "USD", "interval": "year", "text": "USD 145,000–188,000 per year", "source": "listing" },
  "postedAt": "2026-09-29T05:00:00.000Z",
  "jobUrl": "https://www.indeed.com/viewjob?jk=0b715796b467e24a",
  "applyUrl": "https://mufgub.wd3.myworkdayjobs.com/en-US/MUFG-Careers/job/Jersey-City-NJ/Commercial-Lending-Functional-SME--VP_10079234-WD",
  "descriptionText": "Do you want your voice heard and your actions to count?\n\nDiscover your opportunity with Mitsubishi UFJ Financial Group (MUFG)…",
  "descriptionHtml": "<div><p><b>Do you want your voice heard and your actions to count?</b></p>…",
  "jobTypes": ["Full-time"],
  "seniorityLevel": "Mid-level",
  "benefits": ["Paid parental leave", "Paid holidays", "Health insurance", "Tuition reimbursement", "Parental leave", "Retirement plan"],
  "schedule": [],
  "attributes": ["Background check", "Requirements specification", "Commercial loans", "Data migration", "Technical documentation"],
  "easyApply": false,
  "urgentlyHiring": false,
  "hiringMultipleCandidates": false,
  "listedAt": "2026-09-29T18:14:52.503Z",
  "city": "Jersey City",
  "state": "NJ",
  "country": "US",
  "normalizedTitle": "vice president",
  "language": "en",
  "sourceName": "MUFG",
  "companyUrl": "https://www.indeed.com/cmp/Mufg",
  "companyWebsite": "https://careers.mufgamericas.com/",
  "companyLogo": "https://d2q79iu7y748jz.cloudfront.net/s/_squarelogo/256x256/f884f32f66039b6a71428d90638c4246",
  "companySize": "10,000+",
  "companyRevenue": "more than $10B (USD)",
  "scrapedAt": "2026-09-30T05:32:43.930Z"
}
```

## Use cases

- **Job boards and aggregators**: fill your board with fresh Indeed jobs from any of 62 countries.
- **Recruitment and staffing agencies**: see every new role in your niche and region each morning, with pay, job type and company size.
- **Salary research**: compare stated pay by role, city and country, with the pay period kept.
- **Sales and lead generation**: companies that hire are growing. Company size, revenue and website help to qualify them.
- **Labor market analytics**: track demand by occupation, job type, remote share and benefits over time.
- **AI agents**: give an agent one tool that searches jobs worldwide.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.90 per 1,000 jobs on Starter, $0.80 on Scale and $0.70 on Business, which is the "from" price shown in Apify Store. There is no start fee. The same job found by two searches is saved once, and you do not pay for duplicates or for jobs filtered out by your settings. The Apify free plan covers about 5,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Big searches**: a search such as `nurse` in the United States has many thousands of jobs. Set **Maximum jobs in total** when you need fewer.
- **Faster runs**: turn off **Include job descriptions**. You still get every other field.
- **Stricter results**: Indeed also matches words in the description. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have no salary?** The Actor includes only pay the employer states. Indeed shows its own estimates for some jobs; those are left out. Outside the United States fewer employers state pay.

**Why are some benefits in another language?** Benefits, schedules and other tags come in the language of the country's Indeed site, such as German on Indeed Germany. Job types, workplace and experience level are always in English.

**Where do experience levels come from?** Indeed marks jobs as entry level, mid-level or senior level mostly in the United States. Elsewhere `seniorityLevel` is usually empty.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers. The job description is saved as the employer wrote it.

**Is it legal to scrape Indeed?** The Actor reads the public job listings Indeed shows to every visitor, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Indeed.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
