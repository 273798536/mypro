import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize, RotateCcw, Filter, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { RecordStatus, RecordType } from '../../types';
import { useState } from 'react';
import { getStatusLabel, getTypeLabel } from '../../utils/coordinateUtils';

export default function CanvasToolbar() {
  const { zoom, setZoom, undo, redo, canUndo, canRedo, filterOptions, setFilter, resetToSample } = useAppStore();
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
      <div className="flex items-center gap-1 pr-4 border-r border-gray-200">
        <button
          onClick={() => undo()}
          disabled={!canUndo()}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="撤销"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => redo()}
          disabled={!canRedo()}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="重做"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 pr-4 border-r border-gray-200">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[52px] text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
          title="重置视图"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
            Object.keys(filterOptions).length > 0 && filterOptions.constructor === Object
              ? (filterOptions.status || filterOptions.type || filterOptions.isFlipped !== undefined || filterOptions.searchText)
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Filter className="w-4 h-4" />
          筛选
          {(filterOptions.status || filterOptions.type || filterOptions.isFlipped !== undefined) && (
            <span className="w-2 h-2 rounded-full bg-white" />
          )}
        </button>

        {showFilter && (
          <div className="absolute top-full left-0 mt-2 w-72 card p-4 z-20 animate-slide-up shadow-hover">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-800">筛选条件</h4>
              <button onClick={() => setShowFilter(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
                <select
                  className="input-field"
                  value={filterOptions.status || ''}
                  onChange={(e) => setFilter({ status: (e.target.value as RecordStatus) || undefined })}
                >
                  <option value="">全部状态</option>
                  <option value="success">{getStatusLabel('success')}</option>
                  <option value="pending">{getStatusLabel('pending')}</option>
                  <option value="error">{getStatusLabel('error')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">类型</label>
                <select
                  className="input-field"
                  value={filterOptions.type || ''}
                  onChange={(e) => setFilter({ type: (e.target.value as RecordType) || undefined })}
                >
                  <option value="">全部类型</option>
                  <option value="guide">{getTypeLabel('guide')}</option>
                  <option value="warning">{getTypeLabel('warning')}</option>
                  <option value="info">{getTypeLabel('info')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">坐标翻转</label>
                <select
                  className="input-field"
                  value={filterOptions.isFlipped === undefined ? '' : String(filterOptions.isFlipped)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilter({ isFlipped: v === '' ? undefined : v === 'true' });
                  }}
                >
                  <option value="">全部</option>
                  <option value="true">仅翻转</option>
                  <option value="false">仅正常</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">搜索</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="搜索标签或备注..."
                  value={filterOptions.searchText || ''}
                  onChange={(e) => setFilter({ searchText: e.target.value || undefined })}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() =>
                  setFilter({
                    status: undefined,
                    type: undefined,
                    isFlipped: undefined,
                    searchText: undefined,
                  })
                }
                className="btn-ghost flex-1 text-xs"
              >
                清除筛选
              </button>
              <button onClick={() => setShowFilter(false)} className="btn-primary flex-1 text-xs">
                确定
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={resetToSample}
        className="btn-secondary text-xs"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        重置样例
      </button>
    </div>
  );
}
