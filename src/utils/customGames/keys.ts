import type { ParsedGithubRef } from "./types";

const KEY_PREFIX = "custom--";
const KEY_SEP = "--";

/** Build a reversible custom-game key that survives hyphenated owners/repos. */
export function customGameKey(owner: string, repo: string): string {
  return `${KEY_PREFIX}${owner.toLowerCase()}${KEY_SEP}${repo.toLowerCase()}`;
}

export function parseCustomGameKey(key: string): { owner: string; repo: string } | null {
  if (!key.startsWith(KEY_PREFIX)) return null;
  const rest = key.slice(KEY_PREFIX.length);
  const idx = rest.indexOf(KEY_SEP);
  if (idx <= 0 || idx === rest.length - KEY_SEP.length) return null;
  const owner = rest.slice(0, idx);
  const repo = rest.slice(idx + KEY_SEP.length);
  if (!owner || !repo || repo.includes(KEY_SEP)) return null;
  return { owner, repo };
}

export function isCustomGameKey(key: string): boolean {
  return parseCustomGameKey(key) !== null;
}

export function parseGithubUrl(input: string): ParsedGithubRef {
  let clean = input.trim();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
  clean = clean.replace(/\.git$/i, "");
  clean = clean.replace(/\/$/, "");

  if (clean.includes("/releases/tag/")) {
    const [repoPart, tag] = clean.split("/releases/tag/");
    const [owner, repo] = repoPart.split("/");
    if (!owner || !repo || !tag) {
      throw new Error('Format d\'URL GitHub invalide (releases/tag).');
    }
    return { owner, repo, version: tag };
  }

  if (clean.includes("@")) {
    const [repoPart, verPart] = clean.split("@");
    const [owner, repo] = repoPart.split("/");
    if (!owner || !repo || !verPart) {
      throw new Error('Format d\'URL GitHub invalide (owner/repo@version).');
    }
    return { owner, repo, version: verPart };
  }

  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }

  throw new Error(
    'Format d\'URL GitHub invalide. Utilisez "owner/repo" ou "https://github.com/owner/repo".',
  );
}
