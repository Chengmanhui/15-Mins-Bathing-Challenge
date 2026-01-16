import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Types ---
interface BathSession {
  id: string;
  timestamp: number;
  durationMs: number;
}

type Language = 'en' | 'zh';

// --- Constants ---
const SHAME_THRESHOLD_MS = 900000; // 15 minutes

// --- Translations ---
const translations = {
  en: {
    title: "15 Mins Bathing Challenge",
    start: "Start Bathing",
    end: "End Bathing",
    shameSong: "The Shame Song",
    trends: "Bathing Trends",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    minutes: "min",
    seconds: "sec",
    bathTooLong: "Bathing too long! Playing your song...",
    stopRecording: "Stop Recording",
    startRecording: "Start Singing",
    delete: "Delete",
    noStats: "No records yet.",
    shameSongDesc: "If you bathe > 15 mins, we play this!",
    langToggle: "中文",
    avgTime: "Avg. Time",
    totalBaths: "Total Baths",
    overtimeCount: "15+ Min",
    recentHistory: "Recent History",
    waterSaved: "Congratulations! You have saved {{amount}} Liters of Water",
  },
  zh: {
    title: "15 分鐘沖涼挑戰",
    start: "開始洗澡",
    end: "結束洗澡",
    shameSong: "悅耳的歌聲",
    trends: "洗澡趨勢",
    weekly: "本週",
    monthly: "本月",
    yearly: "本年度",
    minutes: "分",
    seconds: "秒",
    bathTooLong: "洗太久了！正在播放你的歌聲...",
    stopRecording: "停止錄音",
    startRecording: "開始唱歌",
    delete: "刪除",
    noStats: "尚無紀錄。",
    shameSongDesc: "如果你洗澡超過 15 分鐘，我們會播放這段音樂！",
    langToggle: "English",
    avgTime: "平均時間",
    totalBaths: "總次數",
    overtimeCount: "超時次數",
    recentHistory: "最近紀錄",
    waterSaved: "恭喜你！你節省了 {{amount}} 公升水",
  }
};

