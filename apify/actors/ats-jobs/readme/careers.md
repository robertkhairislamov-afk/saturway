# Career Page Jobs Scraper: Greenhouse, Lever, Ashby, Workday, Personio, Teamtailor

**Get every open job from company career pages on Greenhouse, Lever, Ashby, Workday, Personio and Teamtailor.** Enter company names, website domains or job board links, or **search 9,600+ companies at once** by job title. Title, department, locations, salary range, full description and apply link, in one format for all six systems. **$1.50 per 1,000 jobs, no start fee.**

Most tech companies, startups and many large employers publish their jobs on their own career site, run by an applicant tracking system: **Greenhouse** (Airbnb, Stripe, Figma), **Lever** (Zoox, Palantir), **Ashby** (Ramp, Notion, 1Password) or **Workday** (NVIDIA, Salesforce, banks and retailers), and in Europe often **Personio** (German and Austrian SMEs, the Mittelstand) or **Teamtailor** (Nordic and European companies). Their jobs often appear there days before job boards, with the salary range the company publishes. This Actor reads the career sites directly, with no browser and no login.

## What can this career page scraper do?

- 🏢 **Companies by name, domain or link**: `Stripe`, `notion.so` or `https://jobs.lever.co/zoox`. You don't need to know which system a company uses: the Actor finds its Greenhouse, Lever, Ashby, Personio or Teamtailor board for you.
- 🌐 **Search all companies**: one search across **9,600+ company career sites** found and checked on Greenhouse, Lever, Ashby, Workday, Personio and Teamtailor, about 670,000 open jobs. For example *data engineer, remote or United States*.
- 🇪🇺 **European career sites**: Personio (`acme.jobs.personio.de`) and Teamtailor (`acme.teamtailor.com`) boards, read from the job feeds both systems publish for job boards, with offices, departments, seniority and remote status.
- 💰 **Salary ranges** wherever the company publishes them, as `min`, `max`, `currency` and `interval`, plus ranges found in the description.
- 🔎 **Filters**: title keywords, excluded words, locations, remote only, departments, posted in the last N days, only jobs with a salary.
- 📊 **Free company summary**: one record per company with its open jobs, teams, places, jobs posted in the last 7 and 30 days and how the count changed since your earlier runs. Not charged.
- 🆕 **Only new jobs since the last run**: schedule it daily and get only the jobs that opened since yesterday.
- 🧩 **One format for all six systems**, and the same as our other job scrapers listed at the end of this page.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Software Engineer, AI Connections (Developer Platform) |
| `companyName` / `company` | Notion / notion |
| `ats` | ashby |
| `department` / `team` | Engineering / Engineering |
| `location` / `locations` | San Francisco, California |
| `remote` / `workplaceType` | true / hybrid |
| `employmentType` | full-time |
| `salary` | `{ "min": 272000, "max": 304000, "currency": "USD", "interval": "year" }` |
| `postedAt` / `updatedAt` | 2026-08-24T14:44:49.699Z |
| `jobUrl` / `applyUrl` | https://jobs.ashbyhq.com/notion/1fc309c8-… |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape company career pages

1. Enter the companies, one per line: a name (`Stripe`), a domain (`notion.so`) or the link of the job board. Or leave the list empty and turn on **Search all companies**.
2. Set **Title keywords** (required for **Search all companies**) and any other filters: locations such as `Remote` or `London`, a date range, departments.
3. Click **Start**, then download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input: named companies

```json
{
  "companies": ["Stripe", "notion.so", "https://jobs.lever.co/zoox", "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite"],
  "keywords": ["engineer"],
  "locations": ["United States", "Remote"],
  "postedWithinDays": 14
}
```

### Example input: every company in the directory

```json
{
  "searchAllCompanies": true,
  "keywords": ["data engineer"],
  "locations": ["Remote", "United States"],
  "includeDescription": false
}
```

In our test (November 2026) this search read all 9,687 career sites in about 18 minutes and returned 624 jobs. To make it faster, pick only some systems under **Career site systems**.

### Example output

