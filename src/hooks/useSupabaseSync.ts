import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getUnsyncedSessions, clearSessions } from '../lib/storage';

export function useSupabaseSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncSessions = useCallback(async (): Promise<boolean> => {
    if (!isOnline) return false;

    setIsSyncing(true);
    try {
      const unsyncedSessions = await getUnsyncedSessions();
      
      if (unsyncedSessions.length === 0) {
        return true;
      }

      // Upload sessions to Supabase
      const sessionsToUpload = unsyncedSessions.map(session => ({
        run_time: session.run_time,
        walk_time: session.walk_time,
        rounds: session.rounds,
        total_duration: session.total_duration,
        total_run_time: session.total_run_time,
        total_walk_time: session.total_walk_time,
        date: session.date
      }));

      const { error } = await supabase
        .from('workout_sessions')
        .insert(sessionsToUpload);

      if (error) {
        console.error('Failed to sync sessions:', error);
        return false;
      }

      // Clear IndexedDB only after successful upload
      await clearSessions();
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncSessions();
    }
  }, [isOnline, syncSessions]);

  return {
    isOnline,
    isSyncing,
    syncSessions
  };
}