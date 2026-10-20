// Writes the synthetic search pages the tests read. The cards follow the structure of real
// AliExpress search pages (October 2026); the products, stores and numbers are made up.
import { writeFileSync } from 'node:fs';

const full = (id, extra = {}) => ({
  itemType: 'productV3',
  productType: 'natural',
  productId: id,
  lunchTime: '2024-08-06 00:00:00',
  image: { imgUrl: `//ae-pic-a1.aliexpress-media.com/kf/S${id}.jpg` },
  images: [{ imgUrl: `//ae-pic-a1.aliexpress-media.com/kf/S${id}.jpg` }, { imgUrl: `//ae-pic-a1.aliexpress-media.com/kf/S${id}b.jpg` }],
  title: { displayTitle: `Test product ${id} &amp; case` },
  prices: {
    salePrice: { currencyCode: 'GBP', minPrice: 2, formattedPrice: '£2.00', discount: 55 },
    originalPrice: { currencyCode: 'GBP', minPrice: 4.44, formattedPrice: '£4.44' },
  },
  trade: { tradeDesc: '10,000+ sold' },
  evaluation: { starRating: 4.7 },
  sellingPoints: [
    { tagContent: { tagText: 'New shoppers save £2.44' } },
    { tagContent: { tagText: 'Top selling on AliExpress' } },
    { tagContent: { tagText: 'Delivery: Oct 24 - 27' } },
    { source: 'choice_atm', tagContent: { tagText: 'Choice' } },
  ],
  trace: {
    utLogMap: { real_trade_count: '12345', salePriceAmount: '200', originPriceAmount: '444', star_rating: '4.7', isChoice: 'true', delivery_info: '4,7,2026-10-24,2026-10-27', categoryId: '202192403,380230' },
    custom: {},
  },
  ...extra,
});

const pageOf = (cards, { page = 1, total = 150 } = {}) => {
  const data = { data: { root: { fields: { pageInfo: { page, pageSize: 60, totalResults: total }, mods: { itemList: { content: cards } } } } } };
  return `<!doctype html><html><head><title>Phone case - AliExpress</title></head><body><script>
window._dida_config_ = {}; window._dida_config_._init_data_= { data: ${JSON.stringify(data)} };
var other = { "text": "a } brace in a string" };</script></body></html>`;
};

const cards = [
  full('1005001'),
  // An ad with a store, without prices on the card (they are in the tracking data).
  full('1005002', {
    productType: 'ad',
    prices: undefined,
    trade: { tradeDesc: '4K+ sold' },
    trace: {
      utLogMap: { real_trade_count: '', salePriceAmount: '133', originPriceAmount: '315', star_rating: '', isChoice: 'false', delivery_info: '', categoryId: '' },
      custom: { p4pExtendParam: JSON.stringify({ company_name: 'Test Trading Co., Ltd.', store_name: 'Miss Z&#39; Store' }) },
    },
    sellingPoints: [{ tagContent: { tagText: 'Ad' } }, { tagContent: { tagText: 'Free shipping' } }],
    evaluation: undefined,
  }),
  // A repeat of the first product.
  full('1005001'),
  // A new product without sales or rating.
  full('1005003', { trade: undefined, evaluation: undefined, trace: { utLogMap: { salePriceAmount: '99', originPriceAmount: '99', isChoice: 'false' } }, prices: { salePrice: { currencyCode: 'GBP', minPrice: 0.99, formattedPrice: '£0.99' } }, sellingPoints: [] }),
  // A card without a product ID.
  { itemType: 'banner' },
];
writeFileSync(new URL('./search-full.html', import.meta.url), pageOf(cards));

// A page where AliExpress answered with recommendations of other products instead of results.
const recommended = [
  { productId: '1005009', productType: 'natural', tItemType: 'ahe_app_rcmd_new_card', image: { imgUrl: '//ae-pic-a1.aliexpress-media.com/kf/S9.jpg' }, title: { displayTitle: 'Recommended product' }, prices: { salePrice: { currencyCode: 'CAD', minPrice: 7.38, formattedPrice: 'C$7.38' } } },
  { productId: '1005010', productType: 'natural', tItemType: 'ahe_app_rcmd_new_card', title: { displayTitle: 'Another recommendation' } },
  full('1005011'),
];
writeFileSync(new URL('./search-recommended.html', import.meta.url), pageOf(recommended, { page: 2, total: 61 }));

writeFileSync(new URL('./check.html', import.meta.url), '<html><head><script>var url = "/_____tmd_____/punish?x5secdata=abc";</script></head><body>Please slide to verify</body></html>');
