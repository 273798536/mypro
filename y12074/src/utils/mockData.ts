import { Vector3 } from 'three';
import type {
  ChuteModel,
  ChuteSegment,
  SortingPort,
  LuggageRecord,
  AnomalyEvent,
  BadRow,
  BlockRecord,
} from '@/types';

const generateChutePath = (length: number): Vector3[] => {
  const points: Vector3[] = [];
  const segments = 50;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * length - length / 2;
    const y = Math.sin(t * Math.PI) * 2 - 0.5;
    const z = Math.sin(t * Math.PI * 2) * 1.5;
    points.push(new Vector3(x, y, z));
  }
  return points;
};

export const generateMockChuteModels = (): ChuteModel[] => {
  const segments: ChuteSegment[] = [
    {
      id: 'seg-1',
      startPosition: 0,
      endPosition: 3,
      type: 'slope',
      expectedHeight: 0.75,
    },
    {
      id: 'seg-2',
      startPosition: 3,
      endPosition: 6,
      type: 'straight',
      expectedHeight: 0.3,
      sortingPortId: 'port-1',
    },
    {
      id: 'seg-3',
      startPosition: 6,
      endPosition: 8,
      type: 'curve',
      expectedHeight: 0.3,
    },
    {
      id: 'seg-4',
      startPosition: 8,
      endPosition: 11,
      type: 'straight',
      expectedHeight: 0.3,
      sortingPortId: 'port-2',
    },
    {
      id: 'seg-5',
      startPosition: 11,
      endPosition: 13,
      type: 'slope',
      expectedHeight: 0.3,
    },
    {
      id: 'seg-6',
      startPosition: 13,
      endPosition: 16,
      type: 'straight',
      expectedHeight: 0.3,
      sortingPortId: 'port-3',
    },
  ];

  return [
    {
      id: 'chute-001',
      name: 'T3航站楼A滑槽',
      segments,
      pathPoints: generateChutePath(16),
      standardHeight: 0.3,
      maxSpeed: 2.5,
      length: 16,
    },
    {
      id: 'chute-002',
      name: 'T3航站楼B滑槽',
      segments: segments.map((s) => ({ ...s, id: s.id + '-2' })),
      pathPoints: generateChutePath(16).map((p) => new Vector3(p.x, p.y, p.z + 5)),
      standardHeight: 0.3,
      maxSpeed: 2.5,
      length: 16,
    },
  ];
};

export const generateMockSortingPorts = (): SortingPort[] => {
  const now = Date.now();
  const blockRecords1: BlockRecord[] = [
    {
      id: 'block-1',
      sortingPortId: 'port-1',
      startTime: now - 3600000 * 2,
      endTime: now - 3600000 * 1.5,
      luggageCount: 8,
      reason: '高度错配导致行李卡滞',
    },
  ];
  
  const blockRecords2: BlockRecord[] = [
    {
      id: 'block-2',
      sortingPortId: 'port-2',
      startTime: now - 1800000,
      endTime: now - 1200000,
      luggageCount: 5,
      reason: '速度过快导致堆积',
    },
    {
      id: 'block-3',
      sortingPortId: 'port-2',
      startTime: now - 600000,
      luggageCount: 12,
      reason: '分拣口机械故障',
    },
  ];

  return [
    {
      id: 'port-1',
      name: 'A-01 国内航班',
      chuteId: 'chute-001',
      position: 4.5,
      status: 'active',
      blockRecords: blockRecords1,
    },
    {
      id: 'port-2',
      name: 'A-02 国际航班',
      chuteId: 'chute-001',
      position: 9.5,
      status: 'blocked',
      blockRecords: blockRecords2,
    },
    {
      id: 'port-3',
      name: 'A-03 中转航班',
      chuteId: 'chute-001',
      position: 14.5,
      status: 'active',
      blockRecords: [],
    },
  ];
};

export const generateMockLuggageData = (): LuggageRecord[] => {
  const now = Date.now();
  const data: LuggageRecord[] = [];
  const baseTime = now - 3600000 * 3;

  for (let i = 0; i < 150; i++) {
    const timestamp = baseTime + i * 45000;
    const position = (i * 0.11) % 16;
    let height = 0.28 + Math.random() * 0.04;
    let speed = 1.8 + Math.random() * 0.4;
    let status: LuggageRecord['status'] = 'normal';

    if (i === 23 || i === 24) {
      height = 0.65;
      status = 'height_mismatch';
    }
    if (i === 45 || i === 46) {
      height = 0.58;
      status = 'height_mismatch';
    }
    if (i === 67 || i === 68 || i === 69) {
      speed = 3.2 + Math.random() * 0.5;
      status = 'speed_over';
    }
    if (i >= 95 && i <= 102) {
      status = 'stacked';
      speed = 0.3;
    }
    if (i === 125) {
      height = 0.62;
      status = 'height_mismatch';
    }

    data.push({
      id: `lug-${String(i).padStart(4, '0')}`,
      timestamp,
      chuteId: 'chute-001',
      position,
      height: Math.round(height * 1000) / 1000,
      speed: Math.round(speed * 100) / 100,
      sortingPortId: position > 14 ? 'port-3' : position > 7 ? 'port-2' : 'port-1',
      status,
    });
  }

  return data;
};

