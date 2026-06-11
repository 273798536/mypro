import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import type { FileType, LateAttachment, PreReviewCase } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const DATA_ROOT = path.join(REPO_ROOT, '.data');
const FILES_ROOT = path.join(DATA_ROOT, 'files');

export function ensureFilesDir(caseId?: string): string {
  if (!fs.existsSync(DATA_ROOT)) fs.mkdirSync(DATA_ROOT, { recursive: true });
  if (!fs.existsSync(FILES_ROOT)) fs.mkdirSync(FILES_ROOT, { recursive: true });
  if (caseId) {
    const caseDir = path.join(FILES_ROOT, caseId);
    if (!fs.existsSync(caseDir)) fs.mkdirSync(caseDir, { recursive: true });
    return caseDir;
  }
  return FILES_ROOT;
}

export function filePathFor(caseId: string, attId: string, fileType: FileType): string {
  ensureFilesDir(caseId);
  const ext = fileTypeToExt(fileType);
  return path.join(FILES_ROOT, caseId, `${attId}.${ext}`);
}

export function fileTypeToExt(t: FileType): string {
  switch (t) {
    case 'pdf': return 'pdf';
    case 'excel': return 'csv';
    case 'image': return 'jpg';
    default: return 'txt';
  }
}

export function fileTypeToMime(t: FileType): string {
  switch (t) {
    case 'pdf': return 'application/pdf';
    case 'excel': return 'text/csv; charset=utf-8';
    case 'image': return 'image/jpeg';
    default: return 'text/plain; charset=utf-8';
  }
}

