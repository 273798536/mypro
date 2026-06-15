import type { Point, Material, MergeRelation, Anomaly, OperationLog, Remark } from '@/types';

function toCSV(rows: string[][]): string {
  return rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',')).join('\n');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAll({
  points,
  materials,
  merges,
  anomalies,
  logs,
  remarks,
}: {
  points: Point[];
  materials: Material[];
  merges: MergeRelation[];
  anomalies: Anomaly[];
  logs: OperationLog[];
  remarks: Remark[];
}) {
  const mergeById = new Map(merges.map(m => [m.id, m]));
  const matById = new Map(materials.map(m => [m.id, m]));

  const mergeRows: string[][] = [
    ['归并ID', '规范名称', '状态', '置信度', '点位数量', '参与点位名称', '归并依据', '操作人', '操作时间'],
  ];
  merges.forEach(m => {
    const pointNames = m.pointIds.map(pid => points.find(p => p.id === pid)?.name || pid).join(' / ');
    const evidenceText = m.evidence.map(e => `${e.writingA} ≈ ${e.writingB}（${e.materialRefA}、${e.materialRefB}）`).join(' | ');
    mergeRows.push([
      m.id,
      m.canonicalName,
      m.status,
      String(m.confidence),
      String(m.pointIds.length),
      pointNames,
      evidenceText + (m.evidenceNote ? '；备注：' + m.evidenceNote : ''),
      m.operator || 'system',
      m.operateTime || '-',
    ]);
  });

  const pointRows: string[][] = [
    ['点位ID', '名称', '位置', '状态', '别名', '归属归并ID', '关联材料'],
  ];
  points.forEach(p => {
    pointRows.push([
      p.id,
      p.name,
      p.location,
      p.status,
      p.aliases.join(' / '),
      p.mergeId || '-',
      p.materialIds.map(mid => matById.get(mid)?.title || mid).join('、'),
    ]);
  });

  const anomalyRows: string[][] = [
    ['异常ID', '类型', '严重程度', '关联点位', '描述', '关联材料', '是否已解决', '发现时间'],
  ];
  anomalies.forEach(a => {
    const p = points.find(pp => pp.id === a.pointId);
    anomalyRows.push([
      a.id,
      a.type,
      a.severity,
      p?.name || a.pointId,
      a.description,
      a.relatedMaterialId ? (matById.get(a.relatedMaterialId)?.title || a.relatedMaterialId) : '-',
      a.resolved ? '是' : '否',
      a.detectedAt,
    ]);
  });

  const logRows: string[][] = [
    ['时间', '操作人', '动作', '对象类型', '对象', '原因'],
  ];
  logs.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).forEach(l => {
    logRows.push([l.timestamp, l.operator, l.action, l.targetType, l.target, l.reason]);
  });

  const remarkRows: string[][] = [
    ['时间', '作者', '关联点位/归并', '内容'],
  ];
  remarks.forEach(r => {
    const refName = r.mergeId
      ? (mergeById.get(r.mergeId)?.canonicalName || r.mergeId)
      : r.pointId
        ? (points.find(p => p.id === r.pointId)?.name || r.pointId)
        : '-';
    remarkRows.push([r.timestamp, r.author, refName, r.content]);
  });

  const materialRows: string[][] = [
    ['材料ID', '标题', '来源', '上传人', '上传时间', '版本数', '是否改口径', '关联点位'],
  ];
  materials.forEach(m => {
    materialRows.push([
      m.id,
      m.title,
      m.source,
      m.uploader,
      m.uploadTime,
      String(m.currentVersion),
      m.caliberChanged ? '是' : '否',
      m.relatedPointIds.map(pid => points.find(p => p.id === pid)?.name || pid).join('、'),
    ]);
  });

  const zip = [
    '=== 夜市外摆点位归并 - 导出报告 ===',
    '导出时间：' + new Date().toISOString(),
    '',
    '--- 一、归并结果 ---',
    toCSV(mergeRows),
    '',
    '--- 二、点位明细 ---',
    toCSV(pointRows),
    '',
    '--- 三、异常清单 ---',
    toCSV(anomalyRows),
    '',
    '--- 四、材料清单 ---',
    toCSV(materialRows),
    '',
    '--- 五、备注记录 ---',
    toCSV(remarkRows),
    '',
    '--- 六、操作日志（月底可直接给领导）---',
    toCSV(logRows),
  ].join('\n');

  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  download(`夜市外摆点位归并_${ts}.txt`, zip, 'text/plain;charset=utf-8');

  return { mergeCount: merges.length, anomalyCount: anomalies.filter(a => !a.resolved).length, logCount: logs.length };
}
