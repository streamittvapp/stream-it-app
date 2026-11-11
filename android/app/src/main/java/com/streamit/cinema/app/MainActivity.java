package com.streamit.cinema.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    private static final String INSTALLED_APP_VERSION = "9.8.4";
    private static final String INSTALLED_NATIVE_APK_VERSION = "9.8.4";
    private static final String OTA_PREFS_NAME = "streamit_ota_prefs";
    private StreamItEmbeddedServer embeddedServer;
    private volatile boolean apkUpdateInProgress = false;

    private static class CloudHttpResponse {
        final String text;
        final String finalUrl;

        CloudHttpResponse(String text, String finalUrl) {
            this.text = text;
            this.finalUrl = finalUrl;
        }
    }

    public class AndroidTvBridge {
        @JavascriptInterface
        public boolean isAndroidTv() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                SharedPreferences prefs = getSharedPreferences(OTA_PREFS_NAME, Context.MODE_PRIVATE);
                String cloudVer = prefs.getString("cached_cloud_version", INSTALLED_APP_VERSION);
                if (cloudVer != null && !cloudVer.trim().isEmpty()) {
                    return cloudVer.trim();
                }
            } catch (Exception ignored) {
            }
            return INSTALLED_APP_VERSION;
        }

        @JavascriptInterface
        public String resolveDirectStreamJson(String itemType, String imdbId, String season, String episode) {
            if (embeddedServer != null) {
                return embeddedServer.resolveDirectStreamSync(itemType, imdbId, season, episode);
            }
            return "{\"ok\":false,\"error\":\"Embedded server not initialized\"}";
        }

        @JavascriptInterface
        public String resolveDirectStreamJson(String type, String tmdbId, String imdbId, int season, int episode) {
            if (embeddedServer != null) {
                String resolvedId = (imdbId != null && !imdbId.trim().isEmpty()) ? imdbId : tmdbId;
                return embeddedServer.resolveDirectStreamSync(
                        type,
                        resolvedId,
                        tmdbId != null ? tmdbId : "",
                        String.valueOf(season > 0 ? season : 1),
                        String.valueOf(episode > 0 ? episode : 1)
                );
            }
            return "{\"ok\":false,\"error\":\"Embedded server not initialized\"}";
        }

        @JavascriptInterface
        public String fetchCloudText(String key) {
            String k = (key != null) ? key.trim().toLowerCase() : "ver";
            if ("version".equals(k) || "version.json".equals(k)) k = "ver";
            else if ("styles.css".equals(k) || "style".equals(k)) k = "css";
            else if ("app.js".equals(k) || "app".equals(k)) k = "js";
            else if ("tv-navigation.js".equals(k) || "tv-navigation".equals(k)) k = "nav";
            else if ("catalog".equals(k) || "catalog_snapshot.json".equals(k)) k = "cat";
            if (!"ver".equals(k) && !"css".equals(k) && !"js".equals(k) && !"nav".equals(k) && !"cat".equals(k)) {
                return "";
            }
            CloudHttpResponse res = fetchUrlFollowRedirects("https://is.gd/streamittv_" + k);
            return res != null ? res.text : "";
        }

        @JavascriptInterface
        public void downloadAndInstallLatestApk() {
            triggerNativeApkDownloadAndInstall("https://is.gd/streamittv_apk");
        }

        @JavascriptInterface
        public void installLatestApkUpdate() {
            triggerNativeApkDownloadAndInstall("https://is.gd/streamittv_apk");
        }

        @JavascriptInterface
        public void setStreamMuted(boolean muted) {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    am.adjustStreamVolume(
                            AudioManager.STREAM_MUSIC,
                            muted ? AudioManager.ADJUST_MUTE : AudioManager.ADJUST_UNMUTE,
                            0
                    );
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void tapCenterOfScreen() {
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView wv = getBridge().getWebView();
                    long downTime = SystemClock.uptimeMillis();
                    float x = wv.getWidth() / 2.0f;
                    float y = wv.getHeight() / 2.0f;
                    MotionEvent down = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0);
                    MotionEvent up = MotionEvent.obtain(downTime, downTime + 50, MotionEvent.ACTION_UP, x, y, 0);
                    wv.dispatchTouchEvent(down);
                    wv.dispatchTouchEvent(up);
                    down.recycle();
                    up.recycle();
                }
            });
        }

        @JavascriptInterface
        public void showSoftKeyboard() {
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView wv = getBridge().getWebView();
                    wv.setFocusable(true);
                    wv.setFocusableInTouchMode(true);
                    wv.requestFocus();
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.showSoftInput(wv, InputMethodManager.SHOW_FORCED);
                    }
                }
            });
        }

        @JavascriptInterface
        public void hideSoftKeyboard() {
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    WebView wv = getBridge().getWebView();
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.hideSoftInputFromWindow(wv.getWindowToken(), 0);
                    }
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Prevent Android TV / Streamer screensaver from dimming or turning off the TV during movies
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        // Start built-in standalone 1080p stream & HLS proxy engine on 127.0.0.1:8092 inside the Streamer APK
        embeddedServer = new StreamItEmbeddedServer();
        embeddedServer.start();

        // Configure WebView for 1080p Smart TV viewport, 60fps Hardware GPU Layer, and native keyboard bridge
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            WebSettings ws = webView.getSettings();
            ws.setUseWideViewPort(true);
            ws.setLoadWithOverviewMode(true);
            ws.setTextZoom(100);
            ws.setCacheMode(WebSettings.LOAD_DEFAULT);
            ws.setMediaPlaybackRequiresUserGesture(false);
            ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            ws.setDomStorageEnabled(true);
            ws.setJavaScriptEnabled(true);
            webView.addJavascriptInterface(new AndroidTvBridge(), "AndroidTvBridge");

            // Automatically check and sync live cloud UI & APK updates on startup
            syncCloudBundleOnStartup();
        }
    }

    private CloudHttpResponse fetchUrlFollowRedirects(String startUrl) {
        String currentUrl = startUrl;
        for (int hop = 0; hop < 5; hop++) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(currentUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(!currentUrl.contains("is.gd/"));
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(9000);
                conn.setUseCaches(false);
                conn.setRequestMethod("GET");
                conn.setRequestProperty(
                        "User-Agent",
                        "Mozilla/5.0 (Linux; Android 12; Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                );
                conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
                conn.setRequestProperty("Pragma", "no-cache");

                int status = conn.getResponseCode();
                if (status == HttpURLConnection.HTTP_MOVED_PERM
                        || status == HttpURLConnection.HTTP_MOVED_TEMP
                        || status == HttpURLConnection.HTTP_SEE_OTHER
                        || status == 307
                        || status == 308) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    if (location == null || location.trim().isEmpty()) {
                        return null;
                    }
                    URL nextUrl = new URL(url, location.trim());
                    currentUrl = nextUrl.toString();
                    if (!currentUrl.contains("is.gd/") && !currentUrl.contains("t=")) {
                        currentUrl += (currentUrl.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis();
                    }
                    continue;
                }

                if (status >= 200 && status < 300) {
                    InputStream in = conn.getInputStream();
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] chunk = new byte[16384];
                    int n;
                    while ((n = in.read(chunk)) != -1) {
                        buffer.write(chunk, 0, n);
                    }
                    String resolvedUrl = conn.getURL() != null ? conn.getURL().toString() : currentUrl;
                    return new CloudHttpResponse(
                            new String(buffer.toByteArray(), StandardCharsets.UTF_8),
                            resolvedUrl
                    );
                }
                return null;
            } catch (Exception e) {
                return null;
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }
        return null;
    }

    private void syncCloudBundleOnStartup() {
        new Thread(() -> {
            try {
                CloudHttpResponse verRes = fetchUrlFollowRedirects("https://is.gd/streamittv_ver");
                if (verRes == null || verRes.text == null || verRes.text.trim().isEmpty()) {
                    return;
                }
                JSONObject verJson = new JSONObject(verRes.text);
                String cloudVersion = verJson.optString("version", "").trim();
                String cloudNativeApkVer = verJson.optString("native_apk_version", "").trim();
                String apkDownloadUrl = verJson.optString("apk_download_url", "https://is.gd/streamittv_apk").trim();
                if (cloudVersion.isEmpty()) {
                    return;
                }

                // Derive base URL from resolved version.json URL
                String finalVerUrl = verRes.finalUrl;
                int qIdx = finalVerUrl.indexOf('?');
                if (qIdx > 0) {
                    finalVerUrl = finalVerUrl.substring(0, qIdx);
                }
                String cloudBaseUrl = "";
                int lastSlash = finalVerUrl.lastIndexOf('/');
                if (lastSlash > 8) {
                    cloudBaseUrl = finalVerUrl.substring(0, lastSlash + 1);
                }

                SharedPreferences prefs = getSharedPreferences(OTA_PREFS_NAME, Context.MODE_PRIVATE);
                String cachedCloudVersion = prefs.getString("cached_cloud_version", INSTALLED_APP_VERSION);

                if (!cloudVersion.equals(cachedCloudVersion)) {
                    long now = System.currentTimeMillis();
                    CloudHttpResponse cssRes = !cloudBaseUrl.isEmpty()
                            ? fetchUrlFollowRedirects(cloudBaseUrl + "styles.css?t=" + now)
                            : fetchUrlFollowRedirects("https://is.gd/streamittv_css");
                    CloudHttpResponse navRes = !cloudBaseUrl.isEmpty()
                            ? fetchUrlFollowRedirects(cloudBaseUrl + "tv-navigation.js?t=" + now)
                            : fetchUrlFollowRedirects("https://is.gd/streamittv_nav");
                    CloudHttpResponse jsRes = !cloudBaseUrl.isEmpty()
                            ? fetchUrlFollowRedirects(cloudBaseUrl + "app.js?t=" + now)
                            : fetchUrlFollowRedirects("https://is.gd/streamittv_js");
                    CloudHttpResponse htmlRes = !cloudBaseUrl.isEmpty()
                            ? fetchUrlFollowRedirects(cloudBaseUrl + "index.html?t=" + now)
                            : null;

                    File otaDir = new File(getFilesDir(), "ota_live");
                    if (!otaDir.exists()) {
                        otaDir.mkdirs();
                    }

                    final String cssText = (cssRes != null && cssRes.text != null) ? cssRes.text : "";
                    final String navText = (navRes != null && navRes.text != null) ? navRes.text : "";
                    final String jsText = (jsRes != null && jsRes.text != null) ? jsRes.text : "";
                    final String htmlText = (htmlRes != null && htmlRes.text != null) ? htmlRes.text : "";

                    if (!cssText.isEmpty()) writeStringToFile(new File(otaDir, "styles.css"), cssText);
                    if (!navText.isEmpty()) writeStringToFile(new File(otaDir, "tv-navigation.js"), navText);
                    if (!jsText.isEmpty()) writeStringToFile(new File(otaDir, "app.js"), jsText);
                    if (!htmlText.isEmpty()) writeStringToFile(new File(otaDir, "index.html"), htmlText);

                    if (!cssText.isEmpty() && !jsText.isEmpty()) {
                        prefs.edit().putString("cached_cloud_version", cloudVersion).apply();
                        final String cssB64 = Base64.encodeToString(cssText.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                        final String navB64 = Base64.encodeToString(navText.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                        final String jsB64 = Base64.encodeToString(jsText.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);

                        runOnUiThread(() -> {
                            if (getBridge() != null && getBridge().getWebView() != null) {
                                WebView wv = getBridge().getWebView();
                                String injectScript = "(function(){"
                                        + "try {"
                                        + "var dec = function(b){ return decodeURIComponent(escape(window.atob(b))); };"
                                        + "var css = dec('" + cssB64 + "');"
                                        + "var nav = dec('" + navB64 + "');"
                                        + "var js = dec('" + jsB64 + "');"
                                        + "localStorage.setItem('streamit_ota_css_v9', css);"
                                        + "if(nav) localStorage.setItem('streamit_ota_tv_nav_v9', nav);"
                                        + "localStorage.setItem('streamit_ota_app_js_v9', js);"
                                        + "localStorage.setItem('streamit_ota_version_v9', '" + cloudVersion + "');"
                                        + "var st = document.getElementById('streamit-ota-live-style');"
                                        + "if(!st){ st = document.createElement('style'); st.id = 'streamit-ota-live-style'; document.head.appendChild(st); }"
                                        + "st.textContent = css;"
                                        + "window.location.reload();"
                                        + "} catch(e){}"
                                        + "})();";
                                wv.evaluateJavascript(injectScript, null);
                            }
                        });
                    }
                }

                // Auto-trigger native APK update if native_apk_version in cloud is strictly newer than installed
                if (isRemoteVersionNewer(cloudNativeApkVer, INSTALLED_NATIVE_APK_VERSION)) {
                    triggerNativeApkDownloadAndInstall(
                            !apkDownloadUrl.isEmpty() ? apkDownloadUrl : "https://is.gd/streamittv_apk"
                    );
                }
            } catch (Exception ignored) {
            }
        }).start();
    }

    private boolean isRemoteVersionNewer(String remoteVer, String localVer) {
        try {
            if (remoteVer == null || remoteVer.isEmpty()) return false;
            String[] rParts = remoteVer.trim().split("\\.");
            String[] lParts = localVer.trim().split("\\.");
            int maxLen = Math.max(rParts.length, lParts.length);
            for (int i = 0; i < maxLen; i++) {
                int r = i < rParts.length ? Integer.parseInt(rParts[i].replaceAll("[^0-9]", "")) : 0;
                int l = i < lParts.length ? Integer.parseInt(lParts[i].replaceAll("[^0-9]", "")) : 0;
                if (r > l) return true;
                if (r < l) return false;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private void writeStringToFile(File file, String content) {
        try (FileOutputStream fos = new FileOutputStream(file, false)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
            fos.flush();
        } catch (Exception ignored) {
        }
    }

    private void triggerNativeApkDownloadAndInstall(String apkUrl) {
        if (apkUpdateInProgress) return;
        apkUpdateInProgress = true;
        new Thread(() -> {
            String currentUrl = (apkUrl != null && !apkUrl.trim().isEmpty()) ? apkUrl.trim() : "https://is.gd/streamittv_apk";
            File apkFile = new File(getCacheDir(), "streamit_update.apk");
            for (int hop = 0; hop < 5; hop++) {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(!currentUrl.contains("is.gd/"));
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(30000);
                    conn.setUseCaches(false);
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty(
                            "User-Agent",
                            "Mozilla/5.0 (Linux; Android 12; Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                    );
                    int status = conn.getResponseCode();
                    if (status == HttpURLConnection.HTTP_MOVED_PERM
                            || status == HttpURLConnection.HTTP_MOVED_TEMP
                            || status == HttpURLConnection.HTTP_SEE_OTHER
                            || status == 307
                            || status == 308) {
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (location == null || location.trim().isEmpty()) {
                            break;
                        }
                        currentUrl = new URL(url, location.trim()).toString();
                        continue;
                    }
                    if (status >= 200 && status < 300) {
                        try (InputStream in = conn.getInputStream();
                             FileOutputStream fos = new FileOutputStream(apkFile, false)) {
                            byte[] buf = new byte[32768];
                            int len;
                            while ((len = in.read(buf)) != -1) {
                                fos.write(buf, 0, len);
                            }
                            fos.flush();
                        }
                        if (apkFile.exists() && apkFile.length() > 100_000L) {
                            runOnUiThread(() -> {
                                try {
                                    Uri apkUri = FileProvider.getUriForFile(
                                            MainActivity.this,
                                            getPackageName() + ".fileprovider",
                                            apkFile
                                    );
                                    Intent installIntent = new Intent(Intent.ACTION_VIEW);
                                    installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(installIntent);
                                } catch (Exception ignored) {
                                }
                            });
                        }
                    }
                    break;
                } catch (Exception ignored) {
                    break;
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
            apkUpdateInProgress = false;
        }).start();
    }

    @Override
    public void onDestroy() {
        if (embeddedServer != null) {
            embeddedServer.stop();
        }
        super.onDestroy();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            int keyCode = event.getKeyCode();
            int action = event.getAction();

            // Consume ACTION_UP for D-Pad Center & Arrows so WebView never double-fires or scrolls erratically
            if (action == KeyEvent.ACTION_UP) {
                if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                        || keyCode == KeyEvent.KEYCODE_ENTER
                        || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER
                        || keyCode == KeyEvent.KEYCODE_DPAD_UP
                        || keyCode == KeyEvent.KEYCODE_DPAD_DOWN
                        || keyCode == KeyEvent.KEYCODE_DPAD_LEFT
                        || keyCode == KeyEvent.KEYCODE_DPAD_RIGHT
                        || keyCode == KeyEvent.KEYCODE_BACK) {
                    return true;
                }
            }

            if (action == KeyEvent.ACTION_DOWN) {
                // 1. D-Pad Arrows (Up / Down / Left / Right) -> Direct Spatial Navigation
                if (keyCode == KeyEvent.KEYCODE_DPAD_UP) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.TVNavigation && window.TVNavigation.handleRemoteDirection) window.TVNavigation.handleRemoteDirection('up'); else if(window.streamItTvKey) window.streamItTvKey('up'); })()",
                        null
                    );
                    return true;
                }
                if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.TVNavigation && window.TVNavigation.handleRemoteDirection) window.TVNavigation.handleRemoteDirection('down'); else if(window.streamItTvKey) window.streamItTvKey('down'); })()",
                        null
                    );
                    return true;
                }
                if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.TVNavigation && window.TVNavigation.handleRemoteDirection) window.TVNavigation.handleRemoteDirection('left'); else if(window.streamItTvKey) window.streamItTvKey('left'); })()",
                        null
                    );
                    return true;
                }
                if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.TVNavigation && window.TVNavigation.handleRemoteDirection) window.TVNavigation.handleRemoteDirection('right'); else if(window.streamItTvKey) window.streamItTvKey('right'); })()",
                        null
                    );
                    return true;
                }

                // 2. D-Pad Center / OK / Enter -> Direct Click on Focused Element
                if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                        || keyCode == KeyEvent.KEYCODE_ENTER
                        || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.TVNavigation && window.TVNavigation.handleRemoteOk) window.TVNavigation.handleRemoteOk(); else if(window.streamItTvKey) window.streamItTvKey('select'); })()",
                        null
                    );
                    return true;
                }

                // 3. Back Button
                if (keyCode == KeyEvent.KEYCODE_BACK) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.TVNavigation && window.TVNavigation.handleAndroidBackButton) return !!window.TVNavigation.handleAndroidBackButton(); if(window.streamItTvKey) return !!window.streamItTvKey('back'); return false; })()",
                        result -> {
                            if (!"true".equals(result)) {
                                runOnUiThread(MainActivity.super::onBackPressed);
                            }
                        }
                    );
                    return true;
                }

                // 4. Media Buttons
                if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
                        || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY
                        || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
                    webView.evaluateJavascript(
                        "(function(){ var v=document.getElementById('videoElement'); if(v){ if(v.paused) v.play(); else v.pause(); } })()",
                        null
                    );
                    return true;
                }

                if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.seekVideoBy) window.seekVideoBy(10); })()",
                        null
                    );
                    return true;
                }

                if (keyCode == KeyEvent.KEYCODE_MEDIA_REWIND) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.seekVideoBy) window.seekVideoBy(-10); })()",
                        null
                    );
                    return true;
                }

                if (keyCode == KeyEvent.KEYCODE_MEDIA_NEXT) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.StreamItApp) window.StreamItApp.playNextBingeTarget(); })()",
                        null
                    );
                    return true;
                }

                if (keyCode == KeyEvent.KEYCODE_MEDIA_PREVIOUS) {
                    webView.evaluateJavascript(
                        "(function(){ if(window.StreamItApp) window.StreamItApp.playPrevBingeTarget(); })()",
                        null
                    );
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }
}
