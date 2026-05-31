import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { exportToExcel, exportToPDF, generatePartsSummary } from '@/utils/exportUtils';

export default function Export() {
  const { parts, issues, scoreVersions, annotations, latestVersion } = useStore();
  const [exporting, setExporting] = useState<string | null>(null);

  const summary = generatePartsSummary(parts);
  const unresolvedIssues = issues.filter(i => !i.resolved);

  const handleExportExcel = () => {
    setExporting('excel');
    setTimeout(() => {
      exportToExcel(parts, issues, scoreVersions, annotations);
      setExporting(null);
    }, 500);
  };

  const handleExportPDF = () => {
    setExporting('pdf');
    setTimeout(() => {
      exportToPDF(parts, issues, latestVersion);
      setExporting(null);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif text-slate-800">导出中心</h2>
        <p className="text-sm text-slate-500 mt-1">导出声部清单、对账报告和问题明细，所有文件数据与界面保持一致</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={24} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Excel 导出</h3>
              <p className="text-sm text-slate-500">包含声部清单、问题清单、批注记录三个工作表</p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">文件内容</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 声部清单: {parts.length} 条记录</li>
              <li>• 问题清单: {issues.length} 条记录</li>
              <li>• 批注记录: {annotations.length} 条记录</li>
            </ul>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exporting === 'excel'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70"
          >
            <Download size={18} />
            {exporting === 'excel' ? '导出中...' : '导出 Excel'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">PDF 报告</h3>
              <p className="text-sm text-slate-500">同步状态概览、问题清单、声部状态明细</p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">报告概览数据</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 同步完成率: {((summary.confirmed + summary.distributed) / summary.total * 100).toFixed(1)}%</li>
              <li>• 未解决问题: {unresolvedIssues.length} 个</li>
              <li>• 最新版本: {latestVersion}</li>
            </ul>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exporting === 'pdf'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70"
          >
            <Download size={18} />
            {exporting === 'pdf' ? '导出中...' : '导出 PDF'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4">数据一致性说明</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
            <CheckCircle size={20} className="text-emerald-600 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800">声部状态一致</p>
              <p className="text-sm text-slate-600">导出文件中的声部清单与声部对账页面数据完全一致</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800">问题记录一致</p>
              <p className="text-sm text-slate-600">问题清单与分析看板、声部对账页面数据完全一致</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Clock size={20} className="text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800">时间戳一致</p>
              <p className="text-sm text-slate-600">所有时间字段采用系统时间一致显示</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4">声部状态摘要（与导出文件一致）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 font-medium text-slate-600">声部</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">组别</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">当前版本</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">确认人</th>
            </tr>
            </thead>
            <tbody>
              {parts.slice(0, 8).map(part => (
                <tr key={part.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{part.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {part.section === 'string' ? '弦乐' : part.section === 'woodwind' ? '木管' : part.section === 'brass' ? '铜管' : '打击乐'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={part.currentVersion === latestVersion ? 'text-emerald-600 font-mono' : 'text-red-600 font-mono'}>
                      {part.currentVersion}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      part.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      part.status === 'distributed' ? 'bg-amber-100 text-amber-700' :
                      part.status === 'outdated' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {part.status === 'confirmed' ? '已确认' : part.status === 'distributed' ? '已发放' : part.status === 'outdated' ? '过时' : '待发放'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{part.confirmedBy || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parts.length > 8 && (
          <p className="text-center text-sm text-slate-500 mt-4">
            显示前 8 条，共 {parts.length} 条完整数据将在导出文件中
          </p>
        )}
      </div>
    </div>
  );
}
