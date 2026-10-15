# Xing Jobs Scraper

**Scrape Xing jobs in Germany, Austria and Switzerland by keyword and city.** Get title, company, salary as numbers or Xing's salary estimate, job type, career level, remote or hybrid, field and industry, the full description, a short summary and the job link. Export to JSON, CSV or Excel, or use the API. **$1 per 1,000 jobs, no start fee.**

Scrape jobs from **Xing**, the professional network and job site of the German-speaking countries, the way you search on it: keywords such as `data analyst`, `Pflegefachkraft` or `Projektmanager`, a city such as `Berlin`, `München`, `Wien` or `Zürich` with a distance, and Xing's filters for job type, career level, remote work and date posted. Each job comes with the **salary as numbers** per year where the employer states it and **Xing's salary estimate** (low, median and high) where it does not, so almost every job has a pay figure. You also get the **career level**, the field and industry, every location with postal code, the company's Xing page, size and logo, and Xing's **short summary** of the job: introduction, qualifications and responsibilities. The full description comes with every job, without opening job pages, so runs are fast. Run it on a schedule to get **only new jobs**. No browser, no login.

## What can this Xing scraper do?

- 🔎 **Search like on the website**: keywords and a city with a distance in km, or paste any Xing job search link.
- 🇩🇪 🇦🇹 🇨🇭 **Germany, Austria and Switzerland**: Xing's jobs in all three countries, searched together or city by city.
- 💰 **Salaries and estimates**: pay the employer states becomes `{ "min": 50000, "max": 55000, "currency": "EUR", "interval": "year" }`. Where the employer states none, Xing's estimate goes to `salaryEstimate`, with the median.
- 🎛️ **Xing filters**: job type (full-time, part-time, self-employed, student, temp, seasonal, volunteer), career level (student to senior executive), remote, hybrid or on-site, and date posted.
- 📝 **Summary and skills**: Xing's short summary of each job and its keywords, handy for matching and AI.
- 🏢 **Company details**: the company's Xing page, size, industry, city and logo.
- 🆕 **Only new jobs since the last run**: for job alerts, recruiting pipelines and market monitoring.
- 🧩 **Same output as our other job scrapers**, listed at the end of this page, so Xing jobs, other job boards and company career sites fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | (Junior) Performance / Business Analyst (m/w/d) Retail |
| `companyName` / `companySize` | Mercuri Urval GmbH / 501-1,000 employees |
| `location` / `city` / `state` / `postalCode` / `country` | Hamburg, Freie und Hansestadt Hamburg, DE / Hamburg / … / DE |
| `employmentType` / `seniorityLevel` | full-time / Entry Level |
| `salary` | `{ "min": 50000, "max": 55000, "currency": "EUR", "interval": "year" }` |
| `salaryEstimate` | Xing's estimate with `min`, `median` and `max`, for jobs without a stated salary |
| `remote` / `workplaceType` / `remoteOptions` | false / onsite / onsite |
| `department` / `industry` | Analysis and statistics / Consulting |
| `summary` | introduction, qualifications and responsibilities |
| `skills` | supply, chain, management, marktforschung, retail… |
| `postedAt` / `updatedAt` / `validThrough` | 2026-09-15 / 2026-09-30 / 2026-11-14 |
| `jobUrl` / `applyUrl` / `companyUrl` | the job on Xing, the employer's application page, the company on Xing |
| `descriptionText` / `descriptionHtml` | full job description |

## How to scrape Xing jobs

