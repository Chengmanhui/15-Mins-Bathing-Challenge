
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BathSession, TranslationSet } from '../types';

interface StatisticsProps {
  sessions: BathSession[];
  t: TranslationSet;
  onDeleteSession: (id: string) => void;
}

const THRESHOLD = 900; // 15 mins

export const Statistics: React.FC<StatisticsProps> = ({ sessions, t, onDeleteSession }) => {
  const [activeTab, setActiveTab] = React.useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const start = new Date();
    if (activeTab === 'weekly') start.setDate(now.getDate() - 7);
    else if (activeTab === 'monthly') start.setMonth(now.getMonth() - 1);
    else start.setFullYear(now.getFullYear() - 1);
    return sessions.filter(s => s.timestamp >= start.getTime());
  }, [sessions, activeTab]);

  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; value: number }[] = [];

    if (activeTab === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
        const daySessions = sessions.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
        const totalSecs = daySessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);
        data.push({ label: dayLabel, value: Math.round(totalSecs / 60) });
      }
    } else if (activeTab === 'monthly') {
      for (let i = 3; i >= 0; i--) {
        const start = new Date();
        start.setDate(now.getDate() - (i + 1) * 7);
        const end = new Date();
        end.setDate(now.getDate() - i * 7);
        const weekSessions = sessions.filter(s => s.timestamp >= start.getTime() && s.timestamp <= end.getTime());
        const totalSecs = weekSessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);
        data.push({ label: `W-${i + 1}`, value: Math.round(totalSecs / 60) });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString(undefined, { month: 'short' });
        const monthSessions = sessions.filter(s => {
          const sd = new Date(s.timestamp);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        });
        const totalSecs = monthSessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);
        data.push({ label: monthLabel, value: Math.round(totalSecs / 60) });
      }
    }
    return data;
  }, [sessions, activeTab]);

  const stats = useMemo(() => {
    if (filteredByPeriod.length === 0) return { avg: 0, total: 0, overtime: 0 };
    const totalSecs = filteredByPeriod.reduce((a, b) => a + b.durationSeconds, 0);
    const overtime = filteredByPeriod.filter(s => s.durationSeconds >= THRESHOLD).length;
    return {
      avg: Math.round((totalSecs / filteredByPeriod.length) / 60),
      total: filteredByPeriod.length,
      overtime
    };
  }, [filteredByPeriod]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-sky-100">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sky-800 font-bold text-lg">📊 {t.trends}</h3>
          <div className="flex bg-sky-50 rounded-lg p-1">
            {(['weekly', 'monthly', 'yearly'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs rounded-md transition ${activeTab === tab ? 'bg-sky-500 text-white' : 'text-sky-500'}`}
              >
                {t[tab as keyof TranslationSet]}
              </button>
            ))}
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sky-300 italic">{t.noStats}</div>
        ) : (
          <>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7dd3fc' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#7dd3fc' }} />
                  <Tooltip cursor={{ fill: '#f0f9ff' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= 15 ? '#fb7185' : '#38bdf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-6 border-t border-sky-50 mt-4">
              <div className="text-center">
                <p className="text-sky-400 text-[10px] uppercase font-bold">{t.avgTime}</p>
                <p className="text-sky-900 text-lg font-black">{stats.avg} <span className="text-[10px] font-normal">{t.minutes}</span></p>
              </div>
              <div className="text-center border-x border-sky-50">
                <p className="text-sky-400 text-[10px] uppercase font-bold">{t.totalBaths}</p>
                <p className="text-sky-900 text-lg font-black">{stats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-rose-400 text-[10px] uppercase font-bold">{t.overtimeCount}</p>
                <p className="text-rose-600 text-lg font-black">{stats.overtime}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-sky-100">
          <h3 className="text-sky-800 font-bold text-lg mb-4">📜 {t.recentHistory}</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {sessions.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-sky-50 rounded-2xl group">
                <div className="flex flex-col">
                  <span className="text-sky-900 font-bold text-xs">
                    {new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs font-medium ${s.durationSeconds >= THRESHOLD ? 'text-rose-500' : 'text-sky-400'}`}>
                    {Math.floor(s.durationSeconds / 60)}{t.minutes} {s.durationSeconds % 60}{t.seconds}
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
