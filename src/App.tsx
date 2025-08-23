import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SetupScreen } from './components/SetupScreen';
import { TimerScreen } from './components/TimerScreen';
import { FinishScreen } from './components/FinishScreen';
import { StatsScreen } from './components/StatsScreen';
import { saveSession } from './lib/storage';
import { GPSPoint } from './lib/gps';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useNotifications } from './hooks/useNotifications';
import { Wifi, WifiOff, Bell, BellOff } from 'lucide-react';

type Screen = 'setup' | 'timer' | 'finish' | 'stats';

interface TimerConfig {
  runTime: number;
  walkTime: number;
  rounds: number;
}

interface SessionData {
  runTime: number;
  walkTime: number;
  rounds: number;
  completedRounds?: number;
  totalDuration: number;
  totalRunTime: number;
  totalWalkTime: number;
  distance: number;
  gpsPoints?: GPSPoint[];
  averagePace?: number;
  maxSpeed?: number;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [timerConfig, setTimerConfig] = useState<TimerConfig | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  
  const { isOnline, isSyncing, syncSessions } = useSupabaseSync();
  const { permission, requestPermission, isSupported: notificationsSupported } = useNotifications();

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered:', registration);
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    }

    // Sync on app load if online
    if (isOnline) {
      syncSessions();
    }
  }, [isOnline, syncSessions]);

  const handleStartWorkout = (config: TimerConfig) => {
    setTimerConfig(config);
    setCurrentScreen('timer');
  };

  const handleFinishWorkout = async (session: SessionData) => {
    // Save session locally
    const sessionRecord = {
      run_time: session.runTime,
      walk_time: session.walkTime,
      rounds: session.rounds,
      total_duration: session.totalDuration,
      total_run_time: session.totalRunTime,
      total_walk_time: session.totalWalkTime,
      distance: session.distance,
      average_pace: session.averagePace,
      max_speed: session.maxSpeed,
      date: new Date().toISOString()
    };

    try {
      await saveSession(sessionRecord, session.gpsPoints);
      console.log('Session saved locally');
      
      // Try to sync immediately if online
      if (isOnline) {
        await syncSessions();
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    setSessionData(session);
    setCurrentScreen('finish');
  };

  const handleStopWorkout = () => {
    setCurrentScreen('setup');
    setTimerConfig(null);
  };

  const handleNewWorkout = () => {
    setCurrentScreen('setup');
    setTimerConfig(null);
    setSessionData(null);
  };

  const handleViewStats = () => {
    setCurrentScreen('stats');
  };


  const handleBackToSetup = () => {
    setCurrentScreen('setup');
  };

  // Handler for "Don't save" button on FinishScreen
  const handleDontSave = () => {
    setCurrentScreen('setup');
    setTimerConfig(null);
    setSessionData(null);
  };

  const handleNotificationPermission = async () => {
    if (notificationsSupported && permission === 'default') {
      await requestPermission();
    }
  };

  return (
    <div className="relative">
      {/* Status bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white px-4 py-2 flex justify-between items-center text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          
          {isSyncing && (
            <div className="text-yellow-400">Syncing...</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {notificationsSupported && (
            <button
              onClick={handleNotificationPermission}
              className="flex items-center gap-1 hover:text-yellow-400 transition-colors"
            >
              {permission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Main content with top margin for status bar */}
      <div className="pt-10">
        {currentScreen === 'setup' && (
          <SetupScreen onStart={handleStartWorkout} onViewStats={handleViewStats} />
        )}

        {currentScreen === 'timer' && timerConfig && (
          <TimerScreen
            config={timerConfig}
            onFinish={handleFinishWorkout}
            onStop={handleStopWorkout}
          />
        )}


        {currentScreen === 'finish' && sessionData && (
          <FinishScreen
            session={sessionData}
            onNewWorkout={handleNewWorkout}
            onViewStats={handleViewStats}

            onDontSave={handleDontSave}
          />
        )}

        {currentScreen === 'stats' && (
          <StatsScreen onBack={handleBackToSetup} />
        )}
      </div>
    </div>
  );
}

export default App;