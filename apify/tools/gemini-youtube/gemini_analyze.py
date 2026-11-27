"""Analyse competitor YouTube videos with Gemini, by URL (nothing is downloaded).

Reads the videos listed by the Apify Actor robertosan16/youtube-for-gemini (its latest run, or a
dataset ID) and sends each video URL to Gemini, which watches the video (sound and picture).
Results go to analyses.jsonl, one line per video; videos already in that file are skipped.

Setup on the server:
    pip install google-genai requests
    export APIFY_TOKEN=...        # Apify Console -> Settings -> API & Integrations
    export GEMINI_API_KEY=...     # Google AI Studio -> Get API key
    python3 gemini_analyze.py                 # latest run of the Actor
    python3 gemini_analyze.py <datasetId>     # a given dataset

Limits: Gemini analyses public videos only; on the free tier, up to 8 hours of YouTube video per
day (DAILY_LIMIT_HOURS). Check the current model names in Google's docs and set GEMINI_MODEL.
"""
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

import requests
from google import genai
from google.genai import types

ACTOR = 'robertosan16~youtube-for-gemini'
MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
DAILY_LIMIT_HOURS = float(os.environ.get('DAILY_LIMIT_HOURS', '8'))
OUT = Path(os.environ.get('OUT_FILE', 'analyses.jsonl'))
USAGE = Path(os.environ.get('USAGE_FILE', 'gemini_usage.json'))

PROMPT = os.environ.get('PROMPT') or """Ты аналитик маркетинга. Посмотри это видео конкурента и ответь по-русски, кратко, по пунктам:
1. О чём видео в 2–3 предложениях.
2. Зацепка в первые 5 секунд: что говорят и показывают.
3. Структура: основные части с примерными таймкодами.
4. Какие товары или услуги, цены, акции упоминаются.
5. Призыв к действию: что просят сделать зрителя.
6. Тон, подача, музыка, монтаж.
7. Что из этого можно взять нам (3 идеи).
"""


def apify(path, **params):
    r = requests.get(f'https://api.apify.com/v2{path}', params=params,
                     headers={'Authorization': f"Bearer {os.environ['APIFY_TOKEN']}"}, timeout=60)
    r.raise_for_status()
    return r.json()


def videos(dataset_id=None):
    if not dataset_id:
        run = apify(f'/acts/{ACTOR}/runs/last', status='SUCCEEDED')['data']
        dataset_id = run['defaultDatasetId']
    return dataset_id, apify(f'/datasets/{dataset_id}/items', clean='1', format='json')


def used_today():
    if USAGE.exists():
        u = json.loads(USAGE.read_text())
        if u.get('date') == date.today().isoformat():
            return u.get('seconds', 0)
    return 0


def add_usage(seconds):
    USAGE.write_text(json.dumps({'date': date.today().isoformat(), 'seconds': used_today() + seconds}))


def main():
    dataset_id, items = videos(sys.argv[1] if len(sys.argv) > 1 else None)
    done = set()
    if OUT.exists():
        done = {json.loads(line)['videoId'] for line in OUT.read_text().splitlines() if line.strip()}
    client = genai.Client()  # reads GEMINI_API_KEY
    print(f'dataset {dataset_id}: {len(items)} videos, {len(done)} already analysed')
    for v in items:
        if v.get('error') or not v.get('videoId') or v['videoId'] in done:
            continue
        seconds = v.get('durationSec') or 0
        if (used_today() + seconds) / 3600 > DAILY_LIMIT_HOURS:
            print(f'daily limit of {DAILY_LIMIT_HOURS} h reached; run again tomorrow')
            break
        try:
            res = client.models.generate_content(
                model=MODEL,
                contents=types.Content(parts=[
                    types.Part(file_data=types.FileData(file_uri=v['url'])),
                    types.Part(text=PROMPT),
                ]),
            )
            row = {**{k: v.get(k) for k in ('videoId', 'title', 'uploadDate', 'durationSec', 'viewCount', 'url')},
                   'model': MODEL, 'analysis': res.text, 'error': None}
            add_usage(seconds)
        except Exception as e:  # one failed video does not stop the rest
            row = {'videoId': v['videoId'], 'url': v.get('url'), 'model': MODEL, 'analysis': None, 'error': str(e)}
        with OUT.open('a') as f:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')
        print(v['videoId'], 'error: ' + row['error'] if row['error'] else 'ok')
        time.sleep(2)


if __name__ == '__main__':
    main()
