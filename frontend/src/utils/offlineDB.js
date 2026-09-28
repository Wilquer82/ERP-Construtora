// IndexedDB utilitário para armazenamento offline de medições
const DB_NAME = 'ConstruERP';
const DB_VERSION = 1;
const STORE_NAME = 'medicoes_offline';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('obra', 'obra', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

export async function saveMedicaoOffline(medicao) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add({ ...medicao, synced: false, createdAt: Date.now() });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getMedicoesOffline() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getUnsyncedMedicoes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');
    const request = index.getAll(false);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function markMedicaoSynced(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const medicao = getReq.result;
      if (medicao) {
        medicao.synced = true;
        medicao.syncedAt = Date.now();
        const putReq = store.put(medicao);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearSyncedMedicoes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');
    const request = index.openCursor(true);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

export async function syncMedicoesOffline(api) {
  const medicoes = await getUnsyncedMedicoes();
  if (medicoes.length === 0) return { synced: 0, errors: [] };

  const payload = medicoes.map((m) => {
    const { id, synced, createdAt, syncedAt, ...rest } = m;
    return rest;
  });

  try {
    const response = await api.post('/medicoes/batch', { medicoes: payload });
    const { criadas, erros } = response.data;

    for (let i = 0; i < criadas.length; i++) {
      const originalId = medicoes[i].id;
      await markMedicaoSynced(originalId);
    }
    return { synced: criadas.length, errors: erros };
  } catch (err) {
    return { synced: 0, errors: [{ erro: err.message }] };
  }
}

// Verificar se está online
export function isOnline() {
  return navigator.onLine;
}

// Escutar mudanças de conectividade
export function onOnlineChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}