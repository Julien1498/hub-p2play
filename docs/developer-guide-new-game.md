# 🛠️ Developer Guide: Add a New Game to P2Play Hub

This step-by-step guide explains how to adapt an existing React/TypeScript game or create a new one compatible with **P2Play Hub** using the unified **[`p2play-core`](https://github.com/gab371/p2play-core)** package.

---

## 📋 Integration Checklist

- [ ] **Step 1**: Install `p2play-core` in your game (`npm i github:gab371/p2play-core#v0.2.0`).
- [ ] **Step 2**: Configure dual build modes (`standalone` & `lib`) in `vite.config.ts`.
- [ ] **Step 3**: Expose `window.mountXxx` in `src/main.tsx`.
- [ ] **Step 4**: Use `usePeer` from `p2play-core` to manage P2P connections (standalone and `externalPeerManager`).
- [ ] **Step 5**: Adapt `useGame.ts` / `App.tsx` to auto-populate players and bypass local home screen when `isEmbedded` is active.
- [ ] **Step 6**: Configure CI/CD GitHub Actions workflow (`deploy.yml`) to build `dist.zip` and `standalone.zip`.
- [ ] **Step 7**: Register game entry and version in Hub's `games.json`.

---

## 🛠️ Step-by-Step Instructions

### Step 1: Install `p2play-core`

Add `p2play-core` to your game's `package.json`:

```bash
npm install github:gab371/p2play-core#v0.2.0
```

---

### Step 2: Configure `vite.config.ts`

Ensure Vite handles `--mode lib` flag and root-level `define`:

```typescript
import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { readFileSync } from "fs"

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';
  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': '{}',
    },
    build: isLib ? {
      outDir: 'dist',
      lib: {
        entry: path.resolve(__dirname, 'src/main.tsx'),
        name: 'GameMygame',
        formats: ['es'],
        fileName: () => 'index.js'
      }
    } : {
      outDir: 'dist'
    }
  }
});
```

---

### Step 3: Expose `mountMygame` in `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import type { PeerManagerLike } from 'p2play-core'
import './index.css'

export function mount(element: HTMLElement, options: { 
  peerId: string; 
  onExit?: () => void; 
  externalPeerManager?: PeerManagerLike;
  playerName?: string;
  playerAvatar?: string;
}) {
  const styleId = 'game-style-mygame';
  if (!document.getElementById(styleId)) {
    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = '/games/mygame/style.css';
    document.head.appendChild(link);
  }

  const root = createRoot(element);
  root.render(
    <StrictMode>
      <App
        isEmbedded={true}
        externalPeerManager={options.externalPeerManager}
        onExit={options.onExit}
        playerName={options.playerName}
        playerAvatar={options.playerAvatar}
      />
    </StrictMode>
  );
  return () => root.unmount();
}

(window as any).mountMygame = mount;
```

---

### Step 4: Use `p2play-core` (`usePeer`)

Use `p2play-core`'s `usePeer` hook in your components or local hook wrapper:

```typescript
import { usePeer as useCorePeer, type PeerManagerLike } from 'p2play-core';
import type { GameState } from '../core/types';

interface UsePeerOptions {
  externalPeerManager?: PeerManagerLike<GameState>;
}

export function usePeer(options?: UsePeerOptions) {
  return useCorePeer<GameState>({
    externalPeerManager: options?.externalPeerManager,
    namespacePrefix: 'mygame', // Used in standalone mode
    sounds: {
      click: () => soundManager.playClick(),
      victory: () => soundManager.playVictory(),
    },
  });
}
```

Passing `externalPeerManager` reuses Hub's WebRTC connection without instantiating a duplicate PeerJS instance.

---

### Step 5: Direct Bypass & Embedded Pre-Game Configuration (`useGame.ts`)

In `src/hooks/useGame.ts`, add embedded checks to populate players automatically from `peerManager.lobbyPlayers` while staying in `LOBBY` phase if your game features pre-game deck/rule configuration:

```typescript
  useEffect(() => {
    if (!isHost) return;

    if (!gameEngineRef.current) {
      gameEngineRef.current = new GameEngine();
    }

    const engine = gameEngineRef.current;

    // Populate players from Hub lobby without skipping pre-game config screen
    if (options?.isEmbedded && options?.externalPeerManager && engine.state.phase === 'LOBBY') {
      engine.state.players = [];
      const hostName = options.playerName || "Host";
      const hostAvatar = options.playerAvatar || "👑";
      engine.addPlayer(myPeerId!, hostName, hostAvatar, true);

      if (peerManager.lobbyPlayers) {
        peerManager.lobbyPlayers.forEach((p: any) => {
          if (p.peerId && p.peerId !== myPeerId) {
            engine.addPlayer(p.peerId, p.username || `Player ${p.peerId.slice(0, 4)}`, p.avatar || "👤", false);
          }
        });
      }

      // DO NOT call engine.startGame() here if game exposes pre-game configuration.
      // Host triggers start via "Launch Game" button in pre-game lobby.
      broadcastSanitizedStates(engine.state);
    }
  }, [options?.isEmbedded, isHost]);
```

---

### Step 6: CI/CD Pipeline (`.github/workflows/deploy.yml`)

Configure GitHub Actions workflow to build dual archives and create GitHub Releases:

```yaml
name: Deploy and Release Game

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      
      # 1. Standalone Build (For GitHub Pages)
      - run: npm run build
      - run: cd dist && zip -r ../standalone.zip .
      
      # 2. Library Build (For Hub integration)
      - run: npx vite build --mode lib
      - run: cd dist && zip -r ../dist.zip .

      # 3. Create GitHub Release
      - name: Extract version
        id: get_version
        run: echo "VERSION=v$(node -p "require('./package.json').version")" >> $GITHUB_ENV

      - name: Create or Update GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ env.VERSION }}
          name: Release ${{ env.VERSION }}
          files: |
            dist.zip
            standalone.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Step 7: Register in Hub `games.json`

In `hub-p2play`, add your game entry to `games.json`:

```json
{
  "games": {
    "mygame": {
      "repo": "your-org/your-game-repo",
      "version": "v1.0.0"
    }
  }
}
```

Run `node download-games.js` in Hub to download, extract, and play your game instantly!

---

## 🎙️ Voice Chat & Spectator Mode

`p2play-core` provides `p2play-core/voice` and `p2play-core/spectator` modules. Read the dedicated guides:
- 👁️ **[`p2play-core` Spectator Guide](https://github.com/gab371/p2play-core/blob/main/docs/spectator-guide.md)**
- 🎙️ **[`p2play-core` Voice Chat Guide](https://github.com/gab371/p2play-core/blob/main/docs/voice-chat-guide.md)**
