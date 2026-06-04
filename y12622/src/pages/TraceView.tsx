import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Microscope,
  Image,
  MousePointer,
  FileText,
  CheckCircle,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { TraceTimeline } from '../components/trace/TraceTimeline';
import { SeverityBadge, ColorBadge, EquipmentStatusBadge } from '../components/common/StatusBadge';

export default function TraceView() {
  const { anomalyId } = useParams<{ anomalyId: string }>();
  const navigate = useNavigate();
  const getTraceChain = useAppStore((state) => state.getTraceChain);

  const traceChain = useMemo(() => {
    if (!anomalyId) return null;
    return getTraceChain(anomalyId);
  }, [anomalyId, getTraceChain]);

  if (!traceChain) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500 text-lg">追溯链路不存在</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }

  const { anomaly, processing, sourceImage, equipment, opinion, conclusion } = traceChain;

  const traceNodes = [
    {
      id: 'equipment',
      type: 'equipment' as const,
      title: '设备信息',
      icon: Microscope,
      data: equipment,
      time: equipment.created_at,
    },
    {
      id: 'sourceImage',
      type: 'sourceImage' as const,
      title: '底图导入',
      icon: Image,
      data: sourceImage,
      time: sourceImage.import_time,
    },
    {
      id: 'processing',
      type: 'processing' as const,
      title: '图像处理',
      icon: MousePointer,
      data: processing,
      time: processing.start_time,
    },
    {
      id: 'anomaly',
      type: 'anomaly' as const,
      title: '异常标注',
      icon: AlertTriangle,
      data: anomaly,
      time: anomaly.created_at,
      active: true,
    },
    {
      id: 'opinion',
      type: 'opinion' as const,
      title: '处理意见',
      icon: ClipboardList,
      data: opinion,
      time: opinion?.created_at,
    },
    {
      id: 'conclusion',
      type: 'conclusion' as const,
      title: '复核结论',
      icon: CheckCircle,
      data: conclusion,
      time: conclusion?.reviewed_at,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/charts')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">全链路追溯</h2>
          <p className="text-sm text-gray-500">
            从异常记录反向追溯：异常 → 处理 → 底图 → 设备 → 意见 → 结论
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span>验收路径</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-blue-600 font-medium">异常</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-400">设备清单</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-400">处理意见</span>
        </div>

        <TraceTimeline nodes={traceNodes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-red-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900 font-serif">
                异常详情
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">位置坐标</p>
                <p className="font-mono text-gray-900">
                  ({anomaly.position_x.toFixed(1)}, {anomaly.position_y.toFixed(1)})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">严重程度</p>
                <SeverityBadge severity={anomaly.severity} />
              </div>
              <div>
                <p className="text-sm text-gray-500">标记颜色</p>
                <ColorBadge color={anomaly.color_code} />
              </div>
              <div>
                <p className="text-sm text-gray-500">标注时间</p>
                <p className="text-gray-900">
                  {new Date(anomaly.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">异常原因（通俗描述）</p>
              <p className="text-gray-900 bg-amber-50 p-3 rounded-lg border border-amber-100">
                {anomaly.human_reason}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">技术原因代码</p>
              <p className="font-mono text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded">
                {anomaly.technical_reason}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center gap-2">
              <Microscope className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 font-serif">
                关联设备
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">设备名称</p>
                <p className="font-medium text-gray-900">{equipment.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">状态</p>
                <EquipmentStatusBadge status={equipment.status} />
              </div>
              <div>
                <p className="text-sm text-gray-500">型号</p>
                <p className="text-gray-900">{equipment.model}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">序列号</p>
                <p className="font-mono text-sm text-gray-900">{equipment.sn}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">安装位置</p>
              <p className="text-gray-900">{equipment.location}</p>
            </div>
            <button
              onClick={() => navigate(`/equipment/${equipment.id}`)}
              className="w-full mt-2 px-4 py-2 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              查看设备详情
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-purple-50">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 font-serif">
                底图信息
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              {sourceImage.file_data ? (
                <img
                  src={sourceImage.file_data}
                  alt={sourceImage.file_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">文件名</p>
                <p className="text-gray-900 text-sm truncate">{sourceImage.file_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">文件大小</p>
                <p className="text-gray-900">{(sourceImage.file_size / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">坐标</p>
                <p className="font-mono text-sm text-gray-900">{sourceImage.coordinates}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">批次号</p>
                <p className="text-gray-900">{sourceImage.batch_no}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">图像哈希（去重标识）</p>
              <p className="font-mono text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded break-all">
                {sourceImage.image_hash}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-green-50">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 font-serif">
                处理意见与复核
              </h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">处理意见</p>
              {opinion?.processing_opinion ? (
                <p className="text-gray-900 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  {opinion.processing_opinion}
                </p>
              ) : (
                <p className="text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                  暂无处理意见
                </p>
              )}
            </div>

            {conclusion && (
              <>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">复核结论</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        conclusion.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : conclusion.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {conclusion.status === 'approved'
                        ? '通过'
                        : conclusion.status === 'rejected'
                        ? '驳回'
                        : '待补充'}
                    </span>
                  </div>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {conclusion.conclusion_text}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">复核人</p>
                    <p className="text-gray-900">{conclusion.reviewed_by}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">复核时间</p>
                    <p className="text-gray-900 text-sm">
                      {new Date(conclusion.reviewed_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </>
            )}

            {!conclusion && (
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/annotate/${processing.id}`)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  前往提交复核
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
