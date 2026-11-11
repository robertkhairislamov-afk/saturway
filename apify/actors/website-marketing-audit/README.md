# Website Marketing Audit: Pixels, Analytics & Lead Score

**Audit hundreds of websites in minutes and see which businesses need marketing help: Meta Pixel, Google Analytics, Google Ads and TikTok tags (also those hidden in Google Tag Manager), CMS, chat buttons, social profiles, emails, SEO basics, a 0–100 marketing score and a list of gaps you can pitch.** Paste websites, or plug in the results of a Google Maps Scraper run to qualify local business leads. **$5 per 1,000 sites.**

Built for agencies that sell websites, ads, SEO or analytics: instead of opening every site and its source code by hand, you get one table that says who has no pixel, who already pays for ads, whose site is not mobile-friendly or looks abandoned, and how to reach them.

## Who uses it

- **Digital and ads agencies**: find local businesses with no Meta Pixel, no analytics or no website at all, and open the conversation with a concrete gap.
- **Lead qualification**: score a Google Maps or CRM list; `adTracking: true` means the business already spends on ads (it has a budget), a low score means it needs help.
- **SaaS sales**: find sites on a given platform (WordPress, Wix, Shopify, Tilda, …) or without a chat tool.
- **Competitor research**: see which ad platforms and tools competitors use.

## What does it check?

| Area | Fields |
|---|---|
| 🎯 **Ad pixels** | `metaPixel`, `googleAds`, `tiktokPixel`, `linkedinInsight`, `pinterestTag`, `snapPixel`, `xPixel`, `microsoftAds`, `lineTag`, `vkPixel`, with ids |
| 📊 **Analytics** | `googleAnalytics` (GA4 ids), `googleTagManager`, `microsoftClarity`, `hotjar`, `yandexMetrica`, old `universalAnalyticsIds` |
| 🧩 **Tag Manager** | reads the site's Google Tag Manager container and adds the pixels configured there (`foundInTagManager`) |
| 🛠 **Platform** | `cms` (WordPress, Wix, Shopify, Squarespace, Webflow, Tilda, Joomla, …), `technologies` |
| 💬 **Chat and booking** | `chat` (WhatsApp, LINE, Telegram, Messenger, Viber, Tawk.to, Intercom, Jivo, …), `booking` (Calendly, Fresha, Booksy, OpenTable, SiteMinder, online shop, …) |
| 📇 **Contacts** | `emails`, `phones` from the home page and the contact page, `social` (Facebook, Instagram, TikTok, YouTube, LinkedIn, X, LINE) |
| 🔎 **SEO basics** | `title`, `metaDescription`, `h1`, `language`, `mobileViewport`, `structuredData`, `openGraphImage`, `noindex`, `copyrightYear` |
| ⚙️ **Technical** | `https`, `sslError`, `responseTimeMs`, `pageSizeKb`, `httpStatus` |
| ⭐ **Result** | `marketingScore` (0–100), `adTracking`, `adPixels`, `gaps` |

### Example output

```json
{
  "domain": "pattayahomes.net",
  "status": "ok",
  "marketingScore": 55,
  "adTracking": false,
  "adPixels": [],
  "gaps": [
    "No analytics: visits and sources are not measured",
    "No Meta Pixel: cannot retarget visitors on Facebook and Instagram",
    "No Google Ads conversion tag: Google Ads cannot measure leads",
    "No structured data (schema.org) for rich results and local SEO"
  ],
  "emails": ["rent@pattayahomes.net", "sales@pattayahomes.net"],
  "phones": ["+66969253295"],
  "chat": ["WhatsApp", "LINE"],
  "social": { "facebook": "https://www.facebook.com/pattayahomes.net" },
  "mobileViewport": true,
  "https": true
}
```

## How to audit websites or Google Maps leads

1. **Websites**: paste domains or links. **Or Google Maps leads**: run the [Google Maps Scraper](https://apify.com/compass/crawler-google-places) for a category and city (for example "dental clinic" in Pattaya), copy the run's **dataset ID** and paste it into **Dataset of businesses**. Names, categories, phones, ratings and reviews are carried over.
2. Optional: set **Save only sites scoring at most** to 60 to keep only businesses with clear gaps.
3. Click **Start** and download the table as Excel or CSV, or send it to your CRM.

```json
{
  "datasetId": "YOUR_GOOGLE_MAPS_DATASET_ID",
  "includeNoWebsite": true,
  "maxMarketingScore": 70
}
```

## How is the score calculated?

| Check | Points |
|---|---|
| Analytics (GA4, Tag Manager, Clarity, Hotjar, Metrica) | 15 |
| HTTPS | 10 |
| Mobile-friendly | 10 |
| Meta Pixel | 10 |
| Google Ads tag | 10 |
| Chat or messenger button | 10 |
| Title, meta description, H1 | 5 each |
| Structured data | 5 |
| Other ad pixels (TikTok, LinkedIn, …) | 5 |
| Social profiles linked | 5 |
| Copyright not outdated | 5 |

Businesses **without a website**, with only a **social page**, or with a site that **does not open** get 0 and a matching gap.

## How much does it cost?

**$5 per 1,000 records** on the Apify Free plan, less on paid plans. Sites left out by the score filter, sites protected against bots, and pages that robots.txt closes are skipped for free.

## Tips

- **Who already advertises on Google**: [Google Ads Transparency Scraper](https://apify.com/robertosan16/google-ads-transparency-scraper) lists the ads of any website or brand; Telegram channels to advertise in are scored by [Telegram Channel Analytics](https://apify.com/robertosan16/telegram-channel-analytics).
- **Best local leads**: businesses with many Google reviews but `marketingScore` under 50: they have customers, but no marketing setup.
- **Has budget**: `adTracking: true` with gaps such as no Google Ads tag means they advertise but cannot measure results.
- **Abandoned sites**: filter `copyrightOutdated: true` or `status: unreachable` for a website redesign offer.
- **No website**: keep **Include businesses without a website** on; these are often the easiest sale.

## FAQ

**Does it open the site in a browser?** No. It reads the home page HTML (and the contact page when needed) and the site's Tag Manager container, like a visitor's browser receives them. Tags added later by other scripts may be missed.

**Does it respect robots.txt?** Yes. Pages closed to crawlers by robots.txt are not read. Sites that block automated visits are skipped (and not charged).

**Is it legal to contact these businesses?** The data is what businesses publish on their own websites. Rules for contacting businesses differ by country (for example GDPR in the EU, PDPA in Thailand): check the rules that apply to you and include an opt-out.

Missing a check or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
