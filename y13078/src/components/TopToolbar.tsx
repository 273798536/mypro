import {
  Filter, Image as ImageIcon, Layers, Save, Share2, AlertTriangle, Download,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { regionLabel, typeLabel, statusLabel } from '@/utils/helpers';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Point, OverlapPair, UnifiedSummary } from '../../shared/types';

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

  const buildPdfHtml = (data: {
    summary: UnifiedSummary;
    points: Point[];
    overlaps: OverlapPair[];
    generatedAt: string;
  }) => {
    const pointRows = data.points.map(p => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${p.id}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${p.cabinetId}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${typeLabel[p.type]}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${p.withdrawn ? '已撤回' : statusLabel[p.status].text}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${p.remark || '-'}</td>
      </tr>
    `).join('');

    const overlapRows = data.overlaps.map(o => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${o.severity === 'high' ? '高风险' : o.severity === 'medium' ? '中风险' : '低风险'}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${o.pointIds[0]} ↔ ${o.pointIds[1]}</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${o.distance.toFixed(2)} px</td>
        <td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${o.threshold} px</td>
      </tr>
    `).join('');

    const talkingPoints = data.summary.talkingPoints.map(tp => `
      <li style="margin:6px 0;font-size:13px;line-height:1.7;">${tp}</li>
    `).join('');

    return `
      <div style="width:750px;padding:40px;background:#ffffff;font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;color:#0f172a;">
        <div style="text-align:center;border-bottom:2px solid #0ea5e9;padding-bottom:20px;margin-bottom:30px;">
          <h1 style="font-size:24px;font-weight:700;margin:0 0 8px 0;color:#0f766e;">数据中心冷通道剖面讲解报告</h1>
          <p style="font-size:12px;color:#64748b;margin:0;">Data Center Cold Aisle Profile Report</p>
          <p style="font-size:12px;color:#94a3b8;margin:8px 0 0 0;">生成时间：${new Date(data.generatedAt).toLocaleString('zh-CN')}</p>
        </div>

        <div style="margin-bottom:30px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#0f766e;border-left:4px solid #0ea5e9;padding-left:10px;">执行摘要</h2>
          <p style="font-size:13px;line-height:1.8;color:#334155;margin:0;background:#f0f9ff;padding:16px;border-radius:6px;border:1px solid #bae6fd;">
            ${data.summary.reportSummary}
          </p>
        </div>

        <div style="margin-bottom:30px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#0f766e;border-left:4px solid #0ea5e9;padding-left:10px;">讲解主线</h2>
          <ol style="margin:0;padding-left:24px;">
            ${talkingPoints}
          </ol>
        </div>

        <div style="margin-bottom:30px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#0f766e;border-left:4px solid #0ea5e9;padding-left:10px;">点位清单</h2>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;">点位ID</th>
                <th style="border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;">机柜</th>
                <th style="border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;">类型</th>
                <th style="border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;">状态</th>
                <th style="border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;">备注</th>
              </tr>
            </thead>
            <tbody>
              ${pointRows}
            </tbody>
          </table>
        </div>

        ${data.overlaps.length > 0 ? `
        <div style="margin-bottom:30px;">
          <h2 style="font-size:16px;font-weight:700;margin:0 0 12px 0;color:#dc2626;border-left:4px solid #f87171;padding-left:10px;">重叠告警（${data.overlaps.length}）</h2>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#fef2f2;">
                <th style="border:1px solid #fca5a5;padding:8px;font-size:12px;text-align:left;">风险等级</th>
                <th style="border:1px solid #fca5a5;padding:8px;font-size:12px;text-align:left;">重叠点位</th>
                <th style="border:1px solid #fca5a5;padding:8px;font-size:12px;text-align:left;">实际距离</th>
                <th style="border:1px solid #fca5a5;padding:8px;font-size:12px;text-align:left;">阈值</th>
              </tr>
            </thead>
            <tbody>
              ${overlapRows}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div style="margin-top:40px;padding-top:20px;border-top:1px dashed #cbd5e1;text-align:center;">
          <p style="font-size:11px;color:#94a3b8;margin:0;">本报告由冷通道剖面讲解系统自动生成 · 三栏口径统一</p>
        </div>
      </div>
    `;
  };

  const exportPdf = async () => {
    const res = await fetch('/api/export/pdf');
    const data = await res.json();

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = buildPdfHtml(data);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 40;

      pdf.addImage(imgData, 'PNG', 40, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - 80);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 40;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 40, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - 80);
      }

      pdf.save(`冷通道剖面讲解报告-${Date.now()}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  const handle = async () => {
    toggleExportMenu();
    if (action === 'pdf') {
      await exportPdf();
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
