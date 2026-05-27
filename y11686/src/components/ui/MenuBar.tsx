import { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Upload,
  Camera,
  HelpCircle,
  ChevronDown,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  History,
} from 'lucide-react';
import { useStore } from '@/store';
import { downloadFile, readFileAsText, formatDateTime } from '@/utils/helpers';
import type { ScenarioRecord } from '@/types';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  submenu?: MenuItem[];
  divider?: boolean;
}

export function MenuBar() {
  const {
    currentScenario,
    scenarios,
    createNewScenario,
    loadScenario,
    saveScenario,
    deleteScenario,
    exportScene,
    importScene,
  } = useStore();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [newScenarioType, setNewScenarioType] = useState<'normal' | 'boundary' | 'error'>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const json = exportScene();
    if (json) {
      downloadFile(json, `${currentScenario?.name || 'scene'}.json`, 'application/json');
    }
  };

  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await readFileAsText(file);
      importScene(text);
    }
    e.target.value = '';
  };

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentScenario?.name || 'screenshot'}_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  const handleCreateScenario = () => {
    if (newScenarioName.trim()) {
      createNewScenario(newScenarioName.trim(), newScenarioDesc.trim(), newScenarioType);
      setShowNewScenario(false);
      setNewScenarioName('');
      setNewScenarioDesc('');
    }
  };

  const fileMenu: MenuItem[] = [
    { label: '新建场景', icon: Plus, onClick: () => setShowNewScenario(true) },
    { label: '打开场景', icon: FolderOpen, submenu: scenarios.map((s) => ({
      label: s.name,
      icon: FileText,
      onClick: () => loadScenario(s.id),
    })) },
    { label: '保存场景', icon: Save, onClick: saveScenario, divider: true },
    { label: '导出 JSON', icon: Download, onClick: handleExportJSON },
    { label: '导入 JSON', icon: Upload, onClick: handleImportJSON },
  ];

  const scenarioTypeColors = {
    normal: 'bg-green-500',
    boundary: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
        <div className="panel px-2 flex items-center gap-1">
          <div className="relative">
            <button
              className="px-4 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            >
              <FileText size={16} />
              文件
              <ChevronDown size={14} />
            </button>
            {openMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1 panel min-w-48 py-1 z-50">
                {fileMenu.map((item, index) => (
                  <div key={index}>
                    {item.divider && <div className="border-t border-white/10 my-1" />}
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                      onClick={() => {
                        item.onClick?.();
                        setOpenMenu(null);
                      }}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="px-4 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
            onClick={handleScreenshot}
            title="截图"
          >
            <Camera size={16} />
            截图
          </button>

          <button
            className="px-4 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
            onClick={() => setShowHistory(!showHistory)}
            title="历史记录"
          >
            <History size={16} />
            历史
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" />

          {currentScenario && (
            <div className="flex items-center gap-2 px-3 py-1">
              <div className={`w-2 h-2 rounded-full ${scenarioTypeColors[currentScenario.type]}`} />
              <span className="text-sm">{currentScenario.name}</span>
              <span className="text-xs text-white/50">
                更新于 {formatDateTime(currentScenario.modifiedAt)}
              </span>
            </div>
          )}

          <div className="w-px h-6 bg-white/10 mx-2" />

          <button
            className="px-4 py-2 text-sm hover:bg-white/10 rounded-lg flex items-center gap-2 transition-colors"
            title="帮助"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {showNewScenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel w-96">
            <div className="panel-header">新建场景</div>
            <div className="panel-content space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">场景名称</label>
                <input
                  type="text"
                  className="input-number"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="请输入场景名称"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">场景描述</label>
                <textarea
                  className="input-number h-20 resize-none"
                  value={newScenarioDesc}
                  onChange={(e) => setNewScenarioDesc(e.target.value)}
                  placeholder="请输入场景描述（可选）"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">场景类型</label>
                <div className="flex gap-2">
                  {(['normal', 'boundary', 'error'] as const).map((type) => (
                    <button
                      key={type}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        newScenarioType === type
                          ? 'bg-primary-600 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                      onClick={() => setNewScenarioType(type)}
                    >
                      {type === 'normal' ? '正常' : type === 'boundary' ? '边界' : '错误'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowNewScenario(false)}
                >
                  取消
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleCreateScenario}
                  disabled={!newScenarioName.trim()}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && currentScenario && (
        <div className="fixed right-4 top-20 w-80 panel z-50">
          <div className="panel-header flex items-center justify-between">
            修订历史
            <button
              className="p-1 hover:bg-white/10 rounded"
              onClick={() => setShowHistory(false)}
            >
              ×
            </button>
          </div>
          <div className="panel-content max-h-96 overflow-y-auto">
            {currentScenario.revisionHistory.length === 0 ? (
              <p className="text-sm text-white/50 text-center py-4">暂无修订记录</p>
            ) : (
              <div className="space-y-3">
                {[...currentScenario.revisionHistory].reverse().map((entry, index) => (
                  <div key={index} className="pb-3 border-b border-white/10 last:border-b-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{entry.action}</span>
                      <span className="text-xs text-white/50">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-white/70">{entry.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
