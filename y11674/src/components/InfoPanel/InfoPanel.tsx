import { Info, Users, Phone, Monitor, Shield, FileText, ClipboardList, AlertTriangle, Clock, User, Database, GitBranch, X, Route } from 'lucide-react';
import { useNetworkStore } from '../../store/useNetworkStore';
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, RELATION_TYPE_LABELS } from '../../types';
import type { NetworkNode, CustomerNode, PhoneNode, DeviceNode, GuarantorNode, LoanNode, InvestigationNode } from '../../types';

export function InfoPanel() {
  const {
    selectedNode, selectedPath, pathStartNode, nodes, edges, operationHistory, setPathStartNode } = useNetworkStore();

  const node = selectedNode ? nodes.find(n => n.id === selectedNode) : null;
  const pathNodes = selectedPath.map(id => nodes.find(n => n.id === id)).filter(Boolean);

  const relatedEdges = node
    ? edges.filter(e => e.source === node.id || e.target === node.id)
    : [];

  const getNodeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      customer: <Users size={16} />,
      phone: <Phone size={16} />,
      device: <Monitor size={16} />,
      guarantor: <Shield size={16} />,
      loan: <FileText size={16} />,
      investigation: <ClipboardList size={16} />,
    };
    return icons[type] || <Info size={16} />;
  };

  const renderNodeDetails = (node: NetworkNode) => {
    type DetailField = { label: string; value: string; color?: string };
    const baseFields: DetailField[] = [
      { label: '节点类型', value: NODE_TYPE_LABELS[node.type] },
      { label: '风险等级', value: RISK_LEVEL_LABELS[node.riskLevel], color: RISK_LEVEL_COLORS[node.riskLevel] },
      { label: '数据来源', value: node.source },
      { label: '创建时间', value: new Date(node.createdAt).toLocaleString('zh-CN') },
    ];

    const typeSpecificFields: DetailField[] = [];

    if (node.type === 'customer') {
      const cust = node as CustomerNode;
      typeSpecificFields.push({ label: '身份证号', value: cust.idCard.replace(/(.{6}).+(.{4})/, '$1********$2') });
      if (cust.phone) {
        typeSpecificFields.push({ label: '联系电话', value: cust.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') });
      }
    } else if (node.type === 'phone') {
      const phone = node as PhoneNode;
      typeSpecificFields.push({ label: '手机号', value: phone.number.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') });
      typeSpecificFields.push({ label: '运营商', value: phone.carrier });
    } else if (node.type === 'device') {
      const device = node as DeviceNode;
      typeSpecificFields.push({ label: '设备ID', value: device.deviceId });
      typeSpecificFields.push({ label: '设备类型', value: device.deviceType });
      typeSpecificFields.push({ label: 'IP地址', value: device.ipAddress });
    } else if (node.type === 'guarantor') {
      const guar = node as GuarantorNode;
      typeSpecificFields.push({ label: '身份证号', value: guar.idCard.replace(/(.{6}).+(.{4})/, '$1********$2') });
      typeSpecificFields.push({ label: '与客户关系', value: guar.relation });
    } else if (node.type === 'loan') {
      const loan = node as LoanNode;
      typeSpecificFields.push({ label: '贷款金额', value: `¥${loan.amount.toLocaleString()}` });
      typeSpecificFields.push({ label: '申请状态', value: loan.status });
      typeSpecificFields.push({ label: '申请时间', value: new Date(loan.applyTime).toLocaleString('zh-CN') });
    } else if (node.type === 'investigation') {
      const inv = node as InvestigationNode;
      typeSpecificFields.push({ label: '调查结论', value: inv.conclusion });
      typeSpecificFields.push({ label: '调查人员', value: inv.investigator });
    }

    return [...baseFields, ...typeSpecificFields];
  };

  const handleSetPathStart = () => {
    if (node) {
      setPathStartNode(node.id);
    }
  };

  return (
    <div className="w-80 h-full bg-slate-900/90 backdrop-blur-sm border-l border-slate-700/50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Info size={20} className="text-blue-400" />
          信息面板
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedPath.length > 1 && (
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Route size={16} className="text-yellow-400" />
              <span className="text-white font-medium">关联路径</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pathNodes.map((n, idx) => (
                <div key={n?.id} className="flex items-center gap-1">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: NODE_TYPE_COLORS[n?.type || 'customer'] + '30', color: NODE_TYPE_COLORS[n?.type || 'customer'] }}
                  >
                    {n?.label}
                  </span>
                  {idx < pathNodes.length - 1 && (
                    <span className="text-slate-500">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pathStartNode && (
          <div className="p-3 bg-blue-500/10 border-b border-blue-500/30">
            <p className="text-blue-400 text-sm">
              已选择起点: {nodes.find(n => n.id === pathStartNode)?.label}
            </p>
            <p className="text-slate-400 text-xs mt-1">点击另一个节点查找路径</p>
          </div>
        )}

        {node ? (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: NODE_TYPE_COLORS[node.type] + '30' }}
                >
                  <span style={{ color: NODE_TYPE_COLORS[node.type] }}>
                    {getNodeIcon(node.type)}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{node.label}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: NODE_TYPE_COLORS[node.type] + '30', color: NODE_TYPE_COLORS[node.type] }}
                    >
                      {NODE_TYPE_LABELS[node.type]}
                    </span>
                    {node.isBlacklist && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/30 text-red-400 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        黑名单
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => useNetworkStore.getState().setSelectedNode(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSetPathStart}
                className="flex-1 py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
              >
                设为路径起点
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-slate-300 font-medium text-sm">基本信息</h4>
              <div className="space-y-2">
                {renderNodeDetails(node).map((field, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <span className="text-slate-400 text-sm">{field.label}</span>
                    <span
                      className="text-white text-sm"
                      style={{ color: field.color || undefined }}
                    >
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {relatedEdges.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                  <GitBranch size={14} />
                  关联关系 ({relatedEdges.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {relatedEdges.map(edge => {
                    const otherNodeId = edge.source === node.id ? edge.target : edge.source;
                    const otherNode = nodes.find(n => n.id === otherNodeId);
                    if (!otherNode) return null;
                    return (
                      <div
                        key={edge.id}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors cursor-pointer"
                        onClick={() => useNetworkStore.getState().setSelectedNode(otherNodeId)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: NODE_TYPE_COLORS[otherNode.type] + '30' }}
                          >
                            <span style={{ color: NODE_TYPE_COLORS[otherNode.type] }}>
                              {getNodeIcon(otherNode.type)}
                            </span>
                          </span>
                          <div>
                            <span className="text-white text-sm">{otherNode.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">
                            {RELATION_TYPE_LABELS[edge.relationType]}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            置信度: {(edge.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        {edge.isDuplicate && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                            重复关系
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
          <Info size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">点击节点查看详细信息</p>
          </div>
        )}

        <div className="p-4 border-t border-slate-700/50">
          <h4 className="text-slate-300 font-medium text-sm flex items-center gap-2 mb-3">
            <Clock size={14} />
            操作历史
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {operationHistory.length === 0 ? (
              <p className="text-slate-500 text-sm">暂无操作记录</p>
            ) : (
              operationHistory.slice(0, 10).map(record => (
                <div
                  key={record.id}
                  className="flex items-start gap-2 p-2 bg-slate-800/30 rounded text-xs"
                >
                  <User size={12} className="mt-0.5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300">{record.description}</p>
                    <p className="text-slate-500">
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
