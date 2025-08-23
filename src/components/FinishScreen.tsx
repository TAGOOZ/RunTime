import { formatTime } from '../lib/utils';
import { CheckCircle, BarChart3, RotateCcw, XCircle, MapPin, Navigation, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RouteMap } from './RouteMap';
import { GPSPoint } from '../lib/gps';
import { useState } from 'react';

type FinishScreenProps = {
  session: {
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
  };
  onNewWorkout: () => void;
  onViewStats: () => void;
  onDontSave: () => void;
};

export function FinishScreen({ session, onNewWorkout, onViewStats, onDontSave }: FinishScreenProps) {
  const isFreeRounds = session.rounds <= 0;
  const [showMap, setShowMap] = useState(false);
  const hasGPSData = session.gpsPoints && session.gpsPoints.length > 0;
  
  // Format distance for display (meters or kilometers)
  const formatDistance = (distance: number) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${Math.round(distance)} m`;
  };

  // Format pace for display
  const formatPace = (pace: number) => {
    if (pace < 60) {
      return `${pace.toFixed(1)} min/km`;
    }
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace % 1) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <CheckCircle size={72} className="text-green-400 mb-2" />
          <h1 className="text-4xl font-extrabold mb-1 tracking-tight">Workout Complete!</h1>
          <div className="text-lg text-gray-300">
            {isFreeRounds ? (
              <span className="flex items-center justify-center gap-2">
                You completed
                <Badge variant="secondary" className="bg-yellow-400 text-black text-base px-2 py-1">
                  {session.rounds} rounds
                </Badge>
                in free mode!
              </span>
            ) : (
              <>Great job finishing your session!</>
            )}
          </div>
        </div>

        {/* Session Summary Card */}
        <Card className="bg-gray-800 border-gray-700 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-2xl font-bold">Session Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div className="grid grid-cols-2 gap-6 text-lg">
              <div className="flex flex-col items-center">
                <div className="text-gray-400 text-base">Total Time</div>
                <div className="font-extrabold text-3xl text-yellow-400 mt-1">{formatTime(session.totalDuration)}</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-gray-400 text-base">Rounds Planned</div>
                <div className="font-extrabold text-3xl text-white mt-1">{session.rounds}</div>
                {session.completedRounds !== undefined && session.completedRounds !== session.rounds && session.completedRounds >= 0 && (
                  <div className="text-xs text-yellow-400 mt-1">Completed: <span className="font-bold">{session.completedRounds}</span></div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-gray-400 text-base">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  Run Time
                </div>
                <div className="font-bold text-xl text-white mt-1">{formatTime(Math.max(0, session.totalRunTime))}</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-gray-400 text-base">
                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                  Walk Time
                </div>
                <div className="font-bold text-xl text-white mt-1">{formatTime(Math.max(0, session.totalWalkTime))}</div>
              </div>
            </div>

            {/* Distance Display */}
            {session.distance > 0 && (
              <div className="border-t border-gray-700 pt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-base mb-1">
                  <MapPin size={16} />
                  Distance Covered
                </div>
                <div className="font-extrabold text-3xl text-green-400">
                  {formatDistance(session.distance)}
                </div>
              </div>
            )}

            {/* GPS Analytics */}
            {hasGPSData && (session.averagePace || session.maxSpeed) && (
              <div className="border-t border-gray-700 pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  {session.averagePace && session.averagePace > 0 && (
                    <div>
                      <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mb-1">
                        <Navigation size={14} />
                        Average Pace
                      </div>
                      <div className="font-bold text-lg text-cyan-400">
                        {formatPace(session.averagePace)}
                      </div>
                    </div>
                  )}
                  {session.maxSpeed && session.maxSpeed > 0 && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Max Speed</div>
                      <div className="font-bold text-lg text-orange-400">
                        {session.maxSpeed.toFixed(1)} km/h
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-700 pt-4 text-center">
              <div className="text-gray-400 text-base mb-1">Workout Pattern</div>
              <div className="font-semibold text-lg text-white">
                {isFreeRounds ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-base px-2 py-1">
                      Free Mode
                    </Badge>
                    {session.runTime}s run / {session.walkTime}s walk
                  </span>
                ) : (
                  `${session.runTime}s run / ${session.walkTime}s walk × ${session.rounds} rounds`
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Map */}
        {hasGPSData && (
          <Card className="bg-gray-800 border-gray-700 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                <Map size={20} />
                Your Route
                <Button
                  onClick={() => setShowMap(!showMap)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-gray-400 hover:text-white"
                >
                  {showMap ? 'Hide' : 'Show'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showMap && (
              <CardContent className="pt-0">
                <RouteMap points={session.gpsPoints || []} />
              </CardContent>
            )}
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-4 w-full mt-8">
          <Button
            onClick={onNewWorkout}
            className="w-full py-6 rounded-lg text-3xl font-bold flex items-center justify-center gap-3 bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
          >
            <RotateCcw size={24} />
            <span>New Workout</span>
          </Button>
          <Button
            onClick={onViewStats}
            variant="secondary"
            className="w-full py-6 rounded-lg text-3xl font-bold flex items-center justify-center gap-3 bg-gray-700 text-white hover:bg-gray-600 transition-colors"
          >
            <BarChart3 size={24} />
            <span>View Stats</span>
          </Button>
          <Button
            onClick={onDontSave}
            variant="destructive"
            className="w-full py-6 rounded-lg text-3xl font-bold flex items-center justify-center gap-3 bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            <XCircle size={24} />
            <span>Don't save</span>
          </Button>
        </div>
      </div>
    </div>
  );
}