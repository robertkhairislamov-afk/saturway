// Store metadata and input schema of the job Actors. They share one code base and one output
// format; only the texts, examples and a few inputs differ. Dice and Welcome to the Jungle search a
// job board instead of company boards, so they have their own search forms.

import { CLASSIFICATIONS, WORK_ARRANGEMENTS, WORK_TYPES } from '../src/adapters/seek.js';
import * as indeed from '../src/adapters/indeed.js';
import * as infojobs from '../src/adapters/infojobs.js';
import * as linkedin from '../src/adapters/linkedin.js';
import * as multi from '../src/adapters/multi.js';
import * as reed from '../src/adapters/reed.js';
import * as stepstone from '../src/adapters/stepstone.js';

export const ACTORS = {
  greenhouse: {
    name: 'greenhouse-jobs-scraper',
    title: 'Greenhouse Jobs Scraper',
    tagline: 'every job of any company on Greenhouse, with salary ranges',
    apiExample: { companies: ['airbnb'], maxItems: 20 },
    description: 'Scrape all open jobs of any company on Greenhouse: title, department, locations, salary range, description and apply link. Keyword, location, remote and date filters, and an only-new mode for monitoring.',
    seoTitle: 'Greenhouse Jobs Scraper – Job Listings & Salaries',
    seoDescription: 'Scrape jobs from any Greenhouse job board: title, department, location, salary range, description and apply link. Filters and alerts. $1 per 1,000 jobs.',
    companies: {
      title: 'Companies (Greenhouse boards)',
      description: 'Greenhouse job boards to scrape. Enter the board name, for example <code>airbnb</code>, or paste a link such as <code>https://job-boards.greenhouse.io/figma</code> or <code>https://boards.greenhouse.io/stripe</code>. The board name is the part of the link after <code>greenhouse.io/</code>.',
      prefill: ['airbnb', 'https://job-boards.greenhouse.io/figma'],
      placeholder: 'stripe',
    },
  },
  lever: {
    name: 'lever-jobs-scraper',
    title: 'Lever Jobs Scraper',
    tagline: 'every job of any company on Lever, including EU sites',
    apiExample: { companies: ['zoox'], maxItems: 20 },
    description: 'Scrape all open jobs of any company on Lever: title, team, locations, salary range, workplace type, description and apply link. Keyword, location, remote and date filters, and an only-new mode for monitoring.',
    seoTitle: 'Lever Jobs Scraper – Job Listings & Salaries',
    seoDescription: 'Scrape jobs from any company on jobs.lever.co: title, team, location, salary range, description and apply link. Filters and alerts. $1 per 1,000 jobs.',
    companies: {
      title: 'Companies (Lever job sites)',
      description: 'Lever job sites to scrape. Enter the company name from the link, for example <code>zoox</code>, or paste a link such as <code>https://jobs.lever.co/palantir</code>. EU sites (<code>jobs.eu.lever.co</code>) work too.',
      prefill: ['zoox', 'https://jobs.lever.co/palantir'],
      placeholder: 'spotify',
    },
  },
  ashby: {
    name: 'ashby-jobs-scraper',
    title: 'Ashby Jobs Scraper',
    tagline: 'startup jobs from Ashby job boards, with compensation',
    apiExample: { companies: ['ramp'], maxItems: 20 },
    description: 'Scrape all open jobs of any company on Ashby: title, department, locations, compensation, workplace type, description and apply link. Keyword, location, remote and date filters, and an only-new mode for monitoring.',
    seoTitle: 'Ashby Jobs Scraper – Job Listings & Compensation',
    seoDescription: 'Scrape jobs from any Ashby job board: title, department, locations, compensation, description and apply link. Filters and alerts. $1 per 1,000 jobs.',
    companies: {
      title: 'Companies (Ashby job boards)',
      description: 'Ashby job boards to scrape. Enter the board name from the link, for example <code>ramp</code>, or paste a link such as <code>https://jobs.ashbyhq.com/notion</code>.',
      prefill: ['ramp', 'https://jobs.ashbyhq.com/notion'],
      placeholder: 'openai',
    },
  },
  workday: {
    name: 'workday-jobs-scraper',
    title: 'Workday Jobs Scraper',
    tagline: 'every job from any Workday career site, past the 2,000 search limit',
    apiExample: { companies: ['https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite'], maxItems: 20 },
    description: 'Scrape jobs from any Workday career site (myworkdayjobs.com): title, locations, dates, salary from the description, full text and apply link. Gets every job, even beyond the 2,000 Workday shows per search.',
    seoTitle: 'Workday Jobs Scraper – All Jobs from Any Career Site',
    seoDescription: 'Scrape every job from any Workday career site, even past the 2,000 search limit: title, locations, dates, salary, description. $1 per 1,000 jobs.',
    companies: {
      title: 'Career sites (Workday links)',
      description: 'Links to Workday job search pages, for example <code>https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite</code>. Open the company\'s careers page, click through to the job list and copy the address from your browser. Filters you selected on the page (category, location) are kept.',
      prefill: ['https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite'],
      placeholder: 'https://company.wd5.myworkdayjobs.com/External',
    },
    keywordsNote: ' Each keyword is also searched on the career site itself, so big sites are read faster.',
    prefill: { keywords: ['engineer'], maxItems: 50 },
    noDepartments: true,
  },
  dice: {
    name: 'dice-jobs-scraper',
    title: 'Dice Jobs Scraper',
    tagline: 'US tech jobs from Dice.com, with skills and salaries',
    apiExample: { searchQueries: ['python developer'], maxItems: 20 },
    description: 'Scrape US tech jobs from Dice.com: title, company, location, salary, skills, full description, dates and apply link. All Dice filters, over 750 results per search, and an only-new mode for alerts.',
    seoTitle: 'Dice Jobs Scraper – Extract Job Listings & Salaries',
    seoDescription: 'Scrape Dice.com jobs by keyword and location: title, company, salary, skills, description, posting date and link. All Dice filters. $0.50 per 1,000 jobs.',
  },
  wttj: {
    name: 'welcome-to-the-jungle-jobs-scraper',
    title: 'Welcome to the Jungle Jobs Scraper',
    tagline: 'startup jobs in France, Europe, the UK and the US',
    apiExample: { searchQueries: ['python developer'], countries: ['FR'], maxItems: 20 },
    description: 'Scrape Welcome to the Jungle jobs in France, Europe, the UK and the US by keyword or company: title, company, salary, remote policy, skills, tools, description and apply link. Filters and alerts.',
    seoTitle: 'Welcome to the Jungle Jobs Scraper – Jobs & Salaries',
    seoDescription: 'Scrape Welcome to the Jungle jobs by keyword, country or company: title, company, salary, remote, skills, description. JSON, CSV. $0.50 per 1,000 jobs.',
  },
  seek: {
    name: 'seek-jobs-scraper',
    title: 'SEEK Jobs Scraper',
    tagline: 'jobs in Australia and New Zealand, with salaries as numbers',
    apiExample: { searchQueries: ['registered nurse'], location: 'Sydney NSW', maxItems: 20 },
    description: 'Scrape SEEK jobs in Australia and New Zealand by keyword and location: title, company, salary, work type, classification, full description and apply link. All SEEK filters and alerts.',
    seoTitle: 'SEEK Jobs Scraper – Australia & NZ Jobs and Salaries',
    seoDescription: 'Scrape seek.com.au and seek.co.nz jobs by keyword and location: title, company, salary, work type, description. All filters. $0.50 per 1,000 jobs.',
  },
  stepstone: {
    name: 'stepstone-jobs-scraper',
    title: 'StepStone Jobs Scraper',
    tagline: 'jobs in Germany, with benefits and English-language jobs',
    apiExample: { searchQueries: ['data analyst'], location: 'Berlin', maxItems: 20 },
    description: 'Scrape StepStone.de jobs in Germany by keyword and city: title, company, location, remote, contract type, full description, benefits, industry and apply link. All StepStone filters and alerts.',
    seoTitle: 'StepStone Jobs Scraper – Germany Job Listings',
    seoDescription: 'Scrape StepStone.de jobs by keyword and city: title, company, location, remote, contract type, benefits and full description. $0.50 per 1,000 jobs.',
  },
  jobstreet: {
    name: 'jobstreet-jobs-scraper',
    title: 'Jobstreet Jobs Scraper',
    tagline: 'jobs in Malaysia, Singapore, the Philippines and Indonesia, with salaries as numbers',
    apiExample: { searchQueries: ['software engineer'], country: 'MY', maxItems: 20 },
    description: 'Scrape Jobstreet jobs in Malaysia, Singapore, the Philippines and Indonesia by keyword and location: title, company, salary as numbers, work type, full description and apply link. Filters and alerts.',
    seoTitle: 'Jobstreet Jobs Scraper – Malaysia, Singapore, PH, ID',
    seoDescription: 'Scrape Jobstreet jobs in Malaysia, Singapore, the Philippines and Indonesia: title, company, salary, work type, description. $0.50 per 1,000 jobs.',
  },
  jobsdb: {
    name: 'jobsdb-jobs-scraper',
    title: 'JobsDB Jobs Scraper',
    tagline: 'jobs in Hong Kong and Thailand, with salaries as numbers',
    apiExample: { searchQueries: ['accountant'], country: 'HK', maxItems: 20 },
    description: 'Scrape JobsDB jobs in Hong Kong and Thailand by keyword and location: title, company, salary as numbers, work type, classification, full description and apply link. Filters and alerts.',
    seoTitle: 'JobsDB Jobs Scraper – Hong Kong & Thailand Jobs',
    seoDescription: 'Scrape JobsDB jobs in Hong Kong and Thailand by keyword and location: title, company, salary, work type and full description. $0.50 per 1,000 jobs.',
  },
  reed: {
    name: 'reed-jobs-scraper',
    title: 'Reed Jobs Scraper',
    tagline: 'UK jobs from Reed.co.uk, with salaries, contract type and hybrid or remote',
    apiExample: { searchQueries: ['data analyst'], location: 'London', maxItems: 20 },
    description: 'Scrape Reed.co.uk jobs in the UK by keyword and location: title, company, salary as numbers, contract type, hours, hybrid or remote, sector, full description and apply link. All Reed filters and alerts.',
    seoTitle: 'Reed Jobs Scraper – UK Job Listings & Salaries',
    seoDescription: 'Scrape Reed.co.uk jobs by keyword and location: title, company, salary, contract type, hybrid or remote, full description. $1 per 1,000 jobs.',
  },
  infojobs: {
    name: 'infojobs-jobs-scraper',
    title: 'InfoJobs Jobs Scraper',
    tagline: 'jobs in Spain from InfoJobs.net, with salaries and remote policy',
    apiExample: { searchQueries: ['python'], provinces: ['33'], maxItems: 20 },
    description: 'Scrape InfoJobs.net jobs in Spain by keyword and province: title, company, salary as numbers, contract type, working hours, remote policy, full description and apply link. All InfoJobs filters and alerts.',
    seoTitle: 'InfoJobs Scraper – Spain Job Listings & Salaries',
    seoDescription: 'Scrape InfoJobs.net jobs in Spain by keyword and province: title, company, salary, contract, remote or hybrid, full description. $2 per 1,000 jobs.',
  },
  linkedin: {
    name: 'linkedin-jobs-scraper',
    title: 'LinkedIn Jobs Scraper',
    tagline: 'public LinkedIn job listings without login, with full job details',
    apiExample: { searchQueries: ['data analyst'], location: 'United States', maxItems: 20 },
    description: 'Scrape public LinkedIn job listings by keyword and location, without login or cookies: title, company, seniority, employment type, applicants, salary, full description and apply link. Filters and alerts.',
    seoTitle: 'LinkedIn Jobs Scraper – No Login, Full Job Details',
    seoDescription: 'Scrape LinkedIn jobs by keyword and location without login: title, company, seniority, applicants, salary, full description. $0.50 per 1,000 jobs.',
  },
  indeed: {
    name: 'indeed-jobs-scraper',
    title: 'Indeed Jobs Scraper',
    tagline: 'Indeed jobs in 62 countries, with salaries, job types, benefits and company details',
    apiExample: { searchQueries: ['data analyst'], country: 'US', location: 'Austin, TX', maxItems: 20 },
    description: 'Scrape Indeed jobs in 62 countries by keyword and location: title, company, salary as numbers, job type, remote or hybrid, experience level, benefits, company size, full description and apply link. Past the 1,000-job limit.',
    seoTitle: 'Indeed Jobs Scraper – Salaries, 62 Countries',
    seoDescription: 'Scrape Indeed jobs in 62 countries by keyword and location: title, company, salary, job type, remote, benefits, full description. $1 per 1,000 jobs.',
  },
  multi: {
    name: 'all-in-one-jobs-scraper',
    title: 'All-in-One Jobs Scraper',
    tagline: 'LinkedIn, Indeed and all of these job sites and career sites in one search, without duplicates',
    apiExample: { searchQueries: ['data analyst'], countries: ['US', 'DE', 'AU'], maxItems: 30 },
    description: 'Search LinkedIn, Indeed and 12 more job sites at once by keyword and country: Dice, Welcome to the Jungle, StepStone, SEEK, Jobstreet, JobsDB, Reed, InfoJobs and Greenhouse, Lever, Ashby and Workday career sites. One format, no duplicates.',
    seoTitle: 'All-in-One Jobs Scraper – LinkedIn, Indeed & 12 More',
    seoDescription: 'Search LinkedIn, Indeed, Dice, StepStone, SEEK, Reed, InfoJobs, Jobstreet, JobsDB and career sites at once. One format, no duplicates. $1 per 1,000 jobs.',
  },
};

