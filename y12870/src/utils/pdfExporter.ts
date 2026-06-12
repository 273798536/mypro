import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ResultItem, MissingMaterial, TidalPoint } from '@/types';

export async function captureElement(selector: string): Promise<string> {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return '';
  const c = await html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true });
  return c.toDataURL('image/png');
}

export async function exportMaritimeReport(p: {
  projectName: string;
  mapImage: string;
  reportDate: string;
  results: ResultItem[];
  tides: TidalPoint[];
  missing: MissingMaterial[];
  preparedBy: string;
}): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210, pageH = 297;
  const lm = 18, rm = 18, tm = 18;
  const contentW = pageW - lm - rm;

  function addHeader(page: number) {
    pdf.setFillColor(10, 37, 64);
    pdf.rect(0, 0, pageW, 12, 'F');
    pdf.setTextColor(255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MARITIME ADMINISTRATION 海事处 · 海浪能设备试算报告', lm, 8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${p.reportDate}`, pageW - rm - 35, 8, { align: 'right' });
    pdf.setTextColor(0);
  }

  addHeader(1);

  let y = tm + 12;
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(10, 37, 64);
  pdf.text(p.projectName, lm, y);
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80);
  pdf.text(`编制单位：海岛运维处 · 编制人：${p.preparedBy} · 报告日期：${p.reportDate}`, lm, y);
  y += 6;

  pdf.setDrawColor(201, 218, 234);
  pdf.setLineWidth(0.2);
  pdf.line(lm, y, pageW - rm, y);
  y += 6;

  if (p.mapImage) {
    try {
      const imgW = contentW, imgH = 72;
      pdf.addImage(p.mapImage, 'PNG', lm, y, imgW, imgH);
      y += imgH + 6;
    } catch { /* ignore */ }
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(10, 37, 64);
  pdf.text('一、结论状态总览', lm, y);
  y += 6;

  const statusGroups = [
    { k: 'AVAILABLE', zh: '可用（直接采用）', rgb: [14, 124, 123] as [number, number, number] },
    { k: 'DEFERRED', zh: '暂缓（需复核）', rgb: [233, 162, 59] as [number, number, number] },
    { k: 'RECOLLECT', zh: '需重新采集', rgb: [214, 64, 69] as [number, number, number] },
  ];
  statusGroups.forEach(g => {
    const list = p.results.filter(r => r.status === g.k);
    pdf.setFillColor(g.rgb[0], g.rgb[1], g.rgb[2]);
    pdf.rect(lm, y, 3, 3, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(`${g.zh}：${list.length} 项`, lm + 5, y + 2.5);
    y += 5;
    if (list.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      list.slice(0, 3).forEach(r => {
        const label = `  · ${r.label}：${r.description}`;
        const lines = pdf.splitTextToSize(label, contentW - 5);
        pdf.text(lines, lm + 5, y + 3);
        y += lines.length * 4 + 1;
      });
    }
    y += 2;
  });

  if (p.missing.length) {
    if (y > pageH - 60) { pdf.addPage(); addHeader(2); y = tm + 12; }
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(10, 37, 64);
    pdf.text('二、材料缺口清单', lm, y);
    y += 7;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0);
    p.missing.forEach((m, i) => {
      const sevMap: Record<string, [number, number, number]> = {
        AVAILABLE: [14, 124, 123], DEFERRED: [233, 162, 59], RECOLLECT: [214, 64, 69],
      };
      const rgb = sevMap[m.severity];
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      pdf.rect(lm, y, 2, 5, 'F');
      pdf.text(`${i + 1}. ${m.name}（${m.dateRange || '待补时间'}）`, lm + 4, y + 4);
      y += 5;
      pdf.setTextColor(80);
      pdf.text(`   影响：${m.impact}`, lm + 4, y + 3);
      pdf.setTextColor(0);
      y += 5;
    });
    y += 4;
  }

  if (y > pageH - 80) { pdf.addPage(); addHeader(3); y = tm + 12; }
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(10, 37, 64);
  pdf.text('三、主要潮位摘录', lm, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0);
  const hls = p.tides.filter(t => t.type).slice(0, 12);
  if (hls.length) {
    const colX = [lm, lm + 35, lm + 70, lm + 105, lm + 140];
    const headers = ['序号', '时间', '高低潮', '潮位(m)', '置信度'];
    headers.forEach((h, i) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(h, colX[i], y + 3);
    });
    y += 6;
    hls.forEach((t, i) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0);
      const row = [
        `${i + 1}`, t.time, t.type === 'H' ? '高潮 H' : '低潮 L',
        t.level.toFixed(3), `${Math.round(t.confidence * 100)}%`,
      ];
      row.forEach((v, idx) => pdf.text(v, colX[idx], y + 3));
      y += 5;
    });
  }
  y += 6;

  if (y > pageH - 50) { pdf.addPage(); addHeader(4); y = tm + 12; }
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(10, 37, 64);
  pdf.text('四、海事处复核意见', lm, y);
  y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(0);
  pdf.text('复核结论：□ 全部通过（可直接采用）  □ 部分暂缓（详见黄色标注）  □ 退回补采（红色标注项）', lm, y);
  y += 10;
  pdf.text('复核说明：', lm, y);
  y += 4;
  pdf.setDrawColor(180);
  for (let i = 0; i < 4; i++) {
    pdf.line(lm, y, pageW - rm, y);
    y += 7;
  }
  y += 6;
  pdf.text(`复核人签字：_______________  日期：___________`, lm, y + 3);

  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text('本报告由海岛运维海浪能试算台自动生成，状态色标识：绿=直接用 / 黄=复核 / 红=退回补采', pageW / 2, pageH - 8, { align: 'center' });

  const safeName = p.projectName.replace(/[^\w\u4e00-\u9fa5-]/g, '_');
  pdf.save(`${safeName}_海事处试算报告_${p.reportDate.replace(/[-/]/g, '')}.pdf`);
}
