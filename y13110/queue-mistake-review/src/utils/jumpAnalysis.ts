import type { JumpFactor, MistakeRecord, Attachment } from '../types';

export function analyzeJumpFactors(
  oldRecord: Partial<MistakeRecord>,
  newRecord: Partial<MistakeRecord>
): JumpFactor[] {
  const factors: JumpFactor[] = [];
  
  if (oldRecord.correctAnswer?.unit !== newRecord.correctAnswer?.unit) {
    const impact = calculateUnitImpact(
      oldRecord.correctAnswer?.value ?? 0,
      oldRecord.correctAnswer?.unit ?? '',
      newRecord.correctAnswer?.value ?? 0,
      newRecord.correctAnswer?.unit ?? ''
    );
    factors.push({
      type: 'unit',
      factorName: '单位变更',
      beforeValue: oldRecord.correctAnswer?.unit || '无',
      afterValue: newRecord.correctAnswer?.unit || '无',
      impactDegree: impact,
      description: `答案单位从「${oldRecord.correctAnswer?.unit || '未设置'}」变为「${newRecord.correctAnswer?.unit || '未设置'}」，导致结果偏差约${impact.toFixed(1)}%`
    });
  }
  
  if (oldRecord.formula !== newRecord.formula) {
    factors.push({
      type: 'threshold',
      factorName: '公式/阈值调整',
      beforeValue: oldRecord.formula || '无',
      afterValue: newRecord.formula || '无',
      impactDegree: 30,
      description: '计算公式或评分阈值发生变化，可能导致结果跳变'
    });
  }
  
  const oldAttachments = oldRecord.attachments || [];
  const newAttachments = newRecord.attachments || [];
  
  const oldIds = new Set(oldAttachments.map(a => a.id));
  const newIds = new Set(newAttachments.map(a => a.id));
  
  const addedAttachments = newAttachments.filter(a => !oldIds.has(a.id));
  const lateArrivals = addedAttachments.filter(a => a.isLateArrival);
  
  if (lateArrivals.length > 0) {
    const impact = Math.min(lateArrivals.length * 25, 80);
    factors.push({
      type: 'attachment',
      factorName: '晚到附件',
      beforeValue: `${oldAttachments.length}个附件`,
      afterValue: `${newAttachments.length}个附件（新增${lateArrivals.length}个晚到）`,
      impactDegree: impact,
      description: `新增${lateArrivals.length}份晚到附件：${lateArrivals.map(a => a.name).join('、')}。${lateArrivals[0]?.impactDescription || '附件内容影响了答案判断。'}`
    });
  } else if (addedAttachments.length > 0) {
    factors.push({
      type: 'attachment',
      factorName: '新增附件',
      beforeValue: `${oldAttachments.length}个附件`,
      afterValue: `${newAttachments.length}个附件`,
      impactDegree: 15,
      description: `新增${addedAttachments.length}份附件，可能影响复盘结论。`
    });
  }
  
  factors.sort((a, b) => b.impactDegree - a.impactDegree);
  
  return factors;
}

function calculateUnitImpact(
  oldValue: number, oldUnit: string,
  newValue: number, newUnit: string
): number {
  if (!oldUnit || !newUnit || oldValue === 0) return 0;
  if (oldUnit === newUnit) return 0;
  
  const diff = Math.abs(newValue - oldValue);
  return Math.min((diff / Math.abs(oldValue)) * 100, 100);
}

export function generateJumpSummary(factors: JumpFactor[]): string {
  if (factors.length === 0) {
    return '未检测到明显跳变因素，结果稳定。';
  }
  
  const primary = factors[0];
  const secondary = factors.slice(1);
  
  let summary = `结果跳变主要由「${primary.factorName}」导致（影响度${primary.impactDegree}%）。`;
  
  if (secondary.length > 0) {
    summary += ` 其他影响因素包括：${secondary.map(f => `${f.factorName}(${f.impactDegree}%)`).join('、')}。`;
  }
  
  return summary;
}

export function explainLateAttachmentImpact(attachments: Attachment[]): string {
  const lateOnes = attachments.filter(a => a.isLateArrival);
  
  if (lateOnes.length === 0) {
    return '无晚到附件，不影响结论。';
  }
  
  let explanation = `共有${lateOnes.length}份晚到附件影响本次复盘结论：\n\n`;
  
  lateOnes.forEach((att, idx) => {
    explanation += `${idx + 1}. ${att.name}\n`;
    explanation += `   - 上传时间：${att.uploadTime}\n`;
    explanation += `   - 影响说明：${att.impactDescription || '未提供具体影响说明'}\n\n`;
  });
  
  explanation += '建议：将晚到附件纳入初始资料清单，避免后续复盘出现类似跳变。';
  
  return explanation;
}
