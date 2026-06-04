import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, FileWarning, ArrowUpRight, Image, Video, PenTool } from 'lucide-react';
import { useRecordPool } from '@/store/recordPool';
import { cn } from '@/lib/utils';
import { ANOMALY_TYPE_TEXT, STATUS_TEXT, MATERIAL_TYPE_TEXT, UPLOAD_STATUS_TEXT } from '@/utils/mockData';
import type { ScoreRecord } from '@/types';

const anomalyIcons = {
  material_missing: Image,
  layer_occlusion: PenTool,
  incomplete_data: FileWarning,
  old_format: FileWarning,
  none: CheckCircle,
};

const anomalyColors = {
  material_missing: 'bg-red-100 text-red-700 border-red-200',
  layer_occlusion: 'bg-amber-100 text-amber-700 border-amber-200',
  incomplete_data: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  old_format: 'bg-purple-100 text-purple-700 border-purple-200',
  none: 'bg-green-100 text-green-700 border-green-200',
};

const statusColors = {
  normal: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  processed: 'bg-green-100 text-green-700',
};

interface RecordRowProps {
  record: ScoreRecord;
  index: number;
}

function RecordRow({ record, index }: RecordRowProps) {
  const navigate = useNavigate();
  const getLayersByRecordId = useRecordPool((state) => state.getLayersByRecordId);
  const layers = getLayersByRecordId(record.id);

  const isAnomaly = record.anomalyType !== 'none';
  const AnomalyIcon = anomalyIcons[record.anomalyType] || AlertTriangle;

  return (
    <tr
      onClick={() => navigate(`/detail/${record.id}`)}
      className={cn(
        'cursor-pointer transition-colors border-b border-slate-100',
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
        isAnomaly && 'hover:bg-red-50/50',
        !isAnomaly && 'hover:bg-blue-50/50'
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isAnomaly && (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <span className={cn('font-mono text-xs', isAnomaly ? 'text-red-600' : 'text-slate-500')}>
            {record.id}
          </span>
          {record.hasSupplementary && (
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">
              补录
            </span>
          )}
          {record.isOldFormat && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-600 rounded">
              旧表
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{record.patientName}</div>
        <div className="text-xs text-slate-500">{record.patientId}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-700">{record.scoreItem}</div>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'font-bold text-lg',
          record.score >= 80 ? 'text-green-600' : record.score >= 60 ? 'text-amber-600' : 'text-red-600'
        )}>
          {record.score}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {isAnomaly && (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border',
              anomalyColors[record.anomalyType]
            )}>
              <AnomalyIcon className="w-3 h-3" />
              {ANOMALY_TYPE_TEXT[record.anomalyType]}
            </span>
          )}
          {!isAnomaly && (
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border',
              anomalyColors.none
            )}>
              <CheckCircle className="w-3 h-3" />
              正常
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {record.anomalyReason && (
          <div className="text-xs text-slate-600 max-w-xs truncate">
            {record.anomalyReason}
          </div>
        )}
        {isAnomaly && layers.length > 0 && (
          <div className="flex gap-1 mt-1">
            {layers.filter(l => l.uploadStatus !== 'uploaded').slice(0, 3).map(layer => (
              <span
                key={layer.id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded border border-red-100"
              >
                {layer.materialType === 'screenshot' && <Image className="w-2.5 h-2.5" />}
                {layer.materialType === 'video' && <Video className="w-2.5 h-2.5" />}
                {layer.materialType === 'mark' && <PenTool className="w-2.5 h-2.5" />}
                {MATERIAL_TYPE_TEXT[layer.materialType]}{UPLOAD_STATUS_TEXT[layer.uploadStatus]}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
          statusColors[record.status]
        )}>
          {record.status === 'pending' && <Clock className="w-3 h-3" />}
          {record.status === 'processed' && <CheckCircle className="w-3 h-3" />}
          {STATUS_TEXT[record.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-slate-500">{record.fillTime}</div>
        <div className="text-xs text-slate-400">
          {record.fillUnit || <span className="text-red-400">未填单位</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
          查看
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

export function RecordTable() {
  const getFilteredRecords = useRecordPool((state) => state.getFilteredRecords);
  const records = getFilteredRecords();

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <FileWarning className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">暂无符合条件的记录</p>
        <p className="text-sm text-slate-400 mt-1">请调整筛选条件或导入新数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
              <th className="px-4 py-3">记录编号</th>
              <th className="px-4 py-3">患者信息</th>
              <th className="px-4 py-3">评分项目</th>
              <th className="px-4 py-3">得分</th>
              <th className="px-4 py-3">异常类型</th>
              <th className="px-4 py-3">异常说明</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">填写信息</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <RecordRow key={record.id} record={record} index={index} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        共 {records.length} 条记录
      </div>
    </div>
  );
}
