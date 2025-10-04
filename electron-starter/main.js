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

// --- NEW: helpers to parse levels ---
function extractChampionLevels(data) {
  if (!data || !Array.isArray(data.allPlayers)) return [];
  // Build simple rows for console.table

  const chaosPlayers = data.allPlayers.filter(p => p.team === 'CHAOS' && p.level >= 6);

  const rows = chaosPlayers.map(p => ({
    Team: p.team,
    Champion: p.championName,
    Level: p.level,
    Dead: p.isDead ? `yes (${p.respawnTimer.toFixed(1)}s)` : 'no',
    Summoner: p.riotId || p.summonerName
  }));
  // Optional: stable ordering (team, then position if present, then name)
  const posOrder = ['TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY','NONE'];
  rows.sort((a, b) => {
    if (a.Team !== b.Team) return a.Team.localeCompare(b.Team);
    const pa = posOrder.indexOf(
      (data.allPlayers.find(p => p.riotId === a.Summoner || p.summonerName === a.Summoner)?.position) || 'NONE'
    );
    const pb = posOrder.indexOf(
      (data.allPlayers.find(p => p.riotId === b.Summoner || p.summonerName === b.Summoner)?.position) || 'NONE'
    );
    if (pa !== pb) return pa - pb;
    return a.Champion.localeCompare(b.Champion);
  });
  return rows;
}

function startPolling() {
  const poll = async () => {
    try {
      const data = await fetchAllGameData();

      // Clear and print header line with game time if available
      console.clear();
      const t = data?.gameData?.gameTime;
      if (typeof t === 'number') {
        const mm = Math.floor(t / 60);
        const ss = Math.floor(t % 60).toString().padStart(2, '0');
        console.log(`⏱️  Game Time ${mm}:${ss}`);
      }

      // --- NEW: print champion levels as a table ---
      const rows = extractChampionLevels(data);
      if (rows.length) {
        console.table(rows);
      } else {
        console.log('No player data yet.');
      }
    } catch (err) {
      console.log('Fetch failed:', err.message);
    } finally {
      setTimeout(poll, POLL_MS);
    }
  };
  poll();
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: { nodeIntegration: true }
  });
  win.loadURL('data:text/html,<h2>League Live Data Logger Running...</h2>');
  startPolling();
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
