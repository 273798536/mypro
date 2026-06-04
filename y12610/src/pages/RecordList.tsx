import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store';
import { RecordStatus } from '@/types';
import RecordCard from '@/components/RecordCard';

export default function RecordList() {
  const loadRecords = useStore((state) => state.loadRecords);
  const getFilteredRecords = useStore((state) => state.getFilteredRecords);
  const createRecord = useStore((state) => state.createRecord);
  const filterStatus = useStore((state) => state.filterStatus);
  const searchQuery = useStore((state) => state.searchQuery);
  const setFilterStatus = useStore((state) => state.setFilterStatus);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const records = useStore((state) => state.records);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = getFilteredRecords();

  const handleCreateRecord = () => {
    if (newTitle.trim()) {
      const id = createRecord(newTitle.trim());
      setNewTitle('');
      setShowCreateModal(false);
      window.location.href = `/editor/${id}`;
    }
  };

  const statusFilters: { value: RecordStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: '全部', color: 'bg-gray-500' },
    { value: 'valid', label: '顺利记录', color: 'bg-green-500' },
    { value: 'pending', label: '待确认', color: 'bg-yellow-500' },
    { value: 'invalid', label: '坏数据', color: 'bg-red-500' },
  ];

  const stats = {
    total: records.length,
    valid: records.filter((r) => r.status === 'valid').length,
    pending: records.filter((r) => r.status === 'pending').length,
    invalid: records.filter((r) => r.status === 'invalid').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">交通事故示意图编辑器</h1>
                <p className="text-xs text-slate-500">专业的交通事故现场记录工具</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              <Plus className="w-5 h-5" />
              新建记录
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-sm text-slate-500">总记录数</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-sm text-slate-500">顺利记录</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-slate-500">待确认</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
            <div className="text-3xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-sm text-slate-500">需复核</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索记录标题或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <div className="flex gap-2">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setFilterStatus(filter.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === filter.value
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无记录</h3>
                <p className="text-slate-500 mb-4">
                  {searchQuery || filterStatus !== 'all'
                    ? '没有找到匹配的记录，请尝试调整筛选条件'
                    : '点击上方按钮创建第一条记录'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    创建记录
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecords.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-slate-400">
          显示 {filteredRecords.length} 条记录，共 {records.length} 条
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">新建记录</h2>
              <p className="text-sm text-slate-500 mt-1">创建一份新的交通事故示意图记录</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                记录标题
              </label>
              <input
                type="text"
                placeholder="例如：2024年6月1日 交叉口事故"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRecord()}
                autoFocus
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTitle('');
                }}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateRecord}
                disabled={!newTitle.trim()}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建并编辑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
