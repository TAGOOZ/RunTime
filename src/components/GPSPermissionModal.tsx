import React from 'react';
import { MapPin, Battery, Zap } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <MapPin className="text-green-400" size={24} />
            GPS Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300">
            Enable GPS tracking to measure distance, pace, and view your route after the workout.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-900/30 rounded-lg border border-green-700">
              <Zap className="text-green-400" size={20} />
              <div>
                <div className="text-white font-semibold">GPS + Timer</div>
                <div className="text-sm text-gray-400">Track distance, pace & route</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
              <Battery className="text-blue-400" size={20} />
              <div>
                <div className="text-white font-semibold">Timer Only</div>
                <div className="text-sm text-gray-400">Save battery, basic tracking</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onEnableGPS}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Enable GPS
            </Button>
            <Button
              onClick={onDisableGPS}
              variant="secondary"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
            >
              Timer Only
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}