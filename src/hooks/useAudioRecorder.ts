import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 20, 15, 30, 25]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let interval: number | null = null;
    if (isRecording && !isPaused) {
      interval = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    void audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    animationFrameRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const samples = [
          Math.max(10, (dataArray[1] || 0) / 2.5),
          Math.max(10, (dataArray[3] || 0) / 2.5),
          Math.max(10, (dataArray[5] || 0) / 2.5),
          Math.max(10, (dataArray[7] || 0) / 2.5),
          Math.max(10, (dataArray[9] || 0) / 2.5),
        ];

        setAudioLevels(samples);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      setError('Não foi possível acessar o microfone. Verifique as permissões do dispositivo e tente novamente.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = (): Promise<{ file: File; duration: number } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        cleanup();
        setIsRecording(false);
        resolve(null);
        return;
      }

      setIsRecording(false);
      const finalDuration = recordingTime;

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([audioBlob], `audio-note-${Date.now()}.${ext}`, { type: mimeType });

        cleanup();
        setIsPaused(false);
        setRecordingTime(0);

        resolve({ file, duration: finalDuration });
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error calling stop on MediaRecorder:', err);
        cleanup();
        setIsPaused(false);
        setRecordingTime(0);
        resolve(null);
      }
    });
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  };

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioLevels,
    error,
    clearError: () => setError(null),
    startRecording,
    pauseRecording,
    stopRecording,
    cancelRecording,
  };
}