export const CATEGORIES = ['JOBS', 'LEAD_GENERATION', 'AUTOMATION'];

const STORE_URL = 'https://apify.com/robertosan16';

// How to use an Actor from other tools: no-code platforms, webhooks, AI agents and the API.
export function integrationsSection(ats) {
  const actor = ACTORS[ats];
  const path = `robertosan16/${actor.name}`;
  return [
    '## Integrations and API',
    '',
    '- **Google Sheets, Slack, email and CRMs**: connect the Actor to Make, Zapier or n8n, or use the **Integrations** tab of this Actor. With **Only new jobs since the last run** and a schedule, each run sends only the new jobs.',
    '- **Webhooks**: call your own URL when a run finishes, for example to load the new jobs into your database.',
    `- **AI agents (MCP)**: add \`https://mcp.apify.com?tools=${path}\` as an MCP server in Claude, Cursor or VS Code, and your agent can search jobs with this Actor. Tell it how many jobs you need, so it sets **Maximum jobs in total**.`,
    '- **LangChain and LlamaIndex**: load the jobs into your LLM app with the Apify loaders.',
    '- **API**: one request runs the Actor and returns the jobs, for runs of up to 5 minutes. Start longer runs with the `runs` endpoint and read the dataset when they finish.',
    '',
    '```bash',
    `curl -X POST "https://api.apify.com/v2/acts/${path.replace('/', '~')}/run-sync-get-dataset-items?token=YOUR_API_TOKEN" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '${JSON.stringify(actor.apiExample)}'`,
    '```',
    '',
  ].join('\n');
}

