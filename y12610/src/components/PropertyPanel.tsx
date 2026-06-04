import { useState, useEffect } from 'react';
import { Settings, Trash2, Copy, Palette, Move, RotateCw, Box, FileText, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import { CanvasElement } from '@/types';

export default function PropertyPanel() {
  const selectedElement = useStore((state) => state.getSelectedElement());
  const updateElement = useStore((state) => state.updateElement);
  const deleteElement = useStore((state) => state.deleteElement);
  const duplicateElement = useStore((state) => state.duplicateElement);
  const saveHistory = useStore((state) => state.saveHistory);
  const currentRecord = useStore((state) => state.getCurrentRecord());
  const updateRecord = useStore((state) => state.updateRecord);
  const validateRecord = useStore((state) => state.validateRecord);

  const [localElement, setLocalElement] = useState<CanvasElement | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    setLocalElement(selectedElement || null);
  }, [selectedElement]);

  useEffect(() => {
    if (currentRecord) {
      setIssues(validateRecord(currentRecord.id));
    }
  }, [currentRecord, validateRecord]);

  const handleChange = (key: keyof CanvasElement, value: string | number) => {
    if (!localElement) return;
    setLocalElement({ ...localElement, [key]: value });
  };

  const handleBlur = () => {
    if (!localElement || !selectedElement) return;
    
    const updates: Partial<CanvasElement> = {};
    (Object.keys(localElement) as Array<keyof CanvasElement>).forEach((key) => {
      if (localElement[key] !== selectedElement[key]) {
        (updates as any)[key] = localElement[key];
      }
    });
    
    if (Object.keys(updates).length > 0) {
      saveHistory();
      updateElement(selectedElement.id, updates);
    }
  };

  const handleColorChange = (key: 'color' | 'strokeColor', value: string) => {
    if (!selectedElement) return;
    saveHistory();
    updateElement(selectedElement.id, { [key]: value });
  };

  const handleRecordChange = (key: 'title' | 'description' | 'remarks', value: string) => {
    if (!currentRecord) return;
    updateRecord(currentRecord.id, { [key]: value });
  };

  if (!currentRecord) {
    return (
      <div className="w-72 bg-slate-50 border-l border-slate-200 flex items-center justify-center">
        <p className="text-slate-400 text-sm">请选择一个记录</p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-50 border-l border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          记录信息
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              标题
            </label>
            <input
              type="text"
              value={currentRecord.title}
              onChange={(e) => handleRecordChange('title', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              描述
            </label>
            <textarea
              value={currentRecord.description}
              onChange={(e) => handleRecordChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              备注
            </label>
            <textarea
              value={currentRecord.remarks}
              onChange={(e) => handleRecordChange('remarks', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="记录备注信息、历史修改等..."
            />
          </div>

          {issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  检测到 {issues.length} 个问题
                </span>
              </div>
              <ul className="text-xs text-red-600 space-y-1">
                {issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {selectedElement && localElement && (
          <>
            <div className="p-4 border-t border-slate-200">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                元素属性
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                类型: {localElement.type}
              </p>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    X 位置
                  </label>
                  <input
                    type="number"
                    value={Math.round(localElement.x)}
                    onChange={(e) => handleChange('x', Number(e.target.value))}
                    onBlur={handleBlur}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    Y 位置
                  </label>
                  <input
                    type="number"
                    value={Math.round(localElement.y)}
                    onChange={(e) => handleChange('y', Number(e.target.value))}
                    onBlur={handleBlur}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Box className="w-3 h-3" />
                    宽度
                  </label>
                  <input
                    type="number"
                    value={Math.round(localElement.width)}
                    onChange={(e) => handleChange('width', Number(e.target.value))}
                    onBlur={handleBlur}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Box className="w-3 h-3" />
                    高度
                  </label>
                  <input
                    type="number"
                    value={Math.round(localElement.height)}
                    onChange={(e) => handleChange('height', Number(e.target.value))}
                    onBlur={handleBlur}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  旋转角度
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={localElement.rotation}
                  onChange={(e) => {
                    handleChange('rotation', Number(e.target.value));
                    handleBlur();
                  }}
                  className="w-full"
                />
                <div className="text-xs text-slate-400 text-center">
                  {Math.round(localElement.rotation)}°
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    填充色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localElement.color}
                      onChange={(e) => handleColorChange('color', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={localElement.color}
                      onChange={(e) => handleColorChange('color', e.target.value)}
                      className="flex-1 px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    边框色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localElement.strokeColor}
                      onChange={(e) => handleColorChange('strokeColor', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={localElement.strokeColor}
                      onChange={(e) => handleColorChange('strokeColor', e.target.value)}
                      className="flex-1 px-2 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  不透明度: {Math.round(localElement.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={localElement.opacity}
                  onChange={(e) => {
                    handleChange('opacity', Number(e.target.value));
                    handleBlur();
                  }}
                  className="w-full"
                />
              </div>

              {localElement.type === 'text' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    文本内容
                  </label>
                  <input
                    type="text"
                    value={localElement.text || ''}
                    onChange={(e) => handleChange('text', e.target.value)}
                    onBlur={handleBlur}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  元素名称
                </label>
                <input
                  type="text"
                  value={localElement.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={handleBlur}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  来源材料
                </label>
                <input
                  type="text"
                  value={localElement.sourceMaterial || ''}
                  onChange={(e) => handleChange('sourceMaterial', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="关联的照片、文件等"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200">
              <div className="flex gap-2">
                <button
                  onClick={() => duplicateElement(selectedElement.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              </div>
            </div>
          </>
        )}

        {!selectedElement && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Settings className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">点击画布中的元素</p>
            <p className="text-xs text-slate-400">查看和编辑属性</p>
          </div>
        )}
      </div>
    </div>
  );
}
