# Specs of the public example tasks (landing pages) for our Actors. python3 build.py -> tasks.json
import json
T = []
def t(actor, name, title, description, seoTitle, seoDescription, input, fields, view='overview'):
    T.append(dict(actor=actor, name=name, title=title, description=description, seoTitle=seoTitle,
                  seoDescription=seoDescription, input=input, fields=fields, view=view))

# --- Google Play
t('google-play-scraper', 'google-play-keyword-rank-tracker', 'Track App Keyword Rankings on Google Play',
  'See where apps rank on Google Play for your keywords in several countries, with each app\'s rating, installs, price and last update. Schedule it daily to keep a ranking history for ASO.',
  'Google Play Keyword Rank Tracker for ASO – Any Country',
  'Track Google Play search rankings for your keywords in any country: rank, app, rating, installs, last update. Daily ASO monitoring, export to Sheets.',
  {'searchTerms': ['habit tracker', 'budget planner', 'meditation'], 'countries': ['US', 'GB', 'IN'], 'includeDetails': False, 'maxItems': 300},
  ['searchTerms', 'countries'])
t('google-play-scraper', 'google-play-top-grossing-games', 'Top Grossing Games on Google Play by Country',
  'The top grossing mobile games on Google Play in the US, UK, Germany and Japan, with rank, developer, rating, installs and in-app purchase range. Compare markets or watch a category every day.',
  'Top Grossing Games on Google Play – US, UK, DE, JP Charts',
  'Get Google Play top grossing games charts for any country: rank, developer, rating, installs, in-app purchases. Compare markets, track daily.',
  {'charts': ['topgrossing'], 'chartCategories': ['GAME'], 'chartDepth': 50, 'countries': ['US', 'GB', 'DE', 'JP'], 'maxItems': 200},
  ['charts', 'chartCategories', 'chartDepth', 'countries'])
t('google-play-scraper', 'google-play-app-developer-leads', 'Find App Developer Contacts on Google Play',
  'Search Google Play for apps in your niche and get each developer\'s public email, website and privacy policy, with installs and rating. A lead list for agencies, SDK and ad-tech sales.',
  'Google Play App Developer Emails – Lead List by Keyword',
  'Find Android app developers in any niche with their public email and website, installs and rating, from Google Play search. B2B lead list in minutes.',
  {'searchTerms': ['fitness tracker', 'workout planner'], 'countries': ['US'], 'includeDetails': True, 'maxItems': 60},
  ['searchTerms', 'countries', 'includeDetails'])
# --- App Store
t('app-store-scraper', 'app-store-keyword-rank-tracker', 'Track App Keyword Rankings on the App Store',
  'See where iPhone apps rank on the App Store for your keywords in several countries, with rating, number of ratings, price and last update. Run it daily for ASO tracking.',
  'App Store Keyword Rank Tracker for ASO – Any Country',
  'Track App Store search rankings for your keywords in any country: rank, app, rating, ratings count, price, update date. Daily ASO monitoring.',
  {'searchTerms': ['habit tracker', 'budget planner'], 'countries': ['US', 'GB'], 'maxItems': 200},
  ['searchTerms', 'countries'])
t('app-store-scraper', 'app-store-top-free-apps-by-country', 'Top Free iPhone Apps by Country',
  'The App Store top free and top grossing charts for the US, UK and Germany, with rank, developer, rating, price and category. Compare markets or follow a chart every day.',
  'App Store Top Charts – Top Free & Grossing iPhone Apps',
  'Get App Store top free and top grossing charts for any country: rank, app, developer, rating, category. Compare markets and track charts daily.',
  {'charts': ['top_free', 'top_grossing'], 'chartGenres': ['ALL'], 'chartDepth': 50, 'countries': ['US', 'GB', 'DE'], 'maxItems': 300},
  ['charts', 'chartGenres', 'chartDepth', 'countries'])
