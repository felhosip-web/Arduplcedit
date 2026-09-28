import * as Comlink from 'comlink';
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

export const projectIdbWorkerApi = {
  async migrateIfNeeded(payload: {
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
  },

  async loadAutosave(): Promise<ProjectData | null> {
    const lastAutosaveId = (await getMetaValueWorker<string>('lastAutosaveId')) || AUTOSAVE_ID;
    const record = await getProjectRecordWorker(lastAutosaveId);
    return record && record.data ? record.data : null;
  },

  async saveAutosave(record: StoredProjectRecord): Promise<void> {
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
  },

  async loadSlots(): Promise<LocalSlot[]> {
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
  },

  async saveSlot(slotIndex: number, projectData: ProjectData): Promise<LocalSlot> {
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
  },

  async clearSlot(slotIndex: number): Promise<void> {
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
  },

  async flushPendingAutosave(): Promise<void> {
    return Promise.resolve();
  }
};

export type ProjectIdbWorkerApi = typeof projectIdbWorkerApi;

Comlink.expose(projectIdbWorkerApi);
