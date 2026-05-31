import type {
  ElevatorProfile,
  InspectionRecord,
  SpeedPoint,
  ImportRawRow,
  BadRow,
  BadRowErrorType,
} from '../types';
import { generateId, formatDate } from '../utils/helpers';

const ELEVATOR_MODELS = [
  'GPS-III', 'HOPE-II', 'NPH-2', 'LEHY-III', 'ELENESSA',
  'Maxiez', 'Gen2', 'MonoSpace', 'Synergy', 'Diamond'
];

const MANUFACTURERS = [
  '上海三菱电梯有限公司',
  '迅达(中国)电梯有限公司',
  '奥的斯电梯(中国)投资有限公司',
  '通力电梯有限公司',
  '日立电梯(中国)有限公司',
  '蒂森克虏伯电梯(中国)有限公司',
  '富士达电梯有限公司',
  '东芝电梯(中国)有限公司'
];

const LOCATIONS = [
  'XX市XX区XX大厦',
  'XX市XX区XX医院',
  'XX市XX区XX小区',
  'XX市XX区XX商场',
  'XX市XX区XX办公楼',
  'XX市XX区XX酒店',
  'XX市XX区XX学校',
  'XX市XX区XX地铁站'
];

const INSPECTORS = ['张工', '李工', '王工', '刘工', '陈工', '杨工', '赵工', '黄工'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSpeedCurve(
  ratedSpeed: number,
  brakeTime: number,
  hasGap: boolean = false,
  hasDelay: boolean = false
): SpeedPoint[] {
  const points: SpeedPoint[] = [];
  const step = brakeTime / 20;
  const gapPosition = hasGap ? randomInt(5, 15) : -1;
  const delayAmount = hasDelay ? randomFloat(0.3, 0.8, 2) : 0;
  
  for (let i = 0; i <= 20; i++) {
    const t = i * step;
    let speed = ratedSpeed * (1 - t / brakeTime);
    
    if (t < delayAmount) {
      speed = ratedSpeed;
    } else if (i === gapPosition) {
      speed = speed * randomFloat(0.6, 0.8, 2);
    }
    
    speed = Math.max(0, speed);
    points.push({
      time: Math.round(t * 1000) / 1000,
      speed: Math.round(speed * 1000) / 1000,
    });
  }
  
  return points;
}

export function generateElevatorProfiles(count: number = 10): ElevatorProfile[] {
  const profiles: ElevatorProfile[] = [];
  const usedNumbers = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let elevatorNo: string;
    do {
      elevatorNo = `DT${randomInt(1000, 9999)}`;
    } while (usedNumbers.has(elevatorNo));
    usedNumbers.add(elevatorNo);
    
    const now = new Date().toISOString();
    const installDate = new Date();
    installDate.setFullYear(installDate.getFullYear() - randomInt(1, 15));
    
    profiles.push({
      id: generateId('elev_'),
      elevatorNo,
      model: randomChoice(ELEVATOR_MODELS),
      ratedSpeed: randomChoice([1.0, 1.6, 1.75, 2.0, 2.5, 3.0, 4.0]),
      ratedLoad: randomChoice([630, 800, 1000, 1250, 1350, 1600, 2000]),
      manufacturer: randomChoice(MANUFACTURERS),
      installDate: formatDate(installDate),
      location: randomChoice(LOCATIONS),
      createdAt: now,
      updatedAt: now,
    });
  }
  
  return profiles;
}

