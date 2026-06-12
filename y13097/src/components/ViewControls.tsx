import { useState } from 'react';
import type { ViewState, LayerType, CollisionStatus } from '../types';
import {
  Eye,
  EyeOff,
  Save,
  Trash2,
  Layers,
  Camera,
  Plus,
  X,
  Check,
} from 'lucide-react';

interface ViewControlsProps {
  visibleLayers: LayerType[];
  onToggleLayer: (layer: LayerType) => void;
  viewStates: ViewState[];
  currentView: Omit<ViewState, 'id' | 'name' | 'createdAt'>;
  onSaveView: (name: string) => void;
  onLoadView: (viewState: ViewState) => void;
  onDeleteView: (viewId: string) => void;
  filterStatus: CollisionStatus[];
}

const LAYER_INFO: { key: LayerType; label: string; color: string }[] = [
  { key: 'corridor', label: '航线走廊', color: '#64b5f6' },
  { key: 'buildings', label: '建筑物', color: '#ff9f43' },
  { key: 'towers', label: '塔类', color: '#ee5253' },
  { key: 'mountains', label: '山体', color: '#10ac84' },
  { key: 'power_lines', label: '电力线', color: '#5f27cd' },
  { key: 'annotations', label: '标注', color: '#8395a7' },
];

export default function ViewControls({
  visibleLayers,
  onToggleLayer,
  viewStates,
  currentView,
  onSaveView,
  onLoadView,
  onDeleteView,
  filterStatus,
}: ViewControlsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  function handleSave() {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setShowSaveDialog(false);
      setNewViewName('');
    }
  }

  return (
    <div className="view-controls">
      <div className="control-section">
        <div className="section-header">
          <Layers size={16} />
          <span>图层控制</span>
        </div>
        <div className="layer-list">
          {LAYER_INFO.map((layer) => {
            const isVisible = visibleLayers.includes(layer.key);
            return (
              <button
                key={layer.key}
                className={`layer-item ${isVisible ? 'visible' : 'hidden'}`}
                onClick={() => onToggleLayer(layer.key)}
              >
                <span
                  className="layer-color"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="layer-label">{layer.label}</span>
                {isVisible ? (
                  <Eye size={14} className="layer-icon" />
                ) : (
                  <EyeOff size={14} className="layer-icon" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="control-section">
        <div className="section-header">
          <Camera size={16} />
          <span>保存的视图</span>
          {!showSaveDialog && (
            <button
              className="add-view-btn"
              onClick={() => setShowSaveDialog(true)}
              title="保存当前视图"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {showSaveDialog && (
          <div className="save-view-dialog">
            <input
              type="text"
              placeholder="视图名称..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="dialog-actions">
              <button onClick={handleSave} className="btn-primary">
                <Check size={14} />
                保存
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewViewName('');
                }}
                className="btn-secondary"
              >
                <X size={14} />
                取消
              </button>
            </div>
            <div className="view-preview-info">
              <div>将保存：</div>
              <ul>
                <li>缩放比例：{(currentView.zoom * 100).toFixed(0)}%</li>
                <li>
                  可见图层：{currentView.visibleLayers.length} 个
                </li>
                <li>
                  状态筛选：
                  {filterStatus.length === 0
                    ? '全部'
                    : filterStatus.join(', ')}
                </li>
                {currentView.selectedObjectId && (
                  <li>选中对象：是</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="saved-views">
          {viewStates.length === 0 ? (
            <div className="empty-views">
              <Camera size={24} color="#ccc" />
              <p>暂无保存的视图</p>
              <p className="hint">点击 + 保存当前视图</p>
            </div>
          ) : (
            viewStates.map((view) => (
              <div key={view.id} className="saved-view-item">
                <button
                  className="view-load-btn"
                  onClick={() => onLoadView(view)}
                >
                  <Save size={14} />
                  <span className="view-name">{view.name}</span>
                </button>
                <button
                  className="view-delete-btn"
                  onClick={() => onDeleteView(view.id)}
                  title="删除视图"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
