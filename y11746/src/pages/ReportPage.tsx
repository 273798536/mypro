import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { exportToExcel, exportToCSV, generateDonationReportData, generateExceptionReportData, generateProjectReportData } from '../utils/reportGenerator';
import { collectByProject, calculateVerificationStats } from '../utils/verificationEngine';
import { dataSourceLabels } from '../types';

export const ReportPage: React.FC = () => {
  const donations = useAppStore(state => state.donations);
  const projects = useAppStore(state => state.projects);
  const exceptions = useAppStore(state => state.exceptions);
  const isDataLoaded = useAppStore(state => state.isDataLoaded);
  const [activeTab, setActiveTab] = useState<'summary' | 'donations' | 'projects' | 'exceptions'>('summary');

  const stats = calculateVerificationStats(donations);
  const projectSummaries = collectByProject(donations, projects);

  const handleExportExcel = () => {
    exportToExcel(donations, projects, exceptions);
  };

  const handleExportCSV = (type: string) => {
    if (type === 'donations') {
      exportToCSV(generateDonationReportData(donations), '捐赠明细');
    } else if (type === 'exceptions') {
      exportToCSV(generateExceptionReportData(exceptions), '异常清单');
    } else if (type === 'projects') {
      exportToCSV(generateProjectReportData(projectSummaries), '项目归集');
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">请先导入数据或加载样例数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">报告导出</h2>
          <p className="text-sm text-gray-500 mt-1">生成并下载核销报告</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
          >
            <FileSpreadsheet size={16} />
            导出完整 Excel 报告
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {[
              { key: 'summary', label: '汇总概览' },
              { key: 'donations', label: '捐赠明细' },
              { key: 'projects', label: '项目归集' },
              { key: 'exceptions', label: '异常明细' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'summary' && (
            <div>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="font-medium text-gray-800 mb-4">核销统计</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">总捐赠笔数</span>
                      <span className="font-semibold text-gray-800">{stats.total} 笔</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">正常核销</span>
                      <span className="font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle size={14} />
                        {stats.normal} 笔
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">存在异常</span>
                      <span className="font-semibold text-red-600 flex items-center gap-1">
                        <AlertTriangle size={14} />
                        {stats.exception} 笔
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">待开票</span>
                      <span className="font-semibold text-yellow-600">{stats.pending} 笔</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">已冲销</span>
                      <span className="font-semibold text-gray-500">{stats.reversed} 笔</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 mb-4">金额统计</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">捐赠总额</span>
                      <span className="font-semibold text-gray-800">¥{stats.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">退款总额</span>
                      <span className="font-semibold text-red-600">-¥{stats.refundAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 bg-green-50 -mx-2 px-2 rounded">
                      <span className="text-green-700 font-medium">实际核销金额</span>
                      <span className="font-bold text-green-700">¥{(stats.totalAmount - stats.refundAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">报告说明</p>
                    <p className="text-sm text-blue-600 mt-1">
                      核销报告包含：汇总统计、捐赠明细、项目归集、异常清单四个工作表。
                      异常数据已标记，建议先处理所有异常后再导出最终报告。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'donations' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-800">捐赠明细数据</h3>
                <button
                  onClick={() => handleExportCSV('donations')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Download size={14} />
                  导出 CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">捐赠人</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">金额</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">项目</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">票据号</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">状态</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.slice(0, 10).map(d => (
                      <tr key={d.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-800">{d.donorName}</td>
                        <td className="px-4 py-2 text-gray-700">¥{d.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-gray-600">{d.projectName || d.projectId}</td>
                        <td className="px-4 py-2 text-gray-600 font-mono text-xs">{d.invoiceNumber || '-'}</td>
                        <td className="px-4 py-2">
                          {d.isVerified ? (
                            <span className="text-green-600">已核销</span>
                          ) : (
                            <span className="text-yellow-600">待核销</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{dataSourceLabels[d.source]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {donations.length > 10 && (
                  <p className="text-sm text-gray-400 mt-2 text-center">仅显示前 10 条，共 {donations.length} 条</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-800">项目归集数据</h3>
                <button
                  onClick={() => handleExportCSV('projects')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Download size={14} />
                  导出 CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">项目代码</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">项目名称</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">捐赠笔数</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">总金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummaries.map(s => (
                      <tr key={s.projectId} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-600 font-mono text-xs">{s.projectCode}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium">{s.projectName}</td>
                        <td className="px-4 py-2">
                          {s.isTargeted ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">定向</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">非定向</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{s.donationCount} 笔</td>
                        <td className="px-4 py-2 font-semibold text-gray-800">¥{s.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'exceptions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-800">异常清单</h3>
                <button
                  onClick={() => handleExportCSV('exceptions')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Download size={14} />
                  导出 CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">异常类型</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">描述</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">来源</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">行号</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map(e => (
                      <tr key={e.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-red-600">{e.type}</td>
                        <td className="px-4 py-2 text-gray-700">{e.description}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{dataSourceLabels[e.source]}</td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-xs">{e.sourceLine}</td>
                        <td className="px-4 py-2">
                          {e.resolved ? (
                            <span className="text-green-600">已解决</span>
                          ) : (
                            <span className="text-red-600">待处理</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
