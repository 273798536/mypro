import { useEffect, useState } from 'react';
import { PenLine, CheckCircle, Fish } from 'lucide-react';
import { useAppStore } from '@/store';

const speciesOptions = ['大黄鱼', '鲈鱼', '贻贝', '海带'];

export default function LogEntry() {
  const { stations, aquacultureLogs, fetchStations, fetchLogs, addLog } = useAppStore();
  const [stationId, setStationId] = useState('');
  const [species, setSpecies] = useState('大黄鱼');
  const [feedAmount, setFeedAmount] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    if (stationId) fetchLogs(stationId);
  }, [stationId, fetchLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId || !feedAmount || !waterTemp) return;
    setSubmitting(true);
    try {
      const observation = [
        note ? note : '',
        feedAmount ? `投喂${feedAmount}kg` : '',
        waterTemp ? `水温${waterTemp}°C` : '',
      ].filter(Boolean).join('，');

      await addLog({
        stationId,
        species,
        activity: '日常记录',
        observation: observation || undefined,
        reportedBy: '操作员',
        reportDate: new Date().toISOString().split('T')[0],
      });
      setFeedAmount('');
      setWaterTemp('');
      setNote('');
      setToast(true);
      setTimeout(() => setToast(false), 3000);
      await fetchLogs(stationId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto relative">
      {toast && (
        <div className="fixed top-16 right-4 z-50 bg-success-green/90 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-card-in">
          <CheckCircle className="w-4 h-4" />
          养殖日志已补录，关联站位潮汐数据已联动更新
        </div>
      )}

      <h1 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <PenLine className="w-5 h-5 text-warning-amber" /> 日志补录
      </h1>

      <form onSubmit={handleSubmit} className="bg-slate-900 rounded-lg border border-slate-800 p-5 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">站位</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full bg-slate-800 text-sm text-slate-200 rounded px-3 py-2 border border-slate-700 focus:outline-none focus:border-warning-amber/50"
            required
          >
            <option value="">请选择站位</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.region})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">养殖品种</label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full bg-slate-800 text-sm text-slate-200 rounded px-3 py-2 border border-slate-700 focus:outline-none focus:border-warning-amber/50"
            >
              {speciesOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">投喂量 (kg)</label>
            <input
              type="number"
              step="0.1"
              value={feedAmount}
              onChange={(e) => setFeedAmount(e.target.value)}
              className="w-full bg-slate-800 text-sm text-slate-200 rounded px-3 py-2 border border-slate-700 focus:outline-none focus:border-warning-amber/50"
              placeholder="0.0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">水温 (°C)</label>
          <input
            type="number"
            step="0.1"
            value={waterTemp}
            onChange={(e) => setWaterTemp(e.target.value)}
            className="w-full bg-slate-800 text-sm text-slate-200 rounded px-3 py-2 border border-slate-700 focus:outline-none focus:border-warning-amber/50"
            placeholder="0.0"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">备注</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full bg-slate-800 text-sm text-slate-200 rounded px-3 py-2 border border-slate-700 focus:outline-none focus:border-warning-amber/50 resize-none"
            placeholder="可选..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !stationId || !feedAmount || !waterTemp}
          className="px-4 py-2 bg-deep-sea text-warning-amber rounded text-sm font-medium hover:bg-deep-sea/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : '提交补录'}
        </button>
      </form>

      {stationId && aquacultureLogs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Fish className="w-4 h-4" /> 该站位日志记录
          </h2>
          <div className="space-y-2">
            {aquacultureLogs.map((log) => (
              <div key={log.id} className="bg-slate-900/50 rounded border border-slate-800 p-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span className="text-white font-medium">{log.species}</span>
                  <span>{log.reportDate}</span>
                </div>
                <div className="mt-1 text-slate-500">
                  {log.activity}{log.observation ? ` · ${log.observation}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
