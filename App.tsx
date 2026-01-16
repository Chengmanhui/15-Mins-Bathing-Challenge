
import React, { useState, useEffect, useRef } from 'react';
import { DropletButton } from './components/DropletButton';
import { Recorder } from './components/Recorder';
import { Statistics } from './components/Statistics';
import { translations } from './translations';
import { BathSession, Language } from './types';

const SHAME_THRESHOLD = 900; // 15 minutes

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [isBathing, setIsBathing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [sessions, setSessions] = useState<BathSession[]>([]);
  const [shameSong, setShameSong] = useState<string | null>(null);
  const [isShaming, setIsShaming] = useState(false);
  const [lastSavedLiters, setLastSavedLiters] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const t = translations[lang];

  useEffect(() => {
    const savedSessions = localStorage.getItem('bath_sessions');
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    const savedSong = localStorage.getItem('shame_song');
    if (savedSong) setShameSong(savedSong);
    const savedLang = localStorage.getItem('app_lang');
    if (savedLang) setLang(savedLang as Language);
  }, []);

  const saveSessions = (newSessions: BathSession[]) => {
    setSessions(newSessions);
    localStorage.setItem('bath_sessions', JSON.stringify(newSessions));
  };

  const deleteSession = (id: string) => {
    saveSessions(sessions.filter(s => s.id !== id));
  };

  const saveShameSong = (audioBase64: string) => {
    setShameSong(audioBase64);
    localStorage.setItem('shame_song', audioBase64);
  };

  const deleteShameSong = () => {
    setShameSong(null);
    localStorage.removeItem('shame_song');
  };

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const startBathing = () => {
    setIsBathing(true);
    setTimer(0);
    setIsShaming(false);
    setLastSavedLiters(null);
    timerIntervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        const next = prev + 1;
        if (next >= SHAME_THRESHOLD && !isShaming && shameSong) {
          setIsShaming(true);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        }
        return next;
      });
    }, 1000);
  };

  const endBathing = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (timer > 0) {
      saveSessions([{ id: Date.now().toString(), timestamp: Date.now(), durationSeconds: timer }, ...sessions]);
      
      // Calculate water savings: 1 min faster than 15 mins = 10L saved
      // Formula: ((900 - timer) / 60) * 10 = (900 - timer) / 6
      if (timer < SHAME_THRESHOLD) {
        const saved = Math.round((SHAME_THRESHOLD - timer) / 6);
        setLastSavedLiters(saved);
      } else {
        setLastSavedLiters(0);
      }
    }

    setIsBathing(false);
    setIsShaming(false);
    if (audioRef.current) audioRef.current.pause();
    setTimer(0);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-sky-50 pb-20 select-none">
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-white rounded-b-[3rem] shadow-sm">
        <h1 className="text-xl font-black text-sky-900 flex items-center leading-tight">
          <span className="mr-2 text-2xl">🛁</span> {t.title}
        </h1>
        <button onClick={toggleLanguage} className="bg-sky-100 text-sky-600 px-4 py-1 rounded-full font-bold text-xs">
          {t.langToggle}
        </button>
      </header>

      <main className="px-6 mt-8 max-w-lg mx-auto space-y-8">
        <div className="flex flex-col items-center">
          <div className={`text-4xl font-black mb-4 font-mono ${isShaming ? 'text-rose-500 animate-bounce' : 'text-sky-800'}`}>
            {formatTimer(timer)}
          </div>
          
          <div className="h-12 flex items-center justify-center text-center mb-4 px-4">
            {!isBathing && lastSavedLiters !== null && lastSavedLiters > 0 && (
              <p className="text-sky-600 font-bold animate-fade-in text-sm leading-relaxed bg-sky-100/50 px-4 py-2 rounded-2xl border border-sky-200">
                ✨ {t.waterSaved.replace('{{amount}}', lastSavedLiters.toString())}
              </p>
            )}
          </div>

          <DropletButton isBathing={isBathing} onClick={isBathing ? endBathing : startBathing} label={isBathing ? t.end : t.start} />
          
          {isShaming && (
            <div className="mt-4 px-4 py-2 bg-rose-100 text-rose-600 rounded-2xl font-bold animate-pulse text-sm">
              ⚠️ {t.bathTooLong}
            </div>
          )}
        </div>

        <Statistics sessions={sessions} t={t} onDeleteSession={deleteSession} />
        <Recorder t={t} onSave={saveShameSong} existingAudio={shameSong} onDelete={deleteShameSong} />
      </main>

      {shameSong && <audio ref={audioRef} src={shameSong} loop />}
      <footer className="mt-12 text-center text-sky-300 text-[10px] pb-10 uppercase font-bold tracking-widest">
        &copy; {new Date().getFullYear()} {t.title}
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
