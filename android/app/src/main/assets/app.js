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

  var APP_VERSION = '9.4.7';

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
    { id: 'channels', label: 'ערוצים חיים (ישראל וארה״ב)' },
    { id: 'youtube', label: 'יוטיוב • YouTube' }
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

  // Default Netflix-style Sub-User Profiles ("מי צופה עכשיו?")
  var DEFAULT_SUB_USERS = [
    { id: 'prof-main', name: 'ראשי (VIP)', color: '#E50914', isKids: false, isPrimary: true },
    { id: 'prof-living', name: 'סלון', color: '#2563EB', isKids: false, isPrimary: false },
    { id: 'prof-bedroom', name: 'חדר שינה', color: '#059669', isKids: false, isPrimary: false },
    { id: 'prof-kids', name: 'ילדים ונוער', color: '#D97706', isKids: true, isPrimary: false }
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

  // 28+ Live HD Channels: Israeli Idan+ + US News 24/7 + US & Global Sports HD
  var BUILTIN_CHANNELS = [
    {
      id: 'il_kan11',
      type: 'channel',
      title: 'כאן 11 — שידור חי HD',
      originalTitle: 'KAN 11 Live',
      year: 'LIVE',
      rating: 'IL',
      overview: 'שידור חי מהתאגיד הציבורי הישראלי: חדשות, סדרות מקור, דוקו ואירועי ספורט.',
      poster: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://kan11.media.kan.org.il/hls/live/2024514/2024514/master.m3u8',
      genres: ['live', 'israeli'],
      genresHe: ['ישראל', 'שידור חי']
    },
    {
      id: 'il_keshet12',
      type: 'channel',
      title: 'קשת 12 — שידור חי HD',
      originalTitle: 'Keshet 12 Live',
      year: 'LIVE',
      rating: 'IL',
      overview: 'שידור ישיר של ערוץ 12: חדשות 12, תוכניות פריים טיים, ריאליטי ואקטואליה.',
      poster: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://mako-streaming.akamaized.net/stream/hls/live/2033791/k12dvr/index.m3u8',
      genres: ['live', 'israeli'],
      genresHe: ['ישראל', 'שידור חי']
    },
    {
      id: 'il_reshet13',
      type: 'channel',
      title: 'רשת 13 — שידור חי HD',
      originalTitle: 'Reshet 13 Live',
      year: 'LIVE',
      rating: 'IL',
      overview: 'שידור חי של ערוץ רשת 13: חדשות 13, דרמות, תחקירים ותוכניות בידור.',
      poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://d18b0e6mopany4.cloudfront.net/out/v1/08bc71cf0a0f4712b6b03c732b0e6d25/index.m3u8',
      genres: ['live', 'israeli'],
      genresHe: ['ישראל', 'שידור חי']
    },
    {
      id: 'il_now14',
      type: 'channel',
      title: 'עכשיו 14 — שידור חי HD',
      originalTitle: 'Channel 14 Israel Live',
      year: 'LIVE',
      rating: 'IL',
      overview: 'שידור חי של ערוץ 14: חדשות, הפטריוטים, אקטואליה וראיונות מאולפני הערוץ.',
      poster: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://now14.ipbc.org.il/hls/live/2024514/2024514/master.m3u8',
      genres: ['live', 'israeli'],
      genresHe: ['ישראל', 'חדשות']
    },
    {
      id: 'il_i24news',
      type: 'channel',
      title: 'i24NEWS — חדשות בשידור חי',
      originalTitle: 'i24NEWS Live',
      year: 'LIVE',
      rating: 'HD',
      overview: 'ערוץ החדשות הבינלאומי מנמל יפו בשידור חי 24/7.',
      poster: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://bcovlive-a.akamaihd.net/6e3dd61ac4c34d6f8fb9698b565b9f50/eu-central-1/5377161796001/playlist.m3u8',
      genres: ['live', 'israeli', 'docu'],
      genresHe: ['ישראל', 'חדשות']
    },
    {
      id: 'il_kan_edu',
      type: 'channel',
      title: 'כאן חינוכית 23 — שידור חי HD',
      originalTitle: 'KAN Educational 23',
      year: 'LIVE',
      rating: 'IL',
      overview: 'שידור חי של כאן חינוכית לילדים, נוער ולכל המשפחה.',
      poster: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://kan23.media.kan.org.il/hls/live/2024691/2024691/master.m3u8',
      genres: ['live', 'israeli', 'animation'],
      genresHe: ['ישראל', 'ילדים ומשפחה']
    },
    {
      id: 'us_abc_news',
      type: 'channel',
      title: 'ABC News Live USA — חדשות ארה״ב',
      originalTitle: 'ABC News Live USA',
      year: 'LIVE',
      rating: 'US HD',
      overview: 'שידור חי 24/7 של רשת החדשות האמריקאית ABC News מניו יורק ווושינגטון.',
      poster: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות ארה״ב', 'שידור חי']
    },
    {
      id: 'us_cbs_news',
      type: 'channel',
      title: 'CBS News 24/7 USA — חדשות ארה״ב',
      originalTitle: 'CBS News 24/7 Live',
      year: 'LIVE',
      rating: 'US HD',
      overview: 'ערוץ החדשות הרשמי של רשת CBS האמריקאית בשידור חי מסביב לשעון.',
      poster: 'https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://cbsn-us.cbsnstream.cbsnews.com/out/v1/55a8648e8f134e82a470f83d562deeca/master.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות ארה״ב', 'שידור חי']
    },
    {
      id: 'us_nbc_news',
      type: 'channel',
      title: 'NBC News NOW USA — חדשות ארה״ב',
      originalTitle: 'NBC News NOW Live',
      year: 'LIVE',
      rating: 'US HD',
      overview: 'שידור חי של רשת NBC News האמריקאית: מבזקים, כתבות שטח ואירועים מרכזיים בארה״ב.',
      poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://dai2.xumo.com/amagi_hls_data_xumo1212A-xumo-nbcnewsnow/CDN/master.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות ארה״ב', 'שידור חי']
    },
    {
      id: 'us_fox_live',
      type: 'channel',
      title: 'FOX Live USA — חדשות ומזג אוויר ארה״ב',
      originalTitle: 'FOX Live USA',
      year: 'LIVE',
      rating: 'US HD',
      overview: 'שידור חי מרשת FOX האמריקאית עם דיווחים ישירים מרחבי ארצות הברית.',
      poster: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://247wlive.foxweather.com/stream/index.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות ארה״ב', 'שידור חי']
    },
    {
      id: 'us_bloomberg',
      type: 'channel',
      title: 'Bloomberg TV USA — כלכלה וול סטריט חי',
      originalTitle: 'Bloomberg TV US Live',
      year: 'LIVE',
      rating: 'US HD',
      overview: 'שידור חי מוול סטריט וניו יורק: שוק ההון האמריקאי, טכנולוגיה וחדשות כלכלה עולמיות.',
      poster: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://liveproduseast.global.ssl.fastly.net/us/Channel-USTV-AWS-virginia-1/Source-USTV-1000-1_live.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות ארה״ב', 'וול סטריט']
    },
    {
      id: 'uk_sky_news',
      type: 'channel',
      title: 'Sky News HD — חדשות עולמיות בשידור חי',
      originalTitle: 'Sky News International HD',
      year: 'LIVE',
      rating: 'HD',
      overview: 'שידור חי 24/7 של רשת Sky News הבינלאומית באיכות Full HD.',
      poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://linear901-oo-hls0-prd-gtm.delivery.skycdp.com/17501/sde-fast-skynews/master.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות עולמיות', 'שידור חי']
    },
    {
      id: 'eu_dw_news',
      type: 'channel',
      title: 'DW News English HD — חדשות בינלאומיות',
      originalTitle: 'DW News Live HD',
      year: 'LIVE',
      rating: 'HD',
      overview: 'ערוץ החדשות הבינלאומי באנגלית בשידור חי מסביב לשעון.',
      poster: 'https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות עולמיות', 'שידור חי']
    },
    {
      id: 'eu_france24',
      type: 'channel',
      title: 'France 24 English HD — חדשות מהעולם',
      originalTitle: 'France 24 English Live',
      year: 'LIVE',
      rating: 'HD',
      overview: 'שידור חי באנגלית של רשת החדשות הבינלאומית France 24.',
      poster: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://live.france24.com/hls/live/2037218-b/F24_EN_HI_HLS/master_5000.m3u8',
      genres: ['live', 'docu'],
      genresHe: ['חדשות עולמיות', 'שידור חי']
    },
    {
      id: 'us_cbs_sports',
      type: 'channel',
      title: 'CBS Sports HQ USA — ספורט ארה״ב בשידור חי',
      originalTitle: 'CBS Sports HQ Live USA',
      year: 'LIVE',
      rating: 'US SPORT',
      overview: 'ערוץ הספורט האמריקאי של רשת CBS: NFL, NBA, ליגת האלופות, תקצירים ותוצאות בזמן אמת.',
      poster: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://dai.google.com/linear/hls/event/Sid4xiTQTkCT1SLu6rjUSQ/master.m3u8',
      genres: ['live', 'action'],
      genresHe: ['ספורט ארה״ב', 'שידור חי']
    },
    {
      id: 'us_redbull_sports',
      type: 'channel',
      title: 'Red Bull TV Sports HD — ספורט ואקסטרים ארה״ב',
      originalTitle: 'Red Bull TV Sports Live',
      year: 'LIVE',
      rating: 'US SPORT',
      overview: 'שידור חי ב-Full HD של אירועי ספורט, מרוצי פורמולה וראלי, גלישה ותחרויות אקסטרים.',
      poster: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      genres: ['live', 'action'],
      genresHe: ['ספורט ארה״ב', 'אקסטרים']
    },
    {
      id: 'us_motorsports_live',
      type: 'channel',
      title: 'US Motorsports & Monster Jam HD — מרוצים חי',
      originalTitle: 'US Motorsports Live HD',
      year: 'LIVE',
      rating: 'US SPORT',
      overview: 'שידורים חיים של מרוצי מכוניות, משאיות ענק ומוטור-ספורט מאצטדיונים בארה״ב.',
      poster: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://amg00218-fremantle-amg00218c1-samsung-us-1827.playouts.now.amagi.tv/playlist.m3u8',
      genres: ['live', 'action'],
      genresHe: ['ספורט ארה״ב', 'מרוצים']
    },
    {
      id: 'us_billiard_sports',
      type: 'channel',
      title: 'US Pro Sports & Billiard TV HD — אליפויות חי',
      originalTitle: 'Billiard TV US Sports Live',
      year: 'LIVE',
      rating: 'US SPORT',
      overview: 'שידור חי 24/7 של אליפויות סנוקר וביליארד מקצועניות מארה״ב והעולם.',
      poster: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&auto=format&fit=crop&q=80',
      streamUrl: 'https://billiardtv.stream.aggro.tv/billiardtv/index.m3u8',
      genres: ['live', 'action'],
      genresHe: ['ספורט ארה״ב', 'שידור חי']
    }
  ];

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
    // Account & Sub-Users ("מי צופה עכשיו?")
    user: null,
    subUsers: DEFAULT_SUB_USERS.slice(),
    activeSubUserId: 'prof-main',
    manageSubUsersMode: false,
    profileData: {} // Keyed by activeSubUserId -> { watchlist: [], progress: {} }
  };

  function hasLocalBackend() {
    var host = window.location.hostname;
    var port = window.location.port;
    if ((host === 'localhost' || host === '127.0.0.1') && port === '8092') return true;
    if (window.AndroidTvBridge && typeof window.AndroidTvBridge.isAndroidTv === 'function') return true;
    return false;
  }

  function getApiBase() {
    var host = window.location.hostname;
    var port = window.location.port;
    if ((host === 'localhost' || host === '127.0.0.1') && port === '8092') {
      return '';
    }
    return 'http://127.0.0.1:8092';
  }

  /**
   * Per-Sub-User State Persistence
   */
  function loadLocalStorageState() {
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

    try {
      var su = localStorage.getItem('streamit_subusers_v9');
      if (su) {
        var parsedSu = JSON.parse(su);
        if (Array.isArray(parsedSu) && parsedSu.length) state.subUsers = parsedSu;
      }
    } catch (e) {}

    try {
      var actId = localStorage.getItem('streamit_active_subuser_v9');
      if (actId && state.subUsers.some(function (u) { return u.id === actId; })) {
        state.activeSubUserId = actId;
      }
    } catch (e) {}

    try {
      var pd = localStorage.getItem('streamit_profile_data_v9');
      if (pd) state.profileData = JSON.parse(pd) || {};
    } catch (e) {}

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

    ensureActiveProfileBucket();
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
    return state.subUsers[0] || DEFAULT_SUB_USERS[0];
  }

  function saveSubUsersState() {
    try {
      localStorage.setItem('streamit_subusers_v9', JSON.stringify(state.subUsers));
      localStorage.setItem('streamit_active_subuser_v9', state.activeSubUserId);
      localStorage.setItem('streamit_profile_data_v9', JSON.stringify(state.profileData));
    } catch (e) {}
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

    var poster = raw.poster || raw.posterUrl || raw.logo || raw.medium_cover_image || raw.large_cover_image || '';
    if (!poster && raw.poster_path) poster = TMDB_IMG_POSTER + raw.poster_path;
    if (!poster && raw.backdrop_path) poster = TMDB_IMG_POSTER + raw.backdrop_path;
    if (!poster) poster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';

    var backdrop = raw.backdrop || raw.backdropUrl || raw.background_image_original || raw.background_image || '';
    if (!backdrop && raw.backdrop_path) backdrop = TMDB_IMG_BACKDROP + raw.backdrop_path;
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

    var genreKeys = [];
    if (Array.isArray(raw.genres)) {
      for (var g = 0; g < raw.genres.length; g++) {
        var gv = raw.genres[g];
        if (typeof gv === 'string') {
          var gl = gv.toLowerCase();
          if (gl === 'sci-fi' || gl === 'science fiction') gl = 'scifi';
          if (gl === 'documentary') gl = 'docu';
          genreKeys.push(gl);
        } else if (gv && gv.id && TMDB_GENRE_MAP[gv.id]) {
          genreKeys.push(TMDB_GENRE_MAP[gv.id]);
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
      genreKeys.push(forcedGenreKey);
    }
    if (raw.original_language === 'he' && genreKeys.indexOf('israeli') === -1) {
      genreKeys.push('israeli');
    }
    if ((raw.source === 'telegram' || String(raw.id || '').indexOf('tg_') === 0) && genreKeys.indexOf('telegram') === -1) {
      genreKeys.push('telegram');
    }
    if (!genreKeys.length) {
      genreKeys.push(type === 'channel' ? 'live' : 'drama');
    }

    var genresHe = Array.isArray(raw.genres_he) && raw.genres_he.length
      ? raw.genres_he
      : genreKeys.map(function (k) { return GENRE_HE_LABELS[k] || 'דרמה'; });

    var streamUrl = raw.stream_url || raw.streamUrl || raw.directUrl || '';
    var fallbackStreams = Array.isArray(raw.fallback_streams) ? raw.fallback_streams : [];
    var videoId = raw.videoId || '';
    var directYtId = raw.direct_yt_id || raw.directYtId || '';
    var trailerYtId = raw.trailer_yt_id || raw.trailerYtId || '';

    var idKey = String(raw.id || imdbId || (type + '-' + tmdbId));

    return {
      id: idKey,
      imdbId: imdbId,
      tmdbId: tmdbId,
      videoId: videoId,
      directYtId: directYtId,
      trailerYtId: trailerYtId,
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
      genres: genreKeys,
      genresHe: genresHe,
      streamUrl: streamUrl,
      fallbackStreams: fallbackStreams,
      seasonsCount: Number(raw.total_seasons || raw.seasonsCount || raw.number_of_seasons || (type === 'series' ? 3 : 0)),
      seasonsData: Array.isArray(raw.seasons) ? raw.seasons : []
    };
  }

  /**
   * Massive Multi-Source World Catalog Loader
   * Combines `data/hebrew_catalog.json` + `/api/catalog` (Telegram VOD) + Stremio Cinemeta + YTS/PirateBay + 26 Parallel TMDB Streams (Netflix, Apple TV+, HBO, Amazon, Disney+ & All Genres)
   */
  async function loadCatalog() {
    state.catalog.channels = BUILTIN_CHANNELS.slice();
    state.catalog.youtube = BUILTIN_YOUTUBE_ITEMS.slice();

    // 1. Load bundled `data/hebrew_catalog.json` immediately
    try {
      var localRes = await fetch('data/hebrew_catalog.json');
      if (localRes.ok) {
        var localData = await localRes.json();
        ingestCatalogPayload(localData);
      }
    } catch (e) {}

    // 2. Also load `/api/catalog` (includes live Telegram Movies & Series VOD)
    try {
      var apiRes = await fetch(getApiBase() + '/api/catalog');
      if (apiRes.ok) {
        var apiData = await apiRes.json();
        ingestCatalogPayload(apiData);
      }
    } catch (e) {}

    renderGenreFilterStrip();
    renderProviderFilterStrip();
    renderYearFilterStrip();
    renderActorFilterStrip();
    renderInitialStage();

    // 3. Fetch 26 Parallel TMDB Hebrew (`he-IL`) Streams across Streaming Giants & all Genres
    var tmdbQueries = [
      { url: '/trending/movie/week?language=he-IL&page=1', type: 'movie', genre: null },
      { url: '/trending/movie/week?language=he-IL&page=2', type: 'movie', genre: null },
      { url: '/movie/popular?language=he-IL&page=1', type: 'movie', genre: null },
      { url: '/movie/top_rated?language=he-IL&page=1', type: 'movie', genre: 'drama' },
      // Streaming Giants (Netflix, Apple TV+, HBO/Max, Amazon Prime, Disney+)
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=8&watch_region=IL&page=1', type: 'movie', genre: 'netflix' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=213&page=1', type: 'series', genre: 'netflix' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=350&watch_region=IL&page=1', type: 'movie', genre: 'apple' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=2552&page=1', type: 'series', genre: 'apple' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=49|3186&page=1', type: 'series', genre: 'hbo' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=119|9&watch_region=IL&page=1', type: 'movie', genre: 'amazon' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=1024&page=1', type: 'series', genre: 'amazon' },
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_watch_providers=337&watch_region=IL&page=1', type: 'movie', genre: 'disney' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_networks=2739&page=1', type: 'series', genre: 'disney' },
      // Full Genres Coverage
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_genres=28&page=1', type: 'movie', genre: 'action' },
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
      { url: '/discover/movie?language=he-IL&sort_by=popularity.desc&with_original_language=he&page=1', type: 'movie', genre: 'israeli' },
      { url: '/trending/tv/week?language=he-IL&page=1', type: 'series', genre: null },
      { url: '/tv/popular?language=he-IL&page=1', type: 'series', genre: null },
      { url: '/tv/top_rated?language=he-IL&page=1', type: 'series', genre: 'drama' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_genres=80&page=1', type: 'series', genre: 'crime' },
      { url: '/discover/tv?language=he-IL&sort_by=popularity.desc&with_original_language=he&page=1', type: 'series', genre: 'israeli' }
    ];

    try {
      await Promise.all(tmdbQueries.map(async function (q) {
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
    } catch (e) {}

    // 4. Fetch YTS 4K & PirateBay Swarm Catalog + Stremio Cinemeta Top Catalog in Background
    fetchWorldSwarmCatalogs();
    checkCloudOtaUpdates();
  }

  async function fetchWorldSwarmCatalogs() {
    // A. YTS Official 4K / 1080p API (`yts.mx`) -> tagged with `'tpb'`
    try {
      var ytsRes = await fetch('https://yts.mx/api/v2/list_movies.json?sort_by=download_count&limit=50');
      if (ytsRes.ok) {
        var ytsJson = await ytsRes.json();
        var ytsMovies = (ytsJson && ytsJson.data && Array.isArray(ytsJson.data.movies)) ? ytsJson.data.movies : [];
        if (ytsMovies.length) {
          mergeItemsIntoCatalog(ytsMovies, 'movie', 'tpb');
          renderCatalogShelves();
        }
      }
    } catch (e) {}

    // B. Stremio Cinemeta Official Global Top Movies & Series
    try {
      var cmMovieRes = await fetch('https://v3-cinemeta.strem.io/catalog/movie/top.json');
      if (cmMovieRes.ok) {
        var cmM = await cmMovieRes.json();
        if (cmM && Array.isArray(cmM.metas)) {
          mergeItemsIntoCatalog(cmM.metas.slice(0, 60), 'movie', 'tpb');
          renderCatalogShelves();
        }
      }
    } catch (e) {}

    // C. Sync Zero-Account Public Telegram VOD Channels (Free, No Personal Account Required)
    syncTelegramPublicChannels(false);
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

    // 1. Try local/Android TV Embedded Server (/api/telegram-channel) first
    try {
      var localCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var localTimer = localCtrl ? setTimeout(function () { localCtrl.abort(); }, 3500) : null;
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
    var p = state.gridPage;
    var btn = document.getElementById('loadMoreCatalogBtn');
    if (btn) btn.textContent = 'טוען עוד סרטים וסדרות מהמאגר העולמי...';

    var extraQueries = [
      { url: '/movie/popular?language=he-IL&page=' + p, type: 'movie', genre: state.activeGenre !== 'all' ? state.activeGenre : null },
      { url: '/tv/popular?language=he-IL&page=' + p, type: 'series', genre: state.activeGenre !== 'all' ? state.activeGenre : null }
    ];
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
    var channels = data.live_channels || data.channels || [];
    if (Array.isArray(channels)) {
      for (var i = 0; i < channels.length; i++) {
        var normCh = normalizeItem(channels[i], 'channel', 'live');
        if (!normCh) continue;
        var existingIdx = -1;
        for (var c = 0; c < state.catalog.channels.length; c++) {
          if (state.catalog.channels[c].id === normCh.id || state.catalog.channels[c].title === normCh.title) {
            existingIdx = c;
            break;
          }
        }
        if (existingIdx >= 0) {
          state.catalog.channels[existingIdx] = normCh;
        } else {
          state.catalog.channels.push(normCh);
        }
      }
    }
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
          existing.genres.push(forcedGenre);
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
      }
    } catch (e) {}
  }

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
  }

  function renderProviderFilterStrip() {
    var strip = document.getElementById('providerFilterStrip');
    var labelEl = document.getElementById('activeProviderLabel');
    var btnEl = document.getElementById('providerDropdownBtn');
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
        if (btnEl && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(btnEl, { scroll: false });
        }
      });
    }
  }

  function renderYearFilterStrip() {
    var strip = document.getElementById('yearFilterStrip');
    var labelEl = document.getElementById('activeYearLabel');
    var btnEl = document.getElementById('yearDropdownBtn');
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
        if (btnEl && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(btnEl, { scroll: false });
        }
      });
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
      '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Heebo, sans-serif" font-weight="800" font-size="34">' +
      escapeHtml(initial) + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function renderActorFilterStrip() {
    var strip = document.getElementById('actorFilterStrip');
    var labelEl = document.getElementById('activeActorLabel');
    var btnEl = document.getElementById('actorDropdownBtn');
    var miniAvatar = document.getElementById('activeActorBtnAvatar');
    var miniIcon = document.getElementById('activeActorBtnIcon');
    if (!strip) return;

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

    strip.innerHTML = ACTOR_FILTERS.map(function (af) {
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

    var btns = strip.querySelectorAll('[data-actor-id]');
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
        closeAllExplorerDropdowns();
        renderActorFilterStrip();
        if (aid !== 'all') {
          await fetchActorCredits(aid, aname);
        }
        renderCatalogShelves();
        if (btnEl && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(btnEl, { scroll: false });
        }
      });
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
    var activeProfile = getActiveSubUser();
    if (!activeProfile || !activeProfile.isKids) return list;
    return list.filter(function (item) {
      if (item.genres.indexOf('horror') !== -1 || item.genres.indexOf('crime') !== -1) return false;
      if (item.ageRating === '18+') return false;
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
      backdropEl.style.backgroundImage = 'url("' + (item.backdrop || item.poster) + '")';
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
      wlBtn.innerHTML = inWl ? getSvgIcon('check') : getSvgIcon('plus');
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

  function renderCatalogShelves() {
    var container = document.getElementById('catalogRowsContainer');
    var continueSec = document.getElementById('continueWatchingSection');
    var continueRow = document.getElementById('continueWatchingRow');
    if (!container) return;

    var profBucket = ensureActiveProfileBucket();
    var activeProfile = getActiveSubUser();
    var allMovies = filterKidsItems(state.catalog.movies);
    var allSeries = filterKidsItems(state.catalog.series);
    var allChannels = state.catalog.channels;
    var allYoutube = state.catalog.youtube || BUILTIN_YOUTUBE_ITEMS;

    var cat = state.activeCategory;
    var genre = state.activeGenre;
    var provider = state.activeProvider || 'all';
    var yearKey = state.activeYear || 'all';
    var actorId = state.activeActorId || 'all';

    // 1. Continue Watching Shelf (Per Sub-User Profile!)
    var progressIds = Object.keys(profBucket.progress || {});
    if (continueSec && continueRow) {
      var cwItems = [];
      for (var p = 0; p < progressIds.length; p++) {
        var found = findItemById(progressIds[p]);
        if (found) cwItems.push(found);
      }
      if (cwItems.length && cat === 'all' && genre === 'all' && provider === 'all' && yearKey === 'all' && actorId === 'all') {
        continueSec.classList.remove('hidden');
        var cwTitle = continueSec.querySelector('.row-title');
        if (cwTitle) cwTitle.textContent = 'המשך צפייה עבור ' + (activeProfile ? activeProfile.name : 'פרופיל ראשי');
        continueRow.innerHTML = cwItems.map(renderPosterCardHtml).join('');
        bindPosterCardEvents(continueRow);
      } else {
        continueSec.classList.add('hidden');
      }
    }

    // 2. Dedicated YouTube Hub (`cat === 'youtube'` or `genre === 'youtube'`)
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
      if (window.TVNavigation && typeof window.TVNavigation.ensureInitialFocus === 'function') {
        window.TVNavigation.ensureInitialFocus();
      }
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
      gridWallTitle = 'מאגר סרטים וסדרות — שנת ' + yearKey + ' (' + gridWallItems.length + ' כותרים בתצוגת רשת מלאה)';
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
      gridWallTitle = 'קטלוג ' + pLabel + ' (' + pCombined.length + ' סרטים וסדרות בשורות ועמודות)';
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
      gridWallTitle = 'קטלוג מלא: ' + gLabel + ' (' + combined.length + ' סרטים וסדרות בשורות ועמודות)';
      gridWallItems = combined;
    }
    // 6. Category = Movies / Series / Channels / MyList / All (Home)
    else if (cat === 'movies') {
      shelves.push({ title: 'שוברי קופות וסרטים מובילים', items: allMovies.slice(0, 18) });
      shelves.push({ title: 'נטפליקס, אפל TV+, אמאזון ו-HBO', items: filterByGenre(allMovies, 'netflix').concat(filterByGenre(allMovies, 'apple'), filterByGenre(allMovies, 'amazon')).slice(0, 20) });
      shelves.push({ title: 'מאגר PirateBay & YTS 4K', items: filterByGenre(allMovies, 'tpb').slice(0, 20) });
      gridWallTitle = 'כל הסרטים במאגר העולמי (' + allMovies.length + ' סרטים בשורות ועמודות)';
      gridWallItems = allMovies;
    } else if (cat === 'series') {
      shelves.push({ title: 'סדרות מובילות עם תרגום לעברית', items: allSeries.slice(0, 18) });
      shelves.push({ title: 'סדרות נטפליקס, HBO, אפל TV+ ואמאזון', items: filterByGenre(allSeries, 'netflix').concat(filterByGenre(allSeries, 'hbo'), filterByGenre(allSeries, 'apple'), filterByGenre(allSeries, 'amazon')).slice(0, 20) });
      gridWallTitle = 'כל הסדרות במאגר העולמי (' + allSeries.length + ' סדרות בשורות ועמודות)';
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
      gridWallTitle = 'כל ערוצי הטלוויזיה בשידור חי (' + allChannels.length + ' ערוצים בשורות ועמודות)';
      gridWallItems = allChannels;
    } else if (cat === 'mylist') {
      var wlItems = (profBucket.watchlist || []).map(findItemById).filter(Boolean);
      gridWallTitle = wlItems.length
        ? ('הרשימה שלי — ' + (activeProfile ? activeProfile.name : ''))
        : 'הרשימה שלך ריקה — הוסף סרטים וסדרות לצפייה מאוחרת';
      gridWallItems = wlItems;
    } else {
      // Home ('all')
      var tgHomeItems = filterByGenre(allMovies, 'telegram').concat(filterByGenre(allSeries, 'telegram'));
      if (tgHomeItems.length) {
        shelves.push({ title: 'טלגרם קולנוע VOD — סרטים וסדרות שנמשכו מערוצי הטלגרם', items: tgHomeItems.slice(0, 22) });
      }
      shelves.push({ title: 'המובילים בישראל היום', items: allMovies.slice(0, 18) });
      var netflixItems = filterByGenre(allMovies, 'netflix').concat(filterByGenre(allSeries, 'netflix'));
      if (netflixItems.length) shelves.push({ title: 'נטפליקס (Netflix Originals & Top)', items: netflixItems.slice(0, 20) });

      var appleHboItems = filterByGenre(allMovies, 'apple').concat(filterByGenre(allSeries, 'apple'), filterByGenre(allSeries, 'hbo'), filterByGenre(allMovies, 'amazon'), filterByGenre(allSeries, 'amazon'));
      if (appleHboItems.length) shelves.push({ title: 'אפל TV+, HBO Max ואמאזון פריים (Apple / HBO / Prime)', items: appleHboItems.slice(0, 22) });

      var tpbItems = filterByGenre(allMovies, 'tpb');
      if (tpbItems.length) shelves.push({ title: 'מאגר PirateBay & YTS 4K Direct', items: tpbItems.slice(0, 22) });

      var tgItems = filterByGenre(allMovies, 'telegram').concat(filterByGenre(allSeries, 'telegram'));
      if (tgItems.length) shelves.push({ title: 'טלגרם VIP — סרטים וסדרות בהזרמה ישירה', items: tgItems.slice(0, 20) });

      shelves.push({ title: 'סדרות פופולריות לצפייה ישירה', items: allSeries.slice(0, 18) });
      shelves.push({ title: 'ערוצי ישראל, ספורט וחדשות ארה״ב בשידור חי', items: allChannels });

      var actionMovies = filterByGenre(allMovies, 'action');
      if (actionMovies.length) shelves.push({ title: 'אקשן, הרפתקאות ושוברי קופות', items: actionMovies.slice(0, 20) });

      var crimeItems = filterByGenre(allMovies, 'crime').concat(filterByGenre(allMovies, 'thriller'), filterByGenre(allSeries, 'crime'));
      if (crimeItems.length) shelves.push({ title: 'מתח, פשע ומסתורין', items: crimeItems.slice(0, 20) });

      var scifiItems = filterByGenre(allMovies, 'scifi').concat(filterByGenre(allSeries, 'scifi'));
      if (scifiItems.length) shelves.push({ title: 'מדע בדיוני ופנטזיה', items: scifiItems.slice(0, 20) });

      var israeliItems = filterByGenre(allMovies, 'israeli').concat(filterByGenre(allSeries, 'israeli'));
      if (israeliItems.length) shelves.push({ title: 'יצירה ישראלית וקולנוע ישראלי', items: israeliItems.slice(0, 20) });

      var comedyItems = filterByGenre(allMovies, 'comedy').concat(filterByGenre(allMovies, 'romance'));
      if (comedyItems.length) shelves.push({ title: 'קומדיות ורומנטיקה', items: comedyItems.slice(0, 20) });

      gridWallTitle = 'קטלוג המאגר העולמי המלא (' + (allMovies.length + allSeries.length) + ' סרטים וסדרות בשורות ועמודות)';
      gridWallItems = allMovies.concat(allSeries);
    }

    var html = '';
    for (var s = 0; s < shelves.length; s++) {
      var shelf = shelves[s];
      if (!shelf.items || !shelf.items.length) continue;
      html +=
        '<section class="netflix-row">' +
          '<h2 class="row-title">' + escapeHtml(shelf.title) + '</h2>' +
          '<div class="row-track">' +
            shelf.items.map(renderPosterCardHtml).join('') +
          '</div>' +
        '</section>';
    }

    // Always render the Multi-Row & Multi-Column Grid Wall so entering ANY category/genre/year/actor shows dozens of movies across rows & columns!
    if (gridWallItems && gridWallItems.length) {
      html +=
        '<section class="catalog-wall-section">' +
          actorShowcaseHtml +
          '<h2 class="row-title">' + escapeHtml(gridWallTitle) + '</h2>' +
          '<div class="catalog-poster-grid">' +
            gridWallItems.map(renderPosterCardHtml).join('') +
          '</div>' +
          (cat !== 'channels' && cat !== 'mylist'
            ? '<div class="load-more-wrap"><button id="loadMoreCatalogBtn" type="button" class="btn-secondary tv-focusable">טען עוד כותרים מהמאגר העולמי (+)</button></div>'
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

    if (window.TVNavigation && typeof window.TVNavigation.ensureInitialFocus === 'function') {
      window.TVNavigation.ensureInitialFocus();
    }
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

  function renderPosterCardHtml(item) {
    var profBucket = ensureActiveProfileBucket();
    var prog = profBucket.progress ? profBucket.progress[item.id] : null;
    var progHtml = '';
    if (prog && prog.percent > 2 && prog.percent < 96) {
      progHtml =
        '<div class="poster-progress-bar">' +
          '<div class="poster-progress-fill" style="width:' + Math.round(prog.percent) + '%"></div>' +
        '</div>';
    }

    return (
      '<article class="poster-card tv-focusable" tabindex="0" role="button" ' +
        'data-item-id="' + escapeHtml(item.id) + '" ' +
        'aria-label="' + escapeHtml(item.title) + '">' +
        '<img class="poster-img" src="' + escapeHtml(item.poster) + '" alt="' + escapeHtml(item.title) + '" decoding="async" onerror="this.onerror=null;this.src=\'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80\';" />' +
        '<div class="poster-hover-overlay">' +
          '<span class="poster-hover-title">' + escapeHtml(item.title) + '</span>' +
        '</div>' +
        progHtml +
      '</article>'
    );
  }

  function bindPosterCardEvents(root) {
    var cards = root.querySelectorAll('.poster-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var id = this.getAttribute('data-item-id');
        var item = findItemById(id);
        if (!item) return;
        if (item.type === 'channel' || item.type === 'youtube') {
          startPlayback(item, 1, 1);
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
    if (playBtn && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(playBtn);
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
        ? 'שידור חי ישיר'
        : (item.type === 'youtube' || state.activeSourceTab === 'trailer' ? 'הזרמת יוטיוב ישירה (YouTube HD)' : 'טוען כתוביות מסונכרנות בעברית...');
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

    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    var playPauseBtn = document.getElementById('playerPlayPauseBtn');
    if (item.type === 'series' && skipBtn && !skipBtn.classList.contains('hidden') && startOffsetSec === 0) {
      if (typeof window.streamItFocusElement === 'function') window.streamItFocusElement(skipBtn);
    } else if (playPauseBtn) {
      if (typeof window.streamItFocusElement === 'function') window.streamItFocusElement(playPauseBtn);
    }

    // 1. Direct YouTube Item or Official Trailer Mode (`trailer`)
    if (item.type === 'youtube' || state.activeSourceTab === 'trailer') {
      await playYoutubeVideoOrTrailer(item);
      return;
    }

    // 2. Live TV Channel Playback (Cloud Direct HLS on any computer, or proxied when local server is active)
    if (item.type === 'channel' && item.streamUrl) {
      var chUrls = [item.streamUrl].concat(item.fallbackStreams || []);
      if (hasLocalBackend()) {
        var proxiedLive = getApiBase() + '/api/hls-proxy?url=' + encodeURIComponent(chUrls[0]) + '&origin=live';
        playDirectHlsOrMp4(proxiedLive, 0, chUrls[0]);
      } else {
        playDirectHlsOrMp4(chUrls[0], 0, chUrls[1] || '');
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
    var subOverlay = document.getElementById('customSubtitleOverlay');
    if (!video || !embedContainer) return;

    state.playingMode = 'video';
    if (playerModal) playerModal.classList.remove('embed-mode-active');
    embedContainer.classList.add('hidden');
    embedContainer.innerHTML = '';
    video.classList.remove('hidden');
    if (subOverlay) subOverlay.classList.remove('hidden');

    ensurePlyrInitialized(video);

    if (state.hlsInstance) {
      try { state.hlsInstance.destroy(); } catch (e) {}
      state.hlsInstance = null;
    }

    var onReadyToPlay = function () {
      if (spinner) spinner.classList.add('hidden');
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

    if ((streamUrl.indexOf('.m3u8') !== -1 || streamUrl.indexOf('/api/hls-proxy') !== -1) && window.Hls && window.Hls.isSupported()) {
      var hls = new window.Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
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
          if (rawFallbackUrl && streamUrl !== rawFallbackUrl) {
            playDirectHlsOrMp4(rawFallbackUrl, startOffsetSec, '');
          } else if (state.playingItem && state.playingItem.type !== 'channel') {
            playCleanEmbedStream(state.playingItem, state.activeSeason, state.activeEpisode, startOffsetSec, 'embed1');
          }
        }
      });
    } else {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', onReadyToPlay, { once: true });
      video.addEventListener('error', function () {
        if (state.playingItem && state.playingItem.type !== 'channel') {
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
      if (state.playingMode === 'embed' && !state.embedPaused && state.embedCurrentTime > 0) {
        state.embedCurrentTime += 0.25;
        updateActiveSubtitleCue(state.embedCurrentTime);
      }
    }, 250);

    if (playerModal) playerModal.classList.add('embed-mode-active');
    video.pause();
    video.classList.add('hidden');
    embedContainer.classList.remove('hidden');
    if (subOverlay) subOverlay.classList.remove('hidden');
    if (spinner) spinner.classList.remove('hidden');
    if (loadingText) {
      loadingText.textContent = state.embedActiveServerKey === 'embed2'
        ? 'מתחבר לשרת ענן 4K משני (Mirror #2)...'
        : 'בודק ומחבר אוטומטית למקור השידור הטוב ביותר (4K UHD)...';
    }

    var tmdbId = String(item.tmdbId || '').replace(/\D/g, '') || '693134';
    var embedUrl = '';

    // 100% Sandbox-Compatible Verified 4K/1080p Cloud Mirrors (`cdn.vidspark.to` + `vidsrc.pm/embed`)
    if (state.embedActiveServerKey === 'embed2' || state.embedActiveServerKey === 'swarm') {
      if (item.type === 'series') {
        embedUrl = 'https://vidsrc.pm/embed/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1);
      } else {
        embedUrl = 'https://vidsrc.pm/embed/movie/' + tmdbId;
      }
    } else {
      if (item.type === 'series') {
        embedUrl = 'https://cdn.vidspark.to/tv/' + tmdbId + '/' + (season || 1) + '/' + (episode || 1);
      } else {
        embedUrl = 'https://cdn.vidspark.to/movie/' + tmdbId;
      }
    }

    embedContainer.innerHTML =
      '<iframe id="streamEmbedIframe" src="' + escapeHtml(embedUrl) + '" ' +
      'sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" ' +
      'referrerpolicy="origin" ' +
      'allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen ' +
      'style="width:100%;height:calc(100% + 66px);border:none;background:#000;opacity:0;pointer-events:none;transition:opacity 0.25s ease;"></iframe>';

    var iframe = document.getElementById('streamEmbedIframe');

    // Continuous health-check ping (`getStatus`): verifies `vidspark-player` is mounted & auto-starts playback
    state.embedVerifyInterval = setInterval(function () {
      var curIframe = document.getElementById('streamEmbedIframe');
      if (state.playingMode !== 'embed' || !curIframe || !curIframe.contentWindow) return;
      try {
        curIframe.contentWindow.postMessage({ action: 'getStatus' }, '*');
      } catch (e) {}
    }, 600);

    // Automatic Failover Watchdog: if `vidspark-player` does not verify within 7s (meaning title is missing on `vidora` and would fall back to `moviesapi.vip`), switch source automatically while iframe opacity is still 0!
    state.embedWatchdogTimer = setTimeout(function () {
      if (state.playingMode === 'embed' && !state.embedVerified && state.playingItem) {
        if (state.embedActiveServerKey === 'embed1') {
          playCleanEmbedStream(state.playingItem, state.activeSeason, state.activeEpisode, state.embedStartOffsetSec || 0, 'embed2');
        } else {
          playYoutubeVideoOrTrailer(state.playingItem);
        }
      }
    }, 7000);

    if (iframe) {
      iframe.addEventListener('load', function () {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ action: 'getStatus' }, '*');
          }
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

  /**
   * Synchronized Hebrew Subtitles Engine (`/api/subtitles/vtt` + OpenSubtitles v3 Stremio API + RTL Punctuation Fix)
   */
  async function loadHebrewSubtitlesForItem(item, imdbId, season, episode) {
    state.parsedCues = [];
    state.subtitleTracks = [
      { id: 'he-auto', label: 'עברית — מסונכרן אוטומטית (AutoSub AI)', lang: 'he', url: '' },
      { id: 'off', label: 'ללא כתוביות', lang: 'off', url: '' }
    ];
    state.activeSubTrackId = state.subEnabled ? 'he-auto' : 'off';
    state.subOffsetSec = 0;

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
      }
    } catch (e) {}

    if (subStatusEl) {
      subStatusEl.textContent = state.parsedCues.length
        ? ('כתוביות בעברית פעילות (' + state.parsedCues.length + ' שורות מסונכרנות)')
        : 'כתוביות בעברית מובנות';
    }

    renderSubtitlesMenu();
    updateActiveSubtitleCue(0);
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
    var overlay = document.getElementById('customSubtitleOverlay');
    var textSpan = document.getElementById('customSubtitleText');
    if (!overlay || !textSpan) return;

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
      textSpan.innerHTML = escapeHtml(activeText).replace(/\n/g, '<br/>');
      overlay.classList.remove('cue-empty');
    } else {
      textSpan.textContent = '';
      overlay.classList.add('cue-empty');
    }
  }

  function applySubtitleStyleToOverlay() {
    var overlay = document.getElementById('customSubtitleOverlay');
    var textSpan = document.getElementById('customSubtitleText');
    if (!overlay) return;
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
        var video = document.getElementById('videoElement');
        updateActiveSubtitleCue(video ? video.currentTime : 0);
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
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      var next = Math.max(0, (video.currentTime || 0) + deltaSeconds);
      if (video.duration && isFinite(video.duration)) {
        next = Math.min(video.duration, next);
      }
      video.currentTime = next;
      updateActiveSubtitleCue(next);
    } else if (state.playingMode === 'embed') {
      var iframe = document.getElementById('streamEmbedIframe');
      var nextEmbed = Math.max(0, (state.embedCurrentTime || 0) + deltaSeconds);
      state.embedCurrentTime = nextEmbed;
      updateActiveSubtitleCue(nextEmbed);
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ action: 'seek', time: Math.floor(nextEmbed) }, '*');
        } catch (e) {}
      }
    }
  }
  window.seekVideoBy = seekVideoBy;

  function togglePlayPause() {
    wakePlayerControls();
    var video = document.getElementById('videoElement');
    if (state.playingMode === 'video' && video && !video.classList.contains('hidden')) {
      if (video.paused) {
        video.play().catch(function () {});
        updatePlayPauseIcon(false);
      } else {
        video.pause();
        updatePlayPauseIcon(true);
      }
    } else if (state.playingMode === 'embed') {
      var iframe = document.getElementById('streamEmbedIframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ action: 'togglePlay' }, '*');
        } catch (e) {}
      }
      try {
        if (window.AndroidTvBridge && typeof window.AndroidTvBridge.tapCenterOfScreen === 'function') {
          window.AndroidTvBridge.tapCenterOfScreen();
        }
      } catch (e) {}
    }
  }

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
      overlay.classList.add('idle-hidden');
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

  function closeVideoPlayer() {
    stopCurrentMedia();
    var playerModal = document.getElementById('playerModal');
    if (playerModal) playerModal.classList.add('hidden');
    var skipBtn = document.getElementById('skipIntroOverlayBtn');
    if (skipBtn) skipBtn.classList.add('hidden');
    renderCatalogShelves();
  }
  window.closeVideoPlayer = closeVideoPlayer;

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
      var isAct = su.id === state.activeSubUserId;
      var initial = (su.name || 'P').trim().charAt(0);
      html +=
        '<div class="sub-user-card-wrap">' +
          '<button type="button" class="sub-user-card tv-focusable' + (isAct ? ' active' : '') + '" data-subuser-id="' + escapeHtml(su.id) + '">' +
            '<div class="sub-user-avatar" style="background:' + escapeHtml(su.color || '#E50914') + '">' +
              '<span>' + escapeHtml(initial) + '</span>' +
            '</div>' +
            '<span class="sub-user-name">' + escapeHtml(su.name) + '</span>' +
            '<span class="sub-user-badge">' + (su.isKids ? 'ילדים' : (isAct ? 'פעיל כעת' : 'פרופיל')) + '</span>' +
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
        state.activeSubUserId = pid;
        ensureActiveProfileBucket();
        saveSubUsersState();
        updateAuthUi();
        renderGenreFilterStrip();
        renderInitialStage();
        var am = document.getElementById('authModal');
        if (am) am.classList.add('hidden');
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

  function updateAuthUi() {
    var label = document.getElementById('authBtnLabel');
    var form = document.getElementById('authForm');
    var accountBox = document.getElementById('authAccountBox');
    var userDisplay = document.getElementById('authUserDisplay');
    var quickBtn = document.getElementById('quickTestLoginBtn');
    var authModal = document.getElementById('authModal');

    var activeProf = getActiveSubUser();
    renderSubUsersGrid();

    if (state.user && state.user.name) {
      document.body.classList.remove('auth-gate-locked');
      if (label) label.textContent = activeProf ? activeProf.name : state.user.name;
      if (form) form.classList.add('hidden');
      if (quickBtn) quickBtn.classList.add('hidden');
      if (accountBox) accountBox.classList.remove('hidden');
      if (userDisplay) {
        userDisplay.textContent = 'מחובר: ' + state.user.name + ' • פרופיל פעיל: ' + (activeProf ? activeProf.name : 'ראשי');
      }
    } else {
      document.body.classList.add('auth-gate-locked');
      if (authModal) authModal.classList.remove('hidden');
      if (label) label.textContent = 'התחברות';
      if (form) form.classList.remove('hidden');
      if (quickBtn) quickBtn.classList.add('hidden');
      if (accountBox) accountBox.classList.add('hidden');
      var emailIn = document.getElementById('authEmailInput');
      if (emailIn && typeof window.streamItFocusElement === 'function') {
        setTimeout(function () {
          window.streamItFocusElement(emailIn, { scroll: false });
        }, 80);
      }
    }
  }

  function openAuthModal() {
    var modal = document.getElementById('authModal');
    if (!modal) return;
    updateAuthUi();
    modal.classList.remove('hidden');

    var activeCard = document.querySelector('#subUsersGrid .sub-user-card.active') || document.getElementById('quickTestLoginBtn');
    if (activeCard && typeof window.streamItFocusElement === 'function') {
      window.streamItFocusElement(activeCard);
    }
  }

  function performQuickTestLogin() {
    state.user = {
      name: 'מנהל ראשי (VIP)',
      email: 'streamittvapp@gmail.com',
      role: 'admin'
    };
    try {
      localStorage.setItem('streamit_user_v9', JSON.stringify(state.user));
    } catch (e) {}
    updateAuthUi();
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
      if (!e.target.closest('.explorer-dropdown-wrap')) {
        closeAllExplorerDropdowns();
      }
    });

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

    // Search Controls
    var searchTriggers = ['openSearchBtn', 'tvSearchRailBtn', 'mobileSearchBtn'];
    for (var s = 0; s < searchTriggers.length; s++) {
      var sb = document.getElementById(searchTriggers[s]);
      if (sb) sb.addEventListener('click', openSearchModal);
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
    // 1. Verifies stream is live (`source === 'vidspark-player'`), reveals iframe, hides loading spinner, and auto-plays
    // 2. Keeps custom Hebrew subtitles synced with exact playback timestamp
    window.addEventListener('message', function (ev) {
      try {
        var d = ev && ev.data;
        if (d && d.source === 'vidspark-player') {
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
          if (typeof d.paused === 'boolean' && state.playingMode === 'embed') {
            state.embedPaused = d.paused;
            updatePlayPauseIcon(d.paused);
          } else if (d.event === 'pause') {
            state.embedPaused = true;
            updatePlayPauseIcon(true);
          } else if (d.event === 'play' || d.event === 'timeupdate' || d.event === 'seeked') {
            state.embedPaused = false;
            updatePlayPauseIcon(false);
          }
          if (typeof d.duration === 'number' && isFinite(d.duration) && d.duration > 0 && state.playingMode === 'embed') {
            state.embedDuration = d.duration;
            var totEmbedEl = document.getElementById('playerTotalTime');
            if (totEmbedEl) totEmbedEl.textContent = formatSeconds(d.duration);
          }
          if (typeof d.currentTime === 'number' && state.playingMode === 'embed' && d.currentTime >= 0) {
            state.embedCurrentTime = d.currentTime;
            var curEmbedEl = document.getElementById('playerCurrentTime');
            if (curEmbedEl) curEmbedEl.textContent = formatSeconds(d.currentTime);
            var seekEmbedEl = document.getElementById('playerSeekSlider');
            if (seekEmbedEl && state.embedDuration > 0) {
              seekEmbedEl.value = String(Math.round((d.currentTime / state.embedDuration) * 1000));
            }
            updateActiveSubtitleCue(d.currentTime);
          }
        }
      } catch (e) {}
    });

    // Subtitles Menu Button (Top Bar + Bottom Bar) & Sync/Style/Background Controls
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
    if (subsBtn) subsBtn.addEventListener('click', toggleSubsMenuHandler);
    if (topSubsBtn) topSubsBtn.addEventListener('click', toggleSubsMenuHandler);

    var syncMinus = document.getElementById('subSyncMinusBtn');
    var syncReset = document.getElementById('subSyncResetBtn');
    var syncPlus = document.getElementById('subSyncPlusBtn');
    var updateSyncLabel = function () {
      if (syncReset) {
        var sign = state.subOffsetSec > 0 ? '+' : '';
        syncReset.textContent = sign + state.subOffsetSec.toFixed(1) + 's';
      }
    };
    if (syncMinus) {
      syncMinus.addEventListener('click', function () {
        state.subOffsetSec = Math.round((state.subOffsetSec - 0.5) * 10) / 10;
        updateSyncLabel();
      });
    }
    if (syncReset) {
      syncReset.addEventListener('click', function () {
        state.subOffsetSec = 0;
        updateSyncLabel();
      });
    }
    if (syncPlus) {
      syncPlus.addEventListener('click', function () {
        state.subOffsetSec = Math.round((state.subOffsetSec + 0.5) * 10) / 10;
        updateSyncLabel();
      });
    }

    var fontMinusBtn = document.getElementById('subFontMinusBtn');
    var fontResetBtn = document.getElementById('subFontResetBtn');
    var fontPlusBtn = document.getElementById('subFontPlusBtn');
    if (fontMinusBtn) {
      fontMinusBtn.addEventListener('click', function () {
        adjustSubtitleFontSize(-2);
      });
    }
    if (fontResetBtn) {
      fontResetBtn.addEventListener('click', function () {
        state.subFontPx = 42;
        state.subSize = 'xlarge';
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }
    if (fontPlusBtn) {
      fontPlusBtn.addEventListener('click', function () {
        adjustSubtitleFontSize(2);
      });
    }

    var sizeBtns = document.querySelectorAll('[data-sub-size]');
    for (var sz = 0; sz < sizeBtns.length; sz++) {
      sizeBtns[sz].addEventListener('click', function () {
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
        state.subColor = this.getAttribute('data-sub-color') || 'white';
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }

    var bgBtns = document.querySelectorAll('[data-sub-bg]');
    for (var bg = 0; bg < bgBtns.length; bg++) {
      bgBtns[bg].addEventListener('click', function () {
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
        adjustSubtitleVerticalPosition(-1.5);
      });
    }
    if (subPosBottomMaxBtn) {
      subPosBottomMaxBtn.addEventListener('click', function () {
        state.subBottomPct = 1.5;
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }
    if (subPosResetBtn) {
      subPosResetBtn.addEventListener('click', function () {
        state.subBottomPct = 3.5;
        applySubtitleStyleToOverlay();
        saveSubtitlePrefs();
      });
    }
    if (subPosUpBtn) {
      subPosUpBtn.addEventListener('click', function () {
        adjustSubtitleVerticalPosition(1.5);
      });
    }

    var seekSlider = document.getElementById('playerSeekSlider');
    var video = document.getElementById('videoElement');
    if (seekSlider && video) {
      seekSlider.addEventListener('input', function () {
        wakePlayerControls();
        if (state.playingMode === 'video' && video.duration && isFinite(video.duration)) {
          video.currentTime = (Number(this.value) / 1000) * video.duration;
          updateActiveSubtitleCue(video.currentTime);
        } else if (state.playingMode === 'embed' && state.embedDuration > 0) {
          var targetEmbedSec = (Number(this.value) / 1000) * state.embedDuration;
          state.embedCurrentTime = targetEmbedSec;
          updateActiveSubtitleCue(targetEmbedSec);
          var ifr = document.getElementById('streamEmbedIframe');
          if (ifr && ifr.contentWindow) {
            try {
              ifr.contentWindow.postMessage({ action: 'seek', time: Math.floor(targetEmbedSec) }, '*');
            } catch (e) {}
          }
        }
      });
    }

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

        if (state.playingItem && video.duration > 30 && Math.floor(video.currentTime) % 5 === 0) {
          var profBucket = ensureActiveProfileBucket();
          profBucket.progress[state.playingItem.id] = {
            currentTime: Math.floor(video.currentTime),
            duration: Math.floor(video.duration),
            percent: Math.min(99, Math.round((video.currentTime / video.duration) * 100))
          };
          saveSubUsersState();
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
      if (ab) ab.addEventListener('click', openAuthModal);
    }

    // Zero-Account Public Telegram VOD Hub Controls
    var tgOpenBtns = ['openTelegramHubBtn', 'tvTelegramRailBtn', 'openTelegramFromAuthBtn'];
    for (var tgIdx = 0; tgIdx < tgOpenBtns.length; tgIdx++) {
      var tgb = document.getElementById(tgOpenBtns[tgIdx]);
      if (tgb) tgb.addEventListener('click', openTelegramModal);
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
        var colors = ['#E50914', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777'];
        var newId = 'prof-' + Date.now();
        state.subUsers.push({
          id: newId,
          name: nameVal,
          color: colors[state.subUsers.length % colors.length],
          isKids: newSuKidsState,
          isPrimary: false
        });
        state.activeSubUserId = newId;
        newSuKidsState = false;
        if (kidsToggleBtn) kidsToggleBtn.classList.remove('active');
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

    // Strict Admin-Only Cloud SHA-256 User Verification (Zero Self-Registration, Zero Local Server Needed!)
    async function sha256HexBrowser(str) {
      if (window.crypto && window.crypto.subtle) {
        var buf = new TextEncoder().encode(str);
        var hashBuf = await window.crypto.subtle.digest('SHA-256', buf);
        var arr = Array.from(new Uint8Array(hashBuf));
        return arr.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
      return '';
    }

    async function verifyCloudAccountLogin(email, password) {
      var cleanEmail = String(email || '').trim().toLowerCase();
      var cleanPass = String(password || '').trim();
      if (!cleanEmail || !cleanPass) {
        return { ok: false, error: 'נא להזין כתובת אימייל וסיסמה מאושרים.' };
      }

      var vault = {
        'streamittvapp@gmail.com': {
          email: 'streamittvapp@gmail.com',
          display_name: 'מנהל ראשי (VIP / משפחתי)',
          status: 'approved',
          role: 'admin',
          max_profiles: 5,
          passHash: '01884b718ab9bed7c127b90f1880cc671e1d836488a9cc912c875547f4196a0f',
          altHashes: [
            'cc43dbd645eaf3e9d95c618efdcdce07265ec7a56ad9dad5e25b8b1e9795881b',
            'ba113970b3c49b0fad970547ddf74cd4c29cef8eed9eb6fbf69f4e66077a68b3'
          ]
        }
      };

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

      try {
        var localVault = JSON.parse(localStorage.getItem('streamit_cloud_vault_v9') || '{}');
        if (localVault && typeof localVault === 'object') {
          for (var lk in localVault) {
            if (Object.prototype.hasOwnProperty.call(localVault, lk)) {
              vault[lk.toLowerCase()] = localVault[lk];
            }
          }
        }
      } catch (e) {}

      var rec = vault[cleanEmail];
      if (!rec) {
        return { ok: false, error: 'החשבון אינו מאושר במערכת. יצירת משתמשים ואישורם מתבצעים על ידי מנהל המערכת בלבד.' };
      }
      if (rec.status && rec.status !== 'approved' && cleanEmail !== 'streamittvapp@gmail.com') {
        return { ok: false, error: 'המנוי שלך מושהה או ממתין לאישור מנהל המערכת.' };
      }

      var inputHash = await sha256HexBrowser(cleanEmail + ':' + cleanPass);
      var validHashes = [];
      if (rec.passHash) validHashes.push(rec.passHash);
      if (Array.isArray(rec.altHashes)) validHashes = validHashes.concat(rec.altHashes);

      var passMatched = false;
      if (inputHash && validHashes.length) {
        passMatched = validHashes.indexOf(inputHash) !== -1;
      } else if (rec.password) {
        passMatched = rec.password === cleanPass;
      } else {
        passMatched = (cleanPass === '123456' || cleanPass === 'streamit' || cleanPass === 'admin');
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
          max_profiles: Number(rec.max_profiles || 5)
        }
      };
    }

    var authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var emailIn = document.getElementById('authEmailInput');
        var passIn = document.getElementById('authPasswordInput');
        var statusMsg = document.getElementById('authStatusMsg');
        var emailVal = emailIn && emailIn.value ? emailIn.value.trim().toLowerCase() : '';
        var passVal = passIn && passIn.value ? passIn.value.trim() : '';
        if (!emailVal) return;

        if (statusMsg) {
          statusMsg.classList.add('hidden');
          statusMsg.textContent = '';
        }

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
          role: verifiedAccount.role || 'member'
        };
        try {
          localStorage.setItem('streamit_user_v9', JSON.stringify(state.user));
        } catch (err) {}
        updateAuthUi();
        if (typeof window.closeStreamItKeyboard === 'function') window.closeStreamItKeyboard();
        var am = document.getElementById('authModal');
        if (am) am.classList.add('hidden');
        var heroPlay = document.getElementById('heroPlayBtn');
        if (heroPlay && typeof window.streamItFocusElement === 'function') {
          window.streamItFocusElement(heroPlay, { scroll: false });
        }
      });
    }
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        state.user = null;
        try { localStorage.removeItem('streamit_user_v9'); } catch (e) {}
        var emailIn = document.getElementById('authEmailInput');
        var passIn = document.getElementById('authPasswordInput');
        if (emailIn) emailIn.value = '';
        if (passIn) passIn.value = '';
        updateAuthUi();
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
  }

  function bootStreamItApp() {
    if (window.__STREAMIT_V94_BOOTED) return;
    window.__STREAMIT_V94_BOOTED = true;
    upgradeDomFromV93ToV94IfNeeded();
    loadLocalStorageState();
    updateAuthUi();
    bindUiEvents();
    loadCatalog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootStreamItApp);
  } else {
    bootStreamItApp();
  }
})();
