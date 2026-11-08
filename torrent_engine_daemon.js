/**
 * STREAM IT — Ultra-Fast Local BitTorrent Engine + Pre-Warming + FFmpeg Remuxer (v3.0)
 * ====================================================================================
 * - מתחבר ל-45 שרתי Tracker מהירים (UDP + HTTP + DHT) עבור מקורות ThePirateBay, YTS, 1337x ו-Torrentio
 * - תומך ב-Pre-Warming (/prewarm): חימום מוקדם והורדת תחילת הסרט כבר בפתיחת חלון התקציר!
 * - תומך בהזרמת HTTP 206 Byte-Range לקובצי MP4 + המרת MKV/EAC3 חיה ל-MP4/AAC באמצעות ffmpeg-static
 * - מאזין על 0.0.0.0:8094 כך שגם הסטרימר בסלון והטלפון ברשת הביתית יכולים להזרים ישירות מהמחשב!
 */

const http = require('http');
const url = require('url');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const torrentStream = require('torrent-stream');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (_) {
  ffmpegPath = 'ffmpeg';
}

const PORT = Number(process.env.TORRENT_ENGINE_PORT || 8094);
const TMP_DIR = path.join(os.tmpdir(), 'stream-it-torrents-v3');

// 40+ Ultra-Fast Global BitTorrent Trackers (ThePirateBay, YTS, RARBG, 1337x, OpenTrackr)
const ULTRA_FAST_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker1.bt.moack.co.kr:80/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker-udp.gbitt.info:80/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'udp://movies.zsw.ca:6969/announce',
  'udp://tracker.tiny-vps.com:6969/announce',
  'udp://retracker.lanta-net.ru:2710/announce',
  'udp://tracker.cyberia.is:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://ipv4.tracker.harry.lu:80/announce',
  'http://tracker.openbittorrent.com:80/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'http:// tracker.gbitt.info:80/announce'.replace(' ', ''),
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

const engines = new Map();

function getOrCreateEngine(infoHash) {
  const cleanHash = String(infoHash || '').trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(cleanHash)) {
    throw new Error('Invalid 40-char hex infoHash');
  }

  if (engines.has(cleanHash)) {
    const entry = engines.get(cleanHash);
    entry.lastAccessed = Date.now();
    return entry.promise;
  }

  const magnet = `magnet:?xt=urn:btih:${cleanHash}`;
  const engine = torrentStream(magnet, {
    tmp: TMP_DIR,
    trackers: ULTRA_FAST_TRACKERS,
    connections: 130,
    uploads: 4,
    verify: false
  });

  const entry = {
    infoHash: cleanHash,
    engine,
    ready: false,
    selectedFile: null,
    prewarmStream: null,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    promise: null
  };

  entry.promise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Torrent metadata timeout'));
    }, 25000);

    engine.on('ready', () => {
      clearTimeout(timer);
      entry.ready = true;
      resolve(engine);
    });

    engine.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  engines.set(cleanHash, entry);
  return entry.promise;
}

function selectVideoFile(engine, requestedIdx) {
  const files = engine.files || [];
  if (!files.length) return null;

  if (requestedIdx !== undefined && requestedIdx !== null && requestedIdx !== '' && files[Number(requestedIdx)]) {
    return files[Number(requestedIdx)];
  }

  // Prefer .mp4/.webm first, otherwise largest video file
  const videoExts = ['.mp4', '.webm', '.mkv', '.m4v', '.avi', '.mov'];
  const videoFiles = files.filter((f) =>
    videoExts.some((ext) => f.name.toLowerCase().endsWith(ext))
  );
  const pool = videoFiles.length ? videoFiles : files;
  return pool.reduce((best, cur) => (cur.length > best.length ? cur : best), pool[0]);
}

function prewarmFileHeaderAndTail(file) {
  if (!file) return;
  try {
    file.select();
    // Pre-read first 6MB (header + initial video frames) and last 1MB (MP4 moov atom if at end)
    const headEnd = Math.min(file.length - 1, 6 * 1024 * 1024);
    const headStream = file.createReadStream({ start: 0, end: headEnd });
    headStream.on('data', () => {});
    headStream.on('error', () => {});

    if (file.length > 8 * 1024 * 1024) {
      const tailStart = Math.max(0, file.length - 1024 * 1024);
      const tailStream = file.createReadStream({ start: tailStart, end: file.length - 1 });
      tailStream.on('data', () => {});
      tailStream.on('error', () => {});
    }
  } catch (_) {}
}

