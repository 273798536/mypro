import type { SimulationRecord, HistoryVersion, SectionFrame } from '../../shared/types';

function generateRopePoints(): { x: number; y: number; z: number }[] {
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    points.push({
      x: 50 + t * 400,
      y: 80 + Math.sin(t * Math.PI * 2) * 40 + t * 120,
      z: Math.sin(t * Math.PI) * 30,
    });
  }
  return points;
}

function generateAngleData(baseAngle: number, variance: number): { timestamp: number; angle: number; explanation: string }[] {
  const data: { timestamp: number; angle: number; explanation: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = baseAngle + (Math.random() - 0.5) * variance;
    const ts = i * 300;
    let explanation = `第 ${i + 1} 帧：绳索角度 ${angle.toFixed(1)}°，处于安全阈值内`;
    if (angle > 75) explanation = `第 ${i + 1} 帧：绳索角度 ${angle.toFixed(1)}°，超过 75° 预警线，注意承载负荷`;
    if (angle > 85) explanation = `第 ${i + 1} 帧：绳索角度 ${angle.toFixed(1)}°，超过 85° 危险阈值，需立即复核`;
    if (angle < 25) explanation = `第 ${i + 1} 帧：绳索角度 ${angle.toFixed(1)}°，低于 25° 最小作业角`;
    data.push({ timestamp: ts, angle: parseFloat(angle.toFixed(1)), explanation });
  }
  return data;
}

function generateSections(count: number): SectionFrame[] {
  const sections: SectionFrame[] = [];
  for (let i = 0; i < count; i++) {
    sections.push({
      frameIndex: i,
      timestamp: i * 300,
      data: Array.from({ length: 50 }, () => Math.random() * 100),
      note: i % 3 === 0 ? '剖切正常，纹理清晰' : i % 3 === 1 ? '局部存在透明遮挡，已标记复核' : '截面数据完整',
    });
  }
  return sections;
}

