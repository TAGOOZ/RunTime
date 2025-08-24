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
  Zap,
  MapPin,
  Navigation,
  BarChart3,
  LineChart
} from 'lucide-react';
import { formatTime } from '../lib/utils';
import { getAllSessionsWithGPS } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RouteMap } from './RouteMap';
import { GPSPoint } from '../lib/gps';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { PerformanceChart } from './PerformanceChart';

interface StatsScreenProps {
  onBack: () => void;
}

interface CalendarDay {
  date: string;
  sessions: number;
  runTime: number;
  walkTime: number;
  distance: number;
  averagePace: number;
}

type Period = 'week' | 'month' | 'all';


export function StatsScreen({ onBack }: StatsScreenProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoutePoints, setSelectedRoutePoints] = useState<GPSPoint[]>([]);
  const [sessions, setSessions] = useState<Array<{
    session: any;
    gpsPoints?: GPSPoint[];
  }>>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [activeChart, setActiveChart] = useState<'trends' | 'distribution' | 'pace' | 'calendar'>('trends');

  const loadSessions = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          gps_tracks (
            points
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        const localData = await getAllSessionsWithGPS();
        setSessions(localData);
      } else {
        const formattedData = data.map(session => ({
          session: {
            id: session.id,
            run_time: session.run_time,
            walk_time: session.walk_time,
            rounds: session.rounds,
            total_duration: session.total_duration,
            total_run_time: session.total_run_time,
            total_walk_time: session.total_walk_time,
            distance: session.distance ?? 0,
            average_pace: session.average_pace,
            max_speed: session.max_speed,
            date: session.date,
            synced: 1
          },
          gpsPoints: session.gps_tracks?.[0]?.points || undefined
        }));
        setSessions(formattedData);
      }
    } catch (error) {
      try {
        const localData = await getAllSessionsWithGPS();
        setSessions(localData);
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
      .filter(({ session }) => {
        const d = new Date(session.date);
        return d.getFullYear() === displayYear && d.getMonth() === displayMonth;
      })
      .reduce((acc: Record<string, CalendarDay>, { session }) => {
        const dateStr = new Date(session.date).toLocaleDateString();
        if (!acc[dateStr]) {
          acc[dateStr] = { 
            date: dateStr, 
            sessions: 0, 
            runTime: 0, 
            walkTime: 0, 
            distance: 0,
            averagePace: 0
          };
        }
  acc[dateStr].sessions += 1;
        acc[dateStr].runTime += session.total_run_time || 0;
        acc[dateStr].walkTime += session.total_walk_time || 0;
        acc[dateStr].distance += session.distance || 0;
        if (session.average_pace) {
          acc[dateStr].averagePace = (acc[dateStr].averagePace + session.average_pace) / 2;
        }
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
  const filterSessionsByPeriod = (sessions: Array<{ session: any; gpsPoints?: GPSPoint[] }>, period: Period) => {
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

    return sessions.filter(({ session }) => new Date(session.date) >= cutoffDate);
  };

  const getStats = () => {
    const filteredSessions = filterSessionsByPeriod(sessions, period);

    const totalSessions = filteredSessions.length;
    const totalRunTime = filteredSessions.reduce((sum, { session }) => sum + session.total_run_time, 0);
    const totalWalkTime = filteredSessions.reduce((sum, { session }) => sum + session.total_walk_time, 0);
    const totalDuration = filteredSessions.reduce((sum, { session }) => sum + session.total_duration, 0);
    const totalDistance = filteredSessions.reduce((sum, { session }) => sum + (session.distance || 0), 0);

    // Calculate averages
    const avgWorkoutTime = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;
    const avgRunTime = totalSessions > 0 ? Math.round(totalRunTime / totalSessions) : 0;
    const avgWalkTime = totalSessions > 0 ? Math.round(totalWalkTime / totalSessions) : 0;
    const avgDistance = totalSessions > 0 ? totalDistance / totalSessions : 0;
    
    // Calculate average pace from sessions with pace data
    const sessionsWithPace = filteredSessions.filter(({ session }) => session.average_pace > 0);
    const avgPace = sessionsWithPace.length > 0 
      ? sessionsWithPace.reduce((sum, { session }) => sum + session.average_pace, 0) / sessionsWithPace.length
      : 0;

    return {
      totalSessions,
      totalRunTime,
      totalWalkTime,
      totalDuration,
      totalDistance,
      avgWorkoutTime,
      avgRunTime,
      avgWalkTime,
      avgDistance,
      avgPace
    };
  };

  const stats = getStats();

  // Prepare chart data
  const getChartData = () => {
    const filteredSessions = filterSessionsByPeriod(sessions, period);
    
    // Group sessions by date for trends
    const dailyData: Record<string, {
      date: string;
      workouts: number;
      totalDistance: number;
      totalTime: number;
      avgPace: number;
      runTime: number;
      walkTime: number;
    }> = {};

    filteredSessions.forEach(({ session }) => {
      const date = new Date(session.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          workouts: 0,
          totalDistance: 0,
          totalTime: 0,
          avgPace: 0,
          runTime: 0,
          walkTime: 0
        };
      }
      
      dailyData[date].workouts += 1;
      dailyData[date].totalDistance += session.distance || 0;
      dailyData[date].totalTime += session.total_duration;
      dailyData[date].runTime += session.total_run_time;
      dailyData[date].walkTime += session.total_walk_time;
      
      if (session.average_pace && session.average_pace > 0) {
        dailyData[date].avgPace = session.average_pace;
      }
    });

    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const chartData = getChartData();

  // Pie chart data for time distribution
  const timeDistributionData = [
    { name: 'Running', value: stats.totalRunTime, color: '#FF5722' },
    { name: 'Walking', value: stats.totalWalkTime, color: '#0288D1' }
  ];

  // Pace trend data
  const paceData = sessions
    .filter(({ session }) => session.average_pace && session.average_pace > 0)
    .slice(-10) // Last 10 sessions with pace data
    .map(({ session }, index) => ({
      session: `#${index + 1}`,
      pace: session.average_pace,
      distance: (session.distance || 0) / 1000 // Convert to km
    }));

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
              <MapPin className="mx-auto mb-2 text-green-400" size={24} />
              <div className="text-xl font-bold text-white">{stats.totalDistance >= 1000 ? `${(stats.totalDistance/1000).toFixed(2)} km` : `${Math.round(stats.totalDistance)} m`}</div>
              <div className="text-sm text-gray-400">Total Distance</div>
            </CardContent>
          </Card>
          
          {stats.avgPace > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 text-center">
                <Navigation className="mx-auto mb-2 text-cyan-400" size={24} />
                <div className="text-xl font-bold text-white">
                  {stats.avgPace < 60 
                    ? `${stats.avgPace.toFixed(1)} min/km`
                    : `${Math.floor(stats.avgPace)}:${Math.round((stats.avgPace % 1) * 60).toString().padStart(2, '0')} /km`
                  }
                </div>
                <div className="text-sm text-gray-400">Avg Pace</div>
              </CardContent>
            </Card>
          )}
          
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

        {/* Chart Section */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              {/* Chart Navigation */}
              <div className="flex flex-wrap justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 size={24} />
                  Analytics Dashboard
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'trends', label: 'Trends', icon: LineChart },
                    { key: 'distribution', label: 'Time Split', icon: Target },
                    { key: 'pace', label: 'Pace', icon: Zap },
                    { key: 'calendar', label: 'Calendar', icon: Calendar },
                    { key: 'performance', label: 'Performance', icon: TrendingUp }
                  ].map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      onClick={() => setActiveChart(key as any)}
                      variant={activeChart === key ? "default" : "ghost"}
                      size="sm"
                      className={activeChart === key 
                        ? "bg-yellow-400 text-black hover:bg-yellow-300" 
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                      }
                    >
                      <Icon size={16} className="mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Chart Content */}
              <div className="h-80">
                {activeChart === 'performance' && sessions.length > 1 && (
                  <div className="h-full overflow-y-auto">
                    <PerformanceChart
                      currentSession={{
                        date: sessions[0]?.session.date || new Date().toISOString(),
                        total_duration: sessions[0]?.session.total_duration || 0,
                        distance: sessions[0]?.session.distance || 0,
                        average_pace: sessions[0]?.session.average_pace,
                        total_run_time: sessions[0]?.session.total_run_time || 0,
                        total_walk_time: sessions[0]?.session.total_walk_time || 0
                      }}
                      previousSessions={sessions.slice(1, 6).map(({ session }) => session)}
                      className="h-auto"
                    />
                  </div>
                )}

                {activeChart === 'trends' && chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'totalDistance') {
                            return [`${(value / 1000).toFixed(2)} km`, 'Distance'];
                          }
                          if (name === 'totalTime') {
                            return [formatTime(value), 'Total Time'];
                          }
                          return [value, name];
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalDistance" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        name="Distance (m)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="workouts" 
                        stroke="#F59E0B" 
                        strokeWidth={3}
                        dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                        name="Workouts"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )}

                {activeChart === 'distribution' && stats.totalSessions > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${formatTime(value)} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {timeDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                        formatter={(value: any) => [formatTime(value), 'Time']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {activeChart === 'pace' && paceData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={paceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="session" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#9CA3AF" 
                        fontSize={12}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6'
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'pace') {
                            return [`${value.toFixed(1)} min/km`, 'Pace'];
                          }
                          if (name === 'distance') {
                            return [`${value.toFixed(2)} km`, 'Distance'];
                          }
                          return [value, name];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="pace" 
                        stroke="#8B5CF6" 
                        fill="#8B5CF6" 
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {activeChart === 'calendar' && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Calendar view is shown below</p>
                      <p className="text-sm">Switch to other charts to see data visualizations</p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {((activeChart === 'trends' && chartData.length === 0) ||
                  (activeChart === 'distribution' && stats.totalSessions === 0) ||
                  (activeChart === 'pace' && paceData.length === 0) ||
                  (activeChart === 'performance' && sessions.length <= 1)) && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">
                        {activeChart === 'performance' ? 'Need more sessions for comparison' : 'No data available'}
                      </p>
                      <p className="text-sm">
                        {activeChart === 'performance' 
                          ? 'Complete at least 2 workouts to see performance comparisons'
                          : 'Complete some workouts to see your analytics'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                  ({ session }) => new Date(session.date).toLocaleDateString() === selectedDay
                );
                
                if (daySessions.length === 0) {
                  return <div className="text-gray-400 py-4 text-center">No workouts for this day.</div>;
                }
                
                // Calculate totals for all sessions on this day
                const totalRunTime = daySessions.reduce((sum, { session }) => sum + session.total_run_time, 0);
                const totalWalkTime = daySessions.reduce((sum, { session }) => sum + session.total_walk_time, 0);
                const totalDuration = daySessions.reduce((sum, { session }) => sum + session.total_duration, 0);
                const totalDistance = daySessions.reduce((sum, { session }) => sum + (session.distance || 0), 0);
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
                      {daySessions.map(({ session, gpsPoints }, idx) => (
                        <div key={idx} className="bg-gray-700/30 rounded-lg p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-cyan-300">Run:</div>
                            <div>{formatTime(session.total_run_time)}</div>
                            <div className="text-blue-300">Walk:</div>
                            <div>{formatTime(session.total_walk_time)}</div>
                            <div className="text-lime-300">Distance:</div>
                            <div>{session.distance >= 1000 ? `${(session.distance/1000).toFixed(2)} km` : `${Math.round(session.distance || 0)} m`}</div>
                            <div className="text-gray-300">Total:</div>
                            <div className="font-medium">{formatTime(session.total_duration)}</div>
                            {session.average_pace && session.average_pace > 0 && (
                              <>
                                <div className="text-purple-300">Pace:</div>
                                <div>
                                  {session.average_pace < 60 
                                    ? `${session.average_pace.toFixed(1)} min/km`
                                    : `${Math.floor(session.average_pace)}:${Math.round((session.average_pace % 1) * 60).toString().padStart(2, '0')} /km`
                                  }
                                </div>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            Started at {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {gpsPoints && gpsPoints.length > 0 && (
                            <Button
                              onClick={() => {
                                setSelectedRoutePoints(gpsPoints);
                                setShowRouteModal(true);
                              }}
                              size="sm"
                              className="w-full mt-2 bg-green-600 hover:bg-green-700"
                            >
                              View Route
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Route Modal */}
        {showRouteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
            onClick={() => setShowRouteModal(false)}
          >
            <div
              className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Workout Route</h3>
                <button
                  className="text-gray-400 hover:text-white text-xl"
                  onClick={() => setShowRouteModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <RouteMap points={selectedRoutePoints} className="h-96" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}