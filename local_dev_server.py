#!/usr/bin/env python3
"""
STREAM IT — Local PC Development & Direct 1080p Original-Language HLS Server (Port 8092)
Mirrors StreamItEmbeddedServer.java on PC so http://localhost:8092 gets:
- Static Web App + Catalog serving (CORS + No-Cache for instant live reloads)
- /api/health
- /api/direct-stream (Prioritizing w7dn Nebula 1080p Original-Language HLS + strict title/year/language check, blocking vjej foreign dubs)
- /api/hls-proxy (Rewriting HLS playlists & segments with required Origin/Referer headers)
"""
import base64
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
PLAYER_KEY = "f3b72e73c80c9a996574379798703796a1936efa3516a7105cb0e43048b46b5a"
DIRECT_STREAM_CACHE = {}


def is_returned_title_plausible(expected_title: str, expected_year: str, ret_title: str, ret_year: str, orig_lang: str) -> bool:
    if expected_year and ret_year:
        try:
            y1 = int(str(expected_year)[:4])
            y2 = int(str(ret_year)[:4])
            if y1 >= 1900 and y2 >= 1900 and abs(y1 - y2) > 2:
                return False
        except Exception:
            pass
    if (orig_lang or "en").lower() == "en":
        exp = re.sub(r"[^a-z0-9\u0590-\u05ff]+", "", (expected_title or "").lower())
        ret = re.sub(r"[^a-z0-9\u0590-\u05ff]+", "", (ret_title or "").lower())
        if exp and ret and bool(re.fullmatch(r"[a-z0-9]+", exp)) and bool(re.fullmatch(r"[a-z0-9]+", ret)):
            if exp not in ret and ret not in exp:
                if min(len(exp), len(ret)) >= 4 and exp[:4] not in ret:
                    return False
    return True


def resolve_vidspark_original_hls(media_type: str, tmdb_id: str, season: str, episode: str, orig_lang: str, expected_title: str, expected_year: str):
    if not tmdb_id or not tmdb_id.isdigit():
        return None
    lang = (orig_lang or "en").strip().lower()
    cache_key = f"{media_type}:{tmdb_id}:{season}:{episode}:{lang}"
    cached = DIRECT_STREAM_CACHE.get(cache_key)
    now = time.time()
    if cached and (now - cached[0]) < 900:
        return cached[1]

    hosts = ["https://cdn.vidspark.to"]
    # Prioritize w7dn (Nebula — 1080p Original Audio HLS) with retry so cold cache never falls back to 720p vjej
    sources = ["w7dn", "w7dn", "vjej"] if lang == "en" else ["w7dn", "w7dn"]
    for attempt_idx, src_code in enumerate(sources):
        for host in hosts:
            if media_type == "series":
                vp_path = f"/api/vidora/v1/tv/{tmdb_id}/{season}/{episode}?source={src_code}"
            else:
                vp_path = f"/api/vidora/v1/movie/{tmdb_id}?source={src_code}"
            try:
                req = urllib.request.Request(
                    host + vp_path,
                    headers={
                        "User-Agent": UA,
                        "Accept": "application/json, */*",
                        "Origin": host,
                        "Referer": host + "/",
                        "x-player-key": PLAYER_KEY,
                    },
                )
                req_timeout = 5.5 if src_code == "w7dn" else 4.0
                with urllib.request.urlopen(req, timeout=req_timeout) as resp:
                    if resp.status != 200:
                        continue
                    data = json.loads(resp.read().decode("utf-8", errors="ignore"))
                if data.get("result") is False:
                    continue
                ret_title = str(data.get("title") or "")
                ret_year = str(data.get("year") or "")
                if not is_returned_title_plausible(expected_title, expected_year, ret_title, ret_year, lang):
                    continue
                src_arr = data.get("sources") or []
                if not src_arr:
                    continue
                s0 = src_arr[0] or {}
                actual_src = str(s0.get("source") or src_code).lower()
                if lang != "en" and actual_src == "vjej":
                    continue
                if src_code == "w7dn" and actual_src != "w7dn" and attempt_idx == 0:
                    continue
                raw_stream_url = str(s0.get("url") or "").strip()
                # If p9fx returns DASH .mpd in url, use its direct MP4 from qualities[] if available
                if (not raw_stream_url.startswith("http")) or (".mpd" in raw_stream_url) or ("/dash-" in raw_stream_url):
                    quals = s0.get("qualities") or data.get("qualities") or []
                    mp4_candidate = ""
                    for q_item in quals:
                        q_url = str((q_item or {}).get("url") or "").strip()
                        if q_url.startswith("http") and ".mpd" not in q_url:
                            mp4_candidate = q_url
                            break
                    if mp4_candidate:
                        raw_stream_url = mp4_candidate
                    else:
                        continue
                final_stream_url = raw_stream_url
                if "url=" in raw_stream_url:
                    parsed_w = urllib.parse.urlparse(raw_stream_url)
                    qs_w = urllib.parse.parse_qs(parsed_w.query)
                    inner_m3u8 = (qs_w.get("url") or [""])[0]
                    inner_origin = "https://vidrock.to"
                    raw_data = (qs_w.get("data") or [""])[0]
                    if raw_data:
                        b64 = raw_data.replace("-", "+").replace("_", "/")
                        while len(b64) % 4 != 0:
                            b64 += "="
                        try:
                            dec = base64.b64decode(b64).decode("utf-8", errors="ignore")
                            for part in dec.split("|"):
                                if part.startswith("Origin="):
                                    inner_origin = part.split("=", 1)[1].strip()
                        except Exception:
                            pass
                    if inner_m3u8.startswith("http"):
                        final_stream_url = (
                            "/api/hls-proxy?url="
                            + urllib.parse.quote(inner_m3u8, safe="")
                            + "&origin="
                            + urllib.parse.quote(inner_origin, safe="")
                        )
                out = {
                    "ok": True,
                    "source": actual_src,
                    "provider": f"vidspark-{actual_src}",
                    "title": ret_title,
                    "quality": str(s0.get("quality") or "1080p"),
                    "streamUrl": final_stream_url,
                }
                DIRECT_STREAM_CACHE[cache_key] = (now, out)
                return out
            except Exception:
                continue
    return None


class StreamItDevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def log_message(self, fmt, *args):
        # Keep console clean while still logging API hits or errors
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _send_json(self, payload: dict, status: int = 200):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/api/health":
            return self._send_json({"ok": True, "engine": "streamit-local-dev-v9.9.8", "version": "9.9.8", "port": 8092})

        if path == "/api/catalog":
            cat_file = os.path.join(ROOT_DIR, "data", "hebrew_catalog.json")
            if os.path.isfile(cat_file):
                with open(cat_file, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            return self._send_json({"movies": [], "series": []})

        if path == "/api/direct-stream":
            raw_type = (qs.get("type") or ["movie"])[0]
            raw_season = (qs.get("season") or ["1"])[0]
            raw_episode = (qs.get("episode") or ["1"])[0]
            if "movie" in raw_season.lower():
                media_type = "movie"
            else:
                media_type = "series" if raw_type.lower() in ("series", "tv") else "movie"
            tmdb_id = re.sub(r"\D", "", (qs.get("tmdb_id") or [""])[0])
            season = re.sub(r"\D", "", raw_season.split("?")[0]) or "1"
            episode = re.sub(r"\D", "", raw_episode.split("?")[0]) or "1"
            orig_lang = (qs.get("orig_lang") or ["en"])[0]
            expected_title = (qs.get("expected_title") or [""])[0]
            expected_year = (qs.get("expected_year") or [""])[0]

            hit = resolve_vidspark_original_hls(
                media_type, tmdb_id, season, episode, orig_lang, expected_title, expected_year
            )
            if hit:
                return self._send_json(hit)
            return self._send_json({"ok": False, "reason": "no_verified_original_hls"})

        if path == "/api/subtitles/vtt":
            import gzip
            imdb_raw = re.sub(r"\D", "", (qs.get("imdb_id") or [""])[0])
            media_type = (qs.get("type") or ["movie"])[0]
            season = re.sub(r"\D", "", (qs.get("season") or ["1"])[0]) or "1"
            episode = re.sub(r"\D", "", (qs.get("episode") or ["1"])[0]) or "1"
            if not imdb_raw:
                self.send_response(404)
                self.end_headers()
                return
            os_url = (
                f"https://rest.opensubtitles.org/search/episode-{episode}/imdbid-{imdb_raw}/season-{season}/sublanguageid-heb"
                if media_type in ("series", "tv")
                else f"https://rest.opensubtitles.org/search/imdbid-{imdb_raw}/sublanguageid-heb"
            )
            try:
                req = urllib.request.Request(os_url, headers={"User-Agent": UA, "X-User-Agent": "VLSub 0.10.2"})
                with urllib.request.urlopen(req, timeout=4.5) as resp:
                    items = json.loads(resp.read().decode("utf-8", errors="ignore"))
                if isinstance(items, list):
                    for sub_item in items[:4]:
                        dl = str((sub_item or {}).get("SubDownloadLink") or "").replace(".gz", "")
                        if not dl.startswith("http"):
                            continue
                        with urllib.request.urlopen(urllib.request.Request(dl, headers={"User-Agent": UA}), timeout=4.5) as dl_resp:
                            raw_bytes = dl_resp.read()
                        if raw_bytes[:2] == b"\x1f\x8b":
                            raw_bytes = gzip.decompress(raw_bytes)
                        try:
                            srt_txt = raw_bytes.decode("utf-8")
                            if not re.search(r"[\u0590-\u05ff]", srt_txt):
                                srt_txt = raw_bytes.decode("windows-1255", errors="ignore")
                        except UnicodeDecodeError:
                            srt_txt = raw_bytes.decode("windows-1255", errors="ignore")
                        if "-->" in srt_txt and re.search(r"[\u0590-\u05ff]", srt_txt):
                            out_bytes = srt_txt.encode("utf-8")
                            self.send_response(200)
                            self.send_header("Content-Type", "text/plain; charset=utf-8")
                            self.send_header("Content-Length", str(len(out_bytes)))
                            self.end_headers()
                            self.wfile.write(out_bytes)
                            return
            except Exception:
                pass
            self.send_response(404)
            self.end_headers()
            return

        if path.startswith("/api/vidora/"):
            upstream_url = "https://cdn.vidspark.to" + self.path
            try:
                req = urllib.request.Request(
                    upstream_url,
                    headers={
                        "User-Agent": UA,
                        "Accept": "application/json, */*",
                        "Origin": "https://cdn.vidspark.to",
                        "Referer": "https://cdn.vidspark.to/",
                        "x-player-key": PLAYER_KEY,
                    },
                )
                with urllib.request.urlopen(req, timeout=6) as upstream:
                    data = json.loads(upstream.read().decode("utf-8", errors="ignore"))
                if isinstance(data, dict):
                    data["tracks"] = []
                    for s_item in (data.get("sources") or []):
                        if isinstance(s_item, dict):
                            s_item["tracks"] = []
                return self._send_json(data)
            except Exception as e:
                return self._send_json({"result": False, "error": str(e)}, status=502)

        if path == "/api/embed-clean":
            media_type = (qs.get("type") or ["movie"])[0]
            media_id = (qs.get("id") or [""])[0]
            season = (qs.get("season") or ["1"])[0]
            episode = (qs.get("episode") or ["1"])[0]
            start_sec = (qs.get("start") or ["0"])[0]
            route_path = (
                f"/tv/{media_id}/{season}/{episode}"
                if media_type == "series"
                else f"/movie/{media_id}"
            )
            vp_url = "https://cdn.vidspark.to" + route_path
            if start_sec and start_sec != "0":
                vp_url += f"?startAt={start_sec}"
                route_path += f"?startAt={start_sec}"
            try:
                req = urllib.request.Request(vp_url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=6) as upstream:
                    html = upstream.read().decode("utf-8", errors="ignore")
                inject_head = (
                    "<script>"
                    "try{"
                    f"history.replaceState(null,'','{route_path}');"
                    "localStorage.setItem('vp_subtitle_lang','off');"
                    "localStorage.setItem('vp_server','w7dn');"
                    "const _of=window.fetch;"
                    "window.fetch=function(u,o){"
                    "const s=typeof u==='string'?u:(u&&u.url)||'';"
                    "if(s.includes('opensubtitles.org')||s.includes('/sub/')){"
                    "return Promise.resolve(new Response('[]',{status:200,headers:{'Content-Type':'application/json'}}));"
                    "}"
                    "if(s.startsWith('/api/vidora/')){"
                    "return _of(window.location.origin+s,o);"
                    "}"
                    "return _of.apply(this,arguments);"
                    "};"
                    "}catch(e){}"
                    "</script>"
                    '<base href="https://cdn.vidspark.to/">'
                    "<style>"
                    ".vds-captions,[class*='captions'],[data-media-captions],track,::cue{display:none!important;opacity:0!important;visibility:hidden!important;font-size:0!important;}"
                    "</style>"
                )
                html = html.replace("<head>", "<head>" + inject_head, 1)
                raw = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return
            except Exception as e:
                return self._send_json({"ok": False, "error": str(e)}, status=502)

        if path == "/api/hls-proxy":
            target_url = (qs.get("url") or [""])[0]
            origin = (qs.get("origin") or ["https://vidrock.to"])[0]
            if not target_url.startswith("http"):
                self.send_response(400)
                self.end_headers()
                return
            headers = {"User-Agent": UA, "Accept": "*/*"}
            if origin and origin != "live":
                headers["Origin"] = origin
                headers["Referer"] = origin.rstrip("/") + "/"
            try:
                req = urllib.request.Request(target_url, headers=headers)
                with urllib.request.urlopen(req, timeout=12) as upstream:
                    ctype = upstream.headers.get("Content-Type", "application/octet-stream")
                    body = upstream.read()
                is_m3u8 = (
                    ".m3u8" in target_url.lower()
                    or "mpegurl" in ctype.lower()
                    or body[:7] == b"#EXTM3U"
                )
                if is_m3u8:
                    text = body.decode("utf-8", errors="ignore")
                    out_lines = []
                    for line in text.splitlines():
                        stripped = line.strip()
                        if not stripped:
                            out_lines.append(line)
                            continue
                        if stripped.startswith("#"):
                            upper_line = stripped.upper()
                            if upper_line.startswith("#EXT-X-MEDIA:") and (
                                "TYPE=SUBTITLES" in upper_line or "TYPE=CLOSED-CAPTIONS" in upper_line
                            ):
                                continue
                            line = re.sub(r',SUBTITLES="[^"]*"', "", line, flags=re.IGNORECASE)
                            line = re.sub(r',CLOSED-CAPTIONS="[^"]*"', "", line, flags=re.IGNORECASE)
                            if upper_line.startswith("#EXT-X-STREAM-INF:") and "RESOLUTION=" not in upper_line:
                                m_res = re.search(r'NAME="(\d{3,4})p"', line, flags=re.IGNORECASE)
                                if m_res:
                                    h_val = int(m_res.group(1))
                                    w_val = round(h_val * 16 / 9 / 2) * 2
                                    line = line + f",RESOLUTION={w_val}x{h_val}"
                            # Rewrite URI="..." inside #EXT-X-MEDIA or #EXT-X-KEY
                            def _repl_uri(m):
                                inner = urllib.parse.urljoin(target_url, m.group(1))
                                prox = (
                                    "/api/hls-proxy?url="
                                    + urllib.parse.quote(inner, safe="")
                                    + "&origin="
                                    + urllib.parse.quote(origin, safe="")
                                )
                                return f'URI="{prox}"'

                            out_lines.append(re.sub(r'URI="([^"]+)"', _repl_uri, line))
                        else:
                            abs_seg = urllib.parse.urljoin(target_url, stripped)
                            prox_seg = (
                                "/api/hls-proxy?url="
                                + urllib.parse.quote(abs_seg, safe="")
                                + "&origin="
                                + urllib.parse.quote(origin, safe="")
                            )
                            out_lines.append(prox_seg)
                    rewritten = ("\n".join(out_lines) + "\n").encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8")
                    self.send_header("Content-Length", str(len(rewritten)))
                    self.end_headers()
                    self.wfile.write(rewritten)
                    return
                else:
                    if len(body) > 256 and body[:4] == b"\x89PNG" and body[64] == 0x47 and body[252] == 0x47:
                        body = body[64:]
                    self.send_response(200)
                    self.send_header("Content-Type", "video/mp2t")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
            except Exception as e:
                return self._send_json({"ok": False, "error": str(e)}, status=502)

        return super().do_GET()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8092
    server = ThreadingHTTPServer(("0.0.0.0", port), StreamItDevHandler)
    print(f"STREAM IT Local Dev Server v9.9.1 listening on http://localhost:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
