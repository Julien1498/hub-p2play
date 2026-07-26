import { useState } from "react";
import { useHub } from "./hooks/useHub";
import { useGamesCatalog } from "./hooks/useGamesCatalog";
import { Lobby } from "./components/game/Lobby";
import { GameMountPanel } from "./components/game/GameMountPanel";
import { AvatarSelector } from "./components/game/AvatarSelector";
import { Gamepad2 } from "lucide-react";
import { SoundToggle } from "./components/ui/SoundToggle";
import { VoiceChatPanel } from "p2play-core/voice";
import { TextChatPanel } from "p2play-core/chat";
import { copyRoomUrlToClipboard } from "p2play-core/url";

export default function App() {
  const hub = useHub();
  const { games: availableGames, loading: catalogLoading, error: catalogError } = useGamesCatalog();
  const [copied, setCopied] = useState(false);
  const enableHubVoice = import.meta.env.VITE_ENABLE_VOICE_CHAT !== "false";

  const handleCopy = () => {
    if (hub.roomId) {
      copyRoomUrlToClipboard(hub.roomId).then((success) => {
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });
    }
  };

  const showLobby = !hub.roomId;

  return (
    <>
      {hub.activeGame ? (
        <GameMountPanel
          gameName={hub.activeGame}
          peerId={hub.myPeerId || ""}
          playerName={hub.players.find((p) => p.peerId === hub.myPeerId)?.username || "Joueur"}
          playerAvatar={hub.players.find((p) => p.peerId === hub.myPeerId)?.avatar || "👑"}
          externalPeerManager={hub.externalPeerManager}
          isHost={hub.isHost}
          lateJoin={!hub.isHost}
          gameConfig={hub.gameConfig}
          hubPhase={hub.hubPhase}
          mountFnName={availableGames.find((g) => g.key === hub.activeGame)?.mountFn}
          shellBackground={availableGames.find((g) => g.key === hub.activeGame)?.shellBackground}
          onExit={hub.returnToHub}
          onLeave={hub.disconnect}
        />
      ) : (
        <div className="min-h-screen text-zinc-50 font-sans flex flex-col justify-between relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.08),transparent_70%)] pointer-events-none" />

          <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-6 px-4 border-b border-zinc-900 relative z-10">
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-6 h-6 text-[#8b5cf6] animate-pulse" />
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent tracking-tight">
                  P2PLAY HUB
                </h1>
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold block leading-none mt-0.5">
                  Multiplayer Game Orchestrator
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SoundToggle className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border-zinc-800" />
              {hub.roomId && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-3 py-1.5 rounded-full font-bold">
                    Salon Connecté
                  </span>
                  <span className={hub.enableVoice ? "bg-violet-950/80 border border-violet-800 text-violet-300 px-3 py-1.5 rounded-full font-bold" : "bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-1.5 rounded-full font-bold"}>
                    {hub.enableVoice ? "🎙️ Vocal Actif" : "🔇 Vocal Désactivé"}
                  </span>
                  <span className="text-zinc-400 font-mono bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-850">
                    Code : <span className="text-violet-400 font-bold">{hub.roomId}</span>
                  </span>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 bg-violet-950/40 hover:bg-violet-900/40 text-violet-300 font-bold rounded-xl border border-violet-800/50 transition-all flex items-center gap-1"
                    title="Copier le lien d'invitation direct pour ce salon"
                  >
                    <span>🔗</span>
                    <span>{copied ? "Lien copié !" : "Copier le lien"}</span>
                  </button>
                  <button
                    onClick={hub.disconnect}
                    className="px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 text-rose-400 border border-rose-900/30 rounded-xl font-bold transition-all"
                  >
                    Quitter
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 relative z-10">
            {showLobby ? (
              <Lobby
                status={hub.status}
                onCreate={hub.createRoom}
                onJoin={hub.joinRoom}
              />
            ) : (
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-3xl shadow-xl space-y-4">
                  <h2 className="text-xl font-bold text-zinc-200">👥 Joueurs Connectés ({hub.players.length})</h2>
                  <div className="flex flex-wrap gap-2">
                    {hub.players.map((p, idx) => (
                      <span
                        key={p.peerId}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${p.peerId === hub.myPeerId
                            ? "bg-violet-950/30 border-violet-850 text-violet-400"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400"
                          }`}
                      >
                        <span className="text-base">{p.avatar || (idx === 0 ? "👑" : "👤")}</span>
                        <span>{p.username}</span>
                        {p.peerId === hub.myPeerId && <span className="text-[10px] opacity-60">(Vous)</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-3xl shadow-xl">
                    <AvatarSelector
                    selectedAvatar={hub.players.find(p => p.peerId === hub.myPeerId)?.avatar || "👑"}
                    onSelectAvatar={hub.updateAvatar}
                    gameAvatars={availableGames.find((g) => g.key === hub.selectedGame)?.avatars}
                  />
                </div>

                <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-3xl shadow-xl space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-200">🎮 Sélectionner un jeu</h2>
                      <p className="text-xs text-zinc-400">
                        {hub.isHost ? "Choisissez le jeu de votre partie" : "En attente du choix de l'hôte..."}
                      </p>
                    </div>
                    {hub.isHost && hub.selectedGame && (
                      <button
                        onClick={() => {
                          const game = availableGames.find((g) => g.key === hub.selectedGame);
                          hub.launchGame(game?.hasPreConfig ? 'GAME_CONFIG' : 'GAME_RUNNING');
                        }}
                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 font-bold rounded-xl text-white transition-all shadow-lg shadow-violet-900/30"
                      >
                        Lancer la partie
                      </button>
                    )}
                  </div>

                  {catalogError && (
                    <p className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-xl px-3 py-2">
                      {catalogError}
                    </p>
                  )}

                  {catalogLoading ? (
                    <p className="text-sm text-zinc-500">Chargement du catalogue de jeux…</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {availableGames.map((g) => (
                        <button
                          key={g.key}
                          onClick={() => hub.isHost && hub.broadcastGameSelection(g.key)}
                          disabled={!hub.isHost}
                          className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 h-36 ${hub.selectedGame === g.key
                              ? "bg-violet-950/20 border-violet-500 ring-2 ring-violet-500"
                              : "bg-zinc-950/50 border-zinc-850 hover:bg-zinc-900/30"
                            } ${!hub.isHost ? "cursor-not-allowed" : ""}`}
                        >
                          <div>
                            <h3 className="font-bold text-zinc-200">{g.label}</h3>
                            <p className="text-xs text-zinc-400 mt-1">{g.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <TextChatPanel
                  messages={hub.chatMessages}
                  onSend={hub.sendChat}
                  title="Chat du Salon"
                  placeholder="Discuter avec le salon…"
                  emptyLabel="Aucun message. L'historique est conservé entre les jeux."
                  className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-5 shadow-xl flex flex-col text-zinc-100 text-sm"
                  maxHeight="220px"
                />
              </div>
            )}
          </main>

          <footer className="max-w-7xl mx-auto w-full text-center text-[10px] text-zinc-600 py-6 px-4 border-t border-zinc-900 flex justify-between items-center">
            <div>hub-p2play - Réseau Privé Peer-to-Peer - Version v0.3.0</div>
            <a
              href="https://github.com/gab371/hub-p2play"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-violet-400 transition-colors"
            >
              <span>Dépôt GitHub</span>
            </a>
          </footer>
        </div>
      )}

      {enableHubVoice && hub.enableVoice && hub.roomId && (
        <div className="fixed top-24 left-4 z-[200]">
          <VoiceChatPanel
            peerManager={hub.externalPeerManager}
            username={hub.players.find((p) => p.peerId === hub.myPeerId)?.username}
            avatar={hub.players.find((p) => p.peerId === hub.myPeerId)?.avatar || "👑"}
          />
        </div>
      )}
    </>
  );
}
