# AUCT Car Auction Deals (internal)

Internal tool of the owner's car rental company: upcoming car lots of AUCT (Sahakarn Auction,
auct.co.th) in Pattaya, Chonburi, Rayong, Bangkok and Rangsit, with a reference price and your own
price targets. Not for the Apify Store.

## What it does

1. Reads the auction calendar from today to **Days ahead** and the car lanes of the chosen yards.
2. Reads every car of those lanes: brand, model, sub-model, year, registration year, mileage, gear,
   engine, fuel, colour, body type, condition grade, plate province, seller group and price.
3. Reads what cars sold for at AUCT auctions of the last **Sold prices from the last days** (all
   yards; only brand, model, year and the sold price are kept, in the named key-value store
   `auct-car-deals-history`, 180 days) and gives each upcoming car an **expected price**: the median
   sold price of the same model and year (neighbouring years with low confidence).
4. Reads the cars on sale at **Carsome** (all list pages, refreshed weekly, kept in the history
   store) and gives each auction car the **retail price** of the same model and year (median; year
   ±1 if needed) and `belowRetailPercent`: how far the expected auction price is below retail.
5. Marks cars whose expected price is at or under your **price targets**
   (`toyota fortuner 2020 750000`); without an expected price, by the starting price (marked).

The price AUCT lists for an upcoming lot is the **starting price**: cars sell far above it (a 2021
D-Max listed at 80,000 THB; the same model and year sold for a median of 370,000). Compare the
expected price, not the starting price, with what you would pay.

Each row: the car (with condition grade and inspectors' notes), `startPrice`, `expectedPrice`,
`soldComparables`, `confidence`, `matchesTarget` and `targets`, the auction date, time, yard and
lane, and the link to the lane on auct.co.th (photos are there).

## Source and rules

- auct.co.th: robots.txt allows everything; its terms of use do not forbid automated reading
  (checked 25.11.2026). The Actor reads only the lists the public website shows, one request at a
  time with a pause, with an honest user agent.
- No personal data: the service also returns buyers' names, addresses and phones of sold lots,
  contract, chassis, engine and plate numbers; none of these are read into the results (plate
  province only). Photo links are left out because their address contains the contract number.
- The port 2368 service sends its certificate without the intermediate; the public Sectigo DV R36
  intermediate is bundled (`src/certs`) so TLS stays fully verified.
- Expected prices are auction (wholesale) prices. Retail prices come from Carsome, whose terms
  forbid commercial use of its content: used here for the owner's internal buying only, at the
  owner's decision and risk (25.11.2026), never published or sold. Carsome pages are read as text
  (the page data is parsed, not executed), about 32 pages a week with pauses; no seller details.
- Auction cars are often in worse condition (grades C/D, high mileage) than Carsome's inspected
  cars: the gap to retail is a guide, not a profit. Bidding needs AUCT registration and a deposit.
