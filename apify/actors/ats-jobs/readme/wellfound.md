# Wellfound Jobs Scraper

**Scrape startup jobs from Wellfound (formerly AngelList Talent) by role, city or remote.** Get title, startup, salary as numbers, equity, job type, remote policy, years of experience, the startup's stage, size, pitch and badges, the full description and the job link. Export to JSON, CSV or Excel, or use the API. **$2 per 1,000 jobs, no start fee.**

Scrape jobs from **Wellfound**, the job site of startups, the way you browse it: a role such as `software engineer` or `product manager`, a city or country such as `New York`, `London` or `India`, or remote jobs only. Each job comes with the **salary as numbers** and the **equity** in percent, as most Wellfound jobs state both, the **remote policy** with the countries a remote job accepts, and the **startup's stage** (such as Early Stage or Growth Stage), size, one-line pitch and Wellfound badges such as "Top Investors" or "Responds within two weeks". The full description comes with every job, without opening job pages, so runs are fast. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Wellfound scraper do?

- 🔎 **Browse like on the website**: roles such as `data scientist` or `account executive`, in a city or country, or remote. Or paste Wellfound job page links such as `https://wellfound.com/role/l/software-engineer/new-york`.
- 💰 **Salary and equity**: `$150k – $250k • 0.25% – 0.5%` becomes `{ "min": 150000, "max": 250000, "currency": "USD", "interval": "year" }` and `{ "min": 0.25, "max": 0.5 }`. Dollars, euros, pounds, rupees (lakhs included) and other currencies.
- 🚀 **Startup details**: stage, size, one-line pitch, logo, the startup's Wellfound page and its badges, such as "Actively Hiring", "Top Investors" or "Growing fast".
- 🏠 **Remote policy**: remote, onsite, or onsite or remote, whether working from home is possible, and the countries a remote job accepts.
- 🎛️ **Filters**: job type (full-time, contract, internship, co-founder) and date posted.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and startup tracking.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so Wellfound jobs, other job boards and company career sites fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` / `department` | Data Scientist / Data Scientist |
| `companyName` / `companyPitch` | Triumph Arcade / The fastest growing real-money mobile gaming platform |
| `location` / `locations` | San Francisco / San Francisco |
| `employmentType` | full-time, contract, internship or cofounder |
| `salary` | `{ "min": 200000, "max": 400000, "currency": "USD", "interval": "year" }` |
| `equity` | `{ "min": 0.25, "max": 0.5, "text": "0.25% – 0.5%" }` |
| `remote` / `workplaceType` / `remotePolicy` | false / onsite / onsite |
| `workFromHomeFlexible` / `remoteLocations` | false / the countries a remote job accepts |
| `experienceYearsMin` / `experienceYearsMax` | years of experience, where the job states them |
| `companyStage` / `companySize` | Early Stage / 11-50 |
| `companyBadges` | Actively Hiring, Top Investors, Growing fast |
| `postedAt` | 2026-04-01 |
| `jobUrl` / `companyUrl` / `companyLogo` | the job and the startup on Wellfound, and its logo |
| `descriptionText` | full job description, in Markdown as written on Wellfound |

## How to scrape Wellfound jobs

1. Enter **roles**, one search per line, for example `software engineer`. Or paste links of Wellfound job pages.
2. Enter a **location** such as `New York`, `London` or `India`, or turn on **Remote jobs only**.
3. Optionally choose **job types** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for our job scrapers: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data scientist", "machine learning engineer"],
  "location": "San Francisco",
  "jobTypes": ["full-time"],
  "postedWithinDays": 30
}
```

Remote jobs only: `{ "searchQueries": ["product manager"], "remoteOnly": true }`. Every job in a place: `{ "location": "Berlin" }`. Job types are `full-time`, `contract`, `internship` and `cofounder`; in the form you simply pick them from a list.

### Example output

```json
{
  "ats": "wellfound",
  "company": "triumph-arcade",
  "companyName": "Triumph Arcade",
  "jobId": "4046117",
  "title": "Data Scientist",
  "department": "Data Scientist",
  "location": "San Francisco",
  "locations": ["San Francisco"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 200000, "max": 400000, "currency": "USD", "interval": "year", "text": "$200k – $400k", "source": "listing" },
  "postedAt": "2026-04-01T23:40:10.000Z",
  "jobUrl": "https://wellfound.com/jobs/4046117-data-scientist",
  "applyUrl": "https://wellfound.com/jobs/4046117-data-scientist",
  "descriptionText": "# The Role\n\nAs a Data Scientist, you'll own the quantitative systems that drive how millions of players experience Triumph's products…",
  "descriptionHtml": null,
  "remotePolicy": "onsite",
  "workFromHomeFlexible": false,
  "remoteLocations": [],
  "equity": null,
  "experienceYearsMin": null,
  "experienceYearsMax": null,
  "companyPitch": "The fastest growing real-money mobile gaming platform",
  "companySize": "11-50",
  "companyStage": "Early Stage",
  "companyBadges": ["Actively Hiring", "Top 10% of responders", "Responds within two weeks", "Top Investors", "Growing fast"],
  "companyLogo": "https://photos.wellfound.com/startups/i/10342269-ec51173abf375fb14904f77b52b77ba6-medium_jpg.jpg?buster=1733968284",
  "companyUrl": "https://wellfound.com/company/triumph-arcade",
  "scrapedAt": "2026-10-13T09:12:30.114Z"
}
```

## Use cases

- **Job seekers**: every new startup job for your role each morning, with the salary, the equity and the startup's stage.
- **Recruiters and talent agencies**: see which startups hire for which roles, and how much they pay.
- **Investors and startup research**: hiring by stage and size shows which startups are growing and what they build.
- **Sales and lead generation**: startups that hire are growing and buying. Stage, size and pitch help to qualify them.
- **Salary and equity research**: compare pay and equity by role, city, stage and remote policy.
- **AI agents**: give an agent one tool that searches startup jobs.

## How much does it cost?

You pay only for the jobs you get: **$2 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $1.80 per 1,000 jobs on Starter, $1.60 on Scale and $1.40 on Business, which is the "from" price shown in Apify Store. There is no start fee. The same job found by two searches is saved once, and you do not pay for duplicates or for jobs filtered out by your settings. The Apify free plan covers about 2,500 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **More jobs per startup**: Wellfound's job pages show up to three jobs per startup for each role. Search related roles too, such as `backend engineer` and `full stack engineer` next to `software engineer`, to see more of a startup's openings.
- **Jobs with equity only**: filter the results on `equity`, or sort by `equity.max` in Excel.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do I get fewer jobs than Wellfound's count?** Wellfound counts every matching job, but its job pages show up to three jobs per startup. A startup hiring five software engineers in New York shows three of them, and this Actor reads what the pages show. In a test, `software engineer` in New York returned 516 of the 753 jobs Wellfound counts.

**Which roles and places can I search?** The ones Wellfound has job pages for: its job titles, such as `software engineer`, `data scientist`, `product designer`, `account executive` or `marketing manager`, and cities and countries, such as `San Francisco`, `New York`, `London`, `Bangalore`, `United States` or `India`. If Wellfound has no page for a role or place, the run says which one, instead of returning jobs you did not ask for.

**Does it collect recruiter or founder contact details?** No. There are no fields for people's names, emails or phone numbers.

**Is it legal to scrape Wellfound?** The Actor reads the public job pages Wellfound shows to every visitor, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Wellfound.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
