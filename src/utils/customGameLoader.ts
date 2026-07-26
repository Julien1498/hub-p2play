import { unzipSync } from 'fflate';

export interface CustomGameMeta {
  key: string;            // e.g. "custom-gab371-skull-and-roses"
  name: string;           // e.g. "Skull & Roses" or "gab371/skull-and-roses"
  repo: string;           // e.g. "gab371/skull-and-roses"
  version?: string;       // e.g. "v0.1.1" or "latest"
  desc?: string;
  hasPreConfig?: boolean;
  downloadUrl?: string;
  addedAt: number;
  isCustom: true;
}

export interface ExtractedBundle {
  jsCode: string;
  cssCode?: string | null;
  jsBlobUrl?: string;
  cssBlobUrl?: string | null;
}

const STORAGE_KEY = 'p2play_custom_games';
const DB_NAME = 'P2PlayCustomGamesDB';
const DB_STORE = 'bundles';

// --- IndexedDB Helper for Bundle Code Caching ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBundleToCache(key: string, bundle: { jsCode: string; cssCode?: string | null }): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(bundle, key);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  } catch (err) {
    console.warn('[customGameLoader] IndexedDB write failed:', err);
  }
}

export async function getBundleFromCache(key: string): Promise<{ jsCode: string; cssCode?: string | null } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    return await new Promise((res) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
  } catch (err) {
    console.warn('[customGameLoader] IndexedDB read failed:', err);
    return null;
  }
}

export async function removeBundleFromCache(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
  } catch (err) {
    console.warn('[customGameLoader] IndexedDB delete failed:', err);
  }
}

// --- LocalStorage Game Metadata Management ---

export function loadStoredCustomGames(): CustomGameMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load custom games from localStorage:', e);
    return [];
  }
}

export function saveCustomGameToStorage(game: CustomGameMeta): CustomGameMeta[] {
  const current = loadStoredCustomGames();
  const existingIdx = current.findIndex(g => g.key === game.key);
  if (existingIdx >= 0) {
    current[existingIdx] = game;
  } else {
    current.push(game);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save custom game to localStorage:', e);
  }
  return current;
}

export function removeCustomGameFromStorage(key: string): CustomGameMeta[] {
  const current = loadStoredCustomGames().filter(g => g.key !== key);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to remove custom game from localStorage:', e);
  }
  removeBundleFromCache(key);
  return current;
}

// --- GitHub URL Parsing ---

export function parseGithubUrl(input: string): { owner: string; repo: string; version?: string } {
  let clean = input.trim();
  clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '');
  clean = clean.replace(/\/$/, '');

  let version: string | undefined = undefined;

  // Handle release tag URL (e.g. owner/repo/releases/tag/v1.0.0)
  if (clean.includes('/releases/tag/')) {
    const parts = clean.split('/releases/tag/');
    const repoParts = parts[0].split('/');
    return { owner: repoParts[0], repo: repoParts[1], version: parts[1] };
  }

  // Handle @ version format (e.g. owner/repo@v1.0.0)
  if (clean.includes('@')) {
    const [repoPart, verPart] = clean.split('@');
    const parts = repoPart.split('/');
    return { owner: parts[0], repo: parts[1], version: verPart };
  }

  // Standard owner/repo format
  const parts = clean.split('/');
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }

  throw new Error('Format d\'URL GitHub invalide. Utilisez "owner/repo" ou "https://github.com/owner/repo".');
}

// --- In-Memory Blob URL Cache (Runtime) ---

const activeBlobUrls = new Map<string, { jsBlobUrl: string; cssBlobUrl?: string | null }>();

export function createBlobUrls(key: string, bundle: { jsCode: string; cssCode?: string | null }): { jsBlobUrl: string; cssBlobUrl?: string | null } {
  const existing = activeBlobUrls.get(key);
  if (existing) {
    return existing;
  }

  const jsBlob = new Blob([bundle.jsCode], { type: 'text/javascript' });
  const jsBlobUrl = URL.createObjectURL(jsBlob);

  let cssBlobUrl: string | null = null;
  if (bundle.cssCode) {
    const cssBlob = new Blob([bundle.cssCode], { type: 'text/css' });
    cssBlobUrl = URL.createObjectURL(cssBlob);
  }

  const res = { jsBlobUrl, cssBlobUrl };
  activeBlobUrls.set(key, res);
  return res;
}

// --- Proxy Fetch Helper ---

async function fetchViaProxy(url: string, acceptHeader: string = 'application/octet-stream'): Promise<Response> {
  const proxyUrl = `/api/github-proxy?url=${encodeURIComponent(url)}`;
  
  try {
    const res = await fetch(proxyUrl, {
      headers: { 'Accept': acceptHeader }
    });
    if (res.ok) return res;
  } catch (e) {
    console.warn('[customGameLoader] Local Vite server proxy failed, trying fallbacks...', e);
  }

  // Fallback 1: CORS proxy fallback
  try {
    const fallbackUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(fallbackUrl, {
      headers: { 'Accept': acceptHeader }
    });
    if (res.ok) return res;
  } catch (e) {
    console.warn('[customGameLoader] Fallback proxy 1 failed:', e);
  }

  // Fallback 2: Direct fetch (in case CORS is open)
  try {
    const res = await fetch(url, {
      headers: { 'Accept': acceptHeader }
    });
    if (res.ok) return res;
  } catch (e) {
    console.warn('[customGameLoader] Direct fetch failed:', e);
  }

  throw new Error(`Impossible de télécharger la ressource depuis ${url}`);
}