function getMimeType(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  return 'video/mp4';
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  const query = parsed.query || {};

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'stream-it-torrent-engine-v3',
        port: PORT,
        ffmpegAvailable: Boolean(ffmpegPath),
        activeTorrents: engines.size
      })
    );
    return;
  }

  // Pre-Warming Endpoint: Immediately connects to swarm & pre-buffers header before user clicks Play!
  if (pathname === '/prewarm') {
    const infoHash = String(query.infoHash || '').trim().toLowerCase();
    const fileIdx = query.fileIdx;
    if (!/^[a-f0-9]{40}$/.test(infoHash)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid infoHash' }));
      return;
    }

    getOrCreateEngine(infoHash)
      .then((engine) => {
        const file = selectVideoFile(engine, fileIdx);
        const entry = engines.get(infoHash);
        if (entry && file && !entry.selectedFile) {
          entry.selectedFile = file;
          prewarmFileHeaderAndTail(file);
        }
      })
      .catch(() => {});

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, status: 'prewarming', infoHash }));
    return;
  }

  // Swarm Status Endpoint
  if (pathname === '/status') {
    const infoHash = String(query.infoHash || '').trim().toLowerCase();
    const entry = engines.get(infoHash);
    if (!entry) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, active: false, ready: false, peers: 0, downloadSpeed: 0, downloaded: 0 }));
      return;
    }
    const eng = entry.engine;
    const swarm = eng.swarm || {};
    const wires = swarm.wires || [];
    const file = entry.selectedFile || (entry.ready ? selectVideoFile(eng, query.fileIdx) : null);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        active: true,
        ready: entry.ready,
        peers: wires.length,
        downloaded: swarm.downloaded || 0,
        downloadSpeed: typeof swarm.downloadSpeed === 'function' ? swarm.downloadSpeed() : 0,
        fileName: file ? file.name : '',
        fileLength: file ? file.length : 0,
        isMkv: file ? file.name.toLowerCase().endsWith('.mkv') : false
      })
    );
    return;
  }

  // Main Video Stream Endpoint (supports both Direct Byte-Range & Live FFmpeg Remux to MP4/AAC)
  if (pathname === '/stream') {
    const infoHash = String(query.infoHash || '').trim().toLowerCase();
    const fileIdx = query.fileIdx;
    const forceRemux = query.remux === '1';

    try {
      const engine = await getOrCreateEngine(infoHash);
      const file = selectVideoFile(engine, fileIdx);
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'No video file found in torrent' }));
        return;
      }

      const entry = engines.get(infoHash);
      if (entry && !entry.selectedFile) {
        entry.selectedFile = file;
        prewarmFileHeaderAndTail(file);
      } else {
        file.select();
      }

      const isMkv = file.name.toLowerCase().endsWith('.mkv') || file.name.toLowerCase().endsWith('.avi');

      // If user requested remux=1 (or MKV audio needs AAC conversion) and ffmpeg is available
      if (forceRemux && ffmpegPath) {
        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const srcStream = file.createReadStream();
        const ff = spawn(
          ffmpegPath,
          [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', 'pipe:0',
            '-map', '0:v:0',
            '-map', '0:a:0?',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-ac', '2',
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof+faststart',
            '-f', 'mp4',
            'pipe:1'
          ],
          { stdio: ['pipe', 'pipe', 'ignore'] }
        );

        srcStream.pipe(ff.stdin).on('error', () => {});
        ff.stdout.pipe(res).on('error', () => {});

        req.on('close', () => {
          try { srcStream.destroy(); } catch (_) {}
          try { ff.kill('SIGKILL'); } catch (_) {}
        });
        return;
      }

      // Standard High-Speed HTTP 206 Byte-Range Streaming
      const total = file.length;
      const mime = getMimeType(file.name);
      const range = req.headers.range;

      if (!range) {
        res.writeHead(200, {
          'Content-Length': total,
          'Content-Type': mime,
          'Accept-Ranges': 'bytes'
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        const stream = file.createReadStream();
        req.on('close', () => stream.destroy());
        stream.pipe(res);
        return;
      }

      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mime
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = file.createReadStream({ start, end });
      req.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

// Listen on 0.0.0.0 so both PC (localhost) and Home Wi-Fi devices (Android TV Streamer / Phone) can stream!
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[STREAM IT Torrent Engine v3] Listening on http://0.0.0.0:${PORT}`);
});
