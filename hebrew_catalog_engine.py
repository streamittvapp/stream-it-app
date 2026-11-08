# -*- coding: utf-8 -*-
"""
STREAM IT — Hebrew Catalog & Live Metadata Translation Engine (v2.0 Cinema Edition)
====================================================================================
מנוע קטלוג ותרגום אוטומטי לעברית מלאה (RTL) עבור סרטים, סדרות וערוצים חיים.
כולל:
- קטלוג עשיר מובנה בעברית (18 סרטים, 10 סדרות עם עונות ופרקים, 8 ערוצי טלוויזיה בשידור חי עם EPG)
- מזהי YouTube רשמיים לטריילרים (trailer_yt_id) וגלריית תמונות סצנה (gallery) לכל כותר
- מזהי TMDB + IMDb להזרמה ישירה ומנוע טורנט מקומי
- שליפה חיה מ-Stremio Cinemeta API עם תרגום אוטומטי לעברית בזמן אמת
"""

from __future__ import annotations

import json
import os
import threading
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

CATALOG_JSON_PATH = os.path.join(DATA_DIR, "hebrew_catalog.json")
TRANSLATION_CACHE_PATH = os.path.join(DATA_DIR, "translation_cache.json")
_CACHE_LOCK = threading.Lock()

GENRE_EN_TO_HE: Dict[str, str] = {
    "Action": "אקשן והרפתקאות",
    "Adventure": "אקשן והרפתקאות",
    "Sci-Fi": "מדע בדיוני ופנטזיה",
    "Science Fiction": "מדע בדיוני ופנטזיה",
    "Fantasy": "מדע בדיוני ופנטזיה",
    "Drama": "דרמה ומתח",
    "Thriller": "דרמה ומתח",
    "Mystery": "פשע ומסתורין",
    "Crime": "פשע ומסתורין",
    "Comedy": "קומדיה",
    "Animation": "אנימציה ומשפחה",
    "Family": "אנימציה ומשפחה",
    "Documentary": "דוקומנטרי",
    "Biography": "דוקומנטרי",
    "History": "דרמה ומתח",
    "Horror": "אימה",
    "Romance": "דרמה ומתח",
    "War": "דרמה ומתח",
}

CATEGORIES: List[Dict[str, str]] = [
    {"id": "all", "name_he": "הכל"},
    {"id": "action", "name_he": "אקשן והרפתקאות"},
    {"id": "horror", "name_he": "אימה"},
    {"id": "scifi", "name_he": "מדע בדיוני ופנטזיה"},
    {"id": "drama", "name_he": "דרמה ומתח"},
    {"id": "comedy", "name_he": "קומדיה"},
    {"id": "crime", "name_he": "פשע ומסתורין"},
    {"id": "israeli", "name_he": "יצירה ישראלית"},
    {"id": "animation", "name_he": "אנימציה ומשפחה"},
    {"id": "docu", "name_he": "דוקומנטרי"},
]

