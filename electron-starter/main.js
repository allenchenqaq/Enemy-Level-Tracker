const { app, BrowserWindow } = require('electron');
const https = require('https');

const POLL_MS = 500; // 0.5 seconds

function fetchAllGameData() {
  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://127.0.0.1:2999/liveclientdata/allgamedata',
      {
        method: 'GET',
        rejectUnauthorized: false, // ignore Riot's self-signed certificate
        timeout: 2000
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function startPolling() {
  const poll = async () => {
    try {
      const data = await fetchAllGameData();
      console.clear();
      console.log(`[${new Date().toLocaleTimeString()}] Game Data:\n`, data);
    } catch (err) {
      console.log(`[${new Date().toLocaleTimeString()}] Failed to fetch:`, err.message);
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

  startPolling(); // begin polling loop
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
