import { History, Undo2, Clock, User, FileText, MapPin } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ActionBadge } from './StatusBadge';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function RecordList() {
  const { records, ledgers, withdrawRecord } = useStore();

  const getLedgerInfo = (ledgerIds: string[]) => {
    const items = ledgers.filter((l) => ledgerIds.includes(l.id));
    if (items.length === 0) return '无关联记录';
    if (items.length === 1) return items[0].projectName;
    return `${items[0].projectName} 等${items.length}条`;
  };

  return (
    <div className="space-y-4">
      {records.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <History className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">暂无处理记录</h3>
          <p className="mt-1 text-sm text-gray-500">导入或放样例数据后，系统将自动生成处理记录</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关联项目</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">归并点位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">处理结果</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.slice().reverse().map((record, index) => (
                <tr key={record.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-primary-50 transition-colors`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      {formatTime(record.operateTime)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <User size={12} className="text-gray-400" />
                      {record.operator}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ActionBadge action={record.action} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <FileText size={12} className="text-gray-400" />
                      {getLedgerInfo(record.ledgerIds)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400" />
                      {record.mergedPoint || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                    {record.result}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                    {record.reason || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => withdrawRecord(record.id)}
                      disabled={record.action === 'withdraw'}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Undo2 size={12} />
                      撤回
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
