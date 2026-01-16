
import React, { useState, useRef, useEffect } from 'react';
import { TranslationSet } from '../types';

interface RecorderProps {
  t: TranslationSet;
  onSave: (audioBlob: string) => void;
  existingAudio: string | null;
  onDelete: () => void;
}

export const Recorder: React.FC<RecorderProps> = ({ t, onSave, existingAudio, onDelete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onSave(base64data);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 180) { // 3 min limit
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-sky-100 mt-6">
      <h3 className="text-sky-800 font-bold text-lg mb-2 flex items-center">
        <span className="mr-2">🎤</span> {t.shameSong}
      </h3>
      <p className="text-sky-600 text-sm mb-4">{t.shameSongDesc}</p>
      
      {existingAudio && !isRecording && (
        <div className="mb-4 space-y-3">
          <audio src={existingAudio} controls className="w-full h-10" />
          <button 
            onClick={onDelete}
            className="text-rose-500 text-sm font-medium hover:underline flex items-center"
          >
            🗑️ {t.delete}
          </button>
        </div>
      )}

      <div className="flex flex-col items-center">
        {isRecording ? (
          <div className="text-center">
            <div className="text-2xl font-mono text-rose-500 mb-4 animate-pulse">
              {formatTime(recordingTime)} / 3:00
            </div>
            <button
              onClick={stopRecording}
              className="bg-rose-500 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-rose-600 transition"
            >
              {t.stopRecording}
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            className="bg-sky-500 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-sky-600 transition flex items-center"
          >
            <span className="mr-2">🔴</span> {t.startRecording}
          </button>
        )}
      </div>
    </div>
  );
};
