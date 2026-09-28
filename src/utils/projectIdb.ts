import * as Comlink from 'comlink';
import { ProjectData } from '../types';
import toast from 'react-hot-toast';
import type { ProjectIdbWorkerApi } from './projectIdb.worker';

export const DB_NAME = 'arduplc_db';
export const DB_VERSION = 1;
export const STORE_PROJECTS = 'projects';
export const STORE_META = 'meta';

export const LOCAL_AUTOSAVE_KEY = 'arduino_plc_ladder_project_v3';
export const LOCAL_SLOTS_KEY = 'arduino_plc_saved_slots_v1';
export const LOCAL_MIGRATED_KEY = 'arduplc_idb_migrated';

export const AUTOSAVE_ID = 'autosave';

export interface StoredProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  schemaVersion: string;
  data: ProjectData;
}

export interface LocalSlot {
  slotIndex: number;
  data: ProjectData | null;
  savedAt?: string;
  name?: string;
}

/**
 * Sanitizes and extracts strictly persistable ProjectData fields off the critical path,
 * excluding transient UI, action logs, or simulation runtime states.
 */
export function buildPersistableProject(input: Partial<ProjectData>): ProjectData {
  return {
    version: input.version || '3.5',
    name: input.name || input.metadata?.name || 'Arduino_PLC_Program',
    metadata: input.metadata,
    lastModified: input.lastModified || Date.now(),
    rungs: input.rungs || [],
    setupRungs: input.setupRungs || [],
    subroutines: input.subroutines || [],
    customModules: input.customModules || [],
    libraries: input.libraries || [],
    constants: input.constants || [],
    variables: input.variables || [],
    arrays: input.arrays || [],
    protocols: input.protocols || ({} as any),
    interrupts: input.interrupts || ({} as any),
    tasks: input.tasks || [],
    stateMachines: input.stateMachines || [],
    customMacros: input.customMacros || []
  };
}

// ============================================================================
// Direct In-Page IndexedDB Fallback Implementation
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDbDirect(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('Az IndexedDB nem támogatott ebben a böngészőben.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB megnyitási hiba:', request.error);
      dbPromise = null;
      reject(request.error || new Error('Nem sikerült megnyitni az IndexedDB adatbázist.'));
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

export async function getMetaValueDirect<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDbDirect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch (err) {
    console.warn(`getMetaValueDirect hiba (${key}):`, err);
    return null;
  }
}

export async function getProjectRecordDirect(id: string): Promise<StoredProjectRecord | null> {
  try {
    const db = await openDbDirect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } catch (err) {
    console.warn(`getProjectRecordDirect hiba (${id}):`, err);
    return null;
  }
}

