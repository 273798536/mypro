import { Batch, DataRecord, SectionData, RecordType, RecordStatus } from '../types';
import { generateId } from '../utils/helpers';

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(days: number, hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export function generateMockBatches(): Batch[] {
  return [
    {
      id: 'batch_001',
      name: '2026年6月第1周浮标数据',
      importTime: daysAgo(6, 2),
      recordCount: 8,
      status: 'completed',
      fileNames: ['buoy_data_w1.xlsx', 'coordinates_w1.csv'],
    },
    {
      id: 'batch_002',
      name: '三维模型导入批次A',
      importTime: daysAgo(4, 5),
      recordCount: 6,
      status: 'completed',
      fileNames: ['models_A.obj', 'model_meta.xlsx'],
    },
    {
      id: 'batch_003',
      name: '2026年6月第2周设备坐标',
      importTime: daysAgo(2, 8),
      recordCount: 5,
      status: 'completed',
      fileNames: ['coordinates_w2.csv', '设备坐标补充表.xlsx'],
    },
    {
      id: 'batch_004',
      name: '三维模型补录（相机视角丢失批次）',
      importTime: daysAgo(1, 3),
      recordCount: 3,
      status: 'completed',
      fileNames: ['补录模型_0608.obj'],
    },
  ];
}

const BUOY_NAMES = ['BF-001', 'BF-002', 'BF-003', 'BF-004', 'BF-005', 'BF-006'];
const MODEL_NAMES = ['立体图主场景v2', '浮标阵列简化版', '海底地形模型', '海况剖面模型A', '海况剖面模型B'];
const DEVICE_IDS = ['DEV-A01', 'DEV-A02', 'DEV-B01', 'DEV-B02', 'DEV-C01'];

function makeRecord(
  batchId: string,
  type: RecordType,
  status: RecordStatus,
  dataOverrides: Record<string, any> = {},
  meta: { fileName?: string; originalLine?: number; sourceRemark?: string; imageName?: string; opinion?: string } = {}
): DataRecord {
  const now = new Date().toISOString();
  let data: Record<string, any> = {};

  if (type === 'buoy') {
    data = {
      buoyId: BUOY_NAMES[Math.floor(Math.random() * BUOY_NAMES.length)],
      latitude: randomInRange(28.0, 32.0),
      longitude: randomInRange(120.0, 125.0),
      depth: randomInRange(5, 50),
      temperature: randomInRange(12, 22),
      waveHeight: randomInRange(0.5, 3.5),
      timestamp: daysAgo(Math.floor(Math.random() * 7), Math.floor(Math.random() * 12)).slice(0, 19).replace('T', ' '),
      ...dataOverrides,
    };
  } else if (type === 'model') {
    data = {
      modelId: `M-${String(Math.floor(Math.random() * 900) + 100)}`,
      name: MODEL_NAMES[Math.floor(Math.random() * MODEL_NAMES.length)],
      vertexCount: Math.floor(Math.random() * 50000) + 5000,
      position: { x: randomInRange(-10, 10), y: randomInRange(-5, 5), z: randomInRange(-10, 10) },
      rotation: { x: randomInRange(0, 360), y: randomInRange(0, 360), z: randomInRange(0, 360) },
      cameraAngle: status === 'missing_camera' ? undefined : { elevation: randomInRange(15, 60), azimuth: randomInRange(0, 360), distance: randomInRange(20, 80) },
      ...dataOverrides,
    };
  } else {
    data = {
      deviceId: DEVICE_IDS[Math.floor(Math.random() * DEVICE_IDS.length)],
      latitude: randomInRange(28.0, 32.0),
      longitude: randomInRange(120.0, 125.0),
      altitude: randomInRange(-20, 100),
      orientation: randomInRange(0, 360),
      calibrationDate: daysAgo(Math.floor(Math.random() * 30)).slice(0, 10),
      ...dataOverrides,
    };
  }

  return {
    id: generateId(),
    batchId,
    fileName: meta.fileName || (type === 'buoy' ? 'buoy_data_w1.xlsx' : type === 'model' ? 'models_A.obj' : 'coordinates_w2.csv'),
    originalLine: meta.originalLine ?? Math.floor(Math.random() * 200) + 2,
    sourceRemark: meta.sourceRemark || (type === 'buoy' ? '浮标采集系统自动导出' : type === 'model' ? '三维设计工具输出' : '设备校准记录'),
    imageName: meta.imageName,
    type,
    data,
    status,
    processingOpinion: meta.opinion,
    createdAt: now,
    updatedAt: now,
  };
}

export function generateMockRecords(batches: Batch[]): DataRecord[] {
  const records: DataRecord[] = [];
  const batch001 = batches.find(b => b.id === 'batch_001')!;
  const batch002 = batches.find(b => b.id === 'batch_002')!;
  const batch003 = batches.find(b => b.id === 'batch_003')!;
  const batch004 = batches.find(b => b.id === 'batch_004')!;

  records.push(makeRecord(batch001.id, 'buoy', 'normal',
    { buoyId: 'BF-001', latitude: 30.15, longitude: 122.38, depth: 18.5, temperature: 16.8, waveHeight: 1.75 },
    { fileName: 'buoy_data_w1.xlsx', originalLine: 3, sourceRemark: '浮标BF-001常规采集', opinion: '数据正常，已通过复核' }
  ));
  records.push(makeRecord(batch001.id, 'buoy', 'normal',
    { buoyId: 'BF-002', latitude: 30.22, longitude: 122.41, depth: 22.3, temperature: 17.1, waveHeight: 1.92 },
    { fileName: 'buoy_data_w1.xlsx', originalLine: 4 }
  ));
  records.push(makeRecord(batch001.id, 'buoy', 'normal',
    { buoyId: 'BF-003', latitude: 30.08, longitude: 122.33, depth: 15.7, temperature: 16.5, waveHeight: 1.65 },
    { fileName: 'buoy_data_w1.xlsx', originalLine: 5 }
  ));
  records.push(makeRecord(batch001.id, 'coordinate', 'normal',
    { deviceId: 'DEV-A01', latitude: 30.152, longitude: 122.381, altitude: 5.2, orientation: 180.0 },
    { fileName: 'coordinates_w1.csv', originalLine: 2, sourceRemark: 'GPS差分校正后坐标' }
  ));
  records.push(makeRecord(batch001.id, 'coordinate', 'normal',
    { deviceId: 'DEV-A02', latitude: 30.221, longitude: 122.409, altitude: 4.8, orientation: 175.5 },
    { fileName: 'coordinates_w1.csv', originalLine: 3 }
  ));
  records.push(makeRecord(batch001.id, 'buoy', 'normal',
    { buoyId: 'BF-004', latitude: 29.95, longitude: 122.18, depth: 32.0, temperature: 15.9, waveHeight: 2.1 },
    { fileName: 'buoy_data_w1.xlsx', originalLine: 6, sourceRemark: '深海区浮标' }
  ));
  records.push(makeRecord(batch001.id, 'buoy', 'normal',
    { buoyId: 'BF-005', latitude: 29.90, longitude: 122.12, depth: 40.5, temperature: 15.2, waveHeight: 2.35 },
    { fileName: 'buoy_data_w1.xlsx', originalLine: 7 }
  ));
  records.push(makeRecord(batch001.id, 'coordinate', 'normal',
    { deviceId: 'DEV-B01', latitude: 29.951, longitude: 122.182, altitude: -2.3, orientation: 220.0 },
    { fileName: 'coordinates_w1.csv', originalLine: 4 }
  ));

  const origModel = makeRecord(batch002.id, 'model', 'normal',
    { modelId: 'M-101', name: '立体图主场景v2', vertexCount: 48200, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, cameraAngle: { elevation: 35, azimuth: 45, distance: 50 } },
    { fileName: 'models_A.obj', originalLine: 1, sourceRemark: '设计师交付v2版本', imageName: 'main_scene_v2.png', opinion: '主场景模型已确认' }
  );
  records.push(origModel);
  records.push(makeRecord(batch002.id, 'model', 'duplicate',
    { modelId: 'M-101', name: '立体图主场景v2', vertexCount: 48200, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, cameraAngle: { elevation: 35, azimuth: 45, distance: 50 } },
    { fileName: 'model_meta.xlsx', originalLine: 15, sourceRemark: '元数据表重复导出条目' }
  ));
  records.push(makeRecord(batch002.id, 'model', 'conflict',
    { modelId: 'M-102', name: '浮标阵列简化版', vertexCount: 12500, position: { x: 1.5, y: 0.2, z: -0.5 }, rotation: { x: 0, y: 15, z: 0 }, cameraAngle: { elevation: 40, azimuth: 60, distance: 45 } },
    { fileName: 'models_A.obj', originalLine: 23, sourceRemark: '简化版模型首次导入', opinion: '与后续导入版本坐标不一致，需核对' }
  ));
  records.push(makeRecord(batch002.id, 'model', 'conflict',
    { modelId: 'M-102', name: '浮标阵列简化版', vertexCount: 12500, position: { x: 2.0, y: 0.5, z: -1.0 }, rotation: { x: 0, y: 20, z: 0 }, cameraAngle: { elevation: 40, azimuth: 60, distance: 45 } },
    { fileName: 'model_meta.xlsx', originalLine: 28, sourceRemark: '元数据中修正后坐标（与模型文件冲突）' }
  ));
  records.push(makeRecord(batch002.id, 'model', 'normal',
    { modelId: 'M-103', name: '海底地形模型', vertexCount: 86400, position: { x: 0, y: -5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, cameraAngle: { elevation: 50, azimuth: 90, distance: 60 } },
    { fileName: 'models_A.obj', originalLine: 45 }
  ));
  records.push(makeRecord(batch002.id, 'model', 'missing_camera',
    { modelId: 'M-104', name: '海况剖面模型A', vertexCount: 22000, position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { fileName: 'model_meta.xlsx', originalLine: 52, sourceRemark: '导出时未包含相机视角参数', opinion: '需补充相机视角后重新导入' }
  ));

  records.push(makeRecord(batch003.id, 'coordinate', 'normal',
    { deviceId: 'DEV-A01', latitude: 30.152, longitude: 122.381, altitude: 5.2, orientation: 180.0 },
    { fileName: 'coordinates_w2.csv', originalLine: 2, sourceRemark: '第2周常规采集，与上周一致' }
  ));
  records.push(makeRecord(batch003.id, 'coordinate', 'conflict',
    { deviceId: 'DEV-B01', latitude: 30.0, longitude: 122.5, altitude: 10.0, orientation: 200.0 },
    { fileName: '设备坐标补充表.xlsx', originalLine: 8, sourceRemark: '补录表中坐标与上周偏差较大', opinion: '疑似录入错误，与现场核对中' }
  ));
  records.push(makeRecord(batch003.id, 'coordinate', 'normal',
    { deviceId: 'DEV-B02', latitude: 29.88, longitude: 122.05, altitude: 8.5, orientation: 210.0 },
    { fileName: 'coordinates_w2.csv', originalLine: 5 }
  ));
  records.push(makeRecord(batch003.id, 'buoy', 'duplicate',
    { buoyId: 'BF-001', latitude: 30.15, longitude: 122.38, depth: 18.5, temperature: 16.8, waveHeight: 1.75 },
    { fileName: '设备坐标补充表.xlsx', originalLine: 14, sourceRemark: '重复记录，与第1周BF-001数据完全一致' }
  ));
  records.push(makeRecord(batch003.id, 'coordinate', 'normal',
    { deviceId: 'DEV-C01', latitude: 30.55, longitude: 122.90, altitude: 12.3, orientation: 95.0 },
    { fileName: 'coordinates_w2.csv', originalLine: 7 }
  ));

  records.push(makeRecord(batch004.id, 'model', 'missing_camera',
    { modelId: 'M-105', name: '海况剖面模型B', vertexCount: 25300, position: { x: 2, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { fileName: '补录模型_0608.obj', originalLine: 1, sourceRemark: '补录时相机参数丢失', opinion: '与M-104属同系列，仍缺相机视角' }
  ));
  records.push(makeRecord(batch004.id, 'model', 'missing_camera',
    { modelId: 'M-106', name: '海况剖面模型B(视角2)', vertexCount: 25300, position: { x: 2, y: 2, z: 5 }, rotation: { x: 0, y: 90, z: 0 } },
    { fileName: '补录模型_0608.obj', originalLine: 33, sourceRemark: '同一模型不同视角，仍无相机参数' }
  ));
  records.push(makeRecord(batch004.id, 'model', 'duplicate',
    { modelId: 'M-104', name: '海况剖面模型A', vertexCount: 22000, position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { fileName: '补录模型_0608.obj', originalLine: 65, sourceRemark: '重复导入M-104，仍无相机视角' }
  ));

  return records;
}

export function generateMockSections(records: DataRecord[]): SectionData[] {
  const modelRecords = records.filter(r => r.type === 'model');
  const sections: SectionData[] = [];

  modelRecords.slice(0, 4).forEach((rec, idx) => {
    for (let i = 0; i < 3; i++) {
      const sliceData: number[][] = [];
      for (let y = 0; y < 20; y++) {
        const row: number[] = [];
        for (let x = 0; x < 30; x++) {
          const base = Math.sin((x + idx * 5) * 0.3) * Math.cos((y + i * 3) * 0.2) * 0.5 + 0.5;
          row.push(Math.round(base * 100));
        }
        sliceData.push(row);
      }
      sections.push({
        id: generateId(),
        recordId: rec.id,
        sliceIndex: i,
        sliceData,
        conclusion: i === 0 ? '剖面形态正常，海况分层清晰' : i === 1 ? '中层流速异常，建议复核原始采集数据' : '底层数据完整，与剖面模型吻合',
        timestamp: daysAgo(Math.floor(Math.random() * 5)),
      });
    }
  });

  return sections;
}
