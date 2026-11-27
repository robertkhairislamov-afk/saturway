# YouTube Videos for Gemini (internal)

Lists the videos of a competitor's YouTube channel (or given video links) with their metadata, so
that Gemini can analyse each video **by its URL**. Nothing is downloaded from YouTube.

- Input: `videoUrls`, or `channelUrl` + `maxVideos` (the channel's uploads: videos, Shorts and past
  live streams, newest first), `skipIds`, and a YouTube Data API v3 key (`youtubeApiKey`, stored
  encrypted, or the Actor's `YOUTUBE_API_KEY` environment variable).
- Output, one row per video: `videoId, title, uploadDate, durationSec, viewCount, description, url,
  channelTitle, liveBroadcast, error`. An error on one video does not stop the run.
- Source: the official YouTube Data API (quota: 10,000 units a day free; a channel of 50 videos
  costs about 3 units). YouTube pages are not read: YouTube's robots.txt closes `/youtubei/` and
  `/get_video` to robots, and its terms forbid downloading, so no audio or video is fetched.
- Analysis: `apify/tools/gemini-youtube/gemini_analyze.py` on the owner's server sends each `url`
  to Gemini (public videos; free tier up to 8 hours of YouTube video a day).
