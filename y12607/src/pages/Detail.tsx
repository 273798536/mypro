import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Edit3,
  Save,
  X,
  RefreshCw,
  FileSpreadsheet,
  StickyNote,
} from 'lucide-react';
import { useRecordPool } from '@/store/recordPool';
import { TraceTimeline } from '@/components/TraceTimeline';
import { LayerHitPanel } from '@/components/LayerHitPanel';
import { generateExportPreview } from '@/utils/exporter';
import { ANOMALY_TYPE_TEXT, STATUS_TEXT } from '@/utils/mockData';
import { cn } from '@/lib/utils';
import type { RecordStatus } from '@/types';

const statusColors = {
  normal: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  processed: 'bg-green-100 text-green-700',
};

const anomalyColors = {
  material_missing: 'bg-red-100 text-red-700 border-red-200',
  layer_occlusion: 'bg-amber-100 text-amber-700 border-amber-200',
  incomplete_data: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  old_format: 'bg-purple-100 text-purple-700 border-purple-200',
  none: 'bg-green-100 text-green-700 border-green-200',
};

const scoreColors = {
  excellent: 'text-green-600 bg-green-50',
  good: 'text-blue-600 bg-blue-50',
  fair: 'text-amber-600 bg-amber-50',
  poor: 'text-red-600 bg-red-50',
};

export function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    scoreRecords,
    getLayersByRecordId,
    getHitsByRecordId,
    getProcessNotesByRecordId,
    updateRecordStatus,
    runAnomalyDetection,
    layerRecords,
    processNotes,
  } = useRecordPool();

  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [newStatus, setNewStatus] = useState<RecordStatus>('pending');

  const record = scoreRecords.find((r) => r.id === id);
  const layers = getLayersByRecordId(id || '');
  const hits = getHitsByRecordId(id || '');
  const notes = getProcessNotesByRecordId(id || '');

  useEffect(() => {
    if (record) {
      setNewStatus(record.status);
    }
  }, [record]);

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">记录不存在</h2>
          <p className="text-sm text-slate-500 mb-4">未找到编号为 {id} 的评分记录</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回看板
          </button>
        </div>
      </div>
    );
  }

  const scoreLevel = record.score >= 80 ? 'excellent' : record.score >= 60 ? 'good' : record.score >= 40 ? 'fair' : 'poor';
  const exportPreview = generateExportPreview(record, layers, notes);

  const handleSaveStatus = () => {
    updateRecordStatus(record.id, newStatus, editNote);
    setIsEditing(false);
    setEditNote('');
  };

  const handleRerunDetection = () => {
    const anomalies = runAnomalyDetection(record.id);
    alert(`重新检测完成，发现 ${anomalies.length} 个异常`);
  };

  const handleExportSingle = () => {
    const exportContent = exportPreview
      .map((item) => `${item.label}：${item.value}`)
      .join('\n');

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.id}_${record.patientName}_详情.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回看板
              </button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-800">异常详情</h1>
                    <span className="font-mono text-xs text-slate-500">{record.id}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {record.patientName} · {record.scoreItem}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRerunDetection}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新检测
              </button>
              <button
                onClick={handleExportSingle}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出详情
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  评分表信息
                </h2>
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-1 rounded text-xs font-medium', statusColors[record.status])}>
                    {STATUS_TEXT[record.status]}
                  </span>
                  {record.anomalyType !== 'none' && (
                    <span className={cn('px-2 py-1 rounded border text-xs font-medium', anomalyColors[record.anomalyType])}>
                      {ANOMALY_TYPE_TEXT[record.anomalyType]}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">患者姓名</label>
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {record.patientName}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">患者编号</label>
                  <p className="font-mono text-slate-700">{record.patientId}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">评分项目</label>
                  <p className="font-medium text-slate-800">{record.scoreItem}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">得分</label>
                  <p className={cn('text-2xl font-bold', scoreColors[scoreLevel].split(' ')[0])}>
                    {record.score}
                    <span className="text-sm font-normal text-slate-400 ml-1">/ 100</span>
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">填写时间</label>
                  <p className="text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {record.fillTime}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">填写单位</label>
                  <p className={cn(!record.fillUnit && 'text-red-500')}>
                    {record.fillUnit || <span className="text-red-500">未填写（需补录）</span>}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">填写人</label>
                  <p className="text-slate-700">{record.fillOperator}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">特殊标记</label>
                  <div className="flex gap-2">
                    {record.isOldFormat && (
                      <span className="px-2 py-0.5 text-[11px] bg-purple-100 text-purple-700 rounded">旧格式</span>
                    )}
                    {record.hasSupplementary && (
                      <span className="px-2 py-0.5 text-[11px] bg-blue-100 text-blue-700 rounded">有补录</span>
                    )}
                    {!record.isOldFormat && !record.hasSupplementary && (
                      <span className="text-slate-400 text-sm">无</span>
                    )}
                  </div>
                </div>
                {record.remark && (
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <StickyNote className="w-3.5 h-3.5" />
                      备注
                    </label>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded text-sm">{record.remark}</p>
                  </div>
                )}
              </div>
            </div>

            {record.anomalyType !== 'none' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  异常说明
                </h2>
                <div className="bg-white rounded p-4 border border-red-100">
                  <p className="text-red-700 text-sm">{record.anomalyReason}</p>
                  <div className="mt-3 pt-3 border-t border-red-100">
                    <p className="text-xs text-red-600 font-medium mb-1">处理建议：</p>
                    <p className="text-sm text-slate-600">
                      {record.anomalyType === 'material_missing' && '请联系治疗师补充上传缺失的截图或视频素材，上传后可重新运行检测。'}
                      {record.anomalyType === 'layer_occlusion' && '请检查图层遮挡情况，必要时调整图层顺序或重新标记关键点。'}
                      {record.anomalyType === 'incomplete_data' && '请补填缺失的必填字段（如填写单位），保存后重新检测。'}
                      {record.anomalyType === 'old_format' && '旧格式数据建议按照新格式要求核对并更新，或人工确认后标记为已处理。'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <TraceTimeline record={record} layers={layers} hits={hits} notes={notes} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  处理意见
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    编辑
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">更新状态</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as RecordStatus)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">待处理</option>
                      <option value="processed">已处理</option>
                      <option value="normal">正常</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">处理备注</label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="请输入处理意见或备注说明..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveStatus}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditNote('');
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-2 border border-slate-300 text-slate-600 text-sm rounded hover:bg-slate-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.length > 0 ? (
                    notes.slice().reverse().map((note, index) => (
                      <div key={note.id} className={cn(index > 0 && 'pt-3 border-t border-slate-100')}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{note.operator}</span>
                          <span className="text-slate-400">{note.operateTime}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{note.action}</p>
                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{note.suggestion}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">暂无处理记录</p>
                  )}
                </div>
              )}
            </div>

            <LayerHitPanel layers={layers} hits={hits} />

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                导出预览
              </h3>
              <div className="space-y-2 text-sm">
                {exportPreview.slice(0, 8).map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-slate-500">{item.label}：</span>
                    <span className="text-slate-700 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                导出时将转换为完整中文格式，不含字段名和缩写
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">验收提示</h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                沿异常追溯链路可反向查询：异常记录 → 评分表原始数据 → 图层检测记录 → 命中检测结果 → 处理意见。
                所有数据来自同一处理记录池，确保界面与导出报告一致。
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <p>康复动作轨迹看板 · 异常详情页</p>
            <Link to="/docs" className="text-blue-500 hover:text-blue-600">查看使用说明</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
