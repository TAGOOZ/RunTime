import React from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Target, Clock, MapPin, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '../lib/utils';

interface SessionData {
  id?: string | number;
  date: string;
  total_duration: number;
  distance: number;
  average_pace?: number;
  total_run_time: number;
  total_walk_time: number;
}

interface PerformanceChartProps {
  currentSession: SessionData;
  previousSessions: SessionData[];
  className?: string;
}

interface ChartDataPoint {
  date: string;
  distance: number;
  pace: number;
  duration: number;
  isCurrent?: boolean;
}

interface MetricComparison {
  name: string;
  icon: React.ReactNode;
  current: string;
  previous: string;
  change: number;
  trend: 'up' | 'down' | 'same';
  unit: string;
  isImprovement: boolean;
}

export function PerformanceChart({ currentSession, previousSessions, className = '' }: PerformanceChartProps) {
  // Prepare chart data
  const chartData: ChartDataPoint[] = [
    ...previousSessions.slice(-5).map(session => ({
      date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      distance: (session.distance || 0) / 1000, // Convert to km
      pace: session.average_pace || 0,
      duration: session.total_duration / 60, // Convert to minutes
      isCurrent: false
    })),
    {
      date: 'Today',
      distance: (currentSession.distance || 0) / 1000,
      pace: currentSession.average_pace || 0,
      duration: currentSession.total_duration / 60,
      isCurrent: true
    }
  ];

  // Calculate comparisons with the most recent previous session
  const lastSession = previousSessions[0];
  const comparisons: MetricComparison[] = [];

  if (lastSession) {
    // Distance comparison
    const currentDistance = (currentSession.distance || 0) / 1000;
    const previousDistance = (lastSession.distance || 0) / 1000;
    const distanceChange = previousDistance > 0 
      ? ((currentDistance - previousDistance) / previousDistance) * 100 
      : 0;
    
    comparisons.push({
      name: 'Distance',
      icon: <MapPin size={20} className="text-green-400" />,
      current: `${currentDistance.toFixed(2)} km`,
      previous: `${previousDistance.toFixed(2)} km`,
      change: distanceChange,
      trend: distanceChange > 0 ? 'up' : distanceChange < 0 ? 'down' : 'same',
      unit: 'km',
      isImprovement: distanceChange > 0
    });

    // Pace comparison (lower is better for pace)
    if (currentSession.average_pace && lastSession.average_pace) {
      const paceChange = ((currentSession.average_pace - lastSession.average_pace) / lastSession.average_pace) * 100;
      
      comparisons.push({
        name: 'Pace',
        icon: <Zap size={20} className="text-cyan-400" />,
        current: formatPace(currentSession.average_pace),
        previous: formatPace(lastSession.average_pace),
        change: Math.abs(paceChange),
        trend: paceChange < 0 ? 'up' : paceChange > 0 ? 'down' : 'same',
        unit: '/km',
        isImprovement: paceChange < 0 // Lower pace is better
      });
    }

    // Time comparison
    const timeChange = ((currentSession.total_duration - lastSession.total_duration) / lastSession.total_duration) * 100;
    
    comparisons.push({
      name: 'Total Time',
      icon: <Clock size={20} className="text-purple-400" />,
      current: formatTime(currentSession.total_duration),
      previous: formatTime(lastSession.total_duration),
      change: Math.abs(timeChange),
      trend: timeChange > 0 ? 'down' : timeChange < 0 ? 'up' : 'same',
      unit: '',
      isImprovement: false // Time can be good or bad depending on context
    });
  }

  const formatPace = (pace: number) => {
    if (pace < 60) {
      return `${pace.toFixed(1)} min/km`;
    }
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace % 1) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same', isImprovement: boolean) => {
    if (trend === 'same') return <Minus size={16} className="text-gray-400" />;
    
    const iconClass = isImprovement ? 'text-green-400' : 'text-red-400';
    return trend === 'up' ? 
      <TrendingUp size={16} className={iconClass} /> : 
      <TrendingDown size={16} className={iconClass} />;
  };

  const getChangeColor = (isImprovement: boolean) => {
    return isImprovement ? 'text-green-400' : 'text-red-400';
  };

  if (previousSessions.length === 0) {
    return (
      <Card className={`bg-gray-800 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Target className="text-blue-400" size={24} />
            Performance Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-gray-400 text-lg">
            Complete more workouts to see your performance trends!
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Your progress chart will appear here after your next session.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance Chart */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <Target className="text-blue-400" size={24} />
            Performance vs Last 5 Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="distance"
                  orientation="left"
                  stroke="#10B981"
                  fontSize={12}
                  label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#10B981' } }}
                />
                <YAxis 
                  yAxisId="duration"
                  orientation="right"
                  stroke="#8B5CF6"
                  fontSize={12}
                  label={{ value: 'Duration (min)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#8B5CF6' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'distance') return [`${value.toFixed(2)} km`, 'Distance'];
                    if (name === 'duration') return [`${value.toFixed(1)} min`, 'Duration'];
                    if (name === 'pace') return [`${value.toFixed(1)} min/km`, 'Pace'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="distance"
                  type="monotone" 
                  dataKey="distance" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={payload?.isCurrent ? 8 : 4} 
                        fill={payload?.isCurrent ? "#F59E0B" : "#10B981"}
                        stroke={payload?.isCurrent ? "#FBBF24" : "#10B981"}
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="Distance (km)"
                />
                <Line 
                  yAxisId="duration"
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={payload?.isCurrent ? 8 : 4} 
                        fill={payload?.isCurrent ? "#F59E0B" : "#8B5CF6"}
                        stroke={payload?.isCurrent ? "#FBBF24" : "#8B5CF6"}
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="Duration (min)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Current session highlight */}
          <div className="flex justify-center mb-4">
            <Badge className="bg-yellow-500 text-black text-sm px-3 py-1">
              ⭐ Today's Session
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="text-green-400" size={20} />
            Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparisons.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {metric.icon}
                  <div>
                    <div className="text-white font-semibold">{metric.name}</div>
                    <div className="text-sm text-gray-400">
                      {metric.previous} → {metric.current}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${getChangeColor(metric.isImprovement)}`}>
                    {metric.change > 0 ? (
                      `${metric.isImprovement ? '+' : ''}${metric.change.toFixed(1)}%`
                    ) : (
                      '0%'
                    )}
                  </div>
                  {getTrendIcon(metric.trend, metric.isImprovement)}
                </div>
              </div>
            ))}
          </div>

          {/* Key Insights */}
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
              <Target size={16} />
              Key Insights
            </h4>
            <div className="text-sm text-gray-300 space-y-1">
              {comparisons.length > 0 ? (
                <>
                  {comparisons.find(c => c.isImprovement) && (
                    <div className="text-green-400">
                      ✓ Great improvement in {comparisons.filter(c => c.isImprovement).map(c => c.name.toLowerCase()).join(' and ')}
                    </div>
                  )}
                  {comparisons.find(c => !c.isImprovement && c.trend !== 'same') && (
                    <div className="text-yellow-400">
                      ⚠ Focus on improving {comparisons.filter(c => !c.isImprovement && c.trend !== 'same').map(c => c.name.toLowerCase()).join(' and ')}
                    </div>
                  )}
                  {comparisons.every(c => c.trend === 'same') && (
                    <div className="text-gray-400">
                      → Consistent performance - try varying your workout intensity
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-400">Complete more sessions to see detailed insights</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}