```json
{
  "ats": "greenhouse",
  "company": "airbnb",
  "companyName": "Airbnb",
  "jobId": "8184174",
  "title": "Account Manager",
  "department": "Business Development",
  "location": "London, United Kingdom",
  "locations": ["London, United Kingdom"],
  "remote": false,
  "workplaceType": "hybrid",
  "salary": { "min": 46000, "max": 54000, "currency": "GBP", "interval": "year", "text": "GBP 46,000–54,000 per year", "source": "ats" },
  "postedAt": "2026-09-09T08:35:19.000Z",
  "jobUrl": "https://careers.airbnb.com/positions/8184174?gh_jid=8184174",
  "applyUrl": "https://careers.airbnb.com/positions/8184174?gh_jid=8184174",
  "descriptionText": "Airbnb was born in 2007 when two hosts welcomed three guests…",
  "scrapedAt": "2026-11-08T10:20:21.292Z"
}
```

### Free company summary

Next to the jobs, every run saves one record per company it read in a separate **Company summary** dataset (in the Output tab). These records are free. With **Search all companies**, only the companies with matching jobs get one.

```json
{
  "company": "Greenhouse: stripe",
  "companyName": "Stripe",
  "ats": "greenhouse",
  "openJobs": 785,
  "matchingJobs": 12,
  "savedJobs": 12,
  "newJobsLast7Days": 61,
  "newJobsLast30Days": 237,
  "openJobsChange7Days": 14,
  "openJobsChange30Days": -22,
  "previousOpenJobs": 771,
  "previousCheckAt": "2026-11-08T09:00:00.000Z",
  "departments": [{ "name": "Account Executives (EMEA)", "jobs": 47 }, { "name": "General University", "jobs": 28 }],
  "locations": [{ "name": "Dublin", "jobs": 59 }, { "name": "Singapore", "jobs": 56 }],
  "remoteJobs": 118,
  "hybridJobs": 0,
  "onsiteJobs": 0,
  "jobsWithSalary": 410,
  "latestPostedAt": "2026-11-14T18:02:11.000Z",
  "checkedAt": "2026-11-15T09:00:00.000Z"
}
```

- **New jobs** come from the jobs' posting dates. **Change** compares the number of open jobs with your own earlier runs, so it appears from the second run on (after 7 or 30 days). The counts are kept in the `career-page-company-history` key-value store of your Apify account; delete it to start over.
- `openJobs` counts all open jobs of the board, also when the run saves only some of them. Workday boards searched by title keywords list only the matching jobs, so their `openJobs` is empty; without keywords it is Workday's own count (left out above 2,000, where Workday stops counting).
- Turn it off with **Company summary (free)** in the input.

## Use cases

- **Job boards and aggregators**: fill a niche board with fresh jobs straight from company career sites, often before they reach LinkedIn or Indeed.
- **Recruiting and sourcing**: watch target companies and react the day a role opens.
- **Sales and lead generation**: a company that hires for a role your product serves is a lead. Search all companies for that role and get the list; the free company summary shows which of them hire most and grow.
- **Salary research**: published pay ranges by role, location and company, from the companies themselves.
- **Job seekers and AI agents**: one search across thousands of startups and tech companies, structured for a spreadsheet, an alert or an LLM.

## How much does it cost?

You pay only for the jobs you get: **$1.50 per 1,000 jobs**. That is the price on the Apify Free plan; paid Apify plans pay less. No start fee. Jobs that don't match your filters are free, and so are companies whose board is not found and the company summary records.

## Tips

- **A company is not found by name?** Paste the link of any of its jobs or of its career page. Workday boards have no guessable address, so they need a link, unless the company is in the directory.
- **Faster searches across all companies**: turn off **Include job descriptions**, and pick only the systems you need under **Career site systems**.
- **Job alerts**: save the input as a task, turn on **Only new jobs since the last run** and add a schedule.
- **Run summary**: jobs found and errors per company are saved in the key-value store as `SUMMARY`.

## FAQ

**Which companies are in the directory?** 9,687 career sites on Greenhouse, Lever, Ashby, Workday, Personio and Teamtailor that we found in the apply links of over 500,000 job postings in 30 countries and checked on each system's public job API or feed: each had open jobs when it was checked (November 2026). The directory is updated with new companies over time.

**How is a company found by its name?** The Actor tries the usual board names for the company (`Door Dash` → `doordash`, `door-dash`) on Greenhouse, Lever, Ashby, Personio and Teamtailor, and uses the one that exists. A company in the directory is found at once.

**Is it legal to scrape career pages?** The Actor reads the public job board APIs that these systems offer for publishing jobs. Job postings are public business information, not personal data. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.

If this Actor saved you time, a short review in the **Reviews** tab helps other users find it and helps us keep improving it.
