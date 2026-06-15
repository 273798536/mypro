import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Check,
  MessageSquare,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Layers,
  Send,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import StatusTag from '@/components/StatusTag/StatusTag';
import VersionCompare from '@/components/VersionCompare/VersionCompare';
import { useMaterialStore } from '@/store/useMaterialStore';
import { sourceLabels, actionLabels } from '@/data/mockData';
import { formatCurrency, formatDuration } from '@/utils/dateFormat';
import { generateCSV, downloadCSV } from '@/utils/csvExport';
import { cn } from '@/lib/utils';
import type { MaterialStatus } from '@/types';

export default function MaterialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [annotationText, setAnnotationText] = useState('');
  const [overrideOld, setOverrideOld] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [oldJudgment, setOldJudgment] = useState('');

  const material = useMaterialStore((state) => state.getMaterialById(id || ''));
  const lessons = useMaterialStore((state) => state.getLessonsByMaterialId(id || ''));
  const versions = useMaterialStore((state) => state.getVersionsByMaterialId(id || ''));
  const annotations = useMaterialStore((state) => state.getAnnotationsByMaterialId(id || ''));
  const logs = useMaterialStore((state) => state.getLogsByMaterialId(id || ''));
  const addAnnotation = useMaterialStore((state) => state.addAnnotation);
  const updateMaterialStatus = useMaterialStore((state) => state.updateMaterialStatus);
  const filters = useMaterialStore((state) => state.filters);

  if (!material) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">未找到该材料</p>
        <button
          onClick={() => navigate('/')}
          className="text-[#0F2B4D] hover:underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  const handleExport = () => {
    const csvContent = generateCSV({
      materials: [material],
      lessons,
      filters,
      exportTime: new Date().toLocaleString('zh-CN'),
    });

    const filename = `分账明细_${material.name}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  const handleAddAnnotation = () => {
    if (!annotationText.trim()) return;

    addAnnotation(
      material.id,
      annotationText,
      '演出统筹-阿蓝',
      overrideOld,
      overrideOld ? oldJudgment || '系统原判断' : undefined
    );

    setAnnotationText('');
    setOverrideOld(false);
    setOldJudgment('');
  };

  const handleConfirm = () => {
    updateMaterialStatus(material.id, 'confirmed');
  };

  const statusOptions: MaterialStatus[] = [
    'pending',
    'processing',
    'confirmed',
    'mismatch',
    'annotated',
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0F2B4D] mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-serif font-bold text-[#0F2B4D]">
                {material.name}
              </h1>
              <StatusTag status={material.status} />
            </div>
            <p className="text-sm text-gray-500">
              {material.type} · {sourceLabels[material.source]} · {material.currentVersion}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出明细
            </button>
            {material.status !== 'confirmed' && (
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#D4A853] text-white rounded-lg hover:bg-[#D4A853]/90 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
                确认分账
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Material Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-serif font-semibold text-[#0F2B4D] text-lg mb-4 pb-2 border-b border-gray-100">
              基本信息
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem icon={User} label="授课老师" value={material.teacher} />
              <InfoItem
                icon={FileText}
                label="学生数量"
                value={`${material.student.split('/').length} 位`}
              />
              <InfoItem
                icon={Clock}
                label="课时总数"
                value={`${material.lessonCount} 节`}
              />
              <InfoItem icon={Calendar} label="上传日期" value={material.uploadDate} />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">涉及学生</p>
              <p className="text-gray-700">{material.student}</p>
            </div>

            {material.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">备注说明</p>
                <p className="text-gray-700">{material.description}</p>
              </div>
            )}

            {/* Status badges */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {material.hasNameMismatch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-lg border border-purple-200">
                  <AlertTriangle className="w-4 h-4" />
                  名称不一致
                </span>
              )}
              {material.hasManualAnnotation && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
                  <MessageSquare className="w-4 h-4" />
                  有人工批注
                </span>
              )}
              {versions.length > 1 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
                  <Layers className="w-4 h-4" />
                  多版本 ({versions.length}个)
                </span>
              )}
            </div>
          </div>

          {/* Lesson Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-serif font-semibold text-[#0F2B4D] text-lg mb-4 pb-2 border-b border-gray-100">
              分账明细
              <span className="text-sm font-normal text-gray-500 ml-2">
                共 {lessons.length} 条记录
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">学生</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">老师</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">日期</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">时长</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">费用</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">学习进度</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500">标记</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson, index) => (
                    <tr
                      key={lesson.id}
                      className={cn(
                        'border-b border-gray-50 transition-colors hover:bg-gray-50',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                        lesson.nameMismatch && 'bg-purple-50/50 hover:bg-purple-50'
                      )}
                    >
                      <td className="py-3 px-3">
                        <span className="font-medium text-gray-800">
                          {lesson.studentName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{lesson.teacherName}</td>
                      <td className="py-3 px-3 text-gray-600">{lesson.lessonDate}</td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        {formatDuration(lesson.duration)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#0F2B4D]">
                        {formatCurrency(lesson.amount)}
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs">
                        <p className="line-clamp-2">{lesson.progress}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {lesson.nameMismatch && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-purple-500"
                            title={lesson.mismatchNote}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="py-3 px-3 text-right font-medium text-gray-600">
                      合计
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#D4A853] text-base">
                      {formatCurrency(lessons.reduce((sum, l) => sum + l.amount, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mismatch notes */}
            {lessons.some((l) => l.nameMismatch) && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-800 mb-1">名称不一致说明</p>
                    {lessons
                      .filter((l) => l.nameMismatch)
                      .map((l) => (
                        <p key={l.id} className="text-sm text-purple-700">
                          • {l.studentName} ({l.lessonDate}): {l.mismatchNote}
                        </p>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Version Compare */}
          {versions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-serif font-semibold text-[#0F2B4D] text-lg mb-4 pb-2 border-b border-gray-100">
                版本管理
              </h2>
              <VersionCompare versions={versions} />
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-[#0F2B4D] to-[#1a3a5c] rounded-xl p-6 text-white">
            <p className="text-white/60 text-sm mb-1">分账总金额</p>
            <p className="text-3xl font-serif font-bold mb-4">
              {formatCurrency(material.totalAmount)}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">课时数</span>
              <span className="font-medium">{material.lessonCount} 节</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-white/60">当前版本</span>
              <span className="font-medium">{material.currentVersion}</span>
            </div>
          </div>

          {/* Status Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-serif font-semibold text-[#0F2B4D] mb-3">状态管理</h3>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => updateMaterialStatus(material.id, status)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    material.status === status
                      ? 'bg-[#0F2B4D] text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  )}
                >
                  <StatusTag status={status} size="sm" />
                  {material.status === status && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Annotations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-serif font-semibold text-[#0F2B4D] mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              人工批注
            </h3>

            {/* Add annotation */}
            <div className="mb-4">
              <textarea
                value={annotationText}
                onChange={(e) => setAnnotationText(e.target.value)}
                placeholder="添加批注内容..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853] resize-none"
                rows={3}
              />

              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideOld}
                    onChange={(e) => setOverrideOld(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#D4A853] focus:ring-[#D4A853]"
                  />
                  覆盖旧判断
                </label>

                {overrideOld && (
                  <input
                    type="text"
                    value={oldJudgment}
                    onChange={(e) => setOldJudgment(e.target.value)}
                    placeholder="旧判断内容（可选）"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]"
                  />
                )}
              </div>

              <button
                onClick={handleAddAnnotation}
                disabled={!annotationText.trim()}
                className={cn(
                  'mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors',
                  annotationText.trim()
                    ? 'bg-[#D4A853] text-white hover:bg-[#D4A853]/90'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
                添加批注
              </button>
            </div>

            {/* Annotation list */}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {annotations.length > 0 ? (
                annotations.map((ann) => (
                  <div
                    key={ann.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      ann.overridesOld
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    {ann.overridesOld && (
                      <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded mb-2">
                        覆盖旧判断
                      </span>
                    )}
                    <p className="text-sm text-gray-700 mb-2">{ann.content}</p>
                    {ann.oldJudgment && (
                      <p className="text-xs text-gray-500 mb-2 line-through">
                        原判断: {ann.oldJudgment}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{ann.operator}</span>
                      <span>{ann.createdAt}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">暂无批注</p>
              )}
            </div>
          </div>

          {/* Operation Logs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between font-serif font-semibold text-[#0F2B4D]"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                操作记录
              </span>
              {showLogs ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showLogs && (
              <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
                      <div className="w-px flex-1 bg-gray-200" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          {actionLabels[log.action]}
                        </span>
                        <span className="text-xs text-gray-400">{log.operator}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                      {log.beforeChange && log.afterChange && (
                        <p className="text-xs text-gray-400 mt-1">
                          {log.beforeChange} → {log.afterChange}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}
