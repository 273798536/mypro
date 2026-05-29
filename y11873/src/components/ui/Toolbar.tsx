import { useState, useRef, useEffect } from 'react';
import { Shield, Upload, Download, Sun, Moon, ChevronDown, Warehouse, Route, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';

export default function Toolbar() {
  const { warehouses, roads, conflictAlerts, toggleImportModal } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const criticalCount = conflictAlerts.filter((a) => a.severity === 'critical').length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: string) => {
    setExportOpen(false);
    const data = { warehouses, roads, alerts: conflictAlerts, exportedAt: new Date().toISOString() };

    if (format === 'csv') {
      const rows = warehouses.flatMap((w) =>
        w.supplies.map((s) => `${w.name},${s.type},${s.name},${s.quantity},${s.unit},${w.status}`)
      );
      const csv = `仓库,物资类型,物资名称,数量,单位,状态\n${rows.join('\n')}`;
      downloadFile(csv, 'emergency-supply.csv', 'text/csv');
    } else if (format === 'json') {
      downloadFile(JSON.stringify(data, null, 2), 'emergency-supply.json', 'application/json');
    } else if (format === 'report') {
      const report = [
        `城市应急物资仓网 - 中断拦截报告`,
        `生成时间: ${new Date().toLocaleString('zh-CN')}`,
        ``,
        `仓库总数: ${warehouses.length}`,
        `道路总数: ${roads.length}`,
        `告警总数: ${conflictAlerts.length}`,
        ``,
        `--- 中断道路 ---`,
        ...roads
          .filter((r) => r.status === 'interrupted')
          .map((r) => `${r.name}: ${r.interruptReason || '未知原因'}`),
        ``,
        `--- 告警列表 ---`,
        ...conflictAlerts.map((a) => `[${a.severity}] ${a.message} - ${a.reason}`),
      ].join('\n');
      downloadFile(report, 'interception-report.txt', 'text/plain');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-[#242938]/80 backdrop-blur-md border-b border-[#2e3548]">
      <div className="flex items-center gap-2.5">
        <Shield className="w-5 h-5 text-[#4ecdc4]" />
        <h1 className="text-base font-bold text-[#e8eaed] font-['Rajdhani'] tracking-wide">
          城市应急物资仓网
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#4ecdc4]/10">
          <Warehouse className="w-3.5 h-3.5 text-[#4ecdc4]" />
          <span className="text-xs font-semibold text-[#4ecdc4] font-['Rajdhani']">{warehouses.length}</span>
          <span className="text-[10px] text-[#4ecdc4]/70">仓库</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5b9bd5]/10">
          <Route className="w-3.5 h-3.5 text-[#5b9bd5]" />
          <span className="text-xs font-semibold text-[#5b9bd5] font-['Rajdhani']">{roads.length}</span>
          <span className="text-[10px] text-[#5b9bd5]/70">道路</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${criticalCount > 0 ? 'bg-[#ef4444]/10' : 'bg-[#8b8fa3]/10'}`}>
          <AlertTriangle className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-[#ef4444]' : 'text-[#8b8fa3]'}`} />
          <span className={`text-xs font-semibold font-['Rajdhani'] ${criticalCount > 0 ? 'text-[#ef4444]' : 'text-[#8b8fa3]'}`}>
            {conflictAlerts.length}
          </span>
          <span className={`text-[10px] ${criticalCount > 0 ? 'text-[#ef4444]/70' : 'text-[#8b8fa3]/70'}`}>告警</span>
          {criticalCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4ecdc4]/10 border border-[#4ecdc4]/30 text-[#4ecdc4] hover:bg-[#4ecdc4]/20 transition-colors"
          onClick={toggleImportModal}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">导入</span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2e3548] text-[#8b8fa3] hover:text-[#e8eaed] hover:border-[#8b8fa3]/50 transition-colors"
            onClick={() => setExportOpen(!exportOpen)}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">导出</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-[#242938]/95 backdrop-blur-xl border border-[#2e3548] rounded-xl shadow-xl py-1 z-50">
              <button
                className="w-full px-3 py-2 text-left text-sm text-[#e8eaed] hover:bg-white/5 transition-colors"
                onClick={() => handleExport('csv')}
              >
                导出 CSV
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm text-[#e8eaed] hover:bg-white/5 transition-colors"
                onClick={() => handleExport('json')}
              >
                导出 JSON
              </button>
              <div className="my-1 border-t border-[#2e3548]" />
              <button
                className="w-full px-3 py-2 text-left text-sm text-[#ff6b35] hover:bg-white/5 transition-colors"
                onClick={() => handleExport('report')}
              >
                中断拦截报告
              </button>
            </div>
          )}
        </div>

        <button
          className="p-1.5 rounded-lg hover:bg-white/5 text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
