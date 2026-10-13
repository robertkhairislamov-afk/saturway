// Builds the n8n workflow templates for our Apify job Actors: node -e "import('./build-templates.mjs')"
// or node build-templates.mjs. Each template is a workflow JSON to import into n8n or submit to the
// n8n template library. The Code nodes are kept in their own .js files so they can be tested.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const code = (file) => readFileSync(join(here, 'code', file), 'utf8').trim();
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

let counter = 0;
const id = (name) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(++counter).toString(16).padStart(4, '0')}`;

const sticky = (name, content, [x, y], [width, height], color) => ({
  parameters: { content, height, width, ...(color ? { color } : {}) },
  id: id(name),
  name,
  type: 'n8n-nodes-base.stickyNote',
  typeVersion: 1,
  position: [x, y],
});

const apify = (name, actor, input, position) => ({
  parameters: {
    resource: 'Actors',
    operation: 'Run actor and get dataset',
    actorId: `robertosan16~${actor}`,
    customBody: JSON.stringify(input, null, 2),
    timeout: null,
    memory: 512,
  },
  id: id(name),
  name,
  type: '@apify/n8n-nodes-apify.apify',
  typeVersion: 1,
  position,
});

const schedule = (name, hour, position, weekdays = false) => ({
  parameters: {
    rule: {
      interval: [weekdays
        ? { field: 'weeks', triggerAtDay: [1, 2, 3, 4, 5], triggerAtHour: hour }
        : { triggerAtHour: hour }],
    },
  },
  id: id(name),
  name,
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2,
  position,
});

const codeNode = (name, file, position) => ({
  parameters: { jsCode: code(file) },
  id: id(name),
  name,
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position,
});

const sheet = (name, operation, position, matchingColumns = []) => ({
  parameters: {
    operation,
    documentId: { __rl: true, value: '', mode: 'list' },
    sheetName: { __rl: true, value: '', mode: 'list' },
    columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns, schema: [], attemptToConvertTypes: false, convertFieldsToString: false },
    options: {},
  },
  id: id(name),
  name,
  type: 'n8n-nodes-base.googleSheets',
  typeVersion: 4.6,
  position,
});

const chain = (...names) => Object.fromEntries(names.slice(0, -1).map((from, index) => [from, { main: [[{ node: names[index + 1], type: 'main', index: 0 }]] }]));

const workflow = (name, nodes, connections) => ({ name, nodes, connections, pinData: {}, settings: { executionOrder: 'v1' }, meta: { templateCredsSetupCompleted: false } });

const APIFY_SETUP = 'Create a free [Apify account](https://console.apify.com/sign-up) and add an Apify credential to the **{node}** node: the API token from Apify Console → Settings → API & Integrations, or OAuth on n8n Cloud. If the Apify node is missing, install the verified community node `@apify/n8n-nodes-apify`.';

// --- 1. Daily Indeed job alerts in Google Sheets ----------------------------------------------

counter = 0;
const indeedSheets = workflow('Get daily Indeed job alerts in Google Sheets with Apify', [
  sticky('Overview', [
    '## Daily Indeed job alerts in Google Sheets',
    '',
    'Every morning this workflow searches Indeed for jobs that match your keywords and adds the new ones to a Google Sheet: one row per job, with salary, job type, remote and the links. Good for job seekers, recruiters and anyone tracking hiring in a niche.',
    '',
    '### How it works',
    '1. **Every morning** starts the workflow at 8:00.',
    '2. **Search Indeed** runs the [Indeed Jobs Scraper](https://apify.com/robertosan16/indeed-jobs-scraper) on Apify. It searches any of 62 countries, and with `onlyNew` it returns only jobs it has not returned before for the same search, so the sheet gets no duplicates.',
    '3. **Pick columns** keeps the fields for the sheet.',
    '4. **Add to sheet** appends one row per job.',
    '',
    '### Set up',
    `1. ${APIFY_SETUP.replace('{node}', 'Search Indeed')}`,
    '2. In **Search Indeed**, change the search: `searchQueries`, `country` (a two-letter code such as `US`, `GB` or `DE`) and `location`.',
    '3. Create a Google Sheet whose first row holds the column names: Title, Company, Location, Salary, Job type, Remote, Posted, Job link, Apply link. Connect Google Sheets and select the sheet in **Add to sheet**.',
    '4. Activate the workflow.',
    '',
    '### Cost',
    'The scraper charges $1 per 1,000 jobs. The Apify free plan includes $5 of usage every month.',
  ].join('\n'), [-520, -240], [460, 760]),
  sticky('Search note', '### Your search\nEdit the JSON: keywords, country and city. `postedWithinDays: 1` and `onlyNew: true` keep each run to the jobs that are new since yesterday. More filters: job type, remote, experience level, distance.', [0, -60], [300, 240], 5),
  schedule('Every morning', 8, [40, 260]),
  apify('Search Indeed', 'indeed-jobs-scraper', {
    searchQueries: ['data analyst'],
    country: 'US',
    location: 'New York, NY',
    postedWithinDays: 1,
    onlyNew: true,
    includeDescription: false,
    maxItems: 200,
  }, [300, 260]),
  {
    parameters: {
      assignments: {
        assignments: [
          ['Title', '={{ $json.title }}'],
          ['Company', '={{ $json.companyName }}'],
          ['Location', '={{ $json.location }}'],
          ['Salary', "={{ $json.salary ? $json.salary.text : '' }}"],
          ['Job type', "={{ $json.employmentType || '' }}"],
          ['Remote', "={{ $json.remote ? 'yes' : '' }}"],
          ['Posted', "={{ $json.postedAt ? $json.postedAt.slice(0, 10) : '' }}"],
          ['Job link', '={{ $json.jobUrl }}'],
          ['Apply link', '={{ $json.applyUrl }}'],
        ].map(([field, value], index) => ({ id: `column-${index + 1}`, name: field, value, type: 'string' })),
      },
      options: {},
    },
    id: id('Pick columns'),
    name: 'Pick columns',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [560, 260],
  },
  sheet('Add to sheet', 'append', [820, 260]),
], chain('Every morning', 'Search Indeed', 'Pick columns', 'Add to sheet'));

// --- 2. New Glassdoor jobs at top-rated companies in Slack ------------------------------------

counter = 0;
const glassdoorSlack = workflow('Send new Glassdoor jobs at top-rated companies to Slack with Apify', [
  sticky('Overview', [
    '## New jobs at top-rated companies, in Slack',
    '',
    'Every weekday morning this workflow finds new remote jobs at companies rated 4 stars or more by their employees on Glassdoor and posts them to a Slack channel as one message, best-rated companies first, with the salary or Glassdoor\'s salary estimate.',
    '',
    '### How it works',
    '1. **Weekday mornings** starts the workflow at 9:00, Monday to Friday.',
    '2. **Search Glassdoor** runs the [Glassdoor Jobs Scraper](https://apify.com/robertosan16/glassdoor-jobs-scraper) on Apify with a minimum company rating of 4. With `onlyNew` it returns only jobs it has not returned before for the same search.',
    '3. **Write the message** turns the jobs into one Slack message with links. When there are no new jobs, nothing is posted.',
    '4. **Post to Slack** sends it to your channel.',
    '',
    '### Set up',
    `1. ${APIFY_SETUP.replace('{node}', 'Search Glassdoor')}`,
    '2. In **Search Glassdoor**, change the search: `searchQueries`, `country`, and `remoteOnly` or a `location`.',
    '3. Connect Slack in **Post to Slack** and pick the channel.',
    '4. Activate the workflow.',
    '',
    '### Cost',
    'The scraper charges $1 per 1,000 jobs. The Apify free plan includes $5 of usage every month.',
  ].join('\n'), [-520, -240], [460, 740]),
  sticky('Search note', '### Your search\n`minCompanyRating` takes 1 to 4. Swap `remoteOnly` for a `location` such as `Chicago, IL` or `London`, and add `jobTypes` or `experienceLevels` if you like.', [0, -60], [300, 240], 5),
  schedule('Weekday mornings', 9, [40, 260], true),
  apify('Search Glassdoor', 'glassdoor-jobs-scraper', {
    searchQueries: ['product manager'],
    country: 'US',
    remoteOnly: true,
    minCompanyRating: '4',
    postedWithinDays: 1,
    onlyNew: true,
    includeDescription: false,
    maxItems: 100,
  }, [300, 260]),
  codeNode('Write the message', 'glassdoor-slack-digest.js', [560, 260]),
  {
    parameters: {
      select: 'channel',
      channelId: { __rl: true, value: '#jobs', mode: 'name' },
      text: '={{ $json.text }}',
      otherOptions: { includeLinkToWorkflow: false, unfurl_links: false },
    },
    id: id('Post to Slack'),
    name: 'Post to Slack',
    type: 'n8n-nodes-base.slack',
    typeVersion: 2.3,
    position: [820, 260],
  },
], chain('Weekday mornings', 'Search Glassdoor', 'Write the message', 'Post to Slack'));

// --- 3. Companies hiring for a role, as leads in Google Sheets --------------------------------

counter = 0;
const hiringLeads = workflow('Find companies hiring on Glassdoor and save them as sales leads in Google Sheets', [
  sticky('Overview', [
    '## Companies hiring for a role, as sales leads',
    '',
    'A company that hires for a role is often about to buy what that role uses: hiring SDRs means a sales team is growing, hiring nurses means a clinic is expanding. Every Monday this workflow finds the companies that posted such jobs on Glassdoor in the last week and keeps one row per company in a Google Sheet, with the number of open jobs, size, revenue, industry, website and Glassdoor rating.',
    '',
    '### How it works',
    '1. **Every Monday** starts the workflow at 7:00.',
    '2. **Search Glassdoor** runs the [Glassdoor Jobs Scraper](https://apify.com/robertosan16/glassdoor-jobs-scraper) on Apify for jobs posted in the last 7 days.',
    '3. **One row per company** counts the jobs of each company and keeps its Glassdoor profile.',
    '4. **Save leads** adds new companies to the sheet and updates the ones already there, matched by name.',
    '',
    '### Set up',
    `1. ${APIFY_SETUP.replace('{node}', 'Search Glassdoor')}`,
    '2. In **Search Glassdoor**, set the role you sell to in `searchQueries`, the `country`, and optionally a `location`.',
    '3. Create a Google Sheet whose first row holds the column names: Company, Open jobs, Rating, Size, Revenue, Industry, Website, Headquarters, Glassdoor page, Latest posting, Job titles, Locations, Updated. Connect Google Sheets and select the sheet in **Save leads**.',
    '4. Activate the workflow.',
    '',
    '### Cost',
    'The scraper charges $1 per 1,000 jobs; 500 jobs a week cost $0.50. The Apify free plan includes $5 of usage every month.',
  ].join('\n'), [-520, -260], [460, 800]),
  sticky('Search note', '### Your search\nUse the job titles your buyers hire for. `maxItems` caps the jobs read per run; raise it for big searches.', [0, -40], [300, 200], 5),
  schedule('Every Monday', 7, [40, 260], false),
  apify('Search Glassdoor', 'glassdoor-jobs-scraper', {
    searchQueries: ['sales development representative'],
    country: 'US',
    postedWithinDays: 7,
    includeDescription: false,
    maxItems: 500,
  }, [300, 260]),
  codeNode('One row per company', 'glassdoor-company-leads.js', [560, 260]),
  sheet('Save leads', 'appendOrUpdate', [820, 260], ['Company']),
], chain('Every Monday', 'Search Glassdoor', 'One row per company', 'Save leads'));
// Weekly, on Mondays.
hiringLeads.nodes.find((node) => node.name === 'Every Monday').parameters.rule.interval = [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 7 }];

const templates = {
  'indeed-job-alerts-google-sheets.json': indeedSheets,
  'glassdoor-top-rated-jobs-slack.json': glassdoorSlack,
  'glassdoor-hiring-companies-leads.json': hiringLeads,
};
for (const [file, value] of Object.entries(templates)) {
  writeFileSync(join(here, file), json(value));
  console.log(`Wrote ${file}`);
}
