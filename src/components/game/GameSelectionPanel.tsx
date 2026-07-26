import { Plus, Sparkles, Trash2 } from "lucide-react";

export interface SelectableHubGame {
  key: string;
  label: string;
  desc: string;
  hasPreConfig: boolean;
  isCustom: boolean;
}

interface GameSelectionPanelProps {
  games: SelectableHubGame[];
  selectedGame: string | null;
  isHost: boolean;
  catalogLoading: boolean;
  catalogError: string | null;
  onSelect: (key: string) => void;
  onLaunch: () => void;
  onAddClick: () => void;
  onRemoveCustom: (key: string) => void;
}

export function GameSelectionPanel({
  games,
  selectedGame,
  isHost,
  catalogLoading,
  catalogError,
  onSelect,
  onLaunch,
  onAddClick,
  onRemoveCustom,
}: GameSelectionPanelProps) {
  return (
    <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-3xl shadow-xl space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-200">🎮 Sélectionner un jeu</h2>
          <p className="text-xs text-zinc-400">
            {isHost
              ? "Choisissez le jeu de votre partie ou ajoutez un dépôt GitHub Live"
              : "En attente du choix de l'hôte..."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isHost && (
            <button
              type="button"
              onClick={onAddClick}
              className="px-3.5 py-2 bg-zinc-850 hover:bg-zinc-800 text-violet-300 border border-zinc-750 hover:border-violet-500/50 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-violet-400" />
              <span>Ajouter un jeu</span>
            </button>
          )}

          {isHost && selectedGame && (
            <button
              type="button"
              onClick={onLaunch}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 font-bold rounded-xl text-white transition-all shadow-lg shadow-violet-900/30"
            >
              Lancer la partie
            </button>
          )}
        </div>
      </div>

      {catalogError && (
        <p className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-xl px-3 py-2">
          {catalogError}
        </p>
      )}

      {catalogLoading ? (
        <p className="text-sm text-zinc-500">Chargement du catalogue de jeux…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g) => (
            <div key={g.key} className="relative">
              <button
                type="button"
                onClick={() => isHost && onSelect(g.key)}
                disabled={!isHost}
                className={`w-full p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 min-h-[9rem] ${
                  selectedGame === g.key
                    ? "bg-violet-950/20 border-violet-500 ring-2 ring-violet-500"
                    : "bg-zinc-950/50 border-zinc-850 hover:bg-zinc-900/30"
                } ${!isHost ? "cursor-not-allowed" : ""}`}
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-zinc-200">{g.label}</h3>
                    {g.isCustom && (
                      <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{g.desc}</p>
                </div>
              </button>

              {g.isCustom && isHost && (
                <button
                  type="button"
                  onClick={() => onRemoveCustom(g.key)}
                  className="absolute bottom-3 right-3 text-zinc-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
                  title="Supprimer ce jeu custom"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
