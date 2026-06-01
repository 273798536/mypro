import { useState } from 'react';
import { Table, Filter, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CrackTable } from '../components/cracks/CrackTable';
import { HistoryPanel } from '../components/cracks/HistoryPanel';
import { useAppStore } from '../store/useAppStore';
import { CrackPoint } from '../types';

export function CracksPage() {
  const navigate = useNavigate();
  const cracks = useAppStore((state) => state.cracks);
  const getCrackHistory = useAppStore((state) => state.getCrackHistory);
  const setEditingCrack = useAppStore((state) => state.setEditingCrack);

  const [historyPanel, setHistoryPanel] = useState<{
    isOpen: boolean;
    crack: CrackPoint | null;
  }>({ isOpen: false, crack: null });

  const handleViewHistory = (crack: CrackPoint) => {
    setHistoryPanel({ isOpen: true, crack });
  };

  const handleEdit = (crack: CrackPoint) => {
    setEditingCrack(crack);
    navigate('/compare');
  };

  const stats = {
    total: cracks.length,
    duplicate: cracks.filter((c) => c.isDuplicate).length,
    missing: cracks.filter((c) => c.status === 'missing_field').length,
    late: cracks.filter((c) => c.status === 'late_added').length,
    normal: cracks.filter((c) => c.status === 'normal' && !c.isDuplicate).length,
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Table className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">裂缝点管理</h2>
              <p className="text-xs text-slate-500">管理和审核所有裂缝监测数据</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 grid grid-cols-5 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">总数</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">条记录</p>
        </div>
        <div className="bg-status-duplicate/10 rounded-lg p-4 border border-status-duplicate/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-status-duplicate" />
            <p className="text-xs text-slate-500">重复记录</p>
          </div>
          <p className="text-2xl font-bold text-status-duplicate">{stats.duplicate}</p>
          <p className="text-xs text-slate-500 mt-1">需要处理</p>
        </div>
        <div className="bg-status-missing/10 rounded-lg p-4 border border-status-missing/30">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-status-missing" />
            <p className="text-xs text-slate-500">缺字段</p>
          </div>
          <p className="text-2xl font-bold text-status-missing">{stats.missing}</p>
          <p className="text-xs text-slate-500 mt-1">待补充</p>
        </div>
        <div className="bg-status-missing/10 rounded-lg p-4 border border-status-missing/30">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-status-missing" />
            <p className="text-xs text-slate-500">晚补记录</p>
          </div>
          <p className="text-2xl font-bold text-status-missing">{stats.late}</p>
          <p className="text-xs text-slate-500 mt-1">已补录</p>
        </div>
        <div className="bg-status-normal/10 rounded-lg p-4 border border-status-normal/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3.5 h-3.5 rounded-full bg-status-normal" />
            <p className="text-xs text-slate-500">正常记录</p>
          </div>
          <p className="text-2xl font-bold text-status-normal">{stats.normal}</p>
          <p className="text-xs text-slate-500 mt-1">已确认</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4">
        <div className="h-full bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
          <CrackTable onViewHistory={handleViewHistory} onEdit={handleEdit} />
        </div>
      </div>

      <HistoryPanel
        isOpen={historyPanel.isOpen}
        onClose={() => setHistoryPanel({ isOpen: false, crack: null })}
        crackName={historyPanel.crack?.name || ''}
        history={historyPanel.crack ? getCrackHistory(historyPanel.crack.id) : []}
      />
    </div>
  );
}