// The other job scrapers, listed at the end of every README: they all share one output format.
export function familySection(ats) {
  const others = Object.entries(ACTORS).filter(([key]) => key !== ats);
  return [
    '## More job scrapers with the same output',
    '',
    ...others.map(([, actor]) => `- [${actor.title}](${STORE_URL}/${actor.name}): ${actor.tagline}`),
    '',
  ].join('\n');
}

export function inputSchema(ats) {
  if (ats === 'dice') return diceInputSchema();
  if (ats === 'wttj') return wttjInputSchema();
  if (ats === 'seek' || ats === 'jobstreet' || ats === 'jobsdb') return seekInputSchema(ats);
  if (ats === 'stepstone') return stepstoneInputSchema();
  if (ats === 'linkedin') return linkedinInputSchema();
  if (ats === 'reed') return reedInputSchema();
  if (ats === 'infojobs') return infojobsInputSchema();
  if (ats === 'indeed') return indeedInputSchema();
  if (ats === 'multi') return multiInputSchema();
  const actor = ACTORS[ats];
  const properties = {
    companies: {
      title: actor.companies.title,
      type: 'array',
      editor: 'stringList',
      description: actor.companies.description,
      prefill: actor.companies.prefill,
      placeholderValue: actor.companies.placeholder,
    },
    keywords: {
      title: 'Title keywords',
      type: 'array',
      editor: 'stringList',
      sectionCaption: 'Filters',
      sectionDescription: 'All filters are optional. Without filters, every open job is saved.',
      description: `Keep jobs whose title contains any of these words or phrases, for example <code>engineer</code> or <code>product manager</code>. Common word endings are included: <code>engineer</code> also finds "Engineering". Add <code>*</code> for any ending: <code>data*</code>.${actor.keywordsNote ?? ''}`,
      ...(actor.prefill?.keywords ? { prefill: actor.prefill.keywords } : {}),
    },
    excludeKeywords: {
      title: 'Exclude title keywords',
      type: 'array',
      editor: 'stringList',
      description: 'Skip jobs whose title contains any of these, for example <code>intern</code> or <code>senior</code>.',
    },
    locations: {
      title: 'Locations',
      type: 'array',
      editor: 'stringList',
      description: 'Keep jobs in any of these places, for example <code>London</code>, <code>Germany</code> or <code>CA</code>. Whole words are matched, so <code>CA</code> does not match "Canada". <code>Remote</code> also keeps remote jobs.',
    },
    remoteOnly: {
      title: 'Remote jobs only',
      type: 'boolean',
      default: false,
      description: 'Keep only jobs marked as remote or with "Remote" in a location.',
    },
    ...(actor.noDepartments ? {} : {
      departments: {
        title: 'Departments or teams',
        type: 'array',
        editor: 'stringList',
        description: 'Keep jobs whose department or team contains any of these words, for example <code>Engineering</code> or <code>Sales</code>.',
      },
    }),
    postedWithinDays: {
      title: 'Posted in the last days',
      type: 'integer',
      minimum: 0,
      unit: 'days',
      description: 'Keep jobs published in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
    },
    onlyWithSalary: {
      title: 'Only jobs with a salary',
      type: 'boolean',
      default: false,
      description: 'Keep only jobs with a pay range, from the job board or found in the description.',
    },
    onlyNew: {
      title: 'Only new jobs since the last run',
      type: 'boolean',
      default: false,
      sectionCaption: 'Monitoring and limits',
      description: 'For scheduled runs: save only jobs that were not seen in earlier runs of the same saved task. The first run saves all current jobs and remembers them. Jobs that did not match your filters are remembered too.',
    },
    includeDescription: {
      title: 'Include job descriptions',
      type: 'boolean',
      default: true,
      description: 'Save the full job description as plain text and HTML. Turn off for smaller results.',
    },
    maxItems: {
      title: 'Maximum jobs in total',
      type: 'integer',
      minimum: 0,
      description: 'Stop after saving this many jobs. Leave empty or 0 for no limit. The example is kept small so the first run takes seconds.',
      prefill: actor.prefill?.maxItems ?? 50,
    },
    maxItemsPerCompany: {
      title: 'Maximum jobs per company',
      type: 'integer',
      minimum: 0,
      description: 'Save at most this many jobs from each company. Leave empty or 0 for no limit.',
    },
    proxyConfiguration: {
      title: 'Proxy configuration',
      type: 'object',
      editor: 'proxy',
      sectionCaption: 'Advanced',
      description: 'Not needed in most cases: the job board APIs are public. Turn on Apify Proxy if a site limits your requests.',
      prefill: { useApifyProxy: false },
      default: { useApifyProxy: false },
    },
  };
  return {
    title: actor.title,
    description: `Collect jobs from ${actor.title.replace(' Jobs Scraper', '')} company job boards in one clean format.`,
    type: 'object',
    schemaVersion: 1,
    properties,
  };
}

