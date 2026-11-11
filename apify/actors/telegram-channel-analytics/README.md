# Telegram Channel Analytics: Reach, ERR & Ad Price

**Check public Telegram channels before you buy ads in them: exact subscribers, average views per post, reach (ERR), engagement, posting frequency, how many posts are ads, and an estimated price per ad post.** Start from a few channels you know and the Actor finds the related channels they mention and forward from. No login, no phone number, no API key. **$5 per 1,000 channels.**

Subscriber counts are easy to inflate; views and reactions are much harder to fake. This Actor reads the channel's recent public posts and turns them into the numbers media buyers check by hand: how many people actually see a post, how often the channel posts, how much of its feed is already advertising, and what a post should cost at your CPM.

## Who uses it

- **Media buyers and agencies**: shortlist channels for a campaign, spot dead or inflated channels, and compare the asked price with the real reach.
- **Brands and local businesses**: find the channels of a city or niche (for example Russian-speaking channels of Pattaya, Phuket or Dubai) and decide where to advertise.
- **Channel owners**: build a media kit with verifiable numbers, and track competitors.
- **Researchers**: map a niche: which channels mention each other, which are most read.

## What data does it extract?

| Field | Example (a real channel) |
|---|---|
| `username` / `title` / `url` | Thailand_Real / Реальный Таиланд Новости / https://t.me/Thailand_Real |
| `subscribers` | 48,562 (exact) |
| `avgViews` / `medianViews` | 7,129 / 7,140 |
| `reachPercent` (ERR) | 14.7 |
| `engagementPercent` / `reactionsPerPost` | 1.55 / 110 |
| `postsPerDay` / `lastPostAt` / `active` | 12.1 / 2026-11-11 / true |
| `adPosts` / `adPercent` / `adPostsPerWeek` | 0 / 0 / 0 |
| `estimatedPostPriceUsd` | 43 at a CPM of $6 |
| `viewsTrendPercent` | -8 (newer posts get slightly fewer views) |
| `forwardedPercent` | 2 |
| `script` | Cyrillic |
| `topPosts` | the three most viewed recent posts |
| `linkedChannels` | channels it mentions or forwards from, with counts |
| `contacts` | from the description: @ThailandChan, @ekskursii_phukets |

Public **groups** are listed too, with their members and members online (their messages are not read). Users and bots are skipped.

## How to analyse Telegram channels

1. Enter **channels**: `@name`, `name` or `https://t.me/name`.
2. Set **Your CPM** to the rate of your market, for the price estimate.
3. Optional: turn on **Find related channels** to also check the channels your list mentions, forwards from or names in its description; **Discovery depth** 2 or 3 goes further.
4. Click **Start** and download the table as Excel, CSV or JSON.

### Example input

```json
{
  "channels": ["pattayatours_ru", "phuket_chat", "rian_ru"],
  "postsPerChannel": 50,
  "cpmUsd": 6,
  "discoverRelated": true,
  "maxRelatedChannels": 30,
  "minSubscribers": 1000
}
```

### Example output

```json
{
  "recordType": "channel",
  "username": "Thailand_Real",
  "title": "Реальный Таиланд Новости",
  "subscribers": 48562,
  "postsAnalyzed": 50,
  "statsBasedOnPosts": 24,
  "postsPerDay": 12.11,
  "active": true,
  "avgViews": 7129,
  "reachPercent": 14.7,
  "engagementPercent": 1.55,
  "adPosts": 0,
  "estimatedPostPriceUsd": 43,
  "cpmUsd": 6,
  "script": "Cyrillic",
  "contacts": { "usernames": ["@ThailandChan", "@ekskursii_phukets"] },
  "foundBy": "input"
}
```

## How are the numbers calculated?

- **Views** keep growing for days after a post. Averages use posts **2 to 30 days old** (or the newest 20 older than 48 hours for channels that post rarely), so channels are compared fairly. `statsBasedOnPosts` says how many posts that is.
- **Reach (ERR)** = average views / subscribers × 100. Around 10 to 30% is common; a few percent on a big channel often means bought subscribers or a dead audience. Above 100% means posts are read far beyond the subscribers, through forwards.
- **Ad posts** are posts with ad markers: `erid` links and ad labels required by Russian law (Реклама, ООО, ИНН), and hashtags such as `#реклама`, `#ad`, `#promo`. Native ads without a label are not counted.
- **Estimated price** = average views / 1,000 × your CPM. It is a reference for negotiation, not the channel's price list. Channels with no post in 30 days (`active: false`) get no estimate: their views come from old posts.

## How much does it cost?

**$5 per 1,000 channels or groups** on the Apify Free plan, less on paid plans. Users, bots and related channels below your minimum subscribers are skipped for free, and so are the posts saved with **Save posts**.

## Tips

- **Audit the advertisers' websites**: channels' ad posts link to businesses; check their sites' pixels, analytics and contacts with [Website Marketing Audit](https://apify.com/robertosan16/website-marketing-audit).
- **Map a city or niche**: start with 3 to 5 known channels, turn on **Find related channels** and set **Minimum subscribers** to 1,000.
- **Weekly tracking**: save the input as a task and schedule it; compare subscribers and average views week by week.
- **Check the asking price**: if a channel asks much more than `estimatedPostPriceUsd` at your CPM, ask for its statistics.
- **Posts**: turn on **Save posts** for every post with views, reactions and the ad marker, to check the ads yourself.

## FAQ

**Do I need a Telegram account?** No. The Actor reads the public web pages Telegram shows for every public channel (`t.me/s/name`), like a visitor in a browser.

**Why does a channel have subscribers but no statistics?** Some channels turn off the web preview of their posts. For them only the title, description and subscribers are available (`previewAvailable: false`).

**Can it read private channels or group messages?** No, only public channels. Groups are listed with their member counts only.

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.