function makePdf(content: string, title: string): Buffer {
  const pages = content.split('\n\n').filter(Boolean);
  const pageCount = Math.max(pages.length, 1);

  function utf16beHex(s: string): string {
    const buf = Buffer.alloc(s.length * 2);
    for (let i = 0; i < s.length; i++) {
      buf.writeUInt16BE(s.charCodeAt(i), i * 2);
    }
    return buf.toString('hex');
  }

  function textHex(s: string): string {
    return `<${utf16beHex(s)}>`;
  }

  const streamBuffers: Buffer[] = [];
  for (let p = 0; p < pageCount; p++) {
    const text = pages[p] || '';
    const lines = text.split('\n').slice(0, 45);
    const streamLines: string[] = ['BT', '/F1 11 Tf', '72 780 Td', '14 TL'];
    for (const line of lines) {
      streamLines.push(`${textHex(line || ' ')} Tj`);
      streamLines.push('T*');
    }
    streamLines.push('ET');
    streamBuffers.push(Buffer.from(streamLines.join('\n') + '\n', 'latin1'));
  }

  const header = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary');
  const parts: { num: number; data: Buffer }[] = [];

  function addObj(n: number, content: string | Buffer): void {
    const head = Buffer.from(`${n} 0 obj\n`, 'latin1');
    const body = typeof content === 'string' ? Buffer.from(content, 'latin1') : content;
    const tail = Buffer.from('\nendobj\n', 'latin1');
    parts.push({ num: n, data: Buffer.concat([head, body, tail]) });
  }

  function addStreamObj(n: number, streamBuf: Buffer): void {
    const head = Buffer.from(`${n} 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`, 'latin1');
    const tail = Buffer.from('\nendstream\nendobj\n', 'latin1');
    parts.push({ num: n, data: Buffer.concat([head, streamBuf, tail]) });
  }

  let nextObjNum = 1;
  const catalogNum = nextObjNum++;
  const pagesNum = nextObjNum++;
  const pageNums: number[] = [];
  const contentNums: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    pageNums.push(nextObjNum++);
    contentNums.push(nextObjNum++);
  }
  const fontNum = nextObjNum++;
  const cidFontNum = nextObjNum++;
  const fontDescNum = nextObjNum++;
  const cmapNum = nextObjNum++;

  const titleHex = `<feff${utf16beHex(title)}>`;
  addObj(catalogNum, `<< /Type /Catalog /Pages ${pagesNum} 0 R /Title ${titleHex} >>`);

  const kids = pageNums.map(n => `${n} 0 R`).join(' ');
  addObj(pagesNum, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  for (let i = 0; i < pageCount; i++) {
    const pageDict = `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentNums[i]} 0 R >>`;
    addObj(pageNums[i], pageDict);
    addStreamObj(contentNums[i], streamBuffers[i]);
  }

  addObj(fontNum, `<< /Type /Font /Subtype /Type0 /BaseFont /SimSun /Encoding /Identity-H /DescendantFonts [${cidFontNum} 0 R] /ToUnicode ${cmapNum} 0 R >>`);

  addObj(cidFontNum, `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /SimSun /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${fontDescNum} 0 R /DW 1000 /W [0 [600]] >>`);

  addObj(fontDescNum, `<< /Type /FontDescriptor /FontName /SimSun /Flags 4 /FontBBox [0 -200 1000 800] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 /XHeight 500 /Leading 100 /MaxWidth 1000 /AvgWidth 500 >>`);

  const cmapContent = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfrange
<0000> <FFFF> <0000>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end
`;
  addStreamObj(cmapNum, Buffer.from(cmapContent, 'latin1'));

  const maxObjNum = nextObjNum - 1;

  parts.sort((a, b) => a.num - b.num);

  let offset = header.length;
  const offsets: Map<number, number> = new Map();
  for (const p of parts) {
    offsets.set(p.num, offset);
    offset += p.data.length;
  }

  const xrefLines: string[] = ['xref', `0 ${maxObjNum + 1}`, '0000000000 65535 f '];
  for (let i = 1; i <= maxObjNum; i++) {
    const off = offsets.get(i) ?? 0;
    xrefLines.push(String(off).padStart(10, '0') + ' 00000 n ');
  }
  const xref = xrefLines.join('\n') + '\n';

  const trailer = `trailer\n<< /Size ${maxObjNum + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;

  const body = Buffer.concat(parts.map(p => p.data));
  return Buffer.concat([header, body, Buffer.from(xref, 'latin1'), Buffer.from(trailer, 'latin1')]);
}

function makeCsv(cs: PreReviewCase, description: string): Buffer {
  const rows: string[][] = [];
  rows.push(['滨海步道风场碰撞预审 - 复核报告']);
  rows.push(['案件编号', cs.caseNumber]);
  rows.push(['位置', cs.location]);
  rows.push(['状态', cs.status]);
  rows.push(['碰撞对象类型', cs.objectType]);
  rows.push(['碰撞摘要', cs.collisionSummary]);
  rows.push(['最后操作人', cs.lastOperator]);
  rows.push(['更新时间', cs.updatedAt]);
  rows.push([]);
  rows.push(['== 巡检照片 ==']);
  rows.push(['照片ID', '原始行号', '拍摄时间', '原始说明', '是否晚到']);
  for (const p of cs.photos) {
    rows.push([p.id, String(p.rowNumber), p.takenAt, p.originalNote, p.isLate ? '是' : '否']);
  }
  rows.push([]);
  rows.push(['== 碰撞对象 ==']);
  rows.push(['对象ID', '名称', '类型', '风险等级', '来源行号', '坐标', '描述']);
  for (const o of cs.collisionObjects) {
    rows.push([o.id, o.name, o.type, o.riskLevel, String(o.sourceRow), `${o.coordinates.lng},${o.coordinates.lat}`, o.description]);
  }
  rows.push([]);
  rows.push(['== 时间轴 ==']);
  rows.push(['时间', '类型', '标题', '描述', '是否缺段']);
  for (const t of cs.timeline) {
    rows.push([t.timestamp, t.type, t.title, t.description || '', t.isGap ? '是' : '否']);
  }
  rows.push([]);
  rows.push(['== 附件描述 ==']);
  rows.push([description]);

  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const body = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return Buffer.concat([bom, Buffer.from(body, 'utf-8')]);
}

function makeHtml(cs: PreReviewCase): Buffer {
  const statusLabel: Record<string, string> = {
    pending: '待复核',
    approved: '通过复核',
    rejected: '复核驳回',
    abnormal: '异常记录',
  };
  const statusClass: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    abnormal: '#8b5cf6',
  };
  const typeLabel: Record<string, string> = {
    wind_turbine: '风机基础',
    cable: '海缆路由',
    access_road: '检修便道',
    substation: '升压站',
  };
  const riskLabel: Record<string, string> = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };
  const riskColor: Record<string, string> = {
    high: '#dc2626',
    medium: '#d97706',
    low: '#059669',
  };

  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const timelineHtml = cs.timeline.map(t => `
    <div class="tl-item ${t.isGap ? 'gap' : ''}">
      <div class="tl-dot"></div>
      <div class="tl-content">
        <div class="tl-meta">
          <span class="tl-time">${esc(t.timestamp)}</span>
          <span class="tl-type">${esc(t.type)}</span>
          ${t.isGap ? '<span class="tl-gap">缺段</span>' : ''}
        </div>
        <div class="tl-title">${esc(t.title)}</div>
        ${t.description ? `<div class="tl-desc">${esc(t.description)}</div>` : ''}
        ${t.photoId ? `<div class="tl-ref">关联照片: ${esc(t.photoId)}</div>` : ''}
        ${t.objectId ? `<div class="tl-ref">关联对象: ${esc(t.objectId)}</div>` : ''}
      </div>
    </div>
  `).join('');

  const photosHtml = cs.photos.map(p => `
    <div class="photo-card">
      <div class="photo-num">行${p.rowNumber}</div>
      <div class="photo-info">
        <div class="photo-id">${esc(p.id)}</div>
        <div class="photo-note">${esc(p.originalNote)}</div>
        <div class="photo-meta">
          <span>拍摄: ${esc(p.takenAt)}</span>
          ${p.isLate ? '<span class="badge late">晚到</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  const objectsHtml = cs.collisionObjects.map(o => `
    <div class="obj-card">
      <div class="obj-head">
        <span class="obj-name">${esc(o.name)}</span>
        <span class="obj-risk" style="color:${riskColor[o.riskLevel] || '#666'}">${riskLabel[o.riskLevel] || o.riskLevel}</span>
      </div>
      <div class="obj-meta">
        <span>类型: ${typeLabel[o.type] || o.type}</span>
        <span>来源行: ${o.sourceRow}</span>
      </div>
      <div class="obj-coord">坐标: ${o.coordinates.lng}, ${o.coordinates.lat}</div>
      <div class="obj-desc">${esc(o.description)}</div>
    </div>
  `).join('');

  const attsHtml = cs.attachments.length === 0
    ? '<div class="empty">暂无晚到附件</div>'
    : cs.attachments.map(a => `
    <div class="att-card ${a.linkedToConclusion ? 'linked' : 'unlinked'}">
      <div class="att-head">
        <span class="att-name">${esc(a.fileName)}</span>
        <span class="badge ${a.linkedToConclusion ? 'linked' : 'unlinked'}">
          ${a.linkedToConclusion ? '已关联结论' : '未关联结论'}
        </span>
      </div>
      <div class="att-meta">
        <span>类型: ${a.fileType.toUpperCase()}</span>
        <span>上传: ${esc(a.uploadedBy)} · ${esc(a.uploadedAt)}</span>
      </div>
      <div class="att-desc">${esc(a.description)}</div>
      ${a.conclusionId ? `<div class="att-conclusion">结论ID: ${esc(a.conclusionId)}</div>` : ''}
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(cs.caseNumber)} - 滨海步道风场碰撞预审复核报告</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: #f1f5f9;
    color: #1e293b;
    padding: 24px;
    line-height: 1.6;
  }
  .container { max-width: 900px; margin: 0 auto; }
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    color: white;
    padding: 28px 32px;
    border-radius: 4px;
    margin-bottom: 20px;
  }
  .header .title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  }
  .header .subtitle {
    font-size: 13px;
    color: #93c5fd;
    margin-top: 6px;
    font-family: monospace;
  }
  .section {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 20px 24px;
    margin-bottom: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .section h2 {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a5f;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #3b82f6;
    display: inline-block;
    font-family: monospace;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;
  }
  .info-item { display: flex; gap: 8px; font-size: 14px; }
  .info-item .label { color: #64748b; min-width: 90px; }
  .info-item .value { color: #1e293b; font-weight: 500; word-break: break-all; }
  .status-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 2px;
    color: white;
    font-size: 12px;
    font-weight: 600;
    background: ${statusClass[cs.status] || '#666'};
  }
  .timeline { position: relative; padding-left: 20px; }
  .timeline::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #cbd5e1;
  }
  .tl-item { position: relative; margin-bottom: 16px; }
  .tl-item.gap .tl-dot { background: #ef4444; border-color: #fecaca; }
  .tl-dot {
    position: absolute;
    left: -20px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #3b82f6;
    border: 2px solid #bfdbfe;
  }
  .tl-meta { font-size: 11px; color: #64748b; margin-bottom: 4px; font-family: monospace; }
  .tl-meta span { margin-right: 8px; }
  .tl-gap { color: #ef4444; font-weight: 600; }
  .tl-title { font-size: 14px; font-weight: 600; color: #1e293b; }
  .tl-desc { font-size: 13px; color: #475569; margin-top: 4px; }
  .tl-ref { font-size: 11px; color: #3b82f6; margin-top: 3px; font-family: monospace; }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .photo-card {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 12px;
    background: #f8fafc;
    position: relative;
  }
  .photo-num {
    position: absolute;
    top: 0;
    right: 0;
    background: #1e3a5f;
    color: white;
    font-size: 10px;
    padding: 2px 8px;
    border-bottom-left-radius: 4px;
    font-family: monospace;
  }
  .photo-id { font-size: 11px; color: #64748b; font-family: monospace; margin-bottom: 4px; }
  .photo-note { font-size: 13px; color: #1e293b; margin-bottom: 6px; }
  .photo-meta { font-size: 11px; color: #94a3b8; display: flex; gap: 8px; flex-wrap: wrap; }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 10px;
    font-weight: 600;
  }
  .badge.late { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .obj-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .obj-card {
    border: 1px solid #e2e8f0;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
    padding: 12px;
    background: #f8fafc;
  }
  .obj-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .obj-name { font-size: 14px; font-weight: 600; color: #1e3a5f; }
  .obj-risk { font-size: 11px; font-weight: 700; }
  .obj-meta { font-size: 11px; color: #64748b; margin-bottom: 6px; display: flex; gap: 12px; }
  .obj-coord { font-size: 11px; color: #3b82f6; font-family: monospace; margin-bottom: 4px; }
  .obj-desc { font-size: 12px; color: #475569; }
  .att-card {
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 10px;
    background: #f8fafc;
  }
  .att-card.unlinked { border-left: 4px solid #f87171; }
  .att-card.linked { border-left: 4px solid #34d399; }
  .att-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .att-name { font-size: 13px; font-weight: 600; color: #1e3a5f; font-family: monospace; }
  .badge.linked { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
  .badge.unlinked { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .att-meta { font-size: 11px; color: #64748b; display: flex; gap: 12px; flex-wrap: wrap; }
  .att-desc { font-size: 12px; color: #475569; margin-top: 4px; }
  .att-conclusion { font-size: 11px; color: #059669; margin-top: 4px; font-family: monospace; }
  .empty { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; }
  .footer {
    text-align: center;
    color: #94a3b8;
    font-size: 11px;
    margin-top: 20px;
    padding: 12px;
    font-family: monospace;
  }
  @media print {
    body { background: white; padding: 0; }
    .section { break-inside: avoid; box-shadow: none; }
    .header { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="title">滨海步道风场碰撞预审 · 复核报告</div>
    <div class="subtitle">COASTAL-WIND-PRE-REVIEW / FINAL REPORT</div>
  </div>

  <div class="section">
    <h2>案件概览</h2>
    <div class="info-grid">
      <div class="info-item"><span class="label">案件编号</span><span class="value">${esc(cs.caseNumber)}</span></div>
      <div class="info-item"><span class="label">案件状态</span><span class="status-badge">${statusLabel[cs.status] || cs.status}</span></div>
      <div class="info-item"><span class="label">位置</span><span class="value">${esc(cs.location)}</span></div>
      <div class="info-item"><span class="label">碰撞类型</span><span class="value">${typeLabel[cs.objectType] || cs.objectType}</span></div>
      <div class="info-item"><span class="label">碰撞摘要</span><span class="value">${esc(cs.collisionSummary)}</span></div>
      <div class="info-item"><span class="label">改判次数</span><span class="value">${cs.rejudgeCount} 次</span></div>
      <div class="info-item"><span class="label">最后操作人</span><span class="value">${esc(cs.lastOperator)}</span></div>
      <div class="info-item"><span class="label">更新时间</span><span class="value">${esc(cs.updatedAt)}</span></div>
      <div class="info-item"><span class="label">照片数量</span><span class="value">${cs.photoCount} 张</span></div>
      <div class="info-item"><span class="label">碰撞对象</span><span class="value">${cs.collisionObjects.length} 个</span></div>
      <div class="info-item"><span class="label">晚到附件</span><span class="value">${cs.attachments.length} 个</span></div>
      <div class="info-item"><span class="label">含晚到附件</span><span class="value">${cs.hasLateAttachment ? '是' : '否'}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>时间轴 (${cs.timeline.length})</h2>
    <div class="timeline">
      ${timelineHtml}
    </div>
  </div>

  <div class="section">
    <h2>巡检照片 (${cs.photos.length})</h2>
    <div class="photo-grid">
      ${photosHtml}
    </div>
  </div>

  <div class="section">
    <h2>碰撞对象 (${cs.collisionObjects.length})</h2>
    <div class="obj-grid">
      ${objectsHtml}
    </div>
  </div>

  <div class="section">
    <h2>晚到附件 (${cs.attachments.length})</h2>
    ${attsHtml}
  </div>

  <div class="footer">
    报告生成时间: ${new Date().toISOString()} · 系统: COASTAL-WIND-PRE-REVIEW v1.0
  </div>
</div>
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

function makeTxt(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

async function downloadImage(url: string, dest: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const ws = fs.createWriteStream(dest);
      let size = 0;
      res.on('data', (chunk) => { size += chunk.length; });
      res.pipe(ws);
      ws.on('finish', () => resolve(size));
      ws.on('error', reject);
    }).on('error', reject);
  });
}

export async function generateAttachmentFile(
  cs: PreReviewCase,
  att: Omit<LateAttachment, 'filePath' | 'fileSize'>,
): Promise<{ filePath: string; fileSize: number }> {
  const fpath = filePathFor(att.caseId, att.id, att.fileType);

  switch (att.fileType) {
    case 'pdf': {
      const content = buildAttachmentContent(cs, att);
      const buf = makePdf(content, att.fileName);
      fs.writeFileSync(fpath, buf);
      return { filePath: fpath, fileSize: buf.length };
    }
    case 'excel': {
      const buf = makeCsv(cs, att.description);
      fs.writeFileSync(fpath, buf);
      return { filePath: fpath, fileSize: buf.length };
    }
    case 'image': {
      const photo = cs.photos[0];
      const url = photo ? photo.thumbnailUrl : 'https://picsum.photos/800/600';
      try {
        const size = await downloadImage(url, fpath);
        return { filePath: fpath, fileSize: size };
      } catch {
        const svg = makeSvg(att.fileName, att.description);
        fs.writeFileSync(fpath.replace('.jpg', '.svg'), svg);
        return { filePath: fpath.replace('.jpg', '.svg'), fileSize: svg.length };
      }
    }
    default: {
      const content = buildAttachmentContent(cs, att);
      const buf = makeTxt(content);
      fs.writeFileSync(fpath, buf);
      return { filePath: fpath, fileSize: buf.length };
    }
  }
}

function makeSvg(title: string, desc: string): Buffer {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#1e3a5f"/>
  <rect x="40" y="40" width="720" height="520" fill="none" stroke="#60a5fa" stroke-width="2"/>
  <text x="400" y="280" font-family="sans-serif" font-size="28" fill="white" text-anchor="middle">${title}</text>
  <text x="400" y="330" font-family="sans-serif" font-size="14" fill="#93c5fd" text-anchor="middle">${desc}</text>
  <text x="400" y="540" font-family="monospace" font-size="11" fill="#60a5fa" text-anchor="middle">COASTAL-WIND-PRE-REVIEW · GENERATED</text>
</svg>`;
  return Buffer.from(svg, 'utf-8');
}

function buildAttachmentContent(cs: PreReviewCase, att: { fileName: string; description: string; uploadedBy: string; uploadedAt: string }): string {
  return `滨海步道风场碰撞预审 · 附件报告
=====================================
文件名: ${att.fileName}
描述: ${att.description}
上传人: ${att.uploadedBy}
上传时间: ${att.uploadedAt}

关联案件: ${cs.caseNumber}
案件位置: ${cs.location}
碰撞摘要: ${cs.collisionSummary}

-- 巡检照片 --
${cs.photos.slice(0, 5).map(p => `  [#${p.rowNumber}] ${p.originalNote.slice(0, 60)}`).join('\n')}

-- 碰撞对象 --
${cs.collisionObjects.map(o => `  [行${o.sourceRow}] ${o.name} (${o.type}) - ${o.description.slice(0, 50)}`).join('\n')}

-- 复核结论 --
本附件已与案件最终结论关联，可作为复核证据使用。
生成时间: ${new Date().toISOString()}
`;
}

export async function generateCaseReport(cs: PreReviewCase, format: 'pdf' | 'csv' | 'html'): Promise<{ filePath: string; fileSize: number; mime: string; fileName: string }> {
  ensureFilesDir(cs.id);
  const safeCase = cs.caseNumber.replace(/[^A-Z0-9-]/g, '_');

  if (format === 'pdf') {
    const content = buildReportContent(cs);
    const buf = makePdf(content, `复核报告 - ${cs.caseNumber}`);
    const fpath = path.join(FILES_ROOT, cs.id, `${safeCase}_复核报告.pdf`);
    fs.writeFileSync(fpath, buf);
    return { filePath: fpath, fileSize: buf.length, mime: 'application/pdf', fileName: `${safeCase}_复核报告.pdf` };
  } else if (format === 'html') {
    const buf = makeHtml(cs);
    const fpath = path.join(FILES_ROOT, cs.id, `${safeCase}_复核报告.html`);
    fs.writeFileSync(fpath, buf);
    return { filePath: fpath, fileSize: buf.length, mime: 'text/html; charset=utf-8', fileName: `${safeCase}_复核报告.html` };
  } else {
    const buf = makeCsv(cs, '完整复核报告导出');
    const fpath = path.join(FILES_ROOT, cs.id, `${safeCase}_复核报告.csv`);
    fs.writeFileSync(fpath, buf);
    return { filePath: fpath, fileSize: buf.length, mime: 'text/csv; charset=utf-8', fileName: `${safeCase}_复核报告.csv` };
  }
}

function buildReportContent(cs: PreReviewCase): string {
  return `滨海步道风场碰撞预审 · 复核报告
==============================================================================
案件编号: ${cs.caseNumber}
位置: ${cs.location}
状态: ${cs.status}
碰撞对象: ${cs.objectType}
碰撞摘要: ${cs.collisionSummary}
创建时间: ${cs.createdAt}
最后更新: ${cs.updatedAt}
最后操作人: ${cs.lastOperator}
改判次数: ${cs.rejudgeCount}
是否含晚到附件: ${cs.hasLateAttachment ? '是' : '否'}

===== 时间轴 =====
${cs.timeline.map(t => `[${t.timestamp}] ${t.isGap ? '[缺段] ' : ''}${t.title}${t.description ? ' - ' + t.description : ''}`).join('\n')}

===== 巡检照片 (共 ${cs.photos.length} 张) =====
${cs.photos.map((p, i) => `${i + 1}. 行${p.rowNumber} - ${p.originalNote}\n     拍摄时间: ${p.takenAt} 晚到: ${p.isLate ? '是' : '否'}`).join('\n')}

===== 碰撞对象 (共 ${cs.collisionObjects.length} 个) =====
${cs.collisionObjects.map((o, i) => `${i + 1}. ${o.name} (${o.type})\n     风险: ${o.riskLevel} 来源行: ${o.sourceRow}\n     坐标: ${o.coordinates.lng}, ${o.coordinates.lat}\n     描述: ${o.description}`).join('\n\n')}

===== 附件 (共 ${cs.attachments.length} 个) =====
${cs.attachments.map((a, i) => `${i + 1}. ${a.fileName} (${a.fileType})\n     上传: ${a.uploadedBy} ${a.uploadedAt}\n     关联结论: ${a.linkedToConclusion ? '是' : '否'}\n     描述: ${a.description}`).join('\n\n')}

==============================================================================
报告生成时间: ${new Date().toISOString()}
系统: COASTAL-WIND-PRE-REVIEW v1.0
`;
}

export function getFileStats(fpath: string): { exists: boolean; size?: number } {
  try {
    const st = fs.statSync(fpath);
    return { exists: st.isFile(), size: st.size };
  } catch {
    return { exists: false };
  }
}
