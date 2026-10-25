# Task for a separate session: video for n8n template 5

n8n rejected templates 3, 4 and 5 as "too basic". Every rejection letter suggests recording a YouTube
tutorial and adding it to the canvas as a sticky note: `@[youtube](VIDEO_ID)`. This task makes that
video for template 5 and resubmits the template.

## What to make

1. A screen recording (MP4, 1920x1080, 3-4 minutes, **no voice**) of template 5,
   `hiring-signal-sales-leads.json`, in a local n8n:
   - the whole canvas, then each section (find, score, research, save and share) up close;
   - the **Your ideal customer** node with its settings;
   - a run on live data from the All-in-One Jobs Scraper (Apify connector or `APIFY_TOKEN`); show the
     scored companies, a hot lead with AI notes and the Slack message text.
   - Google Sheets, Slack and OpenAI have no accounts here: replace them with stub nodes that have the
     same output shape, as the earlier tests did (see `PLAN.md`, "шаблон 5 переделан"), and say so in
     the voice-over script.
   - English subtitles burned in only if the owner asks; by default leave the picture clean for the voice.
2. A **voice-over script with timings** (`template-5-voiceover.md`): one line per scene,
   `00:00-00:15  text`, in English, plain words, about 130 words a minute. The owner records the voice
   in CapCut and lays it over the video.
3. After the owner uploads the video to YouTube (unlisted is fine) and sends the video ID: add a sticky
   note `@[youtube](VIDEO_ID)` at the top of the canvas in `build-templates.mjs`, rebuild, check the
   import, and hand the file to the owner to submit as a new template with the description from
   `template-5-sections.md` (screenshot link first in Quick overview).

## How

- Local n8n: install `n8n` and the community node `@apify/n8n-nodes-apify` in the scratchpad (the
  scratchpad is wiped when the container is recreated). Run it on 127.0.0.1 (`N8N_LISTEN_ADDRESS`),
  owner account through `/rest/owner/setup`, import the workflow with `n8n import:workflow`.
- Record with Playwright (`recordVideo`, Chromium at `/opt/pw-browsers/chromium`), cut and join with
  `ffmpeg`.
- Send the video and the script to the owner with SendUserFile.

## Rules

- The Apify key is in the environment as `APIFY_TOKEN`: never print it, never commit it.
- No real people's data on screen: if a run shows a person's name as an advertiser or company,
  re-run with other roles or blur it.
- Push only to `claude/gifted-dirac-sv0ed6`; no pull requests.
- Do not email n8n and do not submit for the owner; the owner submits.
