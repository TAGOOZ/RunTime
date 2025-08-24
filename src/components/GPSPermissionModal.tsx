import React from 'react';
import { MapPin, Battery, Zap, Navigation, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GPSPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnableGPS: () => void;
  onDisableGPS: () => void;
}

export function GPSPermissionModal({ isOpen, onClose, onEnableGPS, onDisableGPS }: GPSPermissionModalProps) {
  if (!isOpen) return null;

  const handleEnableGPS = async () => {
    try {
      // Add loading state and timeout
      const timeoutId = setTimeout(() => {
        console.warn('GPS permission timeout, proceeding without GPS');
        onClose();
      }, 10000); // 10 second timeout
      
      await onEnableGPS();
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('GPS enable failed:', error);
      // Still close modal even if GPS fails
      onClose();
    }
  };

  const handleDisableGPS = () => {
    onDisableGPS();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
      onClick={(e) => {
        // Close modal if clicking outside
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 w-full max-w-lg shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-2xl flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <MapPin className="text-green-400" size={28} />
            </div>
            GPS Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-300 text-lg leading-relaxed">
            Enable GPS tracking to measure distance, pace, and view your route after the workout.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl border border-green-600/50">
              <div className="p-2 bg-green-500/20 rounded-full">
                <Navigation className="text-green-400" size={24} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">GPS + Timer</div>
                <div className="text-green-300">Track distance, pace & route</div>
                <div className="text-sm text-gray-400 mt-1">Full workout analytics with map</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl border border-blue-600/50">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Activity className="text-blue-400" size={24} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Timer Only</div>
                <div className="text-blue-300">Save battery, basic tracking</div>
                <div className="text-sm text-gray-400 mt-1">Time-based workout without location</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              onClick={handleEnableGPS}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-4 text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all"
            >
              <Navigation className="mr-2" size={20} />
              Enable GPS
            </Button>
            <Button
              onClick={handleDisableGPS}
              variant="secondary"
              className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white py-4 text-lg font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all"
            >
              <Battery className="mr-2" size={20} />
              Timer Only
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-400 bg-gray-700/30 rounded-lg p-3">
            💡 You can change this setting anytime in your browser preferences
          </div>
        </CardContent>
      </Card>
    </div>
  );
}