import { Building2, Database, History, Camera, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { captureWithWatermark, downloadScreenshot } from '../../utils/screenshot';
import { useState } from 'react';

export const Header = () => {
  const {
    buildingModel,
    energyType,
    timeRange,
    setDataManagementOpen,
    setHistoryOpen,
    saveCurrentView,
  } = useAppStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');
  const [viewNotes, setViewNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportScreenshot = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await captureWithWatermark('app-container', {
        buildingName: buildingModel.name,
        energyType,
        timeRange,
      });
      downloadScreenshot(dataUrl);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    
    const success = await saveCurrentView(viewName.trim(), viewNotes.trim());
    if (success) {
      setShowSaveDialog(false);
      setViewName('');
      setViewNotes('');
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg">楼宇能耗热岛图</h1>
          <p className="text-slate-400 text-xs">{buildingModel.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDataManagementOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <Database size={16} />
          <span className="text-sm">数据管理</span>
        </button>

        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <History size={16} />
          <span className="text-sm">历史记录</span>
        </button>

        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <Save size={16} />
          <span className="text-sm">保存视角</span>
        </button>

        <button
          onClick={handleExportScreenshot}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Camera size={16} />
          <span className="text-sm">{isExporting ? '导出中...' : '导出截图'}</span>
        </button>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl p-6 w-96 border border-slate-700 shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-4">保存当前视角</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">视角名称</label>
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="例如：2号楼异常设备视角"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">备注（可选）</label>
                <textarea
                  value={viewNotes}
                  onChange={(e) => setViewNotes(e.target.value)}
                  placeholder="添加备注说明..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setViewName('');
                  setViewNotes('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
