import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTime } from '../lib/utils';
import { Pause, Play, Square, SkipForward, MapPin, Navigation } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useVibration } from '../hooks/useVibration';
import { useNotifications } from '../hooks/useNotifications';
import { GPSTracker, GPSPoint } from '../lib/gps';
import { GPSPermissionModal } from './GPSPermissionModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

  // Track actual run/walk time spent
  const [runTimeSpent, setRunTimeSpent] = useState(0);
  const [walkTimeSpent, setWalkTimeSpent] = useState(0);

  const { playRunAlert, playWalkAlert, playCountdown } = useAudio();
  const { vibrateRun, vibrateWalk, vibrateCountdown } = useVibration();
  const { showNotification } = useNotifications();

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
      } else {
        throw new Error('GPS permission denied');
      }
    } catch (error) {
      console.error('GPS setup failed:', error);
      setGpsEnabled(false);
      setShowGPSModal(false);
    }
  };

  const handleDisableGPS = () => {
    setGpsEnabled(false);
    setShowGPSModal(false);
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
        icon: '/manifest.json'
      });
    } else if (currentPhase === 'run') {
      if (!isFreeRounds && currentRound >= config.rounds) {
        // Structured workout finished
        const gpsTrack = gpsTrackerRef.current?.stopTracking();
        const session = {
          runTime: config.runTime,
          walkTime: config.walkTime,
          rounds: config.rounds,
          totalDuration: runTimeSpent + walkTimeSpent,
          totalRunTime: runTimeSpent,
          totalWalkTime: walkTimeSpent,
          distance: gpsTrack?.totalDistance || 0,
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
        icon: '/manifest.json'
      });
    } else if (currentPhase === 'walk') {
      setCurrentRound(prev => prev + 1);
      setCurrentPhase('countdown');
      setTimeLeft(3);
      setCountdownValue(3);
    }
  }, [currentPhase, currentRound, config, runTimeSpent, walkTimeSpent, onFinish, playRunAlert, playWalkAlert, vibrateRun, vibrateWalk, showNotification, isFreeRounds]);

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
      distance: gpsTrack?.totalDistance || 0,
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
      <GPSPermissionModal
        isOpen={showGPSModal}
        onClose={() => setShowGPSModal(false)}
        onEnableGPS={handleEnableGPS}
        onDisableGPS={handleDisableGPS}
      />
      
      <div className="w-full max-w-md text-center space-y-8">
        {/* Round indicator */}
        <div className="flex items-center justify-center gap-3">
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

        {/* GPS Status */}
        {gpsEnabled && (
          <div className="bg-black bg-opacity-30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Navigation size={16} />
              <span className="text-sm font-semibold">GPS Active</span>
            </div>
            {gpsAccuracy && (
              <div className="text-xs text-gray-300">
                Accuracy: ±{Math.round(gpsAccuracy)}m
              </div>
            )}
          </div>
        )}

        {/* Distance and Pace Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black bg-opacity-30 rounded-lg p-3">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <MapPin size={16} />
              <span className="text-sm">Distance</span>
            </div>
            <div className="text-lg font-bold">
              {distance >= 1000 
                ? `${(distance / 1000).toFixed(2)} km` 
                : `${Math.round(distance)} m`
              }
            </div>
          </div>
          
          {gpsEnabled && currentPace > 0 && (
            <div className="bg-black bg-opacity-30 rounded-lg p-3">
              <div className="text-sm text-cyan-400 mb-1">Pace</div>
              <div className="text-lg font-bold">
                {currentPace < 60 
                  ? `${currentPace.toFixed(1)} min/km`
                  : `${Math.floor(currentPace)}:${Math.round((currentPace % 1) * 60).toString().padStart(2, '0')} /km`
                }
              </div>
            </div>
          )}
        </div>

        {/* Phase indicator */}
        <div className="text-4xl font-black tracking-wider">
          {getPhaseText()}
        </div>

        {/* Timer display */}
        <div className="relative">
          {currentPhase === 'countdown' ? (
            <div className="text-9xl font-black">
              {countdownValue > 0 ? countdownValue : ''}
            </div>
          ) : (
            <>
              <div className="text-8xl font-black font-mono">
                {formatTime(timeLeft)}
              </div>
              {!isFreeRounds && (
                <Progress 
                  value={((currentPhase === 'run' ? config.runTime : config.walkTime) - timeLeft) / (currentPhase === 'run' ? config.runTime : config.walkTime) * 100} 
                  className="mt-4 h-2"
                />
              )}
            </>
          )}
        </div>

        {/* Progress info */}
        <div className="text-xl">
          Total time: {formatTime(totalElapsed)}
        </div>

        {/* Control buttons */}
        <div className="flex justify-center gap-4 pt-8">
          <Button
            onClick={togglePause}
            className="bg-yellow-400 text-black hover:bg-yellow-300 p-4 rounded-full"
            disabled={currentPhase === 'countdown'}
            size="icon"
          >
            {isRunning ? <Pause size={32} /> : <Play size={32} />}
          </Button>

          <Button
            onClick={skipPhase}
            className="bg-yellow-400 text-black hover:bg-yellow-300 p-4 rounded-full"
            disabled={currentPhase === 'countdown'}
            size="icon"
          >
            <SkipForward size={32} />
          </Button>

          <Button
            onClick={stopWorkout}
            variant="destructive"
            className="p-4 rounded-full"
            size="icon"
          >
            <Square size={32} />
          </Button>
        </div>
      </div>
    </div>
  );
}