import { useState, useEffect, useRef } from "react";
import type { PeerManagerLike } from "p2play-core";
import {
  activateGameStyle,
  unloadAllGameStyles,
  GAME_SHELL_BACKGROUNDS,
} from "../../utils/gameStyles";

interface GameMountPanelProps {
  gameName: string;
  peerId: string;
  playerName?: string;
  playerAvatar?: string;
  externalPeerManager?: PeerManagerLike;
  isHost?: boolean;
  lateJoin?: boolean;
  gameConfig?: any;
  hubPhase?: string;
  onExit: () => void;
  onLeave?: () => void;
}

export function GameMountPanel({ gameName, peerId, playerName, playerAvatar, externalPeerManager, isHost, lateJoin, gameConfig, hubPhase, onExit, onLeave }: GameMountPanelProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const shellBackground =
    GAME_SHELL_BACKGROUNDS[gameName] ?? "radial-gradient(circle at center, #09090b 0%, #09090b 100%)";

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let unmountGame: (() => void) | null = null;
    let cancelled = false;

    const loadGame = async () => {
      try {
        setLoading(true);
        setError(null);

        const rawBase = import.meta.env.BASE_URL || "./";
        const gameBasePath = rawBase.endsWith("/")
          ? `${rawBase}games/${gameName}/`
          : `${rawBase}/games/${gameName}/`;

        // Load only this game's CSS (fonts + utilities). Background is painted
        // on the shell below — body{background} cannot fill the viewport when
        // the only child is position:fixed (body height collapses → white flash).
        await activateGameStyle(gameName, `${gameBasePath}style.css`);
        if (cancelled) return;

        await new Promise<void>((resolve, reject) => {
          const existingScript = document.getElementById(`game-script-${gameName}`);
          if (existingScript) existingScript.remove();

          script = document.createElement("script");
          script.id = `game-script-${gameName}`;
          script.type = "module";
          script.src = `${gameBasePath}index.js`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Échec du chargement du script du jeu "${gameName}"`));
          document.head.appendChild(script);
        });

        if (cancelled) return;

        const mountFnName = `mount${gameName.charAt(0).toUpperCase() + gameName.slice(1)}`;
        const mountFn = (window as any)[mountFnName];

        if (typeof mountFn !== "function") {
          throw new Error(`Fonction de montage "${mountFnName}" introuvable sur window.`);
        }

        if (mountRef.current) {
          mountRef.current.innerHTML = "";
          const cleanup = mountFn(mountRef.current, {
            peerId,
            playerName,
            playerAvatar,
            externalPeerManager,
            isEmbedded: true,
            isHost,
            lateJoin,
            gameConfig,
            hubPhase,
            onExit,
          });
          if (typeof cleanup === "function") {
            unmountGame = cleanup;
          }
        }

        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load game module:", err);
        setError(`Impossible de charger le jeu "${gameName}" : ${err.message}`);
        setLoading(false);
      }
    };

    loadGame();

    return () => {
      cancelled = true;
      try {
        unmountGame?.();
      } catch (e) {
        console.warn("Game unmount failed:", e);
      }
      unmountGame = null;

      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }

      unloadAllGameStyles();

      if (mountRef.current) {
        mountRef.current.innerHTML = "";
      }
    };
  }, [gameName, peerId]);

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: shellBackground }}
      data-p2play-game-shell={gameName}
    >
      {isHost ? (
        <button
          onClick={onExit}
          className="fixed top-4 left-4 z-[100] flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 font-bold px-4 py-2 rounded-xl backdrop-blur-md border border-amber-500/30 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          ← Lobby P2Play
        </button>
      ) : (
        <button
          onClick={() => (onLeave ? onLeave() : onExit())}
          className="fixed top-4 left-4 z-[100] flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-rose-400 font-bold px-4 py-2 rounded-xl backdrop-blur-md border border-rose-500/30 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Quitter le Hub (la partie continue pour les autres)"
        >
          Quitter le Hub
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-base font-bold text-zinc-300">Chargement de {gameName.toUpperCase()}...</span>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center h-full text-center py-6">
          <p className="text-rose-500 font-bold mb-4 text-lg">⚠️ {error}</p>
          <button
            onClick={onExit}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 font-bold rounded-xl text-zinc-200 transition-all border border-zinc-700 cursor-pointer"
          >
            Retourner au Hub
          </button>
        </div>
      )}

      <div ref={mountRef} className="w-full h-full flex-1 overflow-auto" />
    </div>
  );
}
