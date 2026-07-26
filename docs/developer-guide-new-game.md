# 🛠️ Guide Développeur : Ajouter un Nouveau Jeu au Hub P2Play

Ce guide pas-à-pas explique comment adapter un jeu React/TypeScript existant ou en créer un nouveau pour le rendre compatible avec l'orchestrateur **P2Play Hub** en utilisant la bibliothèque unifiée **[`p2play-core`](https://github.com/gab371/p2play-core)**.

---

## 📋 Checklist d'Intégration

- [ ] **Étape 1** : Installer `p2play-core` dans votre jeu (`npm i github:gab371/p2play-core#v0.2.0`).
- [ ] **Étape 2** : Configurer la compilation double mode (`standalone` & `lib`) dans `vite.config.ts`.
- [ ] **Étape 3** : Exposer la fonction `window.mountXxx` dans `src/main.tsx`.
- [ ] **Étape 4** : Utiliser `usePeer` de `p2play-core` pour gérer de façon unifiée le P2P (mode standalone et mode `externalPeerManager`).
- [ ] **Étape 5** : Adapter `useGame.ts` / `App.tsx` pour auto-démarrer la partie et bypass le composant `<Lobby />` local lorsque `isEmbedded` est actif.
- [ ] **Étape 6** : Configurer la pipeline CI/CD GitHub Actions (`deploy.yml`) pour générer `dist.zip` et `standalone.zip`.
- [ ] **Étape 7** : Déclarer le jeu et sa version dans `games.json` du Hub.

---

## 🛠️ Étapier Détaillé

### Étape 1 : Installation de `p2play-core`

Ajoutez `p2play-core` dans le `package.json` de votre jeu :

```bash
npm install github:gab371/p2play-core#v0.2.0
```

---

### Étape 2 : Modification de `vite.config.ts`

Assurez-vous que Vite prend en charge le flag `--mode lib` et que `define` est déclaré au premier niveau :

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

### Étape 3 : Exposition de `mountMygame` dans `src/main.tsx`

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

### Étape 4 : Utilisation de `p2play-core` (`usePeer`)

Dans votre hook `usePeer` local ou directement dans vos composants, utilisez le hook `usePeer` de `p2play-core` :

```typescript
import { usePeer as useCorePeer, type PeerManagerLike } from 'p2play-core';
import type { GameState } from '../core/types';

interface UsePeerOptions {
  externalPeerManager?: PeerManagerLike<GameState>;
}

export function usePeer(options?: UsePeerOptions) {
  return useCorePeer<GameState>({
    externalPeerManager: options?.externalPeerManager,
    namespacePrefix: 'mygame', // Utilisé en mode standalone
    sounds: {
      click: () => soundManager.playClick(),
      victory: () => soundManager.playVictory(),
    },
  });
}
```

En passant `externalPeerManager`, `p2play-core` réutilise automatiquement la connexion WebRTC du Hub sans créer de nouvelle instance PeerJS.

---

### Étape 5 : Auto-Start & Bypass du Lobby Local dans `useGame.ts`

Dans `src/hooks/useGame.ts`, ajoutez la vérification `options.isEmbedded` pour démarrer le moteur de jeu automatiquement avec la liste des joueurs du Hub (`peerManager.lobbyPlayers`) :

```typescript
  useEffect(() => {
    if (!isHost) return;

    if (!gameEngineRef.current) {
      gameEngineRef.current = new GameEngine();
    }

    const engine = gameEngineRef.current;

    // Lancement automatique sans repasser par le formulaire du sous-jeu
    if (options?.isEmbedded && options?.externalPeerManager && engine.state.phase === 'LOBBY') {
      engine.state.players = [];
      const hostName = options.playerName || "Hôte";
      const hostAvatar = options.playerAvatar || "👑";
      engine.addPlayer(myPeerId!, hostName, hostAvatar, true);

      if (peerManager.lobbyPlayers) {
        peerManager.lobbyPlayers.forEach((p: any) => {
          if (p.peerId && p.peerId !== myPeerId) {
            engine.addPlayer(p.peerId, p.username || `Joueur ${p.peerId.slice(0, 4)}`, p.avatar || "👤", false);
          }
        });
      }

      engine.startGame();
      broadcastSanitizedStates(engine.state);
    }
  }, [options?.isEmbedded, isHost]);
```

---

### Étape 6 : Pipeline CI/CD GitHub Actions (`.github/workflows/deploy.yml`)

Ajoutez les étapes de double compilation et de publication dans les Releases GitHub de votre dépôt de jeu :

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
      
      # 1. Build Standalone (Pour GitHub Pages)
      - run: npm run build
      - run: cd dist && zip -r ../standalone.zip .
      
      # 2. Build Library (Pour l'intégration Hub)
      - run: npx vite build --mode lib
      - run: cd dist && zip -r ../dist.zip .

      # 3. Publication automatique de la Release GitHub
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

### Étape 7 : Enregistrement dans `games.json` du Hub

Dans le dépôt `hub-p2play`, ajoutez l'entrée de votre jeu dans `games.json` :

```json
{
  "games": {
    "mygame": {
      "repo": "votre-orga/votre-depot-jeu",
      "version": "v1.0.0"
    }
  }
}
```

Enfin, relancez `node download-games.js` dans le Hub pour télécharger, extraire et rendre votre jeu immédiatement jouable !

---

## 🎙️ Et pour le Chat Vocal et le Mode Spectateur ?

`p2play-core` fournit out-of-the-box les modules `p2play-core/voice` et `p2play-core/spectator`. Consultez les guides dédiés :
- 👁️ **[Guide Spectateur `p2play-core`](https://github.com/gab371/p2play-core/blob/main/docs/spectator-guide.md)**
- 🎙️ **[Guide Chat Vocal `p2play-core`](https://github.com/gab371/p2play-core/blob/main/docs/voice-chat-guide.md)**
