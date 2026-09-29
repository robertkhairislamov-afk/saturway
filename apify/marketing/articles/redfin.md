# How to Scrape Redfin Listings: Homes for Sale, Sold Comps and Rentals

*Get clean Redfin data for any US city, ZIP code or county: price, beds, baths, square feet, days on market and sale dates, in a spreadsheet, in Python or with one API call.*

*This guide was written with the assistance of an AI writing tool. Every code sample in it was run against the live scraper before publishing.*

Redfin is one of the best public sources of US real estate data. Its search covers homes for sale, homes sold in the last five years and rentals, with price, size, lot, year built and days on market for each home. If you invest, pull comps, study a rental market or build a PropTech product, you want that data in a table, not on a map.

## Why not just copy the search results?

A Redfin map shows at most 350 homes at a time, and every city, ZIP code and county has its own internal region ID. Filters live in the page address in Redfin's own format, very large searches time out, and the fields come as nested objects that are awkward in a spreadsheet. You can handle all of that yourself, but for most projects it is faster to use a scraper that already does.

I built [Redfin Scraper](https://apify.com/robertosan16/redfin-scraper) on Apify for exactly this. You give it locations or Redfin search links, and it returns one flat row per home.

## What data you get

- Price, price per square foot and monthly HOA fee
- Beds, baths (full and partial), square feet, lot size, year built and stories
- Property type: house, condo, townhouse, multi-family, land, manufactured or co-op
- Status: active, coming soon, pending, under contract or sold, plus the MLS status
- Days on market, when the listing appeared on Redfin, and open house times
- The sale date of sold homes, and the previous sale date of homes for sale
- Full address, ZIP code, neighborhood, latitude and longitude
- The start of the listing description, Redfin's key facts, the main photo and links to all photos
- For rentals: the rent range, bedroom range, building name, available units and rent per unit type

The output has no agent names, phone numbers or emails.

## Option 1: No code

1. Open [Redfin Scraper](https://apify.com/robertosan16/redfin-scraper) and click **Try for free**. The free Apify plan is enough for everything in this guide.
2. In **Locations**, type one place per line, the way you would in the Redfin search box: `Austin, TX`, `78701`, `Travis County, TX` or `Brooklyn, NY`.
3. Pick **For sale**, **Sold** or **For rent**, and set the filters you need: property type, price, bedrooms, square feet, year built, "listed within the last week" and more.
4. Click **Start**. When the run finishes, download the homes as CSV, Excel or JSON.

If you already have a search on redfin.com with the exact filters and map area you want, paste its link into **Redfin search links** instead. The scraper keeps every filter of the link.

## Option 2: Python

Install the Apify client and pandas:

```bash
pip install apify-client pandas
```

Copy your API token from Apify Console (Settings → API & Integrations) into the `APIFY_TOKEN` environment variable. This script gets houses for sale in Austin with at least three bedrooms under $600,000 and saves them to a CSV file:

```python
import os

import pandas as pd
from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run_input = {
    "locations": ["Austin, TX"],
    "searchType": "forSale",
    "propertyTypes": ["house"],
    "minBeds": 3,
    "maxPrice": 600000,
    "maxItems": 500,
}
run = client.actor("robertosan16/redfin-scraper").call(run_input=run_input)
homes = pd.DataFrame(client.dataset(run.default_dataset_id).iterate_items())

print(len(homes), "homes")
print(homes[["address", "price", "beds", "baths", "sqft", "daysOnMarket"]].head())
homes.to_csv("austin_homes.csv", index=False)
```

It takes about 20 seconds for 500 homes. The first rows:

```
500 homes
                                   address     price  beds  baths  sqft  daysOnMarket
0        8634 Ephraim Rd, Austin, TX 78717  600000.0     4    2.5  2856             1
1      2423 Lavendale Ct, Austin, TX 78748  525000.0     4    3.0  3482             1
2       13105 Bourbon St, Austin, TX 78727  390000.0     3    2.0  1311             1
3  3615 Aspen Creek Pkwy, Austin, TX 78749  525000.0     4    2.0  2149             5
4     2304 Sentiero Walk, Austin, TX 78748  395000.0     3    3.0  1829             4
```

The CSV file has 64 columns, from `pricePerSqft` and `yearBuilt` to `latitude`, `longitude` and `photoUrl`.

## Example: sold comps by ZIP code

Sold homes are where Redfin data gets really useful. This script takes the houses sold in Austin in the last 90 days and ranks ZIP codes by median price per square foot:

```python
import os

import pandas as pd
from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run = client.actor("robertosan16/redfin-scraper").call(run_input={
    "locations": ["Austin, TX"],
    "searchType": "sold",
    "soldWithinDays": "90",
    "propertyTypes": ["house"],
    "maxItems": 3000,
})
sold = pd.DataFrame(client.dataset(run.default_dataset_id).iterate_items())

by_zip = (
    sold.dropna(subset=["pricePerSqft"])
    .groupby("zip")
    .agg(sales=("price", "size"), median_price=("price", "median"), median_price_per_sqft=("pricePerSqft", "median"))
    .query("sales >= 20")
    .sort_values("median_price_per_sqft", ascending=False)
)
print(by_zip.round(0).head(10))
```

The result at the end of September 2026:

```
$ python sold_comps.py
       sales  median_price  median_price_per_sqft
zip
78703     30     1787500.0                  699.0
78746     64     1895000.0                  606.0
78704     76     1169500.0                  600.0
78751     35      660000.0                  503.0
78733     23     1499000.0                  474.0
78702     64      777000.0                  470.0
78757     72      754450.0                  457.0
78731     62     1224500.0                  439.0
78730     23     1495000.0                  372.0
78738     35     1149000.0                  369.0
```

With the same few lines you can compare neighborhoods, track how prices move from month to month, or pull comps for one ZIP code before you make an offer.

## Option 3: One API call

You don't need an SDK. This request runs the scraper and returns the listings as JSON in a single call, for runs of up to five minutes:

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~redfin-scraper/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"locations":["78701"],"searchType":"forRent","maxItems":20}'
```

It returns 20 rentals in downtown Austin with the rent range, bedrooms and building name in about three seconds. The same endpoint works from JavaScript, Google Apps Script, n8n, Make or Zapier.

## Tips

- **Big areas work.** Redfin shows 350 homes per map, but the scraper reads every page of a search. A search too big for Redfin, such as a whole state, is split by price automatically. Set **Maximum listings in total** if you only need part of it.
- **Daily alerts.** Save your input as a task, turn on **Only new listings since the last run** and add a schedule. Each run then returns only the listings that earlier runs did not; send them to Google Sheets, Slack or email with Apify integrations.
- **Rentals.** Set `"searchType": "forRent"`. Prices then mean the monthly rent.
- **AI agents.** The scraper is available as an MCP tool, so an agent in Claude, Cursor or VS Code can search homes by itself.

## What it costs

The scraper charges per listing: $2 per 1,000 listings, with no start fee. The monthly credit of the free Apify plan covers about 2,500 listings, and paid Apify plans get 10–30% off. A home found by two searches is saved once and charged once.

## What's not included

Redfin's search results carry the first 700 characters of each listing description. The full description, price history, tax records and school ratings are on each home's own page, which the scraper doesn't open. Only US listings are supported.

## Is it legal?

The scraper reads the same public listings Redfin shows to every visitor, and it doesn't collect personal data about agents. Whether your use case is allowed depends on what you do with the data, so check Redfin's terms and the laws that apply to you. The scraper is not affiliated with Redfin.

## Wrapping up

Redfin data is most useful as a table you can filter, join and chart. Type a location, pick for sale, sold or for rent, and you have that table in seconds: [Redfin Scraper on Apify](https://apify.com/robertosan16/redfin-scraper). If you need a field or a feature, open an issue on the Actor page and I'll reply quickly.
