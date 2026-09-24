// Store metadata and input schema of the job Actors. They share one code base and one output
// format; only the texts, examples and a few inputs differ. Dice searches a job board instead of
// company boards, so it has its own search form.

export const ACTORS = {
  greenhouse: {
    name: 'greenhouse-jobs-scraper',
    title: 'Greenhouse Jobs Scraper',
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
    description: 'Scrape US tech jobs from Dice.com: title, company, location, salary, skills, full description, dates and apply link. All Dice filters, over 750 results per search, and an only-new mode for alerts.',
    seoTitle: 'Dice Jobs Scraper – Extract Job Listings & Salaries',
    seoDescription: 'Scrape Dice.com jobs by keyword and location: title, company, salary, skills, description, posting date and link. All Dice filters. $0.50 per 1,000 jobs.',
  },
};

export const CATEGORIES = ['JOBS', 'LEAD_GENERATION', 'AUTOMATION'];

export function inputSchema(ats) {
  if (ats === 'dice') return diceInputSchema();
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
const commonSettings = ({ proxyDescription }) => ({
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
    description: 'Keep only jobs whose title contains any of these words or phrases. Dice searches descriptions too, so this makes results stricter. Add <code>*</code> for any ending: <code>data*</code>.',
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
    description: 'Open each job page for the full description (text and HTML), skills and expiry date. Turn off for fast results with a short summary instead.',
  },
  maxItems: {
    title: 'Maximum jobs in total',
    type: 'integer',
    minimum: 0,
    description: 'Stop after saving this many jobs. Leave empty or 0 for no limit. The example is kept small so the first run takes seconds.',
    prefill: 50,
  },
  maxItemsPerCompany: {
    title: 'Maximum jobs per search',
    type: 'integer',
    minimum: 0,
    description: 'Save at most this many jobs from each search. Leave empty or 0 for no limit.',
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
        proxyDescription: 'The Actor connects directly, which is fastest. If Dice starts limiting requests, it switches to Apify Proxy automatically. Turn on a proxy here only to use it from the start.',
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
};

export const datasetSchema = (ats) => {
  const [extraField, extraLabel] = EXTRA_COLUMN[ats] ?? [];
  return {
    actorSpecification: 1,
    fields: {},
    views: {
      overview: {
        title: 'Jobs',
        transformation: {
          fields: ['title', 'companyName', 'location', 'workplaceType', 'salary.text', 'postedAt', 'jobUrl', ...(extraField ? [extraField] : [])],
          flatten: ['salary'],
        },
        display: {
          component: 'table',
          properties: {
            title: { label: 'Title', format: 'text' },
            companyName: { label: 'Company', format: 'text' },
            location: { label: 'Location', format: 'text' },
            workplaceType: { label: 'Workplace', format: 'text' },
            'salary.text': { label: 'Salary', format: 'text' },
            postedAt: { label: 'Posted', format: 'date' },
            jobUrl: { label: 'Job link', format: 'link' },
            ...(extraField ? { [extraField]: { label: extraLabel, format: 'text' } } : {}),
          },
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
