# 🎮 P2Play Hub - Multiplayer Game Orchestrator

**P2Play Hub** is a serverless Peer-to-Peer (P2P) multiplayer board game orchestrator. It allows players to create persistent lobby groups ("Party Groups"), invite friends via room code, and switch seamlessly between games (*Skull & Roses*, *Royal Bluff*, *Sheriff & Smugglers*, *Billard P2Play*) without page reloads or WebRTC disconnection.

All WebRTC network transport, voice chat, and room management rely on the unified library **[`p2play-core`](https://github.com/gab371/p2play-core)**.

---

## ✨ Key Features

- **Single Page Application (SPA) Orchestration**: The entire lifecycle (Hub <-> Games) occurs on a single HTML/React page without iFrames.
- **Persistent Party Group P2P**: WebRTC connection (via PeerJS and `p2play-core`) is established at Hub level and passed seamlessly to the selected game on launch (`externalPeerManager`).
- **Full-Screen Rendering & Navigation**: Games render full-screen (`100vw` × `100vh`) with a top navigation bar containing a **`← P2Play Lobby`** button to return to the party room at any time.
- **Direct Game Lobby Bypass**: Players enter username and avatar once in the Hub. Launching transitions directly to the game board or pre-game deck selection lobby.
- **Dual Pack Emote Selector**: Support for universal Hub emotes and game-specific thematic emotes.
- **GitHub Release Integration (CI/CD)**: Hub automatically downloads and extracts production builds (`dist.zip`) of games configured in `games.json` prior to build.

---

## 🛠️ Tech Stack

- **Unified Network Engine**: [`p2play-core`](https://github.com/gab371/p2play-core) (PeerJS WebRTC transport, session handover, voice chat & spectator mode).
- **UI Framework**: React 18 / 19, TypeScript, Tailwind CSS, Lucide React.
- **Build Tool**: Vite (ES Modules support & dynamic script injection).
- **Automation**: Node.js (`download-games.js`) for downloading GitHub releases.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Download Game Bundles (Pre-build)
This script reads `games.json`, downloads matching GitHub releases, and extracts them to `public/games/`:
```bash
node download-games.js
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3004`.

---

## 📚 Technical Documentation

- 🌐 **[`p2play-core` Documentation](https://github.com/gab371/p2play-core)**: Complete P2P network engine, voice chat, and spectator guide.
- 🏛️ **[Hub Architecture](docs/architecture.md)**: Persistent P2P Party Group, WebRTC handover, and SPA lifecycle.
- 🔌 **[Mount Contract (`window.mountXxx`)](docs/game-mount-contract.md)**: Specification for game ES Module bundles.
- 🛠️ **[Developer Guide: Add a New Game](docs/developer-guide-new-game.md)**: Step-by-step tutorial to adapt games with `p2play-core`, configure Vite, and publish compatible GitHub Releases.

---

## ⚙️ Game Configuration (`games.json`)

To update a game version or add a new title, edit `games.json`:

```json
{
  "games": {
    "skull": {
      "repo": "gab371/skull-and-roses",
      "version": "v0.3.0"
    },
    "royal": {
      "repo": "gab371/royal-bluff",
      "version": "v0.3.0"
    },
    "sheriff": {
      "repo": "gab371/sheriff-smugglers",
      "version": "v0.3.0"
    }
  }
}
```
