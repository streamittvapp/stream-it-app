package com.streamit.cinema.app;

import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;

/**
 * Built-in Native Android Stream & HLS Proxy Server (127.0.0.1:8092).
 * Allows STREAM_IT_TV_Streamer.apk to resolve and stream 1080p movies, series,
 * and live TV channels 100% standalone on any Android TV / Streamer without
 * needing a PC server on the local network.
 */
public class StreamItEmbeddedServer {
    private static final int PORT = 8092;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private ServerSocket serverSocket;
    private volatile boolean running = false;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    private final Map<String, String> wasmCache = new ConcurrentHashMap<>();
    private final Map<String, CachedItem> directStreamCache = new ConcurrentHashMap<>();
    private final Map<String, CachedItem> hlsTokenCache = new ConcurrentHashMap<>();

    private static class CachedItem {
        final long timestampMs;
        final String value;

        CachedItem(long timestampMs, String value) {
            this.timestampMs = timestampMs;
            this.value = value;
        }
    }

    public synchronized void start() {
        if (running) return;
        running = true;
        executor.execute(() -> {
            try {
                serverSocket = new ServerSocket(PORT, 64, InetAddress.getByName("127.0.0.1"));
                while (running && !serverSocket.isClosed()) {
                    final Socket client = serverSocket.accept();
                    executor.execute(() -> handleClient(client));
                }
            } catch (Exception ignored) {
                running = false;
            }
        });
    }

    public synchronized void stop() {
        running = false;
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (Exception ignored) {
        }
    }

