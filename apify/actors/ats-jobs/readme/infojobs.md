# InfoJobs Jobs Scraper

**Scrape InfoJobs.net jobs in Spain by keyword and province.** Get title, company, salary as numbers, contract type, working hours, remote policy, full description and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **InfoJobs**, Spain's largest job site (infojobs.net), the way you search on the website: keywords, provinces and every InfoJobs filter. Each job comes with the **salary as numbers** per year or month, gross or net, the contract type (permanent, fixed-term, self-employed and more), working hours (full day, intensive or part-time), the **remote policy** (on-site, hybrid or remote only), the full description and the company. Contract types and working hours come in English, next to fields in the same format as our other job scrapers. InfoJobs serves every job of a search, with no limit per search. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this InfoJobs scraper do?

- 🔎 **Search like on the website**: keywords in Spanish or English such as `python`, `enfermera` or `camarero`, or paste any infojobs.net search link.
- 🗺️ **All 52 provinces**: Madrid, Barcelona, Valencia and every other province, or all of Spain.
- 🎛️ **All InfoJobs filters**: category, remote policy, contract type, working hours and date posted. Sort by newest or by relevance.
- ♾️ **Every job of a search**: no limit per search, for example all 12,800 jobs in Madrid.
- 💰 **Salary as numbers**: a salary of 62,000 to 70,000 € gross per year becomes `{ "min": 62000, "max": 70000, "currency": "EUR", "interval": "year" }`, with `salaryBasis` gross or net.
- ⚡ **Fast**: the search itself carries the full description, so no job page has to be opened. Thousands of jobs take a minute.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so jobs from company career sites and job boards fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Senior DevOps & Cloud Engineer |
| `companyName` | abde business consulting |
| `location` | Madrid |
| `workplaceType` / `employmentType` | hybrid / full-time |
| `contractType` / `workday` | Permanent / Full day |
| `salary` / `salaryBasis` | `{ "min": 62000, "max": 70000, "currency": "EUR", "interval": "year" }` / gross |
| `postedAt` | 2026-09-25 |
| `jobUrl` / `applyUrl` | https://www.infojobs.net/madrid/senior-devops-cloud-engineer-bruselas-comision-europea/of-ic9eca97dad425eb891f42fcb53dff8 |
| `companyUrl` / `companyLogoUrl` | company page and logo on InfoJobs |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape InfoJobs jobs

1. Enter **job titles or keywords**, one search per line, for example `administrativo`. Or paste links of searches you made on infojobs.net.
2. Pick **provinces**, or leave them empty for all of Spain.
3. Optionally choose **categories**, a **remote policy**, **contract types**, **working hours** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "searchQueries": ["python", "data engineer"],
  "provinces": ["33", "9"],
  "teleworking": ["2", "3"],
  "postedWithinDays": 7
}
```

Provinces are InfoJobs ids, for example `33` Madrid, `9` Barcelona and `49` Valencia; the remote policy is `1` on-site, `3` hybrid and `2` remote only. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "infojobs",
  "company": "abde-bc",
  "companyName": "abde business consulting",
  "jobId": "c9eca97dad425eb891f42fcb53dff8",
  "title": "Senior DevOps & Cloud Engineer (en BRUSELAS, Comisión Europea)",
  "location": "Madrid",
  "locations": ["Madrid"],
  "remote": false,
  "workplaceType": "hybrid",
  "employmentType": "full-time",
  "salary": { "min": 62000, "max": 70000, "currency": "EUR", "interval": "year", "text": "EUR 62,000–70,000 per year", "source": "listing" },
  "postedAt": "2026-09-25T17:20:52.000Z",
  "jobUrl": "https://www.infojobs.net/madrid/senior-devops-cloud-engineer-bruselas-comision-europea/of-ic9eca97dad425eb891f42fcb53dff8",
  "applyUrl": "https://www.infojobs.net/madrid/senior-devops-cloud-engineer-bruselas-comision-europea/of-ic9eca97dad425eb891f42fcb53dff8",
  "descriptionText": "OFERTA LABORAL: DevOps cloud consultant\n\n** Contrato indefinido + Proyecto de larga duración…",
  "descriptionHtml": "<p>OFERTA LABORAL: DevOps cloud consultant</p><p>** Contrato indefinido + Proyecto de larga duración…</p>",
  "contractType": "Permanent",
  "workday": "Full day",
  "salaryBasis": "gross",
  "executive": false,
  "companyUrl": "https://abde-bc.ofertas-trabajo.infojobs.net",
  "companyLogoUrl": "https://multimedia-logos.infojobs.net/image/upload/0f/0f642d0a-d371-4b11-bafa-41cfc60e1e8f",
  "scrapedAt": "2026-09-28T12:44:20.336Z"
}
```

## Use cases

- **Recruitment agencies**: see every new role in your sector and province each morning, with salary and contract type.
- **Job boards and aggregators**: fill a Spanish job board with fresh InfoJobs listings.
- **Salary research**: compare pay in Spain by role, province, contract type and remote policy.
- **Sales and lead generation**: companies hiring are growing. Company pages turn job ads into leads.
- **Labor market analytics**: track demand by category, province and remote work over time.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Smaller results**: turn off **Include job descriptions** when you need only the list.
- **Stricter results**: InfoJobs also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do some jobs have no salary?** Employers can leave the salary out on InfoJobs; about half of the jobs show one. `salaryBasis` says whether it is gross or net pay.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers. The job description is saved as the employer wrote it.

**Is it legal to scrape InfoJobs?** The Actor reads the public job listings InfoJobs shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
