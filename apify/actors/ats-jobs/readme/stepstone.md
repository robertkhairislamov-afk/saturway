# StepStone Jobs Scraper

**Scrape StepStone.de jobs in Germany by keyword and city.** Get title, company, location, home office, contract type, full description, benefits, industry and apply link. Export to JSON, CSV or Excel, or use the API. **$0.50 per 1,000 jobs, no start fee.**

Scrape jobs from **StepStone** (`stepstone.de`), one of Germany's biggest job sites, the way you search on the website: keywords, city and distance, and the StepStone filters for contract type, working hours, home office, experience and the language of the job ad. Each job comes with the company, all locations, home office status, employment type, **benefits as a list**, industry, the full description, the posting and expiry dates and the job link. Every page of a search is read, so you **get all matching jobs**. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this StepStone scraper do?

- 🔎 **Search like on the website**: keywords such as `Softwareentwickler`, `data analyst` or `Pflege`, a city and a distance, or paste any stepstone.de search link.
- 🎛️ **StepStone filters**: contract type (permanent, fixed-term, freelance, working student, internship, apprenticeship and more), full-time or part-time, home office (partly or fully remote), experience, and jobs posted in the last 7 days.
- 🇬🇧 **English-language jobs**: pick English as the job ad language to find jobs in Germany where English is enough.
- ♾️ **All results**: every page of a search, thousands of jobs per run, without duplicates.
- 🎁 **Benefits as a list**: company car, flexible hours, pension plan, JobRad and more, as StepStone shows them.
- 🧾 **Full job details**: description as text and HTML, employment type, industry, expiry date, quick apply and "no cover letter needed" flags.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our [Greenhouse](https://apify.com/robertosan16/greenhouse-jobs-scraper), [Lever](https://apify.com/robertosan16/lever-jobs-scraper), [Ashby](https://apify.com/robertosan16/ashby-jobs-scraper), [Workday](https://apify.com/robertosan16/workday-jobs-scraper), [Dice](https://apify.com/robertosan16/dice-jobs-scraper) and [Welcome to the Jungle](https://apify.com/robertosan16/welcome-to-the-jungle-jobs-scraper) scrapers**, so jobs from all of them fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Software Engineer Python - GenAI, LLM & Agentic Systems (m/w/d) |
| `companyName` / `company` | Vonovia / 76597 |
| `location` / `locations` | Bochum |
| `remote` / `workplaceType` | false / hybrid |
| `employmentType` | full-time |
| `benefits` | Unbefristetes Arbeitsverhältnis, mobiles Arbeiten, Jobrad, … |
| `industry` | IT, IT-Softwareentwicklung |
| `quickApply` / `noCoverLetter` | true / false |
| `postedAt` / `validThrough` | 2026-09-25 / 2026-10-25 |
| `jobUrl` | https://www.stepstone.de/stellenangebote--…-14430443-inline.html |
| `descriptionText` / `descriptionHtml` | full job description |
| `salary` | as numbers when the job states it |

## How to scrape StepStone jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or paste links of searches you made on stepstone.de.
2. Optionally set a **location** such as `Berlin` or `München` and a **distance**.
3. Optionally pick **contract types**, **working hours**, **home office**, **experience**, the **job ad language** or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

### Example input

```json
{
  "searchQueries": ["data analyst", "python developer"],
  "location": "Berlin",
  "radius": 30,
  "contractTypes": ["222"],
  "remoteTypes": ["2", "1"],
  "languages": ["en"],
  "postedWithinDays": 7
}
```

Contract type `222` is a permanent contract; home office `2` is partly and `1` fully remote. In the form you simply pick them from lists.

### Example output

```json
{
  "ats": "stepstone",
  "company": "76597",
  "companyName": "Vonovia",
  "jobId": "14430443",
  "title": "Software Engineer Python - GenAI, LLM & Agentic Systems (m/w/d)",
  "location": "Bochum",
  "locations": ["Bochum"],
  "remote": false,
  "workplaceType": "hybrid",
  "employmentType": "full-time",
  "salary": null,
  "postedAt": "2026-09-25T08:12:31.000Z",
  "jobUrl": "https://www.stepstone.de/stellenangebote--Software-Engineer-Python-GenAI-LLM-Agentic-Systems-m-w-d-Bochum-Vonovia--14430443-inline.html",
  "applyUrl": "https://www.stepstone.de/stellenangebote--Software-Engineer-Python-GenAI-LLM-Agentic-Systems-m-w-d-Bochum-Vonovia--14430443-inline.html",
  "descriptionText": "Einleitung\n\nAls Teil des Wohnungskonzerns Vonovia SE gestalten unsere kaufmännischen Teams den Alltag für über eine Million Mieter:innen…",
  "descriptionHtml": "<h4>Einleitung</h4>\n<p>Als Teil des Wohnungskonzerns Vonovia SE…",
  "benefits": [
    "Sicherheit: Du arbeitest in einem unbefristeten Arbeitsverhältnis in einem dynamisch wachsenden Unternehmen",
    "Flexibilität & Weiterbildung: Arbeiten aus dem Homeoffice heraus? Wir bieten mobiles Arbeiten mit flexiblen Arbeitszeiten…",
    "Gesundheit: Angebote zur Mitarbeiter:innengesundheit z.B. vergünstigte Fitnessstudiobeiträge, Grippeschutzimpfung, Jobrad (auch E-Bike), etc."
  ],
  "skills": null,
  "industry": "IT, IT-Softwareentwicklung",
  "quickApply": true,
  "noCoverLetter": false,
  "validThrough": "2026-10-25T09:12:31.12Z",
  "companyUrl": "https://www.stepstone.de/cmp/de/vonovia-76597/jobs",
  "companyLogoUrl": "https://www.stepstone.de/upload_DE/logo/V/logoVonovia-76597DE.gif",
  "scrapedAt": "2026-09-25T17:25:46.737Z"
}
```

## Use cases

- **Recruitment agencies and staffing firms**: see every new job for your specialty and region each morning.
- **Job boards and aggregators**: fill a German or English-language job board with fresh StepStone listings.
- **Sales and lead generation**: companies hiring for a function are buying tools and services for it. Turn job ads into leads.
- **Labor market research**: track demand by city, industry, contract type and home office share.
- **Relocation and expat services**: collect English-language jobs in Germany.

## How much does it cost?

You pay only for the jobs you get: **$0.50 per 1,000 jobs**. There is no start fee. Jobs filtered out by your settings are free. The Apify free plan covers about 10,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Fast lists**: turn off **Load full job details** to skip the job pages. You still get title, company, locations, home office, date, benefits and a short summary.
- **Stricter results**: StepStone also matches related words. Use **Title must contain** to keep only jobs with your keyword in the title.
- **German city names** work with or without umlauts: `München` or `Muenchen`.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why do most jobs have no salary?** Most German employers do not publish pay, and StepStone shows its salary estimates only to logged-in visitors. When a job states pay in its data or description, it is saved as numbers.

**Does it collect recruiter contact details?** No. There are no fields for recruiters' names, emails or phone numbers, and they are not requested. The job description is saved as the employer wrote it.

**Is it legal to scrape StepStone?** The Actor reads the public job listings StepStone shows to every visitor. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
