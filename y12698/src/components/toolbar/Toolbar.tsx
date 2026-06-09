import { useState, useRef } from 'react';
import { Camera, BookOpen, AlertTriangle, Download, Eye, Save, Trash2, ChevronDown, Palette } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { useDataStore } from '../../store/dataStore';
import { useReviewStore } from '../../store/reviewStore';
import { useScreenshot } from '../../hooks/useScreenshot';
import type { Viewpoint } from '../../types';

interface Props {
  glRef: React.MutableRefObject<any>;
  cameraRef: React.MutableRefObject<any>;
  onCaptureClick: () => void;
}

export default function Toolbar({ glRef, cameraRef, onCaptureClick }: Props) {
  const viewpoints = useSceneStore((s) => s.viewpoints);
  const camera = useSceneStore((s) => s.camera);
  const saveViewpoint = useSceneStore((s) => s.saveViewpoint);
  const deleteViewpoint = useSceneStore((s) => s.deleteViewpoint);
  const setAnimating = useSceneStore((s) => s.setAnimatingCamera);

  const oobCount = useDataStore((s) => s.getOutOfBoundsCount());
  const dupCount = useDataStore((s) => s.getDuplicateCount());

  const showLegend = useReviewStore((s) => s.showLegend);
  const toggleLegend = useReviewStore((s) => s.toggleLegend);
  const setShowExport = useReviewStore((s) => s.setShowExportModal);
  const screenshots = useReviewStore((s) => s.screenshots);

  const [vpOpen, setVpOpen] = useState(false);
  const [newVpName, setNewVpName] = useState('');
  const { capture } = useScreenshot(glRef);
  const records = useDataStore((s) => s.records);
  const selectedId = useSceneStore((s) => s.selectedRecordId);

  const currentVpName = useRef<HTMLInputElement>(null);

  const doSaveVp = () => {
    const name = newVpName.trim() || `视角 ${viewpoints.length + 1}`;
    saveViewpoint(name, camera);
    setNewVpName('');
    setVpOpen(false);
  };

  const loadVp = (vp: Viewpoint) => {
    const cam = cameraRef.current;
    if (!cam) return;
    const start = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    const end = vp.camera.position;
    const targetEnd = vp.camera.target;
    setAnimating(true);
    const duration = 900;
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cam.position.x = start.x + (end.x - start.x) * ease;
      cam.position.y = start.y + (end.y - start.y) * ease;
      cam.position.z = start.z + (end.z - start.z) * ease;
      cam.lookAt(targetEnd.x, targetEnd.y, targetEnd.z);
      if (t < 1) requestAnimationFrame(step);
      else setAnimating(false);
    };
    requestAnimationFrame(step);
    setVpOpen(false);
  };

  const handleQuickCapture = () => {
    const rec = records.find((r) => r.id === selectedId);
    capture(rec);
  };

  return (
    <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="h-6 w-6 rounded-sm bg-gradient-to-br from-[#FF6B35] to-[#FFD93D] shadow-[0_0_10px_rgba(255,107,53,0.5)]" />
          <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#00D4AA]" />
        </div>
        <div>
          <h1 className="text-[13px] font-bold tracking-wide text-slate-100">深海热液喷口 · 工程评审台</h1>
          <p className="font-mono text-[9px] text-slate-500">HYDROTHERMAL VENT REVIEW STATION v1.0</p>
        </div>
      </div>

      <div className="ml-4 h-6 w-px bg-slate-700" />

      <div className="relative">
        <button
          onClick={() => setVpOpen(!vpOpen)}
          className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
        >
          <Eye size={13} className="text-[#00D4AA]" />
          视角
          <ChevronDown size={12} />
        </button>
        {vpOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur-md">
            <div className="border-b border-slate-800 p-2">
              <div className="flex gap-1">
                <input
                  ref={currentVpName}
                  value={newVpName}
                  onChange={(e) => setNewVpName(e.target.value)}
                  placeholder="输入视角名称..."
                  className="flex-1 rounded border border-slate-700 bg-slate-800/80 px-2 py-1 font-mono text-[10px] text-slate-300 outline-none focus:border-[#00D4AA]/50"
                />
                <button
                  onClick={doSaveVp}
                  className="flex items-center gap-1 rounded border border-[#00D4AA]/40 bg-[#00D4AA]/10 px-2 py-1 text-[10px] text-[#00D4AA] hover:bg-[#00D4AA]/20"
                >
                  <Save size={10} /> 保存
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {viewpoints.length === 0 && (
                <p className="p-4 text-center text-[10px] text-slate-500">暂无保存视角</p>
              )}
              {viewpoints.map((vp) => (
                <div
                  key={vp.id}
                  className="group flex items-center gap-2 border-b border-slate-800/60 px-2.5 py-2 transition-colors hover:bg-slate-800/50"
                >
                  <button
                    onClick={() => loadVp(vp)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <div className="flex h-8 w-12 items-center justify-center rounded border border-slate-700 bg-gradient-to-br from-[#0A1628] to-[#1a2a44]">
                      <Eye size={12} className="text-[#00D4AA]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-slate-200">{vp.name}</p>
                      <p className="font-mono text-[9px] text-slate-500">
                        {new Date(vp.savedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`删除视角「${vp.name}」？`)) deleteViewpoint(vp.id);
                    }}
                    className="rounded p-1 text-slate-500 opacity-0 transition-all hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={toggleLegend}
        className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] transition-all ${
          showLegend
            ? 'border-[#FF6B35]/40 bg-[#FF6B35]/10 text-[#FF6B35]'
            : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
        }`}
      >
        <Palette size={13} /> 颜色图例
      </button>

      <div className="ml-2 flex items-center gap-1.5">
        <div className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${
          oobCount > 0
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            : 'border-slate-700 bg-slate-800/40 text-slate-500'
        }`}>
          <AlertTriangle size={11} /> {oobCount} 越界
        </div>
        <div className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${
          dupCount > 0
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
            : 'border-slate-700 bg-slate-800/40 text-slate-500'
        }`}>
          <BookOpen size={11} /> {dupCount} 重复
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={handleQuickCapture}
          className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
        >
          <Camera size={13} className="text-[#00D4AA]" />
          快速截图
          {screenshots.length > 0 && (
            <span className="ml-1 rounded-full bg-[#00D4AA]/20 px-1.5 py-0.5 font-mono text-[9px] text-[#00D4AA]">
              {screenshots.length}
            </span>
          )}
        </button>
        <button
          onClick={onCaptureClick}
          className="flex items-center gap-1.5 rounded border border-[#FF6B35]/50 bg-gradient-to-r from-[#FF6B35] to-[#FF8A4C] px-3.5 py-1.5 text-[11px] font-bold text-slate-900 shadow-[0_0_15px_rgba(255,107,53,0.4)] transition-all hover:shadow-[0_0_20px_rgba(255,107,53,0.6)]"
        >
          <Download size={13} />
          导出截图
        </button>
      </div>
    </header>
  );
}
