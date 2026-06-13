import { Download } from 'lucide-react';

export default function ExportButton() {
  const handleExport = () => {
    const sceneTitle = '激光散斑误差归因报告';
    const dateStr = new Date().toISOString().split('T')[0];
    
    const reportContent = generateReport();
    const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sceneTitle}_${dateStr}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>激光散斑误差归因报告</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #94a3b8; margin-bottom: 32px; }
    .section { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #334155; }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #38bdf8; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .tag-old { background: #f59e0b20; color: #fbbf24; border: 1px solid #f59e0b40; }
    .tag-normal { background: #10b98120; color: #34d399; border: 1px solid #10b98140; }
    .tag-verbal { background: #0ea5e920; color: #38bdf8; border: 1px solid #0ea5e940; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 13px; }
    th { color: #94a3b8; font-weight: 500; }
  </style>
</head>
<body>
  <h1>激光散斑误差归因报告</h1>
  <p class="subtitle">生成时间：${new Date().toLocaleString('zh-CN')}</p>
  
  <div class="section">
    <div class="section-title">场景标注</div>
    <p>六月第二周散斑误差分析 — 涵盖维修备注旧版、正常记录和口头备注的混合数据集</p>
  </div>
  
  <div class="section">
    <div class="section-title">归因统计</div>
    <p>维修备注旧版影响权重：8 (11.4%)</p>
    <p>正常记录影响权重：43 (61.4%)</p>
    <p>口头备注影响权重：19 (27.1%)</p>
  </div>
  
  <div class="section">
    <div class="section-title">记录溯源</div>
    <table>
      <thead>
        <tr><th>日期</th><th>类型</th><th>数值</th><th>来源</th><th>权重</th></tr>
      </thead>
      <tbody>
        <tr><td>6月1日</td><td><span class="tag tag-normal">正常记录</span></td><td>2.3 μm</td><td>设备自动采集</td><td>5</td></tr>
        <tr><td>6月5日</td><td><span class="tag tag-old">维修备注旧版</span></td><td>3.1 μm</td><td>旧维修备注 v1</td><td>1</td></tr>
        <tr><td>6月7日</td><td><span class="tag tag-verbal">口头备注</span></td><td>4.2 μm</td><td>小张口头转述</td><td>2</td></tr>
        <tr><td>6月13日</td><td><span class="tag tag-normal">正常记录</span></td><td>5.2 μm</td><td>设备自动采集</td><td>8</td></tr>
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <div class="section-title">异常队列</div>
    <p>已处理：2 项</p>
    <p>待补材料：3 项</p>
    <p>人工改判：2 项</p>
  </div>
  
  <div class="section">
    <div class="section-title">跳变分析</div>
    <p>6月5日跳变：阈值变动导致（阈值从 3.0 调整为 3.5）</p>
    <p>6月7日跳变：单位变化导致（μm 转 nm，实际值 4.2μm）</p>
    <p>6月13日跳变：正常记录突发跳变（5.2μm，需排查）</p>
  </div>
</body>
</html>
    `.trim();
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium rounded transition-colors"
    >
      <Download size={16} />
      <span>导出报告</span>
    </button>
  );
}
