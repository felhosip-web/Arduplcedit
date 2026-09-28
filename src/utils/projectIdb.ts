import { ProjectData } from '../types';
import toast from 'react-hot-toast';

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

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('Az IndexedDB nem támogatott ebben a böngészőben.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB megnyitási hiba:', request.error);
      reject(request.error || new Error('Nem sikerült megnyitni az IndexedDB adatbázist.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
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

export async function getMetaValue<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`getMetaValue hiba (${key}):`, err);
    return null;
  }
}

export async function setMetaValue(key: string, value: any): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`setMetaValue hiba (${key}):`, err);
  }
}

export async function getProjectRecord(id: string): Promise<StoredProjectRecord | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`getProjectRecord hiba (${id}):`, err);
    return null;
  }
}

export async function saveProjectRecord(record: StoredProjectRecord): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`saveProjectRecord hiba (${record.id}):`, err);
    toast.error('Adatbázis hiba történt a projekt mentésekor! (IndexedDB)');
    throw err;
  }
}

export async function deleteProjectRecord(id: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`deleteProjectRecord hiba (${id}):`, err);
  }
}

export async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  try {
    const isMigratedLocal = localStorage.getItem(LOCAL_MIGRATED_KEY) === '1';
    const isMigratedIdb = await getMetaValue<boolean>('migratedFromLocalStorage');

    if (isMigratedLocal || isMigratedIdb) {
      return;
    }

    // 1. Migrate Autosave Data
    const rawAutosave = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (rawAutosave) {
      try {
        const parsedData = JSON.parse(rawAutosave);
        if (parsedData) {
          const autosaveRecord: StoredProjectRecord = {
            id: AUTOSAVE_ID,
            name: parsedData.name || 'Arduino_PLC_Autosave',
            updatedAt: Date.now(),
            schemaVersion: parsedData.version || '3.5',
            data: parsedData
          };
          await saveProjectRecord(autosaveRecord);
          await setMetaValue('lastAutosaveId', AUTOSAVE_ID);
        }
      } catch (e) {
        console.error('Hiba a localStorage autosave konvertálásakor:', e);
      }
    }

    // 2. Migrate Slots Data
    const rawSlots = localStorage.getItem(LOCAL_SLOTS_KEY);
    if (rawSlots) {
      try {
        const parsedSlots = JSON.parse(rawSlots);
        if (Array.isArray(parsedSlots)) {
          for (const slotItem of parsedSlots) {
            if (slotItem && slotItem.slotIndex && slotItem.data) {
              const slotId = `slot_${slotItem.slotIndex}`;
              const slotRecord: StoredProjectRecord = {
                id: slotId,
                name: slotItem.name || slotItem.data.name || `Projekt ${slotItem.slotIndex}`,
                updatedAt: slotItem.savedAt ? new Date(slotItem.savedAt).getTime() : Date.now(),
                schemaVersion: slotItem.data.version || '3.5',
                data: slotItem.data
              };
              await saveProjectRecord(slotRecord);
            }
          }
        }
      } catch (e) {
        console.error('Hiba a localStorage slotok konvertálásakor:', e);
      }
    }

    // Mark as migrated
    localStorage.setItem(LOCAL_MIGRATED_KEY, '1');
    await setMetaValue('migratedFromLocalStorage', true);
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

export async function loadAutosaveProject(): Promise<ProjectData | null> {
  try {
    await migrateFromLocalStorageIfNeeded();
    const lastAutosaveId = (await getMetaValue<string>('lastAutosaveId')) || AUTOSAVE_ID;
    const record = await getProjectRecord(lastAutosaveId);
    if (record && record.data) {
      return record.data;
    }
  } catch (err) {
    console.warn('Nem sikerült betölteni az automatikus mentést IndexedDB-ből, visszatérés localStorage-ra:', err);
  }

  // Fallback to localStorage if IDB failed or was empty
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('LocalStorage fallback error:', e);
  }
  return null;
}

let autosaveTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function saveAutosaveProjectDebounced(data: ProjectData, delayMs: number = 400): void {
  if (autosaveTimeoutId !== null) {
    clearTimeout(autosaveTimeoutId);
  }

  autosaveTimeoutId = setTimeout(async () => {
    autosaveTimeoutId = null;
    try {
      const record: StoredProjectRecord = {
        id: AUTOSAVE_ID,
        name: data.name || data.metadata?.name || 'Arduino_PLC_Program',
        updatedAt: Date.now(),
        schemaVersion: data.version || '3.5',
        data
      };
      await saveProjectRecord(record);
      await setMetaValue('lastAutosaveId', AUTOSAVE_ID);
    } catch (err) {
      console.error('IndexedDB autosave failed, falling back to localStorage:', err);
      try {
        localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('LocalStorage save failed:', e);
      }
    }
  }, delayMs);
}

export async function loadSlotsFromDb(): Promise<LocalSlot[]> {
  await migrateFromLocalStorageIfNeeded();

  const defaultSlots: LocalSlot[] = [
    { slotIndex: 1, data: null },
    { slotIndex: 2, data: null },
    { slotIndex: 3, data: null },
    { slotIndex: 4, data: null },
    { slotIndex: 5, data: null }
  ];

  try {
    const resultSlots: LocalSlot[] = [...defaultSlots];
    for (let i = 1; i <= 5; i++) {
      const slotId = `slot_${i}`;
      const record = await getProjectRecord(slotId);
      if (record && record.data) {
        resultSlots[i - 1] = {
          slotIndex: i,
          data: record.data,
          name: record.name || record.data.name || `Projekt ${i}`,
          savedAt: new Date(record.updatedAt).toLocaleString('hu-HU')
        };
      }
    }
    return resultSlots;
  } catch (err) {
    console.warn('IDB slots loading failed, falling back to localStorage:', err);
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

export async function saveSlotToDb(slotIndex: number, projectData: ProjectData): Promise<LocalSlot> {
  const slotId = `slot_${slotIndex}`;
  const now = Date.now();
  const name = projectData.metadata?.name || projectData.name || `Projekt ${slotIndex}`;

  const record: StoredProjectRecord = {
    id: slotId,
    name,
    updatedAt: now,
    schemaVersion: projectData.version || '3.5',
    data: projectData
  };

  try {
    await saveProjectRecord(record);
  } catch (err) {
    console.warn('IDB slot save failed, saving to localStorage as fallback:', err);
  }

  try {
    const currentSlots = await loadSlotsFromDb();
    const updatedSlots = currentSlots.map((s) =>
      s.slotIndex === slotIndex
        ? {
            slotIndex,
            data: projectData,
            name,
            savedAt: new Date(now).toLocaleString('hu-HU')
          }
        : s
    );
    localStorage.setItem(LOCAL_SLOTS_KEY, JSON.stringify(updatedSlots));
  } catch (e) {
    console.error('LocalStorage fallback error on slot save:', e);
  }

  return {
    slotIndex,
    data: projectData,
    name,
    savedAt: new Date(now).toLocaleString('hu-HU')
  };
}

export async function clearSlotInDb(slotIndex: number): Promise<void> {
  const slotId = `slot_${slotIndex}`;
  try {
    await deleteProjectRecord(slotId);
  } catch (err) {
    console.warn('IDB slot clear failed:', err);
  }

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
