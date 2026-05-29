import { StationFloor, DataValidationReport } from '../types';

export const mockStationData: StationFloor[] = [
  {
    id: 'floor-b1',
    name: 'B1 站厅层',
    level: 1,
    height: 4,
    color: '#1E3A5F',
    boundaries: [
      { x: -25, y: -20 },
      { x: 25, y: -20 },
      { x: 25, y: 20 },
      { x: -25, y: 20 }
    ],
    escalators: [
      {
        id: 'esc-b1-1',
        name: '1号上行扶梯',
        fromFloor: 1,
        toFloor: 2,
        position: { x: -15, y: 0, z: 0 },
        direction: 'up',
        capacity: 85,
        maxCapacity: 100,
        status: 'warning'
      },
      {
        id: 'esc-b1-2',
        name: '2号下行扶梯',
        fromFloor: 1,
        toFloor: 0,
        position: { x: 15, y: 0, z: 0 },
        direction: 'down',
        capacity: 60,
        maxCapacity: 100,
        status: 'normal'
      }
    ],
    gates: [
      {
        id: 'gate-b1-1',
        name: 'A口闸机组',
        position: { x: -20, y: 10, z: 0 },
        passRate: 35,
        maxPassRate: 50
      },
      {
        id: 'gate-b1-2',
        name: 'B口闸机组',
        position: { x: 20, y: 10, z: 0 },
        passRate: 40,
        maxPassRate: 50
      }
    ],
    barriers: [
      {
        id: 'barrier-b1-1',
        name: '施工围挡A区',
        position: { x: 0, y: -10, z: 0 },
        width: 10,
        active: true
      }
    ],
    walkways: [
      {
        id: 'walk-b1-1',
        from: { x: -20, y: 0 },
        to: { x: 20, y: 0 },
        width: 6,
        flowDirection: 'both'
      }
    ]
  },
  {
    id: 'floor-b2',
    name: 'B2 站台层',
    level: 2,
    height: 4,
    color: '#2D4A6F',
    boundaries: [
      { x: -30, y: -15 },
      { x: 30, y: -15 },
      { x: 30, y: 15 },
      { x: -30, y: 15 }
    ],
    escalators: [
      {
        id: 'esc-b2-1',
        name: '3号换乘扶梯',
        fromFloor: 2,
        toFloor: 1,
        position: { x: -15, y: 0, z: -4 },
        direction: 'bidirectional',
        capacity: 95,
        maxCapacity: 100,
        status: 'error'
      },
      {
        id: 'esc-b2-2',
        name: '4号站台扶梯',
        fromFloor: 2,
        toFloor: 3,
        position: { x: 15, y: 0, z: -4 },
        direction: 'up',
        capacity: 70,
        maxCapacity: 100,
        status: 'normal'
      }
    ],
    gates: [],
    barriers: [
      {
        id: 'barrier-b2-1',
        name: '站台施工围挡',
        position: { x: 0, y: -8, z: -4 },
        width: 8,
        active: false
      }
    ],
    walkways: [
      {
        id: 'walk-b2-1',
        from: { x: -25, y: 0 },
        to: { x: 25, y: 0 },
        width: 8,
        flowDirection: 'both'
      }
    ]
  },
  {
    id: 'floor-b3',
    name: 'B3 换乘层',
    level: 3,
    height: 4,
    color: '#3D5A7F',
    boundaries: [
      { x: -20, y: -25 },
      { x: 20, y: -25 },
      { x: 20, y: 25 },
      { x: -20, y: 25 }
    ],
    escalators: [
      {
        id: 'esc-b3-1',
        name: '5号线换乘扶梯',
        fromFloor: 3,
        toFloor: 2,
        position: { x: 0, y: -15, z: -8 },
        direction: 'bidirectional',
        capacity: 110,
        maxCapacity: 100,
        status: 'error'
      }
    ],
    gates: [],
    barriers: [],
    walkways: [
      {
        id: 'walk-b3-1',
        from: { x: 0, y: -20 },
        to: { x: 0, y: 20 },
        width: 10,
        flowDirection: 'both'
      }
    ]
  }
];

export const generateValidationReport = (): DataValidationReport => {
  return {
    isValid: false,
    missingFields: [
      {
        field: 'maxCapacity',
        location: 'B1层 - 1号上行扶梯',
        suggestion: '请补充扶梯最大设计容量，参考值：80-120人/分钟'
      },
      {
        field: 'passRate',
        location: 'B2层 - 闸机数据缺失',
        suggestion: 'B2层站台未配置闸机，如为纯换乘层可忽略'
      },
      {
        field: 'width',
        location: 'B3层 - 通道宽度',
        suggestion: '请补充主要通道宽度参数，用于客流计算'
      }
    ],
    warnings: [
      'B1层扶梯容量接近上限，高峰期可能出现拥堵',
      'B2层围挡状态为未激活，请注意客流走向变化'
    ],
    escalatorIssues: 2,
    gateIssues: 1
  };
};

export const validateStationData = (data: any): DataValidationReport => {
  const report: DataValidationReport = {
    isValid: true,
    missingFields: [],
    warnings: [],
    escalatorIssues: 0,
    gateIssues: 0
  };

  if (!data.floors || !Array.isArray(data.floors)) {
    report.isValid = false;
    report.missingFields.push({
      field: 'floors',
      location: '根节点',
      suggestion: '数据格式错误，缺少floors数组'
    });
    return report;
  }

  data.floors.forEach((floor: any, floorIndex: number) => {
    if (!floor.escalators || floor.escalators.length === 0) {
      report.warnings.push(`${floor.name || `楼层${floorIndex}`}未配置扶梯数据`);
    } else {
      floor.escalators.forEach((esc: any, escIndex: number) => {
        if (!esc.maxCapacity) {
          report.isValid = false;
          report.escalatorIssues++;
          report.missingFields.push({
            field: 'maxCapacity',
            location: `${floor.name} - ${esc.name || `扶梯${escIndex}`}`,
            suggestion: '请补充扶梯最大设计容量，参考值：80-120人/分钟'
          });
        }
        if (!esc.position) {
          report.isValid = false;
          report.escalatorIssues++;
          report.missingFields.push({
            field: 'position',
            location: `${floor.name} - ${esc.name || `扶梯${escIndex}`}`,
            suggestion: '请补充扶梯3D坐标位置'
          });
        }
      });
    }

    if (floor.gates && Array.isArray(floor.gates)) {
      floor.gates.forEach((gate: any, gateIndex: number) => {
        if (!gate.passRate) {
          report.gateIssues++;
          report.warnings.push(`${floor.name} - ${gate.name || `闸机${gateIndex}`}未设置通行速率`);
        }
      });
    }
  });

  return report;
};
