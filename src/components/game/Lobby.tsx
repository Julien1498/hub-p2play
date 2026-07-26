import { useState } from "react";
import { AvatarSelector } from "./AvatarSelector";

interface LobbyProps {
  status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  onCreate: (name: string, username: string, avatar: string, enableVoice: boolean) => void;
  onJoin: (name: string, username: string, avatar: string) => void;
}

export function Lobby({ status, onCreate, onJoin }: LobbyProps) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("👑");
  const [joinCode, setJoinCode] = useState("");
  const [enableVoice, setEnableVoice] = useState(true);

  const handleCreate = () => {
    if (!username.trim()) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomCode = "";
    for (let i = 0; i < 6; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onCreate(randomCode, username.trim(), avatar, enableVoice);
  };

  const handleJoin = () => {
    if (joinCode.trim() && username.trim()) {
      onJoin(joinCode.trim().toUpperCase(), username.trim(), avatar);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl relative text-center">
      <span className="text-6xl inline-block mb-4 animate-bounce">{avatar}</span>
      <h1 className="text-4xl font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent tracking-tight mb-2">
        P2PLAY
      </h1>
      <p className="text-zinc-400 text-sm mb-6">Votre Hub de Jeux de Société P2P Sans Serveur</p>

      <div className="space-y-6">
        {/* Username field */}
        <div className="text-left">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Votre Pseudo
          </label>
          <input
            type="text"
            placeholder="Entrez votre pseudo..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={status === 'CONNECTING'}
            className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-850 focus:border-violet-500 text-zinc-150 outline-none transition-all disabled:opacity-50 text-center font-bold"
          />
        </div>

        {/* Avatar selector */}
        <AvatarSelector selectedAvatar={avatar} onSelectAvatar={setAvatar} />

        <div className="border-t border-zinc-850 my-4"></div>

        {/* Create room action */}
        <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-3">
          <p className="text-xs text-zinc-400 font-semibold text-left">Commencer une nouvelle session en tant qu'Hôte</p>
          
          {/* Voice Chat Toggle Switch */}
          <div className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <span className="text-base">{enableVoice ? "🎙️" : "🔇"}</span>
              <div>
                <div>Activer le Salon Vocal P2P</div>
                <div className="text-[10px] font-normal text-zinc-500">
                  {enableVoice ? "Chat vocal intégré actif" : "Désactivé (ex: Discord)"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnableVoice(!enableVoice)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 flex-shrink-0 ${
                enableVoice ? "bg-violet-600" : "bg-zinc-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  enableVoice ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleCreate}
            disabled={status === 'CONNECTING' || !username.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/30"
          >
            {status === 'CONNECTING' ? 'Création...' : 'Créer un salon'}
          </button>
        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-850"></div>
          </div>
          <span className="relative px-3 text-xs uppercase font-bold text-zinc-500 bg-zinc-900">OU</span>
        </div>

        {/* Join room action */}
        <div className="space-y-3">
          <div className="text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Saisir le code du salon
            </label>
            <input
              type="text"
              placeholder="CODE DU SALON..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              disabled={status === 'CONNECTING'}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-850 focus:border-violet-500 text-zinc-150 outline-none transition-all disabled:opacity-50 text-center font-bold tracking-widest uppercase font-mono"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={status === 'CONNECTING' || !joinCode.trim() || !username.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-750 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Rejoindre un salon
          </button>
        </div>
      </div>
    </div>
  );
}
