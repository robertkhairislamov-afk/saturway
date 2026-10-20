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

// --- 4. Jobs abroad: work-rights screen, AI fit check, tracker and email drafts ------------------

counter = 0;
const condition = (leftValue, operator, rightValue = '') => ({ id: id('condition'), leftValue, rightValue, operator });
const conditions = (list, combinator = 'and') => ({
  options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
  conditions: list,
  combinator,
});
const node = (name, type, typeVersion, position, parameters) => ({ parameters, id: id(name), name, type, typeVersion, position });
const SHEET_COLUMNS = 'Job link, Found, Recommendation, Priority, Fit, Visa, Sponsorship, Evidence, Missing, Why, Title, Company, Location, Base salary, Extra pay, Apply link, Status';
const FIT_PROMPT = [
  'You check one job ad for one candidate. Read only what is written; never guess.',
  '',
  'fitScore (0-100): how well the candidate, as described in the profile, meets this job: role, duties, required experience, industry and level. Count only experience the profile states. A required industry, licence, degree or number of years the profile does not show lowers the score.',
  'sponsorshipStatus:',
  '- NO: the ad requires citizenship, permanent residency, existing or unrestricted work rights, a security clearance, or says it does not sponsor visas.',
  '- YES: the ad explicitly offers visa sponsorship for this job.',
  '- YES_CONDITIONAL: sponsorship is offered only later or only to some people (after probation, top performers, applicants already in the country).',
  '- ASK: the ad says nothing either way. A large or international company is not evidence of sponsorship.',
  'sponsorshipEvidence: the exact sentence from the ad that decided the status; empty for ASK.',
  'missingRequirements: requirements of the ad that the profile does not show, each a few words.',
  'seniorityFit: FIT, TOO_SENIOR or TOO_JUNIOR for the candidate.',
  'reason: one sentence on why the job fits or not.',
].join('\n');
const EMAIL_PROMPT = [
  'You write a short first email from a job seeker to an employer about one job.',
  'Rules:',
  '- Use only facts from the candidate profile. Never invent experience, numbers, employers, degrees or visa status.',
  '- 120 to 170 words, plain and friendly English, no cliches such as "I am excited to apply".',
  '- Name the job and one or two concrete reasons the candidate fits it, taken from the profile and the ad.',
  '- In one honest sentence say the candidate is based abroad and would need visa sponsorship.',
  '  Sponsorship status ASK: politely ask whether they would consider sponsoring the right person.',
  '  YES_CONDITIONAL: ask whether the visa could be arranged before the start date.',
  '  YES: mention that the ad offers sponsorship.',
  '- Ask for a 15-minute video call and sign with the candidate name.',
  '- Return a subject line and the email body.',
].join('\n');

