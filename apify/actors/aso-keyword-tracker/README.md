# ASO Keyword Rank Tracker: App Store & Google Play

**Track where your apps and your competitors rank for any keyword on Google Play and the App Store, in any country.** Each run saves the ranked search results, your apps' positions (even outside the top), the change since the previous run, the store's search suggestions and a competition score for every keyword. Schedule it daily and you have an ASO rank tracker for a fraction of the cost of an ASO tool seat. **$2 per 1,000 rank rows, no start fee.**

## What can this ASO tracker do?

- 📈 **Keyword rankings in both stores**: the top 30 Google Play results and up to 200 App Store results for every keyword, store and country.
- ⭐ **Your apps' ranks**: add your apps (and your competitors') and get their position for every keyword, also when they are outside the top results you save.
- 🔁 **Changes since the last run**: previous rank, positions gained or lost, and apps new in the results. Ranks are remembered in your own Apify account.
- 💡 **Search suggestions**: the phrases the Google Play and App Store search boxes suggest for each keyword, to find new keywords to target.
- 🎯 **Competition score**: 0 to 100, how established the top 10 apps for a keyword are (installs on Google Play, ratings on the App Store).
- 🌍 **Any country**: US, GB, DE, JP, BR, IN and more; search suggestions for 49 App Store countries.

## What data does it extract?

**Ranks** (one row per app in the results):

| Field | Example |
|---|---|
| `keyword` / `store` / `country` | invoice maker / Google Play / US |
| `rank` / `previousRank` / `rankChange` | 11 / 12 / 1 (up one position) |
| `tracked` | true for your apps |
| `title` / `developer` | Zoho Invoice - Invoice Maker / Zoho Corporation |
| `installs` / `ratingsCount` / `score` | 1,000,000+ / — / 4.6 |
| `rankSource` | store: the order the store's own search shows |
| `url` | store link |

**Keywords** (one row per keyword, store and country, free):

| Field | Example |
|---|---|
| `competition` | 75 |
| `top10MedianInstalls` / `top10MedianRatings` | 1,000,000 / 22,813 |
| `trackedRanks` | your apps: rank, previous rank, change |
| `topApps` | the top 3 titles |
| `suggestions` | invoice maker free, invoice maker billing app, … |

## How to track keyword rankings

1. Enter your **keywords**, for example `invoice maker` and `estimate app`.
2. Add **your apps to track**: Google Play package names or links, App Store links or numeric ids. Add competitors too.
3. Pick the **stores** and **countries**.
4. Click **Start**. For daily tracking, save the input as a task and add a schedule: every run shows the change since the one before.

### Example input

```json
{
  "keywords": ["invoice maker", "estimate app", "receipt scanner"],
  "trackApps": ["com.zoho.invoice", "https://apps.apple.com/us/app/invoice-simple-receipt-maker/id694831622"],
  "stores": ["googlePlay", "appStore"],
  "countries": ["US", "GB"],
  "topN": 10
}
```

### Example output (rank)

```json
{
  "recordType": "rank",
  "keyword": "invoice maker",
  "store": "Google Play",
  "country": "US",
  "rank": 11,
  "rankSource": "store",
  "previousRank": 11,
  "rankChange": 0,
  "tracked": true,
  "appId": "com.zoho.invoice",
  "title": "Zoho Invoice - Invoice Maker",
  "developer": "Zoho Corporation",
  "installs": "1,000,000+",
  "url": "https://play.google.com/store/apps/details?id=com.zoho.invoice"
}
```

## How much does it cost?

**$2 per 1,000 rank rows** on the Apify Free plan, less on paid plans. Keyword records (competition, suggestions, your apps' ranks) are free. Tracking 20 keywords in two stores with the top 10 each is 400 rows, about $0.80 per run; tracking only your app for the same keywords (Top results 0) is 40 rows, about 8 cents.

## How are the ranks measured?

- **Google Play**: the order of Google Play's web search for the country and language, up to 30 apps.
- **App Store**: the first results (about 11) in the order of the App Store's own search page; after them, Apple's public search API, whose order is close to the store's. `rankSource` says which one a rank comes from.
- Stores personalise results a little by device and account, so ranks can differ by a position or two from what you see on your phone. The trend over time is what matters, and it is measured the same way every run.

## Tips

- **Daily tracking**: a schedule at the same time every day gives the cleanest trend.
- **Only your apps**: set **Top results per keyword** to 0 to save just your tracked apps, the cheapest way to monitor.
- **New keywords**: run with **Search suggestions** on and add the good suggestions to your list.
- **Separate projects**: use a different **History name** for each app or client.

## FAQ

**Do I need an App Store Connect or Google Play Console account?** No. The Actor reads the public store searches, like a visitor.

**Is the competition score Apple's popularity score?** No. Apple shows its search popularity only inside Apple Search Ads. The competition score is our estimate of how strong the apps already ranking for a keyword are.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
