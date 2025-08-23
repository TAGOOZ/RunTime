import { useCallback } from 'react';

export function useVibration() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const vibrateRun = useCallback(() => vibrate([200, 100, 200]), [vibrate]);
  const vibrateWalk = useCallback(() => vibrate([100, 50, 100, 50, 100]), [vibrate]);
  const vibrateCountdown = useCallback(() => vibrate(100), [vibrate]);

  return {
    vibrate,
    vibrateRun,
    vibrateWalk,
    vibrateCountdown,
    isSupported: 'vibrate' in navigator
  };
}