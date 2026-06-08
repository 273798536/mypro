import { useState } from 'react';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { buildReport, downloadReport } from '@/utils/exporter';
import type { SampleType } from '@/types';
import { Download, BookOpen, Camera, ChevronDown, FileJson } from 'lucide-react';

const samples: { type: SampleType; label: string; desc: string }[] = [
  { type: 'normal', label: '顺利样例', desc: '排布合规，无异常' },
  { type: 'pending', label: '待确认样例', desc: '部分笼位需甲方确认' },
  { type: 'bad', label: '坏数据样例', desc: '含越界与漂浮问题' },
];

export default function Toolbar() {
  const [open, setOpen] = useState(false);
  const loadSample = useLayoutStore((s) => s.loadSample);
  const cages = useLayoutStore((s) => s.cages);
  const config = useLayoutStore((s) => s.config);
  const issues = useLayoutStore((s) => s.issues);
  const cameraViews = useLayoutStore((s) => s.cameraViews);
  const [currentLabel, setCurrentLabel] = useState<string>('顺利样例');

  const handleExport = () => {
    const report = buildReport(cages, config, issues, cameraViews);
    downloadReport(report);
  };

  const handleSample = (type: SampleType, label: string) => {
    loadSample(type);
    setCurrentLabel(label);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/60">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-sky-400" />
          <h1 className="text-lg font-semibold text-slate-100 tracking-wide">实验动物笼位三维排布</h1>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-300 border border-slate-600/60">
          评审版
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-800/80 border border-slate-700/70 hover:bg-slate-700/80 text-slate-100 transition"
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>样例：{currentLabel}</span>
            <ChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg bg-slate-800/95 border border-slate-700/80 shadow-2xl z-50 overflow-hidden">
              {samples.map((s) => (
                <button
                  key={s.type}
                  type="button"
                  onClick={() => handleSample(s.type, s.label)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-700/70 transition border-b last:border-b-0 border-slate-700/50"
                >
                  <div className="text-sm text-slate-100 font-medium">{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-lg shadow-sky-900/40 border border-sky-400/30"
        >
          <FileJson className="w-4 h-4" />
          <Download className="w-4 h-4" />
          <span>导出报告</span>
        </button>
      </div>
    </div>
  );
}
