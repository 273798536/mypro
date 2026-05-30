import { Info, Route, Clock, MapPin, AlertTriangle, Wrench } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const InfoPanel = () => {
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    plannedPath,
    workOrders,
    setSelectedNode,
    setSelectedEdge
  } = useAppStore();
  
  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const selectedEdgeData = edges.find(e => e.id === selectedEdge);
  
  const nodeWorkOrders = workOrders.filter(wo => wo.locationId === selectedNode && wo.status !== 'completed');
  
  const getNodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      entrance: '入口',
      equipment_room: '设备房',
      pipe_well: '管井',
      junction: '交叉口',
      stairwell: '楼梯间',
      corridor: '连廊'
    };
    return labels[type] || type;
  };
  
  const getPathStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      open: { text: '畅通', color: 'text-green-400' },
      closed: { text: '封闭', color: 'text-red-400' },
      access_issue: { text: '门禁异常', color: 'text-amber-400' },
      under_maintenance: { text: '维护中', color: 'text-purple-400' }
    };
    return labels[status] || { text: status, color: 'text-slate-400' };
  };
  
  const getPathSteps = () => {
    if (!plannedPath || plannedPath.nodes.length < 2) return [];
    
    const steps = [];
    for (let i = 0; i < plannedPath.nodes.length; i++) {
      const nodeId = plannedPath.nodes[i];
      const node = nodes.find(n => n.id === nodeId);
      const edge = i < plannedPath.edges.length 
        ? edges.find(e => e.id === plannedPath.edges[i])
        : null;
      
      if (node) {
        steps.push({
          node,
          edge,
          isStart: i === 0,
          isEnd: i === plannedPath.nodes.length - 1
        });
      }
    }
    return steps;
  };
  
  return (
    <div className="w-80 bg-slate-900 text-white flex flex-col h-full border-l border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          导览信息
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plannedPath && plannedPath.nodes.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <Route className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold">规划路径</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-slate-400">总距离</p>
                <p className="text-lg font-bold text-blue-400">{plannedPath.totalDistance}m</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-xs text-slate-400">预计时间</p>
                <p className="text-lg font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {plannedPath.estimatedTime}s
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400">路径步骤：</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {getPathSteps().map((step, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedNode(step.node.id)}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${step.isStart ? 'bg-green-600' : step.isEnd ? 'bg-red-600' : 'bg-slate-600'}
                    `}>
                      {step.isStart ? '起' : step.isEnd ? '终' : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{step.node.name}</p>
                      <p className="text-xs text-slate-400">{getNodeTypeLabel(step.node.type)}</p>
                    </div>
                    {step.edge && (
                      <span className={`text-xs ${getPathStatusLabel(step.edge.status).color}`}>
                        {getPathStatusLabel(step.edge.status).text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {selectedNodeData && (
          <div className="bg-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">节点详情</h3>
            </div>
            
            <div>
              <p className="text-lg font-bold">{selectedNodeData.name}</p>
              <p className="text-sm text-slate-400">{getNodeTypeLabel(selectedNodeData.type)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">楼层</p>
                <p>B{Math.abs(selectedNodeData.floor)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">坐标</p>
                <p>({selectedNodeData.x}, {selectedNodeData.y})</p>
              </div>
            </div>
            
            {selectedNodeData.building && (
              <div>
                <p className="text-xs text-slate-500">所属建筑</p>
                <p>{selectedNodeData.building}</p>
              </div>
            )}
            
            {selectedNodeData.description && (
              <div>
                <p className="text-xs text-slate-500">描述</p>
                <p className="text-sm">{selectedNodeData.description}</p>
              </div>
            )}
            
            {nodeWorkOrders.length > 0 && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  相关工单
                </p>
                <div className="space-y-2">
                  {nodeWorkOrders.map(wo => (
                    <div key={wo.id} className="bg-amber-900/30 border border-amber-700/50 rounded p-2">
                      <p className="text-sm font-medium text-amber-300">{wo.title}</p>
                      <p className="text-xs text-amber-400/70">{wo.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {selectedEdgeData && (
          <div className="bg-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <Route className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold">通道详情</h3>
            </div>
            
            <div>
              <p className="text-lg font-bold">{selectedEdgeData.description || '连廊通道'}</p>
              <p className={`text-sm ${getPathStatusLabel(selectedEdgeData.status).color}`}>
                状态: {getPathStatusLabel(selectedEdgeData.status).text}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">距离</p>
                <p>{selectedEdgeData.distance}m</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">门禁</p>
                <p>{selectedEdgeData.accessControl ? '有' : '无'}</p>
              </div>
            </div>
            
            {selectedEdgeData.status !== 'open' && (
              <div className="bg-red-900/30 border border-red-700/50 rounded p-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  此通道{selectedEdgeData.status === 'closed' ? '已封闭' : '存在门禁问题'}，请绕行
                </p>
              </div>
            )}
          </div>
        )}
        
        {!selectedNodeData && !selectedEdgeData && !plannedPath && (
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <Info className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              点击3D模型中的节点或通道查看详情
            </p>
            <p className="text-slate-500 text-xs mt-2">
              或使用左侧控制面板进行路径规划
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;
