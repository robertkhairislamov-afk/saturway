# Исследование Apify Store, 16.11.2026: не-скраперы (задание 4) и кто зарабатывает (задание 5)

## Откуда данные (правило 6)

- **[Страница]**: публичные данные актора через API Apify (`/v2/acts/{автор~актор}` и `/v2/store`). Это те же цифры, что на странице актора: пользователи всего и за 30 дней, запуски за 30 дней, рейтинг, отзывы, цена (тариф Free), дата обновления. Сняты 16.11.2026.
- **[Apify]**: заявления Apify (блог, справка, страница для разработчиков).
- **[Автор]**: заявления самих авторов или сторонних статей.
- **Суждение**: мои выводы.

**Как построены ниши.**
- Выгружены 14 830 акторов Store. API отдаёт первые ~15 тыс. по числу пользователей за всё время, это все акторы примерно от 350 пользователей. Плюс поиск Store по 70 запросам ниш, чтобы поймать новые акторы.
- Акторы отнесены к нише по словам в названии. Скраперы конкретных сайтов исключены. Поэтому суммы по нишам приблизительные, а таблицы лидеров проверены вручную.

**Сколько продать для $1 000 чистыми (правило 5).** При комиссии 20% и средней скидке 10% автору остаётся 0.72 × P с 1 000 результатов. Нужно продать R = 1 000 000 / (0.72 × P) результатов в месяц, без учёта расходов платформы (их Apify вычитает из выплаты).

## Задание 4. Не-скраперы

### Сводка по нишам [Страница, суммы по классификации]

| Ниша | Акторов | Польз./30 дн. всех | Запусков на польз. в месяц | Акторов 100+ (авторов) | Ниша подтверждена (правило 3) | Медиана цены за 1 000 |
|---|---|---|---|---|---|---|
| Документы, PDF, OCR | 836 | 2 622 | 30 | 6 (6) | да | $3 |
| Конвертация и обогащение | 1 473 | 8 812 | 139 | 12 (11) | да, но лидеры бесплатные (Apify) | $3 |
| Проверка email и телефонов | 536 | 8 194 | 109 | 14 (14) | да | $1 |
| SEO-инструменты и аудит | 1 201 | 9 526 | 52 | 16 (15) | да | $4 |
| Мониторинг изменений страниц | 820 | 2 041 | 319 | 1 (1), и тот скрапер | нет | $3 |
| Генерация отчётов | 131 | 235 | 119 | 0 | нет | $9.8 |
| MCP-серверы | 426 | 1 148 | 68 | 0 | нет | $5 |
| AI-агенты и LLM-инструменты | 732 | 78 432 | 90 | 10 (4) | да, но 95% пользователей у самого Apify | $4 |
| CRM, мессенджеры, интеграции | 307 | 2 224 | 95 | 3 (3), из них 2 бесплатные Apify | формально да | $2 |

### Лидеры по нишам [Страница, 16.11.2026]

Цена: тариф Free за 1 000 событий указанного типа. «Бесплатно» = актор без платы. Последняя колонка — сколько нужно продать для $1 000 чистыми.

