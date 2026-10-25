# Google Ads Transparency Scraper: Ad Text & Copy

Get **every Google ad of a competitor** from the [Google Ads Transparency Center](https://adstransparency.google.com/), **with the ad copy as text**: headline, description, display URL, the product of Shopping ads and the app of app ads. Search by **brand name, website or advertiser ID**, filter by **country, platform (Search, YouTube, Shopping, Maps, Play), format and dates**, and add each ad's **variations, countries and EU impressions**. No login, no browser. **$1.50 per 1,000 ads.**

## What can this Google Ads scraper do?

- 🔎 **Every ad of a website, brand or advertiser**: a website (nike.com) returns every ad that points to it, from every advertiser account, including agencies and resellers; a brand name is matched to the advertiser accounts with that name.
- ✍️ **Ad copy as text**: headline, description and display URL of Search ads, product title and store of Shopping ads, app name, ID, description and store link of app ads. Other scrapers return only a link to a picture.
- 📅 **Dates**: when each ad was first and last shown, and on how many days.
- 🌍 **Countries and platforms**: ads shown in any of 240+ countries or anywhere, on Google Search, YouTube, Shopping, Maps or Play, as text, image or video ads.
- 📊 **Details (optional)**: every variation of an ad (A/B versions), every country it ran in with its dates, and for ads shown in the EU, impressions per country and per platform.
- 🔔 **Only new ads**: schedule the Actor daily or weekly and save only the ads your competitors launched since the last run.
- 🏢 **Advertisers**: one row per advertiser account with its country and ad count, for example to see which companies advertise a website or whether a list of companies runs Google Ads.

## What data does it extract?

| Field | Example |
|---|---|
| `advertiserName` / `advertiserId` | Nike, Inc. / AR16735076323512287233 |
| `domain` | nike.com |
| `creativeId` / `adUrl` | CR08632639554903343105 / link to the ad in the Transparency Center |
| `format` | TEXT, IMAGE or VIDEO |
| `firstShown` / `lastShown` / `shownForDays` | 2023-06-21 / 2026-10-21 / 1171 |
| `headline` / `description` / `displayUrl` | Nike® Official Site / Lo Último en Calzado… / nike.com |
| `adTexts` / `businessName` | all texts of the ad / Nike |
| `isDynamic` | true for dynamic search ads, whose headline Google writes from the landing page |
| `appName` / `appId` / `destinationUrl` / `callToAction` | for app ads |
| `imageUrl` / `width` / `height` / `previewImageUrl` | picture of the ad and of the product |
| `variations` / `variationCount` | every version of the ad (with Details) |
| `regions` | countries with first and last date and EU impressions (with Details) |
| `impressions` / `platformImpressions` | EU impressions in total and per platform (with Details) |
| `region` / `source` / `scrapedAt` | US / nike.com / 2026-10-21T07:05:14Z |

## How to scrape Google Ads Transparency Center

1. Enter **brands, websites, advertiser IDs or Transparency Center links**, one per line.
2. Choose the **region** (a country code such as `US`, or `ANYWHERE`) and, if you like, **platforms**, **ad format** and **dates**.
3. Click **Start** and download the ads as JSON, CSV, Excel or HTML, or use them through the API.

### Example input

```json
{
  "queries": ["nike.com", "hellofresh", "https://adstransparency.google.com/advertiser/AR16735076323512287233?region=US"],
  "region": "US",
  "platforms": ["SEARCH"],
  "adFormat": "ALL",
  "startDate": "2026-09-01",
  "maxAdsPerSearch": 500,
  "includeAdText": true,
  "includeDetails": false
}
```

### Example output

```json
{
  "advertiserId": "AR16735076323512287233",
  "advertiserName": "Nike, Inc.",
  "domain": "nike.com",
  "creativeId": "CR08632639554903343105",
  "format": "TEXT",
  "adUrl": "https://adstransparency.google.com/advertiser/AR16735076323512287233/creative/CR08632639554903343105?region=US",
  "firstShown": "2023-06-21T21:16:41.000Z",
  "lastShown": "2026-10-21T06:31:43.000Z",
  "shownForDays": 1171,
  "headline": "Nike® Official Site",
  "description": "Lo Último en Calzado, Ropa y Equipamiento Nike para Hombre, Mujer y Niños. Compra Ahora.",
  "displayUrl": "nike.com",
  "businessName": "Nike",
  "adTexts": ["Nike® Official Site", "Lo Último en Calzado, Ropa y Equipamiento Nike para Hombre, Mujer y Niños. Compra Ahora."],
  "appName": null,
  "appId": null,
  "destinationUrl": null,
  "imageUrl": "https://tpc.googlesyndication.com/archive/simgad/1946594381649277428",
  "width": 348,
  "height": 497,
  "region": "US",
  "source": "nike.com",
  "scrapedAt": "2026-10-21T07:05:14.548Z"
}
```

With **Details** on, an ad shown in the EU also has its countries and impressions:

```json
{
  "variationCount": 3,
  "regions": [
    {
      "region": "PL",
      "firstShown": "2026-04-01",
      "lastShown": "2026-10-20",
      "impressions": { "min": 3000, "max": 4000 },
      "platformImpressions": [
        { "platform": "SEARCH", "impressions": { "min": 3000, "max": 4000 } },
        { "platform": "YOUTUBE", "impressions": { "min": 0, "max": 1000 } }
      ]
    }
  ],
  "impressions": { "min": 3000, "max": 4000 }
}
```

## Use cases

- **Competitor ad research**: read every ad a competitor runs on Google, with its copy, and see which ones have run the longest; an ad shown for hundreds of days is usually a winner.
- **Copywriting and ad inspiration**: collect headlines and descriptions of a whole market and find the angles, offers and keywords that keep coming back.
- **New-ad monitoring**: schedule a daily run with **Only new ads** and get only the ads launched since yesterday, by email, Slack or Google Sheets.
- **Agencies and lead generation**: check which companies run Google Ads, how many ads, in which countries, and which agencies run ads for a website.
- **Brand protection**: find advertisers that run ads for your website or brand name.
- **Datasets and AI**: clean ad copy for classification, trend analysis and LLM pipelines.

## How much does it cost?

You pay only for results: **$1.50 per 1,000 ads** (or advertisers), with ad text and Details included. That is the price on the Apify Free plan; paid Apify plans pay less: $1.35 per 1,000 on Starter, $1.20 on Scale and $1.05 on Business. There is no start fee, and proxy costs are included. The Apify free plan covers about 3,300 ads every month.

## Tips

- **Website or brand name?** A website returns every ad pointing to it, from every account (the brand, its agencies, resellers). A brand name is matched to advertiser accounts with that name; the account with the most ads comes first, and **Advertisers per brand name** takes more of them.
- **Ad text coverage**: Google shows many text ads only as a picture. The Actor looks for the text in the ad and in its variations; when every version is a picture, the ad keeps its `imageUrl` (a picture of the ad) and no text. How many ads come with text depends on the advertiser: in our tests of Google Search text ads in the US, 83 of 100 for nike.com, 75 for on.com, 74 for newbalance.com and 66 for asics.com, but 2 for brooksrunning.com and about 1 in 100 for software companies such as monday.com.
- **Dynamic search ads**: Google writes their headline and display URL from the landing page when the ad is shown, so the Transparency Center has no headline for them. Such ads have `isDynamic: true`, an empty `headline` and their description.
- **Keyword insertion**: headlines such as `{KeyWord:Nike Men's Clothing}` are as the advertiser wrote them: Google replaces the brackets with the searcher's keyword, and shows the text after the colon when the keyword does not fit.
- **Platform filter**: Google applies it to ads shown since September 2023.
- **Impressions**: Google publishes impressions only for ads shown in the European Union, as ranges.
- **Only new ads**: use a separate **Memory name** for each monitoring task; the first run saves every ad and remembers them.
- **Errors per target**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why not just ask an AI chatbot?** A chatbot cannot open the Transparency Center and list hundreds of ads with their dates and copy. This Actor reads the Transparency Center itself and returns every ad of a website or advertiser in the same fields every time, at a fixed price per 1,000 ads. AI agents can call it as a tool through Apify's MCP server.

**Does it show how much an advertiser spends or which keywords it bids on?** No. Google does not publish spend or keywords. For EU ads it publishes impression ranges, which the Actor returns with Details.

**Why does Google say "8,000–9,000 ads" but I got fewer?** The Actor stops at **Max ads per brand, website or advertiser** (100 by default). Raise it to get more, up to 10,000 per entry.

**What happens when Google shows its check page?** Google sometimes asks an address to prove it is not a robot. The Actor does not solve the check: it sends the request again from a new proxy address.

**Is it legal to scrape the Ads Transparency Center?** The Actor reads public information that Google publishes about ads and advertisers, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with Google.

## Integrations and API

- **Google Sheets, Slack, email and BI tools**: connect the Actor to Make, Zapier or n8n, or use the **Integrations** tab of this Actor. Schedule it with **Only new ads** to get alerts for new competitor ads.
- **Webhooks**: call your own URL when a run finishes, for example to load the ads into your database.
- **AI agents (MCP)**: add `https://mcp.apify.com?tools=robertosan16/google-ads-transparency-scraper` as an MCP server in Claude, Cursor or VS Code, and your agent can look up any company's Google ads.
- **API**: one request runs the Actor and returns the ads, for runs of up to 5 minutes. Start longer runs with the `runs` endpoint and read the dataset when they finish.

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~google-ads-transparency-scraper/run-sync-get-dataset-items?token=YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queries":["nike.com"],"region":"US","maxAdsPerSearch":100}'
```

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
