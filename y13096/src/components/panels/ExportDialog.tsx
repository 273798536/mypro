import React, { useState } from 'react';
import {
  X, FileImage, FileText, CheckSquare, Square, Download, Code,
  Layers, PencilRuler, FileWarning, Eye, Share2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useReplayStore } from '../../store/replayStore';

export const ExportDialog: React.FC = () => {
  const show = useReplayStore(s => s.showExportDialog);
  const toggle = useReplayStore(s => s.toggleExportDialog);
  const filter = useReplayStore(s => s.filter);
  const all = useReplayStore(s => s.allMaterials);
  const gaps = useReplayStore(s => s.timelineGaps);
  const camera = useReplayStore(s => s.camera);
  const currentTime = useReplayStore(s => s.currentTime);
  const savedViews = useReplayStore(s => s.savedViews);

  const [fmt, setFmt] = useState<'png' | 'pdf'>('pdf');
  const [opts, setOpts] = useState({
    filterSnapshot: true,
    caliberMarks: true,
    gapMarks: true,
    viewJSON: true,
    anomalyList: true
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!show) return null;

  const toggleOpt = (k: keyof typeof opts) => setOpts(o => ({ ...o, [k]: !o[k] }));

  const buildMetaData = () => {
    const abnormalCount = all.filter(m =>
      (opts.caliberMarks && m.hasModifiedCaliber)
      || (opts.gapMarks && m.fillsGapId)
      || m.attachmentMeta?.isLate
    ).length;

    const parts: string[] = [];
    parts.push(`■ 低空航线走廊时序回放 · 导出清单`);
    parts.push(`导出时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`);
    parts.push(`回放时间: ${currentTime}`);
    parts.push('─'.repeat(58));

    if (opts.filterSnapshot) {
      parts.push(``);
      parts.push(`【筛选口径 · FilterSnapshot —— 随接口返回一同留档】`);
      parts.push(`  raw: ${filter.rawSqlLike}`);
      parts.push(`  时间范围: ${filter.dateRange.start} → ${filter.dateRange.end}`);
      parts.push(`  异常标记: [${filter.anomalyStatus.join(', ')}]`);
      parts.push(`  材料类型: [${filter.materialTypes.join(', ')}]`);
      parts.push(`  口径修改: ${filter.hasModifiedCaliber === null ? '全部' : filter.hasModifiedCaliber ? '仅改过' : '未改过'}`);
      parts.push(`  处理状态: [${filter.processStatuses.join(', ')}]`);
    }
    if (opts.gapMarks) {
      parts.push(``);
      parts.push(`【时间轴缺段 · 标记共 ${gaps.length} 处】`);
      gaps.forEach(g => {
        const rels = g.relatedMaterialIds.map(id => all.find(m => m.id === id)?.name || id).join(' / ') || '—';
        parts.push(`  · [${g.id.toUpperCase()}] ${g.start.slice(11)} → ${g.end.slice(11)} (${g.durationMinutes}min · ${g.severity.toUpperCase()})`);
        parts.push(`      关联材料: ${rels}`);
        parts.push(`      备注: ${g.note}`);
      });
    }
    if (opts.caliberMarks) {
      const modifieds = all.filter(m => m.hasModifiedCaliber);
      parts.push(``);
      parts.push(`【口径修改记录 · 共 ${modifieds.length} 处，需评审留意】`);
      modifieds.forEach(m => {
        parts.push(`  · ${m.name} (${m.id})`);
        m.caliberHistory.forEach(c => {
          parts.push(`      [${c.changedAt.slice(5, 16)}] ${c.changedBy} · ${c.field}: ${c.beforeValue} → ${c.afterValue}`);
          parts.push(`         原因: ${c.reason}`);
        });
      });
    }
    if (opts.anomalyList) {
      const list = all.filter(m => m.attachmentMeta?.isLate || m.fillsGapId || m.processStatus === 'need_evidence' || m.processStatus === 'rejected');
      parts.push(``);
      parts.push(`【异常对象清单 · 共 ${list.length} 项 · 处理状态见右下】`);
      list.forEach(m => {
        const tags = [
          m.attachmentMeta?.isLate && '晚到附件',
          m.fillsGapId && `填补缺段(${m.fillsGapId})`,
          m.hasModifiedCaliber && '改过口径',
          m.processStatus === 'need_evidence' && '待补证据',
          m.processStatus === 'rejected' && '已驳回',
        ].filter(Boolean).join(' | ') || '—';
        parts.push(`  · [${m.processStatus}] ${m.name} · ${m.timestamp.slice(11, 16)} · ${tags}`);
        if (m.processNote) parts.push(`      备注: ${m.processNote}`);
      });
    }
    parts.push(``);
    parts.push(`【统计】总材料 ${all.length} · 异常 ${abnormalCount} · 缺段 ${gaps.length}`);
    if (opts.viewJSON) {
      parts.push(``);
      parts.push(`【视图条件 ViewState JSON · 附于文末】`);
    }
    return parts.join('\n');
  };

  const viewJSONString = JSON.stringify({
    camera,
    filter,
    currentTime,
    savedViewName: savedViews[0]?.name
  }, null, 2);

  const doExport = async () => {
    setBusy(true);
    setMsg('正在截取屏幕…');
    try {
      const target = document.getElementById('replay-root');
      if (!target) throw new Error('#replay-root 未找到');

      const canvas = await html2canvas(target, {
        backgroundColor: '#0A1628',
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.tagName === 'IFRAME' || el.classList.contains('leaflet-control-container')
      });
      const dataURL = canvas.toDataURL('image/png');
      setMsg('正在生成文件…');

      const metadata = buildMetaData();

      if (fmt === 'png') {
        const metaCanvas = document.createElement('canvas');
        const ctx = metaCanvas.getContext('2d')!;
        ctx.font = '12px JetBrains Mono, monospace';
        const lines = metadata.split('\n');
        const lineH = 17;
        const pad = 20;
        const metaH = lines.length * lineH + pad * 2
          + (opts.viewJSON ? viewJSONString.split('\n').length * 13 + 40 : 0);
        metaCanvas.width = canvas.width;
        metaCanvas.height = canvas.height + metaH;
        ctx.fillStyle = '#0A1628';
        ctx.fillRect(0, 0, metaCanvas.width, metaCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        ctx.fillStyle = '#0F2038';
        ctx.fillRect(0, canvas.height, metaCanvas.width, metaH);
        ctx.fillStyle = '#C9E4FF';
        ctx.font = '12px "Noto Sans SC", JetBrains Mono, monospace';
        lines.forEach((ln, i) => ctx.fillText(ln, pad, canvas.height + pad + i * lineH));
        if (opts.viewJSON) {
          ctx.fillStyle = '#00D4AA';
          const startY = canvas.height + pad + lines.length * lineH + 10;
          ctx.font = 'bold 12px Orbitron, sans-serif';
          ctx.fillText('VIEW STATE JSON (for restore):', pad, startY);
          ctx.font = '11px JetBrains Mono, monospace';
          ctx.fillStyle = '#60A5FA';
          viewJSONString.split('\n').forEach((ln, i) => ctx.fillText(ln, pad, startY + 20 + i * 13));
        }
        const a = document.createElement('a');
        a.href = metaCanvas.toDataURL('image/png');
        a.download = `低空航线时序回放_${currentTime.slice(0,13).replace(':','-')}.png`;
        a.click();
        setMsg('✅ PNG 导出完成（含屏幕数字、筛选口径、视图JSON）');
      } else {
        const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        pdf.setFillColor('#0A1628');
        pdf.rect(0, 0, pageW, pageH, 'F');

        const margin = 30;
        const titleH = 40;
        const metaTop = canvas.height > 0 ? 0 : margin + titleH;
        const imgH = Math.min(pageH - margin * 2 - titleH - 200, pageH * 0.58);
        const imgW = (canvas.width / canvas.height) * imgH;
        const drawW = Math.min(pageW - margin * 2, imgW);
        const drawX = (pageW - drawW) / 2;
        const drawY = margin + titleH;
        pdf.addImage(dataURL, 'PNG', drawX, drawY, drawW, imgH);

        let y = drawY + imgH + 20;
        pdf.setFontSize(8);
        pdf.setTextColor('#C9E4FF');
        metadata.split('\n').forEach(ln => {
          if (y > pageH - margin - 30) {
            pdf.addPage();
            pdf.setFillColor('#0A1628');
            pdf.rect(0, 0, pageW, pageH, 'F');
            y = margin;
          }
          pdf.setFont('JetBrainsMono-Regular', 'normal');
          const line = ln.replace(/[\u4e00-\u9fa5]/g, (c) => c + ' ');
          pdf.text(line || ' ', margin, y, { baseline: 'top', maxWidth: pageW - margin * 2 });
          y += 12;
        });

        if (opts.viewJSON) {
          pdf.addPage();
          pdf.setFillColor('#0A1628');
          pdf.rect(0, 0, pageW, pageH, 'F');
          pdf.setFontSize(11);
          pdf.setTextColor('#00D4AA');
          pdf.text('VIEW STATE JSON (粘贴回放系统即可复原):', margin, margin, { baseline: 'top' });
          y = margin + 22;
          pdf.setFontSize(7);
          pdf.setTextColor('#60A5FA');
          viewJSONString.split('\n').forEach(ln => {
            if (y > pageH - margin) { pdf.addPage(); pdf.setFillColor('#0A1628'); pdf.rect(0, 0, pageW, pageH, 'F'); y = margin; }
            pdf.text(ln, margin, y, { baseline: 'top' });
            y += 10;
          });
        }

        // 写入PDF元信息，保证数字不分家
        pdf.setProperties({
          title: `低空航线走廊时序回放_${currentTime}`,
          subject: filter.rawSqlLike,
          author: 'AirCorridorReplay',
          keywords: `口径修改=${all.filter(m => m.hasModifiedCaliber).length}, 缺段=${gaps.length}, 晚到=${all.filter(m => m.attachmentMeta?.isLate).length}`,
          creator: 'AirCorridorReplay v1.0'
        });
        pdf.save(`低空航线时序回放_${currentTime.slice(0,13).replace(':','-')}.pdf`);
        setMsg('✅ PDF 导出完成（已嵌入元信息、文末附视图JSON）');
      }
    } catch (e: any) {
      console.error(e);
      setMsg(`❌ 导出失败: ${e.message || String(e)}`);
    } finally {
      setTimeout(() => setBusy(false), 600);
    }
  };

  const Item: React.FC<{ k: keyof typeof opts; Icon: any; label: string; desc: string }>
    = ({ k, Icon, label, desc }) => (
    <button
      onClick={() => toggleOpt(k)}
      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded border transition-all ${
        opts[k] ? 'border-aero-line/50 bg-aero-line/10 shadow-glow-cyan' : 'border-aero-border/50 hover:border-aero-line/30'
      }`}
    >
      <div className="mt-0.5">{opts[k] ? <CheckSquare size={16} className="text-aero-line" /> : <Square size={16} className="text-aero-muted/60" />}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-[12px] font-medium flex items-center gap-1.5 ${opts[k] ? 'text-aero-text' : 'text-aero-muted/80'}`}>
          <Icon size={13} />{label}
        </div>
        <div className="text-[10px] text-aero-muted/70 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => !busy && toggle(false)} />
      <div className="relative w-[640px] max-w-[95vw] aero-panel aero-corner shadow-[0_0_50px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-aero-line via-aero-track to-aero-danger" />
        <header className="px-5 py-3.5 border-b border-aero-border flex items-center justify-between">
          <div>
            <div className="text-[14px] font-display font-bold text-aero-text tracking-wider flex items-center gap-2">
              <Download size={16} className="text-aero-line" />
              导出回放结果
            </div>
            <div className="text-[10px] font-mono text-aero-muted mt-0.5">
              屏幕数字 + 筛选口径 + 修改/缺段标记 合为一份文件
            </div>
          </div>
          <button className="aero-btn !py-1 !px-2" disabled={busy} onClick={() => toggle(false)}>
            <X size={14} />
          </button>
        </header>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-2">输出格式</div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setFmt('pdf')}
                className={`p-3 rounded border text-left transition-all ${
                  fmt === 'pdf' ? 'border-aero-line/60 bg-aero-line/10 shadow-glow-cyan' : 'border-aero-border/50 hover:border-aero-line/30'
                }`}
              >
                <FileText size={20} className={`${fmt === 'pdf' ? 'text-aero-line' : 'text-aero-muted/70'}`} />
                <div className={`text-[13px] font-semibold mt-1.5 ${fmt === 'pdf' ? 'text-aero-text' : 'text-aero-muted'}`}>PDF（推荐）</div>
                <div className="text-[10px] text-aero-muted/70 mt-0.5">A4横向 · 多页自动分页 · 元信息写属性</div>
              </button>
              <button
                onClick={() => setFmt('png')}
                className={`p-3 rounded border text-left transition-all ${
                  fmt === 'png' ? 'border-aero-line/60 bg-aero-line/10 shadow-glow-cyan' : 'border-aero-border/50 hover:border-aero-line/30'
                }`}
              >
                <FileImage size={20} className={`${fmt === 'png' ? 'text-aero-line' : 'text-aero-muted/70'}`} />
                <div className={`text-[13px] font-semibold mt-1.5 ${fmt === 'png' ? 'text-aero-text' : 'text-aero-muted'}`}>PNG 图片</div>
                <div className="text-[10px] text-aero-muted/70 mt-0.5">2x高清 · 一图含所有口径 · 便于即时截图</div>
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-2">导出选项（全选最稳妥）</div>
            <div className="grid grid-cols-1 gap-2">
              <Item k="filterSnapshot" Icon={Layers} label="筛选口径（写入接口返回结构）" desc="将当前FilterSnapshot原文写入文件，保证口径可追溯" />
              <Item k="caliberMarks"    Icon={PencilRuler} label="口径修改标记" desc="列出所有改过口径的字段、修改人、修改前后差异" />
              <Item k="gapMarks"        Icon={FileWarning} label="时间轴缺段标记" desc="列出所有缺段、严重程度、关联晚到材料及备注" />
              <Item k="anomalyList"     Icon={Eye}         label="异常对象处理清单" desc="晚到/待补证/驳回对象一览，方便评审助理核对" />
              <Item k="viewJSON"        Icon={Code}        label="附视图条件 JSON" desc="可粘贴回系统一键复原视角+筛选+时间点" />
            </div>
          </div>

          <div className="aero-panel-inner p-3 border-aero-line/30">
            <div className="text-[10px] font-mono uppercase tracking-wider text-aero-line mb-1.5 flex items-center gap-1">
              <Share2 size={11} />预览 · 筛选口径 FilterSnapshot (接口返回体)
            </div>
            <pre className="text-[10px] font-mono text-aero-text/90 whitespace-pre-wrap break-all leading-snug max-h-40 overflow-y-auto">
{JSON.stringify(filter, null, 2)}
            </pre>
          </div>
        </div>

        <footer className="px-5 py-3.5 border-t border-aero-border bg-aero-dim/40 flex items-center justify-between gap-3">
          <div className="text-[10px] font-mono text-aero-muted/70 min-w-0 flex-1 truncate">
            {msg || '💡 建议：导出PDF给评审，图片发给排班同事截图留痕'}
          </div>
          <button className="aero-btn" disabled={busy} onClick={() => toggle(false)}>取消</button>
          <button
            className={`aero-btn aero-btn-primary gap-2 ${busy ? 'opacity-70 cursor-wait' : ''}`}
            disabled={busy}
            onClick={doExport}
          >
            {busy ? <span className="animate-pulse">处理中…</span> : <Download size={14} />}
            {!busy && (fmt === 'pdf' ? '导出 PDF' : '导出 PNG')}
          </button>
        </footer>
      </div>
    </div>
  );
};
