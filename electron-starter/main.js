const { app, BrowserWindow } = require('electron');
const https = require('https');

let win;
const POLL_MS = 500;

// ---- Live Client fetch ----
function fetchAllGameData() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://127.0.0.1:2999/liveclientdata/allgamedata',
      { method: 'GET', rejectUnauthorized: false, timeout: 2000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// ---- Notification state ----
// Track who we've already notified + previous levels to detect crossing
const notifiedPlayers = new Set();
const previousLevels = new Map(); // key -> last level

function collectNewLevel6Notifications(data) {
  const out = [];
  if (!data || !Array.isArray(data.allPlayers)) return out;

  const chaos = data.allPlayers.filter(p => p.team === 'CHAOS');

  chaos.forEach(p => {
    const summ = p.riotId || p.summonerName || p.championName;
    const key = String(summ);
    const prev = previousLevels.get(key);
    const cur = Number(p.level) || 0;

    // First time we see this player, remember the level
    if (prev == null) {
      previousLevels.set(key, cur);
      // If we started mid-game and they're already >=6, notify once
      if (cur >= 6 && !notifiedPlayers.has(key)) {
        notifiedPlayers.add(key);
        out.push({
          Champion: p.championName,
          Summoner: key,
          Position: p.position || 'NONE'
        });
      }
      return;
    }

    // Detect crossing from <6 -> >=6
    if (prev < 6 && cur >= 6 && !notifiedPlayers.has(key)) {
      notifiedPlayers.add(key);
      out.push({
        Champion: p.championName,
        Summoner: key,
        Position: p.position || 'NONE'
      });
    }

    // Update previous
    previousLevels.set(key, cur);
  });

  return out;
}

// ---- Polling loop ----
function startPolling(win) {
  const poll = async () => {
    try {
      const data = await fetchAllGameData();

      // DEBUG: comment these if too noisy
      // console.log('[poll] players:', data?.allPlayers?.length ?? 0);

      const toNotify = collectNewLevel6Notifications(data);

      if (!win || win.isDestroyed()) return;
      for (const player of toNotify) {
        console.log('[notify]', player); // debug
        await win.webContents.executeJavaScript(
          `window.showLevel6Notification(${JSON.stringify(player)})`
        );
      }
    } catch (err) {
      console.log('[poll] fetch error:', err.message);
    } finally {
      if (win && !win.isDestroyed()) setTimeout(poll, POLL_MS);
    }
  };
  poll();
}

// ---- Window ----
function createWindow() {
    win = new BrowserWindow({
        width: 380,
        height: 400,         // was 150 — give room for multiple toasts
        alwaysOnTop: true,
        transparent: true,
        frame: false,
        hasShadow: false,
        resizable: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

  win.loadFile('index.html');

  win.webContents.once('dom-ready', () => {
    console.log('[main] renderer ready, start polling');
    startPolling(win);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