# --- Redfin
t('redfin-scraper', 'austin-homes-for-sale', 'Homes for Sale in Austin, TX with Prices and Photos',
  'Every house for sale in Austin, Texas, listed in the last 14 days, with price, beds, baths, square feet, price per square foot, days on market, HOA, photos and the Redfin link.',
  'Austin TX Homes for Sale – New Listings Data from Redfin',
  'New Austin, TX house listings from Redfin: price, beds, baths, sqft, price per sqft, days on market, photos. Run daily for new-listing alerts.',
  {'locations': ['Austin, TX'], 'searchType': 'forSale', 'propertyTypes': ['house'], 'maxDaysOnMarket': '14', 'maxItems': 200},
  ['locations', 'searchType', 'propertyTypes', 'maxDaysOnMarket'])
t('redfin-scraper', 'recently-sold-homes-comps', 'Recently Sold Homes for Comps (Denver)',
  'Houses sold in Denver in the last 90 days with sale price, sold date, beds, baths, square feet and price per square foot: comparable sales for pricing, appraisal checks and investing.',
  'Recently Sold Homes in Denver – Real Estate Comps Data',
  'Sold home prices in Denver from Redfin for the last 90 days: sale price, sold date, beds, baths, sqft, price per sqft. Real estate comps in a spreadsheet.',
  {'locations': ['Denver, CO'], 'searchType': 'sold', 'soldWithinDays': '90', 'propertyTypes': ['house'], 'maxItems': 300},
  ['locations', 'searchType', 'soldWithinDays', 'propertyTypes'])
t('redfin-scraper', 'seattle-apartments-for-rent', 'Apartments for Rent in Seattle with Rents',
  'Rentals in Seattle from Redfin with rent range, beds, baths, square feet, availability and the listing link. Track rents or find new rentals every day.',
  'Seattle Apartments for Rent – Rental Listings from Redfin',
  'Seattle rental listings from Redfin: rent, beds, baths, sqft, available units and links. Track rents by neighborhood or get new rentals daily.',
  {'locations': ['Seattle, WA'], 'searchType': 'forRent', 'maxItems': 200},
  ['locations', 'searchType'])
# --- All-in-One
t('all-in-one-jobs-scraper', 'remote-data-analyst-jobs-all-sites', 'Remote Data Analyst Jobs from LinkedIn, Indeed and Glassdoor',
  'Remote data analyst jobs posted in the last 7 days on LinkedIn, Indeed and Glassdoor in one list, duplicates removed, with salary, company and apply link. Run daily for a job alert.',
  'Remote Data Analyst Jobs – LinkedIn, Indeed, Glassdoor',
  'Remote data analyst jobs from LinkedIn, Indeed and Glassdoor in one list, no duplicates: salary, company, location, apply link. Daily job alerts.',
  {'searchQueries': ['data analyst'], 'countries': ['US'], 'remoteOnly': True, 'postedWithinDays': 7, 'sources': ['linkedin', 'indeed', 'glassdoor'], 'maxItems': 150},
  ['searchQueries', 'countries', 'remoteOnly', 'postedWithinDays', 'sources'])
t('all-in-one-jobs-scraper', 'companies-hiring-sales-reps-leads', 'Find Companies Hiring Sales Reps (B2B Leads)',
  'Companies that posted SDR and account executive jobs in the last 7 days on LinkedIn, Indeed and Glassdoor, one row per company with job count, teams, titles, size, industry and website. Hiring is a buying signal.',
  'Companies Hiring Sales Reps – B2B Leads from Job Posts',
  'B2B lead list: companies hiring SDRs and account executives on LinkedIn, Indeed and Glassdoor this week, with job count, size, industry and website.',
  {'searchQueries': ['sales development representative', 'account executive'], 'countries': ['US'], 'postedWithinDays': 7, 'sources': ['linkedin', 'indeed', 'glassdoor'], 'outputMode': 'companies', 'excludeStaffingAgencies': True, 'maxItemsPerCompany': 300, 'maxItems': 200},
  ['searchQueries', 'countries', 'postedWithinDays', 'outputMode'], view='companies')
