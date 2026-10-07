# Glassdoor Jobs Scraper

**Scrape Glassdoor jobs in 62 countries by keyword and location.** Get title, company and its Glassdoor rating, salary as numbers or Glassdoor's salary estimate, job type, remote, company size, revenue, industry and founding year, the full description and the job link. Export to JSON, CSV or Excel, or use the API. **$1 per 1,000 jobs, no start fee.**

Scrape jobs from **Glassdoor**, the job site known for company reviews and salaries, the way you search on it: keywords, a city, state or region, a distance and Glassdoor's filters, in the United States, the United Kingdom, Canada, India, Germany, France and 56 more countries. Each job comes with the **company's rating** from its employees, the **salary as numbers** per year, month or hour where the employer states it, and **Glassdoor's salary estimate** (low, median and high) where it does not, plus the company's size, revenue, type, industry, founding year, headquarters, website and logo. Glassdoor shows at most 30 pages per search; this Actor reads on past them, so **big searches return thousands of jobs**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Glassdoor scraper do?

- 🔎 **Search like on the website**: keywords such as `data analyst` or `registered nurse`, a city, state or region with a distance, or paste any Glassdoor search link from any Glassdoor site.
- 🌍 **62 countries**: from the United States and the United Kingdom to India, Germany, Brazil, Singapore and the United Arab Emirates. Pick the country from a list.
- ⭐ **Company ratings**: every job with its company's Glassdoor rating, and a filter for companies rated 3 or 4 stars and more.
- 💰 **Salaries and estimates**: pay the employer states becomes `{ "min": 80300, "max": 123165, "currency": "USD", "interval": "year" }`. Where the employer states none, Glassdoor's estimate goes to `salaryEstimate`, with the median.
- 🏢 **Company details**: size, revenue, type (public, private, nonprofit), industry, founding year, headquarters, website, logo and the company's Glassdoor page.
- 🎛️ **Glassdoor filters**: job type, experience level (internship to executive), remote, Easy Apply, minimum company rating and date posted.
- ♾️ **Past the 30-page limit**: Glassdoor stops a search after 30 pages. The Actor goes on with the jobs it has not read yet: a test search for `registered nurse` in the United States returned 7,100 jobs in under three minutes.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so Glassdoor jobs, other job boards and company career sites fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Motorola Strategy Analyst - Global Future Leaders Program (2027) |
| `companyName` / `companyRating` | Lenovo / 3.9 |
| `location` / `city` / `state` / `country` | Chicago, IL / Chicago / IL / US |
| `employmentType` / `jobTypes` | full-time / Full-time |
| `salary` | `{ "min": 80300, "max": 123165, "currency": "USD", "interval": "year" }` |
| `salaryEstimate` | Glassdoor's estimate with `min`, `median` and `max`, for jobs without a stated salary |
| `companySize` / `companyRevenue` | 10000+ Employees / $10+ billion (USD) |
| `companyType` / `companyIndustry` / `companyFounded` | Company - Public / Computer Hardware Development / 1984 |
| `companyHeadquarters` / `companyWebsite` | Morrisville, NC / https://www.lenovo.com |
| `remote` / `easyApply` / `seniorityLevel` | false / false / the level you searched for |
| `postedAt` | 2026-09-10 |
| `jobUrl` / `companyUrl` | the job and the company on Glassdoor |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Glassdoor jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or paste links of searches you made on Glassdoor.
2. Pick the **country** and optionally enter a **location** such as `New York, NY`, `London` or `Bavaria`, and a **distance**.
3. Optionally choose **job types**, **experience levels**, **remote only**, a **minimum company rating**, **Easy Apply only** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for our job scrapers: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data analyst", "business analyst"],
  "country": "US",
  "location": "Chicago, IL",
  "distance": 25,
  "jobTypes": ["fulltime"],
  "experienceLevels": ["entry"],
  "minCompanyRating": "4",
  "postedWithinDays": 7
}
```

Countries are two-letter codes such as `US`, `GB`, `CA`, `IN` or `DE`. Job types are `fulltime`, `parttime`, `contract`, `temporary` and `internship`; experience levels `internship`, `entry`, `midsenior`, `director` and `executive`. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "glassdoor",
  "company": "8034",
  "companyName": "Lenovo",
  "jobId": "1010259176967",
  "title": "Motorola Strategy Analyst - Global Future Leaders Program (2027)",
  "location": "Chicago, IL",
  "locations": ["Chicago, IL"],
  "remote": false,
  "workplaceType": null,
  "employmentType": "full-time",
  "salary": { "min": 80300, "max": 123165, "currency": "USD", "interval": "year", "text": "USD 80,300–123,165 per year", "source": "listing" },
  "postedAt": "2026-09-10T00:00:00.000Z",
  "jobUrl": "https://www.glassdoor.com/job-listing/motorola-strategy-analyst-global-future-leaders-program-2027-lenovo-JV_IC1128808_KO0,60_KE61,67.htm?jl=1010259176967",
  "applyUrl": "https://www.glassdoor.com/job-listing/motorola-strategy-analyst-global-future-leaders-program-2027-lenovo-JV_IC1128808_KO0,60_KE61,67.htm?jl=1010259176967",
  "descriptionText": "General Information\n\nReq #\n\nWD00104731\n\nCareer area:\n\nStrategy and Operations…",
  "descriptionHtml": "<div><div><div><div><h3 class=\"jobSectionHeader\"><b>General Information</b></h3>…",
  "jobTypes": ["Full-time"],
  "seniorityLevel": null,
  "easyApply": false,
  "sponsored": true,
  "salaryEstimate": null,
  "normalizedTitle": "strategy analyst",
  "city": "Chicago",
  "state": "IL",
  "country": "US",
  "companyRating": 3.9,
  "companyUrl": "https://www.glassdoor.com/Overview/Working-at-Lenovo-EI_IE8034.11,17.htm",
  "companyWebsite": "https://www.lenovo.com",
  "companyLogo": "https://media.glassdoor.com/sql/8034/lenovo-squareLogo-1659106523467.png",
  "companySize": "10000+ Employees",
  "companyRevenue": "$10+ billion (USD)",
  "companyType": "Company - Public",
  "companyIndustry": "Computer Hardware Development",
  "companyFounded": 1984,
  "companyHeadquarters": "Morrisville, NC",
  "scrapedAt": "2026-10-07T15:08:49.257Z"
}
```