MOVIES: List[Dict[str, Any]] = [
    {
        "id": "tt15239678",
        "imdb_id": "tt15239678",
        "tmdb_id": 693134,
        "type": "movie",
        "title_he": "חולית: חלק שני",
        "title_en": "Dune: Part Two",
        "year": 2024,
        "imdb_rating": 8.6,
        "age_rating": "14+",
        "runtime_he": "2 שעות ו-46 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1840,
        "top10_rank": 1,
        "featured_hero": True,
        "trailer_yt_id": "Way9Dexny3w",
        "director_he": "דני וילנב",
        "cast_he": "טימותי שאלאמה, זנדאיה, רבקה פרגוסון, חאווייר ברדם",
        "genres": ["scifi", "action", "drama"],
        "genres_he": ["מדע בדיוני", "אקשן והרפתקאות", "דרמה"],
        "overview_he": "פול אטריידיס מתאחד עם צ'אני ועם שבטי הדרשנים במדבר העמוק של אראקיס, ויוצא למסע נקמה גורלי נגד הקושרים שהחריבו את משפחתו — תוך שהוא נאבק למנוע עתיד אפל שרק הוא מסוגל לחזות.",
        "poster": "https://images.metahub.space/poster/medium/tt15239678/img",
        "backdrop": "https://images.metahub.space/background/medium/tt15239678/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt15239678/img",
            "https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
            "https://image.tmdb.org/t/p/w780/8rpDcsfLJypbO6vREc0547VKqEv.jpg",
            "https://images.metahub.space/background/medium/tt1160419/img"
        ],
        "default_release": "Dune.Part.Two.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt15398776",
        "imdb_id": "tt15398776",
        "tmdb_id": 872585,
        "type": "movie",
        "title_he": "אופנהיימר",
        "title_en": "Oppenheimer",
        "year": 2023,
        "imdb_rating": 8.9,
        "age_rating": "16+",
        "runtime_he": "3 שעות ו-00 דק'",
        "quality": "1080p Full HD",
        "audio": "DTS-HD 5.1",
        "seeders": 1620,
        "top10_rank": 2,
        "featured_hero": True,
        "trailer_yt_id": "uYPbbksJxIg",
        "director_he": "כריסטופר נולאן",
        "cast_he": "קיליאן מרפי, אמילי בלאנט, מאט דיימון, רוברט דאוני ג'וניור",
        "genres": ["drama", "docu"],
        "genres_he": ["דרמה", "ביוגרפיה והיסטוריה"],
        "overview_he": "סיפורו המטלטל של הפיזיקאי האמריקאי ג'יי רוברט אופנהיימר ותפקידו המרכזי בפרויקט מנהטן הסודי לפיתוח הפצצה האטומית הראשונה במלחמת העולם השנייה.",
        "poster": "https://images.metahub.space/poster/medium/tt15398776/img",
        "backdrop": "https://images.metahub.space/background/medium/tt15398776/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt15398776/img",
            "https://image.tmdb.org/t/p/w780/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
            "https://image.tmdb.org/t/p/w780/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg"
        ],
        "default_release": "Oppenheimer.2023.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt6263850",
        "imdb_id": "tt6263850",
        "tmdb_id": 533535,
        "type": "movie",
        "title_he": "דדפול & וולברין",
        "title_en": "Deadpool & Wolverine",
        "year": 2024,
        "imdb_rating": 7.9,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-08 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 2410,
        "top10_rank": 4,
        "featured_hero": True,
        "trailer_yt_id": "73_1biulkYk",
        "director_he": "שון לוי",
        "cast_he": "ראיין ריינולדס, יו ג'קמן, אמה קורין, מת'יו מקפדיין",
        "genres": ["action", "comedy", "scifi"],
        "genres_he": ["אקשן", "קומדיה", "מדע בדיוני"],
        "overview_he": "וייד וילסון נאלץ לעזוב את חייו השקטים כאשר רשות הזמן מאיימת למחוק את עולמו. הוא מגייס וולברין סרבן מיקום מקביל למסע פרוע שישנה את פני היקום הקולנועי.",
        "poster": "https://images.metahub.space/poster/medium/tt6263850/img",
        "backdrop": "https://images.metahub.space/background/medium/tt6263850/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt6263850/img",
            "https://image.tmdb.org/t/p/w780/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
            "https://image.tmdb.org/t/p/w780/dvBCdCohwWbsP5qAaglOXagDMtk.jpg"
        ],
        "default_release": "Deadpool.and.Wolverine.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt0816692",
        "imdb_id": "tt0816692",
        "tmdb_id": 157336,
        "type": "movie",
        "title_he": "בין כוכבים",
        "title_en": "Interstellar",
        "year": 2014,
        "imdb_rating": 8.7,
        "age_rating": "12+",
        "runtime_he": "2 שעות ו-49 דק'",
        "quality": "1080p Full HD",
        "audio": "DTS-HD 5.1",
        "seeders": 2310,
        "top10_rank": 5,
        "featured_hero": True,
        "trailer_yt_id": "zSWdZVtXT7E",
        "director_he": "כריסטופר נולאן",
        "cast_he": "מתיו מקונוהיי, אן האת'וויי, ג'סיקה צ'סטיין, מייקל קיין",
        "genres": ["scifi", "drama", "action"],
        "genres_he": ["מדע בדיוני", "דרמה", "הרפתקאות"],
        "overview_he": "כשכדור הארץ הולך והופך לבלתי ראוי למגורי אדם, צוות של חוקרים ואסטרונאוטים יוצא למסע נועז דרך חור תולעת בחלל בחיפוש אחר בית חדש לאנושות.",
        "poster": "https://images.metahub.space/poster/medium/tt0816692/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0816692/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0816692/img",
            "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
            "https://image.tmdb.org/t/p/w780/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg"
        ],
        "default_release": "Interstellar.2014.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt1745960",
        "imdb_id": "tt1745960",
        "tmdb_id": 361743,
        "type": "movie",
        "title_he": "אהבה בשחקים: מאווריק",
        "title_en": "Top Gun: Maverick",
        "year": 2022,
        "imdb_rating": 8.3,
        "age_rating": "12+",
        "runtime_he": "2 שעות ו-10 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1750,
        "top10_rank": 7,
        "featured_hero": False,
        "trailer_yt_id": "giXco2jaZ_4",
        "director_he": "ג'וזף קוסינסקי",
        "cast_he": "טום קרוז, מיילס טלר, ג'ניפר קונלי, גלן פאוול",
        "genres": ["action", "drama"],
        "genres_he": ["אקשן", "דרמה"],
        "overview_he": "לאחר יותר משלושים שנות שירות כטייס הניסוי המוביל של הצי, פיט 'מאווריק' מיטשל נקרא להכשיר קבוצת בוגרים צעירים של טופ גאן למשימה נועזת שמעולם לא בוצעה.",
        "poster": "https://images.metahub.space/poster/medium/tt1745960/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1745960/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1745960/img",
            "https://image.tmdb.org/t/p/w780/628Dep6AxEtDxjZoGP78TsOxYbK.jpg"
        ],
        "default_release": "Top.Gun.Maverick.2022.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt0468569",
        "imdb_id": "tt0468569",
        "tmdb_id": 155,
        "type": "movie",
        "title_he": "האביר האפל",
        "title_en": "The Dark Knight",
        "year": 2008,
        "imdb_rating": 9.0,
        "age_rating": "14+",
        "runtime_he": "2 שעות ו-32 דק'",
        "quality": "1080p Full HD",
        "audio": "TrueHD 7.1",
        "seeders": 2540,
        "top10_rank": 8,
        "featured_hero": False,
        "trailer_yt_id": "EXeTwQWrcwY",
        "director_he": "כריסטופר נולאן",
        "cast_he": "כריסטיאן בייל, הית' לדג'ר, גארי אולדמן, מורגן פרימן",
        "genres": ["action", "crime", "drama"],
        "genres_he": ["אקשן", "פשע", "דרמה"],
        "overview_he": "באטמן, המפקח גורדון והתובע הארווי דנט משלבים כוחות כדי לפרק את ארגוני הפשע של גות'האם, אך מוצאים את עצמם מול מוח קרימינלי אנרכיסטי המכונה הג'וקר.",
        "poster": "https://images.metahub.space/poster/medium/tt0468569/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0468569/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0468569/img",
            "https://image.tmdb.org/t/p/w780/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg"
        ],
        "default_release": "The.Dark.Knight.2008.1080p.BluRay.x264.AAC-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt9362722",
        "imdb_id": "tt9362722",
        "tmdb_id": 569094,
        "type": "movie",
        "title_he": "ספיידרמן: ברחבי ממדי העכביש",
        "title_en": "Spider-Man: Across the Spider-Verse",
        "year": 2023,
        "imdb_rating": 8.6,
        "age_rating": "לכל המשפחה",
        "runtime_he": "2 שעות ו-20 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1490,
        "top10_rank": 9,
        "featured_hero": False,
        "trailer_yt_id": "shW9i6k8cB0",
        "director_he": "חואקים דוס סנטוס",
        "cast_he": "מיילס מוראלס, גוון סטייסי, פיטר ב. פארקר",
        "genres": ["animation", "action", "scifi"],
        "genres_he": ["אנימציה", "אקשן", "מדע בדיוני"],
        "overview_he": "מיילס מוראלס משוגר אל רחבי המולטיוורס ופוגש צוות שלם של אנשי עכביש המופקדים על הגנת עצם קיומם של הממדים המקבילים.",
        "poster": "https://images.metahub.space/poster/medium/tt9362722/img",
        "backdrop": "https://images.metahub.space/background/medium/tt9362722/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt9362722/img",
            "https://image.tmdb.org/t/p/w780/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg"
        ],
        "default_release": "Spider-Man.Across.the.Spider-Verse.2023.1080p.WEBRip.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt1375666",
        "imdb_id": "tt1375666",
        "tmdb_id": 27205,
        "type": "movie",
        "title_he": "התחלה",
        "title_en": "Inception",
        "year": 2010,
        "imdb_rating": 8.8,
        "age_rating": "14+",
        "runtime_he": "2 שעות ו-28 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Digital 5.1",
        "seeders": 1950,
        "top10_rank": 10,
        "featured_hero": False,
        "trailer_yt_id": "YoHD9XEInc0",
        "director_he": "כריסטופר נולאן",
        "cast_he": "לאונרדו דיקפריו, ג'וזף גורדון-לוויט, טום הארדי, קיליאן מרפי",
        "genres": ["scifi", "action", "drama"],
        "genres_he": ["מדע בדיוני", "אקשן", "מתח"],
        "overview_he": "גנב מיומן הגונב סודות כמוסים מתוך תת-המודע בזמן שינה מקבל הזדמנות אחרונה לגאולה: לבצע שתילה של רעיון חדש בתוך מוחו של יורש אימפריה עסקית.",
        "poster": "https://images.metahub.space/poster/medium/tt1375666/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1375666/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1375666/img",
            "https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg"
        ],
        "default_release": "Inception.2010.1080p.BluRay.x264.AAC-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt1877830",
        "imdb_id": "tt1877830",
        "tmdb_id": 414906,
        "type": "movie",
        "title_he": "הבאטמן",
        "title_en": "The Batman",
        "year": 2022,
        "imdb_rating": 7.8,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-56 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1190,
        "trailer_yt_id": "mqqft2x_Aa4",
        "director_he": "מאט ריבס",
        "cast_he": "רוברט פטינסון, זואי קרביץ, פול דאנו, ג'פרי רייט",
        "genres": ["action", "crime", "drama"],
        "genres_he": ["אקשן", "פשע ומסתורין", "דרמה"],
        "overview_he": "בשנתו השנייה למלחמה בפשע בגות'האם סיטי, באטמן חושף שחיתות עמוקה בעיר שמתקשרת למשפחתו שלו בעודו רודף אחר רוצח סדרתי מסתורי המכונה איש החידות.",
        "poster": "https://images.metahub.space/poster/medium/tt1877830/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1877830/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1877830/img",
            "https://image.tmdb.org/t/p/w780/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg"
        ],
        "default_release": "The.Batman.2022.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt6710474",
        "imdb_id": "tt6710474",
        "tmdb_id": 545611,
        "type": "movie",
        "title_he": "הכל בכל מקום בבת אחת",
        "title_en": "Everything Everywhere All at Once",
        "year": 2022,
        "imdb_rating": 7.8,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-19 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 980,
        "trailer_yt_id": "wxN1T1uxQ2g",
        "director_he": "דניאל קוואן ודניאל שיינרט",
        "cast_he": "מישל יאו, ג'יימי לי קרטיס, קה הוי קוואן",
        "genres": ["scifi", "comedy", "action"],
        "genres_he": ["מדע בדיוני", "קומדיה", "אקשן"],
        "overview_he": "מהגרת סינית בגיל העמידה נסחפת להרפתקה מטורפת שבה היא לבדה יכולה להציל את הקיום על ידי חקירת יקומים מקבילים והתחברות לחיים שהייתה יכולה לחיות.",
        "poster": "https://images.metahub.space/poster/medium/tt6710474/img",
        "backdrop": "https://images.metahub.space/background/medium/tt6710474/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt6710474/img"
        ],
        "default_release": "Everything.Everywhere.All.at.Once.2022.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt22022452",
        "imdb_id": "tt22022452",
        "tmdb_id": 1022789,
        "type": "movie",
        "title_he": "הקול בראש 2",
        "title_en": "Inside Out 2",
        "year": 2024,
        "imdb_rating": 7.7,
        "age_rating": "לכל המשפחה",
        "runtime_he": "שעה ו-36 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1890,
        "trailer_yt_id": "LEjhY15eCx0",
        "director_he": "קלסי מאן",
        "cast_he": "איימי פוהלר, מאיה הוק, פיליס סמית'",
        "genres": ["animation", "comedy"],
        "genres_he": ["אנימציה ומשפחה", "קומדיה"],
        "overview_he": "מוחה של ריילי המתבגרת עובר שיפוץ פתאומי ברגע שהיא נכנסת לגיל ההתבגרות, ורגשות חדשים לגמרי כמו חרדה, קנאה ומבוכה תופסים פיקוד במטה הרגשות.",
        "poster": "https://images.metahub.space/poster/medium/tt22022452/img",
        "backdrop": "https://images.metahub.space/background/medium/tt22022452/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt22022452/img"
        ],
        "default_release": "Inside.Out.2.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt9218128",
        "imdb_id": "tt9218128",
        "tmdb_id": 558449,
        "type": "movie",
        "title_he": "גלדיאטור 2",
        "title_en": "Gladiator II",
        "year": 2024,
        "imdb_rating": 7.1,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-28 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 2120,
        "trailer_yt_id": "4rgYUipGJNo",
        "director_he": "רידלי סקוט",
        "cast_he": "פול מסקל, פדרו פסקל, דנזל וושינגטון, קוני נילסן",
        "genres": ["action", "drama"],
        "genres_he": ["אקשן", "דרמה היסטורית"],
        "overview_he": "שנים לאחר שהיה עד למותו של הגיבור מקסימוס, לוציוס נאלץ להיכנס אל הקולוסיאום כגלדיאטור לאחר שביתו נכבש בידי קיסרים עריצים השולטים ברומא ביד ברזל.",
        "poster": "https://images.metahub.space/poster/medium/tt9218128/img",
        "backdrop": "https://images.metahub.space/background/medium/tt9218128/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt9218128/img"
        ],
        "default_release": "Gladiator.II.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt1160419",
        "imdb_id": "tt1160419",
        "tmdb_id": 438631,
        "type": "movie",
        "title_he": "חולית: חלק ראשון",
        "title_en": "Dune: Part One",
        "year": 2021,
        "imdb_rating": 8.0,
        "age_rating": "14+",
        "runtime_he": "2 שעות ו-35 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1540,
        "trailer_yt_id": "n9xhJrPXop4",
        "director_he": "דני וילנב",
        "cast_he": "טימותי שאלאמה, רבקה פרגוסון, אוסקר אייזק, ג'וש ברולין",
        "genres": ["scifi", "action", "drama"],
        "genres_he": ["מדע בדיוני", "אקשן", "דרמה"],
        "overview_he": "בית אצולה עתיק נשלח לנהל את כוכב הלכת המדברי המסוכן ביותר בגלקסיה — המקור הבלעדי למשאב היקר ביותר ביקום — ונקלע למלכודת פוליטית קטלנית.",
        "poster": "https://images.metahub.space/poster/medium/tt1160419/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1160419/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1160419/img"
        ],
        "default_release": "Dune.2021.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt6751668",
        "imdb_id": "tt6751668",
        "tmdb_id": 496243,
        "type": "movie",
        "title_he": "פרזיטים",
        "title_en": "Parasite",
        "year": 2019,
        "imdb_rating": 8.5,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-12 דק'",
        "quality": "1080p Full HD",
        "audio": "DTS-HD 5.1",
        "seeders": 1280,
        "trailer_yt_id": "5xH0HfJHsaY",
        "director_he": "בונג ג'ון-הו",
        "cast_he": "סונג קאנג-הו, לי סון-קיון, צ'ו יאו-ג'ונג",
        "genres": ["drama", "crime", "comedy"],
        "genres_he": ["דרמה", "מתח", "קומדיה שחורה"],
        "overview_he": "משפחה קשת יום מפלסת את דרכה בעורמה אל תוך חייה של משפחה עשירה בסיאול, עד שגילוי בלתי צפוי במרתף הבית מוביל לשרשרת אירועים בלתי נשלטת.",
        "poster": "https://images.metahub.space/poster/medium/tt6751668/img",
        "backdrop": "https://images.metahub.space/background/medium/tt6751668/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt6751668/img"
        ],
        "default_release": "Parasite.2019.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt0111161",
        "imdb_id": "tt0111161",
        "tmdb_id": 278,
        "type": "movie",
        "title_he": "חומות של תקווה",
        "title_en": "The Shawshank Redemption",
        "year": 1994,
        "imdb_rating": 9.3,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-22 דק'",
        "quality": "1080p Full HD",
        "audio": "DTS-HD 5.1",
        "seeders": 2790,
        "trailer_yt_id": "PLl99DlL6b4",
        "director_he": "פרנק דרבונט",
        "cast_he": "טים רובינס, מורגן פרימן, בוב גנטון",
        "genres": ["drama", "crime"],
        "genres_he": ["דרמה", "פשע"],
        "overview_he": "בנקאי צעיר הנידון לשני מאסרי עולם בכלא שושנק הקשוח על פשע שלא ביצע רוקם חברות אמיצה עם אסיר ותיק ומוצא דרך לשמור על התקווה והחופש הפנימי.",
        "poster": "https://images.metahub.space/poster/medium/tt0111161/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0111161/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0111161/img"
        ],
        "default_release": "The.Shawshank.Redemption.1994.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt1185616",
        "imdb_id": "tt1185616",
        "tmdb_id": 14896,
        "type": "movie",
        "title_he": "ואלס עם באשיר",
        "title_en": "Waltz with Bashir",
        "year": 2008,
        "imdb_rating": 8.0,
        "age_rating": "16+",
        "runtime_he": "שעה ו-30 דק'",
        "quality": "1080p HD",
        "audio": "עברית 5.1",
        "seeders": 540,
        "is_israeli": True,
        "trailer_yt_id": "ylzO9vbEpPg",
        "director_he": "ארי פולמן",
        "cast_he": "ארי פולמן, אורי סיון, רוני דניאל",
        "genres": ["israeli", "docu", "animation", "drama"],
        "genres_he": ["יצירה ישראלית", "דוקומנטרי", "אנימציה"],
        "overview_he": "סרטו עטור הפרסים של ארי פולמן היוצא למסע דוקומנטרי-מצויר בעקבות זיכרונותיו האבודים כלוחם חי\"ר במלחמת לבנון הראשונה.",
        "poster": "https://images.metahub.space/poster/medium/tt1185616/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1185616/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1185616/img"
        ],
        "default_release": "Waltz.with.Bashir.2008.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt0792966",
        "imdb_id": "tt0792966",
        "tmdb_id": 13919,
        "type": "movie",
        "title_he": "בופור",
        "title_en": "Beaufort",
        "year": 2007,
        "imdb_rating": 7.0,
        "age_rating": "14+",
        "runtime_he": "2 שעות ו-11 דק'",
        "quality": "1080p HD",
        "audio": "עברית 5.1",
        "seeders": 490,
        "is_israeli": True,
        "trailer_yt_id": "SWyW-M2_xU4",
        "director_he": "יוסף סידר",
        "cast_he": "אושרי כהן, איתי טיראן, אלי אלטוניו, אוהד קנולר",
        "genres": ["israeli", "drama", "action"],
        "genres_he": ["יצירה ישראלית", "דרמה", "מלחמה"],
        "overview_he": "סיפורם של מפקד מוצב הבופור ולוחמיו בחודשים האחרונים שלפני נסיגת צה\"ל מדרום לבנון בשנת 2000 — דרמת מלחמה ישראלית מועמדת פרס האוסקר.",
        "poster": "https://images.metahub.space/poster/medium/tt0792966/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0792966/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0792966/img"
        ],
        "default_release": "Beaufort.2007.1080p.WEB-DL.x264.HEBREW.mp4",
        "fps": 25.0,
    },
    {
        "id": "tt3501632",
        "imdb_id": "tt3501632",
        "tmdb_id": 284053,
        "type": "movie",
        "title_he": "תור: ראגנארוק",
        "title_en": "Thor: Ragnarok",
        "year": 2017,
        "imdb_rating": 7.9,
        "age_rating": "12+",
        "runtime_he": "2 שעות ו-10 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1360,
        "trailer_yt_id": "ue80QwXMRHg",
        "director_he": "טאיקה ואיטיטי",
        "cast_he": "כריס המסוורת', טום הידלסטון, קייט בלאנשט, מארק רופאלו",
        "genres": ["action", "comedy", "scifi"],
        "genres_he": ["אקשן", "קומדיה", "מדע בדיוני"],
        "overview_he": "תור כלוא בקצה השני של היקום ללא הפטיש שלו וחייב לנצח בקרב גלדיאטורים מול הענק הירוק כדי לחזור בזמן לאסגארד ולעצור את הלה מלהחריב את עולמו.",
        "poster": "https://images.metahub.space/poster/medium/tt3501632/img",
        "backdrop": "https://images.metahub.space/background/medium/tt3501632/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt3501632/img"
        ],
        "default_release": "Thor.Ragnarok.2017.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt26581740",
        "imdb_id": "tt26581740",
        "tmdb_id": 1078605,
        "type": "movie",
        "title_he": "שעת הנעלמים",
        "title_en": "Weapons",
        "year": 2025,
        "imdb_rating": 7.6,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-08 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 2150,
        "top10_rank": 3,
        "featured_hero": True,
        "trailer_yt_id": "69ffwl-8pCU",
        "director_he": "זאק קרגר",
        "cast_he": "ג'וש ברולין, ג'וליה גארנר, אלדן אהרנרייך",
        "genres": ["horror", "crime", "drama"],
        "genres_he": ["אימה", "מסתורין", "מתח"],
        "overview_he": "בעיירה שקטה בארצות הברית, כל ילדי כיתה אחת קמים ממיטותיהם באותה שעה בדיוק באמצע הלילה ונעלמים אל תוך החשיכה ללא כל הסבר — מלבד ילד אחד.",
        "poster": "https://images.metahub.space/poster/medium/tt26581740/img",
        "backdrop": "https://images.metahub.space/background/medium/tt26581740/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt26581740/img"
        ],
        "default_release": "Weapons.2025.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt17526714",
        "imdb_id": "tt17526714",
        "tmdb_id": 933260,
        "type": "movie",
        "title_he": "יופי מסוכן",
        "title_en": "The Substance",
        "year": 2024,
        "imdb_rating": 7.4,
        "age_rating": "18+",
        "runtime_he": "2 שעות ו-21 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby 5.1",
        "seeders": 1950,
        "trailer_yt_id": "LNlrGhBpYjc",
        "director_he": "קוראלי פארז'ה",
        "cast_he": "דמי מור, מרגרט קוואלי, דניס קווייד",
        "genres": ["horror", "drama", "scifi"],
        "genres_he": ["אימה", "מתח", "מדע בדיוני"],
        "overview_he": "כוכבת הוליוודית דועכת מחליטה להשתמש בסם שוק שחור מסתורי המשכפל תאים ויוצר זמנית גרסה צעירה ומושלמת יותר של עצמה — אך להפרת כללי האיזון יש מחיר מצמרר.",
        "poster": "https://images.metahub.space/poster/medium/tt17526714/img",
        "backdrop": "https://images.metahub.space/background/medium/tt17526714/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt17526714/img"
        ],
        "default_release": "The.Substance.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt5040012",
        "imdb_id": "tt5040012",
        "tmdb_id": 426063,
        "type": "movie",
        "title_he": "נוספרטו",
        "title_en": "Nosferatu",
        "year": 2024,
        "imdb_rating": 7.5,
        "age_rating": "16+",
        "runtime_he": "2 שעות ו-12 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1820,
        "trailer_yt_id": "nulvWqYUM8k",
        "director_he": "רוברט אגרס",
        "cast_he": "לילי-רוז דפ, ביל סקארסגארד, ניקולס הולט, וילם דפו",
        "genres": ["horror", "drama"],
        "genres_he": ["אימה", "מסתורין", "דרמה"],
        "overview_he": "מעשייה גותית אפלה על אובססיה מצמררת בין צעירה רדופת סיוטים בגרמניה של המאה ה-19 לבין ערפד עתיק ומטיל אימה מטרנסילבניה המביא עמו חורבן.",
        "poster": "https://images.metahub.space/poster/medium/tt5040012/img",
        "backdrop": "https://images.metahub.space/background/medium/tt5040012/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt5040012/img"
        ],
        "default_release": "Nosferatu.2024.1080p.WEBRip.x264.AAC5.1-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt7784604",
        "imdb_id": "tt7784604",
        "tmdb_id": 493922,
        "type": "movie",
        "title_he": "תורשתי",
        "title_en": "Hereditary",
        "year": 2018,
        "imdb_rating": 7.3,
        "age_rating": "18+",
        "runtime_he": "2 שעות ו-07 דק'",
        "quality": "1080p Full HD",
        "audio": "DTS 5.1",
        "seeders": 1540,
        "trailer_yt_id": "V6wWKNij_1M",
        "director_he": "ארי אסטר",
        "cast_he": "טוני קולט, אלכס וולף, מילי שפירו, גבריאל ביירן",
        "genres": ["horror", "drama", "crime"],
        "genres_he": ["אימה", "מסתורין", "דרמה"],
        "overview_he": "לאחר מותה של אם המשפחה המסוגרת, בתה ונכדיה מתחילים לחשוף סודות אפלים ומבעיתים על שושלת הדם שלהם ועל גורל מחריד שממנו אינם יכולים להימלט.",
        "poster": "https://images.metahub.space/poster/medium/tt7784604/img",
        "backdrop": "https://images.metahub.space/background/medium/tt7784604/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt7784604/img"
        ],
        "default_release": "Hereditary.2018.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt1457767",
        "imdb_id": "tt1457767",
        "tmdb_id": 138843,
        "type": "movie",
        "title_he": "לזמן את הרוע",
        "title_en": "The Conjuring",
        "year": 2013,
        "imdb_rating": 7.5,
        "age_rating": "16+",
        "runtime_he": "שעה ו-52 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby 5.1",
        "seeders": 1910,
        "trailer_yt_id": "k10ETZ41q5o",
        "director_he": "ג'יימס וואן",
        "cast_he": "ורה פרמיגה, פטריק וילסון, לילי טיילור, רון ליווינגסטון",
        "genres": ["horror", "crime"],
        "genres_he": ["אימה", "מתח", "מסתורין"],
        "overview_he": "חוקרי העל-טבעי אד ולוריין וורן נקראים לסייע למשפחה מבועתת בבית חווה מבודד ברוד איילנד, ונאלצים להתמודד מול ישות שטנית מהמסוכנות שפגשו מעולם.",
        "poster": "https://images.metahub.space/poster/medium/tt1457767/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1457767/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1457767/img"
        ],
        "default_release": "The.Conjuring.2013.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt0162661",
        "imdb_id": "tt0162661",
        "tmdb_id": 2668,
        "type": "movie",
        "title_he": "סליפי הולו",
        "title_en": "Sleepy Hollow",
        "year": 1999,
        "imdb_rating": 7.3,
        "age_rating": "16+",
        "runtime_he": "שעה ו-45 דק'",
        "quality": "1080p Full HD",
        "audio": "Dolby 5.1",
        "seeders": 1320,
        "trailer_yt_id": "6RsK8_6aHkY",
        "director_he": "טים ברטון",
        "cast_he": "ג'וני דפ, כריסטינה ריצ'י, מירנדה ריצ'רדסון, כריסטופר ווקן",
        "genres": ["horror", "crime", "scifi"],
        "genres_he": ["אימה", "מסתורין", "פנטזיה"],
        "overview_he": "החוקר הניו-יורקי איכבוד קריין נשלח לעיירה המבודדת סליפי הולו כדי לחקור סדרת מקרי רצח מסתוריים שבהם הקורבנות נמצאים ערופי ראש — ומגלה את אגדת הפרש בלי ראש.",
        "poster": "https://images.metahub.space/poster/medium/tt0162661/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0162661/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0162661/img"
        ],
        "default_release": "Sleepy.Hollow.1999.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
    {
        "id": "tt0117571",
        "imdb_id": "tt0117571",
        "tmdb_id": 4232,
        "type": "movie",
        "title_he": "צעקה",
        "title_en": "Scream",
        "year": 1996,
        "imdb_rating": 7.4,
        "age_rating": "16+",
        "runtime_he": "שעה ו-51 דק'",
        "quality": "1080p Full HD",
        "audio": "AAC 5.1",
        "seeders": 1480,
        "trailer_yt_id": "AWm_mkbdpCA",
        "director_he": "ווס קרייבן",
        "cast_he": "נב קמפבל, קורטני קוקס, דייוויד ארקט, דרו ברימור",
        "genres": ["horror", "crime"],
        "genres_he": ["אימה", "מתח", "מסתורין"],
        "overview_he": "שנה לאחר רצח אמה, נערת תיכון בעיירה שקטה בקליפורניה הופכת למטרה של רוצח סדרתי במסכת רוח רפאים המשתמש בחוקי סרטי האימה כמשחק קטלני.",
        "poster": "https://images.metahub.space/poster/medium/tt0117571/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0117571/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0117571/img"
        ],
        "default_release": "Scream.1996.1080p.BluRay.x264-[YTS.MX].mp4",
        "fps": 23.976,
    },
]

