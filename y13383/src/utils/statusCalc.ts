import { CompressionSample, SampleCategory, SampleStatus } from '@/types';

export function countByStatus(samples: CompressionSample[]) {
  const processed = samples.filter(s => s.status === 'processed' && s.category !== 'validation_pollution').length;
  const pending = samples.filter(s => s.status === 'pending_material').length;
  const manual = samples.filter(s => s.status === 'manual_review').length;
  const pollution = samples.filter(s => s.category === 'validation_pollution').length;
  return { processed, pending, manual, pollution };
}

export function getStatusLabel(status: SampleStatus): string {
  switch (status) {
    case 'processed': return '已处理';
    case 'pending_material': return '待补材料';
    case 'manual_review': return '人工改判';
  }
}

export function getCategoryLabel(category: SampleCategory): string {
  switch (category) {
    case 'normal': return '正常样本';
    case 'boundary': return '边界样本';
    case 'validation_pollution': return '验证集污染';
  }
}

export function getSafeResultText(sample: CompressionSample): string {
  if (sample.category === 'validation_pollution') {
    return '需复核 / 不纳入通过率统计';
  }
  if (sample.status === 'pending_material') {
    return '待补材料 / 暂缓判定';
  }
  if (sample.status === 'manual_review' && sample.category === 'boundary') {
    return '人工复核中 / 边界样本不直接判定';
  }
  if (sample.status === 'manual_review') {
    return '人工改判待定';
  }
  return '处理完毕';
}

export function filterSamplesByStatus(samples: CompressionSample[], status?: SampleStatus) {
  if (!status) return samples;
  return samples.filter(s => s.status === status);
}

export function buildWaterfallData(breakdown: { factor: string; delta: number; description: string }[], base: number) {
  let cursor = base;
  const result: { name: string; start: number; end: number; delta: number; description: string }[] = [];
  for (const item of breakdown) {
    const start = cursor;
    const end = cursor + item.delta;
    result.push({ name: item.factor, start, end, delta: item.delta, description: item.description });
    cursor = end;
  }
  return { steps: result, final: cursor };
}
