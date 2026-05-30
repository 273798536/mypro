import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  generateFullReport,
  exportReportPDF,
  copyReportToClipboard,
  type FullReport,
} from '@/utils/reportGenerator';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  FileText,
  Download,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Camera,
  BarChart3,
  Share2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';

export default function ReportPreview() {
  const navigate = useNavigate();
  const { cameras, conflicts, venueObjects, detectAllConflicts, isDetectingConflicts } = useAppStore();

  const [report, setReport] = useState<FullReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2]));

  useEffect(() => {
    if (conflicts.length === 0) {
      detectAllConflicts();
    }
  }, [conflicts.length, detectAllConflicts]);

  useEffect(() => {
    if (conflicts.length > 0) {
      const generated = generateFullReport(conflicts, cameras, venueObjects);
      setReport(generated);
    }
  }, [conflicts, cameras, venueObjects]);

  const handleRefresh = async () => {
    await detectAllConflicts();
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await copyReportToClipboard(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportReportPDF(report);
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setExporting(false);
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">正在生成报告...</p>
        </div>
      </div>
    );
  }

  const pendingCount = report.summary.pendingConflicts;
  const criticalCount = report.summary.criticalConflicts;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workspace')}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <FileText className="w-6 h-6 text-blue-400" />
                <h1 className="text-xl font-bold text-white">冲突检测报告</h1>
              </div>
              <p className="text-sm text-gray-400">
                生成时间：{new Date(report.generatedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isDetectingConflicts}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isDetectingConflicts ? 'animate-spin' : ''}`} />
              重新检测
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制文本
                </>
              )}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? '导出中...' : '导出PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {pendingCount > 0 ? (
            <div className="mb-6 bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-800/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2">
                    ⚠️ 机位预排暂未通过
                  </h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    目前还有 <span className="text-red-400 font-bold">{pendingCount}</span> 个冲突待处理，
                    其中 <span className="text-red-400 font-bold">{criticalCount}</span> 个是严重问题。
                    这些问题如果不解决，转播时可能会出现：
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-red-400 font-medium mb-1">画面穿帮</div>
                      <p className="text-xs text-gray-400">镜头拍到不该拍的区域，影响观众体验</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-orange-400 font-medium mb-1">设备碰撞</div>
                      <p className="text-xs text-gray-400">机位太近导致摄像机或三脚架互相干扰</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="text-yellow-400 font-medium mb-1">视线遮挡</div>
                      <p className="text-xs text-gray-400">画面被立柱或墙壁挡住，看不到比赛</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800/50 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    🎉 机位预排已通过！
                  </h2>
                  <p className="text-gray-300">
                    所有 {report.summary.totalConflicts} 个冲突都已处理完毕，可以进入彩排阶段。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">概览统计</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-1">
                  {report.summary.totalCameras}
                </div>
                <div className="text-xs text-gray-400">机位总数</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-400 mb-1">
                  {report.summary.criticalConflicts}
                </div>
                <div className="text-xs text-gray-400">严重问题</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">
                  {report.summary.warningConflicts}
                </div>
                <div className="text-xs text-gray-400">中等问题</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">
                  {report.summary.resolvedConflicts}
                </div>
                <div className="text-xs text-gray-400">已解决</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {report.sections.map((section, sectionIndex) => (
              <div
                key={sectionIndex}
                className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(sectionIndex)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gray-800/80 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.has(sectionIndex) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                      {section.items.length} 项
                    </span>
                  </div>
                </button>

                {expandedSections.has(sectionIndex) && (
                  <div className="px-6 py-4">
                    <p className="text-gray-300 mb-4">{section.content}</p>
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="flex items-start gap-3 bg-gray-900/30 rounded-lg p-3"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 font-mono">
                            {itemIndex + 1}
                          </span>
                          <p className="text-sm text-gray-300 leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pendingCount > 0 && (
            <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                下一步行动建议
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-white font-medium mb-2">1. 召开协调会议</div>
                  <p className="text-sm text-gray-400">
                    组织导播、摄像、技术负责人开会，逐项讨论冲突解决方案
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-white font-medium mb-2">2. 调整机位参数</div>
                  <p className="text-sm text-gray-400">
                    根据整改建议调整机位位置、角度或镜头参数
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-white font-medium mb-2">3. 重新运行检测</div>
                  <p className="text-sm text-gray-400">
                    每次调整后点击"重新检测"，确保所有冲突都已解决
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-white font-medium mb-2">4. 现场验证</div>
                  <p className="text-sm text-gray-400">
                    条件允许时到场馆现场验证机位布局是否可行
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-gray-900/50 border-l border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">机位状态速览</h3>
            <div className="space-y-2">
              {cameras.map(cam => {
                const camConflicts = conflicts.filter(
                  c => (c.cameraAId === cam.id || c.cameraBId === cam.id) && c.status === 'pending'
                );
                const hasCritical = camConflicts.some(c => c.severity === 'critical');
                const hasWarning = camConflicts.some(c => c.severity === 'warning');

                return (
                  <div
                    key={cam.id}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${
                        hasCritical ? 'text-red-400' : hasWarning ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {cam.number}
                      </span>
                      <span className="text-sm text-gray-300">{cam.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {camConflicts.length > 0 ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          hasCritical ? 'bg-red-600/20 text-red-400' : 'bg-orange-600/20 text-orange-400'
                        }`}>
                          {camConflicts.length}个问题
                        </span>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">报告信息</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">生成时间</span>
                <span className="text-gray-300">
                  {new Date(report.generatedAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">机位数量</span>
                <span className="text-gray-300">{report.summary.totalCameras} 台</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">冲突总数</span>
                <span className="text-gray-300">{report.summary.totalConflicts} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">待处理</span>
                <span className="text-yellow-400">{report.summary.pendingConflicts} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">已解决</span>
                <span className="text-green-400">{report.summary.resolvedConflicts} 个</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">图例说明</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-gray-300">严重 - 必须处理</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span className="text-gray-300">中等 - 建议处理</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                <span className="text-gray-300">轻微 - 可选处理</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-gray-300">已解决</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500" />
                <span className="text-gray-300">已接受风险</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
