import { MapPin, Navigation, Filter, Search, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const ControlPanel = () => {
  const {
    nodes,
    startNode,
    endNode,
    setStartNode,
    setEndNode,
    setPlannedPath,
    filters,
    setFilter,
    findPath
  } = useAppStore();
  
  const entrances = nodes.filter(n => n.type === 'entrance');
  const equipmentRooms = nodes.filter(n => n.type === 'equipment_room');
  const pipeWells = nodes.filter(n => n.type === 'pipe_well');
  const otherNodes = nodes.filter(n => !['entrance', 'equipment_room', 'pipe_well'].includes(n.type));
  
  const handleFindPath = () => {
    findPath();
  };
  
  const clearPath = () => {
    setStartNode(null);
    setEndNode(null);
    setPlannedPath(null);
  };
  
  return (
    <div className="w-72 bg-slate-900 text-white flex flex-col h-full border-r border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-400" />
          控制面板
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            路径规划
          </h3>
          
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">起点</label>
              <select
                value={startNode || ''}
                onChange={(e) => setStartNode(e.target.value || null)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">选择起点...</option>
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">终点</label>
              <select
                value={endNode || ''}
                onChange={(e) => setEndNode(e.target.value || null)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">选择终点...</option>
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleFindPath}
                disabled={!startNode || !endNode}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                规划路径
              </button>
              <button
                onClick={clearPath}
                className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            显示筛选
          </h3>
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showClosedPaths}
                onChange={(e) => setFilter('showClosedPaths', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-slate-300">显示封闭通道</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showAccessIssues}
                onChange={(e) => setFilter('showAccessIssues', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-300">显示门禁异常</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showAnomalies}
                onChange={(e) => setFilter('showAnomalies', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-slate-300">显示异常标记</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showWorkOrders}
                onChange={(e) => setFilter('showWorkOrders', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-300">显示维修工单</span>
            </label>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">快速导航</h3>
          
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">入口</p>
              <div className="flex flex-wrap gap-1">
                {entrances.map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (!startNode) setStartNode(node.id);
                      else if (!endNode) setEndNode(node.id);
                    }}
                    className="bg-green-900/50 hover:bg-green-800/50 text-green-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 mb-1">设备房</p>
              <div className="flex flex-wrap gap-1">
                {equipmentRooms.map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (!startNode) setStartNode(node.id);
                      else if (!endNode) setEndNode(node.id);
                    }}
                    className="bg-indigo-900/50 hover:bg-indigo-800/50 text-indigo-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 mb-1">管井</p>
              <div className="flex flex-wrap gap-1">
                {pipeWells.map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (!startNode) setStartNode(node.id);
                      else if (!endNode) setEndNode(node.id);
                    }}
                    className="bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400">
            <span className="text-blue-400 font-medium">提示：</span>
            双击3D模型中的节点可快速设置起点/终点
          </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
