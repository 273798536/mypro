import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Scheme, Material, TimelineEntry, ReasonNode } from '../types';
import { formatTime } from './time';

function buildMarkdownReport(
  scheme: Scheme,
  materials: Material[],
  timeline: TimelineEntry[],
  reasonNodes: ReasonNode[]
): string {
  const overloadList = materials.filter((m) => m.isCapacityOverload);
  const lateList = materials.filter((m) => m.isLateArrival);
  const dirtyList = materials.filter((m) => m.isDirty);

  const lines: string[] = [];
  lines.push(`# ${scheme.name} 方案比选报告`);
  lines.push('');
  lines.push(`- 状态：${scheme.status}`);
  lines.push(`- 结论：${scheme.conclusion}`);
  lines.push(`- 生成时间：${formatTime(new Date().toISOString())}`);
  lines.push(`- 容量超限：${scheme.hasCapacityOverload ? '是 ⚠️' : '否'}`);
  lines.push('');

  lines.push('## 一、材料清单（保留原始来源）');
  lines.push('');
  materials.forEach((m, idx) => {
    const flags: string[] = [];
    if (m.isCapacityOverload) flags.push('[容量超限⚠️]');
    if (m.isLateArrival) flags.push('[晚到附件]');
    if (m.isDirty) flags.push('[原始数据未清洗]');
    lines.push(
      `${idx + 1}. \`${m.originalFilename}\`  来源：${m.sourceChannel}  上传：${formatTime(m.uploadedAt)}  ${flags.join(' ')}`
    );
    if (m.note) lines.push(`   > ${m.note}`);
  });
  lines.push('');

  lines.push('## 二、原因链：为何得出此结论');
  lines.push('');
  reasonNodes.forEach((r) => {
    const ref = r.referencedMaterialId
      ? `（参见材料：${materials.find((m) => m.id === r.referencedMaterialId)?.originalFilename ?? r.referencedMaterialId}）`
      : '';
    const levelTag = r.impactLevel === 'high' ? '🔴高影响' : r.impactLevel === 'medium' ? '🟡中' : '🟢低';
    lines.push(`- ${levelTag} **${r.title}**${ref}`);
    lines.push(`  ${r.description}`);
  });
  lines.push('');

  if (overloadList.length > 0 || lateList.length > 0 || dirtyList.length > 0) {
    lines.push('## 三、异常标记汇总');
    lines.push('');
    if (overloadList.length > 0) {
      lines.push(`- 容量超限材料：${overloadList.length} 件`);
      overloadList.forEach((m) => lines.push(`  - ${m.originalFilename}`));
    }
    if (lateList.length > 0) {
      lines.push(`- 晚到附件：${lateList.length} 件`);
      lateList.forEach((m) => lines.push(`  - ${m.originalFilename}（${m.note}）`));
    }
    if (dirtyList.length > 0) {
      lines.push(`- 保留原始痕迹的材料（未清洗）：${dirtyList.length} 件`);
      dirtyList.forEach((m) => lines.push(`  - ${m.originalFilename}`));
    }
    lines.push('');
  }

  lines.push('## 四、历史变更时间线');
  lines.push('');
  timeline.forEach((t) => {
    lines.push(`- ${formatTime(t.timestamp)}  ${t.operator}  [${t.type}]  ${t.changeSummary}`);
  });

  return lines.join('\n');
}

export async function exportSchemeReport(
  scheme: Scheme,
  materials: Material[],
  timeline: TimelineEntry[],
  reasonNodes: ReasonNode[]
) {
  const zip = new JSZip();
  const md = buildMarkdownReport(scheme, materials, timeline, reasonNodes);
  zip.file(`${scheme.name}-比选报告.md`, md);

  const manifest = {
    scheme,
    materials,
    timeline,
    reasonNodes,
    exportedAt: new Date().toISOString(),
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const flagInfo = {
    capacityOverloadCount: materials.filter((m) => m.isCapacityOverload).length,
    lateArrivalCount: materials.filter((m) => m.isLateArrival).length,
    dirtyMaterialCount: materials.filter((m) => m.isDirty).length,
    hasCapacityOverload: scheme.hasCapacityOverload,
  };
  zip.file('flags.json', JSON.stringify(flagInfo, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${scheme.name}-比选报告.zip`);
}
