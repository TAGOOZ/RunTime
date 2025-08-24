import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTime } from '../lib/utils';
import { Pause, Play, Square, SkipForward, MapPin, Navigation, Activity, Timer } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useVibration } from '../hooks/useVibration';
import { useNotifications } from '../hooks/useNotifications';
import { GPSTracker, GPSPoint } from '../lib/gps';
import { GPSPermissionModal } from './GPSPermissionModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface TimerConfig {
  runTime: number;
  walkTime: number;
  rounds: number;
}

interface TimerScreenProps {
  config: TimerConfig;
  onFinish: (session: {
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
  }) => void;
  onStop: () => void;
}

type Phase = 'run' | 'walk' | 'countdown';

export function TimerScreen({ config, onFinish, onStop }: TimerScreenProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<Phase>('countdown');
  const [timeLeft, setTimeLeft] = useState(3);
  const [isRunning, setIsRunning] = useState(true);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isFreeRounds] = useState(config.rounds === -1);

  // GPS state
  const [showGPSModal, setShowGPSModal] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState(false);
  const [distance, setDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const gpsTrackerRef = useRef<GPSTracker | null>(null);
  const [hasShownGPSModal, setHasShownGPSModal] = useState(false);
  const [isGPSModalReady, setIsGPSModalReady] = useState(false);

  // Track actual run/walk time spent
  const [runTimeSpent, setRunTimeSpent] = useState(0);
  const [walkTimeSpent, setWalkTimeSpent] = useState(0);

  // Background functionality state
  const [isInBackground, setIsInBackground] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateRef = useRef<number>(Date.now());
  const { playRunAlert, playWalkAlert, playCountdown } = useAudio();
  const { vibrateRun, vibrateWalk, vibrateCountdown } = useVibration();
  const { showNotification, requestPermission } = useNotifications();

  // Request wake lock to keep screen on during workout
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const wakeLockSentinel = await navigator.wakeLock.request('screen');
          setWakeLock(wakeLockSentinel);
          console.log('Wake lock acquired');
        }
      } catch (error) {
        console.error('Wake lock failed:', error);
      }
    };

    requestWakeLock();

    // Clean up wake lock on unmount
    return () => {
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    };
  }, []);

  // Handle visibility change (screen on/off, app backgrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      setIsInBackground(isHidden);
      
      if (isHidden) {
        // App going to background - store current time
        lastUpdateRef.current = Date.now();
        console.log('App backgrounded at:', new Date().toLocaleTimeString());
      } else {
        // App coming back to foreground - calculate missed time
        const now = Date.now();
        const timeMissed = Math.floor((now - lastUpdateRef.current) / 1000);
        
        if (timeMissed > 0 && isRunning) {
          console.log(`App foregrounded, missed ${timeMissed} seconds`);
          
          // Update elapsed time
          setTotalElapsed(prev => prev + timeMissed);
          
          // Update phase-specific time
          if (currentPhase === 'run') {
            setRunTimeSpent(prev => prev + timeMissed);
          } else if (currentPhase === 'walk') {
            setWalkTimeSpent(prev => prev + timeMissed);
          }
          
          // Adjust current timer
          setTimeLeft(prev => Math.max(0, prev - timeMissed));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, currentPhase]);

  // Request notification permission on component mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);
  
  // Check GPS modal state on component mount
  useEffect(() => {
    const hasSeenGPSModal = localStorage.getItem('hasSeenGPSModal');
    // Add timeout to prevent infinite loading
    const modalTimeout = setTimeout(() => {
      if (!hasSeenGPSModal) {
        setShowGPSModal(true);
        setHasShownGPSModal(false);
      } else {
        setShowGPSModal(false);
        setHasShownGPSModal(true);
      }
      setIsGPSModalReady(true);
    }, 100);

    return () => clearTimeout(modalTimeout);
  }, []);

  // GPS permission and setup
  const handleEnableGPS = async () => {
    try {
      const tracker = new GPSTracker((point, totalDistance) => {
        setDistance(totalDistance);
        setCurrentPace(tracker.getCurrentPace());
        setGpsAccuracy(point.accuracy || null);
      });
      
      const hasPermission = await tracker.requestPermission();
      if (hasPermission) {
        await tracker.startTracking();
        gpsTrackerRef.current = tracker;
        setGpsEnabled(true);
        setGpsPermissionGranted(true);
        setShowGPSModal(false);
        setHasShownGPSModal(true);
        localStorage.setItem('hasSeenGPSModal', 'true');
      } else {
        throw new Error('GPS permission denied');
      }
    } catch (error) {
      console.error('GPS setup failed:', error);
      setGpsEnabled(false);
      setShowGPSModal(false);
      setHasShownGPSModal(true);
      localStorage.setItem('hasSeenGPSModal', 'true');
    }
  };

  const handleDisableGPS = () => {
    setGpsEnabled(false);
    setShowGPSModal(false);
    setHasShownGPSModal(true);
    localStorage.setItem('hasSeenGPSModal', 'true');
  };

  const switchToNextPhase = useCallback(() => {
    if (currentPhase === 'countdown') {
      setCurrentPhase('run');
      setTimeLeft(config.runTime);
      playRunAlert();
      vibrateRun();
      showNotification('Start Running!', {
        body: isFreeRounds 
          ? `Round ${currentRound} - Free rounds mode`
          : `Round ${currentRound} of ${config.rounds}`,
        icon: '/manifest.json',
        tag: 'phase-change',
        requireInteraction: false,
        silent: false
      });
    } else if (currentPhase === 'run') {
      if (!isFreeRounds && currentRound >= config.rounds) {
        // Structured workout finished
        const gpsTrack = gpsTrackerRef.current?.stopTracking();
        
        // Ensure distance is always included, even if 0
        const finalDistance = gpsTrack?.totalDistance || distance || 0;
        
        // Show completion notification
        showNotification('Workout Complete!', {
          body: `Great job! You completed ${config.rounds} rounds.`,
          icon: '/manifest.json',
          tag: 'workout-complete',
          requireInteraction: true
        });
        
        const session = {
          runTime: config.runTime,
          walkTime: config.walkTime,
          rounds: config.rounds,
          totalDuration: runTimeSpent + walkTimeSpent,
          totalRunTime: runTimeSpent,
          totalWalkTime: walkTimeSpent,
          distance: finalDistance,
          gpsPoints: gpsTrack?.points,
          averagePace: gpsTrack?.averagePace,
          maxSpeed: gpsTrack?.maxSpeed
        };
        onFinish(session);
        return;
      }
      
      setCurrentPhase('walk');
      setTimeLeft(config.walkTime);
      playWalkAlert();
      vibrateWalk();
      showNotification('Time to Walk', {
        body: isFreeRounds
          ? `Recovery time - Round ${currentRound}`
          : `Recovery time - Round ${currentRound} of ${config.rounds}`,
        icon: '/manifest.json',
        tag: 'phase-change',
        requireInteraction: false,
        silent: false
      });
    } else if (currentPhase === 'walk') {
      setCurrentRound(prev => prev + 1);
      setCurrentPhase('countdown');
      setTimeLeft(3);
      setCountdownValue(3);
    }
  }, [currentPhase, currentRound, config, runTimeSpent, walkTimeSpent, onFinish, playRunAlert, playWalkAlert, vibrateRun, vibrateWalk, showNotification, isFreeRounds, distance]);

  // Timer logic - completely separate from GPS
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        if (currentPhase !== 'countdown') {
          setTotalElapsed(prev => prev + 1);
        }
        if (currentPhase === 'countdown') {
          setCountdownValue(timeLeft - 1);
          if (timeLeft <= 4 && timeLeft > 1) {
            playCountdown();
            vibrateCountdown();
          }
        }
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      switchToNextPhase();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, currentPhase, switchToNextPhase, playCountdown, vibrateCountdown]);

  // Track actual run/walk time spent
  useEffect(() => {
    if (!isRunning) return;
    if (currentPhase === 'run' && timeLeft > 0) {
      setRunTimeSpent(prev => prev + 1);
    } else if (currentPhase === 'walk' && timeLeft > 0) {
      setWalkTimeSpent(prev => prev + 1);
    }
    // No increment for countdown
    // eslint-disable-next-line
  }, [isRunning, currentPhase, timeLeft]);

  // Ensure runTimeSpent + walkTimeSpent always equals totalElapsed
  useEffect(() => {
    const sum = runTimeSpent + walkTimeSpent;
    if (sum !== totalElapsed) {
      // Adjust the last phase to match totalElapsed
      if (currentPhase === 'run') {
        setRunTimeSpent(prev => prev + (totalElapsed - sum));
      } else if (currentPhase === 'walk') {
        setWalkTimeSpent(prev => prev + (totalElapsed - sum));
      }
    }
    // eslint-disable-next-line
  }, [totalElapsed]);

  const togglePause = () => {
    setIsRunning(prev => !prev);
  };

  const skipPhase = () => {
    setTimeLeft(0);
  };

  const stopWorkout = () => {
    // Use tracked run/walk time for accuracy
    const gpsTrack = gpsTrackerRef.current?.stopTracking();
    
    // Ensure distance is always included, even if 0
    const finalDistance = gpsTrack?.totalDistance || distance || 0;
    
    const session = {
      runTime: config.runTime,
      walkTime: config.walkTime,
      rounds: isFreeRounds
        ? (currentPhase === 'run' || currentPhase === 'countdown' ? currentRound - 1 : currentRound)
        : config.rounds,
      completedRounds: isFreeRounds
        ? (currentPhase === 'run' || currentPhase === 'countdown' ? currentRound - 1 : currentRound)
        : undefined,
      totalDuration: runTimeSpent + walkTimeSpent,
      totalRunTime: runTimeSpent,
      totalWalkTime: walkTimeSpent,
      distance: finalDistance,
      gpsPoints: gpsTrack?.points,
      averagePace: gpsTrack?.averagePace,
      maxSpeed: gpsTrack?.maxSpeed
    };
    onFinish(session);
  };

  const getBackgroundColor = (): string => {
    switch (currentPhase) {
      case 'run':
        return 'bg-orange-600'; // #FF5722 equivalent
      case 'walk':
        return 'bg-cyan-600'; // #0288D1 equivalent
      case 'countdown':
        return currentRound === 1 ? 'bg-orange-600' : 'bg-cyan-600';
      default:
        return 'bg-gray-900';
    }
  };

  const getPhaseText = (): string => {
    switch (currentPhase) {
      case 'run':
        return 'RUN';
      case 'walk':
        return 'WALK';
      case 'countdown':
        return 'GET READY';
      default:
        return '';
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundColor()} text-white flex flex-col items-center justify-center p-6 transition-colors duration-500`}>
      {/* Only render GPS modal if ready and should be shown */}
      {isGPSModalReady && showGPSModal && !hasShownGPSModal && (
        <GPSPermissionModal
          isOpen={true}
          onClose={() => {
            setShowGPSModal(false);
            setHasShownGPSModal(true);
            localStorage.setItem('hasSeenGPSModal', 'true');
          }}
          onEnableGPS={handleEnableGPS}
          onDisableGPS={handleDisableGPS}
        />
      )}
      
      {/* Only show timer content when GPS modal is ready */}
      {isGPSModalReady && (
        <div className="w-full max-w-lg text-center space-y-6">
        {/* Background status indicator */}
        {isInBackground && (
          <Card className="bg-yellow-900/30 border-yellow-500/30 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">Running in Background</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Round indicator */}
        <Card className="bg-black/20 border-white/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <Activity className="text-white" size={24} />
          {isFreeRounds ? (
            <>
              <Badge variant="secondary" className="bg-yellow-400 text-black text-lg px-3 py-1">
                FREE MODE
              </Badge>
              <span className="text-2xl font-bold">ROUND {currentRound}</span>
            </>
          ) : (
            <div className="text-2xl font-bold">
              ROUND {currentRound} / {config.rounds}
            </div>
          )}
            </div>
          </CardContent>
        </Card>

        {/* GPS Status */}
        {gpsEnabled && (
          <Card className="bg-green-900/30 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Navigation size={18} />
                <span className="text-base font-semibold">GPS Active</span>
              </div>
              {gpsAccuracy && (
                <div className="text-sm text-green-300 mt-1">
                  Accuracy: ±{Math.round(gpsAccuracy)}m
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Distance and Pace Display */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-black/20 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                <MapPin size={18} />
                <span className="text-base font-semibold">Distance</span>
              </div>
              <div className="text-xl font-bold">
                {distance >= 1000 
                  ? `${(distance / 1000).toFixed(2)} km` 
                  : `${Math.round(distance)} m`
                }
              </div>
            </CardContent>
          </Card>
          
          {gpsEnabled && currentPace > 0 && (
            <Card className="bg-black/20 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2">
                  <Timer size={18} />
                  <span className="text-base font-semibold">Pace</span>
                </div>
                <div className="text-xl font-bold">
                  {currentPace < 60 
                    ? `${currentPace.toFixed(1)} min/km`
                    : `${Math.floor(currentPace)}:${Math.round((currentPace % 1) * 60).toString().padStart(2, '0')} /km`
                  }
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Total Time Card */}
          {(!gpsEnabled || currentPace === 0) && (
            <Card className="bg-black/20 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                  <Timer size={18} />
                  <span className="text-base font-semibold">Total</span>
                </div>
                <div className="text-xl font-bold">
                  {formatTime(totalElapsed)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Phase indicator with enhanced styling */}
        <Card className="bg-black/30 border-white/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-5xl font-black tracking-wider mb-2">
              {getPhaseText()}
            </div>
            {currentPhase !== 'countdown' && (
              <div className="text-lg text-white/80">
                {currentPhase === 'run' ? 'Push your limits!' : 'Active recovery'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer display with enhanced styling */}
        <Card className="bg-black/40 border-white/40 backdrop-blur-sm">
          <CardContent className="p-8">
            {currentPhase === 'countdown' ? (
              <div className="text-9xl font-black font-mono animate-pulse">
                {countdownValue > 0 ? countdownValue : ''}
              </div>
            ) : (
              <>
                <div className="text-8xl font-black font-mono mb-4">
                  {formatTime(timeLeft)}
                </div>
                {!isFreeRounds && (
                  <Progress 
                    value={((currentPhase === 'run' ? config.runTime : config.walkTime) - timeLeft) / (currentPhase === 'run' ? config.runTime : config.walkTime) * 100} 
                    className="h-3 bg-white/20"
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Workout Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-orange-900/30 border-orange-500/30 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <div className="text-orange-400 text-sm font-semibold mb-1">Run Time</div>
              <div className="text-lg font-bold">{formatTime(runTimeSpent)}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-cyan-900/30 border-cyan-500/30 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <div className="text-cyan-400 text-sm font-semibold mb-1">Walk Time</div>
              <div className="text-lg font-bold">{formatTime(walkTimeSpent)}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-900/30 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="p-3 text-center">
              <div className="text-purple-400 text-sm font-semibold mb-1">Total</div>
              <div className="text-lg font-bold">{formatTime(totalElapsed)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Control buttons with enhanced styling */}
        <Card className="bg-black/30 border-white/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex justify-center gap-4">
              <Button
                onClick={togglePause}
                className="bg-yellow-400 text-black hover:bg-yellow-300 p-6 rounded-full shadow-lg transform hover:scale-105 transition-all"
                disabled={currentPhase === 'countdown'}
                size="icon"
              >
                {isRunning ? <Pause size={36} /> : <Play size={36} />}
              </Button>

              <Button
                onClick={skipPhase}
                className="bg-blue-500 text-white hover:bg-blue-400 p-6 rounded-full shadow-lg transform hover:scale-105 transition-all"
                disabled={currentPhase === 'countdown'}
                size="icon"
              >
                <SkipForward size={36} />
              </Button>

              <Button
                onClick={stopWorkout}
                variant="destructive"
                className="p-6 rounded-full shadow-lg transform hover:scale-105 transition-all bg-red-600 hover:bg-red-500"
                size="icon"
              >
                <Square size={36} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Keep screen on reminder */}
        {!wakeLock && (
          <div className="text-center text-sm text-yellow-400 bg-yellow-900/20 rounded-lg p-3">
            💡 Keep your screen on for best timer accuracy
          </div>
        )}
      </div>
      )}
    </div>
  );
}