const DB_NAME = "emotune-sticker-studio";
const DB_VERSION = 1;
const ASSETS_STORE = "assets";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(ASSETS_STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open Sticker Studio storage"));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

export async function putAsset(id, blob) {
  const db = await openDb();
  try { await requestResult(db.transaction(ASSETS_STORE, "readwrite").objectStore(ASSETS_STORE).put({ id, blob })); return id; }
  finally { db.close(); }
}

export async function getAsset(id) {
  const db = await openDb();
  try { return await requestResult(db.transaction(ASSETS_STORE, "readonly").objectStore(ASSETS_STORE).get(id)); }
  finally { db.close(); }
}

export async function deleteAsset(id) {
  const db = await openDb();
  try { await requestResult(db.transaction(ASSETS_STORE, "readwrite").objectStore(ASSETS_STORE).delete(id)); }
  finally { db.close(); }
}

export async function saveProjectWithAssets(project, serialize) {
  const copy = JSON.parse(serialize(project));
  for (const object of project.objects || []) {
    if (object.type !== "image" || !object.file || !object.id) continue;
    const assetId = object.assetId || `asset-${object.id}`;
    await putAsset(assetId, object.file);
    const target = copy.objects.find((entry) => entry.id === object.id);
    if (target) { target.assetId = assetId; target.sourceType = "indexeddb"; target.src = undefined; target.assetUnavailable = false; }
  }
  return JSON.stringify(copy);
}

export async function restoreProjectAssets(project, registerUrl) {
  const restored = { ...project, objects: [...(project.objects || [])] };
  for (const object of restored.objects) {
    if (object.type !== "image" || !object.assetId || object.sourceType !== "indexeddb") continue;
    const record = await getAsset(object.assetId);
    if (!record?.blob) { object.assetUnavailable = true; continue; }
    const file = new File([record.blob], `${object.name || object.id}.png`, { type: record.blob.type || "image/png" });
    object.file = file; object.src = registerUrl(URL.createObjectURL(file)); object.assetUnavailable = false;
  }
  return restored;
}
