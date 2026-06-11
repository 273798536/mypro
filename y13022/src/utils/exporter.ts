import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import type { FilterState, Reconciliation, Screenshot } from '@/types';
import { STATUS_LABEL } from '@/types';
import { formatNumber } from './parser';

export function exportToCsv(records: Reconciliation[], filterSnapshot: FilterState): void {
  const rows = records.map((r) => ({
    合约代码: r.contractCode,
    交易日期: r.tradeDate,
    现货价: formatNumber(r.spotPrice, 4),
    期货价: formatNumber(r.futuresPrice, 4),
    基差: formatNumber(r.basis, 4),
    税费: r.taxAmount === null ? '' : formatNumber(r.taxAmount, 2),
    汇率: r.exchangeRate === null ? '' : formatNumber(r.exchangeRate, 4),
    原始混列字段: r.rawMixedField,
    金额: formatNumber(r.amount, 2),
    银行流水号: r.bankSerial,
    状态: STATUS_LABEL[r.status],
    是否回款拆分: r.isPaymentSplit ? '是' : '否',
    回款分组: r.paymentGroupId || '',
    来源批次: r.sourceBatch,
  }));

  const meta = `# 期货基差口径对账 - 导出快照\n` +
    `# 导出时间: ${new Date().toLocaleString('zh-CN')}\n` +
    `# 筛选口径: ${JSON.stringify(filterSnapshot)}\n` +
    `# 记录数: ${records.length}\n`;

  const csv = Papa.unparse(rows);
  const blob = new Blob([meta + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `期货基差对账_${dateStamp()}.csv`);
}

const MM_TO_PX = 3.77953;

export async function exportToPdf(
  records: Reconciliation[],
  filterSnapshot: FilterState,
  screenshots: Screenshot[],
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableW = pageW - margin * 2;
  let y = margin;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const headerImg = await renderHeaderCardToImage(
    'Futures Basis Reconciliation Report',
    `导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `筛选口径: ${buildFilterLabel(filterSnapshot)}`,
    `记录数: ${records.length}`,
    usableW * MM_TO_PX,
  );
  const headerH = (headerImg.height / MM_TO_PX) * (usableW / (headerImg.width / MM_TO_PX));
  doc.addImage(headerImg.dataUrl, 'PNG', margin, y, usableW, headerH);
  y += headerH + 4;

  const cols = [
    { header: 'Contract', field: 'contractCode', w: 22 },
    { header: 'Date', field: 'tradeDate', w: 24 },
    { header: 'Spot', field: 'spotPrice', w: 22 },
    { header: 'Futures', field: 'futuresPrice', w: 22 },
    { header: 'Basis', field: 'basis', w: 18 },
    { header: 'Tax', field: 'taxAmount', w: 20 },
    { header: 'Rate', field: 'exchangeRate', w: 18 },
    { header: 'Amount', field: 'amount', w: 28 },
    { header: 'Serial', field: 'bankSerial', w: 36 },
    { header: 'Status', field: 'status', w: 18 },
    { header: 'Split', field: 'isPaymentSplit', w: 14 },
  ];
  const totalColW = cols.reduce((s, c) => s + c.w, 0);
  const scale = usableW / totalColW;

  const drawHeader = () => {
    addPageIfNeeded(8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let cx = margin;
    for (const col of cols) {
      doc.text(col.header, cx, y);
      cx += col.w * scale;
    }
    y += 1;
    doc.setDrawColor(180);
    doc.line(margin, y, margin + usableW, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
  };

  drawHeader();

  doc.setFontSize(6.5);
  for (const r of records) {
    addPageIfNeeded(6);
    let cx = margin;
    const row: Record<string, string> = {
      contractCode: r.contractCode,
      tradeDate: r.tradeDate,
      spotPrice: formatNumber(r.spotPrice, 2),
      futuresPrice: formatNumber(r.futuresPrice, 2),
      basis: formatNumber(r.basis, 4),
      taxAmount: r.taxAmount === null ? '-' : formatNumber(r.taxAmount, 2),
      exchangeRate: r.exchangeRate === null ? '-' : formatNumber(r.exchangeRate, 4),
      amount: formatNumber(r.amount, 2),
      bankSerial: r.bankSerial,
      status: r.status,
      isPaymentSplit: r.isPaymentSplit ? 'Y' : 'N',
    };
    for (const col of cols) {
      doc.text(row[col.field] || '', cx, y);
      cx += col.w * scale;
    }
    y += 4.5;
  }

  const relevantShots = screenshots.filter((s) =>
    records.some((r) => r.id === s.reconciliationId),
  );

  if (relevantShots.length > 0) {
    doc.addPage();
    y = margin;
    const appTitleImg = await renderTextCardToImage(
      ['附录：截图说明', 'Appendix: Screenshot Notes'],
      usableW * MM_TO_PX,
      18,
    );
    const appTitleH = appTitleImg.height / MM_TO_PX;
    doc.addImage(appTitleImg.dataUrl, 'PNG', margin, y, usableW, appTitleH);
    y += appTitleH + 4;

    for (let i = 0; i < relevantShots.length; i++) {
      const shot = relevantShots[i];
      addPageIfNeeded(25);

      const metaCard = await renderScreenshotMetaCard(
        i + 1,
        shot.description || '(无说明)',
        shot.operator,
        shot.createdAt,
        shot.filterSnapshot,
        usableW * MM_TO_PX,
      );
      const metaCardH = metaCard.height / MM_TO_PX;
      doc.addImage(metaCard.dataUrl, 'PNG', margin, y, usableW, metaCardH);
      y += metaCardH + 3;

      if (shot.imageData && shot.imageData.startsWith('data:image/')) {
        try {
          const imgDim = await loadImageDimensions(shot.imageData);
          const maxW = usableW;
          const maxH = pageH - y - margin - 5;
          const ratio = Math.min(maxW / imgDim.width, maxH / imgDim.height, 1);
          const drawW = imgDim.width * ratio;
          const drawH = imgDim.height * ratio;

          addPageIfNeeded(drawH + 5);
          const fmt = shot.imageData.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(shot.imageData, fmt, margin, y, drawW, drawH);
          y += drawH + 5;
        } catch {
          doc.setFontSize(7);
          doc.setTextColor(180, 0, 0);
          doc.text('[Image decode failed]', margin, y);
          doc.setTextColor(0);
          y += 5;
        }
      }
    }
  }

  doc.save(`期货基差对账_${dateStamp()}.pdf`);
}

interface RenderedImage {
  dataUrl: string;
  width: number;
  height: number;
}

async function renderHeaderCardToImage(
  title: string,
  exportLine: string,
  filterLine: string,
  recordLine: string,
  widthPx: number,
): Promise<RenderedImage> {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 2;
  const w = widthPx;
  const h = 42 * MM_TO_PX;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f1419';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#d4a853';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);

  ctx.fillStyle = '#d4a853';
  ctx.font = 'bold 22px "Noto Serif SC", "Source Han Serif CN", serif';
  ctx.fillText(title, 16, 30);

  ctx.fillStyle = '#8a8f98';
  ctx.font = '13px "Noto Sans SC", "Source Han Sans CN", sans-serif';
  ctx.fillText(exportLine, 16, 54);
  ctx.fillText(filterLine, 16, 74);
  ctx.fillText(recordLine, 16, 94);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

async function renderTextCardToImage(
  lines: string[],
  widthPx: number,
  fontSize: number = 14,
): Promise<RenderedImage> {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 2;
  const lineHeight = fontSize * 1.5;
  const paddingV = 8;
  const h = lines.length * lineHeight + paddingV * 2;
  canvas.width = widthPx * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f1419';
  ctx.fillRect(0, 0, widthPx, h);

  ctx.strokeStyle = '#d4a853';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, widthPx, h);

  ctx.fillStyle = '#d4a853';
  ctx.font = `bold ${fontSize}px "Noto Serif SC", serif`;
  ctx.fillText(lines[0], 14, paddingV + fontSize);

  if (lines.length > 1) {
    ctx.fillStyle = '#8a8f98';
    ctx.font = `${fontSize * 0.75}px "Noto Sans SC", sans-serif`;
    for (let i = 1; i < lines.length; i++) {
      ctx.fillText(lines[i], 14, paddingV + fontSize + i * lineHeight * 0.9);
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: widthPx,
    height: h,
  };
}

async function renderScreenshotMetaCard(
  index: number,
  description: string,
  operator: string,
  createdAt: string,
  filterSnap: Record<string, unknown>,
  widthPx: number,
): Promise<RenderedImage> {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 2;
  const padX = 14;
  const padY = 10;
  const fs = 13;
  const lh = fs * 1.6;

  const descLines = wrapText(description, widthPx - padX * 2, fs, '"Noto Sans SC", sans-serif');
  const filterText = `筛选口径：${buildFilterLabel(filterSnap as unknown as FilterState)}`;
  const filterLines = wrapText(filterText, widthPx - padX * 2, fs - 1, '"Noto Sans SC", sans-serif');
  const totalLines = 1 + descLines.length + 1 + filterLines.length;
  const h = padY * 2 + totalLines * lh;

  canvas.width = widthPx * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0f1419';
  ctx.fillRect(0, 0, widthPx, h);

  ctx.strokeStyle = '#3a8048';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, widthPx, h);

  let cy = padY + fs;
  ctx.fillStyle = '#d4a853';
  ctx.font = `bold ${fs + 2}px "Noto Serif SC", serif`;
  ctx.fillText(`截图 ${index} / 说明`, padX, cy);
  cy += lh;

  ctx.fillStyle = '#e0e2e6';
  ctx.font = `${fs}px "Noto Sans SC", sans-serif`;
  for (const line of descLines) {
    ctx.fillText(line, padX, cy);
    cy += lh;
  }

  ctx.fillStyle = '#8a8f98';
  ctx.font = `${fs - 1}px "Noto Sans SC", sans-serif`;
  ctx.fillText(`操作人：${operator}  |  时间：${createdAt}`, padX, cy);
  cy += lh;
  for (const line of filterLines) {
    ctx.fillText(line, padX, cy);
    cy += lh;
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: widthPx,
    height: h,
  };
}

function wrapText(text: string, maxWidth: number, fontSize: number, fontFamily: string): string[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [text];
  ctx.font = `${fontSize}px ${fontFamily}`;

  const lines: string[] = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildFilterLabel(filter: FilterState): string {
  const parts: string[] = [];
  if (filter.status.length) parts.push(`状态:${filter.status.map((s) => STATUS_LABEL[s]).join('/')}`);
  if (filter.dateFrom || filter.dateTo) parts.push(`日期:${filter.dateFrom || '不限'}~${filter.dateTo || '不限'}`);
  if (filter.contractCode) parts.push(`合约:${filter.contractCode}`);
  if (filter.isPaymentSplit !== null) parts.push(`拆分:${filter.isPaymentSplit ? '是' : '否'}`);
  return parts.length ? parts.join(' | ') : '未筛选';
}
