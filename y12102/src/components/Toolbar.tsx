import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { Play, Download, Upload, Database, FileSpreadsheet, FileJson, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { exportToExcel, exportToJSON, importFromExcel, importFromJSON, ExportData } from '../utils/exportUtils';

export const Toolbar: React.FC = () => {
  const {
    judges,
    suppliers,
    categories,
    scores,
    reviewLogs,
    calculationResults,
    consistencyResults,
    sensitivityResults,
    loadSampleData,
    runCalculation,
    setJudges,
    setSuppliers,
    setCategories,
    setScores,
    setReviewLogs,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    const data: ExportData = {
      judges,
      suppliers,
      categories,
      scores,
      reviewLogs,
      calculationResults,
      consistencyResults,
      sensitivityResults,
    };
    exportToExcel(data);
  };

  const handleExportJSON = () => {
    const data: ExportData = {
      judges,
      suppliers,
      categories,
      scores,
      reviewLogs,
      calculationResults,
      consistencyResults,
      sensitivityResults,
    };
    exportToJSON(data);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await importFromExcel(file);
        if (data.judges) setJudges(data.judges);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.categories) setCategories(data.categories);
        if (data.scores) setScores(data.scores);
        alert('数据导入成功！');
      } else if (file.name.endsWith('.json')) {
        const data = await importFromJSON(file);
        if (data.judges) setJudges(data.judges);
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.categories) setCategories(data.categories);
        if (data.scores) setScores(data.scores);
        if (data.reviewLogs) setReviewLogs(data.reviewLogs);
        alert('数据导入成功！');
      } else {
        alert('不支持的文件格式，请上传 .xlsx 或 .json 文件');
      }
    } catch (error) {
      alert('导入失败：' + (error as Error).message);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sampleOptions = [
    { id: 'normal', label: '正常样例', icon: CheckCircle, description: '权重归一、打分完整、无极端评委' },
    { id: 'extreme', label: '极端评委样例', icon: AlertTriangle, description: '包含明显偏离的评委打分' },
    { id: 'missing', label: '打分缺项样例', icon: XCircle, description: '部分评委存在缺项评分' },
    { id: 'unnormalized', label: '权重不归一样例', icon: AlertTriangle, description: '权重未归一化（和为100）' },
  ] as const;

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={runCalculation}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Play size={18} />
            运行计算
          </button>

          <div className="h-6 w-px bg-slate-200 mx-2" />

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
              <Database size={18} />
              加载样例
            </button>
            <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-2">
                {sampleOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => loadSampleData(option.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <option.icon size={20} className={`mt-0.5 ${
                      option.id === 'normal' ? 'text-green-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <p className="font-medium text-slate-800">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-2" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            <Upload size={18} />
            导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.json"
            onChange={handleFileImport}
            className="hidden"
          />

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">
              <Download size={18} />
              导出报告
            </button>
            <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-2">
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <FileSpreadsheet size={20} className="text-green-600" />
                  <div>
                    <p className="font-medium text-slate-800">Excel 报告</p>
                    <p className="text-xs text-slate-500">包含完整分析结果</p>
                  </div>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <FileJson size={20} className="text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-800">JSON 数据</p>
                    <p className="text-xs text-slate-500">完整原始数据</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>评委：{judges.length} 人</span>
          <span>供应商：{suppliers.length} 家</span>
          <span>评分项：{categories.length} 项</span>
        </div>
      </div>
    </div>
  );
};
