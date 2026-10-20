# Google Trends Scraper: Unlimited Keywords & Trending Now

Export Google Trends data for **any number of keywords and countries**: interest over time, interest by region, city and metro area, top and rising related queries, and the **Trending now** lists with search volumes. Every keyword comes with ready **insights**: average, peak, latest value, recent change, year-over-year change, trend direction and the best month of the season. Compare everything on **one 0–100 scale** without Google's limit of 5 terms. No browser, no login, no API key. **$2 per 1,000 keyword reports, $0.50 per 1,000 trending searches.**

## What can this Google Trends scraper do?

- 📈 **Interest over time** for any time range on the Google Trends website: past hour, 4 hours, day, 7 days, 30 days, 90 days, 12 months, 5 years, since 2004, or your own dates.
- 📅 **Daily data for 5 years or since 2004**: Google gives days only for periods up to about 9 months. Turn on **Daily data for long periods** and every keyword gets one value per day for any period. The Actor reads the days in windows and ties each window to Google's weekly or monthly series, so the days stay on one scale: in our test, 5 years of daily "matcha" matched Google's weekly curve with a correlation of 0.998 and no drift between windows.
- ⚖️ **Unlimited keywords on one scale**: Google compares at most 5 terms at a time. Turn on **Compare on one scale** and the Actor compares 10, 50 or 200 keywords and countries on one 0–100 scale. The numbers equal Google's own comparison, and small keywords get decimals (`0.37`) instead of Google's `0` and `<1`.
- 💡 **Insights in every record**: average interest, peak and its date, latest complete value, change of the last 4 periods against the 4 before (the last week against the week before for daily data), year-over-year change, trend direction (rising, stable, falling), and the best and worst month of the season. Ready to sort and filter, with no spreadsheet formulas.
- 🗺️ **Interest by region**: states and provinces, countries for worldwide searches, **cities** (with coordinates) or US **metro areas (DMA)**.
- 🔎 **Related queries**: top and rising, with `Breakout` marked. Each query is flagged when it does not contain your keyword and when it looks like spam (web addresses, emoji), because rising lists also carry bot traffic.
- 🆕 **Only new rising queries**: for weekly monitoring, save a keyword only when it has rising queries that earlier runs did not see, listed in `newRisingQueries`. Keywords without anything new are not saved and not charged.
- 🔥 **Trending now**: the full list for a country or region for the past 4 hours, 24 hours, 48 hours or 7 days, often 200–500 searches, not just the 10 of Google's RSS feed. Each comes with its search volume (`200K+`), growth, start time, whether it is still trending, categories and related searches.
- 🌍 **Many countries in one run**: every keyword is checked in every country or region you add (`US`, `GB`, `US-CA`, `DE-BY`), by code or by name.
- 🏷️ **Topics, categories and search types**: search a keyword as a Google topic ("Coffee", the drink, in all languages), limit data to one of Google's categories, and measure web, image, news, Google Shopping or YouTube search.
- 🔗 **Explore links**: paste links from the Google Trends website and get exactly the same comparison as data.
- 🛡️ **Built to finish**: the Actor keeps Google sessions, opens a new one when Google limits a session, and moves to residential addresses if limits continue. Partial problems (for example no city data for a small country) are noted in the record instead of failing the run.

## What data does it extract?

**Keyword reports** (`type: "interest"`), one per keyword and location:

| Field | Example |
|---|---|
| `keyword` / `location` / `locationName` | matcha / US / United States |
| `timeRange` / `startDate` / `endDate` / `resolution` | today 5-y / 2021-10-17 / 2026-10-18 / WEEK |
| `averageInterest` / `peakInterest` / `peakDate` | 44.4 / 100 / 2026-04-12 |
| `latestInterest` / `latestDate` | 62 / 2026-10-11 |
| `recentChangePercent` / `yearOverYearPercent` | −11 / 22.2 |
| `trendDirection` / `trendPercent` | rising / 160.3 |
| `bestMonth` / `worstMonth` / `seasonalityPercent` | April / November / 57.3 |
| `topRegion` / `topRelatedQuery` / `topRisingQuery` | Hawaii / matcha tea / ryze matcha |
| `interestOverTime` | every point: `date`, `value`, `isPartial` |
| `interestByRegion` | `geoCode`, `geoName`, `value` (and `lat`, `lng` for cities) |
| `relatedQueriesTop` / `relatedQueriesRising` | `query`, `value` or `increase`, `isBreakout`, `containsKeyword`, `looksLikeSpam` |
| `newRisingQueries` | with **Only new rising queries**: the rising queries not seen in earlier runs |
| `oneScale` / `comparedWith` | true / ["coffee (US)", "tea (US)"] |
| `topicTitle` / `category` / `searchType` | Coffee / 71 (Food & Drink) / youtube |
| `trendsUrl` | the same view on the Google Trends website |

