# AUCT Car Auction Deals (internal)

Internal tool of the owner's car rental company: upcoming car lots of AUCT (Sahakarn Auction,
auct.co.th) in Pattaya, Chonburi, Rayong, Bangkok and Rangsit, with a reference price and your own
price targets. Not for the Apify Store.

## What it does

1. Reads the auction calendar from today to **Days ahead** and the car lanes of the chosen yards.
2. Reads every car of those lanes: brand, model, sub-model, year, registration year, mileage, gear,
   engine, fuel, colour, body type, condition grade, plate province, seller group and price.
3. Compares each car with the same brand, model and year seen at AUCT in this run and in earlier
   runs (kept 180 days in the named key-value store `auct-car-deals-history`); with fewer than three,
   the neighbouring years (low confidence).
4. Marks cars at or under your **price targets** (`toyota fortuner 2020 750000`).

Each row: the car, `price`, `referencePrice`, `discountPercent`, `comparables`, `confidence`,
`matchesTarget`, the auction date, yard and lane, and the link to the lane on auct.co.th.

## Source and rules

- auct.co.th: robots.txt allows everything; its terms of use do not forbid automated reading
  (checked 25.11.2026). The Actor reads only the lists the public website shows, one request at a
  time with a pause, with an honest user agent.
- No personal data: contract numbers and licence plate numbers are not saved (plate province only).
- The `price` shown for an upcoming lot is AUCT's listed price; check on the lane page what it means
  for that lane (starting or expected price) before bidding. Bidding needs AUCT registration.
- The reference price is built from AUCT's own listings, not retail prices: it shows cheap cars
  among auction cars. A retail comparison (Carsome) is not used: its terms forbid commercial use.
