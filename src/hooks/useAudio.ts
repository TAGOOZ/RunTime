import { useCallback, useRef } from 'react';
export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const whistleAudioRef = useRef<HTMLAudioElement | null>(null);

  const playBeep = useCallback(async (frequency = 800, duration = 200) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }, []);

  // Play only the first 3 seconds of the whistle sound
  const playWhistle = useCallback(() => {
    if (!whistleAudioRef.current) {
      whistleAudioRef.current = new Audio('/whistle.mp3');
    }
    const audio = whistleAudioRef.current;
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play();
    // Stop after 2 seconds
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 2000);
  }, []);

  const playRunAlert = useCallback(() => playWhistle(), [playWhistle]);
  const playWalkAlert = useCallback(() => playWhistle(), [playWhistle]);
  const playCountdown = useCallback(() => playBeep(400, 150), [playBeep]);

  return {
    playRunAlert,
    playWalkAlert,
    playCountdown
  };
}