import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileBarChart, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Filter,
  Search,
  Eye,
  Trash2,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { RecordStatus } from '../types';
import { cn } from '../lib/utils';
import RecordCard from '../components/RecordCard';
import EvidenceChain from '../components/EvidenceChain';

type TabType = 'all' | RecordStatus;

export default function Analysis() {
  const navigate = useNavigate();
  const { records, auditLogs, deleteRecord, setSelectedRecordId, selectedRecordId } = useAnalysisStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);

  const normalRecords = records.filter(r => r.status === 'normal');
  const pendingRecords = records.filter(r => r.status === 'pending');
  const abnormalRecords = records.filter(r => r.status === 'abnormal');

  const filteredRecords = records.filter(record => {
    const matchesTab = activeTab === 'all' || record.status === activeTab;
    const matchesSearch = searchQuery === '' || 
      record.metricA.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.metricB.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.judgment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const selectedRecord = records.find(r => r.id === selectedRecordId);

  const tabs = [
    { id: 'all' as TabType, label: '全部', icon: FileBarChart, count: records.length },
    { id: 'normal' as TabType, label: '正常明细', icon: CheckCircle, count: normalRecords.length, color: 'emerald' },
    { id: 'pending' as TabType, label: '待确认', icon: Clock, count: pendingRecords.length, color: 'amber' },
    { id: 'abnormal' as TabType, label: '异常', icon: AlertTriangle, count: abnormalRecords.length, color: 'red' },
  ];

  const handleViewRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    setShowEvidencePanel(true);
  };

  const handleEditRecord = (recordId: string) => {
    navigate('/intervention', { state: { recordId } });
  };

  const handleDeleteRecord = (recordId: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteRecord(recordId);
    }
  };

  const getTabColorClasses = (tab: typeof tabs[0], isActive: boolean) => {
    if (!tab.color) {
      return isActive ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent';
    }
    const colorMap: Record<string, string> = {
      emerald: isActive ? 'text-emerald-400 border-emerald-400' : 'text-slate-400 border-transparent',
      amber: isActive ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent',
      red: isActive ? 'text-red-400 border-red-400' : 'text-slate-400 border-transparent',
    };
    return colorMap[tab.color] || '';
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <div className={cn(
        'flex-1 overflow-y-auto p-8 transition-all duration-300',
        showEvidencePanel && 'lg:pr-96'
      )}>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileBarChart className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">分析结果</h1>
          </div>
          <p className="text-slate-400">三清单体系：正常明细、待确认、异常，风险分级展示</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg mb-6">
          <div className="flex flex-wrap border-b border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                  getTabColorClasses(tab, activeTab === tab.id),
                  'hover:bg-slate-800/50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-slate-700">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索指标名称、记录ID或判断结论..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="p-4">
            {activeTab !== 'all' && (
              <div className={cn(
                'mb-4 p-3 rounded-lg border',
                activeTab === 'normal' && 'bg-emerald-500/5 border-emerald-500/20',
                activeTab === 'pending' && 'bg-amber-500/5 border-amber-500/20',
                activeTab === 'abnormal' && 'bg-red-500/5 border-red-500/20'
              )}>
                <p className={cn(
                  'text-sm flex items-center gap-2',
                  activeTab === 'normal' && 'text-emerald-400',
                  activeTab === 'pending' && 'text-amber-400',
                  activeTab === 'abnormal' && 'text-red-400'
                )}>
                  <AlertCircle className="w-4 h-4" />
                  {activeTab === 'normal' && '正常明细：通过所有误判检测，相关性分析结果可靠。'}
                  {activeTab === 'pending' && '待确认：存在滞后关系、共同趋势等情况，需人工确认因果方向。'}
                  {activeTab === 'abnormal' && '异常：样本太少、数据缺失等原因，无法得出可靠结论。'}
                </p>
              </div>
            )}

            {abnormalRecords.length > 0 && activeTab === 'all' && (
              <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  有 {abnormalRecords.length} 条记录存在异常（算不了的原因已记录），请查看异常清单。
                </p>
              </div>
            )}

            {pendingRecords.length > 0 && activeTab === 'all' && (
              <div className="mb-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  有 {pendingRecords.length} 条记录待人工确认，请查看待确认清单并进行人工干预。
                </p>
              </div>
            )}

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">暂无符合条件的记录</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    清除搜索条件
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="relative">
                    <RecordCard
                      record={record}
                      showEvidence={false}
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => handleViewRecord(record.id)}
                        className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="查看证据链"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditRecord(record.id)}
                        className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="人工干预"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-slate-500">
          显示 {filteredRecords.length} 条记录
          {auditLogs.length > 0 && ` · 有 ${auditLogs.length} 条人工修改记录`}
        </div>
      </div>

      {showEvidencePanel && selectedRecord && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto z-20 shadow-2xl">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
            <h3 className="font-semibold text-white">证据链详情</h3>
            <button
              onClick={() => {
                setShowEvidencePanel(false);
                setSelectedRecordId(null);
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">当前记录</p>
              <p className="text-sm text-white font-mono">{selectedRecord.id}</p>
              <p className="text-sm mt-1">
                <span className="text-blue-400">{selectedRecord.metricA}</span>
                <span className="text-slate-500 mx-1">→</span>
                <span className="text-cyan-400">{selectedRecord.metricB}</span>
              </p>
            </div>
            <EvidenceChain evidence={selectedRecord.evidenceChain} />
            
            {selectedRecord.lagModified && selectedRecord.originalLagJudgment && (
              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-400 mb-2">修改影响追踪</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">原始判断</p>
                    <p className="text-slate-300">{selectedRecord.originalLagJudgment}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">修改后判断</p>
                    <p className="text-purple-300">{selectedRecord.judgment}</p>
                  </div>
                  <p className="text-xs text-purple-400 mt-2">
                    ⚠️ 此记录的滞后检查已被人工修改，分组对比和导出报告中会标注 * 号
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
