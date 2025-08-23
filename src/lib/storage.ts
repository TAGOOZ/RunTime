import { openDB, IDBPDatabase } from 'idb';
import { WorkoutSession } from './supabase';
import { GPSPoint } from './gps';

const DB_NAME = 'fitness-timer-db';
const DB_VERSION = 2;
const STORE_NAME = 'sessions';
const GPS_STORE_NAME = 'gps_tracks';

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
      
      if (!database.objectStoreNames.contains(GPS_STORE_NAME)) {
        const gpsStore = database.createObjectStore(GPS_STORE_NAME, {
          keyPath: 'sessionId'
        });
        gpsStore.createIndex('sessionId', 'sessionId');
      }
    },
  });
  
  return db;
}

export async function saveSession(
  session: Omit<WorkoutSession, 'id'>, 
  gpsPoints?: GPSPoint[]
): Promise<number> {
  const database = await initDB();
  
  const tx = database.transaction([STORE_NAME, GPS_STORE_NAME], 'readwrite');
  
  // Save session
  const sessionWithSync = { 
    ...session, 
    distance: session.distance ?? 0, 
    synced: 0 as const 
  };
  const sessionId = await tx.objectStore(STORE_NAME).add(sessionWithSync);
  
  // Save GPS points if available
  if (gpsPoints && gpsPoints.length > 0) {
    await tx.objectStore(GPS_STORE_NAME).add({
      sessionId: sessionId as number,
      points: gpsPoints,
      createdAt: new Date().toISOString()
    });
  }
  
  await tx.done;
  return sessionId as number;
}

export async function getSessions(): Promise<WorkoutSession[]> {
  const database = await initDB();
  return await database.getAll(STORE_NAME);
}

export async function getSessionWithGPS(sessionId: number): Promise<{
  session: WorkoutSession;
  gpsPoints?: GPSPoint[];
} | null> {
  const database = await initDB();
  
  const session = await database.get(STORE_NAME, sessionId);
  if (!session) return null;
  
  const gpsTrack = await database.get(GPS_STORE_NAME, sessionId);
  
  return {
    session,
    gpsPoints: gpsTrack?.points
  };
}

export async function getAllSessionsWithGPS(): Promise<Array<{
  session: WorkoutSession;
  gpsPoints?: GPSPoint[];
}>> {
  const database = await initDB();
  
  const sessions = await database.getAll(STORE_NAME);
  const results = [];
  
  for (const session of sessions) {
    const gpsTrack = await database.get(GPS_STORE_NAME, session.id);
    results.push({
      session,
      gpsPoints: gpsTrack?.points
    });
  }
  
  return results;
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
  const tx = database.transaction([STORE_NAME, GPS_STORE_NAME], 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.objectStore(GPS_STORE_NAME).clear();
  await tx.done;
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