export const mockRecords: SimulationRecord[] = [
  {
    id: 'rec-001',
    code: 'RSP-2026-0601-01',
    createdAt: '2026-06-01T09:15:00Z',
    updatedAt: '2026-06-01T09:15:00Z',
    startTime: '2026-06-01T09:00:00Z',
    endTime: '2026-06-01T09:55:00Z',
    ropePoints: generateRopePoints(),
    angleData: generateAngleData(55, 20),
    sections: generateSections(8),
    riskLevel: 'error',
    riskNote: '时间参数与风险备注存在不一致：记录的结束时间晚于风险评估有效期 3 分钟',
    anomalyType: 'time_mismatch',
    nextAction: 'adjust_criteria',
    occlusionRejected: true,
    occlusionReason: '第 4 帧剖切图中绳索与背景透明层重叠率达 42%，超过 30% 误读阈值，系统自动拦截判定',
  },
  {
    id: 'rec-002',
    code: 'RSP-2026-0602-03',
    createdAt: '2026-06-02T14:22:00Z',
    updatedAt: '2026-06-02T14:22:00Z',
    startTime: '2026-06-02T14:05:00Z',
    endTime: '2026-06-02T14:38:00Z',
    ropePoints: generateRopePoints(),
    angleData: generateAngleData(48, 15),
    sections: generateSections(6),
    riskLevel: 'warning',
    riskNote: '风险等级被标注为"低"但角度数据出现 3 次超过 75° 预警值',
    anomalyType: 'risk_mismatch',
    nextAction: 'adjust_criteria',
    occlusionRejected: false,
    occlusionReason: '',
  },
  {
    id: 'rec-003',
    code: 'RSP-2026-0603-02',
    createdAt: '2026-06-03T10:48:00Z',
    updatedAt: '2026-06-03T10:48:00Z',
    startTime: '2026-06-03T10:30:00Z',
    endTime: '2026-06-03T11:05:00Z',
    ropePoints: generateRopePoints(),
    angleData: generateAngleData(62, 18),
    sections: generateSections(4),
    riskLevel: 'pending_material',
    riskNote: '剖切帧数量不足（需至少 8 帧，当前仅 4 帧），第 5、7、9、11 帧剖面数据缺失',
    anomalyType: 'section_missing',
    nextAction: 'fill_material',
    occlusionRejected: false,
    occlusionReason: '',
  },
  {
    id: 'rec-004',
    code: 'RSP-2026-0604-01',
    createdAt: '2026-06-04T08:30:00Z',
    updatedAt: '2026-06-04T08:30:00Z',
    startTime: '2026-06-04T08:10:00Z',
    endTime: '2026-06-04T08:45:00Z',
    ropePoints: generateRopePoints(),
    angleData: generateAngleData(50, 10),
    sections: generateSections(10),
    riskLevel: 'normal',
    riskNote: '数据完整，风险等级一致，所有剖切帧均通过校验',
    anomalyType: null,
    nextAction: null,
    occlusionRejected: false,
    occlusionReason: '',
  },
  {
    id: 'rec-005',
    code: 'RSP-2026-0605-04',
    createdAt: '2026-06-05T16:05:00Z',
    updatedAt: '2026-06-05T16:05:00Z',
    startTime: '2026-06-05T15:40:00Z',
    endTime: '2026-06-05T16:35:00Z',
    ropePoints: generateRopePoints(),
    angleData: generateAngleData(70, 25),
    sections: generateSections(7),
    riskLevel: 'error',
    riskNote: '透明遮挡误读风险极高，第 3、6 帧剖切图中绳索边缘与透明防护层像素重叠',
    anomalyType: 'occlusion_misread',
    nextAction: 'fill_material',
    occlusionRejected: true,
    occlusionReason: '第 3 帧重叠率 38%，第 6 帧重叠率 51%，均超过 30% 安全阈值。建议补拍多角度高清剖切图或提供原始 RAW 数据用于人工二次核验',
  },
  {
    id: 'rec-006',
    code: 'RSP-2026-0606-02',
    createdAt: '2026-06-06T11:20:00Z',
    updatedAt: '2026-06-06T11:20:00Z',
    startTime: '2026-06-06T11:00:00Z',
    endTime: '2026-06-06T11:33:00Z',
    ropePoints: generateRopePoints(),
    angleData: generateAngleData(45, 12),
    sections: generateSections(9),
    riskLevel: 'normal',
    riskNote: '模拟数据完整有效，角度波动在正常范围内',
    anomalyType: null,
    nextAction: null,
    occlusionRejected: false,
    occlusionReason: '',
  },
];

export const mockHistory: HistoryVersion[] = [
  {
    id: 'hist-001-v1',
    recordId: 'rec-001',
    version: 1,
    modifiedAt: '2026-06-01T09:15:00Z',
    modifiedBy: '系统自动采集',
    changes: [],
    snapshot: mockRecords[0],
  },
  {
    id: 'hist-002-v1',
    recordId: 'rec-002',
    version: 1,
    modifiedAt: '2026-06-02T14:22:00Z',
    modifiedBy: '系统自动采集',
    changes: [],
    snapshot: mockRecords[1],
  },
  {
    id: 'hist-003-v1',
    recordId: 'rec-003',
    version: 1,
    modifiedAt: '2026-06-03T10:48:00Z',
    modifiedBy: '系统自动采集',
    changes: [],
    snapshot: mockRecords[2],
  },
  {
    id: 'hist-004-v1',
    recordId: 'rec-004',
    version: 1,
    modifiedAt: '2026-06-04T08:30:00Z',
    modifiedBy: '系统自动采集',
    changes: [],
    snapshot: mockRecords[3],
  },
  {
    id: 'hist-005-v1',
    recordId: 'rec-005',
    version: 1,
    modifiedAt: '2026-06-05T16:05:00Z',
    modifiedBy: '系统自动采集',
    changes: [],
    snapshot: mockRecords[4],
  },
  {
    id: 'hist-006-v1',
    recordId: 'rec-006',
    version: 1,
    modifiedAt: '2026-06-06T11:20:00Z',
    modifiedBy: '系统自动采集',
    changes: [],
    snapshot: mockRecords[5],
  },
];
