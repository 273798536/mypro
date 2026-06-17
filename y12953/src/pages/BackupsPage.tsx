import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import StatusBadge from '@/components/common/StatusBadge';

export default function BackupsPage() {
  const navigate = useNavigate();
  const backups = useBackupStore((state) => state.backups);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState('backupTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filtered = backups
    .filter((b) => {
      const matchesSearch =
        b.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aVal = a[sortField as keyof typeof a];
      const bVal = b[sortField as keyof typeof b];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleDownload = () => {
    const csvContent = [
      ['ID', '表名', '备份时间', '来源', '记录数', '漂移字段数', '状态', 'Schema版本'],
      ...backups.map((b) => [
        b.id,
        b.tableName,
        b.backupTime,
        b.source,
        b.recordCount,
        b.driftCount,
        b.status,
        b.schemaVersion,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-records-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">备份记录</h1>
          <p className="text-navy-300 mt-1 text-sm">
            共 {filtered.length} 条记录 · 字段漂移已高亮标记
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-navy-700/50 hover:bg-navy-600/50 text-white rounded-lg border border-navy-600/50 hover:border-navy-500/50 transition-all text-sm"
        >
          <Download className="w-4 h-4" />
          下载记录
        </button>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-64 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="搜索表名或来源..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-navy-900/50 border border-navy-700/50 rounded-lg text-white placeholder:text-navy-500 focus:outline-none focus:border-navy-500/50 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-navy-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-navy-900/50 border border-navy-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-navy-500/50"
          >
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="warning">警告</option>
            <option value="error">异常</option>
          </select>
        </div>
      </div>

      <div className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/50 bg-navy-900/30">
                <th
                  className="text-left px-5 py-3 font-medium text-navy-300 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('tableName')}
                >
                  <div className="flex items-center gap-1">
                    表名
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-left px-5 py-3 font-medium text-navy-300 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('backupTime')}
                >
                  <div className="flex items-center gap-1">
                    备份时间
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">来源</th>
                <th
                  className="text-left px-5 py-3 font-medium text-navy-300 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('recordCount')}
                >
                  <div className="flex items-center gap-1">
                    记录数
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="text-left px-5 py-3 font-medium text-navy-300 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('driftCount')}
                >
                  <div className="flex items-center gap-1">
                    漂移字段
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-left px-5 py-3 font-medium text-navy-300">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/30">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-navy-400">
                    暂无匹配的备份记录
                  </td>
                </tr>
              ) : (
                paginated.map((backup) => (
                  <tr
                    key={backup.id}
                    className="hover:bg-navy-700/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/backups/${backup.id}`)}
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-white font-medium">{backup.tableName}</span>
                    </td>
                    <td className="px-5 py-4 text-navy-200 font-mono text-xs">
                      {new Date(backup.backupTime).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-5 py-4 text-navy-300 font-mono text-xs">{backup.source}</td>
                    <td className="px-5 py-4 text-navy-200 font-mono">
                      {backup.recordCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      {backup.driftCount > 0 ? (
                        <span className="text-amber-400 font-mono font-medium">
                          {backup.driftCount} 个
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono">正常</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={backup.status} size="sm">
                        {backup.status === 'normal'
                          ? '正常'
                          : backup.status === 'warning'
                          ? '警告'
                          : '异常'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-navy-700/50 flex items-center justify-between">
            <p className="text-xs text-navy-400">
              第 {currentPage} / {totalPages} 页，共 {filtered.length} 条
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-navy-700/30 hover:bg-navy-600/30 text-navy-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-navy-500 text-white'
                      : 'bg-navy-700/30 text-navy-300 hover:bg-navy-600/30 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-navy-700/30 hover:bg-navy-600/30 text-navy-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