t('all-in-one-jobs-scraper', 'nurse-jobs-australia-all-sites', 'Registered Nurse Jobs in Australia from Every Job Site',
  'Registered nurse jobs in Australia from SEEK, Indeed, LinkedIn and Glassdoor in one list without duplicates, with salary, hospital, location and apply link.',
  'Nurse Jobs Australia – SEEK, Indeed, LinkedIn in One List',
  'Registered nurse jobs in Australia from SEEK, Indeed, LinkedIn and Glassdoor, no duplicates: salary, employer, location, apply link. Daily alerts.',
  {'searchQueries': ['registered nurse'], 'countries': ['AU'], 'postedWithinDays': 7, 'maxItems': 150},
  ['searchQueries', 'countries', 'postedWithinDays'])
# --- Indeed
t('indeed-jobs-scraper', 'indeed-jobs-london-salaries', 'Indeed Jobs in London with Salaries',
  'Marketing jobs in London from Indeed UK posted in the last 7 days, with salary as numbers, job type, remote or hybrid, company and apply link.',
  'Indeed UK Jobs in London with Salaries – Export to Sheets',
  'Scrape Indeed UK job listings in London with salary as numbers, job type, remote or hybrid, company and apply link. Any keyword, daily alerts.',
  {'searchQueries': ['marketing manager'], 'country': 'GB', 'location': 'London', 'postedWithinDays': 7, 'maxItems': 150},
  ['searchQueries', 'country', 'location', 'postedWithinDays'])
t('indeed-jobs-scraper', 'companies-hiring-on-indeed', 'Companies Hiring Software Engineers on Indeed',
  'One row per company that posted software engineer jobs on Indeed in the US this week: number of jobs, teams, titles, places, pay range, size and website. A lead list of growing tech teams.',
  'Companies Hiring Software Engineers – Indeed Lead List',
  'Lead list from Indeed: US companies hiring software engineers this week, with job count, pay range, size, industry and website. One row per company.',
  {'searchQueries': ['software engineer'], 'country': 'US', 'postedWithinDays': 7, 'outputMode': 'companies', 'excludeStaffingAgencies': True, 'maxItemsPerCompany': 300, 'maxItems': 150},
  ['searchQueries', 'country', 'postedWithinDays', 'outputMode'], view='companies')
# --- LinkedIn
t('linkedin-jobs-scraper', 'linkedin-remote-product-manager-jobs', 'Remote Product Manager Jobs on LinkedIn, Last 24 Hours',
  'Remote product manager jobs posted on LinkedIn in the last 24 hours, with company, seniority, applicants, Easy Apply and the job link. Run daily for fresh jobs only.',
  'LinkedIn Remote Product Manager Jobs – Posted Last 24h',
  'Fresh remote product manager jobs from LinkedIn, last 24 hours: company, seniority, applicants, Easy Apply, link. No login. Daily job alert.',
  {'searchQueries': ['product manager'], 'location': 'United States', 'postedWithinDays': 1, 'keywords': ['remote'], 'maxItems': 100},
  ['searchQueries', 'location', 'postedWithinDays'])
t('linkedin-jobs-scraper', 'companies-hiring-in-berlin-linkedin', 'Companies Hiring Developers in Berlin (LinkedIn)',
  'One row per company hiring software developers in Berlin on LinkedIn this week, with job count, titles and company page: a list of growing tech teams for recruiters and sales.',
  'Companies Hiring Developers in Berlin – LinkedIn Leads',
  'Companies hiring software developers in Berlin on LinkedIn this week: job count, titles and company page. Leads for recruiters and B2B sales.',
  {'searchQueries': ['software developer'], 'location': 'Berlin, Germany', 'postedWithinDays': 7, 'outputMode': 'companies', 'excludeStaffingAgencies': True, 'maxItemsPerCompany': 300, 'maxItems': 150},
  ['searchQueries', 'location', 'postedWithinDays', 'outputMode'], view='companies')
