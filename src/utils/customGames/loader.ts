import { unzipSync } from "fflate";
import { HUB_GAME_MANIFEST_FILENAME, defaultHubMountFnName } from "p2play-core";
import type { HubGameManifest } from "p2play-core";
import { customGameKey, parseGithubUrl } from "./keys";
import { fetchGithubResource } from "./fetchGithub";
import {
  createBlobUrls,
  getActiveBlobUrls,
  getBundleFromCache,
  saveBundleToCache,
} from "./bundleCache";
import { saveCustomGameToStorage } from "./storage";
import type { CustomGameMeta, ExtractedBundle } from "./types";

function pickZipEntry(
  files: Record<string, Uint8Array>,
  prefer: (lower: string) => boolean,
): { name: string; data: Uint8Array } | null {
  const entries = Object.keys(files)
    .filter((n) => !n.endsWith("/"))
    .map((name) => ({ name, lower: name.replace(/\\/g, "/").toLowerCase(), data: files[name] }));

  const preferred = entries.find((e) => prefer(e.lower));
  return preferred ? { name: preferred.name, data: preferred.data } : null;
}

function decodeUtf8(data: Uint8Array): string {
  return new TextDecoder("utf-8").decode(data);
}

function tryParseManifest(files: Record<string, Uint8Array>): HubGameManifest | null {
  const entry = pickZipEntry(
    files,
    (lower) => lower.endsWith(`/${HUB_GAME_MANIFEST_FILENAME}`) || lower === HUB_GAME_MANIFEST_FILENAME,
  );
  if (!entry) return null;
  try {
    const raw = JSON.parse(decodeUtf8(entry.data));
    if (!raw || typeof raw !== "object") return null;
    return raw as HubGameManifest;
  } catch {
    return null;
  }
}

function extractJsCss(files: Record<string, Uint8Array>): { jsCode: string; cssCode: string | null } {
  const jsEntry =
    pickZipEntry(files, (l) => l.endsWith("/index.js") || l === "index.js" || l.endsWith("/dist/index.js")) ||
    pickZipEntry(files, (l) => l.endsWith(".js") && !l.includes(".map"));

  if (!jsEntry) {
    throw new Error("Aucun fichier JavaScript (index.js) trouvé dans dist.zip");
  }

  const cssEntry =
    pickZipEntry(files, (l) => l.endsWith("/style.css") || l === "style.css" || l.endsWith("/dist/style.css")) ||
    pickZipEntry(files, (l) => l.endsWith(".css"));

  return {
    jsCode: decodeUtf8(jsEntry.data),
    cssCode: cssEntry ? decodeUtf8(cssEntry.data) : null,
  };
}

interface ReleaseInfo {
  tag: string;
  title: string;
  downloadUrl: string;
}