const jobsAbroad = workflow('Find jobs abroad that can sponsor your visa and draft the emails with Apify, AI and Gmail', [
  sticky('Overview', [
    '## Find jobs abroad that can sponsor your visa',
    '',
    'For people who need an employer to sponsor their work visa. Many ads quietly rule you out ("citizens or permanent residents only"). This workflow finds new jobs on 10+ sites, drops those, ranks the rest with AI and drafts emails for the best. **Nothing is sent**: drafts wait in Gmail.',
    '',
    '### How it works',
    '1. Every morning the [All-in-One Jobs Scraper](https://apify.com/robertosan16/all-in-one-jobs-scraper) on Apify searches LinkedIn, Indeed, Glassdoor, SEEK and more in one call.',
    '2. Rules, not AI, skip ads that require citizenship, permanent residency or existing work rights, and keep the exact quote.',
    '3. AI scores your fit and the sponsorship status; each job is labelled APPLY, ASK SPONSORSHIP FIRST, REVIEW, LOW PRIORITY or SKIP.',
    '4. Every job, skipped ones too, is saved to a Google Sheet.',
    '5. The best few jobs a day get an honest email, saved as a Gmail draft.',
    '',
    '### Setup',
    '1. Add an Apify credential to **Search job sites** (API token from Apify Console → Settings → API & Integrations). If the node is missing, install `@apify/n8n-nodes-apify`.',
    '2. In **Your profile**, paste your CV summary and set `minBaseSalary` and `maxDraftsPerDay`.',
    '3. In **Search job sites**, set job titles, `countries` and `location`.',
    '4. Add an OpenAI credential to **OpenAI Chat Model**, or use any chat model.',
    '5. Create a Google Sheet with the columns listed in **Update job tracker** and select it there.',
    '6. Connect Gmail in **Save Gmail draft** and activate.',
    '',
    '### Customization',
    'Already allowed to work there? Set `needsVisaSponsorship` to false. The scraper costs $1 per 1,000 jobs; the Apify free plan includes $5 a month.',
  ].join('\n'), [-760, -240], [640, 1060]),
  sticky('Group: search', '## 1. Search new jobs\nEvery morning: your profile, then new jobs from 10+ sites in one Apify call.', [0, -240], [700, 620], 7),
  sticky('Group: screen', '## 2. Screen work rights\nRules, not AI: skip ads that rule out foreign candidates, with the quote. Skipped jobs still go to the sheet.', [740, -240], [700, 860], 7),
  sticky('Group: AI', '## 3. AI check and ranking\nFit score and sponsorship status for each job, then one recommendation.', [1480, -240], [760, 860], 7),
  sticky('Group: tracker', '## 4. Job tracker\nOne row per job in Google Sheets, never duplicated.', [2280, 560], [440, 440], 7),
  sticky('Group: emails', '## 5. Email drafts\nThe best jobs, up to your daily limit, get an honest email saved as a Gmail draft. Nothing is sent.', [2280, -240], [1320, 760], 7),
  schedule('Every morning', 7, [40, 300]),
  node('Your profile', 'n8n-nodes-base.set', 3.4, [260, 300], {
    assignments: {
      assignments: [
        ['candidateProfile', 'string', [
          'Name: Alex Example',
          'Current role: Sales Manager, 7 years in B2B sales of consumer goods, leading a team of 6',
          'Strengths: key accounts, wholesale and retail partners, CRM, KPIs and sales planning, training new sales staff',
          'Education: Bachelor of Business (Marketing)',
          'English: upper intermediate',
          'Location: lives abroad, ready to relocate, needs employer visa sponsorship',
        ].join('\n')],
        ['needsVisaSponsorship', 'boolean', true],
        ['minBaseSalary', 'number', 80000],
        ['maxDraftsPerDay', 'number', 5],
      ].map(([name, type, value], index) => ({ id: `profile-${index + 1}`, name, type, value })),
    },
    options: {},
  }),
  apify('Search job sites', 'all-in-one-jobs-scraper', {
    searchQueries: ['sales manager', 'business development manager'],
    countries: ['AU'],
    location: 'Adelaide',
    postedWithinDays: 3,
    onlyNew: true,
    includeDescription: true,
    maxItems: 100,
  }, [480, 300]),
  codeNode('Screen work rights', 'jobs-abroad-screen.js', [700, 300]),
  node('Can apply?', 'n8n-nodes-base.if', 2.2, [920, 300], {
    conditions: conditions([condition('={{ $json.canApply }}', { type: 'boolean', operation: 'true', singleValue: true })]),
    options: {},
  }),
  node('Check fit and sponsorship', '@n8n/n8n-nodes-langchain.informationExtractor', 1.2, [1160, 180], {
    text: "=CANDIDATE PROFILE:\n{{ $('Your profile').first().json.candidateProfile }}\n\nJOB: {{ $json.title }} at {{ $json.company }}, {{ $json.location }}\nSALARY: {{ $json.salaryText || 'not stated' }}\n\nJOB AD:\n{{ $json.description }}",
    schemaType: 'manual',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        fitScore: { type: 'integer', minimum: 0, maximum: 100 },
        sponsorshipStatus: { type: 'string', enum: ['YES', 'YES_CONDITIONAL', 'ASK', 'NO'] },
        sponsorshipEvidence: { type: 'string' },
        missingRequirements: { type: 'array', items: { type: 'string' } },
        seniorityFit: { type: 'string', enum: ['FIT', 'TOO_SENIOR', 'TOO_JUNIOR'] },
        reason: { type: 'string' },
      },
      required: ['fitScore', 'sponsorshipStatus', 'sponsorshipEvidence', 'missingRequirements', 'seniorityFit', 'reason'],
    }, null, 2),
    options: { systemPromptTemplate: FIT_PROMPT },
  }),
  node('OpenAI Chat Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi', 1.2, [1500, 520], {
    model: { __rl: true, value: 'gpt-4.1-mini', mode: 'list', cachedResultName: 'gpt-4.1-mini' },
    options: { temperature: 0.2 },
  }),
  codeNode('Skipped jobs', 'jobs-abroad-skipped.js', [1160, 460]),
  codeNode('Rank jobs', 'jobs-abroad-rank.js', [1460, 180]),
  sheet('Update job tracker', 'appendOrUpdate', [1760, 400], ['Job link']),
  node('Worth an email?', 'n8n-nodes-base.filter', 2.2, [1760, 100], {
    conditions: conditions([
      condition('={{ $json.Recommendation }}', { type: 'string', operation: 'equals' }, 'APPLY'),
      condition('={{ $json.Recommendation }}', { type: 'string', operation: 'equals' }, 'ASK SPONSORSHIP FIRST'),
    ], 'or'),
    options: {},
  }),
  node('Best first', 'n8n-nodes-base.sort', 1, [1980, 100], {
    sortFieldsUi: { sortField: [{ fieldName: 'Priority', order: 'descending' }] },
    options: {},
  }),
  node('Daily limit', 'n8n-nodes-base.limit', 1, [2200, 100], {
    maxItems: "={{ $('Your profile').first().json.maxDraftsPerDay }}",
  }),
  node('Write the email', '@n8n/n8n-nodes-langchain.chainLlm', 1.6, [2420, 100], {
    promptType: 'define',
    text: "=CANDIDATE PROFILE:\n{{ $('Your profile').first().json.candidateProfile }}\n\nJOB: {{ $json.Title }} at {{ $json.Company }}, {{ $json.Location }}\nSPONSORSHIP STATUS: {{ $json.sponsorshipStatus }}\nWHY IT FITS: {{ $json.Why }}\n\nJOB AD:\n{{ $json.description.slice(0, 3000) }}",
    hasOutputParser: true,
    messages: { messageValues: [{ message: EMAIL_PROMPT }] },
  }),
  node('Email format', '@n8n/n8n-nodes-langchain.outputParserStructured', 1.2, [2560, 340], {
    schemaType: 'manual',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: { subject: { type: 'string' }, body: { type: 'string' } },
      required: ['subject', 'body'],
    }, null, 2),
  }),
  node('Save Gmail draft', 'n8n-nodes-base.gmail', 2.1, [2740, 100], {
    resource: 'draft',
    subject: '={{ $json.output.subject }}',
    emailType: 'text',
    message: "={{ $json.output.body }}\n\nJob ad: {{ $('Daily limit').item.json['Apply link'] }}",
    options: {},
  }),
], {
  ...chain('Every morning', 'Your profile', 'Search job sites', 'Screen work rights', 'Can apply?'),
  'Can apply?': { main: [[{ node: 'Check fit and sponsorship', type: 'main', index: 0 }], [{ node: 'Skipped jobs', type: 'main', index: 0 }]] },
  'Check fit and sponsorship': { main: [[{ node: 'Rank jobs', type: 'main', index: 0 }]] },
  'Skipped jobs': { main: [[{ node: 'Update job tracker', type: 'main', index: 0 }]] },
  'Rank jobs': { main: [[{ node: 'Update job tracker', type: 'main', index: 0 }, { node: 'Worth an email?', type: 'main', index: 0 }]] },
  ...chain('Worth an email?', 'Best first', 'Daily limit', 'Write the email', 'Save Gmail draft'),
  'OpenAI Chat Model': { ai_languageModel: [[
    { node: 'Check fit and sponsorship', type: 'ai_languageModel', index: 0 },
    { node: 'Write the email', type: 'ai_languageModel', index: 0 },
  ]] },
  'Email format': { ai_outputParser: [[{ node: 'Write the email', type: 'ai_outputParser', index: 0 }]] },
});
// Node positions inside the group stickies.
const JOBS_ABROAD_POSITIONS = {
  'Every morning': [80, 200], 'Your profile': [300, 200], 'Search job sites': [520, 200],
  'Screen work rights': [800, 200], 'Can apply?': [1020, 200], 'Skipped jobs': [1240, 460],
  'Check fit and sponsorship': [1540, 200], 'OpenAI Chat Model': [1580, 460], 'Rank jobs': [1980, 200],
  'Update job tracker': [2440, 800],
  'Worth an email?': [2340, 200], 'Best first': [2560, 200], 'Daily limit': [2780, 200], 'Write the email': [3000, 200],
  'Email format': [3160, 420], 'Save Gmail draft': [3380, 200],
};
for (const n of jobsAbroad.nodes) if (JOBS_ABROAD_POSITIONS[n.name]) n.position = JOBS_ABROAD_POSITIONS[n.name];
// The tracker keeps only the sheet's own columns; the job text for the email step is not written.
jobsAbroad.nodes.find((n) => n.name === 'Update job tracker').parameters.options = { handlingExtraData: 'ignoreIt' };