1. Enter **job titles or keywords**, one search per line, for example `data analyst`. Or paste links of searches you made on xing.com/jobs.
2. Optionally enter a **city** such as `Berlin`, `Wien` or `Zürich`, and a **distance** in km.
3. Optionally choose **job types**, **career levels**, **remote, hybrid or on-site**, or a **date range**.
4. Click **Start**. Download the jobs as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples for our job scrapers: [How to Scrape Job Postings from LinkedIn and 12 More Job Sites in One Format](https://medium.com/@robertkhairislamov/how-to-scrape-job-postings-from-linkedin-and-12-more-job-sites-in-one-format-935bb79ba2d2).

### Example input

```json
{
  "searchQueries": ["data analyst", "business analyst"],
  "location": "Hamburg",
  "distance": 30,
  "jobTypes": ["fulltime"],
  "experienceLevels": ["entry", "experienced"],
  "workplaceTypes": ["remote", "hybrid"],
  "postedWithinDays": 7
}
```

Job types are `fulltime`, `parttime`, `contract`, `internship`, `temporary`, `seasonal` and `volunteer`; career levels `student`, `entry`, `experienced`, `manager`, `executive` and `senior_executive`; workplaces `remote`, `hybrid` and `onsite`. In the form you simply pick them from a list.

### Example output

```json
{
  "ats": "xing",
  "company": "29657",
  "companyName": "Mercuri Urval GmbH",
  "jobId": "157877372",
  "title": "(Junior) Performance / Business Analyst (m/w/d) Retail",
  "department": "Analysis and statistics",
  "location": "Hamburg, Freie und Hansestadt Hamburg, DE",
  "locations": ["Hamburg, Freie und Hansestadt Hamburg, DE"],
  "remote": false,
  "workplaceType": "onsite",
  "employmentType": "full-time",
  "salary": { "min": 50000, "max": 55000, "currency": "EUR", "interval": "year", "text": "EUR 50,000–55,000 per year", "source": "listing" },
  "postedAt": "2026-09-15T08:06:58.000Z",
  "updatedAt": "2026-09-30T08:06:58.000Z",
  "jobUrl": "https://www.xing.com/jobs/hamburg-junior-performance-business-analyst-retail-157877372",
  "applyUrl": "https://www.mercuriurval.com/de-de/Opportunity/?jobadid=76640&refno=DE-24995&utm_source=xing.com",
  "descriptionText": "Als Unternehmen der Shell-Gruppe bietet die CARISSA eine end-to-end Dienstleistung für über 2.000 Shell Convenience Stores…",
  "descriptionHtml": "<p>Als Unternehmen der Shell-Gruppe bietet die CARISSA eine end-to-end Dienstleistung…",
  "salaryEstimate": null,
  "remoteOptions": ["onsite"],
  "seniorityLevel": "Entry Level",
  "industry": "Consulting",
  "city": "Hamburg",
  "state": "Freie und Hansestadt Hamburg",
  "postalCode": null,
  "country": "DE",
  "validThrough": "2026-11-14T08:07:02Z",
  "language": "de",
  "skills": ["supply", "chain", "management", "research", "marketing", "analyst", "marktforschung", "retail"],
  "summary": {
    "introduction": "CARISSA sucht einen Business / Performance Analyst in Hamburg. Das Unternehmen bietet end-to-end Dienstleistungen für Shell Convenience Stores in der DACH-Region.",
    "qualifications": ["Abgeschlossenes Studium mit kaufmännischem Bezug.", "Erste Berufserfahrung im Handelsumfeld.", "Praktische Erfahrung mit Python erforderlich."],
    "responsibilities": ["Erstellung von Reports zur Kategorieperformance.", "Einführung von Performance Indikatoren und Zielen.", "Analyse der Werttreiber im Shopgeschäft."]
  },
  "companyUrl": "https://www.xing.com/pages/mercuriurval",
  "companyLogo": "https://www.xing.com/imagecache/public/scaled_original_image/…",
  "companySize": "501-1,000 employees",
  "companyIndustry": "Consulting",
  "companyCity": "Hamburg",
  "scrapedAt": "2026-10-13T10:05:12.410Z"
}
```

## Use cases

- **Recruitment and staffing agencies**: see every new role in your field and region in Germany, Austria and Switzerland each morning, with pay and career level.
- **Job seekers**: new jobs for your role and city, with a salary figure for almost every job.
- **Salary research**: compare stated pay and Xing's estimates by role, city, career level and job type.
- **Sales and lead generation**: companies that hire are growing. Size, industry and the company's Xing page help to qualify them.
- **Labor market analytics**: track demand by occupation, career level, remote share and city in the DACH region.
- **AI agents**: give an agent one tool that searches jobs in the German-speaking countries.

## How much does it cost?

You pay only for the jobs you get: **$1 per 1,000 jobs**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.90 per 1,000 jobs on Starter, $0.80 on Scale and $0.70 on Business, which is the "from" price shown in Apify Store. There is no start fee. The same job found by two searches is saved once, and you do not pay for duplicates or for jobs filtered out by your settings. The Apify free plan covers about 5,000 jobs every month.

## Tips

- **Daily job alerts**: save your input as a task, turn on **Only new jobs since the last run** and add a schedule. Send new jobs to Slack, email or Google Sheets with Apify integrations.
- **Stricter results**: Xing's search also finds related jobs, so a search for `Data Analyst` lists business and BI analysts too, and the further down the list, the looser the match. Use **Title must contain** to keep only jobs with your words in the title.
- **More than 1,000 jobs**: Xing shows at most 1,000 jobs per search. For more, search city by city, or split by job type or career level.
- **Faster runs**: turn off **Include job descriptions**. You still get every other field, including the summary.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why not just ask an AI chatbot?** A chatbot with web search reads a few pages and retells them, so it finds a handful of jobs. In our test in October 2026, a chatbot asked for every nurse and dental assistant job in Adelaide listed about 10; our [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper), which shares this Actor's code, returned 1,480 from SEEK, Indeed, Glassdoor and LinkedIn in three minutes, each with its link and date. This Actor gives you every job the site shows for your search, word for word and in the same fields every time, so you can load them into a spreadsheet, database or CRM, get only new jobs on a schedule, and pay a fixed price per 1,000 jobs instead of paying an AI to read every page. AI agents use it the same way: through Apify's MCP server, an agent can call this Actor whenever it needs real job data.

**Why do some jobs have a salary estimate instead of a salary?** `salary` holds only pay the employer states. Where it states none, Xing shows its own estimate for the role and place; the Actor keeps it apart in `salaryEstimate`, so you always know which is which. **Only jobs with a salary** counts stated pay only.

**Can I search a whole country or state?** Xing searches by city, or everywhere at once. Leave the city empty to search all of Germany, Austria and Switzerland, or enter cities such as `Wien` or `Zürich` with a distance to cover a region.

**Why is the company sometimes missing details?** Xing links some jobs, often those of staffing agencies, to another company's page. The Actor then keeps the employer's name from the job and leaves out the other company's details instead of mixing them up.

**Does it collect recruiter contact details?** No. The contact section of Xing's job template is left out, and there are no fields for recruiters' names, emails or phone numbers.

**Is it legal to scrape Xing?** The Actor reads the public job listings Xing shows to every visitor, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Xing or New Work SE.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
