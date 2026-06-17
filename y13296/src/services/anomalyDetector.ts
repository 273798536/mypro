import { ComplaintRecord, Anomaly, AnomalyType, RawDataReference } from '../types';

export function detectWrongIntersection(records: ComplaintRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  const intersectionKeywords = ['路口', '交叉口', '转角', '拐角', '红绿灯'];
  
  records.forEach(record => {
    if (!record.intersection) return;
    
    const hasIntersectionKeyword = intersectionKeywords.some(kw => record.intersection!.includes(kw));
    if (!hasIntersectionKeyword && record.intersection.length < 3) {
      anomalies.push(createAnomaly(
        'wrong_intersection',
        'warning',
        '路口信息不完整',
        `投诉记录"${record.description.slice(0, 20)}..."的路口信息"${record.intersection}"可能不完整或格式错误`,
        [record.id],
        [record.materialId],
        [record.rawReference],
        '请确认路口信息是否正确，是否与相邻路口混淆',
        true
      ));
    }
    
    const nearbyRecords = records.filter(r => 
      r.id !== record.id && 
      r.street === record.street &&
      r.intersection &&
      calculateIntersectionSimilarity(record.intersection!, r.intersection) > 0.7
    );
    
    if (nearbyRecords.length > 0) {
      anomalies.push(createAnomaly(
        'wrong_intersection',
        'error',
        '相邻路口可能合并错误',
        `记录"${record.description.slice(0, 15)}..."与其他${nearbyRecords.length}条记录路口高度相似，可能存在相邻路口合并错误`,
        [record.id, ...nearbyRecords.map(r => r.id)],
        [record.materialId, ...nearbyRecords.map(r => r.materialId)],
        [record.rawReference, ...nearbyRecords.map(r => r.rawReference)],
        '请检查这些记录是否属于不同路口，不应合并处理',
        true
      ));
    }
  });
  
  return anomalies;
}

export function detectBadData(records: ComplaintRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  records.forEach(record => {
    if (record.seatCount !== undefined) {
      if (record.seatCount < 0 || record.seatCount > 100) {
        anomalies.push(createAnomaly(
          'bad_data',
          'critical',
          '座椅数量异常',
          `记录"${record.description.slice(0, 20)}..."的座椅数量${record.seatCount}超出合理范围(0-100)`,
          [record.id],
          [record.materialId],
          [record.rawReference],
          '请核对原始数据中的座椅数量',
          true
        ));
      }
    }
    
    const requiredFields = ['street', 'complaintType', 'description'];
    const emptyFields = requiredFields.filter(f => !(record as any)[f] || (record as any)[f].trim() === '');
    
    if (emptyFields.length > 0) {
      anomalies.push(createAnomaly(
        'bad_data',
        'error',
        '关键字段缺失',
        `记录缺少${emptyFields.map(f => getFieldLabel(f)).join('、')}字段`,
        [record.id],
        [record.materialId],
        [record.rawReference],
        '请补充完整信息后再进行复核',
        true
      ));
    }
    
    if (record.description.length < 5) {
      anomalies.push(createAnomaly(
        'bad_data',
        'warning',
        '投诉描述过短',
        `投诉描述"${record.description}"可能不完整，仅有${record.description.length}个字符`,
        [record.id],
        [record.materialId],
        [record.rawReference],
        '建议确认是否有更详细的投诉内容',
        false
      ));
    }
  });
  
  return anomalies;
}

export function detectDataInconsistency(records: ComplaintRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  const byStreet = new Map<string, ComplaintRecord[]>();
  records.forEach(r => {
    const key = `${r.street}-${r.intersection || '无路口'}`;
    if (!byStreet.has(key)) byStreet.set(key, []);
    byStreet.get(key)!.push(r);
  });
  
  byStreet.forEach((streetRecords, location) => {
    if (streetRecords.length < 2) return;
    
    const seatCounts = streetRecords
      .filter(r => r.seatCount !== undefined)
      .map(r => r.seatCount!);
    
    if (seatCounts.length >= 2) {
      const max = Math.max(...seatCounts);
      const min = Math.min(...seatCounts);
      if (max !== min) {
        anomalies.push(createAnomaly(
          'data_inconsistency',
          'error',
          '同一位置座椅数量不一致',
          `${location}的${streetRecords.length}条记录中座椅数量存在差异(${min}-${max})`,
          streetRecords.map(r => r.id),
          [...new Set(streetRecords.map(r => r.materialId))],
          streetRecords.map(r => r.rawReference),
          '请核对不同来源的数据，确认正确的座椅数量',
          true
        ));
      }
    }
    
    const complaintTypes = [...new Set(streetRecords.map(r => r.complaintType))];
    if (complaintTypes.length > 1) {
      anomalies.push(createAnomaly(
        'data_inconsistency',
        'warning',
        '同一位置投诉类型不一致',
        `${location}存在${complaintTypes.length}种不同的投诉类型：${complaintTypes.join('、')}`,
        streetRecords.map(r => r.id),
        [...new Set(streetRecords.map(r => r.materialId))],
        streetRecords.map(r => r.rawReference),
        '请确认这些投诉是否指向同一问题',
        false
      ));
    }
  });
  
  return anomalies;
}

export function detectAllAnomalies(records: ComplaintRecord[]): Anomaly[] {
  return [
    ...detectWrongIntersection(records),
    ...detectBadData(records),
    ...detectDataInconsistency(records),
  ];
}

function createAnomaly(
  type: AnomalyType,
  severity: 'warning' | 'error' | 'critical',
  title: string,
  description: string,
  relatedRecordIds: string[],
  relatedMaterialIds: string[],
  rawReferences: RawDataReference[],
  suggestion: string,
  requiresManualReview: boolean
): Anomaly {
  return {
    id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    title,
    description,
    relatedRecordIds,
    relatedMaterialIds,
    rawReferences,
    suggestion,
    requiresManualReview,
  };
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    street: '街道',
    complaintType: '投诉类型',
    description: '描述',
  };
  return labels[field] || field;
}

function calculateIntersectionSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}
