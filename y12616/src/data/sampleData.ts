
import { v4 as uuidv4 } from 'uuid';
import type { TransportPath, Anomaly } from '../types';

const createAnomaly = (partial: Partial<Anomaly>): Anomaly => ({
  id: uuidv4(),
  type: 'scale_mismatch',
  severity: 'high',
  description: '',
  sourceRef: '',
  beforeState: {},
  afterState: {},
  createdAt: new Date().toISOString(),
  isFixed: false,
  ...partial,
});

export const samplePaths: TransportPath[] = [
  {
    id: uuidv4(),
    name: '东区运输干线-A线',
    source: {
      type: 'old_table',
      name: '2023年矿区旧数据表.xlsx',
      description: '从共享盘归档文件夹提取的历史数据',
    },
    scale: {
      ratio: '1:1000',
      unit: 'kilometer',
      isCorrect: false,
      expectedRatio: '1:5000',
    },
    createdAt: '2023-06-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z',
    selected: true,
    nodes: [
      {
        id: uuidv4(),
        x: 100,
        y: 150,
        label: '装载站A',
        isDraggable: true,
        anomalies: [],
        source: 'old_table',
        unit: 'kilometer',
      },
      {
        id: uuidv4(),
        x: 250,
        y: 120,
        label: '中转点1',
        isDraggable: true,
        anomalies: [
          createAnomaly({
            type: 'scale_mismatch',
            severity: 'high',
            description: '单位混淆：标注为千米，实际应为米',
            sourceRef: '2023年矿区旧数据表.xlsx - Sheet2!B15',
            beforeState: { unit: 'kilometer', x: 250, y: 120, displayLength: '250km' },
            afterState: { unit: 'meter', x: 250, y: 120, displayLength: '250m' },
            createdAt: '2024-03-01T09:15:00Z',
          }),
        ],
        source: 'old_table',
        unit: 'kilometer',
      },
      {
        id: uuidv4(),
        x: 400,
        y: 200,
        label: '卸料站B',
        isDraggable: true,
        anomalies: [],
        source: 'old_table',
        unit: 'kilometer',
      },
    ],
  },
  {
    id: uuidv4(),
    name: '西区补录路径-B线',
    source: {
      type: 'manual',
      name: '张老师补录备注.docx',
      description: '人工补录的缺失路径，包含手写备注',
    },
    scale: {
      ratio: '1:5000',
      unit: 'meter',
      isCorrect: false,
    },
    createdAt: '2024-02-10T16:45:00Z',
    updatedAt: '2024-02-10T16:45:00Z',
    selected: false,
    nodes: [
      {
        id: uuidv4(),
        x: 150,
        y: 350,
        label: '仓库C',
        isDraggable: true,
        anomalies: [],
        source: 'manual',
        unit: 'meter',
      },
      {
        id: uuidv4(),
        x: 280,
        y: 420,
        label: '检查点2',
        isDraggable: true,
        anomalies: [
          createAnomaly({
            type: 'coordinate_flip',
            severity: 'high',
            description: '坐标翻转：X/Y坐标写反，路径经过禁行区',
            sourceRef: '张老师补录备注.docx - 第3页手写标注',
            beforeState: { x: 280, y: 420, inForbiddenZone: false },
            afterState: { x: 420, y: 280, inForbiddenZone: true, note: '坐标已互换，需核实' },
            createdAt: '2024-03-02T11:30:00Z',
            annotation: '红色笔迹：此处好像写反了，请核对原图',
          }),
        ],
        source: 'manual',
        unit: 'meter',
      },
      {
        id: uuidv4(),
        x: 350,
        y: 380,
        label: '加工区D',
        isDraggable: true,
        anomalies: [
          createAnomaly({
            type: 'manual_note',
            severity: 'low',
            description: '人工备注：此点位置存疑，需现场复核',
            sourceRef: '张老师补录备注.docx - 页边注',
            beforeState: { status: 'recorded' },
            afterState: { status: 'pending_verification' },
            createdAt: '2024-02-10T17:00:00Z',
          }),
        ],
        source: 'manual',
        unit: 'meter',
      },
    ],
  },
  {
    id: uuidv4(),
    name: '南北贯穿线-C线',
    source: {
      type: 'mixed',
      name: '多来源合并数据',
      description: '系统原始记录 + 人工补填，数据来源混杂',
    },
    scale: {
      ratio: '1:1',
      unit: 'unknown',
      isCorrect: false,
      expectedRatio: '1:5000',
    },
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-03-01T13:15:00Z',
    selected: false,
    nodes: [
      {
        id: uuidv4(),
        x: 500,
        y: 100,
        label: '北部堆场',
        isDraggable: true,
        anomalies: [],
        source: 'original',
        unit: 'meter',
      },
      {
        id: uuidv4(),
        x: 520,
        y: 250,
        label: '坡道入口',
        isDraggable: true,
        anomalies: [
          createAnomaly({
            type: 'unit_missing',
            severity: 'medium',
            description: '单位缺失：未标注坐标单位，使用默认值',
            sourceRef: '漏填行 - 系统原始记录第47行',
            beforeState: { unit: 'unknown', scale: '1:1' },
            afterState: { unit: 'meter', scale: '1:5000' },
            createdAt: '2024-03-03T08:45:00Z',
          }),
        ],
        source: 'mixed',
        unit: 'unknown',
      },
      {
        id: uuidv4(),
        x: 480,
        y: 400,
        label: '南部终端',
        isDraggable: true,
        anomalies: [],
        source: 'original',
        unit: 'meter',
      },
    ],
  },
];

export const forbiddenZones = [
  { x: 380, y: 220, width: 100, height: 80, label: '禁行区-尾矿库' },
  { x: 200, y: 300, width: 60, height: 60, label: '禁行区-办公区' },
];

export const dataSourceLabels: Record<string, { label: string; color: string }> = {
  old_table: { label: '旧表导出', color: '#e67e22' },
  manual: { label: '人工补录', color: '#9b59b6' },
  original: { label: '原始记录', color: '#27ae60' },
  mixed: { label: '混合来源', color: '#3498db' },
};

export const anomalyTypeLabels: Record<string, { label: string; color: string }> = {
  scale_mismatch: { label: '比例尺错用', color: '#e74c3c' },
  coordinate_flip: { label: '坐标翻转', color: '#f39c12' },
  unit_missing: { label: '单位漏填', color: '#e67e22' },
  manual_note: { label: '人工备注', color: '#95a5a6' },
};
