import type { DefectRecord, Project, ClassificationMatch } from '../types';

export function generateDataHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function generateRecordsHash(records: DefectRecord[]): string {
  const sortedRecords = [...records].sort((a, b) => a.id.localeCompare(b.id));
  const simplified = sortedRecords.map(r => ({
    defectType: r.defectType,
    category: r.category,
    count: r.count,
    sampleSize: r.sampleSize,
    batchId: r.batchId,
    materialSource: r.materialSource
  }));
  return generateDataHash(simplified);
}

export function generateParamsHash(params: {
  significanceLevel: number;
  rowField: string;
  colField: string;
}): string {
  return generateDataHash(params);
}

export function calculateSimilarity(
  records1: DefectRecord[],
  records2: DefectRecord[]
): number {
  const batchSampleSizePairs1 = new Set(
    records1.map(r => `${r.batchId}-${r.sampleSize || 'unknown'}`)
  );
  const batchSampleSizePairs2 = new Set(
    records2.map(r => `${r.batchId}-${r.sampleSize || 'unknown'}`)
  );
  
  const batchIntersection = [...batchSampleSizePairs1].filter(x => batchSampleSizePairs2.has(x));
  const batchUnion = new Set([...batchSampleSizePairs1, ...batchSampleSizePairs2]);
  const batchSimilarity = batchUnion.size > 0 ? batchIntersection.length / batchUnion.size : 0;
  
  const detailSet1 = new Set(records1.map(r => `${r.defectType}-${r.category}-${r.batchId}`));
  const detailSet2 = new Set(records2.map(r => `${r.defectType}-${r.category}-${r.batchId}`));
  
  const detailIntersection = [...detailSet1].filter(x => detailSet2.has(x));
  const detailUnion = new Set([...detailSet1, ...detailSet2]);
  const detailSimilarity = detailUnion.size > 0 ? detailIntersection.length / detailUnion.size : 0;
  
  return batchSimilarity * 0.6 + detailSimilarity * 0.4;
}

export function findMatchingProject(
  newRecords: DefectRecord[],
  projects: Project[],
  projectRecordsMap: Map<string, DefectRecord[]>
): ClassificationMatch | null {
  let bestMatch: ClassificationMatch | null = null;
  let highestConfidence = 0;

  for (const project of projects) {
    const existingRecords = projectRecordsMap.get(project.id) || [];
    if (existingRecords.length === 0) continue;

    const confidence = calculateSimilarity(newRecords, existingRecords);
    const matchedFields: string[] = [];

    const newBatchIds = new Set(newRecords.map(r => r.batchId));
    const existingBatchIds = new Set(existingRecords.map(r => r.batchId));
    if ([...newBatchIds].some(id => existingBatchIds.has(id))) {
      matchedFields.push('产品批次');
    }

    const newSampleSizes = new Set(
      newRecords.filter(r => r.sampleSize !== undefined).map(r => String(r.sampleSize))
    );
    const existingSampleSizes = new Set(
      existingRecords.filter(r => r.sampleSize !== undefined).map(r => String(r.sampleSize))
    );
    if (newSampleSizes.size > 0 && existingSampleSizes.size > 0 && 
        [...newSampleSizes].some(s => existingSampleSizes.has(s))) {
      matchedFields.push('抽检数量');
    }

    const newMaterials = new Set(newRecords.map(r => r.materialSource));
    const existingMaterials = new Set(existingRecords.map(r => r.materialSource));
    if ([...newMaterials].some(m => existingMaterials.has(m))) {
      matchedFields.push('材料来源');
    }

    const newTypes = new Set(newRecords.map(r => r.defectType));
    const existingTypes = new Set(existingRecords.map(r => r.defectType));
    if ([...newTypes].some(t => existingTypes.has(t))) {
      matchedFields.push('缺陷类型');
    }

    if (confidence > highestConfidence && confidence >= 0.3) {
      highestConfidence = confidence;
      bestMatch = {
        projectId: project.id,
        confidence,
        matchedFields
      };
    }
  }

  return bestMatch;
}

export function autoClassifyRecords(
  records: DefectRecord[],
  projects: Project[],
  projectRecordsMap: Map<string, DefectRecord[]>
): {
  projectId: string | null;
  isNewProject: boolean;
  match?: ClassificationMatch;
} {
  const match = findMatchingProject(records, projects, projectRecordsMap);

  if (match && match.confidence >= 0.6) {
    return {
      projectId: match.projectId,
      isNewProject: false,
      match
    };
  }

  return {
    projectId: null,
    isNewProject: true,
    match: match || undefined
  };
}

export function deduplicateRecords(
  newRecords: DefectRecord[],
  existingRecords: DefectRecord[]
): {
  uniqueRecords: DefectRecord[];
  duplicateCount: number;
} {
  const existingSignatures = new Set(
    existingRecords.map(r => 
      `${r.defectType}-${r.category}-${r.batchId}-${r.materialSource}-${r.recordDate}`
    )
  );

  const uniqueRecords: DefectRecord[] = [];
  let duplicateCount = 0;

  for (const record of newRecords) {
    const signature = `${record.defectType}-${record.category}-${record.batchId}-${record.materialSource}-${record.recordDate}`;
    if (existingSignatures.has(signature)) {
      duplicateCount++;
    } else {
      uniqueRecords.push(record);
      existingSignatures.add(signature);
    }
  }

  return { uniqueRecords, duplicateCount };
}