async function resolveRelease(
  owner: string,
  repo: string,
  requestedVersion?: string,
): Promise<ReleaseInfo> {
  const apiUrl = requestedVersion
    ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${requestedVersion}`
    : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const apiRes = await fetchGithubResource(apiUrl, "application/vnd.github+json");
  const releaseData = await apiRes.json();

  if (!releaseData?.tag_name) {
    throw new Error(`Release GitHub introuvable pour ${owner}/${repo}`);
  }

  const tag = releaseData.tag_name as string;
  const title = (releaseData.name as string) || `${owner}/${repo}`;
  let downloadUrl = "";

  if (Array.isArray(releaseData.assets)) {
    const zipAsset = releaseData.assets.find(
      (a: { name?: string; browser_download_url?: string }) =>
        a.name &&
        (a.name.toLowerCase() === "dist.zip" || a.name.toLowerCase().endsWith(".zip")),
    );
    if (zipAsset?.browser_download_url) {
      downloadUrl = zipAsset.browser_download_url;
    } else if (zipAsset?.name) {
      downloadUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/${zipAsset.name}`;
    }
  }

  if (!downloadUrl) {
    downloadUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}/dist.zip`;
  }

  return { tag, title, downloadUrl };
}

function buildMeta(
  key: string,
  repoSlug: string,
  release: ReleaseInfo,
  manifest: HubGameManifest | null,
): CustomGameMeta {
  const fallbackName = repoSlug.split("/")[1]?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || repoSlug;

  return {
    key,
    name: manifest?.name?.trim() || (release.title !== repoSlug ? release.title : fallbackName),
    emoji: manifest?.emoji,
    repo: repoSlug,
    version: release.tag,
    desc: manifest?.desc?.trim() || `Partie Live GitHub (${repoSlug})`,
    hasPreConfig: typeof manifest?.hasPreConfig === "boolean" ? manifest.hasPreConfig : true,
    mountFn: manifest?.mountFn?.trim() || undefined,
    shellBackground: manifest?.shellBackground?.trim() || undefined,
    avatars: manifest?.avatars,
    downloadUrl: release.downloadUrl,
    addedAt: Date.now(),
    isCustom: true,
  };
}

/** Resolve the window mount function name for a custom game (no window scanning). */
export function resolveCustomMountFnName(meta: CustomGameMeta): string {
  if (meta.mountFn?.trim()) return meta.mountFn.trim();
  // Prefer catalog-style key from hub-manifest when it was a short key (skull, royal…).
  // Otherwise derive from repo name without inventing ambiguous short aliases.
  const repoName = meta.repo.split("/")[1] || meta.key;
  const camel = repoName.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase());
  const fromRepo = `mount${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
  // Also accept defaultHubMountFnName for short builtin-like keys stored in manifest.key
  // when present via mountFn already handled above.
  return fromRepo || defaultHubMountFnName(meta.key);
}

export async function fetchAndPrepareCustomGame(
  urlInput: string,
  onProgress?: (msg: string) => void,
): Promise<{ meta: CustomGameMeta; bundle: ExtractedBundle }> {
  const { owner, repo, version: requestedVersion } = parseGithubUrl(urlInput);
  const repoSlug = `${owner}/${repo}`;
  const key = customGameKey(owner, repo);

  onProgress?.("Recherche de la release GitHub…");
  const release = await resolveRelease(owner, repo, requestedVersion);

  onProgress?.(`Téléchargement du bundle (${release.tag})…`);
  const zipRes = await fetchGithubResource(release.downloadUrl, "application/octet-stream");
  const arrayBuffer = await zipRes.arrayBuffer();

  onProgress?.("Extraction du bundle dist.zip…");
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(new Uint8Array(arrayBuffer));
  } catch {
    throw new Error("Impossible d'extraire dist.zip (fichier invalide ou corrompu).");
  }

  const manifest = tryParseManifest(unzipped);
  const { jsCode, cssCode } = extractJsCss(unzipped);
  const meta = buildMeta(key, repoSlug, release, manifest);

  onProgress?.("Sauvegarde du jeu dans le navigateur…");
  await saveBundleToCache(key, { jsCode, cssCode });
  saveCustomGameToStorage(meta);

  const { jsBlobUrl, cssBlobUrl } = createBlobUrls(key, { jsCode, cssCode });

  return {
    meta,
    bundle: { jsCode, cssCode, jsBlobUrl, cssBlobUrl },
  };
}

export async function loadOrFetchCustomGame(
  meta: CustomGameMeta,
): Promise<{ jsBlobUrl: string; cssBlobUrl?: string | null }> {
  const active = getActiveBlobUrls(meta.key);
  if (active) return active;

  const cached = await getBundleFromCache(meta.key);
  if (cached?.jsCode) {
    return createBlobUrls(meta.key, cached);
  }

  const { bundle } = await fetchAndPrepareCustomGame(meta.repo);
  return { jsBlobUrl: bundle.jsBlobUrl, cssBlobUrl: bundle.cssBlobUrl };
}
