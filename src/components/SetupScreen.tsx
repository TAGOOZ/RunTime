import React, { useState } from 'react';
import { formatTime } from '../lib/utils';
import { Play, BarChart3, MapPin } from 'lucide-react';
import { GPSTestPanel } from './GPSTestPanel';
import { PWAInstallButton } from './PWAInstallButton';

interface SetupScreenProps {
  onStart: (config: {
    runTime: number;
    walkTime: number;
    rounds: number;
  }) => void;
  onViewStats: () => void;
}

export function SetupScreen({ onStart, onViewStats }: SetupScreenProps) {
  const [runTime, setRunTime] = useState(30);
  const [walkTime, setWalkTime] = useState(90);
  const [rounds, setRounds] = useState(8);
  const [isFreeRounds, setIsFreeRounds] = useState(false);
  const [showGPSTest, setShowGPSTest] = useState(false);

  const handleStart = () => {
    onStart({ runTime, walkTime, rounds: isFreeRounds ? -1 : rounds });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Fitness Timer</h1>
          <p className="text-xl text-gray-300">Setup your workout</p>
        </div>

        <div className="space-y-6">
          {/* Free Rounds Toggle */}
          <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xl font-semibold">Free Rounds</span>
              <p className="text-sm text-gray-400">Run unlimited rounds, stop when ready</p>
            </div>
            <button
              onClick={() => setIsFreeRounds(!isFreeRounds)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isFreeRounds ? 'bg-yellow-400' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  isFreeRounds ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-2xl font-semibold">
              Run Time (seconds)
            </label>
            <input
              type="number"
              value={runTime}
              onChange={(e) => setRunTime(parseInt(e.target.value) || 0)}
              className="w-full p-4 text-3xl text-center bg-gray-800 border-2 border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none"
              min="1"
              max="600"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-2xl font-semibold">
              Walk Time (seconds)
            </label>
            <input
              type="number"
              value={walkTime}
              onChange={(e) => setWalkTime(parseInt(e.target.value) || 0)}
              className="w-full p-4 text-3xl text-center bg-gray-800 border-2 border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none"
              min="1"
              max="600"
            />
          </div>

          {!isFreeRounds && (
            <div className="space-y-3">
              <label className="block text-2xl font-semibold">
                Rounds
              </label>
              <input
                type="number"
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value) || 0)}
                className="w-full p-4 text-3xl text-center bg-gray-800 border-2 border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none"
                min="1"
                max="50"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-yellow-400 text-black py-6 rounded-lg text-3xl font-bold flex items-center justify-center gap-3 hover:bg-yellow-300 transition-colors"
          disabled={runTime < 1 || walkTime < 1 || (!isFreeRounds && rounds < 1)}
        >
          <Play size={36} />
          START WORKOUT
        </button>

        <button
          onClick={onViewStats}
          className="w-full bg-gray-700 text-white py-4 rounded-lg text-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-600 transition-colors"
        >
          <BarChart3 size={28} />
          View Stats
        </button>

        <button
          onClick={() => setShowGPSTest(true)}
          className="w-full bg-blue-700 text-white py-4 rounded-lg text-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 transition-colors"
        >
          <MapPin size={28} />
          GPS Test
        </button>

        {/* PWA Install Button */}
        <div className="flex justify-center">
          <PWAInstallButton 
            variant="outline" 
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 py-3 px-6 text-lg"
          />
        </div>

        <div className="text-center text-gray-400">
          <p>
            {isFreeRounds 
              ? `Free workout: Run until you decide to stop`
              : `Total time: ${formatTime((runTime + walkTime) * rounds)}`
            }
          </p>
        </div>
      </div>

      {showGPSTest && (
        <GPSTestPanel onClose={() => setShowGPSTest(false)} />
      )}
    </div>
  );
}