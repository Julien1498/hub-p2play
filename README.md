# 🎮 P2Play Hub - Multiplayer Game Orchestrator

**P2Play Hub** est un orchestrateur de jeux de société multijoueurs Peer-to-Peer (P2P) sans serveur. Il permet à des joueurs de créer un salon persistant ("Party Group"), d'inviter des amis via un code de salon, et de basculer de manière transparente d'un jeu à un autre (*Skull & Roses*, *Royal Bluff*, *Sheriff & Smugglers*, *Billard P2Play*) sans rechargement de page ni perte de connexion WebRTC.

Toute la couche réseau WebRTC, le chat vocal et la gestion des salons reposent sur la bibliothèque unifiée **[`p2play-core`](https://github.com/gab371/p2play-core)**.

---

## ✨ Fonctionnalités Principales

- **Orchestration Single Page Application (SPA)** : Tout le cycle de vie (Hub <-> Jeux) se déroule sur une seule page HTML/React. Aucune iFrame n'est utilisée.
- **Groupe de Partie Persistant (Party Group P2P)** : La connexion WebRTC (via PeerJS et `p2play-core`) est établie au niveau du Hub et transmise de manière transparente au jeu sélectionné lors du lancement (`externalPeerManager`).
- **Rendu Plein Écran & Navigation** : Les jeux s'affichent en superposition intégrale (`100vw` × `100vh`) avec une barre supérieure de navigation contenant un bouton **`← Lobby P2Play`** pour revenir au salon à tout moment.
- **Bypass Direct des Lobbies de Jeux** : Les joueurs saisissent leur pseudo et leur émote une seule fois dans le Hub. Le lancement bascule directement sur le plateau de jeu (`GameBoard`).
- **Sélecteur d'Émotes Double Pack** : Prise en charge des **"Émotes P2Play"** (universelles Hub) et des **"Émotes du Jeu"** (thématiques).
- **Intégration Réelle & Isolée par Releases GitHub (CI/CD)** : Le Hub télécharge et extrait automatiquement les builds de production (`dist.zip`) des jeux configurés dans `games.json` avant la compilation.

---

## 🛠️ Stack Technique

- **Moteur Réseau Unifié** : [`p2play-core`](https://github.com/gab371/p2play-core) (PeerJS WebRTC transport, passation de session, chat vocal & mode spectateur).
- **Framework UI** : React 18 / 19, TypeScript, Tailwind CSS, Lucide React.
- **Build Tool** : Vite (Support ES Modules & injection dynamique de bundles).
- **Automation** : Node.js (`download-games.js`) pour le téléchargement dynamique des releases GitHub.

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Téléchargement des bundles de jeux (Pré-build)
Cette commande lit le fichier `games.json`, télécharge les releases GitHub correspondantes et les extrait sous `public/games/` :
```bash
node download-games.js
```

### 3. Lancement du serveur de développement
```bash
npm run dev
```
Ouvrez votre navigateur sur `http://localhost:3004`.

---

## 📚 Documentation Technique

Consultez les guides détaillés pour comprendre le fonctionnement interne et ajouter de nouveaux jeux :

- 🌐 **[Documentation `p2play-core`](https://github.com/gab371/p2play-core)** : Référence complète du moteur réseau P2P, du chat vocal et du mode spectateur.
- 🏛️ **[Architecture globale du Hub](docs/architecture.md)** : Fonctionnement du Party Group P2P, passation WebRTC et gestion SPA.
- 🔌 **[Contrat de Montage (`window.mountXxx`)](docs/game-mount-contract.md)** : Spécifications techniques requises pour les bundles ES Modules des jeux.
- 🛠️ **[Guide Développeur : Ajouter un nouveau jeu](docs/developer-guide-new-game.md)** : Tutoriel pas-à-pas pour adapter un jeu avec `p2play-core`, configurer Vite et publier une Release GitHub compatible.

---

## ⚙️ Configuration des Jeux (`games.json`)

Pour modifier la version d'un jeu ou ajouter un nouveau titre, éditez simplement `games.json` :

```json
{
  "games": {
    "skull": {
      "repo": "gab371/skull-and-roses",
      "version": "v0.1.0"
    },
    "royal": {
      "repo": "gab371/royal-bluff",
      "version": "v0.1.0"
    },
    "sheriff": {
      "repo": "gab371/sheriff-smugglers",
      "version": "v1.0.0"
    }
  }
}
```
