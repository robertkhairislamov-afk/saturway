# Redfin Scraper

**Scrape Redfin homes for sale, sold homes and rentals by city, ZIP code, county or search link.** Get price, beds, baths, square feet, lot size, year built, days on market, sale date, HOA fee, address with coordinates, photos and the listing description. Export to JSON, CSV or Excel, or use the API. **$2 per 1,000 listings, no start fee.**

Scrape any US real estate search from **Redfin** (redfin.com) the way you search on the website: type locations such as `Austin, TX` or `78701`, or paste the link of a search with all your filters. Get homes **for sale**, homes **sold** in the last week to 5 years, or **rentals** with rent ranges and units. Each home is one flat record with clean numbers, ready for a spreadsheet or a database. There is no limit of 350 homes per search: big areas, even a whole state, are read in parts. Run it on a schedule to get **only new listings**. No browser, no login.

## What can this Redfin scraper do?

- 📍 **Search by location**: US cities, ZIP codes, counties, neighborhoods and states, such as `Austin, TX`, `78701`, `Travis County, TX` or `Brooklyn, NY`.
- 🔗 **Or paste Redfin search links**: every filter you set on redfin.com is kept, including a map area you zoomed into.
- 🏠 **For sale, sold and for rent**: homes for sale (with pending homes if you want them), homes sold in the last week to 5 years with the sale date and price, and rentals with the rent range, bedrooms and units.
- 🎛️ **Redfin filters in the form**: property type, price, bedrooms, bathrooms, square feet, lot size, year built, HOA fee, listed within, keywords in the description and sort order.
- ♾️ **No 350-home limit**: Redfin shows at most 350 homes on its map. The Actor reads every search page by page, and a search too big for Redfin, such as a whole state, is split by price.
- 🧾 **Flat, clean output**: numbers as numbers, dates as dates, one row per home, with the same columns for sale, sold and rent.
- 🖼️ **Photos**: the main photo in every record, and the links of all photos when you want them.
- 🆕 **Only new listings since the last run**: a daily alert of new homes in your markets.
- ⚡ **Fast**: 350 homes per request, thousands of homes per minute.

## What data does it extract?

| Field | Example |
|---|---|
| `address` / `city` / `state` / `zip` | 1317 Wilson Heights Dr, Austin, TX 78746 |
| `price` / `pricePerSqft` / `hoaPerMonth` | 1150000 / 509 / null |
| `beds` / `baths` / `sqft` | 4 / 2.5 / 2260 |
| `lotSizeSqft` / `yearBuilt` / `stories` | 9600 / 1980 / 2 |
| `propertyType` | House, Condo, Townhouse, Multi-family, Land, Manufactured, Co-op, Apartment |
| `listingType` / `status` | for-sale / Active (also Coming soon, Pending, Under contract, Sold, For rent) |
| `daysOnMarket` / `listedAt` | 1 / 2026-09-28 |
| `soldDate` / `lastSoldDate` | the sale date of sold homes / the previous sale of homes for sale |
| `openHouseStart` / `openHouseEnd` | 2026-09-30 10:00 to 12:00 local time |
| `latitude` / `longitude` / `neighborhood` | 30.2801428 / -97.8257432 / Lost Creek Hill Top |
| `description` / `keyFacts` / `tags` | the start of the listing description and Redfin's highlights |
| `photoUrl` / `photoCount` / `photos` | main photo, number of photos, all photo links |
| `mlsId` / `mlsStatus` / `brokerName` | listing number, status in the MLS and the listing brokerage where Redfin shows it |
| Rentals | `priceMax`, `bedsMax`, `sqftMax`, `propertyName`, `availableUnits`, `units` (bedrooms and rent) |
| `url` | https://www.redfin.com/TX/Austin/1317-Wilson-Heights-Dr-78746/home/31223587 |

## How to scrape Redfin

1. Enter **locations**, one per line, such as `Austin, TX` or `78701`. Or paste **Redfin search links** you made on redfin.com.
2. Pick **For sale**, **Sold** or **For rent**, and set the **filters** you need.
3. Click **Start**. Download the homes as JSON, CSV, Excel or HTML, or get them through the API.

