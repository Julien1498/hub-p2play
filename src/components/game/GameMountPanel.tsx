import { useState, useEffect, useRef } from "react";
import type { PeerManagerLike } from "p2play-core";
import {
  activateGameStyle,
  unloadAllGameStyles,
  GAME_SHELL_BACKGROUNDS,
} from "../../utils/gameStyles";
import {
  loadStoredCustomGames,
  loadOrFetchCustomGame,
} from "../../utils/customGameLoader";

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

function findMountFunction(gameName: string, repo?: string): ((container: HTMLElement, props: any) => any) | null {
  const win = window as any;

  // 1. Direct match (e.g. mountSkull, mountRoyal, mountSheriff, mountPool)
  const directKey = `mount${gameName.charAt(0).toUpperCase() + gameName.slice(1)}`;
  if (typeof win[directKey] === "function") return win[directKey];

  // 2. Repo-based match (e.g. gab371/skull-and-roses -> mountSkullAndRoses, mountSkull)
  if (repo) {
    const repoName = repo.split("/").pop() || "";
    const camelRepo = repoName.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
    const repoKey = `mount${camelRepo.charAt(0).toUpperCase() + camelRepo.slice(1)}`;
    if (typeof win[repoKey] === "function") return win[repoKey];

    const firstWord = repoName.split(/[-_]/)[0];
    const shortKey = `mount${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)}`;
    if (typeof win[shortKey] === "function") return win[shortKey];
  }

  // 3. Known generic mount entrypoints
  if (typeof win.p2playMount === "function") return win.p2playMount;
  if (typeof win.mountGame === "function") return win.mountGame;

  // 4. Any mount* function attached to window
  const allMountKeys = Object.keys(win).filter(
    (k) => k.startsWith("mount") && typeof win[k] === "function"
  );
  if (allMountKeys.length > 0) {
    return win[allMountKeys[allMountKeys.length - 1]];
  }

  return null;
}

export function GameMountPanel({ gameName, peerId, playerName, playerAvatar, externalPeerManager, isHost, lateJoin, gameConfig, hubPhase, onExit, onLeave }: GameMountPanelProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const customGames = loadStoredCustomGames();
  const customMeta = customGames.find((g) => g.key === gameName);
  const isCustom = Boolean(customMeta || gameName.startsWith("custom-"));

  const shellBackground =
    GAME_SHELL_BACKGROUNDS[gameName] ??
    (isCustom
      ? "radial-gradient(circle at center, #180e29 0%, #09090b 100%)"
      : "radial-gradient(circle at center, #09090b 0%, #09090b 100%)");

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let unmountGame: (() => void) | null = null;
    let cancelled = false;

    const loadGame = async () => {
      try {
        setLoading(true);
        setError(null);

        let scriptSrc = "";
        let repoSlug: string | undefined = undefined;

        let effectiveMeta = customMeta;
        if (isCustom && !effectiveMeta) {
          const rawKey = gameName.replace(/^custom-/, "");
          const parts = rawKey.split("-");
          const owner = parts[0] || "";
          const repoName = parts.slice(1).join("-") || "";
          const derivedRepo = `${owner}/${repoName}`;
          effectiveMeta = {
            key: gameName,
            name: derivedRepo,
            repo: derivedRepo,
            version: "latest",
            addedAt: Date.now(),
            isCustom: true,
          };
        }

        if (isCustom && effectiveMeta) {
          repoSlug = effectiveMeta.repo;
          const { jsBlobUrl, cssBlobUrl } = await loadOrFetchCustomGame(effectiveMeta);
          scriptSrc = jsBlobUrl;

          if (cssBlobUrl) {
            await activateGameStyle(gameName, cssBlobUrl);
          }
        } else {
          const rawBase = import.meta.env.BASE_URL || "./";
          const gameBasePath = rawBase.endsWith("/")
            ? `${rawBase}games/${gameName}/`
            : `${rawBase}/games/${gameName}/`;

          await activateGameStyle(gameName, `${gameBasePath}style.css`);
          scriptSrc = `${gameBasePath}index.js`;
        }

        if (cancelled) return;


        await new Promise<void>((resolve, reject) => {
          const existingScript = document.getElementById(`game-script-${gameName}`);
          if (existingScript) existingScript.remove();

          script = document.createElement("script");
          script.id = `game-script-${gameName}`;
          script.type = "module";
          script.src = scriptSrc;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Échec du chargement du script du jeu "${gameName}"`));
          document.head.appendChild(script);
        });

        if (cancelled) return;

        const mountFn = findMountFunction(gameName, repoSlug || customMeta?.repo);

        if (typeof mountFn !== "function") {
          throw new Error(`Fonction de montage introuvable sur window pour "${gameName}".`);
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
