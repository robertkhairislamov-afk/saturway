# UAE Property Deals: Dubai Listings vs Real DLD Sales

**Find Dubai apartments, villas and townhouses listed below what the same layout actually sold for.** Each listing on Property Finder is compared with real sales registered with the Dubai Land Department (DLD) in the same building: same bedrooms, same status (ready or off-plan), size within 15%, last 12 months. You get the market value, the discount, how much to trust it, the building's rent and yield, and the listing's price history. Abu Dhabi and Sharjah are covered too, compared with other listings. **$5 per 1,000 listings analysed.**

Listing scrapers give you asking prices. Asking prices in Dubai Marina are about **11% above** what the same layouts really sell for, so "cheap" on a portal often is not. This Actor answers the question buyers, brokers and investors actually ask: *is this listing below the real market?*

## What you get

- 🏷️ **Market value and discount** of every listing, from real DLD sales of the same layout in the same building.
- ✅ **Confidence**: high, medium or low. We checked the 20 strongest finds by hand on the live listings: high and medium held up (10 of 11), low did not (0 of 9: hotel units, unverified listings, buildings where a penthouse sale skews the comparables). Use **Minimum confidence** to keep only trustworthy finds.
- 🏢 **Building summary** (free): sales in the last year, average sale price and its change, average rent, ROI and gross yield, and how far asking prices sit above sold prices.
- 📉 **Price history**: the Actor remembers listings in your account, so the next run shows price cuts, and each building's sale history grows beyond the 10 latest sales a page shows.
- 🧱 **Supply of the same layout**: in Dubai towers the same layout repeats on every floor; you see how many are on sale and the lowest asking price.

## What data does it extract?

| Field | Example (Dubai Marina) |
|---|---|
| `building` / `community` | Bay Central Tower Central / Dubai Marina |
| `bedrooms` / `sizeSqft` / `completion` | 1 / 708 / ready |
| `price` / `pricePerSqft` | 1,475,000 / 2,083 |
| `marketValue` / `discountPercent` | 1,746,936 / 15.6 |
| `comparables` / `comparablePrices` | 6 / the six sale prices, lowest first |
| `confidence` / `comparisonBasis` | high / deals |
| `sameLayoutListings` / `sameLayoutMinPrice` | 1 / 1,475,000 |
| `buildingRoiPercent` / `buildingGrossYieldPercent` | 5.2 / average rent ÷ average sale price |
| `daysListed` / `priceChange` | days since publication / change since an earlier run |
| `agency` / `verified` / `reraPermit` / `url` | the listing's agency, verification and link |

## How to find below-market property in Dubai

1. Pick the **emirate** and the **areas**, for example `dubai-marina`, `jumeirah-village-circle`, `business-bay` (the name in a Property Finder link).
2. Pick **property types** and the **maximum listings**.
3. To get only the deals, turn on **Save only listings below market** (for example 10% and medium confidence).
4. Click **Start**. Schedule it weekly with the same **History name** to see price cuts and build up each building's sale history.

### Example input

```json
{
  "emirate": "dubai",
  "areas": ["dubai-marina", "jumeirah-village-circle"],
  "propertyTypes": ["apartments"],
  "maxListings": 2000,
  "onlyBelowMarket": true,
  "minDiscount": 10,
  "minConfidence": "medium"
}
```

### Example output

```json
{
  "discountPercent": 15.6,
  "confidence": "high",
  "comparisonBasis": "deals",
  "building": "Bay Central Tower Central",
  "community": "Dubai Marina",
  "bedrooms": 1,
  "sizeSqft": 708,
  "price": 1475000,
  "marketValue": 1746936,
  "comparables": 6,
  "completion": "ready",
  "buildingRoiPercent": 5.19,
  "verified": true
}
```

## How is the market value calculated?

- **Comparables**: sales in the same building, with the same bedrooms and status, size within 15%, from the last 12 months; at least 3 of them. Market value = their median price per sqft × the listing's size.
- **Why not the building average?** In our tests the average price per sqft of a whole building gave false bargains: a large one-bedroom looked 43% "cheap" next to small ones, while it was priced above every real sale of its own layout.
- **Data cleaning**: bulk sales are left out; the few sales whose area is in square metres are converted; implausible sizes are left out.
- **Abu Dhabi and Sharjah**: their sales are not published on Property Finder, so a listing is compared with other agencies' listings of the same layout (at least 4). Such comparisons are at most medium confidence, since asking prices are not sales.

## How much does it cost?

**$5 per 1,000 listings analysed** on the Apify Free plan, less on paid plans. Building summaries are free. With **Save only listings below market** on, you pay only for the deals saved.

## Tips

- **Bigger areas, better comparisons**: more buildings and more of their sales are matched when you include the whole community.
- **Weekly runs** with one **History name** build a sale history per building and show price cuts (`priceChange`).
- **Investors**: sort the building summary by `grossYieldPercent` or `roiPercent`, then look for listings below market there.
- **Brokers**: `sameLayoutListings` and `sameLayoutMinPrice` show the competition a seller faces.

## FAQ

**Where do the sales come from?** From Property Finder's transaction pages, which show sales registered with the Dubai Land Department. The Actor reads only pages Property Finder's robots.txt allows, at a gentle pace, and keeps agencies but not agents' personal details.

**Does it show owners or unit numbers?** No. It never looks up owners or other personal data.

**Is a high-confidence find a guaranteed bargain?** No. It means the asking price is below every recent sale of the same layout. View, floor, condition and tenancy still matter: a rented unit, for example, usually sells cheaper.

Missing a feature or an area? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
