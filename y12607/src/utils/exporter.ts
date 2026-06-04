import * as XLSX from 'xlsx';
import type { ScoreRecord, LayerRecord, ProcessNote, AnomalyType } from '@/types';
import { getReadableAnomalyType, getReadableStatus } from './anomalyDetector';

const COLUMN_MAP: Record<string, string> = {
  patientName: '患者姓名',
  patientId: '患者编号',
  scoreItem: '评分项目',
  score: '得分',
  fillTime: '填写时间',
  fillUnit: '填写单位',
  fillOperator: '填写人',
  remark: '备注',
  statusText: '处理状态',
  anomalyTypeText: '异常类型',
  anomalyReason: '异常说明',
  suggestion: '处理建议',
  materialStatus: '素材状态',
  layerCheckResult: '图层检测结果',
  hasSupplementary: '是否补录',
};

const ANOMALY_SUGGESTION: Record<AnomalyType, string> = {
  none: '无需处理',
  material_missing: '请联系治疗师补充上传缺失的截图或视频素材',
  layer_occlusion: '请检查图层遮挡情况，必要时重新标记关键点',
  incomplete_data: '请补填缺失的必填字段',
  old_format: '请按照新格式要求核对并更新数据',
};

const UPLOAD_STATUS_TEXT: Record<string, string> = {
  uploaded: '已上传',
  missing: '缺失',
  damaged: '损坏',
};

const MATERIAL_TYPE_TEXT: Record<string, string> = {
  screenshot: '截图',
  video: '视频帧',
  mark: '标记',
};

interface ExportRow {
  patientName: string;
  patientId: string;
  scoreItem: string;
  score: number;
  fillTime: string;
  fillUnit: string;
  fillOperator: string;
  remark: string;
  statusText: string;
  anomalyTypeText: string;
  anomalyReason: string;
  suggestion: string;
  materialStatus: string;
  layerCheckResult: string;
  hasSupplementary: string;
}

export function exportToExcel(
  records: ScoreRecord[],
  layers: LayerRecord[],
  processNotes: ProcessNote[]
): void {
  const exportData: ExportRow[] = records.map(record => {
    const recordLayers = layers.filter(l => l.recordId === record.id);
    const recordNotes = processNotes.filter(n => n.recordId === record.id);
    
    const materialStatus = recordLayers
      .filter(l => l.uploadStatus !== 'uploaded')
      .map(l => `${MATERIAL_TYPE_TEXT[l.materialType]}${UPLOAD_STATUS_TEXT[l.uploadStatus]}`)
      .join('、');
    
    const occlusionLayers = recordLayers.filter(l => l.hasOcclusion);
    const layerCheckResult = occlusionLayers.length > 0
      ? `${occlusionLayers.length}个图层存在遮挡：${occlusionLayers.map(l => l.layerName).join('、')}`
      : '图层正常';
    
    const latestNote = recordNotes.length > 0 ? recordNotes[recordNotes.length - 1] : null;
    
    return {
      patientName: record.patientName,
      patientId: record.patientId,
      scoreItem: record.scoreItem,
      score: record.score,
      fillTime: record.fillTime,
      fillUnit: record.fillUnit || '未填写',
      fillOperator: record.fillOperator,
      remark: record.remark || '无',
      statusText: getReadableStatus(record.status),
      anomalyTypeText: getReadableAnomalyType(record.anomalyType),
      anomalyReason: record.anomalyReason || '无异常',
      suggestion: latestNote?.suggestion || ANOMALY_SUGGESTION[record.anomalyType],
      materialStatus: materialStatus || '全部已上传',
      layerCheckResult,
      hasSupplementary: record.hasSupplementary ? '是' : '否',
    };
  });
  
  const displayData = exportData.map(row => {
    const displayRow: Record<string, string | number> = {};
    Object.keys(row).forEach(key => {
      const displayKey = COLUMN_MAP[key] || key;
      displayRow[displayKey] = (row as unknown as Record<string, string | number>)[key];
    });
    return displayRow;
  });
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(displayData);
  
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 8 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 30 },
    { wch: 10 },
    { wch: 14 },
    { wch: 30 },
    { wch: 30 },
    { wch: 20 },
    { wch: 24 },
    { wch: 10 },
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, '康复评分异常记录');
  
  const now = new Date();
  const fileName = `康复动作轨迹看板_异常记录_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
  
  XLSX.writeFile(wb, fileName);
}

export function generateExportPreview(
  record: ScoreRecord,
  layers: LayerRecord[],
  notes: ProcessNote[]
): { label: string; value: string }[] {
  const recordLayers = layers.filter(l => l.recordId === record.id);
  const latestNote = notes.filter(n => n.recordId === record.id).pop();
  
  return [
    { label: '患者姓名', value: record.patientName },
    { label: '患者编号', value: record.patientId },
    { label: '评分项目', value: record.scoreItem },
    { label: '得分', value: String(record.score) },
    { label: '填写时间', value: record.fillTime },
    { label: '填写单位', value: record.fillUnit || '未填写' },
    { label: '填写人', value: record.fillOperator },
    { label: '备注', value: record.remark || '无' },
    { label: '处理状态', value: getReadableStatus(record.status) },
    { label: '异常类型', value: getReadableAnomalyType(record.anomalyType) },
    { label: '异常说明', value: record.anomalyReason || '无异常' },
    { label: '处理建议', value: latestNote?.suggestion || ANOMALY_SUGGESTION[record.anomalyType] },
    {
      label: '素材状态',
      value: recordLayers
        .filter(l => l.uploadStatus !== 'uploaded')
        .map(l => `${MATERIAL_TYPE_TEXT[l.materialType]}${UPLOAD_STATUS_TEXT[l.uploadStatus]}`)
        .join('、') || '全部已上传',
    },
    {
      label: '图层检测结果',
      value: recordLayers.filter(l => l.hasOcclusion).length > 0
        ? `${recordLayers.filter(l => l.hasOcclusion).length}个图层存在遮挡`
        : '图层正常',
    },
    { label: '是否补录', value: record.hasSupplementary ? '是' : '否' },
  ];
}