export function generateInspectionRecords(
  elevators: ElevatorProfile[],
  count: number = 50
): {
  normalRecords: InspectionRecord[];
  rawRows: ImportRawRow[];
  badRows: BadRow[];
} {
  const normalRecords: InspectionRecord[] = [];
  const rawRows: ImportRawRow[] = [];
  const badRows: BadRow[] = [];
  
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const elevator = randomChoice(elevators);
    const inspectionDate = new Date(today);
    inspectionDate.setDate(inspectionDate.getDate() - randomInt(0, 90));
    
    const hasAbnormality = Math.random() < 0.4;
    const hasSpeedGap = hasAbnormality && Math.random() < 0.3;
    const hasBrakeDelay = hasAbnormality && Math.random() < 0.25;
    const hasOverload = hasAbnormality && Math.random() < 0.2;
    const hasBadDistance = hasAbnormality && Math.random() < 0.25;
    
    let actualLoad = randomFloat(elevator.ratedLoad * 0.5, elevator.ratedLoad * 0.95, 0);
    if (hasOverload) {
      actualLoad = randomFloat(elevator.ratedLoad * 1.1, elevator.ratedLoad * 1.3, 0);
    }
    
    let brakeTime = randomFloat(1.5, 4.0, 2);
    let actualSpeed = elevator.ratedSpeed * randomFloat(0.95, 1.05, 2);
    
    if (hasBadDistance) {
      brakeTime = brakeTime * randomFloat(1.3, 1.6, 2);
    }
    
    const speedCurveData = generateSpeedCurve(
      elevator.ratedSpeed,
      brakeTime,
      hasSpeedGap,
      hasBrakeDelay
    );
    
    const inspector = randomChoice(INSPECTORS);
    
    const now = new Date().toISOString();
    
    const record: InspectionRecord = {
      id: generateId('rec_'),
      elevatorId: elevator.id,
      elevatorNo: elevator.elevatorNo,
      ratedSpeed: elevator.ratedSpeed,
      ratedLoad: elevator.ratedLoad,
      speedCurve: speedCurveData,
      inspectionDate: formatDate(inspectionDate),
      inspector,
      actualLoad,
      actualSpeed,
      brakeTime,
      speedCurveData,
      inspectionRemark: hasAbnormality ? '检验时发现异常情况，需进一步核实' : '',
      sourceFile: 'mock_data.xlsx',
      rowNumber: i + 2,
      dataStatus: 'normal',
      createdAt: now,
      updatedAt: now,
    };
    
    normalRecords.push(record);
    
    const rawRow: ImportRawRow = {
      _rowNumber: i + 2,
      _sourceFile: 'mock_data.xlsx',
      '电梯编号': elevator.elevatorNo,
      '检验日期': formatDate(inspectionDate),
      '检验员': inspector,
      '实际载荷(kg)': actualLoad,
      '实际速度(m/s)': actualSpeed,
      '制动时间(s)': brakeTime,
      '速度曲线': JSON.stringify(speedCurveData),
      '检验备注': record.inspectionRemark,
      '额定速度(m/s)': elevator.ratedSpeed,
      '额定载荷(kg)': elevator.ratedLoad,
      '型号': elevator.model,
      '制造单位': elevator.manufacturer,
      '使用地点': elevator.location,
    };
    rawRows.push(rawRow);
  }
  
  const badRowCount = Math.floor(count * 0.15);
  for (let i = 0; i < badRowCount; i++) {
    const rowNumber = count + i + 2;
    const errorTypes = randomChoice([
      ['empty'],
      ['missing_col'],
      ['invalid_value'],
      ['remark'],
      ['missing_col', 'invalid_value'],
    ]) as BadRowErrorType[];
    
    let errorDescription = '';
    let rowContent: any = {};
    
    if (errorTypes.includes('empty')) {
      errorDescription = '空行数据';
      rowContent = { '电梯编号': '', '检验日期': '', '实际载荷': '' };
    } else if (errorTypes.includes('remark')) {
      errorDescription = '备注说明行';
      rowContent = { '电梯编号': '备注：本批数据为2024年第二季度抽检数据', '检验日期': '' };
    } else if (errorTypes.includes('missing_col')) {
      errorDescription = '缺失字段: 实际速度, 制动时间';
      rowContent = { '电梯编号': `DT${randomInt(1000, 9999)}`, '检验日期': formatDate(today), '实际载荷': randomFloat(500, 1200, 0) };
    } else if (errorTypes.includes('invalid_value')) {
      errorDescription = '无效值: 实际载荷不能为负数';
      rowContent = { '电梯编号': `DT${randomInt(1000, 9999)}`, '检验日期': formatDate(today), '实际载荷': -100, '实际速度': 1.6, '制动时间': 2.5 };
    }
    
    badRows.push({
      id: generateId('bad_'),
      recordId: generateId('bad_rec_'),
      sourceFile: 'mock_data.xlsx',
      rowNumber,
      rowContent: JSON.stringify(rowContent),
      rawData: rowContent,
      errorType: errorTypes[0],
      errorTypes,
      errorDescription,
      isManualReviewed: false,
      reviewed: false,
      reviewRemark: '',
      createdAt: new Date().toISOString(),
    });
  }
  
  return { normalRecords, rawRows, badRows };
}

export function generateSampleExcelData(): { headers: string[]; rows: any[][] } {
  const elevators = generateElevatorProfiles(5);
  const { rawRows, badRows } = generateInspectionRecords(elevators, 30);
  
  const headers = [
    '电梯编号', '检验日期', '检验员', '实际载荷(kg)', '实际速度(m/s)',
    '制动时间(s)', '速度曲线', '检验备注', '额定速度(m/s)', '额定载荷(kg)',
    '型号', '制造单位', '使用地点'
  ];
  
  const rows: any[][] = [];
  rows.push(headers);
  
  for (const rawRow of rawRows) {
    const row = headers.map(h => rawRow[h] ?? '');
    rows.push(row);
  }
  
  for (let i = 0; i < 3; i++) {
    if (i === 1) {
      rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);
    } else if (i === 2) {
      rows.push(['备注：以上数据为抽样检验数据，仅供参考', '', '', '', '', '', '', '', '', '', '', '', '']);
    } else {
      rows.push(['DT0000', '2024-01-01', '张工', 800, '', 2.5, '', '', 1.6, 1000, '', '', '']);
    }
  }
  
  return { headers, rows };
}

export function generateMockDataForDemo() {
  const elevators = generateElevatorProfiles(10);
  const { normalRecords, badRows: badRowData } = generateInspectionRecords(elevators, 40);
  
  const badRows = badRowData.map(br => ({
    ...br,
    id: generateId('bad_'),
    recordId: generateId('bad_rec_'),
  }));
  
  return {
    elevators,
    normalRecords,
    badRows,
  };
}