## Use cases

- **Recruitment and staffing agencies**: see every new role in your niche and region each morning, with the company's rating, size and pay.
- **Job seekers and career sites**: list jobs at well-rated companies only, with the salary or Glassdoor's estimate.
- **Salary research**: compare stated pay and Glassdoor's estimates by role, city and country.
- **Sales and lead generation**: companies that hire are growing. Size, revenue, industry and website help to qualify them.
- **Labor market analytics**: track demand by occupation, job type, remote share and company size over time.
- **AI agents**: give an agent one tool that searches jobs with company ratings worldwide.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.90 per 1,000 jobs on Starter, $0.80 on Scale and $0.70 on Business, which is the "from" price shown in Apify Store. There is no start fee. The same job found by two searches is saved once, and you do not pay for duplicates or for jobs filtered out by your settings. The Apify free plan covers about 5,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Big searches**: a search such as `nurse` in the whole United States has hundreds of thousands of jobs, more than Glassdoor lists for one search. Set **Maximum jobs in total**, or search city by city or with filters.
- **Faster runs**: turn off **Include job descriptions**. You still get every other field.
- **Stricter results**: Glassdoor also matches words in the description. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have a salary estimate instead of a salary?** `salary` holds only pay the employer states. Where it states none, Glassdoor shows its own estimate for the role and place; the Actor keeps it apart in `salaryEstimate`, so you always know which is which. **Only jobs with a salary** counts stated pay only.

**Why does a whole-country search need keywords?** Glassdoor answers a search of a whole country without keywords with jobs from anywhere. Enter keywords, or a city, state or region.

**Why are many of these jobs also on Indeed?** Glassdoor and Indeed belong to the same company, and Glassdoor lists many of its jobs from Indeed's job platform. What Glassdoor adds is the company's rating and profile and its salary estimates. For Indeed itself, see [Indeed Jobs Scraper](https://apify.com/robertosan16/indeed-jobs-scraper).

**Does it collect reviews or recruiter contact details?** No. The Actor reads job listings and the company's overall rating, not reviews, and there are no fields for recruiters' names, emails or phone numbers.

**Is it legal to scrape Glassdoor?** The Actor reads the public job listings Glassdoor shows to every visitor, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Glassdoor.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
