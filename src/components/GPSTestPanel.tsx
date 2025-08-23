import React, { useState, useRef } from 'react';
import { Play, Square, MapPin, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GPSSimulator, SimulationConfig, TEST_LOCATIONS, createTestScenario, SimulatedGPSPoint } from '../lib/gpsSimulator';
import { GPSTracker, GPSPoint } from '../lib/gps';

interface GPSTestPanelProps {
  onClose: () => void;
}

export function GPSTestPanel({ onClose }: GPSTestPanelProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState<{
    points: SimulatedGPSPoint[];
    distance: number;
    duration: number;
  }>({
    points: [],
    distance: 0,
    duration: 0
  });
  
  const simulatorRef = useRef<GPSSimulator | null>(null);
  const gpsTrackerRef = useRef<GPSTracker | null>(null);
  const startTimeRef = useRef<number>(0);

  const [config, setConfig] = useState<SimulationConfig>({
    startLat: TEST_LOCATIONS.default.lat,
    startLng: TEST_LOCATIONS.default.lng,
    duration: 60, // 1 minute for testing
    speed: 10, // 10 km/h
    updateInterval: 1000, // 1 second
    route: 'circular',
    accuracy: 5
  });

  const startSimulation = () => {
    if (isSimulating) return;

    setIsSimulating(true);
    startTimeRef.current = Date.now();
    setSimulationData({ points: [], distance: 0, duration: 0 });

    // Create GPS tracker to calculate distance
    gpsTrackerRef.current = new GPSTracker((point, totalDistance) => {
      setSimulationData(prev => ({
        ...prev,
        distance: totalDistance,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
      }));
    });

    // Create simulator
    simulatorRef.current = new GPSSimulator(config, (point) => {
      // Convert simulated point to GPS point format
      const gpsPoint: GPSPoint = {
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        accuracy: point.accuracy
      };

      // Add to tracker for distance calculation
      if (gpsTrackerRef.current) {
        (gpsTrackerRef.current as any).points.push(gpsPoint);
        const totalDistance = (gpsTrackerRef.current as any).calculateTotalDistance();
        gpsTrackerRef.current.onUpdate?.(gpsPoint, totalDistance);
      }

      // Update display data
      setSimulationData(prev => ({
        ...prev,
        points: [...prev.points, point]
      }));
    });

    simulatorRef.current.start();
  };

  const stopSimulation = () => {
    if (!isSimulating) return;

    setIsSimulating(false);
    simulatorRef.current?.stop();
    simulatorRef.current = null;
    gpsTrackerRef.current = null;
  };

  const loadPreset = (preset: 'walk' | 'jog' | 'run' | 'sprint') => {
    const scenario = createTestScenario(preset);
    setConfig(scenario);
  };

  const formatDistance = (distance: number) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)} km`;
    }
    return `${Math.round(distance)} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <MapPin className="text-green-400" size={24} />
            GPS Simulation Test
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="ml-auto text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Presets */}
          <div>
            <h3 className="text-white font-semibold mb-3">Quick Test Scenarios</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'walk', label: 'Walking', speed: '5 km/h', icon: '🚶' },
                { key: 'jog', label: 'Jogging', speed: '8 km/h', icon: '🏃' },
                { key: 'run', label: 'Running', speed: '12 km/h', icon: '🏃‍♂️' },
                { key: 'sprint', label: 'Sprinting', speed: '20 km/h', icon: '💨' }
              ].map(preset => (
                <Button
                  key={preset.key}
                  onClick={() => loadPreset(preset.key as any)}
                  variant="outline"
                  className="flex flex-col items-center p-3 h-auto bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  disabled={isSimulating}
                >
                  <span className="text-lg mb-1">{preset.icon}</span>
                  <span className="font-semibold">{preset.label}</span>
                  <span className="text-xs text-gray-400">{preset.speed}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Settings size={16} />
              Current Configuration
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Speed:</span>
                <span className="text-white ml-2">{config.speed} km/h</span>
              </div>
              <div>
                <span className="text-gray-400">Duration:</span>
                <span className="text-white ml-2">{config.duration}s</span>
              </div>
              <div>
                <span className="text-gray-400">Route:</span>
                <span className="text-white ml-2 capitalize">{config.route}</span>
              </div>
              <div>
                <span className="text-gray-400">Update Rate:</span>
                <span className="text-white ml-2">{config.updateInterval}ms</span>
              </div>
            </div>
          </div>

          {/* Simulation Status */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Simulation Status</h3>
              <Badge variant={isSimulating ? "default" : "secondary"} className={isSimulating ? "bg-green-600" : ""}>
                {isSimulating ? "Running" : "Stopped"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {simulationData.points.length}
                </div>
                <div className="text-xs text-gray-400">GPS Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {formatDistance(simulationData.distance)}
                </div>
                <div className="text-xs text-gray-400">Distance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">
                  {formatDuration(simulationData.duration)}
                </div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>
          </div>

          {/* Latest GPS Point */}
          {simulationData.points.length > 0 && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Latest GPS Point</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-400">Latitude:</span>
                  <span className="text-white ml-2 font-mono">
                    {simulationData.points[simulationData.points.length - 1]?.latitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Longitude:</span>
                  <span className="text-white ml-2 font-mono">
                    {simulationData.points[simulationData.points.length - 1]?.longitude.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Accuracy:</span>
                  <span className="text-white ml-2">
                    ±{simulationData.points[simulationData.points.length - 1]?.accuracy}m
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              onClick={startSimulation}
              disabled={isSimulating}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play size={16} className="mr-2" />
              Start Simulation
            </Button>
            <Button
              onClick={stopSimulation}
              disabled={!isSimulating}
              variant="destructive"
              className="flex-1"
            >
              <Square size={16} className="mr-2" />
              Stop Simulation
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-400 bg-gray-700/30 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} />
              <span className="font-semibold">Test Information</span>
            </div>
            <p>
              This GPS simulator generates realistic movement patterns for testing the GPS tracking functionality.
              It simulates different routes (straight, circular, figure-8, random) with configurable speed and accuracy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}