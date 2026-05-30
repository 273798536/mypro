import type { RecordingSegment, QualityType } from '../../types';

function generateWaveform(length: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    const noise = (Math.random() - 0.5) * 0.3;
    const wave = Math.sin(i * 0.1) * 0.5 + Math.sin(i * 0.03) * 0.3;
    data.push(Math.max(-1, Math.min(1, wave + noise)));
  }
  return data;
}

const qualities: QualityType[] = ['good', 'good', 'good', 'misaligned', 'overlapped', 'missing_band', 'good', 'good'];

export const mockSegments: RecordingSegment[] = Array.from({ length: 8 }, (_, i) => ({
  id: `seg-${i + 1}`,
  name: `片段 ${i + 1}：${['平沙落雁', '梅花三弄', '流水', '潇湘水云', '渔樵问答', '广陵散', '阳春白雪', '胡笳十八拍'][i]}`,
  description: `${['第一段：起势', '第二段：承意', '第三段：转合', '第四段：高潮', '第五段：收尾', '第六段：尾声', '第七段：泛音段', '第八段：按音段'][i]}，演奏速度约每分钟60拍`,
  startTime: i * 12,
  endTime: (i + 1) * 12 - (i === 2 ? 2 : 0),
  duration: 12 - (i === 2 ? 2 : 0),
  audioUrl: `/audio/segment-${i + 1}.wav`,
  waveformData: generateWaveform(200),
  quality: qualities[i],
  issues: qualities[i] !== 'good' ? [`issue-${qualities[i]}-${i}`] : []
}));
