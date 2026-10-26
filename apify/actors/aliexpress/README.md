# AliExpress Search Scraper: Products, Prices & Sales

Scrape **AliExpress search and category results**: product title, **price, original price and discount**, the **sold count as a number** (6,916, not just "5,000+"), **rating**, **delivery days and dates**, **Choice** and **ad** labels, badges such as "Top selling", pictures, category IDs and the product's **position in the results**. Search any keyword or paste any search or category link, sort by orders or price, set a price range, the ship-to country, the currency and the ship-from warehouse. No browser, no login. **$1.50 per 1,000 products.**

## What can this AliExpress scraper do?

- 🔎 **Keyword searches and category links**: up to 3,600 products per search (60 pages of 60), in AliExpress's own order, with the position of each product.
- 🏷️ **Prices you can compare**: price, original price, discount in percent and currency, plus a flag for first-order "new shopper" prices.
- 📈 **Sales and ratings**: the sold count from AliExpress's own counter (the label only says "5,000+ sold"), the star rating and the date the product was listed.
- 🚚 **Delivery**: estimated delivery days and dates to the ship-to country, and the **Ships from** filter for local warehouses (United States, Spain, France, Germany and more).
- 🌍 **Any ship-to country and currency**: 51 countries; prices, delivery and some products differ by country.
- ⭐ **Filters**: sort by best match, orders or price; price range; minimum rating; minimum sold count; skip ads.

## What data does it extract?

| Field | Example |
|---|---|
| `position` / `page` | 3 / 1 |
| `title` / `productId` / `url` | 4MM Thick EVA Yoga Mats… / 1005005828306541 / link |
| `price` / `originalPrice` / `discountPercent` / `currency` | 0.99 / 13.31 / 92 / GBP |
| `priceText` / `isNewShopperPrice` | ￡0.99 / true |
| `soldCount` / `soldText` | 6916 / 5,000+ sold |
| `rating` | 4.4 |
| `isChoice` / `isSponsored` | true / false |
| `deliveryDaysMin` / `deliveryDaysMax` / `deliveryFrom` / `deliveryTo` | 4 / 7 / 2026-10-24 / 2026-10-27 |
| `badges` | Top selling on AliExpress, ￡0.94 each, ≥ 2 pieces |
| `image` / `images` | picture links |
| `categoryIds` | 18, 100005371, 200001927 |
| `storeName` / `sellerCompany` | when the card shows the store |
| `listedAt` | 2023-07-12 |
| `searchQuery` / `searchUrl` / `shipTo` | yoga mat / link / GB |

## How to scrape AliExpress

1. Enter **search keywords**, such as `yoga mat`, or paste **search or category links** from AliExpress.
2. Choose the **sorting**, the number of **products per search**, the **ship-to country** and, if you like, a price range or other filters.
3. Click **Start** and download the results as JSON, CSV, Excel or HTML, or use them through the API.

