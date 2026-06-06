import { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  FileText, Download, FileJson, FileSpreadsheet, CheckCircle2,
  AlertTriangle, Clock, Settings2, ChevronRight,
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function ReportGenerator() {
  const { berths, operations, materials, errors } = useStore();
  const [includeErrors, setIncludeErrors] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [highlightErrors, setHighlightErrors] = useState(true);

  const stats = {
    totalBerths: berths.length,
    available: berths.filter((b) => b.status === 'available').length,
    occupied: berths.filter((b) => b.status === 'occupied').length,
    maintenance: berths.filter((b) => b.status === 'maintenance').length,
    errorCount: errors.length,
    unconfirmed: operations.filter((o) => !o.isConfirmed).length,
    supplementary: operations.filter((o) => o.isSupplementary).length,
  };

  const exportReport = async (format: 'pdf' | 'json' | 'csv') => {
    if (format === 'json') {
      const data = {
        exportedAt: new Date().toISOString(),
        summary: stats,
        berths: includeErrors ? berths : berths.filter((b) => !b.hasError),
        operations: includeHistory ? operations : [],
        materials: includeMaterials ? materials : [],
        errors: includeErrors ? errors : [],
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.download = `调度报告_${new Date().toISOString().slice(0, 10)}.json`;
      link.href = URL.createObjectURL(blob);
      link.click();
    } else if (format === 'csv') {
      const rows: string[][] = [];
      rows.push(['港口泊位二维调度报告', '', '', '', '']);
      rows.push(['导出时间', new Date().toLocaleString('zh-CN'), '', '', '']);
      rows.push([]);
      rows.push(['统计摘要']);
      rows.push(['泊位总数', String(stats.totalBerths)]);
      rows.push(['空闲', String(stats.available)]);
      rows.push(['已靠泊', String(stats.occupied)]);
      rows.push(['维护中', String(stats.maintenance)]);
      rows.push(['错误记录', String(stats.errorCount)]);
      rows.push(['待确认操作', String(stats.unconfirmed)]);
      rows.push([]);
      if (includeErrors) {
        rows.push(['错误分析']);
        rows.push(['错误ID', '类型', '泊位位置', '原因', '建议']);
        errors.forEach((e) => rows.push([
          e.id, e.errorType,
          `(${e.errorPosition.x},${e.errorPosition.y})`,
          e.errorReason, e.suggestion,
        ]));
        rows.push([]);
      }
      rows.push(['泊位列表']);
      rows.push(['ID', '名称', '状态', '坐标', '尺寸', '船舶', '是否含错']);
      berths.forEach((b) => rows.push([
        b.id, b.name, b.status,
        `(${b.x},${b.y})`,
        `${b.width}x${b.height}`,
        b.shipName || '',
        b.hasError ? '是' : '否',
      ]));
      const csv = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `调度报告_${new Date().toISOString().slice(0, 10)}.csv`;
      link.href = URL.createObjectURL(blob);
      link.click();
    } else if (format === 'pdf') {
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Port Berth Dispatch Report', 20, 25);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Exported: ${new Date().toLocaleString('zh-CN')}`, 20, 33);

      let y = 50;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', 20, y); y += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total berths: ${stats.totalBerths}  Available: ${stats.available}  Occupied: ${stats.occupied}  Maintenance: ${stats.maintenance}`, 20, y); y += 7;
      pdf.text(`Errors: ${stats.errorCount}  Unconfirmed: ${stats.unconfirmed}  Supplementary: ${stats.supplementary}`, 20, y); y += 10;

      if (includeErrors && errors.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Error Records (student-accessible traceability)', 20, y); y += 8;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        errors.forEach((e) => {
          if (y > 260) { pdf.addPage(); y = 20; }
          pdf.setFont('helvetica', 'bold');
          pdf.text(`[${e.errorType}] at (${e.errorPosition.x},${e.errorPosition.y})`, 22, y); y += 5;
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Reason: ${e.errorReason}`, 26, y); y += 5;
          pdf.text(`Material: ${materials.find((m) => m.id === e.materialId)?.title || '-'}`, 26, y); y += 5;
          pdf.text(`Suggestion: ${e.suggestion}`, 26, y); y += 8;
        });
      }

      pdf.save(`调度报告_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-port-border">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-port-deep" />
          <h2 className="text-lg font-bold text-white">报告生成配置</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 ml-6">选择报告内容和导出格式，学生查看版默认包含完整溯源信息</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">报告概览</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="panel p-4">
              <p className="text-xs text-slate-400">泊位总数</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalBerths}</p>
              <div className="flex gap-1 mt-2 text-[10px]">
                <span className="text-port-success">{stats.available}空闲</span>
                <span className="text-slate-500">·</span>
                <span className="text-blue-400">{stats.occupied}靠泊</span>
                <span className="text-slate-500">·</span>
                <span className="text-port-warning">{stats.maintenance}维护</span>
              </div>
            </div>
            <div className="panel p-4 border-port-danger/40 bg-port-danger/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-port-danger" />
                <p className="text-xs text-slate-400">错误记录</p>
              </div>
              <p className="text-2xl font-bold text-port-danger mt-1">{stats.errorCount}</p>
              <p className="text-[10px] text-slate-500 mt-2">坐标翻转 / 比例尺错用 / 漏填单位</p>
            </div>
            <div className="panel p-4 border-port-warning/40 bg-port-warning/5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-port-warning" />
                <p className="text-xs text-slate-400">待确认操作</p>
              </div>
              <p className="text-2xl font-bold text-port-warning mt-1">{stats.unconfirmed}</p>
              <p className="text-[10px] text-slate-500 mt-2">需要人工二次确认</p>
            </div>
            <div className="panel p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-port-success" />
                <p className="text-xs text-slate-400">补录操作</p>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.supplementary}</p>
              <p className="text-[10px] text-slate-500 mt-2">事后补充记录项</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white mb-3">内容选项</h3>
          <div className="panel p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm text-white">包含错误记录及溯源</p>
                <p className="text-[11px] text-slate-500">学生可查看每条错误对应哪份材料</p>
              </div>
              <input
                type="checkbox"
                checked={includeErrors}
                onChange={(e) => setIncludeErrors(e.target.checked)}
                className="w-5 h-5 accent-port-deep"
              />
            </label>
            <div className="h-px bg-port-border" />
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm text-white">包含完整操作历史</p>
                <p className="text-[11px] text-slate-500">撤销重做链路、补录标记、确认状态</p>
              </div>
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                className="w-5 h-5 accent-port-deep"
              />
            </label>
            <div className="h-px bg-port-border" />
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm text-white">包含关联材料证据</p>
                <p className="text-[11px] text-slate-500">截图、草稿、处理意见全部纳入</p>
              </div>
              <input
                type="checkbox"
                checked={includeMaterials}
                onChange={(e) => setIncludeMaterials(e.target.checked)}
                className="w-5 h-5 accent-port-deep"
              />
            </label>
            <div className="h-px bg-port-border" />
            <label className="flex items-center justify-between cursor-pointer group">
              <div>
                <p className="text-sm text-white">报告中高亮错误项</p>
                <p className="text-[11px] text-slate-500">学生一眼能定位比例尺错用等问题</p>
              </div>
              <input
                type="checkbox"
                checked={highlightErrors}
                onChange={(e) => setHighlightErrors(e.target.checked)}
                className="w-5 h-5 accent-port-danger"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white mb-3">导出格式</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => exportReport('pdf')}
              className="panel p-4 text-left hover:bg-port-border/40 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-port-success/20 flex items-center justify-center group-hover:bg-port-success/30 transition-colors">
                  <FileText className="w-5 h-5 text-port-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">PDF 报告</p>
                  <p className="text-[11px] text-slate-500">适合打印、学生阅读</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pl-13">
                含完整错误溯源、材料证据清单，学生可直接定位比例尺错用等问题发生在哪份材料
              </p>
              <div className="flex items-center gap-1 mt-3 text-port-success text-xs font-medium">
                <Download className="w-3.5 h-3.5" /> 导出 PDF
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>

            <button
              onClick={() => exportReport('json')}
              className="panel p-4 text-left hover:bg-port-border/40 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-port-deep/30 flex items-center justify-center group-hover:bg-port-deep/50 transition-colors">
                  <FileJson className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">JSON 数据</p>
                  <p className="text-[11px] text-slate-500">完整结构化数据</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pl-13">
                泊位、操作、材料、错误全部字段，适合二次开发、数据比对、重复运行验证
              </p>
              <div className="flex items-center gap-1 mt-3 text-blue-300 text-xs font-medium">
                <Download className="w-3.5 h-3.5" /> 导出 JSON
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>

            <button
              onClick={() => exportReport('csv')}
              className="panel p-4 text-left hover:bg-port-border/40 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-port-warning/20 flex items-center justify-center group-hover:bg-port-warning/30 transition-colors">
                  <FileSpreadsheet className="w-5 h-5 text-port-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">CSV 表格</p>
                  <p className="text-[11px] text-slate-500">Excel 可直接打开</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pl-13">
                统计摘要、错误清单、泊位列表，适合车间主管日常审阅、人工确认
              </p>
              <div className="flex items-center gap-1 mt-3 text-port-warning text-xs font-medium">
                <Download className="w-3.5 h-3.5" /> 导出 CSV
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
