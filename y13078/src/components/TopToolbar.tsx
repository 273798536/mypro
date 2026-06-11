import {
  Filter, Image as ImageIcon, Layers, Save, Share2, AlertTriangle, Download,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { regionLabel } from '@/utils/helpers';

const REGIONS = ['A', 'B'] as const;
const TYPES = [
  { v: 'sensor', t: '传感器' },
  { v: 'outlet', t: '插座' },
  { v: 'switch', t: '交换机' },
  { v: 'cable', t: '走线' },
] as const;
const STATUSES = [
  { v: 'normal', t: '正常', cls: '!text-cold-success' },
  { v: 'warning', t: '预警', cls: '!text-cold-warning' },
  { v: 'error', t: '故障', cls: '!text-cold-danger' },
] as const;

export default function TopToolbar() {
  const {
    filters, setFilters,
    openViewDrawer, openSummaryModal, toggleExportMenu, exportMenuOpen,
    overlaps, refreshAll, activeViewId, views,
  } = useAppStore();

  const activeView = views.find(v => v.id === activeViewId);

  const toggleRegion = (r: string) => {
    const next = filters.regions.includes(r)
      ? filters.regions.filter(x => x !== r)
      : [...filters.regions, r];
    setFilters({ regions: next });
  };
  const toggleType = (t: string) => {
    const next = filters.types.includes(t as never)
      ? filters.types.filter(x => x !== t)
      : [...filters.types, t as never];
    setFilters({ types: next });
  };
  const toggleStatus = (s: string) => {
    const next = filters.statuses.includes(s as never)
      ? filters.statuses.filter(x => x !== s)
      : [...filters.statuses, s as never];
    setFilters({ statuses: next });
  };

  return (
    <div className="h-12 flex items-center px-4 gap-4 border-b border-cold-border bg-cold-panel/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-[2px] bg-cold-primary/60 flex items-center justify-center border border-cold-primaryLight/50">
          <Layers className="w-4 h-4 text-cold-accent" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-100">数据中心冷通道剖面讲解</div>
          {activeView ? (
            <div className="text-[10px] text-cold-accent font-mono-data">{activeView.name}</div>
          ) : (
            <div className="text-[10px] text-slate-500">自定义视角 · 实时编辑</div>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-cold-border mx-1" />

      <div className="flex items-center gap-1.5 min-w-0">
        <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="text-[11px] text-slate-400 mr-1">区域</span>
        {REGIONS.map(r => (
          <button
            key={r}
            onClick={() => toggleRegion(r)}
            className={`chip ${filters.regions.includes(r) ? 'chip-active' : 'chip-idle'}`}
          >
            {regionLabel(r)}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-3 mr-1">类型</span>
        {TYPES.map(t => (
          <button
            key={t.v}
            onClick={() => toggleType(t.v)}
            className={`chip ${filters.types.includes(t.v as never) ? 'chip-active' : 'chip-idle'}`}
          >
            {t.t}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-3 mr-1">状态</span>
        {STATUSES.map(s => (
          <button
            key={s.v}
            onClick={() => toggleStatus(s.v)}
            className={`chip ${filters.statuses.includes(s.v as never) ? 'chip-active' : 'chip-idle'} ${s.cls}`}
          >
            {s.t}
          </button>
        ))}
        <button
          onClick={() => setFilters({ showWithdrawn: !filters.showWithdrawn })}
          className={`chip ${filters.showWithdrawn ? 'chip-active' : 'chip-idle'}`}
        >
          撤回记录
        </button>
      </div>

      <div className="flex-1" />

      {overlaps.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-[2px] bg-cold-danger/10 border border-cold-danger/40 text-[11px] text-cold-danger">
          <AlertTriangle className="w-3 h-3" />
          {overlaps.length} 组重叠
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="btn-industrial" onClick={refreshAll} title="刷新所有数据">
          <Save className="w-3.5 h-3.5" /> 同步数据
        </button>
        <button className="btn-industrial" onClick={openViewDrawer}>
          <ImageIcon className="w-3.5 h-3.5" /> 视角管理
        </button>
        <button className="btn-industrial" onClick={openSummaryModal}>
          <Share2 className="w-3.5 h-3.5" /> 沟通摘要
        </button>
        <div className="relative">
          <button className="btn-industrial-primary" onClick={toggleExportMenu}>
            <Download className="w-3.5 h-3.5" /> 导出
          </button>
          {exportMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-44 panel rounded-[2px] z-50 py-1 shadow-xl">
              <ExportItem label="PNG 截图导出" hint="含当前视角" action="png" />
              <ExportItem label="PDF 报告导出" hint="统一口径" action="pdf" />
              <ExportItem label="JSON 原始数据" hint="含撤回/后补" action="json" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportItem({ label, hint, action }: { label: string; hint: string; action: string }) {
  const toggleExportMenu = useAppStore(s => s.toggleExportMenu);
  const handle = async () => {
    toggleExportMenu();
    if (action === 'pdf') {
      window.open('/api/export/pdf', '_blank');
    } else if (action === 'json') {
      const res = await fetch('/api/export/summary-json');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cold-aisle-data-${Date.now()}.json`;
      a.click(); URL.revokeObjectURL(url);
    } else if (action === 'png') {
      const canvas = document.getElementById('profile-canvas');
      if (!canvas) return;
      const svgData = new XMLSerializer().serializeToString(canvas as unknown as Node);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = window.Image ? new window.Image() : document.createElement('img');
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 1600; c.height = 1000;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, 1600, 1000);
        ctx.drawImage(img, 40, 40, 1520, 920);
        c.toBlob(b => {
          if (!b) return;
          const durl = URL.createObjectURL(b);
          const a = document.createElement('a');
          a.href = durl; a.download = `cold-aisle-${Date.now()}.png`;
          a.click(); URL.revokeObjectURL(durl);
        }, 'image/png');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };
  return (
    <button onClick={handle} className="w-full text-left px-3 py-2 hover:bg-slate-700/40 transition-colors">
      <div className="text-xs text-slate-100">{label}</div>
      <div className="text-[10px] text-slate-400">{hint}</div>
    </button>
  );
}
