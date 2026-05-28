import { useState, useRef } from 'react';
import { Download, Camera, FileText, History, Check, X, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAppStore } from '@/store';
import { getHeatPumpById } from '@/data/heatPumps';

const ExportPanel = ({ targetRef }: { targetRef: React.RefObject<HTMLDivElement> }) => {
  const { input, result, revisionHistory, alerts } = useAppStore();
  const [exporting, setExporting] = useState<'screenshot' | 'report' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const heatPump = getHeatPumpById(input.heatPumpId);

  const handleScreenshot = async () => {
    if (!targetRef.current) return;
    
    setExporting('screenshot');
    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `热泵COP估算_${new Date().toLocaleDateString('zh-CN')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('截图失败:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleReport = async () => {
    if (!result || !heatPump) return;
    
    setExporting('report');
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246);
      pdf.text('热泵COP估算报告', 105, 25, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 105, 35, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text('机组参数', 20, 50);
      
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      const params = [
        ['品牌型号', `${heatPump.brand} ${heatPump.model}`],
        ['额定制热量', `${heatPump.ratedCapacity} kW`],
        ['额定COP', String(heatPump.ratedCOP)],
        ['额定功率', `${heatPump.powerInput} kW`],
        ['工作温度范围', `${heatPump.minOutdoorTemp}℃ ~ ${heatPump.maxOutdoorTemp}℃`],
      ];
      
      let y = 60;
      params.forEach(([label, value]) => {
        pdf.setTextColor(148, 163, 184);
        pdf.text(label, 25, y);
        pdf.setTextColor(255, 255, 255);
        pdf.text(value, 80, y);
        y += 8;
      });
      
      y += 10;
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text('计算条件', 20, y);
      
      y += 10;
      pdf.setFontSize(10);
      const conditions = [
        ['室外温度', `${input.outdoorTemp}℃`],
        ['供水温度', `${input.supplyWaterTemp}℃`],
        ['建筑热负荷', `${input.heatLoad} kW`],
        ['峰电价', `¥${input.electricityPrice.peak}/kWh`],
        ['谷电价', `¥${input.electricityPrice.valley}/kWh`],
        ['平电价', `¥${input.electricityPrice.flat}/kWh`],
        ['每日运行', `${input.operatingHours.peak + input.operatingHours.valley + input.operatingHours.flat} 小时`],
      ];
      
      conditions.forEach(([label, value]) => {
        pdf.setTextColor(148, 163, 184);
        pdf.text(label, 25, y);
        pdf.setTextColor(255, 255, 255);
        pdf.text(value, 80, y);
        y += 7;
      });
      
      y += 10;
      pdf.setFontSize(14);
      pdf.setTextColor(59, 130, 246);
      pdf.text('估算结果', 20, y);
      
      y += 12;
      pdf.setFontSize(24);
      pdf.setTextColor(34, 197, 94);
      pdf.text(`COP: ${result.cop}`, 25, y);
      
      y += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`温度修正系数: ${result.temperatureCorrectionFactor}`, 25, y);
      
      y += 15;
      const results = [
        ['实际制热量', `${result.capacity} kW`],
        ['小时耗电量', `${result.powerConsumption} kW/h`],
        ['日电费', `¥${result.dailyCost}`],
        ['月电费', `¥${result.monthlyCost}`],
        ['年电费', `¥${result.annualCost}`],
      ];
      
      results.forEach(([label, value]) => {
        pdf.setTextColor(148, 163, 184);
        pdf.text(label, 25, y);
        pdf.setTextColor(255, 255, 255);
        pdf.text(value, 80, y);
        y += 7;
      });
      
      y += 15;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`数据来源: ${input.sourceInfo}`, 20, y);
      
      if (alerts.length > 0) {
        y += 10;
        pdf.setFontSize(12);
        pdf.setTextColor(239, 68, 68);
        pdf.text('风险提示:', 20, y);
        y += 6;
        alerts.slice(0, 3).forEach(alert => {
          pdf.setFontSize(9);
          pdf.setTextColor(alert.type === 'error' ? 239 : 245, alert.type === 'error' ? 68 : 158, 11);
          pdf.text(`• ${alert.message}`, 25, y);
          y += 5;
        });
      }
      
      pdf.save(`热泵COP估算报告_${new Date().toLocaleDateString('zh-CN')}.pdf`);
    } catch (error) {
      console.error('报告生成失败:', error);
    } finally {
      setExporting(null);
    }
  };

  const formatHistoryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">导出与历史</h2>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            showHistory ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3 h-3" />
          修订记录 ({revisionHistory.length})
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleScreenshot}
          disabled={exporting !== null}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-cyan-500/50 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'screenshot' ? (
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-cyan-400" />
          )}
          <span className="text-sm text-white">导出截图</span>
        </button>
        
        <button
          onClick={handleReport}
          disabled={exporting !== null || !result}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-blue-500/50 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'report' ? (
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          ) : (
            <FileText className="w-6 h-6 text-blue-400" />
          )}
          <span className="text-sm text-white">生成报告</span>
        </button>
      </div>

      {showHistory && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h3 className="text-sm font-medium text-white mb-3">参数修订记录</h3>
          {revisionHistory.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">暂无修订记录</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {[...revisionHistory].reverse().slice(0, 20).map((record) => (
                <div key={record.id} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 whitespace-nowrap">
                    {formatHistoryDate(record.timestamp)}
                  </span>
                  <span className="text-blue-400 font-medium">{record.field}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-green-400">
                    {typeof record.newValue === 'object'
                      ? JSON.stringify(record.newValue)
                      : String(record.newValue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ExportPanel;