SERIES: List[Dict[str, Any]] = [
    {
        "id": "tt11280740",
        "imdb_id": "tt11280740",
        "tmdb_id": 95396,
        "type": "series",
        "title_he": "ניתוק",
        "title_en": "Severance",
        "year": 2022,
        "imdb_rating": 8.7,
        "age_rating": "16+",
        "runtime_he": "2 עונות • 19 פרקים",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1640,
        "top10_rank": 3,
        "featured_hero": True,
        "trailer_yt_id": "xEQP4VVuyrY",
        "director_he": "בן סטילר, דן אריקסון",
        "cast_he": "אדם סקוט, בריט לאוור, ג'ון טורטורו, כריסטופר ווקן, פטרישה ארקט",
        "genres": ["scifi", "drama", "crime"],
        "genres_he": ["מדע בדיוני", "דרמה ומתח", "מסתורין"],
        "overview_he": "מארק מוביל צוות עובדים בתאגיד 'לומון' שעברו הליך כירורגי המפריד באופן מוחלט בין זיכרונות העבודה שלהם לבין זיכרונות החיים האישיים שמחוץ למשרד.",
        "poster": "https://images.metahub.space/poster/medium/tt11280740/img",
        "backdrop": "https://images.metahub.space/background/medium/tt11280740/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt11280740/img",
            "https://image.tmdb.org/t/p/w780/ixgFmf1X59PUZam2qbAfskx2gQr.jpg"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "חדשות טובות על הגיהנום", "duration_he": "57 דק'", "overview_he": "מארק מקודם לראש מחלקת זיקוק נתונים ומקבל לעבודה את הללי המרדנית."},
                    {"episode": 2, "title_he": "חצי לולאה", "duration_he": "53 דק'", "overview_he": "הללי מנסה למצוא דרך לשלוח מסר אל האני החיצוני שלה למרות מערכות האבטחה."},
                    {"episode": 3, "title_he": "בנצחון", "duration_he": "55 דק'", "overview_he": "פיטי יוצר קשר עם מארק בעולם החיצון וחושף סודות מטרידים על קומת הניתוק."},
                    {"episode": 4, "title_he": "האתה שאתה", "duration_he": "48 דק'", "overview_he": "הצוות מגלה מחלקה נוספת במסדרונות האינסופיים של לומון."},
                ],
            },
            {
                "season": 2,
                "name_he": "עונה 2",
                "episodes": [
                    {"episode": 1, "title_he": "שלום, גברת קובל", "duration_he": "58 דק'", "overview_he": "מארק חוזר לקומת הניתוק אחרי אירועי ההתעוררות ומגלה מציאות חדשה."},
                    {"episode": 2, "title_he": "להתראות, גברת סלוויג", "duration_he": "54 דק'", "overview_he": "השלכות מרד ההתעוררות בעולם החיצון נחשפות במלואן."},
                ],
            },
        ],
    },
    {
        "id": "tt0903747",
        "imdb_id": "tt0903747",
        "tmdb_id": 1396,
        "type": "series",
        "title_he": "שובר שורות",
        "title_en": "Breaking Bad",
        "year": 2008,
        "imdb_rating": 9.5,
        "age_rating": "18+",
        "runtime_he": "5 עונות • 62 פרקים",
        "quality": "1080p Full HD",
        "audio": "DTS-HD 5.1",
        "seeders": 2890,
        "top10_rank": 6,
        "trailer_yt_id": "HhesaQXLuRY",
        "director_he": "וינס גיליגאן",
        "cast_he": "בריאן קרנסטון, אהרון פול, אנה גאן, בוב אודנקירק",
        "genres": ["crime", "drama"],
        "genres_he": ["פשע", "דרמה ומתח"],
        "overview_he": "מורה לכימיה בתיכון המאובחן בסרטן ריאות מתקדם חובר לתלמיד לשעבר כדי לייצר ולהפיץ מתאמפטמין טהור במטרה להבטיח את עתידה הכלכלי של משפחתו.",
        "poster": "https://images.metahub.space/poster/medium/tt0903747/img",
        "backdrop": "https://images.metahub.space/background/medium/tt0903747/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt0903747/img",
            "https://image.tmdb.org/t/p/w780/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "פיילוט — נקודת מפנה", "duration_he": "58 דק'", "overview_he": "וולטר ווייט מקבל אבחנה רפואית משנת חיים ומחליט לנצל את הידע הכימי שלו."},
                    {"episode": 2, "title_he": "החתול בשק", "duration_he": "48 דק'", "overview_he": "וולט וג'סי מתמודדים עם ההשלכות של העסקה הראשונה שלהם במדבר."},
                    {"episode": 3, "title_he": "והשק בנהר", "duration_he": "48 דק'", "overview_he": "וולטר נאלץ לקבל החלטה מוסרית גורלית מול קרייזי-8."},
                ],
            },
            {
                "season": 2,
                "name_he": "עונה 2",
                "episodes": [
                    {"episode": 1, "title_he": "שבע שלושים ושבע", "duration_he": "47 דק'", "overview_he": "וולט מחשב כמה כסף בדיוק הוא צריך להשאיר למשפחתו לפני שיהיה מאוחר מדי."},
                    {"episode": 2, "title_he": "צלוי על הגריל", "duration_he": "48 דק'", "overview_he": "טוקו חוטף את וולט וג'סי אל מחבוא מבודד בלב המדבר."},
                ],
            },
        ],
    },
    {
        "id": "tt4565380",
        "imdb_id": "tt4565380",
        "tmdb_id": 62320,
        "type": "series",
        "title_he": "פאודה",
        "title_en": "Fauda",
        "year": 2015,
        "imdb_rating": 8.3,
        "age_rating": "16+",
        "runtime_he": "4 עונות • 48 פרקים",
        "quality": "1080p Full HD",
        "audio": "עברית 5.1",
        "seeders": 1320,
        "is_israeli": True,
        "trailer_yt_id": "abkeb93s9CE",
        "director_he": "ליאור רז, אבי יששכרוף",
        "cast_he": "ליאור רז, איציק כהן, רונה-לי שמעון, עידן עמדי",
        "genres": ["israeli", "action", "drama"],
        "genres_he": ["יצירה ישראלית", "אקשן", "דרמה"],
        "overview_he": "דורון, מפקד צוות מסתערבים לשעבר, חוזר לפעילות מבצעית מורכבת כדי ללכוד מבוקש בכיר שכולם האמינו כי חוסל לפני שנים.",
        "poster": "https://images.metahub.space/poster/medium/tt4565380/img",
        "backdrop": "https://images.metahub.space/background/medium/tt4565380/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt4565380/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "החזרה לשטח", "duration_he": "42 דק'", "overview_he": "דורון קביליו מצטרף מחדש ליחידת המסתערבים בעקבות מידע מודיעיני דרמטי."},
                    {"episode": 2, "title_he": "חתונת דמים", "duration_he": "44 דק'", "overview_he": "הצוות מסתערב בחתונה משפחתית בניסיון ללכוד את אבו-אחמד."},
                    {"episode": 3, "title_he": "פעולת תגמול", "duration_he": "43 דק'", "overview_he": "המתח ביחידה גובר כאשר הגבול בין נקמה אישית למשימה מבצעית מטשטש."},
                ],
            },
            {
                "season": 4,
                "name_he": "עונה 4",
                "episodes": [
                    {"episode": 1, "title_he": "מרדף בבריסל", "duration_he": "49 דק'", "overview_he": "דורון יוצא למשימת אבטחה בבלגיה שמתפתחת למבצע בינלאומי חוצה גבולות."},
                    {"episode": 2, "title_he": "אות חיים", "duration_he": "47 דק'", "overview_he": "הצוות מתגייס במלוא הכוח למשימת חילוץ מורכבת תחת אש."},
                ],
            },
        ],
    },
    {
        "id": "tt10574558",
        "imdb_id": "tt10574558",
        "tmdb_id": 103666,
        "type": "series",
        "title_he": "טהרן",
        "title_en": "Tehran",
        "year": 2020,
        "imdb_rating": 7.6,
        "age_rating": "16+",
        "runtime_he": "3 עונות • 24 פרקים",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 980,
        "is_israeli": True,
        "trailer_yt_id": "Hm_v0i12X3g",
        "director_he": "משה זונדר, דני סירקין",
        "cast_he": "ניב סולטן, שון טאוב, מנשה נוי, לירז צ'רכי, יו לורי",
        "genres": ["israeli", "drama", "action"],
        "genres_he": ["יצירה ישראלית", "מתח וריגול", "דרמה"],
        "overview_he": "תמר רביניאן, האקרית ולוחמת סייבר צעירה במוסד, מוחדרת בזהות בדויה לבירת איראן למשימה מסוכנת של השבתת מערכות המכ\"ם.",
        "poster": "https://images.metahub.space/poster/medium/tt10574558/img",
        "backdrop": "https://images.metahub.space/background/medium/tt10574558/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt10574558/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "נחיתת חירום בטהרן", "duration_he": "50 דק'", "overview_he": "תמר מחליפה זהות עם דיילת מקומית ומתחילה את המבצע החשאי."},
                    {"episode": 2, "title_he": "מרדף ברחובות הבירה", "duration_he": "47 דק'", "overview_he": "פראז כמאלי ממשמרות המהפכה עולה על עקבותיה של הסוכנת הישראלית."},
                ],
            },
        ],
    },
    {
        "id": "tt9140560",
        "imdb_id": "tt9140560",
        "tmdb_id": 82684,
        "type": "series",
        "title_he": "קופה ראשית",
        "title_en": "Checkout (Kupa Rashit)",
        "year": 2018,
        "imdb_rating": 8.8,
        "age_rating": "לכל המשפחה",
        "runtime_he": "5 עונות • 95 פרקים",
        "quality": "1080p HD",
        "audio": "עברית מקורית",
        "seeders": 1120,
        "is_israeli": True,
        "trailer_yt_id": "c7tOAGY59uQ",
        "director_he": "נדב פרישמן, יניב זוהר",
        "cast_he": "קרן מור, נועה קולר, דב נבון, אמיר שורוש, יניב סוויסה",
        "genres": ["israeli", "comedy"],
        "genres_he": ["יצירה ישראלית", "קומדיה"],
        "overview_he": "קומדיה מוקומנטרית ישראלית קורעת מצחוק המלווה את העובדים והלקוחות הצבעוניים בסניף יבנה של רשת המרכולים 'שפע יששכר'.",
        "poster": "https://images.metahub.space/poster/medium/tt9140560/img",
        "backdrop": "https://images.metahub.space/background/medium/tt9140560/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt9140560/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "שירה נכנסת לתפקיד", "duration_he": "28 דק'", "overview_he": "שירה שטיינבוך מנסה להנהיג סטנדרטים של ניהול מודרני בסניף יבנה."},
                    {"episode": 2, "title_he": "ראמזי והעגלות", "duration_he": "27 דק'", "overview_he": "ראמזי יוצא למבצע מיוחד להשבת עגלות סופר אבודות ברחבי העיר."},
                ],
            },
        ],
    },
    {
        "id": "tt1339634",
        "imdb_id": "tt1339634",
        "tmdb_id": 31356,
        "type": "series",
        "title_he": "הבורר",
        "title_en": "Ha-Borer (The Arbitrator)",
        "year": 2007,
        "imdb_rating": 8.4,
        "age_rating": "16+",
        "runtime_he": "4 עונות • 45 פרקים",
        "quality": "1080p HD",
        "audio": "עברית מקורית",
        "seeders": 870,
        "is_israeli": True,
        "trailer_yt_id": "r6Z8y3M5X0k",
        "director_he": "שי כנות, רשף לוי",
        "cast_he": "משה איבגי, יהודה לוי, שלום מיכאלשווילי, חנה אזולאי-הספרי",
        "genres": ["israeli", "crime", "drama"],
        "genres_he": ["יצירה ישראלית", "פשע", "דרמה"],
        "overview_he": "עובד סוציאלי צעיר ושומר חוק מגלה שהוא בנו המאומץ של ברוך אסולין — 'הבורר' — ראש משפחת הפשע החזקה בישראל, ונשאב אל תוך העולם התחתון.",
        "poster": "https://images.metahub.space/poster/medium/tt1339634/img",
        "backdrop": "https://images.metahub.space/background/medium/tt1339634/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt1339634/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "דם סמיך ממים", "duration_he": "46 דק'", "overview_he": "נדב פלדמן מגלה את זהות אביו הביולוגי בעקבות ניסיון התנקשות בבורר."},
                    {"episode": 2, "title_he": "פסק הבוררות", "duration_he": "45 דק'", "overview_he": "נדב נאלץ להכריע בסכסוך מסוכן כדי להציל את חיי משפחתו."},
                ],
            },
        ],
    },
    {
        "id": "tt3581920",
        "imdb_id": "tt3581920",
        "tmdb_id": 100088,
        "type": "series",
        "title_he": "האחרונים מבינינו",
        "title_en": "The Last of Us",
        "year": 2023,
        "imdb_rating": 8.7,
        "age_rating": "16+",
        "runtime_he": "2 עונות • 16 פרקים",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 2140,
        "trailer_yt_id": "uLtkt8BonwM",
        "director_he": "קרייג מאזין, ניל דרוקמן",
        "cast_he": "פדרו פסקל, בלה רמזי, גבריאל לונה",
        "genres": ["drama", "action", "scifi"],
        "genres_he": ["דרמה", "אקשן", "מדע בדיוני"],
        "overview_he": "עשרים שנה לאחר שמגפה פטרייתית החריבה את הציוויליזציה המודרנית, ג'ואל הקשוח נשכר להבריח את אלי בת ה-14 מחוץ לאזור הסגר צבאי במסע חוצה אמריקה.",
        "poster": "https://images.metahub.space/poster/medium/tt3581920/img",
        "backdrop": "https://images.metahub.space/background/medium/tt3581920/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt3581920/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "כשהלכת לאיבוד בחשיכה", "duration_he": "81 דק'", "overview_he": "פרוץ המגפה העולמית והמפגש הגורלי בין ג'ואל לאלי בבוסטון."},
                    {"episode": 2, "title_he": "נגועים", "duration_he": "53 דק'", "overview_he": "ג'ואל, טס ואלי חוצים את הריסות העיר השורצות נגועים."},
                ],
            },
        ],
    },
    {
        "id": "tt11198330",
        "imdb_id": "tt11198330",
        "tmdb_id": 94997,
        "type": "series",
        "title_he": "בית הדרקון",
        "title_en": "House of the Dragon",
        "year": 2022,
        "imdb_rating": 8.4,
        "age_rating": "18+",
        "runtime_he": "2 עונות • 18 פרקים",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1920,
        "trailer_yt_id": "DotnJ7tTA34",
        "director_he": "ראיין קונדל, ג'ורג' ר. ר. מרטין",
        "cast_he": "מאט סמית', אמה ד'ארסי, אוליביה קוק, ריס איפאנס",
        "genres": ["scifi", "action", "drama"],
        "genres_he": ["פנטזיה", "אקשן", "דרמה"],
        "overview_he": "מאתיים שנה לפני אירועי 'משחקי הכס', שושלת טארגאריין נמצאת בשיא כוחה עם עשרות דרקונים, אך מלחמת ירושה פנימית על כס הברזל מאיימת לקרוע את הממלכה.",
        "poster": "https://images.metahub.space/poster/medium/tt11198330/img",
        "backdrop": "https://images.metahub.space/background/medium/tt11198330/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt11198330/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "יורשי הדרקון", "duration_he": "66 דק'", "overview_he": "המלך וייסריז עורך טורניר מלכותי ונאלץ לבחור יורשת חדשה לכס הברזל."},
                    {"episode": 2, "title_he": "הנסיך הסורר", "duration_he": "54 דק'", "overview_he": "דיימון מתבצר בדרגונסטון וגונב ביצת דרקון מלכותית."},
                ],
            },
        ],
    },
    {
        "id": "tt14688458",
        "imdb_id": "tt14688458",
        "tmdb_id": 125988,
        "type": "series",
        "title_he": "סילו",
        "title_en": "Silo",
        "year": 2023,
        "imdb_rating": 8.1,
        "age_rating": "14+",
        "runtime_he": "2 עונות • 20 פרקים",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 1410,
        "trailer_yt_id": "8ZYhuvIv1pA",
        "director_he": "גרהם יוסט",
        "cast_he": "רבקה פרגוסון, טים רובינס, קומון, הארייט וולטר",
        "genres": ["scifi", "drama", "crime"],
        "genres_he": ["מדע בדיוני", "דרמה", "מסתורין"],
        "overview_he": "בעתיד דיסטופי ורעיל, עשרת אלפים בני האדם האחרונים חיים בממגורה תת-קרקעית עצומה בעומק 144 קומות, מבלי לדעת מי בנה אותה ולמה כל מי שמנסה לצאת החוצה מת.",
        "poster": "https://images.metahub.space/poster/medium/tt14688458/img",
        "backdrop": "https://images.metahub.space/background/medium/tt14688458/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt14688458/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "יום החירות", "duration_he": "59 דק'", "overview_he": "השריף של הסילו מתחיל לחשוד שהאמת על העולם החיצון הוסתרה מהתושבים."},
                    {"episode": 2, "title_he": "הולסטון", "duration_he": "48 דק'", "overview_he": "ג'ולייט ניקולס, מהנדסת הגנרטור הראשי, חוקרת מוות מסתורי בעומק הסילו."},
                ],
            },
        ],
    },
    {
        "id": "tt4574334",
        "imdb_id": "tt4574334",
        "tmdb_id": 66732,
        "type": "series",
        "title_he": "דברים מוזרים",
        "title_en": "Stranger Things",
        "year": 2016,
        "imdb_rating": 8.7,
        "age_rating": "14+",
        "runtime_he": "4 עונות • 34 פרקים",
        "quality": "1080p Full HD",
        "audio": "Dolby Atmos",
        "seeders": 2050,
        "trailer_yt_id": "b9EkMc79ZSU",
        "director_he": "האחים דאפר",
        "cast_he": "מילי בובי בראון, וינונה ריידר, דייוויד הארבור, פין וולפהארד",
        "genres": ["scifi", "drama", "action"],
        "genres_he": ["מדע בדיוני", "דרמה", "מתח"],
        "overview_he": "היעלמותו המסתורית של ילד בעיירה קטנה באינדיאנה חושפת ניסויים ממשלתיים סודיים, כוחות על-טבעיים מצמררים וילדה בעלת כוחות טלקינטיים יוצאי דופן.",
        "poster": "https://images.metahub.space/poster/medium/tt4574334/img",
        "backdrop": "https://images.metahub.space/background/medium/tt4574334/img",
        "gallery": [
            "https://images.metahub.space/background/medium/tt4574334/img"
        ],
        "seasons": [
            {
                "season": 1,
                "name_he": "עונה 1",
                "episodes": [
                    {"episode": 1, "title_he": "היעלמותו של ויל באיירז", "duration_he": "49 דק'", "overview_he": "ויל נעלם בדרכו הביתה ממשחק מבוכים ודרקונים עם חבריו."},
                    {"episode": 2, "title_he": "המוזרה מרחוב מייפל", "duration_he": "55 דק'", "overview_he": "החבורה פוגשת ביער ילדה מסתורית עם המספר 011 מקועקע על זרועה."},
                ],
            },
        ],
    },
]