export async function saveAutosaveRecordInDbDirect(record: StoredProjectRecord): Promise<void> {
  const db = await openDbDirect();
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

export async function saveProjectRecordDirect(record: StoredProjectRecord): Promise<void> {
  const db = await openDbDirect();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

export async function deleteProjectRecordDirect(id: string): Promise<void> {
  const db = await openDbDirect();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

export async function migrateFromLocalStorageDirect(): Promise<void> {
  try {
    const isMigratedLocal = localStorage.getItem(LOCAL_MIGRATED_KEY) === '1';
    const isMigratedIdb = await getMetaValueDirect<boolean>('migratedFromLocalStorage');

    if (isMigratedLocal || isMigratedIdb) {
      return;
    }

    const db = await openDbDirect();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_PROJECTS, STORE_META], 'readwrite');
      const projectsStore = tx.objectStore(STORE_PROJECTS);
      const metaStore = tx.objectStore(STORE_META);

      const rawAutosave = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
      if (rawAutosave) {
        try {
          const parsedData = JSON.parse(rawAutosave);
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
          console.error('Hiba a localStorage autosave konvertálásakor:', e);
        }
      }

      const rawSlots = localStorage.getItem(LOCAL_SLOTS_KEY);
      if (rawSlots) {
        try {
          const parsedSlots = JSON.parse(rawSlots);
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
          console.error('Hiba a localStorage slotok konvertálásakor:', e);
        }
      }

      metaStore.put({ key: 'migratedFromLocalStorage', value: true });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });

    localStorage.setItem(LOCAL_MIGRATED_KEY, '1');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

// ============================================================================
// Comlink Web Worker Proxy Interface
// ============================================================================

let workerProxy: Comlink.Remote<ProjectIdbWorkerApi> | null = null;
let workerFailed = false;

function getWorkerProxy(): Comlink.Remote<ProjectIdbWorkerApi> | null {
  if (workerFailed) return null;
  if (workerProxy) return workerProxy;

  try {
    if (typeof window !== 'undefined' && typeof window.Worker !== 'undefined') {
      const rawWorker = new Worker(new URL('./projectIdb.worker.ts', import.meta.url), {
        type: 'module'
      });

      rawWorker.onerror = (err) => {
        console.warn('ProjectIdb Worker hiba történt, áttérés a főszálra:', err);
        workerFailed = true;
        workerProxy = null;
      };

      workerProxy = Comlink.wrap<ProjectIdbWorkerApi>(rawWorker);
      return workerProxy;
    }
  } catch (e) {
    console.warn('Nem sikerült elindítani az IndexedDB Web Worker-t Comlink-kel, főszál használata:', e);
    workerFailed = true;
    workerProxy = null;
  }

  return null;
}

/**
 * Migration trigger using Comlink Worker if available, with in-page direct fallback.
 */
export async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  const proxy = getWorkerProxy();
  if (proxy) {
    try {
      const isMigratedLocal = localStorage.getItem(LOCAL_MIGRATED_KEY) === '1';
      const rawAutosave = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
      const rawSlots = localStorage.getItem(LOCAL_SLOTS_KEY);

      const result = await proxy.migrateIfNeeded({ rawAutosave, rawSlots, isMigratedLocal });
      if (result && result.setMigratedLocal) {
        localStorage.setItem(LOCAL_MIGRATED_KEY, '1');
      }
      return;
    } catch (err) {
      console.warn('Comlink migrateIfNeeded failed, falling back to direct IDB:', err);
    }
  }

  await migrateFromLocalStorageDirect();
}

/**
 * Load autosave project using Comlink Worker, falling back to direct IDB / localStorage.
 */
export async function loadAutosaveProject(): Promise<ProjectData | null> {
  await migrateFromLocalStorageIfNeeded();

  const proxy = getWorkerProxy();
  if (proxy) {
    try {
      const data = await proxy.loadAutosave();
      if (data) return data;
    } catch (err) {
      console.warn('Comlink loadAutosave failed, falling back to direct IDB:', err);
    }
  }

  try {
    const lastAutosaveId = (await getMetaValueDirect<string>('lastAutosaveId')) || AUTOSAVE_ID;
    const record = await getProjectRecordDirect(lastAutosaveId);
    if (record && record.data) {
      return record.data;
    }
  } catch (e) {
    console.warn('Direct IDB loadAutosave error:', e);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('LocalStorage fallback error on loadAutosave:', e);
  }
  return null;
}

let autosaveTimeoutId: ReturnType<typeof setTimeout> | null = null;
let pendingAutosaveData: ProjectData | null = null;

export function saveAutosaveProjectDebounced(data: ProjectData, delayMs: number = 400): void {
  pendingAutosaveData = buildPersistableProject(data);

  if (autosaveTimeoutId !== null) {
    clearTimeout(autosaveTimeoutId);
  }

  autosaveTimeoutId = setTimeout(async () => {
    await executePendingAutosave();
  }, delayMs);
}

async function executePendingAutosave(): Promise<void> {
  if (!pendingAutosaveData) return;

  const dataToSave = pendingAutosaveData;
  pendingAutosaveData = null;
  if (autosaveTimeoutId !== null) {
    clearTimeout(autosaveTimeoutId);
    autosaveTimeoutId = null;
  }

  const record: StoredProjectRecord = {
    id: AUTOSAVE_ID,
    name: dataToSave.name || dataToSave.metadata?.name || 'Arduino_PLC_Program',
    updatedAt: Date.now(),
    schemaVersion: dataToSave.version || '3.5',
    data: dataToSave
  };

  const proxy = getWorkerProxy();
  if (proxy) {
    try {
      await proxy.saveAutosave(record);
      return;
    } catch (workerErr) {
      console.warn('Comlink saveAutosave failed, falling back to direct IDB:', workerErr);
    }
  }

  // Fallback to direct IDB / localStorage
  try {
    await saveAutosaveRecordInDbDirect(record);
  } catch (dbErr) {
    console.error('IndexedDB autosave failed, mirroring to localStorage as fallback:', dbErr);
    try {
      localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(dataToSave));
    } catch (lsErr) {
      console.error('LocalStorage save failed:', lsErr);
      toast.error('Adatbázis hiba történt az automatikus mentéskor! (IndexedDB)');
    }
  }
}

