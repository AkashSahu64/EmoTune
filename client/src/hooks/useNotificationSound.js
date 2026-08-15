import { useCallback, useRef } from 'react';

export default function useNotificationSound() {
  const audioCtxRef = useRef(null);

  const play = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, []);

  const playAllowed = useCallback((preferences) => {
    if (!preferences?.notifications?.soundEnabled) return false;
    const dnd = preferences.notifications.doNotDisturb;
    if (dnd?.enabled) {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const start = dnd.startTime?.split(':').map(Number) || [22, 0];
      const end = dnd.endTime?.split(':').map(Number) || [8, 0];
      const nowMin = hrs * 60 + mins;
      const startMin = start[0] * 60 + (start[1] || 0);
      const endMin = end[0] * 60 + (end[1] || 0);
      if (startMin <= endMin) {
        if (nowMin >= startMin && nowMin < endMin) return false;
      } else {
        if (nowMin >= startMin || nowMin < endMin) return false;
      }
    }
    return true;
  }, []);

  return { play, playAllowed };
}
