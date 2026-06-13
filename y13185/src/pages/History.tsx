import { useState } from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Filter, User, Clock, Wrench, ChevronDown, Search } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { OperationTimeline } from '@/components/history/OperationTimeline';
import { useExperimentStore } from '@/store/useExperimentStore';
import { OperationLog } from '@/types/experiment';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'create' | 'update' | 'delete' | 'annotation' | 'suspend' | 'calculation';

export default function History() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyACen, setShowOnlyACen] = useState(false);
  const navigate = useNavigate();

  const operationLogs = useExperimentStore(state => state.operationLogs);
  const experiments = useExperimentStore(state => state.experiments);
  const results = useExperimentStore(state => state.results);

  const aCenLogs = operationLogs.filter(log => log.operator.includes('阿岑') || log.operator.includes('岑'));
  const hasACenModifications = aCenLogs.length > 0;

  const filteredLogs = operationLogs
    .filter(log => {
      if (filter !== 'all' && log.operationType !== filter) return false;
      if (showOnlyACen && !(log.operator.includes('阿岑') || log.operator.includes('岑'))) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.operator.toLowerCase().includes(query) ||
          log.remark.toLowerCase().includes(query) ||
          log.operationType.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const getExperimentName = (logId: string) => {
    const log = operationLogs.find(l => l.id === logId);
    if (!log) return '未知实验';
    const result = results.find(r => r.id === log.resultId);
    if (result) {
      const exp = experiments.find(e => e.id === result.experimentRecordId || e.id === result.recordId);
      return exp?.experimentName || `实验 #${(result.experimentRecordId || result.recordId)?.slice(-6)}`;
    }
    return '未知实验';
  };

  const stats = [
    { label: '全部操作', value: operationLogs.length, filter: 'all' as FilterType },
    { label: '数据导入', value: operationLogs.filter(l => l.operationType === 'create').length, filter: 'create' as FilterType },
    { label: '复算执行', value: operationLogs.filter(l => l.operationType === 'calculation').length, filter: 'calculation' as FilterType },
    { label: '标注更新', value: operationLogs.filter(l => l.operationType === 'annotation').length, filter: 'annotation' as FilterType },
    { label: '异常处理', value: operationLogs.filter(l => l.operationType === 'suspend').length, filter: 'suspend' as FilterType },
  ];

  const operationTypeLabels: Record<string, string> = {
    create: '数据导入',
    update: '数据更新',
    delete: '数据删除',
    annotation: '标注更新',
    suspend: '异常处理',
    calculation: '复算执行',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">操作历史</h1>
          <p className="text-gray-500 mt-1">查看所有操作记录，包括阿岑的临时修改</p>
        </div>
        <div className="flex items-center gap-3">
          {hasACenModifications && (
            <StatusBadge status="warning">
              含 {aCenLogs.length} 条阿岑的修改
            </StatusBadge>
          )}
          <Button variant="outline" onClick={() => navigate('/calculator')}>
            返回复算工作台
          </Button>
        </div>
      </div>

      {hasACenModifications && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3"
        >
          <Wrench className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-orange-800">维修师傅阿岑的修改记录</h3>
            <p className="text-sm text-orange-700 mt-1">
              系统检测到阿岑有 {aCenLogs.length} 条临时修改记录，这些修改已完整保留在历史中，
              下一班同事可以查看变更前后的对比数据。
            </p>
          </div>
          <Button
            size="sm"
            variant={showOnlyACen ? 'primary' : 'outline'}
            onClick={() => setShowOnlyACen(!showOnlyACen)}
          >
            {showOnlyACen ? '显示全部' : '仅看阿岑'}
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(stat => {
          const isActive = filter === stat.filter;
          return (
            <motion.button
              key={stat.filter}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(stat.filter)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className={`text-2xl font-bold ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </motion.button>
          );
        })}
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">操作记录</h2>
            </div>
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索操作人、备注或类型..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-gray-500">
              共 {filteredLogs.length} 条记录
            </div>
          </div>
        </div>
        <div className="p-6">
          {filteredLogs.length > 0 ? (
            <OperationTimeline
              logs={filteredLogs}
              getExperimentName={getExperimentName}
              operationTypeLabels={operationTypeLabels}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <HistoryIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无符合条件的操作记录</p>
              <p className="text-sm mt-1">调整筛选条件或搜索关键词</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
