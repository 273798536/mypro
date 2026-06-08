import db from './database.js';
import { exerciseRepository } from './index.js';
import type { Exercise } from '../../shared/types.js';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function seedDemoData() {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM exercises').get() as { cnt: number };
  if (existing.cnt > 0) return;

  const now = new Date().toISOString();

  const rawSamples: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: '环己烷椅式构象旋转练习 #042',
      sourceRowNumber: 42,
      sourceImageName: 'cyclohexane_chair_20241115.png',
      sourceRemark: '聊天记录 2024-11-15 14:30，舞台统筹讨论稿 v3',
      status: 'confirmed',
      timelineStartMs: 0,
      timelineEndMs: 8000,
      conclusion:
        '环己烷椅式构象在 t=2400ms 时达到最佳观测角度，平伏键与直立氢的区分清晰，截图 shot-003 可直接用于评审材料。坐标 C1-C2-C3 平面的剖切结果与预期二面角 55.2° 一致。',
      keyframes: [
        { id: uuid(), timestampMs: 0, label: '起始视角', params: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1 } },
        { id: uuid(), timestampMs: 1200, label: '侧视图', params: { rotX: 90, rotY: 0, rotZ: 0, zoom: 1.1 } },
        { id: uuid(), timestampMs: 2400, label: '最佳观测角', params: { rotX: 45, rotY: 30, rotZ: 0, zoom: 1.2 } },
        { id: uuid(), timestampMs: 4800, label: '俯视', params: { rotX: 0, rotY: 90, rotZ: 0, zoom: 1.15 } },
        { id: uuid(), timestampMs: 6400, label: 'C3 对称轴', params: { rotX: 35, rotY: 45, rotZ: 60, zoom: 1.3 } },
      ],
      coordinates: [
        { id: uuid(), label: 'C1', x: 0.0, y: 0.0, z: 0.0, sourceRef: 'shot-001 / 结论 §2.1' },
        { id: uuid(), label: 'C2', x: 1.54, y: 0.0, z: 0.0, sourceRef: 'shot-001' },
        { id: uuid(), label: 'C3', x: 2.31, y: 1.33, z: 0.0, sourceRef: 'shot-002 / 结论 §2.1' },
        { id: uuid(), label: 'C4', x: 1.54, y: 2.67, z: 0.0, sourceRef: 'shot-003' },
        { id: uuid(), label: 'C5', x: 0.0, y: 2.67, z: 0.0, sourceRef: 'shot-003' },
        { id: uuid(), label: 'C6', x: -0.77, y: 1.33, z: 0.0, sourceRef: '结论 §3.2' },
        { id: uuid(), label: 'H1a (平伏)', x: -0.4, y: -0.5, z: 1.2, sourceRef: 'shot-004' },
        { id: uuid(), label: 'H1b (直立)', x: 0.5, y: -0.3, z: -1.0, sourceRef: 'shot-004' },
      ],
      screenshots: [
        {
          id: uuid(),
          filename: 'shot-001-side-view.png',
          filePath: '/uploads/screenshots/demo-001.png',
          thumbnailPath: '/uploads/screenshots/demo-001-thumb.png',
          timestampMs: 1200,
          reviewStatus: 'approved',
          reviewNote: null,
          linkedCoordinateIds: [],
        },
        {
          id: uuid(),
          filename: 'shot-002-best-angle.png',
          filePath: '/uploads/screenshots/demo-002.png',
          thumbnailPath: '/uploads/screenshots/demo-002-thumb.png',
          timestampMs: 2400,
          reviewStatus: 'approved',
          reviewNote: '剖切平面与结论一致，可直接使用',
          linkedCoordinateIds: [],
          sectionPlane: { axis: 'z', depth: 0.5 },
        },
        {
          id: uuid(),
          filename: 'shot-003-top-view.png',
          filePath: '/uploads/screenshots/demo-003.png',
          thumbnailPath: '/uploads/screenshots/demo-003-thumb.png',
          timestampMs: 4800,
          reviewStatus: 'pending',
          reviewNote: '二面角标注需舞台统筹复核',
          linkedCoordinateIds: [],
        },
        {
          id: uuid(),
          filename: 'shot-004-axis-C3.png',
          filePath: '/uploads/screenshots/demo-004.png',
          thumbnailPath: '/uploads/screenshots/demo-004-thumb.png',
          timestampMs: 6400,
          reviewStatus: 'rejected',
          reviewNote: 'H原子平伏/直立标记错误',
          linkedCoordinateIds: [],
        },
      ],
    },
    {
      name: '丁烷交叉式与重叠式对比 #078',
      sourceRowNumber: 78,
      sourceImageName: 'butane_eclipsed_gauche.png',
      sourceRemark: '群文件 丁烷-构象分析.xlsx，第 78 行；微信 2024-12-02',
      status: 'reviewing',
      timelineStartMs: 0,
      timelineEndMs: 12000,
      conclusion:
        '交叉式（gauche, 60°）能量比重叠式低约 3.8 kcal/mol。t=6000ms 时的 C2-C3 旋转截图为关键帧。shot-007 剖切对比清晰，shot-008 需复核坐标标注。',
      keyframes: [
        { id: uuid(), timestampMs: 0, label: '反式', params: { dihedral: 180, energy: 0 } },
        { id: uuid(), timestampMs: 3000, label: '邻位交叉', params: { dihedral: 60, energy: 3.8 } },
        { id: uuid(), timestampMs: 6000, label: '部分重叠', params: { dihedral: 120, energy: 3.8 } },
        { id: uuid(), timestampMs: 9000, label: '全重叠', params: { dihedral: 0, energy: 5.0 } },
      ],
      coordinates: [
        { id: uuid(), label: 'C1 (甲基)', x: -2.5, y: 0.0, z: 0.0, sourceRef: 'shot-005' },
        { id: uuid(), label: 'C2', x: -1.0, y: 0.0, z: 0.0, sourceRef: 'shot-005 / shot-006' },
        { id: uuid(), label: 'C3', x: 0.5, y: 0.8, z: 0.0, sourceRef: '结论 §4.1' },
        { id: uuid(), label: 'C4 (甲基)', x: 2.0, y: 0.8, z: 0.0, sourceRef: 'shot-007' },
      ],
      screenshots: [
        {
          id: uuid(),
          filename: 'butane-anti-005.png',
          filePath: '/uploads/screenshots/demo-005.png',
          thumbnailPath: '/uploads/screenshots/demo-005-thumb.png',
          timestampMs: 0,
          reviewStatus: 'approved',
          reviewNote: null,
          linkedCoordinateIds: [],
        },
        {
          id: uuid(),
          filename: 'butane-gauche-006.png',
          filePath: '/uploads/screenshots/demo-006.png',
          thumbnailPath: '/uploads/screenshots/demo-006-thumb.png',
          timestampMs: 3000,
          reviewStatus: 'approved',
          reviewNote: '坐标标注正确',
          linkedCoordinateIds: [],
          sectionPlane: { axis: 'y', depth: 0.4 },
        },
        {
          id: uuid(),
          filename: 'butane-eclipsed-007.png',
          filePath: '/uploads/screenshots/demo-007.png',
          thumbnailPath: '/uploads/screenshots/demo-007-thumb.png',
          timestampMs: 9000,
          reviewStatus: 'pending',
          reviewNote: '能量数值需复核',
          linkedCoordinateIds: [],
        },
      ],
    },
    {
      name: '葡萄糖吡喃环 α/β 差向异构 #103',
      sourceRowNumber: 103,
      sourceImageName: 'glucopyranose_alpha_beta.tif',
      sourceRemark: '原始记录来自教学实验记录薄 2024Q4 - 第 103 行',
      status: 'draft',
      timelineStartMs: 0,
      timelineEndMs: 15000,
      conclusion: '',
      keyframes: [
        { id: uuid(), timestampMs: 0, label: 'α-异头物', params: { anomer: 0, c1OhConfig: 0 } },
        { id: uuid(), timestampMs: 7500, label: '开链式中间体', params: { anomer: 0.5, c1OhConfig: 1 } },
        { id: uuid(), timestampMs: 15000, label: 'β-异头物', params: { anomer: 1, c1OhConfig: 2 } },
      ],
      coordinates: [
        { id: uuid(), label: 'C1 (异头碳)', x: 0.0, y: 0.0, z: 0.0, sourceRef: 'shot-008' },
        { id: uuid(), label: 'O (环氧)', x: 0.8, y: 1.2, z: 0.0, sourceRef: '' },
        { id: uuid(), label: 'C5', x: -0.8, y: 1.2, z: 0.0, sourceRef: '' },
        { id: uuid(), label: 'C6 (羟甲基)', x: -1.8, y: 2.2, z: 0.0, sourceRef: 'shot-009' },
      ],
      screenshots: [
        {
          id: uuid(),
          filename: 'glucose-alpha-008.png',
          filePath: '/uploads/screenshots/demo-008.png',
          thumbnailPath: '/uploads/screenshots/demo-008-thumb.png',
          timestampMs: 0,
          reviewStatus: 'pending',
          reviewNote: null,
          linkedCoordinateIds: [],
        },
        {
          id: uuid(),
          filename: 'glucose-beta-009.png',
          filePath: '/uploads/screenshots/demo-009.png',
          thumbnailPath: '/uploads/screenshots/demo-009-thumb.png',
          timestampMs: 15000,
          reviewStatus: 'pending',
          reviewNote: null,
          linkedCoordinateIds: [],
        },
      ],
    },
  ];

  const samples: Exercise[] = rawSamples.map((s) => ({
    ...s,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
  }));

  samples.forEach((s) => {
    try {
      exerciseRepository.create(s);
    } catch (err) {
      console.error('[seed] Failed:', s.name, err);
    }
  });

  console.log(`[seed] Demo data inserted: ${samples.length} exercises`);
}

export default seedDemoData;
