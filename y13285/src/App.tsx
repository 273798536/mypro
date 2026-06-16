import { useState } from 'react';
import {
  FileSpreadsheet,
  History,
  AlertTriangle,
  HelpCircle,
  Building2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { LedgerList } from '@/components/LedgerList';
import { RecordList } from '@/components/RecordList';
import { ExceptionList } from '@/components/ExceptionList';
import { HelpModal } from '@/components/HelpModal';

const tabs = [
  { id: 'ledger', label: '审批台账', icon: FileSpreadsheet },
  { id: 'record', label: '处理记录', icon: History },
  { id: 'exception', label: '异常队列', icon: AlertTriangle },
] as const;

function App() {
  const { activeTab, setActiveTab, ledgers, records, exceptions } = useStore();
  const [helpOpen, setHelpOpen] = useState(false);

  const getPendingCount = exceptions.filter((e) => e.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">菜场卸货点位归并</h1>
                <p className="text-xs text-primary-200">市政设计审批台账处理工具</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4 text-sm text-primary-200">
                <span>台账 <strong className="text-white">{ledgers.length}</strong></span>
                <span>记录 <strong className="text-white">{records.length}</strong></span>
                <span className={getPendingCount > 0 ? 'text-accent-orange' : ''}>
                  异常 <strong className="text-white">{getPendingCount}</strong>
                </span>
              </div>
              <button
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 rounded-md text-sm transition-colors"
              >
                <HelpCircle size={16} />
                <span className="hidden sm:inline">操作说明</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
            const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === 'exception' && getPendingCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {showBadge && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-accent-orange rounded-full">
                      {getPendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'ledger' && <LedgerList />}
        {activeTab === 'record' && <RecordList />}
        {activeTab === 'exception' && <ExceptionList />}
      </main>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export default App;
