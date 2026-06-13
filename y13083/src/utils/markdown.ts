import type {
  HazardObject,
  CadLayer,
  ManualNote,
  FilterState,
} from '@/types';
import { sourceLabels, typeLabels } from './helpers';

function sourceBadge(s: string): string {
  return `\`${sourceLabels[s] || s}\``;
}

export function generateMarkdownReport(params: {
  objects: HazardObject[];
  layers: CadLayer[];
  notes: ManualNote[];
  filter: FilterState;
  generatedAt: string;
}): string {
  const { objects, layers, notes, filter, generatedAt } = params;

  const abnormalList = objects.filter((o) => o.isAbnormal);
  const overlapList = objects.filter((o) => o.isOverlapping);
  const normalList = objects.filter((o) => !o.isAbnormal && !o.isOverlapping);

  const lines: string[] = [];

  lines.push('# 码头危险品库剖面讲解报告');
  lines.push('');
  lines.push(`> 生成时间：${generatedAt}`);
  lines.push('');

  lines.push('## 一、筛选条件');
  lines.push('');
  lines.push(`- 数据来源：${filter.sources.map(sourceBadge).join('、') || '无'}`);
  lines.push(`- 对象类型：${filter.types.map((t) => `\`${typeLabels[t]}\``).join('、') || '无'}`);
  lines.push(`- 仅显示异常：${filter.showAbnormalOnly ? '是' : '否'}`);
  lines.push(`- 仅显示重叠：${filter.showOverlappingOnly ? '是' : '否'}`);
  lines.push(`- 可见图层：${layers.filter((l) => l.visible).map((l) => l.name).join('、') || '无'}`);
  lines.push('');

  lines.push('## 二、总体统计');
  lines.push('');
  lines.push(`| 类别 | 数量 |`);
  lines.push(`|------|------|`);
  lines.push(`| 当前可见对象总数 | ${objects.length} |`);
  lines.push(`| 异常对象 | ${abnormalList.length} |`);
  lines.push(`| 重叠对象 | ${overlapList.length} |`);
  lines.push(`| 正常对象 | ${normalList.length} |`);
  lines.push(`| 关联人工备注 | ${notes.length} |`);
  lines.push('');

  if (abnormalList.length > 0) {
    lines.push('## 三、异常对象（优先关注）');
    lines.push('');
    abnormalList.forEach((o) => {
      lines.push(`### ${o.name}（${typeLabels[o.type]}）`);
      lines.push('');
      lines.push(`- 数据来源：${sourceBadge(o.source)}`);
      lines.push(`- 所在图层：${layers.find((l) => l.id === o.layerId)?.name || o.layerId}`);
      lines.push(`- 位置坐标：(${o.position.map((v) => v.toFixed(1)).join(', ')})`);
      lines.push(`- 说明：${o.description}`);
      const objNotes = notes.filter((n) => n.objectId === o.id);
      if (objNotes.length > 0) {
        lines.push(`- 人工备注：`);
        objNotes.forEach((n) => {
          lines.push(`  - **${n.author}**（${n.createdAt}）：${n.content}`);
        });
      }
      lines.push('');
    });
  }

  if (overlapList.length > 0) {
    lines.push('## 四、重叠对象（单独拎出）');
    lines.push('');
    overlapList.forEach((o) => {
      const overlaps = o.overlappingWith
        .map((id) => objects.find((x) => x.id === id)?.name || id)
        .join('、');
      lines.push(`- **${o.name}** ↔ ${overlaps} — ${o.description}`);
    });
    lines.push('');
  }

  if (normalList.length > 0) {
    lines.push('## 五、正常对象');
    lines.push('');
    lines.push(`| 名称 | 类型 | 来源 | 说明 |`);
    lines.push(`|------|------|------|------|`);
    normalList.forEach((o) => {
      lines.push(`| ${o.name} | ${typeLabels[o.type]} | ${sourceLabels[o.source]} | ${o.description} |`);
    });
    lines.push('');
  }

  if (notes.length > 0) {
    lines.push('## 六、全部人工备注');
    lines.push('');
    notes.forEach((n) => {
      const obj = objects.find((o) => o.id === n.objectId);
      lines.push(`- [${obj?.name || n.objectId}] **${n.author}**（${n.createdAt}）：${n.content}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('_本报告由码头危险品库剖面讲解系统自动生成，内容与导出时页面状态一致。_');

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
