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

// Track which players have already been notified about reaching level 6
const notifiedPlayers = new Set();

function checkForLevel6Players(data) {
  if (!data || !Array.isArray(data.allPlayers)) return [];
  
  const notifications = [];
  const chaosPlayers = data.allPlayers.filter(p => p.team === 'CHAOS');
  
  chaosPlayers.forEach(player => {
    const playerId = player.riotId || player.summonerName;
    const key = `${playerId}`;
    
    // If player just reached level 6 and we haven't notified yet
    if (player.level === 6 && !notifiedPlayers.has(key)) {
      notifiedPlayers.add(key);
      notifications.push({
        Champion: player.championName,
        Summoner: playerId,
        Position: player.position || 'NONE'
      });
    }
  });
  
  return notifications;
}

function startPolling(win) {
  const poll = async () => {
    try {
      const data = await fetchAllGameData();
      const newLevel6Players = checkForLevel6Players(data);

      // Send notifications for each new level 6 player
      if (!win || win.isDestroyed()) return;
      for (const player of newLevel6Players) {
        await win.webContents.executeJavaScript(`
          window.showLevel6Notification(${JSON.stringify(player)});
        `);
      }
    } catch (err) {
      // Silently continue polling even on errors (game might not be running)
    } finally {
      if (win && !win.isDestroyed()) setTimeout(poll, POLL_MS);
    }
  };
  poll();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 350,
    height: 150,
    alwaysOnTop: true,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  win.loadFile('index.html');

  // Ensure renderer is ready before we start polling
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
