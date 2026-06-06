import { useRef, useState } from 'react';
import BerthCanvas from '../components/Canvas/BerthCanvas';
import CanvasToolbar from '../components/Canvas/CanvasToolbar';
import PropertyPanel from '../components/Canvas/PropertyPanel';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Download, Image as ImageIcon, FileJson, FileSpreadsheet, X,
} from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Dashboard() {
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);
  const { berths, operations, materials, errors } = useStore();

  const exportImage = async () => {
    if (!canvasAreaRef.current) return;
    const canvas = await html2canvas(canvasAreaRef.current, {
      backgroundColor: '#0F172A',
      scale: 2,
    });
    const link = document.createElement('a');
    link.download = `港口泊位调度_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setShowExport(false);
  };

  const exportPDF = async () => {
    if (!canvasAreaRef.current) return;
    const canvas = await html2canvas(canvasAreaRef.current, {
      backgroundColor: '#0F172A',
      scale: 2,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = (pdfHeight - imgHeight * ratio) / 2;
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`港口泊位调度报告_${new Date().toISOString().slice(0, 10)}.pdf`);
    setShowExport(false);
  };

  const exportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      berths,
      operations,
      materials,
      errors,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `调度数据_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setShowExport(false);
  };

  const exportCSV = () => {
    const rows = [
      ['泊位ID', '名称', '状态', 'X', 'Y', '宽度', '高度', '船舶', '货类', '错误', '更新时间'],
      ...berths.map((b) => [
        b.id, b.name, b.status, b.x, b.y, b.width, b.height,
        b.shipName || '', b.cargoType || '', b.hasError ? b.errorType : '', b.updatedAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `泊位表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setShowExport(false);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <CanvasToolbar onExport={() => setShowExport(true)} />
      <div className="flex-1 flex overflow-hidden relative">
        <div ref={canvasAreaRef} className="flex-1 flex overflow-hidden">
          <BerthCanvas />
        </div>
        <PropertyPanel />

        {showExport && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="panel p-6 w-96 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">导出调度数据</h3>
                <button
                  onClick={() => setShowExport(false)}
                  className="p-1.5 rounded-md hover:bg-port-border text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={exportImage} className="panel p-4 hover:bg-port-border/50 transition-all text-left">
                  <ImageIcon className="w-6 h-6 text-port-deep mb-2" />
                  <p className="text-sm font-medium text-white">导出图片</p>
                  <p className="text-xs text-slate-400">PNG 格式，含画布视图</p>
                </button>
                <button onClick={exportPDF} className="panel p-4 hover:bg-port-border/50 transition-all text-left">
                  <FileJson className="w-6 h-6 text-port-success mb-2" />
                  <p className="text-sm font-medium text-white">导出 PDF</p>
                  <p className="text-xs text-slate-400">A4 横向，可打印报告</p>
                </button>
                <button onClick={exportJSON} className="panel p-4 hover:bg-port-border/50 transition-all text-left">
                  <Download className="w-6 h-6 text-port-warning mb-2" />
                  <p className="text-sm font-medium text-white">导出 JSON</p>
                  <p className="text-xs text-slate-400">完整数据，含历史和材料</p>
                </button>
                <button onClick={exportCSV} className="panel p-4 hover:bg-port-border/50 transition-all text-left">
                  <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-sm font-medium text-white">导出 CSV</p>
                  <p className="text-xs text-slate-400">泊位数据表格</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