// Settings shared by every job Actor: result filters, monitoring, limits and proxy.
const commonSettings = ({ proxyDescription, site, perSource = 'search', details = 'the full description (text and HTML), skills and expiry date' }) => ({
  excludeKeywords: {
    title: 'Exclude title keywords',
    type: 'array',
    editor: 'stringList',
    sectionCaption: 'More filters',
    description: 'Skip jobs whose title contains any of these, for example <code>intern</code> or <code>senior</code>. Common word endings are included.',
  },
  keywords: {
    title: 'Title must contain',
    type: 'array',
    editor: 'stringList',
    description: `Keep only jobs whose title contains any of these words or phrases. ${site} searches descriptions too, so this makes results stricter. Add <code>*</code> for any ending: <code>data*</code>.`,
  },
  onlyWithSalary: {
    title: 'Only jobs with a salary',
    type: 'boolean',
    default: false,
    description: 'Keep only jobs that state a pay range or rate.',
  },
  onlyNew: {
    title: 'Only new jobs since the last run',
    type: 'boolean',
    default: false,
    sectionCaption: 'Monitoring and limits',
    description: 'For scheduled runs: save only jobs that were not seen in earlier runs of the same saved task. The first run saves all current jobs and remembers them. Jobs that did not match your filters are remembered too.',
  },
  includeDescription: {
    title: 'Load full job details',
    type: 'boolean',
    default: true,
    description: `Open each job page for ${details}. Turn off for fast results with a short summary instead.`,
  },
  maxItems: {
    title: 'Maximum jobs in total',
    type: 'integer',
    minimum: 0,
    description: 'Stop after saving this many jobs. Leave empty or 0 for no limit. The example is kept small so the first run takes seconds.',
    prefill: 50,
  },
  maxItemsPerCompany: {
    title: `Maximum jobs per ${perSource}`,
    type: 'integer',
    minimum: 0,
    description: `Save at most this many jobs from each ${perSource}. Leave empty or 0 for no limit.`,
  },
  proxyConfiguration: {
    title: 'Proxy configuration',
    type: 'object',
    editor: 'proxy',
    sectionCaption: 'Advanced',
    description: proxyDescription,
    prefill: { useApifyProxy: false },
    default: { useApifyProxy: false },
  },
});

function diceInputSchema() {
  return {
    title: ACTORS.dice.title,
    description: 'Search Dice.com like on the website and get every matching job in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Search keywords or Dice links',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>python developer</code> or <code>data engineer</code>. Each line is a separate search with the filters below. You can also paste a dice.com search link; its own filters are used.',
        prefill: ['python developer'],
        placeholderValue: 'java developer',
      },
      location: {
        title: 'Location',
        type: 'string',
        editor: 'textfield',
        description: 'City, state or ZIP code, for example <code>New York, NY</code> or <code>Austin, TX</code>. Leave empty to search the whole US.',
      },
      radius: {
        title: 'Distance',
        type: 'integer',
        minimum: 0,
        maximum: 200,
        unit: 'miles',
        description: 'Search radius around the location. Leave empty for the Dice default.',
      },
      workplaceTypes: {
        title: 'Workplace',
        type: 'array',
        editor: 'select',
        sectionCaption: 'Dice filters',
        description: 'Leave empty for all.',
        items: { type: 'string', enum: ['Remote', 'Hybrid', 'On-Site'], enumTitles: ['Remote', 'Hybrid', 'On-site'] },
      },
      employmentTypes: {
        title: 'Employment type',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: { type: 'string', enum: ['FULLTIME', 'PARTTIME', 'CONTRACTS', 'THIRD_PARTY'], enumTitles: ['Full-time', 'Part-time', 'Contract', 'Third party'] },
      },
      postedDate: {
        title: 'Posted',
        type: 'string',
        editor: 'select',
        description: 'How recent the jobs are.',
        enum: ['ANY', 'ONE', 'THREE', 'SEVEN'],
        enumTitles: ['Any time', 'Today', 'Last 3 days', 'Last 7 days'],
        default: 'ANY',
      },
      employerTypes: {
        title: 'Employer type',
        type: 'array',
        editor: 'select',
        description: 'Direct employers, recruiters or both. Leave empty for all.',
        items: { type: 'string', enum: ['Direct Hire', 'Recruiter', 'Other'], enumTitles: ['Direct hire', 'Recruiter', 'Other'] },
      },
      easyApply: {
        title: 'Easy Apply only',
        type: 'boolean',
        default: false,
        description: 'Only jobs you can apply to directly on Dice.',
      },
      willingToSponsor: {
        title: 'Visa sponsorship only',
        type: 'boolean',
        default: false,
        description: 'Only jobs whose employer is willing to sponsor a work visa.',
      },
      ...commonSettings({
        site: 'Dice',
        proxyDescription: 'The Actor connects directly, which is fastest. If Dice starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
      }),
    },
  };
}