A step-by-step guide with Python examples, including sold comps by ZIP code: [How to Scrape Redfin Listings: Homes for Sale, Sold Comps and Rentals](https://medium.com/@robertkhairislamov/how-to-scrape-redfin-listings-homes-for-sale-sold-comps-and-rentals-2386ce0b10aa).

### Example input

```json
{
  "locations": ["Austin, TX", "78701"],
  "searchType": "forSale",
  "propertyTypes": ["house"],
  "minBeds": 3,
  "maxPrice": 1200000,
  "maxDaysOnMarket": "7"
}
```

For sold homes, set `"searchType": "sold"` and, for example, `"soldWithinDays": "180"`. For rentals, set `"searchType": "forRent"`; prices then mean the monthly rent.

### Example output

```json
{
  "propertyId": 31223587,
  "listingId": 223914985,
  "mlsId": "9068033",
  "listingType": "for-sale",
  "status": "Active",
  "url": "https://www.redfin.com/TX/Austin/1317-Wilson-Heights-Dr-78746/home/31223587",
  "price": 1150000,
  "currency": "USD",
  "pricePerSqft": 509,
  "beds": 4,
  "baths": 2.5,
  "fullBaths": 2,
  "partialBaths": 1,
  "sqft": 2260,
  "lotSizeSqft": 9600,
  "yearBuilt": 1980,
  "stories": 2,
  "propertyType": "House",
  "address": "1317 Wilson Heights Dr, Austin, TX 78746",
  "streetAddress": "1317 Wilson Heights Dr",
  "city": "Austin",
  "state": "TX",
  "zip": "78746",
  "neighborhood": "Lost Creek Hill Top",
  "latitude": 30.2801428,
  "longitude": -97.8257432,
  "daysOnMarket": 1,
  "listedAt": "2026-09-28T16:12:50.086Z",
  "openHouseStart": "2026-09-30T15:00:00.000Z",
  "openHouseEnd": "2026-09-30T17:00:00.000Z",
  "description": "Perfectly positioned in the heart of coveted Lost Creek, 1317 Wilson Heights Drive offers a sophisticated blend of thoughtful updates, timeless appeal…",
  "keyFacts": ["Scenic hiking trails", "Eanes isd", "Playgrounds"],
  "tags": ["EANES ISD", "NEIGHBORHOOD PARKS", "UPSTAIRS PRIMARY SUITE", "FULLY REMODELED BATH"],
  "badges": ["Open House"],
  "garageSpaces": 2,
  "photoUrl": "https://ssl.cdn-redfin.com/photo/92/bigphoto/033/9068033_0.jpg",
  "photoCount": 35,
  "search": "Austin, TX",
  "searchUrl": "https://www.redfin.com/city/30818/TX/Austin",
  "scrapedAt": "2026-09-28T17:34:44.612Z"
}
```

Every record has the same fields; fields that do not apply are `null`, such as the rent fields of a home for sale.

## Use cases

- **Real estate investors**: every morning, the new listings under your price in your markets, with price per square foot and days on market.
- **Comps and valuation**: sold prices with square feet, lot size and year built for any neighborhood, ZIP code or county.
- **Agents and brokers**: market snapshots, new listings and open houses in your farm area.
- **Rental market research**: rents by bedrooms, building and area.
- **PropTech and data teams**: feed listings into pricing models, dashboards and CRMs.
- **AI agents**: give an agent one tool that searches US homes.

## How much does it cost?

You pay only for the listings you get: **$2 per 1,000 listings**. There is no start fee. The same home found by two searches is saved once, and you do not pay for duplicates. The Apify free plan covers about 2,500 listings every month.

## Tips

- **All Redfin filters**: set up the search on redfin.com, with the map area and any filter, and paste the link.
- **Daily alerts**: save your input as a task, turn on **Only new listings since the last run** and add a schedule. Send new homes to Slack, email or Google Sheets with Apify integrations.
- **Big areas**: a whole state works, but takes longer. Set **Maximum listings in total** when you need only a part of it.
- **Every location gets a share**: set **Maximum listings per search**.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Does it collect agent contact details?** No. There are no fields for agents' names, phone numbers or emails, and for rentals the leasing phone numbers are left out too. Where Redfin shows it, the listing brokerage is included.

**Why is the description short?** Redfin's search results carry the first 700 characters of the listing description. The full text, price history, taxes and schools are on the page of each home, which this Actor does not open.

**Why do some homes have no price?** Homes that Redfin shows early as "Coming soon" often have no price yet.

**Which countries does it cover?** The United States. Redfin's Canadian site is not supported.

**Is it legal to scrape Redfin?** The Actor reads the public listings Redfin shows to every visitor. Check the terms that apply to your use case. This Actor is not affiliated with Redfin.

## Integrations and API

- **Google Sheets, Slack, email and CRMs**: connect the Actor to Make, Zapier or n8n, or use the **Integrations** tab of this Actor. With **Only new listings since the last run** and a schedule, each run sends only the new homes.
- **Webhooks**: call your own URL when a run finishes, for example to load the new homes into your database.
- **AI agents (MCP)**: add `https://mcp.apify.com?tools=robertosan16/redfin-scraper` as an MCP server in Claude, Cursor or VS Code, and your agent can search homes with this Actor. Tell it how many homes you need, so it sets **Maximum listings in total**.
- **LangChain and LlamaIndex**: load the homes into your LLM app with the Apify loaders.
- **API**: one request runs the Actor and returns the homes, for runs of up to 5 minutes. Start longer runs with the `runs` endpoint and read the dataset when they finish.

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~redfin-scraper/run-sync-get-dataset-items?token=YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"locations":["Austin, TX"],"minBeds":3,"maxItems":20}'
```

Missing a field or a feature? Open an issue in the Issues tab and we will reply quickly.
