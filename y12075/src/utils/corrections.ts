import type { Musician, InstrumentSPL, CorrectionSuggestion, Section } from '../types';

export function generateCorrections(
  musicians: Musician[],
  spls: InstrumentSPL[],
  sections: Section[],
  hallModelLoaded: boolean
): CorrectionSuggestion[] {
  const corrections: CorrectionSuggestion[] = [];
  let idCounter = 0;

  for (const spl of spls) {
    if (spl.spl === null) {
      const m = musicians.find((mu) => mu.id === spl.musicianId);
      const section = sections.find((s) => s.id === m?.sectionId);
      corrections.push({
        id: `corr_${idCounter++}`,
        type: 'missing_spl',
        severity: 'error',
        targetId: spl.musicianId,
        message: `${m?.name || spl.musicianId} 的 ${m?.instrument || '未知乐器'} 声压数据缺失`,
        detail: `声部: ${section?.name || '未知'} | 当前使用声部平均值估算 | 参考范围: ${section ? getSectionSPLRange(section.id) : '85-95 dB'}`,
        actionLabel: '填入声部均值',
        dismissed: false,
        applied: false,
      });
    }
  }

  for (const m of musicians) {
    if (m.position === null) {
      const section = sections.find((s) => s.id === m.sectionId);
      corrections.push({
        id: `corr_${idCounter++}`,
        type: 'missing_position',
        severity: 'warning',
        targetId: m.id,
        message: `${m.name} (${m.instrument}) 位置数据缺失`,
        detail: `声部: ${section?.name || '未知'} | 3D视图中已跳过该乐手标记${m.remark ? ` | 备注: ${m.remark}` : ''} | 建议: 确认排位或使用默认声部位置`,
        actionLabel: '使用默认位置',
        dismissed: false,
        applied: false,
      });
    }
  }

  if (!hallModelLoaded) {
    corrections.push({
      id: `corr_${idCounter++}`,
      type: 'missing_hall',
      severity: 'warning',
      targetId: 'hall',
      message: '厅堂模型尚未加载',
      detail: '当前使用默认矩形厅堂 | 吸声系数默认0.5 | 声压计算结果为估算值 | 建议: 上传实际厅堂CAD或3D模型文件',
      actionLabel: '标记已知晓',
      dismissed: false,
      applied: false,
    });
  }

  corrections.push({
    id: `corr_${idCounter++}`,
    type: 'missing_material',
    severity: 'warning',
    targetId: 'material',
    message: '材料吸声系数使用默认值',
    detail: '所有表面吸声系数默认0.5(中频) | 实际厅堂材料差异可能导致声压偏差2-5dB | 建议: 在设置中补充各表面材料参数',
    actionLabel: '标记已知晓',
    dismissed: false,
    applied: false,
  });

  return corrections;
}

function getSectionSPLRange(sectionId: string): string {
  const ranges: Record<string, string> = {
    strings: '83-89 dB',
    woodwinds: '82-86 dB',
    brass: '90-94 dB',
    percussion: '91-96 dB',
  };
  return ranges[sectionId] || '85-95 dB';
}

export function getSectionAvgSPL(
  sectionId: string,
  musicians: Musician[],
  spls: InstrumentSPL[]
): number {
  const sectionMusicians = musicians.filter((m) => m.sectionId === sectionId);
  const validSPLs = spls.filter(
    (s) => sectionMusicians.some((m) => m.id === s.musicianId) && s.spl !== null
  );
  if (validSPLs.length === 0) return 85;
  return Math.round(validSPLs.reduce((sum, s) => sum + (s.spl || 0), 0) / validSPLs.length);
}
