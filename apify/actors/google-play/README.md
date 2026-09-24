# Google Play Scraper: Apps & Top Charts

Scrape the Google Play Store: **top charts** (top free, top paid, top grossing) for any country and category, **keyword search rankings**, full **app details** and **developer catalogs**. Get ratings, rating histograms, installs, prices, in-app purchases, versions, update dates, developer contacts and descriptions in clean JSON, CSV or Excel. Fast and light: no browser, no login, no API key.

## What can this Google Play scraper do?

- 🏆 **Top charts for any country**: top free, top paid and top grossing, for all apps, all games or any of 54 categories, up to 200 places each, with the rank of every app.
- 🔎 **Keyword search rankings**: the apps Google Play shows for a keyword, in order, for ASO keyword tracking and competitor research.
- 📱 **Full app details**: rating, ratings count, 1–5 star histogram, installs (with Google's install estimate), price and discounts, in-app purchase range, ads, content rating, version, minimum Android version, release and update dates, what's new, description, icon, screenshots and video.
- 🏢 **Developer catalogs**: every app of a developer, by name, ID or link.
- 📇 **Developer contacts for B2B research**: the support email, website and privacy policy each app publishes on Google Play.
- 🌍 **Many countries in one run**: prices, charts and rankings differ by country, so every source is scraped for each country you add, in 30+ languages.
- ⚡ **Lists without details** when you need speed: thousands of chart positions in seconds.

## What data does it extract?

| Field | Example |
|---|---|
| `rank` / `source` | 1 / chart |
| `title` / `appId` | Royal Match / com.dreamgames.royalmatch |
| `developer` / `developerEmail` / `developerWebsite` | Dream Games, Ltd. / contact@dreamgames.com / https://dreamgames.com |
| `score` / `ratingsCount` / `histogram` | 4.58 / 10,793,185 / `{ "1": 388654, …, "5": 8222659 }` |
| `installs` / `minInstalls` / `maxInstalls` | 100,000,000+ / 100000000 / 370378754 |
| `priceText` / `price` / `currency` | Free / 0 / GBP |
| `inAppPurchaseRange` / `containsAds` | £0.79 - £99.99 / false |
| `genre` / `categories` | Puzzle / Puzzle, Casual |
| `version` / `updatedAt` / `releasedAt` | 38174 / 2026-08-28 / 2020-07-18 |
| `summary` / `description` / `recentChanges` | texts from the app page |
| `icon` / `screenshots` / `videoUrl` | image and video links |
| `chart` / `chartCategory` / `searchTerm` / `country` | topgrossing / GAME_PUZZLE / – / GB |

## How to scrape Google Play

1. Choose what to scrape: **top charts** and categories, **search keywords**, **apps** (package names or links) and **developers**. You can combine them.
2. Add the **countries**, for example `US`, `GB`, `DE`, `JP`, and pick the language.
3. Keep **Load full app details** on for complete data, or turn it off for fast lists.
4. Click **Start** and download the results as JSON, CSV, Excel or HTML, or use them through the API.

### Example input

```json
{
  "charts": ["topgrossing"],
  "chartCategories": ["GAME_PUZZLE", "GAME_CASUAL"],
  "chartDepth": 100,
  "searchTerms": ["habit tracker", "budget planner"],
  "appIds": ["com.spotify.music"],
  "developers": ["Dream Games, Ltd."],
  "countries": ["US", "GB", "DE"],
  "language": "en"
}
```

### Example output

```json
{
  "appId": "com.dreamgames.royalmatch",
  "url": "https://play.google.com/store/apps/details?id=com.dreamgames.royalmatch",
  "title": "Royal Match",
  "developer": "Dream Games, Ltd.",
  "developerId": "Dream Games, Ltd.",
  "developerUrl": "https://play.google.com/store/apps/developer?id=Dream+Games,+Ltd.",
  "developerEmail": "contact@dreamgames.com",
  "developerWebsite": "https://dreamgames.com",
  "privacyPolicyUrl": "https://dreamgames.com/en/privacy",
  "genre": "Puzzle",
  "genreId": "GAME_PUZZLE",
  "categories": [{ "id": "GAME_PUZZLE", "name": "Puzzle" }, { "id": "GAME_CASUAL", "name": "Casual" }],
  "score": 4.5771585,
  "ratingsCount": 10793185,
  "reviewsCount": 16973,
  "histogram": { "1": 388654, "2": 157665, "3": 511700, "4": 1512280, "5": 8222659 },
  "installs": "100,000,000+",
  "minInstalls": 100000000,
  "maxInstalls": 370378754,
  "free": true,
  "price": 0,
  "originalPrice": null,
  "currency": "GBP",
  "priceText": "Free",
  "offersInAppPurchases": true,
  "inAppPurchaseRange": "£0.79 - £99.99 if billed through Play",
  "containsAds": false,
  "contentRating": "PEGI 3",
  "contentRatingDescription": null,
  "releasedAt": "2020-07-18",
  "releasedText": "Jul 18, 2020",
  "updatedAt": "2026-08-28T16:32:18.000Z",
  "version": "38174",
  "minAndroidVersion": "7.0",
  "summary": "Decorate King Robert's Castle by solving puzzles along the way!",
  "description": "Welcome to Royal Match, the king of puzzle games! Swipe colors, solve …",
  "descriptionHtml": "Welcome to Royal Match, the king of puzz…",
  "recentChanges": "Are you ready for a fun new update?…",
  "icon": "https://play-lh.googleusercontent.com/RBnqZ3q_jjOREX6v49DGe4…",
  "headerImage": "https://play-lh.googleusercontent.com/UmAgRAe2pCoKUPVRv7bTY8…",
  "screenshots": ["https://play-lh.googleusercontent.com/3DKrw93wnfUX3QR1diWf-R…"],
  "videoUrl": null,
  "playPass": false,
  "preregistration": false,
  "source": "chart",
  "rank": 1,
  "searchTerm": null,
  "chart": "topgrossing",
  "chartCategory": "GAME_PUZZLE",
  "developerQuery": null,
  "country": "GB",
  "language": "en",
  "scrapedAt": "2026-09-24T16:21:28.997Z"
}
```

## Use cases

- **App Store Optimization (ASO)**: track where your app ranks for keywords and in category charts, in every country, every day.
- **Market and competitor research**: see which apps lead a category, how they monetize, how often they update and how users rate them.
- **Top chart monitoring**: record top free, paid and grossing charts over time to spot rising apps and trends.
- **B2B lead generation**: build lists of app publishers in a category with their support email and website.
- **Investors and analysts**: follow installs, ratings and chart positions of apps and publishers.
- **Datasets and AI**: clean, structured app metadata and descriptions for classification, search and LLM pipelines.

## How much does it cost?

You pay only for results: **$0.50 per 1,000 results**. There is no start fee. The Apify free plan covers about 10,000 results every month.

## Tips

- **Daily rank tracking**: save your input as a task and add a schedule. Every run records the current rank of each app, so you can chart positions over time.
- **Fast chart lists**: turn off **Load full app details** to get ranks, titles, developers, ratings, installs and prices of thousands of apps in seconds.
- **Games charts**: pick "All games" or a game genre in **Chart categories**.
- **Errors per source**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Does it scrape reviews?** No. This Actor focuses on app data, charts and rankings, and does not collect reviewers' names or texts.

**Why does a search return at most 30 apps?** That is how many apps Google Play shows for a keyword. For more apps of a category, use the top charts (up to 200 per chart).

**What is `maxInstalls`?** Google Play shows installs in ranges such as "100,000,000+"; `maxInstalls` is Google's own, more precise install figure included in the page data.

**Is it legal to scrape Google Play?** The Actor collects publicly available app listings. It does not collect reviews, and it leaves out developers' postal addresses and phone numbers. Check the terms that apply to your use case.

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
