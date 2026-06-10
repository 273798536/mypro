import type { DiffAnalysis, MAPlotPoint, VolcanoPoint } from '@/types';

function generateMAPlotData(count: number, diffCount: number): MAPlotPoint[] {
  const data: MAPlotPoint[] = [];
  for (let i = 0; i < count; i++) {
    const baseMean = Math.exp(Math.random() * 12 + 2);
    const isDiff = i < diffCount;
    const log2FoldChange = isDiff 
      ? (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 1)
      : (Math.random() - 0.5) * 1.5;
    data.push({
      gene: `Gene_${String(i + 1).padStart(4, '0')}`,
      log2FoldChange: Number(log2FoldChange.toFixed(3)),
      baseMean: Number(baseMean.toFixed(2)),
      significant: isDiff,
    });
  }
  return data;
}

function generateVolcanoData(count: number, upCount: number, downCount: number): VolcanoPoint[] {
  const data: VolcanoPoint[] = [];
  for (let i = 0; i < count; i++) {
    const isUp = i < upCount;
    const isDown = i >= upCount && i < upCount + downCount;
    const isSignificant = isUp || isDown;
    
    const log2FoldChange = isUp
      ? Math.random() * 4 + 1
      : isDown
        ? -(Math.random() * 4 + 1)
        : (Math.random() - 0.5) * 3;
    
    const negLog10Pvalue = isSignificant
      ? Math.random() * 8 + 2
      : Math.random() * 1.5;
    
    data.push({
      gene: `Gene_${String(i + 1).padStart(4, '0')}`,
      log2FoldChange: Number(log2FoldChange.toFixed(3)),
      negLog10Pvalue: Number(negLog10Pvalue.toFixed(3)),
      significant: isSignificant,
      regulated: isUp ? 'up' : isDown ? 'down' : 'none',
    });
  }
  return data;
}

export const diffAnalysisData: DiffAnalysis[] = [
  {
    id: 'da001',
    sampleId: 's002',
    versionTag: 'before',
    diffGeneCount: 2156,
    upRegulated: 1124,
    downRegulated: 1032,
    maPlotData: generateMAPlotData(15000, 2156),
    volcanoData: generateVolcanoData(15000, 1124, 1032),
    topPathway: '代谢过程 (metabolic process)',
  },
  {
    id: 'da002',
    sampleId: 's002',
    versionTag: 'after',
    diffGeneCount: 2283,
    upRegulated: 1198,
    downRegulated: 1085,
    maPlotData: generateMAPlotData(15000, 2283),
    volcanoData: generateVolcanoData(15000, 1198, 1085),
    topPathway: '代谢过程 (metabolic process)',
  },
  {
    id: 'da003',
    sampleId: 's015',
    versionTag: 'before',
    diffGeneCount: 892,
    upRegulated: 456,
    downRegulated: 436,
    maPlotData: generateMAPlotData(15000, 892),
    volcanoData: generateVolcanoData(15000, 456, 436),
    topPathway: '代谢过程 (metabolic process)',
  },
  {
    id: 'da004',
    sampleId: 's015',
    versionTag: 'after',
    diffGeneCount: 1567,
    upRegulated: 823,
    downRegulated: 744,
    maPlotData: generateMAPlotData(15000, 1567),
    volcanoData: generateVolcanoData(15000, 823, 744),
    topPathway: '应激响应 (response to stress)',
  },
  {
    id: 'da005',
    sampleId: 'sntc',
    versionTag: 'before',
    diffGeneCount: 0,
    upRegulated: 0,
    downRegulated: 0,
    maPlotData: generateMAPlotData(15000, 0),
    volcanoData: generateVolcanoData(15000, 0, 0),
    topPathway: '无显著富集',
  },
  {
    id: 'da006',
    sampleId: 'sntc',
    versionTag: 'after',
    diffGeneCount: 0,
    upRegulated: 0,
    downRegulated: 0,
    maPlotData: generateMAPlotData(15000, 0),
    volcanoData: generateVolcanoData(15000, 0, 0),
    topPathway: '无显著富集',
  },
];

export const diffImpactSummary = {
  s002: {
    geneCountChange: '+127',
    pathwayChange: '无显著变化',
    affectedSamples: 1,
    costSaved: 0,
    description: '保留S002-LV样本使差异基因数量增加127个（+5.9%），但主要富集通路保持稳定。该样本的特有表达模式为高海拔生态位适应性研究提供了重要数据点。',
  },
  s015: {
    geneCountChange: '+675',
    pathwayChange: '代谢过程 → 应激响应',
    affectedSamples: 1,
    costSaved: 0,
    description: '将S015-MO从对照组改为处理组8h后，差异基因数量从892个增加到1567个（+75.7%）。最显著变化是富集通路从"代谢过程"转变为"应激响应"，这对解释温度胁迫机制具有关键意义。',
  },
  sntc: {
    geneCountChange: '无变化',
    pathwayChange: '无变化',
    affectedSamples: 3,
    costSaved: 3000,
    description: '判定NTC-03为交叉污染而非操作失误，使同批次S008和S012两个样本免于重测，节省测序成本约3000元。污染水平0.08%远低于阈值，不影响分析结论。',
  },
};
