import { useState } from 'react';
import { Plus, Trash2, Edit2, Ban, Check, ChevronDown, ChevronRight, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import { NetworkNode, NetworkEdge, DemandPoint, Anomaly } from '../types';
import { getSeverityColor } from '../utils/anomalyDetector';

export function Sidebar() {
  const {
    currentScenario,
    selectedNodeId,
    selectedEdgeId,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    toggleEdgeDisabled,
    addDemand,
    updateDemand,
    deleteDemand,
    setSelectedNode,
    setSelectedEdge
  } = useNetworkStore();

  const [expandedSections, setExpandedSections] = useState({
    nodes: true,
    edges: true,
    demands: true,
    anomalies: true
  });

  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<string | null>(null);
  const [editingDemand, setEditingDemand] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddNode = () => {
    addNode({ name: '新节点', type: 'warehouse' });
  };

  const handleAddEdge = () => {
    if (currentScenario.nodes.length >= 2) {
      addEdge({
        from: currentScenario.nodes[0].id,
        to: currentScenario.nodes[1].id,
        capacity: 100,
        bidirectional: false
      });
    }
  };

  const handleAddDemand = () => {
    if (currentScenario.nodes.length > 0) {
      addDemand({
        nodeId: currentScenario.nodes[0].id,
        amount: 50,
        type: 'supply'
      });
    }
  };

  const anomalies: Anomaly[] = currentScenario.lastAnalysis?.anomalies || [];

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 节点列表 */}
        <div>
          <div
            className="flex items-center justify-between cursor-pointer mb-2"
            onClick={() => toggleSection('nodes')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.nodes ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-slate-700">节点 ({currentScenario.nodes.length})</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleAddNode(); }}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <Plus className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          {expandedSections.nodes && (
            <div className="space-y-1">
              {currentScenario.nodes.map(node => (
                <NodeItem
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  isEditing={editingNode === node.id}
                  onSelect={() => setSelectedNode(node.id)}
                  onEdit={() => setEditingNode(node.id)}
                  onSave={(updates) => {
                    updateNode(node.id, updates);
                    setEditingNode(null);
                  }}
                  onDelete={() => deleteNode(node.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 线路列表 */}
        <div>
          <div
            className="flex items-center justify-between cursor-pointer mb-2"
            onClick={() => toggleSection('edges')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.edges ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-slate-700">线路 ({currentScenario.edges.length})</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleAddEdge(); }}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <Plus className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          {expandedSections.edges && (
            <div className="space-y-1">
              {currentScenario.edges.map(edge => (
                <EdgeItem
                  key={edge.id}
                  edge={edge}
                  nodes={currentScenario.nodes}
                  isSelected={selectedEdgeId === edge.id}
                  isEditing={editingEdge === edge.id}
                  onSelect={() => setSelectedEdge(edge.id)}
                  onEdit={() => setEditingEdge(edge.id)}
                  onSave={(updates) => {
                    updateEdge(edge.id, updates);
                    setEditingEdge(null);
                  }}
                  onDelete={() => deleteEdge(edge.id)}
                  onToggleDisabled={(reason) => toggleEdgeDisabled(edge.id, reason)}
                  flow={currentScenario.lastAnalysis?.edgeFlows[edge.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* 供需点列表 */}
        <div>
          <div
            className="flex items-center justify-between cursor-pointer mb-2"
            onClick={() => toggleSection('demands')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.demands ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-slate-700">供需点 ({currentScenario.demands.length})</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleAddDemand(); }}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <Plus className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          
          {expandedSections.demands && (
            <div className="space-y-1">
              {currentScenario.demands.map(demand => (
                <DemandItem
                  key={demand.id}
                  demand={demand}
                  nodes={currentScenario.nodes}
                  isEditing={editingDemand === demand.id}
                  onEdit={() => setEditingDemand(demand.id)}
                  onSave={(updates) => {
                    updateDemand(demand.id, updates);
                    setEditingDemand(null);
                  }}
                  onDelete={() => deleteDemand(demand.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 异常列表 */}
        {anomalies.length > 0 && (
          <div>
            <div
              className="flex items-center justify-between cursor-pointer mb-2"
              onClick={() => toggleSection('anomalies')}
            >
              <div className="flex items-center gap-2">
                {expandedSections.anomalies ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-semibold text-slate-700">异常检测 ({anomalies.length})</span>
              </div>
            </div>
            
            {expandedSections.anomalies && (
              <div className="space-y-2">
                {anomalies.map((anomaly, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border text-sm ${getSeverityColor(anomaly.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getAnomalyIcon(anomaly.severity)}
                      <div>
                        <p className="font-medium">{anomaly.message}</p>
                        <p className="text-xs mt-1 opacity-80">{anomaly.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface NodeItemProps {
  node: NetworkNode;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<NetworkNode>) => void;
  onDelete: () => void;
}

function NodeItem({ node, isSelected, isEditing, onSelect, onEdit, onSave, onDelete }: NodeItemProps) {
  const [name, setName] = useState(node.name);
  const [type, setType] = useState(node.type);

  const nodeTypeColors: Record<string, string> = {
    warehouse: 'bg-blue-500',
    transit: 'bg-purple-500',
    destination: 'bg-emerald-500',
    source: 'bg-amber-500'
  };

  return (
    <div
      className={`p-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
      }`}
      onClick={onSelect}
    >
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-2 py-1 border rounded text-sm"
          >
            <option value="warehouse">仓库</option>
            <option value="transit">中转站</option>
            <option value="destination">目的地</option>
            <option value="source">供应源</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={() => onSave({ name, type })}
              className="flex-1 p-1 bg-green-500 text-white rounded text-xs"
            >
              <Check className="w-3 h-3 mx-auto" />
            </button>
            <button
              onClick={onDelete}
              className="flex-1 p-1 bg-red-500 text-white rounded text-xs"
            >
              <Trash2 className="w-3 h-3 mx-auto" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${nodeTypeColors[node.type]}`} />
            <span className="text-sm text-slate-700 truncate max-w-24">{node.name}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}

interface EdgeItemProps {
  edge: NetworkEdge;
  nodes: NetworkNode[];
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onSave: (updates: Partial<NetworkEdge>) => void;
  onDelete: () => void;
  onToggleDisabled: (reason?: string) => void;
  flow?: number;
}

function EdgeItem({ edge, nodes, isSelected, isEditing, onSelect, onEdit, onSave, onDelete, onToggleDisabled, flow }: EdgeItemProps) {
  const [capacity, setCapacity] = useState(edge.capacity);
  const [bidirectional, setBidirectional] = useState(edge.bidirectional || false);

  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);

  return (
    <div
      className={`p-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
      } ${edge.disabled ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">容量:</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={bidirectional}
              onChange={(e) => setBidirectional(e.target.checked)}
            />
            双向
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => onSave({ capacity, bidirectional })}
              className="flex-1 p-1 bg-green-500 text-white rounded text-xs"
            >
              <Check className="w-3 h-3 mx-auto" />
            </button>
            <button
              onClick={() => onToggleDisabled()}
              className={`flex-1 p-1 ${edge.disabled ? 'bg-green-500' : 'bg-yellow-500'} text-white rounded text-xs`}
            >
              {edge.disabled ? <Check className="w-3 h-3 mx-auto" /> : <Ban className="w-3 h-3 mx-auto" />}
            </button>
            <button
              onClick={onDelete}
              className="flex-1 p-1 bg-red-500 text-white rounded text-xs"
            >
              <Trash2 className="w-3 h-3 mx-auto" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-slate-600 truncate">
              {fromNode?.name} → {toNode?.name}
            </div>
            <div className="text-xs text-slate-400">
              {flow !== undefined ? `${flow}/${edge.capacity}` : `容量: ${edge.capacity}`}
              {edge.bidirectional && ' ↔'}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}

interface DemandItemProps {
  demand: DemandPoint;
  nodes: NetworkNode[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<DemandPoint>) => void;
  onDelete: () => void;
}

function DemandItem({ demand, nodes, isEditing, onEdit, onSave, onDelete }: DemandItemProps) {
  const [amount, setAmount] = useState(demand.amount);
  const [type, setType] = useState(demand.type);

  const node = nodes.find(n => n.id === demand.nodeId);

  return (
    <div className="p-2 rounded hover:bg-slate-50">
      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">数量:</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-2 py-1 border rounded text-sm"
          >
            <option value="supply">供应</option>
            <option value="demand">需求</option>
          </select>
          <div className="flex gap-1">
            <button
              onClick={() => onSave({ amount, type })}
              className="flex-1 p-1 bg-green-500 text-white rounded text-xs"
            >
              <Check className="w-3 h-3 mx-auto" />
            </button>
            <button
              onClick={onDelete}
              className="flex-1 p-1 bg-red-500 text-white rounded text-xs"
            >
              <Trash2 className="w-3 h-3 mx-auto" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-slate-600">
              {node?.name}
            </div>
            <div className={`text-xs ${type === 'supply' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {type === 'supply' ? '供应' : '需求'}: {amount}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 hover:bg-slate-200 rounded"
          >
            <Edit2 className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}
