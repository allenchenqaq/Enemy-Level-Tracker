# Enemy Level Tracker 

A tiny overlay that watches **enemy champion levels** in real time and reminds you the moment they hit **6**, **11**, or **16**—the key **ultimate** breakpoints in League of Legends. Never get surprised-ulted again.

> ✅ Uses Riot’s **Live Client Data** API  
> ✅ Transparent, always-on-top overlay  
> ✅ Visual + optional sound alerts at **6/11/16**

---

## ✨ Features

- **Ultimate Breakpoint Alerts:** Notifies when any enemy reaches **Lv 6 / 11 / 16** (ult unlock + rank ups).
- **Lightweight Overlay:** Minimal, click-through HUD that stays out of your way.
- **Configurable:** Poll interval, sound on/off, UI scale, alert debounce, window position.
- **Safe Data Source:** Reads Riot’s local HTTPS endpoint only (no memory reading, no inputs).

---

## 📦 Getting Started

> You must be **in a live game** for the local endpoint to respond.

### Prerequisites
- **Node.js** 18+ (or 20+)
- **npm** or **pnpm**
- League of Legends running (local API: `https://127.0.0.1:2999`)

### Install & Run

```bash
# clone
git clone https://github.com/allenchenqaq/Enemy-Level-Tracker.git
cd Enemy-Level-Tracker

# install dependencies
npm install
# or: pnpm install

# run
npm start
