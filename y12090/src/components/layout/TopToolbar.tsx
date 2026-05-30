import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Download,
  Play,
  Grid3X3,
  Info,
  Trash2,
  Plus,
  Eye,
} from 'lucide-react';
import { useSceneStore } from '../../store/useSceneStore';
import { useDataStore } from '../../store/useDataStore';
import { DataParser } from '../../engine/DataParser';
import { OcclusionDetector } from '../../engine/OcclusionDetector';
import { getMockData, MOCK_CSV_CONTENT } from '../../data/mockData';

export const TopToolbar: React.FC = () => {
  const {
    viewPresets,
    loadViewPreset,
    saveViewPreset,
    deleteViewPreset,
    resetCamera,
    showAxes,
    showGrid,
    setShowAxes,
    setShowGrid,
  } = useSceneStore();

  const { setParsedData, setOcclusionResults, isDataLoaded } = useDataStore();

  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showViewSaveDialog, setShowViewSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parser = new DataParser();
    const parsedData = await parser.parseCSV(file);
    setParsedData(parsedData);

    const detector = new OcclusionDetector();
    const results = detector.detectAll({
      seats: parsedData.seats,
      subtitleScreen: parsedData.subtitleScreen,
      auditoriumBounds: parsedData.auditoriumBounds,
    });
    setOcclusionResults(results);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadDemoData = () => {
    const parser = new DataParser();
    const parsedData = parser.parseText(MOCK_CSV_CONTENT);
    setParsedData(parsedData);

    const detector = new OcclusionDetector();
    const results = detector.detectAll({
      seats: parsedData.seats,
      subtitleScreen: parsedData.subtitleScreen,
      auditoriumBounds: parsedData.auditoriumBounds,
    });
    setOcclusionResults(results);
  };

  const handleSaveView = () => {
    if (newViewName.trim()) {
      saveViewPreset(newViewName.trim());
      setNewViewName('');
      setShowViewSaveDialog(false);
    }
  };

  const exportReport = () => {
    const data = useDataStore.getState();
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalSeats: data.seats.length,
        badRows: data.badRows.length,
        occlusionResults: data.occlusionResults.length,
      },
      seats: data.seats,
      badRows: data.badRows,
      occlusionResults: data.occlusionResults,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sightline-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Eye className="text-cyan-400" size={24} />
          <h1 className="text-lg font-bold text-slate-100">
            剧场观众视线分析
          </h1>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
        >
          <Upload size={16} />
          导入数据
        </button>

        <button
          onClick={loadDemoData}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
        >
          <Play size={16} />
          加载演示
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-800 rounded px-2 py-1">
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-1.5 rounded transition-colors ${
              showAxes ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="显示坐标轴"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition-colors ${
              showGrid ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="显示网格"
          >
            <Grid3X3 size={16} />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
          >
            <Camera size={16} />
            视角
          </button>

          {showViewMenu && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-2 border-b border-slate-700">
                <button
                  onClick={() => {
                    setShowViewSaveDialog(true);
                    setShowViewMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded transition-colors"
                >
                  <Plus size={14} />
                  保存当前视角
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {viewPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-700 transition-colors group"
                  >
                    <button
                      onClick={() => {
                        loadViewPreset(preset.id);
                        setShowViewMenu(false);
                      }}
                      className="flex-1 text-left text-sm text-slate-200"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => deleteViewPreset(preset.id)}
                      className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-slate-700">
                <button
                  onClick={() => {
                    resetCamera();
                    setShowViewMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 rounded transition-colors"
                >
                  重置视角
                </button>
              </div>
            </div>
            )}
        </div>

        <button
          onClick={exportReport}
          disabled={!isDataLoaded}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          导出报告
        </button>

        <button className="p-2 text-slate-400 hover:text-slate-200 transition-colors" title="帮助">
          <Info size={18} />
        </button>
      </div>

      {showViewSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-72">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              保存视角
            </h3>
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="输入视角名称"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500 mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowViewSaveDialog(false)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveView}
                disabled={!newViewName.trim()}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
        )}
    </div>
  );
};
