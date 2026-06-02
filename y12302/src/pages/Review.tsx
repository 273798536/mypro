import { useState } from 'react';
import { 
  FileSearch, 
  Layers, 
  Radiation, 
  Image, 
  FileText,
  Link2,
  Clock,
  User,
  ArrowRight,
  Download,
  ChevronRight,
  GitBranch
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate, getSourceColor, getSourceLabel } from '../utils/colorUtils';
import { cn } from '../lib/utils';

type RelationNodeType = 'organ' | 'dose' | 'screenshot' | 'note';

interface RelationNode {
  id: string;
  type: RelationNodeType;
  name: string;
  x: number;
  y: number;
}

interface RelationEdge {
  source: string;
  target: string;
}

export function Review() {
  const { organs, doses, screenshots, notes, logs } = useAppStore();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'relations' | 'logs'>('relations');

  const generateRelations = (): { nodes: RelationNode[]; edges: RelationEdge[] } => {
    const nodes: RelationNode[] = [];
    const edges: RelationEdge[] = [];

    const organY = 80;
    const doseY = 200;
    const screenshotY = 320;
    const noteY = 440;

    organs.forEach((organ, index) => {
      nodes.push({
        id: organ.id,
        type: 'organ',
        name: organ.name,
        x: 100 + index * 150,
        y: organY,
      });

      doses.filter((d) => d.organId === organ.id).forEach((dose) => {
        const doseIndex = doses.findIndex((d) => d.id === dose.id);
        const doseNodeId = `dose-${dose.id}`;
        if (!nodes.find((n) => n.id === doseNodeId)) {
          nodes.push({
            id: doseNodeId,
            type: 'dose',
            name: dose.name,
            x: 100 + doseIndex * 150,
            y: doseY,
          });
        }
        edges.push({ source: organ.id, target: doseNodeId });

        screenshots.forEach((screenshot) => {
          if (screenshot.doseIds.includes(dose.id) || screenshot.organIds.includes(organ.id)) {
            const screenshotIndex = screenshots.findIndex((s) => s.id === screenshot.id);
            const screenshotNodeId = `screenshot-${screenshot.id}`;
            if (!nodes.find((n) => n.id === screenshotNodeId)) {
              nodes.push({
                id: screenshotNodeId,
                type: 'screenshot',
                name: screenshot.name,
                x: 100 + screenshotIndex * 150,
                y: screenshotY,
              });
            }
            if (!edges.find((e) => e.source === doseNodeId && e.target === screenshotNodeId)) {
              edges.push({ source: doseNodeId, target: screenshotNodeId });
            }
          }
        });
      });

      notes.filter((n) => n.organId === organ.id).forEach((note, noteIndex) => {
        const noteNodeId = `note-${note.id}`;
        nodes.push({
          id: noteNodeId,
          type: 'note',
          name: note.author,
          x: 100 + (index + noteIndex) * 150,
          y: noteY,
        });
        edges.push({ source: organ.id, target: noteNodeId });
      });
    });

    return { nodes, edges };
  };

  const { nodes, edges } = generateRelations();

  const getNodeColor = (type: RelationNodeType) => {
    switch (type) {
      case 'organ':
        return '#14b8a6';
      case 'dose':
        return '#f59e0b';
      case 'screenshot':
        return '#3b82f6';
      case 'note':
        return '#8b5cf6';
      default:
        return '#64748b';
    }
  };

  const getNodeIcon = (type: RelationNodeType) => {
    switch (type) {
      case 'organ':
        return Layers;
      case 'dose':
        return Radiation;
      case 'screenshot':
        return Image;
      case 'note':
        return FileText;
      default:
        return FileSearch;
    }
  };

  const getNodeDetails = (nodeId: string) => {
    if (nodeId.startsWith('organ-')) {
      const organ = organs.find((o) => o.id === nodeId);
      if (organ) {
        return {
          type: 'organ' as const,
          title: organ.name,
          items: [
            { label: '版本', value: organ.version },
            { label: '来源', value: getSourceLabel(organ.source), color: getSourceColor(organ.source) },
            { label: '导入者', value: organ.importedBy },
            { label: '位置', value: `(${organ.position.map(p => p.toFixed(1)).join(', ')})` },
          ],
          related: {
            doses: doses.filter((d) => d.organId === organ.id),
            notes: notes.filter((n) => n.organId === organ.id),
            screenshots: screenshots.filter((s) => s.organIds.includes(organ.id)),
          },
        };
      }
    } else if (nodeId.startsWith('dose-')) {
      const doseId = nodeId.replace('dose-', '');
      const dose = doses.find((d) => d.id === doseId);
      if (dose) {
        const organ = organs.find((o) => o.id === dose.organId);
        return {
          type: 'dose' as const,
          title: dose.name,
          items: [
            { label: '版本', value: dose.version },
            { label: '关联器官', value: organ?.name || '未知' },
            { label: '最小剂量', value: `${dose.minDose.toFixed(1)}Gy` },
            { label: '最大剂量', value: `${dose.maxDose.toFixed(1)}Gy` },
            { label: '平均剂量', value: `${dose.meanDose.toFixed(1)}Gy` },
            { label: '阈值', value: `${dose.threshold}Gy` },
          ],
          related: {
            screenshots: screenshots.filter((s) => s.doseIds.includes(doseId)),
          },
        };
      }
    } else if (nodeId.startsWith('screenshot-')) {
      const screenshotId = nodeId.replace('screenshot-', '');
      const screenshot = screenshots.find((s) => s.id === screenshotId);
      if (screenshot) {
        return {
          type: 'screenshot' as const,
          title: screenshot.name,
          items: [
            { label: '创建时间', value: formatDate(screenshot.createTime) },
            { label: '关联器官', value: screenshot.organIds.length + '个' },
            { label: '关联剂量', value: screenshot.doseIds.length + '个' },
            { label: '关联备注', value: screenshot.noteIds.length + '个' },
          ],
          related: {
            organs: organs.filter((o) => screenshot.organIds.includes(o.id)),
            doses: doses.filter((d) => screenshot.doseIds.includes(d.id)),
          },
        };
      }
    } else if (nodeId.startsWith('note-')) {
      const noteId = nodeId.replace('note-', '');
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        const organ = organs.find((o) => o.id === note.organId);
        const dose = doses.find((d) => d.id === note.doseId);
        return {
          type: 'note' as const,
          title: note.author,
          items: [
            { label: '内容', value: note.content },
            { label: '创建时间', value: formatDate(note.createTime) },
            { label: '关联器官', value: organ?.name || '无' },
            { label: '关联剂量', value: dose?.name || '无' },
          ],
          related: {
            tags: note.tags,
          },
        };
      }
    }
    return null;
  };

  const selectedDetails = selectedNode ? getNodeDetails(selectedNode) : null;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">详情复核</h1>
          <p className="text-slate-400 text-sm mt-1">查看器官模型、剂量网格和截图的对应关系</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('relations')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              activeTab === 'relations'
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <GitBranch size={16} />
            关系图谱
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              activeTab === 'logs'
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <Clock size={16} />
            操作日志
          </button>
        </div>
      </div>

      {activeTab === 'relations' ? (
        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          <div className="col-span-2 bg-slate-800/30 rounded-xl border border-slate-700 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">关系图谱</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                  <span className="text-slate-400">器官</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-400">剂量</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-400">截图</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-slate-400">备注</span>
                </div>
              </div>
            </div>

            <div className="relative" style={{ height: '500px', minWidth: '600px' }}>
              <svg className="absolute inset-0 w-full h-full">
                {edges.map((edge, index) => {
                  const sourceNode = nodes.find((n) => n.id === edge.source);
                  const targetNode = nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;
                  return (
                    <line
                      key={index}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="#475569"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                  );
                })}
              </svg>

              {nodes.map((node) => {
                const NodeIcon = getNodeIcon(node.type);
                const isSelected = selectedNode === node.id;
                return (
                  <div
                    key={node.id}
                    className={cn(
                      'absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all',
                      isSelected && 'z-10'
                    )}
                    style={{ left: node.x, top: node.y }}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div
                      className={cn(
                        'flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[100px]',
                        isSelected
                          ? 'border-teal-500 bg-teal-500/20 scale-110'
                          : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
                        style={{ backgroundColor: getNodeColor(node.type) + '30' }}
                      >
                        <NodeIcon size={20} style={{ color: getNodeColor(node.type) }} />
                      </div>
                      <span className="text-white text-xs font-medium text-center truncate max-w-[90px]">
                        {node.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4 overflow-auto">
            <h3 className="font-semibold text-white mb-4">节点详情</h3>
            
            {selectedDetails ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: getNodeColor(selectedDetails.type) + '30' }}
                  >
                    {(() => {
                      const Icon = getNodeIcon(selectedDetails.type);
                      return <Icon size={24} style={{ color: getNodeColor(selectedDetails.type) }} />;
                    })()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{selectedDetails.title}</div>
                    <div className="text-xs text-slate-500 capitalize">{selectedDetails.type}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedDetails.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-slate-400">{item.label}</span>
                      <span className={item.color ? cn('px-2 py-0.5 rounded text-white text-xs', item.color) : 'text-white'}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {'related' in selectedDetails && selectedDetails.related && (
                  <div className="pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-medium text-white mb-3">关联内容</h4>
                    
                    {'doses' in selectedDetails.related && selectedDetails.related.doses.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 mb-1">剂量网格</div>
                        {selectedDetails.related.doses.map((dose) => (
                          <div
                            key={dose.id}
                            className="flex items-center gap-2 p-2 bg-slate-800/50 rounded text-sm cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => setSelectedNode(`dose-${dose.id}`)}
                          >
                            <Radiation size={14} className="text-amber-400" />
                            <span className="text-white flex-1">{dose.name}</span>
                            <ChevronRight size={14} className="text-slate-500" />
                          </div>
                        ))}
                      </div>
                    )}

                    {'screenshots' in selectedDetails.related && selectedDetails.related.screenshots.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-slate-500 mb-1">截图</div>
                        {selectedDetails.related.screenshots.map((screenshot) => (
                          <div
                            key={screenshot.id}
                            className="flex items-center gap-2 p-2 bg-slate-800/50 rounded text-sm cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => setSelectedNode(`screenshot-${screenshot.id}`)}
                          >
                            <Image size={14} className="text-blue-400" />
                            <span className="text-white flex-1 truncate">{screenshot.name}</span>
                            <ChevronRight size={14} className="text-slate-500" />
                          </div>
                        ))}
                      </div>
                    )}

                    {'notes' in selectedDetails.related && selectedDetails.related.notes.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">备注</div>
                        {selectedDetails.related.notes.map((note) => (
                          <div
                            key={note.id}
                            className="flex items-center gap-2 p-2 bg-slate-800/50 rounded text-sm cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => setSelectedNode(`note-${note.id}`)}
                          >
                            <FileText size={14} className="text-purple-400" />
                            <span className="text-white flex-1">{note.author}</span>
                            <ChevronRight size={14} className="text-slate-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Link2 size={48} className="mb-2 opacity-50" />
                <p className="text-sm">点击图谱节点查看详情</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white">操作日志</h3>
          </div>
          <div className="p-4 space-y-3 overflow-auto max-h-[550px]">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {log.type === 'import' && <Download size={14} className="text-teal-400" />}
                  {log.type === 'modify' && <ArrowRight size={14} className="text-amber-400" />}
                  {log.type === 'detect' && <FileSearch size={14} className="text-blue-400" />}
                  {log.type === 'export' && <Download size={14} className="text-green-400" />}
                  {log.type === 'screenshot' && <Image size={14} className="text-purple-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm">{log.description}</span>
                    <span className="text-xs text-slate-500">{formatDate(log.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      {log.userName}
                    </div>
                    {log.organIds.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Layers size={12} />
                        {log.organIds.length}个器官
                      </div>
                    )}
                    {log.doseIds.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Radiation size={12} />
                        {log.doseIds.length}个剂量
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
