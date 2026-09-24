# Google News Scraper

Search Google News by keyword or collect the latest headlines by topic, for 38 countries and languages. Get clean, structured articles with title, source, publication date, the Google News link and, optionally, the original article URL on the publisher's site. Fast and lightweight: no browser, no login, no API key.

## What can this Google News Scraper do?

- 🔎 **Search Google News by keyword**, with full support for Google News operators: `"exact phrase"`, `OR`, `-exclude`, `site:reuters.com`, `intitle:`.
- 🗂️ **Collect topic headlines**: World, Nation, Business, Technology, Entertainment, Sports, Science and Health, plus the Top stories front page.
- 🌍 **38 editions**: United States, United Kingdom, Germany, France, Spain, Brazil, India, Japan, Thailand and many more. Any other Google News edition works too.
- 📅 **Filter by time**: past hour, day, week, month or year, or any date range.
- 📈 **Get more than 100 results per query**: Google News returns at most about 100 articles per search, so the scraper searches each day of a date range separately and collects far more.
- 🔗 **Resolve publisher URLs** (optional): turn `news.google.com` redirect links into the real article URLs, ready for further processing.
- 🧩 **Related coverage**: clustered topic stories include the other outlets covering the same story.
- 🔁 **No duplicates** across queries, days and topics within a run.

## What data does it extract?

| Field | Example |
|---|---|
| `title` | Self-Driving Cars Are Getting Better. The Risks Are Getting Bigger. |
| `source` | The New York Times |
| `sourceUrl` | https://www.nytimes.com |
| `publishedAt` | 2026-09-24T10:21:39.000Z |
| `url` | https://www.nytimes.com/2026/09/22/business/self-driving-cars-tesla-fsd.html (with *Resolve publisher URLs*) |
| `googleNewsUrl` | https://news.google.com/rss/articles/CBMi… |
| `query` / `topic` | tesla / TECHNOLOGY |
| `edition` | US:en |
| `relatedArticles` | other outlets covering the same story (topics and top stories) |

## How to use it

1. Enter one or more **search queries**, pick **topics**, or enable **top stories**.
2. Choose the **country and language**.
3. Optionally set a **time range** or a **date range**, and enable **Resolve publisher URLs**.
4. Click **Start** and download the results as JSON, CSV, Excel or HTML, or use them via the API.

### Example input

```json
{
  "queries": ["artificial intelligence", "\"interest rates\" site:reuters.com"],
  "topics": ["BUSINESS", "TECHNOLOGY"],
  "edition": "US:en",
  "timeRange": "1d",
  "resolveUrls": true
}
```

### Example output

```json
{
  "title": "Tesla Roadster reveal is creating a unique options opportunity, says Mike Khouw",
  "source": "CNBC",
  "sourceUrl": "https://www.cnbc.com",
  "publishedAt": "2026-09-23T18:52:11.000Z",
  "url": "https://www.cnbc.com/2026/09/23/tesla-roadster-reveal-is-creating-a-unique-options-opportunity-says-mike-khouw.html",
  "googleNewsUrl": "https://news.google.com/rss/articles/CBMitgFBVV95cUxQQmt1…",
  "articleId": "CBMitgFBVV95cUxQQmt1…",
  "position": 2,
  "query": "tesla",
  "topic": null,
  "dateWindow": null,
  "edition": "US:en",
  "relatedArticles": [],
  "scrapedAt": "2026-09-24T10:51:38.097Z"
}
```

## Use cases

- **Media monitoring and PR**: track mentions of your brand, products or executives.
- **Competitive intelligence**: follow competitors, markets and industries every day.
- **Finance and trading**: collect news for tickers and companies for sentiment analysis.
- **AI and LLM pipelines**: feed fresh, structured news into agents, RAG systems and summaries.
- **Research**: build news datasets for a topic, country and period.

## How much does it cost?

You pay only for results: **$2 per 1,000 articles**, and **$1 per 1,000 resolved publisher URLs** when that option is on. There is no start fee. The Apify free plan covers thousands of articles per month.

## Tips

- **Scheduled monitoring**: run the Actor on a schedule with *From date* set to a relative date such as `1 day`, and get every new article since yesterday.
- **Big datasets**: set a long date range and keep *Search each day separately* on.
- **Precise searches**: use operators like `"exact phrase"`, `site:` and `-exclude` in the query.

## FAQ

**Is scraping Google News legal?** This Actor collects publicly available headlines and links, not personal data. Check the terms of the sources and your local laws for your use case.

**Why do some articles have `url: null`?** Resolving publisher URLs is optional. When it is on, a small share of links can still fail to resolve because of temporary Google limits; the Google News link is always present.

**Can I get the full article text?** Not yet. Enable *Resolve publisher URLs* and pass the URLs to a content extractor such as Website Content Crawler.

Found a bug or need a feature? Open an issue in the Issues tab and we will reply quickly.
