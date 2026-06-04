import { useApp } from '../context/AppContext';

export default function LayerPanel() {
  const { layers, toggleLayerVisibility } = useApp();

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'source': return '📊';
      case 'annotation': return '📍';
      case 'result': return '✅';
      case 'review': return '🔍';
      default: return '📁';
    }
  };

  return (
    <div className="p-3 space-y-2">
      {layers.map(layer => (
        <div
          key={layer.id}
          className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleLayerVisibility(layer.id)}
              className="w-5 h-5 flex items-center justify-center text-sm"
              title={layer.visible ? '隐藏图层' : '显示图层'}
            >
              {layer.visible ? '👁️' : '👁️‍🗨️'}
            </button>
            <span className="text-sm">{getLayerIcon(layer.type)}</span>
            <span className={`text-sm ${layer.visible ? 'text-gray-800' : 'text-gray-400'}`}>
              {layer.name}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {layer.locked && (
              <span className="text-xs text-gray-400" title="已锁定">🔒</span>
            )}
            <span className="text-xs text-gray-400">
              {layer.dataRefs.length}项
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
