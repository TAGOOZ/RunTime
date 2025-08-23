import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTime } from '../lib/utils';
import { Pause, Play, Square, SkipForward } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useVibration } from '../hooks/useVibration';
import { useNotifications } from '../hooks/useNotifications';
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
    totalDuration: number;
    totalRunTime: number;
    totalWalkTime: number;
    distance: number;
  }) => void;
  onStop: () => void;
}

type Phase = 'run' | 'walk' | 'countdown';

export function TimerScreen({ config, onFinish, onStop }: TimerScreenProps) {
  // Add simulation state INSIDE the component
  const [simulateMovement, setSimulateMovement] = useState(false);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<Phase>('countdown');
  const [timeLeft, setTimeLeft] = useState(3);
  const [isRunning, setIsRunning] = useState(true);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isFreeRounds] = useState(config.rounds === -1);

  // GPS tracking state
  const [distance, setDistance] = useState(0);
  const coordsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const watchIdRef = useRef<number | null>(null);

  // Track actual run/walk time spent
  const [runTimeSpent, setRunTimeSpent] = useState(0);
  const [walkTimeSpent, setWalkTimeSpent] = useState(0);

  const { playRunAlert, playWalkAlert, playCountdown } = useAudio();
  const { vibrateRun, vibrateWalk, vibrateCountdown } = useVibration();
  const { showNotification } = useNotifications();

  // Haversine formula to calculate distance between two lat/lng points in meters
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371e3; // Earth radius in meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

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
        // Stop GPS tracking and finalize distance
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        if (simulationIntervalRef.current !== null) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        const session = {
          runTime: config.runTime,
          walkTime: config.walkTime,
          rounds: config.rounds,
          totalDuration: runTimeSpent + walkTimeSpent,
          totalRunTime: runTimeSpent,
          totalWalkTime: walkTimeSpent,
          distance: distance > 0 ? distance : 0
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
  }, [currentPhase, currentRound, config, runTimeSpent, walkTimeSpent, distance, onFinish, playRunAlert, playWalkAlert, vibrateRun, vibrateWalk, showNotification, isFreeRounds]);

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

  // GPS simulation logic - completely separate from timer
  useEffect(() => {
    if (simulateMovement) {
      // Simulation mode - generates fake coordinates
      simulationIntervalRef.current = setInterval(() => {
        const lastCoord = coordsRef.current[coordsRef.current.length - 1] || {
          lat: 37.7749, lng: -122.4194 // Starting point (San Francisco)
        };
        const newCoord = {
          lat: lastCoord.lat + (Math.random() * 0.0001 - 0.00005),
          lng: lastCoord.lng + (Math.random() * 0.0001 - 0.00005)
        };
        coordsRef.current.push(newCoord);
        if (coordsRef.current.length > 1) {
          const prev = coordsRef.current[coordsRef.current.length - 2];
          const d = haversineDistance(prev.lat, prev.lng, newCoord.lat, newCoord.lng);
          setDistance((dist) => dist + d);
        }
      }, 1000);
      
      return () => {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
        }
      };
    }
  }, [simulateMovement]);

  // Real GPS tracking logic - completely separate from timer
  useEffect(() => {
    if (!simulateMovement && navigator.geolocation) {
      // Real GPS tracking
      coordsRef.current = [];
      setDistance(0);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const prev = coordsRef.current[coordsRef.current.length - 1];
          coordsRef.current.push({ lat: latitude, lng: longitude });
          if (prev) {
            const d = haversineDistance(prev.lat, prev.lng, latitude, longitude);
            setDistance((dist) => dist + d);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
      
      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    }
  }, [simulateMovement]);

  const togglePause = () => {
    setIsRunning(prev => !prev);
  };

  const skipPhase = () => {
    setTimeLeft(0);
  };

  const stopWorkout = () => {
    // Use tracked run/walk time for accuracy
    // Stop GPS tracking and finalize distance
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    const session = {
      runTime: config.runTime,
      walkTime: config.walkTime,
      rounds: isFreeRounds
        ? (currentPhase === 'run' || currentPhase === 'countdown' ? currentRound - 1 : currentRound)
        : config.rounds,
      totalDuration: runTimeSpent + walkTimeSpent,
      totalRunTime: runTimeSpent,
      totalWalkTime: walkTimeSpent,
      distance: distance > 0 ? distance : 0
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

        {/* GPS Simulation Button */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={() => setSimulateMovement((prev) => !prev)}
            className={`px-4 py-2 rounded font-bold transition-colors ${simulateMovement ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            type="button"
          >
            {simulateMovement ? 'Stop Simulation' : 'Test GPS Simulation'}
          </Button>
        </div>

        {/* Distance Display */}
        <div className="text-lg font-semibold">
          Distance: {distance > 1000 ? (distance / 1000).toFixed(2) + " km" : distance.toFixed(1) + " m"}
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