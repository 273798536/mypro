import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  Edit,
  Search,
  AlertCircle,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ImageViewer } from '../components/image/ImageViewer';
import { DataTable } from '../components/common/DataTable';
import { SeverityBadge, ColorBadge } from '../components/common/StatusBadge';
import type { Anomaly, Processing, SourceImage, Equipment } from '../types';
import { REASON_TRANSLATIONS } from '../types';

export default function ImageAnnotate() {
  const { processingId } = useParams<{ processingId: string }>();
  const navigate = useNavigate();

  const processing = useAppStore((state) =>
    processingId ? state.getProcessingById(processingId) : undefined
  );
  const sourceImage = useAppStore((state) =>
    processing ? state.getSourceImageById(processing.source_image_id) : undefined
  );
  const equipment = useAppStore((state) =>
    sourceImage ? state.getEquipmentById(sourceImage.equipment_id) : undefined
  );
  const anomalies = useAppStore((state) =>
    processingId ? state.getAnomaliesByProcessing(processingId) : []
  );
  const conclusions = useAppStore((state) => state.conclusions);

  const updateProcessing = useAppStore((state) => state.updateProcessing);
  const addAnomaly = useAppStore((state) => state.addAnomaly);
  const updateAnomaly = useAppStore((state) => state.updateAnomaly);
  const deleteAnomaly = useAppStore((state) => state.deleteAnomaly);
  const saveConclusion = useAppStore((state) => state.saveConclusion);
  const currentUser = useAppStore((state) => state.currentUser);

  const [viewMode, setViewMode] = useState<'browse' | 'annotate'>('browse');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [showAnomalyForm, setShowAnomalyForm] = useState(false);
  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | null>(null);
  const [showConclusionModal, setShowConclusionModal] = useState(false);
  const [conclusionText, setConclusionText] = useState('');
  const [conclusionStatus, setConclusionStatus] = useState<'approved' | 'rejected' | 'pending'>('approved');
  const [processingOpinion, setProcessingOpinion] = useState('');

  const [anomalyForm, setAnomalyForm] = useState({
    position_x: 0,
    position_y: 0,
    severity: 'medium' as Anomaly['severity'],
    color_code: '#ff0000',
    technical_reason: '',
    human_reason: '',
  });

  const existingConclusion = useMemo(() => {
    if (!processingId) return null;
    return conclusions.find((c) => c.processing_id === processingId);
  }, [conclusions, processingId]);

  useEffect(() => {
    if (processing && viewMode === 'browse') {
      setAnomalyForm((prev) => ({
        ...prev,
        position_x: processing.pan_offset.x,
        position_y: processing.pan_offset.y,
      }));
    }
  }, [processing, viewMode]);

  const handleImageClick = useCallback(
    (x: number, y: number) => {
      if (viewMode !== 'annotate') return;
      setAnomalyForm({
        ...anomalyForm,
        position_x: x,
        position_y: y,
      });
      setEditingAnomaly(null);
      setShowAnomalyForm(true);
    },
    [viewMode, anomalyForm]
  );

  const handleViewChange = useCallback(
    (mode: 'browse' | 'annotate') => {
      setViewMode(mode);
      if (processing && processingId) {
        updateProcessing(processingId, { ...processing, mode });
      }
    },
    [processing, processingId, updateProcessing]
  );

  const handleTransformChange = useCallback(
    (zoom: number, panX: number, panY: number) => {
      if (processing && processingId) {
        updateProcessing(processingId, {
          ...processing,
          zoom_level: zoom,
          pan_offset: { x: panX, y: panY },
          last_modified_at: new Date().toISOString(),
        });
      }
    },
    [processing, processingId, updateProcessing]
  );

  const handleAddAnomaly = () => {
    if (!processingId) return;

    const technical_reason = anomalyForm.technical_reason || 'COLOR_CHANNEL_OUTLIER_R';
    const human_reason =
      anomalyForm.human_reason ||
      REASON_TRANSLATIONS[technical_reason] ||
      '颜色通道数值异常';

    if (editingAnomaly) {
      updateAnomaly(editingAnomaly.id, {
        ...anomalyForm,
        technical_reason,
        human_reason,
      });
    } else {
      addAnomaly({
        ...anomalyForm,
        processing_id: processingId,
        technical_reason,
        human_reason,
      });
    }

    setShowAnomalyForm(false);
    setEditingAnomaly(null);
  };

  const handleSelectAnomaly = (anomaly: Anomaly) => {
    setSelectedAnomalyId(anomaly.id);
    setEditingAnomaly(anomaly);
    setAnomalyForm({
      position_x: anomaly.position_x,
      position_y: anomaly.position_y,
      severity: anomaly.severity,
      color_code: anomaly.color_code,
      technical_reason: anomaly.technical_reason,
      human_reason: anomaly.human_reason,
    });
    setShowAnomalyForm(true);
  };

  const handleDeleteAnomaly = (id: string) => {
    if (confirm('确定删除此异常标注？')) {
      deleteAnomaly(id);
      if (selectedAnomalyId === id) {
        setSelectedAnomalyId(null);
      }
    }
  };

  const handleSaveConclusion = () => {
    if (!processingId) return;

    saveConclusion({
      processing_id: processingId,
      status: conclusionStatus,
      conclusion_text: conclusionText,
      processing_opinion: processingOpinion,
      reviewed_by: currentUser,
    });

    setShowConclusionModal(false);
    alert('复核意见已保存');
  };

  const traceAnomaly = (anomalyId: string) => {
    navigate(`/trace/${anomalyId}`);
  };

  if (!processing || !sourceImage || !equipment) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">处理记录不存在</p>
      </div>
    );
  }

  const columns = [
    {
      key: 'position',
      header: '位置',
      render: (row: Anomaly) =>
        `(${row.position_x.toFixed(1)}, ${row.position_y.toFixed(1)})`,
    },
    {
      key: 'severity',
      header: '严重程度',
      render: (row: Anomaly) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'color',
      header: '颜色',
      render: (row: Anomaly) => <ColorBadge color={row.color_code} />,
    },
    {
      key: 'reason',
      header: '异常原因',
      render: (row: Anomaly) => (
        <span className="text-sm text-gray-600">{row.human_reason}</span>
      ),
    },
    {
      key: 'time',
      header: '标注时间',
      render: (row: Anomaly) =>
        new Date(row.created_at).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
    },
    {
      key: 'action',
      header: '操作',
      render: (row: Anomaly) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              traceAnomaly(row.id);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="追溯"
          >
            🔗
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAnomaly(row);
            }}
            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
            title="编辑"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAnomaly(row.id);
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(`/equipment/${equipment.id}`)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">
            图像标注 - {equipment.name}
          </h2>
          <p className="text-sm text-gray-500">
            坐标: {sourceImage.coordinates} | 批次: {sourceImage.batch_no}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('browse')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'browse'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              浏览
            </button>
            <button
              onClick={() => handleViewChange('annotate')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'annotate'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit className="w-4 h-4" />
              标注
            </button>
          </div>

          {viewMode === 'annotate' && (
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              点击图像添加标注
            </div>
          )}

          <button
            onClick={() => setShowConclusionModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              existingConclusion
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {existingConclusion ? (
              <>
                <CheckCircle className="w-4 h-4" />
                已复核
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                提交复核
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ImageViewer
            src={sourceImage.file_data}
            alt={sourceImage.file_name}
            anomalies={anomalies}
            selectedAnomalyId={selectedAnomalyId}
            mode={viewMode}
            initialZoom={processing.zoom_level}
            initialPanX={processing.pan_offset.x}
            initialPanY={processing.pan_offset.y}
            onImageClick={handleImageClick}
            onAnomalyClick={(anomaly) => setSelectedAnomalyId(anomaly.id)}
            onTransformChange={handleTransformChange}
          />
        </div>

        <div className="w-96 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 font-serif flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              异常标注列表
            </h3>
            <p className="text-sm text-gray-500 mt-1">共 {anomalies.length} 条标注</p>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {anomalies.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>暂无异常标注</p>
                {viewMode === 'annotate' && (
                  <p className="text-sm mt-1">在图像上点击添加标注</p>
                )}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={anomalies}
                onRowClick={handleSelectAnomaly}
                compact
              />
            )}
          </div>
        </div>
      </div>

      {showAnomalyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-serif">
              {editingAnomaly ? '编辑异常标注' : '添加异常标注'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X 坐标
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={anomalyForm.position_x}
                    onChange={(e) =>
                      setAnomalyForm({
                        ...anomalyForm,
                        position_x: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y 坐标
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={anomalyForm.position_y}
                    onChange={(e) =>
                      setAnomalyForm({
                        ...anomalyForm,
                        position_y: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  严重程度
                </label>
                <select
                  value={anomalyForm.severity}
                  onChange={(e) =>
                    setAnomalyForm({
                      ...anomalyForm,
                      severity: e.target.value as Anomaly['severity'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">轻微</option>
                  <option value="medium">中等</option>
                  <option value="high">严重</option>
                  <option value="critical">危急</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标记颜色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={anomalyForm.color_code}
                    onChange={(e) =>
                      setAnomalyForm({ ...anomalyForm, color_code: e.target.value })
                    }
                    className="w-12 h-10 border border-gray-200 rounded cursor-pointer"
                  />
                  <span className="font-mono text-sm text-gray-600">
                    {anomalyForm.color_code}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  异常原因（技术类型）
                </label>
                <select
                  value={anomalyForm.technical_reason}
                  onChange={(e) =>
                    setAnomalyForm({
                      ...anomalyForm,
                      technical_reason: e.target.value,
                      human_reason:
                        REASON_TRANSLATIONS[e.target.value] || anomalyForm.human_reason,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(REASON_TRANSLATIONS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  异常原因（通俗描述）
                </label>
                <textarea
                  value={anomalyForm.human_reason}
                  onChange={(e) =>
                    setAnomalyForm({ ...anomalyForm, human_reason: e.target.value })
                  }
                  rows={2}
                  placeholder="用易懂的语言描述异常情况..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAnomalyForm(false);
                  setEditingAnomaly(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              {editingAnomaly && (
                <button
                  onClick={() => {
                    handleDeleteAnomaly(editingAnomaly.id);
                    setShowAnomalyForm(false);
                    setEditingAnomaly(null);
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              <button
                onClick={handleAddAnomaly}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {editingAnomaly ? '保存修改' : '添加标注'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConclusionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-serif">
              提交复核结论
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  复核结论
                </label>
                <select
                  value={conclusionStatus}
                  onChange={(e) =>
                    setConclusionStatus(e.target.value as any)
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="approved">通过</option>
                  <option value="pending">待补充</option>
                  <option value="rejected">驳回</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  处理意见（给评审老师看）
                </label>
                <textarea
                  value={processingOpinion}
                  onChange={(e) => setProcessingOpinion(e.target.value)}
                  rows={3}
                  placeholder="针对异常的处理建议，如：建议重新校准设备、此区域数据需重点关注等..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  复核说明
                </label>
                <textarea
                  value={conclusionText}
                  onChange={(e) => setConclusionText(e.target.value)}
                  rows={3}
                  placeholder="详细说明复核过程和依据..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConclusionModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveConclusion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                保存结论
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
