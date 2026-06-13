import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, Clock, Trash2, Play, Sparkles } from 'lucide-react';
import { useTorqueStore } from '@/store/useTorqueStore';

export default function ImportPage() {
  const navigate = useNavigate();
  const { batches, loadSampleData, addBatchFromFile, clearAll, records } = useTorqueStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    await handleFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) await handleFiles(files);
  };

  const handleFiles = async (files: FileList) => {
    const excelFile = Array.from(files).find(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    if (!excelFile) {
      alert('请上传 Excel (.xlsx, .xls) 或 CSV 文件');
      return;
    }
    setIsLoading(true);
    try {
      await addBatchFromFile(excelFile);
    } catch (err) {
      alert('文件解析失败：' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = () => {
    loadSampleData();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const hasData = records.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">数据导入</h2>
        <p className="text-sm text-slate-500 mt-1">上传设备铭牌数据，支持分批追加，历史记录不覆盖</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-800">{records.length}</div>
          <div className="text-sm text-slate-500 mt-1">总记录数</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{batches.length}</div>
          <div className="text-sm text-slate-500 mt-1">导入批次</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-emerald-600">
            {new Set(records.map(r => r.deviceId)).size}
          </div>
          <div className="text-sm text-slate-500 mt-1">设备数</div>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
        <div className="text-base font-medium text-slate-700">
          {isLoading ? '正在解析...' : '拖拽 Excel 文件到此处，或点击选择文件'}
        </div>
        <div className="text-sm text-slate-400 mt-2">
          支持 .xlsx / .xls / .csv 格式，支持分批追加上传
        </div>
        <div className="text-xs text-slate-400 mt-3">
          建议列名：设备编号、设备名称、铭牌扭矩值、原始单位、额定转速、功率、安全阈值、阈值单位、阈值来源
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={handleLoadSample}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          加载样例数据
        </button>

        <div className="flex gap-3">
          {hasData && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              清空数据
            </button>
          )}
          <button
            onClick={() => navigate('/detail')}
            disabled={!hasData}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasData
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4" />
            查看复算结果
          </button>
        </div>
      </div>

      {batches.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            历史批次
          </h3>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">文件名</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">记录数</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">导入时间</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">备注</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => (
                  <tr key={batch.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{batch.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{batch.recordCount} 条</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(batch.importedAt)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{batch.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm font-medium text-blue-800 mb-2">项目助理小宋快速上手</div>
        <div className="text-xs text-blue-600 space-y-1">
          <p>① <span className="font-medium">看样例</span>：点击上方「加载样例数据」快速了解效果</p>
          <p>② <span className="font-medium">找异常</span>：进入复算明细页，红色/橙色标记即为异常</p>
          <p>③ <span className="font-medium">导结果</span>：点击左侧「导出报告」一键下载 Excel</p>
        </div>
      </div>
    </div>
  );
}
