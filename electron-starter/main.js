// main.js
const { app, BrowserWindow } = require('electron');
const https = require('https');

const POLL_MS = 500;

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

function extractChampionLevels(data) {
  if (!data || !Array.isArray(data.allPlayers)) return [];
  const chaosPlayers = data.allPlayers.filter(p => p.team === 'CHAOS' && p.level >= 6);
  const rows = chaosPlayers.map(p => ({
    Team: p.team,
    Champion: p.championName,
    Level: p.level,
    Dead: p.isDead ? `yes (${p.respawnTimer.toFixed(1)}s)` : 'no',
    Position: p.position || 'NONE',
    Summoner: p.riotId || p.summonerName
  }));
  rows.sort((a, b) => b.Level - a.Level || a.Champion.localeCompare(b.Champion));
  return rows;
}

function startPolling(win) {
  const poll = async () => {
    try {
      const data = await fetchAllGameData();

      const t = data?.gameData?.gameTime;
      let timeStr = '--:--';
      if (typeof t === 'number') {
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60).toString().padStart(2, '0');
        timeStr = `${mm}:${ss}`;
      }

      const rows = extractChampionLevels(data);

      if (!win || win.isDestroyed()) return;
      await win.webContents.executeJavaScript(`
        window.updateTable(${JSON.stringify(rows)}, ${JSON.stringify(timeStr)});
      `);
    } catch (err) {
      if (!win || win.isDestroyed()) return;
      await win.webContents.executeJavaScript(`
        window.showError(${JSON.stringify(err.message)});
      `);
    } finally {
      if (win && !win.isDestroyed()) setTimeout(poll, POLL_MS);
    }
  };
  poll();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 720,
    height: 520,
    alwaysOnTop: true,
    transparent: false,
    // if you use draggable body in CSS, keep contextIsolation on and no nodeIntegration
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  win.loadFile('index.html');

  // Ensure renderer defined window.updateTable/showError before we start polling
  win.webContents.once('dom-ready', () => {
    startPolling(win);
  });

  return win;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOS: re-create a window when the dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
