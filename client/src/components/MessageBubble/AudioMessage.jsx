import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import { formatDuration } from './utils/formatters';
import { generateWaveform } from './utils/waveform';

const SPEEDS = [1, 1.5, 2];

function AudioMessage({ message }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const bars = useMemo(() => generateWaveform(message._id, 40), [message._id]);
  const progress = duration ? currentTime / duration : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => { setPlaying(false); setCurrentTime(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('loadedmetadata', onMetadata); audio.removeEventListener('ended', onEnd); };
  }, [message.mediaUrl]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => {});
    else { audio.pause(); setPlaying(false); }
  }, []);
  const seek = useCallback((event) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Number(event.target.value);
    audio.currentTime = next * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);
  const changeSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }, [speedIndex]);

  if (!message.mediaUrl) return null;
  return <div className="flex w-[min(60vw,380px)] min-w-[min(250px,100%)] items-center gap-3 rounded-lg bg-black/[.1] p-1.5">
    <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.15] text-current" type="button" onClick={toggle} aria-label={playing ? 'Pause audio' : 'Play audio'}>{playing ? <FiPause /> : <FiPlay />}</button>
    <div className="min-w-0 flex-1">
      <div className="flex h-10 items-center gap-px overflow-hidden" aria-hidden="true">{bars.map((height, index) => <span key={index} className={`w-0.5 shrink-0 rounded-full ${index / bars.length <= progress ? 'bg-current' : 'bg-white/[.28]'}`} style={{ height: `${Math.round(height * 100)}%` }} />)}</div>
      <input className="block h-0 w-full opacity-0" type="range" min="0" max="1" step="0.001" value={progress} onChange={seek} aria-label="Audio progress" />
      <div className="flex justify-between text-[11px] opacity-70"><span>{formatDuration(currentTime)}</span><span>{formatDuration(duration)}</span></div>
    </div>
    <button className="w-10 shrink-0 rounded-full border border-white/[.25] text-[11px]" type="button" onClick={changeSpeed} aria-label={`Playback speed ${SPEEDS[speedIndex]} times`}>{SPEEDS[speedIndex]}×</button>
    <audio ref={audioRef} src={message.mediaUrl} preload="metadata" />
  </div>;
}

export default memo(AudioMessage);
