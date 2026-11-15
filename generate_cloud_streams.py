#!/usr/bin/env python3
"""
Generates data/cloud_streams.json containing verified 7-day CloudFront DASH (p9fx) blobs
so Mobile Web / GitHub Pages (https://streamittvapp.github.io/stream-it-app/) can play
1080p streams natively in <video> with Hebrew RTL subtitles without needing a local server.
"""
import concurrent.futures
import json
import os
import re
import time
import urllib.request

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
PLAYER_KEY = "f3b72e73c80c9a996574379798703796a1936efa3516a7105cb0e43048b46b5a"
TMDB_KEY = "3fd2be6f0c70a2a598f084ddfb75487c"


def fetch_tmdb_ids():
    movies = set()
    series = set()

    # 1. Always include priority & user-tested titles
    priority_movies = [
        "1283515",  # Verity (תעתוע)
        "533535",   # Deadpool & Wolverine
        "1560520",  # Batman: Knightfall
        "693134",   # Dune: Part Two
        "872585",   # Oppenheimer
        "1022789",  # Inside Out 2
        "519182",   # Despicable Me 4
        "558449",   # Gladiator II
        "912649",   # Venom: The Last Dance
        "1184918",  # The Wild Robot
        "945961",   # Alien: Romulus
        "1034541",  # Terrifier 3
        "845781",   # Red One
        "402431",   # Wicked
        "762509",   # Mufasa: The Lion King
        "939243",   # Sonic the Hedgehog 3
        "822119",   # Captain America: Brave New World
    ]
    priority_series = [
        "69557",    # Fauda (פאודה)
        "103913",   # Tehran (טהרן)
        "58841",    # Chicago P.D.
        "1413",     # American Horror Story
        "95396",    # Severance (ניתוק)
        "93405",    # Squid Game
        "1396",     # Breaking Bad
        "1399",     # Game of Thrones
        "94997",    # House of the Dragon
        "66732",    # Stranger Things
        "84958",    # Loki
        "100088",   # The Last of Us
        "119051",   # Wednesday
        "76479",    # The Boys
        "202555",   # Daredevil: Born Again
        "194764",   # The Penguin
        "110316",   # Alice in Borderland
    ]
    for m in priority_movies:
        movies.add(m)
    for s in priority_series:
        series.add(s)

    # 2. Load data/hebrew_catalog.json
    cat_path = os.path.join(ROOT_DIR, "data", "hebrew_catalog.json")
    if os.path.isfile(cat_path):
        try:
            with open(cat_path, "r", encoding="utf-8") as f:
                cat = json.load(f)
            for item in cat.get("movies") or []:
                tid = re.sub(r"\D", "", str(item.get("tmdbId") or ""))
                if tid:
                    movies.add(tid)
            for item in cat.get("series") or []:
                tid = re.sub(r"\D", "", str(item.get("tmdbId") or ""))
                if tid:
                    series.add(tid)
        except Exception:
            pass

    # 3. Fetch top trending & popular from TMDB
    tmdb_endpoints = [
        ("/trending/movie/week?language=he-IL&page=1", "movie"),
        ("/trending/movie/week?language=he-IL&page=2", "movie"),
        ("/movie/popular?language=he-IL&page=1", "movie"),
        ("/movie/popular?language=he-IL&page=2", "movie"),
        ("/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=8&watch_region=IL&page=1", "movie"),
        ("/trending/tv/week?language=he-IL&page=1", "series"),
        ("/tv/popular?language=he-IL&page=1", "series"),
        ("/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=213&page=1", "series"),
    ]
    for ep, kind in tmdb_endpoints:
        try:
            url = f"https://api.themoviedb.org/3{ep}&api_key={TMDB_KEY}"
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=5) as r:
                d = json.load(r)
                for row in d.get("results") or []:
                    tid = str(row.get("id") or "")
                    if tid.isdigit():
                        if kind == "movie":
                            movies.add(tid)
                        else:
                            series.add(tid)
        except Exception:
            pass

    return priority_movies + [m for m in sorted(movies) if m not in priority_movies], priority_series + [s for s in sorted(series) if s not in priority_series]


def resolve_one(task):
    kind, tmdb_id, season, episode = task
    if kind == "movie":
        key = f"movie:{tmdb_id}"
        vp_path = f"/api/vidora/v1/movie/{tmdb_id}?source=p9fx"
    else:
        key = f"tv:{tmdb_id}:{season}:{episode}"
        vp_path = f"/api/vidora/v1/tv/{tmdb_id}/{season}/{episode}?source=p9fx"

    url = "https://cdn.vidspark.to" + vp_path
    for attempt in range(2):
        try:
            if attempt > 0:
                time.sleep(0.25)
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept": "application/json, */*",
                    "Origin": "https://cdn.vidspark.to",
                    "Referer": "https://cdn.vidspark.to/",
                    "x-player-key": PLAYER_KEY,
                },
            )
            with urllib.request.urlopen(req, timeout=5.5) as r:
                if r.status != 200:
                    continue
                data = json.loads(r.read().decode("utf-8", errors="ignore"))
            if data.get("result") is False:
                return None
            sources = data.get("sources") or []
            if not sources:
                return None
            s0 = sources[0] or {}
            s_url = str(s0.get("url") or "").strip()
            if "dash-mpd" in s_url and "blob=" in s_url:
                return (
                    key,
                    {
                        "url": s_url,
                        "title": str(data.get("title") or ""),
                        "year": str(data.get("year") or ""),
                        "source": "p9fx",
                    },
                )
        except Exception:
            pass
    return None


def main():
    out_path = os.path.join(ROOT_DIR, "data", "cloud_streams.json")
    streams = {}
    if os.path.isfile(out_path):
        try:
            with open(out_path, "r", encoding="utf-8") as f:
                old = json.load(f)
                streams = dict(old.get("streams") or {})
        except Exception:
            pass

    movies, series = fetch_tmdb_ids()
    tasks = []
    for s in series[:18]:
        if f"tv:{s}:1:1" not in streams:
            tasks.append(("tv", s, 1, 1))
        if s in ("69557", "103913", "95396", "58841", "1413"):
            for ep in range(2, 6):
                if f"tv:{s}:1:{ep}" not in streams:
                    tasks.append(("tv", s, 1, ep))
    for m in movies:
        if f"movie:{m}" not in streams:
            tasks.append(("movie", m, 1, 1))
    for s in series[18:]:
        if f"tv:{s}:1:1" not in streams:
            tasks.append(("tv", s, 1, 1))

    print(f"Resolving {len(tasks)} cloud streams for mobile/web (existing={len(streams)})...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        for res in ex.map(resolve_one, tasks):
            if res:
                k, val = res
                streams[k] = val
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    payload = {
        "updatedAt": int(time.time()),
        "version": "9.9.94",
        "count": len(streams),
        "streams": streams,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Saved {len(streams)} verified cloud streams to {out_path}")
    print("Verity (movie:1283515) in cloud_streams:", "movie:1283515" in streams)
    print("Fauda (tv:69557:1:1) in cloud_streams:", "tv:69557:1:1" in streams)


if __name__ == "__main__":
    main()
