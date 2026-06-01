import { Eye, Trash2, CheckCircle, Edit } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CrackPoint } from '../../types';

interface CrackTableProps {
  onViewHistory?: (crack: CrackPoint) => void;
  onEdit?: (crack: CrackPoint) => void;
}

export function CrackTable({ onViewHistory, onEdit }: CrackTableProps) {
  const cracks = useAppStore((state) => state.cracks);
  const selectedCrack = useAppStore((state) => state.selectedCrack);
  const setSelectedCrack = useAppStore((state) => state.setSelectedCrack);
  const markAsNotDuplicate = useAppStore((state) => state.markAsNotDuplicate);
  const deleteCrack = useAppStore((state) => state.deleteCrack);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      normal: '正常',
      duplicate: '重复',
      duplicateOf: '重复',
      missing_field: '缺字段',
      late_added: '晚补',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      normal: 'status-normal',
      duplicate: 'status-duplicate',
      missing_field: 'status-missing',
      late_added: 'status-late',
    };
    return classes[status] || '';
  };

  const getRiskLabel = (level: string) => {
    const labels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return labels[level] || level;
  };

  const getRiskClass = (level: string) => {
    const classes: Record<string, string> = {
      low: 'text-status-normal',
      medium: 'text-status-missing',
      high: 'text-status-duplicate',
    };
    return classes[level] || '';
  };

  const handleMarkAsNotDuplicate = (e: React.MouseEvent, crackId: string) => {
    e.stopPropagation();
    markAsNotDuplicate(crackId, '地质工程师');
  };

  const handleDelete = (e: React.MouseEvent, crackId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteCrack(crackId, '地质工程师');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            裂缝名称
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            坐标
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            长度
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            风险等级
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            状态
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            雨量
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            住户坐标
          </th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-wider">
            操作
          </th>
          </tr>
        </thead>
        <tbody className="table-zebra">
          {cracks.map((crack) => (
            <tr
              key={crack.id}
              className={`border-b border-slate-800 cursor-pointer transition-colors hover:bg-slate-800/50 ${
                crack.isDuplicate ? 'duplicate-row' : ''
              } ${selectedCrack?.id === crack.id ? 'bg-blue-900/20' : ''}`}
              onClick={() => setSelectedCrack(crack)}
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{crack.name}</span>
                  {crack.isDuplicate && (
                    <span className="w-2 h-2 rounded-full bg-status-duplicate animate-pulse" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                {crack.x.toFixed(1)}, {crack.y.toFixed(1)}
              </td>
              <td className="py-3 px-4 text-slate-300 font-mono">
                {crack.length}m
              </td>
              <td className={`py-3 px-4 font-medium ${getRiskClass(crack.riskLevel)}`}>
                {getRiskLabel(crack.riskLevel)}
              </td>
              <td className="py-3 px-4">
                <span className={`status-badge ${getStatusClass(crack.status)}`}>
                  {getStatusLabel(crack.status)}
                </span>
              </td>
              <td className="py-3 px-4">
                {crack.rainfall ? (
                  <span className="text-slate-300">{crack.rainfall}</span>
                ) : (
                  <span className="text-status-missing">缺失</span>
                )}
              </td>
              <td className="py-3 px-4">
                {crack.residentCoords ? (
                  <span className="text-slate-300 text-xs font-mono">{crack.residentCoords}</span>
                ) : (
                  <span className="text-status-missing">缺失</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  {crack.isDuplicate && (
                    <button
                      onClick={(e) => handleMarkAsNotDuplicate(e, crack.id)}
                      className="p-1.5 text-slate-400 hover:text-status-normal hover:bg-status-normal/10 rounded transition-colors"
                      title="标记为非重复"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewHistory?.(crack);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    title="查看历史"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(crack);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, crack.id)}
                    className="p-1.5 text-slate-400 hover:text-status-duplicate hover:bg-status-duplicate/10 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
