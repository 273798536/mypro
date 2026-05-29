import { useState } from 'react';
import ImportPanel from '../components/data/ImportPanel';
import DataTable from '../components/data/DataTable';
import AccountSettings from '../components/data/AccountSettings';
import EditEntryDialog from '../components/common/EditEntryDialog';
import type { CashflowEntry } from '../types';
import { Plus, RefreshCw } from 'lucide-react';
import { useCashflowStore } from '../store/useCashflowStore';

export default function DataPage() {
  const [editingEntry, setEditingEntry] = useState<CashflowEntry | null>(null);
  const [addMode, setAddMode] = useState(false);
  const resetToSampleData = useCashflowStore(state => state.resetToSampleData);

  const handleAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingEntry({
      id: '',
      type: 'other',
      direction: 'out',
      amount: 0,
      date: today,
      description: '',
      priority: 'medium',
      source: '手动添加',
      isDelayed: false,
      createdAt: '',
      updatedAt: '',
      revisionHistory: []
    });
    setAddMode(true);
  };

  const handleCloseDialog = () => {
    setEditingEntry(null);
    setAddMode(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">数据管理</h1>
          <p className="text-sm text-gray-500 mt-1">导入、编辑和管理现金流数据</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            添加条目
          </button>
          <button
            onClick={() => {
              if (confirm('确定重置为示例数据？当前数据将被覆盖。')) {
                resetToSampleData();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <RefreshCw size={16} />
            重置示例
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable onEditEntry={setEditingEntry} />
        </div>
        <div className="space-y-6">
          <ImportPanel />
          <AccountSettings />
        </div>
      </div>

      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          mode={addMode ? 'add' : 'edit'}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}