function wttjInputSchema() {
  return {
    title: ACTORS.wttj.title,
    description: 'Search Welcome to the Jungle by keyword or list all jobs of companies, in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>product manager</code> or <code>développeur python</code>. Each line is a separate search with the filters below.',
        prefill: ['python developer'],
        placeholderValue: 'data analyst',
      },
      companies: {
        title: 'Companies',
        type: 'array',
        editor: 'stringList',
        description: 'Companies whose jobs you want, all of them: the name from the company link, such as <code>doctolib</code>, or a link like <code>https://www.welcometothejungle.com/en/companies/doctolib</code>. The filters below apply too.',
        placeholderValue: 'doctolib',
      },
      countries: {
        title: 'Countries',
        type: 'array',
        editor: 'stringList',
        sectionCaption: 'Filters',
        description: 'Two-letter country codes, for example <code>FR</code>, <code>BE</code>, <code>ES</code>, <code>DE</code> or <code>GB</code>. Leave empty for all countries.',
      },
      contractTypes: {
        title: 'Contract type',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: {
          type: 'string',
          enum: ['full_time', 'part_time', 'internship', 'apprenticeship', 'freelance', 'temporary', 'vie', 'graduate_program', 'volunteer', 'other'],
          enumTitles: ['Permanent / full-time', 'Part-time', 'Internship', 'Apprenticeship (alternance)', 'Freelance', 'Temporary (CDD)', 'VIE', 'Graduate program', 'Volunteer', 'Other'],
        },
      },
      experienceLevels: {
        title: 'Experience',
        type: 'array',
        editor: 'select',
        description: 'Years of experience asked for. Leave empty for all.',
        items: {
          type: 'string',
          enum: ['zero_to_one', 'one_to_three', 'three_to_five', 'five_to_ten', 'more_than_ten'],
          enumTitles: ['Less than 1 year', '1 to 3 years', '3 to 5 years', '5 to 10 years', 'More than 10 years'],
        },
      },
      remoteTypes: {
        title: 'Remote policy',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: { type: 'string', enum: ['fulltime', 'partial', 'punctual', 'no'], enumTitles: ['Full remote', 'Hybrid', 'Occasional remote', 'No remote'] },
      },
      minSalary: {
        title: 'Minimum yearly salary',
        type: 'integer',
        minimum: 0,
        description: 'Keep jobs whose salary reaches this amount per year, in the job\'s currency (usually EUR). Monthly pay counts twelve times. Jobs without a salary are left out.',
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs published in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      ...commonSettings({
        site: 'Welcome to the Jungle',
        perSource: 'search or company',
        proxyDescription: 'The Actor connects directly, which is fastest. If Welcome to the Jungle starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
      }),
    },
  };
}

// Select options from a map of SEEK ids to names, sorted by name.
const optionsOf = (map) => {
  const entries = Object.entries(map).sort(([, a], [, b]) => a.localeCompare(b));
  return { enum: entries.map(([id]) => id), enumTitles: entries.map(([, label]) => label) };
};

// SEEK, Jobstreet and JobsDB share one platform and one form; these texts differ.
const SEEK_FORMS = {
  seek: {
    countries: { AU: 'Australia (seek.com.au)', NZ: 'New Zealand (seek.co.nz)' },
    where: 'Australia or New Zealand',
    currencies: 'AUD or NZD',
    places: '<code>Sydney NSW</code>, <code>All Melbourne VIC</code>, <code>Queensland QLD</code> or <code>Auckland</code>',
    links: 'seek.com.au or seek.co.nz',
    queries: '<code>python developer</code> or <code>registered nurse</code>',
    prefill: ['python developer'],
    salaryType: 'annual',
  },
  jobstreet: {
    countries: { MY: 'Malaysia (my.jobstreet.com)', SG: 'Singapore (sg.jobstreet.com)', PH: 'Philippines (ph.jobstreet.com)', ID: 'Indonesia (id.jobstreet.com)' },
    where: 'Malaysia, Singapore, the Philippines or Indonesia',
    currencies: 'MYR, SGD, PHP or IDR',
    places: '<code>Kuala Lumpur</code>, <code>Penang</code>, <code>Makati City</code> or <code>Jakarta Raya</code>',
    links: 'Jobstreet',
    queries: '<code>software engineer</code> or <code>accountant</code>',
    prefill: ['software engineer'],
    salaryType: 'monthly',
  },
  jobsdb: {
    countries: { HK: 'Hong Kong (hk.jobsdb.com)', TH: 'Thailand (th.jobsdb.com)' },
    where: 'Hong Kong or Thailand',
    currencies: 'HKD or THB',
    places: '<code>Kowloon</code>, <code>Hong Kong Island</code> or <code>Bangkok</code>',
    links: 'hk.jobsdb.com or th.jobsdb.com',
    queries: '<code>software engineer</code> or <code>accountant</code>',
    prefill: ['software engineer'],
    salaryType: 'monthly',
  },
};

function seekInputSchema(ats) {
  const form = SEEK_FORMS[ats];
  const site = ACTORS[ats].title.replace(/ Jobs Scraper$/, '');
  return {
    title: ACTORS[ats].title,
    description: `Search ${site} in ${form.where} with the site's own filters and get every matching job in one clean format.`,
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: `What to search, for example ${form.queries}. Each line is a separate search with the filters below. You can also paste links of searches from ${form.links}.`,
        prefill: form.prefill,
        placeholderValue: 'data analyst',
      },
      country: {
        title: 'Country',
        type: 'string',
        editor: 'select',
        enum: Object.keys(form.countries),
        enumTitles: Object.values(form.countries),
        default: Object.keys(form.countries)[0],
        description: `The ${site} site to search. Salaries come in its currency, ${form.currencies}.`,
      },
      location: {
        title: 'Location',
        type: 'string',
        editor: 'textfield',
        description: `A suburb, city, region or state as on ${site}, for example ${form.places}. Leave empty for the whole country.`,
      },
      classifications: {
        title: 'Classifications',
        type: 'array',
        editor: 'select',
        sectionCaption: `${site} filters`,
        description: 'Job categories as on SEEK. Leave empty for all.',
        items: { type: 'string', ...optionsOf(CLASSIFICATIONS) },
      },
      workTypes: {
        title: 'Work type',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: { type: 'string', enum: Object.keys(WORK_TYPES), enumTitles: Object.values(WORK_TYPES) },
      },
      workArrangements: {
        title: 'Work arrangement',
        type: 'array',
        editor: 'select',
        description: 'On-site, hybrid or remote. Leave empty for all.',
        items: { type: 'string', enum: Object.keys(WORK_ARRANGEMENTS), enumTitles: Object.values(WORK_ARRANGEMENTS) },
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs listed in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      minSalary: {
        title: 'Minimum salary',
        type: 'integer',
        minimum: 0,
        description: `Keep jobs paying at least this much, in ${form.currencies}, per the salary type below. ${site} applies it to the pay range the employer set, even when the ad does not show it.`,
      },
      salaryType: {
        title: 'Salary type',
        type: 'string',
        editor: 'select',
        enum: ['annual', 'monthly', 'hourly'],
        enumTitles: ['Per year', 'Per month', 'Per hour'],
        default: form.salaryType,
        description: 'What the minimum salary above means.',
      },
      sortBy: {
        title: 'Sort by',
        type: 'string',
        editor: 'select',
        enum: ['ListedDate', 'KeywordRelevance'],
        enumTitles: ['Newest first', 'Relevance'],
        default: 'ListedDate',
        description: 'Newest first suits job alerts. Links you paste keep their own order.',
      },
      ...commonSettings({
        site,
        details: 'the full description (text and HTML), expiry date and company industry, size and website',
        proxyDescription: `The Actor connects directly, which is fastest. If ${site} starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.`,
      }),
    },
  };
}

