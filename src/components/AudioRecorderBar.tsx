import { Pause, Play, Send, Trash2 } from 'lucide-react';

interface AudioRecorderBarProps {
  recordingTime: number;
  audioLevels: number[];
  isPaused: boolean;
  onPause: () => void;
  onCancel: () => void;
  onSend: () => void;
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function AudioRecorderBar({
  recordingTime,
  audioLevels,
  isPaused,
  onPause,
  onCancel,
  onSend,
}: AudioRecorderBarProps) {
  return (
    <div className="audio-recorder animate-fade-in">
      <button className="audio-recorder-cancel" onClick={onCancel} aria-label="Cancelar gravação">
        <Trash2 size={18} />
      </button>

      <div className="audio-recorder-timer">
        <span className={`recording-dot ${isPaused ? '' : 'pulse-glow'}`} />
        <time>{formatTimer(recordingTime)}</time>
      </div>

      <div className="audio-levels" aria-hidden="true">
        {audioLevels.map((level, index) => (
          <span key={index} style={{ height: isPaused ? 6 : `${level}%` }} />
        ))}
      </div>

      <button className="audio-recorder-pause" onClick={onPause} aria-label={isPaused ? 'Continuar gravação' : 'Pausar gravação'}>
        {isPaused ? <Play size={18} /> : <Pause size={18} />}
      </button>
      <button className="audio-recorder-send" onClick={onSend} aria-label="Enviar nota de voz">
        <Send size={18} />
      </button>
    </div>
  );
}
