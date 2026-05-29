import { useEffect, useState } from 'react';
import { useSettlementStore } from '@/store';
import { Filter, Clock, ExternalLink } from 'lucide-react';

const ACTION_LABEL: Record<string, string> = { create: '创建', amend: '修正', cancel: '撤销', deduct: '追扣', confirm: '确认' };
const ACTION_COLOR: Record<string, string> = { create: 'bg-blue-100 text-blue-700', amend: 'bg-yellow-100 text-yellow-700', cancel: 'bg-red-100 text-red-700', deduct: 'bg-orange-100 text-orange-700', confirm: 'bg-green-100 text-green-700' };
const ENTITY_LABEL: Record<string, string> = { settlement: '结算', consignment: '寄售单', sale_order: '成交订单', deduction: '费用抵扣' };

const ENTITY_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'settlement', label: '结算' },
  { value: 'consignment', label: '寄售单' },
  { value: 'sale_order', label: '成交订单' },
  { value: 'deduction', label: '费用抵扣' },
];

const ACTION_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'create', label: '创建' },
  { value: 'amend', label: '修正' },
  { value: 'cancel', label: '撤销' },
  { value: 'deduct', label: '追扣' },
  { value: 'confirm', label: '确认' },
];

function SkeletonItem() {
  return (
    <div className="flex gap-4">
      <div className="w-28 shrink-0"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></div>
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-0.5 flex-1 bg-gray-100" />
      </div>
      <div className="flex-1 rounded-lg p-4 bg-gray-50 animate-pulse"><div className="h-20 bg-gray-200 rounded" /></div>
    </div>
  );
}

export default function History() {
  const { auditLogs, loadAuditLogs, loading } = useSettlementStore();
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => loadAuditLogs(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = () => {
    const filters: Record<string, string> = {};
    if (entityType) filters.entityType = entityType;
    if (action) filters.action = action;
    loadAuditLogs(filters);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
              {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm">
            {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={handleSearch} className="bg-[#c9a96e] text-white px-4 py-1.5 rounded-md text-sm hover:bg-[#b8964f]">搜索</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)}
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Clock className="w-12 h-12 mb-3" />
          <p className="text-lg">暂无操作记录</p>
        </div>
      ) : (
        <div className="space-y-0">
          {auditLogs.map((log, idx) => {
            const date = log.created_at.slice(0, 10);
            const time = log.created_at.slice(11, 19);
            const isLast = idx === auditLogs.length - 1;
            return (
              <div key={log.id} className="flex gap-4">
                <div className="w-28 shrink-0 pt-4 text-right">
                  <div className="text-sm text-gray-500">{date}</div>
                  <div className="text-xs text-gray-400">{time}</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#c9a96e] shrink-0 mt-4" />
                  {!isLast && <div className="w-0.5 flex-1 bg-[#c9a96e]/30" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {ACTION_LABEL[log.action] || log.action}
                      </span>
                      <span className="text-sm text-gray-500">{ENTITY_LABEL[log.entity_type] || log.entity_type}</span>
                      {log.entity_type === 'settlement' ? (
                        <a href={`/settlement/${log.entity_id}`} className="text-sm text-[#c9a96e] hover:underline inline-flex items-center gap-0.5">
                          {log.entity_id}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-700">{log.entity_id}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{log.details}</p>
                    <p className="text-xs text-gray-400">{log.operator}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
