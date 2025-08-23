import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Clock, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Activity,
  Zap
} from 'lucide-react';
import { formatTime } from '../lib/utils';
import { getSessions } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StatsScreenProps {
  onBack: () => void;
}

interface CalendarDay {
  date: string;
  sessions: number;
  runTime: number;
  walkTime: number;
  distance: number;
}

type Period = 'week' | 'month' | 'all';


export function StatsScreen({ onBack }: StatsScreenProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());

  const loadSessions = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        const localData = await getSessions();
        setSessions(localData);
      } else {
        const formattedData = data.map(session => ({
          id: session.id,
          run_time: session.run_time,
          walk_time: session.walk_time,
          rounds: session.rounds,
          total_duration: session.total_duration,
          total_run_time: session.total_run_time,
          total_walk_time: session.total_walk_time,
          distance: session.distance ?? 0,
          date: session.date,
          synced: 1
        }));
        setSessions(formattedData);
      }
    } catch (error) {
      try {
        const localData = await getSessions();
  // Patch localData to ensure distance is always present
  setSessions(localData.map(s => ({ ...s, distance: s.distance ?? 0 })));
      } catch (localError) {
        // handle error
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadSessions();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Prepare data for calendar view
  let calendarDayArr: CalendarDay[] = [];
  if (sessions && Array.isArray(sessions)) {
    const calendarDays: Record<string, CalendarDay> = sessions
      .filter((s: any) => {
        const d = new Date(s.date);
        return d.getFullYear() === displayYear && d.getMonth() === displayMonth;
      })
      .reduce((acc: Record<string, CalendarDay>, s: any) => {
        const dateStr = new Date(s.date).toLocaleDateString();
  if (!acc[dateStr]) acc[dateStr] = { date: dateStr, sessions: 0, runTime: 0, walkTime: 0, distance: 0 };
  acc[dateStr].sessions += 1;
  acc[dateStr].runTime += s.total_run_time || 0;
  acc[dateStr].walkTime += s.total_walk_time || 0;
  acc[dateStr].distance += s.distance || 0;
        return acc;
      }, {});
    calendarDayArr = Object.values(calendarDays);
  }

  // Month navigation handlers
  const handlePrevMonth = () => {
    setDisplayMonth(prev => {
      if (prev === 0) {
        setDisplayYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };
  
  const handleNextMonth = () => {
    setDisplayMonth(prev => {
      if (prev === 11) {
        setDisplayYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  // Get the days for the current month
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const daysInMonth = getDaysInMonth(displayYear, displayMonth);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get session data for a specific day
  const getSessionDataForDay = (day: number | null) => {
    if (!day) return null;
    const dateStr = new Date(displayYear, displayMonth, day).toLocaleDateString();
    return calendarDayArr.find(d => d.date === dateStr) || null;
  };

  // Filter sessions by period
  const filterSessionsByPeriod = (sessions: any[], period: Period): any[] => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (period) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        cutoffDate.setFullYear(2000);
        break;
    }

    return sessions.filter(session => new Date(session.date) >= cutoffDate);
  };

  const getStats = () => {
    const filteredSessions = filterSessionsByPeriod(sessions, period);

    const totalSessions = filteredSessions.length;
    const totalRunTime = filteredSessions.reduce((sum, session) => sum + session.total_run_time, 0);
    const totalWalkTime = filteredSessions.reduce((sum, session) => sum + session.total_walk_time, 0);
    const totalDuration = filteredSessions.reduce((sum, session) => sum + session.total_duration, 0);
    const totalDistance = filteredSessions.reduce((sum, session) => sum + (session.distance || 0), 0);

    // Calculate averages
    const avgWorkoutTime = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const avgRunTime = totalSessions > 0 ? Math.round(totalRunTime / totalSessions) : 0;
    const avgWalkTime = totalSessions > 0 ? Math.round(totalWalkTime / totalSessions) : 0;
    const avgDistance = totalSessions > 0 ? totalDistance / totalSessions : 0;

    return {
      totalSessions,
      totalRunTime,
      totalWalkTime,
      totalDuration,
      totalDistance,
      avgWorkoutTime,
      avgRunTime,
      avgWalkTime,
      avgDistance
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">Loading stats...</div>
          <div className="text-gray-400">Fetching your workout data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onBack}
            className="bg-yellow-400 text-black hover:bg-yellow-300 h-12 w-12 p-0 flex items-center justify-center rounded-lg"
            size="icon"
          >
            ←
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-center">Workout Stats</h1>
          <Button
            onClick={loadSessions}
            disabled={refreshing}
            className="bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 h-12 w-12 p-0 flex items-center justify-center rounded-lg"
            size="icon"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>


        {/* Period selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800 p-2 rounded-lg flex gap-2">
            {(['week', 'month', 'all'] as const).map((p) => (
              <Button
                key={p}
                onClick={() => setPeriod(p)}
                variant={period === p ? "default" : "ghost"}
                className={period === p 
                  ? "bg-yellow-400 text-black hover:bg-yellow-300" 
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
                }
                size="sm"
              >
                {p === 'all' ? 'All Time' : `Last ${p}`}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats cards - Updated to 3 columns for better layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <span className="mx-auto mb-2 text-green-400 block" style={{ fontSize: 24 }}>🗺️</span>
              <div className="text-xl font-bold text-white">{stats.totalDistance >= 1000 ? `${(stats.totalDistance/1000).toFixed(2)} km` : `${Math.round(stats.totalDistance)} m`}</div>
              <div className="text-sm text-gray-400">Total Distance</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <Target className="mx-auto mb-2 text-orange-400" size={24} />
              <div className="text-xl font-bold text-white">{stats.totalSessions}</div>
              <div className="text-sm text-gray-400">Workouts</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-2 text-cyan-400" size={24} />
              <div className="text-xl font-bold text-white">{formatTime(stats.totalDuration)}</div>
              <div className="text-sm text-gray-400">Total Time</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <Activity className="mx-auto mb-2 text-purple-400" size={24} />
              <div className="text-xl font-bold text-white">{formatTime(stats.avgWorkoutTime)}</div>
              <div className="text-sm text-gray-400">Avg. Workout</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto mb-2 text-green-400" size={24} />
              <div className="text-xl font-bold text-white">{formatTime(stats.totalRunTime)}</div>
              <div className="text-sm text-gray-400">Total Run</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <Zap className="mx-auto mb-2 text-blue-400" size={24} />
              <div className="text-xl font-bold text-white">{formatTime(stats.avgRunTime)}</div>
              <div className="text-sm text-gray-400">Avg. Run</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <Calendar className="mx-auto mb-2 text-yellow-400" size={24} />
              <div className="text-xl font-bold text-white">{formatTime(stats.totalWalkTime)}</div>
              <div className="text-sm text-gray-400">Total Walk</div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="mb-8 bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={20} /> Activity Calendar
            </h2>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handlePrevMonth} 
                className="text-gray-300 hover:text-white"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-lg text-white font-semibold">
                {new Date(displayYear, displayMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleNextMonth} 
                className="text-gray-300 hover:text-white"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {/* Responsive Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 p-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, index) => {
              const sessionData = getSessionDataForDay(day);
              const hasSession = sessionData && sessionData.sessions > 0;
              
              return (
                <div 
                  key={index} 
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center p-1 text-sm
                    ${day ? 'cursor-pointer hover:bg-gray-700' : ''}
                    ${hasSession ? 'bg-green-900/50 border border-green-700' : 'bg-gray-700/30'}
                  `}
                  onClick={() => {
                    if (day) {
                      const dateStr = new Date(displayYear, displayMonth, day).toLocaleDateString();
                      setSelectedDay(dateStr);
                      setShowModal(true);
                    }
                  }}
                >
                  {day && (
                    <>
                      <span className={`text-xs ${hasSession ? 'font-bold text-white' : 'text-gray-400'}`}>
                        {day}
                      </span>
                      {hasSession && (
                        <div className="w-1 h-1 rounded-full bg-green-500 mt-1"></div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center mt-4 text-xs text-gray-400">
            <div className="flex items-center mr-4">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
              <span>Workout day</span>
            </div>
          </div>
        </div>

        {/* Day Details Modal */}
        {showModal && selectedDay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md relative max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
              
              {(() => {
                const daySessions = sessions.filter(
                  s => new Date(s.date).toLocaleDateString() === selectedDay
                );
                
                if (daySessions.length === 0) {
                  return <div className="text-gray-400 py-4 text-center">No workouts for this day.</div>;
                }
                
                // Calculate totals for all sessions on this day
                const totalRunTime = daySessions.reduce((sum, session) => sum + session.total_run_time, 0);
                const totalWalkTime = daySessions.reduce((sum, session) => sum + session.total_walk_time, 0);
                const totalDuration = daySessions.reduce((sum, session) => sum + session.total_duration, 0);
                const totalDistance = daySessions.reduce((sum, session) => sum + (session.distance || 0), 0);
                return (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Workouts on {selectedDay}</h3>
                    {/* Summary section with totals */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold mb-2 text-center">Day Summary</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-cyan-300">Total Runs:</div>
                        <div className="font-medium">{formatTime(totalRunTime)}</div>
                        <div className="text-blue-300">Total Walks:</div>
                        <div className="font-medium">{formatTime(totalWalkTime)}</div>
                        <div className="text-green-300">Total Time:</div>
                        <div className="font-medium text-lg">{formatTime(totalDuration)}</div>
                        <div className="text-lime-300">Total Distance:</div>
                        <div className="font-medium">{totalDistance >= 1000 ? `${(totalDistance/1000).toFixed(2)} km` : `${Math.round(totalDistance)} m`}</div>
                        <div className="text-gray-300">Sessions:</div>
                        <div className="font-medium">{daySessions.length}</div>
                      </div>
                    </div>
                    {/* Individual sessions */}
                    <h4 className="text-md font-semibold">Individual Sessions</h4>
                    <div className="space-y-3">
                      {daySessions.map((s, idx) => (
                        <div key={idx} className="bg-gray-700/30 rounded-lg p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-cyan-300">Run:</div>
                            <div>{formatTime(s.total_run_time)}</div>
                            <div className="text-blue-300">Walk:</div>
                            <div>{formatTime(s.total_walk_time)}</div>
                            <div className="text-lime-300">Distance:</div>
                            <div>{s.distance >= 1000 ? `${(s.distance/1000).toFixed(2)} km` : `${Math.round(s.distance || 0)} m`}</div>
                            <div className="text-gray-300">Total:</div>
                            <div className="font-medium">{formatTime(s.total_duration)}</div>
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            Started at {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}