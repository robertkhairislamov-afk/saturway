# Thai Property Market Analyzer

Private Actor for market research on Thai condos, houses and villas. It reads the listings of a location on Dot Property and turns them into figures per **project** (condominium) and per **district**: typical asking price per m², typical rent, gross yield, supply, new listings, price cuts and listings that left the market since the last run. Pattaya listings get their tourist district (Wongamat, Pratumnak, Jomtien…) from coordinates.

It is an internal tool: the results are for the owner's own analysis and are not published or resold.

## What it saves

| Dataset | One row per | Main fields |
|---|---|---|
| Projects (default) | project | sale and rent listings, median ฿ per m² with quartiles, typical price and rent, gross yield, new, left the market, price cuts, developer, year, units, nearest landmark and distance |
| Districts | district | the same figures per district |
| Listings | listing | project, district, beds, baths, m², price, ฿ per m², first seen, days listed, price change since the last run |
| Left the market | listing gone since the last run | project, district, last price, first and last date seen |

The `SUMMARY` record in the key-value store says what each search read and whether the read was complete.

## How it works

- **Searches**: every location × property type × sale/rent, 30 listings per page, every page by default.
- **Pace**: two readers with a pause of about a second before each request, as a visitor would browse. Protection pages are never solved.
- **Project details**: one listing page per project, kept for 90 days in the memory store, at most 600 new projects per run (the projects with the most listings first).
- **History**: the memory store keeps, per search, when each listing was first and last seen and at what price. A complete read also tells which listings of the last run are gone; most of them were sold, rented or withdrawn. A partial read (Max pages per search) adds to the history but does not count departures.
- **Figures**: medians of asking prices; prices more than 3 times off a project's median are left out as typos. Gross yield needs at least 3 sale and 3 rent listings in the project. Thailand publishes no sale prices per unit, so all figures are asking prices.

## Districts of Pattaya

From north to south along the coast: Naklua & Wongamat, North Pattaya, Central Pattaya, South Pattaya, Pratumnak, Jomtien, Na Jomtien, Bang Saray; east of Sukhumvit Road: East Pattaya. The borders are approximate (about 200 m). Other locations use the subdistrict from the listing.

## Input

```json
{
  "locations": ["chonburi/pattaya"],
  "propertyTypes": ["condo"],
  "transactions": ["sale", "rent"],
  "maxPagesPerSearch": 0,
  "memoryName": "thai-property-history"
}
```

Schedule it weekly with the same memory name to get days on market, price cuts and departures.

## Next

Stage 2 groups listings of the same unit by different agencies (same project and size, matching photos, marketing renders ignored) and shows each unit with all its prices.
