import { useMemo, useState } from 'react';
import { X, AlertTriangle, MapPin } from 'lucide-react';
import { useBusinessStore } from '@/stores/useBusinessStore';

export default function CoordIssueModal() {
  const {
    showCoordIssuePanel,
    setShowCoordIssuePanel,
    selectedId,
    complaints,
    parks,
    resolveCoordIssue,
  } = useBusinessStore();

  const selected = useMemo(
    () => complaints.find((c) => c.id === selectedId),
    [complaints, selectedId]
  );

  const [lng, setLng] = useState<string>('');
  const [lat, setLat] = useState<string>('');
  const [intersection, setIntersection] = useState<string>('');

  if (!showCoordIssuePanel || !selected || !selected.coordIssue) return null;

  const affectedParkNames = parks
    .filter((p) => selected.coordIssue?.affectedParkIds.includes(p.id))
    .map((p) => p.name);

  const openInit = () => {
    if (lng === '' && lat === '' && intersection === '') {
      setLng(selected.lng.toFixed(6));
      setLat(selected.lat.toFixed(6));
      setIntersection(selected.coordIssue?.suspectedIntersection || selected.intersection);
    }
  };
  openInit();

  const handleApply = () => {
    resolveCoordIssue(
      selected.id,
      parseFloat(lng) || selected.lng,
      parseFloat(lat) || selected.lat,
      intersection || selected.intersection
    );
    setShowCoordIssuePanel(false);
    setLng('');
    setLat('');
    setIntersection('');
  };

  const handleCancel = () => {
    setShowCoordIssuePanel(false);
    setLng('');
    setLat('');
    setIntersection('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-panel-blue border border-white/10 rounded-sm shadow-panel w-[560px] flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-reject" />
            <span className="text-white font-mono text-base">坐标异常待确认</span>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-space-deep/60 border border-red-reject/30 rounded-sm p-3">
              <div className="text-xs text-red-reject/70 mb-2">当前坐标</div>
              <div className="text-sm text-white/80 font-mono">
                {selected.lng.toFixed(6)}, {selected.lat.toFixed(6)}
              </div>
              <div className="text-xs text-white/40 mt-1">{selected.intersection}</div>
            </div>
            <div className="bg-space-deep/60 border border-green-ok/30 rounded-sm p-3">
              <div className="text-xs text-green-ok/70 mb-2">疑似正确坐标</div>
              <div className="text-sm text-white/80 font-mono">
                {selected.coordIssue?.suspectedIntersection}
              </div>
              <div className="text-xs text-amber-warn mt-1 font-mono">
                偏移 {selected.coordIssue?.offsetMeters}m
              </div>
            </div>
          </div>

          {affectedParkNames.length > 0 && (
            <div className="border border-red-reject/30 bg-red-reject/5 rounded-sm p-3">
              <div className="text-xs text-red-reject mb-1.5 flex items-center gap-1.5">
                <MapPin size={12} />
                受影响公园
              </div>
              <div className="text-sm text-red-reject/90">
                {affectedParkNames.join('、')}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-white/50 block mb-1">经度</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-space-deep border border-white/10 rounded-sm px-3 py-2 text-sm text-white/80 font-mono focus:outline-none focus:border-cyan-glow/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">纬度</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-space-deep border border-white/10 rounded-sm px-3 py-2 text-sm text-white/80 font-mono focus:outline-none focus:border-cyan-glow/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">街口</label>
              <input
                type="text"
                value={intersection}
                onChange={(e) => setIntersection(e.target.value)}
                className="w-full bg-space-deep border border-white/10 rounded-sm px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-cyan-glow/50"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2 text-sm text-white/70 border border-white/20 hover:bg-white/5 rounded-sm transition-colors"
          >
            暂不处理
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 text-sm text-white bg-green-ok hover:bg-green-ok/80 rounded-sm transition-colors"
          >
            应用修正
          </button>
        </div>
      </div>
    </div>
  );
}
