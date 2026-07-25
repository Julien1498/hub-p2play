export type HubPhase = 'HUB_LOBBY' | 'GAME_CONFIG' | 'GAME_RUNNING';

export interface HubState {
  selectedGame: string | null;
  activeGame: string | null;
  gameConfig: any | null;
  phase: HubPhase;
}

export interface GameActionMessage {
  type:
    | 'SELECT_GAME' | 'START_GAME' | 'RETURN_TO_HUB'
    | 'PLAYER_JOINED' | 'SYNC_LOBBY' | 'SYNC_HUB_STATE'
    | 'CHAT_MESSAGE';
  payload?: any;
  sender: string;
}