# --- Glassdoor
t('glassdoor-jobs-scraper', 'jobs-at-top-rated-companies', 'Jobs at Top-Rated Companies on Glassdoor (4+ Stars)',
  'Data scientist jobs in the US only at companies rated 4 stars or more on Glassdoor, with salary or Glassdoor\'s salary estimate, company size, industry and apply link.',
  'Glassdoor Jobs at 4+ Star Companies – With Salary Estimates',
  'Glassdoor jobs only at companies rated 4+ stars: salary or salary estimate, company rating, size, industry, apply link. Any role, any country.',
  {'searchQueries': ['data scientist'], 'country': 'US', 'minCompanyRating': '4', 'postedWithinDays': 7, 'maxItems': 150},
  ['searchQueries', 'country', 'minCompanyRating', 'postedWithinDays'])
t('glassdoor-jobs-scraper', 'glassdoor-salary-estimates-by-role', 'Glassdoor Salary Estimates for a Role and City',
  'Software engineer jobs in New York from Glassdoor with the posted salary or Glassdoor\'s salary estimate (min, median, max) for each job: a quick salary benchmark.',
  'Glassdoor Salary Estimates – Software Engineer, New York',
  'Salary benchmark from Glassdoor job posts: posted salary or Glassdoor estimate (min, median, max) per job, company rating and size. Any role, any city.',
  {'searchQueries': ['software engineer'], 'country': 'US', 'location': 'New York, NY', 'postedWithinDays': 14, 'maxItems': 150},
  ['searchQueries', 'country', 'location'])
# --- AliExpress
t('aliexpress-search-scraper', 'aliexpress-best-sellers-exact-sales', 'AliExpress Best Sellers with Exact Sales Numbers',
  'Best-selling phone accessories on AliExpress sorted by orders, with the exact sold count instead of "10,000+ sold", price and regular price, rating and delivery days to the US.',
  'AliExpress Best Sellers – Exact Sold Count, Product Research',
  'Find winning AliExpress products: best sellers by orders with exact sold count, price, discount, rating and delivery days. Dropshipping research.',
  {'searchQueries': ['phone holder', 'magnetic phone case'], 'sort': 'orders', 'maxItemsPerSearch': 120, 'shipTo': 'US', 'minRating': 4.5},
  ['searchQueries', 'sort', 'shipTo', 'minRating'])
t('aliexpress-search-scraper', 'aliexpress-us-warehouse-products', 'AliExpress Products Shipping from US Warehouses',
  'AliExpress products that ship from US warehouses, with delivery days and dates, price, sold count and rating: fast-shipping products for dropshipping in the United States.',
  'AliExpress US Warehouse Products – Fast Shipping',
  'AliExpress products shipped from US warehouses: delivery days, price, exact sold count, rating. Find fast-shipping dropshipping products in minutes.',
  {'searchQueries': ['pet hair remover', 'led strip lights'], 'sort': 'orders', 'maxItemsPerSearch': 120, 'shipTo': 'US', 'shipFrom': 'US'},
  ['searchQueries', 'shipTo', 'shipFrom', 'sort'])
# --- Google Trends
t('google-trends-scraper', 'compare-keywords-google-trends', 'Compare Keyword Popularity on Google Trends (5 Years)',
  'Compare any number of keywords on one scale over 5 years in Google Trends, with trend direction, seasonality, top regions and rising related queries. Beyond the 5-keyword limit of the website.',
  'Compare Keywords on Google Trends – Unlimited, One Scale',
  'Compare unlimited keywords on one Google Trends scale: interest over 5 years, trend direction, seasonality, top regions, rising queries.',
  {'keywords': ['matcha', 'cold brew', 'kombucha', 'yerba mate', 'chai', 'oat milk'], 'locations': ['US'], 'timeRange': 'today 5-y', 'compareOnOneScale': True, 'includeRelatedQueries': True},
  ['keywords', 'locations', 'timeRange', 'compareOnOneScale'])
t('google-trends-scraper', 'google-trending-searches-today', 'Trending Searches Today on Google (Trending Now)',
  'What people search on Google right now in the US, UK and India: Trending Now with search volume, growth, start time and related searches. Run hourly or daily for content ideas.',
  'Google Trending Now – Today\'s Trending Searches by Country',
  'Get Google Trending Now searches for any country: search volume, growth, start time, related searches. Run hourly for news and content ideas.',
  {'trendingLocations': ['US', 'GB', 'IN'], 'trendingHours': '24', 'maxTrendingPerLocation': 50},
  ['trendingLocations', 'trendingHours'], view='trending')
