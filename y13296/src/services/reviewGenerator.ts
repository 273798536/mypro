import { 
  Material, 
  ComplaintRecord, 
  ReviewResult, 
  ReviewStatus,
  LateAttachmentImpact
} from '../types';
import { detectAllAnomalies } from './anomalyDetector';
import { detectDuplicateComplaints } from './mergeDetector';
import { analyzeLateAttachmentImpact } from './lateAttachmentAnalyzer';
import { getAllVersionDiffs } from './versionTracker';

export function generateReviewResult(
  parkName: string,
  materials: Material[],
  complaints: ComplaintRecord[],
  _lateImpacts: LateAttachmentImpact[]
): ReviewResult {
  const anomalies = detectAllAnomalies(complaints);
  const mergeSuggestions = detectDuplicateComplaints(complaints);
  
  complaints.forEach(complaint => {
    const relatedAnomalies = anomalies.filter(a => a.relatedRecordIds.includes(complaint.id));
    if (relatedAnomalies.length > 0) {
      complaint.isAnomaly = true;
      complaint.anomalyType = relatedAnomalies[0].type;
      complaint.anomalyNote = relatedAnomalies.map(a => a.title).join('；');
    }
  });
  
  const versionDiffs = materials.flatMap(m => getAllVersionDiffs(m));
  
  const allLateImpacts = analyzeLateAttachmentImpact(materials, complaints);
  
  const seatCapacity = calculateSeatCapacity(complaints, allLateImpacts);
  
  const status = determineReviewStatus(anomalies, mergeSuggestions, allLateImpacts);
  
  return {
    id: `review-${Date.now()}`,
    parkName,
    reviewTime: new Date(),
    materials,
    complaints,
    anomalies,
    mergeSuggestions,
    lateAttachmentImpacts: allLateImpacts,
    versionDiffs,
    seatCapacity,
    conclusion: generateConclusion(parkName, seatCapacity, anomalies, allLateImpacts),
    status,
    requiresManualNote: generateManualNote(anomalies, mergeSuggestions, allLateImpacts),
  };
}

function calculateSeatCapacity(
  complaints: ComplaintRecord[],
  lateImpacts: LateAttachmentImpact[]
): ReviewResult['seatCapacity'] {
  const validComplaints = complaints.filter(c => !c.isAnomaly || c.anomalyType !== 'bad_data');
  
  const reported = validComplaints.reduce((sum, c) => sum + (c.seatCount || 1), 0);
  const designed = Math.max(reported, Math.ceil(validComplaints.length * 1.5));
  
  let verified = reported;
  lateImpacts.forEach(impact => {
    const lastStep = impact.impactChain[impact.impactChain.length - 1];
    if (lastStep?.afterValue && lastStep?.beforeValue) {
      const afterNum = parseInt(lastStep.afterValue);
      const beforeNum = parseInt(lastStep.beforeValue);
      if (!isNaN(afterNum) && !isNaN(beforeNum)) {
        verified = verified - beforeNum + afterNum;
      }
    }
  });
  
  return {
    designed,
    reported,
    verified,
    discrepancy: verified - reported,
  };
}

function determineReviewStatus(
  anomalies: ReviewResult['anomalies'],
  mergeSuggestions: ReviewResult['mergeSuggestions'],
  lateImpacts: LateAttachmentImpact[]
): ReviewStatus {
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  const requiresManual = anomalies.filter(a => a.requiresManualReview);
  const highPriorityMerges = mergeSuggestions.filter(m => m.confidence >= 0.8);
  
  if (criticalAnomalies.length > 0 || requiresManual.length > 2) {
    return 'needs_manual';
  }
  
  if (anomalies.length > 0 || lateImpacts.length > 0 || highPriorityMerges.length > 0) {
    return 'reviewing';
  }
  
  return 'completed';
}

function generateConclusion(
  parkName: string,
  seatCapacity: ReviewResult['seatCapacity'],
  anomalies: ReviewResult['anomalies'],
  lateImpacts: LateAttachmentImpact[]
): string {
  const parts: string[] = [];
  
  parts.push(`【${parkName}】座椅容量复核结论`);
  parts.push('');
  
  parts.push(`座椅容量情况：`);
  parts.push(`  - 申报数量：${seatCapacity.reported}个`);
  if (seatCapacity.discrepancy !== 0) {
    parts.push(`  - 核实数量：${seatCapacity.verified}个（${seatCapacity.discrepancy > 0 ? '+' : ''}${seatCapacity.discrepancy}，因晚到附件调整）`);
  } else {
    parts.push(`  - 核实数量：${seatCapacity.verified}个`);
  }
  parts.push(`  - 建议容量：${seatCapacity.designed}个（按投诉量1.5倍估算）`);
  parts.push('');
  
  const sufficient = seatCapacity.verified >= seatCapacity.designed;
  parts.push(`容量评估：${sufficient ? '✅ 容量充足' : '⚠️ 容量不足'}`);
  
  if (!sufficient) {
    const gap = seatCapacity.designed - seatCapacity.verified;
    parts.push(`缺口分析：尚缺${gap}个座椅，建议尽快补充`);
  }
  parts.push('');
  
  if (anomalies.length > 0) {
    const bySeverity = {
      critical: anomalies.filter(a => a.severity === 'critical').length,
      error: anomalies.filter(a => a.severity === 'error').length,
      warning: anomalies.filter(a => a.severity === 'warning').length,
    };
    parts.push(`异常检测：发现${anomalies.length}个异常（严重${bySeverity.critical}，错误${bySeverity.error}，警告${bySeverity.warning}）`);
  }
  
  if (lateImpacts.length > 0) {
    parts.push(`晚到附件：${lateImpacts.length}份晚到附件影响了复核结论，请查看影响链分析`);
  }
  
  return parts.join('\n');
}

