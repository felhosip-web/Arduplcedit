import { ProjectData } from '../types';
import {
  DB_NAME,
  DB_VERSION,
  STORE_PROJECTS,
  STORE_META,
  AUTOSAVE_ID,
  StoredProjectRecord,
  LocalSlot,
  buildPersistableProject
} from './projectIdb';

export type WorkerRequest =
  | {
      id: number;
      type: 'MIGRATE_IF_NEEDED';
      payload: { rawAutosave: string | null; rawSlots: string | null; isMigratedLocal: boolean };
    }
  | { id: number; type: 'LOAD_AUTOSAVE' }
  | { id: number; type: 'SAVE_AUTOSAVE'; payload: { record: StoredProjectRecord } }
  | { id: number; type: 'LOAD_SLOTS' }
  | { id: number; type: 'SAVE_SLOT'; payload: { slotIndex: number; projectData: ProjectData } }
  | { id: number; type: 'CLEAR_SLOT'; payload: { slotIndex: number } }
  | { id: number; type: 'FLUSH' };

export type WorkerResponse =
  | { id: number; type: 'MIGRATE_IF_NEEDED'; success: true; payload: { setMigratedLocal: boolean } }
  | { id: number; type: 'LOAD_AUTOSAVE'; success: true; payload: ProjectData | null }
  | { id: number; type: 'SAVE_AUTOSAVE'; success: true }
  | { id: number; type: 'LOAD_SLOTS'; success: true; payload: LocalSlot[] }
  | { id: number; type: 'SAVE_SLOT'; success: true; payload: LocalSlot }
  | { id: number; type: 'CLEAR_SLOT'; success: true }
  | { id: number; type: 'FLUSH'; success: true }
  | { id: number; type: string; success: false; error: string };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDbWorker(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nem érhető el a Web Worker-ben.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Worker IndexedDB megnyitási hiba:', request.error);
      dbPromise = null;
      reject(request.error || new Error('Nem sikerült megnyitni az IndexedDB-t a worker-ben.'));
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };

      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
  });

  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

async function getMetaValueWorker<T = any>(key: string): Promise<T | null> {
  const db = await openDbWorker();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

async function getProjectRecordWorker(id: string): Promise<StoredProjectRecord | null> {
  const db = await openDbWorker();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

async function handleMigrateIfNeeded(payload: {
  rawAutosave: string | null;
  rawSlots: string | null;
  isMigratedLocal: boolean;
}): Promise<{ setMigratedLocal: boolean }> {
  const isMigratedIdb = await getMetaValueWorker<boolean>('migratedFromLocalStorage');
  if (payload.isMigratedLocal || isMigratedIdb) {
    return { setMigratedLocal: false };
  }

  const db = await openDbWorker();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_META], 'readwrite');
    const projectsStore = tx.objectStore(STORE_PROJECTS);
    const metaStore = tx.objectStore(STORE_META);

    if (payload.rawAutosave) {
      try {
        const parsedData = JSON.parse(payload.rawAutosave);
        if (parsedData) {
          const sanitized = buildPersistableProject(parsedData);
          const autosaveRecord: StoredProjectRecord = {
            id: AUTOSAVE_ID,
            name: sanitized.name || 'Arduino_PLC_Autosave',
            updatedAt: Date.now(),
            schemaVersion: sanitized.version || '3.5',
            data: sanitized
          };
          projectsStore.put(autosaveRecord);
          metaStore.put({ key: 'lastAutosaveId', value: AUTOSAVE_ID });
        }
      } catch (e) {
        console.error('Worker: localStorage autosave parse hiba:', e);
      }
    }

    if (payload.rawSlots) {
      try {
        const parsedSlots = JSON.parse(payload.rawSlots);
        if (Array.isArray(parsedSlots)) {
          for (const slotItem of parsedSlots) {
            if (slotItem && slotItem.slotIndex && slotItem.data) {
              const slotId = `slot_${slotItem.slotIndex}`;
              const sanitized = buildPersistableProject(slotItem.data);
              const slotRecord: StoredProjectRecord = {
                id: slotId,
                name: slotItem.name || sanitized.name || `Projekt ${slotItem.slotIndex}`,
                updatedAt: slotItem.savedAt ? new Date(slotItem.savedAt).getTime() : Date.now(),
                schemaVersion: sanitized.version || '3.5',
                data: sanitized
              };
              projectsStore.put(slotRecord);
            }
          }
        }
      } catch (e) {
        console.error('Worker: localStorage slots parse hiba:', e);
      }
    }

    metaStore.put({ key: 'migratedFromLocalStorage', value: true });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });

  return { setMigratedLocal: true };
}

