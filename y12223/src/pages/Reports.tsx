import { useState } from 'react';
import { FileText, Download, Calendar, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { filmProjects } from '../data/mockData';

export default function Reports() {
  const { reports, bills } = useStore();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const getProjectName = (projectId: string) => {
    return filmProjects.find((p) => p.id === projectId)?.name || '未知项目';
  };

  const getBillCountForProject = (projectId: string) => {
    return bills.filter((b) => b.projectId === projectId).length;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">归集报告</h1>
        <p className="text-slate-500 mt-1">查看和导出费用归集报告</p>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sky-800 mb-1">归集口径说明</h4>
            <p className="text-sm text-sky-700">
              按权责发生制，以发票日期为准进行费用归集。费用科目包括：营销推广、票务合作、广告投放、社交媒体推广、户外广告、场地租赁、口碑营销、短视频推广。
              所有异常记录（科目串片、缺字段、晚补）均已在报告中单独标记，请仔细核对后确认。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reports.map((report, index) => (
          <div
            key={report.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">
                    {getProjectName(report.projectId)} - {report.period}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      生成时间：{report.generatedAt}
                    </span>
                    <span>{getBillCountForProject(report.projectId)} 条账单</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-slate-500">归集总金额</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ¥{report.totalAmount.toLocaleString()}
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-sm">
                  <Download className="w-4 h-4" />
                  导出
                </button>
                {expandedReport === report.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            {expandedReport === report.id && (
              <div className="px-6 pb-6 border-t border-slate-100">
                <div className="pt-6">
                  <h4 className="font-semibold text-slate-700 mb-4">费用明细</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 rounded-l-lg">
                            费用科目
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                            账单数量
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600 rounded-r-lg">
                            金额
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.details.map((detail) => (
                          <tr key={detail.category} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-700">{detail.category}</td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {detail.billCount} 条
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">
                              ¥{detail.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold">
                          <td className="px-4 py-3 text-slate-800">合计</td>
                          <td className="px-4 py-3 text-right text-slate-800">
                            {report.details.reduce((sum, d) => sum + d.billCount, 0)} 条
                          </td>
                          <td className="px-4 py-3 text-right text-slate-800">
                            ¥{report.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">归集口径：</span>
                    {report.collectionCriteria}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