**Документы, PDF, OCR**

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Событие | Обновлён | Для $1 000 |
|---|---|---|---|---|---|---|---|
| [memo23/pdf-text-extractor](https://apify.com/memo23/pdf-text-extractor) | 570 | 195 | 5.0 (2) | $5 | pdf-processed | 13.11.2026 | 277 778 |
| [steadydata/image-ocr-text](https://apify.com/steadydata/image-ocr-text) | 273 | 178 | — (0) | $3 | image-read | 13.11.2026 | 462 963 |
| [zenomastro/image-ocr-text-extractor](https://apify.com/zenomastro/image-ocr-text-extractor) | 338 | 131 | — (0) | $5 | image-ocr | 03.11.2026 | 277 778 |
| [automation-lab/pdf-text-extractor](https://apify.com/automation-lab/pdf-text-extractor) | 681 | 110 | — (0) | $3.45 | pdf-extracted | 12.11.2026 | 402 576 |
| [zen-studio/google-lens-ocr](https://apify.com/zen-studio/google-lens-ocr) | 653 | 63 | 5.0 (1) | $4.99 | image-ocr | 14.11.2026 | 278 334 |

**Конвертация и обогащение**

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Обновлён | Для $1 000 |
|---|---|---|---|---|---|---|
| [apify/screenshot-url](https://apify.com/apify/screenshot-url) | 10 474 | 1 994 | 3.9 (20) | бесплатно | 29.01.2026 | — |
| [apify/facebook-url-to-id](https://apify.com/apify/facebook-url-to-id) | 6 458 | 611 | 5.0 (6) | бесплатно | 13.11.2026 | — |
| [lukaskrivka/dedup-datasets-limited-permissions](https://apify.com/lukaskrivka/dedup-datasets-limited-permissions) | 834 | 403 | — (0) | бесплатно | 23.09.2026 | — |
| [cheapapi/website-screenshot-api](https://apify.com/cheapapi/website-screenshot-api) | 565 | 298 | 5.0 (1) | $0.89 | 24.10.2026 | 1 560 549 |
| [moonweil/url-screenshot-api](https://apify.com/moonweil/url-screenshot-api) | 362 | 150 | — (0) | $4 | 11.11.2026 | 347 222 |

**Проверка email и телефонов**

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Событие | Обновлён | Для $1 000 |
|---|---|---|---|---|---|---|---|
| [bounceverify/bounceverify-email-verifier](https://apify.com/bounceverify/bounceverify-email-verifier) | 7 658 | 2 838 | 4.8 (5) | $0.89 | email-verified | 05.10.2026 | 1 560 549 |
| [michael.g/email-verifier-validator](https://apify.com/michael.g/email-verifier-validator) | 2 612 | 493 | 4.7 (37) | $100 | dataset item | 08.11.2026 | 13 889 |
| [devscrapper/whatsapp-number-validator](https://apify.com/devscrapper/whatsapp-number-validator) | 4 851 | 397 | 5.0 (6) | $7 | number-checked | 10.11.2026 | 198 413 |
| [blessiticus/email-verifier-pro](https://apify.com/blessiticus/email-verifier-pro) | 567 | 234 | 5.0 (25) | $0.85 | dataset item | 12.11.2026 | 1 633 987 |
| [ryanclinton/bulk-email-verifier](https://apify.com/ryanclinton/bulk-email-verifier) | 1 097 | 173 | — (0) | $5 | email-verified | 11.11.2026 | 277 778 |

**SEO-инструменты**

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Событие | Обновлён | Для $1 000 |
|---|---|---|---|---|---|---|---|
| [aitorsm/keyword-volume](https://apify.com/aitorsm/keyword-volume) | 3 045 | 977 | — (0) | $12 | keyword-metrics | 13.11.2026 | 115 741 |
| [memo23/keyword-metrics](https://apify.com/memo23/keyword-metrics) | 1 484 | 861 | — (0) | $250 | google-batch (пакет слов) | 16.11.2026 | 5 556 пакетов |
| [pro100chok/semrush-scraper](https://apify.com/pro100chok/semrush-scraper) | 3 215 | 795 | 3.0 (6) | $15 | dataset item | 19.10.2026 | 92 593 |
| [steadyfetch/keyword-search-volume-scraper](https://apify.com/steadyfetch/keyword-search-volume-scraper) | 1 055 | 441 | — (0) | $12 | keyword-result | 15.11.2026 | 115 741 |
| [radeance/ahrefs-scraper](https://apify.com/radeance/ahrefs-scraper) | 2 679 | 396 | 3.0 (11) | $10 | RESULT | 29.10.2026 | 138 889 |

**Мониторинг изменений страниц.** Ниша не подтверждена. Ниже — именно мониторы, без скраперов.

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Обновлён |
|---|---|---|---|---|---|
| [santamaria-automations/rss-feed-reader](https://apify.com/santamaria-automations/rss-feed-reader) | 128 | 56 | — (0) | $2 | 14.11.2026 |
| [ryanclinton/wayback-machine-search](https://apify.com/ryanclinton/wayback-machine-search) | 259 | 32 | — (0) | $3.5 | 11.11.2026 |
| [dltik/http-status-checker](https://apify.com/dltik/http-status-checker) | 44 | 16 | — (0) | $1 | 07.06.2026 |
| [ryanclinton/website-change-monitor](https://apify.com/ryanclinton/website-change-monitor) | 55 | 11 | — (0) | $100 | 11.11.2026 |

**Генерация отчётов.** Ниша не подтверждена.

| Актор | Всего | 30 дн. | Цена/1k | Обновлён |
|---|---|---|---|---|
| [ichigowa/sports-injury-reports](https://apify.com/ichigowa/sports-injury-reports) | 265 | 62 | $0.3 | 06.09.2026 |
| [apify/monitoring-reporter-mail](https://apify.com/apify/monitoring-reporter-mail) | 64 | 5 | бесплатно | 21.06.2024 |
| [automation-lab/website-health-report](https://apify.com/automation-lab/website-health-report) | 22 | 4 | $3.45 | 12.11.2026 |

**MCP-серверы.** Ниша не подтверждена: ни одного актора со 100+ пользователями в месяц.

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Событие | Обновлён |
|---|---|---|---|---|---|---|
| [mrbridge/espn-mcp-server](https://apify.com/mrbridge/espn-mcp-server) | 293 | 96 | — (0) | $5 | tool-read | 06.11.2026 |
| [smacient/google-keyword-planner-mcp](https://apify.com/smacient/google-keyword-planner-mcp) | 755 | 47 | 4.2 (8) | $45 | get_keyword_ideas | 29.07.2026 |
| [themineworks/india-jobs-mcp](https://apify.com/themineworks/india-jobs-mcp) | 259 | 43 | — (0) | $35 | search_jobs_naukri | 11.11.2026 |
| [makework36/airbnb-mcp-server](https://apify.com/makework36/airbnb-mcp-server) | 107 | 35 | — (0) | $10 | tool-call | 27.10.2026 |
| [mrbridge/latest-news-mcp-server](https://apify.com/mrbridge/latest-news-mcp-server) | 120 | 34 | — (0) | $8 | tool-read | 07.11.2026 |

**AI-агенты и LLM-инструменты**

| Актор | Всего | 30 дн. | Запусков/30 дн. | Рейтинг (отзывы) | Цена/1k | Создан / обновлён |
|---|---|---|---|---|---|---|
| [apify/web-fetch](https://apify.com/apify/web-fetch) | 59 860 | 32 644 | 1 950 571 | 5.0 (4) | $1.5 | 30.07.2026 / 10.11.2026 |
| [apify/rag-web-browser](https://apify.com/apify/rag-web-browser) | 212 833 | 27 615 | 974 915 | 4.7 (35) | $2.28 | 11.09.2024 / 28.10.2026 |
| [apify/website-content-crawler](https://apify.com/apify/website-content-crawler) | 178 618 | 11 996 | 3 714 034 | 4.6 (235) | бесплатно (платит пользователь за ресурсы) | 27.03.2023 / 16.11.2026 |
| [apify/web-search](https://apify.com/apify/web-search) | 12 813 | 9 949 | 6 190 | 5.0 (1) | $5 | 08.09.2026 / 06.11.2026 |
| [apify/openrouter](https://apify.com/apify/openrouter) | 23 691 | 784 | 42 787 | 4.9 (10) | $0.1 | 04.06.2025 / 11.11.2026 |
| [fayoussef/bulk-llm-runner](https://apify.com/fayoussef/bulk-llm-runner), лучший сторонний | 834 | 265 | 5 197 | 5.0 (2) | $2 | 22.05.2026 / 15.11.2026 |

**CRM, мессенджеры, интеграции**

| Актор | Всего | 30 дн. | Рейтинг (отзывы) | Цена/1k | Обновлён |
|---|---|---|---|---|---|
| [lukaskrivka/google-sheets](https://apify.com/lukaskrivka/google-sheets) | 5 188 | 877 | 4.8 (7) | бесплатно | 29.07.2026 |
| [apify/send-mail](https://apify.com/apify/send-mail) | 3 914 | 426 | 5.0 (9) | бесплатно | 11.11.2026 |
| [memo23/http-request](https://apify.com/memo23/http-request) | 412 | 195 | 5.0 (1) | $5 | 14.11.2026 |
| [riceman/send-http-requests](https://apify.com/riceman/send-http-requests) | 1 030 | 78 | 5.0 (2) | $5 | 17.03.2026 |
| [apify/airtable-apify-airtable](https://apify.com/apify/airtable-apify-airtable) | 133 | 26 | 5.0 (4) | бесплатно | 05.11.2026 |

### Сколько зарабатывает сегмент

- Выручку отдельных акторов Apify не публикует: **не найдено**.
- Косвенные признаки [Страница] в таблицах выше: пользователи и запуски за 30 дней, цены.
- [Автор: исследование 900 акторов](https://dev.to/nikita_iakovlev_415524c19/i-measured-900-apify-actors-and-got-the-price-wrong-by-100x-heres-the-corrected-data-3418) считает выручку снизу как «запуски × цена × 0.8». По этому методу медиана среди зарабатывающих сторонних акторов — $14 в месяц, а $1 000+ в месяц имеют 35 из 829. Метод не наш, приводим как заявление автора.

### Регулярное использование

- **Факт [Страница]:** число запусков на пользователя в месяц.
  - Мониторинг: 319.
  - Конвертация и обогащение: 139.
  - Генерация отчётов: 119, на очень малой базе (235 пользователей на всю нишу).
  - Проверка email: 109.
  - Интеграции: 95.
  - AI и LLM: 90.
  - MCP: 68.
  - SEO: 52.
  - Документы: 30.
  - Отдельные лидеры: michael.g/email-verifier 430, blessiticus/email-verifier-pro 316, apify/website-content-crawler 310, pro100chok/semrush-scraper 140.
- **Суждение:** больше 60–100 запусков на пользователя в месяц означает автоматизацию по расписанию или вызовы из чужого кода, а не ручные разовые запуски.
  - Регулярные задачи: проверка email перед рассылками, обогащение лидов в CRM-конвейерах, загрузка сайтов в RAG-базы, HTTP-запросы и выгрузка в Google Sheets из сценариев n8n и Make, мониторинг RSS и статусов.
  - Разовые задачи: документы и OCR (30 запусков), SEO-исследование ключевых слов.

### Какие акторы вызывают AI-агенты через Apify MCP

- **Сколько раз каждый актор вызывают именно через MCP:** Apify не публикует, **не найдено**.
- **[Apify]:** у [MCP-сервера Apify](https://docs.apify.com/mcp) есть инструменты по умолчанию.
  - [Документация](https://docs.apify.com/mcp): apify/rag-web-browser и apify/web-fetch.
  - [README и PR на GitHub](https://github.com/apify/apify-mcp-server/pull/1820): более новые инструменты по умолчанию — apify/web-search и apify/web-fetch; rag-web-browser убран.
  - Подключённый к этой сессии MCP-сервер Apify показывает инструменты `apify--web-fetch` и `apify--rag-web-browser`.
- **[Страница]:** web-fetch создан 30.07.2026 и уже имеет 32 644 пользователя за 30 дней и 1.95 млн запусков. web-search создан 08.09.2026 и уже имеет 9 949 пользователей. Это самые быстрые взлёты в Store.
- **[Apify]:** поиск акторов для агентов (инструмент `search-actors`) ранжирует по оценке качества — той же, что поиск Store и Apify AI.
- **Суждение. Почему вызывают именно эти:**
  1. Их ставят по умолчанию, и агент вызывает их без поиска.
  2. Они универсальные: «прочитать страницу», «найти в Google».
  3. Их пишет сам Apify, они дешёвые ($1.5–5) и отвечают быстро.

  Сторонние MCP-серверы набирают максимум 96 пользователей в месяц. Агенты чаще берут обычные популярные акторы через `search-actors` и `call-actor`, чем отдельные MCP-обёртки.

### Выводы по заданию 4 (суждение)

1. **Документы и OCR.** Ниша подтверждена: 4 разных автора со 100–195 пользователями. Лидеры молодые (созданы в апреле–сентябре 2026), почти без отзывов, цена $3–5. Работа идёт с файлами пользователя, сайты не скрапятся, нет условий сайтов и защиты от ботов. Из всех ниш эта лучше всего подходит под наши правила.
2. **Объём ключевых слов.** Ниша подтверждена: 977, 861 и 441 пользователь, $12 за 1 000 слов. Но данных нет без аккаунта Google Ads или платного API (DataForSEO и подобные), а это расходы и вопрос условий. Без проверки источника не брать.
3. **Проверка email.** Спрос большой и регулярный, но идёт ценовая война: $0.85–0.89 за 1 000, лидер — 2 838 пользователей. Для $1 000 нужно 1.6 млн проверок в месяц. Не для нас.
4. **AI и веб для агентов.** Эту нишу занимает сам Apify (web-fetch, web-search, rag-web-browser): 95% пользователей. Конкурировать с инструментами по умолчанию бессмысленно.
5. **MCP-серверы, мониторинг, отчёты.** Спрос не подтверждён: лидеры собирают 11–96 пользователей.
6. **Интеграции.** Лидеры бесплатные, от сотрудников Apify. Платный спрос — только HTTP-запросы (195 пользователей).

## Задание 5. Кто зарабатывает и на чём

### Заявления о доходе и проверка по страницам

| Автор (Store) | Заявлено (источник) | Акторов: заявлено / сейчас [Страница] | Польз./30 дн. всех акторов [Страница] | Главный актор [Страница] | Время до $1 000 | Канал первых пользователей |
|---|---|---|---|---|---|---|
| ParseForge ([parseforge](https://apify.com/parseforge)) | Один актор (скрапер объявлений о продаже бизнеса, название не указано) ~$1 000/мес постоянно; лучший месяц $8 000 от одного клиента ([блог Apify, 12.02.2026](https://blog.apify.com/parseforge-actor-factory/)) | 124 / 995 | 3 057 | В статье не назван. Сейчас самый крупный — [tiktok-hashtag-analytics-scraper](https://apify.com/parseforge/tiktok-hashtag-analytics-scraper): 236 польз., $6.55, обновлён 21.10.2026 | не найдено | Первым на новом сайте: «за 24–48 часов» страница актора выходит в Google; отзывы и надёжность |
| SIÁN, Rapha ([sian.agency](https://apify.com/sian.agency)) | 1-е место $1M Challenge, $30 000; выручка растёт каждый месяц, кроме одного, с августа 2025; суммы не названы ([блог Apify, 30.07.2026](https://blog.apify.com/apify-builder-spotlight-sian-agency/)) | «сотни» / 464 | 3 012 | [instagram-ai-transcript-extractor](https://apify.com/sian.agency/instagram-ai-transcript-extractor): 222 польз., $28, рейтинг 2.3 (12), обновлён 12.11.2026 | не найдено | не найдено (сам узнал об Apify с YouTube) |
| John Cole ([johnvc](https://apify.com/johnvc)) | 2-е место, $20 000; выручка не названа; в статье 4.2K пользователей в месяц ([блог Apify, 27.08.2026](https://blog.apify.com/apify-builder-spotlight-john-cole/)) | ~100 / 68 | 11 483 | [YoutubeTranscripts](https://apify.com/johnvc/YoutubeTranscripts): 6 976 польз., $2.75, 4.8 (11), обновлён 15.11.2026 | не найдено | Свои продукты, затем публикация в сообществах |
| Goldmine, Daniel Mesfin ([logical_scrapers](https://apify.com/logical_scrapers)) | Приз EMEA; выручка не названа; ~1.1K пользователей в месяц ([блог Apify, 31.08.2026](https://blog.apify.com/apify-builder-spotlight-goldmine/)) | 40 / 50 | 1 005 | [threads-post-scraper](https://apify.com/logical_scrapers/threads-post-scraper): 382 польз., $2.5, 4.5 (10), обновлён 10.11.2026 | не найдено | Reddit и форумы |
| HappiTap ([happitap](https://apify.com/happitap)) | 3-е место, $10 000 ([X Apify](https://x.com/apify/status/2019094737022595370)); выручка не названа | не найдено / 97 | 174 | alibaba-product-scraper: 25 польз. | не найдено | не найдено |
| Gui Stetelle ([gui-stetelle](https://apify.com/gui-stetelle)) | Приз LATAM, $2 000; выручка не названа ([блог Apify](https://blog.apify.com/apify-builder-spotlight-gui-stetelle/)) | 1 / 1 | 9 | [google-maps-satellite-image](https://apify.com/gui-stetelle/google-maps-satellite-image): 9 польз., $10, обновлён 18.06.2026 | не найдено | не найдено |
| Igor Olaizola ([igolaizola](https://apify.com/igolaizola)) | Отзыв на [странице Apify для разработчиков](https://apify.com/partners/actor-developers): график выплат за 15 мес., 37 акторов; суммы только на картинке | 37 / 95 | 3 326 | [facebook-ad-library-scraper](https://apify.com/igolaizola/facebook-ad-library-scraper): 743 польз., $0.75, 3.9 (11), обновлён 09.10.2026 | не найдено | не найдено |
| Автор поста на Indie Hackers (актор LoopNet/Crexi) | $55.82 в первый месяц, $177.98 во второй (май 2026), $5/1 000 ([Indie Hackers](https://www.indiehackers.com/post/i-charge-5-per-1-000-results-my-niche-apify-actor-tripled-its-revenue-in-month-two-c9e85e2046), по выдаче поиска; страница отдала 403) | не найдено | не найдено | не проверен (имя актора не найдено) | не найдено | не найдено |
| Cizze R (dev.to [weeknds](https://dev.to/weeknds/how-i-built-7-apify-actors-and-started-earning-passive-income-from-web-scraping-5b9e)) | Фактического дохода нет, только прогноз $14–21 на актор в месяц | 7 / не найдено | не найдено | — | — | — |
| miccho27 ([miccho27](https://apify.com/miccho27)) | Дохода не называет; 10 акторов за 2 дня ([dev.to](https://dev.to/miccho27/how-to-build-and-monetize-apify-actors-a-practical-guide-from-shipping-10-actors-3f56)) | 10 / 17 | 31 | social-video-downloader: 5 польз. | — | — |

**Для сравнения: крупнейшие по пользователям без публичных заявлений о доходе [Страница]**

| Автор | Акторов | Польз./30 дн. | Главный актор |
|---|---|---|---|
| harvestapi | 14 | 81 294 | [linkedin-profile-scraper](https://apify.com/harvestapi/linkedin-profile-scraper): 16 311 польз., $4 |
| curious_coder | 42 | 27 151 | [linkedin-jobs-scraper](https://apify.com/curious_coder/linkedin-jobs-scraper): 13 675 польз., $2 |
| memo23 | 845 | 26 153 | taobao-scraper: 960 польз., $4 |
| fantastic-jobs | 27 | 4 086 | [career-site-job-listing-api](https://apify.com/fantastic-jobs/career-site-job-listing-api): 1 571 польз., $12, 4.1 (14) |
| robertosan16 (мы) | 33 | 37 | all-in-one-jobs-scraper: 4 польз. |

**Заявления Apify [Apify]**
- [Справка, 22.10.2025](https://help.apify.com/en/articles/8684010-make-money-publishing-your-actors-on-apify-store): «самые успешные независимые авторы зарабатывают больше $10 000 в месяц постоянной выручки», «многие — больше $1 000 в месяц». Имена не раскрываются.
- [Страница для разработчиков](https://apify.com/partners/actor-developers): $2M выплат в месяц, 7 500 разработчиков, «многие зарабатывают больше $3k».

### Закономерности (суждение)

1. **Одиночный хит, а не портфель.**
   - Пользователи сосредоточены в одном-двух акторах: у johnvc 61% пользователей в одном актере (YouTube-транскрипты), у harvestapi 81 тыс. пользователей на 14 акторов (всё LinkedIn).
   - «Фабрики» на сотни акторов (parseforge — 995, sian.agency — 464, memo23 — 845) дают по 3–31 пользователя на актор. Подтверждённая выручка ParseForge — опять один актор (~$1 000/мес).
   - Портфель помогает найти хит, но деньги приносит хит.
2. **Дорого и нишево выгоднее, чем дёшево и массово, при одинаковых затратах.**
   - По [исследованию 900 акторов](https://dev.to/nikita_iakovlev_415524c19/i-measured-900-apify-actors-and-got-the-price-wrong-by-100x-heres-the-corrected-data-3418) акторы дороже $15 за 1 000 при в 7 раз меньшем трафике зарабатывают в 22 раза больше, чем дешевле $1.
   - Исключение — огромный спрос (LinkedIn, YouTube), где работают и $2–4.
3. **Время до $1 000 в месяц** не назвал ни один источник (**не найдено**). Призы конкурса — не выручка: у Gui Stetelle 9 пользователей, у HappiTap 174.
4. **Каналы:**
   - Названы: выход страницы актора в Google, если ты первым сделал актор для сайта или задачи (ParseForge); сообщества — Reddit, форумы (Goldmine, John Cole); собственные продукты автора.
   - Как источник первых пользователей нигде не названы: YouTube, шаблоны n8n/Make, партнёрка (**не найдено**).

### Что повторимо для автора с ~10 акторами и почти без аудитории (суждение)

1. **Не множить акторы, а найти один спрос и сделать лучший актор в нём.** У нас 33 актора и 37 пользователей в месяц. Это подтверждает, что число акторов само не работает.
2. **Быть первым на новом источнике.** Новый сайт или API без акторов: страница в Google за 1–2 дня (опыт ParseForge). Надо следить за новыми сервисами и делать актор сразу, с проверкой условий.
3. **Входить туда, где спрос подтверждён, а лидеры слабые.** У лидера мало отзывов или низкий рейтинг:
   - транскрипты соцсетей — sian.agency 2.3★ при $28;
   - Semrush и Ahrefs — 3.0★;
   - PDF и OCR — лидеры без отзывов.
4. **Брать задачи, которые запускают по расписанию.** Обогащение, проверка, мониторинг, выгрузка в таблицы — там 100+ запусков на пользователя, то есть постоянная выручка.
5. **Для нас конкретно:** первый кандидат — PDF/OCR-извлечение текста. Ниша подтверждена, цена $3–5, лидеры молодые и почти без отзывов, подходит под все наши правила. Второй — улучшать уже существующие хиты-кандидаты (All-in-One, Career Page), а не делать 34-й актор.
