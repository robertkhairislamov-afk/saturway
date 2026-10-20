# Тексты в Store: разбор лидеров и предложения, 20.10

Плагин Marketing в сеансе не был включён — разбор сделан вручную по публичному API Store (`/v2/store?search=`, `/v2/acts/<актор>`).

## Что видно у лидеров

| Ниша | Лидер (пользователей за 30 дней) | Заголовок | SEO-поля |
|---|---|---|---|
| Indeed | valig 4454 | 💡 Indeed Jobs Scraper | нет |
| Indeed | borderline 2602 | 🚀 Indeed jobs scraper [PPR] | нет |
| Indeed | misceres 2136 | Indeed Scraper | «💼 Indeed Scraper» |
| Indeed | kaix 1319 | Indeed Jobs Scraper - Most Comprehensive | нет |
| Google Play | automation-lab 221 | Google Play Store Scraper | «Google Play Store Scraper: Apps, Ratings & Reviews» |
| Google Play | solidcode 98 | Google Play Apps Scraper | нет |
| AliExpress | zen-studio 258 | AliExpress Product Scraper - Prices, Variants & Reviews | то же |
| AliExpress | devcake 257 | AliExpress Products Scraper | нет |
| AliExpress | khadinakbar 237 | AliExpress Scraper — Products, Reviews & Sellers | то же |
| Google Trends | apify 2511 | Google Trends Scraper | «📈📉 Google Trends Scraper», описание начинается с «Google Trends API» |
| Google Trends | data_xplorer 719 | Google Trends Scraper | «Google Trends API Scraper - Search Volume…» |

Выводы:

1. **Тексты лидеров не лучше наших.** У половины SEO-полей нет совсем. Наверх их поднимают пользователи, отзывы и доля успешных запусков, а не слова. Поэтому правка текстов даст немного; главное — привести первых пользователей снаружи.
2. **Заголовок — точное поисковое слово.** У всех лидеров заголовок начинается с «<Сайт> Scraper» или «<Сайт> Jobs Scraper», без лишнего.
3. **Слова, которых у нас нет:** «Play Store» (у automation-lab), «Product(s)» у AliExpress (у трёх лидеров из четырёх), «API» у Google Trends (у apify и data_xplorer), «Job Scraper» в единственном числе.
4. Цифры и отличия в описании: kaix — «60+ fields», «54 countries»; valig — цена в начале. У нас отличия уже есть (62 страны, точные продажи, без предела в 5 слов).

## Наши места в поиске Store 20.10 (API Store, первые 500)

| Запрос | Всего | Наш актор и место |
|---|---|---|
| indeed / indeed scraper / indeed jobs / indeed jobs scraper | 1457 / 1457 / 679 / 634 | Indeed 151 / 106 / 102 / 84 |
| job scraper / jobs scraper | 12 091 / 11 704 | нет в первых 500 |
| google play / google play scraper | 5655 / 2157 | Google Play 25 / 17 |
| play store | 4545 | Google Play 227 |
| app store / app store scraper | 3212 / 2658 | App Store 456 / 235 |
| aliexpress / aliexpress scraper / aliexpress product scraper | 290 / 290 / 284 | AliExpress 222 / 151 / 117 |
| google trends / google trends scraper | 1865 / 1809 | Trends 228 / 164 |
| google trends api | 1017 | Trends нет в первых 500 |
| trending now | 461 | Trends 34 |

Через неделю (27.10) сравнить: `python3 rank.py "indeed scraper" "play store" "google trends api"` (листает `/v2/store?search=` по 100 и ищет `robertosan16`).

## Предложения

Полные тексты — в `proposals.json`. Имена и адреса акторов не меняются (на них ссылаются статьи на Medium). Цены не трогаем.

| Актор | Сейчас | Предлагаю | Зачем |
|---|---|---|---|
| Indeed | Indeed Jobs Scraper | Indeed Jobs Scraper & API: 62 Countries, Salaries | слова «API», «62 countries»; SEO-заголовок начинается с «Indeed Scraper» — запрос лидера misceres |
| Google Play | Google Play Scraper: Apps & Top Charts | Google Play Store Scraper: Apps, Charts & ASO | «play store» — 227-е место; ASO — запрос, под который есть отдельные конкуренты |
| AliExpress | AliExpress Search Scraper: Products, Prices & Sales | AliExpress Product Scraper: Exact Sales & Prices | «product scraper» как у трёх лидеров; главное отличие — точные продажи — в заголовке |
| Google Trends | (заголовок оставить) | описание и SEO начинаются с «Google Trends API» | по «google trends api» нас нет в первых 500; «Trending now» уже даёт 34-е место — оставляем |
| All-in-One | All-in-One Jobs Scraper | All-in-One Job Scraper: LinkedIn, Indeed, Glassdoor | «all-in-one» сохраняем (там 1-е место), добавляем «job scraper» и три больших сайта |

## Как применить (делает владелец)

```bash
cd apify/marketing/store-seo
node apply.mjs                         # только сравнить, токен не нужен
APIFY_TOKEN=... node apply.mjs --apply indeed-jobs-scraper   # применить выбранные
```

Токен — новый, после перевыпуска; в чат и в репозиторий его не вставлять. Можно и вручную: Console → актор → Publication → Display information / SEO.

После применения обновить исходники, чтобы следующая сборка не вернула старое: `actors/ats-jobs/scripts/actors.mjs` (Indeed и `multi`) и `.actor/actor.json` у Google Play, AliExpress и Trends.
