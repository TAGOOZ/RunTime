import { formatTime } from '../lib/utils';
import { CheckCircle, BarChart3, RotateCcw, XCircle, MapPin, Navigation, Map, Trophy, Target, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RouteMap } from './RouteMap';
import { GPSPoint } from '../lib/gps';
import { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';

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
  
  // Ensure distance is always a number (fallback to 0 if undefined/null)
  const sessionDistance = session.distance || 0;
  
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Trophy size={80} className="text-yellow-400 animate-pulse" />
                <CheckCircle size={32} className="text-green-400 absolute -top-2 -right-2" />
              </div>
            </div>
            <h1 className="text-5xl font-extrabold mb-3 tracking-tight bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Workout Complete!
            </h1>
            <div className="text-xl text-gray-300">
              {isFreeRounds ? (
                <span className="flex items-center justify-center gap-3 flex-wrap">
                  <span>You completed</span>
                  <Badge variant="secondary" className="bg-yellow-400 text-black text-xl px-4 py-2 font-bold">
                    {session.rounds} rounds
                  </Badge>
                  <span>in free mode!</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Target className="text-green-400" size={24} />
                  Great job finishing your session!
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Summary Card */}
        <Card className="bg-gray-800/80 border-gray-600/50 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-3xl font-bold flex items-center gap-3">
              <Activity className="text-blue-400" size={32} />
              Session Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-0">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/30">
                <CardContent className="p-4 text-center">
                  <Clock className="mx-auto mb-2 text-yellow-400" size={28} />
                  <div className="text-gray-300 text-sm font-medium">Total Time</div>
                  <div className="font-extrabold text-2xl text-yellow-400 mt-1">{formatTime(session.totalDuration)}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <Target className="mx-auto mb-2 text-blue-400" size={28} />
                  <div className="text-gray-300 text-sm font-medium">Rounds</div>
                  <div className="font-extrabold text-2xl text-white mt-1">{session.rounds}</div>
                  {session.completedRounds !== undefined && session.completedRounds !== session.rounds && session.completedRounds >= 0 && (
                    <div className="text-xs text-yellow-400 mt-1">Done: <span className="font-bold">{session.completedRounds}</span></div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-500/30">
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Run Time</div>
                  <div className="font-bold text-xl text-orange-400 mt-1">{formatTime(Math.max(0, session.totalRunTime))}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-cyan-500/30">
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 bg-cyan-500 rounded-full"></div>
                  </div>
                  <div className="text-gray-300 text-sm font-medium">Walk Time</div>
                  <div className="font-bold text-xl text-cyan-400 mt-1">{formatTime(Math.max(0, session.totalWalkTime))}</div>
                </CardContent>
              </Card>
            </div>

            {/* Distance Display - Always show, even if 0 */}
            {sessionDistance >= 0 && (
              <Card className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/30">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <MapPin className="text-green-400" size={32} />
                    <span className="text-xl font-semibold text-gray-300">
                      {sessionDistance > 0 ? 'Distance Covered' : 'Distance (GPS not used)'}
                    </span>
                  </div>
                  <div className={`font-extrabold text-4xl ${sessionDistance > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {formatDistance(sessionDistance)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GPS Analytics */}
            {hasGPSData && (session.averagePace || session.maxSpeed) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.averagePace && session.averagePace > 0 && (
                  <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/30">
                    <CardContent className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Navigation className="text-purple-400" size={28} />
                        <span className="text-lg font-semibold text-gray-300">Average Pace</span>
                      </div>
                      <div className="font-bold text-3xl text-purple-400">
                        {formatPace(session.averagePace)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {session.maxSpeed && session.maxSpeed > 0 && (
                  <Card className="bg-gradient-to-br from-red-900/50 to-pink-900/50 border-red-500/30">
                    <CardContent className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Activity className="text-red-400" size={28} />
                        <span className="text-lg font-semibold text-gray-300">Max Speed</span>
                      </div>
                      <div className="font-bold text-3xl text-red-400">
                        {session.maxSpeed.toFixed(1)} km/h
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Workout Pattern */}
            <Card className="bg-gray-700/50 border-gray-600/50">
              <CardContent className="p-6 text-center">
                <div className="text-gray-400 text-lg mb-3 font-semibold">Workout Pattern</div>
                <div className="font-semibold text-xl text-white">
                  {isFreeRounds ? (
                    <span className="flex items-center gap-3 justify-center flex-wrap">
                      <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-lg px-3 py-1">
                        Free Mode
                      </Badge>
                      <span>{session.runTime}s run / {session.walkTime}s walk</span>
                    </span>
                  ) : (
                    `${session.runTime}s run / ${session.walkTime}s walk × ${session.rounds} rounds`
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Route Map */}
        {hasGPSData && (
          <Card className="bg-gray-800/80 border-gray-600/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-2xl font-bold flex items-center gap-3">
                <Map className="text-blue-400" size={28} />
                Your Route
                <Button
                  onClick={() => setShowMap(!showMap)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/50"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={onNewWorkout}
            className="w-full py-8 rounded-xl text-2xl font-bold flex items-center justify-center gap-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105 shadow-lg"
          >
            <RotateCcw size={28} />
            <span>New Workout</span>
          </Button>
          
          <Button
            onClick={onViewStats}
            variant="secondary"
            className="w-full py-8 rounded-xl text-2xl font-bold flex items-center justify-center gap-4 bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:from-gray-600 hover:to-gray-500 transition-all transform hover:scale-105 shadow-lg"
          >
            <BarChart3 size={28} />
            <span>View Stats</span>
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col gap-3">
          {/* PWA Install Button */}
          <div className="flex justify-center">
            <PWAInstallButton 
              variant="outline" 
              className="bg-blue-900/30 border-blue-500/50 text-blue-300 hover:bg-blue-800/50 py-3 px-6 text-lg"
            />
          </div>
          
          <Button
            onClick={onDontSave}
            variant="destructive"
            className="w-full py-4 rounded-xl text-xl font-bold flex items-center justify-center gap-3 bg-red-600/80 text-white hover:bg-red-500/80 transition-all"
          >
            <XCircle size={24} />
            <span>Don't save</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
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

            {/* Distance Display - Always show, even if 0 */}
            {sessionDistance >= 0 && (
              <div className="border-t border-gray-700 pt-4 text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-base mb-1">
                  <MapPin size={16} />
                  {sessionDistance > 0 ? 'Distance Covered' : 'Distance (GPS not used)'}
                </div>
                <div className={`font-extrabold text-3xl ${sessionDistance > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  {formatDistance(sessionDistance)}
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