# --- Google Ads Transparency
t('google-ads-transparency-scraper', 'competitor-google-ads-with-text', 'See All Google Ads of a Competitor, with Ad Copy',
  'Every Google ad that points to a competitor\'s website, from the Ads Transparency Center, with headline, description, format, first and last shown dates and a link to each ad.',
  'Competitor Google Ads with Ad Copy – Ads Transparency Center',
  'Get every Google ad of a competitor website: headline, description, format, dates shown, ad link. From the Google Ads Transparency Center.',
  {'queries': ['nike.com'], 'region': 'US', 'platforms': ['SEARCH'], 'maxAdsPerSearch': 100, 'includeAdText': True},
  ['queries', 'region', 'platforms', 'maxAdsPerSearch'])
t('google-ads-transparency-scraper', 'new-competitor-google-ads-monitor', 'Monitor New Google Ads of Your Competitors',
  'Run it daily or weekly and get only the Google ads your competitors launched since the last run, with ad copy, format and dates. A competitor ad alert for Slack or email.',
  'New Competitor Google Ads Alert – Ads Transparency Monitor',
  'Get only new Google ads of your competitors since the last run: ad copy, format, dates, link. Schedule daily for competitor ad alerts.',
  {'queries': ['hellofresh.com', 'factor75.com'], 'region': 'US', 'maxAdsPerSearch': 200, 'includeAdText': True, 'onlyNewAds': True, 'monitorStoreName': 'meal-kit-ads-monitor'},
  ['queries', 'region', 'onlyNewAds'])
# --- Google News
t('google-news-scraper', 'google-news-headlines-by-topic', 'Daily Business and Tech Headlines from Google News',
  'Top business and technology stories from Google News for the US and UK editions, with source, time and the publisher\'s URL. A daily news digest for Slack, email or a newsletter.',
  'Google News Headlines by Topic – Business & Tech, Daily',
  'Daily Google News business and technology headlines for any country: title, source, time, publisher URL. Build a news digest or newsletter feed.',
  {'topics': ['BUSINESS', 'TECHNOLOGY'], 'edition': 'US:en', 'maxItemsPerFeed': 50, 'maxItems': 100, 'resolveUrls': True},
  ['topics', 'edition'])
# --- other job sites, one each
def job(actor, name, title, desc, seo, seod, input, fields):
    t(actor, name, title, desc, seo, seod, input, fields)
job('greenhouse-jobs-scraper', 'greenhouse-jobs-tech-companies', 'All Open Jobs at Tech Companies on Greenhouse',
    'Every open job on the Greenhouse career sites of Airbnb, Stripe and Discord, with department, location, remote flag, salary where posted and apply link. Track company hiring daily.',
    'Greenhouse Jobs – Open Roles at Airbnb, Stripe, Discord',
    'Get all open jobs from Greenhouse career sites: title, department, location, remote, salary, apply link. Any company, daily hiring tracking.',
    {'companies': ['airbnb', 'stripe', 'discord'], 'maxItems': 300}, ['companies'])
job('lever-jobs-scraper', 'lever-jobs-startups', 'Open Jobs at Startups Using Lever',
    'Open jobs from the Lever career sites of Palantir and Zoox, with team, location, workplace type, salary range where posted and apply link.',
    'Lever Jobs Scraper – Open Roles at Palantir, Zoox and More',
    'Get every open job from Lever career sites: title, team, location, remote, salary range, apply link. Any company, track hiring daily.',
    {'companies': ['palantir', 'zoox'], 'maxItems': 300}, ['companies'])
job('ashby-jobs-scraper', 'ashby-jobs-ai-companies', 'Open Jobs at AI Companies on Ashby',
    'Every open role on the Ashby career sites of OpenAI, Ramp and Notion, with department, location, remote flag, compensation where posted and apply link.',
    'Ashby Jobs Scraper – Open Roles at OpenAI, Ramp, Notion',
    'Get all open jobs from Ashby career sites: title, department, location, remote, compensation, apply link. Any company, daily hiring tracking.',
    {'companies': ['openai', 'ramp', 'notion'], 'maxItems': 300}, ['companies'])
