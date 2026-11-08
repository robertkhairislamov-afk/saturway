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

## Места 25.10 (через 5 дней после новых текстов)

| Запрос | Всего | Наш актор и место (20.10 → 25.10) |
|---|---|---|
| play store | 4971 | Google Play 227 → **10** |
| google play | 6190 | Google Play 25 → 26 |
| google trends api | 1101 | Trends нет в 500 → **120** |
| google trends | 2013 | Trends 228 → 276 |
| aliexpress | 310 | AliExpress 222 → **147** |
| indeed / indeed scraper | 1522 | Indeed 151 → 159 / 106 → 110; All-in-One 82 по «indeed» |
| glassdoor | 344 | All-in-One 62, Glassdoor 123 |
| linkedin jobs | 2159 | LinkedIn 428 |
| job scraper | 12 839 | нет в 500 |
| app store | 3467 | App Store нет в 500 (было 456) |
| redfin | 624 | Redfin 54 |
| google ads transparency | 481 | Ads Transparency 150 |
| google news | 3334 | Google News 284 |
| seek / stepstone / infojobs | 12 961 / 125 / 71 | 120 / 77 / 57 |

Вывод: тексты работают там, где запрос совпал со словами в заголовке («play store» 227 → 10, «google trends api» → 120). Но даже в маленьких нишах (InfoJobs — 57-е из 71, StepStone — 77-е из 125) мы ниже середины: порядок в Store больше всего зависит от числа пользователей и запусков, а у нас их почти нет. Первая страница (20 мест) — только Google Play по «play store».

Через неделю (27.10) сравнить: `python3 rank.py "indeed scraper" "play store" "google trends api"` (листает `/v2/store?search=` по 100 и ищет `robertosan16`).

## Места 27.10 (через неделю после новых текстов)

| Запрос | Всего | Наш актор и место (20.10 → 25.10 → 27.10) |
|---|---|---|
| play store | 5079 | Google Play 227 → 10 → **10** |
| google play / google play scraper | 6338 / 2472 | Google Play 25 → 26 → 26 / 17 → 17 |
| aliexpress / aliexpress scraper / aliexpress product scraper | 317 / 317 / 311 | AliExpress 222 → 147 → **118** / 151 → **76** / 117 → **55** |
| google trends api | 1126 | Trends нет в 500 → 120 → 127 |
| google trends / google trends scraper | 2053 / 1986 | Trends 228 → 276 → **344** / 164 → **261** |
| trending now | 497 | Trends 34 → 52 |
| app store / app store scraper | 3561 / 2968 | App Store 456 → нет в 500 → нет / 235 → 261 |
| indeed / indeed scraper / indeed jobs scraper | 1548 / 1548 / 678 | Indeed 151 → 159 → 158 / 106 → 110 → 111 / 84 → 90; All-in-One 83 по «indeed» |
| job scraper / jobs scraper | 13 077 / 12 663 | нет в 500 |
| glassdoor | 343 | All-in-One 63, Glassdoor 122 |
| linkedin jobs | 2213 | LinkedIn 448 |
| redfin | 640 | Redfin 54 → **132** |
| google ads transparency | 492 | Ads Transparency 150 → 123 |
| google news | 3422 | Google News 284 → 285 |
| seek / stepstone / infojobs | 13 279 / 129 / 71 | 117 / 80 / 58 |

Вывод 27.10: точные слова держат и поднимают места там, где мало конкурентов (play store, AliExpress); в общих запросах (google trends, app store, job scraper) и у Redfin места падают — их решают пользователи и отзывы.

## Места 8.11

Замер через API Store с полным перебором выдачи (первая страница приходит неполной, 93–95 из 100: прошлые замеры могли занижать места за 100-м). В скобках — 27.10.

| Запрос | Всего | Наш актор и место |
|---|---|---|
| play store / google play / google play scraper | 5843 / 7384 / 2932 | Google Play 11 (10) / 31 (26) / 20 (17) |
| app store / app store scraper | 4092 / 3431 | App Store 438 (нет) / 222 (261) |
| aliexpress / aliexpress scraper / aliexpress product scraper | 376 / 376 / 369 | AliExpress 220 (118) / 154 (76) / 89 (55) |
| google trends / scraper / api / trending now | 2376 / 2303 / 1309 / 647 | Trends 363 (344) / 284 (261) / 159 (127) / 50 (52) |
| google ads transparency / google ads | 595 / 1324 | Ads Transparency 391 (123) / 489 |
| google news / google news scraper | 4060 / 3261 | News 278 (285) / 236 |
| redfin / redfin scraper | 728 / 179 | Redfin 145 (132) / 92 |
| indeed / indeed scraper / indeed jobs scraper | 1690 / 1690 / 739 | Indeed 124 (158) / 75 (111) / 70 (90) |
| glassdoor / glassdoor jobs | 362 / 334 | Glassdoor 180 (122) / 84 |
| linkedin jobs / linkedin jobs scraper | 2488 / 2094 | LinkedIn 483 (448) / 423 |
| all in one jobs scraper | 776 | All-in-One 1 |
| stepstone / seek / infojobs / reed / jobstreet / jobsdb / dice / wttj | 151 / 15754 / 80 / 71571 / 116 / 119 / 36231 / 110 | 47 (80) / 131 (117) / 63 (58) / 72 / 63 / 41 / 77 / 80 |
| wellfound / xing / foundit / workday jobs scraper | 166 / 33775 / 1765 / 1039 | 54 / 45 / 29 / 147 |
| greenhouse / lever / ashby | 2241 / 52706 / 1895 | нет в 500 |

Вывод 8.11: выросли акторы, у которых появились платящие (StepStone 80 → 47, Indeed 158 → 124) и App Store; упали те, у кого за месяц не осталось живых пользователей (Ads Transparency 123 → 391, AliExpress 118 → 220, Glassdoor). Категории Ads и AliExpress поменяли 4.11 — совпадение по времени есть, но падение больше похоже на потерю пользователей; не откатываем, смотрим следующий замер.

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