**Trending searches** (`type: "trending"`): `location`, `rank`, `term`, `searchVolume` (200000), `searchVolumeText` (200K+), `increasePercent`, `startedAt`, `endedAt`, `isActive`, `categories`, `relatedSearches`, `exploreUrl`.

## How to scrape Google Trends

1. Enter your **keywords** and **locations** (leave locations empty for worldwide).
2. Pick a **time range**. Turn on **Compare on one scale** to compare popularity; leave it off to see each keyword's own trend.
3. Optionally add **Trending now** locations, or paste **explore links** from the Google Trends website.
4. Click **Start** and download the results as JSON, CSV, Excel or HTML, or use them through the API. The **Keyword insights** and **Trending now** tabs show the main fields as tables.

A step-by-step guide with Python examples, 15 drinks on one scale and a check against Google's own numbers: [How to Compare More Than 5 Keywords in Google Trends on One Scale](https://medium.com/@robertkhairislamov/how-to-compare-more-than-5-keywords-in-google-trends-on-one-scale-88bb538fcc4c).

### Example input

```json
{
  "keywords": ["matcha", "cold brew", "kombucha", "yerba mate", "hojicha", "chai"],
  "locations": ["US", "GB"],
  "timeRange": "today 5-y",
  "compareOnOneScale": true,
  "includeInterestByRegion": true,
  "regionResolution": "default",
  "includeRelatedQueries": true,
  "trendingLocations": ["US"],
  "trendingHours": "24",
  "trendingCategories": ["Food and Drink"]
}
```

Time ranges are `now 1-H`, `now 4-H`, `now 1-d`, `now 7-d`, `today 1-m`, `today 3-m`, `today 12-m`, `today 5-y`, `all` and `custom` with `startDate` and `endDate`.

### Example output

A keyword report (lists shortened):

```json
{
  "type": "interest",
  "keyword": "matcha",
  "searchedFor": "matcha",
  "location": "US",
  "locationName": "United States",
  "timeRange": "today 5-y",
  "timeRangeName": "Past 5 years",
  "startDate": "2021-10-17",
  "endDate": "2026-10-18",
  "resolution": "WEEK",
  "category": 0,
  "categoryName": "All categories",
  "searchType": "web",
  "oneScale": false,
  "comparedWith": null,
  "hasData": true,
  "averageInterest": 44.4,
  "peakInterest": 100,
  "peakDate": "2026-04-12",
  "latestInterest": 62,
  "latestDate": "2026-10-11",
  "recentChangePercent": -11,
  "yearOverYearPercent": 22.2,
  "trendDirection": "rising",
  "trendPercent": 160.3,
  "bestMonth": "April",
  "worstMonth": "November",
  "seasonalityPercent": 57.3,
  "topRegion": "Hawaii",
  "topRelatedQuery": "matcha tea",
  "topRisingQuery": "ryze matcha",
  "interestOverTime": [
    { "date": "2026-10-04", "value": 63, "isPartial": false },
    { "date": "2026-10-11", "value": 62, "isPartial": false },
    { "date": "2026-10-18", "value": 62, "isPartial": true }
  ],
  "interestByRegion": [
    { "geoCode": "US-HI", "geoName": "Hawaii", "value": 100 },
    { "geoCode": "US-CA", "geoName": "California", "value": 81 }
  ],
  "relatedQueriesTop": [
    { "query": "matcha tea", "value": 100, "containsKeyword": true, "exploreUrl": "https://trends.google.com/trends/explore?q=matcha+tea&date=today+5-y&geo=US" }
  ],
  "relatedQueriesRising": [
    { "query": "ryze matcha", "increase": "Breakout", "increasePercent": 37100, "isBreakout": true, "containsKeyword": true, "looksLikeSpam": false, "exploreUrl": "https://trends.google.com/trends/explore?q=ryze+matcha&date=today+5-y&geo=US" }
  ],
  "trendsUrl": "https://trends.google.com/trends/explore?date=today+5-y&geo=US&q=matcha&hl=en-US",
  "warnings": null,
  "scrapedAt": "2026-10-20T06:03:40.487Z"
}
```

A trending search:

```json
{
  "type": "trending",
  "location": "GB",
  "locationName": "United Kingdom",
  "hours": 24,
  "rank": 1,
  "term": "spurs vs coventry",
  "searchVolume": 200000,
  "searchVolumeText": "200K+",
  "increasePercent": 1000,
  "startedAt": "2026-10-19T16:10:00.000Z",
  "endedAt": null,
  "isActive": true,
  "categories": ["Sports"],
  "relatedSearches": ["tottenham", "spurs", "james maddison", "tottenham vs coventry"],
  "exploreUrl": "https://trends.google.com/trends/explore?date=now+1-d&geo=GB&q=spurs+vs+coventry&hl=en-US",
  "scrapedAt": "2026-10-20T05:51:35.341Z"
}
```

## How does the one-scale comparison work?

