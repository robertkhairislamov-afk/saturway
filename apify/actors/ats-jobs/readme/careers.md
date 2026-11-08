# Career Page Jobs Scraper: Greenhouse, Lever, Ashby, Workday

**Get every open job from company career pages on Greenhouse, Lever, Ashby and Workday.** Enter company names, website domains or job board links, or **search 2,600+ companies at once** by job title. Title, department, locations, salary range, full description and apply link, in one format for all four systems. **$1.50 per 1,000 jobs, no start fee.**

Most tech companies, startups and many large employers publish their jobs on their own career site, run by an applicant tracking system: **Greenhouse** (Airbnb, Stripe, Figma), **Lever** (Zoox, Palantir), **Ashby** (Ramp, Notion, 1Password) or **Workday** (NVIDIA, Salesforce, banks and retailers). Their jobs often appear there days before job boards, with the salary range the company publishes. This Actor reads the career sites directly, with no browser and no login.

## What can this career page scraper do?

- 🏢 **Companies by name, domain or link**: `Stripe`, `notion.so` or `https://jobs.lever.co/zoox`. You don't need to know which system a company uses: the Actor finds its Greenhouse, Lever or Ashby board for you.
- 🌐 **Search all companies**: one search across **2,630 company career sites** found and checked on Greenhouse, Lever, Ashby and Workday, about 320,000 open jobs. For example *data engineer, remote or United States*.
- 💰 **Salary ranges** wherever the company publishes them, as `min`, `max`, `currency` and `interval`, plus ranges found in the description.
- 🔎 **Filters**: title keywords, excluded words, locations, remote only, departments, posted in the last N days, only jobs with a salary.
- 🆕 **Only new jobs since the last run**: schedule it daily and get only the jobs that opened since yesterday.
- 🧩 **One format for all four systems**, and the same as our other job scrapers listed at the end of this page.

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

In our test this search read all 2,630 career sites in about four minutes and returned 374 jobs.

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

## Use cases

- **Job boards and aggregators**: fill a niche board with fresh jobs straight from company career sites, often before they reach LinkedIn or Indeed.
- **Recruiting and sourcing**: watch target companies and react the day a role opens.
- **Sales and lead generation**: a company that hires for a role your product serves is a lead. Search all companies for that role and get the list.
- **Salary research**: published pay ranges by role, location and company, from the companies themselves.
- **Job seekers and AI agents**: one search across thousands of startups and tech companies, structured for a spreadsheet, an alert or an LLM.

## How much does it cost?

You pay only for the jobs you get: **$1.50 per 1,000 jobs**. That is the price on the Apify Free plan; paid Apify plans pay less. No start fee. Jobs that don't match your filters are free, and so are companies whose board is not found.

## Tips

- **A company is not found by name?** Paste the link of any of its jobs or of its career page. Workday boards have no guessable address, so they need a link, unless the company is in the directory.
- **Faster searches across all companies**: turn off **Include job descriptions**, and pick only the systems you need under **Career site systems**.
- **Job alerts**: save the input as a task, turn on **Only new jobs since the last run** and add a schedule.
- **Run summary**: jobs found and errors per company are saved in the key-value store as `SUMMARY`.

## FAQ

**Which companies are in the directory?** 2,630 career sites on Greenhouse, Lever, Ashby and Workday that we found in job postings and checked on each system's public job board API: each had open jobs when it was added. The directory is updated with new companies over time.

**How is a company found by its name?** The Actor tries the usual board names for the company (`Door Dash` → `doordash`, `door-dash`) on Greenhouse, Lever and Ashby, and uses the one that exists. A company in the directory is found at once.

**Is it legal to scrape career pages?** The Actor reads the public job board APIs that these systems offer for publishing jobs. Job postings are public business information, not personal data. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
