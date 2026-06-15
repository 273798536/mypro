import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  Plus, 
  Eye, 
  Clock,
  AlertCircle,
  History,
  FileSpreadsheet
} from 'lucide-react';
import { useConflictStore } from '@/stores/conflictStore';
import { FilterPanel } from '@/components/FilterPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { TimecodeBadge } from '@/components/TimecodeBadge';

function ConflictListPage() {
  const navigate = useNavigate();
  const {
    filters,
    isLoading,
    getFilteredRecords,
    setFilters,
    exportCSV,
    toggleTimecodeOffset,
    updateStatus,
  } = useConflictStore();

  const records = getFilteredRecords();

  const handleClearFilters = () => {
    setFilters({
      status: undefined,
      isTimecodeOffset: undefined,
      keyword: undefined,
    });
  };

  const handleCreateNew = () => {
    const trackName = prompt('请输入曲目名称：');
    const fileName = prompt('请输入文件名：');
    if (trackName && fileName) {
      useConflictStore.getState().saveRecord({
        trackName,
        fileName,
        status: 'pending',
        isTimecodeOffset: false,
        currentNote: '',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <AlertCircle className="w-12 h-12 text-primary-400 mx-auto mb-4" />
          <p className="text-primary-600 font-display text-lg">正在加载数据...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === 'pending').length,
    processing: records.filter(r => r.status === 'processing').length,
    timecodeOffset: records.filter(r => r.isTimecodeOffset).length,
  };

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <FileSpreadsheet className="w-8 h-8 text-primary-800" />
          <h1 className="font-display text-3xl font-bold text-primary-900">
            采样包素材排期冲突
          </h1>
        </div>
        <p className="text-primary-600 font-body">
          管理合同扫描件、曲目表和时码标记，所有变更自动留痕
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '总记录数', value: stats.total, icon: FileText, bgClass: 'bg-primary-100', textClass: 'text-primary-600' },
          { label: '待处理', value: stats.pending, icon: Clock, bgClass: 'bg-yellow-100', textClass: 'text-yellow-600' },
          { label: '处理中', value: stats.processing, icon: History, bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
          { label: '时码偏半拍', value: stats.timecodeOffset, icon: AlertCircle, bgClass: 'bg-accent-100', textClass: 'text-accent-600' },
        ].map((item, index) => (
          <div 
            key={item.label} 
            className={`card p-4 animate-slide-up animate-stagger-${index + 1}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-primary-500 mb-1">{item.label}</p>
                <p className="font-display text-2xl font-bold text-primary-900">{item.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${item.bgClass}`}>
                <item.icon className={`w-5 h-5 ${item.textClass}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
          onClear={handleClearFilters}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-primary-600 text-sm">
          共 <span className="font-semibold text-primary-900">{records.length}</span> 条记录
        </p>
        <div className="flex gap-3">
          <button onClick={handleCreateNew} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新增记录
          </button>
          <button onClick={exportCSV} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出CSV明细
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left font-semibold">曲目名称</th>
                <th className="px-4 py-3 text-left font-semibold">文件名</th>
                <th className="px-4 py-3 text-left font-semibold">状态</th>
                <th className="px-4 py-3 text-left font-semibold">时码标记</th>
                <th className="px-4 py-3 text-left font-semibold">当前备注</th>
                <th className="px-4 py-3 text-left font-semibold">扫描件</th>
                <th className="px-4 py-3 text-left font-semibold">最后更新</th>
                <th className="px-4 py-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr 
                  key={record.id} 
                  className={`table-row animate-slide-up animate-stagger-${Math.min(index + 1, 5)} ${index % 2 === 1 ? 'table-row-alt' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-display font-semibold text-primary-900">
                      {record.trackName}
                    </div>
                    <div className="text-xs text-primary-500 font-mono">{record.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm text-primary-700 bg-primary-50 px-2 py-1 rounded">
                      {record.fileName}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={record.status}
                      onChange={(e) => updateStatus(record.id, e.target.value as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="input-field text-sm py-1"
                    >
                      <option value="pending">待处理</option>
                      <option value="processing">处理中</option>
                      <option value="resolved">已解决</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <TimecodeBadge 
                      isOffset={record.isTimecodeOffset} 
                      onToggle={() => toggleTimecodeOffset(record.id)}
                      showLabel
                    />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-sm text-primary-700 truncate" title={record.currentNote}>
                      {record.currentNote || <span className="text-primary-400 italic">无备注</span>}
                    </div>
                    {record.noteChanges.length > 0 && (
                      <div className="text-xs text-primary-400 mt-1">
                        {record.noteChanges.length} 次备注变更
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="w-4 h-4 text-primary-400" />
                      <span className={record.contractScans.length > 0 ? 'text-primary-700' : 'text-primary-400'}>
                        {record.contractScans.length} 份
                      </span>
                      {record.historyVersions.length > 0 && (
                        <span className="text-xs text-primary-400 ml-1">
                          (v{record.historyVersions.length})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-primary-600">
                      {format(new Date(record.updatedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </div>
                    <div className="text-xs text-primary-400">
                      {format(new Date(record.createdAt), 'MM-dd', { locale: zhCN })} 创建
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/conflict/${record.id}`)}
                      className="btn-secondary text-sm py-1 px-3 inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      详情
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-primary-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-display text-lg">暂无匹配的记录</p>
                    <p className="text-sm mt-1">请尝试调整筛选条件</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ConflictListPage;