Google Trends shows every comparison on its own 0–100 scale, where 100 is the highest point of the compared terms, and it compares at most 5 at a time. To put more on one scale, the Actor first finds the keyword with the highest peak by comparing groups of five, then compares every other keyword next to it and rescales each group by how that keyword came out. The result equals what Google would show if it compared all your keywords at once. In our tests the overlapping keywords matched Google's own five-term comparison exactly.

Google rounds to whole numbers, so next to a big keyword small ones become `0`, `1` or `<1`. The Actor then measures the small keywords again in groups led by a keyword only a little bigger than them, and brings them back to the shared scale. They get decimals, for example `0.34` for "yerba mate" next to "coffee" at 100. This costs a few extra requests and no extra charge.

## Use cases

- **SEO and content planning**: find which topics and queries are rising, when in the year people search for them, and which regions care most.
- **Product and market research**: compare demand for products, brands or features across countries on one scale, and see whether interest is growing year over year.
- **Ecommerce and seasonality**: get the best month of each product category to plan stock, campaigns and prices.
- **Newsrooms and social media**: follow Trending now with search volumes and related searches every few hours.
- **Investors and analysts**: track interest in companies, products and tickers as an alternative data signal.
- **Datasets and AI**: clean time series and insights for dashboards, forecasting and LLM pipelines.

## How much does it cost?

You pay only for results:

| Event | Free plan | Starter | Scale | Business |
|---|---|---|---|---|
| Keyword report (one keyword in one location, with timeline, regions, related queries and insights) | $2.00 / 1,000 | $1.80 / 1,000 | $1.60 / 1,000 | $1.40 / 1,000 |
| Trending search (one record of a Trending now list) | $0.50 / 1,000 | $0.45 / 1,000 | $0.40 / 1,000 | $0.35 / 1,000 |

There is no start fee, and the extra requests of the one-scale comparison are free. Example: 50 keywords in 2 countries cost 100 reports, $0.20. The $5 monthly credit of the Apify free plan covers about 2,500 keyword reports. To cap a run's cost, set the maximum charge in the run options; the Actor stops cleanly when it is reached.

## Tips

- **Trend shape or popularity?** For the shape of each keyword's trend (season, growth), leave **Compare on one scale** off: each keyword gets the full 0–100 range. To rank keywords by popularity, turn it on.
- **Weekly tracking**: save your input as a task and add a schedule; connect the dataset to Google Sheets to build a chart over time.
- **New rising queries every week**: turn on **Only new rising queries**, save the input as a task and schedule it weekly. Each run returns only the keywords with rising searches you have not seen yet, in `newRisingQueries`, and you pay only for those.
- **Daily data for long periods**: with **Daily data for long periods**, 5 years take about a minute per keyword, since Google answers 8 windows of 250 days for each. The current day is marked `isPartial`.
- **Big Trending now lists**: 48 hours or 7 days can hold 1,000+ searches per country. Set **Trending now: maximum per location** (for example 50) or pick categories to keep only what you need.
- **Rising queries**: filter `relatedQueriesRising` by `containsKeyword` to drop unrelated noise, and by `looksLikeSpam` to drop spam.
- **News behind a trend**: run our [Google News Scraper](https://apify.com/robertosan16/google-news-scraper) with the trending term.
- **Errors per keyword**: see the `warnings` field of each record and the `SUMMARY` record in the run's key-value store.

## FAQ

**Why not just ask an AI chatbot?** A chatbot cannot read Google Trends for you: it guesses from what it learned or from a few articles, and gives no timeline. This Actor reads Google Trends itself and returns the numbers week by week, by region and with related queries, in the same fields every time, at a fixed price. AI agents can call it as a tool through Apify's MCP server.

**Are these search volumes?** No. Google Trends shows relative interest from 0 to 100, not the number of searches. Trending now is the exception: Google gives an approximate volume such as `200K+`.

**Why do numbers change a little between runs?** Google computes Trends from a sample of searches, so repeated requests can differ by a point or two, especially for small keywords and short time ranges. The last point is often incomplete; it is marked `isPartial` and left out of the insights.

**What about related topics?** Google currently returns related topics only to its own website and an empty list to every other client, so the Actor does not offer them. Related queries work.

**Is it legal to scrape Google Trends?** The Actor reads publicly available Google Trends data without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Google.

## Integrations and API

- **Google Sheets, Slack, email and BI tools**: connect the Actor to Make, Zapier or n8n, or use the **Integrations** tab of this Actor.
- **Webhooks**: call your own URL when a run finishes, for example to load the results into your database.
- **AI agents (MCP)**: add `https://mcp.apify.com?tools=robertosan16/google-trends-scraper` as an MCP server in Claude, Cursor or VS Code, and your agent can check trends and trending searches with this Actor.
- **API**: one request runs the Actor and returns the records, for runs of up to 5 minutes. Start longer runs with the `runs` endpoint and read the dataset when they finish.

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~google-trends-scraper/run-sync-get-dataset-items?token=YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["matcha","cold brew"],"locations":["US"],"timeRange":"today 12-m","compareOnOneScale":true}'
```

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
