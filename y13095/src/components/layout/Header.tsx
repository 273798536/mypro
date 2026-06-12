import { useState } from 'react';
import {
  Map,
  Download,
  HelpCircle,
  AlertTriangle,
  BookmarkPlus,
  Layers,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { ViewPresetSelector } from '@/components/preset/ViewPresetSelector';
import { OnboardingGuide } from '@/components/guide/OnboardingGuide';
import { usePointStore } from '@/store/usePointStore';
import { useViewStore } from '@/store/useViewStore';
import { usePresetStore } from '@/store/usePresetStore';
import { useExport } from '@/hooks/useExport';
import { getStatusCounts } from '@/utils/export';

interface HeaderProps {
  onShowOrphan: () => void;
}

export function Header({ onShowOrphan }: HeaderProps) {
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { points } = usePointStore();
  const { setSearchText: setViewSearchText, viewCondition } = useViewStore();
  const { presets, savePreset } = usePresetStore();
  const { handleExport } = useExport();

  const counts = getStatusCounts(points);
  const abnormalCount = counts.abnormal || 0;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    setViewSearchText(value);
  };

  const handleSavePreset = () => {
    const name = prompt('请输入视图名称：');
    if (name) {
      savePreset(name, viewCondition, '当前用户');
    }
  };

  const firstAbnormal = points.find(p => p.status === 'abnormal');
  const { setCenter, setZoom, setStatusFilter, applyViewCondition } = useViewStore();

  const goToSample = () => {
    if (firstAbnormal) {
      applyViewCondition(presets[0].viewCondition);
    }
  };

  const goToAbnormal = () => {
    applyViewCondition(presets[0].viewCondition);
  };

  return (
    <>
      <header className="h-14 bg-space-900/95 border-b border-space-700 flex items-center px-4 gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Map className="text-space-400" size={20} />
          <h1 className="text-sm font-semibold text-space-100">低空航线走廊空间复核</h1>
        </div>

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-space-500" size={14} />
            <input
              type="text"
              value={searchText}
              onChange={handleSearchChange}
              placeholder="搜索点位名称或ID..."
              className="w-full pl-9 pr-4 py-1.5 bg-space-800 border border-space-700 rounded text-sm text-space-100 placeholder-space-500 focus:outline-none focus:border-space-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setStatusFilter(viewCondition.filters.status ? undefined : ['abnormal'])}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all btn-hover ${
              viewCondition.filters.status?.includes('abnormal')
                ? 'bg-aviation-red text-white'
                : 'bg-space-800 text-space-300 hover:bg-space-700'
            }`}
          >
            <AlertTriangle size={14} />
            异常
            {abnormalCount > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                {abnormalCount}
              </span>
            )}
          </button>

          <button
            onClick={onShowOrphan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-space-800 text-space-300 hover:bg-space-700 transition-all btn-hover"
          >
            <AlertTriangle size={14} className="text-aviation-orange" />
            条件丢失
          </button>
        </div>

        <div className="h-6 w-px bg-space-700" />

        <div className="flex items-center gap-1">
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-space-800 text-space-300 hover:bg-space-700 transition-all btn-hover">
              <Layers size={14} />
              视图预设
            </button>
            <ViewPresetSelector />
          </div>

          <button
            onClick={handleSavePreset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-space-800 text-space-300 hover:bg-space-700 transition-all btn-hover"
            title="保存当前视图"
          >
            <BookmarkPlus size={14} />
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-aviation-blue text-white hover:bg-blue-700 transition-all btn-hover"
          >
            <Download size={14} />
            导出
          </button>

          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-space-800 text-space-300 hover:bg-space-700 transition-all btn-hover"
          >
            <HelpCircle size={14} />
            指引
          </button>
        </div>
      </header>

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出复核结果"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-space-300 mb-2">导出范围</label>
            <div className="space-y-2">
              <button
                onClick={() => handleExport({ format: 'csv', scope: 'all', includeHistory: true })}
                className="w-full text-left px-3 py-2 bg-space-800 hover:bg-space-700 rounded text-sm text-space-200 transition-colors"
              >
                全部点位（含历史记录） - CSV
              </button>
              <button
                onClick={() => handleExport({ format: 'csv', scope: 'abnormal' })}
                className="w-full text-left px-3 py-2 bg-space-800 hover:bg-space-700 rounded text-sm text-space-200 transition-colors"
              >
                仅异常点位 - CSV
              </button>
              <button
                onClick={() => handleExport({ format: 'json', scope: 'all', includeHistory: true })}
                className="w-full text-left px-3 py-2 bg-space-800 hover:bg-space-700 rounded text-sm text-space-200 transition-colors"
              >
                完整数据（含历史记录） - JSON
              </button>
            </div>
          </div>
          <div className="pt-2 border-t border-space-700">
            <p className="text-xs text-space-400">
              导出内容包含点位坐标、状态、来源、备注及完整修改历史
            </p>
          </div>
        </div>
      </Modal>

      <OnboardingGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onGoToSample={goToSample}
        onGoToAbnormal={goToAbnormal}
        onExport={() => {
          setShowGuide(false);
          setShowExportModal(true);
        }}
      />
    </>
  );
}
