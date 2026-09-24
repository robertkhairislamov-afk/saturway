// Store metadata and input schema of the four job Actors. They share one code base and one
// output format; only the texts, examples and a few inputs differ.

export const ACTORS = {
  greenhouse: {
    name: 'greenhouse-jobs-scraper',
    title: 'Greenhouse Jobs Scraper',
    description: 'Scrape all open jobs of any company on Greenhouse: title, department, locations, salary range, description and apply link. Keyword, location, remote and date filters, and an only-new mode for monitoring.',
    seoTitle: 'Greenhouse Jobs Scraper: jobs, salaries, API',
    seoDescription: 'Scrape job postings from Greenhouse job boards with salary ranges, locations and full descriptions. Filter by keyword, location and date. Export JSON, CSV, Excel.',
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
    seoTitle: 'Lever Jobs Scraper: jobs.lever.co postings, salaries, API',
    seoDescription: 'Scrape job postings from jobs.lever.co career pages with salary ranges, teams, locations and full descriptions. Filter by keyword, location and date. Export JSON, CSV, Excel.',
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
    seoTitle: 'Ashby Jobs Scraper: jobs.ashbyhq.com postings, salaries, API',
    seoDescription: 'Scrape job postings from jobs.ashbyhq.com with compensation, departments, locations and full descriptions. Filter by keyword, location and date. Export JSON, CSV, Excel.',
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
    seoTitle: 'Workday Jobs Scraper: myworkdayjobs.com postings, API',
    seoDescription: 'Scrape job postings from Workday career sites (myworkdayjobs.com): all jobs beyond the 2,000 search limit, locations, dates, salaries and descriptions. Export JSON, CSV, Excel.',
    companies: {
      title: 'Career sites (Workday links)',
      description: 'Links to Workday job search pages, for example <code>https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite</code>. Open the company\'s careers page, click through to the job list and copy the address from your browser. Filters you selected on the page (category, location) are kept.',
      prefill: ['https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite'],
      placeholder: 'https://company.wd5.myworkdayjobs.com/External',
    },
    keywordsNote: ' Each keyword is also searched on the career site itself, so big sites are read faster.',
    prefill: { keywords: ['engineer'], maxItems: 100 },
    noDepartments: true,
  },
};

export const CATEGORIES = ['JOBS', 'LEAD_GENERATION', 'AUTOMATION'];

export function inputSchema(ats) {
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
      description: 'Stop after saving this many jobs. Leave empty or 0 for no limit.',
      ...(actor.prefill?.maxItems ? { prefill: actor.prefill.maxItems } : {}),
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

export const datasetSchema = (ats) => ({
  actorSpecification: 1,
  fields: {},
  views: {
    overview: {
      title: 'Jobs',
      transformation: {
        fields: ['title', 'companyName', 'location', 'workplaceType', 'salary.text', 'postedAt', 'jobUrl', ...(ats === 'workday' ? [] : ['department'])],
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
          ...(ats === 'workday' ? {} : { department: { label: 'Department', format: 'text' } }),
        },
      },
    },
  },
});

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
