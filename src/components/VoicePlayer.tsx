import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  src: string;
  duration?: number;
}

const WAVEFORM_BARS = 30;

function generateWaveformHeights(count: number): number[] {
  const bases = [
    0.35, 0.55, 0.40, 0.70, 0.50, 0.80, 0.45, 0.65, 0.55, 0.90,
    0.60, 0.75, 0.35, 0.50, 0.85, 0.55, 0.70, 0.40, 0.65, 0.95,
    0.50, 0.80, 0.45, 0.60, 0.75, 0.55, 0.85, 0.40, 0.65, 0.50,
  ];
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (i * 17 + i * i * 3) % bases.length;
    const variation = Math.sin(i * 2.3) * 0.12;
    heights.push(Math.max(0.22, Math.min(0.96, bases[idx] + variation)));
  }
  return heights;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ src, duration: initialDuration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const speedToggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const waveformHeights = useMemo(() => generateWaveformHeights(WAVEFORM_BARS), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleTimerClick = () => {
    setShowSpeed(true);
    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeed(nextSpeed);

    if (speedToggleTimer.current) clearTimeout(speedToggleTimer.current);
    speedToggleTimer.current = setTimeout(() => {
      setShowSpeed(false);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (speedToggleTimer.current) clearTimeout(speedToggleTimer.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const displayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(duration);

  const handleWaveformClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!waveformRef.current || duration <= 0) return;
      const rect = waveformRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const seekTime = ratio * duration;
      if (audioRef.current) {
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
      }
    },
    [duration],
  );

  return (
    <div className="voice-player">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        className="voice-player-toggle"
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? <Pause size={16} /> : <Play className="voice-player-play-icon" size={16} />}
      </button>

      <div
        ref={waveformRef}
        onClick={handleWaveformClick}
        className="voice-player-waveform"
      >
        {waveformHeights.map((heightRatio, i) => {
          const barPosition = (i / (WAVEFORM_BARS - 1)) * 100;
          const isPlayed = barPosition <= progressPercent;
          const barHeight = Math.max(5, heightRatio * 34);

          return (
            <div
              key={i}
              style={{
                height: `${barHeight}px`,
              }}
              className={`voice-player-bar ${isPlayed ? 'is-played' : ''}`}
            />
          );
        })}
      </div>

      <button
        onClick={handleTimerClick}
        className="voice-player-time"
        title="Toque para alterar velocidade"
      >
        {showSpeed ? (
          <span>{playbackRate}x</span>
        ) : (
          <>
            <span>{displayTime}</span>
            {playbackRate !== 1 && (
              <span className="voice-player-rate">
                {playbackRate}x
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};
