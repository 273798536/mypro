import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Download, Eye } from 'lucide-react';
import api from '../services/api';

export default function ReportList() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const result: any = await api.reports.list();
      setReports(result.data);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (id: string) => {
    try {
      const blob = await api.reports.export(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FREEZE: '冻结报告',
      SETTLE: '结算报告',
      SUMMARY: '汇总报告'
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报告中心</h1>
          <p className="text-slate-500 mt-1">查看和导出各类汇总报告</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">报告ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">类型</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">批次</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">生成人</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">生成时间</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">加载中...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">暂无报告</td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-slate-600">{report.id.slice(0, 8)}...</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <FileSpreadsheet size={12} />
                      {getTypeLabel(report.type)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{report.batchId}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{report.generatedBy}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(report.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/reports/${report.id}`}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        <Eye size={12} />
                        查看
                      </Link>
                      <button
                        onClick={() => handleExport(report.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                      >
                        <Download size={12} />
                        导出
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
