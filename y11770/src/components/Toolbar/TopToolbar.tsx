import { useState } from 'react';
import {
  Upload,
  Download,
  Save,
  FolderOpen,
  RotateCcw,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function TopToolbar() {
  const { saveParameters } = useAppStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [paramName, setParamName] = useState('');

  const handleSave = () => {
    if (paramName.trim()) {
      saveParameters(paramName.trim());
      setParamName('');
      setShowSaveDialog(false);
    }
  };

  const handleExportReport = () => {
    const reportContent = generateReport();
    const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `信用风险迁徙分析报告-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    const state = useAppStore.getState();
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>信用风险迁徙分析报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #0f172a; color: #e2e8f0; }
    h1 { color: #60a5fa; border-bottom: 2px solid #334155; padding-bottom: 10px; }
    h2 { color: #a78bfa; margin-top: 30px; }
    .section { background: #1e293b; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .stat { display: inline-block; background: #334155; padding: 10px 20px; border-radius: 6px; margin: 5px; }
    .stat-label { font-size: 12px; color: #94a3b8; }
    .stat-value { font-size: 24px; font-weight: bold; color: #60a5fa; }
    .anomaly { background: #7f1d1d; border-left: 4px solid #ef4444; padding: 10px; margin: 5px 0; border-radius: 4px; }
    .source { background: #14532d; border-left: 4px solid #22c55e; padding: 10px; margin: 5px 0; border-radius: 4px; }
    .revision { background: #1e3a5f; border-left: 4px solid #3b82f6; padding: 10px; margin: 5px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>信用风险迁徙分析报告</h1>
  <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
  <p>当前分析月份: ${state.currentMonth}</p>
  
  <div class="section">
    <h2>数据概览</h2>
    <div class="stat">
      <div class="stat-label">总记录数</div>
      <div class="stat-value">${state.records.length}</div>
    </div>
    <div class="stat">
      <div class="stat-label">异常记录</div>
      <div class="stat-value">${state.records.filter(r => r.anomalies.length > 0).length}</div>
    </div>
  </div>

  <div class="section">
    <h2>数据来源</h2>
    ${state.dataSources.map(ds => `
      <div class="source">
        <strong>${ds.name}</strong><br>
        ${ds.description}<br>
        导入时间: ${new Date(ds.importTime).toLocaleString('zh-CN')}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>异常记录</h2>
    ${state.records.filter(r => r.anomalies.length > 0).map(r => `
      <div class="anomaly">
        <strong>客户 ${r.customerId}</strong> - ${r.fromRating} → ${r.toRating}<br>
        ${r.anomalies.map(a => `• ${a.description}`).join('<br>')}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>修正痕迹</h2>
    ${state.records.filter(r => r.revisions.length > 0).flatMap(r => 
      r.revisions.map(rev => `
        <div class="revision">
          <strong>${rev.operator}</strong> - ${rev.action} - ${new Date(rev.timestamp).toLocaleString('zh-CN')}<br>
          ${rev.reason}<br>
          ${rev.field}: ${rev.oldValue} → ${rev.newValue}
        </div>
      `)
    ).join('')}
  </div>
</body>
</html>`;
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FileText className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold text-white">信用风险迁徙矩阵</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
            <Upload size={16} />
            导入数据
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
          >
            <Save size={16} />
            保存参数
          </button>

          <button className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
            <FolderOpen size={16} />
            加载参数
          </button>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            <Download size={16} />
            导出报告
          </button>

          <button className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
            <RotateCcw size={16} />
            重置视图
          </button>

          <button className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96 border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">保存分析参数</h3>
            <input
              type="text"
              value={paramName}
              onChange={(e) => setParamName(e.target.value)}
              placeholder="输入参数名称..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