A step-by-step guide with Python examples, five product ideas compared in one table, what the "10,000+ sold" label hides and why search-page prices are promotions: [How to Find Best-Selling Products on AliExpress with Exact Sales Numbers](https://medium.com/@robertkhairislamov/how-to-find-best-selling-products-on-aliexpress-with-exact-sales-numbers-4e18446041bd).

### Example input

```json
{
  "searchQueries": ["yoga mat", "resistance bands"],
  "startUrls": ["https://www.aliexpress.com/category/100003109/women-clothing.html"],
  "sort": "orders",
  "maxItemsPerSearch": 300,
  "shipTo": "GB",
  "minPrice": 2,
  "maxPrice": 30,
  "minRating": 4.5
}
```

Sorting is `relevance` (best match), `orders`, `price_asc` or `price_desc`. `shipTo` is a two-letter country code; `currency` (such as `EUR`) is optional and defaults to the currency of that country. `shipFrom` (such as `US` or `ES`) keeps only products from that warehouse country.

### Example output

```json
{
  "productId": "1005005828306541",
  "title": "4MM Thick EVA Yoga Mats Anti-slip Sport Fitness Mat Blanket For Exercise Yoga And Pilates Gymnastics Mat Fitness Equipment",
  "url": "https://www.aliexpress.com/item/1005005828306541.html",
  "image": "https://ae-pic-a1.aliexpress-media.com/kf/Scbde5dd4b6ef4ff28324a183fe65a7aeb.jpg",
  "images": ["https://ae-pic-a1.aliexpress-media.com/kf/Scbde5dd4b6ef4ff28324a183fe65a7aeb.jpg", "https://ae-pic-a1.aliexpress-media.com/kf/S05f06dd5c53a415a8c9dfa75b9286dedU.jpg"],
  "price": 0.99,
  "originalPrice": 13.31,
  "discountPercent": 92,
  "currency": "GBP",
  "priceText": "￡0.99",
  "isNewShopperPrice": true,
  "soldCount": 6916,
  "soldText": "5,000+ sold",
  "rating": 4.4,
  "isChoice": true,
  "isSponsored": false,
  "deliveryDaysMin": 4,
  "deliveryDaysMax": 7,
  "deliveryFrom": "2026-10-24",
  "deliveryTo": "2026-10-27",
  "badges": ["New shoppers save ￡12.32", "Top selling on AliExpress"],
  "categoryIds": ["18", "100005371", "200001927", "200001928"],
  "storeName": null,
  "sellerCompany": null,
  "listedAt": "2023-07-12",
  "position": 3,
  "page": 1,
  "searchQuery": "yoga mat",
  "searchUrl": "https://www.aliexpress.com/w/wholesale-yoga-mat.html?sortType=total_tranpro_desc",
  "shipTo": "GB",
  "scrapedAt": "2026-10-20T13:16:49.494Z"
}
```

## Use cases

- **Dropshipping product research**: find best sellers in a niche with sort by orders, a minimum sold count and a minimum rating, and see delivery times to your customers' country.
- **Price monitoring**: track prices and discounts of a search or category every day and spot price drops.
- **Competitor and market research**: see which products lead a search, how they are priced and how many units they have sold.
- **Search position tracking**: record where products rank for your keywords over time.
- **Local warehouses**: list products that ship from the United States or Europe, with their delivery days.
- **Datasets and AI**: clean, structured product data for catalogs, classification and LLM pipelines.

## How much does it cost?

You pay only for results: **$1.50 per 1,000 products**. That is the price on the Apify Free plan. Paid Apify plans pay less: $1.35 per 1,000 products on Starter, $1.20 on Scale and $1.05 on Business, which is the "from" price shown in Apify Store. There is no start fee, and proxy costs are included. The Apify free plan covers about 3,300 products every month.

## Tips

- **Best sellers**: choose **Orders** sorting and set **Minimum sold**; the search stops as soon as a whole page is below that number, so you do not pay for products you would filter out anyway.
- **Prices for new customers**: AliExpress often shows a lower first-order price to new visitors. Such products have `isNewShopperPrice: true` and a badge such as "New shoppers save £12.32"; `originalPrice` is the regular price shown next to it.
- **Promotional prices change**: the price on the search page is often a promotion and can differ from one visit to the next, while the regular price stays put. In our test, 26 of 99 products showed a different search-page price four minutes later; the regular price changed for 5. For margins and price tracking, use `originalPrice` as well as `price`.
- **Only real search results**: AliExpress sometimes fills a page with recommendations of other products, especially when shipping to Canada. The Actor loads such pages again from a new address and saves only the search results, so the positions and the sorting stay right.
- **Category links**: category pages are empty when shipping to France or Spain. Search keywords there, or use another ship-to country for the category.
- **Store names**: AliExpress puts the store on some cards only (most often on sponsored products), so `storeName` is empty for many products.
- **Daily monitoring**: save your input as a task and add a schedule. Every run records the current price, sold count and position of each product.
- **Errors per search**: see the `SUMMARY` record in the run's key-value store.

## FAQ

**Why not just ask an AI chatbot?** A chatbot with web search sees a few product pages and cannot list hundreds of products of a search with their current prices, sold counts and positions. This Actor reads AliExpress search pages themselves: every product of a search or category, up to 3,600, with prices and sales as numbers in the same fields every time, at a fixed price per 1,000 products. AI agents can call it as a tool through Apify's MCP server.

**Does it scrape product pages, variants or reviews?** No. It reads search and category results, which are fast and cheap to load. It does not collect reviews or reviewers' names.

**Why is the sold count higher than the label?** AliExpress rounds the label down ("5,000+ sold"); `soldCount` is the number from AliExpress's own counter on the same card.

**Why do I get fewer products than AliExpress says it has?** AliExpress shows at most 60 pages of 60 products for one search. For more, split the search: add price ranges, categories or more specific keywords.

**What happens when AliExpress shows a check page?** AliExpress asks for a check after a few pages from one address. The Actor does not solve it: it loads the page again from a new proxy address.

**Is it legal to scrape AliExpress?** The Actor collects publicly available product listings from AliExpress search pages, without logging in. Check the terms that apply to your use case. This Actor is not affiliated with AliExpress or Alibaba.

## Integrations and API

- **Google Sheets, Slack, email and BI tools**: connect the Actor to Make, Zapier or n8n, or use the **Integrations** tab of this Actor. Schedule it daily to track prices and sales over time.
- **Webhooks**: call your own URL when a run finishes, for example to load the results into your database.
- **AI agents (MCP)**: add `https://mcp.apify.com?tools=robertosan16/aliexpress-search-scraper` as an MCP server in Claude, Cursor or VS Code, and your agent can search AliExpress with this Actor.
- **API**: one request runs the Actor and returns the products, for runs of up to 5 minutes. Start longer runs with the `runs` endpoint and read the dataset when they finish.

```bash
curl -X POST "https://api.apify.com/v2/acts/robertosan16~aliexpress-search-scraper/run-sync-get-dataset-items?token=YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchQueries":["yoga mat"],"sort":"orders","maxItemsPerSearch":60,"shipTo":"US"}'
```

Missing a field or a feature? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.

## 中文简介

**速卖通（AliExpress）数据采集工具**：按关键词或类目链接抓取全球速卖通的商品搜索结果：标题、**价格、原价和折扣**、**精确销量**（例如 6,916，而不只是“5,000+ sold”）、评分、上架日期、**配送天数和预计送达日期**、Choice 和广告标记、图片以及商品在搜索结果中的位置。每次搜索最多 3,600 个商品，可以按销量或价格排序，设置价格区间、最低评分和最低销量，并选择收货国家（51 个）、币种和**发货地（海外仓：美国、西班牙、法国、德国等）**。

适合跨境电商**选品**、寻找爆款、竞品价格监控、海外仓商品调研和一件代发（dropshipping）。无需浏览器、无需登录。

价格：每 1,000 个商品 1.50 美元，已含代理费用，无启动费；Apify 免费套餐每月约可获取 3,300 个商品。

结果可导出为 JSON、CSV、Excel 或 HTML，也可以通过 API、定时任务、Webhook 或 n8n、Make、Zapier 接入。有问题请在 Issues 页面提问，或发邮件至 support@mozartstandard.com。
