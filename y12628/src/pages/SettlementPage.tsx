import { useState } from 'react';
import { Download, FileJson, FileText, CheckCircle, AlertCircle, Clock, Check, Eye } from 'lucide-react';
import { useAppStore } from '../store';
import jsPDF from 'jspdf';

const SettlementPage = () => {
  const { stickers, getExportSummary, getConsistencyCheck } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'pdf'>('json');
  const [showPreview, setShowPreview] = useState(false);

  const summary = getExportSummary();
  const consistency = getConsistencyCheck();

  const getStatusColor = (status: string) => {
    switch (status) {
      case '通过': return 'text-success bg-success/20 border-success/30';
      case '待确认': return 'text-warning bg-warning/20 border-warning/30';
      case '有错误': return 'text-danger bg-danger/20 border-danger/30';
      default: return 'text-white/60 bg-white/10';
    }
  };

  const exportJSON = () => {
    setExporting(true);
    setTimeout(() => {
      const data = {
        summary,
        stickers,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `危化品贴纸图_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 500);
  };

  const exportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(22, 93, 255);
      doc.text('实验室危化品贴纸图 - 复盘报告', 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 35);
      
      let yPos = 50;
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('一、汇总统计', 20, yPos);
      yPos += 10;
      
      const summaryItems = [
        ['贴纸总数', String(summary.totalStickers)],
        ['已验证', String(summary.verifiedCount)],
        ['待确认', String(summary.pendingCount)],
        ['错误数', String(summary.errorCount)],
        ['总体状态', summary.status],
      ];
      
      summaryItems.forEach(([key, value]) => {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(key, 25, yPos);
        doc.setTextColor(0);
        doc.text(value, 80, yPos);
        yPos += 8;
      });
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('二、贴纸详情', 20, yPos);
      yPos += 10;
      
      stickers.forEach((sticker, index) => {
        doc.setFontSize(9);
        doc.setTextColor(50);
        doc.text(`${index + 1}. ${sticker.label}`, 25, yPos);
        doc.setTextColor(100);
        doc.text(`类型: ${sticker.type} | 坐标: (${sticker.x}, ${sticker.y}) | 翻转: ${sticker.flipped ? '是' : '否'} | 状态: ${sticker.verified ? '已验证' : '待确认'}`, 30, yPos + 5);
        yPos += 12;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      yPos += 5;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('三、一致性校验', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(consistency.consistent ? 0 : 200);
      doc.text(`页面与导出内容一致性: ${consistency.consistent ? '一致' : '不一致'}`, 25, yPos);
      
      if (!consistency.consistent) {
        yPos += 8;
        consistency.inconsistencies.forEach((item, i) => {
          doc.setTextColor(150);
          doc.text(`  ${i + 1}. ${item}`, 25, yPos + i * 6);
        });
      }
      
      doc.save(`危化品贴纸图_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`);
      setExporting(false);
    }, 500);
  };

  const handleExport = () => {
    if (exportFormat === 'json') {
      exportJSON();
    } else {
      exportPDF();
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">结算与复盘</h2>
            <p className="text-sm text-white/60 mt-1">查看标注结果并导出复盘报告</p>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? '隐藏预览' : '预览导出'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 glass-card-hover">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">贴纸总数</p>
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{summary.totalStickers}</p>
          </div>
          
          <div className="glass-card p-4 glass-card-hover">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">已验证</p>
              <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold text-success mt-2">{summary.verifiedCount}</p>
          </div>
          
          <div className="glass-card p-4 glass-card-hover">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">待确认</p>
              <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-warning" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warning mt-2">{summary.pendingCount}</p>
          </div>
          
          <div className="glass-card p-4 glass-card-hover">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">总体状态</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.status === '通过' ? 'bg-success/20' : summary.status === '有错误' ? 'bg-danger/20' : 'bg-warning/20'}`}>
                {summary.status === '通过' ? <Check className="w-4 h-4 text-success" /> : <AlertCircle className={`w-4 h-4 ${summary.status === '有错误' ? 'text-danger' : 'text-warning'}`} />}
              </div>
            </div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(summary.status)}`}>
              {summary.status}
            </span>
          </div>
        </div>

        {!consistency.consistent && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-danger">检测到不一致问题</p>
                <ul className="mt-2 space-y-1">
                  {consistency.inconsistencies.map((item, i) => (
                    <li key={i} className="text-sm text-white/70">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-sm font-semibold text-white/80 mb-3">导出内容预览</h3>
            <pre className="text-xs text-white/60 overflow-auto max-h-64 scrollbar-thin">
              {JSON.stringify({ summary, stickers: stickers.slice(0, 2), exportedAt: new Date().toISOString() }, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setExportFormat('json')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                exportFormat === 'json'
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <FileJson className="w-4 h-4" />
              JSON 格式
            </button>
            <button
              onClick={() => setExportFormat('pdf')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                exportFormat === 'pdf'
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <FileText className="w-4 h-4" />
              PDF 格式
            </button>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || stickers.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exporting ? '导出中...' : '导出复盘报告'}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">贴纸详情列表</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">标签</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">类型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">坐标</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">翻转状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">验证状态</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/60">最后更新</th>
              </tr>
            </thead>
            <tbody>
              {stickers.map((sticker) => (
                <tr key={sticker.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: sticker.color }}
                      />
                      <span className="text-white text-sm">{sticker.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-white/70">{sticker.type}</td>
                  <td className="py-3 px-4 text-sm text-white/70 font-mono">({sticker.x}, {sticker.y})</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${sticker.flipped ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/50'}`}>
                      {sticker.flipped ? '已翻转' : '未翻转'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${sticker.verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                      {sticker.verified ? '已验证' : '待确认'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-white/50">
                    {new Date(sticker.updatedAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
              {stickers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    暂无贴纸数据，请先在标注操作页面添加贴纸
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettlementPage;
