# How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format

*Collect jobs from LinkedIn, SEEK, StepStone, Reed, InfoJobs, Dice, Jobstreet, JobsDB, Welcome to the Jungle and any company's Greenhouse, Lever, Ashby or Workday career site into one table, with salaries as numbers and no duplicates.*

*This guide was written with the assistance of an AI writing tool. Every code sample in it was run against the live scrapers before publishing.*

Job data is spread over dozens of sites, and each one has its own format. One writes the salary as "$120k – $140k p.a.", another as "RM 3,800 – RM 5,000 per month", a third hides it. Locations, dates and remote flags all look different too. If you run a job board, recruit across countries, study the labor market or look for companies that are hiring, you need all of it in one table.

## What you get

Every job comes in the same format, whatever site it came from:

- Title, company, location and all locations of the job
- Remote flag and workplace type (on-site, hybrid, remote)
- Employment type (full-time, part-time, contract, temporary, internship)
- Salary as numbers: minimum, maximum, currency and period (year, month, day or hour)
- Posting date, job link, apply link and the full description
- The site the job came from, in the `ats` field

Each site adds its own extras, such as seniority and number of applicants on LinkedIn, skills on Dice, company size on SEEK, benefits on StepStone and departments on Greenhouse, Lever and Ashby. There are no fields for recruiters' names, emails or phone numbers.

## Which sites are covered

Job boards, by country:

