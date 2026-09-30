# Иконки акторов для Nano Banana

18 промптов, один стиль: плоская векторная иконка, градиентный фон на весь квадрат, белый символ в центре. Логотипов сайтов и текста нет: чужие логотипы в иконке выглядят как выдача себя за бренд, а мелкий текст не читается.

## Как генерировать

1. Открой [Google AI Studio](https://aistudio.google.com), выбери модель Nano Banana (Gemini Image) и формат 1:1. Подойдёт и приложение Gemini, но там в углу картинки бывает значок-водяной знак. Если он появится, обрежь край или сгенерируй в AI Studio.
2. Начни с Redfin (промпт 1). Сделай 2–3 варианта и выбери лучший: это эталон стиля.
3. Для остальных иконок прикрепляй эталон и вставляй промпт. Первая фраза промпта просит повторить стиль прикреплённой картинки, так все 18 иконок получатся одним семейством.
4. Если в картинке появились буквы, цифры или логотип, сгенерируй заново.
5. Загрузка: Apify Console → Actors → актор → вкладка **Publication** → **Display information** → **Icon** → Save.

## Что на какой иконке

| # | Актор | Символ | Фон |
|---|---|---|---|
| 1 | Redfin Scraper | дом и метка на карте | красный |
| 2 | LinkedIn Jobs Scraper | портфель и сеть из трёх точек | синий |
| 3 | All-in-One Jobs Scraper | глобус и портфель | индиго → розовый |
| 4 | SEEK Jobs Scraper | лупа с портфелем, Южный Крест | розовый |
| 5 | StepStone Jobs Scraper | ступени и портфель наверху | тёмно-синий |
| 6 | Reed Jobs Scraper | камыш и портфель | оливковый → лайм |
| 7 | InfoJobs Jobs Scraper | облачко реплики с портфелем | ржавый → оранжевый |
| 8 | Jobstreet Jobs Scraper | уличный указатель и портфель | бирюзовый |
| 9 | JobsDB Jobs Scraper | цилиндр базы данных и портфель | голубой |
| 10 | Dice Jobs Scraper | игральный кубик с символом кода | графит, красный акцент |
| 11 | Welcome to the Jungle Jobs Scraper | лист монстеры и портфель | жёлтый, чёрный символ |
| 12 | Greenhouse Jobs Scraper | портфель с ростком | зелёный |
| 13 | Lever Jobs Scraper | рычаг на опоре и портфель | серо-синий |
| 14 | Ashby Jobs Scraper | карточка кандидата с галочкой | фиолетовый |
| 15 | Workday Jobs Scraper | офисная башня и портфель | янтарный |
| 16 | Google Play Scraper | смартфон с сеткой приложений и звезда | малиновый |
| 17 | Google News Scraper | газета и лупа | пурпурный |
| 18 | Indeed Jobs Scraper | веер из трёх карточек вакансий с портфелем и лупа | кобальт → бирюзовый |

## Промпты

### 1. Redfin Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a house with a pitched roof, a chimney, a door and one window, and a map location pin floating above the roof. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #991B1B at the top left to #EF4444 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 2. LinkedIn Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a briefcase, and above it three small circles connected by thin lines in a triangle, like a professional network. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #0A4FA3 at the top left to #1D8FE1 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 3. All-in-One Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a globe with latitude and longitude lines, and a smaller briefcase overlapping its lower right part, separated from the globe by a thin gap. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #4338CA at the top left to #DB2777 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 4. SEEK Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a magnifying glass with a small briefcase inside its lens, and four small stars arranged like the Southern Cross constellation near the top right corner. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #9D174D at the top left to #F472B6 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 5. StepStone Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: three ascending stair steps rising to the right, with a small briefcase standing on the top step. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #172554 at the top left to #2563EB at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 6. Reed Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: three tall reed stalks with cattail heads and long slender leaves, with a small briefcase in front of their base. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #3F6212 at the top left to #84CC16 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 7. InfoJobs Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a speech bubble with a small briefcase inside it. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #9A3412 at the top left to #F97316 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 8. Jobstreet Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a street signpost, one vertical pole with two arrow-shaped signs pointing left and right, and a small briefcase at the foot of the pole. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #115E59 at the top left to #14B8A6 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 9. JobsDB Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a database cylinder made of three stacked discs, with a small briefcase overlapping its lower right side. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #155E75 at the top left to #06B6D4 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 10. Dice Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a six-sided die in a slight three-quarter view; instead of dots, its front face shows a code symbol made of two angle brackets with a slash between them, drawn in bright red #EF4444. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #111827 at the top left to #374151 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white (except the red code symbol) with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 11. Welcome to the Jungle Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a large monstera leaf with its typical splits and holes, and a small briefcase at its base. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #CA8A04 at the top left to #FACC15 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid near-black #111827 with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 12. Greenhouse Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a briefcase with a small sprout of two rounded leaves growing out of its top center. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #166534 at the top left to #22C55E at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 13. Lever Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a seesaw lever, a long straight bar resting on a small triangular fulcrum and tilted up to the right, with a small briefcase on the raised end. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #1E293B at the top left to #64748B at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 14. Ashby Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a rounded profile card with a simple person silhouette (round head and shoulders) on the left and two short horizontal bars on the right, and a small round check-mark badge on its top right corner. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #4C1D95 at the top left to #7C3AED at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 15. Workday Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a modern office tower with a regular grid of small square windows, and a small briefcase standing in front of its base. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #B45309 at the top left to #FBBF24 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 16. Google Play Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a smartphone in portrait orientation with a 3 by 3 grid of small rounded app squares on its screen, and a small five-point star above its top right corner. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #9F1239 at the top left to #FB7185 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 17. Google News Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: a folded newspaper with one thick headline bar and several thin line bars, and a small magnifying glass overlapping its lower right corner. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #6B21A8 at the top left to #C084FC at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```

### 18. Indeed Jobs Scraper

```
If an icon is attached, copy its style exactly: the same flat look, stroke weight, symbol size and position, gradient direction and shadow; only the symbol and the colors change. Symbol: three overlapping job cards fanned out like playing cards, the front card showing a simple briefcase, and a small magnifying glass overlapping the bottom right corner of the cards. Style: flat vector app icon, perfectly square 1:1. The background fills the whole canvas edge to edge with a smooth diagonal gradient from #1E40AF at the top left to #0891B2 at the bottom right; no border, no frame, no rounded corners, no outer shadow, no vignette. The symbol is centered, drawn in solid white with bold uniform strokes and simple geometric shapes, about 60% of the canvas width, with a very soft shadow under it. Clean, modern, premium SaaS look, high contrast, easy to read at 48 pixels. No text, no letters, no numbers, no logos, no brand marks, no watermark.
```
