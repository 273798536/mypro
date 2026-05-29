import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Trash2, Camera } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Viewpoint } from '@/types';

const STORAGE_KEY = 'ai-feature-space-viewpoints';

export default function ViewpointManager() {
  const viewpoints = useStore((s) => s.viewpoints);
  const addViewpoint = useStore((s) => s.addViewpoint);
  const removeViewpoint = useStore((s) => s.removeViewpoint);
  const setPendingCameraMove = useStore((s) => s.setPendingCameraMove);
  const onCameraCapture = useStore((s) => s.onCameraCapture);

  const [name, setName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Viewpoint[] = JSON.parse(stored);
        for (const vp of parsed) {
          addViewpoint(vp);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewpoints));
    } catch { /* ignore */ }
  }, [viewpoints]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;

    let position: [number, number, number] = [0, 0, 12];
    let target: [number, number, number] = [0, 0, 0];

    if (onCameraCapture) {
      const cam = onCameraCapture();
      position = cam.position;
      target = cam.target;
    }

    const vp: Viewpoint = {
      id: `vp_${Date.now()}`,
      name: trimmed,
      position,
      target,
      timestamp: Date.now(),
    };
    addViewpoint(vp);
    setName('');
  }, [name, addViewpoint, onCameraCapture]);

  const handleRestore = useCallback((vp: Viewpoint) => {
    setActiveId(vp.id);
    setPendingCameraMove({ position: vp.position, target: vp.target });
  }, [setPendingCameraMove]);

  const handleDelete = useCallback((id: string) => {
    removeViewpoint(id);
    if (activeId === id) setActiveId(null);
  }, [removeViewpoint, activeId]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-4 bg-[#0f1629] border-r border-[#1a2040] p-4 text-white/80">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <Camera size={14} />
        <span>视角管理</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="视角名称"
          className="flex-1 bg-[#1a2040] border border-[#2a3060] rounded-md px-2 py-1.5 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#4d9fff] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex items-center gap-1 bg-[#4d9fff] hover:bg-[#3d8fee] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Bookmark size={12} />
          保存
        </button>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
        {viewpoints.length === 0 && (
          <span className="text-xs text-white/30 text-center py-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            暂无保存视角
          </span>
        )}
        {viewpoints.map((vp) => (
          <div
            key={vp.id}
            onClick={() => handleRestore(vp)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
              activeId === vp.id
                ? 'bg-[#4d9fff]/15 border border-[#4d9fff]/30'
                : 'bg-transparent hover:bg-[#1a2040] border border-transparent'
            }`}
          >
            <Bookmark size={12} className={activeId === vp.id ? 'text-[#4d9fff]' : 'text-white/30'} />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {vp.name}
              </div>
              <div className="text-[10px] text-white/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatTime(vp.timestamp)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(vp.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-[#ff6b35] transition-all p-0.5"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
