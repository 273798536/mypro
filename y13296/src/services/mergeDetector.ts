import { ComplaintRecord, MergeSuggestion } from '../types';

export function detectDuplicateComplaints(records: ComplaintRecord[]): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = [];
  const processed = new Set<string>();
  
  const byLocation = new Map<string, ComplaintRecord[]>();
  
  records.forEach(record => {
    const key = `${record.street.trim()}-${(record.intersection || '').trim()}`;
    if (!byLocation.has(key)) {
      byLocation.set(key, []);
    }
    byLocation.get(key)!.push(record);
  });
  
  byLocation.forEach((locationRecords) => {
    if (locationRecords.length < 2) return;
    
    for (let i = 0; i < locationRecords.length; i++) {
      for (let j = i + 1; j < locationRecords.length; j++) {
        const r1 = locationRecords[i];
        const r2 = locationRecords[j];
        
        const pairKey = [r1.id, r2.id].sort().join('-');
        if (processed.has(pairKey)) continue;
        processed.add(pairKey);
        
        const similarity = calculateComplaintSimilarity(r1, r2);
        
        if (similarity >= 0.6) {
          suggestions.push(createMergeSuggestion(
            [r1.id, r2.id],
            r1.street,
            r1.intersection,
            generateMergeReason(r1, r2, similarity),
            similarity,
            similarity >= 0.8 ? 'merge' : 'review'
          ));
        }
      }
    }
  });
  
  return suggestions;
}

function calculateComplaintSimilarity(r1: ComplaintRecord, r2: ComplaintRecord): number {
  let score = 0;
  let weight = 0;
  
  if (r1.street === r2.street) {
    score += 0.3;
  }
  weight += 0.3;
  
  if ((r1.intersection && r2.intersection && r1.intersection === r2.intersection) ||
      (!r1.intersection && !r2.intersection)) {
    score += 0.25;
  }
  weight += 0.25;
  
  if (r1.complaintType === r2.complaintType) {
    score += 0.2;
  }
  weight += 0.2;
  
  const descSimilarity = calculateTextSimilarity(r1.description, r2.description);
  score += descSimilarity * 0.25;
  weight += 0.25;
  
  if (r1.seatCount !== undefined && r2.seatCount !== undefined) {
    if (r1.seatCount === r2.seatCount) {
      score += 0.1;
    }
    weight += 0.1;
  }
  
  const timeDiff = Math.abs(r1.reportedTime.getTime() - r2.reportedTime.getTime());
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  if (hoursDiff < 24) {
    score += 0.1;
  } else if (hoursDiff < 72) {
    score += 0.05;
  }
  weight += 0.1;
  
  return weight > 0 ? score / weight : 0;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/[\s，。、；：""''（）()【】\[\]、,.;:!?]+/).filter(w => w.length > 0));
  const words2 = new Set(text2.split(/[\s，。、；：""''（）()【】\[\]、,.;:!?]+/).filter(w => w.length > 0));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });
  
  const union = words1.size + words2.size - intersection;
  return intersection / union;
}

function generateMergeReason(r1: ComplaintRecord, r2: ComplaintRecord, similarity: number): string {
  const reasons: string[] = [];
  
  if (r1.street === r2.street && r1.intersection === r2.intersection) {
    reasons.push('位置完全相同');
  } else if (r1.street === r2.street) {
    reasons.push('街道相同');
  }
  
  if (r1.complaintType === r2.complaintType) {
    reasons.push(`投诉类型相同（${r1.complaintType}）`);
  }
  
  if (r1.reporter === r2.reporter) {
    reasons.push('投诉人相同');
  }
  
  const timeDiff = Math.abs(r1.reportedTime.getTime() - r2.reportedTime.getTime());
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  if (hoursDiff < 24) {
    reasons.push(`投诉时间接近（相差${Math.round(hoursDiff)}小时）`);
  }
  
  reasons.push(`内容相似度${Math.round(similarity * 100)}%`);
  
  return reasons.join('；');
}

function createMergeSuggestion(
  recordIds: string[],
  street: string,
  intersection: string | undefined,
  reason: string,
  confidence: number,
  suggestedAction: 'merge' | 'keep_separate' | 'review'
): MergeSuggestion {
  return {
    id: `merge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recordIds,
    street,
    intersection,
    reason,
    confidence,
    suggestedAction,
  };
}

export function getMergeSuggestionsForRecord(suggestions: MergeSuggestion[], recordId: string): MergeSuggestion[] {
  return suggestions.filter(s => s.recordIds.includes(recordId));
}

export function getRelatedRecords(records: ComplaintRecord[], suggestion: MergeSuggestion): ComplaintRecord[] {
  return records.filter(r => suggestion.recordIds.includes(r.id));
}
