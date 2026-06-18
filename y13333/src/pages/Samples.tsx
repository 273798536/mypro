import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import { Search, Filter, ChevronDown, ChevronUp, AlertTriangle, FileText } from 'lucide-react';

function Samples() {
  const { samples, loading, error, fetchSamples } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showWithdrawn, setShowWithdrawn] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSamples(true);
  }, [fetchSamples]);

  const filteredSamples = samples.filter(s => {
    const matchesSearch = s.productName.includes(searchTerm) ||
      s.attributeName.includes(searchTerm) ||
      s.id.includes(searchTerm);
    const matchesFilter = showWithdrawn || !s.isWithdrawn;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-800">样本表管理</h1>
          <p className="text-gray-500 mt-1">共 {filteredSamples.length} 条样本，含 {samples.filter(s => s.isWithdrawn).length} 条撤回记录</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="搜索商品、属性、样本ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowWithdrawn(!showWithdrawn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showWithdrawn
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            {showWithdrawn ? '含撤回记录' : '仅正常记录'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">样本ID</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">商品信息</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">属性名</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">属性值</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">标注人</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSamples.map(sample => (
              <tr
                key={sample.id}
                className={`transition-colors hover:bg-gray-50 ${
                  sample.isWithdrawn ? 'bg-red-50/50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <span className={`font-mono text-sm ${sample.isWithdrawn ? 'line-through text-gray-400' : 'text-primary-700'}`}>
                    {sample.id}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {sample.isWithdrawn && (
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-medium ${sample.isWithdrawn ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {sample.productName}
                      </p>
                      <p className="text-xs text-gray-500">{sample.productId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={sample.isWithdrawn ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {sample.attributeName}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-medium ${sample.isWithdrawn ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {sample.attributeValue}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {sample.isWithdrawn ? (
                    <StatusBadge status="withdrawn" />
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                      正常
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={sample.isWithdrawn ? 'line-through text-gray-400' : 'text-gray-600'}>
                    {sample.createdBy}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setExpandedId(expandedId === sample.id ? null : sample.id)}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    <FileText size={14} />
                    原始说法
                    {expandedId === sample.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </td>
              </tr>
            ))}
            {filteredSamples.map(sample => expandedId === sample.id && (
              <tr key={`expanded-${sample.id}`} className="bg-gray-50">
                <td colSpan={7} className="px-6 py-4">
                  <div className={`p-4 rounded-lg ${sample.isWithdrawn ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500 mb-1">标注时原始说法</p>
                        <p className={`text-gray-800 leading-relaxed ${sample.isWithdrawn ? 'line-through text-gray-500' : ''}`}>
                          "{sample.originalStatement}"
                        </p>
                        {sample.isWithdrawn && sample.withdrawnReason && (
                          <div className="mt-3 p-3 bg-red-100/50 rounded-lg border border-red-200">
                            <p className="text-sm font-medium text-red-800 mb-1">撤回原因</p>
                            <p className="text-sm text-red-700">{sample.withdrawnReason}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          标注时间：{sample.createdAt}
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Samples;
