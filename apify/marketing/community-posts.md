# Посты о статьях Medium для сообществ, 20.10

Плагин Community & Reddit Marketing в сеансе не был включён — проверка сделана вручную по его методу: черновик → правила площадки → вердикт «Публиковать / Доработать / Сначала спросить модераторов / Не публиковать». **Ничего не опубликовано. Публикует только владелец.**

Статьи:
- Google Trends: https://medium.com/@robertkhairislamov/how-to-compare-more-than-5-keywords-in-google-trends-on-one-scale-88bb538fcc4c
- AliExpress: https://medium.com/@robertkhairislamov/how-to-find-best-selling-products-on-aliexpress-with-exact-sales-numbers-4e18446041bd

## Что удалось проверить

- **Reddit:** robots.txt запрещает всё всем роботам (`User-agent: * / Disallow: /`), поэтому сам я туда не захожу. 21.10 владелец прислал правила r/dataisbeautiful, r/webscraping и r/dropship — по ним вердикты ниже окончательные. По остальным сабреддитам — предварительные, нужны их правила.
- **Hacker News:** правила прочитаны (newsguidelines, showhn). Главное: «Please don't put generated text in HN posts. Write your text yourself» и «Don't post generated text or AI-edited text» в комментариях. Значит, текст на HN владелец пишет сам; ниже — только заголовок и тезисы.
- **Indie Hackers:** robots.txt запрещает ботов Anthropic — не заходил, не предлагаю.
- **dev.to:** раньше решено, что не подходит (запрет на продвижение своего продукта в статьях с ИИ).

## Общие правила для всех постов

1. Писать, что актор — свой: «I built the scraper used here».
2. Писать, что статья написана с помощью ИИ (как в самой статье).
3. Одна площадка — один пост. Никаких просьб голосовать, вторых аккаунтов, «случайных» комментариев от знакомых.
4. На Reddit многие сабреддиты удаляют посты новых аккаунтов с малой кармой и ссылки на medium.com. Если аккаунт новый — сначала несколько недель просто участвовать в обсуждениях.
5. Отвечать на вопросы в комментариях самому, своими словами.
6. Тексты ниже — черновики, написанные ИИ. Лучше пересказать своими словами: многие сообщества (и HN — прямо по правилам) не принимают сгенерированный текст.

## Сводка вердиктов

| Площадка | Статья | Вердикт | Почему |
|---|---|---|---|
| r/dataisbeautiful | Trends | **Публиковать** (окончательно, 21.10) | Пост-ссылка на статью с графиком и тег [OC] (правило 2); первым комментарием — источник и инструмент (правило 3); нейтральный заголовок (правило 7); график сделан в matplotlib (правило 5); не политика США и не личные данные, день любой |
| r/webscraping | обе | **Не публиковать** (окончательно, 21.10) | Правило 3 запрещает упоминать коммерческие продукты и сервисы, включая продукты с бесплатным тарифом; обе статьи — про платные акторы Apify. Можно только помогать в чужих вопросах методом и кодом, без упоминания Apify и своих акторов |
| Hacker News | Trends | Можно, но текст — свой | Свои материалы разрешены «part of the time»; оригинальный заголовок; комментарий владелец пишет сам |
| Hacker News | AliExpress | Не публиковать | Тема для продавцов, не для HN — будет выглядеть как реклама |
| r/SEO | Trends | Не публиковать пост | Обычно строгий запрет самопродвижения. Можно отвечать в чужих вопросах про сравнение больше 5 слов, с раскрытием |
| r/bigseo | Trends | Сначала спросить модераторов | Правила о ссылках на свой продукт неизвестны |
| r/dropship | AliExpress | **Сначала спросить модераторов** (окончательно, 21.10) | Правило 2: свой блог, софт и проекты — только с одобрения модераторов, иначе удаление, при повторе бан. Без ответа модераторов не публиковать; не звать в личку (правило 3); цифры с контекстом (правило 5) — в тексте есть |
| r/dropshipping | AliExpress | Сначала спросить модераторов | Обычно жёсткая модерация рекламы |
| r/ecommerce | AliExpress | Только в еженедельной ветке, если она есть | Обычно самопродвижение — в отдельной ветке |
| r/AliExpress | AliExpress | Только без ссылки или не публиковать | Сообщество покупателей; инструмент им не нужен, но находки про цены полезны |

