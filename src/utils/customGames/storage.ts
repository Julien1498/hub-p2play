import type { CustomGameMeta } from "./types";
import { removeBundleFromCache } from "./bundleCache";

const STORAGE_KEY = "p2play_custom_games";

export function loadStoredCustomGames(): CustomGameMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is CustomGameMeta =>
        g &&
        typeof g === "object" &&
        g.isCustom === true &&
        typeof g.key === "string" &&
        typeof g.repo === "string",
    );
  } catch (e) {
    console.error("Failed to load custom games from localStorage:", e);
    return [];
  }
}

export function saveCustomGameToStorage(game: CustomGameMeta): CustomGameMeta[] {
  const current = loadStoredCustomGames();
  const existingIdx = current.findIndex((g) => g.key === game.key);
  if (existingIdx >= 0) {
    current[existingIdx] = game;
  } else {
    current.push(game);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save custom game to localStorage:", e);
  }
  return current;
}

export function mergeCustomGamesIntoStorage(games: CustomGameMeta[]): CustomGameMeta[] {
  let current = loadStoredCustomGames();
  for (const game of games) {
    current = saveCustomGameToStorage(game);
  }
  return current;
}

export function removeCustomGameFromStorage(key: string): CustomGameMeta[] {
  const current = loadStoredCustomGames().filter((g) => g.key !== key);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to remove custom game from localStorage:", e);
  }
  void removeBundleFromCache(key);
  return current;
}
