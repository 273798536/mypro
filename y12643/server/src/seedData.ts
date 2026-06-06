import { db } from './database';
import { v4 as uuidv4 } from 'uuid';
import { Layer, ExceptionRecord, ProcessingRecord, RecordType, RecordStatus, ExceptionType, ProcessingAction } from './types';
import { getStatusHex } from './utils/colorRules';

export function seedMockData() {
  const layerCheck = db.prepare('SELECT COUNT(*) as count FROM layers').get() as { count: number };
  if (layerCheck.count > 0) {
    console.log('Mock data already exists, skipping seed.');
    return;
  }

  const insertLayer = db.prepare(`
    INSERT INTO layers (id, name, type, status, canvas_status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const layers: Layer[] = [
    {
      id: 'layer-001',
      name: '机构运动轨迹',
      type: RecordType.TRAJECTORY,
      status: 'active',
      canvasStatus: '正常',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'layer-002',
      name: '设备清单',
      type: RecordType.DEVICE_LIST,
      status: 'active',
      canvasStatus: '正常',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'layer-003',
      name: '比例尺标注',
      type: RecordType.SCALE_ERROR,
      status: 'warning',
      canvasStatus: '存在异常',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'layer-004',
      name: '离线素材库',
      type: RecordType.DEVICE_LIST,
      status: 'inactive',
      canvasStatus: '部分缺失',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const layer of layers) {
    insertLayer.run(layer.id, layer.name, layer.type, layer.status, layer.canvasStatus);
  }

  const insertException = db.prepare(`
    INSERT INTO exceptions (
      id, type, record_type, title, description, source, layer_id,
      status, color, data, offline_missing, is_duplicate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const exceptions: ExceptionRecord[] = [
    {
      id: 'exc-001',
      type: ExceptionType.SCALE_ERROR,
      recordType: RecordType.SCALE_ERROR,
      title: '比例尺错用',
      description: '该图层比例尺设置为1:1000，但实际测量应为1:500',
      source: {
        fileName: '比例尺标注_2024批次A.csv',
        importTime: '2024-06-01T10:30:00.000Z',
        importer: '张工',
        originalId: 'scale-2024-a-001'
      },
      layerId: 'layer-003',
      status: RecordStatus.ABNORMAL,
      color: getStatusHex(RecordStatus.ABNORMAL),
      data: {
        scaleValue: 1000,
        scaleUnit: 'm',
        mapScale: 500,
        coordinateSystem: '平面直角'
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-06-01T10:30:00.000Z',
      updatedAt: '2024-06-01T10:30:00.000Z'
    },
    {
      id: 'exc-002',
      type: ExceptionType.OFFLINE_MISSING,
      recordType: RecordType.DEVICE_LIST,
      title: '离线素材缺失',
      description: '设备图标文件未找到',
      source: {
        fileName: '设备素材库_v2.3.zip',
        importTime: '2024-06-02T14:20:00.000Z',
        importer: '李工',
        originalId: 'asset-missing-002'
      },
      layerId: 'layer-004',
      status: RecordStatus.OFFLINE_MISSING,
      color: getStatusHex(RecordStatus.OFFLINE_MISSING),
      data: {
        iconFile: { path: 'assets/icons/pump.png', exists: false },
        offlineAssets: [
          { path: 'assets/icons/pump.png', exists: false, name: '水泵图标' },
          { path: 'assets/icons/valve.png', exists: true, name: '阀门图标' }
        ],
        hasOfflineDependency: true
      },
      offlineMissing: true,
      isDuplicate: false,
      createdAt: '2024-06-02T14:20:00.000Z',
      updatedAt: '2024-06-02T14:20:00.000Z'
    },
    {
      id: 'exc-003',
      type: ExceptionType.DUPLICATE_IMPORT,
      recordType: RecordType.TRAJECTORY,
      title: '重复导入',
      description: '同一轨迹数据被导入两次',
      source: {
        fileName: '轨迹记录_6月1日_上午.csv',
        importTime: '2024-06-03T09:15:00.000Z',
        importer: '王工',
        originalId: 'traj-2024-0601-am'
      },
      layerId: 'layer-001',
      status: RecordStatus.PROCESSING,
      color: getStatusHex(RecordStatus.PROCESSING),
      data: {
        points: [
          { lat: 31.2304, lng: 121.4737, time: '2024-06-01T08:00:00Z' },
          { lat: 31.2310, lng: 121.4740, time: '2024-06-01T08:30:00Z' }
        ],
        startTime: '2024-06-01T08:00:00Z',
        endTime: '2024-06-01T12:00:00Z',
        distance: 15.6,
        speed: 4.2,
        trackId: 'traj-2024-0601-am'
      },
      offlineMissing: false,
      isDuplicate: true,
      createdAt: '2024-06-03T09:15:00.000Z',
      updatedAt: '2024-06-03T09:15:00.000Z'
    },
    {
      id: 'exc-004',
      type: ExceptionType.SCALE_ERROR,
      recordType: RecordType.SCALE_ERROR,
      title: '比例尺单位错误',
      description: '使用米作为单位，但标注显示为公里',
      source: {
        fileName: '比例尺标注_2024批次B.csv',
        importTime: '2024-05-28T16:45:00.000Z',
        importer: '赵工',
        originalId: 'scale-2024-b-007'
      },
      layerId: 'layer-003',
      status: RecordStatus.NORMAL,
      color: getStatusHex(RecordStatus.NORMAL),
      data: {
        scaleValue: 2000,
        scaleUnit: 'm',
        mapScale: 2000,
        coordinateSystem: '平面直角'
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-05-28T16:45:00.000Z',
      updatedAt: '2024-05-30T11:20:00.000Z'
    },
    {
      id: 'exc-005',
      type: ExceptionType.OFFLINE_MISSING,
      recordType: RecordType.DEVICE_LIST,
      title: '纹理素材缺失',
      description: '地面纹理贴图文件不存在',
      source: {
        fileName: '纹理素材包_室外.zip',
        importTime: '2024-06-01T11:00:00.000Z',
        importer: '李工',
        originalId: 'texture-missing-005'
      },
      layerId: 'layer-004',
      status: RecordStatus.PENDING,
      color: getStatusHex(RecordStatus.PENDING),
      data: {
        textureFile: { path: 'assets/textures/ground_asphalt.png', exists: false },
        hasOfflineDependency: true
      },
      offlineMissing: true,
      isDuplicate: false,
      createdAt: '2024-06-01T11:00:00.000Z',
      updatedAt: '2024-06-01T11:00:00.000Z'
    },
    {
      id: 'exc-006',
      type: ExceptionType.SCALE_ERROR,
      recordType: RecordType.SCALE_ERROR,
      title: '坐标系不匹配',
      description: 'WGS84坐标被误用于平面直角坐标系',
      source: {
        fileName: '设备坐标清单_5月.xlsx',
        importTime: '2024-05-25T09:00:00.000Z',
        importer: '张工',
        originalId: 'coord-mismatch-006'
      },
      layerId: 'layer-002',
      status: RecordStatus.ABNORMAL,
      color: getStatusHex(RecordStatus.ABNORMAL),
      data: {
        scaleValue: 1500,
        scaleUnit: 'm',
        mapScale: 1500,
        coordinateSystem: 'WGS84'
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-05-25T09:00:00.000Z',
      updatedAt: '2024-05-25T09:00:00.000Z'
    },
    {
      id: 'exc-007',
      type: ExceptionType.DEVICE_LIST_ERROR,
      recordType: RecordType.DEVICE_LIST,
      title: '设备清单存在重复ID',
      description: '设备PUMP-003在清单中出现了两次',
      source: {
        fileName: '水泵站设备清单_2024Q2.xlsx',
        importTime: '2024-06-04T10:00:00.000Z',
        importer: '陈工',
        originalId: 'device-dup-007'
      },
      layerId: 'layer-002',
      status: RecordStatus.ABNORMAL,
      color: getStatusHex(RecordStatus.ABNORMAL),
      data: {
        devices: [
          { deviceId: 'PUMP-001', deviceName: '主水泵1号', quantity: 1 },
          { deviceId: 'PUMP-002', deviceName: '主水泵2号', quantity: 1 },
          { deviceId: 'PUMP-003', deviceName: '备用泵', quantity: 1 },
          { deviceId: 'PUMP-003', deviceName: '备用泵', quantity: 1 }
        ]
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-06-04T10:00:00.000Z',
      updatedAt: '2024-06-04T10:00:00.000Z'
    },
    {
      id: 'exc-008',
      type: ExceptionType.TRAJECTORY_ANOMALY,
      recordType: RecordType.TRAJECTORY,
      title: '轨迹时间异常',
      description: '轨迹结束时间早于开始时间',
      source: {
        fileName: '巡检轨迹_6月3日.csv',
        importTime: '2024-06-03T18:30:00.000Z',
        importer: '王工',
        originalId: 'traj-time-error-008'
      },
      layerId: 'layer-001',
      status: RecordStatus.PENDING,
      color: getStatusHex(RecordStatus.PENDING),
      data: {
        points: [
          { lat: 31.2304, lng: 121.4737, time: '2024-06-03T12:00:00Z' },
          { lat: 31.2310, lng: 121.4740, time: '2024-06-03T10:00:00Z' }
        ],
        startTime: '2024-06-03T12:00:00Z',
        endTime: '2024-06-03T10:00:00Z',
        distance: 0.5,
        speed: 2.1
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-06-03T18:30:00.000Z',
      updatedAt: '2024-06-03T18:30:00.000Z'
    },
    {
      id: 'exc-009',
      type: ExceptionType.TRAJECTORY_ANOMALY,
      recordType: RecordType.TRAJECTORY,
      title: '轨迹速度异常',
      description: '轨迹速度值超出合理范围',
      source: {
        fileName: '巡检轨迹_6月2日.csv',
        importTime: '2024-06-02T19:00:00.000Z',
        importer: '王工',
        originalId: 'traj-speed-error-009'
      },
      layerId: 'layer-001',
      status: RecordStatus.PENDING,
      color: getStatusHex(RecordStatus.PENDING),
      data: {
        points: [
          { lat: 31.2304, lng: 121.4737, time: '2024-06-02T08:00:00Z' },
          { lat: 31.2404, lng: 121.4837, time: '2024-06-02T08:05:00Z' }
        ],
        startTime: '2024-06-02T08:00:00Z',
        endTime: '2024-06-02T18:00:00Z',
        distance: 150.6,
        speed: 500
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-06-02T19:00:00.000Z',
      updatedAt: '2024-06-02T19:00:00.000Z'
    },
    {
      id: 'exc-010',
      type: ExceptionType.DEVICE_LIST_ERROR,
      recordType: RecordType.DEVICE_LIST,
      title: '设备ID缺失',
      description: '部分设备缺少唯一标识',
      source: {
        fileName: '阀门设备清单_紧急.xlsx',
        importTime: '2024-06-05T08:30:00.000Z',
        importer: '陈工',
        originalId: 'device-id-missing-010'
      },
      layerId: 'layer-002',
      status: RecordStatus.ABNORMAL,
      color: getStatusHex(RecordStatus.ABNORMAL),
      data: {
        devices: [
          { deviceId: 'VALVE-001', deviceName: '进水阀', quantity: 2 },
          { deviceName: '出水阀', quantity: 3 }
        ]
      },
      offlineMissing: false,
      isDuplicate: false,
      createdAt: '2024-06-05T08:30:00.000Z',
      updatedAt: '2024-06-05T08:30:00.000Z'
    }
  ];

  for (const exc of exceptions) {
    insertException.run(
      exc.id,
      exc.type,
      exc.recordType,
      exc.title,
      exc.description,
      JSON.stringify(exc.source),
      exc.layerId,
      exc.status,
      exc.color,
      JSON.stringify(exc.data),
      exc.offlineMissing ? 1 : 0,
      exc.isDuplicate ? 1 : 0
    );
  }

  const insertProcessing = db.prepare(`
    INSERT INTO processing_records (
      id, exception_id, action, operator, opinion,
      timestamp, previous_status, new_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const processingRecords: ProcessingRecord[] = [
    {
      id: uuidv4(),
      exceptionId: 'exc-003',
      action: ProcessingAction.MODIFY,
      operator: '张三',
      opinion: '已确认重复，保留最新版本，旧版本标记为已作废',
      timestamp: '2024-06-03T10:00:00.000Z',
      previousStatus: RecordStatus.ABNORMAL,
      newStatus: RecordStatus.PROCESSING
    },
    {
      id: uuidv4(),
      exceptionId: 'exc-004',
      action: ProcessingAction.REVIEW,
      operator: '李四',
      opinion: '比例尺已修正为1:2000，单位确认无误，复核通过',
      timestamp: '2024-05-30T11:20:00.000Z',
      previousStatus: RecordStatus.ABNORMAL,
      newStatus: RecordStatus.NORMAL
    },
    {
      id: uuidv4(),
      exceptionId: 'exc-005',
      action: ProcessingAction.REVIEW,
      operator: '王五',
      opinion: '待素材管理员补充纹理文件后重新复核',
      timestamp: '2024-06-01T15:00:00.000Z',
      previousStatus: RecordStatus.OFFLINE_MISSING,
      newStatus: RecordStatus.PENDING
    },
    {
      id: uuidv4(),
      exceptionId: 'exc-001',
      action: ProcessingAction.REVIEW,
      operator: '李四',
      opinion: '确认比例尺错用，需要数据提供方重新校准',
      timestamp: '2024-06-01T14:00:00.000Z',
      previousStatus: RecordStatus.PENDING,
      newStatus: RecordStatus.ABNORMAL
    }
  ];

  for (const pr of processingRecords) {
    insertProcessing.run(
      pr.id,
      pr.exceptionId,
      pr.action,
      pr.operator,
      pr.opinion,
      pr.timestamp,
      pr.previousStatus,
      pr.newStatus
    );
  }

  console.log('Mock data seeded successfully.');
  console.log(`  - Layers: ${layers.length} 条`);
  console.log(`  - Exceptions: ${exceptions.length} 条`);
  console.log(`  - Processing records: ${processingRecords.length} 条`);
}
