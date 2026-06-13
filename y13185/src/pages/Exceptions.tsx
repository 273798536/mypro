import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SuspendList } from '@/components/exception/SuspendList';
import { useExperimentStore } from '@/store/useExperimentStore';
import { SuspendRecord } from '@/types/experiment';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'corrected';

export default function Exceptions() {
  const [filter, setFilter] = useState<FilterType>('all');
  const navigate = useNavigate();

  const suspendRecords = useExperimentStore(state => state.suspendRecords);
  const results = useExperimentStore(state => state.results);
  const processSuspendRecord = useExperimentStore(state => state.processSuspendRecord);

  const pendingRecords = suspendRecords.filter(r => r.status === 'pending');
  const processedRecords = suspendRecords.filter(r => r.status !== 'pending');

  const filteredRecords = suspendRecords.filter(record => {
    if (filter === 'all') return true;
    return record.status === filter;
  });

  const getResultForSuspend = (suspendId: string) => {
    const suspend = suspendRecords.find(s => s.id === suspendId);
    return results.find(r => r.id === suspend?.resultId);
  };

  const handleProcess = (
    suspendId: string,
    action: 'approve' | 'reject' | 'correct',
    remark: string,
    correctedValue?: any
  ) => {
    processSuspendRecord(suspendId, action, remark, correctedValue);
  };

  const stats = [
    { label: '全部', value: suspendRecords.length, filter: 'all' as FilterType, icon: Clock },
    { label: '待处理', value: pendingRecords.length, filter: 'pending' as FilterType, icon: AlertTriangle },
    { label: '已批准', value: processedRecords.filter(r => r.status === 'approved').length, filter: 'approved' as FilterType, icon: CheckCircle },
    { label: '已修正', value: processedRecords.filter(r => r.status === 'corrected').length, filter: 'corrected' as FilterType, icon: CheckCircle },
    { label: '已拒绝', value: processedRecords.filter(r => r.status === 'rejected').length, filter: 'rejected' as FilterType, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">异常处理</h1>
          <p className="text-gray-500 mt-1">处理方向符号异常等挂起记录，确保数据正确性</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingRecords.length > 0 && (
            <StatusBadge status="warning">
              {pendingRecords.length} 个待处理
            </StatusBadge>
          )}
          <Button variant="outline" onClick={() => navigate('/calculator')}>
            返回复算工作台
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
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
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {pendingRecords.length > 0 && (filter === 'all' || filter === 'pending') && (
        <Card>
          <div className="p-4 border-b border-gray-100 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-amber-800">待处理异常</h2>
              <span className="text-sm text-amber-600 ml-auto">
                需要项目经理确认后才能继续
              </span>
            </div>
          </div>
          <div className="p-6">
            <SuspendList
              records={pendingRecords}
              getResultForSuspend={getResultForSuspend}
              onProcess={handleProcess}
              showActions={true}
            />
          </div>
        </Card>
      )}

      {(filter === 'all' || filter !== 'pending') && processedRecords.length > 0 && (
        <Card>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">
                {filter === 'all' ? '已处理记录' : `${stats.find(s => s.filter === filter)?.label}记录`}
              </h2>
              <span className="text-sm text-gray-500 ml-auto">
                {filter === 'all' ? processedRecords.length : filteredRecords.length} 条
              </span>
            </div>
          </div>
          <div className="p-6">
            <SuspendList
              records={filter === 'all' ? processedRecords : filteredRecords}
              getResultForSuspend={getResultForSuspend}
              onProcess={handleProcess}
              showActions={false}
            />
          </div>
        </Card>
      )}

      {filteredRecords.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? '暂无异常记录' : `暂无${stats.find(s => s.filter === filter)?.label}记录`}
            </h2>
            <p className="text-gray-500">
              {filter === 'pending'
                ? '所有异常已处理完毕，可以继续进行复算'
                : '系统会自动检测方向符号等异常，出现异常时会在这里显示'}
            </p>
            {filter === 'pending' && (
              <Button className="mt-6" onClick={() => navigate('/calculator')}>
                前往复算
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
