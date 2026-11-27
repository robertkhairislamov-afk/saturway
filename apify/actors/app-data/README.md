# App Data All-in-One: Google Play, App Store, Samsung, Xiaomi & F-Droid

**Get app data from 5 app stores in one run and one format: Google Play, the Apple App Store, Samsung Galaxy Store, Xiaomi GetApps and F-Droid, with the same app matched across them.** Search by keyword, read the top charts, or give app links: every app comes with its rating, number of ratings, installs (Google Play), price, version, release and update dates, genre, description and icon. When an app is in both stores, its row links to its page in the other store.

No login, no API key, no browser.

## What can it do?

- 🔎 **Keyword search in both stores at once**: the apps each store shows for `habit tracker`, `vpn` or `budget app`, with their rank in each store.
- 🏆 **Top charts of both stores**: top free, top paid and top grossing, up to 100 apps per store and country.
- 🤖 **Full Android coverage**: every Google Play app is also looked up in **Samsung Galaxy Store**, **Xiaomi GetApps** and **F-Droid** by its package name, with each store's rating, downloads, version and price. `alsoIn` lists the stores where the app is available.
- 🔗 **The same app on iOS**: give a Google Play package (`com.spotify.music`) or an App Store link, and the Actor also finds the app in the other store. In searches and charts, apps found in both stores are matched by name and developer (`inBothStores`, `otherStoreAppId`, `otherStoreUrl`).
- 🌍 **Any country**: US, GB, DE, TH or any other store front, one or many in one run.
- 📋 **One format**: the same columns for both stores, so you can compare ratings and versions side by side in a spreadsheet.

## What data does it return?

| Field | Example |
|---|---|
| `store` | Google Play / App Store / Samsung Galaxy Store / Xiaomi GetApps / F-Droid |
| `appId`, `url` | com.habitnow, https://play.google.com/store/apps/details?id=com.habitnow |
| `title`, `developer`, `genre` | HabitNow Daily Routine Planner, HabitNow Apps, Productivity |
| `score`, `ratingsCount` | 4.76, 93,890 |
| `installs`, `minInstalls` | 5,000,000+, 5000000 (Google Play) |
| `free`, `price`, `currency` | true, 0, USD |
| `version`, `releasedAt`, `updatedAt` | 2.5.5, 2019-05-17, … |
| `summary`, `description`, `icon` | full texts and icon link |
| `alsoIn` | ["Samsung Galaxy Store", "Xiaomi GetApps", "App Store"] (on Google Play rows) |
| `license`, `sizeText` | GNU GPL v3 (F-Droid), 130.6 MB (GetApps) |
| `inBothStores`, `otherStoreAppId`, `otherStoreUrl`, `otherStoreTitle`, `otherStoreScore` | the same app in the other store |
| `source`, `searchTerm`, `chart`, `rank`, `country` | search, habit tracker, —, 4, US |

Developer emails, phone numbers and addresses are not included.

## How to use it

1. Add **Search terms**, **Apps** (links or ids) or pick **Top charts**.
2. Choose **Countries** (US by default).
3. Run it and download the results as Excel, CSV or JSON, or use them through the API.

Leave **Full Google Play details** on for ratings counts, dates, versions and descriptions of Google Play apps; turn it off for a faster list.

## Use cases

- **App market research**: who ranks for your keywords in each store, and how strong they are (ratings, installs).
- **Competitor tracking**: the same competitor apps on Android and iOS, with versions and update dates.
- **Lead lists of app publishers**: apps and their developers across both stores.
- **Cross-store comparison**: an app rated 4.8 on iOS and 3.9 on Android tells you where users are unhappy.

## FAQ

**Is it legal?** The Actor reads public store pages, Apple's public iTunes Search API and F-Droid's public API, at a gentle pace, without logging in, and follows each store's robots.txt. Check the terms of the stores and the laws that apply to your use.

**How is the same app matched in both stores?** By its name without the subtitle (the part after " - " or ":") and its developer name. Apps with a generic name ("Habit Tracker") are matched only when the developers match too.

**Why are some Android stores not covered?** Huawei AppGallery closes its pages to robots (robots.txt) and APKPure sits behind a bot check, so they are left out. Galaxy Store search is closed to robots too, so Galaxy Store apps are found through Google Play results and app links, not by keyword.

**Why does an app appear in one store only?** Many apps exist on one platform only, or under a different name. Give its link in **Apps** to look it up in the other store directly.

**Support**: open an issue on the Actor's Issues tab or write to support@mozartstandard.com.
