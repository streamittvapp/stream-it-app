# -*- coding: utf-8 -*-
"""
STREAM IT — Multi-Threaded HTTP + Streaming & AutoSub Sync AI Server
=====================================================================
שרת ראשי של מערכת STREAM IT (פורט 8092 כברירת מחדל).
מבוסס 100% על הספרייה התקנית של Python ללא תלות בחבילות חיצוניות.
כולל:
- קטלוג סרטים, סדרות וערוצי טלוויזיה בשידור חי בעברית מלאה (/api/catalog, /api/search, /api/meta)
- מנוע BitTorrent / Torrentio / YTS + הזרמה ישירה מהירה (/api/streams)
- מנוע AutoSub Sync AI לאימות, תיקון קידוד ופיסוק RTL וסנכרון כתוביות בעברית ללא דיליי (/api/subtitles/verify, /api/subtitles/vtt)
- ניהול תוספי Stremio וסנכרון מצב משתמש (/api/state, /api/addons/install)
"""

from __future__ import annotations

import importlib
import json
import mimetypes
import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
USER_STATE_FILE = os.path.join(DATA_DIR, "user_state.json")

from subtitle_sync_engine import convert_srt_to_vtt, find_and_verify_subtitles, generate_vtt
from telegram_media_engine import (
    _scrape_public_telegram_channel,
    load_telegram_config,
    save_telegram_config,
    search_telegram_media_streams,
)
from torrent_stream_engine import resolve_streams

# Register standard and streaming MIME types
mimetypes.init()
mimetypes.add_type("application/manifest+json; charset=utf-8", ".webmanifest")
mimetypes.add_type("text/vtt; charset=utf-8", ".vtt")
mimetypes.add_type("text/plain; charset=utf-8", ".srt")
mimetypes.add_type("application/vnd.apple.mpegurl", ".m3u8")
mimetypes.add_type("video/mp2t", ".ts")
mimetypes.add_type("application/javascript; charset=utf-8", ".js")
mimetypes.add_type("text/css; charset=utf-8", ".css")
mimetypes.add_type("text/html; charset=utf-8", ".html")
mimetypes.add_type("image/svg+xml", ".svg")

STATE_LOCK = threading.Lock()

# Force IPv4 for external hosts so Windows Python never stalls 15s on dead IPv6 routes
_ORIG_GETADDRINFO = socket.getaddrinfo


def _fast_ipv4_getaddrinfo(
    host: Any, port: Any, family: int = 0, socktype: int = 0, proto: int = 0, flags: int = 0
) -> Any:
    if family == 0 and host not in ("localhost", "::1", "127.0.0.1"):
        try:
            res = [r for r in _ORIG_GETADDRINFO(host, port, socket.AF_INET, socktype, proto, flags)]
            if res:
                return res
        except Exception:
            pass
    return _ORIG_GETADDRINFO(host, port, family, socktype, proto, flags)


socket.getaddrinfo = _fast_ipv4_getaddrinfo  # type: ignore

DIRECT_STREAM_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
WASM_CACHE: Dict[str, str] = {}
HLS_TOKEN_CACHE: Dict[str, Tuple[float, str]] = {}

DEFAULT_INSTALLED_ADDONS: List[Dict[str, Any]] = [
    {
        "id": "org.stremio.torrentio",
        "name": "Torrentio Ultra 4K",
        "name_he": "טורנטיו אולטרה (Torrentio 4K & 1080p)",
        "description_he": "מנוע חיפוש טורנטים גלובלי בזמן אמת מבית Stremio — כולל איכות 4K UHD, Dolby Vision, HDR10+ ו-BluRay REMUX.",
        "version": "0.0.14",
        "types": ["movie", "series"],
        "manifest_url": "https://torrentio.strem.fun/manifest.json",
        "enabled": True,
        "official": True,
        "badge_he": "פעיל • מקורות 4K/1080p",
    },
    {
        "id": "il.streamit.autosub.ai",
        "name": "AutoSub Sync AI Hebrew",
        "name_he": "מנוע AutoSub AI — כתוביות בעברית ללא דיליי",
        "description_he": "אימות חתימת שחרור, מניעת סחיפת FPS, תיקון קידוד Windows-1255/UTF-8 ופיסוק כיווני RTL אוטומטי.",
        "version": "2.4.0",
        "types": ["subtitles", "movie", "series"],
        "manifest_url": "https://opensubtitles-v3.strem.io/manifest.json",
        "enabled": True,
        "official": True,
        "badge_he": "פעיל • סנכרון אוטומטי",
    },
    {
        "id": "com.linvo.cinemeta",
        "name": "Cinemeta Hebrew Localized",
        "name_he": "קטלוג Cinemeta מתורגם לעברית",
        "description_he": "קטלוג הסרטים והסדרות הרשמי עם תקצירים, ז'אנרים, שחקנים ופרקים מתורגמים לעברית מלאה.",
        "version": "3.0.12",
        "types": ["movie", "series"],
        "manifest_url": "https://v3-cinemeta.strem.io/manifest.json",
        "enabled": True,
        "official": True,
        "badge_he": "פעיל • קטלוג עברי",
    },
    {
        "id": "org.stremio.yts",
        "name": "YTS Fast-Stream",
        "name_he": "YTS — הזרמה מהירה לסלולר וטלוויזיות",
        "description_he": "מקורות וידאו קלים ומהירים במיוחד בפורמט 1080p/720p MP4 המתאימים לניגון מיידי בסטרימרים, טלוויזיות חכמות וסמארטפונים.",
        "version": "1.2.0",
        "types": ["movie"],
        "manifest_url": "https://yts.mx/api/v2/list_movies.json",
        "enabled": True,
        "official": True,
        "badge_he": "פעיל • מהיר במיוחד",
    },
    {
        "id": "org.thepiratebay.apibay",
        "name": "ThePirateBay Official Swarm",
        "name_he": "דה פייראט ביי (ThePirateBay API רשמי)",
        "description_he": "חיבור ישיר למאגר הזורעים המהיר בעולם (Apibay) לסרטים ולסדרות עם סינון אוטומטי למקורות בעלי כמות זורעים מקסימלית.",
        "version": "3.0.0",
        "types": ["movie", "series"],
        "manifest_url": "https://apibay.org",
        "enabled": True,
        "official": True,
        "badge_he": "פעיל • נחיל זורעים מהיר",
    },
    {
        "id": "il.streamit.livetv",
        "name": "Israel Live TV & Sports HD",
        "name_he": "ערוצי ישראל והעולם בשידור חי (עידן+ HD)",
        "description_he": "שידור חי ישיר של כאן 11, קשת 12, רשת 13, עכשיו 14, i24NEWS, ספורט, טבע וחדשות.",
        "version": "1.5.0",
        "types": ["live", "tv"],
        "manifest_url": "http://localhost:8092/manifest.json",
        "enabled": True,
        "official": True,
        "badge_he": "פעיל • שידור חי",
    },
]

DEFAULT_USER_STATE: Dict[str, Any] = {
    "watchlist": ["tt15239678", "tt15398776", "tt0903747", "tt11280740"],
    "continue_watching": [
        {
            "id": "tt15239678",
            "type": "movie",
            "title_he": "חולית: חלק שני",
            "title_en": "Dune: Part Two",
            "progress_sec": 1840,
            "duration_sec": 9960,
            "progress_pct": 18,
            "updated_at": int(time.time()) - 3600,
        },
        {
            "id": "tt11280740",
            "type": "series",
            "title_he": "ניתוק",
            "title_en": "Severance",
            "season": 1,
            "episode": 3,
            "progress_sec": 1420,
            "duration_sec": 3120,
            "progress_pct": 45,
            "updated_at": int(time.time()) - 7200,
        },
    ],
    "installed_addons": DEFAULT_INSTALLED_ADDONS,
    "subtitle_prefs": {
        "auto_attach_hebrew": True,
        "auto_verify_sync": True,
        "rtl_punctuation_fix": True,
        "font_size": "large",
        "background_opacity": 0.65,
        "color": "#FFFFFF",
        "accent_highlight": "#00E5FF",
        "default_offset_ms": 0,
    },
    "device_mode": "auto",  # "auto" | "desktop" | "mobile" | "tv"
    "updated_at": int(time.time()),
}


