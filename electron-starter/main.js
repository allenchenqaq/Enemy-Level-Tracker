// // main.js
// const { app, BrowserWindow } = require('electron');
// const https = require('https');

// const POLL_MS = 500;

// function fetchAllGameData() {
//   return new Promise((resolve, reject) => {
//     const req = https.request(
//       'https://127.0.0.1:2999/liveclientdata/allgamedata',
//       { method: 'GET', rejectUnauthorized: false, timeout: 2000 },
//       (res) => {
//         let data = '';
//         res.on('data', (c) => (data += c));
//         res.on('end', () => {
//           try { resolve(JSON.parse(data)); }
//           catch (e) { reject(e); }
//         });
//       }
//     );
//     req.on('error', reject);
//     req.end();
//   });
// }

// // Track which players have already been notified about reaching level 6
// const notifiedPlayers = new Set();

// function checkForLevel6Players(data) {
//   if (!data || !Array.isArray(data.allPlayers)) return [];
  
//   const notifications = [];
//   const chaosPlayers = data.allPlayers.filter(p => p.team === 'CHAOS');
  
//   chaosPlayers.forEach(player => {
//     const playerId = player.riotId || player.summonerName;
//     const key = `${playerId}`;
    
//     // If player just reached level 6 and we haven't notified yet
//     if (player.level === 6 && !notifiedPlayers.has(key)) {
//       notifiedPlayers.add(key);
//       notifications.push({
//         Champion: player.championName,
//         Summoner: playerId,
//         Position: player.position || 'NONE'
//       });
//     }
//   });
  
//   return notifications;
// }

// function startPolling(win) {
//   const poll = async () => {
//     try {
//       const data = await fetchAllGameData();
//       const newLevel6Players = checkForLevel6Players(data);

//       // Send notifications for each new level 6 player
//       if (!win || win.isDestroyed()) return;
//       for (const player of newLevel6Players) {
//         await win.webContents.executeJavaScript(`
//           window.showLevel6Notification(${JSON.stringify(player)});
//         `);
//       }
//     } catch (err) {
//       // Silently continue polling even on errors (game might not be running)
//     } finally {
//       if (win && !win.isDestroyed()) setTimeout(poll, POLL_MS);
//     }
//   };
//   poll();
// }

// function createWindow() {
//   const win = new BrowserWindow({
//     width: 350,
//     height: 150,
//     alwaysOnTop: true,
//     transparent: true,
//     frame: false,
//     hasShadow: false,
//     resizable: false,
//     webPreferences: { nodeIntegration: false, contextIsolation: true }
//   });

//   win.loadFile('index.html');

//   // Ensure renderer is ready before we start polling
//   win.webContents.once('dom-ready', () => {
//     startPolling(win);
//   });

//   return win;
// }

// app.whenReady().then(createWindow);

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit();
// });

// app.on('activate', () => {
//   // macOS: re-create a window when the dock icon is clicked and there are no other windows open.
//   if (BrowserWindow.getAllWindows().length === 0) createWindow();
// });

// main.js
const { app, BrowserWindow } = require('electron');
const https = require('https');

let win;
const POLL_MS = 500;
const THRESHOLDS = [6, 11, 16]; // notify at these levels

// const notifiedPlayers = new Set();
// const previousLevels = new Map();

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

// Track the highest threshold already notified per player
// key = riotId/summonerName, value = 0 | 6 | 11 | 16
const lastTierNotified = new Map();

function tierFor(level) {
  if (level >= 16) return 16;
  if (level >= 11) return 11;
  if (level >= 6)  return 6;
  return 0;
}

function collectNewTierNotifications(data) {
  const out = [];
  if (!data || !Array.isArray(data.allPlayers)) return out;

  const chaos = data.allPlayers.filter(p => p.team === 'CHAOS');

  chaos.forEach(p => {
    const id = p.riotId || p.summonerName || p.championName;
    const key = String(id);
    const lvl = Number(p.level) || 0;

    const prevTier = lastTierNotified.get(key) ?? 0;
    const curTier  = tierFor(lvl);

    if (curTier > prevTier) {
      lastTierNotified.set(key, curTier);
      out.push({
        Champion: p.championName,
        Summoner: key,
        Position: p.position || 'NONE',
        LevelReached: curTier
      });
    }

    // Update previous
    // previousLevels.set(key, cur);
  });

  return out;
}

// ---- Polling loop ----
function startPolling(win) {
    const poll = async () => {
      try {
        const data = await fetchAllGameData();
        const toNotify = collectNewTierNotifications(data);
  
        if (!win || win.isDestroyed()) return;
  
        // ✅ loop the right variable (toNotify), not newLevel6Players
        for (const player of toNotify) {
          await win.webContents.executeJavaScript(
            `window.showTierNotification(${JSON.stringify(player)})`
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
  const win = new BrowserWindow({
    width: 350,
    height: 200,
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
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
