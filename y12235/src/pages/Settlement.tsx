import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Edit3 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { scenarios } from '@/data/scenarios';
import ValidationList from '@/components/ValidationList';
import { DiffComparison } from '@/components/DiffComparison';
import { TraceChain } from '@/components/TraceChain';

export default function Settlement() {
  const { scenarioId, runId } = useParams<{ scenarioId: string; runId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'validation' | 'diff' | 'trace'>('validation');
  const [editingBond, setEditingBond] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getRunRecord = useGameStore(s => s.getRunRecord);
  const getRecordsForScenario = useGameStore(s => s.getRecordsForScenario);
  const rerunSettlement = useGameStore(s => s.rerunSettlement);
  const _loadFromStorage = useGameStore(s => s._loadFromStorage);

  _loadFromStorage();

  const scenario = scenarios.find(s => s.id === scenarioId);
  const record = runId ? getRunRecord(runId) : undefined;

  if (!scenario || !record) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-neutral-slate">记录不存在</div>
      </div>
    );
  }

  const allScenarioRecords = getRecordsForScenario(scenarioId!);
  const previousRecord = record.rerunFromId ? getRunRecord(record.rerunFromId) : null;

  const handleRerun = () => {
    const newRecord = rerunSettlement();
    navigate(`/settlement/${scenarioId}/${newRecord.id}`);
  };

  const handleEditBond = (bondId: string, currentValue: string) => {
    setEditingBond(bondId);
    setEditValue(currentValue);
  };

  const handleSaveBondEdit = () => {
    if (!editingBond) return;
    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) {
      setEditingBond(null);
      return;
    }
    const overrides = record.portfolioSnapshot.map(b =>
      b.id === editingBond ? { ...b, effectiveDuration: newValue } : b
    );
    const newRecord = rerunSettlement(overrides);
    setEditingBond(null);
    navigate(`/settlement/${scenarioId}/${newRecord.id}`);
  };

  const tabs = [
    { key: 'validation' as const, label: '规则校验' },
    { key: 'diff' as const, label: '差异对比' },
    { key: 'trace' as const, label: '溯源链' },
  ];

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/battle/${scenarioId}`)}
              className="p-1.5 rounded-md hover:bg-navy-700 text-neutral-slate hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-serif font-semibold text-white">结算复盘</h1>
              <p className="text-xs text-neutral-slate">{scenario.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-800 border border-navy-600">
              <span className="text-xs text-neutral-slate">得分</span>
              <span className={`text-lg font-mono font-bold ${record.totalScore >= 80 ? 'text-safe-green' : record.totalScore >= 50 ? 'text-risk-yellow' : 'text-risk-red'}`}>
                {record.totalScore}
              </span>
            </div>
            <button
              onClick={() => navigate(`/battle/${scenarioId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-navy-500 text-neutral-slate hover:text-white transition-colors"
            >
              <RotateCcw size={14} />
              返回战场
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 bg-navy-900 border border-navy-600 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber text-navy-950 font-medium'
                  : 'text-neutral-slate hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'validation' && (
          <div className="space-y-6">
            <ValidationList results={record.validationResults} />

            <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-amber rounded-full" />
                <h3 className="text-sm font-semibold text-amber font-serif">持仓快照</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {record.portfolioSnapshot.map(bond => (
                  <div
                    key={bond.id}
                    className="bg-navy-800 border border-navy-600 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white font-medium">{bond.issuer}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        bond.rating === 'AAA' || bond.rating === 'AA' ? 'bg-safe-green/20 text-safe-green' :
                        bond.rating === 'A' || bond.rating === 'BBB' ? 'bg-risk-yellow/20 text-risk-yellow' :
                        'bg-risk-red/20 text-risk-red'
                      }`}>
                        {bond.rating}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-neutral-slate">久期</span>
                        <span className="ml-1 font-mono text-white">{bond.simpleDuration}</span>
                      </div>
                      <div>
                        <span className="text-neutral-slate">有效久期</span>
                        {editingBond === bond.id ? (
                          <span className="ml-1 inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="w-16 bg-navy-700 border border-amber/40 rounded px-1 py-0.5 text-xs font-mono text-white"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveBondEdit(); if (e.key === 'Escape') setEditingBond(null); }}
                            />
                            <button onClick={handleSaveBondEdit} className="text-safe-green text-xs hover:underline">保存</button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="ml-1 font-mono text-white cursor-pointer hover:text-amber transition-colors group"
                            onClick={() => handleEditBond(bond.id, String(bond.effectiveDuration))}
                          >
                            {bond.effectiveDuration}
                            <Edit3 size={10} className="inline ml-0.5 opacity-0 group-hover:opacity-100" />
                          </button>
                        )}
                      </div>
                      <div>
                        <span className="text-neutral-slate">YTM</span>
                        <span className="ml-1 font-mono text-white">{bond.ytm}%</span>
                      </div>
                      <div>
                        <span className="text-neutral-slate">面值</span>
                        <span className="ml-1 font-mono text-white">{bond.parValue}</span>
                      </div>
                    </div>
                    {bond.callable && (
                      <div className="mt-1 text-xs text-risk-orange">含赎回条款</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <DiffComparison before={previousRecord} after={record} />
        )}

        {activeTab === 'trace' && (
          <div className="space-y-6">
            <TraceChain record={record} onNavigate={path => navigate(path)} />

            {allScenarioRecords.length > 1 && (
              <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-amber rounded-full" />
                  <h3 className="text-sm font-semibold text-amber font-serif">操作时间轴</h3>
                </div>
                <div className="space-y-2">
                  {allScenarioRecords
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((r, i) => (
                      <div
                        key={r.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                          r.id === runId ? 'bg-amber/10 border border-amber/30' : 'bg-navy-800 hover:bg-navy-700'
                        }`}
                        onClick={() => navigate(`/settlement/${scenarioId}/${r.id}`)}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono bg-navy-600 text-white">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-white">
                            {new Date(r.timestamp).toLocaleString('zh-CN')}
                            {r.rerunFromId && (
                              <span className="ml-2 text-amber">（重跑）</span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-slate">
                            持仓 {r.portfolioSnapshot.length} 只 · 久期缺口 {r.durationGap.toFixed(2)}
                          </div>
                        </div>
                        <span className={`text-sm font-mono font-bold ${
                          r.totalScore >= 80 ? 'text-safe-green' : r.totalScore >= 50 ? 'text-risk-yellow' : 'text-risk-red'
                        }`}>
                          {r.totalScore}分
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
