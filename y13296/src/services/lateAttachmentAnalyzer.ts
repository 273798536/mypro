import { Material, ComplaintRecord, LateAttachmentImpact } from '../types';
import { getLateArrivingVersions } from './versionTracker';

export function analyzeLateAttachmentImpact(
  materials: Material[],
  complaints: ComplaintRecord[]
): LateAttachmentImpact[] {
  const impacts: LateAttachmentImpact[] = [];
  
  materials.forEach(material => {
    const lateVersions = getLateArrivingVersions(material);
    
    lateVersions.forEach(lateVersion => {
      const previousVersion = material.versions.find(v => v.version === lateVersion.version - 1);
      if (!previousVersion) return;
      
      const firstVersion = material.versions[0];
      const delayMs = lateVersion.uploadTime.getTime() - firstVersion.uploadTime.getTime();
      const delayHours = Math.round(delayMs / (1000 * 60 * 60));
      
      const affectedRecords = complaints.filter(c => 
        c.materialId === material.id && 
        c.versionId === lateVersion.id
      );
      
      if (affectedRecords.length === 0) return;
      
      const impactChain = buildImpactChain(previousVersion, lateVersion, affectedRecords);
      
      const { originalConclusion, revisedConclusion } = buildConclusions(
        previousVersion.content, 
        lateVersion.content, 
        affectedRecords
      );
      
      impacts.push({
        id: `late-impact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        attachmentId: lateVersion.id,
        attachmentTitle: material.title,
        uploadDelayHours: delayHours,
        affectedRecords: affectedRecords.map(r => r.id),
        impactChain,
        conclusionChange: generateConclusionChange(impactChain, originalConclusion, revisedConclusion),
        originalConclusion,
        revisedConclusion,
      });
    });
  });
  
  return impacts;
}

function buildImpactChain(
  previousVersion: Material['versions'][0],
  lateVersion: Material['versions'][0],
  affectedRecords: ComplaintRecord[]
): LateAttachmentImpact['impactChain'] {
  const chain: LateAttachmentImpact['impactChain'] = [];
  let step = 1;
  
  chain.push({
    step: step++,
    description: `晚到附件于${formatDate(lateVersion.uploadTime)}上传，比首份材料晚${calculateDelayText(previousVersion.uploadTime, lateVersion.uploadTime)}`,
  });
  
  const prevLines = previousVersion.content.split('\n');
  const lateLines = lateVersion.content.split('\n');
  
  const maxLines = Math.max(prevLines.length, lateLines.length);
  for (let i = 0; i < maxLines; i++) {
    const prevLine = prevLines[i] || '';
    const lateLine = lateLines[i] || '';
    
    if (prevLine !== lateLine) {
      const fieldMatch = parseLine(lateLine);
      const prevMatch = parseLine(prevLine);
      
      chain.push({
        step: step++,
        description: `第${i + 1}行数据发生变更`,
        affectedField: fieldMatch?.field || prevMatch?.field,
        beforeValue: prevMatch?.value || prevLine || '(空)',
        afterValue: fieldMatch?.value || lateLine || '(空)',
      });
      
      if (fieldMatch?.field && isKeyField(fieldMatch.field)) {
        const relatedRecords = affectedRecords.filter(r => 
          r.rawReference.lineNumber === i + 1 || 
          r.description.includes(fieldMatch.value!) ||
          (r.seatCount !== undefined && lateLine.includes(String(r.seatCount)))
        );
        
        if (relatedRecords.length > 0) {
          chain.push({
            step: step++,
            description: `该变更影响${relatedRecords.length}条投诉记录的${getFieldChineseName(fieldMatch.field)}统计`,
            affectedField: fieldMatch.field,
          });
        }
      }
    }
  }
  
  const seatChange = calculateSeatChange(previousVersion.content, lateVersion.content);
  if (seatChange !== 0) {
    chain.push({
      step: step++,
      description: `座椅容量${seatChange > 0 ? '增加' : '减少'}了${Math.abs(seatChange)}个`,
      beforeValue: String(extractTotalSeats(previousVersion.content)),
      afterValue: String(extractTotalSeats(lateVersion.content)),
    });
  }
  
  return chain;
}

function parseLine(line: string): { field: string; value: string } | null {
  const match = line.match(/^(.+?)[:：]\s*(.+)$/);
  if (!match) return null;
  return { field: match[1].trim(), value: match[2].trim() };
}

function isKeyField(field: string): boolean {
  return ['座椅数量', '座位数', '容量', '投诉数', '涉及人数'].some(f => field.includes(f));
}

function getFieldChineseName(field: string): string {
  const names: Record<string, string> = {
    '座椅数量': '座椅数量',
    '座位数': '座位数',
    '容量': '容量',
    '投诉数': '投诉数量',
    '涉及人数': '涉及人数',
  };
  return names[field] || field;
}

function calculateSeatChange(prevContent: string, newContent: string): number {
  const prevSeats = extractTotalSeats(prevContent);
  const newSeats = extractTotalSeats(newContent);
  return newSeats - prevSeats;
}

function extractTotalSeats(content: string): number {
  const matches = content.match(/座椅数量[:：]\s*(\d+)/g) || [];
  return matches.reduce((sum, match) => {
    const num = match.match(/\d+/);
    return sum + (num ? parseInt(num[0], 10) : 0);
  }, 0);
}

function buildConclusions(
  prevContent: string, 
  newContent: string, 
  records: ComplaintRecord[]
): { originalConclusion: string; revisedConclusion: string } {
  const prevSeats = extractTotalSeats(prevContent);
  const newSeats = extractTotalSeats(newContent);
  const complaintCount = records.length;
  
  const originalSufficient = prevSeats >= complaintCount * 1.5;
  const revisedSufficient = newSeats >= complaintCount * 1.5;
  
  const originalConclusion = originalSufficient
    ? `原结论：座椅容量${prevSeats}个，可满足${complaintCount}位居民使用，容量充足`
    : `原结论：座椅容量${prevSeats}个，${complaintCount}位居民投诉不足，存在缺口`;
  
  const revisedConclusion = revisedSufficient
    ? `修正结论：更新后座椅容量${newSeats}个，可满足${complaintCount}位居民使用，容量充足`
    : `修正结论：更新后座椅容量${newSeats}个，${complaintCount}位居民投诉不足，仍存在缺口`;
  
  return { originalConclusion, revisedConclusion };
}

function generateConclusionChange(
  impactChain: LateAttachmentImpact['impactChain'],
  original: string,
  revised: string
): string {
  const changedFields = impactChain
    .filter(s => s.affectedField)
    .map(s => `${s.affectedField}从"${s.beforeValue}"改为"${s.afterValue}"`)
    .join('；');
  
  if (original === revised) {
    return `虽然${changedFields}，但最终结论未发生变化。${revised}`;
  }
  
  return `由于${changedFields}，结论发生变化。原结论：${original}；${revised}`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function calculateDelayText(date1: Date, date2: Date): string {
  const diffMs = date2.getTime() - date1.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  
  if (diffDays > 0) {
    return `${diffDays}天${remainingHours > 0 ? remainingHours + '小时' : ''}`;
  }
  return `${diffHours}小时`;
}

export function hasLateAttachments(materials: Material[]): boolean {
  return materials.some(m => m.versions.some(v => v.isLateArrival));
}

export function getLateAttachmentMaterials(materials: Material[]): Material[] {
  return materials.filter(m => m.versions.some(v => v.isLateArrival));
}

export function explainLateAttachmentImpact(impact: LateAttachmentImpact): string {
  const lines: string[] = [];
  
  lines.push(`📎 晚到附件：${impact.attachmentTitle}`);
  lines.push(`⏰ 延迟：${impact.uploadDelayHours}小时`);
  lines.push(`📋 影响记录：${impact.affectedRecords.length}条`);
  lines.push('');
  lines.push('🔗 影响链：');
  
  impact.impactChain.forEach(step => {
    const stepText = [`  ${step.step}. ${step.description}`];
    if (step.beforeValue && step.afterValue) {
      stepText.push(`     ${step.beforeValue} → ${step.afterValue}`);
    }
    lines.push(stepText.join('\n'));
  });
  
  lines.push('');
  lines.push(`📝 结论变化：${impact.conclusionChange}`);
  
  return lines.join('\n');
}
