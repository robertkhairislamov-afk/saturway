# App Store Scraper: Apps & Top Charts

Scrape the Apple App Store: **top charts** (top free, top paid, top grossing, iPhone and iPad, new apps) for any country and category, **keyword search rankings**, full **app details** and **developer catalogs**. Get ratings and ratings counts, prices, versions, update and release dates, sizes, content ratings, languages, descriptions and screenshots in clean JSON, CSV or Excel. Fast and light: no browser, no login, no API key. **$1 per 1,000 results.**

## What can this App Store scraper do?

- 🏆 **Top charts for any country**: top free, top paid and top grossing for iPhone and iPad, plus new apps, for all apps or any of 42 categories and kinds of games, up to 100 places each, with the rank of every app.
- 🔎 **Keyword search rankings**: up to 200 apps the App Store finds for a keyword, in order, for ASO keyword tracking and competitor research.
- 📱 **Full app details**: rating and ratings count (overall and for the current version), price and currency, content rating and advisories, version, release and update dates, what's new, size, minimum iOS version, iPad support, languages, description, icon and screenshots.
- 🏢 **Developer catalogs**: every app of a developer, by developer link or ID.
- 🌍 **Many countries in one run**: prices, charts, ratings and rankings differ by country, so every source is scraped for each country you add.
- 🤝 **Same output as our [Google Play Scraper](https://apify.com/robertosan16/google-play-scraper)**: the same field names for title, developer, rating, price, version and dates, so iOS and Android apps fit into one table.

## What data does it extract?

| Field | Example |
|---|---|
| `rank` / `source` | 1 / chart |
| `title` / `appId` / `bundleId` | Instagram / 389801252 / com.burbn.instagram |
| `developer` / `developerId` / `developerWebsite` | Instagram, Inc. / 389801255 / http://instagram.com/ |
| `score` / `ratingsCount` | 4.69 / 29,598,138 |
| `scoreCurrentVersion` / `ratingsCountCurrentVersion` | rating of the current version |
| `priceText` / `price` / `currency` / `free` | Free / 0 / USD / true |
| `genre` / `categories` | Photo & Video / Photo & Video, Social Networking |
| `contentRating` / `advisories` | 12+ / Infrequent/Mild Profanity or Crude Humor, … |
| `version` / `updatedAt` / `releasedAt` | 451.0.0 / 2026-10-12 / 2010-10-06 |
| `sizeBytes` / `minIosVersion` / `iPadSupport` / `languages` | 638082048 / 16.3 / true / EN, DE, … |
| `description` / `recentChanges` | texts from the App Store |
| `icon` / `screenshots` / `ipadScreenshots` | image links |
| `chart` / `chartGenre` / `searchTerm` / `country` | top_grossing / Games / – / US |

## How to scrape the App Store

1. Choose what to scrape: **top charts** and categories, **search keywords**, **apps** (links, IDs or bundle IDs) and **developers**. You can combine them.
2. Add the **countries**, for example `US`, `GB`, `DE`, `JP`.
3. Click **Start** and download the results as JSON, CSV, Excel or HTML, or use them through the API.

### Example input

```json
{
  "charts": ["top_free", "top_grossing"],
  "chartGenres": ["ALL", "6014"],
  "chartDepth": 100,
  "searchTerms": ["budget planner"],
  "developers": ["https://apps.apple.com/us/developer/meta-platforms-inc/id284882218"],
  "appIds": ["389801252", "com.spotify.client"],
  "countries": ["US", "GB"]
}
```

Charts are `top_free`, `top_paid`, `top_grossing`, `top_free_ipad`, `top_paid_ipad`, `top_grossing_ipad`, `new`, `new_free` and `new_paid`. Categories are Apple's genre IDs, such as `6014` for Games or `6015` for Finance, or `ALL`; in the form you simply pick them from a list.

### Example output

```json
{
  "appId": "389801252",
  "bundleId": "com.burbn.instagram",
  "url": "https://apps.apple.com/us/app/instagram/id389801252",
  "title": "Instagram",
  "developer": "Instagram, Inc.",
  "developerId": "389801255",
  "developerUrl": "https://apps.apple.com/us/developer/instagram-inc/id389801255",
  "seller": "Instagram, Inc.",
  "developerWebsite": "http://instagram.com/",
  "genre": "Photo & Video",
  "genreId": "6008",
  "categories": ["Photo & Video", "Social Networking"],
  "score": 4.69067,
  "ratingsCount": 29598138,
  "scoreCurrentVersion": 4.69067,
  "ratingsCountCurrentVersion": 29598138,
  "free": true,
  "price": 0,
  "currency": "USD",
  "priceText": "Free",
  "contentRating": "12+",
  "advisories": ["Infrequent/Mild Mature/Suggestive Themes", "Infrequent/Mild Profanity or Crude Humor"],
  "releasedAt": "2010-10-06T08:12:41Z",
  "updatedAt": "2026-10-12T18:25:41Z",
  "version": "451.0.0",
  "recentChanges": "Performance optimizations and stability improvements…",
  "minIosVersion": "16.3",
  "sizeBytes": 638082048,
  "languages": ["BN", "HR", "CS", "DA", "NL", "EN"],
  "iPadSupport": true,
  "gameCenter": false,
  "description": "Little moments lead to big friendships. Share yours on Instagram. — From Meta…",
  "icon": "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/41/41/0a/41410ad0-b22e-c93c-d4b1-7f14f8494e06/Prod-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg",
  "screenshots": ["https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/50/e2/8b/50e28b44-daa5-7101-6fb6-2d0e10fc72f3/1_iOS_5.5.jpg/392x696bb.jpg"],
  "ipadScreenshots": ["https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/76/04/4d/76044de8-e420-2e6b-cea4-60821fb85156/10.5__Following_tab.png/360x480bb.jpg"],
  "source": "app",
  "rank": null,
  "searchTerm": null,
  "chart": null,
  "chartGenre": null,
  "developerQuery": null,
  "country": "US",
  "scrapedAt": "2026-10-15T11:02:37.512Z"
}
```

## Use cases

- **App Store Optimization (ASO)**: track where your app ranks for keywords and in category charts, in every country, every day.
- **Market and competitor research**: see which apps lead a category, how they price, how often they update and how users rate them.
- **Top chart monitoring**: record top free, paid and grossing charts over time to spot rising apps and trends.
- **iOS and Android side by side**: run this Actor and our [Google Play Scraper](https://apify.com/robertosan16/google-play-scraper) with the same keywords and countries, and compare both stores in one table.
- **Investors and analysts**: follow ratings, chart positions and update activity of apps and publishers.
- **Datasets and AI**: clean, structured app metadata and descriptions for classification, search and LLM pipelines.

## How much does it cost?

You pay only for results: **$1 per 1,000 results**. That is the price on the Apify Free plan. Paid Apify plans pay less: $0.90 per 1,000 results on Starter, $0.80 on Scale and $0.70 on Business, which is the "from" price shown in Apify Store. There is no start fee. The Apify free plan covers about 5,000 results every month.

## Tips

- **Daily rank tracking**: save your input as a task and add a schedule. Every run records the current rank of each app, so you can chart positions over time.
- **Games charts**: pick "Games" or a kind of game, such as "Games: Puzzle", in **Chart categories**.
- **Many countries**: Apple runs a separate store in each country; add every country you need, and each source is scraped for each of them.
- **Errors per source**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why not just ask an AI chatbot?** A chatbot with web search knows some popular apps and reads a few store pages, so it cannot give you a full top chart for a country or every app that ranks for a keyword, and the ratings it repeats may be old. This Actor reads the App Store itself: whole charts, keyword rankings and developer catalogs, with ratings, ratings counts, prices and versions as numbers in the same fields every time, at a fixed price per 1,000 results. AI agents can call it as a tool through Apify's MCP server.

**Does it scrape reviews?** No. This Actor focuses on app data, charts and rankings, and does not collect reviewers' names or texts.

**Why does a chart have at most 100 apps?** That is how many places Apple lists for each chart. For more apps, add categories: each category has its own chart of 100.

**Does it show installs?** No. Apple does not publish install numbers; the ratings count is the closest public measure of an app's size.

**Is it legal to scrape the App Store?** The Actor collects publicly available app listings through Apple's public search, lookup and chart feeds, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Apple.

## Integrations and API

- **Google Sheets, Slack, email and BI tools**: connect the Actor to Make, Zapier or n8n, or use the **Integrations** tab of this Actor. Schedule it daily to track chart ranks and ratings over time.
- **Webhooks**: call your own URL when a run finishes, for example to load the results into your database.
- **AI agents (MCP)**: add `https://mcp.apify.com?tools=robertosan16/app-store-scraper` as an MCP server in Claude, Cursor or VS Code, and your agent can look up apps, top charts and search rankings with this Actor.
- **API**: one request runs the Actor and returns the apps, for runs of up to 5 minutes. Start longer runs with the `runs` endpoint and read the dataset when they finish.

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~app-store-scraper/run-sync-get-dataset-items?token=YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchTerms":["habit tracker"],"countries":["US"],"maxItems":20}'
```

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.

## 中文简介

**App Store 数据采集工具（苹果应用商店爬虫）**：抓取苹果 App Store 任意国家和分类的**免费榜、付费榜和畅销榜**（iPhone 和 iPad）以及新上架应用，每个榜单最多 100 名；按关键词抓取 App Store **搜索排名**（最多 200 个应用），用于 ASO 关键词排名追踪和竞品分析；获取应用详情：评分和评分数（全部版本及当前版本）、价格、版本、发布和更新日期、安装包大小、年龄分级、支持语言、描述和截图，以及一个开发者的全部应用。

适合应用出海、手游发行、ASO 优化和海外市场调研。一次运行可以覆盖多个国家。无需浏览器、无需登录、无需 API 密钥。Android 应用请使用字段相同的 [Google Play Scraper](https://apify.com/robertosan16/google-play-scraper)。

价格：每 1,000 条结果 1 美元，无启动费；Apify 免费套餐每月约可获取 5,000 条结果。

结果可导出为 JSON、CSV、Excel 或 HTML，也可以通过 API、定时任务、Webhook 或 n8n、Make、Zapier 接入。有问题请在 Issues 页面提问，或发邮件至 support@mozartstandard.com。