/**
 * Immediately flushes any pending debounced autosave.
 */
export async function flushPendingAutosave(): Promise<void> {
  if (pendingAutosaveData) {
    await executePendingAutosave();
  } else {
    const proxy = getWorkerProxy();
    if (proxy) {
      try {
        await proxy.flushPendingAutosave();
      } catch (e) {
        // ignore
      }
    }
  }
}

/**
 * Loads slots via Comlink Worker or direct IDB / localStorage fallback.
 */
export async function loadSlotsFromDb(): Promise<LocalSlot[]> {
  await migrateFromLocalStorageIfNeeded();

  const proxy = getWorkerProxy();
  if (proxy) {
    try {
      const slots = await proxy.loadSlots();
      if (slots) return slots;
    } catch (err) {
      console.warn('Comlink loadSlots failed, falling back to direct IDB:', err);
    }
  }

  const defaultSlots: LocalSlot[] = [
    { slotIndex: 1, data: null },
    { slotIndex: 2, data: null },
    { slotIndex: 3, data: null },
    { slotIndex: 4, data: null },
    { slotIndex: 5, data: null }
  ];

  try {
    const db = await openDbDirect();
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
  } catch (err) {
    console.warn('Direct IDB slots loading failed, falling back to localStorage:', err);
    try {
      const raw = localStorage.getItem(LOCAL_SLOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('LocalStorage slot fallback failed:', e);
    }
    return defaultSlots;
  }
}

/**
 * Saves a slot via Comlink Worker or direct IDB / localStorage fallback.
 */
export async function saveSlotToDb(slotIndex: number, projectData: ProjectData): Promise<LocalSlot> {
  const sanitizedData = buildPersistableProject(projectData);
  const now = Date.now();
  const name = sanitizedData.metadata?.name || sanitizedData.name || `Projekt ${slotIndex}`;

  const proxy = getWorkerProxy();
  if (proxy) {
    try {
      const slot = await proxy.saveSlot(slotIndex, sanitizedData);
      if (slot) return slot;
    } catch (workerErr) {
      console.warn('Comlink saveSlot failed, falling back to direct IDB:', workerErr);
    }
  }

  const slotId = `slot_${slotIndex}`;
  const record: StoredProjectRecord = {
    id: slotId,
    name,
    updatedAt: now,
    schemaVersion: sanitizedData.version || '3.5',
    data: sanitizedData
  };

  try {
    await saveProjectRecordDirect(record);
    return {
      slotIndex,
      data: sanitizedData,
      name,
      savedAt: new Date(now).toLocaleString('hu-HU')
    };
  } catch (dbErr) {
    console.warn('Direct IDB slot save failed, fallback to localStorage:', dbErr);
    toast.error('Adatbázis hiba történt a rekesz mentésekor! (IndexedDB)');
    try {
      const currentSlots = await loadSlotsFromDb();
      const updatedSlots = currentSlots.map((s) =>
        s.slotIndex === slotIndex
          ? {
              slotIndex,
              data: sanitizedData,
              name,
              savedAt: new Date(now).toLocaleString('hu-HU')
            }
          : s
      );
      localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(updatedSlots));
    } catch (e) {
      console.error('LocalStorage fallback error on slot save:', e);
    }
  }

  return {
    slotIndex,
    data: sanitizedData,
    name,
    savedAt: new Date(now).toLocaleString('hu-HU')
  };
}

/**
 * Clears a slot via Comlink Worker or direct IDB / localStorage fallback.
 */
export async function clearSlotInDb(slotIndex: number): Promise<void> {
  const proxy = getWorkerProxy();
  if (proxy) {
    try {
      await proxy.clearSlot(slotIndex);
      return;
    } catch (workerErr) {
      console.warn('Comlink clearSlot failed, falling back to direct IDB:', workerErr);
    }
  }

  const slotId = `slot_${slotIndex}`;
  try {
    await deleteProjectRecordDirect(slotId);
    return;
  } catch (dbErr) {
    console.warn('Direct IDB slot clear failed, falling back to localStorage:', dbErr);
    try {
      const raw = localStorage.getItem(LOCAL_SLOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((s: any) =>
            s.slotIndex === slotIndex ? { slotIndex, data: null } : s
          );
          localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.error('LocalStorage slot clear fallback failed:', e);
    }
  }
}
