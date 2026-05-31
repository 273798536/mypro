import { useState } from 'react';
import { GitBranch, FileText, Package, CheckCircle, Search } from 'lucide-react';
import { useStore } from '@/store/useStore';

const nodeTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  annotation: { label: '批注录入', color: 'bg-purple-500', icon: FileText },
  version: { label: '版本生成', color: 'bg-blue-500', icon: FileText },
  distribution: { label: '曲谱发放', color: 'bg-amber-500', icon: Package },
  confirmation: { label: '接收确认', color: 'bg-emerald-500', icon: CheckCircle },
};

export default function Trace() {
  const { parts, traceNodes, buildTrace, selectedTraceId, getPartById } = useStore();
  const [searchPartId, setSearchPartId] = useState('');

  const selectedPart = selectedTraceId ? getPartById(selectedTraceId) : null;

  const handleSearch = () => {
    if (searchPartId) {
      buildTrace(searchPartId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif text-slate-800">追溯查询</h2>
        <p className="text-sm text-slate-500 mt-1">从声部或批注ID追踪完整同步链路，定位问题责任人</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={searchPartId}
              onChange={(e) => setSearchPartId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="">选择声部...</option>
              {parts.map(part => (
                <option key={part.id} value={part.id}>{part.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchPartId}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            查询
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          提示：也可从分析看板或声部对账中点击"追溯"按钮直接进入
        </div>
      </div>

      {selectedPart && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">{selectedPart.name}</h3>
              <p className="text-sm text-slate-500">当前版本: {selectedPart.currentVersion}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              共 {traceNodes.length} 个节点
            </div>
          </div>

          {traceNodes.length > 0 ? (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" style={{ left: '1.5rem' }} />
              
              {traceNodes.map((node, index) => {
                const config = nodeTypeConfig[node.type];
                const NodeIcon = config.icon;

                return (
                  <div key={node.id} className="relative flex gap-4 pb-8">
                    <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center text-white shadow-md z-10`}>
                      <NodeIcon size={20} />
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800">{config.label}</h4>
                        <span className="text-xs text-slate-500">
                          {new Date(node.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{node.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{node.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <span>操作人: {node.operator}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <GitBranch size={40} className="mx-auto mb-2 text-slate-400" />
              <p>暂无追溯数据</p>
            </div>
          )}
        </div>
      )}

      {!selectedPart && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <GitBranch size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">请选择声部进行追溯查询</p>
          <p className="text-sm text-slate-400 mt-2">或从其他页面点击"追溯"按钮直接进入</p>
        </div>
      )}
    </div>
  );
}