- **LinkedIn**: public job listings in any country, without login. [LinkedIn Jobs Scraper](https://apify.com/robertosan16/linkedin-jobs-scraper)
- **Dice**: tech jobs in the US. [Dice Jobs Scraper](https://apify.com/robertosan16/dice-jobs-scraper)
- **Reed**: the UK. [Reed Jobs Scraper](https://apify.com/robertosan16/reed-jobs-scraper)
- **InfoJobs**: Spain. [InfoJobs Jobs Scraper](https://apify.com/robertosan16/infojobs-jobs-scraper)
- **StepStone**: Germany. [StepStone Jobs Scraper](https://apify.com/robertosan16/stepstone-jobs-scraper)
- **Welcome to the Jungle**: France, the rest of western Europe, the US and Canada. [Welcome to the Jungle Jobs Scraper](https://apify.com/robertosan16/welcome-to-the-jungle-jobs-scraper)
- **SEEK**: Australia and New Zealand. [SEEK Jobs Scraper](https://apify.com/robertosan16/seek-jobs-scraper)
- **Jobstreet**: Malaysia, Singapore, the Philippines and Indonesia. [Jobstreet Jobs Scraper](https://apify.com/robertosan16/jobstreet-jobs-scraper)
- **JobsDB**: Hong Kong and Thailand. [JobsDB Jobs Scraper](https://apify.com/robertosan16/jobsdb-jobs-scraper)

Company career sites, by link:

- **Greenhouse**, **Lever**, **Ashby** and **Workday**: every open job of any company that uses them, on Workday even past the 2,000 jobs it shows per search. [Greenhouse](https://apify.com/robertosan16/greenhouse-jobs-scraper), [Lever](https://apify.com/robertosan16/lever-jobs-scraper), [Ashby](https://apify.com/robertosan16/ashby-jobs-scraper) and [Workday](https://apify.com/robertosan16/workday-jobs-scraper) Jobs Scrapers

The [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper) searches all of them at once: you give it keywords and countries, and it sends the search to every site that covers those countries. The single-site scrapers above have the same output and add the filters only their site has, such as SEEK classifications or StepStone contract types.

## Option 1: No code

1. Open the [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper) and click **Try for free**. The free Apify plan is enough for everything in this guide.
2. Enter **job titles or keywords**, one search per line, such as `data analyst`.
3. Pick the **countries**. For a single country you can also add a **city or region**, such as `Berlin` or `Sydney NSW`.
4. Optionally paste **company career sites**, or set **Remote jobs only**, **Only jobs with a salary** or **Posted in the last days**.
5. Click **Start**, then download the jobs as CSV, Excel or JSON.

## Option 2: Python, five countries in one run

Install the Apify client and pandas:

```bash
pip install apify-client pandas
```

Copy your API token from Apify Console (Settings → API & Integrations) into the `APIFY_TOKEN` environment variable. This script searches "data analyst" jobs posted in the last week in the US, the UK, Germany, Australia and Singapore, takes up to 100 jobs from each search, and shows where they came from and what they pay:

```python
import os
import pandas as pd
from apify_client import ApifyClient
client = ApifyClient(os.environ["APIFY_TOKEN"])
run = client.actor("robertosan16/all-in-one-jobs-scraper").call(run_input={
    "searchQueries": ["data analyst"],
    "countries": ["US", "GB", "DE", "AU", "SG"],
    "postedWithinDays": 7,
    "includeDescription": False,
    "maxItemsPerCompany": 100,
    "maxItems": 1000,
})
jobs = pd.DataFrame(client.dataset(run.default_dataset_id).iterate_items())
print(len(jobs), "jobs,", f"{jobs['salary'].notna().mean():.0%} with a salary")
print(jobs["ats"].value_counts().to_string())
pay = pd.json_normalize(jobs["salary"].dropna().tolist())
pay["mid"] = pay[["min", "max"]].mean(axis=1)
summary = pay.groupby(["currency", "interval"])["mid"].agg(["count", "median"])
print(summary[summary["count"] >= 5].round(0).to_string())
```

The run took 22 seconds. The output at the end of September 2026:

```
1000 jobs, 22% with a salary
ats
linkedin     493
stepstone    100
dice         100
seek         100
jobstreet    100
reed         100
wttj           7
                   count    median
currency interval
AUD      year         26  128750.0
GBP      day           9     400.0
         year         87   40000.0
SGD      month        28    4625.0
USD      hour         27      55.0
         year         42  116588.0
```

Because every salary is already split into numbers, currency and period, one `groupby` gives you the market rate. Data analyst jobs posted that week advertised a median of $116,588 a year in the US ($55 an hour for contracts), £40,000 a year in the UK (£400 a day for contractors), A$128,750 in Australia and S$4,625 a month in Singapore.

## Every job of any company: Greenhouse, Lever, Ashby and Workday

Many companies post their jobs only on their own career site. Paste the links, and the scraper recognizes the system behind each one:

```python
import os
import pandas as pd
from apify_client import ApifyClient
client = ApifyClient(os.environ["APIFY_TOKEN"])
run = client.actor("robertosan16/all-in-one-jobs-scraper").call(run_input={
    "companies": [
        "https://boards.greenhouse.io/airbnb",
        "https://jobs.lever.co/palantir",
        "https://jobs.ashbyhq.com/notion",
        "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
    ],
    "includeDescription": False,
})
jobs = pd.DataFrame(client.dataset(run.default_dataset_id).iterate_items())
print(len(jobs), "open jobs at 4 companies")
print(jobs.groupby(["ats", "companyName"]).size().to_string())
```

The output at the end of September 2026:

```
3278 open jobs at 4 companies
ats         companyName
ashby       Notion                    130
greenhouse  Airbnb                    156
lever       Palantir Technologies     320
workday     nvidia                   2672
```

The run took about eight minutes, most of it for NVIDIA. Workday shows at most 2,000 jobs per search, so for NVIDIA's 2,672 jobs the scraper searched each of its 14 job categories separately and merged the results without duplicates. Across the four companies, 57% of the jobs came with a salary as numbers, taken from the career site's pay field or read from the job description.

## Option 3: One API call

You don't need an SDK. This request runs the scraper and returns the jobs as JSON in a single call, for runs of up to five minutes:

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~all-in-one-jobs-scraper/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchQueries":["python developer"],"countries":["DE","ES","GB"],"maxItemsPerCompany":5,"maxItems":40}'
```

It returned 35 jobs from LinkedIn, Reed, StepStone, InfoJobs and Welcome to the Jungle in about eight seconds. The same endpoint works from JavaScript, Google Apps Script, n8n, Make or Zapier.

## Daily job alerts

Save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Each run then returns only the jobs that earlier runs did not, from every site at once. The same job posted on two sites is saved once. Send the new jobs to Google Sheets, Slack or email with Apify integrations, or let an AI agent search jobs through Apify's MCP server.

## What it costs

The scrapers charge per job, with no start fee. The All-in-One Jobs Scraper costs $1 per 1,000 jobs, the single-site scrapers $0.50 to $2 per 1,000. Duplicates and jobs filtered out by your settings are free. The monthly credit of the free Apify plan covers thousands of jobs, and paid Apify plans get 10–30% off.

## Is it legal?

The scrapers read the public job listings the sites show to every visitor. LinkedIn is read without login, from the public pages LinkedIn shows to guests. No personal data about recruiters or applicants is collected. Whether your use case is allowed depends on what you do with the data, so check each site's terms and the laws that apply to you. The scrapers are not affiliated with any of the sites.

## Wrapping up

With one format for 13 job sites and every company career site on Greenhouse, Lever, Ashby and Workday, a multi-country job feed is one run away: [All-in-One Jobs Scraper on Apify](https://apify.com/robertosan16/all-in-one-jobs-scraper). If you need another site or a field, open an issue on the Actor page and I'll reply quickly.