async function handleLoadAutosave(): Promise<ProjectData | null> {
  const lastAutosaveId = (await getMetaValueWorker<string>('lastAutosaveId')) || AUTOSAVE_ID;
  const record = await getProjectRecordWorker(lastAutosaveId);
  return record && record.data ? record.data : null;
}

async function handleSaveAutosave(record: StoredProjectRecord): Promise<void> {
  const db = await openDbWorker();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_META], 'readwrite');
    const projectsStore = tx.objectStore(STORE_PROJECTS);
    const metaStore = tx.objectStore(STORE_META);

    projectsStore.put(record);
    metaStore.put({ key: 'lastAutosaveId', value: record.id });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

async function handleLoadSlots(): Promise<LocalSlot[]> {
  const defaultSlots: LocalSlot[] = [
    { slotIndex: 1, data: null },
    { slotIndex: 2, data: null },
    { slotIndex: 3, data: null },
    { slotIndex: 4, data: null },
    { slotIndex: 5, data: null }
  ];

  const db = await openDbWorker();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const resultSlots: LocalSlot[] = [...defaultSlots];

    for (let i = 1; i <= 5; i++) {
      const slotId = `slot_${i}`;
      const request = store.get(slotId);
      request.onsuccess = () => {
        const record = request.result as StoredProjectRecord | undefined;
        if (record && record.data) {
          resultSlots[i - 1] = {
            slotIndex: i,
            data: record.data,
            name: record.name || record.data.name || `Projekt ${i}`,
            savedAt: new Date(record.updatedAt).toLocaleString('hu-HU')
          };
        }
      };
    }

    tx.oncomplete = () => resolve(resultSlots);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

async function handleSaveSlot(slotIndex: number, projectData: ProjectData): Promise<LocalSlot> {
  const slotId = `slot_${slotIndex}`;
  const now = Date.now();
  const sanitizedData = buildPersistableProject(projectData);
  const name = sanitizedData.metadata?.name || sanitizedData.name || `Projekt ${slotIndex}`;

  const record: StoredProjectRecord = {
    id: slotId,
    name,
    updatedAt: now,
    schemaVersion: sanitizedData.version || '3.5',
    data: sanitizedData
  };

  const db = await openDbWorker();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });

  return {
    slotIndex,
    data: sanitizedData,
    name,
    savedAt: new Date(now).toLocaleString('hu-HU')
  };
}

async function handleClearSlot(slotIndex: number): Promise<void> {
  const slotId = `slot_${slotIndex}`;
  const db = await openDbWorker();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(slotId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (!req || typeof req.id !== 'number') return;

  const reqId = req.id;
  const reqType = req.type;

  try {
    switch (req.type) {
      case 'MIGRATE_IF_NEEDED': {
        const payload = await handleMigrateIfNeeded(req.payload);
        self.postMessage({ id: reqId, type: reqType, success: true, payload });
        break;
      }
      case 'LOAD_AUTOSAVE': {
        const payload = await handleLoadAutosave();
        self.postMessage({ id: reqId, type: reqType, success: true, payload });
        break;
      }
      case 'SAVE_AUTOSAVE': {
        await handleSaveAutosave(req.payload.record);
        self.postMessage({ id: reqId, type: reqType, success: true });
        break;
      }
      case 'LOAD_SLOTS': {
        const payload = await handleLoadSlots();
        self.postMessage({ id: reqId, type: reqType, success: true, payload });
        break;
      }
      case 'SAVE_SLOT': {
        const payload = await handleSaveSlot(req.payload.slotIndex, req.payload.projectData);
        self.postMessage({ id: reqId, type: reqType, success: true, payload });
        break;
      }
      case 'CLEAR_SLOT': {
        await handleClearSlot(req.payload.slotIndex);
        self.postMessage({ id: reqId, type: reqType, success: true });
        break;
      }
      case 'FLUSH': {
        self.postMessage({ id: reqId, type: reqType, success: true });
        break;
      }
      default: {
        self.postMessage({
          id: reqId,
          type: reqType,
          success: false,
          error: 'Ismeretlen üzenettípus'
        });
      }
    }
  } catch (err: any) {
    console.error(`Worker hiba [${reqType}]:`, err);
    self.postMessage({
      id: reqId,
      type: reqType,
      success: false,
      error: err?.message || 'Hiba történt a háttérművelet során.'
    });
  }
};
