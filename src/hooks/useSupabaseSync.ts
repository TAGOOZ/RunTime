import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getUnsyncedSessions, clearSessions, getAllSessionsWithGPS } from '../lib/storage';

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

    // Add timeout to prevent hanging sync
    const syncTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sync timeout')), 30000)
    );

    setIsSyncing(true);
    try {
      const syncPromise = (async () => {
      const allSessionsWithGPS = await getAllSessionsWithGPS();
      const unsyncedSessions = allSessionsWithGPS
        .filter(({ session }) => session.synced === 0)
        .map(({ session }) => session);
      
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
        distance: session.distance,
        average_pace: session.average_pace,
        max_speed: session.max_speed,
        date: session.date
      }));

      const { data: uploadedSessions, error } = await supabase
        .from('workout_sessions')
        .insert(sessionsToUpload)
        .select('id');

      if (error) {
        console.error('Failed to sync sessions:', error);
        return false;
      }

      // Upload GPS tracks if available
      if (uploadedSessions && uploadedSessions.length > 0) {
        const gpsTracksToUpload = [];
        
        for (let i = 0; i < uploadedSessions.length; i++) {
          const sessionWithGPS = allSessionsWithGPS.find(
            ({ session }) => session.id === unsyncedSessions[i].id
          );
          
          if (sessionWithGPS?.gpsPoints && sessionWithGPS.gpsPoints.length > 0) {
            gpsTracksToUpload.push({
              session_id: uploadedSessions[i].id,
              points: sessionWithGPS.gpsPoints
            });
          }
        }
        
        if (gpsTracksToUpload.length > 0) {
          const { error: gpsError } = await supabase
            .from('gps_tracks')
            .insert(gpsTracksToUpload);
            
          if (gpsError) {
            console.error('Failed to sync GPS tracks:', gpsError);
            // Don't fail the entire sync for GPS errors
          }
        }
      }

      // Clear IndexedDB only after successful upload
      await clearSessions();
      return true;
        // ... rest of sync logic
      })();

      await Promise.race([syncPromise, syncTimeout]);
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