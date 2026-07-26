const DB_NAME = "P2PlayCustomGamesDB";
const DB_STORE = "bundles";

export interface CachedBundle {
  jsCode: string;
  cssCode?: string | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export async function saveBundleToCache(key: string, bundle: CachedBundle): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(bundle, key);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error ?? new Error("IndexedDB write failed"));
    });
  } catch (err) {
    console.warn("[customGames] IndexedDB write failed:", err);
  }
}

export async function getBundleFromCache(key: string): Promise<CachedBundle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    return await new Promise((res) => {
      req.onsuccess = () => res((req.result as CachedBundle) || null);
      req.onerror = () => res(null);
    });
  } catch (err) {
    console.warn("[customGames] IndexedDB read failed:", err);
    return null;
  }
}

export async function removeBundleFromCache(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
  } catch (err) {
    console.warn("[customGames] IndexedDB delete failed:", err);
  }
}

const activeBlobUrls = new Map<string, { jsBlobUrl: string; cssBlobUrl?: string | null }>();

export function getActiveBlobUrls(key: string) {
  return activeBlobUrls.get(key);
}

export function createBlobUrls(
  key: string,
  bundle: CachedBundle,
): { jsBlobUrl: string; cssBlobUrl?: string | null } {
  const existing = activeBlobUrls.get(key);
  if (existing) return existing;

  const jsBlobUrl = URL.createObjectURL(new Blob([bundle.jsCode], { type: "text/javascript" }));
  let cssBlobUrl: string | null = null;
  if (bundle.cssCode) {
    cssBlobUrl = URL.createObjectURL(new Blob([bundle.cssCode], { type: "text/css" }));
  }

  const res = { jsBlobUrl, cssBlobUrl };
  activeBlobUrls.set(key, res);
  return res;
}

export function revokeBlobUrls(key: string): void {
  const existing = activeBlobUrls.get(key);
  if (!existing) return;
  URL.revokeObjectURL(existing.jsBlobUrl);
  if (existing.cssBlobUrl) URL.revokeObjectURL(existing.cssBlobUrl);
  activeBlobUrls.delete(key);
}
