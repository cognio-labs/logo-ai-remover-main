/**
 * historyDb.ts — IndexedDB persistent storage for Bellix.us Project History
 *
 * Saves media blobs and generated lightweight WebP thumbnails in client-side IndexedDB.
 * Survives page reloads, tab closes, and avoids localStorage 5MB QuotaExceededError.
 */

const DB_NAME = "bellix_project_history_v1";
const DB_VERSION = 1;
const STORE_NAME = "media_blobs";

function openHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a media Blob (image or video) permanently in IndexedDB
 */
export async function saveMediaBlob(id: string, blob: Blob, mimeType?: string): Promise<void> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob,
        mimeType: mimeType || blob.type,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[historyDb] Failed to save media blob:", err);
  }
}

/**
 * Retrieve a stored media Blob by Job ID
 */
export async function getMediaBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result && req.result.blob instanceof Blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Delete a media blob from IndexedDB
 */
export async function deleteMediaBlob(id: string): Promise<void> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[historyDb] Failed to delete media blob:", err);
  }
}

/**
 * Clear all media blobs
 */
export async function clearAllMediaBlobs(): Promise<void> {
  try {
    const db = await openHistoryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[historyDb] Failed to clear all media blobs:", err);
  }
}

/**
 * Generates a lightweight, compact Base64 thumbnail data URL (< 15KB).
 * Can be safely stored in localStorage and user store without quota issues.
 */
export async function createThumbnailDataUrl(
  source: Blob | string,
  maxDimension = 360,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return resolve("");
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    let objectUrl = "";
    if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    } else {
      img.src = source;
    }

    img.onload = () => {
      try {
        if (objectUrl) URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve("");
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Try WebP first for ultra-compact size, fallback to PNG if transparency needed
        const webp = canvas.toDataURL("image/webp", quality);
        if (webp.startsWith("data:image/webp")) {
          return resolve(webp);
        }
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve("");
    };
  });
}
