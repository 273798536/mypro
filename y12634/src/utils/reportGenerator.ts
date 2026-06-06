import { BeatNode, Lane, ProductionData } from '@/types';

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
}

function collectAllNodes(lanes: Lane[]): BeatNode[] {
  return lanes.flatMap((lane) => lane.nodes);
}

export function generateMandarinExplanation(data: ProductionData): string {
  const allNodes = collectAllNodes(data.lanes);
  const total = allNodes.length;
  const normal = allNodes.filter((n) => n.status === 'normal').length;
  const needMaterial = allNodes.filter((n) => n.anomalyType === 'need_material');
  const needCaliber = allNodes.filter((n) => n.anomalyType === 'need_caliber');
  const colorIssues = allNodes.filter((n) => n.colorOutOfBounds);

  const lines: string[] = [];
  lines.push(`各位同事，现将《${data.name}》的复核情况说明如下：`);
  lines.push('');
  lines.push(`本次生产线共涉及 ${data.lanes.length} 个泳道、${total} 个节拍节点，计划总时长 ${formatMinutes(data.totalDuration)}。`);
  lines.push(`其中正常通过 ${normal} 个，需要补充材料 ${needMaterial.length} 个，需要修正口径 ${needCaliber.length} 个。`);
  lines.push('');

  if (needMaterial.length > 0) {
    lines.push('【需补材料的节点】');
    needMaterial.forEach((n, i) => {
      lines.push(`${i + 1}. ${n.title}：${n.nextAction}`);
    });
    lines.push('');
  }

  if (needCaliber.length > 0) {
    lines.push('【需改口径的节点】');
    needCaliber.forEach((n, i) => {
      lines.push(`${i + 1}. ${n.title}：${n.nextAction}`);
    });
    lines.push('');
  }

  if (colorIssues.length > 0) {
    lines.push('【颜色越界说明】');
    colorIssues.forEach((n, i) => {
      lines.push(`${i + 1}. ${n.title}：${n.colorBoundReason}`);
    });
    lines.push('');
  }

  lines.push('以上内容可以直接在评审会上说明，如有疑问请随时沟通。');
  return lines.join('\n');
}

export interface ReportSection {
  title: string;
  content: string;
}

export function generateReportSections(data: ProductionData): ReportSection[] {
  const sections: ReportSection[] = [];
  const allNodes = collectAllNodes(data.lanes);

  sections.push({
    title: '一、生产线概况',
    content: `生产线名称：${data.name}\n节拍节点总数：${allNodes.length} 个\n泳道数：${data.lanes.length} 条\n计划总时长：${formatMinutes(data.totalDuration)}\n报告生成时间：${data.generatedAt}`,
  });

  sections.push({
    title: '二、普通话解释（可直接复制发送）',
    content: generateMandarinExplanation(data),
  });

  const needMaterial = allNodes.filter((n) => n.anomalyType === 'need_material');
  if (needMaterial.length > 0) {
    const lines: string[] = [];
    needMaterial.forEach((n, i) => {
      lines.push(`${i + 1}. 节点【${n.title}】`);
      lines.push(`   · 当前状态：需补材料`);
      lines.push(`   · 下一步操作：${n.nextAction}`);
      if (n.manualNote) {
        lines.push(`   · 人工备注原话：${n.manualNote}`);
      }
      if (!n.hasScreenshot) {
        lines.push(`   · 截图素材：尚未补录`);
      }
    });
    sections.push({ title: '三、需补材料明细', content: lines.join('\n') });
  }

  const needCaliber = allNodes.filter((n) => n.anomalyType === 'need_caliber');
  if (needCaliber.length > 0) {
    const lines: string[] = [];
    needCaliber.forEach((n, i) => {
      lines.push(`${i + 1}. 节点【${n.title}】`);
      lines.push(`   · 当前状态：需改口径`);
      lines.push(`   · 下一步操作：${n.nextAction}`);
      if (n.manualNote) {
        lines.push(`   · 人工备注原话：${n.manualNote}`);
      }
      if (n.colorOutOfBounds) {
        lines.push(`   · 颜色越界被拦原因：${n.colorBoundReason}`);
      }
    });
    sections.push({ title: '四、需改口径明细（含颜色越界拦截理由）', content: lines.join('\n') });
  }

  const normalNodes = allNodes.filter((n) => n.anomalyType === 'none');
  if (normalNodes.length > 0) {
    const lines: string[] = normalNodes.map((n, i) => {
      const note = n.manualNote ? `（备注：${n.manualNote}）` : '';
      return `${i + 1}. ${n.title}${note}`;
    });
    sections.push({ title: '五、正常通过节点', content: lines.join('\n') });
  }

  return sections;
}
