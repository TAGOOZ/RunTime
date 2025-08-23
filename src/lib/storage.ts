import { openDB, IDBPDatabase } from 'idb';
import { WorkoutSession } from './supabase';

const DB_NAME = 'fitness-timer-db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let db: IDBPDatabase | null = null;

export async function initDB(): Promise<IDBPDatabase> {
  if (db) return db;
  
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('date', 'date');
        store.createIndex('synced', 'synced');
      }
    },
  });
  
  return db;
}

export async function saveSession(session: Omit<WorkoutSession, 'id'>): Promise<void> {
  const database = await initDB();
  // Ensure distance is always present (default 0 if missing)
  const sessionWithSync = { ...session, distance: session.distance ?? 0, synced: 0 as const };
  await database.add(STORE_NAME, sessionWithSync);
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const database = await initDB();
  return await database.getAll(STORE_NAME);
}

export async function getUnsyncedSessions(): Promise<WorkoutSession[]> {
  const database = await initDB();
  const index = database.transaction(STORE_NAME).store.index('synced');
  return await index.getAll(0);
}

export async function markSessionsSynced(sessionIds: number[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  
  for (const id of sessionIds) {
    const session = await tx.store.get(id);
    if (session) {
      session.synced = 1;
      await tx.store.put(session);
    }
  }
  
  await tx.done;
}

export async function clearSessions(): Promise<void> {
  const database = await initDB();
  await database.clear(STORE_NAME);
}

// Fallback to localStorage if IndexedDB fails
export function saveToLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function getFromLocalStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get from localStorage:', error);
    return null;
  }
}