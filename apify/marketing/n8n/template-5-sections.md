# Template 5: text for each section of the n8n "Finalize your submission" form

Paste each block into the section with the same name. The screenshot link must be the first line of
**Quick overview** (n8n asks for it at the top of the description). If the field shows the Markdown
image as raw text or removes it, use the bare link instead:
https://raw.githubusercontent.com/robertkhairislamov-afk/saturway/claude/gifted-dirac-sv0ed6/apify/marketing/n8n/screenshots/hiring-signal-sales-leads.png

## Quick overview

![Workflow canvas](https://raw.githubusercontent.com/robertkhairislamov-afk/saturway/claude/gifted-dirac-sv0ed6/apify/marketing/n8n/screenshots/hiring-signal-sales-leads.png)

For sales and business development teams, agencies and founders who sell to companies that are growing a team. A company that starts hiring SDRs is building a sales team; one hiring a Head of Sales is about to buy tools and training for it. Every Monday this workflow finds such companies on LinkedIn, Indeed and Glassdoor, scores the hiring signal, and has AI research the best new or growing ones that match your ideal customer.

## How it works

1. The [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper) on Apify searches LinkedIn, Indeed and Glassdoor for jobs posted in the last 7 days in the roles you track and returns one row per hiring company: open jobs, jobs this week, teams, job titles, places, pay range, size, industry, website and the job sites it posts on. Staffing agencies and "Confidential" employers are left out.
2. **Score the companies** compares each company with your Google Sheet (NEW, GROWING, SLOWING or STEADY), checks your ideal customer (size, industry, jobs this week) and scores the hiring signal from 0 to 100: new jobs, growth since last week, posting on several job sites, senior roles such as "Head of Sales" and a matching industry. Companies you marked Customer, Not a fit, Lost or Do not contact are never offered again.
3. For the best hot leads, up to your weekly limit, the workflow reads the company's home page, and AI writes what the company does, the team being built, why now, an angle for your offer, who to contact (a job title, never a person's name) and an email opener. Facts come only from the data.
4. Every company is added or updated in the sheet by name. Your Status column and older AI notes are never overwritten.
5. One Slack message sums up the week: new, growing and slowing companies, then the hot leads, high priority and best score first. In a quiet week it says so. If the search fails, Slack gets an alert instead.

## Setup

1. Create a free Apify account and add your Apify credential to **Find hiring companies** (API token or OAuth). The Apify node is the verified community node `@apify/n8n-nodes-apify`.
2. Fill in **Your ideal customer**: what you sell, the roles your buyers hire (comma-separated), countries, an optional location, job sites, company size, industries and the limits.
3. Add an OpenAI credential to **OpenAI Chat Model**, or swap in Anthropic, Gemini or another chat model.
4. Create a Google Sheet and paste this header row into row 1, one column each: `Company, Score, Signal, Hot lead, Status, Priority, What they do, Team being built, Why now, Angle, Contact title, Opener, Open jobs, New this week, Previous open jobs, Fits ICP, Teams hiring, Senior roles, Job titles, Locations, Pay range, Job sites, Size, Industry, Revenue, Rating, Website, Company page, Example job, Latest posting, First seen, Updated`. Select the sheet in **Read saved leads** and **Save leads**.
5. Connect Slack and pick a channel in **Post to Slack** and **Alert: search failed**, then activate the workflow.

## Requirements

- An Apify account. The free plan includes $5 of usage a month; the scraper costs $1 per 1,000 companies in this mode, so 300 companies a week cost about $0.30.
- An OpenAI API key or another chat model. AI runs only on hot leads, 15 a week by default.
- A Google account for Google Sheets and a Slack workspace.

## Customization

- Track any team: "data engineer" for data tools, "registered nurse" for healthcare staffing, "warehouse associate" for logistics software.
- Other countries and job sites: `countries` takes codes such as US, GB, DE, AU; leave `jobSites` empty to use every site that covers them (SEEK, StepStone, Reed and more).
- Change the score or what counts as a hot lead in **Score the companies** and **Your ideal customer** (`minScore`, `maxAiLeadsPerWeek`).
- Send hot leads to HubSpot, Pipedrive or a lemlist campaign instead of Slack.

## Additional info

Tested in n8n 2.42.7 with the Apify node 0.7.0 against live data (sales roles, US, LinkedIn + Indeed + Glassdoor): 300 hiring companies, 15 hot leads, 12 of 15 home pages read, every company saved and one Slack summary. Without an AI key, leads are still saved and marked "AI step failed"; a failed search posts a Slack alert. The canvas preview may not render because the workflow uses the Apify community node, so here is a screenshot of the whole canvas: https://raw.githubusercontent.com/robertkhairislamov-afk/saturway/claude/gifted-dirac-sv0ed6/apify/marketing/n8n/screenshots/hiring-signal-sales-leads.png