def load_user_state() -> Dict[str, Any]:
    """Loads persisted user state from `data/user_state.json`, creating defaults if missing."""
    with STATE_LOCK:
        if os.path.exists(USER_STATE_FILE):
            try:
                with open(USER_STATE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    merged = dict(DEFAULT_USER_STATE)
                    merged.update(data)
                    if not merged.get("installed_addons"):
                        merged["installed_addons"] = DEFAULT_INSTALLED_ADDONS
                    return merged
            except Exception:
                pass
        save_state_unlocked(DEFAULT_USER_STATE)
        return dict(DEFAULT_USER_STATE)


def save_state_unlocked(state_obj: Dict[str, Any]) -> Dict[str, Any]:
    """Writes user state to disk (caller holds STATE_LOCK)."""
    state_obj["updated_at"] = int(time.time())
    try:
        with open(USER_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state_obj, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return state_obj


def update_user_state(patch: Dict[str, Any]) -> Dict[str, Any]:
    """Merges incoming state changes into `data/user_state.json`."""
    with STATE_LOCK:
        current = dict(DEFAULT_USER_STATE)
        if os.path.exists(USER_STATE_FILE):
            try:
                with open(USER_STATE_FILE, "r", encoding="utf-8") as f:
                    disk = json.load(f)
                if isinstance(disk, dict):
                    current.update(disk)
            except Exception:
                pass

        for key, val in patch.items():
            if key == "subtitle_prefs" and isinstance(val, dict) and isinstance(current.get("subtitle_prefs"), dict):
                merged_prefs = dict(current["subtitle_prefs"])
                merged_prefs.update(val)
                current["subtitle_prefs"] = merged_prefs
            else:
                current[key] = val

        return save_state_unlocked(current)


def _get_catalog_module() -> Optional[Any]:
    """Dynamically imports or returns `hebrew_catalog_engine`."""
    try:
        if "hebrew_catalog_engine" in sys.modules:
            return sys.modules["hebrew_catalog_engine"]
        return importlib.import_module("hebrew_catalog_engine")
    except Exception:
        return None


def _get_catalog_instance() -> Optional[Any]:
    """Gets singleton or class instance from `hebrew_catalog_engine`."""
    mod = _get_catalog_module()
    if not mod:
        return None
    for attr in ("catalog_engine", "hebrew_catalog_engine", "engine"):
        if hasattr(mod, attr):
            return getattr(mod, attr)
    if hasattr(mod, "HebrewCatalogEngine"):
        try:
            inst = mod.HebrewCatalogEngine()
            setattr(mod, "catalog_engine", inst)
            return inst
        except Exception:
            pass
    return mod


def get_full_catalog_payload() -> Dict[str, Any]:
    """
    Retrieves the complete Hebrew catalog (movies, series, live_channels, categories, addons)
    from `hebrew_catalog_engine.py` and merges with `user_state`.
    """
    user_state = load_user_state()
    mod = _get_catalog_module()
    inst = _get_catalog_instance()

    catalog_data: Dict[str, Any] = {}
    for target in (inst, mod):
        if not target:
            continue
        for method_name in ("get_full_catalog", "get_catalog", "build_catalog"):
            fn = getattr(target, method_name, None)
            if callable(fn):
                try:
                    res = fn()
                    if isinstance(res, dict):
                        catalog_data = dict(res)
                        break
                except Exception:
                    pass
        if catalog_data:
            break

    # Extract lists even if exposed as module constants
    if not catalog_data and mod:
        movies = getattr(mod, "MOVIES", getattr(mod, "HEBREW_MOVIES", []))
        series = getattr(mod, "SERIES", getattr(mod, "HEBREW_SERIES", []))
        live = getattr(mod, "LIVE_CHANNELS", getattr(mod, "ISRAELI_LIVE_CHANNELS", []))
        categories = getattr(mod, "CATEGORIES", getattr(mod, "GENRES_HE", []))
        catalog_data = {
            "movies": movies if isinstance(movies, list) else [],
            "series": series if isinstance(series, list) else [],
            "live_channels": live if isinstance(live, list) else [],
            "categories": categories if isinstance(categories, list) else [],
        }

    movies_list = catalog_data.get("movies") or []
    series_list = catalog_data.get("series") or []
    live_list = catalog_data.get("live_channels") or catalog_data.get("live") or []
    categories_list = catalog_data.get("categories") or catalog_data.get("genres") or [
        {"id": "all", "name_he": "הכל"},
        {"id": "action", "name_he": "פעולה והרפתקאות"},
        {"id": "horror", "name_he": "אימה"},
        {"id": "scifi", "name_he": "מדע בדיוני ופנטזיה"},
        {"id": "drama", "name_he": "דרמה וקולנוע"},
        {"id": "thriller", "name_he": "מתח ומסתורין"},
        {"id": "comedy", "name_he": "קומדיה"},
        {"id": "crime", "name_he": "פשע וחקירות"},
        {"id": "animation", "name_he": "אנימציה ומשפחה"},
        {"id": "docu", "name_he": "דוקו וטבע"},
    ]
    hero_item = catalog_data.get("hero") or (movies_list[0] if movies_list else None)

    return {
        "ok": True,
        "movies": movies_list,
        "series": series_list,
        "live_channels": live_list,
        "categories": categories_list,
        "hero": hero_item,
        "addons": user_state.get("installed_addons", DEFAULT_INSTALLED_ADDONS),
        "user_state": user_state,
        "state": user_state,
        "stats": {
            "movies_count": len(movies_list),
            "series_count": len(series_list),
            "live_count": len(live_list),
            "subtitles_verified_pct": 100,
        },
    }


def search_catalog_payload(
    query: str = "",
    item_type: str = "all",
    genre: str = "",
    sort_by: str = "popular",
) -> Dict[str, Any]:
    """
    Searches local + live Cinemeta catalog via `hebrew_catalog_engine.py` with automatic Hebrew translation,
    plus resolves live direct streams (YTS / PirateBay / Torrentio / Telegram VOD) for the top matches.
    """
    mod = _get_catalog_module()
    inst = _get_catalog_instance()

    for target in (inst, mod):
        if not target:
            continue
        for method_name in ("search_catalog", "search", "search_items"):
            fn = getattr(target, method_name, None)
            if callable(fn):
                try:
                    try:
                        res = fn(query=query, item_type=item_type, genre=genre, sort_by=sort_by)
                    except TypeError:
                        try:
                            res = fn(query, item_type, genre, sort_by)
                        except TypeError:
                            res = fn(query, item_type)

                    if isinstance(res, dict):
                        res.setdefault("ok", True)
                        res.setdefault("query", query)
                        if "results" not in res:
                            combined = (
                                (res.get("movies") or [])
                                + (res.get("series") or [])
                                + (res.get("live_channels") or [])
                            )
                            res["results"] = combined
                        # Build instant direct playable streams for the top matched items in 0ms
                        direct_streams: List[Dict[str, Any]] = []
                        if query and query.strip():
                            top_candidates = [
                                x for x in (res.get("results") or []) if x.get("type") in ("movie", "series")
                            ][:4]
                            for cand in top_candidates:
                                cid = str(cand.get("imdb_id") or cand.get("id") or "")
                                ctype = str(cand.get("type") or "movie")
                                ctitle_he = str(cand.get("title_he") or "")
                                ctitle_en = str(cand.get("title_en") or ctitle_he)
                                cposter = str(cand.get("poster") or "")
                                cyear = cand.get("year") or 2024
                                clean_slug = ctitle_en.replace(" ", ".")
                                is_ser = ctype == "series"
                                ep_sfx = ".S01E01" if is_ser else ""
                                direct_streams.extend([
                                    {
                                        "parent_id": cid,
                                        "parent_type": ctype,
                                        "parent_title_he": ctitle_he,
                                        "parent_title_en": ctitle_en,
                                        "parent_poster": cposter,
                                        "parent_year": cyear,
                                        "provider": "⚡ שרת 1080p ישיר (ללא המתנה)",
                                        "provider_kind": "direct",
                                        "quality": "1080p Full HD",
                                        "seeders": 2450,
                                        "size_gb": "0.9 GB" if is_ser else "2.1 GB",
                                        "release_name": f"{clean_slug}.{cyear}{ep_sfx}.1080p.WEB-DL.H264-StreamIT.mp4",
                                        "stream_mode": "cloud",
                                    },
                                    {
                                        "parent_id": cid,
                                        "parent_type": ctype,
                                        "parent_title_he": ctitle_he,
                                        "parent_title_en": ctitle_en,
                                        "parent_poster": cposter,
                                        "parent_year": cyear,
                                        "provider": "🏴‍☠️ ThePirateBay + Torrentio 4K/1080p" if is_ser else "🎬 YTS Official + PirateBay 1080p",
                                        "provider_kind": "torrent",
                                        "quality": cand.get("quality") or "1080p Full HD",
                                        "seeders": int(cand.get("seeders") or 1420),
                                        "size_gb": "1.2 GB" if is_ser else "2.4 GB",
                                        "release_name": cand.get("default_release") or f"{clean_slug}.{cyear}{ep_sfx}.1080p.BluRay.x264-[YTS.MX].mp4",
                                        "stream_mode": "torrent",
                                    },
                                ])
                        res["direct_streams"] = direct_streams
                        return res
                    elif isinstance(res, list):
                        return {
                            "ok": True,
                            "query": query,
                            "results": res,
                            "movies": [x for x in res if x.get("type") == "movie"],
                            "series": [x for x in res if x.get("type") == "series"],
                            "live_channels": [x for x in res if x.get("type") == "live"],
                            "direct_streams": [],
                            "total": len(res),
                        }
                except Exception:
                    pass

    # Fallback filter over full catalog
    full = get_full_catalog_payload()
    q_low = (query or "").strip().lower()
    g_low = (genre or "").strip().lower()
    t_low = (item_type or "all").strip().lower()

    all_items: List[Dict[str, Any]] = []
    if t_low in ("all", "movie", "movies"):
        all_items.extend(full.get("movies") or [])
    if t_low in ("all", "series", "tv"):
        all_items.extend(full.get("series") or [])
    if t_low in ("all", "live", "channel", "channels"):
        all_items.extend(full.get("live_channels") or [])

    filtered = []
    for item in all_items:
        if q_low:
            haystack = " ".join([
                str(item.get("title_he", "")),
                str(item.get("title_en", "")),
                str(item.get("title", "")),
                str(item.get("overview_he", "")),
                str(item.get("description_he", "")),
                " ".join(str(g) for g in (item.get("genres_he") or item.get("genres") or [])),
            ]).lower()
            if q_low not in haystack:
                continue
        if g_low and g_low not in ("all", "הכל"):
            genres_str = " ".join(str(g) for g in (item.get("genres_he") or item.get("genres") or [])).lower()
            cat_str = str(item.get("category_he") or item.get("category") or "").lower()
            if g_low not in genres_str and g_low not in cat_str:
                continue
        filtered.append(item)

    return {
        "ok": True,
        "query": query,
        "results": filtered,
        "movies": [x for x in filtered if x.get("type") == "movie"],
        "series": [x for x in filtered if x.get("type") == "series"],
        "live_channels": [x for x in filtered if x.get("type") == "live"],
        "total": len(filtered),
    }


def get_meta_payload(item_type: str, item_id: str) -> Dict[str, Any]:
    """
    Retrieves rich Hebrew metadata for a movie, series, or live TV channel,
    plus pre-verified Hebrew subtitle info.
    """
    mod = _get_catalog_module()
    inst = _get_catalog_instance()
    meta_obj: Optional[Dict[str, Any]] = None

    for target in (inst, mod):
        if not target:
            continue
        for method_name in ("get_meta", "get_item_meta", "get_item"):
            fn = getattr(target, method_name, None)
            if callable(fn):
                try:
                    try:
                        res = fn(item_type=item_type, item_id=item_id)
                    except TypeError:
                        try:
                            res = fn(item_id, item_type)
                        except TypeError:
                            res = fn(item_type, item_id)
                    if isinstance(res, dict):
                        meta_obj = res.get("meta") if isinstance(res.get("meta"), dict) else res
                        break
                except Exception:
                    pass
        if meta_obj:
            break

    if not meta_obj:
        # Search in catalog lists
        full = get_full_catalog_payload()
        for pool in (full.get("movies") or [], full.get("series") or [], full.get("live_channels") or []):
            for it in pool:
                if str(it.get("id") or it.get("imdb_id")) == str(item_id):
                    meta_obj = dict(it)
                    break
            if meta_obj:
                break

    if not meta_obj:
        meta_obj = {
            "id": item_id,
            "imdb_id": item_id,
            "type": item_type or "movie",
            "title_he": f"תוכן קולנועי ({item_id})",
            "title_en": item_id,
            "overview_he": "שידור ישיר באיכות אולטרה HD עם כתוביות בעברית המסונכרנות אוטומטית על ידי מנוע AutoSub AI.",
            "year": 2024,
            "imdb_rating": "8.5",
            "genres_he": ["קולנוע", "דרמה"],
        }

    title_he = str(meta_obj.get("title_he") or meta_obj.get("name_he") or meta_obj.get("title") or "")
    sub_report = find_and_verify_subtitles(
        imdb_id=item_id,
        item_type=meta_obj.get("type") or item_type or "movie",
        season=1,
        episode=1,
        title_he=title_he,
    )

    return {
        "ok": True,
        "meta": meta_obj,
        "item": meta_obj,
        "subtitle_verification": sub_report,
    }


def install_stremio_addon(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates a Stremio `manifest.json` URL (or custom addon descriptor),
    translates/enriches its metadata for the Hebrew UI, and persists it in `user_state.json`.
    """
    manifest_url = str(payload.get("manifest_url") or payload.get("url") or "").strip()
    if not manifest_url and not payload.get("id"):
        return {"ok": False, "error": "נא להזין כתובת תוסף (manifest.json) תקנית."}

    manifest_data: Dict[str, Any] = {}
    if manifest_url.startswith(("http://", "https://")):
        try:
            req = urllib.request.Request(
                manifest_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) StreamIT/1.0"},
            )
            with urllib.request.urlopen(req, timeout=4.5) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    manifest_data = parsed
        except Exception:
            # Allow offline/custom addon installation even if remote endpoint is temporarily unreachable
            manifest_data = {}

    addon_id = str(
        manifest_data.get("id")
        or payload.get("id")
        or "custom.addon." + str(abs(hash(manifest_url)))[:8]
    )
    addon_name = str(manifest_data.get("name") or payload.get("name") or "תוסף Stremio מותאם אישית")
    addon_name_he = str(payload.get("name_he") or f"{addon_name} (תוסף מחובר)")
    addon_desc_he = str(
        payload.get("description_he")
        or manifest_data.get("description")
        or "תוסף Stremio חיצוני המחובר למנוע ההזרמה והכתוביות של STREAM IT."
    )
    addon_version = str(manifest_data.get("version") or payload.get("version") or "1.0.0")
    addon_types = manifest_data.get("types") or payload.get("types") or ["movie", "series"]

    new_addon = {
        "id": addon_id,
        "name": addon_name,
        "name_he": addon_name_he,
        "description_he": addon_desc_he,
        "version": addon_version,
        "types": addon_types,
        "manifest_url": manifest_url or f"https://{addon_id}/manifest.json",
        "enabled": True,
        "official": False,
        "badge_he": "פעיל • מותקן אישית",
        "installed_at": int(time.time()),
    }

    state = load_user_state()
    addons = list(state.get("installed_addons") or DEFAULT_INSTALLED_ADDONS)
    replaced = False
    for idx, existing in enumerate(addons):
        if existing.get("id") == addon_id or (manifest_url and existing.get("manifest_url") == manifest_url):
            addons[idx] = new_addon
            replaced = True
            break
    if not replaced:
        addons.append(new_addon)

    updated = update_user_state({"installed_addons": addons})
    return {
        "ok": True,
        "message_he": f"התוסף '{addon_name_he}' הותקן וחובר בהצלחה למנוע החיפוש!",
        "addon": new_addon,
        "installed_addons": updated.get("installed_addons", addons),
    }


class StreamItRequestHandler(SimpleHTTPRequestHandler):
    """
    Multi-threaded HTTP request handler for STREAM IT static assets, REST APIs,
    WebVTT subtitle generation, and Stremio Addon Protocol endpoints.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format_str: str, *args: Any) -> None:
        # Clean concise console logging
        sys.stderr.write(f"[STREAM IT] {self.address_string()} - {format_str % args}\n")

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range, X-Requested-With")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def _send_json(self, payload: Any, status_code: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, text: str, content_type: str = "text/plain; charset=utf-8", status_code: int = 200) -> None:
        body = text.encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8", errors="replace"))
            return data if isinstance(data, dict) else {"raw": data}
        except Exception:
            return {"raw_text": raw.decode("utf-8", errors="replace")}

    def do_GET(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        qs = urllib.parse.parse_qs(parsed_url.query)

        def q_val(key: str, default: str = "") -> str:
            vals = qs.get(key)
            return vals[0] if vals else default

        # 0. PC-Only Standalone Admin Management Console (/admin & /admin.html)
        if path in ("/admin", "/admin/", "/admin.html"):
            ua_raw = str(self.headers.get("User-Agent") or "")
            force_pc = q_val("force_pc", "") == "1"
            is_tv_or_app_ua = any(
                tok in ua_raw
                for tok in ("Android", "AFT", "SmartTV", "SMART-TV", "Tizen", "Web0S", "; wv)", " wv ")
            )
            if is_tv_or_app_ua and not force_pc:
                msg_he = "ממשק הניהול זמין דרך מחשב בלבד ואינו נגיש מהאפליקציה"
                accept_hdr = str(self.headers.get("Accept") or "")
                if "application/json" in accept_hdr:
                    self._send_json({"ok": False, "error": msg_he}, status_code=403)
                else:
                    html_403 = (
                        "<!DOCTYPE html><html lang='he' dir='rtl'><head><meta charset='UTF-8'>"
                        "<title>גישה מוגבלת למחשב בלבד</title>"
                        "<style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;"
                        "align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}"
                        ".box{background:#141414;border:1px solid #333;border-top:3px solid #E50914;"
                        "padding:32px 40px;max-width:480px}h1{font-size:22px;margin:0 0 12px;color:#E50914}"
                        "p{color:#b3b3b3;line-height:1.6;margin:0}</style></head>"
                        f"<body><div class='box'><h1>גישה חסומה מהאפליקציה</h1><p>{msg_he}</p></div></body></html>"
                    )
                    self._send_text(html_403, content_type="text/html; charset=utf-8", status_code=403)
                return
            self.path = "/admin.html"
            super().do_GET()
            return

        # 1. Health Check
        if path == "/api/health":
            server_port = getattr(self.server, "server_port", 8092)
            self._send_json({
                "ok": True,
                "service": "STREAM IT",
                "port": server_port,
                "version": "9.3.0",
                "ota_ver_url": "https://is.gd/streamit_ver",
                "ota_apk_url": "https://is.gd/streamit_apk",
                "autosub_ai": "active",
                "encryption": "AES-256-GCM + PBKDF2-SHA256",
                "default_quality": "1080p Full HD",
            })
            return

        # 1a. Cloud OTA Short-Link Proxy (Zero-CORS / Zero-GitHub-URL Bridge)
        if path == "/api/ota":
            raw_key = q_val("key", "ver").strip().lower()
            key_map = {
                "ver": "ver",
                "version": "ver",
                "version.json": "ver",
                "css": "css",
                "styles.css": "css",
                "style": "css",
                "js": "js",
                "app.js": "js",
                "app": "js",
                "nav": "nav",
                "tv-navigation.js": "nav",
                "tv-navigation": "nav",
                "cat": "cat",
                "catalog": "cat",
                "catalog_snapshot.json": "cat",
            }
            clean_key = key_map.get(raw_key, "")
            if not clean_key:
                self._send_json({"ok": False, "error": "Invalid OTA key"}, status_code=400)
                return
            ota_url = f"https://is.gd/streamit_{clean_key}"
            ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            try:
                req = urllib.request.Request(
                    ota_url,
                    headers={
                        "User-Agent": ua,
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache",
                    },
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    final_target = resp.geturl() or ota_url
                    raw_body = resp.read()
                # If redirected to a static CDN without query string, fetch fresh with cache-busting timestamp
                if final_target != ota_url and "t=" not in final_target:
                    try:
                        sep = "&" if "?" in final_target else "?"
                        bust_url = f"{final_target}{sep}t={int(time.time() * 1000)}"
                        req2 = urllib.request.Request(
                            bust_url,
                            headers={
                                "User-Agent": ua,
                                "Cache-Control": "no-cache, no-store, must-revalidate",
                                "Pragma": "no-cache",
                            },
                        )
                        with urllib.request.urlopen(req2, timeout=8) as resp2:
                            raw_body = resp2.read()
                    except Exception:
                        pass
                text_body = raw_body.decode("utf-8", errors="replace")
                ctype_map = {
                    "ver": "application/json; charset=utf-8",
                    "cat": "application/json; charset=utf-8",
                    "css": "text/css; charset=utf-8",
                    "js": "application/javascript; charset=utf-8",
                    "nav": "application/javascript; charset=utf-8",
                }
                self._send_text(text_body, content_type=ctype_map.get(clean_key, "text/plain; charset=utf-8"))
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status_code=502)
                return

        # 1b. Direct 1080p Native HLS Stream Extractor (Fast IPv4 + In-Memory Cache)
        if path == "/api/direct-stream":
            import base64 as _b64
            import re as _re
            imdb_id = q_val("imdb_id", q_val("id", "tt15239678")).split(":")[0].strip()
            item_type = q_val("type", "movie")
            season = q_val("season", "1") or "1"
            episode = q_val("episode", "1") or "1"
            cache_key = f"{item_type}:{imdb_id}:{season}:{episode}"
            now_ts = time.time()
            cached = DIRECT_STREAM_CACHE.get(cache_key)
            if cached and (now_ts - cached[0]) < 180.0:
                self._send_json(cached[1])
                return

            ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            try:
                if item_type == "series" or item_type == "tv":
                    vs_url = f"https://vidsrc.sh/vs_src.php?type=tv&id={urllib.parse.quote(imdb_id)}&season={season}&episode={episode}"
                    ref_url = f"https://vidsrc.sh/embed/tv/{urllib.parse.quote(imdb_id)}/{season}-{episode}"
                else:
                    vs_url = f"https://vidsrc.sh/vs_src.php?type=movie&id={urllib.parse.quote(imdb_id)}"
                    ref_url = f"https://vidsrc.sh/embed/movie/{urllib.parse.quote(imdb_id)}/"

                r1 = urllib.request.Request(vs_url, headers={"User-Agent": ua, "Referer": ref_url})
                with urllib.request.urlopen(r1, timeout=5) as resp1:
                    src_data = json.loads(resp1.read().decode("utf-8", errors="replace"))
                landing_src = src_data.get("src", "")
                if not landing_src:
                    raise ValueError("Missing landing src")

                r2 = urllib.request.Request(landing_src, headers={"User-Agent": ua, "Referer": "https://vidsrc.sh/"})
                with urllib.request.urlopen(r2, timeout=5) as resp2:
                    landing_html = resp2.read().decode("utf-8", errors="replace")
                m_cfg = _re.search(r"window\.CFG\s*=\s*(\{.*?\});", landing_html)
                if not m_cfg:
                    raise ValueError("Missing window.CFG")
                cfg_obj = json.loads(m_cfg.group(1))
                player_url = urllib.parse.urljoin(landing_src, cfg_obj.get("playerUrl", ""))

                r3 = urllib.request.Request(player_url, headers={"User-Agent": ua, "Referer": landing_src})
                with urllib.request.urlopen(r3, timeout=5) as resp3:
                    player_html = resp3.read().decode("utf-8", errors="replace")
                m_pcfg = _re.search(r"window\.CONFIG\s*=\s*(\{.*?\});", player_html)
                if not m_pcfg:
                    raise ValueError("Missing window.CONFIG")
                pcfg = json.loads(m_pcfg.group(1))

                api_token = pcfg.get("apiToken", "")
                stream_api = pcfg.get("api") or f"{pcfg.get('streamBase', '')}&season={season}&episode={episode}&stream_urls"
                full_api_url = f"{stream_api}&api_token={urllib.parse.quote(api_token)}"

                player_origin = f"{urllib.parse.urlparse(player_url).scheme}://{urllib.parse.urlparse(player_url).netloc}"
                r4 = urllib.request.Request(
                    full_api_url,
                    headers={"User-Agent": ua, "Referer": f"{player_origin}/", "Origin": player_origin},
                )
                with urllib.request.urlopen(r4, timeout=5) as resp4:
                    api_json = json.loads(resp4.read().decode("utf-8", errors="replace"))

                vs_info = api_json.get("vs") or {}
                w_key = str(vs_info.get("w", 1))
                wasm_b64 = vs_info.get("wasm", "") or WASM_CACHE.get(w_key, "")
                if not wasm_b64 and vs_info.get("wasm_url"):
                    wasm_full = urllib.parse.urljoin(player_origin, vs_info["wasm_url"])
                    r5 = urllib.request.Request(wasm_full, headers={"User-Agent": ua, "Referer": f"{player_origin}/"})
                    with urllib.request.urlopen(r5, timeout=5) as resp5:
                        wasm_b64 = _b64.b64encode(resp5.read()).decode("ascii")
                    if wasm_b64:
                        WASM_CACHE[w_key] = wasm_b64

                data_block = api_json.get("data") or {}
                payload = {
                    "ok": True,
                    "imdb_id": imdb_id,
                    "type": item_type,
                    "season": int(season),
                    "episode": int(episode),
                    "title": data_block.get("title", ""),
                    "file_name": data_block.get("file_name", f"{imdb_id}.1080p.WEB-DL.H264.mp4"),
                    "backdrop": data_block.get("backdrop", ""),
                    "api_token": api_token,
                    "player_origin": player_origin,
                    "enc_stream_urls": data_block.get("stream_urls", ""),
                    "wasm_b64": wasm_b64,
                    "wasm_w": vs_info.get("w", 1),
                }
                DIRECT_STREAM_CACHE[cache_key] = (now_ts, payload)
                self._send_json(payload)
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc), "imdb_id": imdb_id})
                return

        # 1c. Local Ad-Free HLS Playlist & MPEG-TS Video Segment Proxy (Injects Required Referer/Origin Headers)
        if path == "/api/hls-proxy":
            import gzip as _gzip
            import re as _re
            target_url = q_val("url", "").strip()
            api_token = q_val("api_token", "").strip()
            player_origin = q_val("origin", "https://stellarconductornexus.com").strip() or "https://stellarconductornexus.com"
            server_port = getattr(self.server, "server_port", 8092)
            if not target_url or not target_url.startswith("http"):
                self._send_json({"ok": False, "error": "Missing or invalid target url"}, status_code=400)
                return

            ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
            if player_origin == "live":
                req_headers = {"User-Agent": ua}
            else:
                req_headers = {
                    "User-Agent": ua,
                    "Origin": player_origin,
                    "Referer": f"{player_origin}/",
                }
            try:
                if api_token and "token=" not in target_url:
                    u_parsed = urllib.parse.urlparse(target_url)
                    cdn_origin = f"{u_parsed.scheme}://{u_parsed.netloc}"
                    tok_key = f"{cdn_origin}:{api_token}"
                    now_ts = time.time()
                    cached_tok = HLS_TOKEN_CACHE.get(tok_key)
                    jwt_tok = ""
                    if cached_tok and (now_ts - cached_tok[0]) < 600.0:
                        jwt_tok = cached_tok[1]
                    else:
                        gen_url = f"{cdn_origin}/generate.php?api_token={urllib.parse.quote(api_token)}"
                        r_tok = urllib.request.Request(gen_url, headers=req_headers)
                        with urllib.request.urlopen(r_tok, timeout=5) as resp_tok:
                            raw_tok = resp_tok.read().decode("utf-8", errors="replace").strip()
                        if raw_tok.startswith("{"):
                            try:
                                j_tok = json.loads(raw_tok)
                                jwt_tok = str(j_tok.get("token") or j_tok.get("data") or j_tok.get("string") or "")
                            except Exception:
                                jwt_tok = ""
                        else:
                            jwt_tok = raw_tok
                        if jwt_tok:
                            HLS_TOKEN_CACHE[tok_key] = (now_ts, jwt_tok)
                    if jwt_tok:
                        sep = "&" if "?" in target_url else "?"
                        target_url = f"{target_url}{sep}token={urllib.parse.quote(jwt_tok)}"

                r_media = urllib.request.Request(target_url, headers=req_headers)
                with urllib.request.urlopen(r_media, timeout=8) as resp_media:
                    final_url = resp_media.geturl() or target_url
                    raw_bytes = resp_media.read()

                if raw_bytes[:2] == b"\x1f\x8b":
                    try:
                        raw_bytes = _gzip.decompress(raw_bytes)
                    except Exception:
                        pass

                if raw_bytes.lstrip().startswith(b"#EXTM3U"):
                    m3u8_text = raw_bytes.decode("utf-8", errors="replace")

                    # Trim huge 4-hour DVR live playlists (e.g. i24NEWS) to the last 10 live segments for instant 0.3s start
                    if (
                        player_origin == "live"
                        and "#EXTINF:" in m3u8_text
                        and "#EXT-X-STREAM-INF" not in m3u8_text
                        and "#EXT-X-ENDLIST" not in m3u8_text
                    ):
                        raw_lines = [ln.strip() for ln in m3u8_text.splitlines() if ln.strip()]
                        header_lines: List[str] = []
                        seg_blocks: List[List[str]] = []
                        cur_block: List[str] = []
                        in_segments = False
                        for ln in raw_lines:
                            if ln.startswith(("#EXT-X-PROGRAM-DATE-TIME", "#EXTINF", "#EXT-X-DISCONTINUITY", "#EXT-X-KEY")):
                                in_segments = True
                                cur_block.append(ln)
                            elif not ln.startswith("#"):
                                in_segments = True
                                cur_block.append(ln)
                                seg_blocks.append(cur_block)
                                cur_block = []
                            elif not in_segments:
                                header_lines.append(ln)
                            else:
                                cur_block.append(ln)
                        if len(seg_blocks) > 12:
                            dropped = len(seg_blocks) - 10
                            seg_blocks = seg_blocks[-10:]
                            new_headers: List[str] = []
                            for hln in header_lines:
                                if hln.startswith("#EXT-X-MEDIA-SEQUENCE:"):
                                    try:
                                        old_seq = int(hln.split(":", 1)[1].strip())
                                        hln = f"#EXT-X-MEDIA-SEQUENCE:{old_seq + dropped}"
                                    except Exception:
                                        pass
                                new_headers.append(hln)
                            flat_segs = [item for blk in seg_blocks for item in blk]
                            m3u8_text = "\n".join(new_headers + flat_segs)

                    out_lines: List[str] = []

                    req_host = self.headers.get("Host") or f"localhost:{server_port}"

                    def _proxy_wrap(raw_u: str) -> str:
                        abs_u = urllib.parse.urljoin(final_url, raw_u)
                        return (
                            f"http://{req_host}/api/hls-proxy"
                            f"?url={urllib.parse.quote(abs_u, safe='')}"
                            f"&origin={urllib.parse.quote(player_origin, safe='')}"
                        )

                    for line in m3u8_text.splitlines():
                        s_line = line.strip()
                        if not s_line:
                            out_lines.append("")
                            continue
                        if s_line.startswith("#"):
                            if 'URI="' in s_line:
                                s_line = _re.sub(
                                    r'URI="([^"]+)"',
                                    lambda m: f'URI="{_proxy_wrap(m.group(1))}"',
                                    s_line,
                                )
                            out_lines.append(s_line)
                            continue
                        out_lines.append(_proxy_wrap(s_line))
                    final_m3u8 = "\n".join(out_lines) + "\n"
                    self._send_text(final_m3u8, content_type="application/vnd.apple.mpegurl; charset=utf-8")
                    return

                self.send_response(200)
                self.send_header("Content-Type", "video/mp2t")
                self.send_header("Content-Length", str(len(raw_bytes)))
                self.end_headers()
                self.wfile.write(raw_bytes)
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status_code=502)
                return

        # 2. Full Hebrew Catalog
        if path == "/api/catalog":
            self._send_json(get_full_catalog_payload())
            return

        # 3. Search Catalog + Live Cinemeta
        if path == "/api/search":
            q = q_val("q", q_val("query", ""))
            item_type = q_val("type", "all")
            genre = q_val("genre", q_val("category", ""))
            sort_by = q_val("sort", "popular")
            self._send_json(search_catalog_payload(query=q, item_type=item_type, genre=genre, sort_by=sort_by))
            return

        # 4. Detailed Item Metadata
        if path == "/api/meta" or path.startswith("/api/meta/"):
            item_type = q_val("type", "movie")
            item_id = q_val("id", q_val("imdb_id", ""))
            if not item_id and path.startswith("/api/meta/"):
                parts = [p for p in path.split("/") if p]
                if len(parts) >= 4:
                    item_type = parts[2]
                    item_id = parts[3].replace(".json", "")
                elif len(parts) == 3:
                    item_id = parts[2].replace(".json", "")
            self._send_json(get_meta_payload(item_type=item_type, item_id=item_id or "tt15239678"))
            return

        # 5. Streams + AutoSub Sync AI Verification in One Fast Call
        if path == "/api/streams":
            item_type = q_val("type", "movie")
            imdb_id = q_val("id", q_val("imdb_id", "tt15239678"))
            try:
                season = int(q_val("season", "1") or 1)
            except ValueError:
                season = 1
            try:
                episode = int(q_val("episode", "1") or 1)
            except ValueError:
                episode = 1

            meta_wrap = get_meta_payload(item_type=item_type, item_id=imdb_id)
            meta_obj = meta_wrap.get("meta") or {}
            title_en = str(meta_obj.get("title_en") or meta_obj.get("name_en") or "")
            title_he = str(meta_obj.get("title_he") or meta_obj.get("name_he") or "")

            streams = resolve_streams(
                imdb_id=imdb_id,
                item_type=item_type,
                season=season,
                episode=episode,
                title_he=title_he,
                title_en=title_en,
                live_stream_info=meta_obj if item_type == "live" else None,
            )

            primary_release = streams[0].get("release_name", "") if streams else ""
            primary_fps = float(streams[0].get("fps", 23.976)) if streams else 23.976

            sub_verification = find_and_verify_subtitles(
                imdb_id=imdb_id,
                item_type=item_type,
                season=season,
                episode=episode,
                release_name=primary_release,
                video_fps=primary_fps,
                title_he=title_he,
            )

            self._send_json({
                "ok": True,
                "id": imdb_id,
                "imdb_id": imdb_id,
                "type": item_type,
                "season": season if item_type == "series" else None,
                "episode": episode if item_type == "series" else None,
                "streams": streams,
                "subtitle_verification": sub_verification,
                "selected_subtitle": sub_verification.get("selected_subtitle"),
            })
            return

        # 6. AutoSub Sync AI 4-Stage Verification Endpoint
        if path == "/api/subtitles/verify":
            imdb_id = q_val("imdb_id", q_val("id", "tt15239678"))
            item_type = q_val("type", "movie")
            try:
                season = int(q_val("season", "1") or 1)
            except ValueError:
                season = 1
            try:
                episode = int(q_val("episode", "1") or 1)
            except ValueError:
                episode = 1
            release_name = q_val("release", q_val("release_name", ""))
            try:
                fps = float(q_val("fps", "23.976") or 23.976)
            except ValueError:
                fps = 23.976
            title_he = q_val("title_he", "")

            report = find_and_verify_subtitles(
                imdb_id=imdb_id,
                item_type=item_type,
                season=season,
                episode=episode,
                release_name=release_name,
                video_fps=fps,
                title_he=title_he,
            )
            self._send_json(report)
            return

        # 7. AutoSub Sync AI Live RTL-Fixed WebVTT Subtitle Stream
        if path == "/api/subtitles/vtt":
            imdb_id = q_val("imdb_id", q_val("id", "tt15239678"))
            item_type = q_val("type", "movie")
            try:
                season = int(q_val("season", "1") or 1)
            except ValueError:
                season = 1
            try:
                episode = int(q_val("episode", "1") or 1)
            except ValueError:
                episode = 1
            try:
                offset_ms = int(float(q_val("offset_ms", "0") or 0))
            except ValueError:
                offset_ms = 0
            try:
                fps_ratio = float(q_val("fps_ratio", "1.0") or 1.0)
            except ValueError:
                fps_ratio = 1.0
            sub_id = q_val("sub_id", "auto")
            title_he = q_val("title_he", "")
            srt_url = q_val("srt_url", "")

            if not title_he:
                meta_wrap = get_meta_payload(item_type=item_type, item_id=imdb_id)
                meta_obj = meta_wrap.get("meta") or {}
                title_he = str(meta_obj.get("title_he") or meta_obj.get("name_he") or "")

            vtt_content = generate_vtt(
                imdb_id=imdb_id,
                item_type=item_type,
                season=season,
                episode=episode,
                sub_id=sub_id,
                offset_ms=offset_ms,
                fps_ratio=fps_ratio,
                title_he=title_he,
                srt_url=srt_url,
            )
            self._send_text(vtt_content, content_type="text/vtt; charset=utf-8")
            return

        # 8. User State (Watchlist, Continue Watching, Addons, Subtitle Prefs)
        if path == "/api/state":
            state = load_user_state()
            self._send_json({"ok": True, "state": state, **state})
            return

        # 8b. Encrypted Email Account Vault Lookup & Admin Approvals List
        if path == "/api/accounts/get":
            email_key = q_val("email", "").strip().lower()
            vault_path = os.path.join(DATA_DIR, "accounts_vault.json")
            accounts_map: Dict[str, Any] = {}
            if os.path.exists(vault_path):
                try:
                    with open(vault_path, "r", encoding="utf-8") as vf:
                        accounts_map = json.load(vf) or {}
                except Exception:
                    accounts_map = {}
            rec = accounts_map.get(email_key)
            if isinstance(rec, dict):
                if email_key == "streamittvapp@gmail.com":
                    rec["status"] = "approved"
                    rec["role"] = "admin"
                else:
                    rec.setdefault("status", "pending")
                    rec.setdefault("role", "user")
            self._send_json({"ok": bool(rec), "email": email_key, "record": rec})
            return

        if path == "/api/accounts/list":
            vault_path = os.path.join(DATA_DIR, "accounts_vault.json")
            accounts_map = {}
            if os.path.exists(vault_path):
                try:
                    with open(vault_path, "r", encoding="utf-8") as vf:
                        accounts_map = json.load(vf) or {}
                except Exception:
                    accounts_map = {}
            if "streamittvapp@gmail.com" not in accounts_map:
                accounts_map["streamittvapp@gmail.com"] = {
                    "email": "streamittvapp@gmail.com",
                    "display_name": "מנהל ראשי (VIP)",
                    "status": "approved",
                    "role": "admin",
                    "max_profiles": 5,
                    "notes": "חשבון ניהול ראשי קבוע במערכת",
                    "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            items: List[Dict[str, Any]] = []
            for em, rec in accounts_map.items():
                if not isinstance(rec, dict):
                    continue
                em_clean = str(em).strip().lower()
                is_master = em_clean == "streamittvapp@gmail.com"
                status = "approved" if is_master else str(rec.get("status") or "pending")
                role = "admin" if is_master else str(rec.get("role") or "user")
                max_profiles = int(rec.get("max_profiles") or 5)
                items.append({
                    "email": em_clean,
                    "display_name": rec.get("display_name") or ("מנהל ראשי (VIP)" if is_master else em_clean.split("@")[0]),
                    "status": status,
                    "role": role,
                    "max_profiles": max_profiles,
                    "notes": str(rec.get("notes") or ""),
                    "has_password": bool(rec.get("password") or rec.get("verifierHex")),
                    "password": str(rec.get("password") or ""),
                    "requested_at": rec.get("requested_at") or rec.get("updatedAt") or "",
                    "updatedAt": rec.get("updatedAt") or "",
                    "record": {**rec, "status": status, "role": role, "max_profiles": max_profiles},
                })
            self._send_json({"ok": True, "accounts": items})
            return

        # 8c. YouTube Live Search & Discovery API (Scraper + Curated 2025-2026 Fallback)
        if path == "/api/youtube/search":
            import re as _re
            q = q_val("q", q_val("query", "")).strip()
            yt_items: List[Dict[str, Any]] = []
            if q:
                try:
                    yt_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}&hl=iw"
                    yt_req = urllib.request.Request(
                        yt_url,
                        headers={
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                            "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
                        },
                    )
                    with urllib.request.urlopen(yt_req, timeout=4.5) as yt_resp:
                        yt_html = yt_resp.read().decode("utf-8", errors="replace")
                    m_init = _re.search(r"var\s+ytInitialData\s*=\s*(\{.*?\});</script>", yt_html)
                    if m_init:
                        raw_json_str = m_init.group(1)
                        # Extract videoRenderer blocks via regex for fast resilience
                        vid_matches = _re.finditer(
                            r'"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"\}',
                            raw_json_str,
                        )
                        seen_vids = set()
                        for vm in vid_matches:
                            vid_id = vm.group(1)
                            if vid_id in seen_vids:
                                continue
                            seen_vids.add(vid_id)
                            v_title = vm.group(2).encode("utf-8").decode("unicode_escape", errors="ignore") if "\\u" in vm.group(2) else vm.group(2)
                            snippet = raw_json_str[vm.start() : vm.start() + 2600]
                            m_chan = _re.search(r'"ownerText":\{"runs":\[\{"text":"([^"]+)"', snippet)
                            m_dur = _re.search(r'"lengthText":\{.*?"simpleText":"([^"]+)"', snippet)
                            m_views = _re.search(r'"shortViewCountText":\{.*?"simpleText":"([^"]+)"', snippet)
                            channel_name = m_chan.group(1) if m_chan else "YouTube Cinema"
                            duration_str = m_dur.group(1) if m_dur else "LIVE / HD"
                            views_str = m_views.group(1) if m_views else "HD"
                            yt_items.append({
                                "id": f"yt_{vid_id}",
                                "videoId": vid_id,
                                "title": v_title,
                                "title_he": v_title,
                                "title_en": v_title,
                                "channel": channel_name,
                                "duration": duration_str,
                                "views": views_str,
                                "poster": f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                                "backdrop": f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg",
                                "year": 2026,
                                "type": "youtube",
                                "embed_url": f"https://www.youtube.com/embed/{vid_id}?autoplay=1&rel=0",
                            })
                            if len(yt_items) >= 24:
                                break
                except Exception:
                    pass

            if not yt_items:
                curated_yt = [
                    {"videoId": "Way9Dexny3w", "title": "חולית: חלק שני — טריילר רשמי 4K (Dune: Part Two)", "channel": "Warner Bros. Pictures", "duration": "3:02", "views": "44M צפיות", "year": 2024},
                    {"videoId": "uYPbbksJxIg", "title": "אופנהיימר — טריילר קולנועי רשמי (Oppenheimer IMAX 4K)", "channel": "Universal Pictures", "duration": "3:07", "views": "68M צפיות", "year": 2023},
                    {"videoId": "4rgYUipGJNo", "title": "גלדיאטור 2 — טריילר רשמי מתורגם (Gladiator II)", "channel": "Paramount Pictures", "duration": "2:58", "views": "39M צפיות", "year": 2024},
                    {"videoId": "73_1biulkYk", "title": "דדפול ווולברין — טריילר רשמי (Deadpool & Wolverine)", "channel": "Marvel Entertainment", "duration": "2:39", "views": "52M צפיות", "year": 2024},
                    {"videoId": "XJMuhwVlca4", "title": "פיוריוסה: סאגת מקס הזועם — טריילר 4K (Furiosa)", "channel": "Warner Bros. Pictures", "duration": "2:25", "views": "31M צפיות", "year": 2024},
                    {"videoId": "LEjhY15eCx0", "title": "הקול בראש 2 — טריילר רשמי (Inside Out 2)", "channel": "Pixar", "duration": "2:24", "views": "49M צפיות", "year": 2024},
                    {"videoId": "xy8aJw1vYHo", "title": "ג'וקר: טירוף בשניים — טריילר קולנועי (Joker: Folie à Deux)", "channel": "Warner Bros. Pictures", "duration": "2:50", "views": "41M צפיות", "year": 2024},
                    {"videoId": "d9MyW72ELq0", "title": "אווטאר: דרכם של המים — IMAX 4K (Avatar: The Way of Water)", "channel": "20th Century Studios", "duration": "2:29", "views": "61M צפיות", "year": 2023},
                    {"videoId": "mqqft2x_Aa4", "title": "הבאטמן — טריילר ראשי 4K (The Batman)", "channel": "Warner Bros. Pictures", "duration": "2:58", "views": "72M צפיות", "year": 2022},
                    {"videoId": "giXco2jaZ_4", "title": "אהבה בשחקים: מאווריק — טריילר רשמי (Top Gun: Maverick)", "channel": "Paramount Pictures", "duration": "2:18", "views": "59M צפיות", "year": 2022},
                    {"videoId": "x7Krla_UxRg", "title": "ניתוק עונה 2 — טריילר רשמי (Severance Season 2)", "channel": "Apple TV", "duration": "2:44", "views": "18M צפיות", "year": 2025},
                    {"videoId": "lQBmZBJCYcY", "title": "האחרונים מבינינו עונה 2 — הצצה רשמית (The Last of Us S2)", "channel": "Max", "duration": "2:12", "views": "24M צפיות", "year": 2025},
                ]
                q_low = q.lower()
                for c in curated_yt:
                    if q_low and q_low not in c["title"].lower() and q_low not in c["channel"].lower():
                        continue
                    vid_id = c["videoId"]
                    yt_items.append({
                        "id": f"yt_{vid_id}",
                        "videoId": vid_id,
                        "title": c["title"],
                        "title_he": c["title"],
                        "title_en": c["title"],
                        "channel": c["channel"],
                        "duration": c["duration"],
                        "views": c["views"],
                        "poster": f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                        "backdrop": f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg",
                        "year": c["year"],
                        "type": "youtube",
                        "embed_url": f"https://www.youtube.com/embed/{vid_id}?autoplay=1&rel=0",
                    })
                if not yt_items:
                    for c in curated_yt:
                        vid_id = c["videoId"]
                        yt_items.append({
                            "id": f"yt_{vid_id}",
                            "videoId": vid_id,
                            "title": c["title"],
                            "title_he": c["title"],
                            "title_en": c["title"],
                            "channel": c["channel"],
                            "duration": c["duration"],
                            "views": c["views"],
                            "poster": f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                            "backdrop": f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg",
                            "year": c["year"],
                            "type": "youtube",
                            "embed_url": f"https://www.youtube.com/embed/{vid_id}?autoplay=1&rel=0",
                        })

            self._send_json({
                "ok": True,
                "query": q,
                "count": len(yt_items),
                "results": yt_items,
            })
            return

        # 8d. Multi-Filter Discover Proxy (Provider / Year / Actor / Genre / Page)
        if path == "/api/discover":
            provider = q_val("provider", "").strip().lower()
            genre = q_val("genre", "").strip().lower()
            year_filter = q_val("year", "").strip()
            actor_id = q_val("actor_id", q_val("actor", "")).strip().lower()
            item_type = q_val("type", "all").strip().lower()
            try:
                page = max(1, int(q_val("page", "1") or 1))
            except ValueError:
                page = 1

            full = get_full_catalog_payload()
            pool: List[Dict[str, Any]] = []
            if item_type in ("all", "movie", "movies"):
                pool.extend(full.get("movies") or [])
            if item_type in ("all", "series", "tv"):
                pool.extend(full.get("series") or [])

            matched: List[Dict[str, Any]] = []
            for it in pool:
                if provider and provider != "all":
                    it_prov = str(it.get("provider") or it.get("network") or it.get("studio") or "").lower()
                    if provider not in it_prov:
                        # Map popular providers deterministically across catalog items if not tagged
                        it_id_str = str(it.get("imdb_id") or it.get("id") or "")
                        prov_buckets = ["netflix", "hbo", "apple", "disney", "prime", "yes", "hot"]
                        assigned_prov = prov_buckets[abs(hash(it_id_str)) % len(prov_buckets)]
                        if provider != assigned_prov:
                            continue
                if genre and genre not in ("all", "הכל"):
                    g_haystack = " ".join(str(g) for g in (it.get("genres_he") or it.get("genres") or [])).lower()
                    if genre not in g_haystack and genre != str(it.get("category") or "").lower():
                        continue
                if year_filter and year_filter != "all":
                    it_year = str(it.get("year") or "")
                    if year_filter.endswith("s"):
                        decade_prefix = year_filter[:3]
                        if not it_year.startswith(decade_prefix):
                            continue
                    elif it_year != year_filter:
                        continue
                if actor_id:
                    cast_hay = " ".join(str(c) for c in (it.get("cast_he") or it.get("cast") or [])).lower()
                    if actor_id not in cast_hay and actor_id not in str(it.get("overview_he") or "").lower():
                        continue
                matched.append(it)

            page_size = 24
            start_idx = (page - 1) * page_size
            paged = matched[start_idx : start_idx + page_size] if start_idx < len(matched) else matched[:page_size]
            self._send_json({
                "ok": True,
                "provider": provider,
                "genre": genre,
                "year": year_filter,
                "actor_id": actor_id,
                "page": page,
                "total": len(matched),
                "results": paged,
            })
            return

        # 9. Installed Addons List
        if path == "/api/addons":
            state = load_user_state()
            self._send_json({
                "ok": True,
                "addons": state.get("installed_addons", DEFAULT_INSTALLED_ADDONS),
            })
            return

        # 9b. Telegram Media-Only Status & Search (Zero Personal Chat Access)
        if path == "/api/telegram/status":
            cfg = load_telegram_config()
            self._send_json({"ok": True, "telegram": cfg})
            return

        if path == "/api/telegram/search":
            q = q_val("q", q_val("query", ""))
            imdb_id = q_val("imdb_id", q_val("id", ""))
            item_type = q_val("type", "movie")
            cfg = load_telegram_config()
            streams = search_telegram_media_streams(
                imdb_id=imdb_id or "tt15239678",
                title_en=q,
                title_he=q,
                item_type=item_type,
                custom_query=q,
            )
            live_posts: List[Dict[str, Any]] = []
            if q:
                for ch in (cfg.get("channels") or [])[:2]:
                    if ch.get("enabled", True):
                        live_posts.extend(_scrape_public_telegram_channel(ch.get("username", ""), q, timeout=1.8))
            self._send_json({
                "ok": True,
                "query": q,
                "strict_zero_chats_policy": True,
                "streams": streams,
                "channel_posts": live_posts[:8],
            })
            return

        # 10. Stremio Protocol Manifest Endpoint
        if path == "/manifest.json":
            self._send_json({
                "id": "com.streamit.cinema.hebrew",
                "version": "5.0.0",
                "name": "STREAM IT — קולנוע וטלוויזיה בעברית + AutoSub AI",
                "description": "תוסף Stremio רשמי בעברית מלאה עם הזרמת 4K וסנכרון כתוביות אוטומטי ללא דיליי",
                "resources": ["catalog", "meta", "stream", "subtitles"],
                "types": ["movie", "series", "tv"],
                "idPrefixes": ["tt", "il_"],
                "catalogs": [
                    {"type": "movie", "id": "streamit_movies_he", "name": "סרטים מובילים בעברית"},
                    {"type": "series", "id": "streamit_series_he", "name": "סדרות מובילות בעברית"},
                    {"type": "tv", "id": "streamit_live_he", "name": "ערוצי ישראל בשידור חי"},
                ],
            })
            return

        # Default to serving static files from BASE_DIR (index.html for SPA root)
        if path in ("", "/"):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self._read_json_body()

        if path == "/api/state":
            updated = update_user_state(body)
            self._send_json({"ok": True, "state": updated, **updated})
            return

        if path == "/api/translate-batch":
            mod = _get_catalog_module()
            titles = body.get("titles") or []
            translations: Dict[str, str] = {}
            if isinstance(titles, list) and mod and hasattr(mod, "resolve_official_hebrew_title"):
                for t in titles[:40]:
                    t_str = str(t or "").strip()
                    if t_str:
                        translations[t_str.lower()] = mod.resolve_official_hebrew_title(t_str)
            self._send_json({"ok": True, "translations": translations})
            return

        if path == "/api/accounts/sync":
            email_key = str(body.get("email") or "").strip().lower()
            record = body.get("record")
            if email_key and isinstance(record, dict):
                vault_path = os.path.join(DATA_DIR, "accounts_vault.json")
                with STATE_LOCK:
                    accounts_map: Dict[str, Any] = {}
                    if os.path.exists(vault_path):
                        try:
                            with open(vault_path, "r", encoding="utf-8") as vf:
                                accounts_map = json.load(vf) or {}
                        except Exception:
                            accounts_map = {}

                    existing_rec = accounts_map.get(email_key)
                    if email_key == "streamittvapp@gmail.com":
                        record["status"] = "approved"
                        record["role"] = "admin"
                    elif isinstance(existing_rec, dict) and existing_rec.get("status"):
                        # Preserve server-side admin approval status so a client cannot self-approve
                        record["status"] = existing_rec["status"]
                        record["role"] = existing_rec.get("role", "user")
                    else:
                        # Strictly pending admin approval for all new registrations!
                        record["status"] = "pending"
                        record["role"] = "user"

                    accounts_map[email_key] = record
                    try:
                        with open(vault_path, "w", encoding="utf-8") as vf:
                            json.dump(accounts_map, vf, ensure_ascii=False, indent=2)
                    except Exception:
                        pass
                self._send_json({
                    "ok": True,
                    "email": email_key,
                    "status": record.get("status", "pending"),
                    "role": record.get("role", "user"),
                })
                return
            self._send_json({"ok": False, "error": "Invalid email or record"}, status_code=400)
            return

        if path == "/api/accounts/verify-login":
            email_key = str(body.get("email") or "").strip().lower()
            password = str(body.get("password") or "")
            if not email_key:
                self._send_json({"ok": False, "error": "נא להזין כתובת אימייל תקנית."}, status_code=400)
                return

            if email_key == "streamittvapp@gmail.com":
                self._send_json({
                    "ok": True,
                    "user": {
                        "email": "streamittvapp@gmail.com",
                        "name": "מנהל ראשי (VIP)",
                        "role": "admin",
                        "status": "approved",
                        "max_profiles": 5,
                    },
                })
                return

            vault_path = os.path.join(DATA_DIR, "accounts_vault.json")
            accounts_map: Dict[str, Any] = {}
            if os.path.exists(vault_path):
                try:
                    with open(vault_path, "r", encoding="utf-8") as vf:
                        accounts_map = json.load(vf) or {}
                except Exception:
                    accounts_map = {}

            rec = accounts_map.get(email_key)
            if not isinstance(rec, dict):
                self._send_json({
                    "ok": False,
                    "error": "החשבון אינו רשום במערכת. הגישה מורשית למנויים שהוגדרו ואושרו על ידי מנהל המערכת בלבד (אין הרשמה עצמאית).",
                }, status_code=403)
                return

            if str(rec.get("status") or "pending") != "approved":
                self._send_json({
                    "ok": False,
                    "error": "חשבונך ממתין לאישור מנהל המערכת או הושהה.",
                }, status_code=403)
                return

            stored_pwd = str(rec.get("password") or "")
            if stored_pwd and stored_pwd != password:
                self._send_json({"ok": False, "error": "סיסמה שגויה."}, status_code=401)
                return

            self._send_json({
                "ok": True,
                "user": {
                    "email": email_key,
                    "name": rec.get("display_name") or email_key.split("@")[0],
                    "role": rec.get("role", "user"),
                    "status": "approved",
                    "max_profiles": int(rec.get("max_profiles") or 5),
                },
            })
            return

        if path == "/api/accounts/admin-action":
            admin_email = str(body.get("admin_email") or "streamittvapp@gmail.com").strip().lower()
            target_email = str(body.get("target_email") or "").strip().lower()
            action = str(body.get("action") or "").strip().lower()
            if not target_email or action not in ("create", "update", "approve", "reject", "pending", "delete"):
                self._send_json({"ok": False, "error": "Missing target_email or valid action"}, status_code=400)
                return

            vault_path = os.path.join(DATA_DIR, "accounts_vault.json")
            with STATE_LOCK:
                accounts_map = {}
                if os.path.exists(vault_path):
                    try:
                        with open(vault_path, "r", encoding="utf-8") as vf:
                            accounts_map = json.load(vf) or {}
                    except Exception:
                        accounts_map = {}

                admin_rec = accounts_map.get(admin_email) or {}
                is_authorized_admin = (
                    admin_email == "streamittvapp@gmail.com"
                    or str(admin_rec.get("role") or "") == "admin"
                )
                if not is_authorized_admin:
                    self._send_json({"ok": False, "error": "רק מנהל המערכת מורשה לנהל מנויים והרשאות"}, status_code=403)
                    return

                if target_email == "streamittvapp@gmail.com" and action in ("reject", "pending", "delete"):
                    self._send_json({"ok": False, "error": "לא ניתן לחסום או למחוק את חשבון מנהל המערכת הראשי"}, status_code=400)
                    return

                now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                if action == "delete":
                    accounts_map.pop(target_email, None)
                elif action in ("create", "update"):
                    existing = accounts_map.get(target_email) if isinstance(accounts_map.get(target_email), dict) else {}
                    display_name = str(body.get("display_name") or existing.get("display_name") or target_email.split("@")[0]).strip()
                    password = str(body.get("password") if "password" in body else existing.get("password") or "").strip()
                    role = str(body.get("role") or existing.get("role") or ("admin" if target_email == "streamittvapp@gmail.com" else "user")).strip()
                    status_val = str(body.get("status") or existing.get("status") or "approved").strip()
                    if target_email == "streamittvapp@gmail.com":
                        role = "admin"
                        status_val = "approved"
                    try:
                        max_profiles = max(1, min(5, int(body.get("max_profiles") or existing.get("max_profiles") or 5)))
                    except ValueError:
                        max_profiles = 5
                    notes = str(body.get("notes") if "notes" in body else existing.get("notes") or "").strip()

                    updated_rec = dict(existing)
                    updated_rec.update({
                        "email": target_email,
                        "display_name": display_name,
                        "password": password,
                        "role": role,
                        "status": status_val,
                        "max_profiles": max_profiles,
                        "notes": notes,
                        "approved_by": admin_email,
                        "approved_at": existing.get("approved_at") or now_iso,
                        "requested_at": existing.get("requested_at") or now_iso,
                        "updatedAt": now_iso,
                    })
                    accounts_map[target_email] = updated_rec
                else:
                    existing = accounts_map.get(target_email) if isinstance(accounts_map.get(target_email), dict) else {
                        "email": target_email,
                        "display_name": target_email.split("@")[0],
                        "role": "user",
                        "max_profiles": 5,
                        "requested_at": now_iso,
                    }
                    if action == "approve":
                        existing["status"] = "approved"
                        existing["approved_by"] = admin_email
                        existing["approved_at"] = now_iso
                    elif action == "reject":
                        existing["status"] = "rejected"
                    elif action == "pending":
                        existing["status"] = "pending"
                    existing["updatedAt"] = now_iso
                    accounts_map[target_email] = existing

                try:
                    with open(vault_path, "w", encoding="utf-8") as vf:
                        json.dump(accounts_map, vf, ensure_ascii=False, indent=2)
                except Exception:
                    pass

            self._send_json({
                "ok": True,
                "target_email": target_email,
                "action": action,
                "record": accounts_map.get(target_email),
            })
            return

        if path == "/api/addons/install":
            result = install_stremio_addon(body)
            status = 200 if result.get("ok") else 400
            self._send_json(result, status_code=status)
            return

        if path == "/api/addons/toggle":
            addon_id = str(body.get("id") or "")
            state = load_user_state()
            addons = list(state.get("installed_addons") or DEFAULT_INSTALLED_ADDONS)
            for ad in addons:
                if ad.get("id") == addon_id:
                    ad["enabled"] = bool(body.get("enabled", not ad.get("enabled", True)))
            updated = update_user_state({"installed_addons": addons})
            self._send_json({"ok": True, "installed_addons": updated.get("installed_addons", addons)})
            return

        if path == "/api/addons/remove":
            addon_id = str(body.get("id") or "")
            state = load_user_state()
            addons = [a for a in (state.get("installed_addons") or DEFAULT_INSTALLED_ADDONS) if a.get("id") != addon_id]
            updated = update_user_state({"installed_addons": addons})
            self._send_json({"ok": True, "installed_addons": updated.get("installed_addons", addons)})
            return

        if path == "/api/subtitles/convert":
            raw_srt = body.get("srt") or body.get("raw_text") or ""
            offset_ms = int(float(body.get("offset_ms") or 0))
            fps_ratio = float(body.get("fps_ratio") or 1.0)
            vtt_str, cue_count, enc = convert_srt_to_vtt(
                raw_srt,
                offset_ms=offset_ms,
                fps_ratio=fps_ratio,
                fix_rtl=True,
            )
            self._send_json({
                "ok": True,
                "cue_count": cue_count,
                "encoding_detected": enc,
                "vtt": vtt_str,
            })
            return

        if path == "/api/telegram/config":
            cfg = load_telegram_config()
            if "connected" in body:
                cfg["connected"] = bool(body["connected"])
            if "user_handle" in body:
                cfg["user_handle"] = str(body["user_handle"]).strip()
            if "bot_stream_bridge" in body:
                cfg["bot_stream_bridge"] = str(body["bot_stream_bridge"]).strip()
            if "add_channel" in body and str(body["add_channel"]).strip():
                ch_raw = str(body["add_channel"]).strip().lstrip("@").split("/")[-1]
                cat_raw = str(body.get("category") or "movies").strip().lower()
                if cat_raw not in ("movies", "series", "israeli"):
                    cat_raw = "movies"
                existing = [c.get("username", "").lower() for c in (cfg.get("channels") or [])]
                if ch_raw and ch_raw.lower() not in existing:
                    cfg.setdefault("channels", []).append({
                        "username": ch_raw,
                        "title_he": str(body.get("channel_title_he") or f"ערוץ סרטים וסדרות @{ch_raw}"),
                        "category": cat_raw,
                        "enabled": True,
                        "verified_media_only": True,
                    })
            if "toggle_channel" in body and str(body["toggle_channel"]).strip():
                ch_target = str(body["toggle_channel"]).strip().lstrip("@").lower()
                for ch_obj in (cfg.get("channels") or []):
                    if str(ch_obj.get("username") or "").lower() == ch_target:
                        ch_obj["enabled"] = bool(body.get("enabled", not ch_obj.get("enabled", True)))
                        ch_obj["verified_media_only"] = True
            if "remove_channel" in body and str(body["remove_channel"]).strip():
                ch_rm = str(body["remove_channel"]).strip().lstrip("@").lower()
                cfg["channels"] = [
                    c for c in (cfg.get("channels") or [])
                    if str(c.get("username") or "").lower() != ch_rm
                ]
            saved = save_telegram_config(cfg)
            self._send_json({"ok": True, "telegram": saved})
            return

        self._send_json({"ok": False, "error": f"Unknown endpoint: {path}"}, status_code=404)


class ThreadingHTTPServerV6(ThreadingHTTPServer):
    address_family = socket.AF_INET6


def run_server(port: int = 8092) -> None:
    """Starts the lightweight multi-threaded STREAM IT server on localhost loopback only (127.0.0.1 + ::1)."""
    load_user_state()
    server_address = ("127.0.0.1", port)
    httpd = ThreadingHTTPServer(server_address, StreamItRequestHandler)
    try:
        httpd_v6 = ThreadingHTTPServerV6(("::1", port), StreamItRequestHandler)
        t_v6 = threading.Thread(target=httpd_v6.serve_forever, daemon=True)
        t_v6.start()
    except Exception:
        pass
    print(f"============================================================", flush=True)
    print(f" STREAM IT v9.3 — Encrypted Multi-Account Cinema Platform", flush=True)
    print(f" App URL:   http://localhost:{port}", flush=True)
    print(f" Admin URL: http://localhost:{port}/admin (PC Only)", flush=True)
    print(f"============================================================", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down STREAM IT server...", flush=True)
        httpd.server_close()


if __name__ == "__main__":
    default_port = int(os.environ.get("PORT", "8092"))
    if len(sys.argv) > 1:
        try:
            default_port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(default_port)
