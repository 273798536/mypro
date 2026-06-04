export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Equipment {
  id: string;
  name: string;
  model: string;
  sn: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
}

export interface SourceImage {
  id: string;
  equipment_id: string;
  image_hash: string;
  coordinates: string;
  batch_no: string;
  file_name: string;
  file_size: number;
  file_data: string;
  import_time: string;
  imported_by: string;
}

export interface Processing {
  id: string;
  source_image_id: string;
  zoom_level: number;
  pan_offset: { x: number; y: number };
  processed_by: string;
  start_time: string;
  last_modified_at: string;
  mode: 'browse' | 'annotate';
}

export interface Anomaly {
  id: string;
  processing_id: string;
  position_x: number;
  position_y: number;
  severity: Severity;
  color_code: string;
  technical_reason: string;
  human_reason: string;
  created_at: string;
}

export interface Opinion {
  id: string;
  processing_id: string;
  processing_opinion: string;
  created_at: string;
}

export interface Conclusion {
  id: string;
  processing_id: string;
  status: 'approved' | 'rejected' | 'pending';
  conclusion_text: string;
  processing_opinion: string;
  reviewed_by: string;
  reviewed_at: string;
}

export interface TraceChain {
  anomaly: Anomaly;
  processing: Processing;
  sourceImage: SourceImage;
  equipment: Equipment;
  opinion?: Opinion;
  conclusion?: Conclusion;
}

export interface ChartData {
  bySeverity: { name: string; value: number; color: string }[];
  byEquipment: { name: string; count: number; high: number; medium: number; low: number; critical: number }[];
  trend: { date: string; count: number }[];
  byColor: { color: string; name: string; count: number }[];
}

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  equipmentId?: string;
  severity?: Severity[];
}

export interface ExportRow {
  '设备名称': string;
  '设备型号': string;
  '设备序列号': string;
  '底图坐标': string;
  '处理时间': string;
  '处理人': string;
  '异常位置': string;
  '严重程度': string;
  '异常颜色': string;
  '异常原因（通俗说明）': string;
  '处理意见': string;
  '追溯编号': string;
}

export interface ImportResult {
  success: number;
  skipped: number;
  imported: SourceImage[];
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
  critical: '危急',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#d97706',
  medium: '#ea580c',
  high: '#dc2626',
  critical: '#991b1b',
};

export const REASON_TRANSLATIONS: Record<string, string> = {
  COLOR_CHANNEL_OUTLIER_R: '红色通道数值超出正常范围',
  COLOR_CHANNEL_OUTLIER_G: '绿色通道数值超出正常范围',
  COLOR_CHANNEL_OUTLIER_B: '蓝色通道数值超出正常范围',
  INTENSITY_ABOVE_THRESHOLD: '亮度超过正常上限',
  INTENSITY_BELOW_THRESHOLD: '亮度低于正常下限',
  TEXTURE_IRREGULARITY: '纹理模式异常，与周围区域不一致',
  EDGE_DETECTION_ANOMALY: '边缘轮廓不清晰或不规则',
  GRADIENT_ABNORMALITY: '颜色过渡不自然，存在突变',
  NOISE_EXCESSIVE: '图像噪点过多，影响观察',
  BLUR_DETECTED: '图像模糊，细节不清晰',
};

export const EQUIPMENT_STATUS_LABELS: Record<Equipment['status'], string> = {
  active: '正常使用',
  inactive: '停用',
  maintenance: '维护中',
};