const selectOf = (map) => ({ type: 'string', enum: Object.keys(map), enumTitles: Object.values(map) });

function stepstoneInputSchema() {
  return {
    title: ACTORS.stepstone.title,
    description: 'Search StepStone.de like on the website and get every matching job in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>Softwareentwickler</code>, <code>data analyst</code> or <code>Pflege</code>. Each line is a separate search with the filters below. You can also paste links of searches from stepstone.de.',
        prefill: ['python developer'],
        placeholderValue: 'data analyst',
      },
      location: {
        title: 'Location',
        type: 'string',
        editor: 'textfield',
        description: 'A city or region, for example <code>Berlin</code>, <code>München</code> or <code>Frankfurt am Main</code>. Leave empty for all of Germany.',
      },
      radius: {
        title: 'Distance around the location',
        type: 'integer',
        minimum: 0,
        unit: 'km',
        description: 'Also find jobs this far from the location, for example 30.',
      },
      contractTypes: {
        title: 'Contract type',
        type: 'array',
        editor: 'select',
        sectionCaption: 'StepStone filters',
        description: 'Leave empty for all.',
        items: selectOf(stepstone.CONTRACT_TYPES),
      },
      workTypes: {
        title: 'Working hours',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: selectOf(stepstone.WORK_TYPES),
      },
      remoteTypes: {
        title: 'Home office',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all jobs, including on-site ones.',
        items: selectOf(stepstone.REMOTE_TYPES),
      },
      experience: {
        title: 'Experience',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: selectOf(stepstone.EXPERIENCE),
      },
      languages: {
        title: 'Job ad language',
        type: 'array',
        editor: 'select',
        description: 'Only jobs written in these languages. Pick English for jobs where English is enough.',
        items: selectOf(stepstone.LANGUAGES),
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs published in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      sortBy: {
        title: 'Sort by',
        type: 'string',
        editor: 'select',
        enum: ['date', 'relevance'],
        enumTitles: ['Newest first', 'Relevance'],
        default: 'date',
        description: 'Newest first suits job alerts. Links you paste keep their own order.',
      },
      ...commonSettings({
        site: 'StepStone',
        details: 'the full description (text and HTML), employment type, industry and expiry date',
        proxyDescription: 'The Actor connects directly, which is fastest. If StepStone starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
      }),
    },
  };
}

function reedInputSchema() {
  return {
    title: ACTORS.reed.title,
    description: 'Search Reed.co.uk like on the website and get every matching UK job in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>data analyst</code> or <code>care assistant</code>. Each line is a separate search with the filters below. You can also paste links of searches from reed.co.uk.',
        prefill: ['python developer'],
        placeholderValue: 'data analyst',
      },
      location: {
        title: 'Location',
        type: 'string',
        editor: 'textfield',
        description: 'A town, city, county or postcode, for example <code>London</code>, <code>Greater Manchester</code> or <code>LS1</code>. Leave empty for the whole UK.',
        prefill: 'London',
      },
      distance: {
        title: 'Distance around the location',
        type: 'integer',
        minimum: 0,
        unit: 'miles',
        description: 'Also find jobs this far from the location. Reed uses 10 miles when this is empty.',
      },
      minSalary: {
        title: 'Minimum salary per year',
        type: 'integer',
        minimum: 0,
        sectionCaption: 'Reed filters',
        description: 'In GBP, for example 40000. Reed also compares daily and hourly rates as yearly pay.',
      },
      maxSalary: {
        title: 'Maximum salary per year',
        type: 'integer',
        minimum: 0,
        description: 'In GBP. Leave empty for no maximum.',
      },
      jobTypes: {
        title: 'Job type',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: selectOf(reed.JOB_TYPES),
      },
      hours: {
        title: 'Working hours',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: selectOf(reed.HOURS),
      },
      employerTypes: {
        title: 'Posted by',
        type: 'array',
        editor: 'select',
        description: 'Direct employers, recruitment agencies or both. Leave empty for all.',
        items: selectOf(reed.EMPLOYERS),
      },
      graduate: {
        title: 'Graduate jobs only',
        type: 'boolean',
        default: false,
        description: 'Only jobs that Reed marks as suitable for graduates.',
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs posted in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      ...commonSettings({
        site: 'Reed',
        details: 'the full description (text and HTML), contract type, hours, sector and full location',
        proxyDescription: 'The Actor connects directly, which is fastest. If Reed starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
      }),
    },
  };
}

// Select options from a map of ids to names, sorted by name.
const sortedSelectOf = (map) => ({ type: 'string', ...optionsOf(map) });

function infojobsInputSchema() {
  const settings = commonSettings({
    site: 'InfoJobs',
    proxyDescription: 'The Actor connects directly, which is fastest. If InfoJobs starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
  });
  return {
    title: ACTORS.infojobs.title,
    description: 'Search InfoJobs.net like on the website and get every matching job in Spain in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, in Spanish or English, for example <code>python</code>, <code>enfermera</code> or <code>camarero</code>. Each line is a separate search with the filters below. You can also paste links of searches from infojobs.net.',
        prefill: ['python'],
        placeholderValue: 'administrativo',
      },
      provinces: {
        title: 'Provinces',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all of Spain.',
        items: sortedSelectOf(infojobs.PROVINCES),
      },
      categories: {
        title: 'Categories',
        type: 'array',
        editor: 'select',
        sectionCaption: 'InfoJobs filters',
        description: 'Job categories as on InfoJobs. Leave empty for all.',
        items: sortedSelectOf(infojobs.CATEGORIES),
      },
      teleworking: {
        title: 'Remote policy',
        type: 'array',
        editor: 'select',
        description: 'On-site, hybrid or remote only. Leave empty for all.',
        items: selectOf(infojobs.TELEWORKING),
      },
      contractTypes: {
        title: 'Contract type',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: selectOf(infojobs.CONTRACT_TYPES),
      },
      workdays: {
        title: 'Working hours',
        type: 'array',
        editor: 'select',
        description: 'Full day, intensive (continuous) or part-time days. Leave empty for all.',
        items: selectOf(infojobs.WORKDAYS),
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs posted in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      sortBy: {
        title: 'Sort by',
        type: 'string',
        editor: 'select',
        enum: ['PUBLICATION_DATE', 'RELEVANCE'],
        enumTitles: ['Newest first', 'Relevance'],
        default: 'PUBLICATION_DATE',
        description: 'Newest first suits job alerts. Links you paste keep their own order.',
      },
      ...settings,
      // The search itself carries the full description, so no job page is opened.
      includeDescription: { ...settings.includeDescription, title: 'Include job descriptions', description: 'Save the full job description as plain text and HTML. Turn off for smaller results.' },
    },
  };
}

