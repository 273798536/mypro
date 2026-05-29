import React from 'react';
import { useAppStore, storeActions } from '../../store/appStore';
import {
  Pencil,
  Trash2,
  RotateCcw,
  Play,
  Square,
  Plus,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { validatePath } from '../../utils/math/geometry';
import { samplePaths } from '../../data/vectorFields';

interface PathEditorProps {
  pathIndex: 0 | 1;
  pathLabel: 'A' | 'B';
}

const PathEditor: React.FC<PathEditorProps> = ({ pathIndex, pathLabel }) => {
  const path = useAppStore((state) => state.paths[pathIndex]);
  const activeField = useAppStore((state) =>
    state.vectorFields.find((f) => f.id === state.activeFieldId)
  );
  const selectedPathForDrawing = useAppStore(
    (state) => state.selectedPathForDrawing
  );
  const isDrawing = useAppStore((state) => state.isDrawing);
  const settings = useAppStore((state) => state.settings);

  const isSelected = selectedPathForDrawing === pathLabel;
  const isActive = isSelected && isDrawing;

  const validation = React.useMemo(() => {
    if (!activeField || path.nodes.length < 2) return null;
    return validatePath(path.nodes, activeField.bounds, path.sampleStep);
  }, [path.nodes, path.sampleStep, activeField]);

  const handleToggleDraw = () => {
    if (isActive) {
      storeActions.setDrawingMode(false);
    } else {
      storeActions.selectPathForDrawing(pathLabel);
      storeActions.setDrawingMode(true);
    }
  };

  const handleClear = () => {
    storeActions.clearPath(path.id);
  };

  const handleReverse = () => {
    storeActions.reversePathDirection(path.id);
  };

  const handleStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = parseFloat(e.target.value);
    storeActions.setPathSampleStep(path.id, step);
  };

  const loadSamplePath = (sampleKey: keyof typeof samplePaths) => {
    const sample = samplePaths[sampleKey];
    storeActions.clearPath(path.id);
    sample.nodes.forEach((node) => {
      storeActions.addNodeToPath(path.id, node.x, node.y);
    });
  };

  const nodeCount = path.nodes.length;
  const pathColor = path.color;

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        isActive
          ? 'border-blue-400 bg-blue-50'
          : isSelected
          ? 'border-gray-300 bg-gray-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: pathColor }}
          />
          <span className="font-semibold text-gray-800">
            路径 {pathLabel}
          </span>
          <span className="text-sm text-gray-500">({nodeCount} 个节点)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleDraw}
            className={`p-2 rounded-lg transition-all ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isActive ? '停止绘制' : '开始绘制'}
          >
            {isActive ? <Square className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
          <button
            onClick={handleReverse}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="反转方向"
            disabled={nodeCount < 2}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="清除路径"
            disabled={nodeCount === 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isActive && (
        <div className="mb-3 p-2 bg-blue-100 text-blue-700 text-sm rounded-lg flex items-center gap-2">
          <Play className="w-4 h-4" />
          点击画布添加节点，双击删除节点
        </div>
      )}

      {validation && (
        <div className="mb-3 space-y-2">
          {validation.suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 text-amber-700"
            >
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{suggestion}</span>
            </div>
          ))}
          {validation.suggestions.length === 0 && (
            <div className="flex items-center gap-2 text-xs p-2 rounded bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3" />
              路径验证通过
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            采样步长: {path.sampleStep.toFixed(3)}
          </label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={path.sampleStep}
            onChange={handleStepChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>精细 (0.01)</span>
            <span>粗略 (1.0)</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            快速加载样例路径
          </label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => loadSamplePath('straightLine')}
              className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              直线
            </button>
            <button
              onClick={() => loadSamplePath('curvedPath')}
              className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              曲线
            </button>
            <button
              onClick={() => loadSamplePath('clockwiseCircle')}
              className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              顺时针环
            </button>
            <button
              onClick={() => loadSamplePath('counterClockwiseCircle')}
              className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              逆时针环
            </button>
            <button
              onClick={() => loadSamplePath('selfIntersecting')}
              className="px-2 py-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 rounded transition-colors"
            >
              自交路径 ⚠️
            </button>
            <button
              onClick={() => loadSamplePath('largeStepPath')}
              className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              粗略采样
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathEditor;
