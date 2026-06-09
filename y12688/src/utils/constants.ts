import { StatusLabelMap, TypeLabelMap } from '../types';

export const STATUS_LABELS: StatusLabelMap = {
  normal: { label: '正常', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  duplicate: { label: '重复', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  conflict: { label: '冲突', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  missing_camera: { label: '相机视角丢失', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

export const TYPE_LABELS: TypeLabelMap = {
  buoy: { label: '浮标数据', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  model: { label: '三维模型', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  coordinate: { label: '设备坐标', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
};

export const FIELD_NAMES: Record<string, string> = {
  position: '位置坐标',
  rotation: '旋转角度',
  scale: '缩放比例',
  cameraAngle: '相机视角',
  buoyId: '浮标编号',
  modelId: '模型编号',
  timestamp: '采集时间',
  latitude: '纬度',
  longitude: '经度',
  depth: '深度',
};