export const generateMockAnomalies = (): AnomalyEvent[] => {
  const now = Date.now();
  const baseTime = now - 3600000 * 3;

  return [
    {
      id: 'anom-001',
      type: 'height_mismatch',
      timestamp: baseTime + 23 * 45000,
      chuteId: 'chute-001',
      position: 2.53,
      luggageIds: ['lug-0023', 'lug-0024'],
      severity: 'high',
      reviewed: false,
      expectedValue: 0.3,
      actualValue: 0.65,
      description: '高度超出标准2.17倍，可能导致卡包',
    },
    {
      id: 'anom-002',
      type: 'height_mismatch',
      timestamp: baseTime + 45 * 45000,
      chuteId: 'chute-001',
      position: 4.95,
      luggageIds: ['lug-0045', 'lug-0046'],
      severity: 'high',
      reviewed: true,
      expectedValue: 0.3,
      actualValue: 0.58,
      description: '分拣口A-01处高度异常，已处理',
    },
    {
      id: 'anom-003',
      type: 'speed_over',
      timestamp: baseTime + 67 * 45000,
      chuteId: 'chute-001',
      position: 7.37,
      luggageIds: ['lug-0067', 'lug-0068', 'lug-0069'],
      severity: 'medium',
      reviewed: false,
      expectedValue: 2.5,
      actualValue: 3.4,
      description: '速度超出上限36%，可能导致冲出滑槽',
    },
    {
      id: 'anom-004',
      type: 'stacked',
      timestamp: baseTime + 95 * 45000,
      chuteId: 'chute-001',
      position: 10.45,
      luggageIds: ['lug-0095', 'lug-0096', 'lug-0097', 'lug-0098', 'lug-0099', 'lug-0100', 'lug-0101', 'lug-0102'],
      severity: 'high',
      reviewed: false,
      expectedValue: 1.5,
      actualValue: 0.3,
      description: '分拣口A-02前行李堆积，共8件',
    },
    {
      id: 'anom-005',
      type: 'height_mismatch',
      timestamp: baseTime + 125 * 45000,
      chuteId: 'chute-001',
      position: 13.75,
      luggageIds: ['lug-0125'],
      severity: 'medium',
      reviewed: false,
      expectedValue: 0.3,
      actualValue: 0.62,
      description: '高度异常，接近分拣口A-03',
    },
  ];
};

export const generateMockBadRows = (): BadRow[] => {
  return [
    {
      rowIndex: 15,
      rawData: '',
      type: 'empty',
      description: '空行，无任何数据',
    },
    {
      rowIndex: 28,
      rawData: '# 备注：2024年12月15日设备维护',
      type: 'remark',
      description: '备注行，以#开头',
    },
    {
      rowIndex: 56,
      rawData: '2024-12-15 10:23:45,chute-001',
      type: 'missing_column',
      description: '缺少position、height、speed列',
    },
    {
      rowIndex: 78,
      rawData: '2024-12-15 10:45:30,chute-001,abc,0.3,2.0',
      type: 'invalid_value',
      description: 'position字段值"abc"不是有效数字',
    },
    {
      rowIndex: 112,
      rawData: '',
      type: 'empty',
      description: '空行，无任何数据',
    },
    {
      rowIndex: 134,
      rawData: '# 堵包记录：A-02分拣口10:52发生堵包',
      type: 'remark',
      description: '备注行，分拣口堵包记录',
    },
  ];
};

export const generateMockCSVContent = (): string => {
  const headers = 'timestamp,chuteId,position,height,speed,sortingPortId,status';
  const now = Date.now();
  const baseTime = now - 3600000 * 3;
  
  let content = headers + '\n';
  
  for (let i = 0; i < 20; i++) {
    if (i === 5) {
      content += '\n';
      continue;
    }
    if (i === 8) {
      content += '# 备注：测试数据\n';
      continue;
    }
    const timestamp = new Date(baseTime + i * 60000).toISOString();
    const position = (i * 0.8).toFixed(2);
    const height = (0.28 + Math.random() * 0.04).toFixed(3);
    const speed = (1.8 + Math.random() * 0.4).toFixed(2);
    content += `${timestamp},chute-001,${position},${height},${speed},port-1,normal\n`;
  }
  
  return content;
};