LIVE_CHANNELS: List[Dict[str, Any]] = [
    {
        "id": "il_kan11",
        "imdb_id": "il_kan11",
        "type": "live",
        "channel_number": 11,
        "logo_text": "כאן 11",
        "title_he": "כאן 11 — תאגיד השידור הישראלי",
        "title_en": "KAN 11 Live HD",
        "category_he": "עידן+ ישראל",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — מהדורת חדשות ותוכניות מקור",
        "next_playing_he": "המרדף / דוקו כאן 11",
        "progress_pct": 64,
        "overview_he": "שידור חי ישיר של ערוץ כאן 11 מתאגיד השידור הישראלי — חדשות, תחקירים, סדרות דרמה ישראליות, דוקו ושידורי ספורט ב-Full HD.",
        "hls_url": "https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/293/index.m3u8",
    },
    {
        "id": "il_keshet12",
        "imdb_id": "il_keshet12",
        "type": "live",
        "channel_number": 12,
        "logo_text": "קשת 12",
        "title_he": "קשת 12 — שידור חי HD",
        "title_en": "Keshet 12 Live",
        "category_he": "עידן+ ישראל",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — חדשות 12 ותוכניות פריים-טיים",
        "next_playing_he": "ארץ נהדרת / עובדה / הכוכב הבא",
        "progress_pct": 48,
        "overview_he": "שידור חי ישיר של ערוץ קשת 12 — חדשות 12, ארץ נהדרת, הכוכב הבא, עובדה, מאסטר שף ודרמות מקור.",
        "hls_url": "http://stream.mcquack.net/294/index.m3u8",
        "backup_hls_url": "https://d2dffl3588mvfk.cloudfront.net/out/v1/d8e15050ca4148aab0ee387a5e2eb46b/index_1.m3u8",
    },
    {
        "id": "il_reshet13",
        "imdb_id": "il_reshet13",
        "type": "live",
        "channel_number": 13,
        "logo_text": "רשת 13",
        "title_he": "רשת 13 — שידור חי HD",
        "title_en": "Reshet 13 Live",
        "category_he": "עידן+ ישראל",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — חדשות 13, הצינור ופריים-טיים",
        "next_playing_he": "משחקי השף / האח הגדול / הישרדות",
        "progress_pct": 72,
        "overview_he": "שידור חי ישיר של ערוץ רשת 13 — חדשות 13, הצינור, האח הגדול, הישרדות, משחקי השף ותוכניות תחקיר.",
        "hls_url": "http://stream.mcquack.net/295/index.m3u8",
        "backup_hls_url": "https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8",
    },
    {
        "id": "il_now14",
        "imdb_id": "il_now14",
        "type": "live",
        "channel_number": 14,
        "logo_text": "ערוץ 14",
        "title_he": "עכשיו 14 — שידור חי HD",
        "title_en": "Now 14 Israel",
        "category_he": "עידן+ ישראל",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — חדשות 14 והפטריוטים",
        "next_playing_he": "אולפן פתוח וחדשות הלילה",
        "progress_pct": 55,
        "overview_he": "שידור חי ישיר מערוץ עכשיו 14 — חדשות, הפטריוטים, אקטואליה, ראיונות ופרשנויות מסביב לשעון.",
        "hls_url": "https://r.il.cdn-redge.media/livehls/oil/ch14/live/ch14/live.livx/playlist.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/293/index.m3u8",
    },
    {
        "id": "il_i24news",
        "imdb_id": "il_i24news",
        "type": "live",
        "channel_number": 15,
        "logo_text": "i24",
        "title_he": "i24NEWS עברית — חדשות מסביב לשעון",
        "title_en": "i24NEWS Hebrew Live",
        "category_he": "חדשות ואקטואליה",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי מאולפני נמל יפו — משדר חדשות מיוחד",
        "next_playing_he": "המזרח התיכון הערב",
        "progress_pct": 38,
        "overview_he": "ערוץ החדשות הבינלאומי i24NEWS בעברית בשידור חי ישיר מאולפני נמל יפו — דיווחים מיוחדים מהארץ ומהעולם.",
        "hls_url": "https://i24newshebrew-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8",
        "backup_hls_url": "https://i24newsenglish-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8",
    },
    {
        "id": "il_hot_drama",
        "imdb_id": "il_hot_drama",
        "type": "live",
        "channel_number": 16,
        "logo_text": "HOT Drama",
        "title_he": "הוט דרמה (HOT Drama HD) — סרטים ודרמות",
        "title_en": "HOT Drama HD Live",
        "category_he": "סרטים וסדרות",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — קולנוע ודרמות מובחרות ב-Full HD",
        "next_playing_he": "הקרנת בכורה קולנועית",
        "progress_pct": 51,
        "overview_he": "שידור חי רציף של ערוץ HOT Drama ב-1080p — סרטי דרמה, קולנוע בינלאומי וסדרות מובחרות.",
        "hls_url": "http://stream.mcquack.net/381/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/379/index.m3u8",
    },
    {
        "id": "il_hot_zone",
        "imdb_id": "il_hot_zone",
        "type": "live",
        "channel_number": 17,
        "logo_text": "HOT Zone",
        "title_he": "הוט זון (HOT Zone HD) — אקשן ומתח",
        "title_en": "HOT Zone HD Live",
        "category_he": "סרטים וסדרות",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — סדרות וסרטי אקשן, פשע ומתח",
        "next_playing_he": "מרתון אקשן לילי",
        "progress_pct": 63,
        "overview_he": "שידור חי של ערוץ HOT Zone ב-1080p — מיטב סדרות הפשע, המתח והאקשן מסביב לשעון.",
        "hls_url": "http://stream.mcquack.net/379/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/380/index.m3u8",
    },
    {
        "id": "il_yes_action",
        "imdb_id": "il_yes_action",
        "type": "live",
        "channel_number": 18,
        "logo_text": "yes Action",
        "title_he": "יס אקשן (Yes Movies Action HD)",
        "title_en": "Yes Movies Action HD",
        "category_he": "סרטים וסדרות",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — שוברי קופות וסרטי אקשן ב-Full HD",
        "next_playing_he": "שובר קופות הוליוודי",
        "progress_pct": 44,
        "overview_he": "שידור חי ישיר של ערוץ Yes Movies Action ב-1080p — סרטי אקשן, הרפתקאות ומדע בדיוני מסביב לשעון.",
        "hls_url": "http://stream.mcquack.net/380/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/379/index.m3u8",
    },
    {
        "id": "il_comedy",
        "imdb_id": "il_comedy",
        "type": "live",
        "channel_number": 20,
        "logo_text": "קומדיה",
        "title_he": "ערוץ הקומדיה הישראלי — סטנדאפ ובידור HD",
        "title_en": "Israel Comedy Channel HD",
        "category_he": "בידור וקומדיה",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — מופעי סטנדאפ וקומדיות ישראליות",
        "next_playing_he": "מרתון סטנדאפ ישראלי",
        "progress_pct": 59,
        "overview_he": "שידור חי ישיר של ערוץ הקומדיה — מיטב הקומדיות, מופעי הסטנדאפ ותוכניות הבידור של ישראל ב-1080p.",
        "hls_url": "https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8",
        "backup_hls_url": "https://d2dffl3588mvfk.cloudfront.net/out/v1/d8e15050ca4148aab0ee387a5e2eb46b/index_1.m3u8",
    },
    {
        "id": "il_kan_edu",
        "imdb_id": "il_kan_edu",
        "type": "live",
        "channel_number": 23,
        "logo_text": "חינוכית 23",
        "title_he": "כאן חינוכית 23 — ילדים, נוער ומדע",
        "title_en": "KAN Educational 23",
        "category_he": "ילדים ומשפחה",
        "quality": "720p HD",
        "now_playing_he": "שידור חי — סדרות מקור לילדים, נוער ומדע",
        "next_playing_he": "ילדי בית העץ / גלילאו",
        "progress_pct": 42,
        "overview_he": "שידור חי ישיר של כאן חינוכית (ערוץ 23) — סדרות מקור זוכות פרסים לילדים ולנוער, תוכניות מדע והיסטוריה.",
        "hls_url": "http://stream.mcquack.net/378/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/44/index.m3u8",
    },
    {
        "id": "il_ch24",
        "imdb_id": "il_ch24",
        "type": "live",
        "channel_number": 24,
        "logo_text": "ערוץ 24",
        "title_he": "ערוץ 24 — מוזיקה ובידור ישראלי HD",
        "title_en": "Channel 24 Israel Live",
        "category_he": "מוזיקה ובידור",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — להיטים ישראליים והופעות חיות",
        "next_playing_he": "אולפן מוזיקה חי",
        "progress_pct": 67,
        "overview_he": "שידור חי ישיר של ערוץ 24 ומוזיקה ים-תיכונית ב-1080p — קליפים, הופעות חיות ותוכניות בידור ישראליות.",
        "hls_url": "http://stream.mcquack.net/42/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/46/index.m3u8",
    },
    {
        "id": "il_viva_reality",
        "imdb_id": "il_viva_reality",
        "type": "live",
        "channel_number": 26,
        "logo_text": "ויוה +",
        "title_he": "ויוה פרימיום & ערוץ הריאליטי HD",
        "title_en": "Viva Premium & Reality HD",
        "category_he": "בידור ודרמות",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — דרמות יומיות ותוכניות ריאליטי",
        "next_playing_he": "פרק בכורה יומי",
        "progress_pct": 53,
        "overview_he": "שידור חי ישיר של ערוץ ויוה פרימיום וערוץ הריאליטי הישראלי באיכות 1080p Full HD.",
        "hls_url": "http://stream.mcquack.net/43/index.m3u8",
        "backup_hls_url": "https://d2dffl3588mvfk.cloudfront.net/out/v1/d8e15050ca4148aab0ee387a5e2eb46b/index_1.m3u8",
    },
    {
        "id": "il_docu_discovery",
        "imdb_id": "il_docu_discovery",
        "type": "live",
        "channel_number": 40,
        "logo_text": "Discovery",
        "title_he": "Discovery & NatGeo HD — מדע, טבע ודוקו",
        "title_en": "Discovery & National Geographic Live",
        "category_he": "דוקו וטבע",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — מסעות טבע, מדע והנדסה עולמית",
        "next_playing_he": "נשיונל ג'יאוגרפיק — חיות בר",
        "progress_pct": 49,
        "overview_he": "שידור חי רציף של ערוצי Discovery Channel ו-National Geographic באיכות 1080p HD.",
        "hls_url": "http://stream.mcquack.net/177/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/116/index.m3u8",
    },
    {
        "id": "il_sport5",
        "imdb_id": "il_sport5",
        "type": "live",
        "channel_number": 55,
        "logo_text": "SPORT HD",
        "title_he": "שידורי ספורט HD — כדורגל אירופי, NBA ו-UFC",
        "title_en": "Setanta Sports 1 & 2 Live 1080p",
        "category_he": "ספורט",
        "quality": "1080p Full HD",
        "now_playing_he": "שידור חי — כדורגל אירופי, ליגות בכירות וספורט עולמי",
        "next_playing_he": "שידור ישיר — משחק מרכזי",
        "progress_pct": 81,
        "overview_he": "שידורי ספורט חיים באיכות 1080p Full HD — ליגות הכדורגל הבכירות באירופה, כדורסל, UFC וטניס.",
        "hls_url": "http://stream.mcquack.net/234/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/235/index.m3u8",
    },
    {
        "id": "il_kids_hop",
        "imdb_id": "il_kids_hop",
        "type": "live",
        "channel_number": 80,
        "logo_text": "הופ! / ZOOM",
        "title_he": "ערוץ הופ! ו-ZOOM — ילדים ונוער בשידור חי",
        "title_en": "Hop! & Zoom Kids Israel Live",
        "category_he": "ילדים ומשפחה",
        "quality": "1080p HD",
        "now_playing_he": "שידור חי — תוכניות ילדים, אנימציה והרפתקאות",
        "next_playing_he": "רצועת אחר הצהריים לילדים",
        "progress_pct": 35,
        "overview_he": "שידור חי ישיר של ערוץ הופ! וערוץ ZOOM לילדים ולנוער בעברית.",
        "hls_url": "http://stream.mcquack.net/44/index.m3u8",
        "backup_hls_url": "http://stream.mcquack.net/377/index.m3u8",
    },
    {
        "id": "il_knesset99",
        "imdb_id": "il_knesset99",
        "type": "live",
        "channel_number": 99,
        "logo_text": "כנסת 99",
        "title_he": "ערוץ הכנסת 99 — שידור ישיר מהמשכן",
        "title_en": "Knesset Channel 99",
        "category_he": "עידן+ ישראל",
        "quality": "720p HD",
        "now_playing_he": "שידור חי ממליאת הכנסת, ועדות המשכן ואולפן פתוח",
        "next_playing_he": "סיכום היום הפוליטי מירושלים",
        "progress_pct": 60,
        "overview_he": "שידורים ישירים ממליאת הכנסת, דיוני הוועדות ותוכניות אקטואליה פוליטית מירושלים.",
        "hls_url": "http://stream.mcquack.net/48/index.m3u8",
        "backup_hls_url": "https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8",
    },
]


