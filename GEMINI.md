# STREAM IT — Strict Project Iron Rules (הנחיות ברזל לפרויקט)

## 1. Absolute Prohibition on Local Servers (איסור מוחלט על שרת מקומי)
- **NEVER** create, restore, or run any local server in this project (`server.py`, `local_dev_server.py`, `python -m http.server`, Node/Express server, or any process on port `8092` / `localhost` / `127.0.0.1`).
- **100% Pure Cloud Architecture**: On PC Web and Mobile Web, **STREAM IT** runs exclusively from the cloud (`https://streamittvapp.github.io/stream-it-app/`). Only the Android TV Streamer APK uses its internal embedded Java bridge (`window.AndroidTvBridge`).
- **No Localhost Fallbacks in Client Code**: Never add `fetch('http://127.0.0.1:8092/...')` or `localhost` probes for PC/Mobile Web in `app.js`. Every stream, subtitle, and catalog feature must work 100% standalone from the cloud across PC, Mobile, and Streamer alike.
- **No Local Dev Command in Widget/Package**: Never add `"start"` / `"dev_cmd"` / `"port": 8092` to `package.json` or `CapacitorWidget/config.json` for `STREAM IT`.

## 2. Boot Guard Version Sync (`__STREAMIT_V*_BOOT_DONE`)
- Whenever bumping `APP_VERSION` in `app.js`, ALWAYS update the boot guard check inside `bootStreamItApp()` at the bottom of `app.js` to match the new version (`window.__STREAMIT_V<NEW>_BOOT_DONE`) and NEVER set the current version's `BOOT_DONE` flag to `true` at the top of `app.js`.
