# How to Scrape Indeed Job Postings in 62 Countries with Python

*Get Indeed jobs with salaries as numbers, job types, benefits and company data, even past Indeed's limit of about 1,000 jobs per search: in a spreadsheet, in Python or with one API call.*

*This guide was written with the assistance of an AI writing tool. Every code sample in it was run against the live scraper before publishing.*

Indeed is one of the largest job sites in the world, with its own site in the United States, the United Kingdom, Canada, India, Germany and dozens of other countries. That makes it the first place to look if you study the labor market, run a job board, recruit, or want to know who is hiring. Getting the jobs out of it is another matter: the website blocks most automated visitors, a search shows at most about 1,000 jobs, and every country has its own site and language.

## What you get

Every job comes as one flat record:

- Title, company, location, city, state, postal code and country
- Salary as numbers: minimum, maximum, currency and period (hour, day, week, month or year), only where the employer states it
- Job types such as full-time, part-time, contract, temporary or internship
- Remote, hybrid or in-person, and the experience level
- Benefits such as health insurance, paid time off or a retirement plan, and the schedule
- Company size, revenue, website and logo
- Posting date, the Indeed job link, the link to apply on the employer's site and the full description

There are no fields for recruiters' names, emails or phone numbers.

## Option 1: No code

1. Open [Indeed Jobs Scraper](https://apify.com/robertosan16/indeed-jobs-scraper) and click **Try for free**. The free Apify plan is enough for everything in this guide.
2. Enter **job titles or keywords**, one search per line, such as `data analyst`. You can also paste the link of a search you made on Indeed in any country.
3. Pick the **country** and, if you like, a **location** such as `New York, NY` or `London` with a distance.
4. Optionally choose job types, remote, hybrid or in-person, an experience level, "Easily apply" or a date range.
5. Click **Start**, then download the jobs as CSV, Excel or JSON.

## Option 2: Python, the same job in five countries

Install the Apify client and pandas:

```bash
pip install apify-client pandas
```

Copy your API token from Apify Console (Settings → API & Integrations) into the `APIFY_TOKEN` environment variable. This script takes 300 "software engineer" jobs posted in the last week in each of five countries, counts how many state a salary or are remote, and compares the yearly pay:

```python
import os
import pandas as pd
from apify_client import ApifyClient
client = ApifyClient(os.environ["APIFY_TOKEN"])
rows = []
for country in ["US", "GB", "DE", "CA", "IN"]:
    run = client.actor("robertosan16/indeed-jobs-scraper").call(run_input={
        "searchQueries": ["software engineer"],
        "country": country,
        "postedWithinDays": 7,
        "includeDescription": False,
        "maxItems": 300,
    })
    rows += client.dataset(run.default_dataset_id).iterate_items()
jobs = pd.DataFrame(rows)
print(len(jobs), "software engineer jobs from the last week")
summary = jobs.groupby("country").agg(jobs=("jobId", "size"), salary=("salary", "count"), remote=("remote", "sum"))
print(summary.to_string())
pay = pd.json_normalize(jobs["salary"].dropna().tolist())
pay["country"] = jobs.loc[jobs["salary"].notna(), "country"].to_numpy()
pay["mid"] = pay[["min", "max"]].mean(axis=1)
yearly = pay[pay["interval"] == "year"]
print(yearly.groupby(["country", "currency"])["mid"].median().round(-3).to_string())
```

The five runs took 81 seconds together. The output at the end of September 2026:

```
1500 software engineer jobs from the last week
         jobs  salary  remote
country
CA        300     216      43
DE        300      51      30
GB        300      72      30
IN        300      53      27
US        300     217      44
country  currency
CA       CAD         110000.0
DE       EUR          80000.0
GB       GBP          53000.0
IN       INR         711000.0
US       USD         142000.0
```

In the United States and Canada 72% of these jobs state a salary, in the UK, Germany and India only 17 to 24%. The median midpoint of the yearly pay ranges was $142,000 in the US, C$110,000 in Canada, €80,000 in Germany, £53,000 in the UK and ₹711,000 in India. Each country is read in its own language, which is what makes Indeed return the salaries there at all.

## Past Indeed's limit of 1,000 jobs

Indeed stops a search after about 1,000 jobs, newest first. The scraper keeps going with the older jobs in further rounds, so a big search comes back complete. This script takes every "registered nurse" job posted in the United States today and yesterday and looks at job types and benefits:

```python
import os
import pandas as pd
from apify_client import ApifyClient
client = ApifyClient(os.environ["APIFY_TOKEN"])
run = client.actor("robertosan16/indeed-jobs-scraper").call(run_input={
    "searchQueries": ["registered nurse"],
    "country": "US",
    "postedWithinDays": 1,
    "includeDescription": False,
})
jobs = pd.DataFrame(client.dataset(run.default_dataset_id).iterate_items())
print(len(jobs), "registered nurse jobs posted today and yesterday")
print(jobs["employmentType"].value_counts().head(4).to_string())
print(jobs["benefits"].explode().value_counts().head(6).to_string())
```

The run took two minutes:

```
4994 registered nurse jobs posted today and yesterday
employmentType
full-time    3457
part-time     710
Per diem      163
contract      103
benefits
Health insurance         2399
Dental insurance         2130
Paid time off            2073
Vision insurance         1906
Tuition reimbursement    1213
401(k) matching          1079
```

That is five times what a single Indeed search shows. Benefits come as lists, so `explode()` counts them in one line: almost half of these jobs offer health insurance, and one in five matches 401(k) contributions.

## Option 3: One API call

You don't need an SDK. This request runs the scraper and returns the jobs as JSON in a single call, for runs of up to five minutes:

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~indeed-jobs-scraper/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchQueries":["python developer"],"country":"GB","location":"London","workplaceTypes":["hybrid"],"maxItems":20}'
```

It returned 20 hybrid python developer jobs in London in about five seconds. The same endpoint works from JavaScript, Google Apps Script, n8n, Make or Zapier.

## Daily job alerts

Save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Each run then returns only the jobs that earlier runs did not. Send them to Google Sheets, Slack or email with Apify integrations, or let an AI agent search jobs through Apify's MCP server.

## What it costs

The scraper charges per job: $1 per 1,000 jobs, with no start fee. A job found by two of your searches is saved once and charged once. The monthly credit of the free Apify plan covers thousands of jobs, and paid Apify plans get 10–30% off.

## Is it legal?

The scraper reads the public job listings Indeed shows to every visitor, without logging in, and it doesn't collect personal data about recruiters or applicants. Whether your use case is allowed depends on what you do with the data, so check Indeed's terms and the laws that apply to you. The scraper is not affiliated with Indeed.

## Wrapping up

Indeed data is most useful as a table you can filter, group and chart, across countries and past the 1,000-job limit: [Indeed Jobs Scraper on Apify](https://apify.com/robertosan16/indeed-jobs-scraper). To search Indeed, LinkedIn and 12 more job sites at once in the same format, see my guide [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2). If you need a field or a feature, open an issue on the Actor page and I'll reply quickly.