// --- Helper: Format Timer to MM:SS:CC ---
const formatTimer = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const c = Math.floor((ms % 1000) / 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${c.toString().padStart(2, '0')}`;
};

// --- Sub-components ---

const DropletButton = ({ isBathing, onClick, label }: { isBathing: boolean, onClick: () => void, label: string }) => (
  <button onClick={onClick} className="relative w-48 h-64 focus:outline-none transition-transform active:scale-95 duration-300 group">
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 120" className={`w-full h-full transition-all duration-500 ${isBathing ? 'fill-rose-400 droplet-active' : 'fill-sky-400 droplet-shadow group-hover:fill-sky-500'}`}>
        <path d="M50 0 C50 0 10 45 10 75 C10 97 28 115 50 115 C72 115 90 97 90 75 C90 45 50 0 50 0 Z" />
      </svg>
    </div>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold p-4 text-center z-10">
      <span className="text-xl drop-shadow-md uppercase tracking-wider leading-tight">{label}</span>
    </div>
    {isBathing && <div className="ripple inset-0 m-auto w-32 h-32 border-rose-300 opacity-50"></div>}
  </button>
);

const Recorder = ({ t, onSave, existingAudio, onDelete }: any) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => typeof reader.result === 'string' && onSave(reader.result);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p >= 180 ? (stopRecording(), 180) : p + 1), 1000);
    } catch (err) { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-sky-100 mt-6">
      <h3 className="text-sky-800 font-bold text-lg mb-2 flex items-center">
        <span className="mr-2">🎤</span> {t.shameSong}
      </h3>
      <p className="text-sky-600 text-sm mb-4 leading-relaxed">{t.shameSongDesc}</p>
      {existingAudio && !isRecording && (
        <div className="mb-4 space-y-3">
          <audio src={existingAudio} controls className="w-full h-10" />
          <button onClick={onDelete} className="text-rose-500 text-xs font-bold hover:underline flex items-center">🗑️ {t.delete}</button>
        </div>
      )}
      <div className="flex flex-col items-center">
        {isRecording ? (
          <div className="text-center">
            <div className="text-2xl mono text-rose-500 mb-4 animate-pulse">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 3:00
            </div>
            <button onClick={stopRecording} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">
              {t.stopRecording}
            </button>
          </div>
        ) : (
          <button onClick={startRecording} className="bg-sky-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center group">
            <span className="mr-2 group-hover:scale-125 transition">🔴</span> {t.startRecording}
          </button>
        )}
      </div>
    </div>
  );
};

const Statistics = ({ sessions, t, onDeleteSession }: any) => {
  const [activeTab, setActiveTab] = useState('weekly');

  const chartData = useMemo(() => {
    const now = new Date();
    const data = [];
    if (activeTab === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        const total = sessions.filter((s: any) => new Date(s.timestamp).toDateString() === d.toDateString())
                              .reduce((acc: number, curr: any) => acc + curr.durationMs, 0);
        data.push({ label, value: Math.round(total / 60000) });
      }
    } else if (activeTab === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 0; i < 4; i++) {
        const start = new Date(startOfMonth); start.setDate(start.getDate() + (i * 7));
        const end = new Date(start); end.setDate(end.getDate() + 7);
        const total = sessions.filter((s: any) => s.timestamp >= start.getTime() && s.timestamp < end.getTime())
                              .reduce((acc: number, curr: any) => acc + curr.durationMs, 0);
        data.push({ label: `W${i+1}`, value: Math.round(total / 60000) });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        const label = d.toLocaleDateString(undefined, { month: 'short' });
        const total = sessions.filter((s: any) => {
            const sd = new Date(s.timestamp);
            return sd.getFullYear() === now.getFullYear() && sd.getMonth() === i;
        }).reduce((acc: number, curr: any) => acc + curr.durationMs, 0);
        data.push({ label, value: Math.round(total / 60000) });
      }
    }
    return data;
  }, [sessions, activeTab]);

  const stats = useMemo(() => {
    if (sessions.length === 0) return { avg: 0, total: 0, overtime: 0 };
    const totalMs = sessions.reduce((a: number, b: any) => a + b.durationMs, 0);
    return {
      avg: Math.round((totalMs / sessions.length) / 60000),
      total: sessions.length,
      overtime: sessions.filter((s: any) => s.durationMs >= SHAME_THRESHOLD_MS).length
    };
  }, [sessions]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-sky-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sky-800 font-bold text-lg">📊 {t.trends}</h3>
          <div className="flex bg-sky-50 rounded-xl p-1">
            {(['weekly', 'monthly', 'yearly']).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === tab ? 'bg-sky-500 text-white shadow-md' : 'text-sky-400'}`}>
                {t[tab as keyof typeof translations.en]}
              </button>
            ))}
          </div>
        </div>
        {sessions.length === 0 ? <div className="h-40 flex items-center justify-center text-sky-200 italic font-medium">{t.noStats}</div> : (
          <>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f9ff" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#bae6fd', fontWeight: 'bold' }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f0f9ff' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((e, idx) => <Cell key={idx} fill={e.value >= 15 ? '#fb7185' : '#38bdf8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-6 border-t border-sky-50 mt-4">
              <div className="text-center">
                <p className="text-sky-400 text-[10px] uppercase font-black">{t.avgTime}</p>
                <p className="text-sky-900 text-xl font-black">{stats.avg}<span className="text-xs ml-1">{t.minutes}</span></p>
              </div>
              <div className="text-center border-x border-sky-50">
                <p className="text-sky-400 text-[10px] uppercase font-black">{t.totalBaths}</p>
                <p className="text-sky-900 text-xl font-black">{stats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-rose-400 text-[10px] uppercase font-black">{t.overtimeCount}</p>
                <p className="text-rose-600 text-xl font-black">{stats.overtime}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-sky-100">
          <h3 className="text-sky-800 font-bold text-lg mb-4">📜 {t.recentHistory}</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
            {sessions.slice(0, 10).map((s: BathSession) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-sky-50/50 rounded-2xl group">
                <div className="flex flex-col">
                  <span className="text-sky-900 font-bold text-xs">
                    {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs font-black mono mt-1 ${s.durationMs >= SHAME_THRESHOLD_MS ? 'text-rose-500' : 'text-sky-400'}`}>
                    {formatTimer(s.durationMs)}
                  </span>
                </div>
                <button 
                  onClick={() => onDeleteSession(s.id)}
                  className="p-2 text-rose-300 hover:text-rose-500 transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Root ---

function App() {
  const [lang, setLang] = useState<Language>('en');
  const [isBathing, setIsBathing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessions, setSessions] = useState<BathSession[]>([]);
  const [shameSong, setShameSong] = useState<string | null>(null);
  const [isShaming, setIsShaming] = useState(false);
  const [lastSavedLiters, setLastSavedLiters] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const t = translations[lang];

  useEffect(() => {
    const s = localStorage.getItem('bath_sessions'); if (s) setSessions(JSON.parse(s));
    setShameSong(localStorage.getItem('shame_song'));
    const l = localStorage.getItem('app_lang'); if (l === 'en' || l === 'zh') setLang(l as Language);
  }, []);

  const startBathing = () => {
    if (audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.muted = false;
      }).catch(console.warn);
    }
    setIsBathing(true);
    setElapsedMs(0);
    setIsShaming(false);
    setLastSavedLiters(null);
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const delta = Date.now() - startTimeRef.current;
      setElapsedMs(delta);
      if (delta >= SHAME_THRESHOLD_MS && !isShaming && shameSong) {
        setIsShaming(true);
        if (audioRef.current) { audioRef.current.loop = true; audioRef.current.play().catch(console.error); }
      }
    }, 10);
  };

  const endBathing = () => {
    clearInterval(timerRef.current);
    // Only save if time is greater than 0; 00:00:00 is considered a false click.
    if (elapsedMs > 0) {
      const newSession: BathSession = { id: Date.now().toString(), timestamp: Date.now(), durationMs: elapsedMs };
      const updated = [newSession, ...sessions];
      setSessions(updated);
      localStorage.setItem('bath_sessions', JSON.stringify(updated));
      
      // Calculate water savings: 1 min faster than 15 mins = 10L saved
      if (elapsedMs < SHAME_THRESHOLD_MS) {
        const saved = Math.round(((SHAME_THRESHOLD_MS - elapsedMs) / 60000) * 10);
        setLastSavedLiters(saved);
      } else {
        setLastSavedLiters(0);
      }
    }
    setIsBathing(false);
    setIsShaming(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };

  const resetTimer = () => {
    if (isBathing) { startTimeRef.current = Date.now(); setElapsedMs(0); }
    else { setElapsedMs(0); }
    setIsShaming(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="px-6 pt-12 pb-8 flex justify-between items-center bg-white rounded-b-[3.5rem] shadow-sm border-b border-sky-50">
        <h1 className="text-2xl font-black text-sky-900 flex items-center tracking-tight">
          <span className="mr-3 text-3xl">🛁</span> {t.title}
        </h1>
        <button onClick={() => { const nl = lang === 'en' ? 'zh' : 'en'; setLang(nl); localStorage.setItem('app_lang', nl); }} className="bg-sky-50 text-sky-600 px-5 py-2 rounded-2xl font-black text-xs">
          {t.langToggle}
        </button>
      </header>
      <main className="px-6 mt-10 max-w-lg mx-auto space-y-10">
        <div className="flex flex-col items-center">
          <button onClick={resetTimer} className={`mono mb-6 transition-transform active:scale-90 ${isShaming ? 'text-rose-500 animate-bounce' : 'text-sky-900'}`}>
            <span className="text-6xl font-black tracking-tighter">{formatTimer(elapsedMs)}</span>
          </button>
          <div className="h-20 flex items-center justify-center text-center mb-6">
            {!isBathing && lastSavedLiters !== null && lastSavedLiters > 0 && (
              <div onClick={() => setLastSavedLiters(null)} className="bg-white/80 backdrop-blur-sm border-2 border-sky-100 p-4 rounded-3xl shadow-xl animate-fade-in flex flex-col items-center cursor-pointer">
                <p className="text-sky-600 font-black text-sm">✨ {t.waterSaved.replace('{{amount}}', lastSavedLiters.toString())}</p>
              </div>
            )}
          </div>
          <DropletButton isBathing={isBathing} onClick={isBathing ? endBathing : startBathing} label={isBathing ? t.end : t.start} />
          {isShaming && <div className="mt-8 px-6 py-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-3xl font-black animate-pulse text-sm">⚠️ {t.bathTooLong}</div>}
        </div>
        <Statistics sessions={sessions} t={t} onDeleteSession={(id: string) => { const u = sessions.filter(x => x.id !== id); setSessions(u); localStorage.setItem('bath_sessions', JSON.stringify(u)); }} />
        <Recorder t={t} onSave={(d: string) => { setShameSong(d); localStorage.setItem('shame_song', d); }} existingAudio={shameSong} onDelete={() => { setShameSong(null); localStorage.removeItem('shame_song'); }} />
      </main>
      {shameSong && <audio ref={audioRef} src={shameSong} />}
      <footer className="mt-20 text-center text-sky-200 text-[10px] pb-12 font-black uppercase tracking-[0.2em]">© {new Date().getFullYear()} {t.title}</footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);