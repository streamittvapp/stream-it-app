# -*- coding: utf-8 -*-
"""
STREAM IT — Capacitor & GitHub Pages Static Bundle Builder (`www/`)
====================================================================
מעתיק את כל נכסי האפליקציה העצמאית לתיקיית `www/` עבור בניית APK ב-Capacitor
ועבור פריסה סטטית ב-GitHub Pages ללא צורך בשרת מקומי.
"""

import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WWW_DIR = os.path.join(BASE_DIR, "www")

FILES_TO_COPY = [
    "index.html",
    "admin.html",
    "styles.css",
    "app.js",
    "tv-navigation.js",
    "manifest.webmanifest",
    "version.json",
    "favicon.svg",
    "icon-192.png",
    "icon-512.png",
]

ANDROID_ASSETS_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "assets")
ANDROID_PUBLIC_DIR = os.path.join(ANDROID_ASSETS_DIR, "public")


def build_www() -> None:
    os.makedirs(WWW_DIR, exist_ok=True)
    os.makedirs(ANDROID_PUBLIC_DIR, exist_ok=True)
    for fname in FILES_TO_COPY:
        src = os.path.join(BASE_DIR, fname)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(WWW_DIR, fname))
            shutil.copy2(src, os.path.join(ANDROID_PUBLIC_DIR, fname))
            if fname in ("app.js", "tv-navigation.js"):
                shutil.copy2(src, os.path.join(ANDROID_ASSETS_DIR, fname))

    src_data = os.path.join(BASE_DIR, "data")
    dst_data = os.path.join(WWW_DIR, "data")
    and_data = os.path.join(ANDROID_PUBLIC_DIR, "data")
    os.makedirs(dst_data, exist_ok=True)
    os.makedirs(and_data, exist_ok=True)
    for data_fname in ("hebrew_catalog.json", "accounts_vault.json"):
        data_file = os.path.join(src_data, data_fname)
        if os.path.exists(data_file):
            shutil.copy2(data_file, os.path.join(dst_data, data_fname))
            shutil.copy2(data_file, os.path.join(and_data, data_fname))

    # Build clean /admin route (admin/index.html) so URLs work without .html extension
    admin_src = os.path.join(BASE_DIR, "admin.html")
    if os.path.exists(admin_src):
        with open(admin_src, "r", encoding="utf-8") as f:
            admin_html = f.read()
        admin_sub_html = admin_html.replace(
            '<meta charset="UTF-8" />',
            '<meta charset="UTF-8" />\n  <base href="../" />',
            1,
        )
        for target_root in (BASE_DIR, WWW_DIR, ANDROID_PUBLIC_DIR):
            admin_dir = os.path.join(target_root, "admin")
            os.makedirs(admin_dir, exist_ok=True)
            with open(os.path.join(admin_dir, "index.html"), "w", encoding="utf-8") as out_f:
                out_f.write(admin_sub_html)

    print("[STREAM IT] Built standalone Capacitor / Git bundle in www/ and android/app/src/main/assets/public/")


if __name__ == "__main__":
    build_www()