    private void handleClient(Socket client) {
        try {
            client.setSoTimeout(15000);
            InputStream in = client.getInputStream();
            OutputStream out = client.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));

            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) {
                client.close();
                return;
            }

            // Consume headers
            String headerLine;
            while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                // drain headers
            }

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                client.close();
                return;
            }

            String method = parts[0].toUpperCase();
            String fullTarget = parts[1];

            if ("OPTIONS".equals(method)) {
                sendResponse(out, 204, "text/plain", new byte[0]);
                client.close();
                return;
            }

            String path = fullTarget;
            String query = "";
            int qIdx = fullTarget.indexOf('?');
            if (qIdx >= 0) {
                path = fullTarget.substring(0, qIdx);
                query = fullTarget.substring(qIdx + 1);
            }

            Map<String, String> params = parseQuery(query);

            if ("/api/health".equals(path)) {
                byte[] body = "{\"ok\":true,\"mode\":\"android_embedded_server\",\"version\":\"9.4.5\",\"ota_ver_url\":\"https://is.gd/streamittv_ver\",\"ota_apk_url\":\"https://is.gd/streamittv_apk\"}"
                        .getBytes(StandardCharsets.UTF_8);
                sendResponse(out, 200, "application/json; charset=utf-8", body);
            } else if ("/api/ota".equals(path)) {
                handleOtaProxy(out, params);
            } else if ("/api/direct-stream".equals(path)) {
                handleDirectStream(out, params);
            } else if ("/api/hls-proxy".equals(path)) {
                handleHlsProxy(out, params);
            } else if ("/api/telegram-channel".equals(path)) {
                handleTelegramChannelProxy(out, params);
            } else {
                byte[] body = "{\"ok\":false,\"error\":\"Not found\"}".getBytes(StandardCharsets.UTF_8);
                sendResponse(out, 404, "application/json; charset=utf-8", body);
            }
        } catch (Exception ignored) {
        } finally {
            try {
                client.close();
            } catch (Exception ignored) {
            }
        }
    }

    public String resolveDirectStreamSync(String rawType, String rawImdbId, String rawSeason, String rawEpisode) {
        return resolveDirectStreamSync(rawType, rawImdbId, "", rawSeason, rawEpisode);
    }

    public String resolveDirectStreamSync(String rawType, String rawImdbId, String rawTmdbId, String rawSeason, String rawEpisode) {
        String itemType = (rawType != null && !rawType.trim().isEmpty()) ? rawType.trim() : "movie";
        String imdbId = (rawImdbId != null && !rawImdbId.trim().isEmpty()) ? rawImdbId.split(":")[0].trim() : "tt15239678";
        String tmdbId = (rawTmdbId != null) ? rawTmdbId.replaceAll("\\D", "") : "";
        String season = (rawSeason != null && !rawSeason.trim().isEmpty()) ? rawSeason.trim() : "1";
        String episode = (rawEpisode != null && !rawEpisode.trim().isEmpty()) ? rawEpisode.trim() : "1";

        String cacheKey = itemType + ":" + imdbId + ":" + tmdbId + ":" + season + ":" + episode;
        long now = System.currentTimeMillis();
        CachedItem cached = directStreamCache.get(cacheKey);
        if (cached != null && (now - cached.timestampMs) < 900_000L) {
            return cached.value;
        }

        // Primary Fast Direct HLS Extractor via cdn.vidspark.to (vjej -> direct CORS-enabled .m3u8 in ~0.3s)
        if (!tmdbId.isEmpty()) {
            try {
                String vpPath = ("series".equalsIgnoreCase(itemType) || "tv".equalsIgnoreCase(itemType))
                        ? ("/api/vidora/v1/tv/" + tmdbId + "/" + season + "/" + episode + "?source=vjej")
                        : ("/api/vidora/v1/movie/" + tmdbId + "?source=vjej");
                Map<String, String> hVp = new HashMap<>();
                hVp.put("User-Agent", USER_AGENT);
                hVp.put("Referer", "https://cdn.vidspark.to/");
                hVp.put("x-player-key", "f3b72e73c80c9a996574379798703796a1936efa3516a7105cb0e43048b46b5a");
                String vpRaw = new String(httpGetBytes("https://cdn.vidspark.to" + vpPath, hVp, 5000), StandardCharsets.UTF_8);
                JSONObject vpObj = new JSONObject(vpRaw);
                JSONArray sources = vpObj.optJSONArray("sources");
                if (sources != null && sources.length() > 0) {
                    String directM3u8 = sources.getJSONObject(0).optString("url", "");
                    if (directM3u8.startsWith("http")) {
                        JSONObject fb = new JSONObject();
                        fb.put("ok", true);
                        fb.put("imdb_id", imdbId);
                        fb.put("streamUrl", directM3u8);
                        String fbStr = fb.toString();
                        directStreamCache.put(cacheKey, new CachedItem(now, fbStr));
                        return fbStr;
                    }
                }
            } catch (Exception ignored) {
            }
        }

        try {
            String vsUrl;
            String refUrl;
            if ("series".equalsIgnoreCase(itemType) || "tv".equalsIgnoreCase(itemType)) {
                vsUrl = "https://vidsrc.sh/vs_src.php?type=tv&id=" + URLEncoder.encode(imdbId, "UTF-8")
                        + "&season=" + URLEncoder.encode(season, "UTF-8")
                        + "&episode=" + URLEncoder.encode(episode, "UTF-8");
                refUrl = "https://vidsrc.sh/embed/tv/" + URLEncoder.encode(imdbId, "UTF-8")
                        + "/" + season + "-" + episode;
            } else {
                vsUrl = "https://vidsrc.sh/vs_src.php?type=movie&id=" + URLEncoder.encode(imdbId, "UTF-8");
                refUrl = "https://vidsrc.sh/embed/movie/" + URLEncoder.encode(imdbId, "UTF-8") + "/";
            }

            Map<String, String> h1 = new HashMap<>();
            h1.put("User-Agent", USER_AGENT);
            h1.put("Referer", refUrl);
            String step1Json = new String(httpGetBytes(vsUrl, h1, 7000), StandardCharsets.UTF_8);
            JSONObject srcData = new JSONObject(step1Json);
            String landingSrc = srcData.optString("src", "");
            if (landingSrc.isEmpty()) {
                throw new Exception("Missing landing src");
            }

            Map<String, String> h2 = new HashMap<>();
            h2.put("User-Agent", USER_AGENT);
            h2.put("Referer", "https://vidsrc.sh/");
            String landingHtml = new String(httpGetBytes(landingSrc, h2, 7000), StandardCharsets.UTF_8);
            Matcher mCfg = Pattern.compile("window\\.CFG\\s*=\\s*(\\{.*?\\});", Pattern.DOTALL).matcher(landingHtml);
            if (!mCfg.find()) {
                throw new Exception("Missing window.CFG");
            }
            JSONObject cfgObj = new JSONObject(mCfg.group(1));
            String playerUrl = resolveRelativeUrl(landingSrc, cfgObj.optString("playerUrl", ""));

            Map<String, String> h3 = new HashMap<>();
            h3.put("User-Agent", USER_AGENT);
            h3.put("Referer", landingSrc);
            String playerHtml = new String(httpGetBytes(playerUrl, h3, 7000), StandardCharsets.UTF_8);
            Matcher mPcfg = Pattern.compile("window\\.CONFIG\\s*=\\s*(\\{.*?\\});", Pattern.DOTALL).matcher(playerHtml);
            if (!mPcfg.find()) {
                throw new Exception("Missing window.CONFIG");
            }
            JSONObject pcfg = new JSONObject(mPcfg.group(1));

            String apiToken = pcfg.optString("apiToken", "");
            String streamApi = pcfg.optString("api", "");
            if (streamApi.isEmpty()) {
                streamApi = pcfg.optString("streamBase", "") + "&season=" + season + "&episode=" + episode + "&stream_urls";
            }
            String fullApiUrl = streamApi + "&api_token=" + URLEncoder.encode(apiToken, "UTF-8");

            URI parsedPlayerUri = new URI(playerUrl);
            String playerOrigin = parsedPlayerUri.getScheme() + "://" + parsedPlayerUri.getAuthority();

            Map<String, String> h4 = new HashMap<>();
            h4.put("User-Agent", USER_AGENT);
            h4.put("Referer", playerOrigin + "/");
            h4.put("Origin", playerOrigin);
            String apiJsonStr = new String(httpGetBytes(fullApiUrl, h4, 7000), StandardCharsets.UTF_8);
            JSONObject apiJson = new JSONObject(apiJsonStr);

            JSONObject vsInfo = apiJson.optJSONObject("vs");
            if (vsInfo == null) vsInfo = new JSONObject();
            String wKey = String.valueOf(vsInfo.optInt("w", 1));
            String wasmB64 = vsInfo.optString("wasm", "");
            if (wasmB64.isEmpty()) {
                wasmB64 = getOrDefault(wasmCache, wKey, "");
            }
            if (wasmB64.isEmpty() && !vsInfo.optString("wasm_url", "").isEmpty()) {
                String wasmFull = resolveRelativeUrl(playerOrigin + "/", vsInfo.optString("wasm_url", ""));
                Map<String, String> h5 = new HashMap<>();
                h5.put("User-Agent", USER_AGENT);
                h5.put("Referer", playerOrigin + "/");
                byte[] wasmBytes = httpGetBytes(wasmFull, h5, 7000);
                wasmB64 = Base64.encodeToString(wasmBytes, Base64.NO_WRAP);
                if (!wasmB64.isEmpty()) {
                    wasmCache.put(wKey, wasmB64);
                }
            }

            JSONObject dataBlock = apiJson.optJSONObject("data");
            if (dataBlock == null) dataBlock = new JSONObject();

            JSONObject payload = new JSONObject();
            payload.put("ok", true);
            payload.put("imdb_id", imdbId);
            payload.put("type", itemType);
            payload.put("season", Integer.parseInt(season));
            payload.put("episode", Integer.parseInt(episode));
            payload.put("title", dataBlock.optString("title", ""));
            payload.put("file_name", dataBlock.optString("file_name", imdbId + ".1080p.WEB-DL.H264.mp4"));
            payload.put("backdrop", dataBlock.optString("backdrop", ""));
            payload.put("api_token", apiToken);
            payload.put("player_origin", playerOrigin);
            payload.put("enc_stream_urls", dataBlock.optString("stream_urls", ""));
            payload.put("wasm_b64", wasmB64);
            payload.put("wasm_w", vsInfo.optInt("w", 1));

            String payloadStr = payload.toString();
            directStreamCache.put(cacheKey, new CachedItem(now, payloadStr));
            return payloadStr;
        } catch (Exception e) {
            // Secondary Direct 4K/1080p HLS Multi-Server Resolver via cdn.vidspark.to & vidsrc.pm (b4tz 1080p/4K -> w7dn 1080p -> vjej)
            if (!tmdbId.isEmpty()) {
                String[] vidoraHosts = new String[]{"https://cdn.vidspark.to", "https://vidsrc.pm"};
                String[] vidoraSources = new String[]{"b4tz", "w7dn", "vjej"};
                for (String host : vidoraHosts) {
                    for (String srcKey : vidoraSources) {
                        try {
                            String vpPath = ("series".equalsIgnoreCase(itemType) || "tv".equalsIgnoreCase(itemType))
                                    ? ("/api/vidora/v1/tv/" + tmdbId + "/" + season + "/" + episode + "?source=" + srcKey)
                                    : ("/api/vidora/v1/movie/" + tmdbId + "?source=" + srcKey);
                            Map<String, String> hVp = new HashMap<>();
                            hVp.put("User-Agent", USER_AGENT);
                            hVp.put("Referer", host + "/");
                            hVp.put("x-player-key", "f3b72e73c80c9a996574379798703796a1936efa3516a7105cb0e43048b46b5a");
                            String vpRaw = new String(httpGetBytes(host + vpPath, hVp, 4500), StandardCharsets.UTF_8);
                            JSONObject vpObj = new JSONObject(vpRaw);
                            JSONArray sources = vpObj.optJSONArray("sources");
                            if (sources != null && sources.length() > 0) {
                                String rawStreamUrl = sources.getJSONObject(0).optString("url", "");
                                if (rawStreamUrl.startsWith("http")) {
                                    String finalStreamUrl = rawStreamUrl;
                                    // Unwrap proxy URLs (?url=https%3A%2F%2F...&data=base64) to stream 1080p/4K directly via local /api/hls-proxy
                                    if (rawStreamUrl.contains("url=")) {
                                        try {
                                            String innerM3u8 = "";
                                            String innerOrigin = "https://cloudnestra.com";
                                            URI uWrap = new URI(rawStreamUrl);
                                            String qWrap = uWrap.getRawQuery();
                                            if (qWrap != null) {
                                                for (String pair : qWrap.split("&")) {
                                                    int idx = pair.indexOf('=');
                                                    if (idx > 0) {
                                                        String k = pair.substring(0, idx);
                                                        String v = URLDecoder.decode(pair.substring(idx + 1), "UTF-8");
                                                        if ("url".equals(k)) {
                                                            innerM3u8 = v;
                                                        } else if ("data".equals(k)) {
                                                            String decData = new String(Base64.decode(v, Base64.DEFAULT), StandardCharsets.UTF_8);
                                                            for (String dPart : decData.split("\\|")) {
                                                                if (dPart.startsWith("Origin=")) {
                                                                    innerOrigin = dPart.substring("Origin=".length()).trim();
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            if (innerM3u8.startsWith("http")) {
                                                finalStreamUrl = "http://127.0.0.1:" + PORT + "/api/hls-proxy?url="
                                                        + URLEncoder.encode(innerM3u8, "UTF-8")
                                                        + "&origin=" + URLEncoder.encode(innerOrigin, "UTF-8");
                                            }
                                        } catch (Exception ignoredUnwrap) {
                                        }
                                    }
                                    JSONObject fb = new JSONObject();
                                    fb.put("ok", true);
                                    fb.put("imdb_id", imdbId);
                                    fb.put("streamUrl", finalStreamUrl);
                                    String fbStr = fb.toString();
                                    directStreamCache.put(cacheKey, new CachedItem(now, fbStr));
                                    return fbStr;
                                }
                            }
                        } catch (Exception ignored) {
                        }
                    }
                }
            }
            try {
                JSONObject err = new JSONObject();
                err.put("ok", false);
                err.put("error", e.getMessage() != null ? e.getMessage() : "Stream resolution error");
                err.put("imdb_id", imdbId);
                return err.toString();
            } catch (Exception ignored) {
                return "{\"ok\":false}";
            }
        }
    }

    public String fetchOtaText(String key) {
        String k = (key != null) ? key.trim().toLowerCase() : "ver";
        if ("version".equals(k) || "version.json".equals(k)) k = "ver";
        else if ("styles.css".equals(k) || "style".equals(k)) k = "css";
        else if ("app.js".equals(k) || "app".equals(k)) k = "js";
        else if ("tv-navigation.js".equals(k) || "tv-navigation".equals(k)) k = "nav";
        else if ("catalog".equals(k) || "catalog_snapshot.json".equals(k)) k = "cat";
        if (!"ver".equals(k) && !"css".equals(k) && !"js".equals(k) && !"nav".equals(k) && !"cat".equals(k)) {
            return "";
        }
        try {
            Map<String, String> headers = new HashMap<>();
            headers.put("User-Agent", USER_AGENT);
            headers.put("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.put("Pragma", "no-cache");
            HttpResult res = httpGetWithFinalUrl("https://is.gd/streamittv_" + k, headers, 8000);
            return new String(res.bytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private void handleOtaProxy(OutputStream out, Map<String, String> params) throws Exception {
        String key = getOrDefault(params, "key", "ver").trim().toLowerCase();
        String bodyText = fetchOtaText(key);
        if (bodyText.isEmpty()) {
            byte[] err = "{\"ok\":false,\"error\":\"OTA resource unavailable\"}".getBytes(StandardCharsets.UTF_8);
            sendResponse(out, 502, "application/json; charset=utf-8", err);
            return;
        }
        String contentType = "text/plain; charset=utf-8";
        if ("ver".equals(key) || "cat".equals(key)) {
            contentType = "application/json; charset=utf-8";
        } else if ("css".equals(key)) {
            contentType = "text/css; charset=utf-8";
        } else if ("js".equals(key) || "nav".equals(key)) {
            contentType = "application/javascript; charset=utf-8";
        }
        sendResponse(out, 200, contentType, bodyText.getBytes(StandardCharsets.UTF_8));
    }

    private void handleDirectStream(OutputStream out, Map<String, String> params) throws Exception {
        String itemType = getOrDefault(params, "type", "movie").trim();
        String imdbId = getOrDefault(params, "imdb_id", getOrDefault(params, "id", "tt15239678")).split(":")[0].trim();
        String tmdbId = getOrDefault(params, "tmdb_id", "").trim();
        String season = getOrDefault(params, "season", "1").trim();
        String episode = getOrDefault(params, "episode", "1").trim();
        String jsonStr = resolveDirectStreamSync(itemType, imdbId, tmdbId, season, episode);
        sendResponse(out, 200, "application/json; charset=utf-8", jsonStr.getBytes(StandardCharsets.UTF_8));
    }

    private void handleHlsProxy(OutputStream out, Map<String, String> params) throws Exception {
        String targetUrl = getOrDefault(params, "url", "").trim();
        String apiToken = getOrDefault(params, "api_token", "").trim();
        String playerOrigin = getOrDefault(params, "origin", "https://stellarconductornexus.com").trim();
        if (playerOrigin.isEmpty()) {
            playerOrigin = "https://stellarconductornexus.com";
        }

        if (!targetUrl.startsWith("http")) {
            byte[] err = "{\"ok\":false,\"error\":\"Invalid target url\"}".getBytes(StandardCharsets.UTF_8);
            sendResponse(out, 400, "application/json; charset=utf-8", err);
            return;
        }

        Map<String, String> headers = new HashMap<>();
        headers.put("User-Agent", USER_AGENT);
        if (!"live".equalsIgnoreCase(playerOrigin)) {
            headers.put("Origin", playerOrigin);
            headers.put("Referer", playerOrigin + "/");
        }

        try {
            if (!apiToken.isEmpty() && !targetUrl.contains("token=")) {
                URI uParsed = new URI(targetUrl);
                String cdnOrigin = uParsed.getScheme() + "://" + uParsed.getAuthority();
                String tokKey = cdnOrigin + ":" + apiToken;
                long now = System.currentTimeMillis();
                CachedItem cachedTok = hlsTokenCache.get(tokKey);
                String jwtTok = "";
                if (cachedTok != null && (now - cachedTok.timestampMs) < 600_000L) {
                    jwtTok = cachedTok.value;
                } else {
                    String genUrl = cdnOrigin + "/generate.php?api_token=" + URLEncoder.encode(apiToken, "UTF-8");
                    String rawTok = new String(httpGetBytes(genUrl, headers, 6000), StandardCharsets.UTF_8).trim();
                    if (rawTok.startsWith("{")) {
                        try {
                            JSONObject jTok = new JSONObject(rawTok);
                            jwtTok = jTok.optString("token", jTok.optString("data", jTok.optString("string", "")));
                        } catch (Exception ignored) {
                        }
                    } else {
                        jwtTok = rawTok;
                    }
                    if (!jwtTok.isEmpty()) {
                        hlsTokenCache.put(tokKey, new CachedItem(now, jwtTok));
                    }
                }
                if (!jwtTok.isEmpty()) {
                    String sep = targetUrl.contains("?") ? "&" : "?";
                    targetUrl = targetUrl + sep + "token=" + URLEncoder.encode(jwtTok, "UTF-8");
                }
            }

            HttpResult mediaRes = httpGetWithFinalUrl(targetUrl, headers, 10000);
            byte[] rawBytes = mediaRes.bytes;
            String finalUrl = mediaRes.finalUrl;

            // Check GZIP magic bytes
            if (rawBytes.length >= 2 && (rawBytes[0] & 0xFF) == 0x1F && (rawBytes[1] & 0xFF) == 0x8B) {
                try {
                    rawBytes = gunzip(rawBytes);
                } catch (Exception ignored) {
                }
            }

            String headPreview = new String(
                    rawBytes, 0, Math.min(rawBytes.length, 64), StandardCharsets.UTF_8
            ).trim();

            if (headPreview.startsWith("#EXTM3U")) {
                String m3u8Text = new String(rawBytes, StandardCharsets.UTF_8);
                String[] lines = m3u8Text.split("\\r?\\n");
                StringBuilder rewritten = new StringBuilder();
                Pattern uriPattern = Pattern.compile("URI=\"([^\"]+)\"");

                for (String rawLine : lines) {
                    String line = rawLine.trim();
                    if (line.isEmpty()) {
                        rewritten.append("\n");
                        continue;
                    }
                    if (line.startsWith("#")) {
                        if (line.contains("URI=\"")) {
                            Matcher m = uriPattern.matcher(line);
                            StringBuffer sb = new StringBuffer();
                            while (m.find()) {
                                String wrapped = wrapProxyUrl(finalUrl, m.group(1), playerOrigin);
                                m.appendReplacement(sb, Matcher.quoteReplacement("URI=\"" + wrapped + "\""));
                            }
                            m.appendTail(sb);
                            line = sb.toString();
                        }
                        rewritten.append(line).append("\n");
                    } else {
                        rewritten.append(wrapProxyUrl(finalUrl, line, playerOrigin)).append("\n");
                    }
                }
                byte[] outBytes = rewritten.toString().getBytes(StandardCharsets.UTF_8);
                sendResponse(out, 200, "application/vnd.apple.mpegurl; charset=utf-8", outBytes);
                return;
            }

            sendResponse(out, 200, "video/mp2t", rawBytes);
        } catch (Exception e) {
            byte[] err = ("{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}").getBytes(StandardCharsets.UTF_8);
            sendResponse(out, 502, "application/json; charset=utf-8", err);
        }
    }

    private void handleTelegramChannelProxy(OutputStream out, Map<String, String> params) throws Exception {
        try {
            String rawCh = params.get("channel");
            if (rawCh == null || rawCh.trim().isEmpty()) {
                byte[] err = "{\"ok\":false,\"error\":\"Missing channel\"}".getBytes(StandardCharsets.UTF_8);
                sendResponse(out, 400, "application/json; charset=utf-8", err);
                return;
            }
            String cleanCh = rawCh.trim()
                    .replaceAll("^https?://(www\\.)?(t\\.me|telegram\\.me)/(s/)?", "")
                    .replaceAll("^@", "")
                    .replaceAll("[^a-zA-Z0-9_]", "");
            if (cleanCh.isEmpty()) {
                byte[] err = "{\"ok\":false,\"error\":\"Invalid channel\"}".getBytes(StandardCharsets.UTF_8);
                sendResponse(out, 400, "application/json; charset=utf-8", err);
                return;
            }
            String tgUrl = "https://t.me/s/" + cleanCh;
            Map<String, String> headers = new HashMap<>();
            headers.put("User-Agent", USER_AGENT);
            headers.put("Accept-Language", "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7");
            byte[] htmlBytes = httpGetBytes(tgUrl, headers, 10000);
            sendResponse(out, 200, "text/html; charset=utf-8", htmlBytes);
        } catch (Exception e) {
            byte[] err = ("{\"ok\":false,\"error\":\"" + e.getMessage() + "\"}").getBytes(StandardCharsets.UTF_8);
            sendResponse(out, 502, "application/json; charset=utf-8", err);
        }
    }

    private String wrapProxyUrl(String baseUrl, String rawRelativeOrAbs, String playerOrigin) {
        try {
            String absUrl = resolveRelativeUrl(baseUrl, rawRelativeOrAbs);
            return "http://127.0.0.1:" + PORT + "/api/hls-proxy?url="
                    + URLEncoder.encode(absUrl, "UTF-8")
                    + "&origin=" + URLEncoder.encode(playerOrigin, "UTF-8");
        } catch (Exception e) {
            return rawRelativeOrAbs;
        }
    }

    private String resolveRelativeUrl(String baseUrl, String relativeUrl) {
        try {
            if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
                return relativeUrl;
            }
            URL base = new URL(baseUrl);
            return new URL(base, relativeUrl).toString();
        } catch (Exception e) {
            return relativeUrl;
        }
    }

    private static class HttpResult {
        final byte[] bytes;
        final String finalUrl;

        HttpResult(byte[] bytes, String finalUrl) {
            this.bytes = bytes;
            this.finalUrl = finalUrl;
        }
    }

    private byte[] httpGetBytes(String urlStr, Map<String, String> headers, int timeoutMs) throws Exception {
        return httpGetWithFinalUrl(urlStr, headers, timeoutMs).bytes;
    }

    private HttpResult httpGetWithFinalUrl(String urlStr, Map<String, String> headers, int timeoutMs) throws Exception {
        String currentUrl = urlStr;
        for (int hop = 0; hop < 5; hop++) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(currentUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(!currentUrl.contains("is.gd/"));
                conn.setConnectTimeout(timeoutMs);
                conn.setReadTimeout(timeoutMs);
                conn.setUseCaches(false);
                conn.setRequestMethod("GET");
                for (Map.Entry<String, String> entry : headers.entrySet()) {
                    conn.setRequestProperty(entry.getKey(), entry.getValue());
                }
                int status = conn.getResponseCode();
                if (status == HttpURLConnection.HTTP_MOVED_PERM
                        || status == HttpURLConnection.HTTP_MOVED_TEMP
                        || status == HttpURLConnection.HTTP_SEE_OTHER
                        || status == 307
                        || status == 308) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    if (location == null || location.trim().isEmpty()) {
                        throw new Exception("Redirect missing Location header");
                    }
                    URL nextUrl = new URL(url, location.trim());
                    String nextStr = nextUrl.toString();
                    if (currentUrl.contains("is.gd/") && !nextStr.contains("t=")) {
                        nextStr += (nextStr.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis();
                    }
                    currentUrl = nextStr;
                    continue;
                }
                InputStream in = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
                if (in == null) {
                    throw new Exception("HTTP " + status);
                }
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[16384];
                int n;
                while ((n = in.read(chunk)) != -1) {
                    buffer.write(chunk, 0, n);
                }
                String finalUrl = conn.getURL() != null ? conn.getURL().toString() : currentUrl;
                return new HttpResult(buffer.toByteArray(), finalUrl);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }
        throw new Exception("Too many redirects for " + urlStr);
    }

    private byte[] gunzip(byte[] compressed) throws Exception {
        GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(compressed));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int len;
        while ((len = gis.read(buf)) != -1) {
            out.write(buf, 0, len);
        }
        return out.toByteArray();
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf('=');
            try {
                if (idx > 0) {
                    String k = URLDecoder.decode(pair.substring(0, idx), "UTF-8");
                    String v = URLDecoder.decode(pair.substring(idx + 1), "UTF-8");
                    map.put(k, v);
                } else if (!pair.isEmpty()) {
                    map.put(URLDecoder.decode(pair, "UTF-8"), "");
                }
            } catch (Exception ignored) {
            }
        }
        return map;
    }

    private String getOrDefault(Map<String, String> map, String key, String defVal) {
        String val = map.get(key);
        return (val != null) ? val : defVal;
    }

    private void sendResponse(OutputStream out, int statusCode, String contentType, byte[] body) throws Exception {
        String statusText = statusCode == 200 ? "OK" : statusCode == 204 ? "No Content" : "Error";
        StringBuilder headers = new StringBuilder();
        headers.append("HTTP/1.1 ").append(statusCode).append(" ").append(statusText).append("\r\n");
        headers.append("Content-Type: ").append(contentType).append("\r\n");
        headers.append("Content-Length: ").append(body.length).append("\r\n");
        headers.append("Access-Control-Allow-Origin: *\r\n");
        headers.append("Access-Control-Allow-Private-Network: true\r\n");
        headers.append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
        headers.append("Access-Control-Allow-Headers: *\r\n");
        headers.append("Cache-Control: no-store\r\n");
        headers.append("Connection: close\r\n\r\n");
        out.write(headers.toString().getBytes(StandardCharsets.UTF_8));
        if (body.length > 0) {
            out.write(body);
        }
        out.flush();
    }
}