function generateManualNote(
  anomalies: ReviewResult['anomalies'],
  mergeSuggestions: ReviewResult['mergeSuggestions'],
  lateImpacts: LateAttachmentImpact[]
): string {
  const notes: string[] = [];
  
  const needsManual = anomalies.filter(a => a.requiresManualReview);
  if (needsManual.length > 0) {
    notes.push(`需要人工确认${needsManual.length}个异常问题`);
    needsManual.slice(0, 3).forEach(a => {
      notes.push(`  - ${a.title}：${a.suggestion}`);
    });
    if (needsManual.length > 3) {
      notes.push(`  ... 还有${needsManual.length - 3}个异常待确认`);
    }
  }
  
  if (mergeSuggestions.length > 0) {
    const highConfidence = mergeSuggestions.filter(m => m.suggestedAction === 'merge');
    const needReview = mergeSuggestions.filter(m => m.suggestedAction === 'review');
    
    if (highConfidence.length > 0) {
      notes.push(`建议合并${highConfidence.length}组重复投诉`);
    }
    if (needReview.length > 0) {
      notes.push(`需人工判断${needReview.length}组疑似重复投诉是否合并`);
    }
  }
  
  if (lateImpacts.length > 0) {
    notes.push(`${lateImpacts.length}份晚到附件已自动纳入分析，请核对影响链是否正确`);
  }
  
  if (notes.length === 0) {
    return '无需要人工确认的事项';
  }
  
  return notes.join('\n');
}

export function explainConclusion(result: ReviewResult): string {
  const lines: string[] = [];
  
  lines.push('📊 复核结论解释');
  lines.push('');
  lines.push(`1. 数据来源：共${result.materials.length}份材料（${result.materials.map(m => m.title).join('、')}）`);
  lines.push(`2. 投诉记录：共${result.complaints.length}条，其中${result.anomalies.length}条存在异常`);
  lines.push(`3. 容量计算：`);
  lines.push(`   - 申报：${result.seatCapacity.reported}个`);
  lines.push(`   - 核实：${result.seatCapacity.verified}个`);
  lines.push(`   - 建议：${result.seatCapacity.designed}个（1.5倍投诉量）`);
  lines.push(`4. 最终结论：${result.seatCapacity.verified >= result.seatCapacity.designed ? '容量充足' : '容量不足'}`);
  
  if (result.lateAttachmentImpacts.length > 0) {
    lines.push('');
    lines.push('⚠️ 晚到附件影响说明：');
    result.lateAttachmentImpacts.forEach((impact, idx) => {
      lines.push(`   ${idx + 1}. ${impact.attachmentTitle}（延迟${impact.uploadDelayHours}小时）`);
      lines.push(`      影响${impact.affectedRecords.length}条记录，结论：${impact.conclusionChange.slice(0, 50)}...`);
    });
  }
  
  if (result.anomalies.length > 0) {
    lines.push('');
    lines.push('❌ 异常汇总：');
    result.anomalies.slice(0, 5).forEach((a, idx) => {
      lines.push(`   ${idx + 1}. [${getSeverityLabel(a.severity)}] ${a.title}`);
      lines.push(`      ${a.description.slice(0, 60)}...`);
    });
    if (result.anomalies.length > 5) {
      lines.push(`   ... 还有${result.anomalies.length - 5}个异常`);
    }
  }
  
  return lines.join('\n');
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    critical: '🔴 严重',
    error: '🟠 错误',
    warning: '🟡 警告',
  };
  return labels[severity] || severity;
}

export function getStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    pending: '待处理',
    reviewing: '复核中',
    completed: '已完成',
    needs_manual: '需人工确认',
  };
  return labels[status];
}

export function getStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    pending: 'bg-gray-100 text-gray-700',
    reviewing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    needs_manual: 'bg-red-100 text-red-700',
  };
  return colors[status];
}