---

## 1. r/dataisbeautiful — Google Trends: ПУБЛИКОВАТЬ

Тип поста — **ссылка** на статью на Medium, где есть график (правило 2: ссылка на исходную статью с визуализацией, а не на саму картинку). Тег [OC] — график наш. Сразу после публикации — первый комментарий ниже (правило 3).

**Заголовок** (нейтральный, без кликбейта — правило 7):
> [OC] Average US Google search interest in 15 drinks over 5 years, on one scale (coffee's peak = 100)

**Обязательный комментарий автора:**
> Source: Google Trends, US, past 5 years, weekly data, pulled on October 20, 2026.
>
> Tools: Python, pandas, matplotlib. Google Trends compares only 5 terms at a time and rounds to whole numbers, so I put all 15 on one scale through a shared anchor term (the biggest one, coffee) and re-measured the small terms next to slightly bigger ones to get decimals instead of zeros. I checked the result against Google's own 5-term comparison: averages match to two decimals for the big terms.
>
> Disclosure: I built the Apify scraper that did the comparison. Full method and code in my write-up (written with AI assistance): https://medium.com/@robertkhairislamov/how-to-compare-more-than-5-keywords-in-google-trends-on-one-scale-88bb538fcc4c
>
> Fun bits: hojicha is a flat zero on Google's chart next to coffee but averages 0.074 on the shared scale; bubble tea's one big spike is the week of the Google Doodle (Jan 29, 2023).

Проверка по правилам: визуализация компьютерная (1, 5); ссылка на статью и [OC] (2); первый комментарий — источник и инструменты (3); график свой (4, 12); похожего поста за месяц не было — проверить поиском по «Google Trends drinks» перед публикацией (6); заголовок нейтральный (7); не политика и не личные данные — день любой (8, 9). Комментарии под постом — отвечать по делу (11).

## 2. r/webscraping — НЕ ПУБЛИКОВАТЬ

Правило 3 сабреддита запрещает упоминать коммерческие продукты и сервисы, в том числе с бесплатным тарифом, а правило 2 разрешает самопродвижение только по вики. Обе статьи — про платные акторы Apify, поэтому текст ниже **не использовать**. Что можно: отвечать в чужих вопросах про Google Trends или AliExpress методом и кодом прямо в треде, без Apify, без своих акторов, без ссылок на статьи и без «пишите в личку» (правило 1).

Старый черновик (не публиковать):

> Two write-ups on things I found while building scrapers (I'm the author of both Apify actors, the articles were written with AI help):
>
> **Google Trends past the 5-keyword limit.** Trends scales every chart to its own max and rounds to integers, so anything under 0.5 of the top term becomes 0. Comparing everything through the biggest term and re-measuring small terms against slightly bigger ones gives one 0–100 scale for any number of terms; checked against Google's own comparison (same averages to 2 decimals). https://medium.com/@robertkhairislamov/how-to-compare-more-than-5-keywords-in-google-trends-on-one-scale-88bb538fcc4c
>
> **AliExpress search pages.** The card has an exact sold counter behind the "10,000+ sold" label (84 products with that label ranged from 10,312 to 48,751). The search-page price is usually a promo: 26 of 99 products showed a different price 4 minutes later, while the regular price changed for 5. Some result pages get replaced with recommendation cards of other products. https://medium.com/@robertkhairislamov/how-to-find-best-selling-products-on-aliexpress-with-exact-sales-numbers-4e18446041bd
>
> Happy to answer questions about either.

Проверка: нарушает правило 3 (коммерческий продукт) — не публиковать.

## 3. Hacker News — Google Trends (ссылка)

- Заголовок — оригинальный: **How to Compare More Than 5 Keywords in Google Trends on One Scale** (число 5 по делу, правило про числа не нарушено).
- URL — статья на Medium.
- Комментарий — **владелец пишет сам**, своими словами (правило HN). Тезисы, о чём написать: почему нельзя просто склеить три графика; что Google округляет всё меньше 0,5 до нуля; как проверили против сравнения Google; что сам Google при повторе даёт разброс до 1 пункта; что инструмент свой и платный, а метод можно повторить руками.
- Опубликовать один раз, не удалять и не перепубликовывать, никого не просить голосовать.

## 4. r/dropship (и r/dropshipping, r/ecommerce) — AliExpress

Сначала написать модераторам (Message the mods):

> Hi, I wrote a guide on reading AliExpress search data for product research (exact sold counts behind the "10,000+ sold" labels, why the search-page price is usually a promotion). I built the scraper it uses, which is paid per result, so I wanted to ask first: is a text post with the findings and one link at the end OK here, or should it go in a promo thread?

Текст поста, если разрешат:

> **Title:** What "10,000+ sold" on AliExpress actually means (and why the search price is a bad base for margins)
>
> I pulled the 120 best sellers for five product ideas (portable blender, pet hair remover, car phone holder, posture corrector, sunset lamp), shipped to the US, and compared the labels with the exact counters on the cards.
>
> - 84 products said "10,000+ sold". Their real counts ranged from 10,312 to 48,751. Ranking by label, they tie; by the counter, the top one outsold the bottom four combined.
> - The search-page price is usually a promo. Median of the top 20 car phone holders: $1.33 on the search page, $6.47 regular. Four minutes later 26 of 99 products showed a different search price; the regular price changed for 5.
> - Many cards show a "New shoppers save $X" price — that's a first-order price, not what repeat buyers pay.
> - Sold counts update in batches (2 of 92 changed in about an hour), so compare days or weeks apart.
>
> For margin math I'd use the regular (crossed-out) price as the safe number.
>
> Disclosure: I built the Apify scraper I used for this; the full write-up (AI-assisted) with code is here: https://medium.com/@robertkhairislamov/how-to-find-best-selling-products-on-aliexpress-with-exact-sales-numbers-4e18446041bd

Проверка по правилам r/dropship: ссылка на свой блог и софт — только с одобрения модераторов (2), поэтому сначала письмо модераторам; ничего не продаётся (4); цифры с контекстом и выводом про маржу (5); один аккаунт, без подставных (6); конкретный заголовок и детали (7); не вопрос новичка, поэтому не в Weekly Q&A (10); перед публикацией поискать похожие посты (9). Если модераторы откажут — не публиковать вовсе. Если разрешат без ссылки — убрать последний абзац со ссылкой и оставить раскрытие «I built the scraper I used».

## 5. r/AliExpress — только находки, без ссылки (по желанию)

> **Title:** The price on AliExpress search pages often isn't the price — some numbers
>
> While looking at search results for a project I noticed: the price on the search page changed for about a quarter of products within 4 minutes, while the crossed-out regular price almost never did. Many cards also show a "New shoppers save" price that only applies to a first order. And "10,000+ sold" can mean anything from ~10k to ~49k. If you compare deals, check the product page price, not the search card.

Ссылки нет — продвижения нет, пользы для актора мало. Публиковать, только если владелец и так участник этого сообщества.

---

## Что дальше

1. Готово 21.10: окончательные вердикты по r/dataisbeautiful (публиковать), r/webscraping (не публиковать), r/dropship (сначала письмо модераторам).
2. После публикации записать в PLAN.md: где, когда, ссылка; через неделю — новые пользователи у Trends и AliExpress.
