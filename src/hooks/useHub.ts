import { useState, useEffect, useCallback } from "react";
import { globalHubPeer } from "../network/peerManager";
import type { GameActionMessage, HubState } from "../network/protocol";
import {
  loadStoredCustomGames,
  saveCustomGameToStorage,
  removeCustomGameFromStorage,
  type CustomGameMeta,
} from "../utils/customGameLoader";

export function useHub() {
  const [status, setStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ peerId: string; username: string; avatar: string }[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [enableVoice, setEnableVoice] = useState(true);
  const [customGames, setCustomGames] = useState<CustomGameMeta[]>(() => loadStoredCustomGames());

  const updateAvatar = useCallback((avatar: string) => {
    globalHubPeer.updateAvatar(avatar);
  }, []);

  const addCustomGameMeta = useCallback((meta: CustomGameMeta) => {
    const updated = saveCustomGameToStorage(meta);
    setCustomGames(updated);
    if (globalHubPeer.isHost) {
      globalHubPeer.setHubCustomGames(updated);
    }
  }, []);

  const removeCustomGame = useCallback((key: string) => {
    const updated = removeCustomGameFromStorage(key);
    setCustomGames(updated);
    if (selectedGame === key) setSelectedGame(null);
    if (activeGame === key) setActiveGame(null);
    if (globalHubPeer.isHost) {
      globalHubPeer.setHubCustomGames(updated);
    }
  }, [selectedGame, activeGame]);

  const broadcastGameSelection = useCallback((gameKey: string) => {
    setSelectedGame(gameKey);
    if (globalHubPeer.isHost) {
      globalHubPeer.setHubSelection(gameKey);
    } else {
      globalHubPeer.broadcast({ type: 'SELECT_GAME', payload: gameKey, sender: globalHubPeer.myPeerId || "" });
    }
  }, []);

  const launchGame = useCallback((phase: 'GAME_CONFIG' | 'GAME_RUNNING' = 'GAME_RUNNING') => {
    const game = globalHubPeer.selectedGame || selectedGame;
    if (!game) return;
    setActiveGame(game);
    if (globalHubPeer.isHost) {
      globalHubPeer.setHubActiveGame(game, phase);
    } else {
      globalHubPeer.broadcast({ type: 'START_GAME', payload: game, sender: globalHubPeer.myPeerId || "" });
    }
  }, [selectedGame]);

  const returnToHub = useCallback(() => {
    setActiveGame(null);
    setSelectedGame(null);
    setGameConfig(null);
    if (globalHubPeer.isHost) {
      globalHubPeer.resetHubState();
    } else {
      globalHubPeer.broadcast({ type: 'RETURN_TO_HUB', sender: globalHubPeer.myPeerId || "" });
    }
  }, []);

  const updateGameConfig = useCallback((config: any) => {
    setGameConfig(config);
    if (globalHubPeer.isHost) {
      globalHubPeer.setHubGameConfig(config);
    }
  }, []);

  useEffect(() => {
    globalHubPeer.onStatusChange = (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'CONNECTED') {
        setRoomId(globalHubPeer.hostPeerId);
        // Sync initial custom games if host
        if (globalHubPeer.isHost) {
          globalHubPeer.setHubCustomGames(customGames);
        }
      } else {
        setRoomId(null);
        setPlayers([]);
        setSelectedGame(null);
        setActiveGame(null);
        setGameConfig(null);
      }
    };

    globalHubPeer.onPlayersUpdate = () => {
      setPlayers([...globalHubPeer.lobbyPlayers]);
    };

    globalHubPeer.onHubStateUpdate = (state: HubState) => {
      setSelectedGame(state.selectedGame);
      setActiveGame(state.activeGame);
      setGameConfig(state.gameConfig);
      if (state.enableVoice !== undefined) setEnableVoice(state.enableVoice);

      // Merge custom games from host state if connected as guest and persist to localStorage
      if (Array.isArray(state.customGames)) {
        state.customGames.forEach((g) => saveCustomGameToStorage(g));
        setCustomGames(loadStoredCustomGames());
      }
    };


    globalHubPeer.onMessage = (sender, data: GameActionMessage) => {
      switch (data.type) {
        case 'SELECT_GAME':
          setSelectedGame(data.payload);
          break;
        case 'START_GAME':
          setActiveGame(data.payload);
          break;
        case 'RETURN_TO_HUB':
          setActiveGame(null);
          setSelectedGame(null);
          setGameConfig(null);
          break;
      }
    };

    return () => {
      globalHubPeer.onStatusChange = null;
      globalHubPeer.onPlayersUpdate = null;
      globalHubPeer.onHubStateUpdate = null;
      globalHubPeer.onMessage = null;
    };
  }, [customGames]);

  const createRoom = useCallback((roomName: string, username: string, avatar: string = "👑", voiceEnabled: boolean = true) => {
    setIsHost(true);
    setEnableVoice(voiceEnabled);
    globalHubPeer.customGames = customGames;
    globalHubPeer.initialize(true, roomName, username, avatar, voiceEnabled);
  }, [customGames]);

  const joinRoom = useCallback((roomName: string, username: string, avatar: string = "👑") => {
    setIsHost(false);
    globalHubPeer.initialize(false, roomName, username, avatar);
  }, []);

  const disconnect = useCallback(() => {
    globalHubPeer.disconnect();
    setIsHost(false);
    setActiveGame(null);
    setSelectedGame(null);
    setGameConfig(null);
  }, []);

  return {
    status,
    roomId,
    myPeerId: globalHubPeer.myPeerId,
    players,
    selectedGame,
    activeGame,
    gameConfig,
    customGames,
    hubPhase: globalHubPeer.phase,
    isHost,
    enableVoice,
    createRoom,
    joinRoom,
    updateAvatar,
    updateGameConfig,
    addCustomGameMeta,
    removeCustomGame,
    disconnect,
    broadcastGameSelection,
    launchGame,
    returnToHub,
    externalPeerManager: globalHubPeer
  };
}

