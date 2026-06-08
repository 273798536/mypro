import type { ContainerPosition, AnomalyRecord, ProcessingRecord, HistoryLog, CameraState } from '../types';

export function generateSampleContainers(): ContainerPosition[] {
  const containers: ContainerPosition[] = [];
  const batchId = 'SAMPLE_BATCH_001';
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    containers.push({
      id: `container_${i}`,
      name: `箱位-${row + 1}-${col + 1}`,
      x: col * 12 + 6,
      y: 0,
      z: row * 16 + 8,
      width: 10,
      height: 8,
      depth: 14,
      importBatch: batchId,
      createdAt: now,
    });
  }

  containers[12].x = containers[13].x;
  containers[12].z = containers[13].z;

  return containers;
}

export function generateSampleAnomalies(): AnomalyRecord[] {
  const now = new Date();
  return [
    {
      id: 'anomaly_1',
      type: 'model_overlap',
      severity: 'high',
      status: 'pending',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '发现箱位12和箱位13存在空间重叠，重叠体积约15立方米',
      processingSuggestion: '',
      relatedContainerIds: ['container_12', 'container_13'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_2',
      type: 'camera_lost',
      severity: 'medium',
      status: 'processing',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '三维视图相机视角异常，位置坐标超出有效范围',
      processingSuggestion: '重置相机视角到默认位置',
      relatedContainerIds: [],
      cameraState: {
        position: { x: -500, y: 300, z: -500 },
        rotation: { x: 0.5, y: -0.8, z: 0 },
        zoom: 0.1,
        isLost: true,
        lostReason: '视角坐标异常',
        savedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_3',
      type: 'size_exceed',
      severity: 'high',
      status: 'processed',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '箱位25高度超出标准高度50%',
      processingSuggestion: '已联系物流部门确认实际尺寸需求',
      relatedContainerIds: ['container_25'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_4',
      type: 'position_offset',
      severity: 'low',
      status: 'reviewed',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '箱位38位置偏离预定坐标2米',
      processingSuggestion: '偏移在可接受范围内，无需调整',
      relatedContainerIds: ['container_38'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_5',
      type: 'model_overlap',
      severity: 'medium',
      status: 'pending',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '箱位45和箱位46存在轻微重叠',
      processingSuggestion: '',
      relatedContainerIds: ['container_45', 'container_46'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_6',
      type: 'camera_lost',
      severity: 'high',
      status: 'pending',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '相机视角完全丢失，无法渲染三维视图',
      processingSuggestion: '',
      relatedContainerIds: [],
      cameraState: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        zoom: 0,
        isLost: true,
        lostReason: '视角参数全为0',
        savedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_7',
      type: 'size_exceed',
      severity: 'low',
      status: 'processed',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '箱位10宽度略超标准',
      processingSuggestion: '已标记为低优先级观察',
      relatedContainerIds: ['container_10'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'anomaly_8',
      type: 'position_offset',
      severity: 'medium',
      status: 'pending',
      sourceInfo: {
        importBatch: 'SAMPLE_BATCH_001',
        importTime: now,
        sourceFile: 'sample_data.xlsx',
      },
      riskNote: '多个箱位整体偏移',
      processingSuggestion: '',
      relatedContainerIds: ['container_1', 'container_2', 'container_3'],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function generateSampleProcessingRecords(): ProcessingRecord[] {
  const now = new Date();
  return [
    {
      id: 'pr_1',
      anomalyId: 'anomaly_1',
      operator: '张工',
      operatorRole: 'simulation_engineer',
      action: 'add_risk_note',
      afterValue: '发现箱位12和箱位13存在空间重叠，重叠体积约15立方米',
      timestamp: new Date(now.getTime() - 3600000),
    },
    {
      id: 'pr_2',
      anomalyId: 'anomaly_2',
      operator: '李工',
      operatorRole: 'operations_team',
      action: 'add_risk_note',
      afterValue: '三维视图相机视角异常，位置坐标超出有效范围',
      timestamp: new Date(now.getTime() - 3000000),
    },
    {
      id: 'pr_3',
      anomalyId: 'anomaly_2',
      operator: '李工',
      operatorRole: 'operations_team',
      action: 'add_suggestion',
      beforeValue: '',
      afterValue: '重置相机视角到默认位置',
      timestamp: new Date(now.getTime() - 2400000),
    },
    {
      id: 'pr_4',
      anomalyId: 'anomaly_3',
      operator: '王工',
      operatorRole: 'simulation_engineer',
      action: 'add_risk_note',
      afterValue: '箱位25高度超出标准高度50%',
      timestamp: new Date(now.getTime() - 1800000),
    },
    {
      id: 'pr_5',
      anomalyId: 'anomaly_3',
      operator: '王工',
      operatorRole: 'simulation_engineer',
      action: 'add_suggestion',
      afterValue: '已联系物流部门确认实际尺寸需求',
      timestamp: new Date(now.getTime() - 1200000),
    },
    {
      id: 'pr_6',
      anomalyId: 'anomaly_3',
      operator: '张工',
      operatorRole: 'operations_team',
      action: 'change_status',
      beforeValue: 'pending',
      afterValue: 'processed',
      timestamp: new Date(now.getTime() - 600000),
    },
    {
      id: 'pr_7',
      anomalyId: 'anomaly_4',
      operator: '李工',
      operatorRole: 'operations_team',
      action: 'add_risk_note',
      afterValue: '箱位38位置偏离预定坐标2米',
      timestamp: new Date(now.getTime() - 5400000),
    },
    {
      id: 'pr_8',
      anomalyId: 'anomaly_4',
      operator: '李工',
      operatorRole: 'operations_team',
      action: 'add_suggestion',
      afterValue: '偏移在可接受范围内，无需调整',
      timestamp: new Date(now.getTime() - 4800000),
    },
    {
      id: 'pr_9',
      anomalyId: 'anomaly_4',
      operator: '张工',
      operatorRole: 'operations_team',
      action: 'review',
      beforeValue: 'processed',
      afterValue: 'reviewed',
      timestamp: new Date(now.getTime() - 4200000),
    },
    {
      id: 'pr_10',
      anomalyId: 'anomaly_4',
      operator: '张工',
      operatorRole: 'operations_team',
      action: 'export',
      afterValue: '已导出复核报告',
      timestamp: new Date(now.getTime() - 3600000),
    },
  ];
}

export function generateSampleHistoryLogs(): HistoryLog[] {
  const now = new Date();
  return [
    {
      id: 'log_1',
      targetType: 'anomaly',
      targetId: 'anomaly_1',
      operator: '张工',
      operatorRole: 'simulation_engineer',
      action: 'add_risk_note',
      beforeState: {},
      afterState: { riskNote: '发现箱位12和箱位13存在空间重叠，重叠体积约15立方米' },
      reason: '例行检查发现异常',
      timestamp: new Date(now.getTime() - 3600000),
    },
    {
      id: 'log_2',
      targetType: 'anomaly',
      targetId: 'anomaly_2',
      operator: '李工',
      operatorRole: 'operations_team',
      action: 'update_status',
      beforeState: { status: 'pending' },
      afterState: { status: 'processing' },
      reason: '开始处理相机视角异常',
      timestamp: new Date(now.getTime() - 2400000),
    },
    {
      id: 'log_3',
      targetType: 'anomaly',
      targetId: 'anomaly_4',
      operator: '张工',
      operatorRole: 'operations_team',
      action: 'review_confirm',
      beforeState: { status: 'processed' },
      afterState: { status: 'reviewed' },
      reason: '确认偏移在可接受范围内，审核通过',
      timestamp: new Date(now.getTime() - 4200000),
    },
    {
      id: 'log_4',
      targetType: 'container',
      targetId: 'container_12',
      operator: '张工',
      operatorRole: 'simulation_engineer',
      action: 'position_modified',
      beforeState: { x: 78, z: 90 },
      afterState: { x: 78, z: 92 },
      reason: '调整箱位12位置以解决重叠问题',
      timestamp: new Date(now.getTime() - 7200000),
    },
    {
      id: 'log_5',
      targetType: 'anomaly',
      targetId: 'anomaly_3',
      operator: '王工',
      operatorRole: 'simulation_engineer',
      action: 'add_suggestion',
      beforeState: {},
      afterState: { processingSuggestion: '已联系物流部门确认实际尺寸需求' },
      reason: '协调相关部门确认业务需求',
      timestamp: new Date(now.getTime() - 1200000),
    },
  ];
}

export function generateSampleCameraStates(): CameraState[] {
  const now = new Date();
  return [
    {
      position: { x: 60, y: 80, z: 70 },
      rotation: { x: 0.3, y: 0.4, z: 0 },
      zoom: 1.0,
      isLost: false,
      savedAt: now,
    },
    {
      position: { x: 120, y: 100, z: 80 },
      rotation: { x: 0.2, y: -0.3, z: 0 },
      zoom: 0.8,
      isLost: false,
      savedAt: new Date(now.getTime() - 3600000),
    },
    {
      position: { x: 80, y: 60, z: 100 },
      rotation: { x: 0.4, y: 0.5, z: 0 },
      zoom: 1.2,
      isLost: false,
      savedAt: new Date(now.getTime() - 7200000),
    },
    {
      position: { x: 50, y: 70, z: 50 },
      rotation: { x: 0.1, y: 0.2, z: 0 },
      zoom: 0.9,
      isLost: false,
      savedAt: new Date(now.getTime() - 10800000),
    },
    {
      position: { x: 100, y: 90, z: 60 },
      rotation: { x: 0.35, y: -0.45, z: 0 },
      zoom: 1.1,
      isLost: false,
      savedAt: new Date(now.getTime() - 14400000),
    },
  ];
}

export function initializeSampleData() {
  return {
    containers: generateSampleContainers(),
    anomalies: generateSampleAnomalies(),
    processingRecords: generateSampleProcessingRecords(),
    historyLogs: generateSampleHistoryLogs(),
    cameraStates: generateSampleCameraStates(),
    isFirstVisit: false,
  };
}
