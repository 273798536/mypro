import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, ArrowRight, Database } from 'lucide-react';
import { useAppStore } from '../store';
import { mockStationData, generateValidationReport, validateStationData } from '../data/mockStation';
import { DataValidationReport } from '../types';

const DataImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [validationReport, setValidationReport] = useState<DataValidationReport | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { setFloors, setValidationReport: setStoreReport, setStationName } = useAppStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const report = validateStationData(data);
        setValidationReport(report);
        setStoreReport(report);
        if (data.floors) {
          setFloors(data.floors);
        }
        setStationName(data.stationName || '未命名站点');
      } catch {
        const report = generateValidationReport();
        setValidationReport(report);
        setStoreReport(report);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const loadDemoData = () => {
    setFileName('demo-station-data.json');
    setFloors(mockStationData);
    const report = generateValidationReport();
    setValidationReport(report);
    setStoreReport(report);
    setStationName('人民广场换乘站');
  };

  const proceedToAnalyzer = () => {
    navigate('/analyzer');
  };

  const getSeverityColor = (count: number) => {
    if (count === 0) return 'text-accent-success';
    if (count <= 2) return 'text-yellow-500';
    return 'text-accent-warning';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 grid-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-900/50 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Database className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-display font-bold text-white">
              轨道交通换乘客流分析系统
            </h1>
          </div>
          <p className="text-lg text-blue-200/80 max-w-2xl mx-auto">
            导入站厅楼层数据，通过3D可视化分析人流瓶颈，确保扶梯容量计算准确性
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div
            className={`relative glass-panel rounded-2xl p-12 mb-8 transition-all duration-300 ${
              isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-transparent'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-all ${
                isDragging ? 'bg-blue-500/30 scale-110' : 'bg-blue-500/20'
              }`}>
                <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-300' : 'text-blue-400'}`} />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">
                拖拽站厅数据文件到此处
              </h3>
              <p className="text-blue-200/60 mb-4">
                支持 JSON / CSV 格式
              </p>
              {fileName && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full">
                  <FileText className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-200 text-sm">{fileName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mb-8">
            <button
              onClick={loadDemoData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all border border-blue-500/30"
            >
              <Database className="w-5 h-5" />
              加载示例数据体验
            </button>
          </div>

          {validationReport && (
            <div className="glass-panel rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {validationReport.isValid ? (
                    <CheckCircle className="w-6 h-6 text-accent-success" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  )}
                  <h3 className="text-xl font-display font-semibold text-white">数据校验报告</h3>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-200/60">扶梯问题:</span>
                    <span className={`font-mono font-semibold ${getSeverityColor(validationReport.escalatorIssues)}`}>
                      {validationReport.escalatorIssues}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-200/60">闸机问题:</span>
                    <span className={`font-mono font-semibold ${getSeverityColor(validationReport.gateIssues)}`}>
                      {validationReport.gateIssues}
                    </span>
                  </div>
                </div>
              </div>

              {validationReport.missingFields.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-accent-warning mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    缺失字段 ({validationReport.missingFields.length})
                  </h4>
                  <div className="space-y-2">
                    {validationReport.missingFields.map((item, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded font-mono shrink-0">
                            {item.field}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{item.location}</p>
                            <p className="text-xs text-blue-200/60 mt-1">{item.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationReport.warnings.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-yellow-500 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    警告 ({validationReport.warnings.length})
                  </h4>
                  <div className="space-y-2">
                    {validationReport.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                        <p className="text-sm text-yellow-200">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-blue-500/20">
                <p className="text-sm text-blue-200/60">
                  提示：缺失字段可在3D分析界面中补充修正
                </p>
                <button
                  onClick={proceedToAnalyzer}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/30"
                >
                  进入3D分析
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataImportPage;
