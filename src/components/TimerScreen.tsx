import { useState, useEffect } from 'react';
import { formatTime } from '../lib/utils';
import { Play, Pause, Square, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type TimerScreenProps = {
  runTime: number;
  walkTime: number;
  rounds: number;
  onComplete: (session: any) => void;
  onStop: () => void;
};

export function TimerScreen({ runTime, walkTime, rounds, onComplete, onStop }: TimerScreenProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRunPhase, setIsRunPhase] = useState(true);
  const [timeLeft, setTimeLeft] = useState(runTime);
  const [totalRunTime, setTotalRunTime] = useState(0);
  const [totalWalkTime, setTotalWalkTime] = useState(0);

  const isFreeRounds = rounds <= 0;
  const currentPhaseTime = isRunPhase ? runTime : walkTime;
  const progress = ((currentPhaseTime - timeLeft) / currentPhaseTime) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Phase complete
            if (isRunPhase) {
              setTotalRunTime(prev => prev + runTime);
              setIsRunPhase(false);
              return walkTime;
            } else {
              setTotalWalkTime(prev => prev + walkTime);
              if (!isFreeRounds && currentRound >= rounds) {
                // Workout complete
                handleComplete();
                return 0;
              } else {
                setCurrentRound(prev => prev + 1);
                setIsRunPhase(true);
                return runTime;
              }
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isRunPhase, currentRound, rounds, runTime, walkTime, isFreeRounds]);

  const handleComplete = () => {
    const session = {
      runTime,
      walkTime,
      rounds: isFreeRounds ? currentRound - 1 : rounds,
      completedRounds: currentRound - 1,
      totalDuration: totalRunTime + totalWalkTime,
      totalRunTime,
      totalWalkTime,
      distance: 0,
      gpsPoints: []
    };
    onComplete(session);
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleStop = () => {
    setIsRunning(false);
    onStop();
  };

  const handleSkip = () => {
    if (isRunPhase) {
      setTotalRunTime(prev => prev + (runTime - timeLeft));
      setIsRunPhase(false);
      setTimeLeft(walkTime);
    } else {
      setTotalWalkTime(prev => prev + (walkTime - timeLeft));
      if (!isFreeRounds && currentRound >= rounds) {
        handleComplete();
      } else {
        setCurrentRound(prev => prev + 1);
        setIsRunPhase(true);
        setTimeLeft(runTime);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        <Card className="bg-gray-800/80 border-gray-600/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-6">
            {/* Phase indicator */}
            <div className={`text-2xl font-bold ${isRunPhase ? 'text-orange-400' : 'text-cyan-400'}`}>
              {isRunPhase ? 'RUN' : 'WALK'}
            </div>

            {/* Timer display */}
            <div className="text-8xl font-mono font-bold">
              {formatTime(timeLeft)}
            </div>

            {/* Progress bar */}
            <Progress value={progress} className="h-4" />

            {/* Round counter */}
            <div className="text-xl text-gray-300">
              {isFreeRounds ? (
                `Round ${currentRound}`
              ) : (
                `Round ${currentRound} of ${rounds}`
              )}
            </div>

            {/* Control buttons */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={handlePlayPause}
                size="lg"
                className={`w-16 h-16 rounded-full ${
                  isRunning 
                    ? 'bg-yellow-500 hover:bg-yellow-400' 
                    : 'bg-green-500 hover:bg-green-400'
                }`}
              >
                {isRunning ? <Pause size={24} /> : <Play size={24} />}
              </Button>
              
              <Button
                onClick={handleSkip}
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-gray-500 text-gray-300 hover:bg-gray-700"
              >
                <SkipForward size={24} />
              </Button>
              
              <Button
                onClick={handleStop}
                size="lg"
                variant="destructive"
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500"
              >
                <Square size={24} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}