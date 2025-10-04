const LCU_URL = 'http://127.0.0.1:2999/liveclientdata/allgamedata';
const POLL_MS = 500;

const prevLevels = new Map();
const lastAlertAt = new Map();

function toast(msg) {
  const container = document.getElementById('alerts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function pid(p) {
  return (p.riotIdGameName && p.riotIdTagLine)
    ? `${p.riotIdGameName}#${p.riotIdTagLine}`
    : p.summonerName;
}

function dedupOnce(key, t, msg) {
  const last = lastAlertAt.get(key);
  if (last == null || Math.abs(t - last) > 8) {
    toast(msg);
    lastAlertAt.set(key, t);
  }
}

function getMyTeam(snap) {
  const ap = snap.activePlayer || {};
  if (ap.riotIdGameName && ap.riotIdTagLine) {
    const me = (snap.allPlayers || []).find(
      p => p.riotIdGameName === ap.riotIdGameName && p.riotIdTagLine === ap.riotIdTagLine
    );
    if (me) return me.team;
  }
  if (ap.summonerName) {
    const me2 = (snap.allPlayers || []).find(p => p.summonerName === ap.summonerName);
    if (me2) return me2.team;
  }
  return null;
}

async function tick() {
  try {
    const res = await fetch(LCU_URL);
    if (!res.ok) throw new Error('LCU not ready');
    const snap = await res.json();

    const myTeam = getMyTeam(snap);
    if (!myTeam) return;

    const t = snap.gameData?.gameTime ?? 0;
    const enemies = (snap.allPlayers || []).filter(p => p.team !== myTeam);

    for (const p of enemies) {
      const id = pid(p);
      const was = prevLevels.get(id) ?? p.level;
      const now = p.level;

      if (was < 6 && now >= 6)  dedupOnce(`lvl_${id}_6`,  t, `🔔 Enemy ${p.championName} hit 6`);
      if (was < 11 && now >= 11) dedupOnce(`lvl_${id}_11`, t, `🔔 Enemy ${p.championName} hit 11`);
      if (was < 16 && now >= 16) dedupOnce(`lvl_${id}_16`, t, `🔔 Enemy ${p.championName} hit 16`);

      prevLevels.set(id, now);
    }
  } catch (err) {
    // ignore when not in game or API not ready
  } finally {
    setTimeout(tick, POLL_MS);
  }
}

tick();
