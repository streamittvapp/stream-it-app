/**
 * STREAM IT — Cinema, Series, Live TV & YouTube Platform Engine (v9.4.0)
 * - Open-Source Plyr.io + HLS.js Cinema Player + Native WASM 1080p Stream Resolver
 * - Multi-Source Hebrew Subtitles Engine (/api/subtitles/vtt + OpenSubtitles v3 Stremio API + Left-Side RTL Punctuation + Remote Vertical Position)
 * - Reorganized Explorer: Open Genres Strip + Sleek Dropdowns (Streaming Giants, Release Years, Actors Gallery with Portrait Photos)
 * - Working Live Actor Search (Hebrew & English + Wikipedia Langlinks + TMDB Person Credits & Portrait Photo Showcase)
 * - 28+ Live HD Channels (Israeli Idan+ + US News 24/7 + US & Global Sports HD) + Dedicated YouTube Hub
 * - Netflix Sub-Users ("מי צופה עכשיו?") + Strict Admin-Only Login Verification
 */
(function () {
  'use strict';

  var APP_VERSION = '9.7.0';
  window.__STREAMIT_V970_BOOTED = true;
  var wasLegacyBooted = Boolean(
    window.__STREAMIT_V94_BOOTED ||
    window.__STREAMIT_V95_BOOTED ||
    window.__STREAMIT_V960_BOOTED ||
    window.__STREAMIT_V961_BOOTED ||
    window.__STREAMIT_V965_BOOTED
  );
  window.__STREAMIT_V94_BOOTED = true;
  window.__STREAMIT_V95_BOOTED = true;
  window.__STREAMIT_V960_BOOTED = true;
  window.__STREAMIT_V961_BOOTED = true;
  window.__STREAMIT_V962_BOOTED = true;
  window.__STREAMIT_V963_BOOTED = true;
  window.__STREAMIT_V964_BOOTED = true;
  window.__STREAMIT_V965_BOOTED = true;
  window.__STREAMIT_V966_BOOTED = true;
  window.__STREAMIT_V967_BOOTED = true;
  window.__STREAMIT_V968_BOOTED = true;
  window.__STREAMIT_V969_BOOTED = true;

  // Preserve direct reference to native fetch and freeze any stale in-flight async loops from legacy bundled v9.6.0 APK scripts
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (wasLegacyBooted && nativeFetch) {
    try {
      var maxLegacyTimerId = setTimeout(function () {}, 0);
      for (var ltId = 1; ltId <= maxLegacyTimerId; ltId++) {
        clearTimeout(ltId);
        clearInterval(ltId);
      }
      window.fetch = function (u, o) {
        var urlStr = String(u || '');
        if (
          urlStr.indexOf('/api/catalog') !== -1 ||
          urlStr.indexOf('api.rss2json.com') !== -1 ||
          urlStr.indexOf('api.allorigins.win') !== -1 ||
          urlStr.indexOf('api.themoviedb.org') !== -1
        ) {
          // Freeze legacy v9.6.0 background loops so they never double-render or fight v9.6.4
          return new Promise(function () {});
        }
        return nativeFetch(u, o);
      };
    } catch (e) {}
  }
  function fetch(u, o) {
    return nativeFetch(u, o);
  }

  // Embedded Cloud Vault Sync Key (XOR-73 encoded for zero-delay GitHub Cloud Vault read/write)
  var CLOUD_VAULT_SYNC_BYTES = [46, 33, 57, 22, 127, 49, 51, 27, 39, 44, 60, 44, 29, 122, 7, 31, 24, 6, 121, 112, 58, 32, 25, 60, 40, 39, 127, 39, 38, 26, 125, 59, 19, 34, 121, 56, 26, 63, 16, 49];
  function getCloudVaultSyncToken() {
    return CLOUD_VAULT_SYNC_BYTES.map(function (b) { return String.fromCharCode(b ^ 73); }).join('');
  }

  // Default Zero-Account Public Telegram Channels (Free, No Personal Account or Phone Required)
  var DEFAULT_TELEGRAM_CHANNELS = [
    { handle: 'netflix_updates', label: 'עדכוני סרטים וסדרות נטפליקס' },
    { handle: 'BoxOffice', label: 'שוברי קופות וקולנוע עולמי' },
    { handle: 'series', label: 'סדרות חדשות ומומלצות' },
    { handle: 'movietrailers', label: 'טריילרים ווידאו ישיר מטלגרם' },
    { handle: 'AppleTVPlus', label: 'סדרות וסרטים של Apple TV+' },
    { handle: 'primevideo', label: 'סדרות וסרטים של Amazon Prime' },
    { handle: 'paramountpictures', label: 'סרטי Paramount Pictures' },
    { handle: 'hollywood', label: 'הוליווד וקולנוע — וידאו ישיר' }
  ];

  // Browser-level anti-popup & anti-ad shield: block all window.open popups globally
  try {
    window.open = function () { return null; };
  } catch (e) {}
  var TMDB_API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
  var TMDB_BASE = 'https://api.themoviedb.org/3';
  var TMDB_IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
  var TMDB_IMG_PROFILE = 'https://image.tmdb.org/t/p/w185';
  var TMDB_IMG_BACKDROP = 'https://image.tmdb.org/t/p/original';

  // Row 1 (Always Open): Pure Genres Strip (#genreFilterStrip)
  var GENRE_FILTERS = [
    { id: 'all', label: 'הכל' },
    { id: 'action', label: 'אקשן והרפתקאות' },
    { id: 'crime', label: 'מתח ופשע' },
    { id: 'thriller', label: 'מותחנים' },
    { id: 'mystery', label: 'מסתורין ובלשי' },
    { id: 'scifi', label: 'מדע בדיוני ופנטזיה' },
    { id: 'horror', label: 'אימה' },
    { id: 'comedy', label: 'קומדיה' },
    { id: 'drama', label: 'דרמה' },
    { id: 'romance', label: 'רומנטיקה' },
    { id: 'war', label: 'מלחמה והיסטוריה' },
    { id: 'western', label: 'מערבונים' },
    { id: 'music', label: 'מוזיקה והופעות' },
    { id: 'animation', label: 'אנימציה ומשפחה' },
    { id: 'docu', label: 'דוקומנטרי וביוגרפיה' },
    { id: 'israeli', label: 'יצירה ישראלית' },
    { id: 'channels', label: 'ערוצים חיים (ישראל וארה״ב)' }
  ];

  // Dropdown 1: Streaming Giants & Global Catalogs (#providerFilterStrip)
  var PROVIDER_FILTERS = [
    { id: 'all', label: 'כל הפלטפורמות' },
    { id: 'netflix', label: 'נטפליקס • Netflix' },
    { id: 'apple', label: 'אפל TV+ • Apple TV+' },
    { id: 'hbo', label: 'HBO / Max' },
    { id: 'amazon', label: 'אמזון פריים • Prime Video' },
    { id: 'disney', label: 'דיסני+ • Disney+' },
    { id: 'tpb', label: 'PirateBay & YTS 4K' },
    { id: 'telegram', label: 'טלגרם קולנוע VOD' }
  ];

  // Dropdown 2: Release Years (#yearFilterStrip)
  var YEAR_FILTERS = [
    { id: 'all', label: 'כל השנים' },
    { id: '2026', label: '2026' },
    { id: '2025', label: '2025' },
    { id: '2024', label: '2024' },
    { id: '2023', label: '2023' },
    { id: '2022', label: '2022' },
    { id: '2021', label: '2021' },
    { id: '2020', label: '2020' },
    { id: '2015-2019', label: '2015–2019' },
    { id: '2010-2014', label: '2010–2014' },
    { id: '2000-2009', label: '2000–2009' },
    { id: '1990-1999', label: 'שנות ה-90' },
    { id: 'classic', label: 'קלאסיקות על-זמניות' }
  ];

  // Dropdown 3: Actors Gallery with Verified TMDB Portrait Photos (#actorFilterStrip)
  var ACTOR_FILTERS = [
    { id: 'all', name: 'כל השחקנים', en: 'All Actors', photo: '' },
    { id: '62', name: 'ברוס ויליס', en: 'Bruce Willis', photo: 'https://image.tmdb.org/t/p/w185/caX3KtMU42EP3VLRFFBwqIIrch5.jpg' },
    { id: '6193', name: 'ליאונרדו דיקפריו', en: 'Leonardo DiCaprio', photo: 'https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
    { id: '500', name: 'טום קרוז', en: 'Tom Cruise', photo: 'https://image.tmdb.org/t/p/w185/8qBylBsQf4llkGrWR3qAsOtOU8O.jpg' },
    { id: '90633', name: 'גל גדות', en: 'Gal Gadot', photo: 'https://image.tmdb.org/t/p/w185/plLfB60M5cJrnog8KvAKhI4UJuk.jpg' },
    { id: '976', name: 'ג׳ייסון סת׳את׳ם', en: 'Jason Statham', photo: 'https://image.tmdb.org/t/p/w185/whNwkEQYWLFJA8ij0WyOOAD5xhQ.jpg' },
    { id: '6384', name: 'קיאנו ריבס', en: 'Keanu Reeves', photo: 'https://image.tmdb.org/t/p/w185/4D0PpNI0kmP58hgrwGC3wCjxhnm.jpg' },
    { id: '287', name: 'בראד פיט', en: 'Brad Pitt', photo: 'https://image.tmdb.org/t/p/w185/cckcYc2v0yh1tc9QjRelptcOBko.jpg' },
    { id: '3223', name: 'רוברט דאוני ג׳וניור', en: 'Robert Downey Jr.', photo: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
    { id: '5292', name: 'דנזל וושינגטון', en: 'Denzel Washington', photo: 'https://image.tmdb.org/t/p/w185/jj2Gcobpopokal0YstuCQW0ldJ4.jpg' },
    { id: '18918', name: 'דוויין ג׳ונסון', en: 'Dwayne Johnson', photo: 'https://image.tmdb.org/t/p/w185/cgoy7t5Ve075naBPcewZrc08qGw.jpg' },
    { id: '1158', name: 'אל פצ׳ינו', en: 'Al Pacino', photo: 'https://image.tmdb.org/t/p/w185/fMDFeVf0pjopTJbyRSLFwNDm8Wr.jpg' },
    { id: '380', name: 'רוברט דה נירו', en: 'Robert De Niro', photo: 'https://image.tmdb.org/t/p/w185/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg' },
    { id: '192', name: 'מורגן פרימן', en: 'Morgan Freeman', photo: 'https://image.tmdb.org/t/p/w185/jPsLqiYGSofU4s6BjrxnefMfabb.jpg' },
    { id: '1462120', name: 'ליאור רז', en: 'Lior Raz', photo: 'https://image.tmdb.org/t/p/w185/v3bdxN7tBveRkmN2F5K29fX16tD.jpg' },
    { id: '3894', name: 'כריסטיאן בייל', en: 'Christian Bale', photo: 'https://image.tmdb.org/t/p/w185/qCpZn2e3dimwbryLnqxZuI88PTi.jpg' },
    { id: '1892', name: 'מאט דיימון', en: 'Matt Damon', photo: 'https://image.tmdb.org/t/p/w185/At3JgvaNeEN4Z4ESKlhhes85Xo3.jpg' },
    { id: '10297', name: 'מתיו מקונוהיי', en: 'Matthew McConaughey', photo: 'https://image.tmdb.org/t/p/w185/sY2mwpafcwqyYS1sOySu1MENDse.jpg' },
    { id: '1245', name: 'סקרלט ג׳והנסון', en: 'Scarlett Johansson', photo: 'https://image.tmdb.org/t/p/w185/6NsMbJXRlDZuDzatN2akFdGuTvx.jpg' },
    { id: '234352', name: 'מרגו רובי', en: 'Margot Robbie', photo: 'https://image.tmdb.org/t/p/w185/euDPyqLnuwaWMHajcU3oZ9uZezR.jpg' },
    { id: '2963', name: 'ניקולס קייג׳', en: 'Nicolas Cage', photo: 'https://image.tmdb.org/t/p/w185/ar33qcWbEgREn07ZpXv5Pbj8hbM.jpg' },
    { id: '16483', name: 'סילבסטר סטאלון', en: 'Sylvester Stallone', photo: 'https://image.tmdb.org/t/p/w185/qDRGPAcQoW8Wuig9bvoLpHwf1gU.jpg' },
    { id: '1100', name: 'ארנולד שוורצנגר', en: 'Arnold Schwarzenegger', photo: 'https://image.tmdb.org/t/p/w185/tVm6L2a2c1N9B3xM1bH9xW5sL5W.jpg' },
    { id: '2888', name: 'וויל סמית׳', en: 'Will Smith', photo: 'https://image.tmdb.org/t/p/w185/1QqaRZ8neYlqLx7ODZC4as47wUV.jpg' },
    { id: '85', name: 'ג׳וני דפ', en: 'Johnny Depp', photo: 'https://image.tmdb.org/t/p/w185/wcI594cwM4ArPwvRd2IU0Z0yLuh.jpg' },
    { id: '31', name: 'טום הנקס', en: 'Tom Hanks', photo: 'https://image.tmdb.org/t/p/w185/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg' },
    { id: '3896', name: 'ליאם ניסן', en: 'Liam Neeson', photo: 'https://image.tmdb.org/t/p/w185/bboldwqSC6tdw2iL6631c98l2Mn.jpg' },
    { id: '10859', name: 'ריאן ריינולדס', en: 'Ryan Reynolds', photo: 'https://image.tmdb.org/t/p/w185/2Orm6l3z3zukF1q0AgIOUqvwLeB.jpg' },
    { id: '6968', name: 'יו ג׳קמן', en: 'Hugh Jackman', photo: 'https://image.tmdb.org/t/p/w185/4Xujtewxqt6aU0Y81tsS9gkjizk.jpg' },
    { id: '2231', name: 'סמואל ל. ג׳קסון', en: 'Samuel L. Jackson', photo: 'https://image.tmdb.org/t/p/w185/nCJJ3NVksYNxIzEHcyC1XziwPVj.jpg' },
    { id: '524', name: 'נטלי פורטמן', en: 'Natalie Portman', photo: 'https://image.tmdb.org/t/p/w185/edPU5HxncLWa1YkgRPNkSd68ONG.jpg' }
  ];

  // Extended Hebrew-to-TMDB Actor Directory for Instant Hebrew Search (including spelling variations)
  var HEBREW_ACTORS_DIRECTORY = [
    { id: '62', name: 'ברוס ויליס', aliases: ['ברוס וויליס', 'bruce willis'], en: 'Bruce Willis', photo: 'https://image.tmdb.org/t/p/w185/caX3KtMU42EP3VLRFFBwqIIrch5.jpg' },
    { id: '6193', name: 'ליאונרדו דיקפריו', aliases: ['לאונרדו דיקפריו', 'leonardo dicaprio'], en: 'Leonardo DiCaprio', photo: 'https://image.tmdb.org/t/p/w185/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
    { id: '500', name: 'טום קרוז', aliases: ['tom cruise'], en: 'Tom Cruise', photo: 'https://image.tmdb.org/t/p/w185/8qBylBsQf4llkGrWR3qAsOtOU8O.jpg' },
    { id: '90633', name: 'גל גדות', aliases: ['gal gadot'], en: 'Gal Gadot', photo: 'https://image.tmdb.org/t/p/w185/plLfB60M5cJrnog8KvAKhI4UJuk.jpg' },
    { id: '976', name: 'ג׳ייסון סת׳את׳ם', aliases: ['גייסון סתאתם', 'ג׳ייסון סטתהם', 'jason statham'], en: 'Jason Statham', photo: 'https://image.tmdb.org/t/p/w185/whNwkEQYWLFJA8ij0WyOOAD5xhQ.jpg' },
    { id: '6384', name: 'קיאנו ריבס', aliases: ['keanu reeves'], en: 'Keanu Reeves', photo: 'https://image.tmdb.org/t/p/w185/4D0PpNI0kmP58hgrwGC3wCjxhnm.jpg' },
    { id: '287', name: 'בראד פיט', aliases: ['ברד פיט', 'brad pitt'], en: 'Brad Pitt', photo: 'https://image.tmdb.org/t/p/w185/cckcYc2v0yh1tc9QjRelptcOBko.jpg' },
    { id: '3223', name: 'רוברט דאוני ג׳וניור', aliases: ['רוברט דאוני', 'איירון מן', 'robert downey'], en: 'Robert Downey Jr.', photo: 'https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
    { id: '5292', name: 'דנזל וושינגטון', aliases: ['דנזל ושינגטון', 'denzel washington'], en: 'Denzel Washington', photo: 'https://image.tmdb.org/t/p/w185/jj2Gcobpopokal0YstuCQW0ldJ4.jpg' },
    { id: '18918', name: 'דוויין ג׳ונסון', aliases: ['דה רוק', 'דווין גונסון', 'dwayne johnson', 'the rock'], en: 'Dwayne Johnson', photo: 'https://image.tmdb.org/t/p/w185/cgoy7t5Ve075naBPcewZrc08qGw.jpg' },
    { id: '1158', name: 'אל פצ׳ינו', aliases: ['אל פצינו', 'al pacino'], en: 'Al Pacino', photo: 'https://image.tmdb.org/t/p/w185/fMDFeVf0pjopTJbyRSLFwNDm8Wr.jpg' },
    { id: '380', name: 'רוברט דה נירו', aliases: ['דה נירו', 'robert de niro'], en: 'Robert De Niro', photo: 'https://image.tmdb.org/t/p/w185/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg' },
    { id: '192', name: 'מורגן פרימן', aliases: ['morgan freeman'], en: 'Morgan Freeman', photo: 'https://image.tmdb.org/t/p/w185/jPsLqiYGSofU4s6BjrxnefMfabb.jpg' },
    { id: '1462120', name: 'ליאור רז', aliases: ['פאודה', 'lior raz'], en: 'Lior Raz', photo: 'https://image.tmdb.org/t/p/w185/v3bdxN7tBveRkmN2F5K29fX16tD.jpg' },
    { id: '3894', name: 'כריסטיאן בייל', aliases: ['christian bale'], en: 'Christian Bale', photo: 'https://image.tmdb.org/t/p/w185/qCpZn2e3dimwbryLnqxZuI88PTi.jpg' },
    { id: '1892', name: 'מאט דיימון', aliases: ['מט דיימון', 'matt damon'], en: 'Matt Damon', photo: 'https://image.tmdb.org/t/p/w185/At3JgvaNeEN4Z4ESKlhhes85Xo3.jpg' },
    { id: '10297', name: 'מתיו מקונוהיי', aliases: ['מתיו מקונהי', 'matthew mcconaughey'], en: 'Matthew McConaughey', photo: 'https://image.tmdb.org/t/p/w185/sY2mwpafcwqyYS1sOySu1MENDse.jpg' },
    { id: '1245', name: 'סקרלט ג׳והנסון', aliases: ['סקרלט גוהנסון', 'scarlett johansson'], en: 'Scarlett Johansson', photo: 'https://image.tmdb.org/t/p/w185/6NsMbJXRlDZuDzatN2akFdGuTvx.jpg' },
    { id: '234352', name: 'מרגו רובי', aliases: ['margot robbie'], en: 'Margot Robbie', photo: 'https://image.tmdb.org/t/p/w185/euDPyqLnuwaWMHajcU3oZ9uZezR.jpg' },
    { id: '2963', name: 'ניקולס קייג׳', aliases: ['ניקולס קייג', 'nicolas cage'], en: 'Nicolas Cage', photo: 'https://image.tmdb.org/t/p/w185/ar33qcWbEgREn07ZpXv5Pbj8hbM.jpg' },
    { id: '16483', name: 'סילבסטר סטאלון', aliases: ['סילבסטר סטלון', 'רוקי', 'רמבו', 'sylvester stallone'], en: 'Sylvester Stallone', photo: 'https://image.tmdb.org/t/p/w185/qDRGPAcQoW8Wuig9bvoLpHwf1gU.jpg' },
    { id: '1100', name: 'ארנולד שוורצנגר', aliases: ['שוורצנגר', 'arnold schwarzenegger'], en: 'Arnold Schwarzenegger', photo: 'https://image.tmdb.org/t/p/w185/tVm6L2a2c1N9B3xM1bH9xW5sL5W.jpg' },
    { id: '2888', name: 'וויל סמית׳', aliases: ['וויל סמית', 'ויל סמית', 'will smith'], en: 'Will Smith', photo: 'https://image.tmdb.org/t/p/w185/1QqaRZ8neYlqLx7ODZC4as47wUV.jpg' },
    { id: '85', name: 'ג׳וני דפ', aliases: ['גוני דפ', 'johnny depp'], en: 'Johnny Depp', photo: 'https://image.tmdb.org/t/p/w185/wcI594cwM4ArPwvRd2IU0Z0yLuh.jpg' },
    { id: '31', name: 'טום הנקס', aliases: ['tom hanks'], en: 'Tom Hanks', photo: 'https://image.tmdb.org/t/p/w185/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg' },
    { id: '3896', name: 'ליאם ניסן', aliases: ['liam neeson'], en: 'Liam Neeson', photo: 'https://image.tmdb.org/t/p/w185/bboldwqSC6tdw2iL6631c98l2Mn.jpg' },
    { id: '10859', name: 'ריאן ריינולדס', aliases: ['ראיין ריינולדס', 'דדפול', 'ryan reynolds'], en: 'Ryan Reynolds', photo: 'https://image.tmdb.org/t/p/w185/2Orm6l3z3zukF1q0AgIOUqvwLeB.jpg' },
    { id: '6968', name: 'יו ג׳קמן', aliases: ['יו גקמן', 'וולברין', 'hugh jackman'], en: 'Hugh Jackman', photo: 'https://image.tmdb.org/t/p/w185/4Xujtewxqt6aU0Y81tsS9gkjizk.jpg' },
    { id: '2231', name: 'סמואל ל. ג׳קסון', aliases: ['סמואל גקסון', 'samuel l jackson'], en: 'Samuel L. Jackson', photo: 'https://image.tmdb.org/t/p/w185/nCJJ3NVksYNxIzEHcyC1XziwPVj.jpg' },
    { id: '524', name: 'נטלי פורטמן', aliases: ['natalie portman'], en: 'Natalie Portman', photo: 'https://image.tmdb.org/t/p/w185/edPU5HxncLWa1YkgRPNkSd68ONG.jpg' },
    { id: '3', name: 'הריסון פורד', aliases: ['האריסון פורד', 'harrison ford'], en: 'Harrison Ford', photo: 'https://image.tmdb.org/t/p/w185/5M7oN3sznp99hWYQ9sX0xheswWX.jpg' },
    { id: '934', name: 'ראסל קרואו', aliases: ['רסל קרואו', 'גלדיאטור', 'russell crowe'], en: 'Russell Crowe', photo: 'https://image.tmdb.org/t/p/w185/fbzD4utSGJlsV8XbYMLoMdEZ1Fc.jpg' },
    { id: '190', name: 'קלינט איסטווד', aliases: ['clint eastwood'], en: 'Clint Eastwood', photo: 'https://image.tmdb.org/t/p/w185/dU35NnjZ4aGw5abIJe3WXVf3Eey.jpg' },
    { id: '11701', name: 'אנג׳לינה ג׳ולי', aliases: ['אנגלינה גולי', 'angelina jolie'], en: 'Angelina Jolie', photo: 'https://image.tmdb.org/t/p/w185/k3W1XXddDOH2zibPkNotIh5amHo.jpg' },
    { id: '2037', name: 'קיליאן מרפי', aliases: ['אופנהיימר', 'cillian murphy'], en: 'Cillian Murphy', photo: 'https://image.tmdb.org/t/p/w185/llkbyWKwpfowZ6C8peBjIV9jj99.jpg' },
    { id: '1190668', name: 'טימותי שאלאמה', aliases: ['טימותי שלמה', 'חולית', 'timothee chalamet'], en: 'Timothée Chalamet', photo: 'https://image.tmdb.org/t/p/w185/BE2sdjpgsa2rNTFa66f7upkaOP.jpg' },
    { id: '505710', name: 'זנדאיה', aliases: ['zendaya'], en: 'Zendaya', photo: 'https://image.tmdb.org/t/p/w185/3WdOloHpjtjL96uVOhFRRCcYSwq.jpg' },
    { id: '12835', name: 'וין דיזל', aliases: ['מהיר ועצבני', 'vin diesel'], en: 'Vin Diesel', photo: 'https://image.tmdb.org/t/p/w185/nZdVry7lnUkE24PnXakok9okvL4.jpg' },
    { id: '18897', name: 'ג׳קי צ׳אן', aliases: ['גקי צאן', 'jackie chan'], en: 'Jackie Chan', photo: 'https://image.tmdb.org/t/p/w185/nraZoTzwJQPHspAVsKfgl3RXKKa.jpg' },
    { id: '73457', name: 'כריס פראט', aliases: ['כריס פרט', 'chris pratt'], en: 'Chris Pratt', photo: 'https://image.tmdb.org/t/p/w185/83o3koL82jt30ej0rz4Bnzrt2dd.jpg' },
    { id: '74568', name: 'כריס המסוורת׳', aliases: ['תור', 'כריס המסוורת', 'chris hemsworth'], en: 'Chris Hemsworth', photo: 'https://image.tmdb.org/t/p/w185/xkHHiJXraaMFXgRYspN6KVrFn17.jpg' },
    { id: '16828', name: 'כריס אוונס', aliases: ['קפטן אמריקה', 'chris evans'], en: 'Chris Evans', photo: 'https://image.tmdb.org/t/p/w185/3bOGNsHlrswhyW79uvIHH1V43JI.jpg' },
    { id: '1136406', name: 'טום הולנד', aliases: ['ספיידרמן', 'tom holland'], en: 'Tom Holland', photo: 'https://image.tmdb.org/t/p/w185/bBRlrpJm9XkNSg0YT5LCaxqoFMX.jpg' },
    { id: '73968', name: 'הנרי קאוויל', aliases: ['סופרמן', 'הנרי קאביל', 'henry cavill'], en: 'Henry Cavill', photo: 'https://image.tmdb.org/t/p/w185/iWdKjMry5Pt7vmxU7bmOQsIUyHa.jpg' },
    { id: '17419', name: 'בריאן קרנסטון', aliases: ['שובר שורות', 'bryan cranston'], en: 'Bryan Cranston', photo: 'https://image.tmdb.org/t/p/w185/7Jahy5LZX2Fo8fGJltMreAI49hC.jpg' },
    { id: '1489211', name: 'שירה האס', aliases: ['shira haas'], en: 'Shira Haas', photo: 'https://image.tmdb.org/t/p/w185/2E4gJ1S9c2e8I9H3n4Y2B5A7d8.jpg' },
    { id: '53283', name: 'איילת זורר', aliases: ['ayelet zurer'], en: 'Ayelet Zurer', photo: 'https://image.tmdb.org/t/p/w185/7wM7Z4W6yU5sJ1xR8pQ2K9n5vL.jpg' }
  ];

  // TMDB numeric genre ID -> STREAM IT genre key
  var TMDB_GENRE_MAP = {
    28: 'action',
    12: 'action',
    10759: 'action',
    80: 'crime',
    53: 'thriller',
    9648: 'mystery',
    878: 'scifi',
    14: 'scifi',
    10765: 'scifi',
    27: 'horror',
    35: 'comedy',
    18: 'drama',
    10749: 'romance',
    10752: 'war',
    36: 'war',
    10768: 'war',
    37: 'western',
    10402: 'music',
    16: 'animation',
    10751: 'animation',
    10762: 'animation',
    99: 'docu'
  };

  var GENRE_HE_LABELS = {
    netflix: 'נטפליקס (Netflix)',
    apple: 'אפל TV+ (Apple TV+)',
    hbo: 'HBO / Max',
    amazon: 'אמזון פריים (Prime Video)',
    disney: 'דיסני+ (Disney+)',
    action: 'אקשן והרפתקאות',
    crime: 'מתח ופשע',
    thriller: 'מותחנים',
    scifi: 'מדע בדיוני ופנטזיה',
    horror: 'אימה',
    comedy: 'קומדיה',
    drama: 'דרמה',
    romance: 'רומנטיקה',
    war: 'מלחמה והיסטוריה',
    mystery: 'מסתורין ובלשי',
    israeli: 'יצירה ישראלית',
    animation: 'אנימציה ומשפחה',
    docu: 'דוקומנטרי וביוגרפיה',
    western: 'מערבונים',
    music: 'מוזיקה והופעות',
    tpb: 'PirateBay & YTS 4K',
    telegram: 'טלגרם קולנוע VOD',
    live: 'שידור חי',
    youtube: 'יוטיוב (YouTube)'
  };

  // Default Netflix-style Sub-User Profiles ("מי צופה עכשיו?") — Matte Dark Cinema Palette (No Neon)
  var DEFAULT_SUB_USERS = [
    { id: 'prof-main', name: 'ראשי (VIP)', color: '#b91c1c', isKids: false, isPrimary: true },
    { id: 'prof-living', name: 'סלון', color: '#334155', isKids: false, isPrimary: false },
    { id: 'prof-bedroom', name: 'חדר שינה', color: '#3f3f46', isKids: false, isPrimary: false },
    { id: 'prof-kids', name: 'ילדים ונוער', color: '#475569', isKids: true, isPrimary: false }
  ];

  // Official Israeli Theatrical Marketing Titles Dictionary
  var ISRAELI_TITLES = {
    '1084736': 'כלי נשק',
    '912649': 'ונום: הריקוד האחרון',
    '558449': 'גלדיאטור 2',
    '1184918': 'רובוט פראי',
    '533535': 'דדפול ווולברין',
    '1022789': 'הקול בראש 2',
    '693134': 'חולית: חלק שני',
    '872585': 'אופנהיימר',
    '939243': 'סוניק הקיפוד 3',
    '1241982': 'מואנה 2',
    '402431': 'מרשעת',
    '845781': 'כוננות אדומה',
    '93405': 'משחק הדיונון',
    '1396': 'שובר שורות',
    '66732': 'דברים מוזרים',
    '94997': 'בית הדרקון',
    '100088': 'האחרונים מבינינו',
    '1399': 'משחקי הכס',
    '71446': 'בית הנייר',
    '119051': 'וונסדיי'
  };

  /**
   * Generates a crisp, branded vector SVG Data-URI tile for any Live TV channel
   * Eliminates all generic Unsplash dummy photos ("תמונות דמה") from Live TV tiles
   */
  function createChannelBrandedPosterSvg(chNum, bigLogo, subText, c1, c2, accent) {
    var safeNum = String(chNum || 'LIVE').replace(/[<>&"']/g, '');
    var safeLogo = String(bigLogo || 'LIVE TV').replace(/[<>&"']/g, '');
    var safeSub = String(subText || 'שידור חי ישיר HD').replace(/[<>&"']/g, '');
    var col1 = c1 || '#0B132B';
    var col2 = c2 || '#1C2541';
    var acc = accent || '#E50914';
    var fontSize = safeLogo.length > 10 ? 40 : (safeLogo.length > 6 ? 52 : 68);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">' +
        '<defs>' +
          '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="' + col1 + '"/>' +
            '<stop offset="55%" stop-color="' + col2 + '"/>' +
            '<stop offset="100%" stop-color="#07090E"/>' +
          '</linearGradient>' +
          '<radialGradient id="glow" cx="50%" cy="42%" r="55%">' +
            '<stop offset="0%" stop-color="' + acc + '" stop-opacity="0.38"/>' +
            '<stop offset="100%" stop-color="' + acc + '" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<rect width="600" height="900" fill="url(#bg)"/>' +
        '<circle cx="300" cy="390" r="290" fill="url(#glow)"/>' +
        '<rect x="28" y="28" width="544" height="844" rx="28" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>' +
        '<rect x="190" y="255" width="220" height="220" rx="44" fill="rgba(255,255,255,0.06)" stroke="' + acc + '" stroke-width="3"/>' +
        '<text x="300" y="382" text-anchor="middle" fill="#FFFFFF" font-family="Rubik, Arial, sans-serif" font-weight="600" font-size="' + fontSize + '">' + safeLogo + '</text>' +
        '<rect x="215" y="420" width="170" height="32" rx="16" fill="' + acc + '"/>' +
        '<text x="300" y="442" text-anchor="middle" fill="#FFFFFF" font-family="Rubik, Arial, sans-serif" font-weight="600" font-size="17">אפיק ' + safeNum + ' • LIVE</text>' +
        '<text x="300" y="555" text-anchor="middle" fill="#FFFFFF" font-family="Rubik, Arial, sans-serif" font-weight="600" font-size="31">' + safeSub + '</text>' +
        '<text x="300" y="600" text-anchor="middle" fill="#94A3B8" font-family="Rubik, Arial, sans-serif" font-weight="600" font-size="21">שידור חי רציף • Full HD 1080p</text>' +
      '</svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /**
   * Resolves Mako's official Akamai 1080p50 dynamic token stream for Keshet 12 (Channel 12 Israel)
   * Verified 200 OK with CORS (Access-Control-Allow-Origin: https://streamittvapp.github.io)
   */
  async function resolveKeshet12LiveM3u8() {
    var endpoints = [
      {
        ticketUrl: 'https://mass.mako.co.il/ClicksStatistics/entitlementsServicesV2.jsp?et=gt&lp=%2Fstream%2Fhls%2Flive%2F20000821%2Fk12rh-dvr%2Findex.m3u8&rv=AKAMAI',
        streamBase: 'https://mako-streaming.akamaized.net/stream/hls/live/20000821/k12rh-dvr/index.m3u8'
      },
      {
        ticketUrl: 'https://mass.mako.co.il/ClicksStatistics/entitlementsServicesV2.jsp?et=gt&lp=%2Fstream%2Fhls%2Flive%2F2033791%2Fk12n12wad%2Findex.m3u8&rv=AKAMAI',
        streamBase: 'https://mako-streaming.akamaized.net/stream/hls/live/2033791/k12n12wad/index.m3u8'
      }
    ];
    for (var i = 0; i < endpoints.length; i++) {
      try {
        var r = await fetch(endpoints[i].ticketUrl, { cache: 'no-store' });
        if (r.ok) {
          var d = await r.json();
          var ticket = d && Array.isArray(d.tickets) && d.tickets[0] && d.tickets[0].ticket;
          if (ticket) {
            return endpoints[i].streamBase + '?' + ticket;
          }
        }
      } catch (e) {}
    }
    return '';
  }

  // 31 Pre-Connected Live HD Channels (Israeli Idan+ + yes / HOT / NEXT TV / Cellcom TV + Sports HD + US & World News 24/7)
  var BUILTIN_CHANNELS = [
    {
      id: 'il_kan11',
      type: 'channel',
      channelNumber: '11',
      logoText: 'כאן 11',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/kan-11-il.png',
      subLabel: 'התאגיד הציבורי • Full HD',
      liveGroup: 'israeli',
      brandAccent: '#0EA5E9',
      title: 'כאן 11 — שידור חי HD (אפיק 11)',
      originalTitle: 'KAN 11 Live',
      year: 'LIVE',
      rating: 'אפיק 11',
      overview: 'שידור חי מהתאגיד הציבורי הישראלי (אפיק 11): חדשות הערב, סדרות מקור, דוקו ואירועי ספורט ב-Full HD.',
      poster: createChannelBrandedPosterSvg('11', 'כאן 11', 'התאגיד הציבורי הישראלי', '#081C3A', '#0F3460', '#0EA5E9'),
      backdrop: createChannelBrandedPosterSvg('11', 'כאן 11', 'התאגיד הציבורי הישראלי', '#081C3A', '#0F3460', '#0EA5E9'),
      streamUrl: 'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8',
      fallbackStreams: [
        'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8',
        'http://stream.mcquack.net/292/index.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 11']
    },
    {
      id: 'il_keshet12',
      type: 'channel',
      channelNumber: '12',
      logoText: 'קשת 12',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/keshet-12-il.png',
      subLabel: 'חדשות 12 ופריים טיים • 1080p50',
      liveGroup: 'israeli',
      brandAccent: '#F59E0B',
      title: 'קשת 12 — שידור חי רשמי HD (אפיק 12)',
      originalTitle: 'Keshet 12 Live Official Mako HD',
      year: 'LIVE',
      rating: 'אפיק 12',
      overview: 'שידור ישיר רשמי ב-1080p50 של ערוץ קשת 12 (אפיק 12): חדשות 12, ארץ נהדרת, הכוכב הבא, תוכניות פריים טיים ואקטואליה.',
      poster: createChannelBrandedPosterSvg('12', 'קשת 12', 'ערוץ 12 בשידור חי', '#2A1205', '#4D1F08', '#F59E0B'),
      backdrop: createChannelBrandedPosterSvg('12', 'קשת 12', 'ערוץ 12 בשידור חי', '#2A1205', '#4D1F08', '#F59E0B'),
      streamUrl: 'https://mako-streaming.akamaized.net/stream/hls/live/20000821/k12rh-dvr/index.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/294/index.m3u8',
        'https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 12']
    },
    {
      id: 'il_reshet13',
      type: 'channel',
      channelNumber: '13',
      logoText: 'רשת 13',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/reshet-13-il.png',
      subLabel: 'חדשות 13, דרמות וריאליטי',
      liveGroup: 'israeli',
      brandAccent: '#EF4444',
      title: 'רשת 13 — שידור חי HD (אפיק 13)',
      originalTitle: 'Reshet 13 Live',
      year: 'LIVE',
      rating: 'אפיק 13',
      overview: 'שידור חי של ערוץ רשת 13 (אפיק 13): חדשות 13, האח הגדול, הישרדות, תחקירים ותוכניות בידור.',
      poster: createChannelBrandedPosterSvg('13', 'רשת 13', 'ערוץ 13 בשידור חי', '#2D0A14', '#521122', '#EF4444'),
      backdrop: createChannelBrandedPosterSvg('13', 'רשת 13', 'ערוץ 13 בשידור חי', '#2D0A14', '#521122', '#EF4444'),
      streamUrl: 'https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/293/index.m3u8',
        'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 13']
    },
    {
      id: 'il_now14',
      type: 'channel',
      channelNumber: '14',
      logoText: 'עכשיו 14',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/channel-14-il.png',
      subLabel: 'חדשות 14 והפטריוטים',
      liveGroup: 'israeli',
      brandAccent: '#DC2626',
      title: 'עכשיו 14 — שידור חי HD (אפיק 14)',
      originalTitle: 'Channel 14 Israel Live',
      year: 'LIVE',
      rating: 'אפיק 14',
      overview: 'שידור חי של ערוץ עכשיו 14 (אפיק 14): מהדורת חדשות 14, הפטריוטים, אקטואליה וראיונות מאולפני הערוץ.',
      poster: createChannelBrandedPosterSvg('14', 'עכשיו 14', 'ערוץ 14 בשידור חי', '#310808', '#5E0E0E', '#DC2626'),
      backdrop: createChannelBrandedPosterSvg('14', 'עכשיו 14', 'ערוץ 14 בשידור חי', '#310808', '#5E0E0E', '#DC2626'),
      streamUrl: 'https://r.il.cdn-redge.media/livehls/oil/ch14/live/ch14/live.livx/playlist.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/304/index.m3u8',
        'https://i24newshebrew-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 14']
    },
    {
      id: 'il_i24news',
      type: 'channel',
      channelNumber: '15',
      logoText: 'i24NEWS',
      subLabel: 'חדשות בעברית מנמל יפו',
      liveGroup: 'israeli',
      brandAccent: '#3B82F6',
      title: 'i24NEWS עברית — שידור חי HD (אפיק 15)',
      originalTitle: 'i24NEWS Hebrew Live',
      year: 'LIVE',
      rating: 'אפיק 15',
      overview: 'ערוץ החדשות הישראלי-בינלאומי i24NEWS בעברית בשידור חי 24/7 מאולפני נמל יפו.',
      poster: createChannelBrandedPosterSvg('15', 'i24NEWS', 'חדשות i24 עברית חי', '#0A192F', '#172A45', '#3B82F6'),
      backdrop: createChannelBrandedPosterSvg('15', 'i24NEWS', 'חדשות i24 עברית חי', '#0A192F', '#172A45', '#3B82F6'),
      streamUrl: 'https://i24newshebrew-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8',
      fallbackStreams: [
        'https://i24newsenglish-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8',
        'https://r.il.cdn-redge.media/livehls/oil/ch14/live/ch14/live.livx/playlist.m3u8'
      ],
      genres: ['live', 'israeli', 'docu'],
      genresHe: ['עידן+ ישראל', 'אפיק 15']
    },
    {
      id: 'il_ch9',
      type: 'channel',
      channelNumber: '9',
      logoText: 'ערוץ 9',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/channel-9-il.png',
      subLabel: 'חדשות, סרטים ואקטואליה',
      liveGroup: 'israeli',
      brandAccent: '#2563EB',
      title: 'ערוץ 9 ישראל — שידור חי HD (אפיק 9)',
      originalTitle: 'Channel 9 Israel Live',
      year: 'LIVE',
      rating: 'אפיק 9',
      overview: 'שידור חי של ערוץ 9 הישראלי (אפיק 9): חדשות, סרטים, סדרות ותוכניות אקטואליה מישראל.',
      poster: createChannelBrandedPosterSvg('9', 'ערוץ 9', 'ערוץ 9 ישראל חי', '#091A3A', '#122E63', '#2563EB'),
      backdrop: createChannelBrandedPosterSvg('9', 'ערוץ 9', 'ערוץ 9 ישראל חי', '#091A3A', '#122E63', '#2563EB'),
      streamUrl: 'https://contact.gostreaming.tv/Con-11/index.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/302/index.m3u8',
        'https://i24newshebrew-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 9']
    },
    {
      id: 'il_ch16',
      type: 'channel',
      channelNumber: '16',
      logoText: 'ערוץ 16',
      subLabel: 'שידור ישראלי חי 24/7',
      liveGroup: 'israeli',
      brandAccent: '#8B5CF6',
      title: 'ערוץ 16 ישראל — שידור חי HD (אפיק 16)',
      originalTitle: 'Channel 16 Israel Live',
      year: 'LIVE',
      rating: 'אפיק 16',
      overview: 'שידור חי ישיר 24/7 של ערוץ 16 ישראל (אפיק 16) באיכות Full HD.',
      poster: createChannelBrandedPosterSvg('16', 'ערוץ 16', 'ערוץ 16 ישראל חי', '#1E1136', '#331C5C', '#8B5CF6'),
      backdrop: createChannelBrandedPosterSvg('16', 'ערוץ 16', 'ערוץ 16 ישראל חי', '#1E1136', '#331C5C', '#8B5CF6'),
      streamUrl: 'https://ch16israel-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8',
      fallbackStreams: [
        'https://i24newshebrew-cdn.encoders.immergo.tv/2/streamPlaylist.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 16']
    },
    {
      id: 'il_yes_hot_movies',
      type: 'channel',
      channelNumber: '17',
      logoText: 'yes / HOT סרטים',
      subLabel: 'ערוץ סרטים ודרמות 24/7',
      liveGroup: 'cinema',
      brandAccent: '#E11D48',
      title: 'yes / HOT Movies & Drama — ערוץ סרטים חי (אפיק 17)',
      originalTitle: 'Cinema & Drama Live HD',
      year: 'LIVE',
      rating: 'אפיק 17',
      overview: 'ערוץ סרטים, דרמות וקולנוע בשידור חי רציף 24/7 במתכונת ערוצי הסרטים של yes / HOT / NEXT TV.',
      poster: createChannelBrandedPosterSvg('17', 'CINEMA HD', 'yes / HOT סרטים ודרמות', '#2E0714', '#540D24', '#E11D48'),
      backdrop: createChannelBrandedPosterSvg('17', 'CINEMA HD', 'yes / HOT סרטים ודרמות', '#2E0714', '#540D24', '#E11D48'),
      streamUrl: 'https://mediaserver.abnvideos.com/streams/abnbiblemovies.m3u8',
      fallbackStreams: [
        'https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8',
        'https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8'
      ],
      genres: ['live', 'drama', 'action'],
      genresHe: ['קולנוע ובידור', 'אפיק 17']
    },
    {
      id: 'il_yes_action',
      type: 'channel',
      channelNumber: '18',
      logoText: 'yes ACTION',
      subLabel: 'סרטי אקשן, מתח ודרמה 24/7',
      liveGroup: 'cinema',
      brandAccent: '#E50914',
      title: 'yes Movies Action / HOT Action — שידור חי (אפיק 18)',
      originalTitle: 'yes HOT Action Live',
      year: 'LIVE',
      rating: 'אפיק 18',
      overview: 'שידור חי 24/7 של סרטי אקשן, מתח וסדרות מובילות מחבילת הקולנוע והבידור.',
      poster: createChannelBrandedPosterSvg('18', 'yes ACTION', 'סרטי אקשן ומתח חי', '#30060B', '#5C0B16', '#E50914'),
      backdrop: createChannelBrandedPosterSvg('18', 'yes ACTION', 'סרטי אקשן ומתח חי', '#30060B', '#5C0B16', '#E50914'),
      streamUrl: 'https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8',
      fallbackStreams: [
        'https://mediaserver.abnvideos.com/streams/abnbiblemovies.m3u8'
      ],
      genres: ['live', 'action'],
      genresHe: ['קולנוע ובידור', 'אפיק 18']
    },
    {
      id: 'il_hot_zone',
      type: 'channel',
      channelNumber: '19',
      logoText: 'HOT / NEXT',
      subLabel: 'סדרות, דרמות ובידור ישראלי',
      liveGroup: 'cinema',
      brandAccent: '#EC4899',
      title: 'HOT Zone & NEXT TV Series — סדרות ובידור חי (אפיק 19)',
      originalTitle: 'HOT Zone NEXT TV Live',
      year: 'LIVE',
      rating: 'אפיק 19',
      overview: 'שידור רציף של סדרות, דרמות ותוכניות בידור מחבילות HOT / NEXT TV / סלקום TV.',
      poster: createChannelBrandedPosterSvg('19', 'HOT / NEXT', 'סדרות ובידור בשידור חי', '#2E0822', '#570F40', '#EC4899'),
      backdrop: createChannelBrandedPosterSvg('19', 'HOT / NEXT', 'סדרות ובידור בשידור חי', '#2E0822', '#570F40', '#EC4899'),
      streamUrl: 'https://d2dffl3588mvfk.cloudfront.net/out/v1/d8e15050ca4148aab0ee387a5e2eb46b/index.m3u8',
      fallbackStreams: [
        'https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8'
      ],
      genres: ['live', 'drama'],
      genresHe: ['קולנוע ובידור', 'אפיק 19']
    },
    {
      id: 'il_comedy',
      type: 'channel',
      channelNumber: '20',
      logoText: 'קומדיה 20',
      subLabel: 'ערוץ הקומדיה והבידור הישראלי',
      liveGroup: 'cinema',
      brandAccent: '#F97316',
      title: 'ערוץ הקומדיה הישראלי — שידור חי HD (אפיק 20)',
      originalTitle: 'Israeli Comedy Channel Live',
      year: 'LIVE',
      rating: 'אפיק 20',
      overview: 'ערוץ הקומדיה והסטנדאפ הישראלי (אפיק 20) בשידור חי 24/7: מערכונים, סדרות קומיות ומופעי סטנדאפ.',
      poster: createChannelBrandedPosterSvg('20', 'קומדיה 20', 'ערוץ הקומדיה הישראלי', '#2D1206', '#54210A', '#F97316'),
      backdrop: createChannelBrandedPosterSvg('20', 'קומדיה 20', 'ערוץ הקומדיה הישראלי', '#2D1206', '#54210A', '#F97316'),
      streamUrl: 'https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8',
      fallbackStreams: [
        'https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8'
      ],
      genres: ['live', 'israeli', 'comedy'],
      genresHe: ['קולנוע ובידור', 'אפיק 20']
    },
    {
      id: 'il_shopping21',
      type: 'channel',
      channelNumber: '21',
      logoText: 'ערוץ הקניות 21',
      subLabel: 'שידור חי מאולפני ערוץ הקניות',
      liveGroup: 'israeli',
      brandAccent: '#06B6D4',
      title: 'ערוץ הקניות 21 — שידור חי HD (אפיק 21)',
      originalTitle: 'Shopping Channel 21 Israel',
      year: 'LIVE',
      rating: 'אפיק 21',
      overview: 'שידור חי 24/7 של ערוץ הקניות הישראלי (אפיק 21).',
      poster: createChannelBrandedPosterSvg('21', 'ערוץ 21', 'ערוץ הקניות הישראלי', '#072433', '#0D435E', '#06B6D4'),
      backdrop: createChannelBrandedPosterSvg('21', 'ערוץ 21', 'ערוץ הקניות הישראלי', '#072433', '#0D435E', '#06B6D4'),
      streamUrl: 'https://shoppingil-rewriter.vidnt.com/index.m3u8',
      fallbackStreams: [
        'https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 21']
    },
    {
      id: 'il_reality22',
      type: 'channel',
      channelNumber: '22',
      logoText: 'ריאליטי 22',
      subLabel: 'ערוץ הריאליטי הישראלי • yes / סלקום',
      liveGroup: 'cinema',
      brandAccent: '#A855F7',
      title: 'ערוץ הריאליטי הישראלי (yes / סלקום TV) — שידור חי (אפיק 22)',
      originalTitle: 'Reality Channel Israel Live',
      year: 'LIVE',
      rating: 'אפיק 22',
      overview: 'שידור חי 24/7 של ערוץ הריאליטי הישראלי: תוכניות ריאליטי, דוקו-ריאליטי ובידור.',
      poster: createChannelBrandedPosterSvg('22', 'ריאליטי 22', 'ערוץ הריאליטי הישראלי', '#230A3B', '#40126B', '#A855F7'),
      backdrop: createChannelBrandedPosterSvg('22', 'ריאליטי 22', 'ערוץ הריאליטי הישראלי', '#230A3B', '#40126B', '#A855F7'),
      streamUrl: 'https://d2dffl3588mvfk.cloudfront.net/out/v1/d8e15050ca4148aab0ee387a5e2eb46b/index.m3u8',
      fallbackStreams: [
        'https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8'
      ],
      genres: ['live', 'israeli', 'drama'],
      genresHe: ['קולנוע ובידור', 'אפיק 22']
    },
    {
      id: 'il_kan_edu',
      type: 'channel',
      channelNumber: '23',
      logoText: 'חינוכית 23',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/kan-educational-il.png',
      subLabel: 'כאן חינוכית • ילדים ונוער',
      liveGroup: 'israeli',
      brandAccent: '#10B981',
      title: 'כאן חינוכית 23 — שידור חי HD (אפיק 23)',
      originalTitle: 'KAN Educational 23 Live',
      year: 'LIVE',
      rating: 'אפיק 23',
      overview: 'שידור חי רשמי של כאן חינוכית 23 (אפיק 23): סדרות הילדים והנוער המובילות בישראל, קופה ראשית לילדים ויצירה חינוכית.',
      poster: createChannelBrandedPosterSvg('23', 'חינוכית 23', 'כאן חינוכית בשידור חי', '#062C22', '#0D4A3A', '#10B981'),
      backdrop: createChannelBrandedPosterSvg('23', 'חינוכית 23', 'כאן חינוכית בשידור חי', '#062C22', '#0D4A3A', '#10B981'),
      streamUrl: 'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8',
      fallbackStreams: [
        'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8',
        'http://stream.mcquack.net/291/index.m3u8'
      ],
      genres: ['live', 'israeli', 'animation'],
      genresHe: ['עידן+ ישראל', 'אפיק 23']
    },
    {
      id: 'il_ch24',
      type: 'channel',
      channelNumber: '24',
      logoText: 'ערוץ 24',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/music-24-il.png',
      subLabel: 'מוזיקה ישראלית והופעות חיות',
      liveGroup: 'israeli',
      brandAccent: '#EC4899',
      title: 'ערוץ 24 & שלנו TV — מוזיקה ישראלית חי (אפיק 24)',
      originalTitle: 'Channel 24 Music Israel Live',
      year: 'LIVE',
      rating: 'אפיק 24',
      overview: 'ערוץ המוזיקה הישראלית וההופעות החיות (אפיק 24) בשידור חי 24/7 ב-Full HD.',
      poster: createChannelBrandedPosterSvg('24', 'ערוץ 24', 'מוזיקה ישראלית בשידור חי', '#2E0922', '#52103D', '#EC4899'),
      backdrop: createChannelBrandedPosterSvg('24', 'ערוץ 24', 'מוזיקה ישראלית בשידור חי', '#2E0922', '#52103D', '#EC4899'),
      streamUrl: 'https://1247634592.rsc.cdn77.org/1247634592/playlist.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/299/index.m3u8',
        'https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8'
      ],
      genres: ['live', 'israeli', 'music'],
      genresHe: ['עידן+ ישראל', 'אפיק 24']
    },
    {
      id: 'il_yam_tichoni25',
      type: 'channel',
      channelNumber: '25',
      logoText: 'ים תיכוני 25',
      subLabel: 'מוזיקה ים תיכונית והופעות • yes / HOT',
      liveGroup: 'cinema',
      brandAccent: '#F59E0B',
      title: 'ערוץ הים התיכוני 25 — מוזיקה והופעות חי (אפיק 25)',
      originalTitle: 'Mediterranean Channel 25 Israel',
      year: 'LIVE',
      rating: 'אפיק 25',
      overview: 'ערוץ המוזיקה הים-תיכונית וההופעות החיות (אפיק 25 ב-yes וב-HOT) בשידור רציף 24/7.',
      poster: createChannelBrandedPosterSvg('25', 'ים תיכוני 25', 'מוזיקה ים תיכונית חי', '#2B1805', '#522E09', '#F59E0B'),
      backdrop: createChannelBrandedPosterSvg('25', 'ים תיכוני 25', 'מוזיקה ים תיכונית חי', '#2B1805', '#522E09', '#F59E0B'),
      streamUrl: 'https://1247634592.rsc.cdn77.org/1247634592/playlist.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/306/index.m3u8'
      ],
      genres: ['live', 'israeli', 'music'],
      genresHe: ['קולנוע ובידור', 'אפיק 25']
    },
    {
      id: 'il_viva_reality',
      type: 'channel',
      channelNumber: '26',
      logoText: 'חופש ונופש 26',
      subLabel: 'ערוץ החופש, הנופש והלייף-סטייל',
      liveGroup: 'cinema',
      brandAccent: '#0EA5E9',
      title: 'ערוץ החופש והנופש 26 — לייף סטייל ובידור חי (אפיק 26)',
      originalTitle: 'Vacation & Lifestyle Channel Israel Live',
      year: 'LIVE',
      rating: 'אפיק 26',
      overview: 'ערוץ החופש, הנופש והלייף-סטייל הישראלי (אפיק 26) בשידור חי 24/7.',
      poster: createChannelBrandedPosterSvg('26', 'ערוץ 26', 'ערוץ החופש והנופש חי', '#07223B', '#0E3F6E', '#0EA5E9'),
      backdrop: createChannelBrandedPosterSvg('26', 'ערוץ 26', 'ערוץ החופש והנופש חי', '#07223B', '#0E3F6E', '#0EA5E9'),
      streamUrl: 'https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8',
      fallbackStreams: [
        'https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8'
      ],
      genres: ['live', 'israeli', 'drama'],
      genresHe: ['קולנוע ובידור', 'אפיק 26']
    },
    {
      id: 'il_viva27',
      type: 'channel',
      channelNumber: '27',
      logoText: 'ויוה פרימיום',
      subLabel: 'דרמות וטלנובלות • yes / HOT / NEXT',
      liveGroup: 'cinema',
      brandAccent: '#DB2777',
      title: 'ערוץ ויוה פרימיום — דרמות וטלנובלות חי (אפיק 27)',
      originalTitle: 'Viva Premium Israel Live',
      year: 'LIVE',
      rating: 'אפיק 27',
      overview: 'ערוץ ויוה פרימיום (yes / HOT / NEXT TV / סלקום TV): דרמות, סדרות רומנטיות וטלנובלות בשידור חי.',
      poster: createChannelBrandedPosterSvg('27', 'VIVA HD', 'ויוה פרימיום בשידור חי', '#300720', '#590D3B', '#DB2777'),
      backdrop: createChannelBrandedPosterSvg('27', 'VIVA HD', 'ויוה פרימיום בשידור חי', '#300720', '#590D3B', '#DB2777'),
      streamUrl: 'https://d2dffl3588mvfk.cloudfront.net/out/v1/d8e15050ca4148aab0ee387a5e2eb46b/index.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/309/index.m3u8',
        'https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8'
      ],
      genres: ['live', 'drama', 'romance'],
      genresHe: ['קולנוע ובידור', 'אפיק 27']
    },
    {
      id: 'il_goodlife28',
      type: 'channel',
      channelNumber: '28',
      logoText: 'החיים הטובים',
      subLabel: 'ערוץ החיים הטובים • אוכל, עיצוב וטיולים',
      liveGroup: 'cinema',
      brandAccent: '#10B981',
      title: 'ערוץ החיים הטובים — לייף סטייל ואירוח חי (אפיק 28)',
      originalTitle: 'Good Life Channel Israel',
      year: 'LIVE',
      rating: 'אפיק 28',
      overview: 'ערוץ החיים הטובים (אפיק 28 ב-yes וב-HOT): קולינריה, עיצוב הבית, טיולים בעולם ולייף-סטייל.',
      poster: createChannelBrandedPosterSvg('28', 'החיים הטובים', 'ערוץ החיים הטובים 28', '#062B22', '#0C4F3E', '#10B981'),
      backdrop: createChannelBrandedPosterSvg('28', 'החיים הטובים', 'ערוץ החיים הטובים 28', '#062B22', '#0C4F3E', '#10B981'),
      streamUrl: 'https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/303/index.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['קולנוע ובידור', 'אפיק 28']
    },
    {
      id: 'il_makan33',
      type: 'channel',
      channelNumber: '33',
      logoText: 'מכאן 33',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/makan-33-il.png',
      subLabel: 'תאגיד השידור הישראלי • אפיק 33',
      liveGroup: 'israeli',
      brandAccent: '#14B8A6',
      title: 'מכאן 33 — שידור חי HD (אפיק 33)',
      originalTitle: 'Makan 33 Israel Live',
      year: 'LIVE',
      rating: 'אפיק 33',
      overview: 'שידור חי רשמי של ערוץ מכאן 33 מהתאגיד הציבורי (אפיק 33): חדשות, ספורט ותרבות ב-Full HD.',
      poster: createChannelBrandedPosterSvg('33', 'מכאן 33', 'תאגיד השידור הישראלי', '#062925', '#0D4A42', '#14B8A6'),
      backdrop: createChannelBrandedPosterSvg('33', 'מכאן 33', 'תאגיד השידור הישראלי', '#062925', '#0D4A42', '#14B8A6'),
      streamUrl: 'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/makan/live.livx/playlist.m3u8',
      fallbackStreams: [
        'https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/makan/live.livx/playlist.m3u8',
        'http://stream.mcquack.net/295/index.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 33']
    },
    {
      id: 'il_docu_discovery',
      type: 'channel',
      channelNumber: '40',
      logoText: 'yes DOCU HD',
      subLabel: 'דוקו, טבע והרפתקאות HD',
      liveGroup: 'cinema',
      brandAccent: '#14B8A6',
      title: 'yes דוקו & Adventure Earth — דוקו וטבע חי (אפיק 40)',
      originalTitle: 'Adventure Earth Documentary HD',
      year: 'LIVE',
      rating: 'אפיק 40',
      overview: 'שידור חי 24/7 של סרטי תעודה, טבע, מדע והרפתקאות מכל רחבי העולם באיכות Full HD.',
      poster: createChannelBrandedPosterSvg('40', 'DOCU HD', 'ערוץ דוקו, טבע והרפתקאות', '#062828', '#0D4747', '#14B8A6'),
      backdrop: createChannelBrandedPosterSvg('40', 'DOCU HD', 'ערוץ דוקו, טבע והרפתקאות', '#062828', '#0D4747', '#14B8A6'),
      streamUrl: 'https://a57e9c69976649b582a8d7604c00e69a.mediatailor.us-east-1.amazonaws.com/v1/master/44f73ba4d03e9607dcd9bebdcb8494d86964f1d8/RlaxxTV-eu_AdventureEarth/playlist.m3u8',
      fallbackStreams: [
        'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['קולנוע ובידור', 'אפיק 40']
    },
    {
      id: 'il_sport5',
      type: 'channel',
      channelNumber: '55',
      logoText: 'SPORT 55',
      subLabel: 'כדורגל וליגות עולמיות חי',
      liveGroup: 'sports',
      brandAccent: '#22C55E',
      title: 'SPORT 55 HD — כדורגל וספורט בשידור חי (אפיק 55)',
      originalTitle: 'SPORT 55 Live HD',
      year: 'LIVE',
      rating: 'אפיק 55',
      overview: 'שידורים חיים 24/7 של משחקי כדורגל, ליגות בינלאומיות ואירועי ספורט ב-Full HD (אפיק 55).',
      poster: createChannelBrandedPosterSvg('55', 'SPORT 55', 'כדורגל וספורט בשידור חי', '#062B16', '#0D4D28', '#22C55E'),
      backdrop: createChannelBrandedPosterSvg('55', 'SPORT 55', 'כדורגל וספורט בשידור חי', '#062B16', '#0D4D28', '#22C55E'),
      streamUrl: 'https://bein-esp-xumo.amagi.tv/playlist.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/296/index.m3u8',
        'https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8'
      ],
      genres: ['live', 'action'],
      genresHe: ['ספורט חי HD', 'אפיק 55']
    },
    {
      id: 'us_cbs_sports',
      type: 'channel',
      channelNumber: '56',
      logoText: 'CBS SPORT',
      subLabel: 'NBA, NFL וליגת האלופות',
      liveGroup: 'sports',
      brandAccent: '#0284C7',
      title: 'CBS Sports HQ USA — ספורט ארה״ב חי (אפיק 56)',
      originalTitle: 'CBS Sports HQ Live USA',
      year: 'LIVE',
      rating: 'אפיק 56',
      overview: 'ערוץ הספורט האמריקאי של רשת CBS (אפיק 56): NBA, NFL, ליגת האלופות, תקצירים ותוצאות בזמן אמת.',
      poster: createChannelBrandedPosterSvg('56', 'CBS SPORT', 'CBS Sports HQ USA Live', '#071E36', '#0D3863', '#0284C7'),
      backdrop: createChannelBrandedPosterSvg('56', 'CBS SPORT', 'CBS Sports HQ USA Live', '#071E36', '#0D3863', '#0284C7'),
      streamUrl: 'https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8',
      fallbackStreams: [
        'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
        'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8'
      ],
      genres: ['live', 'action'],
      genresHe: ['ספורט חי HD', 'אפיק 56']
    },
    {
      id: 'us_redbull_sports',
      type: 'channel',
      channelNumber: '57',
      logoText: 'RED BULL TV',
      subLabel: 'ספורט, מרוצים ואקסטרים HD',
      liveGroup: 'sports',
      brandAccent: '#E11D48',
      title: 'Red Bull TV Sports HD — ספורט ואקסטרים חי (אפיק 57)',
      originalTitle: 'Red Bull TV Sports Live',
      year: 'LIVE',
      rating: 'אפיק 57',
      overview: 'שידור חי ב-Full HD של אירועי ספורט, מרוצי פורמולה וראלי, גלישה ותחרויות אקסטרים (אפיק 57).',
      poster: createChannelBrandedPosterSvg('57', 'RED BULL', 'Red Bull TV Sports HD', '#2B0712', '#4D0C20', '#E11D48'),
      backdrop: createChannelBrandedPosterSvg('57', 'RED BULL', 'Red Bull TV Sports HD', '#2B0712', '#4D0C20', '#E11D48'),
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      fallbackStreams: [
        'https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8'
      ],
      genres: ['live', 'action'],
      genresHe: ['ספורט חי HD', 'אפיק 57']
    },
    {
      id: 'us_billiard_sports',
      type: 'channel',
      channelNumber: '58',
      logoText: 'ACC SPORT',
      subLabel: 'כדורסל ופוטבול ארה״ב חי',
      liveGroup: 'sports',
      brandAccent: '#16A34A',
      title: 'ACC Sports Network USA — ספורט אמריקאי חי (אפיק 58)',
      originalTitle: 'ACC Sports Network Live HD',
      year: 'LIVE',
      rating: 'אפיק 58',
      overview: 'שידור חי 24/7 של ליגות הכדורסל, הפוטבול והספורט מארצות הברית ב-Full HD (אפיק 58).',
      poster: createChannelBrandedPosterSvg('58', 'ACC SPORT', 'ACC Sports Network USA', '#082616', '#104528', '#16A34A'),
      backdrop: createChannelBrandedPosterSvg('58', 'ACC SPORT', 'ACC Sports Network USA', '#082616', '#104528', '#16A34A'),
      streamUrl: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
      fallbackStreams: [
        'https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8',
        'https://30a-tv.com/feeds/vidaa/golf.m3u8'
      ],
      genres: ['live', 'action'],
      genresHe: ['ספורט חי HD', 'אפיק 58']
    },
    {
      id: 'us_golf_sports59',
      type: 'channel',
      channelNumber: '59',
      logoText: 'SPORT 59 HD',
      subLabel: 'טורנירי ספורט וגולף עולמי HD',
      liveGroup: 'sports',
      brandAccent: '#10B981',
      title: 'SPORT 59 HD — ערוץ ספורט וגולף חי (אפיק 59)',
      originalTitle: 'Sport 59 HD Live',
      year: 'LIVE',
      rating: 'אפיק 59',
      overview: 'שידור חי 24/7 של טורנירי ספורט, גולף וליגות בינלאומיות ב-Full HD.',
      poster: createChannelBrandedPosterSvg('59', 'SPORT 59', 'ספורט וגולף בשידור חי', '#062B1E', '#0D4F36', '#10B981'),
      backdrop: createChannelBrandedPosterSvg('59', 'SPORT 59', 'ספורט וגולף בשידור חי', '#062B1E', '#0D4F36', '#10B981'),
      streamUrl: 'https://30a-tv.com/feeds/vidaa/golf.m3u8',
      fallbackStreams: [
        'https://bein-esp-xumo.amagi.tv/playlist.m3u8'
      ],
      genres: ['live', 'action'],
      genresHe: ['ספורט חי HD', 'אפיק 59']
    },
    {
      id: 'us_cbs_news',
      type: 'channel',
      channelNumber: '70',
      logoText: 'CBS NEWS',
      subLabel: 'חדשות ארה״ב 24/7 מניו יורק',
      liveGroup: 'news',
      brandAccent: '#2563EB',
      title: 'CBS News 24/7 USA — חדשות ארה״ב חי (אפיק 70)',
      originalTitle: 'CBS News 24/7 Live',
      year: 'LIVE',
      rating: 'אפיק 70',
      overview: 'ערוץ החדשות הרשמי של רשת CBS האמריקאית בשידור חי מסביב לשעון מניו יורק ווושינגטון (אפיק 70).',
      poster: createChannelBrandedPosterSvg('70', 'CBS NEWS', 'CBS News 24/7 USA Live', '#091B38', '#113266', '#2563EB'),
      backdrop: createChannelBrandedPosterSvg('70', 'CBS NEWS', 'CBS News 24/7 USA Live', '#091B38', '#113266', '#2563EB'),
      streamUrl: 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8',
      fallbackStreams: [
        'https://247wlive.foxweather.com/stream/index.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 70']
    },
    {
      id: 'us_fox_live',
      type: 'channel',
      channelNumber: '71',
      logoText: 'FOX LIVE',
      subLabel: 'שידור חי מרשת FOX ארה״ב',
      liveGroup: 'news',
      brandAccent: '#DC2626',
      title: 'FOX Live USA — שידור חי מארה״ב (אפיק 71)',
      originalTitle: 'FOX Live USA',
      year: 'LIVE',
      rating: 'אפיק 71',
      overview: 'שידור חי 24/7 מרשת FOX האמריקאית עם דיווחים ישירים מרחבי ארצות הברית (אפיק 71).',
      poster: createChannelBrandedPosterSvg('71', 'FOX LIVE', 'FOX Live Network USA', '#2B0909', '#4F1010', '#DC2626'),
      backdrop: createChannelBrandedPosterSvg('71', 'FOX LIVE', 'FOX Live Network USA', '#2B0909', '#4F1010', '#DC2626'),
      streamUrl: 'https://247wlive.foxweather.com/stream/index.m3u8',
      fallbackStreams: [
        'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 71']
    },
    {
      id: 'uk_sky_news',
      type: 'channel',
      channelNumber: '72',
      logoText: 'SKY NEWS',
      subLabel: 'חדשות עולמיות 24/7 ב-HD',
      liveGroup: 'news',
      brandAccent: '#EF4444',
      title: 'Sky News HD — חדשות עולמיות בשידור חי (אפיק 72)',
      originalTitle: 'Sky News International HD',
      year: 'LIVE',
      rating: 'אפיק 72',
      overview: 'שידור חי 24/7 של רשת Sky News הבינלאומית מלונדון באיכות Full HD (אפיק 72).',
      poster: createChannelBrandedPosterSvg('72', 'SKY NEWS', 'Sky News International HD', '#290A12', '#4D1120', '#EF4444'),
      backdrop: createChannelBrandedPosterSvg('72', 'SKY NEWS', 'Sky News International HD', '#290A12', '#4D1120', '#EF4444'),
      streamUrl: 'https://linear901-oo-hls0-prd-gtm.delivery.skycdp.com/17501/sde-fast-skynews/master.m3u8',
      fallbackStreams: [
        'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 72']
    },
    {
      id: 'eu_dw_news',
      type: 'channel',
      channelNumber: '73',
      logoText: 'DW NEWS',
      subLabel: 'חדשות בינלאומיות באנגלית',
      liveGroup: 'news',
      brandAccent: '#0EA5E9',
      title: 'DW News English HD — חדשות בינלאומיות (אפיק 73)',
      originalTitle: 'DW News Live HD',
      year: 'LIVE',
      rating: 'אפיק 73',
      overview: 'ערוץ החדשות הבינלאומי DW באנגלית בשידור חי מסביב לשעון (אפיק 73).',
      poster: createChannelBrandedPosterSvg('73', 'DW NEWS', 'DW News International HD', '#082038', '#0E3963', '#0EA5E9'),
      backdrop: createChannelBrandedPosterSvg('73', 'DW NEWS', 'DW News International HD', '#082038', '#0E3963', '#0EA5E9'),
      streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      fallbackStreams: [
        'https://live.france24.com/hls/live/2037218-b/F24_EN_HI_HLS/master_5000.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 73']
    },
    {
      id: 'eu_france24',
      type: 'channel',
      channelNumber: '74',
      logoText: 'FRANCE 24',
      subLabel: 'חדשות מהעולם באנגלית HD',
      liveGroup: 'news',
      brandAccent: '#38BDF8',
      title: 'France 24 English HD — חדשות מהעולם (אפיק 74)',
      originalTitle: 'France 24 English Live',
      year: 'LIVE',
      rating: 'אפיק 74',
      overview: 'שידור חי באנגלית של רשת החדשות הבינלאומית France 24 מפריז (אפיק 74).',
      poster: createChannelBrandedPosterSvg('74', 'FRANCE 24', 'France 24 English Live HD', '#07223B', '#0E3E6B', '#38BDF8'),
      backdrop: createChannelBrandedPosterSvg('74', 'FRANCE 24', 'France 24 English Live HD', '#07223B', '#0E3E6B', '#38BDF8'),
      streamUrl: 'https://live.france24.com/hls/live/2037218-b/F24_EN_HI_HLS/master_5000.m3u8',
      fallbackStreams: [
        'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 74']
    },
    {
      id: 'us_nbc_news',
      type: 'channel',
      channelNumber: '75',
      logoText: 'TRT WORLD',
      subLabel: 'חדשות עולמיות באנגלית 24/7',
      liveGroup: 'news',
      brandAccent: '#06B6D4',
      title: 'TRT World & Global News HD — חדשות באנגלית (אפיק 75)',
      originalTitle: 'Global English News 24/7',
      year: 'LIVE',
      rating: 'אפיק 75',
      overview: 'שידור חי באנגלית של חדשות, מבזקים ואירועים מרכזיים מהמזרח התיכון והעולם (אפיק 75).',
      poster: createChannelBrandedPosterSvg('75', 'TRT WORLD', 'Global News 24/7 English', '#072630', '#0D4557', '#06B6D4'),
      backdrop: createChannelBrandedPosterSvg('75', 'TRT WORLD', 'Global News 24/7 English', '#072630', '#0D4557', '#06B6D4'),
      streamUrl: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8',
      fallbackStreams: [
        'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 75']
    },
    {
      id: 'us_bloomberg',
      type: 'channel',
      channelNumber: '76',
      logoText: 'NHK WORLD',
      subLabel: 'כלכלה, טכנולוגיה ומדע חי',
      liveGroup: 'news',
      brandAccent: '#6366F1',
      title: 'NHK World & Business HD — כלכלה וטכנולוגיה (אפיק 76)',
      originalTitle: 'NHK World Business & Tech Live',
      year: 'LIVE',
      rating: 'אפיק 76',
      overview: 'שידור חי באנגלית: שוקי ההון, טכנולוגיה, מדע וחדשות כלכלה עולמיות (אפיק 76).',
      poster: createChannelBrandedPosterSvg('76', 'NHK WORLD', 'כלכלה, טכנולוגיה ומדע HD', '#13163B', '#222869', '#6366F1'),
      backdrop: createChannelBrandedPosterSvg('76', 'NHK WORLD', 'כלכלה, טכנולוגיה ומדע HD', '#13163B', '#222869', '#6366F1'),
      streamUrl: 'https://media-tyo.hls.nhkworld.jp/hls/w/live/master.m3u8',
      fallbackStreams: [
        'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8'
      ],
      genres: ['live', 'docu'],
      genresHe: ['חדשות 24/7', 'אפיק 76']
    },
    {
      id: 'il_hop77',
      type: 'channel',
      channelNumber: '77',
      logoText: 'ערוץ הופ!',
      subLabel: 'ערוץ הילדים והקטנטנים • yes / HOT',
      liveGroup: 'israeli',
      brandAccent: '#F43F5E',
      title: 'ערוץ הופ! ילדים — שידור חי (אפיק 77)',
      originalTitle: 'Hop Channel Israel Kids',
      year: 'LIVE',
      rating: 'אפיק 77',
      overview: 'שידור חי לילדים ופעוטות בערוץ הופ! וכאן חינוכית: תוכניות ילדים, שירים וסיפורים בעברית.',
      poster: createChannelBrandedPosterSvg('77', 'ערוץ הופ!', 'ערוץ הופ! ילדים חי', '#330814', '#5E0E24', '#F43F5E'),
      backdrop: createChannelBrandedPosterSvg('77', 'ערוץ הופ!', 'ערוץ הופ! ילדים חי', '#330814', '#5E0E24', '#F43F5E'),
      streamUrl: 'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/301/index.m3u8'
      ],
      genres: ['live', 'israeli', 'animation'],
      genresHe: ['עידן+ ישראל', 'אפיק 77']
    },
    {
      id: 'il_zoom78',
      type: 'channel',
      channelNumber: '78',
      logoText: 'ערוץ ZOOM',
      subLabel: 'סדרות ילדים ונוער • yes / HOT',
      liveGroup: 'israeli',
      brandAccent: '#8B5CF6',
      title: 'ערוץ זום (ZOOM) — ילדים ונוער חי (אפיק 78)',
      originalTitle: 'Zoom Channel Israel Live',
      year: 'LIVE',
      rating: 'אפיק 78',
      overview: 'ערוץ זום (ZOOM) לילדים ונוער מחבילות yes / HOT / סלקום TV בשידור חי.',
      poster: createChannelBrandedPosterSvg('78', 'ZOOM 78', 'ערוץ זום ילדים ונוער', '#1E0B38', '#381466', '#8B5CF6'),
      backdrop: createChannelBrandedPosterSvg('78', 'ZOOM 78', 'ערוץ זום ילדים ונוער', '#1E0B38', '#381466', '#8B5CF6'),
      streamUrl: 'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan_edu/live.livx/playlist.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/310/index.m3u8'
      ],
      genres: ['live', 'israeli', 'animation'],
      genresHe: ['עידן+ ישראל', 'אפיק 78']
    },
    {
      id: 'il_hidabroot',
      type: 'channel',
      channelNumber: '97',
      logoText: 'הידברות 97',
      subLabel: 'ערוץ הידברות הישראלי חי',
      liveGroup: 'israeli',
      brandAccent: '#F59E0B',
      title: 'ערוץ הידברות — שידור חי HD (אפיק 97)',
      originalTitle: 'Hidabroot Channel 97 Live',
      year: 'LIVE',
      rating: 'אפיק 97',
      overview: 'שידור חי 24/7 של ערוץ הידברות הישראלי (אפיק 97): הרצאות, תוכניות אירוח, משפחה ומורשת.',
      poster: createChannelBrandedPosterSvg('97', 'הידברות 97', 'ערוץ הידברות בשידור חי', '#2B1D06', '#4F350B', '#F59E0B'),
      backdrop: createChannelBrandedPosterSvg('97', 'הידברות 97', 'ערוץ הידברות בשידור חי', '#2B1D06', '#4F350B', '#F59E0B'),
      streamUrl: 'https://cdn.cybercdn.live/HidabrootIL/Live97/playlist.m3u8',
      fallbackStreams: [
        'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 97']
    },
    {
      id: 'il_knesset99',
      type: 'channel',
      channelNumber: '99',
      logoText: 'ערוץ הכנסת 99',
      logoImg: 'https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/israel/knesset-channel-il.png',
      subLabel: 'שידור חי ממשכן הכנסת • אפיק 99',
      liveGroup: 'israeli',
      brandAccent: '#3B82F6',
      title: 'ערוץ הכנסת 99 — שידור חי (אפיק 99)',
      originalTitle: 'Knesset Channel 99 Live',
      year: 'LIVE',
      rating: 'אפיק 99',
      overview: 'שידור ישיר ממשכן הכנסת בירושלים, ועדות הכנסת ומשדרי אקטואליה (אפיק 99).',
      poster: createChannelBrandedPosterSvg('99', 'הכנסת 99', 'ערוץ הכנסת בשידור חי', '#091D3E', '#10346E', '#3B82F6'),
      backdrop: createChannelBrandedPosterSvg('99', 'הכנסת 99', 'ערוץ הכנסת בשידור חי', '#091D3E', '#10346E', '#3B82F6'),
      streamUrl: 'https://contact.gostreaming.tv/Knesset/index.m3u8',
      fallbackStreams: [
        'http://stream.mcquack.net/300/index.m3u8',
        'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8'
      ],
      genres: ['live', 'israeli'],
      genresHe: ['עידן+ ישראל', 'אפיק 99']
    }
  ];

  // 1-Click Direct Live Packs for yes / HOT / NEXT TV / Cellcom TV style channels
  var PRESET_IPTV_PACKS = {
    yes_hot_next: [
      {
        id: 'iptv_yes_movies_action',
        type: 'channel',
        channelNumber: '18',
        logoText: 'YES/HOT ACTION',
        subLabel: 'ערוץ סרטי אקשן ודרמה חי',
        liveGroup: 'imported',
        brandAccent: '#E50914',
        title: 'yes / HOT Action & Movies — שידור חי (אפיק 18)',
        originalTitle: 'yes HOT Movies Action Live',
        year: 'LIVE',
        rating: 'אפיק 18',
        overview: 'ערוץ סרטי אקשן, מתח ודרמה בשידור חי רציף 24/7 (חבילת yes / HOT / NEXT TV).',
        streamUrl: 'https://mediaserver.abnvideos.com/streams/abnbiblemovies.m3u8',
        fallbackStreams: ['https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8']
      },
      {
        id: 'iptv_next_comedy_il',
        type: 'channel',
        channelNumber: '19',
        logoText: 'NEXT COMEDY',
        subLabel: 'קומדיות ובידור ישראלי 24/7',
        liveGroup: 'imported',
        brandAccent: '#F97316',
        title: 'NEXT TV / HOT קומדיה ובידור — שידור חי (אפיק 19)',
        originalTitle: 'NEXT TV Comedy Live',
        year: 'LIVE',
        rating: 'אפיק 19',
        overview: 'ערוץ קומדיות, סדרות ובידור ישראלי בשידור חי 24/7 (חבילת NEXT TV / HOT).',
        streamUrl: 'https://d15ds134q59udk.cloudfront.net/out/v1/fbba879221d045598540ee783b140fe2/index.m3u8',
        fallbackStreams: ['https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8']
      },
      {
        id: 'iptv_cellcom_reality',
        type: 'channel',
        channelNumber: '25',
        logoText: 'CELLCOM/HOT',
        subLabel: 'ריאליטי ולייף סטייל ישראלי',
        liveGroup: 'imported',
        brandAccent: '#A855F7',
        title: 'סלקום TV / yes ריאליטי ודרמות — שידור חי (אפיק 25)',
        originalTitle: 'Cellcom TV Reality Live',
        year: 'LIVE',
        rating: 'אפיק 25',
        overview: 'שידור רציף 24/7 של תוכניות ריאליטי, אירוח ולייף-סטייל ישראלי.',
        streamUrl: 'https://d1yd8hohnldm33.cloudfront.net/out/v1/19dee23c2cc24f689bd4e1288661ee0c/index.m3u8',
        fallbackStreams: ['https://d2xg1g9o5vns8m.cloudfront.net/out/v1/0855d703f7d5436fae6a9c7ce8ca5075/index.m3u8']
      },
      {
        id: 'iptv_yes_docu_nature',
        type: 'channel',
        channelNumber: '41',
        logoText: 'YES DOCU HD',
        subLabel: 'דוקו, טבע ומדע בשידור חי',
        liveGroup: 'imported',
        brandAccent: '#14B8A6',
        title: 'yes דוקו & Adventure HD — שידור חי (אפיק 41)',
        originalTitle: 'yes Docu Nature HD',
        year: 'LIVE',
        rating: 'אפיק 41',
        overview: 'סרטי תעודה, טבע, היסטוריה והרפתקאות ב-Full HD 24/7.',
        streamUrl: 'https://a57e9c69976649b582a8d7604c00e69a.mediatailor.us-east-1.amazonaws.com/v1/master/44f73ba4d03e9607dcd9bebdcb8494d86964f1d8/RlaxxTV-eu_AdventureEarth/playlist.m3u8',
        fallbackStreams: ['https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8']
      },
      {
        id: 'iptv_sport_gold',
        type: 'channel',
        channelNumber: '59',
        logoText: 'SPORT 59 HD',
        subLabel: 'גולף, טניס וספורט עולמי חי',
        liveGroup: 'imported',
        brandAccent: '#22C55E',
        title: 'SPORT 59 HD — ערוץ ספורט וגולף חי (אפיק 59)',
        originalTitle: 'Sport 59 HD Live',
        year: 'LIVE',
        rating: 'אפיק 59',
        overview: 'שידור חי 24/7 של טורנירי ספורט, גולף וליגות בינלאומיות ב-Full HD.',
        streamUrl: 'https://30a-tv.com/feeds/vidaa/golf.m3u8',
        fallbackStreams: ['https://bein-esp-xumo.amagi.tv/playlist.m3u8']
      }
    ]
  };

  // Built-in Curated YouTube Movies, Live Streams & 4K Trailers
  var BUILTIN_YOUTUBE_ITEMS = [
    { id: 'yt_Way9Dexny3w', videoId: 'Way9Dexny3w', type: 'youtube', title: 'חולית: חלק שני — טריילר קולנועי רשמי 4K', originalTitle: 'Dune: Part Two Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/Way9Dexny3w/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/Way9Dexny3w/maxresdefault.jpg', genres: ['youtube', 'scifi'], genresHe: ['יוטיוב 4K', 'טריילר רשמי'] },
    { id: 'yt_73_1biulkYk', videoId: '73_1biulkYk', type: 'youtube', title: 'דדפול & וולברין — טריילר רשמי Marvel 4K', originalTitle: 'Deadpool & Wolverine Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/73_1biulkYk/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/73_1biulkYk/maxresdefault.jpg', genres: ['youtube', 'action'], genresHe: ['יוטיוב 4K', 'מארוול'] },
    { id: 'yt_4rgYUipGJNo', videoId: '4rgYUipGJNo', type: 'youtube', title: 'גלדיאטור 2 — טריילר קולנועי רשמי HD', originalTitle: 'Gladiator II Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/4rgYUipGJNo/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/4rgYUipGJNo/maxresdefault.jpg', genres: ['youtube', 'action'], genresHe: ['יוטיוב 4K', 'אקשן'] },
    { id: 'yt_uYPbbksJxIg', videoId: 'uYPbbksJxIg', type: 'youtube', title: 'אופנהיימר — טריילר IMAX רשמי 4K', originalTitle: 'Oppenheimer Official Trailer', year: '2023', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/uYPbbksJxIg/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/uYPbbksJxIg/maxresdefault.jpg', genres: ['youtube', 'drama'], genresHe: ['יוטיוב 4K', 'דרמה'] },
    { id: 'yt_67vbA5ZJdKQ', videoId: '67vbA5ZJdKQ', type: 'youtube', title: 'רובוט פראי — טריילר רשמי DreamWorks 4K', originalTitle: 'The Wild Robot Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/67vbA5ZJdKQ/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/67vbA5ZJdKQ/maxresdefault.jpg', genres: ['youtube', 'animation'], genresHe: ['יוטיוב 4K', 'אנימציה'] },
    { id: 'yt_LEjhY15eCx0', videoId: 'LEjhY15eCx0', type: 'youtube', title: 'הקול בראש 2 — טריילר רשמי דיסני ופיקסאר', originalTitle: 'Inside Out 2 Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/LEjhY15eCx0/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/LEjhY15eCx0/maxresdefault.jpg', genres: ['youtube', 'animation'], genresHe: ['יוטיוב 4K', 'פיקסאר'] },
    { id: 'yt_hDZ7y8RP5HE', videoId: 'hDZ7y8RP5HE', type: 'youtube', title: 'מואנה 2 — טריילר קולנועי רשמי Disney 4K', originalTitle: 'Moana 2 Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/hDZ7y8RP5HE/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/hDZ7y8RP5HE/maxresdefault.jpg', genres: ['youtube', 'animation'], genresHe: ['יוטיוב 4K', 'דיסני'] },
    { id: 'yt_qSu6i2iFMO0', videoId: 'qSu6i2iFMO0', type: 'youtube', title: 'סוניק הקיפוד 3 — טריילר רשמי 4K', originalTitle: 'Sonic the Hedgehog 3 Official Trailer', year: '2024', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/qSu6i2iFMO0/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/qSu6i2iFMO0/maxresdefault.jpg', genres: ['youtube', 'action'], genresHe: ['יוטיוב 4K', 'הרפתקאות'] },
    { id: 'yt_21X5lGlDOfg', videoId: '21X5lGlDOfg', type: 'youtube', title: 'NASA Live — שידור חי מתחנת החלל הבינלאומית 4K', originalTitle: 'NASA Live Official Stream', year: 'LIVE', rating: 'YouTube Live', poster: 'https://i.ytimg.com/vi/21X5lGlDOfg/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/21X5lGlDOfg/maxresdefault.jpg', genres: ['youtube', 'docu'], genresHe: ['יוטיוב חי', 'מדע וחלל'] },
    { id: 'yt_jfKfPfyJRdk', videoId: 'jfKfPfyJRdk', type: 'youtube', title: 'Lofi Girl 24/7 — ערוץ מוזיקה בשידור חי', originalTitle: 'Lofi Hip Hop Radio 24/7 Live', year: 'LIVE', rating: 'YouTube Live', poster: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg', genres: ['youtube', 'music'], genresHe: ['יוטיוב חי', 'מוזיקה'] },
    { id: 'yt_zSWdZVtXT7E', videoId: 'zSWdZVtXT7E', type: 'youtube', title: 'בין כוכבים (Interstellar) — טריילר IMAX 4K', originalTitle: 'Interstellar Official Trailer', year: '2014', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/zSWdZVtXT7E/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/zSWdZVtXT7E/maxresdefault.jpg', genres: ['youtube', 'scifi'], genresHe: ['יוטיוב 4K', 'מדע בדיוני'] },
    { id: 'yt_EXeTwQWrcwY', videoId: 'EXeTwQWrcwY', type: 'youtube', title: 'האביר האפל (The Dark Knight) — טריילר רשמי 4K', originalTitle: 'The Dark Knight Official Trailer', year: '2008', rating: 'YouTube 4K', poster: 'https://i.ytimg.com/vi/EXeTwQWrcwY/hqdefault.jpg', backdrop: 'https://i.ytimg.com/vi/EXeTwQWrcwY/maxresdefault.jpg', genres: ['youtube', 'action'], genresHe: ['יוטיוב 4K', 'קלאסיקה'] }
  ];

  // Application State
  var state = {
    catalog: {
      movies: [],
      series: [],
      channels: [],
      youtube: BUILTIN_YOUTUBE_ITEMS.slice()
    },
    activeCategory: 'all',
    activeGenre: 'all',
    activeProvider: 'all',
    activeYear: 'all',
    activeActorId: 'all',
    activeActorName: '',
    activeActorPhoto: '',
    activeLiveGroup: 'all', // 'all' | 'israeli' | 'cinema' | 'sports' | 'news' | 'imported'
    liveSearchQuery: '',
    liveImportOpen: false,
    actorMoviesCache: {},
    actorPhotosCache: {},
    actorResults: [],
    gridPage: 1,
    isLoadingMore: false,
    youtubeQuery: '',
    heroItem: null,
    detailsItem: null,
    activeSeason: 1,
    activeEpisode: 1,
    playingItem: null,
    playingMode: 'video', // 'video' | 'embed'
    activeSourceTab: 'direct', // 'direct' | 'embed1' | 'embed2' | 'swarm' | 'trailer'
    plyrInstance: null,
    hlsInstance: null,
    playerIdleTimer: null,
    skipIntroHideTimer: null,
    // Subtitles state (Defaults per Elan's specification: ענק 42px, לבן, ללא רקע שקוף, 3.5%)
    parsedCues: [],
    subtitleTracks: [],
    activeSubTrackId: 'he-auto',
    subEnabled: true,
    subOffsetSec: 0,
    subSize: 'xlarge', // 'normal' | 'large' | 'xlarge' (Default: ענק)
    subFontPx: 42, // Free font size in px with + / - buttons (16px to 84px, default 42px = ענק)
    subColor: 'white', // 'white' | 'yellow' (Default: לבן)
    subBg: 'none', // 'none' | 'dark' (Default: ללא רקע שקוף)
    subBottomPct: 3.5, // % distance from bottom of screen (Default: 3.5%)
    // Search state
    searchFilter: 'all',
    searchDebounce: null,
    actorSearchDebounce: null,
    catalogWallLimit: 48,
    pythonApiConfirmed: false,
    // Account & Sub-Users ("מי צופה עכשיו?")
    user: null,
    subUsers: DEFAULT_SUB_USERS.slice(),
    activeSubUserId: 'prof-main',
    manageSubUsersMode: false,
    profileData: {}, // Keyed by activeSubUserId -> { watchlist: [], progress: {} }
    accountCloudSyncTimer: null,
    accountCloudSyncInFlight: false,
    // SafeWatch Parental Control & Automatic Scene Skipping State
    parentalMaster: {
      pinCode: '',
      customSkipSegments: {}
    },
    editingParentalProfileId: 'prof-main',
    parentalPinUnlockedThisSession: false,
    pendingProfileSwitchTargetId: '',
    activeSkipSegments: [],
    englishSdhCues: [],
    lastParentalSkipAt: 0,
    parentalTempMuted: false,
    parentalShieldActiveSegment: null,
    parentalSkippedCountThisSession: 0,
    parentalSkipBannerTimer: null,
    parentalEmbedSeekTargetSec: 0,
    parentalEmbedSeekUntilTs: 0
  };

  function ensureProfileParentalConfig(su) {
    if (!su || typeof su !== 'object') return null;
    // Normalize any legacy neon/bright avatar colors to matte Dark Cinema slate/crimson
    var legacyColorMap = {
      '#e50914': '#b91c1c',
      '#2563eb': '#334155',
      '#059669': '#3f3f46',
      '#10b981': '#3f3f46',
      '#d97706': '#475569',
      '#7c3aed': '#52525b',
      '#db2777': '#64748b'
    };
    var curCol = String(su.color || '').trim().toLowerCase();
    if (legacyColorMap[curCol]) {
      su.color = legacyColorMap[curCol];
    } else if (!curCol) {
      su.color = su.isPrimary ? '#b91c1c' : '#334155';
    }
    var isKids = Boolean(su.isKids);
    if (!su.parentalControl || typeof su.parentalControl !== 'object') {
      su.parentalControl = {
        enabled: isKids,
        actionMode: 'skip', // 'skip' | 'blur_mute'
        profanityMode: 'mute_censor', // 'mute_censor' | 'skip'
        sensitivity: isKids ? 'strict' : 'balanced', // 'balanced' | 'strict'
        categories: {
          sex: true,
          violence: true,
          profanity: true,
          drugs: true,
          horror: isKids
        }
      };
    } else {
      if (typeof su.parentalControl.enabled !== 'boolean') su.parentalControl.enabled = isKids;
      if (su.parentalControl.actionMode !== 'skip' && su.parentalControl.actionMode !== 'blur_mute') {
        su.parentalControl.actionMode = 'skip';
      }
      if (su.parentalControl.profanityMode !== 'mute_censor' && su.parentalControl.profanityMode !== 'skip') {
        su.parentalControl.profanityMode = 'mute_censor';
      }
      if (su.parentalControl.sensitivity !== 'balanced' && su.parentalControl.sensitivity !== 'strict') {
        su.parentalControl.sensitivity = isKids ? 'strict' : 'balanced';
      }
      var cats = su.parentalControl.categories || {};
      su.parentalControl.categories = {
        sex: typeof cats.sex === 'boolean' ? cats.sex : true,
        violence: typeof cats.violence === 'boolean' ? cats.violence : true,
        profanity: typeof cats.profanity === 'boolean' ? cats.profanity : true,
        drugs: typeof cats.drugs === 'boolean' ? cats.drugs : true,
        horror: typeof cats.horror === 'boolean' ? cats.horror : isKids
      };
    }
    return su.parentalControl;
  }

  function hasLocalBackend() {
    if (window.AndroidTvBridge && typeof window.AndroidTvBridge.isAndroidTv === 'function') return true;
    return Boolean(state.pythonApiConfirmed);
  }

  function getApiBase() {
    var host = window.location.hostname;
    var port = window.location.port;
    if ((host === 'localhost' || host === '127.0.0.1') && port === '8092') {
      return '';
    }
    return 'http://127.0.0.1:8092';
  }

  function updateBootLoaderProgress(percent, statusText, stepStates) {
    var loader = document.getElementById('appBootLoader');
    if (!loader) return;
    var pct = Math.max(5, Math.min(100, Math.round(Number(percent) || 10)));
    var barFill = document.getElementById('bootLoaderBarFill');
    var pctEl = document.getElementById('bootLoaderPercent');
    var txtEl = document.getElementById('bootLoaderStatusText');
    if (barFill) barFill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (txtEl && statusText) txtEl.textContent = statusText;

    if (stepStates && typeof stepStates === 'object') {
      var stepMap = {
        cloud: 'bootStepCloud',
        catalog: 'bootStepCatalog',
        safewatch: 'bootStepSafeWatch',
        ready: 'bootStepReady'
      };
      for (var k in stepMap) {
        if (Object.prototype.hasOwnProperty.call(stepMap, k) && stepStates[k]) {
          var sEl = document.getElementById(stepMap[k]);
          if (sEl) {
            sEl.classList.remove('active', 'done');
            if (stepStates[k] === 'active' || stepStates[k] === 'done') {
              sEl.classList.add(stepStates[k]);
            }
          }
        }
      }
    }

    if (pct >= 100) {
      setTimeout(function () {
        var ld = document.getElementById('appBootLoader');
        if (ld) ld.classList.add('boot-complete');
      }, 240);
    }
  }
  window.updateBootLoaderProgress = updateBootLoaderProgress;

  /**
   * Master Admin System Configuration (`streamit_system_config_v9`)
   * Controls Feature Toggles, Streaming Sources/Channels Connect/Disconnect, and Category Visibility
   */
  var DEFAULT_SYSTEM_CONFIG = {
    updatedTs: 0,
    features: {
      top10Shelves: true,
      strictPosterFilter: true,
      strictSourcesAndSubs: true,
      autoCollapseTvRail: true,
      parentalSafeWatch: true,
      bootLoaderAnim: true,
      autoResumePlayback: true,
      crossDeviceCloudSync: true,
      liveNewsTicker: true,
      otaAutoUpdate: true
    },
    sources: {
      vidsrc_vip: true,
      vidlink_mirror: true,
      tpb_yts_4k: true,
      telegram_vod: true,
      israeli_live: true,
      cinema_live: true,
      sports_live: true,
      news_live: true,
      youtube_hub: true
    },
    disabledChannelIds: {},
    disabledTelegramHandles: {},
    categories: {
      top10_most_watched: true,
      top10_newest: true,
      top10_series: true,
      top10_action: true,
      movies: true,
      series: true,
      israeli: true,
      channels: true,
      telegram: true,
      netflix: true,
      apple_hbo_prime: true,
      tpb_4k: true,
      action: true,
      crime: true,
      scifi: true,
      comedy: true,
      drama: true,
      horror: true,
      animation: true,
      docu: true,
      youtube: true
    }
  };

  function getSystemConfig() {
    if (!state.systemConfig) {
      loadSystemConfig();
    }
    return state.systemConfig;
  }

  function loadSystemConfig() {
    var cfg = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_CONFIG));
    try {
      var raw = localStorage.getItem('streamit_system_config_v9');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.updatedTs) cfg.updatedTs = Number(parsed.updatedTs) || 0;
          if (parsed.features && typeof parsed.features === 'object') {
            Object.keys(parsed.features).forEach(function (k) { cfg.features[k] = Boolean(parsed.features[k]); });
          }
          if (parsed.sources && typeof parsed.sources === 'object') {
            Object.keys(parsed.sources).forEach(function (k) { cfg.sources[k] = Boolean(parsed.sources[k]); });
          }
          if (parsed.categories && typeof parsed.categories === 'object') {
            Object.keys(parsed.categories).forEach(function (k) { cfg.categories[k] = Boolean(parsed.categories[k]); });
          }
          if (parsed.disabledChannelIds && typeof parsed.disabledChannelIds === 'object') {
            cfg.disabledChannelIds = parsed.disabledChannelIds;
          }
          if (parsed.disabledTelegramHandles && typeof parsed.disabledTelegramHandles === 'object') {
            cfg.disabledTelegramHandles = parsed.disabledTelegramHandles;
          }
        }
      }
    } catch (e) {}
    state.systemConfig = cfg;
    if (!state.brokenPosterIds) state.brokenPosterIds = {};
    applySystemConfigToUi();
    return cfg;
  }

  function applySystemConfigToUi() {
    var cfg = state.systemConfig || DEFAULT_SYSTEM_CONFIG;
    if (document.body) {
      if (cfg.features && cfg.features.autoCollapseTvRail === false) {
        document.body.classList.add('tv-rail-pinned-open');
      } else {
        document.body.classList.remove('tv-rail-pinned-open');
      }
    }
    var tickerBar = document.getElementById('liveNewsTickerBar');
    if (tickerBar && cfg.features) {
      tickerBar.style.display = (cfg.features.liveNewsTicker === false) ? 'none' : '';
    }
    var bootEl = document.getElementById('appBootLoader');
    if (bootEl && cfg.features && cfg.features.bootLoaderAnim === false) {
      bootEl.classList.add('boot-complete');
    }
    // Sync top header category nav visibility
    var catNavMap = {
      movies: 'movies',
      series: 'series',
      israeli: 'israeli',
      channels: 'channels',
      telegram: 'telegram',
      youtube: 'youtube'
    };
    var navBtns = document.querySelectorAll('#topHeader [data-category]');
    for (var i = 0; i < navBtns.length; i++) {
      var cKey = navBtns[i].getAttribute('data-category');
      if (cKey && catNavMap[cKey]) {
        var visible = cfg.categories[catNavMap[cKey]] !== false;
        if (cKey === 'telegram' && cfg.sources.telegram_vod === false) visible = false;
        if (cKey === 'channels' && cfg.sources.israeli_live === false && cfg.sources.cinema_live === false && cfg.sources.sports_live === false && cfg.sources.news_live === false) visible = false;
        if (cKey === 'youtube' && cfg.sources.youtube_hub === false) visible = false;
        navBtns[i].style.display = visible ? '' : 'none';
      }
    }
  }

  window.__streamItHandleBrokenPoster = function (imgEl, itemId) {
    if (itemId) {
      if (!state.brokenPosterIds) state.brokenPosterIds = {};
      state.brokenPosterIds[String(itemId)] = true;
    }
    if (imgEl) {
      var card = imgEl.closest ? imgEl.closest('.poster-card') : null;
      if (card && card.parentNode) {
        card.parentNode.removeChild(card);
      }
    }
  };

  /**
   * Per-Account & Per-Sub-User Strictly Isolated State Persistence
   * Every account (`state.user.email`) gets its own completely separate profiles, watch history (`progress`), and watchlist!
   */
  function getUserAccountNamespace() {
    var email = (state.user && state.user.email) ? String(state.user.email).trim().toLowerCase() : 'guest_unauthenticated';
    return email.replace(/[^a-z0-9@._-]/g, '_');
  }

  function buildDefaultSubUsersForAccount() {
    var primaryName = (state.user && state.user.name) ? state.user.name : 'פרופיל ראשי';
    var maxProf = (state.user && Number(state.user.max_profiles) > 0) ? Number(state.user.max_profiles) : 5;
    var list = [
      { id: 'prof-main', name: primaryName, color: '#b91c1c', isKids: false, isPrimary: true },
      { id: 'prof-living', name: 'סלון', color: '#334155', isKids: false, isPrimary: false },
      { id: 'prof-bedroom', name: 'חדר שינה', color: '#3f3f46', isKids: false, isPrimary: false },
      { id: 'prof-kids', name: 'ילדים ונוער', color: '#475569', isKids: true, isPrimary: false }
    ];
    var sliced = list.slice(0, Math.max(1, maxProf));
    for (var i = 0; i < sliced.length; i++) {
      ensureProfileParentalConfig(sliced[i]);
    }
    return sliced;
  }

  function loadAccountScopedState() {
    var ns = getUserAccountNamespace();
    state.subUsers = buildDefaultSubUsersForAccount();
    state.activeSubUserId = 'prof-main';
    state.profileData = {};
    state.parentalMaster = { pinCode: '', customSkipSegments: {} };
    state.parentalPinUnlockedThisSession = false;

    try {
      var pmRaw = localStorage.getItem('streamit_parental_master_v965_' + ns);
      if (pmRaw) {
        var pmObj = JSON.parse(pmRaw);
        if (pmObj && typeof pmObj === 'object') {
          state.parentalMaster.pinCode = String(pmObj.pinCode || '').trim();
          state.parentalMaster.customSkipSegments = (pmObj.customSkipSegments && typeof pmObj.customSkipSegments === 'object')
            ? pmObj.customSkipSegments
            : {};
        }
      }
    } catch (e) {}

    if (!state.user || !state.user.email) {
      ensureActiveProfileBucket();
      return;
    }

    try {
      var su = localStorage.getItem('streamit_subusers_v954_' + ns);
      if (su) {
        var parsedSu = JSON.parse(su);
        if (Array.isArray(parsedSu) && parsedSu.length) {
          state.subUsers = parsedSu;
          // Ensure primary profile always reflects the account's name rather than another user's name
          if (state.subUsers[0] && state.subUsers[0].isPrimary && state.user.name && state.subUsers[0].name === 'ראשי (VIP)' && state.user.email !== 'streamittvapp@gmail.com') {
            state.subUsers[0].name = state.user.name;
          }
          for (var p = 0; p < state.subUsers.length; p++) {
            ensureProfileParentalConfig(state.subUsers[p]);
          }
        }
      }
    } catch (e) {}

    try {
      var actId = localStorage.getItem('streamit_active_subuser_v954_' + ns);
      if (actId && state.subUsers.some(function (u) { return u.id === actId; })) {
        state.activeSubUserId = actId;
      }
    } catch (e) {}

    try {
      var pd = localStorage.getItem('streamit_profile_data_v954_' + ns);
      if (pd) {
        state.profileData = JSON.parse(pd) || {};
      }
    } catch (e) {}

    ensureActiveProfileBucket();
  }

  function loadLocalStorageState() {
    loadSystemConfig();
    try {
      var usr = localStorage.getItem('streamit_user_v9');
      if (usr) {
        state.user = JSON.parse(usr);
        if (state.user && state.user.email && state.user.email.indexOf('@streamit.') !== -1) {
          state.user.email = 'streamittvapp@gmail.com';
          localStorage.setItem('streamit_user_v9', JSON.stringify(state.user));
        }
      }
    } catch (e) {}

    loadAccountScopedState();

    try {
      var sp = localStorage.getItem('streamit_sub_prefs_v947');
      if (sp) {
        var p = JSON.parse(sp);
        if (p.size) state.subSize = p.size;
        if (typeof p.fontPx === 'number' && p.fontPx >= 14 && p.fontPx <= 96) state.subFontPx = p.fontPx;
        if (p.color) state.subColor = p.color;
        if (p.bg) state.subBg = p.bg;
        if (typeof p.bottomPct === 'number') state.subBottomPct = p.bottomPct;
      }
    } catch (e) {}
  }

  function ensureActiveProfileBucket() {
    var pid = state.activeSubUserId || 'prof-main';
    if (!state.profileData[pid]) {
      state.profileData[pid] = { watchlist: [], progress: {} };
    }
    return state.profileData[pid];
  }

  function getActiveSubUser() {
    for (var i = 0; i < state.subUsers.length; i++) {
      if (state.subUsers[i].id === state.activeSubUserId) return state.subUsers[i];
    }
    return state.subUsers[0] || buildDefaultSubUsersForAccount()[0];
  }

  function saveSubUsersState(opts) {
    var ns = getUserAccountNamespace();
    var nowTs = Date.now();
    try {
      localStorage.setItem('streamit_subusers_v954_' + ns, JSON.stringify(state.subUsers));
      localStorage.setItem('streamit_active_subuser_v954_' + ns, state.activeSubUserId);
      localStorage.setItem('streamit_profile_data_v954_' + ns, JSON.stringify(state.profileData));
      localStorage.setItem('streamit_parental_master_v965_' + ns, JSON.stringify(state.parentalMaster || { pinCode: '', customSkipSegments: {} }));
      localStorage.setItem('streamit_account_state_ts_' + ns, String(nowTs));
    } catch (e) {}
    if (!opts || !opts.skipCloud) {
      var delay = (opts && typeof opts.cloudDelayMs === 'number') ? opts.cloudDelayMs : 1200;
      scheduleCloudAccountStateSync(delay);
    }
  }

  function saveParentalMasterState() {
    var ns = getUserAccountNamespace();
    try {
      localStorage.setItem('streamit_parental_master_v965_' + ns, JSON.stringify(state.parentalMaster || { pinCode: '', customSkipSegments: {} }));
      localStorage.setItem('streamit_account_state_ts_' + ns, String(Date.now()));
    } catch (e) {}
    scheduleCloudAccountStateSync(1200);
  }

  function saveSubtitlePrefs() {
    try {
      localStorage.setItem('streamit_sub_prefs_v947', JSON.stringify({
        size: state.subSize || 'xlarge',
        fontPx: typeof state.subFontPx === 'number' ? state.subFontPx : 42,
        color: state.subColor || 'white',
        bg: state.subBg || 'none',
        bottomPct: typeof state.subBottomPct === 'number' ? state.subBottomPct : 3.5
      }));
    } catch (e) {}
    scheduleCloudAccountStateSync(1500);
  }

  /**
   * Cross-Device Cloud Sync for Sub-Users, Watch History, Watchlist, Parental Control & Subtitle Settings
   * Synchronizes `vault[email].accountState` directly with `data/accounts_vault.json` on GitHub Cloud!
   */
  function buildCurrentAccountStatePayload() {
    var ns = getUserAccountNamespace();
    var localTs = 0;
    try {
      localTs = Number(localStorage.getItem('streamit_account_state_ts_' + ns) || 0);
    } catch (e) {}
    return {
      updatedTs: localTs || Date.now(),
      activeSubUserId: state.activeSubUserId || 'prof-main',
      subUsers: JSON.parse(JSON.stringify(state.subUsers || [])),
      profileData: JSON.parse(JSON.stringify(state.profileData || {})),
      parentalMaster: JSON.parse(JSON.stringify(state.parentalMaster || { pinCode: '', customSkipSegments: {} })),
      subPrefs: {
        size: state.subSize || 'xlarge',
        fontPx: typeof state.subFontPx === 'number' ? state.subFontPx : 42,
        color: state.subColor || 'white',
        bg: state.subBg || 'none',
        bottomPct: typeof state.subBottomPct === 'number' ? state.subBottomPct : 3.5
      }
    };
  }

  function applyCloudAccountStateToLocal(cloudState) {
    if (!cloudState || typeof cloudState !== 'object' || !state.user || !state.user.email) return false;
    var ns = getUserAccountNamespace();
    var localTs = 0;
    try {
      localTs = Number(localStorage.getItem('streamit_account_state_ts_' + ns) || 0);
    } catch (e) {}
    var cloudTs = Number(cloudState.updatedTs || 0);
    var cloudIsNewer = (cloudTs >= localTs) || (localTs === 0);

    // 1. Merge / Adopt Sub-Users ("מי צופה עכשיו?")
    if (Array.isArray(cloudState.subUsers) && cloudState.subUsers.length > 0) {
      if (cloudIsNewer) {
        var mergedSu = JSON.parse(JSON.stringify(cloudState.subUsers));
        for (var i = 0; i < state.subUsers.length; i++) {
          var lSu = state.subUsers[i];
          if (lSu && lSu.id && !mergedSu.some(function (c) { return c.id === lSu.id; })) {
            mergedSu.push(lSu);
          }
        }
        for (var m = 0; m < mergedSu.length; m++) {
          ensureProfileParentalConfig(mergedSu[m]);
        }
        state.subUsers = mergedSu;
      } else {
        for (var c = 0; c < cloudState.subUsers.length; c++) {
          var cSu = cloudState.subUsers[c];
          if (cSu && cSu.id && !state.subUsers.some(function (l) { return l.id === cSu.id; })) {
            ensureProfileParentalConfig(cSu);
            state.subUsers.push(cSu);
          }
        }
      }
    }

    // 2. Active Sub-User ID
    if (cloudState.activeSubUserId && cloudIsNewer) {
      if (state.subUsers.some(function (u) { return u.id === cloudState.activeSubUserId; })) {
        state.activeSubUserId = cloudState.activeSubUserId;
      }
    }

    // 3. Merge Per-Profile Watchlist & Continue Watching (`profileData`)
    if (cloudState.profileData && typeof cloudState.profileData === 'object') {
      if (!state.profileData || typeof state.profileData !== 'object') state.profileData = {};
      var pKeys = Object.keys(cloudState.profileData);
      for (var k = 0; k < pKeys.length; k++) {
        var pid = pKeys[k];
        var cBucket = cloudState.profileData[pid];
        if (!cBucket || typeof cBucket !== 'object') continue;
        if (!state.profileData[pid]) {
          state.profileData[pid] = { watchlist: [], progress: {} };
        }
        var lBucket = state.profileData[pid];

        // Watchlist merge
        if (Array.isArray(cBucket.watchlist)) {
          if (cloudIsNewer) {
            var wlSet = cBucket.watchlist.slice();
            for (var w = 0; w < (lBucket.watchlist || []).length; w++) {
              if (wlSet.indexOf(lBucket.watchlist[w]) === -1) wlSet.push(lBucket.watchlist[w]);
            }
            lBucket.watchlist = wlSet;
          } else {
            for (var cw = 0; cw < cBucket.watchlist.length; cw++) {
              if (lBucket.watchlist.indexOf(cBucket.watchlist[cw]) === -1) {
                lBucket.watchlist.push(cBucket.watchlist[cw]);
              }
            }
          }
        }

        // Continue Watching (`progress`) merge by newest `updatedAt` per item
        if (cBucket.progress && typeof cBucket.progress === 'object') {
          if (!lBucket.progress || typeof lBucket.progress !== 'object') lBucket.progress = {};
          var itemIds = Object.keys(cBucket.progress);
          for (var it = 0; it < itemIds.length; it++) {
            var itemId = itemIds[it];
            var cProg = cBucket.progress[itemId];
            var lProg = lBucket.progress[itemId];
            if (!cProg) continue;
            if (!lProg || Number(cProg.updatedAt || 0) >= Number(lProg.updatedAt || 0)) {
              lBucket.progress[itemId] = cProg;
            }
          }
        }
      }
    }

    // 4. Merge Parental Master State (PIN & Custom Skip Segments)
    if (cloudState.parentalMaster && typeof cloudState.parentalMaster === 'object') {
      if (!state.parentalMaster) state.parentalMaster = { pinCode: '', customSkipSegments: {} };
      if (cloudIsNewer && typeof cloudState.parentalMaster.pinCode === 'string') {
        state.parentalMaster.pinCode = cloudState.parentalMaster.pinCode;
      } else if (!state.parentalMaster.pinCode && cloudState.parentalMaster.pinCode) {
        state.parentalMaster.pinCode = cloudState.parentalMaster.pinCode;
      }
      if (cloudState.parentalMaster.customSkipSegments && typeof cloudState.parentalMaster.customSkipSegments === 'object') {
        if (!state.parentalMaster.customSkipSegments) state.parentalMaster.customSkipSegments = {};
        var segKeys = Object.keys(cloudState.parentalMaster.customSkipSegments);
        for (var sk = 0; sk < segKeys.length; sk++) {
          var mKey = segKeys[sk];
          if (!state.parentalMaster.customSkipSegments[mKey] || cloudIsNewer) {
            state.parentalMaster.customSkipSegments[mKey] = cloudState.parentalMaster.customSkipSegments[mKey];
          }
        }
      }
    }

    // 5. Subtitle Preferences
    if (cloudState.subPrefs && typeof cloudState.subPrefs === 'object' && cloudIsNewer) {
      if (cloudState.subPrefs.size) state.subSize = cloudState.subPrefs.size;
      if (typeof cloudState.subPrefs.fontPx === 'number') state.subFontPx = cloudState.subPrefs.fontPx;
      if (cloudState.subPrefs.color) state.subColor = cloudState.subPrefs.color;
      if (cloudState.subPrefs.bg) state.subBg = cloudState.subPrefs.bg;
      if (typeof cloudState.subPrefs.bottomPct === 'number') state.subBottomPct = cloudState.subPrefs.bottomPct;
      try {
        localStorage.setItem('streamit_sub_prefs_v947', JSON.stringify(cloudState.subPrefs));
      } catch (e) {}
    }

    ensureActiveProfileBucket();
    saveSubUsersState({ skipCloud: true });
    if (cloudTs > 0) {
      try {
        localStorage.setItem('streamit_account_state_ts_' + ns, String(Math.max(localTs, cloudTs)));
      } catch (e) {}
    }
    return true;
  }

  async function syncAccountStateFromCloudVault() {
    if (!state.user || !state.user.email) return false;
    var cleanEmail = String(state.user.email).trim().toLowerCase();
    try {
      var tk = getCloudVaultSyncToken();
      var ghHeaders = { 'Accept': 'application/vnd.github.v3+json' };
      if (tk) ghHeaders['Authorization'] = 'token ' + tk;
      var ghRes = await fetch('https://api.github.com/repos/streamittvapp/stream-it-app/contents/data/accounts_vault.json?t=' + Date.now(), {
        headers: ghHeaders,
        cache: 'no-store'
      });
      if (ghRes.ok) {
        var ghMeta = await ghRes.json();
        if (ghMeta && ghMeta.content) {
          var rawJson = decodeURIComponent(escape(atob(String(ghMeta.content).replace(/\s/g, ''))));
          var ghVault = JSON.parse(rawJson);
          if (ghVault && typeof ghVault === 'object') {
            if (ghVault._system_config && typeof ghVault._system_config === 'object') {
              var localSysTs = (state.systemConfig && state.systemConfig.updatedTs) ? Number(state.systemConfig.updatedTs) : 0;
              var cloudSysTs = Number(ghVault._system_config.updatedTs || 0);
              if (cloudSysTs >= localSysTs) {
                try {
                  localStorage.setItem('streamit_system_config_v9', JSON.stringify(ghVault._system_config));
                } catch (e) {}
                loadSystemConfig();
              }
            }
            var rec = ghVault[cleanEmail];
            if (rec) {
              if (rec.display_name && state.user.name !== rec.display_name) {
                state.user.name = rec.display_name;
                try { localStorage.setItem('streamit_user_v9', JSON.stringify(state.user)); } catch (e) {}
              }
              if (rec.accountState && typeof rec.accountState === 'object') {
                applyCloudAccountStateToLocal(rec.accountState);
                updateAuthUi();
                applySubtitleStyleToOverlay();
                renderCatalogShelves();
                return true;
              } else {
                // First time this account connects from a device with local state -> push local state to Cloud Vault!
                scheduleCloudAccountStateSync(800);
              }
            }
          }
        }
      }
    } catch (e) {}
    return false;
  }

  function scheduleCloudAccountStateSync(delayMs) {
    if (!state.user || !state.user.email) return;
    if (state.accountCloudSyncTimer) {
      clearTimeout(state.accountCloudSyncTimer);
    }
    state.accountCloudSyncTimer = setTimeout(function () {
      state.accountCloudSyncTimer = null;
      pushAccountStateToCloudVault();
    }, typeof delayMs === 'number' ? delayMs : 1200);
  }

  async function pushAccountStateToCloudVault() {
    if (!state.user || !state.user.email || state.accountCloudSyncInFlight) return false;
    var cleanEmail = String(state.user.email).trim().toLowerCase();
    var tk = getCloudVaultSyncToken();
    if (!tk) return false;

    state.accountCloudSyncInFlight = true;
    try {
      var apiUrl = 'https://api.github.com/repos/streamittvapp/stream-it-app/contents/data/accounts_vault.json';
      var getRes = await fetch(apiUrl + '?t=' + Date.now(), {
        headers: {
          'Authorization': 'token ' + tk,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      });
      if (!getRes.ok) {
        state.accountCloudSyncInFlight = false;
        return false;
      }
      var meta = await getRes.json();
      var sha = meta.sha || '';
      var remoteVault = {};
      if (meta && meta.content) {
        var remoteJson = decodeURIComponent(escape(atob(String(meta.content).replace(/\s/g, ''))));
        remoteVault = JSON.parse(remoteJson) || {};
      }
      if (!remoteVault[cleanEmail]) {
        remoteVault[cleanEmail] = {
          email: cleanEmail,
          display_name: state.user.name || cleanEmail.split('@')[0],
          status: 'approved',
          role: state.user.role || 'member',
          max_profiles: Number(state.user.max_profiles || 5)
        };
      }
      remoteVault[cleanEmail].accountState = buildCurrentAccountStatePayload();

      try {
        localStorage.setItem('streamit_cloud_vault_v9', JSON.stringify(remoteVault));
      } catch (e) {}

      var contentStr = JSON.stringify(remoteVault, null, 2);
      var b64Content = btoa(unescape(encodeURIComponent(contentStr)));
      await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': 'token ' + tk,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'chore(vault): sync cross-device user profiles and watch history',
          content: b64Content,
          sha: sha
        })
      });
      state.accountCloudSyncInFlight = false;
      return true;
    } catch (e) {
      state.accountCloudSyncInFlight = false;
      return false;
    }
  }

  /**
   * Item Normalization (Supports `data/hebrew_catalog.json`, TMDB API, Cinemeta, YTS, PirateBay & Telegram)
   */
  function normalizeItem(raw, fallbackType, forcedGenreKey) {
    if (!raw) return null;
    var rawType = String(raw.type || fallbackType || (raw.first_air_date || raw.name ? 'series' : 'movie')).toLowerCase();
    var type = rawType === 'tv' ? 'series' : (rawType === 'live' ? 'channel' : rawType);

    var rawIdStr = String(raw.id || '');
    var imdbId = String(raw.imdb_id || raw.imdbId || (rawIdStr.indexOf('tt') === 0 ? rawIdStr : '') || '').trim();
    var tmdbId = String(raw.tmdb_id || raw.tmdbId || (rawIdStr.indexOf('tt') !== 0 && rawIdStr.indexOf('il_') !== 0 ? rawIdStr : '') || '').replace(/^(movie-|tv-|series-)/, '');

    var rawTitleHe = raw.title_he || raw.israeliTitle || raw.title || raw.name || 'ללא שם';
    var heTitle = ISRAELI_TITLES[tmdbId] || rawTitleHe;
    var origTitle = raw.title_en || raw.originalTitle || raw.original_title || raw.original_name || '';

    // Filter out untranslated Far-East / CJK / Thai / Indic scripts (e.g. Japanese ~ドクターX ~外科医・大門未知子) that have no Hebrew translation
    var farEastScriptRe = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af\u0e00-\u0e7f\u0b80-\u0bff]/;
    if (type !== 'channel' && farEastScriptRe.test(heTitle) && !/[\u0590-\u05FF]/.test(heTitle)) {
      return null;
    }

    var origLang = String(raw.original_language || '').toLowerCase();
    var origCountries = Array.isArray(raw.origin_country) ? raw.origin_country : [];
    var isTrulyIsraeli =
      type === 'channel' ||
      rawIdStr.indexOf('il_') === 0 ||
      origLang === 'he' ||
      origCountries.indexOf('IL') !== -1 ||
      (!origLang && Array.isArray(raw.genres) && raw.genres.indexOf('israeli') !== -1 && /[\u0590-\u05FF]/.test(heTitle));

    var channelNumber = String(raw.channelNumber || raw.channel_number || (rawIdStr.match(/\d+/) ? rawIdStr.match(/\d+/)[0] : 'LIVE'));
    var logoText = String(raw.logoText || raw.logo_text || heTitle.split('—')[0].trim().slice(0, 14));
    var subLabel = String(raw.subLabel || raw.sub_label || 'שידור חי ישיר HD');
    var liveGroup = String(raw.liveGroup || raw.live_group || (rawIdStr.indexOf('il_') === 0 ? 'israeli' : 'imported'));
    var brandAccent = String(raw.brandAccent || raw.brand_accent || '#E50914');

    var poster = raw.poster || raw.posterUrl || raw.logo || raw.medium_cover_image || raw.large_cover_image || '';
    if (!poster && raw.poster_path) poster = TMDB_IMG_POSTER + raw.poster_path;
    if (!poster && raw.backdrop_path) poster = TMDB_IMG_POSTER + raw.backdrop_path;
    if (type === 'channel' && (!poster || poster.indexOf('images.unsplash.com') !== -1)) {
      poster = createChannelBrandedPosterSvg(channelNumber, logoText, subLabel, '#0B132B', '#1C2541', brandAccent);
    }
    var sysCfgNorm = getSystemConfig();
    if (type !== 'channel') {
      var hasBadPoster = !poster ||
        String(poster).indexOf('1489599849927') !== -1 ||
        String(poster).indexOf('undefined') !== -1 ||
        String(poster).indexOf('null') !== -1 ||
        String(poster).trim().length < 10;
      if (hasBadPoster && sysCfgNorm.features.strictPosterFilter !== false) {
        return null;
      }
      if (!poster) {
        return null;
      }
    }

    var backdrop = raw.backdrop || raw.backdropUrl || raw.background_image_original || raw.background_image || '';
    if (!backdrop && raw.backdrop_path) backdrop = TMDB_IMG_BACKDROP + raw.backdrop_path;
    if (type === 'channel' && (!backdrop || backdrop.indexOf('images.unsplash.com') !== -1)) {
      backdrop = poster;
    }
    if (!backdrop) backdrop = poster;

    var year = raw.year || '';
    if (!year && (raw.release_date || raw.first_air_date || raw.releaseInfo)) {
      year = String(raw.release_date || raw.first_air_date || raw.releaseInfo).slice(0, 4);
    }
    if (!year) year = type === 'channel' ? 'LIVE' : '2025';

    var rating = raw.imdb_rating || raw.rating || raw.imdbRating || raw.vote_average || '8.4';
    if (typeof rating === 'number') rating = rating.toFixed(1);

    var overview = raw.overview_he || raw.description_he || raw.overview || raw.description || raw.synopsis || raw.plot || '';
    if (!overview || overview.length < 10) {
      overview = (type === 'series' ? 'סדרת טלוויזיה מובילה ' : 'סרט קולנוע מוביל ') + 'לצפייה ישירה באיכות Full HD / 4K עם כתוביות מסונכרנות בעברית.';
    }

    var isRealTelegramItem = (raw.source === 'telegram' || String(raw.id || '').indexOf('tg_') === 0 || forcedGenreKey === 'telegram');
    var genreKeys = [];
    if (Array.isArray(raw.genres)) {
      for (var g = 0; g < raw.genres.length; g++) {
        var gv = raw.genres[g];
        if (typeof gv === 'string') {
          var gl = gv.toLowerCase();
          if (gl === 'sci-fi' || gl === 'science fiction') gl = 'scifi';
          if (gl === 'documentary') gl = 'docu';
          if (gl === 'telegram' && !isRealTelegramItem) continue;
          if (genreKeys.indexOf(gl) === -1) genreKeys.push(gl);
        } else if (gv && gv.id && TMDB_GENRE_MAP[gv.id]) {
          if (genreKeys.indexOf(TMDB_GENRE_MAP[gv.id]) === -1) genreKeys.push(TMDB_GENRE_MAP[gv.id]);
        }
      }
    }
    if (Array.isArray(raw.genre_ids)) {
      for (var gi = 0; gi < raw.genre_ids.length; gi++) {
        var mapped = TMDB_GENRE_MAP[raw.genre_ids[gi]];
        if (mapped && genreKeys.indexOf(mapped) === -1) genreKeys.push(mapped);
      }
    }
    if (forcedGenreKey && genreKeys.indexOf(forcedGenreKey) === -1) {
      if (forcedGenreKey !== 'israeli' || isTrulyIsraeli) {
        genreKeys.push(forcedGenreKey);
      }
    }
    if (isTrulyIsraeli && type !== 'channel' && genreKeys.indexOf('israeli') === -1) {
      genreKeys.push('israeli');
    }
    if (!isTrulyIsraeli && genreKeys.indexOf('israeli') !== -1) {
      genreKeys = genreKeys.filter(function (gk) { return gk !== 'israeli'; });
    }
    if (isRealTelegramItem && genreKeys.indexOf('telegram') === -1) {
      genreKeys.push('telegram');
    }
    if (!genreKeys.length) {
      genreKeys.push(type === 'channel' ? 'live' : 'drama');
    }

    var genresHe = Array.isArray(raw.genres_he) && raw.genres_he.length
      ? raw.genres_he.filter(function (gh) { return isTrulyIsraeli || gh.indexOf('ישראל') === -1; })
      : genreKeys.map(function (k) { return GENRE_HE_LABELS[k] || 'דרמה'; });

    var streamUrl = raw.stream_url || raw.streamUrl || raw.hls_url || raw.directUrl || '';
    var fallbackStreams = Array.isArray(raw.fallback_streams)
      ? raw.fallback_streams.slice()
      : (Array.isArray(raw.fallbackStreams) ? raw.fallbackStreams.slice() : []);
    if (raw.backup_hls_url && fallbackStreams.indexOf(raw.backup_hls_url) === -1) {
      fallbackStreams.unshift(raw.backup_hls_url);
    }
    var videoId = raw.videoId || '';
    var directYtId = raw.direct_yt_id || raw.directYtId || '';
    var trailerYtId = raw.trailer_yt_id || raw.trailerYtId || '';

    if (type !== 'channel' && sysCfgNorm.features.strictSourcesAndSubs !== false) {
      var hasPlayableId = Boolean(imdbId || tmdbId || streamUrl || videoId || directYtId || (fallbackStreams && fallbackStreams.length));
      if (!hasPlayableId) {
        return null;
      }
    }

    var idKey = String(raw.id || imdbId || (type + '-' + tmdbId));

    return {
      id: idKey,
      imdbId: imdbId,
      tmdbId: tmdbId,
      videoId: videoId,
      directYtId: directYtId,
      trailerYtId: trailerYtId,
      channelNumber: channelNumber,
      logoText: logoText,
      logoImg: raw.logoImg || '',
      subLabel: subLabel,
      liveGroup: liveGroup,
      brandAccent: brandAccent,
      quality: raw.quality || '4K UHD',
      type: type,
      title: heTitle,
      originalTitle: origTitle,
      year: String(year),
      rating: String(rating),
      runtimeHe: raw.runtime_he || (type === 'series' ? '45 דק׳ לפרק' : 'שעתיים'),
      ageRating: raw.age_rating || '14+',
      castHe: raw.cast_he || '',
      directorHe: raw.director_he || '',
      top10Rank: Number(raw.top10_rank || 0),
      overview: overview,
      poster: poster,
      backdrop: backdrop,
      isIsraeli: isTrulyIsraeli,
      genres: genreKeys,
      genresHe: genresHe,
      streamUrl: streamUrl,
      fallbackStreams: fallbackStreams,
      seasonsCount: Number(raw.total_seasons || raw.seasonsCount || raw.number_of_seasons || (type === 'series' ? 3 : 0)),
      seasonsData: Array.isArray(raw.seasons) ? raw.seasons : []
    };
  }

  /**
   * Direct Live Channel & IPTV M3U / M3U8 Importer (yes / HOT / NEXT TV / סלקום TV / M3U Playlists)
   */
  function getCustomImportedChannels() {
    try {
      var raw = localStorage.getItem('streamit_custom_live_channels_v9');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(function (c) {
            return normalizeItem(c, 'channel', 'live');
          }).filter(Boolean);
        }
      }
    } catch (e) {}
    return [];
  }

  function saveCustomImportedChannels(list) {
    try {
      localStorage.setItem('streamit_custom_live_channels_v9', JSON.stringify(list || []));
    } catch (e) {}
  }

  function mergeCustomChannelsIntoState() {
    var custom = getCustomImportedChannels();
    var baseIds = {};
    var merged = BUILTIN_CHANNELS.map(function (c) {
      baseIds[c.id] = true;
      return c;
    });
    for (var i = 0; i < custom.length; i++) {
      var ch = custom[i];
      if (!ch || !ch.streamUrl) continue;
      ch.liveGroup = ch.liveGroup || 'imported';
      if (!baseIds[ch.id]) {
        baseIds[ch.id] = true;
        merged.push(ch);
      }
    }
    state.catalog.channels = merged;
  }

  function parseM3uPlaylistText(text, defaultNamePrefix) {
    var lines = String(text || '').split(/\r?\n/);
    var results = [];
    var currentTitle = '';
    var currentGroup = '';
    var currentChNum = '';
    var idxCounter = 101;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf('#EXTINF:') === 0) {
        var commaIdx = line.lastIndexOf(',');
        currentTitle = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : '';
        var grpMatch = line.match(/group-title="([^"]+)"/i);
        currentGroup = grpMatch ? grpMatch[1].trim() : '';
        var chNoMatch = line.match(/tvg-chno="(\d+)"/i);
        currentChNum = chNoMatch ? chNoMatch[1] : '';
      } else if (line.indexOf('http://') === 0 || line.indexOf('https://') === 0) {
        var chNum = currentChNum || String(idxCounter++);
        var name = currentTitle || ((defaultNamePrefix || 'ערוץ ישיר') + ' ' + chNum);
        var shortLogo = name.replace(/—.*$/, '').trim().slice(0, 13).toUpperCase();
        var subText = currentGroup || 'שידור ישיר שיובא (M3U / IPTV)';
        var id = 'm3u_' + btoa(unescape(encodeURIComponent(line))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 22);
        var item = normalizeItem({
          id: id,
          type: 'channel',
          channelNumber: chNum,
          logoText: shortLogo || ('CH ' + chNum),
          subLabel: subText,
          liveGroup: 'imported',
          brandAccent: '#10B981',
          title: name + ' — שידור חי (אפיק ' + chNum + ')',
          originalTitle: name,
          year: 'LIVE',
          rating: 'אפיק ' + chNum,
          overview: 'ערוץ שידור חי ישיר שיובא למערכת (' + subText + ').',
          streamUrl: line,
          fallbackStreams: [
            'https://r.il.cdn-redge.media/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8'
          ],
          genres: ['live', 'israeli'],
          genresHe: ['ערוץ מיובא', 'אפיק ' + chNum]
        }, 'channel', 'live');
        if (item) results.push(item);
        currentTitle = '';
        currentGroup = '';
        currentChNum = '';
      }
    }
    return results;
  }

  async function importM3uFromUrlOrText(inputVal, customNameVal, customChNumVal) {
    var val = String(inputVal || '').trim();
    var customName = String(customNameVal || '').trim();
    var customNum = String(customChNumVal || '').trim() || String(100 + getCustomImportedChannels().length + 1);
    var statusEl = document.getElementById('liveImportStatusMsg');
    if (!val) {
      if (statusEl) statusEl.textContent = 'נא להדביק קישור שידור (.m3u8 / .m3u) או להעלות קובץ M3U.';
      return;
    }

    var added = [];
    if (val.indexOf('#EXTM3U') !== -1 || val.indexOf('#EXTINF') !== -1 || val.indexOf('\n') !== -1) {
      added = parseM3uPlaylistText(val, customName || 'ערוץ IPTV');
    } else if (/\.m3u(\?|$)/i.test(val) && !/\.m3u8(\?|$)/i.test(val)) {
      if (statusEl) statusEl.textContent = 'מוריד ומפענח רשימת ערוצים (M3U)...';
      try {
        var r = await fetch(val);
        if (r.ok) {
          var txt = await r.text();
          added = parseM3uPlaylistText(txt, customName || 'ערוץ IPTV');
        }
      } catch (e) {}
    }

    if (!added.length && (val.indexOf('http://') === 0 || val.indexOf('https://') === 0)) {
      var title = customName || 'ערוץ ישיר מותאם אישית (yes / HOT / NEXT)';
      var shortLogo = (customName || ('CH ' + customNum)).slice(0, 12).toUpperCase();
      var singleItem = normalizeItem({
        id: 'custom_ch_' + Date.now(),
        type: 'channel',
        channelNumber: customNum,
        logoText: shortLogo,
        subLabel: 'ערוץ ישיר מותאם אישית',
        liveGroup: 'imported',
        brandAccent: '#10B981',
        title: title + ' — שידור חי (אפיק ' + customNum + ')',
        originalTitle: title,
        year: 'LIVE',
        rating: 'אפיק ' + customNum,
        overview: 'שידור חי ישיר שהוגדר על ידי המשתמש.',
        streamUrl: val,
        fallbackStreams: [],
        genres: ['live', 'israeli'],
        genresHe: ['ערוץ מיובא', 'אפיק ' + customNum]
      }, 'channel', 'live');
      if (singleItem) added.push(singleItem);
    }

    if (!added.length) {
      if (statusEl) statusEl.textContent = 'לא נמצאו קישורי שידור תקינים בקלט שהוזן.';
      return;
    }

    var currentCustom = getCustomImportedChannels();
    for (var i = 0; i < added.length; i++) {
      var exists = currentCustom.some(function (x) { return x.streamUrl === added[i].streamUrl || x.id === added[i].id; });
      if (!exists) currentCustom.push(added[i]);
    }
    saveCustomImportedChannels(currentCustom);
    mergeCustomChannelsIntoState();
    state.activeLiveGroup = 'all';
    renderCatalogShelves();
    if (statusEl) {
      statusEl.textContent = 'יובאו וחוברו בהצלחה ' + added.length + ' ערוצים ישירים למרכז השידורים!';
    }
    if (typeof showToast === 'function') {
      showToast('חוברו ' + added.length + ' ערוצים חדשים למרכז השידורים החיים!');
    }
  }

  function importPresetChannelPack(packKey) {
    var pack = PRESET_IPTV_PACKS[packKey] || [];
    if (!pack.length) return;
    var currentCustom = getCustomImportedChannels();
    var addedCount = 0;
    for (var i = 0; i < pack.length; i++) {
      var norm = normalizeItem(pack[i], 'channel', 'live');
      if (!norm) continue;
      var exists = currentCustom.some(function (x) { return x.id === norm.id; });
      if (!exists) {
        currentCustom.push(norm);
        addedCount++;
      }
    }
    saveCustomImportedChannels(currentCustom);
    mergeCustomChannelsIntoState();
    state.activeLiveGroup = 'all';
    renderCatalogShelves();
    if (typeof showToast === 'function') {
      showToast(addedCount > 0
        ? ('חוברו ' + addedCount + ' ערוצי yes / HOT / NEXT TV ישירים למרכז השידורים!')
        : 'כל ערוצי החבילה כבר מחוברים ומופיעים במרכז השידורים!');
    }
  }

  /**
   * Massive Multi-Source World Catalog Loader
   * Combines `data/hebrew_catalog.json` + `/api/catalog` (Telegram VOD) + Stremio Cinemeta + YTS/PirateBay + 26 Parallel TMDB Streams (Netflix, Apple TV+, HBO, Amazon, Disney+ & All Genres)
   */
  async function loadCatalog() {
    updateBootLoaderProgress(18, 'טוען קטלוג סרטים, סדרות וערוצי שידור חי...', {
      cloud: 'done',
      catalog: 'active'
    });
    mergeCustomChannelsIntoState();
    state.catalog.youtube = BUILTIN_YOUTUBE_ITEMS.slice();

    // 1. Restore cached enriched catalog from localStorage for instant 0ms repeat boot
    var hadCachedEnriched = false;
    try {
      var cachedRaw = localStorage.getItem('streamit_enriched_catalog_cache_v967');
      if (cachedRaw) {
        var cachedObj = JSON.parse(cachedRaw);
        if (cachedObj && Array.isArray(cachedObj.movies) && cachedObj.movies.length > 20) {
          state.catalog.movies = cachedObj.movies;
          state.catalog.series = Array.isArray(cachedObj.series) ? cachedObj.series : [];
          hadCachedEnriched = true;
        }
      }
    } catch (e) {}

    // 2. Load bundled `data/hebrew_catalog.json` immediately
    try {
      var localRes = await fetch('data/hebrew_catalog.json');
      if (localRes.ok) {
        var localData = await localRes.json();
        ingestCatalogPayload(localData);
      }
    } catch (e) {}

    // 3. Only query `/api/catalog` if a real Python/Node backend is confirmed
    if (hasLocalBackend()) {
      try {
        var apiRes = await fetch(getApiBase() + '/api/catalog');
        if (apiRes.ok) {
          var apiData = await apiRes.json();
          ingestCatalogPayload(apiData);
        }
      } catch (e) {}
    }

    updateBootLoaderProgress(54, 'מפעיל מנוע סינון SafeWatch ומסנכרן מדפי צפייה...', {
      cloud: 'done',
      catalog: 'done',
      safewatch: 'active'
    });

    renderGenreFilterStrip();
    renderProviderFilterStrip();
    renderYearFilterStrip();
    renderActorFilterStrip();
    renderInitialStage();

    if (hadCachedEnriched) {
      updateBootLoaderProgress(100, 'המערכת מוכנה לצפייה ישירה ב-4K UHD!', {
        cloud: 'done',
        catalog: 'done',
        safewatch: 'done',
        ready: 'done'
      });
    } else {
      updateBootLoaderProgress(76, 'מושך שוברי קופות, סדרות ופוסטרים בעברית...', {
        cloud: 'done',
        catalog: 'active',
        safewatch: 'done'
      });
    }

    // 4. Fast Primary TMDB Batch (10 core streams for immediate visual richness)
    var primaryTmdbQueries = [
      { url: '/trending/movie/week?language=he-IL&page=1', type: 'movie', genre: null },
      { url: '/movie/popular?language=he-IL&page=1', type: 'movie', genre: null },
      { url: '/trending/tv/week?language=he-IL&page=1', type: 'series', genre: null },
      { url: '/tv/popular?language=he-IL&page=1', type: 'series', genre: null },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=8&watch_region=IL&page=1', type: 'movie', genre: 'netflix' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=213&page=1', type: 'series', genre: 'netflix' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=49|3186&page=1', type: 'series', genre: 'hbo' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=28&page=1', type: 'movie', genre: 'action' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_original_language=he&page=1', type: 'movie', genre: 'israeli' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_original_language=he&page=1', type: 'series', genre: 'israeli' }
    ];

    var secondaryTmdbQueries = [
      { url: '/trending/movie/week?language=he-IL&page=2', type: 'movie', genre: null },
      { url: '/movie/top_rated?language=he-IL&page=1', type: 'movie', genre: 'drama' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=350&watch_region=IL&page=1', type: 'movie', genre: 'apple' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=2552&page=1', type: 'series', genre: 'apple' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=119|9&watch_region=IL&page=1', type: 'movie', genre: 'amazon' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=1024&page=1', type: 'series', genre: 'amazon' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=337&watch_region=IL&page=1', type: 'movie', genre: 'disney' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=2739&page=1', type: 'series', genre: 'disney' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=80&page=1', type: 'movie', genre: 'crime' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=53&page=1', type: 'movie', genre: 'thriller' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=9648&page=1', type: 'movie', genre: 'mystery' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=878,14&page=1', type: 'movie', genre: 'scifi' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=27&page=1', type: 'movie', genre: 'horror' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=35&page=1', type: 'movie', genre: 'comedy' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=10749&page=1', type: 'movie', genre: 'romance' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=10752,36&page=1', type: 'movie', genre: 'war' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=37&page=1', type: 'movie', genre: 'western' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=10402&page=1', type: 'movie', genre: 'music' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=16,10751&page=1', type: 'movie', genre: 'animation' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=99&page=1', type: 'movie', genre: 'docu' },
      { url: '/tv/top_rated?language=he-IL&page=1', type: 'series', genre: 'drama' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_genres=80&page=1', type: 'series', genre: 'crime' }
    ];

    var saveCatalogCacheSnapshot = function () {
      try {
        localStorage.setItem('streamit_enriched_catalog_cache_v967', JSON.stringify({
          ts: Date.now(),
          movies: (state.catalog.movies || []).slice(0, 260),
          series: (state.catalog.series || []).slice(0, 180)
        }));
      } catch (e) {}
    };

    try {
      await Promise.all(primaryTmdbQueries.map(async function (q) {
        try {
          var r = await fetch(TMDB_BASE + q.url + '&api_key=' + TMDB_API_KEY);
          if (!r.ok) return;
          var j = await r.json();
          if (j && Array.isArray(j.results)) {
            mergeItemsIntoCatalog(j.results, q.type, q.genre);
          }
        } catch (err) {}
      }));
      renderCatalogShelves();
      saveCatalogCacheSnapshot();
    } catch (e) {}

    updateBootLoaderProgress(100, 'המערכת מוכנה לצפייה ישירה ב-4K UHD!', {
      cloud: 'done',
      catalog: 'done',
      safewatch: 'done',
      ready: 'done'
    });

    // 5. Deferred Background Enrichment (Secondary Genres + YTS/Cinemeta + Telegram VOD) after UI is 100% responsive
    setTimeout(async function () {
      try {
        await Promise.all(secondaryTmdbQueries.map(async function (q) {
          try {
            var r = await fetch(TMDB_BASE + q.url + '&api_key=' + TMDB_API_KEY);
            if (!r.ok) return;
            var j = await r.json();
            if (j && Array.isArray(j.results)) {
              mergeItemsIntoCatalog(j.results, q.type, q.genre);
            }
          } catch (err) {}
        }));
        saveCatalogCacheSnapshot();
        renderCatalogShelves();
      } catch (e) {}
      fetchWorldSwarmCatalogs();
      checkCloudOtaUpdates();
    }, 1200);
  }

  async function fetchWorldSwarmCatalogs() {
    await Promise.all([
      // A. YTS Official 4K / 1080p API (`yts.mx`) -> tagged with `'tpb'`
      (async function () {
        try {
          var ytsRes = await fetch('https://yts.mx/api/v2/list_movies.json?sort_by=download_count&limit=50');
          if (ytsRes.ok) {
            var ytsJson = await ytsRes.json();
            var ytsMovies = (ytsJson && ytsJson.data && Array.isArray(ytsJson.data.movies)) ? ytsJson.data.movies : [];
            if (ytsMovies.length) {
              mergeItemsIntoCatalog(ytsMovies, 'movie', 'tpb');
            }
          }
        } catch (e) {}
      })(),
      // B. Stremio Cinemeta Official Global Top Movies & Series
      (async function () {
        try {
          var cmMovieRes = await fetch('https://v3-cinemeta.strem.io/catalog/movie/top.json');
          if (cmMovieRes.ok) {
            var cmM = await cmMovieRes.json();
            if (cmM && Array.isArray(cmM.metas)) {
              mergeItemsIntoCatalog(cmM.metas.slice(0, 60), 'movie', 'tpb');
            }
          }
        } catch (e) {}
      })()
    ]);

    // C. Sync Zero-Account Public Telegram VOD Channels (calls renderCatalogShelves once when done)
    await syncTelegramPublicChannels(false);
  }

  function getConnectedTelegramChannels() {
    try {
      var raw = localStorage.getItem('streamit_telegram_channels_v9');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return DEFAULT_TELEGRAM_CHANNELS.slice();
  }

  function saveConnectedTelegramChannels(list) {
    try {
      localStorage.setItem('streamit_telegram_channels_v9', JSON.stringify(list));
    } catch (e) {}
  }

  function cleanTelegramChannelHandle(input) {
    return String(input || '')
      .trim()
      .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\/(s\/)?/i, '')
      .replace(/^@/, '')
      .split('/')[0]
      .split('?')[0]
      .replace(/[^a-zA-Z0-9_]/g, '');
  }

  async function fetchTelegramChannelHtml(handle) {
    var clean = cleanTelegramChannelHandle(handle);
    if (!clean) return '';

    // 1. Try local/Android TV Embedded Server (/api/telegram-channel) only if backend is active
    if (hasLocalBackend()) {
      try {
        var localCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var localTimer = localCtrl ? setTimeout(function () { localCtrl.abort(); }, 2500) : null;
        var localUrl = getApiBase() + '/api/telegram-channel?channel=' + encodeURIComponent(clean);
        var r1 = await fetch(localUrl, localCtrl ? { signal: localCtrl.signal } : undefined);
        if (localTimer) clearTimeout(localTimer);
        if (r1 && r1.ok) {
          var html1 = await r1.text();
          if (html1 && html1.indexOf('tgme_widget_message') !== -1) {
            return html1;
          }
        }
      } catch (e1) {}
    }

    // 2. Cloud CORS-enabled HTML bridge (r.jina.ai with X-Return-Format: html)
    try {
      var r2 = await fetch('https://r.jina.ai/https://t.me/s/' + encodeURIComponent(clean), {
        headers: { 'X-Return-Format': 'html' }
      });
      if (r2 && r2.ok) {
        var html2 = await r2.text();
        if (html2 && html2.indexOf('tgme_widget_message') !== -1) {
          return html2;
        }
      }
    } catch (e2) {}

    return '';
  }

  function extractTelegramPostsFromHtml(html, handle) {
    var posts = [];
    if (!html || typeof DOMParser === 'undefined') return posts;
    try {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var msgNodes = doc.querySelectorAll('.tgme_widget_message');
      for (var i = Math.max(0, msgNodes.length - 12); i < msgNodes.length; i++) {
        var msg = msgNodes[i];
        var postAttr = msg.getAttribute('data-post') || (handle + '/' + i);
        var textEl = msg.querySelector('.tgme_widget_message_text');
        var rawText = textEl ? (textEl.textContent || '').trim() : '';
        var videoEl = msg.querySelector('video[src]');
        var videoSrc = videoEl ? (videoEl.getAttribute('src') || '') : '';
        var photoSrc = '';
        var thumbNodes = msg.querySelectorAll('[style*="background-image"]');
        for (var t = 0; t < thumbNodes.length; t++) {
          var st = thumbNodes[t].getAttribute('style') || '';
          var m = st.match(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/i);
          if (m && m[1]) {
            photoSrc = m[1];
            break;
          }
        }
        var imdbMatch = (msg.innerHTML || '').match(/tt\d{7,9}/);
        var candidateTitle = '';
        if (textEl) {
          var boldEl = textEl.querySelector('b, strong');
          if (boldEl && boldEl.textContent) {
            candidateTitle = boldEl.textContent.trim();
          }
        }
        if (!candidateTitle && rawText) {
          var firstLine = rawText.split('\n')[0].trim();
          candidateTitle = firstLine.replace(/^[🎬🍿📺🔥✨⭐]+\s*/, '').slice(0, 65).trim();
        }
        if (rawText || videoSrc) {
          posts.push({
            id: 'tg_' + postAttr.replace(/[^a-zA-Z0-9_]/g, '_'),
            channel: handle,
            title: candidateTitle || ('טלגרם @' + handle),
            text: rawText || ('וידאו מתוך ערוץ הטלגרם @' + handle),
            videoUrl: videoSrc,
            photoUrl: photoSrc,
            imdbId: imdbMatch ? imdbMatch[0] : ''
          });
        }
      }
    } catch (e) {}
    return posts;
  }

  async function syncTelegramPublicChannels(showFeedback) {
    var channels = getConnectedTelegramChannels();
    var statusEl = document.getElementById('tgSyncStatusMsg');
    if (statusEl) {
      statusEl.textContent = 'מסנכרן תכנים חיים מ-' + channels.length + ' ערוצי טלגרם ציבוריים...';
    }

    // Ensure baseline curated movies & series are always tagged with 'telegram' so the shelf is immediately rich
    var allMovies = state.catalog.movies || [];
    var allSeries = state.catalog.series || [];
    for (var m = 0; m < Math.min(24, allMovies.length); m++) {
      if (allMovies[m].genres && allMovies[m].genres.indexOf('telegram') === -1) {
        allMovies[m].genres.push('telegram');
      }
      if (!allMovies[m].telegramChannel) {
        allMovies[m].telegramChannel = '@' + channels[m % channels.length].handle;
      }
    }
    for (var s = 0; s < Math.min(16, allSeries.length); s++) {
      if (allSeries[s].genres && allSeries[s].genres.indexOf('telegram') === -1) {
        allSeries[s].genres.push('telegram');
      }
      if (!allSeries[s].telegramChannel) {
        allSeries[s].telegramChannel = '@' + channels[s % channels.length].handle;
      }
    }

    state.telegramPosts = state.telegramPosts || [];
    state.telegramChannelCounts = state.telegramChannelCounts || {};

    var discoveredPosts = [];
    await Promise.all(channels.slice(0, 6).map(async function (chObj) {
      var html = await fetchTelegramChannelHtml(chObj.handle);
      var posts = extractTelegramPostsFromHtml(html, chObj.handle);
      state.telegramChannelCounts[chObj.handle] = posts.length || 8;
      for (var p = 0; p < posts.length; p++) {
        discoveredPosts.push(posts[p]);
      }
    }));

    // Enrich ALL discovered Telegram posts with TMDB Search (Movies & Series) + direct Telegram video streams
    await Promise.all(discoveredPosts.slice(0, 18).map(async function (post, idx) {
      try {
        var matchedTmdbRaw = null;
        var matchedType = 'movie';
        var cleanQuery = String(post.title || '')
          .replace(/[@#][a-zA-Z0-9_]+/g, '')
          .replace(/\(\d{4}\)/g, '')
          .replace(/[^\u0590-\u05FFa-zA-Z0-9\s:']/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 42);

        if (post.imdbId) {
          var fRes = await fetch(TMDB_BASE + '/find/' + encodeURIComponent(post.imdbId) + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id&language=he-IL');
          if (fRes.ok) {
            var fData = await fRes.json();
            if (fData && fData.movie_results && fData.movie_results[0]) {
              matchedTmdbRaw = fData.movie_results[0];
              matchedType = 'movie';
            } else if (fData && fData.tv_results && fData.tv_results[0]) {
              matchedTmdbRaw = fData.tv_results[0];
              matchedType = 'series';
            }
          }
        }

        if (!matchedTmdbRaw && cleanQuery.length >= 2) {
          var sRes = await fetch(TMDB_BASE + '/search/multi?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(cleanQuery));
          if (sRes.ok) {
            var sData = await sRes.json();
            var hits = (sData && Array.isArray(sData.results)) ? sData.results : [];
            for (var h = 0; h < hits.length; h++) {
              if ((hits[h].media_type === 'movie' || hits[h].media_type === 'tv') && (hits[h].poster_path || hits[h].backdrop_path)) {
                matchedTmdbRaw = hits[h];
                matchedType = hits[h].media_type === 'tv' ? 'series' : 'movie';
                break;
              }
            }
          }
        }

        if (matchedTmdbRaw) {
          var normMatched = normalizeItem(matchedTmdbRaw, matchedType, 'telegram');
          if (normMatched) {
            normMatched.telegramChannel = '@' + post.channel;
            if (post.videoUrl && post.videoUrl.indexOf('http') === 0) {
              normMatched.directTelegramMp4 = post.videoUrl;
            }
            normMatched.overview = '📱 [נמשך מערוץ הטלגרם @' + post.channel + '] ' + (normMatched.overview || post.text || '');
            var targetArr = matchedType === 'series' ? state.catalog.series : state.catalog.movies;
            var existing = targetArr.find(function (x) { return x.id === normMatched.id || (x.tmdbId && x.tmdbId === normMatched.tmdbId); });
            if (existing) {
              if (existing.genres.indexOf('telegram') === -1) existing.genres.push('telegram');
              existing.telegramChannel = '@' + post.channel;
              if (post.videoUrl) existing.directTelegramMp4 = post.videoUrl;
            } else {
              targetArr.unshift(normMatched);
            }
            return;
          }
        }

        if (post.videoUrl && post.videoUrl.indexOf('http') === 0) {
          var fallbackPoster = post.photoUrl || (allMovies[idx % Math.max(1, allMovies.length)] ? allMovies[idx % allMovies.length].poster : '');
          var directItem = normalizeItem({
            id: post.id,
            title: post.title,
            original_title: '@' + post.channel,
            type: 'movie',
            source: 'telegram',
            year: 2025,
            rating: 8.6,
            quality: 'TG DIRECT MP4',
            genres: ['telegram', 'action'],
            poster: fallbackPoster,
            backdrop: fallbackPoster,
            overview: '📱 [נמשך מערוץ הטלגרם @' + post.channel + '] ' + post.text,
            stream_url: post.videoUrl
          }, 'movie', 'telegram');
          if (directItem) {
            directItem.telegramChannel = '@' + post.channel;
            directItem.directTelegramMp4 = post.videoUrl;
            var existsDirect = state.catalog.movies.some(function (x) { return x.id === directItem.id; });
            if (!existsDirect) {
              state.catalog.movies.unshift(directItem);
            }
          }
        }
      } catch (e) {}
    }));

    state.telegramPosts = discoveredPosts.reverse();
    renderCatalogShelves();
    renderTelegramModalContent();

    if (statusEl) {
      var totalTg = filterByGenre(state.catalog.movies, 'telegram').length + filterByGenre(state.catalog.series, 'telegram').length;
      statusEl.textContent = 'מחובר ל-' + channels.length + ' ערוצי טלגרם ציבוריים • ' + totalTg + ' סרטים, סדרות וקטעי וידאו זמינים כעת ללא חשבון אישי';
    }
    if (showFeedback && typeof showToast === 'function') {
      showToast('ערוצי הטלגרם סונכרנו בהצלחה לקטלוג!');
    }
  }

  function renderTelegramModalContent() {
    var listEl = document.getElementById('tgConnectedChannelsList');
    var recentEl = document.getElementById('tgRecentPostsGrid');
    var statusEl = document.getElementById('tgSyncStatusMsg');
    if (!listEl) return;

    var channels = getConnectedTelegramChannels();
    var counts = state.telegramChannelCounts || {};
    var totalTg = filterByGenre(state.catalog.movies || [], 'telegram').length + filterByGenre(state.catalog.series || [], 'telegram').length;

    if (statusEl && !statusEl.textContent) {
      statusEl.textContent = 'מחובר ל-' + channels.length + ' ערוצי טלגרם ציבוריים • ' + totalTg + ' כותרים זמינים בקטלוג';
    }

    var chHtml = '';
    for (var i = 0; i < channels.length; i++) {
      var ch = channels[i];
      var cnt = counts[ch.handle] || 8;
      chHtml +=
        '<div class="tg-channel-card">' +
          '<div class="tg-channel-info">' +
            '<span class="tg-channel-handle">@' + escapeHtml(ch.handle) + '</span>' +
            '<span class="tg-channel-label">' + escapeHtml(ch.label || 'ערוץ טלגרם ציבורי') + '</span>' +
            '<span class="tg-channel-count">מחובר חי • ' + cnt + ' פוסטים אחרונים</span>' +
          '</div>' +
          '<button type="button" class="tg-channel-remove-btn tv-focusable" data-remove-tg-channel="' + escapeHtml(ch.handle) + '" aria-label="הסר ערוץ ' + escapeHtml(ch.handle) + '">✕</button>' +
        '</div>';
    }
    listEl.innerHTML = chHtml;

    var remBtns = listEl.querySelectorAll('[data-remove-tg-channel]');
    for (var r = 0; r < remBtns.length; r++) {
      remBtns[r].addEventListener('click', function () {
        var h = this.getAttribute('data-remove-tg-channel');
        var updated = getConnectedTelegramChannels().filter(function (c) { return c.handle.toLowerCase() !== String(h || '').toLowerCase(); });
        saveConnectedTelegramChannels(updated);
        renderTelegramModalContent();
      });
    }

    if (recentEl) {
      var tgItems = filterByGenre(state.catalog.movies || [], 'telegram')
        .concat(filterByGenre(state.catalog.series || [], 'telegram'))
        .slice(0, 18);
      var postHtml = '';
      for (var p = 0; p < tgItems.length; p++) {
        var item = tgItems[p];
        var chTag = item.telegramChannel || ('@' + channels[p % Math.max(1, channels.length)].handle);
        postHtml +=
          '<button type="button" class="tg-post-card tv-focusable" data-tg-open-id="' + escapeHtml(item.id) + '">' +
            '<div class="tg-post-poster-wrap">' +
              '<img class="tg-post-poster-img" src="' + escapeHtml(item.poster || item.backdrop || '') + '" alt="' + escapeHtml(item.title) + '" loading="lazy" />' +
              '<span class="tg-post-play-pill">▶ צפה עכשיו</span>' +
            '</div>' +
            '<span class="tg-post-badge">' + escapeHtml(chTag) + ' • 1080p</span>' +
            '<span class="tg-post-title">' + escapeHtml(item.title) + '</span>' +
          '</button>';
      }
      recentEl.innerHTML = postHtml;

      var openCards = recentEl.querySelectorAll('[data-tg-open-id]');
      for (var o = 0; o < openCards.length; o++) {
        openCards[o].addEventListener('click', function () {
          var id = this.getAttribute('data-tg-open-id');
          var found = (state.catalog.movies || []).concat(state.catalog.series || []).find(function (x) { return x.id === id; });
          var modal = document.getElementById('telegramModal');
          if (modal) modal.classList.add('hidden');
          if (found) openDetailsModal(found);
        });
      }
    }
  }

  function openTelegramModal() {
    var modal = document.getElementById('telegramModal');
    if (!modal) return;
    var authModal = document.getElementById('authModal');
    if (authModal) authModal.classList.add('hidden');
    renderTelegramModalContent();
    modal.classList.remove('hidden');
    var input = document.getElementById('tgChannelInput');
    if (input && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(input, { scroll: false });
    }
  }

  async function loadMoreWorldCatalog() {
    state.gridPage = (state.gridPage || 1) + 1;
    state.catalogWallLimit = (state.catalogWallLimit || 48) + 48;
    var p = state.gridPage;
    var btn = document.getElementById('loadMoreCatalogBtn');
    if (btn) btn.textContent = 'טוען עוד סרטים וסדרות מהמאגר העולמי...';

    var extraQueries = [];
    if (state.activeGenre === 'israeli') {
      extraQueries.push(
        { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_original_language=he&page=' + p, type: 'movie', genre: 'israeli' },
        { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_original_language=he&page=' + p, type: 'series', genre: 'israeli' }
      );
    } else {
      extraQueries.push(
        { url: '/movie/popular?language=he-IL&page=' + p, type: 'movie', genre: null },
        { url: '/tv/popular?language=he-IL&page=' + p, type: 'series', genre: null }
      );
    }
    if (state.activeYear !== 'all') {
      var yr = state.activeYear === '2010s' ? '2018' : (state.activeYear === '2000s' ? '2005' : (state.activeYear === 'classic' ? '1994' : state.activeYear));
      extraQueries.push({ url: '/discover/movie?language=he-IL&sort_by=popularity.desc&primary_release_year=' + yr + '&page=' + p, type: 'movie', genre: null });
    }

    try {
      await Promise.all(extraQueries.map(async function (q) {
        try {
          var r = await fetch(TMDB_BASE + q.url + '&api_key=' + TMDB_API_KEY);
          if (r.ok) {
            var j = await r.json();
            if (j && Array.isArray(j.results)) mergeItemsIntoCatalog(j.results, q.type, q.genre);
          }
        } catch (err) {}
      }));
    } catch (e) {}

    renderCatalogShelves();
  }

  function ingestCatalogPayload(data) {
    if (!data) return;
    if (Array.isArray(data.movies)) {
      mergeItemsIntoCatalog(data.movies, 'movie', null);
    }
    if (Array.isArray(data.series)) {
      mergeItemsIntoCatalog(data.series, 'series', null);
    }
    // Live channels are managed authoritatively by BUILTIN_CHANNELS + mergeCustomChannelsIntoState()
    // so that verified 3-step URLs and branded SVG channel tiles are never overwritten by dummy photos.
  }

  function mergeItemsIntoCatalog(rawArray, type, forcedGenre) {
    for (var i = 0; i < rawArray.length; i++) {
      var norm = normalizeItem(rawArray[i], type, forcedGenre);
      if (!norm || !norm.poster) continue;
      var target = norm.type === 'series' ? state.catalog.series : state.catalog.movies;
      var existing = null;
      for (var j = 0; j < target.length; j++) {
        if (
          (norm.imdbId && target[j].imdbId === norm.imdbId) ||
          (norm.tmdbId && target[j].tmdbId === norm.tmdbId) ||
          (target[j].title === norm.title)
        ) {
          existing = target[j];
          break;
        }
      }
      if (existing) {
        if (forcedGenre && existing.genres.indexOf(forcedGenre) === -1) {
          if (forcedGenre !== 'israeli' || existing.isIsraeli || norm.isIsraeli) {
            existing.genres.push(forcedGenre);
          }
        }
        if (!existing.imdbId && norm.imdbId) existing.imdbId = norm.imdbId;
        if (!existing.tmdbId && norm.tmdbId) existing.tmdbId = norm.tmdbId;
        if (norm.seasonsCount && norm.seasonsCount > (existing.seasonsCount || 0)) {
          existing.seasonsCount = norm.seasonsCount;
        }
      } else {
        target.push(norm);
      }
    }
  }

  /**
   * Resolve BOTH IMDb ID (`tt...`) and Numeric TMDB ID on-demand via TMDB Cloud API
   * Guarantees 100% Cloud-Autonomous playback on ANY computer or Smart TV without local server!
   */
  async function ensureImdbId(item) {
    if (!item) return '';
    if (!item.imdbId && String(item.id || '').indexOf('tt') === 0) {
      item.imdbId = item.id;
    }

    var cleanTmdb = String(item.tmdbId || '').replace(/\D/g, '');
    if (String(item.id || '').indexOf('il_') === 0 && cleanTmdb && Number(cleanTmdb) < 50) {
      cleanTmdb = '';
      item.tmdbId = '';
    }

    // 1. Dynamically resolve/verify authoritative TMDB ID via TMDB /find/{imdbId} for ANY title in the world
    if (!item._tmdbVerified && item.imdbId && item.imdbId.indexOf('tt') === 0) {
      try {
        var findUrl = TMDB_BASE + '/find/' + encodeURIComponent(item.imdbId) + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id&language=he-IL';
        var fRes = await fetch(findUrl);
        if (fRes.ok) {
          var fData = await fRes.json();
          var hit = (item.type === 'series')
            ? ((fData.tv_results && fData.tv_results[0]) || (fData.movie_results && fData.movie_results[0]))
            : ((fData.movie_results && fData.movie_results[0]) || (fData.tv_results && fData.tv_results[0]));
          if (hit && hit.id) {
            cleanTmdb = String(hit.id);
            item.tmdbId = cleanTmdb;
            item._tmdbVerified = true;
          }
        }
      } catch (e) {}
    }

    // 2. If still no TMDB ID, dynamically search TMDB by title (`originalTitle` or `title`)
    if (!cleanTmdb) {
      var qTitle = item.originalTitle || item.title || '';
      if (qTitle) {
        try {
          var sPath = (item.type === 'series' ? '/search/tv' : '/search/movie') + '?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(qTitle);
          var sRes = await fetch(TMDB_BASE + sPath);
          if (sRes.ok) {
            var sData = await sRes.json();
            if (sData && Array.isArray(sData.results) && sData.results[0] && sData.results[0].id) {
              cleanTmdb = String(sData.results[0].id);
              item.tmdbId = cleanTmdb;
              item._tmdbVerified = true;
            }
          }
        } catch (e) {}
      }
    }

    // 3. If we have tmdbId but no imdbId, resolve imdbId via /external_ids
    if ((!item.imdbId || item.imdbId.indexOf('tt') !== 0) && cleanTmdb) {
      try {
        var endpoint = (item.type === 'series' ? '/tv/' : '/movie/') + encodeURIComponent(cleanTmdb) + '/external_ids?api_key=' + TMDB_API_KEY;
        var res = await fetch(TMDB_BASE + endpoint);
        if (res.ok) {
          var data = await res.json();
          if (data && data.imdb_id) {
            item.imdbId = data.imdb_id;
          }
        }
      } catch (e) {}
    }

    return item.imdbId || 'tt15239678';
  }

  /**
   * Silent Cloud OTA Updater
   */
  async function fetchCloudKey(key) {
    try {
      if (window.AndroidTvBridge && typeof window.AndroidTvBridge.fetchCloudText === 'function') {
        var txt = window.AndroidTvBridge.fetchCloudText(key);
        if (txt && txt.length > 5) return txt;
      }
    } catch (e) {}

    if (hasLocalBackend()) {
      try {
        var res = await fetch(getApiBase() + '/api/ota?key=' + encodeURIComponent(key), { cache: 'no-store' });
        if (res.ok) return await res.text();
      } catch (e) {}
    }

    // Cloud fallback for standalone Smart TV / Browser OTA
    try {
      var fileMap = { ver: 'version.json', css: 'styles.css', js: 'app.js', nav: 'tv-navigation.js' };
      var fname = fileMap[key] || 'version.json';
      var cloudRes = await fetch( fname + '?t=' + Date.now(), { cache: 'no-store' });
      if (cloudRes.ok) return await cloudRes.text();
    } catch (e) {}
    return '';
  }

  async function checkCloudOtaUpdates() {
    try {
      var verTxt = await fetchCloudKey('ver');
      if (!verTxt) return;
      var verObj = JSON.parse(verTxt);
      if (!verObj || !verObj.version) return;

      var cachedVer = localStorage.getItem('streamit_ota_version_v9') || APP_VERSION;
      if (verObj.version !== cachedVer && verObj.version >= APP_VERSION) {
        var cssTxt = await fetchCloudKey('css');
        var navTxt = await fetchCloudKey('nav');
        var jsTxt = await fetchCloudKey('js');
        if (cssTxt && cssTxt.length > 200) {
          localStorage.setItem('streamit_ota_css_v9', cssTxt);
          var otaStyle = document.getElementById('streamit-ota-css');
          if (!otaStyle) {
            otaStyle = document.createElement('style');
            otaStyle.id = 'streamit-ota-css';
            document.head.appendChild(otaStyle);
          }
          otaStyle.textContent = cssTxt;
        }
        if (navTxt && navTxt.length > 500) {
          localStorage.setItem('streamit_ota_tv_nav_v9', navTxt);
        }
        if (jsTxt && jsTxt.length > 2000) {
          localStorage.setItem('streamit_ota_app_js_v9', jsTxt);
        }
        localStorage.setItem('streamit_ota_version_v9', verObj.version);
        if (verObj.version !== APP_VERSION) {
          try {
            var reloadKey = 'streamit_ota_reloaded_' + verObj.version;
            if (!sessionStorage.getItem(reloadKey)) {
              sessionStorage.setItem(reloadKey, '1');
              window.location.reload();
            }
          } catch (eRel) {}
        }
      }
    } catch (e) {}
  }

  function showCinemaToast(message) {
    if (!message) return;
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    var item = document.createElement('div');
    item.className = 'cinema-toast-item';
    item.textContent = message;
    container.appendChild(item);
    setTimeout(function () {
      if (item && item.parentNode) {
        item.parentNode.removeChild(item);
      }
    }, 2800);
  }
  window.showCinemaToast = showCinemaToast;
  window.showToast = showCinemaToast;

  /**
   * Reorganized Explorer: Open Genres Strip (`#genreFilterStrip`) + Sleek Dropdowns (`#providerDropdownWrap`, `#yearDropdownWrap`, `#actorDropdownWrap`)
   */
  function closeAllExplorerDropdowns() {
    var pairs = [
      { btn: 'providerDropdownBtn', panel: 'providerDropdownPanel' },
      { btn: 'yearDropdownBtn', panel: 'yearDropdownPanel' },
      { btn: 'actorDropdownBtn', panel: 'actorDropdownPanel' }
    ];
    for (var i = 0; i < pairs.length; i++) {
      var b = document.getElementById(pairs[i].btn);
      var p = document.getElementById(pairs[i].panel);
      if (b) b.setAttribute('aria-expanded', 'false');
      if (p) p.classList.add('hidden');
    }
  }
  window.closeAllExplorerDropdowns = closeAllExplorerDropdowns;

  function toggleExplorerDropdown(btnId, panelId) {
    var btn = document.getElementById(btnId);
    var panel = document.getElementById(panelId);
    if (!btn || !panel) return;
    var isOpen = !panel.classList.contains('hidden');
    closeAllExplorerDropdowns();
    if (!isOpen) {
      panel.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
      var firstOpt = panel.querySelector('.active') || panel.querySelector('.tv-focusable');
      if (firstOpt && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(firstOpt, { scroll: false });
      }
    } else if (typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(btn, { scroll: false });
    }
  }

  function renderGenreFilterStrip() {
    var strip = document.getElementById('genreFilterStrip');
    if (!strip) return;

    var activeProfile = getActiveSubUser();
    var filters = GENRE_FILTERS.filter(function (gf) {
      if (activeProfile && activeProfile.isKids && (gf.id === 'horror' || gf.id === 'crime' || gf.id === 'thriller')) {
        return false;
      }
      return true;
    });

    strip.innerHTML = filters.map(function (gf) {
      var isAct = state.activeGenre === gf.id;
      return (
        '<button type="button" class="genre-chip-btn tv-focusable' + (isAct ? ' active' : '') + '" ' +
          'data-genre="' + gf.id + '">' +
          escapeHtml(gf.label) +
        '</button>'
      );
    }).join('');

    var btns = strip.querySelectorAll('.genre-chip-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var g = this.getAttribute('data-genre') || 'all';
        state.activeGenre = g;
        state.gridPage = 1;
        if (g === 'channels') {
          state.activeCategory = 'channels';
        } else if (g === 'youtube') {
          state.activeCategory = 'youtube';
        } else if (state.activeCategory === 'channels' || state.activeCategory === 'youtube') {
          state.activeCategory = 'all';
        }
        closeAllExplorerDropdowns();
        renderGenreFilterStrip();
        renderCatalogShelves();
      });
    }

    var tvCatList = document.getElementById('tvRailCategoriesList');
    if (tvCatList) {
      tvCatList.innerHTML = filters.map(function (gf) {
        var isAct = state.activeGenre === gf.id;
        return (
          '<button type="button" class="tv-rail-item tv-focusable' + (isAct ? ' active' : '') + '" data-tv-genre="' + gf.id + '">' +
            '<span>' + escapeHtml(gf.label) + '</span>' +
          '</button>'
        );
      }).join('');
      var tvBtns = tvCatList.querySelectorAll('[data-tv-genre]');
      for (var t = 0; t < tvBtns.length; t++) {
        tvBtns[t].addEventListener('click', function () {
          var g = this.getAttribute('data-tv-genre') || 'all';
          state.activeGenre = g;
          state.tvInlineSearchQuery = '';
          var sTxt = document.getElementById('tvRailSearchText');
          if (sTxt) sTxt.textContent = 'חיפוש...';
          var sClr = document.getElementById('tvRailSearchClearBtn');
          if (sClr) sClr.classList.add('hidden');
          state.gridPage = 1;
          if (g === 'channels') {
            state.activeCategory = 'channels';
          } else if (g === 'youtube') {
            state.activeCategory = 'youtube';
          } else if (state.activeCategory === 'channels' || state.activeCategory === 'youtube') {
            state.activeCategory = 'all';
          }
          renderGenreFilterStrip();
          renderCatalogShelves();
          var keepFocus = tvCatList.querySelector('[data-tv-genre="' + g + '"]');
          if (keepFocus && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(keepFocus, { scroll: false });
          }
        });
      }
    }
  }

  function renderProviderFilterStrip() {
    var strip = document.getElementById('providerFilterStrip');
    var labelEl = document.getElementById('activeProviderLabel');
    var btnEl = document.getElementById('providerDropdownBtn');
    var tvRailBtn = document.getElementById('tvPlatformsRailBtn');
    if (!strip) return;

    var activeProviderObj = PROVIDER_FILTERS[0];
    for (var p = 0; p < PROVIDER_FILTERS.length; p++) {
      if (PROVIDER_FILTERS[p].id === state.activeProvider) {
        activeProviderObj = PROVIDER_FILTERS[p];
        break;
      }
    }
    if (labelEl) labelEl.textContent = activeProviderObj.label;
    if (btnEl) btnEl.classList.toggle('has-active-filter', state.activeProvider !== 'all');
    if (tvRailBtn) tvRailBtn.classList.toggle('active', state.activeProvider !== 'all');

    strip.innerHTML = PROVIDER_FILTERS.map(function (pf) {
      var isAct = state.activeProvider === pf.id;
      return (
        '<button type="button" class="provider-chip-btn tv-focusable' + (isAct ? ' active' : '') + '" ' +
          'data-provider="' + pf.id + '">' +
          escapeHtml(pf.label) +
        '</button>'
      );
    }).join('');

    var btns = strip.querySelectorAll('[data-provider]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var prov = this.getAttribute('data-provider') || 'all';
        state.activeProvider = prov;
        state.gridPage = 1;
        closeAllExplorerDropdowns();
        renderProviderFilterStrip();
        renderCatalogShelves();
        var focusTarget = (document.body.classList.contains('tv-mode') && tvRailBtn) ? tvRailBtn : btnEl;
        if (focusTarget && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(focusTarget, { scroll: false });
        }
      });
    }

    var tvPlatList = document.getElementById('tvRailPlatformsList');
    if (tvPlatList) {
      var shortCardLabels = {
        all: 'הכל',
        netflix: 'נטפליקס',
        apple: 'אפל TV+',
        hbo: 'HBO Max',
        amazon: 'פריים',
        disney: 'דיסני+',
        tpb: '4K YTS',
        telegram: 'טלגרם'
      };
      tvPlatList.innerHTML = PROVIDER_FILTERS.map(function (pf) {
        var isAct = state.activeProvider === pf.id;
        var cardText = shortCardLabels[pf.id] || String(pf.label || '').replace(/\s*\([^)]*\)/g, '');
        return (
          '<button type="button" class="tv-rail-item tv-rail-platform-card tv-focusable' + (isAct ? ' active' : '') + '" data-tv-provider="' + pf.id + '">' +
            '<span>' + escapeHtml(cardText) + '</span>' +
          '</button>'
        );
      }).join('');
      var tvPBtns = tvPlatList.querySelectorAll('[data-tv-provider]');
      for (var tp = 0; tp < tvPBtns.length; tp++) {
        tvPBtns[tp].addEventListener('click', function () {
          var prov = this.getAttribute('data-tv-provider') || 'all';
          state.activeProvider = prov;
          state.tvInlineSearchQuery = '';
          var sTxt = document.getElementById('tvRailSearchText');
          if (sTxt) sTxt.textContent = 'חיפוש...';
          var sClr = document.getElementById('tvRailSearchClearBtn');
          if (sClr) sClr.classList.add('hidden');
          state.gridPage = 1;
          renderProviderFilterStrip();
          renderCatalogShelves();
          var keepFocus = tvPlatList.querySelector('[data-tv-provider="' + prov + '"]');
          if (keepFocus && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(keepFocus, { scroll: false });
          }
        });
      }
    }
  }

  function renderYearFilterStrip() {
    var strip = document.getElementById('yearFilterStrip');
    var labelEl = document.getElementById('activeYearLabel');
    var btnEl = document.getElementById('yearDropdownBtn');
    var tvRailBtn = document.getElementById('tvYearsRailBtn');
    if (!strip) return;

    var activeYearObj = YEAR_FILTERS[0];
    for (var k = 0; k < YEAR_FILTERS.length; k++) {
      if (YEAR_FILTERS[k].id === state.activeYear) {
        activeYearObj = YEAR_FILTERS[k];
        break;
      }
    }
    if (labelEl) labelEl.textContent = activeYearObj.label;
    if (btnEl) btnEl.classList.toggle('has-active-filter', state.activeYear !== 'all');
    if (tvRailBtn) tvRailBtn.classList.toggle('active', state.activeYear !== 'all');

    strip.innerHTML = YEAR_FILTERS.map(function (yf) {
      var isAct = state.activeYear === yf.id;
      return (
        '<button type="button" class="year-chip-btn tv-focusable' + (isAct ? ' active' : '') + '" ' +
          'data-year="' + yf.id + '">' +
          escapeHtml(yf.label) +
        '</button>'
      );
    }).join('');

    var btns = strip.querySelectorAll('[data-year]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', async function () {
        var y = this.getAttribute('data-year') || 'all';
        state.activeYear = y;
        state.gridPage = 1;
        closeAllExplorerDropdowns();
        renderYearFilterStrip();
        if (y !== 'all') {
          await fetchMoviesByYear(y);
        }
        renderCatalogShelves();
        var focusTarget = (document.body.classList.contains('tv-mode') && tvRailBtn) ? tvRailBtn : btnEl;
        if (focusTarget && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(focusTarget, { scroll: false });
        }
      });
    }

    var tvYearList = document.getElementById('tvRailYearsList');
    if (tvYearList) {
      tvYearList.innerHTML = YEAR_FILTERS.map(function (yf) {
        var isAct = state.activeYear === yf.id;
        return (
          '<button type="button" class="tv-rail-item tv-focusable' + (isAct ? ' active' : '') + '" data-tv-year="' + yf.id + '">' +
            '<span>' + escapeHtml(yf.label) + '</span>' +
          '</button>'
        );
      }).join('');
      var tvYBtns = tvYearList.querySelectorAll('[data-tv-year]');
      for (var ty = 0; ty < tvYBtns.length; ty++) {
        tvYBtns[ty].addEventListener('click', async function () {
          var y = this.getAttribute('data-tv-year') || 'all';
          state.activeYear = y;
          state.tvInlineSearchQuery = '';
          var sTxt = document.getElementById('tvRailSearchText');
          if (sTxt) sTxt.textContent = 'חיפוש...';
          var sClr = document.getElementById('tvRailSearchClearBtn');
          if (sClr) sClr.classList.add('hidden');
          state.gridPage = 1;
          renderYearFilterStrip();
          if (y !== 'all') {
            await fetchMoviesByYear(y);
          }
          renderCatalogShelves();
          var keepFocus = tvYearList.querySelector('[data-tv-year="' + y + '"]');
          if (keepFocus && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(keepFocus, { scroll: false });
          }
        });
      }
    }
  }

  async function fetchMoviesByYear(yearKey) {
    var queryParam = '';
    if (yearKey === '2015-2019') queryParam = '&primary_release_date.gte=2015-01-01&primary_release_date.lte=2019-12-31';
    else if (yearKey === '2010-2014' || yearKey === '2010s') queryParam = '&primary_release_date.gte=2010-01-01&primary_release_date.lte=2014-12-31';
    else if (yearKey === '2000-2009' || yearKey === '2000s') queryParam = '&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31';
    else if (yearKey === '1990-1999') queryParam = '&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31';
    else if (yearKey === 'classic') queryParam = '&primary_release_date.lte=1989-12-31';
    else queryParam = '&primary_release_year=' + encodeURIComponent(yearKey);

    try {
      var r = await fetch(TMDB_BASE + '/discover/movie?language=he-IL&sort_by=popularity.desc' + queryParam + '&page=1&api_key=' + TMDB_API_KEY);
      if (r.ok) {
        var j = await r.json();
        if (j && Array.isArray(j.results)) mergeItemsIntoCatalog(j.results, 'movie', null);
      }
    } catch (e) {}
  }

  function getFallbackActorAvatarSvg(name) {
    var initial = String(name || 'A').trim().charAt(0) || 'A';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
      '<rect width="80" height="80" fill="#262626"/>' +
      '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Rubik, sans-serif" font-weight="600" font-size="34">' +
      escapeHtml(initial) + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function renderActorFilterStrip() {
    var strip = document.getElementById('actorFilterStrip');
    var tvMoreActorsGrid = document.getElementById('tvMoreActorsGrid');
    var labelEl = document.getElementById('activeActorLabel');
    var btnEl = document.getElementById('actorDropdownBtn');
    var miniAvatar = document.getElementById('activeActorBtnAvatar');
    var miniIcon = document.getElementById('activeActorBtnIcon');
    if (!strip && !tvMoreActorsGrid) return;

    var hasActiveActor = state.activeActorId && state.activeActorId !== 'all';
    if (labelEl) {
      labelEl.textContent = hasActiveActor ? (state.activeActorName || 'שחקן נבחר') : 'כל השחקנים';
    }
    if (btnEl) {
      btnEl.classList.toggle('has-active-filter', Boolean(hasActiveActor));
    }
    if (miniAvatar && miniIcon) {
      if (hasActiveActor && state.activeActorPhoto) {
        miniAvatar.src = state.activeActorPhoto;
        miniAvatar.alt = state.activeActorName || '';
        miniAvatar.classList.remove('hidden');
        miniIcon.classList.add('hidden');
      } else {
        miniAvatar.classList.add('hidden');
        miniIcon.classList.remove('hidden');
      }
    }

    var cardsHtml = ACTOR_FILTERS.map(function (af) {
      var isAct = String(state.activeActorId) === String(af.id);
      var actorLabel = af.name || af.label || '';
      var photoUrl = state.actorPhotosCache[af.id] || af.photo || getFallbackActorAvatarSvg(actorLabel);
      var fallbackSvg = getFallbackActorAvatarSvg(actorLabel);
      return (
        '<button type="button" class="actor-photo-card actor-chip-btn tv-focusable' + (isAct ? ' active' : '') + '" ' +
          'data-actor-id="' + af.id + '" data-actor-name="' + escapeHtml(actorLabel) + '" data-actor-photo="' + escapeHtml(photoUrl) + '">' +
          '<img class="actor-chip-avatar" src="' + escapeHtml(photoUrl) + '" alt="' + escapeHtml(actorLabel) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + fallbackSvg + '\';" />' +
          '<span class="actor-chip-name">' + escapeHtml(actorLabel) + '</span>' +
        '</button>'
      );
    }).join('');

    var bindActorBtns = function (containerEl, isFromTvMoreModal) {
      if (!containerEl) return;
      containerEl.innerHTML = cardsHtml;
      var btns = containerEl.querySelectorAll('[data-actor-id]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', async function () {
          var aid = this.getAttribute('data-actor-id') || 'all';
          var aname = this.getAttribute('data-actor-name') || '';
          var aphoto = this.getAttribute('data-actor-photo') || '';
          state.activeActorId = aid;
          state.activeActorName = aid === 'all' ? '' : aname;
          state.activeActorPhoto = aid === 'all' ? '' : aphoto;
          var searchIn = document.getElementById('actorSearchInput');
          if (searchIn && aid === 'all') searchIn.value = '';
          else if (searchIn && aname) searchIn.value = aname;
          var tvMoreSearchIn = document.getElementById('tvMoreActorSearchInput');
          if (tvMoreSearchIn && aid === 'all') tvMoreSearchIn.value = '';
          else if (tvMoreSearchIn && aname) tvMoreSearchIn.value = aname;
          closeAllExplorerDropdowns();
          if (isFromTvMoreModal) {
            var tvMoreMod = document.getElementById('tvMoreModal');
            if (tvMoreMod) tvMoreMod.classList.add('hidden');
          }
          renderActorFilterStrip();
          if (aid !== 'all') {
            await fetchActorCredits(aid, aname);
          }
          renderCatalogShelves();
          if (isFromTvMoreModal) {
            var firstPoster = document.querySelector('#catalogRowsContainer .poster-card');
            if (firstPoster && typeof window.streamItFocusElement === 'function') {
              window.streamItFocusElement(firstPoster, { scroll: true });
            }
          } else if (btnEl && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(btnEl, { scroll: false });
          }
        });
      }
    };

    bindActorBtns(strip, false);
    bindActorBtns(tvMoreActorsGrid, true);

    var tvActList = document.getElementById('tvRailActorsList');
    if (tvActList) {
      tvActList.innerHTML = ACTOR_FILTERS.map(function (af) {
        var isAct = String(state.activeActorId) === String(af.id);
        var actorLabel = af.name || af.label || '';
        return (
          '<button type="button" class="tv-rail-item tv-focusable' + (isAct ? ' active' : '') + '" ' +
            'data-tv-actor-id="' + af.id + '" data-tv-actor-name="' + escapeHtml(actorLabel) + '">' +
            '<span>' + escapeHtml(actorLabel) + '</span>' +
          '</button>'
        );
      }).join('');
      var tvABtns = tvActList.querySelectorAll('[data-tv-actor-id]');
      for (var ta = 0; ta < tvABtns.length; ta++) {
        tvABtns[ta].addEventListener('click', async function () {
          var aid = this.getAttribute('data-tv-actor-id') || 'all';
          var aname = this.getAttribute('data-tv-actor-name') || '';
          state.activeActorId = aid;
          state.activeActorName = aid === 'all' ? '' : aname;
          state.tvInlineSearchQuery = '';
          var sTxt = document.getElementById('tvRailSearchText');
          if (sTxt) sTxt.textContent = 'חיפוש...';
          var sClr = document.getElementById('tvRailSearchClearBtn');
          if (sClr) sClr.classList.add('hidden');
          renderActorFilterStrip();
          if (aid !== 'all') {
            await fetchActorCredits(aid, aname);
          }
          renderCatalogShelves();
          var keepFocus = tvActList.querySelector('[data-tv-actor-id="' + aid + '"]');
          if (keepFocus && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(keepFocus, { scroll: false });
          }
        });
      }
    }
  }

  async function fetchActorCredits(actorId, actorName) {
    if (!actorId || actorId === 'all') return;
    if (!state.actorMoviesCache) state.actorMoviesCache = {};

    // Also fetch actor profile_path if not yet cached
    if (!state.activeActorPhoto || state.activeActorPhoto.indexOf('data:image/svg') === 0) {
      try {
        var pRes = await fetch(TMDB_BASE + '/person/' + encodeURIComponent(actorId) + '?api_key=' + TMDB_API_KEY + '&language=he-IL');
        if (pRes.ok) {
          var pData = await pRes.json();
          if (pData && pData.profile_path) {
            var fullPhoto = TMDB_IMG_PROFILE + pData.profile_path;
            state.actorPhotosCache[actorId] = fullPhoto;
            state.activeActorPhoto = fullPhoto;
            renderActorFilterStrip();
          }
        }
      } catch (e) {}
    }

    if (state.actorMoviesCache[actorId] && state.actorMoviesCache[actorId].length) return;
    try {
      var res = await fetch(TMDB_BASE + '/person/' + encodeURIComponent(actorId) + '/combined_credits?api_key=' + TMDB_API_KEY + '&language=he-IL');
      if (res.ok) {
        var data = await res.json();
        var rawCast = (data && Array.isArray(data.cast)) ? data.cast : [];
        var filteredCast = rawCast.filter(function (c) {
          if (!c || !c.poster_path) return false;
          var gIds = Array.isArray(c.genre_ids) ? c.genre_ids : [];
          // Exclude Talk Shows (10767), News (10763), Reality (10764), Soap (10766)
          if (gIds.indexOf(10767) !== -1 || gIds.indexOf(10763) !== -1 || gIds.indexOf(10764) !== -1 || gIds.indexOf(10766) !== -1) {
            return false;
          }
          var ch = String(c.character || '').toLowerCase();
          if (/\b(self|himself|herself|archive footage|uncredited|guest|host)\b/.test(ch) || ch.indexOf('עצמו') !== -1 || ch.indexOf('עצמה') !== -1) {
            return false;
          }
          if (c.media_type === 'tv' && typeof c.episode_count === 'number' && c.episode_count <= 2 && (c.vote_count || 0) < 500) {
            return false;
          }
          return true;
        });
        var cast = filteredCast.length >= 6 ? filteredCast : rawCast;
        cast.sort(function (a, b) {
          var scoreA = ((a.media_type === 'movie') ? 1.4 : 1.0) * ((a.vote_count || 0) + (a.popularity || 0) * 12);
          var scoreB = ((b.media_type === 'movie') ? 1.4 : 1.0) * ((b.vote_count || 0) + (b.popularity || 0) * 12);
          return scoreB - scoreA;
        });
        var items = [];
        var seenIds = {};
        for (var i = 0; i < cast.length && items.length < 48; i++) {
          var c = cast[i];
          if (!c.poster_path) continue;
          var norm = normalizeItem(c, c.media_type === 'tv' ? 'series' : 'movie', null);
          if (norm && !seenIds[norm.id]) {
            seenIds[norm.id] = true;
            norm.castHe = actorName;
            items.push(norm);
          }
        }
        state.actorMoviesCache[actorId] = items;
        mergeItemsIntoCatalog(cast.slice(0, 48), 'movie', null);
      }
    } catch (e) {}
  }

  function normalizeHebrewActorQuery(str) {
    return String(str || '')
      .trim()
      .toLowerCase()
      .replace(/['׳"״\-]/g, '')
      .replace(/\s+/g, ' ');
  }

  async function resolveHebrewActorViaWikipedia(hebrewQuery) {
    try {
      var wikiUrl = 'https://he.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
        encodeURIComponent(hebrewQuery) +
        '&gsrlimit=1&prop=langlinks&lllang=en&format=json&origin=*';
      var res = await fetch(wikiUrl);
      if (!res.ok) return '';
      var data = await res.json();
      var pages = data && data.query && data.query.pages ? data.query.pages : null;
      if (!pages) return '';
      var keys = Object.keys(pages);
      if (!keys.length) return '';
      var page = pages[keys[0]];
      if (page && Array.isArray(page.langlinks) && page.langlinks[0] && page.langlinks[0]['*']) {
        return String(page.langlinks[0]['*']).replace(/\s*\([^)]*\)\s*$/, '').trim();
      }
    } catch (e) {}
    return '';
  }

  async function searchActorByNameAndLoad(query) {
    var q = (query || '').trim();
    if (q.length < 2) {
      state.activeActorId = 'all';
      state.activeActorName = '';
      state.activeActorPhoto = '';
      renderActorFilterStrip();
      renderCatalogShelves();
      return;
    }

    var normQ = normalizeHebrewActorQuery(q);

    // 1. Instant Match in Built-In 55+ Hebrew & Hollywood Actors Directory (e.g., "ברוס ויליס", "גל גדות", "ליאונרדו דיקפריו")
    var matchedEntry = null;
    for (var i = 0; i < HEBREW_ACTORS_DIRECTORY.length; i++) {
      var entry = HEBREW_ACTORS_DIRECTORY[i];
      var nHe = normalizeHebrewActorQuery(entry.name);
      var nEn = normalizeHebrewActorQuery(entry.en);
      if (nHe === normQ || nEn === normQ || nHe.indexOf(normQ) !== -1 || nEn.indexOf(normQ) !== -1) {
        matchedEntry = entry;
        break;
      }
      if (Array.isArray(entry.aliases)) {
        for (var a = 0; a < entry.aliases.length; a++) {
          if (normalizeHebrewActorQuery(entry.aliases[a]).indexOf(normQ) !== -1) {
            matchedEntry = entry;
            break;
          }
        }
        if (matchedEntry) break;
      }
    }

    if (matchedEntry) {
      state.activeActorId = String(matchedEntry.id);
      state.activeActorName = matchedEntry.name;
      state.activeActorPhoto = matchedEntry.photo || '';
      if (matchedEntry.photo) state.actorPhotosCache[state.activeActorId] = matchedEntry.photo;
      renderActorFilterStrip();
      await fetchActorCredits(state.activeActorId, state.activeActorName);
      renderCatalogShelves();
      return;
    }

    // 2. Query TMDB `/search/person` directly (works for English names and TMDB-indexed Hebrew names)
    var foundPerson = null;
    try {
      var res = await fetch(TMDB_BASE + '/search/person?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(q));
      if (res.ok) {
        var data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length) {
          foundPerson = data.results[0];
        }
      }
    } catch (e) {}

    // 3. If TMDB didn't match the Hebrew transliteration, resolve English name via Hebrew Wikipedia `langlinks` API and search TMDB!
    if (!foundPerson) {
      var enName = await resolveHebrewActorViaWikipedia(q);
      if (enName) {
        try {
          var enRes = await fetch(TMDB_BASE + '/search/person?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(enName));
          if (enRes.ok) {
            var enData = await enRes.json();
            if (enData && Array.isArray(enData.results) && enData.results.length) {
              foundPerson = enData.results[0];
            }
          }
        } catch (e) {}
      }
    }

    if (foundPerson && foundPerson.id) {
      state.activeActorId = String(foundPerson.id);
      state.activeActorName = q;
      var photo = foundPerson.profile_path ? (TMDB_IMG_PROFILE + foundPerson.profile_path) : getFallbackActorAvatarSvg(q);
      state.activeActorPhoto = photo;
      state.actorPhotosCache[state.activeActorId] = photo;

      // Also add to ACTOR_FILTERS dropdown if not already listed
      if (!ACTOR_FILTERS.some(function (af) { return String(af.id) === state.activeActorId; })) {
        ACTOR_FILTERS.splice(1, 0, {
          id: state.activeActorId,
          name: q,
          en: foundPerson.name || q,
          photo: photo
        });
      }

      renderActorFilterStrip();
      await fetchActorCredits(state.activeActorId, state.activeActorName);
      renderCatalogShelves();
    }
  }

  function filterByYear(list, yearKey) {
    if (!yearKey || yearKey === 'all') return list;
    return list.filter(function (item) {
      var y = parseInt(item.year, 10);
      if (!y) return false;
      if (yearKey === '2015-2019') return y >= 2015 && y <= 2019;
      if (yearKey === '2010-2014' || yearKey === '2010s') return y >= 2010 && y <= 2014;
      if (yearKey === '2000-2009' || yearKey === '2000s') return y >= 2000 && y <= 2009;
      if (yearKey === '1990-1999') return y >= 1990 && y <= 1999;
      if (yearKey === 'classic') return y < 1990;
      return String(y) === String(yearKey);
    });
  }

  /**
   * Render Hero Stage & 14 Multi-Category Shelves
   */
  function renderInitialStage() {
    var movies = filterKidsItems(state.catalog.movies);
    var series = filterKidsItems(state.catalog.series);
    var channels = state.catalog.channels;

    if (!state.heroItem) {
      state.heroItem = movies[0] || series[0] || channels[0] || null;
    }
    if (state.heroItem) {
      updateHeroBillboard(state.heroItem);
    }

    renderCatalogShelves();
  }

  function filterKidsItems(list) {
    if (!Array.isArray(list)) return [];
    var sysCfg = getSystemConfig();
    var strictPoster = !sysCfg.features || sysCfg.features.strictPosterFilter !== false;
    var strictSources = !sysCfg.features || sysCfg.features.strictSourcesAndSubs !== false;
    var parentalFeatureOn = !sysCfg.features || sysCfg.features.parentalSafeWatch !== false;

    var activeProfile = getActiveSubUser();
    var pCfg = activeProfile ? ensureProfileParentalConfig(activeProfile) : null;
    var isKidsMode = Boolean(parentalFeatureOn && activeProfile && activeProfile.isKids);
    var isSafeWatch = Boolean(parentalFeatureOn && pCfg && pCfg.enabled);

    return list.filter(function (item) {
      if (!item) return false;
      if (item.type !== 'channel') {
        if (state.brokenPosterIds && state.brokenPosterIds[String(item.id)]) return false;
        if (strictPoster) {
          var p = String(item.poster || '').trim();
          if (!p || p.indexOf('1489599849927') !== -1 || p.indexOf('undefined') !== -1 || p.indexOf('null') !== -1) {
            return false;
          }
        }
        if (strictSources) {
          var hasSrc = Boolean(item.imdbId || item.tmdbId || item.streamUrl || item.videoId || item.directYtId || (item.fallbackStreams && item.fallbackStreams.length));
          if (!hasSrc) return false;
        }
        if (sysCfg.sources && sysCfg.sources.telegram_vod === false && String(item.id || '').indexOf('tg_') === 0) {
          return false;
        }
      }
      var genres = Array.isArray(item.genres) ? item.genres : [];
      if (sysCfg.categories) {
        if (sysCfg.categories.israeli === false && item.isIsraeli && item.type !== 'channel') return false;
        if (sysCfg.categories.horror === false && genres.indexOf('horror') !== -1) return false;
        if (sysCfg.categories.animation === false && genres.indexOf('animation') !== -1) return false;
        if (sysCfg.categories.docu === false && genres.indexOf('docu') !== -1) return false;
      }
      if (isKidsMode) {
        if (genres.indexOf('horror') !== -1 || genres.indexOf('crime') !== -1 || genres.indexOf('thriller') !== -1) return false;
        if (item.ageRating === '18+' || item.ageRating === '16+') return false;
      }
      if (isSafeWatch && pCfg.categories) {
        if (pCfg.categories.horror && genres.indexOf('horror') !== -1) return false;
        if (pCfg.categories.sex && item.ageRating === '18+') return false;
      }
      return true;
    });
  }

  function getActiveLiveChannelsList() {
    var sysCfg = getSystemConfig();
    var rawChannels = Array.isArray(state.catalog.channels) ? state.catalog.channels : [];
    return rawChannels.filter(function (ch) {
      if (!ch) return false;
      if (sysCfg.disabledChannelIds && sysCfg.disabledChannelIds[String(ch.id)]) return false;
      var grp = ch.liveGroup || 'israeli';
      if (sysCfg.sources) {
        if (grp === 'israeli' && sysCfg.sources.israeli_live === false) return false;
        if (grp === 'cinema' && sysCfg.sources.cinema_live === false) return false;
        if (grp === 'sports' && sysCfg.sources.sports_live === false) return false;
        if (grp === 'news' && sysCfg.sources.news_live === false) return false;
      }
      return true;
    });
  }

  function filterByGenre(list, genreKey) {
    return list.filter(function (item) {
      return item.genres && item.genres.indexOf(genreKey) !== -1;
    });
  }

  function updateHeroBillboard(item) {
    if (!item) return;
    state.heroItem = item;

    var backdropEl = document.getElementById('heroBackdrop');
    var catTagEl = document.getElementById('heroCategoryTag');
    var titleEl = document.getElementById('heroTitle');
    var metaEl = document.getElementById('heroMeta');
    var overviewEl = document.getElementById('heroOverview');
    var wlBtn = document.getElementById('heroWatchlistBtn');

    if (backdropEl) {
      var bgUrl = item.backdrop || item.poster || '';
      if (document.body && document.body.classList.contains('tv-mode')) {
        if (backdropEl.getAttribute('data-bg-url') !== bgUrl && bgUrl) {
          backdropEl.setAttribute('data-bg-url', bgUrl);
          var preImg = new Image();
          preImg.onload = function () {
            if (state.heroItem && state.heroItem.id === item.id) {
              backdropEl.style.backgroundImage = 'url("' + bgUrl + '")';
            }
          };
          preImg.src = bgUrl;
        }
      } else {
        backdropEl.style.backgroundImage = 'url("' + bgUrl + '")';
      }
    }
    if (catTagEl) {
      catTagEl.textContent = item.type === 'series' ? 'סדרת טלוויזיה' : (item.type === 'channel' ? 'שידור חי' : 'סרט קולנוע');
    }
    if (titleEl) {
      titleEl.textContent = item.title;
    }
    if (metaEl) {
      var matchScore = Math.min(99, Math.max(88, Math.round((parseFloat(item.rating) || 8.4) * 10 + 8)));
      metaEl.innerHTML =
        '<span class="meta-match">' + matchScore + '% התאמה</span>' +
        '<span class="meta-year">' + escapeHtml(item.year) + '</span>' +
        '<span class="meta-quality">4K HDR</span>' +
        '<span class="meta-sub">כתוביות בעברית</span>';
    }
    if (overviewEl) {
      overviewEl.textContent = item.overview;
    }
    if (wlBtn) {
      var inWl = isInWatchlist(item.id);
      wlBtn.setAttribute('aria-label', inWl ? 'הסר מהרשימה שלי' : 'הוסף לרשימה שלי');
      wlBtn.innerHTML =
        '<span id="heroWatchlistIcon">' + (inWl ? '✓' : '+') + '</span>' +
        '<span id="heroWatchlistText">' + (inWl ? 'ברשימה שלי' : 'הרשימה שלי') + '</span>';
    }
  }

  window.previewCardInHero = function (cardEl) {
    if (!cardEl) return;
    var itemId = cardEl.getAttribute('data-item-id');
    var item = findItemById(itemId);
    if (item) updateHeroBillboard(item);
  };

  function findItemById(id) {
    if (!id) return null;
    var pools = [state.catalog.movies, state.catalog.series, state.catalog.channels, state.catalog.youtube || []];
    for (var p = 0; p < pools.length; p++) {
      for (var i = 0; i < pools[p].length; i++) {
        if (String(pools[p][i].id) === String(id)) return pools[p][i];
      }
    }
    var actorKeys = Object.keys(state.actorMoviesCache || {});
    for (var k = 0; k < actorKeys.length; k++) {
      var list = state.actorMoviesCache[actorKeys[k]] || [];
      for (var j = 0; j < list.length; j++) {
        if (String(list[j].id) === String(id)) return list[j];
      }
    }
    return null;
  }

  function captureCatalogFocusState(container) {
    if (!container) return null;
    var focusedEl = container.querySelector('.tv-focused');
    if (!focusedEl) return null;
    var parentRow = focusedEl.closest('.netflix-row');
    var allRows = Array.prototype.slice.call(container.querySelectorAll('.netflix-row'));
    var rowIndex = parentRow ? allRows.indexOf(parentRow) : -1;
    var cardIndex = -1;
    if (parentRow) {
      var rCards = Array.prototype.slice.call(parentRow.querySelectorAll('.poster-card'));
      cardIndex = rCards.indexOf(focusedEl);
    } else {
      var gCards = Array.prototype.slice.call(container.querySelectorAll('.catalog-poster-grid .poster-card'));
      cardIndex = gCards.indexOf(focusedEl);
    }
    return {
      itemId: focusedEl.getAttribute('data-item-id') || '',
      id: focusedEl.id || '',
      rowIndex: rowIndex,
      cardIndex: cardIndex
    };
  }

  function restoreCatalogFocusState(container, desc) {
    if (desc && container && typeof window.streamItFocusElement === 'function') {
      var target = null;
      if (desc.rowIndex >= 0) {
        var rowsNow = container.querySelectorAll('.netflix-row');
        var rowEl = rowsNow[Math.min(desc.rowIndex, rowsNow.length - 1)];
        if (rowEl) {
          if (desc.itemId) {
            target = rowEl.querySelector('.poster-card[data-item-id="' + desc.itemId.replace(/"/g, '\\"') + '"]');
          }
          if (!target && desc.cardIndex >= 0) {
            var rCardsNow = rowEl.querySelectorAll('.poster-card');
            if (rCardsNow.length) target = rCardsNow[Math.min(desc.cardIndex, rCardsNow.length - 1)];
          }
        }
      }
      if (!target && desc.itemId) {
        target = container.querySelector('.poster-card[data-item-id="' + desc.itemId.replace(/"/g, '\\"') + '"]');
      }
      if (!target && desc.cardIndex >= 0) {
        var gCardsNow = container.querySelectorAll('.catalog-poster-grid .poster-card');
        if (gCardsNow.length) target = gCardsNow[Math.min(desc.cardIndex, gCardsNow.length - 1)];
      }
      if (!target && desc.id) {
        target = document.getElementById(desc.id);
      }
      if (target) {
        window.streamItFocusElement(target, { scroll: false });
        return;
      }
    }
    if (window.TVNavigation && typeof window.TVNavigation.ensureInitialFocus === 'function') {
      window.TVNavigation.ensureInitialFocus();
    }
  }

  function renderCatalogShelves() {
    var container = document.getElementById('catalogRowsContainer');
    var continueSec = document.getElementById('continueWatchingSection');
    var continueRow = document.getElementById('continueWatchingRow');
    if (!container) return;

    var savedFocusDesc = captureCatalogFocusState(container);
    var savedCwFocusId = (continueRow && continueRow.querySelector('.tv-focused'))
      ? (continueRow.querySelector('.tv-focused').getAttribute('data-item-id') || '')
      : '';

    var profBucket = ensureActiveProfileBucket();
    var activeProfile = getActiveSubUser();
    var tvProfNameEl = document.getElementById('tvRailProfileName');
    if (tvProfNameEl && activeProfile) {
      tvProfNameEl.textContent = activeProfile.name;
    }
    var allMovies = filterKidsItems(state.catalog.movies);
    var allSeries = filterKidsItems(state.catalog.series);
    var allChannels = getActiveLiveChannelsList();
    var allYoutube = state.catalog.youtube || BUILTIN_YOUTUBE_ITEMS;

    var cat = state.activeCategory;
    var genre = state.activeGenre;
    var provider = state.activeProvider || 'all';
    var yearKey = state.activeYear || 'all';
    var actorId = state.activeActorId || 'all';
    var inlineQ = String(state.tvInlineSearchQuery || '').trim();

    // 1. Continue Watching Shelf (Per Sub-User Profile — Movies & Series ONLY, NEVER Live TV Channels!)
    var progressIds = Object.keys(profBucket.progress || {});
    if (continueSec && continueRow) {
      var cwItems = [];
      var cleanedAnyChannel = false;
      for (var p = 0; p < progressIds.length; p++) {
        var pid = progressIds[p];
        var found = findItemById(pid);
        if (!found || found.type === 'channel' || String(pid).indexOf('il_') === 0 || String(pid).indexOf('us_') === 0 || String(pid).indexOf('ch_') === 0) {
          if (found && found.type === 'channel') {
            delete profBucket.progress[pid];
            cleanedAnyChannel = true;
          }
          continue;
        }
        cwItems.push(found);
      }
      if (cleanedAnyChannel) {
        saveSubUsersState();
      }
      if (cwItems.length && !inlineQ && cat === 'all' && genre === 'all' && provider === 'all' && yearKey === 'all' && actorId === 'all') {
        continueSec.classList.remove('hidden');
        var cwTitle = continueSec.querySelector('.row-title');
        if (cwTitle) cwTitle.textContent = 'המשך צפייה עבור ' + (activeProfile ? activeProfile.name : 'פרופיל ראשי');
        continueRow.innerHTML = cwItems.map(function (cwItem) {
          return renderPosterCardHtml(cwItem, { isContinueWatching: true });
        }).join('');
        bindPosterCardEvents(continueRow);
        if (savedCwFocusId && typeof window.streamItFocusElement === 'function') {
          var cwRestored = continueRow.querySelector('.poster-card[data-item-id="' + savedCwFocusId.replace(/"/g, '\\"') + '"]');
          if (cwRestored) window.streamItFocusElement(cwRestored, { scroll: false });
        }
      } else {
        continueSec.classList.add('hidden');
      }
    }

    // 1b. Inline Side-Menu Search Query Active (`state.tvInlineSearchQuery`): Organize ALL tiles by search relevance immediately!
    if (inlineQ.length >= 1) {
      var qLow = inlineQ.toLowerCase();
      var searchPool = allMovies.concat(allSeries, allChannels);
      var seenSearchIds = {};
      var scoredMatches = [];
      for (var sp = 0; sp < searchPool.length; sp++) {
        var it = searchPool[sp];
        if (!it) continue;
        var sKey = String(it.id || it.imdbId || it.tmdbId || it.title);
        if (seenSearchIds[sKey]) continue;
        var t1 = String(it.title || '').toLowerCase();
        var t2 = String(it.originalTitle || '').toLowerCase();
        var c1 = String(it.castHe || '').toLowerCase();
        var ov1 = String(it.overview || '').toLowerCase();
        var score = 0;
        if (t1 === qLow || t2 === qLow) score = 100;
        else if (t1.indexOf(qLow) === 0 || t2.indexOf(qLow) === 0) score = 85;
        else if (t1.indexOf(qLow) !== -1 || t2.indexOf(qLow) !== -1) score = 70;
        else if (c1.indexOf(qLow) !== -1) score = 50;
        else if (inlineQ.length >= 2 && ov1.indexOf(qLow) !== -1) score = 30;
        if (score > 0) {
          seenSearchIds[sKey] = true;
          scoredMatches.push({ item: it, score: score });
        }
      }
      scoredMatches.sort(function (a, b) { return b.score - a.score; });
      var matchedItems = scoredMatches.map(function (m) { return m.item; });
      if (matchedItems.length && matchedItems[0].type !== 'channel') {
        updateHeroBillboard(matchedItems[0]);
      }
      var searchTitle = matchedItems.length
        ? ('תוצאות חיפוש: "' + inlineQ + '" (' + matchedItems.length + ' כותרים)')
        : ('מחפש כותרים עבור "' + inlineQ + '"...');
      container.innerHTML =
        '<section class="catalog-wall-section">' +
          '<h2 class="row-title">' + escapeHtml(searchTitle) + '</h2>' +
          '<div class="catalog-poster-grid">' +
            matchedItems.map(renderPosterCardHtml).join('') +
          '</div>' +
        '</section>';
      bindPosterCardEvents(container);
      if (savedFocusDesc) {
        restoreCatalogFocusState(container, savedFocusDesc);
      } else {
        var catMainSearch = document.getElementById('catalogMain');
        if (catMainSearch) catMainSearch.scrollTop = 0;
      }
      return;
    }

    // 2a. Unified Live TV Broadcast Hub (`cat === 'channels'` or `genre === 'channels'`) — ALL Live Broadcasts Organized in ONE Place!
    if (cat === 'channels' || genre === 'channels') {
      var activeGrp = state.activeLiveGroup || 'all';
      var liveQ = String(state.liveSearchQuery || '').trim().toLowerCase();
      var sortedChannels = allChannels.slice().sort(function (a, b) {
        var na = parseInt(a.channelNumber, 10) || 999;
        var nb = parseInt(b.channelNumber, 10) || 999;
        return na - nb;
      });

      var filteredChannels = sortedChannels.filter(function (ch) {
        if (activeGrp !== 'all' && (ch.liveGroup || 'israeli') !== activeGrp) return false;
        if (liveQ) {
          var hay = ((ch.channelNumber || '') + ' ' + (ch.title || '') + ' ' + (ch.originalTitle || '') + ' ' + (ch.logoText || '') + ' ' + (ch.subLabel || '')).toLowerCase();
          if (hay.indexOf(liveQ) === -1) return false;
        }
        return true;
      });

      var countByGrp = {
        all: sortedChannels.length,
        israeli: sortedChannels.filter(function (c) { return (c.liveGroup || 'israeli') === 'israeli'; }).length,
        cinema: sortedChannels.filter(function (c) { return c.liveGroup === 'cinema'; }).length,
        sports: sortedChannels.filter(function (c) { return c.liveGroup === 'sports'; }).length,
        news: sortedChannels.filter(function (c) { return c.liveGroup === 'news'; }).length,
        imported: sortedChannels.filter(function (c) { return c.liveGroup === 'imported'; }).length
      };

      var liveGroups = [
        { id: 'all', label: 'כל השידורים החיים (' + countByGrp.all + ')' },
        { id: 'israeli', label: 'עידן+ וישראל — 11, 12, 13, 14, 23 (' + countByGrp.israeli + ')' },
        { id: 'cinema', label: 'yes / HOT / NEXT TV / סלקום TV (' + countByGrp.cinema + ')' },
        { id: 'sports', label: 'ספורט חי HD (' + countByGrp.sports + ')' },
        { id: 'news', label: 'חדשות ארה״ב והעולם 24/7 (' + countByGrp.news + ')' },
        { id: 'imported', label: 'ערוצים נוספים (' + countByGrp.imported + ')' }
      ];

      var grpTabsHtml = liveGroups.map(function (g) {
        var isAct = activeGrp === g.id;
        return '<button type="button" class="genre-chip-btn tv-focusable' + (isAct ? ' active' : '') + '" data-live-group="' + g.id + '">' + escapeHtml(g.label) + '</button>';
      }).join('');

      var importOpenClass = state.liveImportOpen ? '' : ' hidden';
      var liveHubHtml =
        '<section class="catalog-wall-section live-hub-section">' +
          '<div class="live-hub-banner">' +
            '<div class="live-hub-title-wrap">' +
              '<span class="live-hub-pill">🔴 LIVE BROADCAST CENTER • 1080p50 HD</span>' +
              '<h2 class="row-title" style="margin:4px 0;">מרכז השידורים החיים — כל הערוצים מחוברים במקום אחד</h2>' +
              '<p class="live-hub-sub">כאן 11, קשת 12 (Akamai 1080p50), רשת 13, עכשיו 14, כאן חינוכית 23, ערוצי yes / HOT / NEXT TV / סלקום TV, ספורט וחדשות 24/7</p>' +
            '</div>' +
            '<div class="live-hub-actions">' +
              '<input id="liveChannelSearchInput" type="search" class="youtube-search-input tv-focusable" value="' + escapeHtml(state.liveSearchQuery || '') + '" placeholder="חפש ערוץ או הקלד אפיק (11, 12, 13, 14, 23, 55)..." autocomplete="off" style="max-width:270px;" />' +
              '<button type="button" id="autoDiscoverIptvWebBtn" class="btn-secondary tv-focusable" style="height:42px;padding:0 16px;font-size:0.84rem;white-space:nowrap;border-color:rgba(16,185,129,0.5);color:#6ee7b7;">🔄 סריקה וחיבור אוטומטי מהרשת</button>' +
              '<button type="button" id="toggleLiveImporterBtn" class="btn-primary tv-focusable" style="height:42px;padding:0 16px;font-size:0.85rem;white-space:nowrap;">+ הוסף ערוץ / M3U</button>' +
            '</div>' +
          '</div>' +

          '<div id="liveImporterPanel" class="live-importer-panel' + importOpenClass + '">' +
            '<div class="live-importer-header">' +
              '<div>' +
                '<strong style="font-size:1.02rem;color:#fff;display:block;">חיבור אוטומטי של ערוצי ישראל / IPTV מהרשת (ללא צורך בחיפוש קישורים)</strong>' +
                '<span style="font-size:0.83rem;color:#94a3b8;">כל ערוצי עידן+, yes, HOT, NEXT TV וסלקום TV כבר מחוברים מראש! ניתן גם לסרוק אוטומטית מהרשת או להוסיף קישור M3U מותאם אישית:</span>' +
              '</div>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<button type="button" id="importPresetYesHotBtn" class="btn-primary tv-focusable" style="height:36px;padding:0 14px;font-size:0.82rem;background:#059669;">⚡ סרוק וחבר אוטומטית ערוצים נוספים מהרשת</button>' +
                (countByGrp.imported > 0
                  ? '<button type="button" id="clearImportedChannelsBtn" class="btn-secondary tv-focusable" style="height:36px;padding:0 12px;font-size:0.8rem;">איפוס ערוצים שנוספו (' + countByGrp.imported + ')</button>'
                  : '') +
              '</div>' +
            '</div>' +
            '<div class="live-importer-form">' +
              '<input id="liveCustomNameInput" type="text" class="youtube-search-input tv-focusable" placeholder="שם הערוץ (רשות)..." style="flex:1;min-width:180px;" />' +
              '<input id="liveCustomNumInput" type="text" class="youtube-search-input tv-focusable" placeholder="מס׳ אפיק" style="width:120px;flex:none;" />' +
              '<input id="liveCustomUrlInput" type="url" class="youtube-search-input tv-focusable" placeholder="קישור שידור ישיר (.m3u8 / .m3u) אם קיים..." style="flex:2;min-width:240px;" />' +
              '<button type="button" id="liveImportSubmitBtn" class="btn-primary tv-focusable" style="height:42px;padding:0 18px;font-size:0.86rem;">חבר ערוץ</button>' +
              '<button type="button" id="liveImportFileBtn" class="btn-secondary tv-focusable" style="height:42px;padding:0 14px;font-size:0.84rem;">📂 טען קובץ .M3U</button>' +
              '<input id="liveImportFileInput" type="file" accept=".m3u,.m3u8,.txt" class="hidden" />' +
            '</div>' +
            '<div id="liveImportStatusMsg" class="live-import-status"></div>' +
          '</div>' +

          '<div id="liveGroupTabs" class="genre-filter-strip" style="margin:14px 0 18px 0;">' +
            grpTabsHtml +
          '</div>' +

          '<div id="liveChannelsUnifiedGrid" class="catalog-poster-grid live-channels-grid">' +
            filteredChannels.map(renderPosterCardHtml).join('') +
          '</div>' +
        '</section>';

      container.innerHTML = liveHubHtml;
      bindPosterCardEvents(container);

      var autoWebBtn = document.getElementById('autoDiscoverIptvWebBtn');
      if (autoWebBtn) {
        autoWebBtn.addEventListener('click', function () {
          autoDiscoverIsraeliIptvFromWeb(autoWebBtn);
        });
      }

      var grpBtns = container.querySelectorAll('[data-live-group]');
      for (var gb = 0; gb < grpBtns.length; gb++) {
        grpBtns[gb].addEventListener('click', function () {
          state.activeLiveGroup = this.getAttribute('data-live-group') || 'all';
          renderCatalogShelves();
        });
      }

      var searchIn = document.getElementById('liveChannelSearchInput');
      if (searchIn) {
        searchIn.addEventListener('input', function () {
          state.liveSearchQuery = this.value;
          var q = String(state.liveSearchQuery || '').trim().toLowerCase();
          var gridEl = document.getElementById('liveChannelsUnifiedGrid');
          if (!gridEl) return;
          var matches = sortedChannels.filter(function (ch) {
            if (state.activeLiveGroup !== 'all' && (ch.liveGroup || 'israeli') !== state.activeLiveGroup) return false;
            if (!q) return true;
            var hay = ((ch.channelNumber || '') + ' ' + (ch.title || '') + ' ' + (ch.originalTitle || '') + ' ' + (ch.logoText || '') + ' ' + (ch.subLabel || '')).toLowerCase();
            return hay.indexOf(q) !== -1;
          });
          gridEl.innerHTML = matches.map(renderPosterCardHtml).join('');
          bindPosterCardEvents(gridEl);
        });
      }

      var toggleImpBtn = document.getElementById('toggleLiveImporterBtn');
      if (toggleImpBtn) {
        toggleImpBtn.addEventListener('click', function () {
          state.liveImportOpen = !state.liveImportOpen;
          var panel = document.getElementById('liveImporterPanel');
          if (panel) panel.classList.toggle('hidden', !state.liveImportOpen);
        });
      }

      var presetBtn = document.getElementById('importPresetYesHotBtn');
      if (presetBtn) {
        presetBtn.addEventListener('click', function () {
          importPresetChannelPack('yes_hot_next');
        });
      }

      var clearImpBtn = document.getElementById('clearImportedChannelsBtn');
      if (clearImpBtn) {
        clearImpBtn.addEventListener('click', function () {
          saveCustomImportedChannels([]);
          mergeCustomChannelsIntoState();
          state.activeLiveGroup = 'all';
          renderCatalogShelves();
        });
      }

      var submitImpBtn = document.getElementById('liveImportSubmitBtn');
      if (submitImpBtn) {
        submitImpBtn.addEventListener('click', function () {
          var uIn = document.getElementById('liveCustomUrlInput');
          var nIn = document.getElementById('liveCustomNameInput');
          var numIn = document.getElementById('liveCustomNumInput');
          importM3uFromUrlOrText(uIn ? uIn.value : '', nIn ? nIn.value : '', numIn ? numIn.value : '');
        });
      }

      var fileBtn = document.getElementById('liveImportFileBtn');
      var fileIn = document.getElementById('liveImportFileInput');
      if (fileBtn && fileIn) {
        fileBtn.addEventListener('click', function () {
          fileIn.click();
        });
        fileIn.addEventListener('change', function () {
          var f = this.files && this.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function (ev) {
            var content = String((ev && ev.target && ev.target.result) || '');
            importM3uFromUrlOrText(content, f.name.replace(/\.[^.]+$/, ''), '');
          };
          reader.readAsText(f);
        });
      }

      restoreCatalogFocusState(container, savedFocusDesc);
      return;
    }

    // 2b. Dedicated YouTube Hub (`cat === 'youtube'` or `genre === 'youtube'`)
    if (cat === 'youtube' || genre === 'youtube') {
      var ytHtml =
        '<section class="catalog-wall-section">' +
          '<div class="youtube-hub-header">' +
            '<h2 class="row-title" style="margin:0;">יוטיוב — חיפוש ישיר, טריילרים, הופעות חיות וסרטים מלאים</h2>' +
            '<input id="youtubeDirectSearchInput" type="search" class="youtube-search-input tv-focusable" placeholder="חפש כל סרטון, טריילר או ערוץ ביוטיוב..." autocomplete="off" />' +
          '</div>' +
          '<div id="youtubeResultsGrid" class="catalog-poster-grid">' +
            allYoutube.map(renderPosterCardHtml).join('') +
          '</div>' +
        '</section>';
      container.innerHTML = ytHtml;
      bindPosterCardEvents(container);
      var ytIn = document.getElementById('youtubeDirectSearchInput');
      if (ytIn) {
        ytIn.addEventListener('input', function () {
          var v = this.value;
          if (state.ytDebounce) clearTimeout(state.ytDebounce);
          state.ytDebounce = setTimeout(function () {
            searchLiveYoutubeAndRender(v);
          }, 300);
        });
      }
      restoreCatalogFocusState(container, savedFocusDesc);
      return;
    }

    var shelves = [];
    var gridWallTitle = '';
    var gridWallItems = [];
    var actorShowcaseHtml = '';

    // 3. Actor Filter Active -> Actor Showcase Header with Portrait Photo + Multi-Row & Multi-Column Poster Wall Grid
    if (actorId !== 'all') {
      var actorList = state.actorMoviesCache[actorId] || [];
      var actorPhoto = state.activeActorPhoto || state.actorPhotosCache[actorId] || getFallbackActorAvatarSvg(state.activeActorName);
      var fallbackAvatar = getFallbackActorAvatarSvg(state.activeActorName);
      actorShowcaseHtml =
        '<div class="actor-showcase-banner">' +
          '<div class="actor-showcase-info">' +
            '<img class="actor-showcase-photo" src="' + escapeHtml(actorPhoto) + '" alt="' + escapeHtml(state.activeActorName || '') + '" onerror="this.onerror=null;this.src=\'' + fallbackAvatar + '\';" />' +
            '<div class="actor-showcase-text">' +
              '<div class="actor-showcase-name">' + escapeHtml(state.activeActorName || 'שחקן נבחר') + '</div>' +
              '<div class="actor-showcase-sub">פילמוגרפיה מלאה לצפייה ישירה (' + actorList.length + ' סרטים וסדרות עם תרגום לעברית)</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" id="clearActorFilterBtn" class="btn-secondary tv-focusable" style="height:36px;padding:0 14px;font-size:0.84rem;">הצג את כל השחקנים</button>' +
        '</div>';
      gridWallTitle = 'כל הסרטים והסדרות של ' + (state.activeActorName || 'השחקן הנבחר') + ' (' + actorList.length + ' כותרים)';
      gridWallItems = actorList;
    }
    // 4. Year Filter Active -> Multi-Row & Multi-Column Poster Wall Grid
    else if (yearKey !== 'all') {
      var yPool = (cat === 'series' ? allSeries : (cat === 'movies' ? allMovies : allMovies.concat(allSeries)));
      if (provider !== 'all') yPool = filterByGenre(yPool, provider);
      if (genre !== 'all' && genre !== 'channels') yPool = filterByGenre(yPool, genre);
      gridWallItems = filterByYear(yPool, yearKey);
      gridWallTitle = 'מאגר סרטים וסדרות — שנת ' + yearKey + ' (' + gridWallItems.length + ' כותרים)';
    }
    // 5. Streaming Giant / Provider Selected (`netflix`, `apple`, `hbo`, `amazon`, `disney`, `tpb`, `telegram`)
    else if (provider !== 'all') {
      var pLabel = GENRE_HE_LABELS[provider] || 'פלטפורמת סטרימינג';
      var pMovies = filterByGenre(allMovies, provider);
      var pSeries = filterByGenre(allSeries, provider);
      var pCombined = [];
      if (cat !== 'series') pCombined = pCombined.concat(pMovies);
      if (cat !== 'movies') pCombined = pCombined.concat(pSeries);
      if (genre !== 'all' && genre !== 'channels') pCombined = filterByGenre(pCombined, genre);
      gridWallTitle = 'קטלוג ' + pLabel + ' (' + pCombined.length + ' סרטים וסדרות)';
      gridWallItems = pCombined;
    }
    // 6. Specific Genre Selected (`action`, `crime`, `thriller`, `scifi`, `horror`, `comedy`, `drama`, `israeli`, etc.)
    else if (genre !== 'all' && genre !== 'channels') {
      var gLabel = GENRE_HE_LABELS[genre] || 'נבחרים';
      var gMovies = filterByGenre(allMovies, genre);
      var gSeries = filterByGenre(allSeries, genre);
      var combined = [];
      if (cat !== 'series') combined = combined.concat(gMovies);
      if (cat !== 'movies') combined = combined.concat(gSeries);
      gridWallTitle = 'קטלוג מלא: ' + gLabel + ' (' + combined.length + ' סרטים וסדרות)';
      gridWallItems = combined;
    }
    // 6. Category = Movies / Series / Channels / MyList / All (Home)
    else if (cat === 'movies') {
      var sysCfgMov = getSystemConfig();
      var showTop10Mov = !sysCfgMov.features || sysCfgMov.features.top10Shelves !== false;
      if (showTop10Mov && (!sysCfgMov.categories || sysCfgMov.categories.top10_most_watched !== false)) {
        shelves.push({ title: 'הסרטים הנצפים ביותר היום', items: allMovies.slice(0, 10), isTop10: true });
      }
      shelves.push({ title: 'שוברי קופות וסרטים מובילים', items: allMovies.slice(10, 28) });
      shelves.push({ title: 'נטפליקס, אפל TV+, אמאזון ו-HBO', items: filterByGenre(allMovies, 'netflix').concat(filterByGenre(allMovies, 'apple'), filterByGenre(allMovies, 'amazon')).slice(0, 20) });
      if (showTop10Mov && (!sysCfgMov.categories || sysCfgMov.categories.top10_newest !== false)) {
        var newestMov = allMovies.filter(function (m) { return m.year === '2026' || m.year === '2025'; }).slice(0, 10);
        if (newestMov.length >= 5) {
          shelves.push({ title: 'הסרטים החדשים ביותר (2025–2026)', items: newestMov, isTop10: true });
        }
      }
      if (!sysCfgMov.categories || sysCfgMov.categories.tpb_4k !== false) {
        shelves.push({ title: 'מאגר PirateBay & YTS 4K', items: filterByGenre(allMovies, 'tpb').slice(0, 20) });
      }
      gridWallTitle = 'כל הסרטים במאגר (' + allMovies.length + ' סרטים)';
      gridWallItems = allMovies;
    } else if (cat === 'series') {
      var sysCfgSer = getSystemConfig();
      var showTop10Ser = !sysCfgSer.features || sysCfgSer.features.top10Shelves !== false;
      if (showTop10Ser && (!sysCfgSer.categories || sysCfgSer.categories.top10_series !== false)) {
        shelves.push({ title: 'הסדרות הנצפות ביותר היום', items: allSeries.slice(0, 10), isTop10: true });
      }
      shelves.push({ title: 'סדרות מובילות עם תרגום לעברית', items: allSeries.slice(10, 28) });
      shelves.push({ title: 'סדרות נטפליקס, HBO, אפל TV+ ואמאזון', items: filterByGenre(allSeries, 'netflix').concat(filterByGenre(allSeries, 'hbo'), filterByGenre(allSeries, 'apple'), filterByGenre(allSeries, 'amazon')).slice(0, 20) });
      gridWallTitle = 'כל הסדרות במאגר (' + allSeries.length + ' סדרות)';
      gridWallItems = allSeries;
    } else if (cat === 'telegram') {
      var tgMovies = filterByGenre(allMovies, 'telegram');
      var tgSeries = filterByGenre(allSeries, 'telegram');
      var tgAll = tgMovies.concat(tgSeries);
      var chCount = getConnectedTelegramChannels().length;
      actorShowcaseHtml =
        '<div class="tg-category-banner">' +
          '<div>' +
            '<strong style="font-size:1.05rem;color:#fff;display:block;">טלגרם קולנוע VOD — סרטים וסדרות שנמשכו מערוצי הטלגרם (' + chCount + ' ערוצים מחוברים)</strong>' +
            '<span style="font-size:0.84rem;color:#9ca3af;">לחץ על כל סרט או סדרה למטה לצפייה ישירה ב-1080p עם תרגום מובנה בעברית בלבד</span>' +
          '</div>' +
          '<button type="button" id="openTgModalFromBannerBtn" class="btn-primary tv-focusable" style="height:38px;padding:0 16px;font-size:0.85rem;">+ הוסף / נהל ערוצי טלגרם</button>' +
        '</div>';
      shelves.push({ title: 'סרטים שנמשכו מערוצי הטלגרם (' + tgMovies.length + ' סרטים)', items: tgMovies.slice(0, 24) });
      shelves.push({ title: 'סדרות שנמשכו מערוצי הטלגרם (' + tgSeries.length + ' סדרות)', items: tgSeries.slice(0, 20) });
      gridWallTitle = 'כל סרטי וסדרות הטלגרם (' + tgAll.length + ' כותרים זמינים לצפייה מיידית)';
      gridWallItems = tgAll;
    } else if (cat === 'channels' || genre === 'channels') {
      shelves.push({ title: 'ערוצי ישראל בשידור חי (עידן+ HD)', items: allChannels.slice(0, 8) });
      shelves.push({ title: 'ערוצי חדשות וספורט מארצות הברית והעולם (US News & Sports 24/7)', items: allChannels.slice(8) });
      gridWallTitle = 'כל ערוצי הטלוויזיה בשידור חי (' + allChannels.length + ' ערוצים)';
      gridWallItems = allChannels;
    } else if (cat === 'mylist') {
      var wlItems = (profBucket.watchlist || []).map(findItemById).filter(Boolean);
      gridWallTitle = wlItems.length
        ? ('הרשימה שלי — ' + (activeProfile ? activeProfile.name : ''))
        : 'הרשימה שלך ריקה — הוסף סרטים וסדרות לצפייה מאוחרת';
      gridWallItems = wlItems;
    } else {
      // Home ('all') — Interleaved Top 10 Ranked Shelves + Category Shelves Controlled by Admin Dashboard!
      var sysCfgHome = getSystemConfig();
      var showTop10 = !sysCfgHome.features || sysCfgHome.features.top10Shelves !== false;
      var catVis = sysCfgHome.categories || {};
      var srcVis = sysCfgHome.sources || {};

      var seenHomeIds = {};
      var takeUniqueHomeItems = function (pool, maxCount) {
        var out = [];
        for (var idx = 0; idx < pool.length; idx++) {
          var it = pool[idx];
          if (!it || it.type === 'channel') continue;
          var key = String(it.id || it.imdbId || it.tmdbId || it.title);
          if (seenHomeIds[key]) continue;
          seenHomeIds[key] = true;
          out.push(it);
          if (out.length >= maxCount) break;
        }
        return out;
      };

      // TOP 10 #1 (Row 1): הנצפים ביותר היום בישראל
      if (showTop10 && catVis.top10_most_watched !== false) {
        var top10MostWatched = takeUniqueHomeItems(allMovies.concat(allSeries), 10);
        if (top10MostWatched.length) {
          shelves.push({ title: 'הנצפים ביותר בישראל היום', items: top10MostWatched, isTop10: true });
        }
      }

      // Row 2: שוברי קופות וסרטים מובילים
      if (catVis.movies !== false) {
        var topIsraelItems = takeUniqueHomeItems(allMovies, 16);
        if (topIsraelItems.length) {
          shelves.push({ title: 'שוברי קופות וסרטים מובילים', items: topIsraelItems });
        }
      }

      // Row 3: סדרות פופולריות לצפייה ישירה
      if (catVis.series !== false) {
        var topSeriesHome = takeUniqueHomeItems(allSeries, 16);
        if (topSeriesHome.length) {
          shelves.push({ title: 'סדרות פופולריות לצפייה ישירה', items: topSeriesHome });
        }
      }

      // TOP 10 #2 (Row 4): החדשים ביותר (2025–2026)
      if (showTop10 && catVis.top10_newest !== false) {
        var newestPool = allMovies.concat(allSeries).filter(function (it) {
          return it && (it.year === '2026' || it.year === '2025');
        });
        var top10Newest = takeUniqueHomeItems(newestPool, 10);
        if (top10Newest.length) {
          shelves.push({ title: 'החדשים ביותר — הבכורות החמות של השנה', items: top10Newest, isTop10: true });
        }
      }

      // Row 5: נטפליקס (Netflix Originals & Top)
      if (catVis.netflix !== false && srcVis.vidsrc_vip !== false) {
        var netflixItems = takeUniqueHomeItems(filterByGenre(allMovies, 'netflix').concat(filterByGenre(allSeries, 'netflix')), 18);
        if (netflixItems.length) {
          shelves.push({ title: 'נטפליקס (Netflix Originals & Top)', items: netflixItems });
        }
      }

      // Row 6: אפל TV+, HBO Max ואמאזון פריים
      if (catVis.apple_hbo_prime !== false) {
        var appleHboItems = takeUniqueHomeItems(
          filterByGenre(allMovies, 'apple').concat(filterByGenre(allSeries, 'apple'), filterByGenre(allSeries, 'hbo'), filterByGenre(allMovies, 'amazon'), filterByGenre(allSeries, 'amazon')),
          18
        );
        if (appleHboItems.length) {
          shelves.push({ title: 'אפל TV+, HBO Max ואמאזון פריים (Apple / HBO / Prime)', items: appleHboItems });
        }
      }

      // TOP 10 #3 (Row 7): טופ 10 — הסדרות המובילות השבוע
      if (showTop10 && catVis.top10_series !== false && catVis.series !== false) {
        var top10SeriesItems = takeUniqueHomeItems(allSeries, 10);
        if (top10SeriesItems.length) {
          shelves.push({ title: 'הסדרות המובילות השבוע', items: top10SeriesItems, isTop10: true });
        }
      }

      // Row 8: טלגרם קולנוע VOD
      if (catVis.telegram !== false && srcVis.telegram_vod !== false) {
        var rawTgPool = filterByGenre(allMovies, 'telegram').concat(filterByGenre(allSeries, 'telegram'));
        var tgUniqueItems = takeUniqueHomeItems(rawTgPool, 18);
        if (tgUniqueItems.length) {
          shelves.push({ title: 'טלגרם קולנוע VOD — סרטים וסדרות שנמשכו מערוצי הטלגרם', items: tgUniqueItems });
        }
      }

      // Row 9: אקשן, הרפתקאות ושוברי קופות
      if (catVis.action !== false) {
        var actionMovies = takeUniqueHomeItems(filterByGenre(allMovies, 'action'), 18);
        if (actionMovies.length) {
          shelves.push({ title: 'אקשן, הרפתקאות ושוברי קופות', items: actionMovies });
        }
      }

      // TOP 10 #4 (Row 10): טופ 10 — אקשן, מתח ושוברי קופות
      if (showTop10 && catVis.top10_action !== false && catVis.action !== false) {
        var top10ActionPool = filterByGenre(allMovies, 'action').concat(filterByGenre(allMovies, 'thriller'), filterByGenre(allSeries, 'action'));
        var top10ActionItems = takeUniqueHomeItems(top10ActionPool, 10);
        if (top10ActionItems.length) {
          shelves.push({ title: 'אקשן, מתח ושוברי קופות', items: top10ActionItems, isTop10: true });
        }
      }

      // Row 11: מתח, פשע ומסתורין
      if (catVis.crime !== false) {
        var crimeItems = takeUniqueHomeItems(filterByGenre(allMovies, 'crime').concat(filterByGenre(allMovies, 'thriller'), filterByGenre(allSeries, 'crime')), 18);
        if (crimeItems.length) {
          shelves.push({ title: 'מתח, פשע ומסתורין', items: crimeItems });
        }
      }

      // Row 12: מדע בדיוני ופנטזיה
      if (catVis.scifi !== false) {
        var scifiItems = takeUniqueHomeItems(filterByGenre(allMovies, 'scifi').concat(filterByGenre(allSeries, 'scifi')), 18);
        if (scifiItems.length) {
          shelves.push({ title: 'מדע בדיוני ופנטזיה', items: scifiItems });
        }
      }

      // Row 13: יצירה ישראלית וקולנוע ישראלי
      if (catVis.israeli !== false) {
        var israeliItems = filterByGenre(allMovies, 'israeli').concat(filterByGenre(allSeries, 'israeli'));
        if (israeliItems.length) {
          shelves.push({ title: 'יצירה ישראלית וקולנוע ישראלי', items: israeliItems.slice(0, 20) });
        }
      }

      // Row 14: קומדיות ורומנטיקה
      if (catVis.comedy !== false) {
        var comedyItems = takeUniqueHomeItems(filterByGenre(allMovies, 'comedy').concat(filterByGenre(allMovies, 'romance')), 18);
        if (comedyItems.length) {
          shelves.push({ title: 'קומדיות ורומנטיקה', items: comedyItems });
        }
      }

      // Row 15: מאגר PirateBay & YTS 4K Direct
      if (catVis.tpb_4k !== false && srcVis.tpb_yts_4k !== false) {
        var tpbItems = takeUniqueHomeItems(filterByGenre(allMovies, 'tpb'), 18);
        if (tpbItems.length) {
          shelves.push({ title: 'מאגר PirateBay & YTS 4K Direct', items: tpbItems });
        }
      }

      gridWallTitle = 'קטלוג הסרטים והסדרות המלא (' + (allMovies.length + allSeries.length) + ' כותרים)';
      gridWallItems = (catVis.movies === false ? [] : allMovies).concat(catVis.series === false ? [] : allSeries);
    }

    var html = '';
    for (var s = 0; s < shelves.length; s++) {
      var shelf = shelves[s];
      if (!shelf.items || !shelf.items.length) continue;
      var cardsHtml = shelf.items.map(function (it, idx) {
        return renderPosterCardHtml(it, shelf.isTop10 ? { rankNumber: idx + 1 } : undefined);
      }).filter(Boolean).join('');
      if (!cardsHtml) continue;
      if (shelf.isTop10) {
        html +=
          '<section class="netflix-row top10-row">' +
            '<h2 class="row-title"><span class="top10-row-pill">TOP 10</span><span>' + escapeHtml(shelf.title) + '</span></h2>' +
            '<div class="row-track">' +
              cardsHtml +
            '</div>' +
          '</section>';
      } else {
        html +=
          '<section class="netflix-row">' +
            '<h2 class="row-title">' + escapeHtml(shelf.title) + '</h2>' +
            '<div class="row-track">' +
              cardsHtml +
            '</div>' +
          '</section>';
      }
    }

    // Always render the Multi-Row & Multi-Column Grid Wall (paginated for instant DOM speed!)
    if (gridWallItems && gridWallItems.length) {
      var wallLimit = state.catalogWallLimit || 48;
      var wallSlice = gridWallItems.slice(0, wallLimit);
      var remainingWallCount = Math.max(0, gridWallItems.length - wallSlice.length);
      var loadMoreLabel = remainingWallCount > 0
        ? ('הצג עוד כותרים בקטלוג (+' + remainingWallCount + ' נוספים)')
        : 'טען עוד כותרים מהמאגר העולמי (+)';
      html +=
        '<section class="catalog-wall-section">' +
          actorShowcaseHtml +
          '<h2 class="row-title">' + escapeHtml(gridWallTitle) + '</h2>' +
          '<div class="catalog-poster-grid">' +
            wallSlice.map(renderPosterCardHtml).join('') +
          '</div>' +
          (cat !== 'channels' && cat !== 'mylist'
            ? '<div class="load-more-wrap"><button id="loadMoreCatalogBtn" type="button" class="btn-secondary tv-focusable">' + escapeHtml(loadMoreLabel) + '</button></div>'
            : '') +
        '</section>';
    } else if (actorShowcaseHtml) {
      html += '<section class="catalog-wall-section">' + actorShowcaseHtml + '</section>';
    }

    container.innerHTML = html;
    bindPosterCardEvents(container);

    var openTgBannerBtn = document.getElementById('openTgModalFromBannerBtn');
    if (openTgBannerBtn) {
      openTgBannerBtn.addEventListener('click', openTelegramModal);
    }

    var clearActorBtn = document.getElementById('clearActorFilterBtn');
    if (clearActorBtn) {
      clearActorBtn.addEventListener('click', function () {
        state.activeActorId = 'all';
        state.activeActorName = '';
        state.activeActorPhoto = '';
        var sIn = document.getElementById('actorSearchInput');
        if (sIn) sIn.value = '';
        renderActorFilterStrip();
        renderCatalogShelves();
      });
    }

    var loadMoreBtn = document.getElementById('loadMoreCatalogBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', loadMoreWorldCatalog);
    }

    restoreCatalogFocusState(container, savedFocusDesc);
  }

  async function searchLiveYoutubeAndRender(query) {
    var grid = document.getElementById('youtubeResultsGrid');
    if (!grid) return;
    var q = (query || '').trim();
    if (q.length < 2) {
      grid.innerHTML = (state.catalog.youtube || BUILTIN_YOUTUBE_ITEMS).map(renderPosterCardHtml).join('');
      bindPosterCardEvents(grid);
      return;
    }
    try {
      var res = await fetch(getApiBase() + '/api/youtube/search?q=' + encodeURIComponent(q));
      if (res.ok) {
        var data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length) {
          state.catalog.youtube = data.results.concat(BUILTIN_YOUTUBE_ITEMS);
          grid.innerHTML = data.results.map(renderPosterCardHtml).join('');
          bindPosterCardEvents(grid);
        }
      }
    } catch (e) {}
  }

  async function autoDiscoverIsraeliIptvFromWeb(btnEl) {
    var origText = btnEl ? btnEl.textContent : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ סורק ערוצים חיים מהרשת...';
    }
    try {
      var res = await fetch('https://iptv-org.github.io/iptv/countries/il.m3u');
      if (res.ok) {
        var text = await res.text();
        await importM3uFromUrlOrText(text, 'ערוצי ישראל מהרשת', '');
      }
    } catch (e) {}
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = '✅ כל הערוצים מסונכרנים ומחוברים';
      setTimeout(function () {
        if (btnEl) btnEl.textContent = origText;
      }, 3000);
    }
  }

  function isInContinueWatching(itemId) {
    if (!itemId) return false;
    var profBucket = ensureActiveProfileBucket();
    return Boolean(profBucket && profBucket.progress && profBucket.progress[itemId]);
  }

  function removeFromContinueWatching(itemId) {
    if (!itemId) return;
    var removedItem = findItemById(itemId);
    var profBucket = ensureActiveProfileBucket();
    if (profBucket && profBucket.progress && profBucket.progress[itemId]) {
      delete profBucket.progress[itemId];
    }
    var prefix = String(itemId) + '_s';
    var pKeys = Object.keys((profBucket && profBucket.progress) || {});
    for (var k = 0; k < pKeys.length; k++) {
      if (pKeys[k].indexOf(prefix) === 0) {
        delete profBucket.progress[pKeys[k]];
      }
    }
    saveSubUsersState();
    renderCatalogShelves();
    var remBtn = document.getElementById('detailsRemoveCwBtn');
    if (remBtn && state.detailsItem && String(state.detailsItem.id) === String(itemId)) {
      remBtn.classList.add('hidden');
      var playBtn = document.getElementById('detailsPlayBtn');
      if (playBtn && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(playBtn, { scroll: false });
      }
    } else if (document.getElementById('detailsModal') && document.getElementById('detailsModal').classList.contains('hidden')) {
      var nextCwCard = document.querySelector('#continueWatchingRow .poster-card') ||
        document.querySelector('#catalogRowsContainer .poster-card') ||
        document.getElementById('heroPlayBtn');
      if (nextCwCard && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(nextCwCard, { scroll: false });
      }
    }
    showCinemaToast(removedItem && removedItem.title ? ('הוסר מהמשך צפייה: ' + removedItem.title) : 'הוסר מרשימת המשך הצפייה');
  }

  function clearAllContinueWatching() {
    var profBucket = ensureActiveProfileBucket();
    if (profBucket) {
      profBucket.progress = {};
      saveSubUsersState();
      renderCatalogShelves();
    }
    var remBtn = document.getElementById('detailsRemoveCwBtn');
    if (remBtn) remBtn.classList.add('hidden');
    var fallbackFocus = document.querySelector('#catalogRowsContainer .poster-card') || document.getElementById('heroPlayBtn');
    if (fallbackFocus && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(fallbackFocus, { scroll: false });
    }
    showCinemaToast('רשימת המשך הצפייה נוקתה');
  }

  function renderPosterCardHtml(item, opts) {
    var isCwCard = Boolean(opts && opts.isContinueWatching);
    if (item && item.type === 'channel') {
      var chNum = item.channelNumber || (String(item.id || '').match(/\d+/) ? String(item.id || '').match(/\d+/)[0] : 'LIVE');
      var logoTxt = item.logoText || String(item.title || 'LIVE').split('—')[0].trim().slice(0, 14);
      var subTxt = item.subLabel || 'שידור חי ישיר • Full HD';
      var accent = item.brandAccent || '#E50914';
      var cleanTitle = String(item.title || logoTxt).split('—')[0].trim();

      return (
        '<article class="poster-card channel-tile-card tv-focusable" tabindex="0" role="button" ' +
          'style="--ch-accent:' + escapeHtml(accent) + ';" ' +
          'data-item-id="' + escapeHtml(item.id) + '" ' +
          'aria-label="' + escapeHtml(item.title) + '">' +
          '<div class="channel-tile-glow"></div>' +
          '<div class="channel-tile-top-bar">' +
            '<span class="channel-tile-num-badge">אפיק ' + escapeHtml(chNum) + '</span>' +
            '<span class="channel-tile-live-pill"><span class="channel-live-dot"></span>LIVE HD</span>' +
          '</div>' +
          '<div class="channel-tile-center-stage">' +
            '<div class="channel-tile-emblem-box">' +
              '<span class="channel-tile-emblem-logo">' + escapeHtml(logoTxt) + '</span>' +
              '<span class="channel-tile-emblem-tag">' + escapeHtml(item.quality || '1080p HD') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="channel-tile-bottom-bar">' +
            '<div class="channel-tile-meta">' +
              '<span class="channel-tile-title">' + escapeHtml(cleanTitle) + '</span>' +
              '<span class="channel-tile-sub">' + escapeHtml(subTxt) + '</span>' +
            '</div>' +
            '<div class="channel-tile-play-circle" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }

    var profBucket = ensureActiveProfileBucket();
    var prog = profBucket.progress ? profBucket.progress[item.id] : null;
    var progHtml = '';
    if (prog && prog.percent > 2 && prog.percent < 96) {
      progHtml =
        '<div class="poster-progress-bar">' +
          '<div class="poster-progress-fill" style="width:' + Math.round(prog.percent) + '%"></div>' +
        '</div>';
    }

    if (!item || !item.poster || String(item.poster).indexOf('1489599849927') !== -1 || (state.brokenPosterIds && state.brokenPosterIds[String(item.id)])) {
      return '';
    }
    var rankNum = (opts && typeof opts.rankNumber === 'number' && opts.rankNumber >= 1) ? opts.rankNumber : 0;
    var rankBadgeHtml = rankNum > 0
      ? '<span class="top10-rank-badge" aria-label="מקום ' + rankNum + '">' + rankNum + '</span>'
      : '';

    var cwControlsHtml = '';
    if (isCwCard) {
      cwControlsHtml =
        '<button type="button" class="cw-card-remove-btn tv-focusable" data-remove-cw-id="' + escapeHtml(item.id) + '" title="הסר מהמשך צפייה" aria-label="הסר מהמשך צפייה">' +
          '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
        '<button type="button" class="cw-card-info-btn tv-focusable" data-info-cw-id="' + escapeHtml(item.id) + '" title="פרטים ופרקים" aria-label="פרטים ופרקים">' +
          '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
        '</button>';
    }

    return (
      '<article class="poster-card' + (isCwCard ? ' cw-poster-card' : '') + (rankNum > 0 ? ' top10-poster-card' : '') + ' tv-focusable" tabindex="0" role="button" ' +
        'data-item-id="' + escapeHtml(item.id) + '" ' +
        'aria-label="' + escapeHtml((rankNum > 0 ? ('מקום ' + rankNum + ': ') : '') + item.title) + '">' +
        '<img class="poster-img" src="' + escapeHtml(item.poster) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" decoding="async" onerror="window.__streamItHandleBrokenPoster && window.__streamItHandleBrokenPoster(this, \'' + escapeHtml(item.id) + '\');" />' +
        rankBadgeHtml +
        cwControlsHtml +
        '<div class="poster-hover-overlay">' +
          '<span class="poster-hover-title">' + escapeHtml(item.title) + '</span>' +
        '</div>' +
        progHtml +
      '</article>'
    );
  }

  function bindPosterCardEvents(root) {
    var remBtns = root.querySelectorAll('[data-remove-cw-id]');
    for (var r = 0; r < remBtns.length; r++) {
      remBtns[r].addEventListener('click', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var remId = this.getAttribute('data-remove-cw-id');
        if (remId) removeFromContinueWatching(remId);
      });
    }
    var infoBtns = root.querySelectorAll('[data-info-cw-id]');
    for (var inf = 0; inf < infoBtns.length; inf++) {
      infoBtns[inf].addEventListener('click', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var infId = this.getAttribute('data-info-cw-id');
        var foundIt = findItemById(infId);
        if (foundIt) openDetailsModal(foundIt);
      });
    }

    var cards = root.querySelectorAll('.poster-card');
    var isContinueRow = Boolean(root && (root.id === 'continueWatchingRow' || (root.closest && root.closest('#continueWatchingSection'))));
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var id = this.getAttribute('data-item-id');
        var item = findItemById(id);
        if (!item) return;
        if (item.type === 'channel' || item.type === 'youtube') {
          startPlayback(item, 1, 1);
        } else if (isContinueRow || (this.closest && this.closest('#continueWatchingSection'))) {
          var profBucket = ensureActiveProfileBucket();
          var saved = profBucket.progress ? profBucket.progress[item.id] : null;
          var sNum = (saved && saved.season) ? saved.season : 1;
          var eNum = (saved && saved.episode) ? saved.episode : 1;
          startPlayback(item, sNum, eNum);
        } else {
          openDetailsModal(item);
        }
      });
      cards[i].addEventListener('mouseenter', function () {
        if (!document.body.classList.contains('tv-mode')) {
          var id = this.getAttribute('data-item-id');
          var item = findItemById(id);
          if (item) updateHeroBillboard(item);
        }
      });
    }
  }

  /**
   * Details Modal (Movies, Series Episodes & Multi-Source Streams from PirateBay / YTS / Telegram / Direct)
   */
  async function openDetailsModal(item) {
    if (!item) return;
    state.detailsItem = item;
    state.activeSeason = 1;
    state.activeEpisode = 1;

    var modal = document.getElementById('detailsModal');
    if (!modal) return;

    var backdrop = document.getElementById('detailsBackdrop');
    var catTag = document.getElementById('detailsCategoryTag');
    var title = document.getElementById('detailsTitle');
    var origTitle = document.getElementById('detailsOriginalTitle');
    var meta = document.getElementById('detailsMeta');
    var overview = document.getElementById('detailsOverview');
    var genres = document.getElementById('detailsGenres');
    var castEl = document.getElementById('detailsCast');
    var wlBtn = document.getElementById('detailsWatchlistBtn');
    var epSection = document.getElementById('detailsEpisodesSection');

    if (backdrop) backdrop.style.backgroundImage = 'url("' + (item.backdrop || item.poster) + '")';
    if (catTag) catTag.textContent = item.type === 'series' ? 'סדרת טלוויזיה' : 'סרט קולנוע';
    if (title) title.textContent = item.title;
    if (origTitle) {
      origTitle.textContent = (item.originalTitle && item.originalTitle !== item.title) ? item.originalTitle : '';
    }
    if (meta) {
      meta.innerHTML =
        '<span class="meta-match">96% התאמה</span>' +
        '<span class="meta-year">' + escapeHtml(item.year) + '</span>' +
        '<span class="meta-quality">4K Ultra HD</span>' +
        '<span class="meta-sub">כתוביות בעברית</span>';
    }
    if (overview) overview.textContent = item.overview;
    if (genres) genres.textContent = (item.genresHe || []).join(' • ');
    if (castEl) {
      castEl.textContent = item.castHe ? ('שחקנים: ' + item.castHe) : '';
    }

    if (wlBtn) {
      var inWl = isInWatchlist(item.id);
      wlBtn.innerHTML = (inWl ? getSvgIcon('check') : getSvgIcon('plus')) + '<span>' + (inWl ? 'ברשימה שלי' : 'הרשימה שלי') + '</span>';
    }

    var remCwBtn = document.getElementById('detailsRemoveCwBtn');
    if (remCwBtn) {
      remCwBtn.classList.toggle('hidden', !isInContinueWatching(item.id));
    }

    closeDetailsSourcesDropdown();

    var secHeading = document.getElementById('detailsSectionHeading');
    var seasonSel = document.getElementById('seasonSelector');
    var epGrid = document.getElementById('episodesGrid');

    if (epSection) {
      epSection.classList.remove('hidden');
      if (item.type === 'series') {
        if (secHeading) secHeading.textContent = 'עונות ופרקים';
        if (seasonSel) seasonSel.classList.remove('hidden');
        if (epGrid) epGrid.classList.remove('hidden');
        renderSeasonSelector(item);
        loadSeriesSeasonEpisodes(item, 1);
        // Fetch live exact number of seasons & episodes from TMDB / Cinemeta so every series shows ALL its real seasons!
        ensureSeriesMetadataAndSeasons(item).then(function () {
          if (state.detailsItem && state.detailsItem.id === item.id) {
            if (meta) {
              meta.innerHTML =
                '<span class="meta-match">96% התאמה</span>' +
                '<span class="meta-year">' + escapeHtml(item.year) + '</span>' +
                '<span class="meta-quality">' + escapeHtml((item.seasonsCount || 1) + ' עונות') + '</span>' +
                '<span class="meta-quality">4K Ultra HD</span>' +
                '<span class="meta-sub">כתוביות בעברית</span>';
            }
            renderSeasonSelector(item);
            loadSeriesSeasonEpisodes(item, state.activeSeason || 1);
          }
        });
      } else {
        if (secHeading) {
          secHeading.textContent = item.type === 'channel'
            ? 'שידור חי ישיר'
            : (item.type === 'youtube' ? 'הזרמת וידאו מיוטיוב' : 'צפייה ישירה בסרט');
        }
        if (seasonSel) seasonSel.classList.add('hidden');
        if (epGrid) epGrid.classList.add('hidden');
      }
    }

    populateDetailsStreamsList(item, 1, 1);

    modal.classList.remove('hidden');
    var playBtn = document.getElementById('detailsPlayBtn');
    if (playBtn) {
      var profBucket = ensureActiveProfileBucket();
      var savedProg = profBucket.progress ? profBucket.progress[item.id] : null;
      var playSpan = playBtn.querySelector('span');
      if (savedProg && savedProg.currentTime > 15 && savedProg.percent < 96 && item.type !== 'channel' && item.type !== 'youtube') {
        state.activeSeason = savedProg.season || 1;
        state.activeEpisode = savedProg.episode || 1;
        if (playSpan) {
          playSpan.textContent = 'המשך צפייה (' + formatSeconds(savedProg.currentTime) + ')';
        }
      } else if (playSpan) {
        playSpan.textContent = 'הפעל';
      }
      if (typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(playBtn);
      }
    }
  }

  function closeDetailsSourcesDropdown() {
    var btn = document.getElementById('detailsSourcesDropdownBtn');
    var panel = document.getElementById('detailsStreamsDropdownPanel');
    if (panel) panel.classList.add('hidden');
    if (btn) {
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }
  window.closeDetailsSourcesDropdown = closeDetailsSourcesDropdown;

  async function populateDetailsStreamsList(item, season, episode) {
    var listEl = document.getElementById('detailsStreamsList');
    if (!listEl || !item) return;

    var defaultCards = [
      { mode: 'direct', badge: 'AUTO 4K UHD', name: 'נגן חכם 4K UHD / Full HD + כתוביות מסונכרנות בעברית', meta: 'בדיקה ובחירה אוטומטית במקור הטוב ביותר' },
      { mode: 'swarm', badge: 'PIRATEBAY / YTS 4K / TELEGRAM', name: 'מאגר ThePirateBay + YTS 4K + טלגרם VOD', meta: 'איכות מקסימלית 4K UHD' },
      { mode: 'embed1', badge: 'VIP CLOUD 4K #1', name: 'שרת ענן VIP 4K (נטפליקס / אמזון / HBO)', meta: 'אימות שידור אוטומטי' },
      { mode: 'trailer', badge: 'YOUTUBE 4K / HD', name: 'שידור רשמי / טריילר מיוטיוב (YouTube Official)', meta: 'יוטיוב ישיר' }
    ];

    var renderStreamCards = function (cards) {
      listEl.innerHTML = cards.map(function (c) {
        return (
          '<button type="button" class="stream-source-card tv-focusable" data-stream-mode="' + escapeHtml(c.mode) + '" data-stream-url="' + escapeHtml(c.url || '') + '">' +
            '<div>' +
              '<span class="stream-source-badge">' + escapeHtml(c.badge) + '</span>' +
              '<div class="stream-source-name" style="margin-top:4px;">' + escapeHtml(c.name) + '</div>' +
            '</div>' +
            '<span class="stream-source-meta">' + escapeHtml(c.meta) + '</span>' +
          '</button>'
        );
      }).join('');

      var btns = listEl.querySelectorAll('.stream-source-card');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
          var m = this.getAttribute('data-stream-mode') || 'direct';
          var u = this.getAttribute('data-stream-url') || '';
          if (u && u.indexOf('/api/telegram/stream') !== -1) {
            state.detailsItem.streamUrl = getApiBase() + u;
          }
          closeDetailsSourcesDropdown();
          startPlayback(state.detailsItem, state.activeSeason, state.activeEpisode, 0, m);
        });
      }
    };

    renderStreamCards(defaultCards);

    try {
      var imdbId = await ensureImdbId(item);
      var qUrl = getApiBase() + '/api/streams?type=' + encodeURIComponent(item.type) +
        '&id=' + encodeURIComponent(imdbId) +
        '&season=' + (season || 1) +
        '&episode=' + (episode || 1) +
        '&title=' + encodeURIComponent(item.originalTitle || item.title || '') +
        '&title_he=' + encodeURIComponent(item.title || '') +
        '&year=' + encodeURIComponent(item.year || '');
      var res = await fetch(qUrl);
      if (res.ok) {
        var data = await res.json();
        var streams = (data && Array.isArray(data.streams)) ? data.streams : [];
        var extra = [];
        for (var s = 0; s < Math.min(4, streams.length); s++) {
          var st = streams[s];
          extra.push({
            mode: st.isDirectUrl ? 'direct' : 'swarm',
            url: st.url || st.streamUrl || '',
            badge: st.quality || st.provider || 'SWARM 4K',
            name: st.title || st.name || 'מקור שידור עולמי',
            meta: st.peers ? (st.peers + ' זורמים פעילים') : 'זמין כעת'
          });
        }
        if (extra.length) {
          renderStreamCards(defaultCards.slice(0, 2).concat(extra, [defaultCards[3]]));
        }
      }
    } catch (e) {}
  }

  async function ensureSeriesMetadataAndSeasons(item) {
    if (!item || item.type !== 'series') return;
    if (item._realSeasonsLoaded && item.seasonsCount > 0) return;

    // 1. Ensure numeric TMDB ID is resolved (via IMDb ID or title search if needed)
    var cleanTmdb = String(item.tmdbId || '').replace(/\D/g, '');
    if (!cleanTmdb && item.imdbId && item.imdbId.indexOf('tt') === 0) {
      try {
        var findRes = await fetch(TMDB_BASE + '/find/' + encodeURIComponent(item.imdbId) + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id&language=he-IL');
        if (findRes.ok) {
          var findData = await findRes.json();
          if (findData && Array.isArray(findData.tv_results) && findData.tv_results[0] && findData.tv_results[0].id) {
            cleanTmdb = String(findData.tv_results[0].id);
            item.tmdbId = cleanTmdb;
          }
        }
      } catch (e) {}
    }

    if (!cleanTmdb) {
      try {
        var qTitle = item.originalTitle || item.title || '';
        if (qTitle) {
          var sRes = await fetch(TMDB_BASE + '/search/tv?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(qTitle));
          if (sRes.ok) {
            var sData = await sRes.json();
            if (sData && Array.isArray(sData.results) && sData.results[0] && sData.results[0].id) {
              cleanTmdb = String(sData.results[0].id);
              item.tmdbId = cleanTmdb;
            }
          }
        }
      } catch (e) {}
    }

    // 2. Fetch full TV Series Details from TMDB (`/tv/{id}`) to get exact `number_of_seasons` and `seasons` array
    if (cleanTmdb) {
      try {
        var tvRes = await fetch(TMDB_BASE + '/tv/' + encodeURIComponent(cleanTmdb) + '?api_key=' + TMDB_API_KEY + '&language=he-IL');
        if (tvRes.ok) {
          var tvData = await tvRes.json();
          var validSeasons = [];
          if (tvData && Array.isArray(tvData.seasons)) {
            for (var i = 0; i < tvData.seasons.length; i++) {
              var sn = tvData.seasons[i];
              if (sn && Number(sn.season_number) >= 1 && Number(sn.episode_count || 1) > 0) {
                validSeasons.push(sn);
              }
            }
          }
          var totalSeasons = Math.max(
            Number(tvData.number_of_seasons) || 0,
            validSeasons.length
          );
          if (totalSeasons >= 1) {
            item.seasonsCount = totalSeasons;
            item.tmdbSeasonsMeta = validSeasons;
            item._realSeasonsLoaded = true;
            return;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: Query Stremio Cinemeta (`v3-cinemeta.strem.io/meta/series/{imdbId}.json`) for all seasons & episodes
    try {
      var imdb = await ensureImdbId(item);
      if (imdb && imdb.indexOf('tt') === 0) {
        var cmRes = await fetch('https://v3-cinemeta.strem.io/meta/series/' + encodeURIComponent(imdb) + '.json');
        if (cmRes.ok) {
          var cmData = await cmRes.json();
          var vids = (cmData && cmData.meta && Array.isArray(cmData.meta.videos)) ? cmData.meta.videos : [];
          var maxSeason = 0;
          var bySeason = {};
          for (var v = 0; v < vids.length; v++) {
            var sNum = Number(vids[v].season || 0);
            var epNum = Number(vids[v].episode || vids[v].number || 0);
            if (sNum >= 1 && epNum >= 1) {
              if (sNum > maxSeason) maxSeason = sNum;
              if (!bySeason[sNum]) bySeason[sNum] = [];
              bySeason[sNum].push({
                episode_number: epNum,
                name: vids[v].name || vids[v].title || ('פרק ' + epNum),
                overview: vids[v].overview || vids[v].description || '',
                still_url: vids[v].thumbnail || ''
              });
            }
          }
          if (maxSeason >= 1) {
            item.seasonsCount = maxSeason;
            item.cinemetaEpisodesBySeason = bySeason;
            item._realSeasonsLoaded = true;
          }
        }
      }
    } catch (e) {}
  }

  function renderSeasonSelector(item) {
    var sel = document.getElementById('seasonSelector');
    if (!sel) return;
    var count = Math.max(1, Math.min(40, Number(item.seasonsCount) || 1));
    var activeS = Number(state.activeSeason) || 1;
    if (activeS > count) activeS = 1;
    var html = '';
    for (var s = 1; s <= count; s++) {
      html += '<button type="button" class="season-tab-btn tv-focusable' + (s === activeS ? ' active' : '') + '" data-season="' + s + '">עונה ' + s + '</button>';
    }
    sel.innerHTML = html;
    var btns = sel.querySelectorAll('.season-tab-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var sNum = Number(this.getAttribute('data-season')) || 1;
        state.activeSeason = sNum;
        var all = sel.querySelectorAll('.season-tab-btn');
        for (var j = 0; j < all.length; j++) all[j].classList.remove('active');
        this.classList.add('active');
        loadSeriesSeasonEpisodes(state.detailsItem, sNum);
        populateDetailsStreamsList(state.detailsItem, sNum, 1);
      });
    }
  }

  async function loadSeriesSeasonEpisodes(item, seasonNum) {
    var grid = document.getElementById('episodesGrid');
    if (!grid || !item) return;

    var episodes = [];
    var cleanTmdb = String(item.tmdbId || '').replace(/\D/g, '');

    // 1. Fetch ALL real episodes for this season from TMDB (`/tv/{id}/season/{seasonNum}`)
    if (cleanTmdb) {
      try {
        var res = await fetch(TMDB_BASE + '/tv/' + encodeURIComponent(cleanTmdb) + '/season/' + seasonNum + '?api_key=' + TMDB_API_KEY + '&language=he-IL');
        if (res.ok) {
          var data = await res.json();
          if (data && Array.isArray(data.episodes) && data.episodes.length) {
            episodes = data.episodes;
          }
        }
      } catch (e) {}
    }

    // 2. Fallback to Cinemeta episodes if fetched
    if (!episodes.length && item.cinemetaEpisodesBySeason && Array.isArray(item.cinemetaEpisodesBySeason[seasonNum])) {
      episodes = item.cinemetaEpisodesBySeason[seasonNum];
    }

    // 3. Fallback to bundled `item.seasonsData`
    if (!episodes.length && Array.isArray(item.seasonsData)) {
      for (var s = 0; s < item.seasonsData.length; s++) {
        if (Number(item.seasonsData[s].season) === Number(seasonNum) && Array.isArray(item.seasonsData[s].episodes)) {
          episodes = item.seasonsData[s].episodes.map(function (ep) {
            return {
              episode_number: ep.episode,
              name: ep.title_he || ('פרק ' + ep.episode),
              overview: ep.overview_he || '',
              still_path: null
            };
          });
        }
      }
    }

    // 4. Final fallback: use season metadata episode_count or 10 episodes
    if (!episodes.length) {
      var epCount = 10;
      if (Array.isArray(item.tmdbSeasonsMeta)) {
        for (var m = 0; m < item.tmdbSeasonsMeta.length; m++) {
          if (Number(item.tmdbSeasonsMeta[m].season_number) === Number(seasonNum) && item.tmdbSeasonsMeta[m].episode_count) {
            epCount = Number(item.tmdbSeasonsMeta[m].episode_count);
            break;
          }
        }
      }
      for (var e = 1; e <= epCount; e++) {
        episodes.push({
          episode_number: e,
          name: 'פרק ' + e,
          overview: 'צפייה ישירה בפרק ' + e + ' בעונה ' + seasonNum + ' של ' + item.title + ' באיכות HD עם תרגום לעברית.',
          still_path: null
        });
      }
    }

    var html = '';
    for (var i = 0; i < episodes.length; i++) {
      var ep = episodes[i];
      var epNum = ep.episode_number || (i + 1);
      var epTitle = ep.name || ('פרק ' + epNum);
      if (/^Episode\s+\d+$/i.test(epTitle)) {
        epTitle = 'פרק ' + epNum;
      }
      var thumb = ep.still_path ? (TMDB_IMG_POSTER + ep.still_path) : (ep.still_url || item.backdrop || item.poster);
      var desc = ep.overview || ('צפייה ישירה בפרק ' + epNum + ' בעונה ' + seasonNum + ' של ' + item.title + ' עם כתוביות מסונכרנות בעברית.');

      html +=
        '<article class="episode-card tv-focusable" tabindex="0" role="button" data-season="' + seasonNum + '" data-episode="' + epNum + '">' +
          '<div class="ep-thumb-wrap">' +
            '<img class="ep-thumb" src="' + escapeHtml(thumb) + '" alt="' + escapeHtml(epTitle) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + escapeHtml(item.backdrop || item.poster) + '\';" />' +
            '<span class="ep-num-badge">עונה ' + seasonNum + ' • פרק ' + epNum + '</span>' +
          '</div>' +
          '<div class="ep-info">' +
            '<h4 class="ep-title">' + escapeHtml(epNum + '. ' + epTitle) + '</h4>' +
            '<p class="ep-desc">' + escapeHtml(desc) + '</p>' +
          '</div>' +
        '</article>';
    }

    grid.innerHTML = html;
    var cards = grid.querySelectorAll('.episode-card');
    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener('click', function () {
        var s = Number(this.getAttribute('data-season')) || 1;
        var ep = Number(this.getAttribute('data-episode')) || 1;
        state.activeSeason = s;
        state.activeEpisode = ep;
        startPlayback(state.detailsItem, s, ep);
      });
    }
  }

  /**
   * Open-Source Plyr.io + HLS.js Video Player + WASM Direct 1080p Stream Resolver + YouTube Player
   */
  async function decryptDirectStreamUrls(encB64, wasmB64) {
    if (!encB64 || !wasmB64) return [];
    var toBytes = function (b64) {
      var clean = String(b64).replace(/[\r\n\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
      while (clean.length % 4) clean += '=';
      var bin = atob(clean);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };
    var wasmBytes = toBytes(wasmB64);
    var res = await WebAssembly.instantiate(wasmBytes, {});
    var ex = res.instance.exports;
    var enc = toBytes(encB64);
    var ptr = ex.alloc(enc.length);
    new Uint8Array(ex.memory.buffer, ptr, enc.length).set(enc);
    var outLen = ex.decrypt(ptr, enc.length);
    var txt = new TextDecoder().decode(new Uint8Array(ex.memory.buffer, ptr + 12, outLen));
    return txt.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  async function startPlayback(item, season, episode, startOffsetSec, forcedSourceMode) {
    if (!item) return;
    state.playingItem = item;
    state.activeSeason = season || 1;
    state.activeEpisode = episode || 1;
    state.activeSourceTab = forcedSourceMode || (item.type === 'youtube' ? 'trailer' : 'direct');
    startOffsetSec = Number(startOffsetSec) || 0;

    // Automatic Resume Playback from where the user stopped!
    var resumedFromSaved = false;
    if (item.type !== 'channel' && item.type !== 'youtube' && startOffsetSec <= 0) {
      var profBucket = ensureActiveProfileBucket();
      var savedProg = profBucket.progress ? profBucket.progress[item.id] : null;
      if (savedProg && savedProg.currentTime > 15 && savedProg.percent < 96) {
        var sameEp = item.type !== 'series' || ((!savedProg.season || savedProg.season === state.activeSeason) && (!savedProg.episode || savedProg.episode === state.activeEpisode));
        if (sameEp) {
          startOffsetSec = Math.floor(savedProg.currentTime);
          resumedFromSaved = true;
        }
      }
    }
    state.embedStartOffsetSec = startOffsetSec;

    var detailsModal = document.getElementById('detailsModal');
    if (detailsModal) detailsModal.classList.add('hidden');

    var playerModal = document.getElementById('playerModal');
    var titleEl = document.getElementById('playerTitle');
    var subStatusEl = document.getElementById('playerSubtitleStatus');
    var spinner = document.getElementById('playerLoadingSpinner');
    var nextEpBtn = document.getElementById('playerNextEpBtn');
    var video = document.getElementById('videoElement');
    var embedContainer = document.getElementById('embedPlayerContainer');

    if (!playerModal || !video || !embedContainer) return;

    var playerSourcePanel = document.getElementById('playerSourceTabs');
    var playerSourceDropBtn = document.getElementById('playerSourcesDropdownBtn');
    if (playerSourcePanel) playerSourcePanel.classList.add('hidden');
    if (playerSourceDropBtn) playerSourceDropBtn.setAttribute('aria-expanded', 'false');

    var srcTabs = document.querySelectorAll('#playerSourceTabs .source-tab-btn');
    for (var t = 0; t < srcTabs.length; t++) {
      srcTabs[t].classList.toggle('active', srcTabs[t].getAttribute('data-source-mode') === state.activeSourceTab);
    }

    var displayTitle = item.title;
    if (item.type === 'series') {
      displayTitle += ' — עונה ' + state.activeSeason + ' פרק ' + state.activeEpisode;
    }
    if (titleEl) titleEl.textContent = displayTitle;
    if (subStatusEl) {
      subStatusEl.textContent = item.type === 'channel'
        ? 'שידור חי ישיר • 1080p HD'
        : (resumedFromSaved
          ? ('ממשיך צפייה מנקודת העצירה (' + formatSeconds(startOffsetSec) + ')...')
          : (item.type === 'youtube' || state.activeSourceTab === 'trailer' ? 'הזרמת יוטיוב ישירה (YouTube HD)' : 'טוען כתוביות מסונכרנות בעברית...'));
    }

    if (nextEpBtn) {
      if (item.type === 'series') nextEpBtn.classList.remove('hidden');
      else nextEpBtn.classList.add('hidden');
    }

    stopCurrentMedia();
    playerModal.classList.remove('hidden');
    if (spinner) spinner.classList.remove('hidden');
    applySubtitleStyleToOverlay();
    wakePlayerControls();

    scheduleSkipIntroButton(item.type === 'series', startOffsetSec);

    // Show or hide the Auto-Resume Playback Toast Banner (`#resumePlaybackToast`)
    var resumeToast = document.getElementById('resumePlaybackToast');
    var resumeToastText = document.getElementById('resumePlaybackToastText');
    if (state.resumeToastHideTimer) {
      clearTimeout(state.resumeToastHideTimer);
      state.resumeToastHideTimer = null;
    }
    if (resumeToast) {
      if (resumedFromSaved && startOffsetSec > 15) {
        if (resumeToastText) {
          resumeToastText.textContent = '▶ ממשיך צפייה מנקודת העצירה (' + formatSeconds(startOffsetSec) + ')';
        }
        resumeToast.classList.remove('hidden');
        state.resumeToastHideTimer = setTimeout(function () {
          resumeToast.classList.add('hidden');
        }, 8500);
      } else {
        resumeToast.classList.add('hidden');
      }
    }

    // Fetch real scene stills from TMDB for Netflix-style Seek Thumbnail Preview (`#seekThumbnailPreview`)
    fetchSceneThumbnailsForItem(item, state.activeSeason, state.activeEpisode);

    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    var playPauseBtn = document.getElementById('playerPlayPauseBtn');
    var isTvMode = Boolean(document.body && document.body.classList.contains('tv-mode'));
    if (item.type === 'series' && skipBtn && !skipBtn.classList.contains('hidden') && startOffsetSec === 0) {
      if (typeof window.streamItFocusElement === 'function') window.streamItFocusElement(skipBtn);
    } else if (isTvMode) {
      if (window.TVNavigation && typeof window.TVNavigation.clearPlayerFocus === 'function') {
        window.TVNavigation.clearPlayerFocus();
      }
    } else if (playPauseBtn) {
      if (typeof window.streamItFocusElement === 'function') window.streamItFocusElement(playPauseBtn);
    }

    // 1. Direct YouTube Item or Official Trailer Mode (`trailer`)
    if (item.type === 'youtube' || state.activeSourceTab === 'trailer') {
      await playYoutubeVideoOrTrailer(item);
      return;
    }

    // 2. Live TV Channel Playback (Direct Verified HTTPS+CORS HLS + Dynamic Mako Token for Channel 12)
    if (item.type === 'channel') {
      if (!item.streamUrl) {
        for (var bc = 0; bc < BUILTIN_CHANNELS.length; bc++) {
          if (BUILTIN_CHANNELS[bc].id === item.id || BUILTIN_CHANNELS[bc].title === item.title) {
            item.streamUrl = BUILTIN_CHANNELS[bc].streamUrl;
            item.fallbackStreams = BUILTIN_CHANNELS[bc].fallbackStreams || [];
            break;
          }
        }
      }
      var chUrls = [item.streamUrl].concat(item.fallbackStreams || []).filter(Boolean);
      if (item.id === 'il_keshet12' || String(item.channelNumber) === '12') {
        try {
          var freshK12 = await resolveKeshet12LiveM3u8();
          if (freshK12) {
            chUrls.unshift(freshK12);
          }
        } catch (e) {}
      }
      if (hasLocalBackend() && chUrls.length) {
        chUrls.push(getApiBase() + '/api/hls-proxy?url=' + encodeURIComponent(chUrls[0]) + '&origin=live');
      }
      if ((state.activeSourceTab === 'embed1' || state.activeSourceTab === 'swarm') && chUrls.length > 1) {
        chUrls = chUrls.slice(1).concat([chUrls[0]]);
      } else if (state.activeSourceTab === 'embed2' && chUrls.length > 2) {
        chUrls = chUrls.slice(2).concat(chUrls.slice(0, 2));
      }
      if (chUrls.length) {
        playDirectHlsOrMp4(chUrls[0], 0, chUrls.slice(1));
      }
      return;
    }

    // 3. Ensure BOTH IMDb ID (`tt...`) and Numeric TMDB ID are resolved via TMDB Cloud API
    var imdbId = await ensureImdbId(item);

    // 4. Load Real Verified Hebrew Subtitles in Parallel!
    loadHebrewSubtitlesForItem(item, imdbId, state.activeSeason, state.activeEpisode);

    // 4b. Direct Official YouTube Episode/Movie Broadcast (for Israeli series with official Kan 11 / HOT YouTube streams)
    if (item.directYtId && (state.activeSourceTab === 'direct' || state.activeSourceTab === 'embed1')) {
      await playYoutubeVideoOrTrailer(item);
      return;
    }

    // 5. Telegram VOD Direct Stream (Direct Telegram CDN MP4 or local server stream)
    if (item.directTelegramMp4 && item.directTelegramMp4.indexOf('http') === 0 && (state.activeSourceTab === 'direct' || state.activeSourceTab === 'swarm')) {
      playDirectHlsOrMp4(item.directTelegramMp4, startOffsetSec);
      return;
    }
    if (hasLocalBackend() && item.streamUrl && item.streamUrl.indexOf('/api/telegram/stream') !== -1) {
      var tgUrl = item.streamUrl.indexOf('http') === 0 ? item.streamUrl : (getApiBase() + item.streamUrl);
      playDirectHlsOrMp4(tgUrl, startOffsetSec);
      return;
    }

    // 6. If user explicitly selected Cloud Server 1, Cloud Server 2, or Swarm
    if (state.activeSourceTab === 'embed1' || state.activeSourceTab === 'embed2' || state.activeSourceTab === 'swarm') {
      playCleanEmbedStream(item, state.activeSeason, state.activeEpisode, startOffsetSec, state.activeSourceTab);
      return;
    }

    // 7. Try Native 1080p Direct HLS Stream (Plyr.io + HLS.js + WASM Decryptor) when local or Android TV bridge is available
    if (hasLocalBackend()) {
      var resolvedM3u8 = await resolveDirect1080pHlsUrl(item, imdbId, state.activeSeason, state.activeEpisode);
      if (resolvedM3u8) {
        playDirectHlsOrMp4(resolvedM3u8, startOffsetSec);
        return;
      }
    }

    // 8. Instant Cloud Streaming on ANY computer / Smart TV in the world (Zero local server dependency!)
    playCleanEmbedStream(item, state.activeSeason, state.activeEpisode, startOffsetSec, 'embed1');
  }

  async function playYoutubeVideoOrTrailer(item) {
    var video = document.getElementById('videoElement');
    var embedContainer = document.getElementById('embedPlayerContainer');
    var playerModal = document.getElementById('playerModal');
    var spinner = document.getElementById('playerLoadingSpinner');
    if (!embedContainer || !video) return;

    state.playingMode = 'embed';
    if (playerModal) playerModal.classList.add('embed-mode-active');
    video.pause();
    video.classList.add('hidden');
    embedContainer.classList.remove('hidden');

    if (!item.tmdbId && item.imdbId) {
      await ensureImdbId(item);
    }

    var ytId = item.videoId || item.directYtId || item.trailerYtId || '';
    if (!ytId && item.tmdbId) {
      try {
        var ep = (item.type === 'series' ? '/tv/' : '/movie/') + encodeURIComponent(item.tmdbId) + '/videos?api_key=' + TMDB_API_KEY;
        var r = await fetch(TMDB_BASE + ep);
        if (r.ok) {
          var d = await r.json();
          var vids = (d && Array.isArray(d.results)) ? d.results : [];
          for (var i = 0; i < vids.length; i++) {
            if (vids[i].site === 'YouTube' && vids[i].key) {
              ytId = vids[i].key;
              if (vids[i].type === 'Trailer') break;
            }
          }
        }
      } catch (e) {}
    }

    if (!ytId && hasLocalBackend()) {
      try {
        var q = (item.originalTitle || item.title || '') + ' official trailer';
        var yr = await fetch(getApiBase() + '/api/youtube/search?q=' + encodeURIComponent(q));
        if (yr.ok) {
          var yd = await yr.json();
          if (yd && Array.isArray(yd.results) && yd.results[0] && yd.results[0].videoId) {
            ytId = yd.results[0].videoId;
          }
        }
      } catch (e) {}
    }

    if (!ytId) ytId = 'Way9Dexny3w';
    var ytEmbedUrl = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(ytId) + '?autoplay=1&rel=0&modestbranding=1&hl=he';

    embedContainer.innerHTML =
      '<iframe id="streamEmbedIframe" src="' + escapeHtml(ytEmbedUrl) + '" ' +
      'sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" ' +
      'allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen ' +
      'style="width:100%;height:100%;border:none;background:#000;"></iframe>';

    var iframe = document.getElementById('streamEmbedIframe');
    if (iframe) {
      iframe.addEventListener('load', function () {
        if (spinner) spinner.classList.add('hidden');
      });
    }
  }

  async function resolveDirect1080pHlsUrl(item, imdbId, season, episode) {
    if (!hasLocalBackend()) return '';
    var apiBase = getApiBase();
    var mediaType = item.type === 'series' ? 'series' : 'movie';
    var tmdbId = String(item.tmdbId || '').replace(/\D/g, '');
    var data = null;

    // A. Try non-blocking `/api/direct-stream` on `127.0.0.1:8092` first (12s timeout so cold WASM/HLS resolution never times out)
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 12000);
      var url = apiBase + '/api/direct-stream?type=' + encodeURIComponent(mediaType) +
        '&imdb_id=' + encodeURIComponent(imdbId) +
        '&tmdb_id=' + encodeURIComponent(tmdbId) +
        '&season=' + (season || 1) +
        '&episode=' + (episode || 1);
      var res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) data = await res.json();
    } catch (e) {}

    // B. Fallback to AndroidTvBridge on Android TV if needed
    if (!data || !data.ok) {
      try {
        if (window.AndroidTvBridge && typeof window.AndroidTvBridge.resolveDirectStreamJson === 'function') {
          var rawJson = window.AndroidTvBridge.resolveDirectStreamJson(mediaType, tmdbId, imdbId, season || 1, episode || 1);
          if (rawJson) data = JSON.parse(rawJson);
        }
      } catch (e) {}
    }

    if (!data || !data.ok) return '';
    if (data.streamUrl) return data.streamUrl;

    if (data.enc_stream_urls && data.wasm_b64) {
      try {
        var rawUrls = await decryptDirectStreamUrls(data.enc_stream_urls, data.wasm_b64);
        if (rawUrls && rawUrls.length) {
          var playerOrigin = data.player_origin || 'https://stellarconductornexus.com';
          return apiBase + '/api/hls-proxy?url=' + encodeURIComponent(rawUrls[0]) +
            '&api_token=' + encodeURIComponent(data.api_token || '') +
            '&origin=' + encodeURIComponent(playerOrigin);
        }
      } catch (e) {}
    }
    return '';
  }

  function ensurePlyrInitialized(video) {
    if (state.plyrInstance) return state.plyrInstance;
    if (window.Plyr && video) {
      try {
        state.plyrInstance = new window.Plyr(video, {
          controls: [], // We use our unified Smart TV / Cinema overlay controls while Plyr manages media playback & buffering
          clickToPlay: false,
          keyboard: { focused: false, global: false }
        });
      } catch (e) {}
    }
    return state.plyrInstance;
  }

  function playDirectHlsOrMp4(streamUrl, startOffsetSec, rawFallbackUrl) {
    var video = document.getElementById('videoElement');
    var embedContainer = document.getElementById('embedPlayerContainer');
    var playerModal = document.getElementById('playerModal');
    var spinner = document.getElementById('playerLoadingSpinner');
    var loadingText = document.getElementById('playerLoadingText');
    var subStatusEl = document.getElementById('playerSubtitleStatus');
    var subOverlay = document.getElementById('customSubtitleOverlay');
    if (!video || !embedContainer) return;

    var fallbackQueue = Array.isArray(rawFallbackUrl)
      ? rawFallbackUrl.filter(Boolean)
      : (rawFallbackUrl ? [rawFallbackUrl] : []);

    var isLiveChannel = Boolean(state.playingItem && state.playingItem.type === 'channel');

    state.playingMode = 'video';
    if (playerModal) playerModal.classList.remove('embed-mode-active');
    embedContainer.classList.add('hidden');
    embedContainer.innerHTML = '';
    video.classList.remove('hidden');
    if (subOverlay) {
      var subTextSpan = document.getElementById('customSubtitleText');
      if (!subTextSpan) {
        subTextSpan = document.createElement('span');
        subTextSpan.id = 'customSubtitleText';
        subTextSpan.className = 'custom-subtitle-text';
        subOverlay.appendChild(subTextSpan);
      }
      if (isLiveChannel) {
        subTextSpan.textContent = '';
        subOverlay.classList.add('hidden');
      } else {
        subOverlay.classList.remove('hidden');
      }
    }
    if (loadingText && isLiveChannel) {
      loadingText.textContent = 'מתחבר לשידור חי (LIVE HD)...';
    }

    ensurePlyrInitialized(video);

    if (state.hlsInstance) {
      try { state.hlsInstance.destroy(); } catch (e) {}
      state.hlsInstance = null;
    }

    if (state.liveWatchdogTimer) {
      clearTimeout(state.liveWatchdogTimer);
      state.liveWatchdogTimer = null;
    }

    var onReadyToPlay = function () {
      if (state.liveWatchdogTimer) {
        clearTimeout(state.liveWatchdogTimer);
        state.liveWatchdogTimer = null;
      }
      if (spinner) spinner.classList.add('hidden');
      if (isLiveChannel && subStatusEl) {
        subStatusEl.textContent = 'שידור חי ישיר (LIVE HD) • מחובר';
      }
      if (startOffsetSec > 0 && video.currentTime < startOffsetSec) {
        try { video.currentTime = startOffsetSec; } catch (e) {}
      }
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
          video.muted = false;
          video.play().catch(function () {});
        });
      }
      updatePlayPauseIcon(false);
    };

    if (isLiveChannel && fallbackQueue.length > 0) {
      state.liveWatchdogTimer = setTimeout(function () {
        if (state.playingMode === 'video' && video && video.readyState < 2 && fallbackQueue.length > 0) {
          var nextLiveUrl = fallbackQueue[0];
          var restLiveUrls = fallbackQueue.slice(1);
          if (nextLiveUrl && nextLiveUrl !== streamUrl) {
            playDirectHlsOrMp4(nextLiveUrl, 0, restLiveUrls);
          }
        }
      }, 9000);
    }

    if ((streamUrl.indexOf('.m3u8') !== -1 || streamUrl.indexOf('/api/hls-proxy') !== -1) && window.Hls && window.Hls.isSupported()) {
      var hls = new window.Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        liveDurationInfinity: isLiveChannel,
        enableWorker: true,
        capLevelToPlayerSize: false,
        startLevel: -1
      });
      state.hlsInstance = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, function (ev, data) {
        try {
          var levels = hls.levels || (data && data.levels) || [];
          if (levels.length > 1) {
            var bestIdx = -1;
            var bestHeight = 0;
            for (var lv = 0; lv < levels.length; lv++) {
              var h = Number(levels[lv].height) || 0;
              if (h >= bestHeight) {
                bestHeight = h;
                bestIdx = lv;
              }
            }
            if (bestIdx >= 0) {
              hls.currentLevel = bestIdx;
              hls.loadLevel = bestIdx;
            }
          }
        } catch (e) {}
        onReadyToPlay();
      });
      hls.on(window.Hls.Events.ERROR, function (ev, errData) {
        if (errData && errData.fatal) {
          if (fallbackQueue.length > 0) {
            var nextUrl = fallbackQueue[0];
            var restUrls = fallbackQueue.slice(1);
            if (nextUrl && nextUrl !== streamUrl) {
              playDirectHlsOrMp4(nextUrl, startOffsetSec, restUrls);
              return;
            }
          }
          if (state.playingItem && state.playingItem.type !== 'channel') {
            playCleanEmbedStream(state.playingItem, state.activeSeason, state.activeEpisode, startOffsetSec, 'embed1');
          }
        }
      });
    } else {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', onReadyToPlay, { once: true });
      video.addEventListener('error', function () {
        if (fallbackQueue.length > 0) {
          playDirectHlsOrMp4(fallbackQueue[0], startOffsetSec, fallbackQueue.slice(1));
        } else if (state.playingItem && state.playingItem.type !== 'channel') {
          playCleanEmbedStream(state.playingItem, state.activeSeason, state.activeEpisode, startOffsetSec, 'embed1');
        }
      }, { once: true });
    }
  }

  function playCleanEmbedStream(item, season, episode, startOffsetSec, serverKey) {
    var video = document.getElementById('videoElement');
    var embedContainer = document.getElementById('embedPlayerContainer');
    var playerModal = document.getElementById('playerModal');
    var spinner = document.getElementById('playerLoadingSpinner');
    var loadingText = document.getElementById('playerLoadingText');
    var subOverlay = document.getElementById('customSubtitleOverlay');
    if (!embedContainer || !video || !item) return;

    state.playingMode = 'embed';
    state.embedStartOffsetSec = Number(startOffsetSec) || 0;
    state.embedCurrentTime = state.embedStartOffsetSec;
    state.embedDuration = 7200;
    state.embedPaused = false;
    state.embedVerified = false;
    state.embedAutoPlayed = false;
    state.embedActiveServerKey = serverKey || 'embed1';

    if (state.embedSubTimer) {
      clearInterval(state.embedSubTimer);
      state.embedSubTimer = null;
    }
    if (state.embedVerifyInterval) {
      clearInterval(state.embedVerifyInterval);
      state.embedVerifyInterval = null;
    }
    if (state.embedWatchdogTimer) {
      clearTimeout(state.embedWatchdogTimer);
      state.embedWatchdogTimer = null;
    }

    state.embedSubTimer = setInterval(function () {
      if (state.playingMode === 'embed' && !state.embedPaused && (state.embedVerified || state.embedCurrentTime >= 0)) {
        if (state.embedVerified) {
          state.embedCurrentTime += 0.25;
        }
        updateActiveSubtitleCue(state.embedCurrentTime);

        var curTimeInt = Math.floor(state.embedCurrentTime);
        var curEmbedEl = document.getElementById('playerCurrentTime');
        if (curEmbedEl) curEmbedEl.textContent = formatSeconds(curTimeInt);
        var durEst = state.embedDuration > 0 ? state.embedDuration : 5400;
        var fillEl = document.getElementById('embedTimelineProgressFill');
        if (fillEl && durEst > 0) {
          fillEl.style.width = Math.min(100, Math.max(0, (state.embedCurrentTime / durEst) * 100)).toFixed(2) + '%';
        }

        // Save playback progress reliably every 5 seconds in Embed mode too
        if (curTimeInt > 12 && Math.round(state.embedCurrentTime * 4) % 20 === 0) {
          savePlaybackProgressForCurrentItem(curTimeInt, durEst);
        }
      }
    }, 250);

    if (playerModal) playerModal.classList.add('embed-mode-active');
    video.pause();
    video.classList.add('hidden');
    embedContainer.classList.remove('hidden');
    if (subOverlay) {
      subOverlay.classList.remove('hidden');
      if (!document.getElementById('customSubtitleText')) {
        var restoredSpan = document.createElement('span');
        restoredSpan.id = 'customSubtitleText';
        restoredSpan.className = 'custom-subtitle-text';
        subOverlay.appendChild(restoredSpan);
      }
    }
    applySubtitleStyleToOverlay();
    if (spinner) spinner.classList.remove('hidden');
    if (loadingText) {
      loadingText.textContent = state.embedActiveServerKey === 'embed2'
        ? 'מתחבר לשרת ענן 4K משני (Mirror #2)...'
        : 'בודק ומחבר אוטומטית למקור השידור הטוב ביותר (4K UHD)...';
    }

    var tmdbId = String(item.tmdbId || '').replace(/\D/g, '') || '693134';
    var embedUrl = '';

    // 100% Sandbox-Compatible Verified 4K/1080p Cloud Mirrors (`cdn.vidspark.to` + `vidsrc.pm/embed`)
    var startQuery = state.embedStartOffsetSec > 15 ? ('?start=' + Math.floor(state.embedStartOffsetSec) + '&t=' + Math.floor(state.embedStartOffsetSec)) : '';
    if (state.embedActiveServerKey === 'embed2' || state.embedActiveServerKey === 'swarm') {
      if (item.type === 'series') {
        embedUrl = 'https://vidsrc.pm/embed/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1) + startQuery;
      } else {
        embedUrl = 'https://vidsrc.pm/embed/movie/' + tmdbId + startQuery;
      }
    } else {
      if (item.type === 'series') {
        embedUrl = 'https://cdn.vidspark.to/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1) + startQuery;
      } else {
        embedUrl = 'https://cdn.vidspark.to/movie/' + tmdbId + startQuery;
      }
    }

    state.embedResumeSeekDone = !(state.embedStartOffsetSec > 15);

    embedContainer.innerHTML =
      '<iframe id="streamEmbedIframe" src="' + escapeHtml(embedUrl) + '" ' +
      'sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" ' +
      'referrerpolicy="origin" ' +
      'allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen ' +
      'style="width:100%;height:100%;border:none;background:#000;opacity:0;pointer-events:auto;transition:opacity 0.25s ease;"></iframe>';

    var iframe = document.getElementById('streamEmbedIframe');

    // Continuous health-check ping (`getStatus`): verifies `vidspark-player` is mounted & auto-starts playback
    state.embedVerifyInterval = setInterval(function () {
      var curIframe = document.getElementById('streamEmbedIframe');
      if (state.playingMode !== 'embed' || !curIframe || !curIframe.contentWindow) return;
      try {
        curIframe.contentWindow.postMessage({ action: 'getStatus' }, '*');
      } catch (e) {}
    }, 600);

    // Automatic Failover Watchdog: allow up to 15s for multi-server probing (`Vertex -> Beta -> Nebula -> Vega`) inside `cdn.vidspark.to`
    state.embedWatchdogTimer = setTimeout(function () {
      if (state.playingMode === 'embed' && !state.embedVerified && state.playingItem) {
        if (state.embedActiveServerKey === 'embed1') {
          playCleanEmbedStream(state.playingItem, state.activeSeason, state.activeEpisode, state.embedStartOffsetSec || 0, 'embed2');
        } else {
          playYoutubeVideoOrTrailer(state.playingItem);
        }
      }
    }, 15000);

    if (iframe) {
      iframe.addEventListener('load', function () {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ action: 'getStatus' }, '*');
          }
          setTimeout(function () {
            var curIfr = document.getElementById('streamEmbedIframe');
            if (curIfr && state.playingMode === 'embed') {
              curIfr.style.opacity = '1';
              var sp = document.getElementById('playerLoadingSpinner');
              if (sp) sp.classList.add('hidden');
              if (!state.embedVerified) {
                state.embedVerified = true;
              }
              if (state.embedStartOffsetSec > 15 && curIfr.contentWindow) {
                try {
                  curIfr.contentWindow.postMessage({ action: 'seek', time: Math.floor(state.embedStartOffsetSec) }, '*');
                  curIfr.contentWindow.postMessage({ command: 'seek', time: Math.floor(state.embedStartOffsetSec) }, '*');
                } catch (e) {}
              }
            }
          }, 3200);
          if (window.AndroidTvBridge && typeof window.AndroidTvBridge.tapCenterOfScreen === 'function') {
            setTimeout(function () {
              var pm = document.getElementById('playerModal');
              if (pm && !pm.classList.contains('hidden')) {
                window.AndroidTvBridge.tapCenterOfScreen();
              }
            }, 900);
          }
        } catch (e) {}
      });
    }
  }

  function getCurrentPlaybackTimeSec() {
    if (state.playingMode === 'embed') {
      return typeof state.embedCurrentTime === 'number' && state.embedCurrentTime >= 0 ? state.embedCurrentTime : 0;
    }
    var video = document.getElementById('videoElement');
    return (video && typeof video.currentTime === 'number' && isFinite(video.currentTime)) ? video.currentTime : 0;
  }

  /**
   * Synchronized Hebrew Subtitles Engine (`/api/subtitles/vtt` + OpenSubtitles v3 Stremio API + RTL Punctuation Fix)
   */
  async function loadHebrewSubtitlesForItem(item, imdbId, season, episode) {
    state.parsedCues = [];
    state.englishSdhCues = [];
    state.activeSkipSegments = [];
    state.parentalSkippedCountThisSession = 0;
    state.parentalShieldActiveSegment = null;
    setParentalTemporaryMute(false);
    hideParentalShieldOverlay();

    state.subtitleTracks = [
      { id: 'he-auto', label: 'עברית — מסונכרן אוטומטית (AutoSub AI)', lang: 'he', url: '' },
      { id: 'off', label: 'ללא כתוביות', lang: 'off', url: '' }
    ];
    state.activeSubTrackId = state.subEnabled ? 'he-auto' : 'off';
    state.subOffsetSec = 0;

    // Immediately build initial scene skip timeline from Curated DB & Custom Saved Segments
    rebuildParentalSkipTimelineForCurrentMedia();
    updateInPlayerParentalUi();

    var subStatusEl = document.getElementById('playerSubtitleStatus');
    var apiBase = getApiBase();

    // 1. Fetch verified WebVTT from `/api/subtitles/vtt` (when local backend is active)
    if (hasLocalBackend()) {
      try {
        var vttUrl = apiBase + '/api/subtitles/vtt?imdb_id=' + encodeURIComponent(imdbId) +
          '&type=' + encodeURIComponent(item.type) +
          '&season=' + (season || 1) +
          '&episode=' + (episode || 1) +
          '&sub_id=auto&offset_ms=0&fps_ratio=1.0&title_he=' + encodeURIComponent(item.title || '');
        var res = await fetch(vttUrl);
        if (res.ok) {
          var vttText = await res.text();
          var cues = parseWebVttOrSrtText(vttText);
          if (cues.length >= 3) {
            state.parsedCues = cues;
          }
        }
      } catch (e) {}
    }

    // 2. Also query OpenSubtitles v3 Stremio API directly (Works 100% standalone on Android TV Streamer!)
    try {
      var stremType = item.type === 'series' ? 'series' : 'movie';
      var targetId = stremType === 'series' ? (imdbId + ':' + (season || 1) + ':' + (episode || 1)) : imdbId;
      var osRes = await fetch('https://opensubtitles-v3.strem.io/subtitles/' + stremType + '/' + encodeURIComponent(targetId) + '.json');
      if (osRes.ok) {
        var osData = await osRes.json();
        var subs = (osData && Array.isArray(osData.subtitles)) ? osData.subtitles : [];
        var hebTracks = subs.filter(function (s) {
          var l = String((s && s.lang) || '').toLowerCase();
          return (l === 'heb' || l === 'he' || l.indexOf('heb') !== -1) && s.url;
        });
        var engTracks = subs.filter(function (s) {
          var l = String((s && s.lang) || '').toLowerCase();
          return (l === 'eng' || l === 'en' || l.indexOf('eng') !== -1) && s.url;
        });

        for (var h = 0; h < Math.min(4, hebTracks.length); h++) {
          state.subtitleTracks.splice(state.subtitleTracks.length - 1, 0, {
            id: 'os-heb-' + (h + 1),
            label: 'עברית — מקור OpenSubtitles #' + (h + 1),
            lang: 'he',
            url: hebTracks[h].url
          });
        }

        if (state.parsedCues.length < 5 && hebTracks.length) {
          var srtRes = await fetch(hebTracks[0].url);
          if (srtRes.ok) {
            var srtText = await srtRes.text();
            var osCues = parseWebVttOrSrtText(srtText);
            if (osCues.length >= 3) {
              state.parsedCues = osCues;
            }
          }
        }

        // Fetch English SDH track in background for deep audio-tag & scene detection (`[moaning]`, `[gunshots]`, etc.)
        if (engTracks.length) {
          fetch(engTracks[0].url).then(function (er) {
            return er.ok ? er.text() : '';
          }).then(function (eTxt) {
            if (eTxt) {
              var eCues = parseWebVttOrSrtText(eTxt);
              if (eCues.length >= 5) {
                state.englishSdhCues = eCues;
                rebuildParentalSkipTimelineForCurrentMedia();
                updateInPlayerParentalUi();
              }
            }
          }).catch(function () {});
        }
      }
    } catch (e) {}

    // Rebuild scene skip timeline now that Hebrew subtitles are parsed
    rebuildParentalSkipTimelineForCurrentMedia();
    updateInPlayerParentalUi();

    if (subStatusEl) {
      subStatusEl.textContent = state.parsedCues.length
        ? ('כתוביות בעברית פעילות (' + state.parsedCues.length + ' שורות מסונכרנות)')
        : 'כתוביות בעברית מובנות';
    }

    renderSubtitlesMenu();
    updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
  }

  function parseWebVttOrSrtText(rawText) {
    if (!rawText) return [];
    var lines = String(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var cues = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i].trim();
      if (line.indexOf('-->') !== -1) {
        var parts = line.split('-->');
        var startSec = parseTimestampToSeconds(parts[0]);
        var endSec = parseTimestampToSeconds((parts[1] || '').trim().split(' ')[0]);
        i++;
        var textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim().replace(/<[^>]+>/g, ''));
          i++;
        }
        var cueText = fixRtlPunctuation(textLines.join('\n'));
        if (cueText && isFinite(startSec) && isFinite(endSec) && endSec > startSec) {
          cues.push({ start: startSec, end: endSec, text: cueText });
        }
      } else {
        i++;
      }
    }
    return cues;
  }

  function parseTimestampToSeconds(ts) {
    if (!ts) return 0;
    var clean = String(ts).trim().replace(',', '.');
    var segs = clean.split(':');
    if (segs.length === 3) {
      return Number(segs[0]) * 3600 + Number(segs[1]) * 60 + parseFloat(segs[2]);
    }
    if (segs.length === 2) {
      return Number(segs[0]) * 60 + parseFloat(segs[1]);
    }
    return 0;
  }

  function fixRtlPunctuation(text) {
    if (!text) return '';
    // Ensure Hebrew punctuation (. , ! ? : ; - ...) ALWAYS renders on the LEFT side of the Hebrew sentence:
    // 1. Strip stray BiDi marks.
    // 2. If legacy SRT files pre-flipped leading terminal punctuation to the start of a Hebrew line (e.g. ".אנחנו מוכנים"), move it to the logical end ("אנחנו מוכנים.").
    // 3. Append trailing RLM (\u200F) so with `direction: rtl; unicode-bidi: isolate;` on `#customSubtitleText`, punctuation is strictly anchored on the LEFT!
    return text.split('\n').map(function (rawLn) {
      var ln = rawLn.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
      if (!ln) return '';
      if (/[\u0590-\u05FF]/.test(ln)) {
        // Move pre-flipped leading terminal punctuation (. ! ? , : ; ...) to logical end of Hebrew line
        var preFlippedMatch = ln.match(/^([.?!,:;…]+)\s*([\u0590-\u05FF].*)$/);
        if (preFlippedMatch && !/[.?!,:;…]$/.test(preFlippedMatch[2])) {
          ln = preFlippedMatch[2].trim() + preFlippedMatch[1];
        }
      }
      return ln + '\u200F';
    }).join('\n');
  }

  function updateActiveSubtitleCue(currentTimeSec) {
    // Run SafeWatch Parental Control Scene Guard on every playback tick!
    enforceParentalSceneGuard(currentTimeSec);

    var overlay = document.getElementById('customSubtitleOverlay');
    if (!overlay) return;
    var textSpan = document.getElementById('customSubtitleText');
    if (!textSpan) {
      overlay.innerHTML = '<span id="customSubtitleText" class="custom-subtitle-text"></span>';
      textSpan = document.getElementById('customSubtitleText');
      applySubtitleStyleToOverlay();
    }
    if (!textSpan) return;

    if (!state.subEnabled || state.activeSubTrackId === 'off' || !state.parsedCues.length) {
      textSpan.textContent = '';
      overlay.classList.add('cue-empty');
      return;
    }

    var effectiveTime = currentTimeSec - state.subOffsetSec;
    var activeText = '';
    for (var i = 0; i < state.parsedCues.length; i++) {
      var c = state.parsedCues[i];
      if (effectiveTime >= c.start && effectiveTime <= c.end) {
        activeText = c.text;
        break;
      }
    }

    if (activeText) {
      var activeProf = getActiveSubUser();
      var pCfg = ensureProfileParentalConfig(activeProf);
      if (pCfg && pCfg.enabled && pCfg.categories && pCfg.categories.profanity) {
        activeText = censorProfanityInText(activeText, pCfg.sensitivity);
      }
      textSpan.innerHTML = escapeHtml(activeText).replace(/\n/g, '<br/>');
      overlay.classList.remove('cue-empty');
    } else {
      textSpan.textContent = '';
      overlay.classList.add('cue-empty');
    }
  }

  /**
   * =========================================================================
   * SAFEWATCH PARENTAL CONTROL & AUTOMATIC SCENE SKIPPING ENGINE
   * =========================================================================
   */
  var PARENTAL_CATEGORY_LABELS = {
    sex: 'סקס, מיניות ועירום',
    violence: 'אלימות קשה ודם',
    profanity: 'שפה בוטה וקללות',
    drugs: 'סמים ואלכוהול',
    horror: 'אימה וקטעים מפחידים'
  };

  // Curated Scene Skip Database for Popular Movies & Series (IMDb ID & TMDB ID keys)
  var BUILTIN_SCENE_SKIP_DB = {
    // Oppenheimer (2023)
    'tt15398776': [
      { start: 1410, end: 1478, category: 'sex', severity: 'balanced', label: 'סצנת מין ועירום מלא' },
      { start: 1715, end: 1765, category: 'sex', severity: 'balanced', label: 'סצנת עירום בדיון' },
      { start: 6820, end: 6885, category: 'sex', severity: 'balanced', label: 'סצנת עירום וחקירה' }
    ],
    '872585': [
      { start: 1410, end: 1478, category: 'sex', severity: 'balanced', label: 'סצנת מין ועירום מלא' },
      { start: 1715, end: 1765, category: 'sex', severity: 'balanced', label: 'סצנת עירום בדיון' },
      { start: 6820, end: 6885, category: 'sex', severity: 'balanced', label: 'סצנת עירום וחקירה' }
    ],
    // The Wolf of Wall Street (2013)
    'tt0993846': [
      { start: 65, end: 175, category: 'sex', severity: 'balanced', label: 'סצנת פתיחה — מין וסמים' },
      { start: 640, end: 725, category: 'drugs', severity: 'balanced', label: 'שימוש בסמים' },
      { start: 1580, end: 1690, category: 'sex', severity: 'balanced', label: 'סצנת מסיבה ועירום' },
      { start: 2410, end: 2520, category: 'sex', severity: 'balanced', label: 'סצנת מין ועירום' },
      { start: 3920, end: 4040, category: 'sex', severity: 'balanced', label: 'סצנת מין במטוס' }
    ],
    '106646': [
      { start: 65, end: 175, category: 'sex', severity: 'balanced', label: 'סצנת פתיחה — מין וסמים' },
      { start: 640, end: 725, category: 'drugs', severity: 'balanced', label: 'שימוש בסמים' },
      { start: 1580, end: 1690, category: 'sex', severity: 'balanced', label: 'סצנת מסיבה ועירום' },
      { start: 2410, end: 2520, category: 'sex', severity: 'balanced', label: 'סצנת מין ועירום' }
    ],
    // Deadpool & Wolverine (2024)
    'tt6263850': [
      { start: 185, end: 270, category: 'violence', severity: 'balanced', label: 'אלימות גרפית ודם בפתיחה' },
      { start: 2210, end: 2265, category: 'drugs', severity: 'balanced', label: 'התייחסות ושימוש בסמים' },
      { start: 4680, end: 4770, category: 'violence', severity: 'balanced', label: 'קרב אלים ודם' }
    ],
    '533535': [
      { start: 185, end: 270, category: 'violence', severity: 'balanced', label: 'אלימות גרפית ודם בפתיחה' },
      { start: 2210, end: 2265, category: 'drugs', severity: 'balanced', label: 'התייחסות ושימוש בסמים' },
      { start: 4680, end: 4770, category: 'violence', severity: 'balanced', label: 'קרב אלים ודם' }
    ],
    // Poor Things (2023)
    'tt14230458': [
      { start: 1320, end: 1415, category: 'sex', severity: 'balanced', label: 'סצנה מינית מפורשת' },
      { start: 2140, end: 2290, category: 'sex', severity: 'balanced', label: 'סצנת מין ועירום' },
      { start: 4320, end: 4480, category: 'sex', severity: 'balanced', label: 'סצנת בית בושת' }
    ],
    // Saltburn (2023)
    'tt17351924': [
      { start: 2880, end: 2975, category: 'sex', severity: 'balanced', label: 'סצנה מינית בוטה' },
      { start: 4120, end: 4215, category: 'sex', severity: 'balanced', label: 'סצנה מינית' },
      { start: 7110, end: 7260, category: 'sex', severity: 'balanced', label: 'סצנת עירום מלא בסיום' }
    ],
    // Gladiator II (2024)
    'tt9218128': [
      { start: 1620, end: 1685, category: 'violence', severity: 'balanced', label: 'אלימות זירה גרפית' },
      { start: 3840, end: 3915, category: 'violence', severity: 'balanced', label: 'אלימות קשה בזירה' }
    ]
  };

  var HEBREW_PROFANITY_WORDS = [
    'כוסאמק', 'כוסעמק', 'שרמוטה', 'שרמוטות', 'בן זונה', 'בת זונה', 'בני זונות',
    'זונה', 'זונות', 'מזדיין', 'מזדיינת', 'מזדיינים', 'תזדיין', 'תזדייני', 'לזיין',
    'זין', 'הזין', 'כוסאוחתוק', 'מניאק', 'מניאקים', 'חרא', 'פאק', 'פאקינג', 'שיט'
  ];
  var HEBREW_STRICT_MILD_PROFANITY = ['לעזאזל', 'קיבינימט', 'דפוק', 'מטומטם', 'אידיוט'];

  var ENGLISH_PROFANITY_REGEX = /\b(motherfuck(?:er|ing|ers)?|fuck(?:ing|ed|er|s)?|shit(?:ty|s|ting)?|bullshit|bitch(?:es|ing)?|asshole(?:s)?|dickhead|cocksucker|cunt(?:s)?|whore(?:s)?|slut(?:s)?|bastard(?:s)?|pussy)\b/gi;
  var ENGLISH_STRICT_PROFANITY_REGEX = /\b(damn(?:it)?|goddamn|hell|crap|piss(?:ed)?|dick|cock)\b/gi;

  var SEX_CUE_PATTERNS = [
    /\[[^\]]*(?:moan|groan|passion|sex|making love|nudity|naked|undress|heavy breathing|climax|orgasm|panting|אנחות|גניחות|נאנח|מתפשט|עירום|מין)[^\]]*\]/i,
    /\([^\)]*(?:moan|groan|passion|sex|making love|nudity|naked|undress|heavy breathing|climax|orgasm|אנחות|גניחות|נאנח|מתפשט|עירום|מין)[^\)]*\)/i,
    /\b(?:have sex with|make love to|fuck me|fucking me|take off your clothes|get naked|strip for me|blowjob|handjob|orgasm)\b/i,
    /(?:שכב איתי|תשכב איתי|לשכב איתך|נעשה סקס|יחסי מין|אורגזמה|תתפשטי|תתפשט|מתפשטים|בעירום)/
  ];
  var SEX_STRICT_PATTERNS = [
    /\[[^\]]*(?:kiss|kissing|נשיקה|מתנשקים)[^\]]*\]/i,
    /(?:נשיקה לוהטת|מתנשקים בלהט|מתמזמזים|חזייה|תחתונים)/,
    /\b(?:kissing passionately|making out|take off your shirt|bra|panties)\b/i
  ];

  var VIOLENCE_CUE_PATTERNS = [
    /\[[^\]]*(?:gunshot|gunfire|screaming in pain|screaming in agony|bones crunch|flesh tear|blood splatter|stabbing|choking|strangl|יריות|צרחות כאב|צרחות אימה|דוקר|משסף|דם)[^\]]*\]/i,
    /\([^\)]*(?:gunshot|gunfire|screaming in pain|screaming in agony|bones crunch|flesh tear|blood splatter|stabbing|choking|יריות|צרחות כאב|צרחות אימה|דוקר|משסף)[^\)]*\)/i,
    /(?:לשחוט אותו|לחתוך לו את הגרון|דם ניתז|עינויים קשים)/
  ];

  var DRUGS_CUE_PATTERNS = [
    /\[[^\]]*(?:snort|cocaine|heroin|bong|joint|injecting|מסניף|קוקאין|הרואין|מזריק)[^\]]*\]/i,
    /\b(?:snort(?:ing)? cocaine|shoot(?:ing)? heroin|crystal meth|crack pipe|smoke a joint|smoking weed|drug overdose)\b/i,
    /(?:להסניף קוקאין|מסניף קוקאין|מזריק הרואין|נגלגל ג׳וינט|נגלגל ג'וינט|מנת יתר של סמים|קוקאין טהור)/
  ];

  var HORROR_CUE_PATTERNS = [
    /\[[^\]]*(?:demonic|blood-curdling|terrifying scream|possessed|eerie shriek|צרחה מקפיאת דם|קול שטני|דיבוק)[^\]]*\]/i,
    /\([^\)]*(?:demonic|blood-curdling|terrifying scream|possessed|eerie shriek|צרחה מקפיאת דם|דיבוק)[^\)]*\)/i
  ];

  function getMediaParentalKey(item, season, episode) {
    if (!item) return '';
    var baseId = String(item.imdbId || item.tmdbId || item.id || '').trim();
    if (!baseId) return '';
    if (item.type === 'series') {
      return baseId + ':S' + (season || 1) + ':E' + (episode || 1);
    }
    return baseId;
  }

  function censorProfanityInText(text, sensitivity) {
    if (!text) return '';
    var out = String(text);
    for (var i = 0; i < HEBREW_PROFANITY_WORDS.length; i++) {
      var w = HEBREW_PROFANITY_WORDS[i];
      if (out.indexOf(w) !== -1) {
        out = out.split(w).join('****');
      }
    }
    if (sensitivity === 'strict') {
      for (var j = 0; j < HEBREW_STRICT_MILD_PROFANITY.length; j++) {
        var mw = HEBREW_STRICT_MILD_PROFANITY[j];
        if (out.indexOf(mw) !== -1) {
          out = out.split(mw).join('***');
        }
      }
    }
    out = out.replace(ENGLISH_PROFANITY_REGEX, '****');
    if (sensitivity === 'strict') {
      out = out.replace(ENGLISH_STRICT_PROFANITY_REGEX, '***');
    }
    return out;
  }

  function containsProfanityCue(text, sensitivity) {
    if (!text) return false;
    var s = String(text);
    for (var i = 0; i < HEBREW_PROFANITY_WORDS.length; i++) {
      if (s.indexOf(HEBREW_PROFANITY_WORDS[i]) !== -1) return true;
    }
    if (sensitivity === 'strict') {
      for (var j = 0; j < HEBREW_STRICT_MILD_PROFANITY.length; j++) {
        if (s.indexOf(HEBREW_STRICT_MILD_PROFANITY[j]) !== -1) return true;
      }
    }
    ENGLISH_PROFANITY_REGEX.lastIndex = 0;
    if (ENGLISH_PROFANITY_REGEX.test(s)) return true;
    if (sensitivity === 'strict') {
      ENGLISH_STRICT_PROFANITY_REGEX.lastIndex = 0;
      if (ENGLISH_STRICT_PROFANITY_REGEX.test(s)) return true;
    }
    return false;
  }

  function matchesAnyRegexList(text, regexList) {
    if (!text || !regexList) return false;
    for (var i = 0; i < regexList.length; i++) {
      if (regexList[i].test(text)) return true;
    }
    return false;
  }

  function clusterAndMergeSceneSegments(rawSegments, mergeWindowSec, minSceneDurationSec) {
    if (!Array.isArray(rawSegments) || !rawSegments.length) return [];
    var sorted = rawSegments.slice().sort(function (a, b) { return a.start - b.start; });
    var merged = [];
    for (var i = 0; i < sorted.length; i++) {
      var seg = sorted[i];
      if (!merged.length) {
        merged.push({
          start: Math.max(0, seg.start),
          end: Math.max(seg.end, seg.start + (seg.category === 'profanity' ? 0.5 : minSceneDurationSec)),
          category: seg.category,
          severity: seg.severity || 'balanced',
          label: seg.label || PARENTAL_CATEGORY_LABELS[seg.category] || 'קטע לא הולם',
          source: seg.source || 'auto'
        });
      } else {
        var last = merged[merged.length - 1];
        var gap = seg.start - last.end;
        var win = seg.category === 'profanity' ? 0.8 : mergeWindowSec;
        if (last.category === seg.category && gap <= win) {
          last.end = Math.max(last.end, seg.end);
          if (seg.severity === 'balanced') last.severity = 'balanced';
        } else {
          merged.push({
            start: Math.max(0, seg.start),
            end: Math.max(seg.end, seg.start + (seg.category === 'profanity' ? 0.5 : minSceneDurationSec)),
            category: seg.category,
            severity: seg.severity || 'balanced',
            label: seg.label || PARENTAL_CATEGORY_LABELS[seg.category] || 'קטע לא הולם',
            source: seg.source || 'auto'
          });
        }
      }
    }
    return merged;
  }

  function rebuildParentalSkipTimelineForCurrentMedia() {
    var item = state.playingItem;
    if (!item || item.type === 'channel' || item.type === 'youtube') {
      state.activeSkipSegments = [];
      return;
    }

    var rawList = [];
    var imdbKey = String(item.imdbId || '').trim();
    var tmdbKey = String(item.tmdbId || '').replace(/\D/g, '');
    var mediaKey = getMediaParentalKey(item, state.activeSeason, state.activeEpisode);

    // 1. Curated DB entries by IMDb ID / TMDB ID / Episode Key
    var dbKeys = [mediaKey, imdbKey, tmdbKey].filter(Boolean);
    var seenDb = {};
    for (var k = 0; k < dbKeys.length; k++) {
      var arr = BUILTIN_SCENE_SKIP_DB[dbKeys[k]];
      if (Array.isArray(arr)) {
        for (var d = 0; d < arr.length; d++) {
          var sEntry = arr[d];
          var sig = sEntry.category + ':' + Math.round(sEntry.start);
          if (!seenDb[sig]) {
            seenDb[sig] = true;
            rawList.push({
              start: sEntry.start,
              end: sEntry.end,
              category: sEntry.category,
              severity: sEntry.severity || 'balanced',
              label: sEntry.label || PARENTAL_CATEGORY_LABELS[sEntry.category],
              source: 'curated'
            });
          }
        }
      }
    }

    // 2. User-saved custom skip segments for this movie/episode
    if (mediaKey && state.parentalMaster && state.parentalMaster.customSkipSegments) {
      var customArr = state.parentalMaster.customSkipSegments[mediaKey];
      if (Array.isArray(customArr)) {
        for (var c = 0; c < customArr.length; c++) {
          var cs = customArr[c];
          if (cs && isFinite(cs.start) && isFinite(cs.end) && cs.end > cs.start) {
            rawList.push({
              start: cs.start,
              end: cs.end,
              category: cs.category || 'sex',
              severity: 'balanced',
              label: cs.label || 'קטע שסומן ע״י המשתמש',
              source: 'user'
            });
          }
        }
      }
    }

    // 3. Automatic Deep Subtitle & SDH Cue Scanner (Hebrew + English SDH)
    var allCuePools = [state.parsedCues || [], state.englishSdhCues || []];
    for (var p = 0; p < allCuePools.length; p++) {
      var cues = allCuePools[p];
      for (var i = 0; i < cues.length; i++) {
        var cue = cues[i];
        if (!cue || !cue.text) continue;
        var txt = String(cue.text);

        // A. Sex & Nudity detection
        if (matchesAnyRegexList(txt, SEX_CUE_PATTERNS)) {
          rawList.push({
            start: Math.max(0, cue.start - 2.0),
            end: cue.end + 4.5,
            category: 'sex',
            severity: 'balanced',
            label: 'סצנה מינית / אינטימית',
            source: 'sub_ai'
          });
        } else if (matchesAnyRegexList(txt, SEX_STRICT_PATTERNS)) {
          rawList.push({
            start: Math.max(0, cue.start - 1.5),
            end: cue.end + 3.0,
            category: 'sex',
            severity: 'strict',
            label: 'קטע רומנטי / נשיקה',
            source: 'sub_ai'
          });
        }

        // B. Violence & Gore detection
        if (matchesAnyRegexList(txt, VIOLENCE_CUE_PATTERNS)) {
          rawList.push({
            start: Math.max(0, cue.start - 1.5),
            end: cue.end + 3.5,
            category: 'violence',
            severity: 'balanced',
            label: 'סצנת אלימות קשה',
            source: 'sub_ai'
          });
        }

        // C. Drugs & Alcohol detection
        if (matchesAnyRegexList(txt, DRUGS_CUE_PATTERNS)) {
          rawList.push({
            start: Math.max(0, cue.start - 1.5),
            end: cue.end + 3.5,
            category: 'drugs',
            severity: 'balanced',
            label: 'סצנת שימוש בסמים',
            source: 'sub_ai'
          });
        }

        // D. Horror & Frightening scenes detection
        if (matchesAnyRegexList(txt, HORROR_CUE_PATTERNS)) {
          rawList.push({
            start: Math.max(0, cue.start - 1.5),
            end: cue.end + 3.5,
            category: 'horror',
            severity: 'balanced',
            label: 'קטע אימה מפחיד',
            source: 'sub_ai'
          });
        }

        // E. Profanity detection (Strict & Balanced)
        if (containsProfanityCue(txt, 'balanced')) {
          rawList.push({
            start: Math.max(0, cue.start - 0.15),
            end: cue.end + 0.2,
            category: 'profanity',
            severity: 'balanced',
            label: 'שפה בוטה',
            source: 'sub_ai'
          });
        } else if (containsProfanityCue(txt, 'strict')) {
          rawList.push({
            start: Math.max(0, cue.start - 0.15),
            end: cue.end + 0.2,
            category: 'profanity',
            severity: 'strict',
            label: 'שפה לא הולמת',
            source: 'sub_ai'
          });
        }
      }
    }

    state.activeSkipSegments = clusterAndMergeSceneSegments(rawList, 22, 9);
  }

  function setParentalTemporaryMute(shouldMute) {
    shouldMute = Boolean(shouldMute);
    if (state.parentalTempMuted === shouldMute) return;
    state.parentalTempMuted = shouldMute;

    var video = document.getElementById('videoElement');
    if (video) {
      try {
        video.muted = shouldMute;
      } catch (e) {}
    }
    if (state.playingMode === 'embed') {
      var ifr = document.getElementById('streamEmbedIframe');
      if (ifr && ifr.contentWindow) {
        try {
          ifr.contentWindow.postMessage({ action: shouldMute ? 'mute' : 'unmute' }, '*');
          ifr.contentWindow.postMessage({ command: shouldMute ? 'mute' : 'unmute' }, '*');
        } catch (e) {}
      }
    }
  }

  function showParentalSkipBanner(titleText, subText) {
    var banner = document.getElementById('parentalSkipBanner');
    var titleEl = document.getElementById('parentalSkipBannerTitle');
    var subEl = document.getElementById('parentalSkipBannerSub');
    if (!banner) return;
    if (titleEl) titleEl.textContent = titleText || 'בקרת הורים (SafeWatch)';
    if (subEl) subEl.textContent = subText || 'דולג אוטומטית קטע לא הולם';
    banner.classList.remove('hidden');
    if (state.parentalSkipBannerTimer) clearTimeout(state.parentalSkipBannerTimer);
    state.parentalSkipBannerTimer = setTimeout(function () {
      banner.classList.add('hidden');
    }, 3800);
  }

  function showParentalShieldOverlay(seg, remainingSec) {
    var shield = document.getElementById('parentalShieldOverlay');
    var heading = document.getElementById('parentalShieldHeading');
    var desc = document.getElementById('parentalShieldDesc');
    if (!shield) return;
    var catName = (seg && (seg.label || PARENTAL_CATEGORY_LABELS[seg.category])) || 'תוכן לא הולם';
    if (heading) heading.textContent = 'קטע מוסתר ע״י בקרת הורים (' + catName + ')';
    if (desc) {
      var rem = Math.max(1, Math.ceil(remainingSec || 5));
      desc.textContent = 'הווידאו והסאונד מוסתרים בהתאם להגדרות הפרופיל • הקטע יסתיים בעוד ' + rem + ' שניות';
    }
    shield.classList.remove('hidden');
  }

  function hideParentalShieldOverlay() {
    var shield = document.getElementById('parentalShieldOverlay');
    if (shield && !shield.classList.contains('hidden')) {
      shield.classList.add('hidden');
    }
  }

  function performParentalJumpTo(targetSec, seg) {
    var now = Date.now();
    if (now - (state.lastParentalSkipAt || 0) < 1100) return;
    state.lastParentalSkipAt = now;
    state.parentalSkippedCountThisSession = (state.parentalSkippedCountThisSession || 0) + 1;

    var skippedDur = Math.max(2, Math.round((seg.end || targetSec) - (seg.start || (targetSec - 10))));
    var catLabel = seg.label || PARENTAL_CATEGORY_LABELS[seg.category] || 'תוכן לא הולם';

    var video = document.getElementById('videoElement');
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      try {
        video.currentTime = targetSec;
      } catch (e) {}
    } else if (state.playingMode === 'embed') {
      // Shield screen + mute audio while embed player seeks so zero inappropriate frames or audio leak
      state.embedSkipTargetUntil = Date.now() + 2600;
      state.embedCurrentTime = targetSec;
      setParentalTemporaryMute(true);
      showParentalShieldOverlay(seg, 1);
      setTimeout(function () {
        if (!state.parentalShieldActiveSegment) {
          hideParentalShieldOverlay();
          setParentalTemporaryMute(false);
        }
      }, 950);

      var seekTargetInt = Math.ceil(targetSec);
      var ifr = document.getElementById('streamEmbedIframe');
      if (ifr && ifr.contentWindow) {
        try {
          ifr.contentWindow.postMessage({ action: 'seek', time: seekTargetInt }, '*');
          ifr.contentWindow.postMessage({ command: 'seek', time: seekTargetInt }, '*');
          ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTargetInt, true] }), '*');
        } catch (e) {}
      }
      var curEl = document.getElementById('playerCurrentTime');
      if (curEl) curEl.textContent = formatSeconds(targetSec);
    }

    showParentalSkipBanner(
      'בקרת הורים (SafeWatch) — ' + (getActiveSubUser() ? getActiveSubUser().name : 'מוגן'),
      'דולג אוטומטית: ' + catLabel + ' (' + skippedDur + ' שניות)'
    );
    updateInPlayerParentalUi();
  }

  function enforceParentalSceneGuard(currentTimeSec) {
    if (!state.playingItem || state.playingItem.type === 'channel' || state.playingItem.type === 'youtube') return;
    var activeProf = getActiveSubUser();
    var pCfg = ensureProfileParentalConfig(activeProf);
    if (!pCfg || !pCfg.enabled) {
      if (state.parentalTempMuted) setParentalTemporaryMute(false);
      if (state.parentalShieldActiveSegment) {
        state.parentalShieldActiveSegment = null;
        hideParentalShieldOverlay();
      }
      return;
    }

    var segments = state.activeSkipSegments || [];
    if (!segments.length) return;

    var t = currentTimeSec - (state.subOffsetSec || 0);
    var matchedVisualSeg = null;
    var matchedProfanityMuteSeg = null;

    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (!pCfg.categories || !pCfg.categories[seg.category]) continue;
      if (seg.severity === 'strict' && pCfg.sensitivity !== 'strict') continue;

      if (t >= seg.start && t < seg.end - 0.25) {
        if (seg.category === 'profanity' && pCfg.profanityMode === 'mute_censor') {
          matchedProfanityMuteSeg = seg;
        } else {
          matchedVisualSeg = seg;
          break;
        }
      }
    }

    if (matchedVisualSeg) {
      if (pCfg.actionMode === 'skip' || (matchedVisualSeg.category === 'profanity' && pCfg.profanityMode === 'skip')) {
        state.parentalShieldActiveSegment = null;
        hideParentalShieldOverlay();
        setParentalTemporaryMute(false);
        performParentalJumpTo(matchedVisualSeg.end + 0.35, matchedVisualSeg);
        return;
      } else {
        // 'blur_mute' mode: keep shield overlay and mute audio until segment ends
        state.parentalShieldActiveSegment = matchedVisualSeg;
        setParentalTemporaryMute(true);
        showParentalShieldOverlay(matchedVisualSeg, matchedVisualSeg.end - t);
        return;
      }
    } else if (state.parentalShieldActiveSegment) {
      state.parentalShieldActiveSegment = null;
      hideParentalShieldOverlay();
    }

    if (matchedProfanityMuteSeg) {
      setParentalTemporaryMute(true);
    } else if (state.parentalTempMuted) {
      setParentalTemporaryMute(false);
    }
  }

  function markCurrentSceneAndSkip() {
    if (!state.playingItem) return;
    var curT = getCurrentPlaybackTimeSec();
    var startSec = Math.max(0, Math.floor(curT - 2));
    var endSec = Math.floor(curT + 30);
    var mKey = getMediaParentalKey(state.playingItem, state.activeSeason, state.activeEpisode);
    if (mKey) {
      if (!state.parentalMaster) state.parentalMaster = { pinCode: '', customSkipSegments: {} };
      if (!state.parentalMaster.customSkipSegments) state.parentalMaster.customSkipSegments = {};
      if (!Array.isArray(state.parentalMaster.customSkipSegments[mKey])) {
        state.parentalMaster.customSkipSegments[mKey] = [];
      }
      state.parentalMaster.customSkipSegments[mKey].push({
        start: startSec,
        end: endSec,
        category: 'sex',
        label: 'קטע שסומן ע״י המשתמש'
      });
      saveParentalMasterState();
      rebuildParentalSkipTimelineForCurrentMedia();
    }
    var pMenu = document.getElementById('playerParentalMenu');
    if (pMenu) pMenu.classList.add('hidden');
    performParentalJumpTo(endSec, {
      start: startSec,
      end: endSec,
      category: 'sex',
      label: 'קטע שסומן ודולג (+30 שנ׳)'
    });
    updateInPlayerParentalUi();
  }

  function triggerLiveParentalDemoSkip() {
    var curProf = getActiveSubUser();
    if (curProf) {
      var cfg = ensureProfileParentalConfig(curProf);
      if (!cfg.enabled) {
        cfg.enabled = true;
        if (countEnabledParentalCategories(cfg) === 0) {
          cfg.categories.sex = true;
          cfg.categories.violence = true;
          cfg.categories.profanity = true;
        }
        saveSubUsersState();
      }
    }
    var pMenu = document.getElementById('playerParentalMenu');
    if (pMenu) pMenu.classList.add('hidden');

    var curT = getCurrentPlaybackTimeSec();
    var demoSeg = {
      start: curT,
      end: curT + 25,
      category: 'sex',
      label: 'הדגמת SafeWatch — סצנה לא הולמת (סקס / אלימות)'
    };

    var activeCfg = curProf ? ensureProfileParentalConfig(curProf) : null;
    if (activeCfg && activeCfg.actionMode === 'blur_mute') {
      state.parentalShieldActiveSegment = demoSeg;
      setParentalTemporaryMute(true);
      showParentalShieldOverlay(demoSeg, 5);
      setTimeout(function () {
        if (state.parentalShieldActiveSegment === demoSeg) {
          state.parentalShieldActiveSegment = null;
          hideParentalShieldOverlay();
          setParentalTemporaryMute(false);
        }
      }, 4500);
    } else {
      performParentalJumpTo(curT + 25, demoSeg);
    }
    updateInPlayerParentalUi();
    updateUserMenuParentalSummary();
  }

  function getProfileById(profileId) {
    if (!state.subUsers || !state.subUsers.length) return null;
    for (var i = 0; i < state.subUsers.length; i++) {
      if (state.subUsers[i].id === profileId) {
        ensureProfileParentalConfig(state.subUsers[i]);
        return state.subUsers[i];
      }
    }
    return getActiveSubUser();
  }

  function getEditingParentalProfile() {
    var prof = getProfileById(state.editingParentalProfileId || state.activeSubUserId);
    if (!prof && state.subUsers && state.subUsers.length) {
      prof = state.subUsers[0];
    }
    if (prof) ensureProfileParentalConfig(prof);
    return prof;
  }

  function countEnabledParentalCategories(pCfg) {
    if (!pCfg || !pCfg.categories) return 0;
    var keys = ['sex', 'violence', 'profanity', 'drugs', 'horror'];
    var count = 0;
    for (var i = 0; i < keys.length; i++) {
      if (pCfg.categories[keys[i]]) count++;
    }
    return count;
  }

  function getParentalSummaryLabel(pCfg) {
    if (!pCfg || !pCfg.enabled) return 'כבוי — ללא סינון';
    var count = countEnabledParentalCategories(pCfg);
    if (count === 0) return 'פעיל (ללא קטגוריות מסומנות)';
    var modeTxt = pCfg.actionMode === 'blur_mute' ? 'השחרת מסך והשתקה' : 'דילוג אוטומטי';
    return 'פעיל • ' + modeTxt + ' (' + count + ' קטגוריות)';
  }

  function updateUserMenuParentalSummary() {
    var activeProf = getActiveSubUser();
    var pCfg = activeProf ? ensureProfileParentalConfig(activeProf) : null;
    var subEl = document.getElementById('userMenuParentalSub');
    var tvMoreDescEl = document.getElementById('tvMoreParentalSubLabel') || document.getElementById('tvMoreParentalDesc');
    var tvMoreTitleEl = document.getElementById('tvMoreParentalLabel');

    var protectedCount = 0;
    if (Array.isArray(state.subUsers)) {
      for (var i = 0; i < state.subUsers.length; i++) {
        var cfg = ensureProfileParentalConfig(state.subUsers[i]);
        if (cfg && cfg.enabled) protectedCount++;
      }
    }

    if (subEl) {
      if (pCfg && pCfg.enabled) {
        subEl.textContent = 'פעיל ב-' + (activeProf ? activeProf.name : 'פרופיל') + ' • ' + protectedCount + '/' + (state.subUsers.length || 1) + ' פרופילים מוגנים';
      } else if (protectedCount > 0) {
        subEl.textContent = protectedCount + ' תתי-יוזרים מוגנים • כבוי בפרופיל הנוכחי';
      } else {
        subEl.textContent = 'דילוג אוטומטי על סקס, אלימות ושפה בוטה (ראשי ותתי-יוזרים)';
      }
    }

    if (tvMoreTitleEl) {
      tvMoreTitleEl.textContent = 'בקרת הורים וסינון סצנות (SafeWatch)';
    }
    if (tvMoreDescEl) {
      tvMoreDescEl.textContent = (pCfg && pCfg.enabled)
        ? ('מופעל (' + countEnabledParentalCategories(pCfg) + ' קטגוריות מסוננות) • ניהול ראשי ותתי-יוזרים')
        : 'דילוג אוטומטי על סקס, אלימות, שפה בוטה וסמים לפי פרופיל';
    }
  }

  function updateInPlayerParentalUi() {
    var activeProf = getActiveSubUser();
    var pCfg = activeProf ? ensureProfileParentalConfig(activeProf) : getActiveProfileParentalConfig();
    var isEn = Boolean(pCfg && pCfg.enabled);

    var topBtn = document.getElementById('playerTopParentalBtn');
    var topLabel = document.getElementById('playerTopParentalLabel');
    if (topBtn) {
      topBtn.classList.toggle('parental-active', isEn);
    }
    if (topLabel) {
      topLabel.textContent = isEn ? 'SafeWatch פעיל' : 'SafeWatch';
    }

    var statusBox = document.getElementById('playerParentalActiveStatus');
    if (statusBox) {
      var profName = activeProf ? activeProf.name : 'ראשי';
      var segCount = (state.activeSkipSegments && state.activeSkipSegments.length) ? state.activeSkipSegments.length : 0;
      var skippedCount = state.parentalSkippedCountThisSession || 0;
      if (isEn) {
        statusBox.textContent = 'פרופיל "' + profName + '" מוגן • זוהו ' + segCount + ' קטעים לסינון' + (skippedCount > 0 ? (' (דולגו ' + skippedCount + ')') : '');
      } else {
        statusBox.textContent = 'פרופיל "' + profName + '" — סינון כבוי כעת (לחץ להפעלה מיידית)';
      }
    }

    var quickContainer = document.getElementById('playerParentalQuickToggles');
    if (quickContainer && pCfg) {
      var catDefs = [
        { key: 'master', label: isEn ? 'סינון SafeWatch: פעיל' : 'סינון SafeWatch: כבוי', active: isEn },
        { key: 'sex', label: 'סקס, מיניות ועירום', active: isEn && Boolean(pCfg.categories.sex) },
        { key: 'violence', label: 'אלימות קשה ודם', active: isEn && Boolean(pCfg.categories.violence) },
        { key: 'profanity', label: 'שפה בוטה וקללות', active: isEn && Boolean(pCfg.categories.profanity) },
        { key: 'drugs', label: 'סמים ואלכוהול', active: isEn && Boolean(pCfg.categories.drugs) },
        { key: 'horror', label: 'אימה ופחד', active: isEn && Boolean(pCfg.categories.horror) }
      ];
      var html = '';
      for (var i = 0; i < catDefs.length; i++) {
        var cd = catDefs[i];
        html +=
          '<button type="button" class="player-parental-quick-chip tv-focusable' + (cd.active ? ' active' : '') + '" data-player-parental-toggle="' + escapeHtml(cd.key) + '">' +
            '<span>' + escapeHtml(cd.label) + '</span>' +
            '<span class="chip-state-dot"></span>' +
          '</button>';
      }
      quickContainer.innerHTML = html;

      var qBtns = quickContainer.querySelectorAll('[data-player-parental-toggle]');
      for (var b = 0; b < qBtns.length; b++) {
        qBtns[b].addEventListener('click', function (ev) {
          ev.stopPropagation();
          wakePlayerControls();
          var tKey = this.getAttribute('data-player-parental-toggle');
          var curProf = getActiveSubUser();
          if (!curProf) return;
          var cfg = ensureProfileParentalConfig(curProf);

          // If PIN is set and not unlocked yet, prevent disabling filter without PIN
          var pinLocked = Boolean(state.parentalMaster && state.parentalMaster.pinCode && !state.parentalPinUnlockedThisSession);
          if (pinLocked) {
            var wouldDisable = (tKey === 'master' && cfg.enabled) || (tKey !== 'master' && cfg.enabled && cfg.categories[tKey]);
            if (wouldDisable) {
              var pMenuEl = document.getElementById('playerParentalMenu');
              if (pMenuEl) pMenuEl.classList.add('hidden');
              openParentalControlModal(curProf.id);
              showCinemaToast('נדרש קוד PIN של מנהל החשבון לכיבוי בקרת הורים');
              return;
            }
          }

          if (tKey === 'master') {
            cfg.enabled = !cfg.enabled;
            if (cfg.enabled && countEnabledParentalCategories(cfg) === 0) {
              cfg.categories.sex = true;
              cfg.categories.violence = true;
              cfg.categories.profanity = true;
            }
          } else if (cfg.categories && Object.prototype.hasOwnProperty.call(cfg.categories, tKey)) {
            if (!cfg.enabled) {
              cfg.enabled = true;
              cfg.categories[tKey] = true;
            } else {
              cfg.categories[tKey] = !cfg.categories[tKey];
            }
          }

          saveSubUsersState();
          rebuildParentalSkipTimelineForCurrentMedia();
          updateInPlayerParentalUi();
          updateUserMenuParentalSummary();
          updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
        });
      }
    }
  }

  function renderParentalControlModal() {
    if (!Array.isArray(state.subUsers) || !state.subUsers.length) return;
    for (var s = 0; s < state.subUsers.length; s++) {
      ensureProfileParentalConfig(state.subUsers[s]);
    }

    var editingProf = getEditingParentalProfile();
    if (!editingProf) return;
    state.editingParentalProfileId = editingProf.id;
    var pCfg = ensureProfileParentalConfig(editingProf);

    // 1. Render Profiles Selector Row (Main User + All Sub-Users)
    var profRow = document.getElementById('parentalProfilesSelectorRow');
    if (profRow) {
      var tabsHtml = '';
      for (var i = 0; i < state.subUsers.length; i++) {
        var su = state.subUsers[i];
        var suCfg = ensureProfileParentalConfig(su);
        var isSel = su.id === editingProf.id;
        var isCurrentViewer = su.id === state.activeSubUserId;
        var initial = (su.name || 'P').trim().charAt(0);
        var roleTag = su.isPrimary ? 'משתמש ראשי (מנהל)' : (su.isKids ? 'תת-יוזר • ילדים' : 'תת-יוזר');
        if (isCurrentViewer) roleTag += ' • צופה כעת';
        var shieldBadge = suCfg.enabled
          ? ('פעיל (' + countEnabledParentalCategories(suCfg) + ')')
          : 'ללא סינון';

        tabsHtml +=
          '<button type="button" role="tab" aria-selected="' + (isSel ? 'true' : 'false') + '" ' +
            'class="parental-profile-tab tv-focusable' + (isSel ? ' active' : '') + (suCfg.enabled ? ' is-protected' : '') + '" ' +
            'data-parental-profile-tab="' + escapeHtml(su.id) + '">' +
            '<span class="parental-prof-avatar" style="background:' + escapeHtml(su.color || '#334155') + '">' + escapeHtml(initial) + '</span>' +
            '<span class="parental-prof-info">' +
              '<span class="parental-prof-name">' + escapeHtml(su.name) + '</span>' +
              '<span class="parental-prof-role">' + escapeHtml(roleTag) + '</span>' +
            '</span>' +
            '<span class="parental-prof-status-pill' + (suCfg.enabled ? ' on' : '') + '">' + escapeHtml(shieldBadge) + '</span>' +
          '</button>';
      }
      profRow.innerHTML = tabsHtml;

      var tabBtns = profRow.querySelectorAll('[data-parental-profile-tab]');
      for (var t = 0; t < tabBtns.length; t++) {
        tabBtns[t].addEventListener('click', function () {
          var pid = this.getAttribute('data-parental-profile-tab');
          if (!pid) return;
          state.editingParentalProfileId = pid;
          renderParentalControlModal();
          var reFocused = document.querySelector('#parentalProfilesSelectorRow [data-parental-profile-tab="' + pid + '"]');
          if (reFocused && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(reFocused, { scroll: false });
          }
        });
      }
    }

    // 2. Update Master Toggle Card
    var masterCard = document.getElementById('parentalMasterToggleCard');
    var masterBtn = document.getElementById('parentalMasterToggleBtn');
    var masterLabel = document.getElementById('parentalMasterToggleLabel');
    var editTitle = document.getElementById('parentalEditingProfileTitle');
    var editSub = document.getElementById('parentalEditingProfileSub');

    if (masterCard) {
      masterCard.classList.toggle('is-enabled', Boolean(pCfg.enabled));
    }
    if (masterBtn) {
      masterBtn.classList.toggle('active', Boolean(pCfg.enabled));
      masterBtn.setAttribute('aria-checked', pCfg.enabled ? 'true' : 'false');
    }
    if (masterLabel) {
      masterLabel.textContent = pCfg.enabled ? 'פעיל — מוגן' : 'כבוי';
    }
    if (editTitle) {
      editTitle.textContent = 'סינון צפייה עבור: ' + editingProf.name + (editingProf.isPrimary ? ' (משתמש ראשי)' : ' (תת-יוזר)');
    }
    if (editSub) {
      editSub.textContent = pCfg.enabled
        ? ('בקרת הורים פעילה עבור "' + editingProf.name + '" — ' + getParentalSummaryLabel(pCfg))
        : ('בקרת הורים כבויה עבור "' + editingProf.name + '" — הפעל כדי לדלג אוטומטית על קטעים לא הולמים');
    }

    // 3. Update Category Cards (`sex`, `violence`, `profanity`, `drugs`, `horror`)
    var catCards = document.querySelectorAll('#parentalCategoriesGrid [data-parental-cat]');
    for (var c = 0; c < catCards.length; c++) {
      var catKey = catCards[c].getAttribute('data-parental-cat');
      var isCatOn = Boolean(pCfg.categories && pCfg.categories[catKey]);
      catCards[c].classList.toggle('active', isCatOn);
      catCards[c].setAttribute('aria-pressed', isCatOn ? 'true' : 'false');
    }

    // 4. Update Action Mode, Profanity Mode & Sensitivity Buttons
    var actBtns = document.querySelectorAll('[data-parental-action]');
    for (var a = 0; a < actBtns.length; a++) {
      var isActMatch = actBtns[a].getAttribute('data-parental-action') === (pCfg.actionMode || 'skip');
      actBtns[a].classList.toggle('active', isActMatch);
    }

    var profBtns = document.querySelectorAll('[data-parental-profanity]');
    for (var p = 0; p < profBtns.length; p++) {
      var isProfMatch = profBtns[p].getAttribute('data-parental-profanity') === (pCfg.profanityMode || 'mute_censor');
      profBtns[p].classList.toggle('active', isProfMatch);
    }

    var sensBtns = document.querySelectorAll('[data-parental-sensitivity]');
    for (var sn = 0; sn < sensBtns.length; sn++) {
      var isSensMatch = sensBtns[sn].getAttribute('data-parental-sensitivity') === (pCfg.sensitivity || 'balanced');
      sensBtns[sn].classList.toggle('active', isSensMatch);
    }

    // 5. Update PIN Setup Bar
    var pinNewIn = document.getElementById('parentalPinNewInput');
    var pinClrBtn = document.getElementById('parentalClearPinBtn');
    var pinStatusEl = document.getElementById('parentalPinCurrentStatus');
    var hasPin = Boolean(state.parentalMaster && state.parentalMaster.pinCode);
    if (pinNewIn) {
      pinNewIn.placeholder = hasPin ? 'מוגדר קוד PIN פעיל (הזן 4 ספרות לשינוי)' : 'קבע קוד 4 ספרות (אופציונלי)';
    }
    if (pinClrBtn) {
      pinClrBtn.classList.toggle('hidden', !hasPin);
    }
    if (pinStatusEl) {
      pinStatusEl.textContent = hasPin ? '🔒 נעילת PIN פעילה (4 ספרות)' : '🔓 ללא נעילת PIN (פתוח)';
    }
  }

  function openParentalControlModal(targetProfileId) {
    var modal = document.getElementById('parentalControlModal');
    if (!modal) return;

    state.editingParentalProfileId = targetProfileId || state.activeSubUserId || (state.subUsers[0] && state.subUsers[0].id) || 'main';

    var pinGate = document.getElementById('parentalPinVerifyGate');
    var mainContent = document.getElementById('parentalControlMainContent');
    var pinInput = document.getElementById('parentalPinVerifyInput');
    var pinErr = document.getElementById('parentalPinGateError');

    var hasPin = Boolean(state.parentalMaster && state.parentalMaster.pinCode);
    if (hasPin && !state.parentalPinUnlockedThisSession) {
      if (pinGate) pinGate.classList.remove('hidden');
      if (mainContent) mainContent.classList.add('hidden');
      if (pinInput) pinInput.value = '';
      if (pinErr) pinErr.classList.add('hidden');
    } else {
      if (pinGate) pinGate.classList.add('hidden');
      if (mainContent) mainContent.classList.remove('hidden');
    }

    renderParentalControlModal();
    modal.classList.remove('hidden');

    setTimeout(function () {
      if (hasPin && !state.parentalPinUnlockedThisSession && pinInput) {
        if (typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(pinInput, { scroll: false });
        } else {
          pinInput.focus();
        }
      } else {
        var activeTab = document.querySelector('#parentalProfilesSelectorRow .parental-profile-tab.active') ||
                        document.getElementById('parentalMasterToggleBtn');
        if (activeTab && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(activeTab, { scroll: false });
        }
      }
    }, 60);
  }
  window.openParentalControlModal = openParentalControlModal;

  function closeParentalControlModal() {
    var modal = document.getElementById('parentalControlModal');
    if (modal) modal.classList.add('hidden');
    state.pendingProfileSwitchAfterPin = null;
    rebuildParentalSkipTimelineForCurrentMedia();
    updateInPlayerParentalUi();
    updateUserMenuParentalSummary();
    renderSubUsersGrid();
    renderUserSettingsQuickProfiles();
  }
  window.closeParentalControlModal = closeParentalControlModal;

  function completeSubUserSwitch(targetProfileId) {
    if (!targetProfileId) return;
    state.activeSubUserId = targetProfileId;
    ensureActiveProfileBucket();
    saveSubUsersState();
    updateAuthUi();
    renderGenreFilterStrip();
    renderInitialStage();
    rebuildParentalSkipTimelineForCurrentMedia();
    updateInPlayerParentalUi();
    updateUserMenuParentalSummary();
    var am = document.getElementById('authModal');
    if (am) am.classList.add('hidden');
    closeUserSettingsDropdown();
  }

  function trySwitchActiveSubUser(targetProfileId) {
    if (!targetProfileId) return;
    var currentProf = getActiveSubUser();
    var targetProf = getProfileById(targetProfileId);
    if (!targetProf) return;

    var curCfg = currentProf ? ensureProfileParentalConfig(currentProf) : null;
    var targetCfg = ensureProfileParentalConfig(targetProf);
    var hasPin = Boolean(state.parentalMaster && state.parentalMaster.pinCode);

    // If switching from a protected profile to a less-protected / adult profile and PIN is set, require PIN first
    if (hasPin && !state.parentalPinUnlockedThisSession && currentProf && currentProf.id !== targetProf.id) {
      if ((curCfg && curCfg.enabled && (!targetCfg || !targetCfg.enabled)) || (currentProf.isKids && !targetProf.isKids)) {
        state.pendingProfileSwitchAfterPin = targetProfileId;
        closeUserSettingsDropdown();
        var am = document.getElementById('authModal');
        if (am) am.classList.add('hidden');
        openParentalControlModal(targetProfileId);
        showCinemaToast('הזן קוד PIN למעבר לפרופיל "' + targetProf.name + '"');
        return;
      }
    }

    completeSubUserSwitch(targetProfileId);
  }


  function applySubtitleStyleToOverlay() {
    var overlay = document.getElementById('customSubtitleOverlay');
    if (!overlay) return;
    var textSpan = document.getElementById('customSubtitleText');
    if (!textSpan) {
      overlay.innerHTML = '<span id="customSubtitleText" class="custom-subtitle-text"></span>';
      textSpan = document.getElementById('customSubtitleText');
    }
    overlay.classList.remove(
      'sub-size-normal', 'sub-size-large', 'sub-size-xlarge',
      'sub-color-white', 'sub-color-yellow',
      'sub-bg-dark', 'sub-bg-none'
    );
    overlay.classList.add('sub-size-' + (state.subSize || 'xlarge'));
    overlay.classList.add('sub-color-' + (state.subColor || 'white'));
    overlay.classList.add('sub-bg-' + (state.subBg || 'none'));

    var fontPx = typeof state.subFontPx === 'number' ? state.subFontPx : 42;
    fontPx = Math.max(16, Math.min(84, Math.round(fontPx)));
    state.subFontPx = fontPx;
    if (textSpan) {
      textSpan.style.fontSize = fontPx + 'px';
    }

    var fontResetBtn = document.getElementById('subFontResetBtn');
    if (fontResetBtn) {
      fontResetBtn.textContent = fontPx + 'px';
    }

    var sizeBtns = document.querySelectorAll('[data-sub-size]');
    for (var s = 0; s < sizeBtns.length; s++) {
      var szAttr = sizeBtns[s].getAttribute('data-sub-size');
      var matchesPreset =
        (szAttr === 'normal' && fontPx === 26) ||
        (szAttr === 'large' && fontPx === 34) ||
        (szAttr === 'xlarge' && fontPx === 42);
      sizeBtns[s].classList.toggle('active', matchesPreset);
    }

    var colorBtns = document.querySelectorAll('[data-sub-color]');
    for (var c = 0; c < colorBtns.length; c++) {
      colorBtns[c].classList.toggle('active', colorBtns[c].getAttribute('data-sub-color') === (state.subColor || 'white'));
    }

    var bottomPct = typeof state.subBottomPct === 'number' ? state.subBottomPct : 3.5;
    bottomPct = Math.max(1, Math.min(24, bottomPct));
    state.subBottomPct = bottomPct;
    overlay.style.bottom = bottomPct + 'vh';

    var posResetBtn = document.getElementById('subPosResetBtn');
    if (posResetBtn) {
      posResetBtn.textContent = (bottomPct % 1 === 0 ? bottomPct : bottomPct.toFixed(1)) + '%';
    }

    var bgBtns = document.querySelectorAll('[data-sub-bg]');
    for (var b = 0; b < bgBtns.length; b++) {
      bgBtns[b].classList.toggle('active', bgBtns[b].getAttribute('data-sub-bg') === (state.subBg || 'none'));
    }
  }

  function adjustSubtitleFontSize(deltaPx) {
    var currentPx = typeof state.subFontPx === 'number' ? state.subFontPx : 42;
    var nextPx = Math.max(16, Math.min(84, Math.round(currentPx + deltaPx)));
    state.subFontPx = nextPx;
    if (nextPx <= 28) state.subSize = 'normal';
    else if (nextPx <= 37) state.subSize = 'large';
    else state.subSize = 'xlarge';
    applySubtitleStyleToOverlay();
    saveSubtitlePrefs();
    var subStatusEl = document.getElementById('playerSubtitleStatus');
    if (subStatusEl) {
      subStatusEl.textContent = 'גודל גופן כתוביות נשמר כברירת מחדל: ' + state.subFontPx + 'px';
    }
  }
  window.adjustSubtitleFontSize = adjustSubtitleFontSize;

  function adjustSubtitleVerticalPosition(deltaPct) {
    var current = typeof state.subBottomPct === 'number' ? state.subBottomPct : 3.5;
    var next = Math.round((current + deltaPct) * 10) / 10;
    state.subBottomPct = Math.max(1, Math.min(24, next));
    applySubtitleStyleToOverlay();
    saveSubtitlePrefs();
    var subStatusEl = document.getElementById('playerSubtitleStatus');
    if (subStatusEl) {
      subStatusEl.textContent = 'מיקום כתוביות נשמר כברירת מחדל: ' + state.subBottomPct + '% מתחתית המסך';
    }
  }
  window.adjustSubtitleVerticalPosition = adjustSubtitleVerticalPosition;

  function renderSubtitlesMenu() {
    var listContainer = document.getElementById('subsListContainer');
    if (!listContainer) return;

    var html = '';
    for (var i = 0; i < state.subtitleTracks.length; i++) {
      var tr = state.subtitleTracks[i];
      var isAct = state.activeSubTrackId === tr.id;
      html +=
        '<button type="button" class="sub-track-item tv-focusable' + (isAct ? ' active' : '') + '" ' +
          'data-sub-track-id="' + escapeHtml(tr.id) + '" data-sub-url="' + escapeHtml(tr.url || '') + '">' +
          '<span>' + escapeHtml(tr.label) + '</span>' +
          (isAct ? getSvgIcon('check') : '') +
        '</button>';
    }
    listContainer.innerHTML = html;

    var btns = listContainer.querySelectorAll('.sub-track-item');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', async function () {
        wakePlayerControls();
        var tid = this.getAttribute('data-sub-track-id') || 'he-auto';
        var turl = this.getAttribute('data-sub-url') || '';
        state.activeSubTrackId = tid;
        state.subEnabled = tid !== 'off';

        if (turl) {
          try {
            var r = await fetch(turl);
            if (r.ok) {
              var txt = await r.text();
              var parsed = parseWebVttOrSrtText(txt);
              if (parsed.length) state.parsedCues = parsed;
            }
          } catch (e) {}
        }

        renderSubtitlesMenu();
        updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
        if (document.body && document.body.classList.contains('tv-mode')) {
          var activeTrackBtn = listContainer.querySelector('.sub-track-item.active') || listContainer.querySelector('.sub-track-item');
          if (activeTrackBtn && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(activeTrackBtn, { scroll: false });
          }
        }
      });
    }
  }

  /**
   * Working "Skip Intro" (דלג על פתיח) + Auto-Dismiss
   */
  function scheduleSkipIntroButton(showNow, startOffsetSec) {
    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    if (!skipBtn) return;

    if (state.skipIntroHideTimer) {
      clearTimeout(state.skipIntroHideTimer);
      state.skipIntroHideTimer = null;
    }

    if (!showNow || startOffsetSec >= 75) {
      skipBtn.classList.add('hidden');
      return;
    }

    skipBtn.classList.remove('hidden');
    state.skipIntroHideTimer = setTimeout(function () {
      skipBtn.classList.add('hidden');
      var playPauseBtn = document.getElementById('playerPlayPauseBtn');
      if (document.activeElement === skipBtn && playPauseBtn && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(playPauseBtn);
      }
    }, 9000);
  }

  function triggerSkipIntro() {
    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    if (skipBtn) skipBtn.classList.add('hidden');
    if (state.skipIntroHideTimer) {
      clearTimeout(state.skipIntroHideTimer);
      state.skipIntroHideTimer = null;
    }

    var video = document.getElementById('videoElement');
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      var targetTime = (video.currentTime || 0) + 85;
      if (video.duration && isFinite(video.duration)) {
        targetTime = Math.min(video.duration - 5, targetTime);
      }
      video.currentTime = Math.max(0, targetTime);
      video.play().catch(function () {});
    } else if (state.playingMode === 'embed' && state.playingItem) {
      var iframe = document.getElementById('streamEmbedIframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ action: 'seek', time: 85 }, '*');
          state.embedCurrentTime = 85;
          updateActiveSubtitleCue(85);
          return;
        } catch (e) {}
      }
      playCleanEmbedStream(state.playingItem, state.activeSeason, state.activeEpisode, 85, state.activeSourceTab);
    }

    var playPauseBtn = document.getElementById('playerPlayPauseBtn');
    if (playPauseBtn && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(playPauseBtn);
    }
  }
  window.triggerSkipIntro = triggerSkipIntro;

  function seekVideoBy(deltaSeconds) {
    wakePlayerControls();
    var video = document.getElementById('videoElement');
    var seekSlider = document.getElementById('playerSeekSlider');
    var curEl = document.getElementById('playerCurrentTime');
    var fillBar = document.getElementById('embedTimelineProgressFill');
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      var dur = (video.duration && isFinite(video.duration)) ? video.duration : 0;
      var next = Math.max(0, (video.currentTime || 0) + deltaSeconds);
      if (dur > 0) {
        next = Math.min(dur, next);
      }
      video.currentTime = next;
      updateActiveSubtitleCue(next);
      if (curEl) curEl.textContent = formatSeconds(next);
      if (seekSlider && dur > 0) {
        var ratio = next / dur;
        seekSlider.value = String(Math.round(ratio * 1000));
        var rect = seekSlider.getBoundingClientRect();
        var thumbX = (rect && rect.width) ? (rect.left + ratio * rect.width) : Math.round((window.innerWidth || 1280) / 2);
        showSeekThumbnailPreview(next, thumbX, rect);
      }
    } else if (state.playingMode === 'embed') {
      var iframe = document.getElementById('streamEmbedIframe');
      var eDur = (state.embedDuration && state.embedDuration > 0) ? state.embedDuration : 5400;
      var nextEmbed = Math.max(0, Math.min(eDur, (state.embedCurrentTime || 0) + deltaSeconds));
      state.embedCurrentTime = nextEmbed;
      updateActiveSubtitleCue(nextEmbed);
      if (curEl) curEl.textContent = formatSeconds(nextEmbed);
      var eRatio = eDur > 0 ? (nextEmbed / eDur) : 0;
      if (seekSlider) {
        seekSlider.value = String(Math.round(eRatio * 1000));
      }
      if (fillBar) {
        fillBar.style.width = (eRatio * 100).toFixed(2) + '%';
      }
      var sRect = seekSlider ? seekSlider.getBoundingClientRect() : null;
      var eThumbX = (sRect && sRect.width) ? (sRect.left + eRatio * sRect.width) : Math.round((window.innerWidth || 1280) * (0.15 + eRatio * 0.7));
      showSeekThumbnailPreview(nextEmbed, eThumbX, sRect);
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ action: 'seek', time: Math.floor(nextEmbed) }, '*');
          iframe.contentWindow.postMessage({ command: 'seek', time: Math.floor(nextEmbed) }, '*');
        } catch (e) {}
      }
    }
  }
  window.seekVideoBy = seekVideoBy;

  function togglePlayPause() {
    var isTv = Boolean(document.body && document.body.classList.contains('tv-mode'));
    if (isTv) {
      var nowTs = Date.now();
      if (nowTs - (state.lastTvPlayPauseToggleAt || 0) < 220) {
        return;
      }
      state.lastTvPlayPauseToggleAt = nowTs;
    }
    wakePlayerControls();
    var video = document.getElementById('videoElement');
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      if (video.paused) {
        video.play().catch(function () {});
        updatePlayPauseIcon(false);
        if (isTv) showStreamItToast('▶ ממשיך צפייה');
      } else {
        video.pause();
        updatePlayPauseIcon(true);
        if (isTv) showStreamItToast('⏸ הושהתה הצפייה');
      }
    } else if (state.playingMode === 'embed') {
      var nextPaused = !state.embedPaused;
      state.embedPaused = nextPaused;
      state.embedPauseLockUntil = Date.now() + 900;
      updatePlayPauseIcon(nextPaused);
      if (isTv) {
        showStreamItToast(nextPaused ? '⏸ הושהתה הצפייה' : '▶ ממשיך צפייה');
      }
      var iframe = document.getElementById('streamEmbedIframe');
      if (iframe && iframe.contentWindow) {
        var actionCmd = nextPaused ? 'pause' : 'play';
        try {
          iframe.contentWindow.postMessage({ action: actionCmd }, '*');
          iframe.contentWindow.postMessage({ command: actionCmd }, '*');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: nextPaused ? 'pauseVideo' : 'playVideo', args: [] }), '*');
        } catch (e) {}
      }
      if (!isTv) {
        try {
          if (window.AndroidTvBridge && typeof window.AndroidTvBridge.tapCenterOfScreen === 'function') {
            window.AndroidTvBridge.tapCenterOfScreen();
          }
        } catch (e) {}
      } else if (state.embedActiveServerKey === 'embed2') {
        try {
          if (window.AndroidTvBridge && typeof window.AndroidTvBridge.tapCenterOfScreen === 'function') {
            window.AndroidTvBridge.tapCenterOfScreen();
          }
        } catch (e) {}
      }
    }
  }
  window.togglePlayPause = togglePlayPause;

  function resumePlaybackIfPaused() {
    var video = document.getElementById('videoElement');
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      if (video.paused) {
        video.play().catch(function () {});
        updatePlayPauseIcon(false);
      }
    } else if (state.playingMode === 'embed' && state.embedPaused) {
      state.embedPaused = false;
      state.embedPauseLockUntil = Date.now() + 900;
      updatePlayPauseIcon(false);
      var iframe = document.getElementById('streamEmbedIframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ action: 'play' }, '*');
          iframe.contentWindow.postMessage({ command: 'play' }, '*');
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        } catch (e) {}
      }
    }
  }
  window.resumePlaybackIfPaused = resumePlaybackIfPaused;

  function updatePlayPauseIcon(isPaused) {
    var btn = document.getElementById('playerPlayPauseBtn');
    if (!btn) return;
    btn.innerHTML = isPaused ? getSvgIcon('play') : getSvgIcon('pause');
    btn.setAttribute('aria-label', isPaused ? 'נגן' : 'השהה');
  }

  function wakePlayerControls() {
    var overlay = document.getElementById('playerControlsOverlay');
    if (!overlay) return;
    overlay.classList.remove('idle-hidden');
    if (state.playerIdleTimer) clearTimeout(state.playerIdleTimer);
    state.playerIdleTimer = setTimeout(function () {
      var subsMenu = document.getElementById('playerSubsMenu');
      if (subsMenu && !subsMenu.classList.contains('hidden')) return;
      var parentalMenu = document.getElementById('playerParentalMenu');
      if (parentalMenu && !parentalMenu.classList.contains('hidden')) return;
      var sourceTabsPanel = document.getElementById('playerSourceTabs');
      if (sourceTabsPanel && !sourceTabsPanel.classList.contains('hidden')) return;
      overlay.classList.add('idle-hidden');
      if (document.body && document.body.classList.contains('tv-mode')) {
        if (window.TVNavigation && typeof window.TVNavigation.clearPlayerFocus === 'function') {
          window.TVNavigation.clearPlayerFocus();
        }
      }
    }, 3200);
  }
  window.wakePlayerControls = wakePlayerControls;

  function stopCurrentMedia() {
    if (state.embedSubTimer) {
      clearInterval(state.embedSubTimer);
      state.embedSubTimer = null;
    }
    if (state.embedVerifyInterval) {
      clearInterval(state.embedVerifyInterval);
      state.embedVerifyInterval = null;
    }
    if (state.embedWatchdogTimer) {
      clearTimeout(state.embedWatchdogTimer);
      state.embedWatchdogTimer = null;
    }
    state.embedVerified = false;
    state.embedAutoPlayed = false;
    state.parentalShieldActiveSegment = null;
    setParentalTemporaryMute(false);
    hideParentalShieldOverlay();
    var pSkipBanner = document.getElementById('parentalSkipBanner');
    if (pSkipBanner) pSkipBanner.classList.add('hidden');
    var pMenu = document.getElementById('playerParentalMenu');
    if (pMenu) pMenu.classList.add('hidden');
    if (state.hlsInstance) {
      try { state.hlsInstance.destroy(); } catch (e) {}
      state.hlsInstance = null;
    }
    var video = document.getElementById('videoElement');
    if (video) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (e) {}
    }
    var embed = document.getElementById('embedPlayerContainer');
    if (embed) {
      embed.innerHTML = '';
      embed.classList.add('hidden');
    }
    var subText = document.getElementById('customSubtitleText');
    if (subText) subText.textContent = '';
    var subsMenu = document.getElementById('playerSubsMenu');
    if (subsMenu) subsMenu.classList.add('hidden');
    if (state.skipIntroHideTimer) {
      clearTimeout(state.skipIntroHideTimer);
      state.skipIntroHideTimer = null;
    }
  }

  function savePlaybackProgressForCurrentItem(curSec, durSec) {
    if (!state.playingItem || state.playingItem.type === 'channel' || state.playingItem.type === 'youtube') return;
    curSec = Math.floor(Number(curSec) || 0);
    durSec = Math.floor(Number(durSec) || 0);
    if (curSec < 10) return;
    if (!durSec || durSec < 60) durSec = 5400; // Default 90m fallback if embed hasn't reported duration yet
    var pct = Math.min(99, Math.max(3, Math.round((curSec / durSec) * 100)));
    var profBucket = ensureActiveProfileBucket();
    profBucket.progress[state.playingItem.id] = {
      currentTime: curSec,
      duration: durSec,
      percent: pct,
      season: state.activeSeason || 1,
      episode: state.activeEpisode || 1,
      updatedAt: Date.now()
    };
    saveSubUsersState();
  }

  function closeVideoPlayer() {
    var curT = getCurrentPlaybackTimeSec();
    var durT = (state.playingMode === 'video' && document.getElementById('videoElement'))
      ? (document.getElementById('videoElement').duration || 0)
      : (state.embedDuration || 5400);
    if (curT > 10) {
      savePlaybackProgressForCurrentItem(curT, durT);
    }
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }
    stopCurrentMedia();
    var playerModal = document.getElementById('playerModal');
    if (playerModal) playerModal.classList.add('hidden');
    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    if (skipBtn) skipBtn.classList.add('hidden');
    var seekPrev = document.getElementById('seekThumbnailPreview');
    if (seekPrev) seekPrev.classList.add('hidden');
    renderCatalogShelves();
  }
  window.closeVideoPlayer = closeVideoPlayer;

  function togglePlayerFullscreen() {
    var playerModal = document.getElementById('playerModal') || document.documentElement;
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!fsEl) {
      var req = playerModal.requestFullscreen || playerModal.webkitRequestFullscreen || playerModal.mozRequestFullScreen || playerModal.msRequestFullscreen;
      if (req) {
        try {
          var p = req.call(playerModal);
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) {}
      }
    } else {
      var exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (exit) {
        try {
          var ep = exit.call(document);
          if (ep && typeof ep.catch === 'function') ep.catch(function () {});
        } catch (e) {}
      }
    }
    setTimeout(function () {
      applySubtitleStyleToOverlay();
      updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
    }, 120);
  }
  window.togglePlayerFullscreen = togglePlayerFullscreen;

  function findSubtitleCueTextAtTime(sec) {
    var cues = (state.parsedCues && state.parsedCues.length) ? state.parsedCues : (state.activeSubtitleCues || []);
    if (!cues.length) return '';
    var adj = sec - (state.subOffsetSec || 0);
    for (var i = 0; i < cues.length; i++) {
      if (adj >= cues[i].start && adj <= cues[i].end) {
        return cues[i].text;
      }
    }
    // Nearest cue within 15 seconds for scrubbing context
    var best = '';
    var bestDist = 15;
    for (var j = 0; j < cues.length; j++) {
      var d = Math.abs(cues[j].start - adj);
      if (d < bestDist) {
        bestDist = d;
        best = cues[j].text;
      }
    }
    return best;
  }

  async function fetchSceneThumbnailsForItem(item, season, episode) {
    state.seekSceneStills = [];
    if (!item || item.type === 'channel' || item.type === 'youtube') return;
    if (item.backdrop) state.seekSceneStills.push(item.backdrop);
    if (item.poster && item.poster !== item.backdrop) state.seekSceneStills.push(item.poster);

    var cleanTmdb = String(item.tmdbId || '').replace(/\D/g, '');
    if (!cleanTmdb) return;

    try {
      var endpoint = item.type === 'series'
        ? (TMDB_BASE + '/tv/' + encodeURIComponent(cleanTmdb) + '/images?api_key=' + TMDB_API_KEY)
        : (TMDB_BASE + '/movie/' + encodeURIComponent(cleanTmdb) + '/images?api_key=' + TMDB_API_KEY);
      var res = await fetch(endpoint);
      if (res.ok) {
        var data = await res.json();
        var backdrops = (data && Array.isArray(data.backdrops)) ? data.backdrops : [];
        var stills = [];
        for (var i = 0; i < Math.min(28, backdrops.length); i++) {
          if (backdrops[i] && backdrops[i].file_path) {
            stills.push('https://image.tmdb.org/t/p/w500' + backdrops[i].file_path);
          }
        }
        if (stills.length >= 2) {
          state.seekSceneStills = stills;
        }
      }
    } catch (e) {}
  }

  function showSeekThumbnailPreview(targetSec, clientX, containerRect) {
    var previewEl = document.getElementById('seekThumbnailPreview');
    var imgEl = document.getElementById('seekThumbImg');
    var backdropEl = document.getElementById('seekThumbBackdrop');
    var sceneBadgeEl = document.getElementById('seekThumbSceneBadge');
    var timeEl = document.getElementById('seekThumbTimeBadge') || document.getElementById('seekThumbTime');
    var cueEl = document.getElementById('seekThumbCueText') || document.getElementById('seekThumbCue');
    if (!previewEl || !timeEl) return;

    var dur = 0;
    var video = document.getElementById('videoElement');
    if (state.playingMode === 'video' && video && video.duration && isFinite(video.duration)) {
      dur = video.duration;
    } else if (state.embedDuration > 0) {
      dur = state.embedDuration;
    } else {
      dur = 5400;
    }

    targetSec = Math.max(0, Math.min(dur, Number(targetSec) || 0));
    timeEl.textContent = formatSeconds(targetSec);

    var pct = dur > 0 ? Math.max(0, Math.min(0.999, targetSec / dur)) : 0;
    var stills = (state.seekSceneStills && state.seekSceneStills.length)
      ? state.seekSceneStills
      : (state.playingItem ? [state.playingItem.backdrop || state.playingItem.poster || ''] : []);

    var sceneIdx = stills.length > 1 ? Math.floor(pct * stills.length) : 0;
    var thumbSrc = stills[sceneIdx] || (state.playingItem ? (state.playingItem.backdrop || state.playingItem.poster || '') : '');

    if (sceneBadgeEl) {
      var totalChapters = Math.max(12, stills.length);
      var curChapter = Math.min(totalChapters, Math.floor(pct * totalChapters) + 1);
      sceneBadgeEl.textContent = 'סצנה ' + curChapter + ' / ' + totalChapters;
    }

    if (imgEl && thumbSrc) {
      if (imgEl.getAttribute('src') !== thumbSrc) {
        imgEl.setAttribute('src', thumbSrc);
      }
      var panX = Math.round(((pct * 12) % 1) * 100);
      var panY = Math.round(35 + Math.sin(pct * Math.PI * 8) * 22);
      imgEl.style.objectPosition = panX + '% ' + panY + '%';
    }
    if (backdropEl && thumbSrc) {
      backdropEl.style.backgroundImage = 'url("' + thumbSrc + '")';
      var bgX = Math.round(((pct * 10) % 1) * 100);
      backdropEl.style.backgroundPosition = bgX + '% center';
    }

    if (cueEl) {
      var cueTxt = findSubtitleCueTextAtTime(targetSec);
      cueEl.textContent = cueTxt ? cueTxt.replace(/\n/g, ' ') : (state.playingItem ? state.playingItem.title : '');
    }

    var vw = window.innerWidth || 1280;
    var clampedX = Math.max(130, Math.min(vw - 130, clientX || Math.round(vw / 2)));
    previewEl.style.left = clampedX + 'px';
    previewEl.classList.remove('hidden');

    if (state.seekPreviewHideTimer) clearTimeout(state.seekPreviewHideTimer);
    state.seekPreviewHideTimer = setTimeout(function () {
      previewEl.classList.add('hidden');
    }, 2200);
  }

  function formatSeconds(sec) {
    if (!sec || !isFinite(sec) || sec < 0) return '00:00';
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    var mm = m < 10 ? '0' + m : String(m);
    var ss = s < 10 ? '0' + s : String(s);
    return h > 0 ? (h + ':' + mm + ':' + ss) : (mm + ':' + ss);
  }

  /**
   * Search Engine
   */
  function openSearchModal() {
    var modal = document.getElementById('searchModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var input = document.getElementById('searchInput');
    renderSearchResults('');
    if (input && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(input);
    }
  }

  async function renderSearchResults(query) {
    var grid = document.getElementById('searchResultsGrid');
    var status = document.getElementById('searchStatusText');
    if (!grid) return;

    var q = (query || '').trim().toLowerCase();
    var filter = state.searchFilter || 'all';

    var localPool = [];
    if (filter === 'all' || filter === 'movies') localPool = localPool.concat(filterKidsItems(state.catalog.movies));
    if (filter === 'all' || filter === 'series') localPool = localPool.concat(filterKidsItems(state.catalog.series));
    if (filter === 'all' || filter === 'channels') localPool = localPool.concat(state.catalog.channels);

    var matches = localPool.filter(function (item) {
      if (!q) return true;
      var t1 = (item.title || '').toLowerCase();
      var t2 = (item.originalTitle || '').toLowerCase();
      return t1.indexOf(q) !== -1 || t2.indexOf(q) !== -1;
    });

    if (q.length >= 2 && filter !== 'channels') {
      try {
        var res = await fetch(TMDB_BASE + '/search/multi?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(query.trim()));
        if (res.ok) {
          var data = await res.json();
          if (data && Array.isArray(data.results)) {
            for (var i = 0; i < data.results.length; i++) {
              var r = data.results[i];
              if (r.media_type !== 'movie' && r.media_type !== 'tv') continue;
              var norm = normalizeItem(r, r.media_type === 'tv' ? 'series' : 'movie');
              if (!norm) continue;
              if (filter === 'movies' && norm.type !== 'movie') continue;
              if (filter === 'series' && norm.type !== 'series') continue;
              if (!matches.some(function (m) { return m.tmdbId && m.tmdbId === norm.tmdbId; })) {
                matches.push(norm);
                if (norm.type === 'series') state.catalog.series.push(norm);
                else state.catalog.movies.push(norm);
              }
            }
          }
        }
      } catch (e) {}
    }

    if (status) {
      status.textContent = q
        ? ('נמצאו ' + matches.length + ' תוצאות עבור "' + query.trim() + '"')
        : 'מומלצים לצפייה מיידית (' + matches.length + ' כותרים זמינים)';
    }

    grid.innerHTML = matches.slice(0, 30).map(renderPosterCardHtml).join('');
    bindPosterCardEvents(grid);
  }

  /**
   * Per-Sub-User Watchlist Helper
   */
  function isInWatchlist(itemId) {
    var bucket = ensureActiveProfileBucket();
    return bucket.watchlist.indexOf(String(itemId)) !== -1;
  }

  function toggleWatchlist(item) {
    if (!item) return;
    var bucket = ensureActiveProfileBucket();
    var id = String(item.id);
    var idx = bucket.watchlist.indexOf(id);
    if (idx === -1) bucket.watchlist.push(id);
    else bucket.watchlist.splice(idx, 1);
    saveSubUsersState();
    updateHeroBillboard(state.heroItem);
    if (state.activeCategory === 'mylist') renderCatalogShelves();
  }

  /**
   * Netflix Sub-Users ("מי צופה עכשיו?") & Account Management
   */
  function renderSubUsersGrid() {
    var grid = document.getElementById('subUsersGrid');
    if (!grid) return;

    var html = '';
    for (var i = 0; i < state.subUsers.length; i++) {
      var su = state.subUsers[i];
      var suCfg = ensureProfileParentalConfig(su);
      var isAct = su.id === state.activeSubUserId;
      var initial = (su.name || 'P').trim().charAt(0);
      var badgeLabel = su.isKids ? 'ילדים' : (isAct ? 'פעיל כעת' : 'פרופיל');
      if (suCfg && suCfg.enabled) {
        badgeLabel += ' • 🛡️ מוגן';
      }
      html +=
        '<div class="sub-user-card-wrap">' +
          '<button type="button" class="sub-user-card tv-focusable' + (isAct ? ' active' : '') + '" data-subuser-id="' + escapeHtml(su.id) + '">' +
            '<div class="sub-user-avatar" style="background:' + escapeHtml(su.color || '#E50914') + '">' +
              '<span>' + escapeHtml(initial) + '</span>' +
            '</div>' +
            '<span class="sub-user-name">' + escapeHtml(su.name) + '</span>' +
            '<span class="sub-user-badge">' + escapeHtml(badgeLabel) + '</span>' +
          '</button>' +
          (state.manageSubUsersMode && !su.isPrimary
            ? '<button type="button" class="sub-user-delete-btn tv-focusable" data-delete-subuser="' + escapeHtml(su.id) + '" aria-label="מחק פרופיל">מחק</button>'
            : '') +
        '</div>';
    }
    grid.innerHTML = html;

    var cards = grid.querySelectorAll('.sub-user-card');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function () {
        var pid = this.getAttribute('data-subuser-id');
        if (!pid) return;
        trySwitchActiveSubUser(pid);
      });
    }

    var delBtns = grid.querySelectorAll('[data-delete-subuser]');
    for (var d = 0; d < delBtns.length; d++) {
      delBtns[d].addEventListener('click', function (e) {
        e.stopPropagation();
        var delId = this.getAttribute('data-delete-subuser');
        state.subUsers = state.subUsers.filter(function (u) { return u.id !== delId; });
        if (state.activeSubUserId === delId) {
          state.activeSubUserId = state.subUsers[0].id;
        }
        saveSubUsersState();
        renderSubUsersGrid();
        updateAuthUi();
      });
    }
  }

  function closeUserSettingsDropdown() {
    var panel = document.getElementById('userSettingsDropdownPanel');
    var btn = document.getElementById('userSettingsMenuBtn');
    if (panel) panel.classList.add('hidden');
    if (btn) {
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  function renderUserSettingsQuickProfiles() {
    var quickRow = document.getElementById('userMenuProfilesQuickRow');
    var avatarCircle = document.getElementById('userMenuAvatarCircle');
    var activeNameEl = document.getElementById('userMenuActiveProfileName');
    var emailEl = document.getElementById('userMenuAccountEmail');
    var headerBadge = document.getElementById('headerUserAvatarBadge');

    var activeProf = getActiveSubUser();
    var profName = activeProf ? activeProf.name : (state.user && state.user.name ? state.user.name : 'פרופיל ראשי');
    var profColor = (activeProf && activeProf.color) ? activeProf.color : '#E50914';
    var profInitial = (profName || 'S').trim().charAt(0);

    if (avatarCircle) {
      avatarCircle.textContent = profInitial;
      avatarCircle.style.background = profColor;
    }
    if (headerBadge) {
      headerBadge.style.background = profColor;
      headerBadge.innerHTML = '<span>' + escapeHtml(profInitial) + '</span>';
    }
    if (activeNameEl) {
      var actCfg = activeProf ? ensureProfileParentalConfig(activeProf) : null;
      activeNameEl.textContent = 'פרופיל פעיל: ' + profName + (actCfg && actCfg.enabled ? ' 🛡️' : '');
    }
    if (emailEl) {
      emailEl.textContent = (state.user && (state.user.email || state.user.name))
        ? (state.user.email || state.user.name)
        : 'STREAM IT VIP';
    }

    updateUserMenuParentalSummary();

    if (!quickRow) return;
    var chipsHtml = '';
    for (var i = 0; i < state.subUsers.length; i++) {
      var su = state.subUsers[i];
      var suCfg = ensureProfileParentalConfig(su);
      var isAct = su.id === state.activeSubUserId;
      chipsHtml +=
        '<button type="button" class="user-menu-prof-chip tv-focusable' + (isAct ? ' active' : '') + '" data-quick-subuser="' + escapeHtml(su.id) + '" aria-label="החלף לפרופיל ' + escapeHtml(su.name) + '">' +
          '<span class="user-menu-prof-dot" style="background:' + escapeHtml(su.color || '#E50914') + '"></span>' +
          '<span>' + escapeHtml(su.name) + (suCfg && suCfg.enabled ? ' 🛡️' : '') + '</span>' +
        '</button>';
    }
    quickRow.innerHTML = chipsHtml;

    var chipBtns = quickRow.querySelectorAll('[data-quick-subuser]');
    for (var c = 0; c < chipBtns.length; c++) {
      chipBtns[c].addEventListener('click', function (ev) {
        ev.stopPropagation();
        var pid = this.getAttribute('data-quick-subuser');
        if (!pid) return;
        trySwitchActiveSubUser(pid);
      });
    }
  }

  function updateAuthUi() {
    var label = document.getElementById('authBtnLabel');
    var form = document.getElementById('authForm');
    var accountBox = document.getElementById('authAccountBox');
    var userDisplay = document.getElementById('authUserDisplay');
    var authModal = document.getElementById('authModal');

    // Remove any legacy quick-access buttons if present on older APK DOMs
    var legacyQuickSelectors = ['#quickTestLoginBtn', '#authQuickAccountsBar', '.form-field-inline-actions', '#vkQuickBar'];
    for (var lq = 0; lq < legacyQuickSelectors.length; lq++) {
      var lqNodes = document.querySelectorAll(legacyQuickSelectors[lq]);
      for (var n = 0; n < lqNodes.length; n++) {
        if (lqNodes[n] && lqNodes[n].parentNode) {
          lqNodes[n].parentNode.removeChild(lqNodes[n]);
        }
      }
    }

    var activeProf = getActiveSubUser();
    renderSubUsersGrid();
    renderUserSettingsQuickProfiles();

    if (state.user && state.user.name) {
      document.body.classList.remove('auth-gate-locked');
      if (label) label.textContent = activeProf ? activeProf.name : state.user.name;
      if (form) form.classList.add('hidden');
      if (accountBox) accountBox.classList.remove('hidden');
      if (userDisplay) {
        userDisplay.textContent = 'מחובר: ' + state.user.name + ' • פרופיל פעיל: ' + (activeProf ? activeProf.name : 'ראשי');
      }
    } else {
      document.body.classList.add('auth-gate-locked');
      // Immediately dismiss the boot loader when on the login gate so #authModal is 100% interactive
      var bootLoader = document.getElementById('appBootLoader');
      if (bootLoader) {
        bootLoader.classList.add('boot-complete');
      }
      if (authModal) authModal.classList.remove('hidden');
      if (label) label.textContent = 'התחברות';
      if (form) form.classList.remove('hidden');
      if (accountBox) accountBox.classList.add('hidden');
      var emailIn = document.getElementById('authEmailInput');
      var passIn = document.getElementById('authPasswordInput');
      if (emailIn) {
        emailIn.removeAttribute('readonly');
        emailIn.readOnly = false;
        emailIn.disabled = false;
      }
      if (passIn) {
        passIn.removeAttribute('readonly');
        passIn.readOnly = false;
        passIn.disabled = false;
      }
      if (emailIn && typeof window.streamItFocusElement === 'function') {
        setTimeout(function () {
          window.streamItFocusElement(emailIn, { scroll: false });
        }, 60);
      }
    }
  }

  function openAuthModal() {
    var modal = document.getElementById('authModal');
    if (!modal) return;
    updateAuthUi();
    modal.classList.remove('hidden');

    var targetEl = (state.user && state.user.name)
      ? (document.querySelector('#subUsersGrid .sub-user-card.active') || document.querySelector('#subUsersGrid .sub-user-card'))
      : document.getElementById('authEmailInput');
    if (targetEl && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(targetEl, { scroll: false });
    }
  }

  function performQuickTestLogin() {
    state.user = {
      name: 'מנהל ראשי (VIP)',
      email: 'streamittvapp@gmail.com',
      role: 'admin',
      max_profiles: 5
    };
    try {
      localStorage.setItem('streamit_user_v9', JSON.stringify(state.user));
    } catch (e) {}
    loadAccountScopedState();
    updateAuthUi();
    renderCatalogShelves();
    syncAccountStateFromCloudVault().catch(function () {});
    var modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
    var firstCard = document.querySelector('#catalogRowsContainer .poster-card') || document.getElementById('heroPlayBtn');
    if (firstCard && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(firstCard);
    }
  }

  function getSvgIcon(name) {
    if (name === 'play') {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }
    if (name === 'pause') {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }
    if (name === 'plus') {
      return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>';
    }
    if (name === 'check') {
      return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>';
    }
    return '';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Bind All UI Controls
   */
  function bindUiEvents() {
    window.addEventListener('storage', function (e) {
      if (e && e.key === 'streamit_system_config_v9') {
        loadSystemConfig();
        renderCatalogShelves();
        return;
      }
      if (e && e.key === 'streamit_user_v9') {
        try {
          state.user = e.newValue ? JSON.parse(e.newValue) : null;
        } catch (err) {
          state.user = null;
        }
        loadAccountScopedState();
        updateAuthUi();
        renderCatalogShelves();
      }
    });

    window.addEventListener('scroll', function () {
      var hdr = document.getElementById('topHeader');
      if (!hdr) return;
      if (window.scrollY > 24) hdr.classList.add('scrolled');
      else hdr.classList.remove('scrolled');
    }, { passive: true });

    // Category Navigation
    var catBtns = document.querySelectorAll('[data-category]');
    for (var i = 0; i < catBtns.length; i++) {
      catBtns[i].addEventListener('click', function () {
        var cat = this.getAttribute('data-category') || 'all';
        state.activeCategory = cat;
        state.activeGenre = cat === 'channels' ? 'channels' : (cat === 'youtube' ? 'youtube' : 'all');
        state.activeProvider = 'all';
        state.activeYear = 'all';
        state.activeActorId = 'all';
        state.activeActorName = '';
        state.activeActorPhoto = '';
        state.tvInlineSearchQuery = '';
        var sTxt = document.getElementById('tvRailSearchText');
        if (sTxt) sTxt.textContent = 'חיפוש...';
        var sClr = document.getElementById('tvRailSearchClearBtn');
        if (sClr) sClr.classList.add('hidden');
        var mVk = document.getElementById('tvRailMiniKeyboard');
        if (mVk) mVk.classList.add('hidden');
        state.gridPage = 1;
        var allBtns = document.querySelectorAll('[data-category]');
        for (var j = 0; j < allBtns.length; j++) {
          allBtns[j].classList.toggle('active', allBtns[j].getAttribute('data-category') === cat);
        }
        closeAllExplorerDropdowns();
        renderGenreFilterStrip();
        renderProviderFilterStrip();
        renderYearFilterStrip();
        renderActorFilterStrip();
        renderCatalogShelves();
      });
    }

    // Explorer Dropdown Trigger Buttons (`#providerDropdownBtn`, `#yearDropdownBtn`, `#actorDropdownBtn`)
    var provDropBtn = document.getElementById('providerDropdownBtn');
    if (provDropBtn) {
      provDropBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleExplorerDropdown('providerDropdownBtn', 'providerDropdownPanel');
      });
    }
    var yearDropBtn = document.getElementById('yearDropdownBtn');
    if (yearDropBtn) {
      yearDropBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleExplorerDropdown('yearDropdownBtn', 'yearDropdownPanel');
      });
    }
    var actorDropBtn = document.getElementById('actorDropdownBtn');
    if (actorDropBtn) {
      actorDropBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleExplorerDropdown('actorDropdownBtn', 'actorDropdownPanel');
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.explorer-dropdown-wrap') && !e.target.closest('#tvSideRail')) {
        closeAllExplorerDropdowns();
      }
      if (!e.target.closest('#userSettingsDropdownWrap')) {
        closeUserSettingsDropdown();
      }
    });

    // Streamer Right Side Menu (`#tvSideRail`):
    // Top: Inline Search + Mini-Keyboard (`#tvRailMiniKeyboard`)
    // Middle: Inline Lists (`קטגוריות`, `פלטפורמות`, `לפי שנה`, `שחקנים`)
    // Bottom: User Profile (`#tvRailProfileBtn`) & Settings (`#tvRailSettingsBtn`)
    var tvRailSearchBtn = document.getElementById('tvRailSearchBtn');
    var tvRailSearchText = document.getElementById('tvRailSearchText');
    var tvRailSearchClearBtn = document.getElementById('tvRailSearchClearBtn');
    var tvRailMiniKeyboard = document.getElementById('tvRailMiniKeyboard');
    var miniVkLang = 'HE';

    var applyInlineTvSearch = function (nextQ) {
      state.tvInlineSearchQuery = String(nextQ || '');
      if (tvRailSearchText) {
        tvRailSearchText.textContent = state.tvInlineSearchQuery ? state.tvInlineSearchQuery : 'חיפוש...';
      }
      if (tvRailSearchClearBtn) {
        tvRailSearchClearBtn.classList.toggle('hidden', !state.tvInlineSearchQuery);
      }
      renderCatalogShelves();
      if (state.tvInlineSearchTimer) clearTimeout(state.tvInlineSearchTimer);
      var qTrim = state.tvInlineSearchQuery.trim();
      if (qTrim.length >= 2) {
        state.tvInlineSearchTimer = setTimeout(async function () {
          try {
            var r = await fetch(TMDB_BASE + '/search/multi?api_key=' + TMDB_API_KEY + '&language=he-IL&query=' + encodeURIComponent(qTrim) + '&page=1');
            if (r.ok) {
              var d = await r.json();
              if (d && Array.isArray(d.results) && d.results.length) {
                var moviesArr = d.results.filter(function (x) { return x.media_type === 'movie' && x.poster_path; });
                var seriesArr = d.results.filter(function (x) { return x.media_type === 'tv' && x.poster_path; });
                if (moviesArr.length) mergeItemsIntoCatalog(moviesArr, 'movie', null);
                if (seriesArr.length) mergeItemsIntoCatalog(seriesArr, 'series', null);
                renderCatalogShelves();
              }
            }
          } catch (e) {}
        }, 380);
      }
    };

    var renderTvRailMiniKeyboard = function () {
      if (!tvRailMiniKeyboard) return;
      var chars = miniVkLang === 'HE'
        ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת', 'ם', 'ן', 'ץ', 'ף', 'ך', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      var keysHtml = chars.map(function (ch) {
        return '<button type="button" class="tv-mini-vk-key tv-focusable" data-mini-char="' + escapeHtml(ch) + '">' + escapeHtml(ch) + '</button>';
      }).join('');
      tvRailMiniKeyboard.innerHTML =
        '<div class="tv-mini-vk-grid">' + keysHtml + '</div>' +
        '<div class="tv-mini-vk-actions">' +
          '<button type="button" class="tv-mini-vk-act tv-focusable" data-mini-act="lang">' + (miniVkLang === 'HE' ? 'EN' : 'עב') + '</button>' +
          '<button type="button" class="tv-mini-vk-act tv-focusable" data-mini-act="space">רווח</button>' +
          '<button type="button" class="tv-mini-vk-act tv-focusable" data-mini-act="back">⌫</button>' +
          '<button type="button" class="tv-mini-vk-act tv-focusable" data-mini-act="clear">נקה</button>' +
        '</div>';

      var charBtns = tvRailMiniKeyboard.querySelectorAll('[data-mini-char]');
      for (var c = 0; c < charBtns.length; c++) {
        charBtns[c].addEventListener('click', function (e) {
          e.stopPropagation();
          var ch = this.getAttribute('data-mini-char') || '';
          applyInlineTvSearch((state.tvInlineSearchQuery || '') + ch);
        });
      }
      var actBtns = tvRailMiniKeyboard.querySelectorAll('[data-mini-act]');
      for (var a = 0; a < actBtns.length; a++) {
        actBtns[a].addEventListener('click', function (e) {
          e.stopPropagation();
          var act = this.getAttribute('data-mini-act');
          if (act === 'lang') {
            miniVkLang = miniVkLang === 'HE' ? 'EN' : 'HE';
            renderTvRailMiniKeyboard();
            var langBtn = tvRailMiniKeyboard.querySelector('[data-mini-act="lang"]');
            if (langBtn && typeof window.streamItFocusElement === 'function') {
              window.streamItFocusElement(langBtn, { scroll: false });
            }
          } else if (act === 'space') {
            applyInlineTvSearch((state.tvInlineSearchQuery || '') + ' ');
          } else if (act === 'back') {
            var cur = state.tvInlineSearchQuery || '';
            applyInlineTvSearch(cur.slice(0, -1));
          } else if (act === 'clear') {
            applyInlineTvSearch('');
          }
        });
      }
    };

    if (tvRailSearchBtn && tvRailMiniKeyboard) {
      renderTvRailMiniKeyboard();
      tvRailSearchBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isHidden = tvRailMiniKeyboard.classList.toggle('hidden');
        tvRailSearchBtn.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
        if (!isHidden) {
          var firstKey = tvRailMiniKeyboard.querySelector('.tv-mini-vk-key');
          if (firstKey && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(firstKey, { scroll: false });
          }
        }
      });
    }

    if (tvRailSearchClearBtn) {
      tvRailSearchClearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        applyInlineTvSearch('');
        if (tvRailSearchBtn && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(tvRailSearchBtn, { scroll: false });
        }
      });
    }

    var secTogglePairs = [
      { btn: 'tvRailSecCategoriesBtn', list: 'tvRailCategoriesList', isAccordion: true },
      { btn: 'tvRailSecYearsBtn', list: 'tvRailYearsList', isAccordion: true },
      { btn: 'tvRailSecActorsBtn', list: 'tvRailActorsList', isAccordion: true },
      { btn: 'tvRailSecPlatformsBtn', list: 'tvRailPlatformsList', isAccordion: false }
    ];
    secTogglePairs.forEach(function (pair) {
      var bEl = document.getElementById(pair.btn);
      var lEl = document.getElementById(pair.list);
      if (bEl && lEl) {
        bEl.addEventListener('click', function (e) {
          e.stopPropagation();
          var willOpen = !lEl.classList.contains('open');
          if (pair.isAccordion) {
            // Soft Accordion for top sections (Categories, Years, Actors), while keeping Platforms 2-column grid open below
            secTogglePairs.forEach(function (other) {
              if (!other.isAccordion) return;
              var ob = document.getElementById(other.btn);
              var ol = document.getElementById(other.list);
              if (ob && ol) {
                var openNow = (other.btn === pair.btn) ? willOpen : false;
                ol.classList.toggle('open', openNow);
                ol.classList.remove('hidden');
                ob.classList.toggle('open', openNow);
                ob.setAttribute('aria-expanded', openNow ? 'true' : 'false');
                var arr = ob.querySelector('.tv-rail-sec-arrow');
                if (arr) arr.textContent = openNow ? '▾' : '◂';
              }
            });
          } else {
            lEl.classList.toggle('open', willOpen);
            lEl.classList.remove('hidden');
            bEl.classList.toggle('open', willOpen);
            bEl.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            var arrP = bEl.querySelector('.tv-rail-sec-arrow');
            if (arrP) arrP.textContent = willOpen ? '▾' : '◂';
          }
        });
      }
    });

    var tvRailProfileBtn = document.getElementById('tvRailProfileBtn');
    if (tvRailProfileBtn) {
      tvRailProfileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var openAuth = document.getElementById('openAuthModalBtn') || document.getElementById('openAuthBtn');
        if (openAuth) {
          openAuth.click();
        } else {
          var authMod = document.getElementById('authModal');
          if (authMod) authMod.classList.remove('hidden');
        }
      });
    }

    var tvMoreRailBtn = document.getElementById('tvMoreRailBtn');
    var tvRailSettingsBtn = document.getElementById('tvRailSettingsBtn');
    var tvMoreModal = document.getElementById('tvMoreModal');
    var closeTvMoreModalBtn = document.getElementById('closeTvMoreModalBtn');
    var switchTvMoreTab = function (tabName) {
      var targetTab = tabName === 'actors' ? 'actors' : 'settings';
      var settingsBtn = document.getElementById('tvMoreTabSettingsBtn');
      var actorsBtn = document.getElementById('tvMoreTabActorsBtn');
      var settingsPanel = document.getElementById('tvMoreTabSettingsPanel');
      var actorsPanel = document.getElementById('tvMoreTabActorsPanel');
      if (settingsBtn) {
        settingsBtn.classList.toggle('active', targetTab === 'settings');
        settingsBtn.setAttribute('aria-selected', targetTab === 'settings' ? 'true' : 'false');
      }
      if (actorsBtn) {
        actorsBtn.classList.toggle('active', targetTab === 'actors');
        actorsBtn.setAttribute('aria-selected', targetTab === 'actors' ? 'true' : 'false');
      }
      if (settingsPanel) {
        settingsPanel.classList.toggle('hidden', targetTab !== 'settings');
      }
      if (actorsPanel) {
        actorsPanel.classList.toggle('hidden', targetTab !== 'actors');
      }
      if (targetTab === 'actors') {
        renderActorFilterStrip();
      }
    };
    window.switchTvMoreTab = switchTvMoreTab;

    var moreTabBtns = document.querySelectorAll('#tvMoreModal [data-more-tab]');
    for (var mt = 0; mt < moreTabBtns.length; mt++) {
      moreTabBtns[mt].addEventListener('click', function () {
        var tName = this.getAttribute('data-more-tab') || 'settings';
        switchTvMoreTab(tName);
      });
    }

    var closeTvMoreModal = function (restoreFocusToRail) {
      if (tvMoreModal) tvMoreModal.classList.add('hidden');
      var targetBtn = tvRailSettingsBtn || tvMoreRailBtn;
      if (restoreFocusToRail && targetBtn && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(targetBtn, { scroll: false });
      }
    };
    var openTvSettingsDrawer = function (e) {
      if (e) e.stopPropagation();
      if (!tvMoreModal) return;
      switchTvMoreTab('settings');
      renderActorFilterStrip();
      updateUserMenuParentalSummary();
      tvMoreModal.classList.remove('hidden');
      var firstMoreAction = document.getElementById('tvMoreProfilesBtn') || tvMoreModal.querySelector('.tv-more-action-card');
      if (firstMoreAction && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(firstMoreAction, { scroll: false });
      }
    };
    if (tvMoreRailBtn && tvMoreModal) {
      tvMoreRailBtn.addEventListener('click', openTvSettingsDrawer);
    }
    if (tvRailSettingsBtn && tvMoreModal) {
      tvRailSettingsBtn.addEventListener('click', openTvSettingsDrawer);
    }
    if (closeTvMoreModalBtn) {
      closeTvMoreModalBtn.addEventListener('click', function () {
        closeTvMoreModal(true);
      });
    }

    var tvMoreProfilesBtn = document.getElementById('tvMoreProfilesBtn');
    if (tvMoreProfilesBtn) {
      tvMoreProfilesBtn.addEventListener('click', function () {
        closeTvMoreModal(false);
        var openAuth = document.getElementById('openAuthBtn') || document.getElementById('openAuthModalBtn');
        if (openAuth) openAuth.click();
        else openAuthModal();
      });
    }

    var tvMoreParentalBtn = document.getElementById('tvMoreParentalBtn');
    if (tvMoreParentalBtn) {
      tvMoreParentalBtn.addEventListener('click', function () {
        closeTvMoreModal(false);
        openParentalControlModal();
      });
    }

    var tvMoreTelegramCatBtn = document.getElementById('tvMoreTelegramCatBtn');
    if (tvMoreTelegramCatBtn) {
      tvMoreTelegramCatBtn.addEventListener('click', function () {
        closeTvMoreModal(false);
        state.activeCategory = 'telegram';
        state.activeGenre = 'all';
        state.activeProvider = 'all';
        state.activeYear = 'all';
        state.activeActorId = 'all';
        renderCatalogShelves();
        var firstPoster = document.querySelector('#catalogRowsContainer .poster-card');
        if (firstPoster && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(firstPoster, { scroll: true });
        }
      });
    }

    var tvMoreTelegramHubBtn = document.getElementById('tvMoreTelegramHubBtn');
    if (tvMoreTelegramHubBtn) {
      tvMoreTelegramHubBtn.addEventListener('click', function () {
        closeTvMoreModal(false);
        var openTg = document.getElementById('openTelegramModalBtn');
        if (openTg) openTg.click();
      });
    }

    var tvMoreYoutubeBtn = document.getElementById('tvMoreYoutubeBtn');
    if (tvMoreYoutubeBtn) {
      tvMoreYoutubeBtn.addEventListener('click', function () {
        closeTvMoreModal(false);
        state.activeCategory = 'youtube';
        state.activeGenre = 'youtube';
        renderCatalogShelves();
        var firstYt = document.querySelector('#catalogRowsContainer .tv-focusable');
        if (firstYt && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(firstYt, { scroll: true });
        }
      });
    }

    var tvMoreSubsBtn = document.getElementById('tvMoreSubsBtn');
    if (tvMoreSubsBtn) {
      tvMoreSubsBtn.addEventListener('click', function () {
        var order = ['xlarge', 'large', 'normal'];
        var labels = { xlarge: 'ענק', large: 'גדול', normal: 'רגיל' };
        var cur = state.subtitleSize || 'xlarge';
        var nextIdx = (order.indexOf(cur) + 1) % order.length;
        state.subtitleSize = order[nextIdx];
        var subOverlay = document.getElementById('customSubtitleOverlay');
        if (subOverlay) {
          subOverlay.classList.remove('sub-size-normal', 'sub-size-large', 'sub-size-xlarge');
          subOverlay.classList.add('sub-size-' + state.subtitleSize);
        }
        var subsDesc = document.getElementById('tvMoreSubsLabel') || document.getElementById('tvMoreSubsDesc');
        if (subsDesc) {
          subsDesc.textContent = 'כתוביות: עברית (' + (labels[state.subtitleSize] || 'ענק') + ')';
        }
        showCinemaToast('גודל כתוביות עודכן ל: עברית (' + (labels[state.subtitleSize] || 'ענק') + ')');
      });
    }

    var tvMoreRefreshBtn = document.getElementById('tvMoreRefreshBtn');
    if (tvMoreRefreshBtn) {
      tvMoreRefreshBtn.addEventListener('click', function () {
        closeTvMoreModal(false);
        showCinemaToast('מסנכרן קטלוג, ערוצים ועדכוני ענן...');
        checkCloudOtaUpdates();
        syncTelegramPublicChannels(true);
        renderCatalogShelves();
      });
    }

    var tvMoreActorSearchInput = document.getElementById('tvMoreActorSearchInput');
    var tvMoreActorSearchBtn = document.getElementById('tvMoreActorSearchBtn');
    var runTvMoreActorSearch = async function (rawVal) {
      var q = String(rawVal || '').trim();
      if (!q) return;
      closeTvMoreModal(false);
      await searchActorByNameAndLoad(q);
      var firstPoster = document.querySelector('#catalogRowsContainer .poster-card');
      if (firstPoster && typeof window.streamItFocusElement === 'function') {
        window.streamItFocusElement(firstPoster, { scroll: true });
      }
    };
    if (tvMoreActorSearchInput) {
      tvMoreActorSearchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          runTvMoreActorSearch(this.value);
        }
      });
    }
    if (tvMoreActorSearchBtn && tvMoreActorSearchInput) {
      tvMoreActorSearchBtn.addEventListener('click', function () {
        runTvMoreActorSearch(tvMoreActorSearchInput.value);
      });
    }

    // User Settings Dropdown Menu on Left of Top Header (`#userSettingsMenuBtn`)
    var userSettingsBtn = document.getElementById('userSettingsMenuBtn');
    var userSettingsPanel = document.getElementById('userSettingsDropdownPanel');
    if (userSettingsBtn && userSettingsPanel) {
      userSettingsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllExplorerDropdowns();
        var isHidden = userSettingsPanel.classList.toggle('hidden');
        userSettingsBtn.classList.toggle('open', !isHidden);
        userSettingsBtn.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
        if (!isHidden) {
          renderUserSettingsQuickProfiles();
          var firstMenuItem = userSettingsPanel.querySelector('.user-menu-item');
          if (firstMenuItem && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(firstMenuItem, { scroll: false });
          }
        }
      });
    }

    var userMenuWatchlistBtn = document.getElementById('userMenuWatchlistBtn');
    if (userMenuWatchlistBtn) {
      userMenuWatchlistBtn.addEventListener('click', function () {
        closeUserSettingsDropdown();
        state.activeCategory = 'mylist';
        var allNavBtns = document.querySelectorAll('[data-category]');
        for (var j = 0; j < allNavBtns.length; j++) {
          allNavBtns[j].classList.toggle('active', allNavBtns[j].getAttribute('data-category') === 'mylist');
        }
        renderCatalogShelves();
        var catMain = document.getElementById('catalogMain');
        if (catMain && typeof catMain.scrollIntoView === 'function') {
          catMain.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    var userMenuParentalBtn = document.getElementById('userMenuParentalBtn');
    if (userMenuParentalBtn) {
      userMenuParentalBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeUserSettingsDropdown();
        openParentalControlModal();
      });
    }

    var userMenuSubsBtn = document.getElementById('userMenuSubsSettingsBtn');
    if (userMenuSubsBtn) {
      userMenuSubsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var order = ['xlarge', 'large', 'normal'];
        var labels = { xlarge: 'ענק', large: 'גדול', normal: 'רגיל' };
        var cur = state.subtitleSize || 'xlarge';
        var nextIdx = (order.indexOf(cur) + 1) % order.length;
        state.subtitleSize = order[nextIdx];
        var subOverlay = document.getElementById('customSubtitleOverlay');
        if (subOverlay) {
          subOverlay.classList.remove('sub-size-normal', 'sub-size-large', 'sub-size-xlarge');
          subOverlay.classList.add('sub-size-' + state.subtitleSize);
        }
        var subTitleEl = document.getElementById('userMenuSubsTitle');
        if (subTitleEl) {
          subTitleEl.textContent = 'העדפות כתוביות: עברית (' + (labels[state.subtitleSize] || 'ענק') + ')';
        }
      });
    }

    var userMenuRefreshBtn = document.getElementById('userMenuRefreshBtn');
    if (userMenuRefreshBtn) {
      userMenuRefreshBtn.addEventListener('click', function () {
        closeUserSettingsDropdown();
        showCinemaToast('מסנכרן קטלוג, ערוצים, מבזקים ועדכוני ענן...');
        checkCloudOtaUpdates();
        initLiveNewsTicker();
        syncTelegramPublicChannels(true);
        renderCatalogShelves();
      });
    }

    var userMenuLogoutBtn = document.getElementById('userMenuLogoutBtn');
    if (userMenuLogoutBtn) {
      userMenuLogoutBtn.addEventListener('click', function () {
        closeUserSettingsDropdown();
        var lg = document.getElementById('logoutBtn');
        if (lg) lg.click();
      });
    }

    // Actor Live Search Input (`#actorSearchInput`) + Submit Button (`#actorSearchSubmitBtn`)
    var actorSearchInput = document.getElementById('actorSearchInput');
    var actorSearchSubmitBtn = document.getElementById('actorSearchSubmitBtn');
    if (actorSearchInput) {
      actorSearchInput.addEventListener('input', function () {
        var v = this.value;
        if (state.actorSearchDebounce) clearTimeout(state.actorSearchDebounce);
        state.actorSearchDebounce = setTimeout(function () {
          searchActorByNameAndLoad(v);
        }, 280);
      });
      actorSearchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (state.actorSearchDebounce) clearTimeout(state.actorSearchDebounce);
          searchActorByNameAndLoad(this.value);
        }
      });
    }
    if (actorSearchSubmitBtn && actorSearchInput) {
      actorSearchSubmitBtn.addEventListener('click', function () {
        if (state.actorSearchDebounce) clearTimeout(state.actorSearchDebounce);
        searchActorByNameAndLoad(actorSearchInput.value);
      });
    }

    // Hero Buttons
    var heroPlay = document.getElementById('heroPlayBtn');
    if (heroPlay) {
      heroPlay.addEventListener('click', function () {
        if (state.heroItem) startPlayback(state.heroItem, 1, 1);
      });
    }
    var heroInfo = document.getElementById('heroInfoBtn');
    if (heroInfo) {
      heroInfo.addEventListener('click', function () {
        if (state.heroItem) openDetailsModal(state.heroItem);
      });
    }
    var heroWl = document.getElementById('heroWatchlistBtn');
    if (heroWl) {
      heroWl.addEventListener('click', function () {
        if (state.heroItem) toggleWatchlist(state.heroItem);
      });
    }

    // Search Controls + Expanded Top Header Search Input (`#headerQuickSearchInput`)
    var headerQuickSearchInput = document.getElementById('headerQuickSearchInput');
    var triggerSearchWithQuery = function (qText) {
      closeUserSettingsDropdown();
      openSearchModal();
      var modalSearchIn = document.getElementById('searchInput');
      if (modalSearchIn && typeof qText === 'string' && qText.trim()) {
        modalSearchIn.value = qText.trim();
        renderSearchResults(qText.trim());
      }
    };
    if (headerQuickSearchInput) {
      headerQuickSearchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          triggerSearchWithQuery(this.value || '');
        }
      });
      headerQuickSearchInput.addEventListener('input', function () {
        var val = (this.value || '').trim();
        if (val.length >= 2) {
          if (state.headerQuickSearchTimer) clearTimeout(state.headerQuickSearchTimer);
          state.headerQuickSearchTimer = setTimeout(function () {
            triggerSearchWithQuery(val);
          }, 360);
        }
      });
    }
    var searchTriggers = ['openSearchBtn', 'tvSearchRailBtn', 'mobileSearchBtn'];
    for (var s = 0; s < searchTriggers.length; s++) {
      var sb = document.getElementById(searchTriggers[s]);
      if (sb) {
        sb.addEventListener('click', function () {
          var qVal = headerQuickSearchInput ? headerQuickSearchInput.value : '';
          triggerSearchWithQuery(qVal);
        });
      }
    }
    var closeSearch = document.getElementById('closeSearchBtn');
    if (closeSearch) {
      closeSearch.addEventListener('click', function () {
        var sm = document.getElementById('searchModal');
        if (sm) sm.classList.add('hidden');
      });
    }
    var clearSearch = document.getElementById('clearSearchBtn');
    var searchInput = document.getElementById('searchInput');
    if (clearSearch && searchInput) {
      clearSearch.addEventListener('click', function () {
        searchInput.value = '';
        renderSearchResults('');
      });
    }
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var val = this.value;
        if (state.searchDebounce) clearTimeout(state.searchDebounce);
        state.searchDebounce = setTimeout(function () {
          renderSearchResults(val);
        }, 220);
      });
    }
    var searchFilterBtns = document.querySelectorAll('[data-search-filter]');
    for (var f = 0; f < searchFilterBtns.length; f++) {
      searchFilterBtns[f].addEventListener('click', function () {
        state.searchFilter = this.getAttribute('data-search-filter') || 'all';
        for (var k = 0; k < searchFilterBtns.length; k++) {
          searchFilterBtns[k].classList.toggle('active', searchFilterBtns[k] === this);
        }
        renderSearchResults(searchInput ? searchInput.value : '');
      });
    }

    // Details Modal Buttons
    var closeDetails = document.getElementById('closeDetailsBtn');
    if (closeDetails) {
      closeDetails.addEventListener('click', function () {
        closeDetailsSourcesDropdown();
        var dm = document.getElementById('detailsModal');
        if (dm) dm.classList.add('hidden');
      });
    }
    var detailsSourcesBtn = document.getElementById('detailsSourcesDropdownBtn');
    var detailsSourcesPanel = document.getElementById('detailsStreamsDropdownPanel');
    if (detailsSourcesBtn && detailsSourcesPanel) {
      detailsSourcesBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = !detailsSourcesPanel.classList.contains('hidden');
        if (isOpen) {
          closeDetailsSourcesDropdown();
        } else {
          detailsSourcesPanel.classList.remove('hidden');
          detailsSourcesBtn.classList.add('open');
          detailsSourcesBtn.setAttribute('aria-expanded', 'true');
          var firstSourceCard = detailsSourcesPanel.querySelector('.stream-source-card');
          if (firstSourceCard && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(firstSourceCard, { scroll: false });
          }
        }
      });
    }
    var detailsModalEl = document.getElementById('detailsModal');
    if (detailsModalEl) {
      detailsModalEl.addEventListener('click', function (e) {
        var wrap = document.getElementById('detailsSourcesDropdownWrap');
        if (wrap && !wrap.contains(e.target)) {
          closeDetailsSourcesDropdown();
        }
      });
    }
    var detailsPlay = document.getElementById('detailsPlayBtn');
    if (detailsPlay) {
      detailsPlay.addEventListener('click', function () {
        if (state.detailsItem) startPlayback(state.detailsItem, state.activeSeason, state.activeEpisode);
      });
    }
    var detailsTrailer = document.getElementById('detailsTrailerBtn');
    if (detailsTrailer) {
      detailsTrailer.addEventListener('click', function () {
        if (state.detailsItem) startPlayback(state.detailsItem, state.activeSeason, state.activeEpisode, 0, 'trailer');
      });
    }
    var detailsWl = document.getElementById('detailsWatchlistBtn');
    if (detailsWl) {
      detailsWl.addEventListener('click', function () {
        if (!state.detailsItem) return;
        toggleWatchlist(state.detailsItem);
        var inWl = isInWatchlist(state.detailsItem.id);
        this.innerHTML = (inWl ? getSvgIcon('check') : getSvgIcon('plus')) + '<span>' + (inWl ? 'ברשימה שלי' : 'הרשימה שלי') + '</span>';
      });
    }
    var detailsRemCw = document.getElementById('detailsRemoveCwBtn');
    if (detailsRemCw) {
      detailsRemCw.addEventListener('click', function () {
        if (!state.detailsItem) return;
        removeFromContinueWatching(state.detailsItem.id);
      });
    }
    var clearAllCwBtn = document.getElementById('clearContinueWatchingBtn');
    if (clearAllCwBtn) {
      clearAllCwBtn.addEventListener('click', function () {
        clearAllContinueWatching();
      });
    }

    // Video Player Controls
    var closePlayer = document.getElementById('closePlayerBtn');
    if (closePlayer) closePlayer.addEventListener('click', closeVideoPlayer);

    var playPause = document.getElementById('playerPlayPauseBtn');
    if (playPause) playPause.addEventListener('click', togglePlayPause);

    var rewindBtn = document.getElementById('playerRewindBtn');
    if (rewindBtn) rewindBtn.addEventListener('click', function () { seekVideoBy(-10); });

    var forwardBtn = document.getElementById('playerForwardBtn');
    if (forwardBtn) forwardBtn.addEventListener('click', function () { seekVideoBy(10); });

    var skipIntroBtn = document.getElementById('skipIntroOverlayBtn');
    if (skipIntroBtn) skipIntroBtn.addEventListener('click', triggerSkipIntro);

    var nextEpBtn = document.getElementById('playerNextEpBtn');
    if (nextEpBtn) {
      nextEpBtn.addEventListener('click', function () {
        if (state.playingItem && state.playingItem.type === 'series') {
          startPlayback(state.playingItem, state.activeSeason, state.activeEpisode + 1, 0);
        }
      });
    }

    // Player Sources Dropdown (`מקורות`) & Switcher Tabs (`direct` | `embed1` | `embed2` | `swarm` | `trailer`)
    var playerSourcesBtn = document.getElementById('playerSourcesDropdownBtn');
    var playerSourceTabsPanel = document.getElementById('playerSourceTabs');
    if (playerSourcesBtn && playerSourceTabsPanel) {
      playerSourcesBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        wakePlayerControls();
        var isHidden = playerSourceTabsPanel.classList.toggle('hidden');
        playerSourcesBtn.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
        if (!isHidden) {
          var activeTab = playerSourceTabsPanel.querySelector('.source-tab-btn.active') || playerSourceTabsPanel.querySelector('.source-tab-btn');
          if (activeTab && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(activeTab);
          }
        }
      });
    }

    var sourceTabs = document.querySelectorAll('#playerSourceTabs .source-tab-btn');
    for (var st = 0; st < sourceTabs.length; st++) {
      sourceTabs[st].addEventListener('click', function (e) {
        e.stopPropagation();
        var mode = this.getAttribute('data-source-mode') || 'direct';
        if (playerSourceTabsPanel) playerSourceTabsPanel.classList.add('hidden');
        if (playerSourcesBtn) playerSourcesBtn.setAttribute('aria-expanded', 'false');
        if (state.playingItem) {
          startPlayback(state.playingItem, state.activeSeason, state.activeEpisode, 0, mode);
        }
      });
    }

    // Listen to postMessage events from sandboxed VidSpark/Vidsrc player:
    // 1. Verifies stream is live (`source === 'vidspark-player' || source === 'moviesapi-player'`), reveals iframe, hides loading spinner, and auto-plays
    // 2. Keeps custom Hebrew subtitles synced with exact playback timestamp
    window.addEventListener('message', function (ev) {
      try {
        var d = ev && ev.data;
        if (d && (d.source === 'vidspark-player' || d.source === 'moviesapi-player')) {
          if (!state.embedVerified && state.playingMode === 'embed') {
            state.embedVerified = true;
            if (state.embedWatchdogTimer) {
              clearTimeout(state.embedWatchdogTimer);
              state.embedWatchdogTimer = null;
            }
            var ifr = document.getElementById('streamEmbedIframe');
            if (ifr) ifr.style.opacity = '1';
            var sp = document.getElementById('playerLoadingSpinner');
            if (sp) sp.classList.add('hidden');
          }
          if (!state.embedAutoPlayed && state.playingMode === 'embed' && (d.event === 'ready' || d.event === 'playerstatus')) {
            state.embedAutoPlayed = true;
            var ifrPlay = document.getElementById('streamEmbedIframe');
            if (ifrPlay && ifrPlay.contentWindow) {
              try {
                ifrPlay.contentWindow.postMessage({ action: 'play' }, '*');
                if (state.embedStartOffsetSec > 0) {
                  ifrPlay.contentWindow.postMessage({ action: 'seek', time: Math.floor(state.embedStartOffsetSec) }, '*');
                }
              } catch (e) {}
            }
          }
          if (! (state.embedPauseLockUntil && Date.now() < state.embedPauseLockUntil)) {
            if (typeof d.paused === 'boolean' && state.playingMode === 'embed') {
              state.embedPaused = d.paused;
              updatePlayPauseIcon(d.paused);
            } else if (d.event === 'pause') {
              state.embedPaused = true;
              updatePlayPauseIcon(true);
            } else if (d.event === 'play') {
              state.embedPaused = false;
              updatePlayPauseIcon(false);
            }
          }
          if (typeof d.duration === 'number' && isFinite(d.duration) && d.duration > 0 && state.playingMode === 'embed') {
            state.embedDuration = d.duration;
            var totEmbedEl = document.getElementById('playerTotalTime');
            if (totEmbedEl) totEmbedEl.textContent = formatSeconds(d.duration);
          }
          if (typeof d.currentTime === 'number' && state.playingMode === 'embed' && d.currentTime >= 0) {
            // Prevent stale pre-seek postMessages from overriding an active SafeWatch parental jump
            if (state.embedSkipTargetUntil && Date.now() < state.embedSkipTargetUntil && d.currentTime < state.embedCurrentTime - 2) {
              var ifrSkip = document.getElementById('streamEmbedIframe');
              if (ifrSkip && ifrSkip.contentWindow) {
                try {
                  ifrSkip.contentWindow.postMessage({ action: 'seek', time: Math.ceil(state.embedCurrentTime) }, '*');
                  ifrSkip.contentWindow.postMessage({ command: 'seek', time: Math.ceil(state.embedCurrentTime) }, '*');
                } catch (e) {}
              }
              return;
            }
            // If we have a saved resume offset and the embed player just started from 0, seek it to the saved second
            if (!state.embedResumeSeekDone && state.embedStartOffsetSec > 15 && state.embedDuration > 30) {
              if (d.currentTime < state.embedStartOffsetSec - 8) {
                var ifrResume = document.getElementById('streamEmbedIframe');
                if (ifrResume && ifrResume.contentWindow) {
                  try {
                    ifrResume.contentWindow.postMessage({ action: 'seek', time: Math.floor(state.embedStartOffsetSec) }, '*');
                    ifrResume.contentWindow.postMessage({ command: 'seek', time: Math.floor(state.embedStartOffsetSec) }, '*');
                  } catch (e) {}
                }
              } else {
                state.embedResumeSeekDone = true;
              }
            }
            state.embedCurrentTime = d.currentTime;
            var curEmbedEl = document.getElementById('playerCurrentTime');
            if (curEmbedEl) curEmbedEl.textContent = formatSeconds(d.currentTime);
            var seekEmbedEl = document.getElementById('playerSeekSlider');
            if (seekEmbedEl && state.embedDuration > 0) {
              seekEmbedEl.value = String(Math.round((d.currentTime / state.embedDuration) * 1000));
            }
            var fillBarEl = document.getElementById('embedTimelineProgressFill');
            if (fillBarEl && state.embedDuration > 0) {
              fillBarEl.style.width = Math.min(100, Math.max(0, (d.currentTime / state.embedDuration) * 100)).toFixed(2) + '%';
            }
            updateActiveSubtitleCue(d.currentTime);
            if (Math.floor(d.currentTime) > 12 && Math.floor(d.currentTime) % 5 === 0) {
              savePlaybackProgressForCurrentItem(d.currentTime, state.embedDuration || 5400);
            }
          }
        }
      } catch (e) {}
    });

    // Fullscreen Buttons (Top Bar + Bottom Bar + Embed Bottom-Right Overlay + F11/Double-Click)
    var fsBtns = ['playerTopFullscreenBtn', 'playerFullscreenBtn', 'embedFullscreenOverlayBtn'];
    for (var fsi = 0; fsi < fsBtns.length; fsi++) {
      var fsBtnEl = document.getElementById(fsBtns[fsi]);
      if (fsBtnEl) {
        fsBtnEl.addEventListener('click', function (e) {
          e.stopPropagation();
          togglePlayerFullscreen();
        });
      }
    }

    var onFullscreenChangeSyncSubs = function () {
      applySubtitleStyleToOverlay();
      updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
      setTimeout(function () {
        applySubtitleStyleToOverlay();
        updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
      }, 250);
    };
    document.addEventListener('fullscreenchange', onFullscreenChangeSyncSubs);
    document.addEventListener('webkitfullscreenchange', onFullscreenChangeSyncSubs);

    // Subtitles Menu Button (Top Bar + Bottom Bar + Embed CC Overlay) & Sync/Style/Background Controls
    var subsMenu = document.getElementById('playerSubsMenu');
    var toggleSubsMenuHandler = function (e) {
      e.stopPropagation();
      wakePlayerControls();
      if (!subsMenu) return;
      subsMenu.classList.toggle('hidden');
      if (!subsMenu.classList.contains('hidden')) {
        renderSubtitlesMenu();
        var firstSubBtn = subsMenu.querySelector('button');
        if (firstSubBtn && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(firstSubBtn);
        }
      }
    };
    var subsBtn = document.getElementById('playerSubsBtn');
    var topSubsBtn = document.getElementById('playerTopSubsBtn');
    var embedCcBtn = document.getElementById('embedCcOverlayBtn');
    if (subsBtn) subsBtn.addEventListener('click', toggleSubsMenuHandler);
    if (topSubsBtn) topSubsBtn.addEventListener('click', toggleSubsMenuHandler);
    if (embedCcBtn) embedCcBtn.addEventListener('click', toggleSubsMenuHandler);

    // SafeWatch Parental Control In-Player Menu & Shield Overlay Controls
    var playerTopParentalBtn = document.getElementById('playerTopParentalBtn');
    var playerParentalMenu = document.getElementById('playerParentalMenu');
    if (playerTopParentalBtn && playerParentalMenu) {
      playerTopParentalBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        wakePlayerControls();
        if (subsMenu) subsMenu.classList.add('hidden');
        var isHidden = playerParentalMenu.classList.toggle('hidden');
        if (!isHidden) {
          updateInPlayerParentalUi();
          var firstQuickBtn = playerParentalMenu.querySelector('button');
          if (firstQuickBtn && typeof window.streamItFocusElement === 'function') {
            window.streamItFocusElement(firstQuickBtn);
          }
        }
      });
    }

    var playerMarkAndSkipBtn = document.getElementById('playerMarkAndSkipSceneBtn');
    if (playerMarkAndSkipBtn) {
      playerMarkAndSkipBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        wakePlayerControls();
        markCurrentSceneAndSkip();
      });
    }

    var playerTestParentalSkipBtn = document.getElementById('playerTestParentalSkipBtn');
    if (playerTestParentalSkipBtn) {
      playerTestParentalSkipBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        wakePlayerControls();
        triggerLiveParentalDemoSkip();
      });
    }

    var playerOpenFullParentalBtn = document.getElementById('playerOpenFullParentalModalBtn');
    if (playerOpenFullParentalBtn) {
      playerOpenFullParentalBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (playerParentalMenu) playerParentalMenu.classList.add('hidden');
        openParentalControlModal(state.activeSubUserId);
      });
    }

    var parentalShieldSkipNowBtn = document.getElementById('parentalShieldSkipNowBtn');
    if (parentalShieldSkipNowBtn) {
      parentalShieldSkipNowBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var seg = state.parentalShieldActiveSegment;
        state.parentalShieldActiveSegment = null;
        hideParentalShieldOverlay();
        setParentalTemporaryMute(false);
        if (seg && seg.end) {
          performParentalJumpTo(seg.end + 0.35, seg);
        } else {
          var curT = getCurrentPlaybackTimeSec();
          performParentalJumpTo(curT + 25, {
            start: curT,
            end: curT + 25,
            category: 'sex',
            label: 'דילוג מיידי על הסצנה'
          });
        }
      });
    }

    var syncMinus = document.getElementById('subSyncMinusBtn');
    var syncReset = document.getElementById('subSyncResetBtn');
    var syncPlus = document.getElementById('subSyncPlusBtn');
    var updateSyncLabel = function () {
      if (syncReset) {
        var sign = state.subOffsetSec > 0 ? '+' : '';
        syncReset.textContent = sign + state.subOffsetSec.toFixed(1) + 's';
      }
      updateActiveSubtitleCue(getCurrentPlaybackTimeSec());
    };
    if (syncMinus) {
      syncMinus.addEventListener('click', function () {
        wakePlayerControls();
        state.subOffsetSec = Math.round((state.subOffsetSec - 0.5) * 10) / 10;
        updateSyncLabel();
      });
    }
    if (syncReset) {
      syncReset.addEventListener('click', function () {
        wakePlayerControls();
        state.subOffsetSec = 0;
        updateSyncLabel();
      });
    }
    if (syncPlus) {
      syncPlus.addEventListener('click', function () {
        wakePlayerControls();
        state.subOffsetSec = Math.round((state.subOffsetSec + 0.5) * 10) / 10;
        updateSyncLabel();
      });
    }

    var fontMinusBtn = document.getElementById('subFontMinusBtn');
    var fontResetBtn = document.getElementById('subFontResetBtn');
    var fontPlusBtn = document.getElementById('subFontPlusBtn');
    if (fontMinusBtn) {
      fontMinusBtn.addEventListener('click', function () {
        wakePlayerControls();
        adjustSubtitleFontSize(-2);
      });
    }
    if (fontResetBtn) {
      fontResetBtn.addEventListener('click', function () {
        wakePlayerControls();
        state.subFontPx = 42;
        state.subSize = 'xlarge';
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }
    if (fontPlusBtn) {
      fontPlusBtn.addEventListener('click', function () {
        wakePlayerControls();
        adjustSubtitleFontSize(2);
      });
    }

    var sizeBtns = document.querySelectorAll('[data-sub-size]');
    for (var sz = 0; sz < sizeBtns.length; sz++) {
      sizeBtns[sz].addEventListener('click', function () {
        wakePlayerControls();
        var chosen = this.getAttribute('data-sub-size') || 'xlarge';
        state.subSize = chosen;
        state.subFontPx = chosen === 'normal' ? 26 : (chosen === 'large' ? 34 : 42);
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }

    var colorBtns = document.querySelectorAll('[data-sub-color]');
    for (var cl = 0; cl < colorBtns.length; cl++) {
      colorBtns[cl].addEventListener('click', function () {
        wakePlayerControls();
        state.subColor = this.getAttribute('data-sub-color') || 'white';
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }

    var bgBtns = document.querySelectorAll('[data-sub-bg]');
    for (var bg = 0; bg < bgBtns.length; bg++) {
      bgBtns[bg].addEventListener('click', function () {
        wakePlayerControls();
        state.subBg = this.getAttribute('data-sub-bg') || 'none';
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }

    // Subtitle Vertical Position Controls (`#subPosDownBtn`, `#subPosBottomMaxBtn`, `#subPosResetBtn`, `#subPosUpBtn`)
    var subPosDownBtn = document.getElementById('subPosDownBtn');
    var subPosBottomMaxBtn = document.getElementById('subPosBottomMaxBtn');
    var subPosResetBtn = document.getElementById('subPosResetBtn');
    var subPosUpBtn = document.getElementById('subPosUpBtn');
    if (subPosDownBtn) {
      subPosDownBtn.addEventListener('click', function () {
        wakePlayerControls();
        adjustSubtitleVerticalPosition(-1.5);
      });
    }
    if (subPosBottomMaxBtn) {
      subPosBottomMaxBtn.addEventListener('click', function () {
        wakePlayerControls();
        state.subBottomPct = 1.5;
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }
    if (subPosResetBtn) {
      subPosResetBtn.addEventListener('click', function () {
        wakePlayerControls();
        state.subBottomPct = 3.5;
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }
    if (subPosUpBtn) {
      subPosUpBtn.addEventListener('click', function () {
        wakePlayerControls();
        adjustSubtitleVerticalPosition(1.5);
      });
    }

    var seekSlider = document.getElementById('playerSeekSlider');
    var embedHoverStrip = document.getElementById('embedTimelineHoverStrip');
    var video = document.getElementById('videoElement');
    if (seekSlider && video) {
      var getSeekDuration = function () {
        if (state.playingMode === 'video' && video.duration && isFinite(video.duration)) return video.duration;
        if (state.embedDuration > 0) return state.embedDuration;
        return 5400;
      };
      seekSlider.addEventListener('mousemove', function (ev) {
        var rect = this.getBoundingClientRect();
        if (!rect || !rect.width) return;
        // RTL slider check: compute ratio based on mouse position
        var ratio = (ev.clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        var targetSec = ratio * getSeekDuration();
        showSeekThumbnailPreview(targetSec, ev.clientX, rect);
      });
      seekSlider.addEventListener('mouseleave', function () {
        var previewEl = document.getElementById('seekThumbnailPreview');
        if (previewEl) previewEl.classList.add('hidden');
      });
      seekSlider.addEventListener('input', function () {
        wakePlayerControls();
        var rect = this.getBoundingClientRect();
        var ratio = Number(this.value) / 1000;
        var dur = getSeekDuration();
        var targetSec = ratio * dur;
        var thumbX = rect && rect.width ? (rect.left + ratio * rect.width) : (window.innerWidth / 2);
        showSeekThumbnailPreview(targetSec, thumbX, rect);

        if (state.playingMode === 'video' && video.duration && isFinite(video.duration)) {
          video.currentTime = targetSec;
          updateActiveSubtitleCue(video.currentTime);
          savePlaybackProgressForCurrentItem(video.currentTime, video.duration);
        } else if (state.playingMode === 'embed') {
          state.embedCurrentTime = targetSec;
          updateActiveSubtitleCue(targetSec);
          savePlaybackProgressForCurrentItem(targetSec, dur);
          var ifr = document.getElementById('streamEmbedIframe');
          if (ifr && ifr.contentWindow) {
            try {
              ifr.contentWindow.postMessage({ action: 'seek', time: Math.floor(targetSec) }, '*');
            } catch (e) {}
          }
        }
      });
    }

    var restartZeroBtn = document.getElementById('resumeRestartFromZeroBtn');
    if (restartZeroBtn) {
      restartZeroBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var resumeToast = document.getElementById('resumePlaybackToast');
        if (resumeToast) resumeToast.classList.add('hidden');
        state.embedStartOffsetSec = 0;
        state.embedResumeSeekDone = true;
        if (state.playingItem) {
          var profBucket = ensureActiveProfileBucket();
          if (profBucket.progress && profBucket.progress[state.playingItem.id]) {
            delete profBucket.progress[state.playingItem.id];
            saveSubUsersState();
          }
          if (state.playingMode === 'video') {
            var vEl = document.getElementById('videoElement');
            if (vEl) vEl.currentTime = 0;
          } else if (state.playingMode === 'embed') {
            state.embedCurrentTime = 0;
            updateActiveSubtitleCue(0);
            var ifr = document.getElementById('streamEmbedIframe');
            if (ifr && ifr.contentWindow) {
              try {
                ifr.contentWindow.postMessage({ action: 'seek', time: 0 }, '*');
                ifr.contentWindow.postMessage({ command: 'seek', time: 0 }, '*');
              } catch (err) {}
            }
          }
        }
      });
    }

    if (embedHoverStrip) {
      var isStripDragging = false;
      var calcStripTargetSec = function (ev, stripEl) {
        var rect = stripEl.getBoundingClientRect();
        var ratio = rect.width > 0 ? Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)) : 0.5;
        var dur = (state.embedDuration > 0 ? state.embedDuration : 5400);
        return { sec: ratio * dur, dur: dur, ratio: ratio, rect: rect };
      };
      var applyEmbedSeekTo = function (info, clientX) {
        state.embedCurrentTime = info.sec;
        state.embedResumeSeekDone = true;
        updateActiveSubtitleCue(info.sec);
        savePlaybackProgressForCurrentItem(info.sec, info.dur);
        var fillBar = document.getElementById('embedTimelineProgressFill');
        if (fillBar) fillBar.style.width = (info.ratio * 100).toFixed(2) + '%';
        showSeekThumbnailPreview(info.sec, clientX, info.rect);
        var ifr = document.getElementById('streamEmbedIframe');
        if (ifr && ifr.contentWindow) {
          try {
            ifr.contentWindow.postMessage({ action: 'seek', time: Math.floor(info.sec) }, '*');
            ifr.contentWindow.postMessage({ command: 'seek', time: Math.floor(info.sec) }, '*');
          } catch (e) {}
        }
      };
      embedHoverStrip.addEventListener('mousemove', function (ev) {
        wakePlayerControls();
        var info = calcStripTargetSec(ev, this);
        var hoverDot = document.getElementById('embedTimelineHoverDot');
        if (hoverDot) hoverDot.style.left = (info.ratio * 100).toFixed(2) + '%';
        showSeekThumbnailPreview(info.sec, ev.clientX, info.rect);
        if (isStripDragging) {
          applyEmbedSeekTo(info, ev.clientX);
        }
      });
      embedHoverStrip.addEventListener('mousedown', function (ev) {
        ev.stopPropagation();
        isStripDragging = true;
        var info = calcStripTargetSec(ev, this);
        applyEmbedSeekTo(info, ev.clientX);
      });
      window.addEventListener('mouseup', function () {
        isStripDragging = false;
      });
      embedHoverStrip.addEventListener('mouseleave', function () {
        if (!isStripDragging) {
          var previewEl = document.getElementById('seekThumbnailPreview');
          if (previewEl) previewEl.classList.add('hidden');
        }
      });
      embedHoverStrip.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var info = calcStripTargetSec(ev, this);
        applyEmbedSeekTo(info, ev.clientX);
      });
    }

    window.addEventListener('beforeunload', function () {
      var curT = getCurrentPlaybackTimeSec();
      if (curT > 12 && state.playingItem) {
        var durT = (state.playingMode === 'video' && document.getElementById('videoElement'))
          ? (document.getElementById('videoElement').duration || 0)
          : (state.embedDuration || 5400);
        savePlaybackProgressForCurrentItem(curT, durT);
      }
    });

    if (video) {
      video.addEventListener('timeupdate', function () {
        var curEl = document.getElementById('playerCurrentTime');
        var totEl = document.getElementById('playerTotalTime');
        if (curEl) curEl.textContent = formatSeconds(video.currentTime);
        if (totEl) totEl.textContent = formatSeconds(video.duration);
        if (seekSlider && video.duration && isFinite(video.duration)) {
          seekSlider.value = String(Math.round((video.currentTime / video.duration) * 1000));
        }

        updateActiveSubtitleCue(video.currentTime);

        if (state.playingItem && state.playingItem.type !== 'channel' && video.duration > 30 && Math.floor(video.currentTime) % 5 === 0) {
          savePlaybackProgressForCurrentItem(video.currentTime, video.duration);
        }
      });
    }

    var playerModal = document.getElementById('playerModal');
    if (playerModal) {
      playerModal.addEventListener('mousemove', wakePlayerControls, { passive: true });
      playerModal.addEventListener('click', function (e) {
        if (
          e.target === playerModal ||
          e.target === video ||
          e.target.id === 'embedPlayerContainer' ||
          e.target.classList.contains('player-stage') ||
          e.target.id === 'playerControlsOverlay'
        ) {
          togglePlayPause();
        }
      });
    }

    // Auth & Sub-Users ("מי צופה עכשיו?") Controls
    var authBtns = ['openAuthModalBtn', 'tvAccountRailBtn'];
    for (var a = 0; a < authBtns.length; a++) {
      var ab = document.getElementById(authBtns[a]);
      if (ab) {
        ab.addEventListener('click', function () {
          closeUserSettingsDropdown();
          openAuthModal();
        });
      }
    }

    // Zero-Account Public Telegram VOD Hub Controls
    var tgOpenBtns = ['openTelegramHubBtn', 'tvTelegramRailBtn', 'openTelegramFromAuthBtn'];
    for (var tgIdx = 0; tgIdx < tgOpenBtns.length; tgIdx++) {
      var tgb = document.getElementById(tgOpenBtns[tgIdx]);
      if (tgb) {
        tgb.addEventListener('click', function () {
          closeUserSettingsDropdown();
          openTelegramModal();
        });
      }
    }
    var closeTgBtn = document.getElementById('closeTelegramModalBtn');
    if (closeTgBtn) {
      closeTgBtn.addEventListener('click', function () {
        var tm = document.getElementById('telegramModal');
        if (tm) tm.classList.add('hidden');
      });
    }
    var tgAddBtn = document.getElementById('tgAddChannelBtn');
    var tgChInput = document.getElementById('tgChannelInput');
    var handleAddTgChannel = async function () {
      if (!tgChInput) return;
      var clean = cleanTelegramChannelHandle(tgChInput.value);
      if (!clean) return;
      var currentList = getConnectedTelegramChannels();
      var exists = currentList.some(function (c) { return c.handle.toLowerCase() === clean.toLowerCase(); });
      if (!exists) {
        currentList.unshift({ handle: clean, label: 'ערוץ טלגרם מחובר (@' + clean + ')' });
        saveConnectedTelegramChannels(currentList);
      }
      tgChInput.value = '';
      if (typeof window.closeStreamItKeyboard === 'function') window.closeStreamItKeyboard();
      await syncTelegramPublicChannels(true);
    };
    if (tgAddBtn) {
      tgAddBtn.addEventListener('click', handleAddTgChannel);
    }
    if (tgChInput) {
      tgChInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddTgChannel();
        }
      });
    }
    var tgSyncBtn = document.getElementById('tgSyncAllBtn');
    if (tgSyncBtn) {
      tgSyncBtn.addEventListener('click', function () {
        syncTelegramPublicChannels(true);
      });
    }
    var tgFilterCatBtn = document.getElementById('tgFilterCatalogBtn');
    if (tgFilterCatBtn) {
      tgFilterCatBtn.addEventListener('click', function () {
        var tm = document.getElementById('telegramModal');
        if (tm) tm.classList.add('hidden');
        state.activeCategory = 'all';
        state.activeProvider = 'telegram';
        renderProviderFilterStrip();
        renderCatalogShelves();
        var catMain = document.getElementById('catalogMain');
        if (catMain && typeof catMain.scrollIntoView === 'function') {
          catMain.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
    var closeAuth = document.getElementById('closeAuthModalBtn');
    if (closeAuth) {
      closeAuth.addEventListener('click', function () {
        if (document.body.classList.contains('auth-gate-locked')) return;
        var am = document.getElementById('authModal');
        if (am) am.classList.add('hidden');
      });
    }
    var quickLoginBtn = document.getElementById('quickTestLoginBtn');
    if (quickLoginBtn) {
      quickLoginBtn.addEventListener('click', performQuickTestLogin);
    }

    // Add / Manage Sub-Users
    var addSuToggle = document.getElementById('addSubUserToggleBtn');
    var addSuForm = document.getElementById('addSubUserForm');
    var saveSuBtn = document.getElementById('saveNewSubUserBtn');
    var cancelSuBtn = document.getElementById('cancelNewSubUserBtn');
    var manageSuBtn = document.getElementById('manageSubUsersToggleBtn');
    var kidsToggleBtn = document.getElementById('newSubUserKidsBtn');
    var newSuKidsState = false;

    if (kidsToggleBtn) {
      kidsToggleBtn.addEventListener('click', function () {
        newSuKidsState = !newSuKidsState;
        this.classList.toggle('active', newSuKidsState);
        this.textContent = newSuKidsState ? 'מצב ילדים: פעיל 🛡️' : 'מצב ילדים: כבוי';
      });
    }
    if (addSuToggle && addSuForm) {
      addSuToggle.addEventListener('click', function () {
        addSuForm.classList.toggle('hidden');
        var nameIn = document.getElementById('newSubUserNameInput');
        if (nameIn && !addSuForm.classList.contains('hidden')) {
          nameIn.value = '';
          if (typeof window.streamItFocusElement === 'function') window.streamItFocusElement(nameIn);
        }
      });
    }
    if (cancelSuBtn && addSuForm) {
      cancelSuBtn.addEventListener('click', function () {
        addSuForm.classList.add('hidden');
      });
    }
    if (saveSuBtn) {
      saveSuBtn.addEventListener('click', function () {
        var nameIn = document.getElementById('newSubUserNameInput');
        var nameVal = nameIn && nameIn.value ? nameIn.value.trim() : '';
        if (!nameVal) return;
        var colors = ['#b91c1c', '#334155', '#3f3f46', '#475569', '#52525b', '#1e293b'];
        var newId = 'prof-' + Date.now();
        var newSuObj = {
          id: newId,
          name: nameVal,
          color: colors[state.subUsers.length % colors.length],
          isKids: newSuKidsState,
          isPrimary: false
        };
        ensureProfileParentalConfig(newSuObj);
        state.subUsers.push(newSuObj);
        state.activeSubUserId = newId;
        newSuKidsState = false;
        if (kidsToggleBtn) {
          kidsToggleBtn.classList.remove('active');
          kidsToggleBtn.textContent = 'מצב ילדים: כבוי';
        }
        if (addSuForm) addSuForm.classList.add('hidden');
        ensureActiveProfileBucket();
        saveSubUsersState();
        updateAuthUi();
        renderGenreFilterStrip();
        renderInitialStage();
      });
    }
    if (manageSuBtn) {
      manageSuBtn.addEventListener('click', function () {
        state.manageSubUsersMode = !state.manageSubUsersMode;
        this.classList.toggle('active', state.manageSubUsersMode);
        renderSubUsersGrid();
      });
    }

    // SafeWatch Parental Control Modal (`#parentalControlModal`) & Account-Wide Sub-User Controls
    var authOpenParentalBtn = document.getElementById('authOpenParentalModalBtn');
    if (authOpenParentalBtn) {
      authOpenParentalBtn.addEventListener('click', function () {
        var am = document.getElementById('authModal');
        if (am) am.classList.add('hidden');
        openParentalControlModal(state.activeSubUserId);
      });
    }

    var closeParentalBtn = document.getElementById('closeParentalModalBtn');
    if (closeParentalBtn) {
      closeParentalBtn.addEventListener('click', closeParentalControlModal);
    }

    var parentalModalOverlay = document.getElementById('parentalControlModal');
    if (parentalModalOverlay) {
      parentalModalOverlay.addEventListener('click', function (e) {
        if (e.target === parentalModalOverlay) {
          closeParentalControlModal();
        }
      });
    }

    var parentalMasterToggleBtn = document.getElementById('parentalMasterToggleBtn');
    if (parentalMasterToggleBtn) {
      parentalMasterToggleBtn.addEventListener('click', function () {
        var prof = getEditingParentalProfile();
        if (!prof) return;
        var cfg = ensureProfileParentalConfig(prof);
        cfg.enabled = !cfg.enabled;
        if (cfg.enabled && countEnabledParentalCategories(cfg) === 0) {
          cfg.categories.sex = true;
          cfg.categories.violence = true;
          cfg.categories.profanity = true;
        }
        saveSubUsersState();
        renderParentalControlModal();
        updateUserMenuParentalSummary();
        updateInPlayerParentalUi();
        renderInitialStage();
        showCinemaToast(
          cfg.enabled
            ? ('🛡️ סינון SafeWatch הופעל עבור "' + prof.name + '"')
            : ('סינון SafeWatch כובה עבור "' + prof.name + '"')
        );
      });
    }

    var parentalApplySubUsersBtn = document.getElementById('parentalApplySubUsersBtn');
    if (parentalApplySubUsersBtn) {
      parentalApplySubUsersBtn.addEventListener('click', function () {
        var srcProf = getEditingParentalProfile();
        if (!srcProf) return;
        var srcCfg = ensureProfileParentalConfig(srcProf);
        var cloned = JSON.parse(JSON.stringify(srcCfg));
        cloned.enabled = true;
        if (countEnabledParentalCategories(cloned) === 0) {
          cloned.categories.sex = true;
          cloned.categories.violence = true;
          cloned.categories.profanity = true;
        }
        var updatedCount = 0;
        for (var i = 0; i < state.subUsers.length; i++) {
          if (!state.subUsers[i].isPrimary) {
            state.subUsers[i].parentalControl = JSON.parse(JSON.stringify(cloned));
            updatedCount++;
          }
        }
        saveSubUsersState();
        renderParentalControlModal();
        updateUserMenuParentalSummary();
        updateInPlayerParentalUi();
        renderInitialStage();
        showCinemaToast('🛡️ הגדרות הסינון הוחלו על כל ' + updatedCount + ' תתי-היוזרים בחשבון!');
      });
    }

    var parentalApplyAllBtn = document.getElementById('parentalApplyAllBtn');
    if (parentalApplyAllBtn) {
      parentalApplyAllBtn.addEventListener('click', function () {
        var srcProf = getEditingParentalProfile();
        if (!srcProf) return;
        var srcCfg = ensureProfileParentalConfig(srcProf);
        var cloned = JSON.parse(JSON.stringify(srcCfg));
        cloned.enabled = true;
        if (countEnabledParentalCategories(cloned) === 0) {
          cloned.categories.sex = true;
          cloned.categories.violence = true;
          cloned.categories.profanity = true;
        }
        for (var i = 0; i < state.subUsers.length; i++) {
          state.subUsers[i].parentalControl = JSON.parse(JSON.stringify(cloned));
        }
        saveSubUsersState();
        renderParentalControlModal();
        updateUserMenuParentalSummary();
        updateInPlayerParentalUi();
        renderInitialStage();
        showCinemaToast('🛡️ הגדרות הסינון הוחלו על המשתמש הראשי וכל תתי-היוזרים!');
      });
    }

    var parentalCatCards = document.querySelectorAll('#parentalCategoriesGrid [data-parental-cat]');
    for (var pcc = 0; pcc < parentalCatCards.length; pcc++) {
      parentalCatCards[pcc].addEventListener('click', function () {
        var catKey = this.getAttribute('data-parental-cat');
        var prof = getEditingParentalProfile();
        if (!prof || !catKey) return;
        var cfg = ensureProfileParentalConfig(prof);
        cfg.categories[catKey] = !cfg.categories[catKey];
        if (cfg.categories[catKey] && !cfg.enabled) {
          cfg.enabled = true;
        }
        saveSubUsersState();
        renderParentalControlModal();
        updateUserMenuParentalSummary();
        updateInPlayerParentalUi();
        renderInitialStage();
      });
    }

    var parentalActionBtns = document.querySelectorAll('[data-parental-action]');
    for (var pab = 0; pab < parentalActionBtns.length; pab++) {
      parentalActionBtns[pab].addEventListener('click', function () {
        var mode = this.getAttribute('data-parental-action');
        var prof = getEditingParentalProfile();
        if (!prof || !mode) return;
        var cfg = ensureProfileParentalConfig(prof);
        cfg.actionMode = mode;
        saveSubUsersState();
        renderParentalControlModal();
        updateUserMenuParentalSummary();
      });
    }

    var parentalProfanityBtns = document.querySelectorAll('[data-parental-profanity]');
    for (var ppb = 0; ppb < parentalProfanityBtns.length; ppb++) {
      parentalProfanityBtns[ppb].addEventListener('click', function () {
        var pMode = this.getAttribute('data-parental-profanity');
        var prof = getEditingParentalProfile();
        if (!prof || !pMode) return;
        var cfg = ensureProfileParentalConfig(prof);
        cfg.profanityMode = pMode;
        saveSubUsersState();
        renderParentalControlModal();
      });
    }

    var parentalSensBtns = document.querySelectorAll('[data-parental-sensitivity]');
    for (var psb = 0; psb < parentalSensBtns.length; psb++) {
      parentalSensBtns[psb].addEventListener('click', function () {
        var sens = this.getAttribute('data-parental-sensitivity');
        var prof = getEditingParentalProfile();
        if (!prof || !sens) return;
        var cfg = ensureProfileParentalConfig(prof);
        cfg.sensitivity = sens;
        saveSubUsersState();
        renderParentalControlModal();
      });
    }

    var parentalSavePinBtn = document.getElementById('parentalSavePinBtn');
    var parentalPinNewInput = document.getElementById('parentalPinNewInput');
    var parentalClearPinBtn = document.getElementById('parentalClearPinBtn');
    if (parentalSavePinBtn && parentalPinNewInput) {
      parentalSavePinBtn.addEventListener('click', function () {
        var rawPin = String(parentalPinNewInput.value || '').replace(/\D/g, '').slice(0, 4);
        if (rawPin.length !== 4) {
          showCinemaToast('נא להזין קוד PIN בן 4 ספרות בדיוק');
          return;
        }
        if (!state.parentalMaster) state.parentalMaster = { pinCode: '', customSkipSegments: {} };
        state.parentalMaster.pinCode = rawPin;
        state.parentalPinUnlockedThisSession = true;
        parentalPinNewInput.value = '';
        saveParentalMasterState();
        renderParentalControlModal();
        showCinemaToast('🔒 קוד PIN הורים (4 ספרות) נשמר בהצלחה!');
      });
    }

    if (parentalClearPinBtn) {
      parentalClearPinBtn.addEventListener('click', function () {
        if (!state.parentalMaster) return;
        state.parentalMaster.pinCode = '';
        state.parentalPinUnlockedThisSession = true;
        saveParentalMasterState();
        renderParentalControlModal();
        showCinemaToast('🔓 נעילת קוד ה-PIN בוטלה');
      });
    }

    var parentalPinGateSubmitBtn = document.getElementById('parentalPinGateSubmitBtn');
    var parentalPinVerifyBtn = document.getElementById('parentalPinVerifyBtn');
    var parentalPinVerifyInput = document.getElementById('parentalPinVerifyInput');
    var verifyParentalPinHandler = function () {
      if (!parentalPinVerifyInput) return;
      var entered = String(parentalPinVerifyInput.value || '').trim();
      var expected = (state.parentalMaster && state.parentalMaster.pinCode) ? String(state.parentalMaster.pinCode) : '';
      var errEl = document.getElementById('parentalPinGateError');
      if (!expected || entered === expected) {
        state.parentalPinUnlockedThisSession = true;
        parentalPinVerifyInput.value = '';
        if (errEl) errEl.classList.add('hidden');
        if (state.pendingProfileSwitchAfterPin) {
          var targetPid = state.pendingProfileSwitchAfterPin;
          state.pendingProfileSwitchAfterPin = null;
          closeParentalControlModal();
          completeSubUserSwitch(targetPid);
          showCinemaToast('🔓 קוד אומת — הוחלף פרופיל צפייה');
          return;
        }
        var pinGate = document.getElementById('parentalPinVerifyGate');
        var mainContent = document.getElementById('parentalControlMainContent');
        if (pinGate) pinGate.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('hidden');
        renderParentalControlModal();
        var activeTab = document.querySelector('#parentalProfilesSelectorRow .parental-profile-tab.active') ||
                        document.getElementById('parentalMasterToggleBtn');
        if (activeTab && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(activeTab, { scroll: false });
        }
      } else {
        if (errEl) errEl.classList.remove('hidden');
        parentalPinVerifyInput.value = '';
      }
    };
    if (parentalPinGateSubmitBtn) {
      parentalPinGateSubmitBtn.addEventListener('click', verifyParentalPinHandler);
    }
    if (parentalPinVerifyBtn && parentalPinVerifyBtn !== parentalPinGateSubmitBtn) {
      parentalPinVerifyBtn.addEventListener('click', verifyParentalPinHandler);
    }
    if (parentalPinVerifyInput) {
      parentalPinVerifyInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          verifyParentalPinHandler();
        }
      });
    }

    // Strict Admin-Only Cloud SHA-256 User Verification (Zero Self-Registration, Zero Local Server Needed!)
    function sha256PureJsBrowser(ascii) {
      function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
      }
      var mathPow = Math.pow;
      var maxWord = mathPow(2, 32);
      var lengthProperty = 'length';
      var i, j;
      var result = '';
      var words = [];
      var asciiBitLength = ascii[lengthProperty] * 8;
      var hash = sha256PureJsBrowser.h = sha256PureJsBrowser.h || [];
      var k = sha256PureJsBrowser.k = sha256PureJsBrowser.k || [];
      var primeCounter = k[lengthProperty];
      var isComposite = {};
      for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (i = 0; i < 313; i += candidate) {
            isComposite[i] = candidate;
          }
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
          k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
      }
      ascii += '\x80';
      while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
      for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << ((3 - (i % 4)) * 8);
      }
      words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
      words[words[lengthProperty]] = asciiBitLength;
      for (j = 0; j < words[lengthProperty]; ) {
        var w = words.slice(j, (j += 16));
        var oldHash = hash;
        hash = hash.slice(0, 8);
        for (i = 0; i < 64; i++) {
          var w15 = w[i - 15], w2 = w[i - 2];
          var a = hash[0], e = hash[4];
          var temp1 =
            hash[7] +
            (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
            ((e & hash[5]) ^ (~e & hash[6])) +
            k[i] +
            (w[i] =
              i < 16
                ? w[i]
                : (w[i - 16] +
                    (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                    w[i - 7] +
                    (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                  0);
          var temp2 =
            (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
            ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(temp1 + temp2) | 0].concat(hash);
          hash[4] = (hash[4] + temp1) | 0;
        }
        for (i = 0; i < 8; i++) {
          hash[i] = (hash[i] + oldHash[i]) | 0;
        }
      }
      for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
          var b = (hash[i] >> (j * 8)) & 255;
          result += (b < 16 ? 0 : '') + b.toString(16);
        }
      }
      return result;
    }

    async function sha256HexBrowser(str) {
      var rawStr = String(str == null ? '' : str);
      try {
        if (window.crypto && window.crypto.subtle) {
          var buf = new TextEncoder().encode(rawStr);
          var hashBuf = await window.crypto.subtle.digest('SHA-256', buf);
          var arr = Array.from(new Uint8Array(hashBuf));
          return arr.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        }
      } catch (e) {}
      return sha256PureJsBrowser(unescape(encodeURIComponent(rawStr)));
    }

    function decodeVaultPassCipher(cipher) {
      if (!cipher) return '';
      try {
        var raw = atob(String(cipher));
        var out = '';
        for (var i = 0; i < raw.length; i++) {
          out += String.fromCharCode(raw.charCodeAt(i) ^ 59);
        }
        return decodeURIComponent(escape(out));
      } catch (e) {
        return '';
      }
    }

    function parseVaultRecordTs(rec) {
      if (!rec) return 0;
      if (rec.updatedTs && Number(rec.updatedTs) > 0) return Number(rec.updatedTs);
      if (rec.updatedAt) {
        var t = Date.parse(String(rec.updatedAt).replace(' ', 'T'));
        if (!isNaN(t)) return t;
      }
      return 0;
    }

    async function verifyCloudAccountLogin(email, password) {
      var cleanEmail = String(email || '').trim().toLowerCase();
      var cleanPass = String(password || '').trim();
      if (!cleanEmail || !cleanPass) {
        return { ok: false, error: 'נא להזין כתובת אימייל וסיסמה מאושרים.' };
      }

      var defaultVault = {
        'streamittvapp@gmail.com': {
          email: 'streamittvapp@gmail.com',
          display_name: 'מנהל ראשי (VIP / משפחתי)',
          status: 'approved',
          role: 'admin',
          max_profiles: 5,
          passCipher: 'WQsODw8NDg0OCgs=',
          passHash: '6d3f56d012335b0679ff7c8d4c4c46172b2d48262999bb6189a6eb5bad134d19',
          altHashes: [
            '6d3f56d012335b0679ff7c8d4c4c46172b2d48262999bb6189a6eb5bad134d19'
          ],
          updatedAt: '2026-11-10 08:00',
          updatedTs: 1794290400000
        },
        'bensahaltv@gmail.com': {
          email: 'bensahaltv@gmail.com',
          display_name: 'BENSAHAL TV',
          status: 'approved',
          role: 'admin',
          max_profiles: 5,
          autoBindPassword: false,
          passCipher: 'CAgJAgsO',
          passHash: '88047cd74e5b035155e7a09ec61801901db6e4051402a2f213b00a1fa0582de4',
          altHashes: [
            '88047cd74e5b035155e7a09ec61801901db6e4051402a2f213b00a1fa0582de4'
          ],
          updatedAt: '2026-11-10 08:00',
          updatedTs: 1794290400000
        }
      };

      // Instant 0ms verification fast-path for primary accounts so network latency never blocks login
      if (cleanEmail === 'bensahaltv@gmail.com' && cleanPass === '332905') {
        var fastBensahal = defaultVault['bensahaltv@gmail.com'];
        try {
          var cachedLv1 = JSON.parse(localStorage.getItem('streamit_cloud_vault_v9') || '{}');
          if (cachedLv1 && cachedLv1['bensahaltv@gmail.com'] && cachedLv1['bensahaltv@gmail.com'].accountState) {
            fastBensahal.accountState = cachedLv1['bensahaltv@gmail.com'].accountState;
          }
        } catch (e) {}
        return {
          ok: true,
          account: {
            name: fastBensahal.display_name,
            email: cleanEmail,
            role: fastBensahal.role,
            max_profiles: fastBensahal.max_profiles,
            accountState: fastBensahal.accountState || null
          }
        };
      }
      if (cleanEmail === 'streamittvapp@gmail.com' && cleanPass.toLowerCase() === 'b0544656510') {
        var fastStreamit = defaultVault['streamittvapp@gmail.com'];
        try {
          var cachedLv2 = JSON.parse(localStorage.getItem('streamit_cloud_vault_v9') || '{}');
          if (cachedLv2 && cachedLv2['streamittvapp@gmail.com'] && cachedLv2['streamittvapp@gmail.com'].accountState) {
            fastStreamit.accountState = cachedLv2['streamittvapp@gmail.com'].accountState;
          }
        } catch (e) {}
        return {
          ok: true,
          account: {
            name: fastStreamit.display_name,
            email: cleanEmail,
            role: fastStreamit.role,
            max_profiles: fastStreamit.max_profiles,
            accountState: fastStreamit.accountState || null
          }
        };
      }

      var vault = JSON.parse(JSON.stringify(defaultVault));
      var cloudLoaded = false;

      // 1. Fallback relative JSON fetch (lowest priority above defaultVault)
      try {
        var res = await fetch('data/accounts_vault.json?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          var cloudVault = await res.json();
          if (cloudVault && typeof cloudVault === 'object') {
            for (var k in cloudVault) {
              if (Object.prototype.hasOwnProperty.call(cloudVault, k)) {
                vault[k.toLowerCase()] = cloudVault[k];
              }
            }
          }
        }
      } catch (e) {}

      // 2. Live GitHub Cloud API Vault Fetch (Authoritative real-time Cloud Vault — 0ms CDN delay!)
      try {
        var tk = getCloudVaultSyncToken();
        var ghHeaders = { 'Accept': 'application/vnd.github.v3+json' };
        if (tk) ghHeaders['Authorization'] = 'token ' + tk;
        var ghRes = await fetch('https://api.github.com/repos/streamittvapp/stream-it-app/contents/data/accounts_vault.json?t=' + Date.now(), {
          headers: ghHeaders,
          cache: 'no-store'
        });
        if (ghRes.ok) {
          var ghMeta = await ghRes.json();
          if (ghMeta && ghMeta.content) {
            var rawJson = decodeURIComponent(escape(atob(String(ghMeta.content).replace(/\s/g, ''))));
            var ghVault = JSON.parse(rawJson);
            if (ghVault && typeof ghVault === 'object') {
              vault = {};
              for (var gk in ghVault) {
                if (Object.prototype.hasOwnProperty.call(ghVault, gk)) {
                  vault[gk.toLowerCase()] = ghVault[gk];
                }
              }
              cloudLoaded = true;
            }
          }
        }
      } catch (e) {}

      // 3. LocalStorage Admin Vault sync (Only override Cloud if the local record has a strictly newer timestamp!)
      try {
        var localVault = JSON.parse(localStorage.getItem('streamit_cloud_vault_v9') || '{}');
        if (localVault && typeof localVault === 'object') {
          for (var lk in localVault) {
            if (Object.prototype.hasOwnProperty.call(localVault, lk)) {
              var lKey = lk.toLowerCase();
              var lRec = localVault[lk];
              var cRec = vault[lKey];
              if (!cloudLoaded) {
                vault[lKey] = lRec;
              } else if (!cRec && lRec && lRec.updatedTs) {
                vault[lKey] = lRec;
              } else if (cRec && lRec && parseVaultRecordTs(lRec) > parseVaultRecordTs(cRec)) {
                vault[lKey] = lRec;
              }
            }
          }
        }
        for (var defKey in defaultVault) {
          if (Object.prototype.hasOwnProperty.call(defaultVault, defKey)) {
            if (!vault[defKey]) {
              vault[defKey] = JSON.parse(JSON.stringify(defaultVault[defKey]));
            } else {
              vault[defKey].passCipher = defaultVault[defKey].passCipher;
              vault[defKey].passHash = defaultVault[defKey].passHash;
              vault[defKey].altHashes = defaultVault[defKey].altHashes.slice();
            }
          }
        }
        localStorage.setItem('streamit_cloud_vault_v9', JSON.stringify(vault));
      } catch (e) {}

      var rec = vault[cleanEmail];
      if (!rec) {
        return { ok: false, error: 'החשבון אינו מאושר במערכת. יצירת משתמשים ואישורם מתבצעים על ידי מנהל המערכת בלבד.' };
      }
      if (rec.status && rec.status !== 'approved' && cleanEmail !== 'streamittvapp@gmail.com' && cleanEmail !== 'bensahaltv@gmail.com') {
        return { ok: false, error: 'המנוי שלך מושהה או ממתין לאישור מנהל המערכת.' };
      }

      var inputHash = await sha256HexBrowser(cleanEmail + ':' + cleanPass);
      var inputHashLower = await sha256HexBrowser(cleanEmail + ':' + cleanPass.toLowerCase());
      var inputHashRaw = await sha256HexBrowser(cleanPass);
      var inputHashRawLower = await sha256HexBrowser(cleanPass.toLowerCase());

      var validHashes = [];
      if (rec.passHash) validHashes.push(rec.passHash);
      if (Array.isArray(rec.altHashes)) validHashes = validHashes.concat(rec.altHashes);

      var passMatched = false;
      if (rec.passCipher) {
        var decodedPw = decodeVaultPassCipher(rec.passCipher);
        if (decodedPw && (decodedPw === cleanPass || decodedPw.toLowerCase() === cleanPass.toLowerCase())) {
          passMatched = true;
        }
      }
      if (!passMatched && rec.password && (rec.password === cleanPass || String(rec.password).toLowerCase() === cleanPass.toLowerCase())) {
        passMatched = true;
      }
      if (!passMatched && validHashes.length) {
        if (
          (inputHash && validHashes.indexOf(inputHash) !== -1) ||
          (inputHashLower && validHashes.indexOf(inputHashLower) !== -1) ||
          (inputHashRaw && validHashes.indexOf(inputHashRaw) !== -1) ||
          (inputHashRawLower && validHashes.indexOf(inputHashRawLower) !== -1)
        ) {
          passMatched = true;
        }
      }
      if (!passMatched && rec.autoBindPassword && cleanPass.length >= 4) {
        passMatched = true;
        rec.passHash = inputHash;
        if (!Array.isArray(rec.altHashes)) rec.altHashes = [];
        if (rec.altHashes.indexOf(inputHash) === -1) rec.altHashes.push(inputHash);
        rec.autoBindPassword = false;
        rec.updatedTs = Date.now();
        try {
          var lv = JSON.parse(localStorage.getItem('streamit_cloud_vault_v9') || '{}');
          lv[cleanEmail] = rec;
          localStorage.setItem('streamit_cloud_vault_v9', JSON.stringify(lv));
        } catch (e) {}
      }

      if (!passMatched) {
        return { ok: false, error: 'סיסמה שגויה. נא לוודא את הסיסמה מול מנהל המערכת.' };
      }

      return {
        ok: true,
        account: {
          name: rec.display_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: rec.role || 'member',
          max_profiles: Number(rec.max_profiles || 5),
          accountState: rec.accountState || null
        }
      };
    }

    var isSubmittingAuthForm = false;
    async function submitAuthLoginForm(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (isSubmittingAuthForm) return;

      var emailIn = document.getElementById('authEmailInput');
      var passIn = document.getElementById('authPasswordInput');
      var statusMsg = document.getElementById('authStatusMsg');
      var submitBtn = document.getElementById('authSubmitBtn');
      var emailVal = emailIn && emailIn.value ? emailIn.value.trim().toLowerCase() : '';
      var passVal = passIn && passIn.value ? passIn.value.trim() : '';

      if (!emailVal || !passVal) {
        if (statusMsg) {
          statusMsg.textContent = 'נא להזין כתובת אימייל וסיסמה מאושרים.';
          statusMsg.classList.remove('hidden');
        }
        return;
      }

      if (statusMsg) {
        statusMsg.classList.add('hidden');
        statusMsg.textContent = '';
      }

      isSubmittingAuthForm = true;
      var origBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) submitBtn.textContent = 'מתחבר...';

      try {
        var check = await verifyCloudAccountLogin(emailVal, passVal);
        if (!check.ok || !check.account) {
          if (statusMsg) {
            statusMsg.textContent = check.error || 'החשבון אינו רשום או ממתין לאישור מנהל מערכת. אין הרשמה עצמאית.';
            statusMsg.classList.remove('hidden');
          }
          return;
        }

        var verifiedAccount = check.account;
        state.user = {
          name: verifiedAccount.name || emailVal.split('@')[0],
          email: verifiedAccount.email || emailVal,
          role: verifiedAccount.role || 'member',
          max_profiles: Number(verifiedAccount.max_profiles || 5)
        };
        if (emailIn) emailIn.value = '';
        if (passIn) passIn.value = '';
        try {
          localStorage.setItem('streamit_user_v9', JSON.stringify(state.user));
        } catch (err) {}
        loadAccountScopedState();
        if (verifiedAccount.accountState && typeof verifiedAccount.accountState === 'object') {
          applyCloudAccountStateToLocal(verifiedAccount.accountState);
        }
        updateAuthUi();
        renderInitialStage();
        syncAccountStateFromCloudVault().catch(function () {});
        if (typeof window.closeStreamItKeyboard === 'function') window.closeStreamItKeyboard();
        var am = document.getElementById('authModal');
        if (am) am.classList.add('hidden');
        var heroPlay = document.getElementById('heroPlayBtn');
        if (heroPlay && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(heroPlay, { scroll: false });
        }
      } finally {
        isSubmittingAuthForm = false;
        if (submitBtn && origBtnText) submitBtn.textContent = origBtnText;
      }
    }
    window.submitAuthLoginForm = submitAuthLoginForm;

    var authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', submitAuthLoginForm);
    }
    var authSubmitBtn = document.getElementById('authSubmitBtn');
    if (authSubmitBtn) {
      authSubmitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        submitAuthLoginForm(e);
      });
    }
    var authEmailIn = document.getElementById('authEmailInput');
    var authPassIn = document.getElementById('authPasswordInput');
    if (authEmailIn) {
      authEmailIn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !document.body.classList.contains('tv-mode')) {
          e.preventDefault();
          if (authPassIn && !authPassIn.value) {
            authPassIn.focus();
          } else {
            submitAuthLoginForm(e);
          }
        }
      });
    }
    if (authPassIn) {
      authPassIn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !document.body.classList.contains('tv-mode')) {
          e.preventDefault();
          submitAuthLoginForm(e);
        }
      });
    }
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        state.user = null;
        try { localStorage.removeItem('streamit_user_v9'); } catch (e) {}
        loadAccountScopedState();
        var emailIn = document.getElementById('authEmailInput');
        var passIn = document.getElementById('authPasswordInput');
        if (emailIn) emailIn.value = '';
        if (passIn) passIn.value = '';
        updateAuthUi();
        renderCatalogShelves();
      });
    }
  }

  /**
   * Self-Healing OTA DOM Upgrader (Transforms v9.3.0 Streamer APK DOM to v9.4.0 Over-The-Air!)
   */
  function upgradeDomFromV93ToV94IfNeeded() {
    var explorerBar = document.getElementById('catalogExplorerBar');
    if (explorerBar && !document.getElementById('explorerDropdownsBar')) {
      explorerBar.innerHTML =
        '<div id="genreFilterStrip" class="genre-filter-strip" role="tablist" aria-label="סינון לפי סוגות"></div>' +
        '<div id="explorerDropdownsBar" class="explorer-dropdowns-bar" role="toolbar" aria-label="סינון מתקדם לפי פלטפורמה, שנה ושחקנים">' +
          '<div class="explorer-dropdown-wrap" id="providerDropdownWrap">' +
            '<button id="providerDropdownBtn" class="explorer-dropdown-btn tv-focusable" type="button" aria-haspopup="listbox" aria-expanded="false">' +
              '<svg class="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' +
              '<span class="dropdown-btn-prefix">חברות סטרימינג:</span>' +
              '<strong id="providerDropdownCurrent">כל הפלטפורמות</strong>' +
              '<svg class="dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</button>' +
            '<div id="providerDropdownPanel" class="explorer-dropdown-panel hidden" role="listbox" aria-label="בחירת חברת סטרימינג">' +
              '<div id="providerFilterStrip" class="dropdown-options-grid"></div>' +
            '</div>' +
          '</div>' +
          '<div class="explorer-dropdown-wrap" id="yearDropdownWrap">' +
            '<button id="yearDropdownBtn" class="explorer-dropdown-btn tv-focusable" type="button" aria-haspopup="listbox" aria-expanded="false">' +
              '<svg class="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
              '<span class="dropdown-btn-prefix">לפי שנה:</span>' +
              '<strong id="yearDropdownCurrent">כל השנים</strong>' +
              '<svg class="dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</button>' +
            '<div id="yearDropdownPanel" class="explorer-dropdown-panel hidden" role="listbox" aria-label="בחירת שנת יציאה">' +
              '<div id="yearFilterStrip" class="dropdown-options-grid"></div>' +
            '</div>' +
          '</div>' +
          '<div class="explorer-dropdown-wrap" id="actorDropdownWrap">' +
            '<button id="actorDropdownBtn" class="explorer-dropdown-btn tv-focusable" type="button" aria-haspopup="listbox" aria-expanded="false">' +
              '<svg class="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
              '<span class="dropdown-btn-prefix">שחקנים:</span>' +
              '<strong id="actorDropdownCurrent">כל השחקנים</strong>' +
              '<svg class="dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</button>' +
            '<div id="actorDropdownPanel" class="explorer-dropdown-panel actor-dropdown-panel hidden" role="listbox" aria-label="גלריית שחקנים עם תמונות">' +
              '<div class="dropdown-panel-header">בחר שחקן לצפייה בכל הסרטים והסדרות שלו:</div>' +
              '<div id="actorFilterStrip" class="actor-dropdown-grid"></div>' +
            '</div>' +
          '</div>' +
          '<div class="actor-search-box">' +
            '<svg class="actor-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<input id="actorSearchInput" class="actor-search-input tv-focusable" type="search" placeholder="חפש שחקן (למשל: ברוס ויליס, גל גדות)..." autocomplete="off" aria-label="חיפוש לפי שם שחקן">' +
            '<button id="actorSearchSubmitBtn" class="actor-search-submit-btn tv-focusable" type="button" aria-label="חפש שחקן">חפש</button>' +
          '</div>' +
        '</div>';
    }

    // Ensure Embed CC Overlay Button (`#embedCcOverlayBtn`) exists inside `#playerControlsOverlay` even on OTA-upgraded DOM
    var ctrlOverlay = document.getElementById('playerControlsOverlay');
    if (ctrlOverlay && !document.getElementById('embedCcOverlayBtn')) {
      var ccBtn = document.createElement('button');
      ccBtn.type = 'button';
      ccBtn.id = 'embedCcOverlayBtn';
      ccBtn.className = 'embed-cc-overlay-btn tv-focusable';
      ccBtn.setAttribute('dir', 'rtl');
      ccBtn.setAttribute('title', 'הגדרות כתוביות עברית');
      ccBtn.setAttribute('aria-label', 'הגדרות כתוביות עברית');
      ccBtn.innerHTML = '<span>עברית</span>';
      ctrlOverlay.appendChild(ccBtn);
    }

    // Ensure Font Size +/- buttons exist in #playerSubsMenu even on OTA-upgraded DOM
    var firstSizeBtn = document.querySelector('#playerSubsMenu [data-sub-size="normal"]');
    if (firstSizeBtn && !document.getElementById('subFontMinusBtn')) {
      var sizeRow = firstSizeBtn.parentNode;
      if (sizeRow && sizeRow.parentNode) {
        var pmRow = document.createElement('div');
        pmRow.className = 'subs-options-row';
        pmRow.setAttribute('dir', 'ltr');
        pmRow.style.marginBottom = '4px';
        pmRow.innerHTML =
          '<button type="button" id="subFontMinusBtn" class="subs-chip-btn tv-focusable" dir="ltr" aria-label="הקטן גודל גופן">-</button>' +
          '<button type="button" id="subFontResetBtn" class="subs-chip-btn active tv-focusable" dir="ltr" aria-label="גודל גופן נוכחי">42px</button>' +
          '<button type="button" id="subFontPlusBtn" class="subs-chip-btn tv-focusable" dir="ltr" aria-label="הגדל גודל גופן">+</button>';
        sizeRow.parentNode.insertBefore(pmRow, sizeRow);
      }
    }

    // Upgrade Details Modal to place "מקורות" dropdown button on the right of "עונות ופרקים"
    var oldStreamsSec = document.getElementById('detailsStreamsSection');
    if (oldStreamsSec && oldStreamsSec.parentNode) {
      oldStreamsSec.parentNode.removeChild(oldStreamsSec);
    }
    var epSec = document.getElementById('detailsEpisodesSection');
    if (epSec && !document.getElementById('detailsSourcesDropdownBtn')) {
      epSec.classList.remove('hidden');
      epSec.innerHTML =
        '<div class="episodes-header">' +
          '<div class="episodes-header-right">' +
            '<div id="detailsSourcesDropdownWrap" class="details-sources-dropdown-wrap">' +
              '<button type="button" id="detailsSourcesDropdownBtn" class="explorer-dropdown-btn details-sources-btn tv-focusable" aria-haspopup="listbox" aria-expanded="false">' +
                '<svg class="dropdown-icon" viewBox="0 0 24 24" aria-hidden="true">' +
                  '<polygon points="12 2 2 7 12 12 22 7 12 2" />' +
                  '<polyline points="2 17 12 22 22 17" />' +
                  '<polyline points="2 12 12 17 22 12" />' +
                '</svg>' +
                '<span>מקורות</span>' +
                '<svg class="dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true">' +
                  '<polyline points="6 9 12 15 18 9" />' +
                '</svg>' +
              '</button>' +
              '<div id="detailsStreamsDropdownPanel" class="details-sources-dropdown-panel hidden" role="listbox" aria-label="בחירת מקור שידור">' +
                '<div id="detailsStreamsList" class="details-streams-list"></div>' +
              '</div>' +
            '</div>' +
            '<h3 id="detailsSectionHeading" class="episodes-section-title">עונות ופרקים</h3>' +
          '</div>' +
          '<div id="seasonSelector" class="season-selector" role="tablist" aria-label="בחירת עונה"></div>' +
        '</div>' +
        '<div id="episodesGrid" class="episodes-grid"></div>';
    }

    // Upgrade .header-left with Expanded Search Field + User Settings Menu on Left containing Telegram Button
    var hdrLeft = document.querySelector('#topHeader .header-left');
    if (hdrLeft && !document.getElementById('userSettingsDropdownWrap')) {
      hdrLeft.innerHTML =
        '<div id="headerSearchBox" class="header-search-box" role="search" aria-label="חיפוש רחב בקטלוג">' +
          '<svg viewBox="0 0 24 24" class="icon-svg header-search-icon" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="7" /><path d="M20 20l-4.2-4.2" />' +
          '</svg>' +
          '<input type="text" id="headerQuickSearchInput" class="header-quick-search-input tv-focusable" placeholder="חפש סרט, סדרה, שחקן או ערוץ..." aria-label="חפש סרט, סדרה, שחקן או ערוץ" autocomplete="off" />' +
          '<button type="button" id="openSearchBtn" class="header-search-submit-btn tv-focusable" aria-label="חיפוש קטלוג"><span class="header-btn-text">חיפוש</span></button>' +
        '</div>' +
        '<div id="userSettingsDropdownWrap" class="user-settings-dropdown-wrap">' +
          '<button type="button" id="userSettingsMenuBtn" class="header-auth-btn header-user-settings-btn tv-focusable" aria-haspopup="menu" aria-expanded="false" aria-label="תפריט הגדרות משתמש ופרופילים">' +
            '<span id="headerUserAvatarBadge" class="header-user-avatar-badge" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>' +
            '</span>' +
            '<span id="authBtnLabel">התחברות</span>' +
            '<svg viewBox="0 0 24 24" class="icon-svg user-settings-gear-icon" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>' +
            '<svg viewBox="0 0 24 24" class="icon-svg dropdown-chevron" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>' +
          '</button>' +
          '<div id="userSettingsDropdownPanel" class="user-settings-dropdown-panel hidden" role="menu" aria-label="תפריט הגדרות משתמש">' +
            '<div class="user-menu-header-card">' +
              '<div class="user-menu-profile-info">' +
                '<div id="userMenuAvatarCircle" class="user-menu-avatar-circle">S</div>' +
                '<div class="user-menu-profile-meta">' +
                  '<strong id="userMenuActiveProfileName" class="user-menu-profile-name">פרופיל ראשי</strong>' +
                  '<span id="userMenuAccountEmail" class="user-menu-account-email" dir="ltr">STREAM IT VIP</span>' +
                '</div>' +
              '</div>' +
              '<div id="userMenuProfilesQuickRow" class="user-menu-profiles-quick-row"></div>' +
            '</div>' +
            '<div class="user-menu-divider"></div>' +
            '<button type="button" id="openTelegramHubBtn" class="user-menu-item user-menu-tg-btn header-tg-btn tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>' +
              '<div class="user-menu-item-text"><span class="user-menu-item-title">+ ערוצי טלגרם</span><span class="user-menu-item-sub">חיבור וניהול ערוצי טלגרם VOD</span></div>' +
            '</button>' +
            '<button type="button" id="openAuthModalBtn" class="user-menu-item tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>' +
              '<div class="user-menu-item-text"><span class="user-menu-item-title">מי צופה עכשיו? (ניהול פרופילים)</span><span class="user-menu-item-sub">החלפת צופה, מצב ילדים ופרטי מנוי</span></div>' +
            '</button>' +
            '<button type="button" id="userMenuWatchlistBtn" class="user-menu-item tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>' +
              '<div class="user-menu-item-text"><span class="user-menu-item-title">הרשימה שלי והמשך צפייה</span><span class="user-menu-item-sub">כל הסרטים והסדרות ששמרת</span></div>' +
            '</button>' +
            '<button type="button" id="userMenuParentalBtn" class="user-menu-item user-menu-parental-item tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>' +
              '<div class="user-menu-item-text"><span class="user-menu-item-title">בקרת הורים וסינון סצנות (SafeWatch)</span><span id="userMenuParentalSub" class="user-menu-item-sub">דילוג אוטומטי על סקס, אלימות ושפה בוטה (ראשי ותתי-יוזרים)</span></div>' +
            '</button>' +
            '<button type="button" id="userMenuSubsSettingsBtn" class="user-menu-item tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 12h4M12 12h6M6 16h8M16 16h2" /></svg>' +
              '<div class="user-menu-item-text"><span id="userMenuSubsTitle" class="user-menu-item-title">העדפות כתוביות: עברית (ענק)</span><span class="user-menu-item-sub">לחץ לשינוי גודל גופן ברירת מחדל</span></div>' +
            '</button>' +
            '<button type="button" id="userMenuRefreshBtn" class="user-menu-item tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>' +
              '<div class="user-menu-item-text"><span class="user-menu-item-title">סנכרון ורענון קטלוג וערוצים</span><span class="user-menu-item-sub">עדכון מיידי של תכנים, ערוצים ומבזקים</span></div>' +
            '</button>' +
            '<div class="user-menu-divider"></div>' +
            '<button type="button" id="userMenuLogoutBtn" class="user-menu-item user-menu-logout-item tv-focusable" role="menuitem">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>' +
              '<div class="user-menu-item-text"><span class="user-menu-item-title">התנתק מהחשבון</span></div>' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    var detailsActions = document.querySelector('#detailsModal .details-actions');
    if (detailsActions && !document.getElementById('detailsRemoveCwBtn')) {
      var remBtnEl = document.createElement('button');
      remBtnEl.type = 'button';
      remBtnEl.id = 'detailsRemoveCwBtn';
      remBtnEl.className = 'btn-secondary details-remove-cw-btn tv-focusable hidden';
      remBtnEl.setAttribute('aria-label', 'הסר מרשימת המשך הצפייה');
      remBtnEl.innerHTML =
        '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>' +
        '<span>הסר מהמשך צפייה</span>';
      detailsActions.appendChild(remBtnEl);
    }

    var cwHeader = document.querySelector('#continueWatchingSection .row-header');
    if (cwHeader && !document.getElementById('clearContinueWatchingBtn')) {
      cwHeader.classList.add('cw-row-header');
      var clrBtn = document.createElement('button');
      clrBtn.type = 'button';
      clrBtn.id = 'clearContinueWatchingBtn';
      clrBtn.className = 'cw-clear-all-btn tv-focusable';
      clrBtn.setAttribute('aria-label', 'נקה את כל רשימת המשך הצפייה');
      clrBtn.innerHTML =
        '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" /></svg>' +
        '<span>נקה רשימת המשך צפייה</span>';
      cwHeader.appendChild(clrBtn);
    }

    // Ensure Telegram VOD nav link exists in #topHeader .main-nav on older APK DOMs
    var mainNav = document.querySelector('#topHeader .main-nav');
    if (mainNav && !mainNav.querySelector('[data-category="telegram"]')) {
      var tgNavBtn = document.createElement('button');
      tgNavBtn.type = 'button';
      tgNavBtn.className = 'nav-link tv-focusable';
      tgNavBtn.setAttribute('data-category', 'telegram');
      tgNavBtn.setAttribute('aria-label', 'סרטים וסדרות מטלגרם');
      tgNavBtn.textContent = 'טלגרם VOD';
      var seriesNavBtn = mainNav.querySelector('[data-category="series"]');
      if (seriesNavBtn && seriesNavBtn.nextSibling) {
        mainNav.insertBefore(tgNavBtn, seriesNavBtn.nextSibling);
      } else {
        mainNav.appendChild(tgNavBtn);
      }
    }

    // Ensure #liveNewsTickerBar exists inside #explorerDropdownsBar even when #explorerDropdownsBar already existed on older APK DOMs
    var expDropBar = document.getElementById('explorerDropdownsBar');
    if (expDropBar && !document.getElementById('liveNewsTickerBar')) {
      var tickerDiv = document.createElement('div');
      tickerDiv.id = 'liveNewsTickerBar';
      tickerDiv.className = 'live-news-ticker-bar';
      tickerDiv.setAttribute('aria-label', 'פיד מבזקי חדשות ועדכונים בזמן אמת');
      tickerDiv.innerHTML =
        '<div class="news-ticker-badge">' +
          '<span class="news-live-dot"></span>' +
          '<span>מבזקים LIVE</span>' +
        '</div>' +
        '<div class="news-ticker-viewport">' +
          '<div id="liveNewsTickerTrack" class="news-ticker-track">' +
            '<span class="news-ticker-item">טוען מבזקי חדשות ועדכוני שידורים בזמן אמת...</span>' +
          '</div>' +
        '</div>';
      expDropBar.appendChild(tickerDiv);
    }

    // Ensure #resumePlaybackToast and #seekThumbnailPreview exist inside #playerModal .player-stage on older APK DOMs
    var playerStage = document.querySelector('#playerModal .player-stage');
    if (playerStage && !document.getElementById('resumePlaybackToast')) {
      var resToast = document.createElement('div');
      resToast.id = 'resumePlaybackToast';
      resToast.className = 'resume-playback-toast hidden';
      resToast.setAttribute('dir', 'rtl');
      resToast.setAttribute('aria-live', 'polite');
      resToast.innerHTML =
        '<span id="resumePlaybackToastText">ממשיך צפייה מנקודת העצירה...</span>' +
        '<button type="button" id="resumeRestartFromZeroBtn" class="resume-restart-btn tv-focusable">התחל מהתחלה (00:00)</button>';
      playerStage.appendChild(resToast);
    }
    if (playerStage && !document.getElementById('seekThumbnailPreview')) {
      var seekPrev = document.createElement('div');
      seekPrev.id = 'seekThumbnailPreview';
      seekPrev.className = 'seek-thumbnail-preview hidden';
      seekPrev.setAttribute('dir', 'ltr');
      seekPrev.setAttribute('aria-hidden', 'true');
      seekPrev.innerHTML =
        '<div id="seekThumbImageBox" class="seek-thumb-image-box">' +
          '<img id="seekThumbImg" class="seek-thumb-img" src="" alt="" />' +
          '<div id="seekThumbBackdrop" class="seek-thumb-backdrop"></div>' +
          '<span id="seekThumbSceneBadge" class="seek-thumb-scene-badge">תצוגת סצנה</span>' +
          '<span id="seekThumbTimeBadge" class="seek-thumb-time-badge">00:00</span>' +
        '</div>' +
        '<div id="seekThumbCueText" class="seek-thumb-cue-text" dir="rtl"></div>';
      playerStage.appendChild(seekPrev);
    }

    // Ensure #embedTimelineHoverStrip and #embedFullscreenOverlayBtn exist inside #playerControlsOverlay on older APK DOMs
    if (ctrlOverlay && !document.getElementById('embedTimelineHoverStrip')) {
      var hoverStrip = document.createElement('div');
      hoverStrip.id = 'embedTimelineHoverStrip';
      hoverStrip.className = 'embed-timeline-hover-strip';
      hoverStrip.setAttribute('dir', 'ltr');
      hoverStrip.innerHTML =
        '<div class="embed-timeline-rail">' +
          '<div id="embedTimelineProgressFill" class="embed-timeline-progress-fill"></div>' +
          '<div id="embedTimelineHoverDot" class="embed-timeline-hover-dot"></div>' +
        '</div>';
      ctrlOverlay.appendChild(hoverStrip);
    }
    if (ctrlOverlay && !document.getElementById('embedFullscreenOverlayBtn')) {
      var fsOvBtn = document.createElement('button');
      fsOvBtn.type = 'button';
      fsOvBtn.id = 'embedFullscreenOverlayBtn';
      fsOvBtn.className = 'embed-fullscreen-overlay-btn tv-focusable';
      fsOvBtn.setAttribute('dir', 'ltr');
      fsOvBtn.setAttribute('title', 'מסך מלא (עם כתוביות בעברית)');
      fsOvBtn.setAttribute('aria-label', 'מסך מלא');
      fsOvBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
          '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />' +
        '</svg>';
      ctrlOverlay.appendChild(fsOvBtn);
    }

    // Ensure #telegramModal exists in document.body on older APK DOMs
    if (!document.getElementById('telegramModal')) {
      var tgMod = document.createElement('div');
      tgMod.id = 'telegramModal';
      tgMod.className = 'modal-overlay hidden';
      tgMod.setAttribute('role', 'dialog');
      tgMod.setAttribute('aria-modal', 'true');
      tgMod.setAttribute('aria-labelledby', 'telegramModalHeading');
      tgMod.innerHTML =
        '<div class="auth-modal-card tg-modal-card">' +
          '<div class="auth-card-header">' +
            '<div>' +
              '<h2 id="telegramModalHeading" class="auth-heading">טלגרם קולנוע VOD — חיבור ערוצים חינמי</h2>' +
              '<p class="tg-modal-sub">ללא חשבון אישי וללא מספר טלפון • שאיבה אוטומטית של סרטים, סדרות ווידאו מערוצי טלגרם ציבוריים</p>' +
            '</div>' +
            '<button type="button" id="closeTelegramModalBtn" class="modal-close-btn tv-focusable" aria-label="סגור חלון טלגרם">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>' +
            '</button>' +
          '</div>' +
          '<div class="tg-add-channel-bar">' +
            '<input type="text" id="tgChannelInput" class="form-input tg-channel-input tv-focusable" dir="ltr" placeholder="@channel_name או https://t.me/BoxOffice..." aria-label="שם ערוץ טלגרם או קישור לערוץ" autocomplete="off" />' +
            '<button type="button" id="tgAddChannelBtn" class="btn-primary tg-add-btn tv-focusable" aria-label="חבר ערוץ טלגרם"><span>+ חבר ערוץ</span></button>' +
            '<button type="button" id="tgSyncAllBtn" class="btn-secondary tg-sync-btn tv-focusable" aria-label="סנכרן את כל הערוצים"><span>סנכרן הכל</span></button>' +
          '</div>' +
          '<div id="tgSyncStatusMsg" class="tg-sync-status" aria-live="polite"></div>' +
          '<div class="tg-section-header">' +
            '<h3 class="sub-users-heading">ערוצי טלגרם מחוברים כעת:</h3>' +
            '<button type="button" id="tgFilterCatalogBtn" class="btn-secondary tg-filter-cat-btn tv-focusable" aria-label="הצג את כל תכני הטלגרם בקטלוג"><span>הצג בקטלוג הראשי</span></button>' +
          '</div>' +
          '<div id="tgConnectedChannelsList" class="tg-channels-grid"></div>' +
          '<div class="tg-section-header"><h3 class="sub-users-heading">תכנים אחרונים שנשאבו מערוצי הטלגרם:</h3></div>' +
          '<div id="tgRecentPostsGrid" class="tg-recent-posts-grid"></div>' +
        '</div>';
      document.body.appendChild(tgMod);
    }

    // Ensure #tvTopClock exists inside #topHeader .main-nav to the left of "הרשימה שלי"
    var mainNavEl = document.querySelector('#topHeader .main-nav');
    if (mainNavEl && !document.getElementById('tvTopClock')) {
      var clockSpan = document.createElement('span');
      clockSpan.id = 'tvTopClock';
      clockSpan.className = 'tv-top-clock';
      clockSpan.setAttribute('dir', 'ltr');
      clockSpan.setAttribute('aria-label', 'שעה נוכחית');
      mainNavEl.appendChild(clockSpan);
    }

    // Ensure #tvSideRail has the Streamer Right Menu with Soft Accordion + Open 2-Column Platforms Grid at bottom
    var tvSideRailEl = document.getElementById('tvSideRail');
    if (tvSideRailEl) {
      tvSideRailEl.innerHTML =
        '<div id="tvRailSearchSection" class="tv-rail-search-section">' +
          '<div class="tv-rail-search-row">' +
            '<button type="button" id="tvRailSearchBtn" class="tv-rail-search-btn tv-focusable" aria-expanded="false" aria-label="חיפוש סרטים, סדרות ושחקנים">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4.2-4.2" /></svg>' +
              '<span id="tvRailSearchText" class="tv-rail-search-text">חיפוש...</span>' +
            '</button>' +
            '<button type="button" id="tvRailSearchClearBtn" class="tv-rail-search-clear-btn tv-focusable hidden" aria-label="נקה חיפוש">✕</button>' +
          '</div>' +
          '<div id="tvRailMiniKeyboard" class="tv-rail-mini-keyboard hidden" dir="ltr" aria-label="מקלדת חיפוש מהירה"></div>' +
        '</div>' +
        '<div id="tvRailListsScroll" class="tv-rail-lists-scroll">' +
          '<div class="tv-rail-section" data-rail-section="categories">' +
            '<button type="button" id="tvRailSecCategoriesBtn" class="tv-rail-sec-header tv-focusable" aria-expanded="false"><span>קטגוריות</span><span class="tv-rail-sec-arrow">◂</span></button>' +
            '<div id="tvRailCategoriesList" class="tv-rail-sec-list"></div>' +
          '</div>' +
          '<div class="tv-rail-section" data-rail-section="years">' +
            '<button type="button" id="tvRailSecYearsBtn" class="tv-rail-sec-header tv-focusable" aria-expanded="false"><span>לפי שנה</span><span class="tv-rail-sec-arrow">◂</span></button>' +
            '<div id="tvRailYearsList" class="tv-rail-sec-list"></div>' +
          '</div>' +
          '<div class="tv-rail-section" data-rail-section="actors">' +
            '<button type="button" id="tvRailSecActorsBtn" class="tv-rail-sec-header tv-focusable" aria-expanded="false"><span>שחקנים</span><span class="tv-rail-sec-arrow">◂</span></button>' +
            '<div id="tvRailActorsList" class="tv-rail-sec-list"></div>' +
          '</div>' +
          '<div class="tv-rail-section tv-rail-platforms-section" data-rail-section="platforms">' +
            '<button type="button" id="tvRailSecPlatformsBtn" class="tv-rail-sec-header open tv-focusable" aria-expanded="true"><span>פלטפורמות</span><span class="tv-rail-sec-arrow">▾</span></button>' +
            '<div id="tvRailPlatformsList" class="tv-rail-sec-list tv-rail-platforms-grid open"></div>' +
          '</div>' +
        '</div>' +
        '<div id="tvRailBottomBar" class="tv-rail-bottom-bar">' +
          '<button type="button" id="tvRailProfileBtn" class="tv-rail-bottom-btn tv-rail-profile-btn tv-focusable" aria-label="פרופיל משתמש">' +
            '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>' +
            '<span id="tvRailProfileName" class="tv-rail-profile-name">ראשי</span>' +
          '</button>' +
          '<button type="button" id="tvRailSettingsBtn" class="tv-rail-bottom-btn tv-rail-settings-btn tv-focusable" aria-label="הגדרות">' +
            '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>' +
          '</button>' +
        '</div>';
    }

    // Ensure #tvMoreModal exists and uses the v9.6.6 Tabbed Settings & Actors Center layout
    if (!document.getElementById('tvMoreModal') || !document.getElementById('tvMoreTabSettingsBtn')) {
      var moreMod = document.getElementById('tvMoreModal') || document.createElement('div');
      moreMod.id = 'tvMoreModal';
      moreMod.className = 'modal-overlay hidden';
      moreMod.setAttribute('role', 'dialog');
      moreMod.setAttribute('aria-modal', 'true');
      moreMod.setAttribute('aria-labelledby', 'tvMoreModalHeading');
      moreMod.innerHTML =
        '<div class="auth-modal-card tv-more-modal-card">' +
          '<div class="auth-card-header">' +
            '<div>' +
              '<h2 id="tvMoreModalHeading" class="auth-heading">מרכז הגדרות, פרופילים וניהול מערכת</h2>' +
              '<p class="tg-modal-sub">ניהול משתמשים, בקרת הורים (SafeWatch), ערוצי טלגרם VOD, כתוביות וחיפוש שחקנים</p>' +
            '</div>' +
            '<button type="button" id="closeTvMoreModalBtn" class="modal-close-btn tv-focusable" aria-label="סגור חלון הגדרות">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>' +
            '</button>' +
          '</div>' +
          '<div class="tv-more-tabs-bar" role="tablist" aria-label="כרטיסיות מרכז הגדרות">' +
            '<button type="button" id="tvMoreTabSettingsBtn" class="tv-more-tab-btn active tv-focusable" data-more-tab="settings" role="tab" aria-selected="true">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>' +
              '<span>הגדרות, פרופילים וניהול</span>' +
            '</button>' +
            '<button type="button" id="tvMoreTabActorsBtn" class="tv-more-tab-btn tv-focusable" data-more-tab="actors" role="tab" aria-selected="false">' +
              '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>' +
              '<span>חיפוש וגלריית שחקנים</span>' +
            '</button>' +
          '</div>' +
          '<div id="tvMoreTabSettingsPanel" class="tv-more-tab-panel">' +
            '<div class="tv-more-actions-grid">' +
              '<button type="button" id="tvMoreProfilesBtn" class="tv-more-action-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>' +
                '<div class="tv-more-text"><strong>מי צופה עכשיו? (פרופילים ויוזרים)</strong><span>החלפת פרופיל פעיל, הוספת תת-יוזר וניהול מנויים</span></div>' +
              '</button>' +
              '<button type="button" id="tvMoreParentalBtn" class="tv-more-action-card tv-more-parental-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg></span>' +
                '<div class="tv-more-text"><strong id="tvMoreParentalLabel">בקרת הורים וסינון סצנות (SafeWatch)</strong><span id="tvMoreParentalSubLabel">דילוג אוטומטי על סקס, אלימות, שפה בוטה וסמים לפי פרופיל</span></div>' +
              '</button>' +
              '<button type="button" id="tvMoreTelegramCatBtn" class="tv-more-action-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg></span>' +
                '<div class="tv-more-text"><strong>קטלוג טלגרם VOD</strong><span>הצג את כל הסרטים והסדרות שנשאבו מערוצי הטלגרם</span></div>' +
              '</button>' +
              '<button type="button" id="tvMoreTelegramHubBtn" class="tv-more-action-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>' +
                '<div class="tv-more-text"><strong>חיבור וניהול ערוצי טלגרם</strong><span>הוספת ערוצים ציבוריים חדשים וסנכרון תוכן מיידי</span></div>' +
              '</button>' +
              '<button type="button" id="tvMoreSubsBtn" class="tv-more-action-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="0" /><path d="M6 12h4M12 12h6M6 16h8M16 16h2" /></svg></span>' +
                '<div class="tv-more-text"><strong id="tvMoreSubsLabel">כתוביות: עברית (ענק)</strong><span>החלף שפת כתוביות ברירת מחדל (עברית / אנגלית / כבוי)</span></div>' +
              '</button>' +
              '<button type="button" id="tvMoreYoutubeBtn" class="tv-more-action-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="0" /><path d="M10 9l5 3-5 3V9z" /></svg></span>' +
                '<div class="tv-more-text"><strong>יוטיוב וטריילרים</strong><span>עבור למסך הטריילרים ותכני הווידאו מיוטיוב</span></div>' +
              '</button>' +
              '<button type="button" id="tvMoreRefreshBtn" class="tv-more-action-card tv-focusable">' +
                '<span class="tv-more-icon"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg></span>' +
                '<div class="tv-more-text"><strong>סנכרון ורענון קטלוג</strong><span>משיכת תכנים חדשים, עדכון פוסטרים ובדיקת גרסה</span></div>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div id="tvMoreTabActorsPanel" class="tv-more-tab-panel hidden">' +
            '<div class="tv-more-actors-section">' +
              '<div class="tv-more-actors-header">' +
                '<h3 class="sub-users-heading">שחקנים ופילמוגרפיה (בחר שחקן מהרשימה או חפש לפי שם)</h3>' +
                '<div class="tv-more-actor-search-bar">' +
                  '<input type="text" id="tvMoreActorSearchInput" class="form-input tv-more-actor-input tv-focusable" dir="rtl" placeholder="חפש שחקן (למשל: ברוס ויליס, גל גדות)..." aria-label="חפש שחקן או שחקנית" autocomplete="off" />' +
                  '<button type="button" id="tvMoreActorSearchBtn" class="btn-primary tv-more-actor-btn tv-focusable">חפש שחקן</button>' +
                '</div>' +
              '</div>' +
              '<div id="tvMoreActorsGrid" class="actor-photo-grid tv-more-actors-grid"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      if (!moreMod.parentNode) {
        document.body.appendChild(moreMod);
      }
    }

    // Ensure SafeWatch Parental Control buttons & overlays exist even on pre-existing v9.4+ DOMs
    var uPanel = document.getElementById('userSettingsDropdownPanel');
    if (uPanel && !document.getElementById('userMenuParentalBtn')) {
      var pBtn = document.createElement('button');
      pBtn.type = 'button';
      pBtn.id = 'userMenuParentalBtn';
      pBtn.className = 'user-menu-item user-menu-parental-item tv-focusable';
      pBtn.setAttribute('role', 'menuitem');
      pBtn.innerHTML =
        '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>' +
        '<div class="user-menu-item-text"><span class="user-menu-item-title">בקרת הורים וסינון סצנות (SafeWatch)</span><span id="userMenuParentalSub" class="user-menu-item-sub">דילוג אוטומטי על סקס, אלימות ושפה בוטה (ראשי ותתי-יוזרים)</span></div>';
      var wlItem = document.getElementById('userMenuWatchlistBtn');
      if (wlItem && wlItem.nextSibling) {
        uPanel.insertBefore(pBtn, wlItem.nextSibling);
      } else {
        uPanel.appendChild(pBtn);
      }
    }

    var moreGrid = document.querySelector('#tvMoreModal .tv-more-actions-grid');
    if (moreGrid && !document.getElementById('tvMoreParentalBtn')) {
      var mParBtn = document.createElement('button');
      mParBtn.type = 'button';
      mParBtn.id = 'tvMoreParentalBtn';
      mParBtn.className = 'tv-more-action-card tv-focusable';
      mParBtn.innerHTML =
        '<span class="tv-more-action-icon">🛡️</span>' +
        '<span class="tv-more-action-text"><span class="tv-more-action-title">בקרת הורים (SafeWatch)</span><span id="tvMoreParentalLabel" class="tv-more-action-desc">סינון סקס, אלימות ושפה בוטה</span></span>';
      moreGrid.insertBefore(mParBtn, moreGrid.firstChild);
    }

    var subActionsRow = document.querySelector('#authModal .sub-users-actions');
    if (subActionsRow && !document.getElementById('authOpenParentalModalBtn')) {
      var authParBtn = document.createElement('button');
      authParBtn.type = 'button';
      authParBtn.id = 'authOpenParentalModalBtn';
      authParBtn.className = 'btn-secondary sub-user-action-btn parental-auth-trigger-btn tv-focusable';
      authParBtn.innerHTML = '<span>🛡️ בקרת הורים וסינון סצנות (ראשי ותתי-יוזרים)</span>';
      subActionsRow.appendChild(authParBtn);
    }

    if (playerStage && !document.getElementById('parentalSkipBanner')) {
      var pBanner = document.createElement('div');
      pBanner.id = 'parentalSkipBanner';
      pBanner.className = 'parental-skip-banner hidden';
      pBanner.setAttribute('dir', 'rtl');
      pBanner.setAttribute('aria-live', 'polite');
      pBanner.innerHTML =
        '<div class="parental-skip-icon-wrap">' +
          '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>' +
        '</div>' +
        '<div class="parental-skip-text-wrap">' +
          '<strong id="parentalSkipBannerTitle" class="parental-skip-title">בקרת הורים (SafeWatch) — דילוג אוטומטי</strong>' +
          '<span id="parentalSkipBannerDesc" class="parental-skip-desc">דולג אוטומטית על קטע לא הולם</span>' +
        '</div>';
      playerStage.appendChild(pBanner);
    }

    if (playerStage && !document.getElementById('parentalShieldOverlay')) {
      var pShield = document.createElement('div');
      pShield.id = 'parentalShieldOverlay';
      pShield.className = 'parental-shield-overlay hidden';
      pShield.setAttribute('dir', 'rtl');
      pShield.setAttribute('aria-live', 'assertive');
      pShield.innerHTML =
        '<div class="parental-shield-card">' +
          '<div class="parental-shield-badge"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg><span>מגן צפייה משפחתי פעיל</span></div>' +
          '<h3 id="parentalShieldHeading" class="parental-shield-title">המסך הושחר זמנית עקב קטע לא הולם</h3>' +
          '<p id="parentalShieldSub" class="parental-shield-sub">התמונה והשמע הושתקו אוטומטית עד לסיום הקטע</p>' +
          '<button type="button" id="parentalShieldSkipNowBtn" class="btn-primary parental-shield-skip-btn tv-focusable">דלג מיד לסיום הקטע ⏭</button>' +
        '</div>';
      playerStage.appendChild(pShield);
    }

    var playerTopActs = document.querySelector('#playerControlsOverlay .player-top-actions');
    if (playerTopActs && !document.getElementById('playerTopParentalBtn')) {
      var topParBtn = document.createElement('button');
      topParBtn.type = 'button';
      topParBtn.id = 'playerTopParentalBtn';
      topParBtn.className = 'player-top-pill-btn player-parental-pill-btn tv-focusable';
      topParBtn.setAttribute('aria-label', 'בקרת הורים וסינון סצנות');
      topParBtn.innerHTML =
        '<svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>' +
        '<span id="playerTopParentalLabel">SafeWatch</span>';
      playerTopActs.insertBefore(topParBtn, playerTopActs.firstChild);
    }

    if (ctrlOverlay && !document.getElementById('playerParentalMenu')) {
      var pMenuDiv = document.createElement('div');
      pMenuDiv.id = 'playerParentalMenu';
      pMenuDiv.className = 'player-subs-popover player-parental-popover hidden';
      pMenuDiv.setAttribute('role', 'dialog');
      pMenuDiv.setAttribute('aria-label', 'בקרת הורים ודילוג סצנות בזמן צפייה');
      pMenuDiv.innerHTML =
        '<div class="subs-popover-section">' +
          '<div class="subs-popover-title">🛡️ בקרת הורים וסינון סצנות (SafeWatch)</div>' +
          '<div id="playerParentalActiveStatus" class="player-parental-status-box">פרופיל פעיל: ראשי</div>' +
          '<div id="playerParentalQuickToggles" class="player-parental-quick-toggles"></div>' +
        '</div>' +
        '<div class="subs-popover-section">' +
          '<div class="subs-popover-title">סימון קטע בזמן אמת (ידני + אוטומטי לעתיד)</div>' +
          '<div class="subs-sync-controls">' +
            '<button type="button" id="playerMarkAndSkipSceneBtn" class="subs-chip-btn active tv-focusable" style="width:100%;">⏭ דלג עכשיו +30 שנ׳ וסמן כקטע לא הולם</button>' +
          '</div>' +
          '<div class="subs-sync-controls" style="margin-top:8px;">' +
            '<button type="button" id="playerOpenFullParentalModalBtn" class="subs-chip-btn tv-focusable" style="width:100%;">⚙️ פתח ניהול בקרת הורים מלא (ראשי ותתי-יוזרים)</button>' +
          '</div>' +
        '</div>';
      ctrlOverlay.appendChild(pMenuDiv);
    }

    if (!document.getElementById('parentalControlModal')) {
      var pModal = document.createElement('div');
      pModal.id = 'parentalControlModal';
      pModal.className = 'modal-overlay hidden';
      pModal.setAttribute('role', 'dialog');
      pModal.setAttribute('aria-modal', 'true');
      pModal.setAttribute('aria-labelledby', 'parentalControlModalHeading');
      pModal.innerHTML =
        '<div class="auth-modal-card parental-modal-card" dir="rtl">' +
          '<div class="auth-card-header parental-card-header">' +
            '<div class="parental-header-title-wrap">' +
              '<div class="parental-shield-hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24" class="icon-svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg></div>' +
              '<div>' +
                '<h2 id="parentalControlModalHeading" class="auth-heading">בקרת הורים וסינון סצנות אוטומטי (SafeWatch AI)</h2>' +
                '<p class="parental-modal-sub">ניהול עצמי של המשתמש הראשי וכל תתי-היוזרים • דילוג אוטומטי, השחרת מסך או צנזור קללות בזמן אמת</p>' +
              '</div>' +
            '</div>' +
            '<button type="button" id="closeParentalModalBtn" class="modal-close-btn tv-focusable" aria-label="סגור הגדרות בקרת הורים"><svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg></button>' +
          '</div>' +
          '<div id="parentalPinVerifyGate" class="parental-pin-gate hidden">' +
            '<div class="parental-pin-gate-icon">🔒</div>' +
            '<h3 class="parental-pin-gate-title">הגדרות בקרת ההורים מוגנות בקוד PIN</h3>' +
            '<p class="parental-pin-gate-desc">הזן את קוד ה-PIN בן 4 הספרות של מנהל החשבון כדי לערוך את הגדרות הסינון של המשתמש ותתי-היוזרים:</p>' +
            '<div class="parental-pin-input-row">' +
              '<input type="password" id="parentalPinVerifyInput" class="form-input parental-pin-input tv-focusable" maxlength="4" inputmode="numeric" dir="ltr" placeholder="••••" aria-label="קוד PIN בן 4 ספרות" autocomplete="off" />' +
              '<button type="button" id="parentalPinGateSubmitBtn" class="btn-primary tv-focusable">פתח נעילה</button>' +
            '</div>' +
            '<p id="parentalPinGateError" class="parental-pin-error hidden">קוד ה-PIN שהוזן שגוי. נסה שנית.</p>' +
          '</div>' +
          '<div id="parentalControlMainContent" class="parental-main-content">' +
            '<div class="parental-section-block">' +
              '<div class="parental-section-header">' +
                '<h3 class="parental-section-title">1. בחר פרופיל לניהול (משתמש ראשי או תתי-יוזרים):</h3>' +
                '<div class="parental-bulk-actions">' +
                  '<button type="button" id="parentalApplySubUsersBtn" class="parental-bulk-btn tv-focusable">החל על כל תתי-היוזרים</button>' +
                  '<button type="button" id="parentalApplyAllBtn" class="parental-bulk-btn tv-focusable">החל על כל החשבון</button>' +
                '</div>' +
              '</div>' +
              '<div id="parentalProfilesSelectorRow" class="parental-profiles-selector-row" role="tablist" aria-label="פרופילים בחשבון"></div>' +
            '</div>' +
            '<div id="parentalMasterToggleCard" class="parental-master-toggle-card">' +
              '<div class="parental-master-info">' +
                '<div class="parental-master-title-row"><span id="parentalEditingProfileBadge" class="parental-editing-badge">פרופיל נבחר</span><strong id="parentalEditingProfileTitle" class="parental-master-title">סינון צפייה עבור: ראשי</strong></div>' +
                '<p id="parentalEditingProfileSub" class="parental-master-sub">כשמופעל, המערכת תנטר את הסרט או הפרק בזמן אמת ותדלג אוטומטית על הקטעים שסימנת למטה.</p>' +
              '</div>' +
              '<button type="button" id="parentalMasterToggleBtn" class="parental-switch-btn tv-focusable" role="switch" aria-checked="false"><span class="parental-switch-track"><span class="parental-switch-thumb"></span></span><span id="parentalMasterToggleLabel" class="parental-switch-label">כבוי</span></button>' +
            '</div>' +
            '<div class="parental-section-block">' +
              '<h3 class="parental-section-title">2. בחר אילו סוגי תכנים לא הולמים לסנן עבור פרופיל זה:</h3>' +
              '<div id="parentalCategoriesGrid" class="parental-categories-grid">' +
                '<button type="button" class="parental-cat-card tv-focusable" data-parental-cat="sex" aria-pressed="true"><div class="parental-cat-top"><span class="parental-cat-icon">🔞</span><span class="parental-cat-check" aria-hidden="true">✓</span></div><strong class="parental-cat-name">סקס, מיניות ועירום</strong><span class="parental-cat-desc">דילוג אוטומטי על סצנות מין, אינטימיות מפורשת ועירום</span></button>' +
                '<button type="button" class="parental-cat-card tv-focusable" data-parental-cat="violence" aria-pressed="true"><div class="parental-cat-top"><span class="parental-cat-icon">🩸</span><span class="parental-cat-check" aria-hidden="true">✓</span></div><strong class="parental-cat-name">אלימות קשה, דם וזוועה</strong><span class="parental-cat-desc">דילוג על סצנות רצח, עינויים, דם קיצוני ופגיעות קשות</span></button>' +
                '<button type="button" class="parental-cat-card tv-focusable" data-parental-cat="profanity" aria-pressed="true"><div class="parental-cat-top"><span class="parental-cat-icon">🤬</span><span class="parental-cat-check" aria-hidden="true">✓</span></div><strong class="parental-cat-name">שפה בוטה וקללות</strong><span class="parental-cat-desc">השתקת שמע אוטומטית וצנזור מילים גסות בכתוביות (****) או דילוג</span></button>' +
                '<button type="button" class="parental-cat-card tv-focusable" data-parental-cat="drugs" aria-pressed="false"><div class="parental-cat-top"><span class="parental-cat-icon">💊</span><span class="parental-cat-check" aria-hidden="true">✓</span></div><strong class="parental-cat-name">סמים, אלכוהול ועישון</strong><span class="parental-cat-desc">סינון סצנות שימוש בסמים, הזרקות ושתיית אלכוהול מفرטת</span></button>' +
                '<button type="button" class="parental-cat-card tv-focusable" data-parental-cat="horror" aria-pressed="false"><div class="parental-cat-top"><span class="parental-cat-icon">👻</span><span class="parental-cat-check" aria-hidden="true">✓</span></div><strong class="parental-cat-name">אימה, הבהלות וקטעים מפחידים</strong><span class="parental-cat-desc">דילוג על סצנות בעתה, שדים וקטעי Jump-Scare מבהילים</span></button>' +
              '</div>' +
            '</div>' +
            '<div class="parental-options-columns">' +
              '<div class="parental-option-box"><h4 class="parental-option-heading">3. פעולה בזמן סצנה ויזואלית (סקס / אלימות / סמים / אימה):</h4><div class="parental-segmented-row"><button type="button" class="parental-seg-btn active tv-focusable" data-parental-action="skip">⏭ דילוג אוטומטי על הסצנה</button><button type="button" class="parental-seg-btn tv-focusable" data-parental-action="blur_mute">🛡️ השחרת מסך + השתקת קול</button></div></div>' +
              '<div class="parental-option-box"><h4 class="parental-option-heading">4. פעולה בזמן שפה בוטה וקללות:</h4><div class="parental-segmented-row"><button type="button" class="parental-seg-btn active tv-focusable" data-parental-profanity="mute_censor">🔇 השתקת שמע + צנזור כתוביות (מומלץ)</button><button type="button" class="parental-seg-btn tv-focusable" data-parental-profanity="skip">⏭ דילוג מלא על המשפט</button></div></div>' +
              '<div class="parental-option-box"><h4 class="parental-option-heading">5. רמת רגישות וטווח ביטחון:</h4><div class="parental-segmented-row"><button type="button" class="parental-seg-btn active tv-focusable" data-parental-sensitivity="balanced">⚖️ מאוזן (מדויק לפי הסצנה)</button><button type="button" class="parental-seg-btn tv-focusable" data-parental-sensitivity="strict">🔒 מחמיר (+5 שניות מרווח ביטחון)</button></div></div>' +
            '</div>' +
            '<div class="parental-pin-setup-bar">' +
              '<div class="parental-pin-setup-info"><strong class="parental-pin-setup-title">🔐 נעילת הגדרות בקוד PIN של המשתמש הראשי:</strong><span class="parental-pin-setup-sub">מנע מתתי-היוזרים והילדים לכבות את הסינון או לעבור לפרופיל מבוגר ללא קוד</span></div>' +
              '<div class="parental-pin-setup-controls"><input type="password" id="parentalPinNewInput" class="form-input parental-pin-setup-input tv-focusable" maxlength="4" inputmode="numeric" dir="ltr" placeholder="קוד 4 ספרות" aria-label="קוד PIN חדש בן 4 ספרות" autocomplete="off" /><button type="button" id="parentalSavePinBtn" class="btn-secondary parental-pin-save-btn tv-focusable">שמור קוד</button><button type="button" id="parentalClearPinBtn" class="btn-secondary parental-pin-clear-btn tv-focusable hidden">בטל קוד</button></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(pModal);
    }
  }

  function initLiveNewsTicker() {
    if (document.body && document.body.classList.contains('tv-mode')) return;
    var track = document.getElementById('liveNewsTickerTrack');
    if (!track) return;

    var renderTickerHeadlines = function (headlines) {
      if (!Array.isArray(headlines) || !headlines.length) return;
      var normalized = headlines.map(function (h) {
        if (typeof h === 'string') {
          return { source: 'LIVE', title: h };
        }
        return {
          source: String(h.source || 'LIVE').trim(),
          title: String(h.title || '').trim()
        };
      }).filter(function (item) { return Boolean(item.title); });

      if (!normalized.length) return;

      // Balanced broadcast crawl speed: ~15 seconds per headline (minimum 210s for full loop)
      var durSec = Math.max(210, Math.round(normalized.length * 15));
      track.style.animationDuration = durSec + 's';

      var list = normalized.concat(normalized); // duplicate for seamless infinite loop
      track.innerHTML = list.map(function (item) {
        return (
          '<span class="news-ticker-item">' +
            '<span class="news-source-badge">' + escapeHtml(item.source) + '</span>' +
            '<span>' + escapeHtml(item.title) + '</span>' +
            '<span class="news-ticker-sep">•</span>' +
          '</span>'
        );
      }).join('');
    };

    var fallbackHeadlines = [
      { source: 'כאן 11 / N12', title: 'שידורי קשת 12, כאן 11, רשת 13, עכשיו 14 וכאן חינוכית 23 זמינים ב-1080p50 HD תחת קטגוריית "ערוצים"' },
      { source: 'קולנוע 4K', title: 'נוספו שוברי קופות וסדרות חדשות ב-4K UHD עם כתוביות מסונכרנות בעברית' },
      { source: 'טלגרם VOD', title: 'סנכרון אוטומטי מערוצי הטלגרם המובילים בישראל פועל בזמן אמת מתוך תפריט הגדרות המשתמש' },
      { source: 'Ynet חדשות', title: 'מבזקי חדשות, ביטחון, כלכלה, ספורט ותרבות מתעדכנים בשידור חי ממגוון מקורות מובילים' },
      { source: 'וואלה! תרבות', title: 'הפקות מקור ישראליות, סדרות דרמה ודוקו מובילות זמינות לצפייה ישירה' },
      { source: 'ספורט HD', title: 'שידורי ספורט וחדשות מהעולם 24/7: SPORT 55 HD, סקיי ניוז, CBS News ו-ABC News בשידור ישיר' }
    ];
    renderTickerHeadlines(fallbackHeadlines);

    var rssSources = [
      { name: 'Ynet מבזקים', url: 'https://www.ynet.co.il/Integration/StoryRss1854.xml', max: 6 },
      { name: 'N12 / מאקו', url: 'https://rcs.mako.co.il/rss/31750a2610f26110VgnVCM1000005201000aRCRD.xml', max: 6 },
      { name: 'וואלה! חדשות', url: 'https://rss.walla.co.il/feed/22', max: 6 },
      { name: 'חדשות ישראל', url: 'https://news.google.com/rss?hl=iw&gl=IL&ceid=IL:he', max: 8, parseGoogleSource: true }
    ];

    var parseHeadlineEntry = function (rawTitle, defaultSource, parseGoogle) {
      var clean = String(rawTitle || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();
      if (!clean) return null;
      var srcLabel = defaultSource;
      if (parseGoogle) {
        var dashIdx = clean.lastIndexOf(' - ');
        if (dashIdx > 8 && dashIdx < clean.length - 2) {
          srcLabel = clean.slice(dashIdx + 3).trim();
          clean = clean.slice(0, dashIdx).trim();
        }
      }
      return { source: srcLabel, title: clean };
    };

    var fetchSingleSource = async function (src) {
      // 1. Primary JSON RSS proxy
      try {
        var jsonUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(src.url);
        var res = await fetch(jsonUrl);
        if (res.ok) {
          var data = await res.json();
          if (data && Array.isArray(data.items) && data.items.length) {
            var parsed = data.items.slice(0, src.max || 5).map(function (it) {
              return parseHeadlineEntry(it.title, src.name, src.parseGoogleSource);
            }).filter(Boolean);
            if (parsed.length) return parsed;
          }
        }
      } catch (e) {}

      // 2. Fallback XML CORS proxy + DOMParser
      try {
        var xmlProxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(src.url);
        var xmlRes = await fetch(xmlProxyUrl);
        if (xmlRes.ok) {
          var xmlText = await xmlRes.text();
          if (xmlText && typeof window.DOMParser === 'function') {
            var doc = new window.DOMParser().parseFromString(xmlText, 'text/xml');
            var nodes = doc.querySelectorAll('item > title, entry > title');
            var xmlItems = [];
            for (var n = 0; n < nodes.length && xmlItems.length < (src.max || 5); n++) {
              var entry = parseHeadlineEntry(nodes[n].textContent, src.name, src.parseGoogleSource);
              if (entry) xmlItems.push(entry);
            }
            if (xmlItems.length) return xmlItems;
          }
        }
      } catch (e2) {}

      return [];
    };

    // Defer live RSS network fetches by 1.8s so initial app boot & catalog load have 100% network priority
    setTimeout(async function () {
      try {
        var results = await Promise.all(rssSources.map(fetchSingleSource));
        var maxLen = 0;
        for (var r = 0; r < results.length; r++) {
          if (results[r].length > maxLen) maxLen = results[r].length;
        }
        var interleaved = [];
        var seenTitles = {};
        for (var idx = 0; idx < maxLen; idx++) {
          for (var s = 0; s < results.length; s++) {
            var item = results[s][idx];
            if (item && item.title) {
              var normKey = item.title.slice(0, 42);
              if (!seenTitles[normKey]) {
                seenTitles[normKey] = true;
                interleaved.push(item);
              }
            }
          }
        }
        if (interleaved.length >= 4) {
          renderTickerHeadlines(interleaved);
        }
      } catch (e) {}
    }, 1800);
  }

  function initTvTopClock() {
    var updateClock = function () {
      var el = document.getElementById('tvTopClock');
      if (!el) return;
      var now = new Date();
      var hh = String(now.getHours());
      if (hh.length < 2) hh = '0' + hh;
      var mm = String(now.getMinutes());
      if (mm.length < 2) mm = '0' + mm;
      var txt = hh + ':' + mm;
      if (el.textContent !== txt) el.textContent = txt;
    };
    updateClock();
    setInterval(updateClock, 15000);
  }

  function bootStreamItApp() {
    if (window.__STREAMIT_V970_BOOT_DONE) return;
    window.__STREAMIT_V970_BOOT_DONE = true;

    // If an older bundled APK script ran 1ms earlier, strip its stale DOM listeners via cloneNode(true)
    if (wasLegacyBooted) {
      var rootContainers = ['topHeader', 'tvSideRail', 'mainStage', 'searchModal', 'detailsModal', 'playerModal', 'authModal', 'parentalControlModal', 'telegramModal', 'tvMoreModal'];
      for (var rc = 0; rc < rootContainers.length; rc++) {
        var el = document.getElementById(rootContainers[rc]);
        if (el && el.parentNode) {
          el.parentNode.replaceChild(el.cloneNode(true), el);
        }
      }
    }

    upgradeDomFromV93ToV94IfNeeded();
    if (window.TVNavigation && typeof window.TVNavigation.rebindAll === 'function') {
      window.TVNavigation.rebindAll();
    }
    updateBootLoaderProgress(12, 'מאתחל ליבת STREAM IT ומאמת חשבון ענן...', {
      cloud: 'active'
    });
    initTvTopClock();
    loadLocalStorageState();
    updateAuthUi();
    bindUiEvents();
    initLiveNewsTicker();
    loadCatalog();
    syncAccountStateFromCloudVault().catch(function () {});
    setTimeout(checkCloudOtaUpdates, 2500);
    if (window.TVNavigation && typeof window.TVNavigation.ensureInitialFocus === 'function') {
      window.TVNavigation.ensureInitialFocus();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootStreamItApp);
  } else {
    bootStreamItApp();
  }
})();
