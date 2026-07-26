/**
 * Shared allowlist for GitHub proxy (Node + browser-safe, no Vite imports).
 * Keep in sync with src/utils/customGames/fetchGithub.ts host rules.
 */
const ALLOWED_HOSTS = new Set([
  "api.github.com",
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
]);

export function isAllowedGithubUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}
