import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Brush, Download } from 'lucide-react';
import { useTrackerStore } from '../store/useTrackerStore';
import { AVAILABILITY_LABEL, type Availability, type QualityFlag } from '../types';
import { cn } from '../lib/utils';

const QUALITY_FLAG_LABEL: Record<QualityFlag, string> = {
  null_value: '空值',
  duplicate: '重复',
  mixed_remark: '备注混写',
};

const QUALITY_FLAG_TAG_CLASS: Record<QualityFlag, string> = {
  null_value: 'bg-coral-500/20 text-coral-300 border border-coral-500/30',
  duplicate: 'bg-sand-500/20 text-sand-300 border border-sand-500/30',
  mixed_remark: 'bg-seafoam-500/20 text-seafoam-300 border border-seafoam-500/30',
};

const AVAILABILITY_SELECT_CLASS: Record<Availability, string> = {
  available: 'tag-available',
  need_clean: 'tag-pending',
  unavailable: 'tag-recollect',
};

export default function DataCleaner() {
  const trackPoints = useTrackerStore((s) => s.trackPoints);
  const cleanTrackData = useTrackerStore((s) => s.cleanTrackData);
  const toggleTrackPointAvailability = useTrackerStore((s) => s.toggleTrackPointAvailability);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const total = trackPoints.length;
    const nullValue = trackPoints.filter((p) => p.qualityFlags.includes('null_value')).length;
    const duplicate = trackPoints.filter((p) => p.qualityFlags.includes('duplicate')).length;
    const mixedRemark = trackPoints.filter((p) => p.qualityFlags.includes('mixed_remark')).length;
    const available = trackPoints.filter((p) => p.availability === 'available').length;
    const needClean = trackPoints.filter((p) => p.availability === 'need_clean').length;
    const unavailable = trackPoints.filter((p) => p.availability === 'unavailable').length;
    return { total, nullValue, duplicate, mixedRemark, available, needClean, unavailable };
  }, [trackPoints]);

  const handleExport = () => {
    const cleaned = trackPoints.filter((p) => p.availability !== 'unavailable');
    const data = JSON.stringify(cleaned, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_track_data_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getRowBgClass = (flags: QualityFlag[]) => {
    if (flags.includes('null_value')) return 'bg-coral-500/10';
    if (flags.includes('duplicate')) return 'bg-sand-500/10';
    if (flags.includes('mixed_remark')) return 'bg-seafoam-500/10';
    return '';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="nautical-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">数据质量检查</h2>
          <div className="flex gap-3">
            <button onClick={cleanTrackData} className="nautical-btn-primary">
              <Brush className="w-4 h-4 mr-2" />
              一键清洗
            </button>
            <button onClick={handleExport} className="nautical-btn">
              <Download className="w-4 h-4 mr-2" />
              导出清洗后数据
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          <div className="bg-ocean-800/60 rounded-lg p-3 border border-ocean-700/50">
            <div className="text-ocean-400 text-xs mb-1">总点数</div>
            <div className="font-mono text-2xl text-ocean-100 font-semibold">{stats.total}</div>
          </div>
          <div className="bg-coral-500/10 rounded-lg p-3 border border-coral-500/30">
            <div className="text-coral-400 text-xs mb-1">空值数</div>
            <div className="font-mono text-2xl text-coral-300 font-semibold">{stats.nullValue}</div>
          </div>
          <div className="bg-sand-500/10 rounded-lg p-3 border border-sand-500/30">
            <div className="text-sand-400 text-xs mb-1">重复数</div>
            <div className="font-mono text-2xl text-sand-300 font-semibold">{stats.duplicate}</div>
          </div>
          <div className="bg-seafoam-500/10 rounded-lg p-3 border border-seafoam-500/30">
            <div className="text-seafoam-400 text-xs mb-1">备注混写数</div>
            <div className="font-mono text-2xl text-seafoam-300 font-semibold">{stats.mixedRemark}</div>
          </div>
          <div className="bg-seaweed-500/10 rounded-lg p-3 border border-seaweed-500/30">
            <div className="text-seaweed-400 text-xs mb-1">直接可用数</div>
            <div className="font-mono text-2xl text-seaweed-300 font-semibold">{stats.available}</div>
          </div>
          <div className="bg-ocean-700/40 rounded-lg p-3 border border-ocean-600/50">
            <div className="text-sand-400 text-xs mb-1">需清洗数</div>
            <div className="font-mono text-2xl text-sand-300 font-semibold">{stats.needClean}</div>
          </div>
          <div className="bg-coral-500/10 rounded-lg p-3 border border-coral-500/30">
            <div className="text-coral-400 text-xs mb-1">不可用数</div>
            <div className="font-mono text-2xl text-coral-300 font-semibold">{stats.unavailable}</div>
          </div>
        </div>
      </div>

      <div className="nautical-card overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-ocean-900/95 backdrop-blur-sm border-b border-ocean-700/50 z-10">
              <tr className="text-ocean-300">
                <th className="px-4 py-3 text-left font-medium w-16">序号</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-left font-medium">纬度</th>
                <th className="px-4 py-3 text-left font-medium">经度</th>
                <th className="px-4 py-3 text-left font-medium">航速</th>
                <th className="px-4 py-3 text-left font-medium">航向</th>
                <th className="px-4 py-3 text-left font-medium">质量标记</th>
                <th className="px-4 py-3 text-left font-medium">可用性</th>
              </tr>
            </thead>
            <tbody>
              {trackPoints.map((pt) => {
                const expanded = expandedRows.has(pt.id);
                return (
                  <>
                    <tr
                      key={pt.id}
                      className={cn(
                        'border-b border-ocean-800/60 hover:bg-ocean-800/30 transition-colors',
                        getRowBgClass(pt.qualityFlags)
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRow(pt.id)}
                          className={cn(
                            'font-mono text-ocean-300 hover:text-seafoam-300 transition-colors',
                            pt.remark && 'underline decoration-dotted cursor-pointer'
                          )}
                        >
                          {String(pt.index).padStart(3, '0')}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-ocean-200">
                        {dayjs(pt.timestamp).format('HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {pt.lat !== null ? pt.lat.toFixed(5) : <span className="text-coral-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {pt.lng !== null ? pt.lng.toFixed(5) : <span className="text-coral-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {pt.speed !== null ? `${pt.speed.toFixed(1)} kn` : <span className="text-coral-400">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {pt.heading !== null ? `${pt.heading}°` : <span className="text-coral-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {pt.qualityFlags.length === 0 ? (
                            <span className="text-ocean-500 text-xs">正常</span>
                          ) : (
                            pt.qualityFlags.map((f) => (
                              <span key={f} className={cn('tag', QUALITY_FLAG_TAG_CLASS[f])}>
                                {QUALITY_FLAG_LABEL[f]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={pt.availability}
                          onChange={() => toggleTrackPointAvailability(pt.id)}
                          className={cn(
                            'tag cursor-pointer bg-transparent outline-none',
                            AVAILABILITY_SELECT_CLASS[pt.availability]
                          )}
                        >
                          <option value="available">{AVAILABILITY_LABEL.available}</option>
                          <option value="need_clean">{AVAILABILITY_LABEL.need_clean}</option>
                          <option value="unavailable">{AVAILABILITY_LABEL.unavailable}</option>
                        </select>
                      </td>
                    </tr>
                    {expanded && pt.remark && (
                      <tr key={`${pt.id}-remark`} className="bg-ocean-800/40 border-b border-ocean-800/60">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex items-start gap-2">
                            <span className="text-seafoam-400 text-xs mt-0.5">备注</span>
                            <span className="text-ocean-200">{pt.remark}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