// Indeed options as select lists: id and name.
const namesOf = (map) => Object.fromEntries(Object.entries(map).map(([id, [first, second]]) => [id, second ?? first]));

function indeedInputSchema() {
  return {
    title: ACTORS.indeed.title,
    description: 'Search Indeed like on the website, in any of 62 countries, and get every matching job in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>data analyst</code> or <code>registered nurse</code>. Each line is a separate search with the filters below. You can also paste links of searches from Indeed in any country.',
        prefill: ['python developer'],
        placeholderValue: 'data analyst',
      },
      country: {
        title: 'Country',
        type: 'string',
        editor: 'select',
        description: 'The Indeed site to search. Links of Indeed searches keep their own country.',
        ...sortedSelectOf(Object.fromEntries(Object.entries(indeed.COUNTRIES).map(([code, [label]]) => [code, label]))),
        default: 'US',
      },
      location: {
        title: 'Location',
        type: 'string',
        editor: 'textfield',
        description: 'A city, state, region or postal code, for example <code>New York, NY</code>, <code>London</code> or <code>Berlin</code>. Leave empty for the whole country.',
        prefill: 'New York, NY',
      },
      distance: {
        title: 'Distance around the location',
        type: 'integer',
        minimum: 0,
        description: 'Also find jobs this far from the location: in miles in the United States and the United Kingdom, in kilometres elsewhere. Indeed uses 25 when this is empty.',
      },
      jobTypes: {
        title: 'Job type',
        type: 'array',
        editor: 'select',
        sectionCaption: 'Indeed filters',
        description: 'Leave empty for all. With several types you get jobs of any of them.',
        items: selectOf(namesOf(indeed.JOB_TYPES)),
      },
      workplaceTypes: {
        title: 'Remote, hybrid or in-person',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all.',
        items: selectOf(namesOf(indeed.WORKPLACES)),
      },
      experienceLevels: {
        title: 'Experience level',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all. Indeed marks experience levels mostly on jobs in the United States.',
        items: selectOf(namesOf(indeed.LEVELS)),
      },
      easyApplyOnly: {
        title: 'Easily apply only',
        type: 'boolean',
        default: false,
        description: 'Only jobs you can apply to on Indeed with an Indeed profile.',
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs posted in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      ...commonSettings({
        site: 'Indeed',
        proxyDescription: 'The Actor connects directly, which is fastest. If Indeed starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
      }),
      // Indeed's search results carry the whole job, so no job pages are opened.
      includeDescription: {
        title: 'Include job descriptions',
        type: 'boolean',
        default: true,
        description: 'Save the full description (text and HTML) of each job. Turn off for smaller, faster results with every other field.',
      },
    },
  };
}

const RESIDENTIAL_PROXY = { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] };

function linkedinInputSchema() {
  const settings = commonSettings({
    site: 'LinkedIn',
    details: 'the full description (text and HTML), seniority, employment type, job function, industries and number of applicants',
    proxyDescription: 'LinkedIn limits how many pages one address can open, so the Actor sends its requests through Apify residential proxies with rotating addresses, also when no proxy is set here. Set other proxies here only if you prefer your own.',
  });
  return {
    title: ACTORS.linkedin.title,
    description: 'Search public LinkedIn job listings like on the website, without login, and get every matching job in one clean format.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>data analyst</code> or <code>registered nurse</code>. Each line is a separate search with the filters below. You can also paste links of job searches from linkedin.com/jobs; their own filters are used.',
        prefill: ['python developer'],
        placeholderValue: 'data analyst',
      },
      location: {
        title: 'Location',
        type: 'string',
        editor: 'textfield',
        description: 'A country, region or city as on LinkedIn, for example <code>United States</code>, <code>London, England, United Kingdom</code> or <code>Berlin</code>. Leave empty to search worldwide.',
        prefill: 'United States',
      },
      distance: {
        title: 'Distance around the location',
        type: 'integer',
        minimum: 0,
        maximum: 100,
        unit: 'miles',
        description: 'Also find jobs this far from a city, for example 25. Leave empty for the LinkedIn default.',
      },
      jobTypes: {
        title: 'Job type',
        type: 'array',
        editor: 'select',
        sectionCaption: 'LinkedIn filters',
        description: 'Leave empty for all. LinkedIn does not filter by job type for visitors who are not logged in, so the Actor checks each job page: jobs of other types are skipped and free. With this filter a search reads the first 1,000 jobs LinkedIn lists.',
        items: selectOf(linkedin.JOB_TYPES),
      },
      experienceLevels: {
        title: 'Experience level',
        type: 'array',
        editor: 'select',
        description: 'Leave empty for all. Checked on each job page like the job type; jobs that LinkedIn marks "Not Applicable" are skipped when you choose levels.',
        items: selectOf(linkedin.EXPERIENCE_LEVELS),
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs posted in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      easyApply: {
        title: 'Easy Apply only',
        type: 'boolean',
        default: false,
        description: 'Only jobs you can apply to on LinkedIn with Easy Apply.',
      },
      ...settings,
      proxyConfiguration: { ...settings.proxyConfiguration, prefill: RESIDENTIAL_PROXY, default: RESIDENTIAL_PROXY },
    },
  };
}