job('workday-jobs-scraper', 'workday-jobs-nvidia-engineering', 'Engineering Jobs at NVIDIA from Workday',
    'Engineering jobs from NVIDIA\'s Workday career site with location, posted date, requisition ID and apply link. Works with any company that uses Workday.',
    'Workday Jobs Scraper – NVIDIA Engineering Jobs Example',
    'Scrape any Workday career site: job title, location, posted date, requisition ID, apply link. Example: NVIDIA engineering jobs.',
    {'companies': ['https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite'], 'keywords': ['engineer'], 'maxItems': 200}, ['companies', 'keywords'])
job('dice-jobs-scraper', 'dice-remote-devops-jobs', 'Remote DevOps Jobs on Dice',
    'Remote DevOps and cloud engineer jobs on Dice posted in the last 7 days, with skills, salary, employment type, employer type and apply link.',
    'Dice Remote DevOps Jobs – Skills, Salary, Apply Link',
    'Remote DevOps and cloud jobs from Dice, last 7 days: skills, salary, contract or full-time, employer type, apply link. US tech job alerts.',
    {'searchQueries': ['devops engineer'], 'workplaceTypes': ['Remote'], 'postedDate': 'SEVEN', 'maxItems': 150}, ['searchQueries', 'workplaceTypes', 'postedDate'])
job('welcome-to-the-jungle-jobs-scraper', 'wttj-product-jobs-paris', 'Product Jobs in France on Welcome to the Jungle',
    'Product manager jobs in France from Welcome to the Jungle with company, contract type, remote policy, experience level, salary where posted and apply link.',
    'Welcome to the Jungle Jobs – Product Manager, France',
    'Scrape Welcome to the Jungle jobs: company, contract type, remote policy, experience, salary, apply link. France and Europe, daily alerts.',
    {'searchQueries': ['product manager'], 'countries': ['FR'], 'maxItems': 150}, ['searchQueries', 'countries'])
job('seek-jobs-scraper', 'seek-nurse-jobs-sydney', 'Nurse Jobs in Sydney on SEEK',
    'Registered nurse jobs in Sydney from SEEK posted in the last 7 days, with salary, work type, employer rating and apply link.',
    'SEEK Nurse Jobs Sydney – Salary, Employer, Apply Link',
    'SEEK job listings for nurses in Sydney, last 7 days: salary, work type, employer, rating, apply link. Australia and New Zealand job alerts.',
    {'searchQueries': ['registered nurse'], 'country': 'AU', 'location': 'Sydney NSW', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'country', 'location', 'postedWithinDays'])
job('stepstone-jobs-scraper', 'stepstone-developer-jobs-munich', 'Software Developer Jobs in Munich on StepStone',
    'Software developer jobs in Munich from StepStone Germany with company, salary where shown, contract type, remote option and apply link.',
    'StepStone Jobs München – Software Developer, Salary, Remote',
    'StepStone Germany jobs in Munich: software developer roles with company, salary, contract type, remote option, apply link. Daily job alerts.',
    {'searchQueries': ['software developer'], 'location': 'München', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'location', 'postedWithinDays'])
job('jobstreet-jobs-scraper', 'jobstreet-marketing-jobs-singapore', 'Marketing Jobs in Singapore on Jobstreet',
    'Marketing jobs in Singapore from Jobstreet posted in the last 7 days, with salary, work type, employer and apply link.',
    'Jobstreet Singapore Marketing Jobs – Salary and Employer',
    'Jobstreet job listings in Singapore, Malaysia, Philippines, Indonesia: salary, work type, employer, apply link. Example: marketing jobs.',
    {'searchQueries': ['marketing'], 'country': 'SG', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'country', 'postedWithinDays'])