def _load_translation_cache() -> Dict[str, str]:
    with _CACHE_LOCK:
        if os.path.exists(TRANSLATION_CACHE_PATH):
            try:
                with open(TRANSLATION_CACHE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    return data
            except Exception:
                pass
        return {}


def _save_translation_cache(cache: Dict[str, str]) -> None:
    with _CACHE_LOCK:
        try:
            with open(TRANSLATION_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
        except Exception:
            pass


OFFICIAL_HEBREW_TITLES_DICT: Dict[str, str] = {
    "dune: part two": "חולית: חלק שני",
    "dune: part one": "חולית: חלק ראשון",
    "dune": "חולית",
    "oppenheimer": "אופנהיימר",
    "interstellar": "בין כוכבים",
    "inception": "התחלה",
    "the dark knight": "האביר האפל",
    "the dark knight rises": "עלייתו של האביר האפל",
    "batman begins": "באטמן מתחיל",
    "the batman": "הבאטמן",
    "batman": "באטמן",
    "batman v superman: dawn of justice": "באטמן נגד סופרמן: שחר הצדק",
    "joker": "ג'וקר",
    "joker: folie à deux": "ג'וקר: טירוף בשניים",
    "the shawshank redemption": "חומות של תקווה",
    "the godfather": "הסנדק",
    "the godfather part ii": "הסנדק 2",
    "the godfather part iii": "הסנדק 3",
    "pulp fiction": "ספרות זולה",
    "fight club": "מועדון קרב",
    "forrest gump": "פורסט גאמפ",
    "the matrix": "מטריקס",
    "the matrix reloaded": "מטריקס רילודד",
    "the matrix revolutions": "מטריקס רבולושנס",
    "the matrix resurrections": "מטריקס: התחייה",
    "goodfellas": "החבר'ה הטובים",
    "se7en": "שבעה חטאים",
    "the silence of the lambs": "שתיקת הכבשים",
    "parasite": "פרזיטים",
    "whiplash": "וויפלאש",
    "the prestige": "יוקרה",
    "the departed": "השתולים",
    "django unchained": "ג'אנגו ללא מעצורים",
    "the wolf of wall street": "הזאב מוול סטריט",
    "inglourious basterds": "ממזרים חסרי כבוד",
    "once upon a time in hollywood": "היו זמנים בהוליווד",
    "once upon a time... in hollywood": "היו זמנים בהוליווד",
    "kill bill: vol. 1": "להרוג את ביל: חלק 1",
    "kill bill: vol. 2": "להרוג את ביל: חלק 2",
    "shutter island": "שאטר איילנד",
    "memento": "ממנטו",
    "tenet": "טנט",
    "avengers: endgame": "הנוקמים: סוף המשחק",
    "avengers: infinity war": "הנוקמים: מלחמת האינסוף",
    "the avengers": "הנוקמים",
    "avengers: age of ultron": "הנוקמים: עידן אולטרון",
    "spider-man: no way home": "ספיידרמן: אין דרך הביתה",
    "spider-man: far from home": "ספיידרמן: רחוק מהבית",
    "spider-man: homecoming": "ספיידרמן: השיבה הביתה",
    "spider-man: into the spider-verse": "ספיידרמן: ממד העכביש",
    "spider-man: across the spider-verse": "ספיידרמן: ברחבי ממדי העכביש",
    "spider-man": "ספיידרמן",
    "spider-man 2": "ספיידרמן 2",
    "spider-man 3": "ספיידרמן 3",
    "iron man": "איירון מן",
    "iron man 2": "איירון מן 2",
    "iron man 3": "איירון מן 3",
    "captain america: the first avenger": "קפטן אמריקה",
    "captain america: the winter soldier": "קפטן אמריקה: חייל החורף",
    "captain america: civil war": "קפטן אמריקה: מלחמת האזרחים",
    "captain america: brave new world": "קפטן אמריקה: עולם חדש מופלא",
    "thor": "תור",
    "thor: ragnarok": "תור: ראגנארוק",
    "thor: love and thunder": "תור: אהבה ורעם",
    "black panther": "הפנתר השחור",
    "black panther: wakanda forever": "הפנתר השחור: וואקנדה לנצח",
    "guardians of the galaxy": "שומרי הגלקסיה",
    "guardians of the galaxy vol. 2": "שומרי הגלקסיה: חלק 2",
    "guardians of the galaxy vol. 3": "שומרי הגלקסיה: חלק 3",
    "deadpool": "דדפול",
    "deadpool 2": "דדפול 2",
    "deadpool & wolverine": "דדפול ווולברין",
    "logan": "לוגאן - וולברין",
    "doctor strange": "דוקטור סטריינג'",
    "top gun: maverick": "אהבה בשחקים: מאווריק",
    "top gun": "אהבה בשחקים",
    "avatar": "אווטאר",
    "avatar: the way of water": "אווטאר: דרכם של המים",
    "john wick": "ג'ון וויק",
    "john wick: chapter 2": "ג'ון וויק 2",
    "john wick: chapter 3 - parabellum": "ג'ון וויק 3: פרבלום",
    "john wick: chapter 4": "ג'ון וויק 4",
    "the fast and the furious": "מהיר ועצבני",
    "2 fast 2 furious": "מהיר ועצבני 2",
    "the fast and the furious: tokyo drift": "מהיר ועצבני 3: טוקיו דריפט",
    "fast & furious": "מהיר ועצבני 4",
    "fast five": "מהיר ועצבני 5",
    "fast & furious 6": "מהיר ועצבני 6",
    "furious 7": "מהיר ועצבני 7",
    "the fate of the furious": "מהיר ועצבני 8",
    "f9: the fast saga": "מהיר ועצבני 9",
    "fast x": "מהיר ועצבני 10",
    "fast & furious presents: hobbs & shaw": "מהיר ועצבני: הובס ושואו",
    "harry potter and the sorcerer's stone": "הארי פוטר ואבן החכמים",
    "harry potter and the philosopher's stone": "הארי פוטר ואבן החכמים",
    "harry potter and the chamber of secrets": "הארי פוטר וחדר הסודות",
    "harry potter and the prisoner of azkaban": "הארי פוטר והאסיר מאזקבאן",
    "harry potter and the goblet of fire": "הארי פוטר וגביע האש",
    "harry potter and the order of the phoenix": "הארי פוטר ומסדר עוף החול",
    "harry potter and the half-blood prince": "הארי פוטר והנסיך חצוי-הדם",
    "harry potter and the deathly hallows: part 1": "הארי פוטר ואוצרות המוות - חלק 1",
    "harry potter and the deathly hallows: part 2": "הארי פוטר ואוצרות המוות - חלק 2",
    "the lord of the rings: the fellowship of the ring": "שר הטבעות: אחוות הטבעת",
    "the lord of the rings: the two towers": "שר הטבעות: שני הצריחים",
    "the lord of the rings: the return of the king": "שר הטבעות: שיבת המלך",
    "mission: impossible": "משימה בלתי אפשרית",
    "mission: impossible - fallout": "משימה בלתי אפשרית: התרסקות",
    "mission: impossible - dead reckoning part one": "משימה בלתי אפשרית: נקמת מוות - חלק ראשון",
    "gladiator": "גלדיאטור",
    "gladiator ii": "גלדיאטור 2",
    "inside out": "הקול בראש",
    "inside out 2": "הקול בראש 2",
    "moana": "מואנה",
    "moana 2": "מואנה 2",
    "the lion king": "מלך האריות",
    "mufasa: the lion king": "מופאסה: מלך האריות",
    "sonic the hedgehog": "סוניק הקיפוד",
    "sonic the hedgehog 2": "סוניק הקיפוד 2",
    "sonic the hedgehog 3": "סוניק הקיפוד 3",
    "venom": "ונום",
    "venom: let there be carnage": "ונום 2",
    "venom: the last dance": "ונום: הריקוד האחרון",
    "wicked": "מרשעת",
    "anora": "אנורה",
    "conclave": "עד קצה העולם (קונקלווה)",
    "the brutalist": "הברוטליסט",
    "the substance": "יופי מסוכן",
    "nosferatu": "נוספרטו",
    "weapons": "שעת הנעלמים",
    "heretic": "פחד אלוהים",
    "presence": "נוכחות",
    "companion": "שותפה מושלמת",
    "the monkey": "הקוף",
    "black bag": "תיק שחור",
    "mickey 17": "מיקי 17",
    "novocaine": "חיוך ללא כאב",
    "sinners": "חוטאים",
    "a minecraft movie": "מיינקראפט: הסרט",
    "thunderbolts*": "ת'אנדרבולטס*",
    "the amateur": "החובבן",
    "working man": "איש עבודה",
    "a working man": "איש עבודה",
    "the accountant 2": "רואה החשבון 2",
    "until dawn": "עד עלות השחר",
    "drop": "שיחה לא מזוהה",
    "final destination: bloodlines": "יעד סופי: קשר דם",
    "mission: impossible - the final reckoning": "משימה בלתי אפשרית: חשבון אחרון",
    "28 years later": "28 שנים אחרי",
    "ballerina": "בלרינה",
    "how to train your dragon": "הדרקון הראשון שלי",
    "f1": "פורמולה 1: הסרט",
    "f1: the movie": "פורמולה 1: הסרט",
    "jurassic world rebirth": "עולם היורה: לידה מחדש",
    "the fantastic four: first steps": "ארבעת המופלאים: צעדים ראשונים",
    "freakier friday": "שישי הפוך 2",
    "nobody 2": "סתם אחד 2",
    "the conjuring: last rites": "לזמן את הרוע: טקסים אחרונים",
    "mortal kombat ii": "מורטל קומבט 2",
    "saw xi": "המסור 11",
    "the black phone 2": "בלאק-פון 2",
    "black phone 2": "בלאק-פון 2",
    "five nights at freddy's 2": "חמישה לילות אצל פרדי 2",
    "avatar: fire and ash": "אווטאר: אש ואפר",
    "the wild robot": "רוז הרובוטית",
    "a complete unknown": "אנונימי לגמרי",
    "babygirl": "בייביגירל",
    "better man": "בטר מן: סיפורו של רובי וויליאמס",
    "paddington in peru": "פדינגטון בג'ונגל",
    "trap": "מלכודת",
    "longlegs": "לונגלגס",
    "smile": "סמייל",
    "smile 2": "סמייל 2",
    "terrifier 2": "טריפייר 2",
    "terrifier 3": "טריפייר 3",
    "speak no evil": "אל תוציא מילה",
    "beetlejuice beetlejuice": "ביטלג'וס ביטלג'וס",
    "furiosa: a mad max saga": "פיוריוסה: סאגת מקס הזועם",
    "the fall guy": "הכפיל",
    "civil war": "הקרב על אמריקה",
    "challengers": "מתחרים",
    "anyone but you": "רק לא אתה",
    "it ends with us": "איתנו זה נגמר",
    "twisters": "טוויסטרס",
    "bad boys: ride or die": "בחורים רעים: הכל או כלום",
    "kingdom of the planet of the apes": "כוכב הקופים: ממלכה חדשה",
    "abigail": "אביגיל",
    "immaculate": "טהורה",
    "late night with the devil": "לילה עם השטן",
    "the first omen": "אות משמיים: ההתחלה",
    "tarot": "קלף מוות",
    "the strangers: chapter 1": "הזרים: חלק 1",
    "maxxxine": "מקסין",
    "cuckoo": "קוקו",
    "blink twice": "צאי מזה",
    "alien: earth": "הנוסע השמיני: כדור הארץ",
    "it: welcome to derry": "זה: ברוכים הבאים לדרי",
    "adolescence": "התבגרות",
    "the studio": "הסטודיו",
    "mobland": "מובלנד",
    "your friends & neighbors": "החברים והשכנים שלך",
    "the pitt": "הפיט",
    "paradise": "פרדייז",
    "zero day": "יום האפס",
    "running point": "בעלת הבית",
    "american primeval": "אמריקה הפראית",
    "landman": "לנדמן",
    "lioness": "לביאות",
    "special ops: lioness": "לביאות",
    "the day of the jackal": "יום התנים",
    "the agency": "הסוכנות",
    "dune: prophecy": "חולית: הנבואה",
    "agatha all along": "אגתה לאורך כל הדרך",
    "nobody wants this": "רק לא זה",
    "presumed innocent": "בחזקת חף מפשע",
    "dark matter": "חומר אפל",
    "3 body problem": "בעיית שלושת הגופים",
    "the gentlemen": "הג'נטלמנים",
    "baby reindeer": "אייל קטן",
    "ripley": "ריפלי",
    "mr. & mrs. smith": "מר וגברת סמית'",
    "masters of the air": "אדוני האוויר",
    "alien": "הנוסע השמיני",
    "aliens": "שובו של הנוסע השמיני",
    "alien: romulus": "הנוסע השמיני: רומולוס",
    "a quiet place": "מקום שקט",
    "a quiet place part ii": "מקום שקט 2",
    "a quiet place: day one": "מקום שקט: היום הראשון",
    "die hard": "מת לחיות",
    "the hangover": "בדרך לחתונה עוצרים בווגאס",
    "home alone": "שכחו אותי בבית",
    "back to the future": "בחזרה לעתיד",
    "jurassic park": "פארק היורה",
    "jurassic world": "עולם היורה",
    "terminator 2: judgment day": "שליחות קטלנית 2: יום הדין",
    "the terminator": "שליחות קטלנית",
    "breaking bad": "שובר שורות",
    "better call saul": "סמוך על סול",
    "game of thrones": "משחקי הכס",
    "house of the dragon": "בית הדרקון",
    "the sopranos": "הסופרנוס",
    "the wire": "הסמויה",
    "chernobyl": "צ'רנוביל",
    "band of brothers": "אחים לנשק",
    "stranger things": "דברים מוזרים",
    "severance": "ניתוק",
    "the last of us": "האחרונים מבינינו",
    "the bear": "הדוב",
    "shogun": "שוגון",
    "shōgun": "שוגון",
    "fallout": "פולאאוט",
    "silo": "סילו",
    "the white lotus": "הלוטוס הלבן",
    "succession": "יורשים",
    "fargo": "פארגו",
    "true detective": "בלש אמיתי",
    "peaky blinders": "כנופיית ברמינגהם (פיקי בליינדרז)",
    "black mirror": "מראה שחורה",
    "dark": "אפל (דארק)",
    "squid game": "משחק הדיונון",
    "the boys": "הבנים",
    "invincible": "בלתי מנוצח",
    "arcane": "ארקיין",
    "rick and morty": "ריק ומורטי",
    "the office": "המשרד",
    "friends": "חברים",
    "seinfeld": "סיינפלד",
    "dexter": "דקסטר",
    "prison break": "נמלטים",
    "lost": "אבודים",
    "sherlock": "שרלוק",
    "vikings": "ויקינגים",
    "narcos": "נרקוס",
    "money heist": "בית הנייר",
    "la casa de papel": "בית הנייר",
    "wednesday": "וונסדיי",
    "from": "אין מוצא (From)",
    "the penguin": "הפינגווין",
    "reacher": "ריצ'ר",
    "slow horses": "סוסים איטיים",
    "ted lasso": "טד לאסו",
    "the mandalorian": "המנדלוריאן",
    "andor": "אנדור",
    "daredevil": "דרדוויל",
    "daredevil: born again": "דרדוויל: נולד מחדש",
    "fauda": "פאודה",
    "tehran": "טהרן",
    "shtisel": "שטיסל",
    "yellowstone": "ילוסטון",
    "suits": "חליפות (Suits)",
    "house": "האוס",
    "grey's anatomy": "האנטומיה של גריי",
    "the walking dead": "המתים המהלכים",
    "ozark": "אוזרק",
    "lupin": "לופן",
    "one piece": "וואן פיס",
}

HEBREW_SEARCH_TO_ENGLISH_DICT: Dict[str, str] = {
    "מהיר ועצבני": "Fast & Furious",
    "מהיר": "Fast & Furious",
    "הארי פוטר": "Harry Potter",
    "שובר שורות": "Breaking Bad",
    "סמוך על סול": "Better Call Saul",
    "משחקי הכס": "Game of Thrones",
    "בית הדרקון": "House of the Dragon",
    "בית הנייר": "Money Heist",
    "דברים מוזרים": "Stranger Things",
    "האחרונים מבינינו": "The Last of Us",
    "משחק הדיונון": "Squid Game",
    "נמלטים": "Prison Break",
    "אבודים": "Lost",
    "חברים": "Friends",
    "סיינפלד": "Seinfeld",
    "המשרד": "The Office",
    "הסופרנוס": "The Sopranos",
    "הסמויה": "The Wire",
    "כנופיית ברמינגהם": "Peaky Blinders",
    "פיקי בליינדרז": "Peaky Blinders",
    "ויקינגים": "Vikings",
    "הנוקמים": "Avengers",
    "ספיידרמן": "Spider-Man",
    "איש העכביש": "Spider-Man",
    "באטמן": "Batman",
    "הבאטמן": "The Batman",
    "האביר האפל": "The Dark Knight",
    "סופרמן": "Superman",
    "איירון מן": "Iron Man",
    "דדפול": "Deadpool",
    "וולברין": "Wolverine",
    "אקס מן": "X-Men",
    "ג'ון וויק": "John Wick",
    "ג׳ון וויק": "John Wick",
    "גון וויק": "John Wick",
    "משימה בלתי אפשרית": "Mission: Impossible",
    "ג'יימס בונד": "James Bond",
    "שר הטבעות": "The Lord of the Rings",
    "ההוביט": "The Hobbit",
    "מלחמת הכוכבים": "Star Wars",
    "חולית": "Dune",
    "מטריקס": "The Matrix",
    "שליחות קטלנית": "Terminator",
    "הנוסע השמיני": "Alien",
    "פארק היורה": "Jurassic Park",
    "עולם היורה": "Jurassic World",
    "שודדי הקאריביים": "Pirates of the Caribbean",
    "צעצוע של סיפור": "Toy Story",
    "שרק": "Shrek",
    "לשבור את הקרח": "Frozen",
    "מלך האריות": "The Lion King",
    "קפטן אמריקה": "Captain America",
    "תור": "Thor",
    "שומרי הגלקסיה": "Guardians of the Galaxy",
    "הפנתר השחור": "Black Panther",
    "דוקטור סטריינג": "Doctor Strange",
    "רוקי": "Rocky",
    "קריד": "Creed",
    "רמבו": "Rambo",
    "מת לחיות": "Die Hard",
    "הסנדק": "The Godfather",
    "חומות של תקווה": "The Shawshank Redemption",
    "ספרות זולה": "Pulp Fiction",
    "מועדון קרב": "Fight Club",
    "בין כוכבים": "Interstellar",
    "התחלה": "Inception",
    "אופנהיימר": "Oppenheimer",
    "גלדיאטור": "Gladiator",
    "הזאב מוול סטריט": "The Wolf of Wall Street",
    "פאודה": "Fauda",
    "טהרן": "Tehran",
    "שטיסל": "Shtisel",
    "המתים המהלכים": "The Walking Dead",
    "האנטומיה של גריי": "Grey's Anatomy",
    "חליפות": "Suits",
    "ילוסטון": "Yellowstone",
    "מראה שחורה": "Black Mirror",
    "ניתוק": "Severance",
    "יורשים": "Succession",
    "הדוב": "The Bear",
    "הלוטוס הלבן": "The White Lotus",
    "ריק ומורטי": "Rick and Morty",
    "דקסטר": "Dexter",
    "נרקוס": "Narcos",
    "אוזרק": "Ozark",
    "הבנים": "The Boys",
    "וונסדיי": "Wednesday",
    "שוגון": "Shogun",
    "פולאאוט": "Fallout",
    "סילו": "Silo",
    "מקום שקט": "A Quiet Place",
    "לזמן את הרוע": "The Conjuring",
    "צעקה": "Scream",
    "מסור": "Saw",
    "הקול בראש": "Inside Out",
    "סוניק": "Sonic the Hedgehog",
    "מואנה": "Moana",
    "ונום": "Venom",
    "אווטאר": "Avatar",
    "אהבה בשחקים": "Top Gun",
    "בחזרה לעתיד": "Back to the Future",
    "שכחו אותי בבית": "Home Alone",
    "שעת הנעלמים": "Weapons",
    "פחד אלוהים": "Heretic",
    "שותפה מושלמת": "Companion",
    "יופי מסוכן": "The Substance",
    "חיוך ללא כאב": "Novocaine",
    "חוטאים": "Sinners",
    "שיחה לא מזוהה": "Drop",
    "רוז הרובוטית": "The Wild Robot",
    "הכפיל": "The Fall Guy",
    "הקרב על אמריקה": "Civil War",
    "אל תוציא מילה": "Speak No Evil",
}


def resolve_official_hebrew_title(name_en: str) -> str:
    """Resolves an English movie/series title to its authentic Israeli marketing Hebrew title without literal machine translation."""
    clean = (name_en or "").strip()
    if not clean:
        return ""
    if any("\u0590" <= ch <= "\u05FF" for ch in clean):
        return clean
    low = clean.lower().strip()
    if low in OFFICIAL_HEBREW_TITLES_DICT:
        return OFFICIAL_HEBREW_TITLES_DICT[low]
    # Check franchise prefixes so sequels translate accurately
    franchise_prefixes = [
        ("harry potter", "הארי פוטר"),
        ("fast & furious", "מהיר ועצבני"),
        ("the fast and the furious", "מהיר ועצבני"),
        ("john wick", "ג'ון וויק"),
        ("mission: impossible", "משימה בלתי אפשרית"),
        ("spider-man", "ספיידרמן"),
        ("avengers", "הנוקמים"),
        ("captain america", "קפטן אמריקה"),
        ("guardians of the galaxy", "שומרי הגלקסיה"),
        ("jurassic world", "עולם היורה"),
        ("jurassic park", "פארק היורה"),
        ("pirates of the caribbean", "שודדי הקאריביים"),
        ("the lord of the rings", "שר הטבעות"),
        ("the hobbit", "ההוביט"),
        ("star wars", "מלחמת הכוכבים"),
        ("transformers", "רובוטריקים"),
        ("toy story", "צעצוע של סיפור"),
        ("despicable me", "גנוב על הירח"),
        ("final destination", "יעד סופי"),
        ("scream", "צעקה"),
        ("the conjuring", "לזמן את הרוע"),
        ("insidious", "רוע טבעי"),
        ("terrifier", "טריפייר"),
        ("sonic the hedgehog", "סוניק הקיפוד"),
    ]
    for en_pref, he_pref in franchise_prefixes:
        if low.startswith(en_pref):
            rest = clean[len(en_pref):].strip(" :-–")
            if not rest:
                return he_pref
            if rest.isdigit() or rest in ("II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"):
                return f"{he_pref} {rest}"
            return f"{he_pref}: {rest}"
    return clean


def translate_query_he_to_en(query: str) -> str:
    """Translates a Hebrew search query to its exact English movie/series search term."""
    clean = (query or "").strip()
    if not clean:
        return ""
    if not any("\u0590" <= ch <= "\u05FF" for ch in clean):
        return clean
    norm = clean.replace("״", '"').replace("׳", "'").strip()
    if norm in HEBREW_SEARCH_TO_ENGLISH_DICT:
        return HEBREW_SEARCH_TO_ENGLISH_DICT[norm]
    # Check reverse lookup in OFFICIAL_HEBREW_TITLES_DICT
    for en_k, he_v in OFFICIAL_HEBREW_TITLES_DICT.items():
        he_norm = he_v.replace("״", '"').replace("׳", "'")
        if he_norm == norm or norm in he_norm:
            return en_k
    for he_k, en_v in HEBREW_SEARCH_TO_ENGLISH_DICT.items():
        if he_k in norm or norm in he_k:
            return en_v
    # Fallback to Google Translate iw -> en
    try:
        q = urllib.parse.quote(clean)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=en&dt=t&q={q}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            payload = json.loads(resp.read().decode("utf-8", errors="replace"))
        if isinstance(payload, list) and payload and isinstance(payload[0], list):
            en_text = "".join(part[0] for part in payload[0] if part and part[0]).strip()
            if en_text:
                return en_text
    except Exception:
        pass
    return clean


def translate_to_hebrew(text: str) -> str:
    """Translates English metadata strings to natural Hebrew with disk caching."""
    clean = (text or "").strip()
    if not clean:
        return ""
    if any("\u0590" <= ch <= "\u05FF" for ch in clean):
        return clean

    low = clean.lower().strip()
    if low in OFFICIAL_HEBREW_TITLES_DICT:
        return OFFICIAL_HEBREW_TITLES_DICT[low]

    cache = _load_translation_cache()
    if clean in cache:
        return cache[clean]

    try:
        q = urllib.parse.quote(clean)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=iw&dt=t&q={q}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            payload = json.loads(resp.read().decode("utf-8", errors="replace"))
        if isinstance(payload, list) and payload and isinstance(payload[0], list):
            translated = "".join(part[0] for part in payload[0] if part and part[0])
            if translated:
                cache[clean] = translated
                _save_translation_cache(cache)
                return translated
    except Exception:
        pass
    return clean


def ensure_catalog_json_exists(force: bool = False) -> None:
    """Writes `data/hebrew_catalog.json` to disk."""
    if force or not os.path.exists(CATALOG_JSON_PATH):
        payload = {
            "categories": CATEGORIES,
            "movies": MOVIES,
            "series": SERIES,
            "live_channels": LIVE_CHANNELS,
        }
        try:
            with open(CATALOG_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception:
            pass


def get_full_catalog() -> Dict[str, Any]:
    """Returns the complete Hebrew catalog dictionary."""
    ensure_catalog_json_exists(force=True)
    return {
        "categories": CATEGORIES,
        "movies": MOVIES,
        "series": SERIES,
        "live_channels": LIVE_CHANNELS,
    }


def _fetch_live_cinemeta_search(
    query: str, media_type: str = "movie", en_query_override: str = ""
) -> List[Dict[str, Any]]:
    """Queries live Stremio Cinemeta catalog using resolved English query and translates metadata to Hebrew."""
    en_query = en_query_override or translate_query_he_to_en(query)
    q_enc = urllib.parse.quote(en_query.strip())
    url = f"https://v3-cinemeta.strem.io/catalog/{media_type}/top/search={q_enc}.json"
    results: List[Dict[str, Any]] = []
    cache = _load_translation_cache()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "StreamIt/2.0"})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        metas = data.get("metas") or []
        for idx, m in enumerate(metas[:8]):
            imdb_id = str(m.get("imdb_id") or m.get("id") or "")
            if not imdb_id.startswith("tt"):
                continue
            name_en = str(m.get("name") or "").strip()
            if not name_en:
                continue
            raw_rating = m.get("imdbRating")
            # Filter out obscure unrated junk entries returned by Cinemeta (e.g. "Breaking Bad Wolf")
            if idx >= 2 and not raw_rating and name_en.lower() not in OFFICIAL_HEBREW_TITLES_DICT:
                continue

            desc_en = str(m.get("description") or "").strip()
            # Only perform live network translation for top 3 uncached titles to keep response <0.4s
            if name_en.lower() in OFFICIAL_HEBREW_TITLES_DICT or name_en in cache or idx < 3:
                title_he = resolve_official_hebrew_title(name_en)
            else:
                title_he = cache.get(name_en) or name_en

            raw_genres = m.get("genres") or []
            genres_he = [GENRE_EN_TO_HE.get(g, "דרמה") for g in raw_genres[:3]] or ["דרמה"]
            year_str = str(m.get("releaseInfo") or "2024")[:4]
            try:
                year_val = int(year_str)
            except ValueError:
                year_val = 2024
            try:
                rating_val = float(raw_rating or 7.8)
            except ValueError:
                rating_val = 7.8

            if desc_en and desc_en in cache:
                overview_he = cache[desc_en]
            else:
                overview_he = f"{title_he} ({year_val}) — זמין לצפייה ישירה ב-4K/1080p עם סנכרון כתוביות אוטומטי בעברית."

            backdrop = m.get("background") or f"https://images.metahub.space/background/medium/{imdb_id}/img"
            results.append(
                {
                    "id": imdb_id,
                    "imdb_id": imdb_id,
                    "type": media_type,
                    "title_he": title_he,
                    "title_en": name_en,
                    "year": year_val,
                    "imdb_rating": rating_val,
                    "age_rating": "14+",
                    "runtime_he": "שעתיים ו-10 דק'" if media_type == "movie" else "סדרה מלאה",
                    "quality": "1080p Full HD",
                    "audio": "Dolby Atmos",
                    "seeders": 940,
                    "genres": [str(g).lower() for g in raw_genres[:3]],
                    "genres_he": list(dict.fromkeys(genres_he)),
                    "overview_he": overview_he,
                    "poster": m.get("poster") or f"https://images.metahub.space/poster/medium/{imdb_id}/img",
                    "backdrop": backdrop,
                    "gallery": [backdrop],
                }
            )
    except Exception:
        pass
    return results


def _score_catalog_item_match(item: Dict[str, Any], q_low: str, en_low: str) -> int:
    """Computes strict relevance score for a catalog item against the user query."""
    if not q_low:
        return 100
    t_he = str(item.get("title_he") or "").lower().replace("׳", "'").replace("״", '"')
    t_en = str(item.get("title_en") or "").lower().replace("׳", "'").replace("״", '"')
    cast_he = str(item.get("cast_he") or "").lower()
    dir_he = str(item.get("director_he") or "").lower()
    year_str = str(item.get("year") or "")
    ov_he = str(item.get("overview_he") or "").lower()
    # Ignore boilerplate overview fallback
    if "זמין לצפייה ישירה" in ov_he:
        ov_he = ""

    score = 0
    for term in ({q_low, en_low} if en_low else {q_low}):
        if not term:
            continue
        if t_he == term or t_en == term:
            score = max(score, 1000)
        elif t_he.startswith(term) or t_en.startswith(term):
            score = max(score, 850)
        elif f" {term}" in f" {t_he} " or f" {term}" in f" {t_en} ":
            score = max(score, 720)
        elif len(term) >= 3 and (term in t_he or term in t_en):
            score = max(score, 580)
        elif year_str == term:
            score = max(score, 500)
        elif len(term) >= 3 and (term in cast_he or term in dir_he):
            score = max(score, 400)
        elif len(term) >= 4 and term in ov_he:
            score = max(score, 180)
    return score


def search_catalog(
    query: str = "",
    item_type: str = "all",
    genre: str = "all",
    sort_by: str = "popularity",
) -> Dict[str, Any]:
    """Searches local catalog with strict relevance ranking and enriches with live Cinemeta Hebrew-translated results."""
    cat = get_full_catalog()
    q_clean = (query or "").strip()
    q_low = q_clean.lower().replace("׳", "'").replace("״", '"')
    en_resolved = translate_query_he_to_en(q_clean) if q_clean else ""
    en_low = en_resolved.lower().replace("׳", "'").replace("״", '"')
    g_low = (genre or "all").strip().lower()
    t_low = (item_type or "all").strip().lower()

    pool: List[Dict[str, Any]] = []
    if t_low in ("all", "movie", "movies"):
        pool.extend(cat.get("movies") or [])
    if t_low in ("all", "series", "tv"):
        pool.extend(cat.get("series") or [])
    if t_low in ("all", "live", "channels"):
        pool.extend(cat.get("live_channels") or [])

    scored_matches: List[ Any ] = []
    seen_ids = set()

    for item in pool:
        if g_low and g_low not in ("all", "הכל"):
            g_list = [str(x).lower() for x in (item.get("genres") or []) + (item.get("genres_he") or [])]
            if not any(g_low in g for g in g_list):
                continue
        if q_low:
            sc = _score_catalog_item_match(item, q_low, en_low)
            if sc <= 0:
                continue
            scored_matches.append((sc, item))
        else:
            scored_matches.append((100, item))
        seen_ids.add(item.get("id"))

    if q_low and len(q_low) >= 2 and t_low in ("all", "movie", "movies", "series", "tv"):
        search_types = ["movie", "series"] if t_low == "all" else (["movie"] if "mov" in t_low else ["series"])
        for st in search_types:
            for remote_item in _fetch_live_cinemeta_search(q_clean, st, en_query_override=en_resolved):
                if remote_item["id"] not in seen_ids:
                    sc = _score_catalog_item_match(remote_item, q_low, en_low)
                    if sc <= 0:
                        sc = 450
                    scored_matches.append((sc, remote_item))
                    seen_ids.add(remote_item["id"])

    scored_matches.sort(key=lambda pair: (pair[0], float(pair[1].get("imdb_rating") or 7.5)), reverse=True)
    matched = [pair[1] for pair in scored_matches]

    return {
        "ok": True,
        "query": query,
        "resolved_en_query": en_resolved,
        "results": matched,
        "movies": [x for x in matched if x.get("type") == "movie"],
        "series": [x for x in matched if x.get("type") == "series"],
        "live_channels": [x for x in matched if x.get("type") == "live"],
        "total": len(matched),
    }


def get_item_meta(item_type: str, item_id: str) -> Optional[Dict[str, Any]]:
    """Returns full Hebrew metadata for any movie, series, or live channel."""
    cat = get_full_catalog()
    all_items = (cat.get("movies") or []) + (cat.get("series") or []) + (cat.get("live_channels") or [])
    for item in all_items:
        if item.get("id") == item_id or item.get("imdb_id") == item_id:
            return item
    return None


if __name__ == "__main__":
    ensure_catalog_json_exists(force=True)
    c = get_full_catalog()
    print(f"HebrewCatalogEngine v2 OK: {len(c['movies'])} movies, {len(c['series'])} series.")
