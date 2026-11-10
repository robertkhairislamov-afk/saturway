# Google Play Developer Leads: App Company Emails & Websites

**Find Android app companies in any niche and get one lead per developer: public business email, website, legal name, address, top app, installs and last update.** Search by keyword, category chart or competitor app. Companies only by default, no personal data of individual developers. **Pay only for leads saved.**

Google Play shows a support email and website on every app listing, and for developers who sell in the EU, the company's legal name, address and phone. This Actor collects them for a whole niche: it finds the apps, groups them by developer, reads one app page per developer and saves one clean record per company. No browser, no login, no API key.

## Who uses it

- **SaaS and SDK sales**: reach app companies that need your analytics, ads, payments, crash reporting, localization or backend.
- **Agencies**: ASO, user acquisition, design, QA and development shops looking for app companies to pitch.
- **Investors and M&A**: build a list of growing apps in a category, with installs and how actively they are updated.
- **Partnerships and BD**: find complementary apps to cross-promote or integrate with.

## What makes the list useful

- 🎯 **Niche discovery**: a keyword finds up to 30 apps, and with **Similar apps** on, each of them adds the apps Google shows as similar. One keyword such as `invoice maker` gave **244 developers** in our test.
- 🏢 **Companies only**: a developer counts as a business when the name has a company form (Inc, Ltd, GmbH, AB, s.r.o., ...) or the support email is on the developer's own website domain. Individual developers' emails, addresses and phones are never saved.
- 📈 **Qualify before you reach out**: filter by installs of the top app (skip the giants, or skip the tiny ones) and by how recently it was updated, so you contact active companies of the right size.
- 🧾 **Company details**: legal name, business address and phone from Google's trader details, when the company published them.
- 🌍 **Any country**: search the Google Play store of any country, for example `US`, `GB`, `DE`, `BR`, `IN`.

## What data does it extract?

| Field | Example |
|---|---|
| `developerName` / `developerType` | Invoice Simple / company |
| `companyName` / `legalName` | Zenvoice Software Inc |
| `email` / `emailDomain` | support@invoicesimple.com / invoicesimple.com |
| `website` / `websiteDomain` | https://www.invoicesimple.com / invoicesimple.com |
| `address` / `phone` | 2660 Sherwood Heights Dr Suite 103, Oakville, ON, Canada / +1 929-284-7757 |
| `topAppTitle` / `topAppInstalls` | Invoice Simple: Invoice Maker / 5,000,000+ |
| `topAppScore` / `topAppRatings` | 4.8 / 172,750 |
| `topAppUpdatedAt` / `daysSinceUpdate` | 2026-11-02 / 7 |
| `appsFound` / `apps` | the developer's apps found by the run |
| `foundBy` | search "invoice maker", similar to Invoice Maker … |
| `developerUrl` | the developer's Google Play page |

## How to get app developer leads

1. Enter **keywords** that describe the apps you want, for example `invoice maker` or `meditation`. Or pick **categories**, or paste **competitor apps**.
2. Leave **Similar apps** on to cover the whole niche.
3. Set the filters you need: installs of the top app, updated in the last days.
4. Set **Maximum leads** and click **Start**. Download the leads as CSV, Excel or JSON, or send them to your CRM through Apify integrations.

### Example input

```json
{
  "searchTerms": ["invoice maker", "crm"],
  "countries": ["US"],
  "maxInstalls": 1000000,
  "updatedWithinDays": 90,
  "maxLeads": 200
}
```

### Example output

```json
{
  "developerName": "Endel Sound GmbH",
  "developerType": "company",
  "companyName": "Endel Sound GmbH",
  "email": "ask@endel.io",
  "website": "https://endel.io/",
  "address": "Sophienstr. 20, 10178 Berlin, Germany",
  "topAppTitle": "Endel: Focus, Relax & Sleep",
  "topAppInstalls": "1,000,000+",
  "topAppUpdatedAt": "2026-10-27T09:43:56.000Z",
  "daysSinceUpdate": 13,
  "appsFound": 1,
  "foundBy": ["app com.calm.android, similar to Calm - Sleep, Meditate, Relax"],
  "countries": ["GB"]
}
```

## How much does it cost?

You pay only for leads saved: **$3 per 1,000 leads** on the Apify Free plan, less on paid plans. Developers that the filters leave out are free. There is no start fee.

## Tips

- **Small and mid-size companies** answer more often than giants: set **Maximum installs** to 1,000,000 or 5,000,000.
- **Active companies only**: set **Updated in the last days** to 90.
- **Competitors of your customer**: paste your best customer's app under **Competitor apps** to find companies like them.
- **Run summary**: the `SUMMARY` record in the key-value store shows how many developers were found, checked, saved and left out, and why.

## FAQ

**Where does the email come from?** From the app's Google Play listing: the support email and website every developer publishes, and the trader details Google shows for companies that sell in the EU. Nothing is guessed or bought.

**Why are some developers left out?** Individual developers (a person's name with a free mailbox) are left out by default: their contacts are personal data. Turn off **Companies only** to list them with name, website and apps, but never their email, address or phone. The summary says how many were left out for each reason.

**Is it legal to use these leads?** The data is public business contact information published by the companies on Google Play. Contacting businesses is regulated differently in each country (for example GDPR in the EU, CAN-SPAM in the US): check the rules that apply to you, and include an opt-out in your messages.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