function multiInputSchema() {
  const boards = Object.entries(multi.BOARDS);
  return {
    title: ACTORS.multi.title,
    description: 'Search many job sites at once and get every job in one clean format, without duplicates.',
    type: 'object',
    schemaVersion: 1,
    properties: {
      searchQueries: {
        title: 'Job titles or keywords',
        type: 'array',
        editor: 'stringList',
        description: 'What to search, for example <code>data analyst</code> or <code>registered nurse</code>. Each line is a separate search on every chosen site.',
        prefill: ['python developer'],
        placeholderValue: 'data analyst',
      },
      countries: {
        title: 'Countries',
        type: 'array',
        editor: 'select',
        description: 'Where to search. LinkedIn and Indeed cover every country here, and each country also goes to the other sites that cover it: the United States to Dice and Welcome to the Jungle; Germany to StepStone and Welcome to the Jungle; the UK to Reed and Welcome to the Jungle; Spain to InfoJobs and Welcome to the Jungle; Australia and New Zealand to SEEK; Malaysia, Singapore, the Philippines and Indonesia to Jobstreet; Hong Kong and Thailand to JobsDB; Canada and western Europe to Welcome to the Jungle.',
        items: selectOf(multi.COUNTRIES),
        prefill: ['US'],
      },
      location: {
        title: 'City or region',
        type: 'string',
        editor: 'textfield',
        description: 'For example <code>New York, NY</code>, <code>Berlin</code> or <code>Sydney NSW</code>. Used when you pick one country; Welcome to the Jungle always searches the whole country.',
      },
      sources: {
        title: 'Job sites',
        type: 'array',
        editor: 'select',
        description: 'Search only these sites. Leave empty for every site that covers your countries.',
        items: { type: 'string', enum: boards.map(([site]) => site), enumTitles: boards.map(([, board]) => board.label) },
      },
      companies: {
        title: 'Company career sites',
        type: 'array',
        editor: 'stringList',
        description: 'Links to company job boards on Greenhouse, Lever, Ashby or Workday, for example <code>https://boards.greenhouse.io/airbnb</code>. Jobs whose title contains your keywords are added; without keywords, all their jobs.',
        placeholderValue: 'https://jobs.lever.co/zoox',
      },
      remoteOnly: {
        title: 'Remote jobs only',
        type: 'boolean',
        default: false,
        sectionCaption: 'Filters',
        description: 'Keep only fully remote jobs. LinkedIn does not show visitors which jobs are remote, so it is left out of remote searches.',
      },
      postedWithinDays: {
        title: 'Posted in the last days',
        type: 'integer',
        minimum: 0,
        unit: 'days',
        description: 'Keep jobs published in the last N days: 1 means today and yesterday. Leave empty or 0 for any date.',
      },
      ...commonSettings({
        site: 'Each job site',
        perSource: 'search or career site',
        details: 'the full description (text and HTML) and every detail the site offers',
        proxyDescription: 'The Actor connects directly, which is fastest, and LinkedIn always goes through Apify residential proxies. If a site starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it for every site from the start.',
      }),
    },
  };
}

// The last column shows what each job board has: departments, employment types or nothing extra.
const EXTRA_COLUMN = {
  greenhouse: ['department', 'Department'],
  lever: ['department', 'Department'],
  ashby: ['department', 'Department'],
  dice: ['employmentType', 'Employment'],
  wttj: ['employmentType', 'Contract'],
  seek: ['employmentType', 'Work type'],
  jobstreet: ['employmentType', 'Work type'],
  jobsdb: ['employmentType', 'Work type'],
  reed: ['employmentType', 'Employment'],
  infojobs: ['employmentType', 'Employment'],
  linkedin: ['employmentType', 'Employment'],
  multi: ['ats', 'Source'],
  stepstone: ['employmentType', 'Employment'],
  indeed: ['employmentType', 'Job type'],
};

const COLUMNS = {
  title: { label: 'Title', format: 'text' },
  companyName: { label: 'Company', format: 'text' },
  location: { label: 'Location', format: 'text' },
  workplaceType: { label: 'Workplace', format: 'text' },
  employmentType: { label: 'Employment', format: 'text' },
  applicants: { label: 'Applicants', format: 'text' },
  industry: { label: 'Industry', format: 'text' },
  'salary.text': { label: 'Salary', format: 'text' },
  postedAt: { label: 'Posted', format: 'date' },
  jobUrl: { label: 'Job link', format: 'link' },
};
const OVERVIEW = ['title', 'companyName', 'location', 'workplaceType', 'salary.text', 'postedAt', 'jobUrl'];
// Where a site almost never fills a column of the table, a column it does fill takes its place:
// LinkedIn shows visitors no workplace, Workday career sites rarely state it, StepStone employers
// rarely publish pay, and in All-in-One most jobs come from LinkedIn.
const SWAPPED = {
  linkedin: { workplaceType: 'applicants' },
  workday: { workplaceType: 'employmentType' },
  stepstone: { 'salary.text': 'industry' },
  multi: { workplaceType: 'employmentType' },
};

export const datasetSchema = (ats) => {
  const [extraField, extraLabel] = EXTRA_COLUMN[ats] ?? [];
  const columns = OVERVIEW.map((field) => SWAPPED[ats]?.[field] ?? field);
  const fields = [...new Set([...columns, ...(extraField ? [extraField] : [])])];
  return {
    actorSpecification: 1,
    fields: {},
    views: {
      overview: {
        title: 'Jobs',
        transformation: { fields, flatten: ['salary'] },
        display: {
          component: 'table',
          properties: Object.fromEntries(fields.map((field) => [field, field === extraField ? { label: extraLabel, format: 'text' } : COLUMNS[field]])),
        },
      },
    },
  };
};

export const outputSchema = (ats) => ({
  actorOutputSchemaVersion: 1,
  title: `${ACTORS[ats].title} output`,
  properties: {
    jobs: {
      type: 'string',
      title: 'Jobs',
      description: 'Job postings with title, company, locations, salary, dates, description and links.',
      template: '{{links.apiDefaultDatasetUrl}}/items?view=overview',
    },
    summary: {
      type: 'string',
      title: 'Run summary',
      description: 'Jobs found, matched and saved for each company, with errors.',
      template: '{{links.apiDefaultKeyValueStoreUrl}}/records/SUMMARY',
    },
  },
});

export const actorJson = (ats) => ({
  actorSpecification: 1,
  name: ACTORS[ats].name,
  title: ACTORS[ats].title,
  description: ACTORS[ats].description,
  version: '0.1',
  buildTag: 'latest',
  input: './input_schema.json',
  storages: { dataset: './dataset_schema.json' },
  output: './output_schema.json',
  dockerfile: '../Dockerfile',
  readme: '../README.md',
});