// --- 5. Hiring-signal leads: new and growing companies, AI notes, sheet and Slack -------------

counter = 0;
const LEADS_COLUMNS = 'Company, Signal, Open jobs, Previous open jobs, Fits ICP, Priority, Why now, Angle, Opener, Rating, Size, Revenue, Industry, Website, Headquarters, Glassdoor page, Latest posting, Job titles, Locations, First seen, Updated, Status';
const LEAD_PROMPT = [
  'You prepare one sales lead from public hiring data for a seller.',
  'Use only the data given. Never invent facts about the company, its people, its revenue or its plans.',
  'priority: HIGH if the company clearly fits what the seller offers and the hiring shows a team being built or grown now; MEDIUM if it fits but the signal is weaker; LOW otherwise.',
  'whyNow: one sentence on what the hiring says (which team, how many open jobs, new or growing).',
  'angle: one sentence on how the seller\'s offer helps with that, in plain words.',
  'opener: the first sentence of a cold email that mentions the hiring, friendly and specific, no flattery.',
].join('\n');

const hiringSignals = workflow('Find companies building a team from Glassdoor jobs and research them as sales leads with AI', [
  sticky('Overview', [
    '## Find companies building a team and research them as sales leads',
    '',
    'A company hiring for a role is often about to buy what that role needs. This workflow finds companies posting such jobs on Glassdoor, spots those that are **new** or **hiring more** than last week, keeps the ones that match your ideal customer and has AI prepare each hot lead.',
    '',
    '### How it works',
    '1. Every Monday the [Glassdoor Jobs Scraper](https://apify.com/robertosan16/glassdoor-jobs-scraper) on Apify reads last week\'s jobs for your roles, one row per company with size, revenue, industry and website.',
    '2. Your sheet from last week marks each company NEW, GROWING or STEADY and checks it against your ideal customer.',
    '3. AI writes priority, why now, an angle and an email opener for hot leads only.',
    '4. Every company is saved to Google Sheets, so the next run can compare.',
    '5. One Slack message lists the hottest leads, high priority first.',
    '',
    '### Setup',
    '1. Add an Apify credential to **Search Glassdoor** (API token from Apify Console → Settings → API & Integrations). If the node is missing, install `@apify/n8n-nodes-apify`.',
    '2. In **Search Glassdoor**, set the roles your buyers hire for, `country` and optionally `location`.',
    '3. In **Your ideal customer**, describe what you sell and set `minEmployees`, `industries` and `minOpenJobs`.',
    '4. Add an OpenAI credential to **OpenAI Chat Model**, or use any chat model.',
    '5. Create a Google Sheet with the columns listed in **Save leads** and select it in **Read saved leads** and **Save leads**.',
    '6. Connect Slack in **Post to Slack**, pick a channel and activate.',
    '',
    '### Customization',
    'Track several roles at once, or swap Slack for email. The scraper costs $1 per 1,000 jobs; the Apify free plan includes $5 a month.',
  ].join('\n'), [-760, -240], [640, 1060]),
  sticky('Group: find', '## 1. Find companies hiring\nEvery Monday: last week\'s Glassdoor jobs, grouped into one row per company.', [0, -240], [940, 620], 7),
  sticky('Group: compare', '## 2. Compare with last week\nMark each company NEW, GROWING or STEADY and check it against your ideal customer.', [980, -240], [700, 620], 7),
  sticky('Group: AI', '## 3. AI lead research\nPriority, why now, angle and opener for hot leads only. No invented facts.', [1720, -240], [720, 860], 7),
  sticky('Group: save', '## 4. Save leads\nAdd or update each company in Google Sheets.', [2480, 420], [440, 480], 7),
  sticky('Group: slack', '## 5. Slack digest\nOne message with up to 10 hot leads, high priority first.', [2480, -240], [700, 620], 7),
  schedule('Every Monday', 7, [80, 200]),
  node('Your ideal customer', 'n8n-nodes-base.set', 3.4, [300, 200], {
    assignments: {
      assignments: [
        ['whatYouSell', 'string', 'Sales training and coaching for B2B sales teams of 5 to 50 people'],
        ['minEmployees', 'number', 50],
        ['industries', 'string', ''],
        ['minOpenJobs', 'number', 2],
      ].map(([name, type, value], index) => ({ id: `icp-${index + 1}`, name, type, value })),
    },
    options: {},
  }),
  apify('Search Glassdoor', 'glassdoor-jobs-scraper', {
    searchQueries: ['sales development representative', 'account executive'],
    country: 'US',
    postedWithinDays: 7,
    includeDescription: false,
    maxItems: 500,
  }, [520, 200]),
  codeNode('One row per company', 'glassdoor-company-leads.js', [740, 200]),
  {
    ...node('Read saved leads', 'n8n-nodes-base.googleSheets', 4.6, [1040, 200], {
      operation: 'read',
      documentId: { __rl: true, value: '', mode: 'list' },
      sheetName: { __rl: true, value: '', mode: 'list' },
      options: {},
    }),
    executeOnce: true,
    alwaysOutputData: true,
  },
  codeNode('Compare with last week', 'leads-compare.js', [1260, 200]),
  node('Hot lead?', 'n8n-nodes-base.if', 2.2, [1480, 200], {
    conditions: conditions([condition('={{ $json.hotLead }}', { type: 'boolean', operation: 'true', singleValue: true })]),
    options: {},
  }),
  node('Research the lead', '@n8n/n8n-nodes-langchain.informationExtractor', 1.2, [1780, 200], {
    text: "=WHAT THE SELLER OFFERS: {{ $('Your ideal customer').first().json.whatYouSell }}\n\nCOMPANY: {{ $json.Company }}\nINDUSTRY: {{ $json.Industry || 'unknown' }}\nSIZE: {{ $json.Size || 'unknown' }}\nREVENUE: {{ $json.Revenue || 'unknown' }}\nGLASSDOOR RATING: {{ $json.Rating || 'unknown' }}\nSIGNAL: {{ $json.Signal }}, {{ $json['Open jobs'] }} open jobs this week{{ $json['Previous open jobs'] !== '' ? ' (' + $json['Previous open jobs'] + ' last time)' : '' }}\nJOB TITLES: {{ $json['Job titles'] }}\nLOCATIONS: {{ $json.Locations }}",
    schemaType: 'manual',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        whyNow: { type: 'string' },
        angle: { type: 'string' },
        opener: { type: 'string' },
      },
      required: ['priority', 'whyNow', 'angle', 'opener'],
    }, null, 2),
    options: { systemPromptTemplate: LEAD_PROMPT },
  }),
  node('OpenAI Chat Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi', 1.2, [1800, 460], {
    model: { __rl: true, value: 'gpt-4.1-mini', mode: 'list', cachedResultName: 'gpt-4.1-mini' },
    options: { temperature: 0.3 },
  }),
  codeNode('Add AI notes', 'leads-ai-notes.js', [2200, 200]),
  sheet('Save leads', 'appendOrUpdate', [2640, 660], ['Company']),
  codeNode('Write the digest', 'leads-slack-digest.js', [2560, 200]),
  {
    ...node('Post to Slack', 'n8n-nodes-base.slack', 2.3, [2840, 200], {
      select: 'channel',
      channelId: { __rl: true, value: '#sales-leads', mode: 'name' },
      text: '={{ $json.text }}',
      otherOptions: { includeLinkToWorkflow: false, unfurl_links: false },
    }),
  },
], {
  ...chain('Every Monday', 'Your ideal customer', 'Search Glassdoor', 'One row per company', 'Read saved leads', 'Compare with last week', 'Hot lead?'),
  'Hot lead?': { main: [[{ node: 'Research the lead', type: 'main', index: 0 }], [{ node: 'Save leads', type: 'main', index: 0 }]] },
  'Research the lead': { main: [[{ node: 'Add AI notes', type: 'main', index: 0 }]] },
  'Add AI notes': { main: [[{ node: 'Save leads', type: 'main', index: 0 }, { node: 'Write the digest', type: 'main', index: 0 }]] },
  'Write the digest': { main: [[{ node: 'Post to Slack', type: 'main', index: 0 }]] },
  'OpenAI Chat Model': { ai_languageModel: [[{ node: 'Research the lead', type: 'ai_languageModel', index: 0 }]] },
});
hiringSignals.nodes.find((n) => n.name === 'Every Monday').parameters.rule.interval = [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 7 }];
// The sheet keeps only its own columns (the hotLead flag is not written).
hiringSignals.nodes.find((n) => n.name === 'Save leads').parameters.options = { handlingExtraData: 'ignoreIt' };

const templates = {
  'glassdoor-hiring-signal-leads.json': hiringSignals,
  'jobs-abroad-visa-sponsorship-gmail-drafts.json': jobsAbroad,
  'indeed-job-alerts-google-sheets.json': indeedSheets,
  'glassdoor-top-rated-jobs-slack.json': glassdoorSlack,
  'glassdoor-hiring-companies-leads.json': hiringLeads,
};
for (const [file, value] of Object.entries(templates)) {
  writeFileSync(join(here, file), json(value));
  console.log(`Wrote ${file}`);
}
