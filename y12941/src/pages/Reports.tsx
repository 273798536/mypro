import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  FileType,
  File,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  User
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { reportApi } from '../utils/api';
import type { ReportFormat } from '../../shared/types';

export const Reports: React.FC = () => {
  const {
    dashboardStats,
    fetchDashboard,
    batches,
    fetchBatches,
    promptVersions,
    fetchPromptVersions,
    loading
  } = useStore();

  const [format, setFormat] = useState<ReportFormat>('excel');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeRawData, setIncludeRawData] = useState(true);
  const [includeVersions, setIncludeVersions] = useState(true);
  const [generatedBy, setGeneratedBy] = useState('张工程师');
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [reportInfo, setReportInfo] = useState<any>(null);

  useEffect(() => {
    fetchDashboard();
    fetchBatches();
    fetchPromptVersions();
  }, [fetchDashboard, fetchBatches, fetchPromptVersions]);

  const handleGenerate = async () => {
    setGenerating(true);
    setDownloadUrl('');
    setReportInfo(null);

    try {
      const result = await reportApi.generate({
        format,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeRawData,
        includeVersions,
        generatedBy
      });

      setReportInfo(result);
      setDownloadUrl(reportApi.download(result.reportId));
    } catch (error) {
      console.error('Generate report failed:', error);
      alert('生成报告失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const formatOptions: { value: ReportFormat; label: string; icon: any; color: string }[] = [
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'pdf', label: 'PDF', icon: FileType, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'word', label: 'Word', icon: File, color: 'text-blue-600 bg-blue-50 border-blue-200' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">报告导出</h1>
        <p className="text-gray-500 mt-1">生成意图漂移检测报告，支持多种格式导出</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              导出配置
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  导出格式
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {formatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormat(opt.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        format === opt.value
                          ? `${opt.color} border-current`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <opt.icon className={`w-8 h-8 mx-auto mb-2 ${format === opt.value ? '' : 'text-gray-400'}`} />
                      <p className={`text-sm font-medium ${format === opt.value ? '' : 'text-gray-600'}`}>
                        {opt.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    开始日期
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    结束日期
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  导出人
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={generatedBy}
                  onChange={(e) => setGeneratedBy(e.target.value)}
                  placeholder="请输入导出人姓名"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRawData}
                    onChange={(e) => setIncludeRawData(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">包含原始数据</p>
                    <p className="text-xs text-gray-500">导出完整的会话原始数据和处理细节</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVersions}
                    onChange={(e) => setIncludeVersions(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">包含版本历史</p>
                    <p className="text-xs text-gray-500">导出每条数据的完整版本变更记录</p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">报告内容说明</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 数据概览统计（总数、漂移率、风险分布）</li>
                  <li>• 意图漂移详细列表（含人工修正记录）</li>
                  <li>• 截断原因的自然语言解释</li>
                  <li>• 工具调用错误的精确定位（文件+行号）</li>
                  <li>• 版本变更历史追踪</li>
                  <li>• 关联的提示词版本和训练样本信息</li>
                </ul>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || loading.dashboard}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在生成报告...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    生成报告
                  </>
                )}
              </button>
            </div>
          </div>

          {reportInfo && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">报告生成成功</h3>
                  <p className="text-sm text-green-700 mt-1">
                    报告 ID: <span className="font-mono">{reportInfo.reportId}</span>
                  </p>
                  <p className="text-sm text-green-700">
                    生成时间: {new Date(reportInfo.generatedAt).toLocaleString('zh-CN')}
                  </p>
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Download className="w-4 h-4" />
                      下载报告
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">当前数据概览</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">总对话数</span>
                <span className="font-bold text-gray-900">{dashboardStats?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">已复核</span>
                <span className="font-bold text-green-600">{dashboardStats?.reviewed || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">待复核</span>
                <span className="font-bold text-amber-600">{dashboardStats?.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">漂移率</span>
                <span className={`font-bold ${(dashboardStats?.driftRate || 0) > 10 ? 'text-red-600' : 'text-green-600'}`}>
                  {dashboardStats?.driftRate || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">材料批次</h3>
            <div className="space-y-3">
              {batches.slice(0, 5).map((batch) => (
                <div key={batch.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{batch.batchName}</span>
                    <span className="text-xs text-gray-500">{new Date(batch.importedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {batch.itemCount} 条 · {batch.importedBy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">提示词版本</h3>
            <div className="space-y-3">
              {promptVersions.map((pv) => (
                <div
                  key={pv.id}
                  className={`p-3 rounded-lg border ${
                    pv.isActive
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{pv.version}</span>
                    {pv.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        激活中
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(pv.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              注意事项
            </h4>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• 报告中截断原因已转换为通俗语言</li>
              <li>• 错误定位精确到文件行号，便于排查</li>
              <li>• 版本历史包含完整的操作人记录</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
