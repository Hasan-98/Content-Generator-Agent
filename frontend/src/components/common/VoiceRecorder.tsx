import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, disabled }: Props) {
  const { t } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer mp4/m4a (HeyGen-compatible), fall back to webm
      const preferredTypes = ['audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
      const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      // User denied microphone or not available
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <button
            onClick={stopRecording}
            className="px-3 py-1.5 text-xs bg-aR text-white rounded hover:bg-aR/80 transition-colors flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-sm bg-white" />
            {t('voiceRecorderStop')}
          </button>
          <span className="text-xs text-aR font-mono animate-pulse">{formatTime(elapsed)}</span>
        </>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="px-3 py-1.5 text-xs bg-aR/20 text-aR border border-aR/40 rounded hover:bg-aR/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-aR" />
          {t('voiceRecorderStart')}
        </button>
      )}
    </div>
  );
}
