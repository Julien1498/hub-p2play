/**
 * GitHub resource fetch helpers.
 *
 * - api.github.com supports CORS → call directly from the browser.
 * - Release asset ZIPs usually do not → use the allowlisted Vite/preview proxy
 *   (same-origin `/api/github-proxy`) or optional `VITE_GITHUB_PROXY_URL`.
 * - No third-party CORS proxies (corsproxy.io, etc.).
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

function proxyCandidates(): string[] {
  const out: string[] = [];
  const envProxy = (import.meta.env.VITE_GITHUB_PROXY_URL as string | undefined)?.trim();
  if (envProxy) out.push(envProxy.replace(/\/$/, ""));
  // Same-origin middleware from vite-plugins/githubProxyPlugin (dev + preview).
  out.push("/api/github-proxy");
  return out;
}

async function fetchViaProxy(proxyBase: string, url: string, acceptHeader: string): Promise<Response | null> {
  const proxyUrl = `${proxyBase}?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxyUrl, { headers: { Accept: acceptHeader } });
    if (res.ok) return res;
    // 404 on static hosts without the middleware — try next candidate.
    if (res.status === 404 || res.status === 405) return null;
    console.warn(`[customGames] Proxy ${proxyBase} returned HTTP ${res.status}`);
  } catch {
    // Static production host without proxy — fall through.
  }
  return null;
}

/**
 * Fetch a GitHub URL. JSON API is tried direct first (CORS). Binary assets
 * prefer an allowlisted proxy when available.
 */
export async function fetchGithubResource(
  url: string,
  acceptHeader = "application/octet-stream",
): Promise<Response> {
  if (!isAllowedGithubUrl(url)) {
    throw new Error(`URL GitHub non autorisée: ${url}`);
  }

  const isApi = url.startsWith("https://api.github.com/");

  if (isApi) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: acceptHeader.includes("json") ? acceptHeader : "application/vnd.github+json",
        },
      });
      if (res.ok) return res;
    } catch (e) {
      console.warn("[customGames] Direct GitHub API fetch failed:", e);
    }
  }

  for (const base of proxyCandidates()) {
    const viaProxy = await fetchViaProxy(base, url, acceptHeader);
    if (viaProxy) return viaProxy;
  }

  try {
    const res = await fetch(url, { headers: { Accept: acceptHeader } });
    if (res.ok) return res;
  } catch (e) {
    console.warn("[customGames] Direct fetch failed:", e);
  }

  throw new Error(
    `Impossible de télécharger la ressource depuis ${url}. ` +
      "En production statique, configurez VITE_GITHUB_PROXY_URL vers un proxy allowlisté (GitHub uniquement).",
  );
}
