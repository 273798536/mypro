import { useState } from 'react';
import {
  Camera,
  BookmarkPlus,
  Folder,
  Download,
  RefreshCw,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTimestamp } from '@/utils/timestamp';
import { getSharedCameraState } from '@/components/BrainAtlas3D/CameraBridge';

export const ViewpointToolbar = () => {
  const {
    currentRun,
    startNewRun,
    setShowExportDialog,
    saveViewpoint,
    selectedRecordId,
    savedViewpoints,
    currentViewpointId,
    setCurrentViewpoint,
    deleteViewpoint,
  } = useAppStore();
  const [vpName, setVpName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSave = () => {
    const camState = getSharedCameraState();
    if (!camState) return;

    let screenshot: string | undefined;
    try {
      camState.renderer.render(camState.scene, camState.camera);
      screenshot = camState.renderer.domElement.toDataURL('image/png');
    } catch {
      screenshot = undefined;
    }

    saveViewpoint({
      name: vpName.trim() || `视角 ${savedViewpoints.length + 1}`,
      cameraPosition: camState.position,
      cameraTarget: camState.target,
      screenshot,
      relatedRecordIds: selectedRecordId ? [selectedRecordId] : [],
    });
    setVpName('');
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700/50 bg-[#0B1026]/70 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/30">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h1
              className="text-[13px] font-bold text-slate-100"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              脑区连接三维图谱
            </h1>
            <div
              className="text-[10px] text-slate-500"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {currentRun.id} · 启动于 {formatTimestamp(currentRun.startedAt)}
            </div>
          </div>
        </div>

        <div className="ml-3 h-6 w-px bg-slate-700/60" />

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={savedViewpoints.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-[#0F172A]/70 px-2.5 py-1.5 text-[11px] text-slate-300 transition-all hover:border-slate-600 hover:bg-[#111827] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Folder className="h-3.5 w-3.5 text-cyan-400" />
            <span>视角</span>
            <span className="rounded bg-slate-800 px-1 text-[10px]">
              {savedViewpoints.length}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>
          {showDropdown && savedViewpoints.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-64 max-h-64 overflow-y-auto rounded-lg border border-slate-700/60 bg-[#0B1026] shadow-2xl">
              {savedViewpoints.map((vp) => {
                const active = vp.id === currentViewpointId;
                return (
                  <div
                    key={vp.id}
                    className={`flex items-center gap-2 border-b border-slate-800/50 px-2.5 py-2 last:border-b-0 transition-colors ${
                      active ? 'bg-cyan-400/10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {vp.screenshot && (
                      <img
                        src={vp.screenshot}
                        alt=""
                        className="h-8 w-12 shrink-0 rounded border border-slate-700/50 object-cover"
                      />
                    )}
                    <button
                      onClick={() => {
                        setCurrentViewpoint(active ? null : vp.id);
                        setShowDropdown(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div
                        className={`truncate text-[11px] font-semibold ${
                          active ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {vp.name}
                      </div>
                      <div
                        className="text-[9px] text-slate-500"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {formatTimestamp(vp.createdAt)}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteViewpoint(vp.id)}
                      className="rounded p-1 text-slate-500 hover:bg-[#F87171]/10 hover:text-[#F87171]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-[#0F172A]/70">
          <input
            type="text"
            value={vpName}
            onChange={(e) => setVpName(e.target.value)}
            placeholder="视角名称"
            className="w-28 bg-transparent px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-md bg-cyan-400/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 transition-all hover:bg-cyan-400/25"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          保存视角
        </button>

        <button
          className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-[#0F172A]/70 px-2.5 py-1.5 text-[11px] text-slate-300 transition-all hover:border-slate-600 hover:bg-[#111827]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Camera className="h-3.5 w-3.5 text-cyan-400" />
          截图
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={startNewRun}
          className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-[#0F172A]/70 px-2.5 py-1.5 text-[11px] text-slate-300 transition-all hover:border-violet-400/40 hover:text-violet-300"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          新批次
        </button>
        <button
          onClick={() => setShowExportDialog(true)}
          className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/30 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition-all hover:from-cyan-500/30 hover:to-violet-500/30"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Download className="h-3.5 w-3.5" />
          导出报告
        </button>
      </div>
    </div>
  );
};