job('jobsdb-jobs-scraper', 'jobsdb-accounting-jobs-hong-kong', 'Accounting Jobs in Hong Kong on JobsDB',
    'Accountant jobs in Hong Kong from JobsDB posted in the last 7 days, with salary, work type, employer and apply link.',
    'JobsDB Hong Kong Accounting Jobs – Salary and Employer',
    'JobsDB job listings in Hong Kong and Thailand: salary, work type, employer, apply link. Example: accountant jobs in Hong Kong.',
    {'searchQueries': ['accountant'], 'country': 'HK', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'country', 'postedWithinDays'])
job('reed-jobs-scraper', 'reed-jobs-manchester-salaries', 'Reed Jobs in Manchester with Salaries',
    'Jobs in Manchester from Reed.co.uk posted in the last 7 days, with salary range, contract type, hours, employer type and apply link.',
    'Reed UK Jobs in Manchester – Salaries, Contract, Apply Link',
    'Reed.co.uk job listings for any UK city: salary range, permanent or contract, hours, direct or agency, apply link. Example: Manchester.',
    {'searchQueries': ['project manager'], 'location': 'Manchester', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'location', 'postedWithinDays'])
job('infojobs-jobs-scraper', 'infojobs-empleo-madrid', 'Ofertas de Empleo en Madrid en InfoJobs',
    'Sales jobs in Madrid from InfoJobs Spain with salary, contract type, workday, remote option, company and apply link.',
    'InfoJobs Madrid – Ofertas de Empleo con Salario',
    'Scrape InfoJobs Spain job offers for any province: salary, contract, workday, remote, company, apply link. Example: sales jobs in Madrid.',
    {'searchQueries': ['comercial'], 'provinces': ['33'], 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'provinces', 'postedWithinDays'])
job('wellfound-jobs-scraper', 'wellfound-startup-jobs-remote', 'Remote Startup Jobs on Wellfound (AngelList)',
    'Remote software engineer jobs at startups from Wellfound, with salary and equity ranges, company stage and size, and the job link.',
    'Wellfound Remote Startup Jobs – Salary and Equity',
    'Wellfound (AngelList Talent) startup jobs: salary range, equity, company stage and size, remote policy, link. Example: remote engineers.',
    {'searchQueries': ['software engineer'], 'remoteOnly': True, 'maxItems': 150}, ['searchQueries', 'remoteOnly'])
job('xing-jobs-scraper', 'xing-jobs-hamburg', 'Jobs in Hamburg on Xing',
    'Sales jobs in Hamburg from Xing with company, salary estimate, employment type, workplace type and apply link.',
    'Xing Jobs Hamburg – Vertrieb, Salary Estimates, Company',
    'Xing job listings for Germany, Austria and Switzerland: company, salary estimate, employment type, remote, apply link. Example: sales in Hamburg.',
    {'searchQueries': ['Vertrieb'], 'location': 'Hamburg', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'location', 'postedWithinDays'])
job('foundit-jobs-scraper', 'foundit-it-jobs-bangalore', 'IT Jobs in Bangalore on Foundit (Monster India)',
    'Java developer jobs in Bangalore from Foundit, formerly Monster India, with experience range, skills, salary where shown and apply link.',
    'Foundit Jobs Bangalore – Java Developer, Experience, Skills',
    'Foundit (Monster India) job listings: experience range, skills, salary, company, apply link. India, Gulf and Southeast Asia. Example: Bangalore.',
    {'searchQueries': ['java developer'], 'country': 'IN', 'location': 'Bangalore', 'postedWithinDays': 7, 'maxItems': 150}, ['searchQueries', 'country', 'location', 'postedWithinDays'])

errors = []
for x in T:
    for k, lim in [('title', 63), ('description', 400), ('seoTitle', 60), ('seoDescription', 160)]:
        if len(x[k]) > lim or (k == 'title' and len(x[k]) < 3): errors.append(f"{x['name']} {k} {len(x[k])}")
    for f in x['fields']:
        if f not in x['input']: errors.append(f"{x['name']} field {f} not in input")
json.dump(T, open('tasks.json', 'w'), indent=1, ensure_ascii=False)
print(len(T), 'tasks;', 'errors:', errors or 'none')