// --- Live GitHub Release Asset Fetcher & Unzipper ---

export async function fetchAndPrepareCustomGame(
  urlInput: string,
  onProgress?: (msg: string) => void
): Promise<{ meta: CustomGameMeta; bundle: ExtractedBundle }> {
  const { owner, repo, version: requestedVersion } = parseGithubUrl(urlInput);
  const repoSlug = `${owner}/${repo}`;
  const key = `custom-${owner.toLowerCase()}-${repo.toLowerCase()}`;

  onProgress?.('Verification du depot GitHub...');

  // Step 1: Resolve Release Metadata
  let downloadUrl = '';
  let releaseTag = requestedVersion || 'latest';
  let releaseTitle = repoSlug;

  try {
    onProgress?.('Recherche de la release GitHub...');
    const apiUrl = requestedVersion
      ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${requestedVersion}`
      : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

    const apiRes = await fetchViaProxy(apiUrl, 'application/vnd.github.v3+json');
    const releaseData = await apiRes.json();

    if (releaseData && releaseData.tag_name) {
      releaseTag = releaseData.tag_name;
      if (releaseData.name) releaseTitle = releaseData.name;
    }

    if (releaseData && Array.isArray(releaseData.assets) && releaseData.assets.length > 0) {
      const zipAsset = releaseData.assets.find((a: any) =>
        a.name && (a.name.toLowerCase() === 'dist.zip' || a.name.toLowerCase().endsWith('.zip'))
      );
      if (zipAsset) {
        downloadUrl = zipAsset.browser_download_url || `https://github.com/${owner}/${repo}/releases/download/${releaseTag}/${zipAsset.name}`;
      }
    }
  } catch (err) {
    console.warn('[customGameLoader] GitHub API resolution warning, using default release URL pattern:', err);
  }

  // Fallback URL pattern if downloadUrl is not found in assets
  if (!downloadUrl) {
    downloadUrl = `https://github.com/${owner}/${repo}/releases/download/${releaseTag}/dist.zip`;
  }

  // Step 2: Download dist.zip binary stream via proxy with Accept: application/octet-stream
  onProgress?.(`Telechargement du bundle (${releaseTag})...`);
  const zipRes = await fetchViaProxy(downloadUrl, 'application/octet-stream');
  const arrayBuffer = await zipRes.arrayBuffer();

  // Step 3: Unzip bundle in browser using fflate
  onProgress?.('Extraction du bundle dist.zip...');
  const unzipped = unzipSync(new Uint8Array(arrayBuffer));

  let jsCode: string | null = null;
  let cssCode: string | null = null;

  // Search unzipped files for index.js / main.js and style.css
  for (const filename of Object.keys(unzipped)) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.js') && (!jsCode || lower.endsWith('index.js') || lower.endsWith('dist/index.js'))) {
      jsCode = new TextDecoder('utf-8').decode(unzipped[filename]);
    }
    if (lower.endsWith('.css') && (!cssCode || lower.endsWith('style.css') || lower.endsWith('index.css') || lower.endsWith('dist/style.css'))) {
      cssCode = new TextDecoder('utf-8').decode(unzipped[filename]);
    }
  }

  if (!jsCode) {
    throw new Error(`Aucun fichier JavaScript (.js) trouvé dans ${downloadUrl}`);
  }

  onProgress?.('Sauvegarde du jeu dans le navigateur...');

  // Format clean display name (e.g. "Skull & Roses" or "gab371/skull-and-roses")
  let cleanName = releaseTitle;
  if (cleanName === repoSlug || cleanName === repo) {
    const formattedRepo = repo.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    cleanName = `🎮 ${formattedRepo}`;
  }

  const meta: CustomGameMeta = {
    key,
    name: cleanName,
    repo: repoSlug,
    version: releaseTag,
    desc: `Partie Live GitHub (${repoSlug})`,
    hasPreConfig: true,
    downloadUrl,
    addedAt: Date.now(),
    isCustom: true,
  };

  // Cache bundle code in IndexedDB
  await saveBundleToCache(key, { jsCode, cssCode });
  saveCustomGameToStorage(meta);

  // Generate Blob URLs
  const { jsBlobUrl, cssBlobUrl } = createBlobUrls(key, { jsCode, cssCode });

  return {
    meta,
    bundle: { jsCode, cssCode, jsBlobUrl, cssBlobUrl },
  };
}

// --- Load Bundle on Mount or Reload ---

export async function loadOrFetchCustomGame(meta: CustomGameMeta): Promise<{ jsBlobUrl: string; cssBlobUrl?: string | null }> {
  // 1. Try active in-memory blob URLs
  const active = activeBlobUrls.get(meta.key);
  if (active) return active;

  // 2. Try IndexedDB cache
  const cached = await getBundleFromCache(meta.key);
  if (cached && cached.jsCode) {
    return createBlobUrls(meta.key, cached);
  }

  // 3. Re-download if missing from cache
  const { bundle } = await fetchAndPrepareCustomGame(meta.repo);
  return { jsBlobUrl: bundle.jsBlobUrl!, cssBlobUrl: bundle.cssBlobUrl };
}
