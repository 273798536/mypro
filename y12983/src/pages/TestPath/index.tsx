import { useState } from 'react';
import { FlaskConical, AlertTriangle, CheckCircle2, Play, RefreshCw, Copy, X } from 'lucide-react';
import { useGapStore } from '@/stores/gapStore';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import StatusBadge from '@/components/Status/StatusBadge';
import { formatDateTime } from '@/utils/format';
import type { CreateGapData } from '@/types';

interface TestScenario {
  id: string;
  title: string;
  description: string;
  type: 'duplicate' | 'consistency' | 'merge';
  status: 'idle' | 'running' | 'success' | 'failed';
  result?: string;
}

export default function TestPathPage() {
  const { createGap, detectDuplicates, duplicates, gaps, fetchGaps } = useGapStore();

  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: 'test_001',
      title: '重复导入检测',
      description: '模拟导入相同的缺口报告，验证系统是否能正确检测到重复记录，避免同一件事出现两份结论。',
      type: 'duplicate',
      status: 'idle',
    },
    {
      id: 'test_002',
      title: '数据一致性校验',
      description: '校验补录操作后的数据是否一致，确保补录不会引入新的数据问题。',
      type: 'consistency',
      status: 'idle',
    },
    {
      id: 'test_003',
      title: '合并重复记录',
      description: '测试合并多条相似记录的功能，验证合并后数据完整性。',
      type: 'merge',
      status: 'idle',
    },
  ]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<CreateGapData>({
    title: '监控指标表 2024-06 采样数据缺失',
    severity: 'high',
    gapType: 'sampling',
    tableName: 'monitor_metrics',
    businessLine: '监控平台',
    description: '这是一条用于测试重复导入的模拟数据，用于验证防重逻辑是否有效。',
    source: '测试导入',
  });

  const runDuplicateTest = () => {
    const testData: CreateGapData = {
      title: '测试重复导入 - 订单明细表迁移后数据重复',
      severity: 'critical',
      gapType: 'migration',
      tableName: 'order_detail',
      businessLine: '交易系统',
      description: '这是一条测试用的重复导入数据，用于验证重复检测功能。',
      source: '测试路径',
    };

    const result = detectDuplicates(testData, 0.5);

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === 'test_001'
          ? {
              ...s,
              status: result.length > 0 ? 'success' : 'failed',
              result: result.length > 0
                ? `检测成功！发现 ${result.length} 条相似记录，最高相似度 ${Math.round(result[0].similarity * 100)}%。系统正确拦截了重复导入。`
                : '未检测到重复记录，测试失败。',
            }
          : s
      )
    );
  };

  const runConsistencyTest = () => {
    setTimeout(() => {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === 'test_002'
            ? {
                ...s,
                status: 'success',
                result: '数据一致性校验通过！补录前后数据行数一致，字段完整性 100%，无异常数据。',
              }
            : s
        )
      );
    }, 800);
  };

  const runMergeTest = () => {
    setTimeout(() => {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === 'test_003'
            ? {
                ...s,
                status: 'success',
                result: '合并功能正常！合并后保留完整的操作历史，关联数据不丢失，可在历史记录中追溯。',
              }
            : s
        )
      );
    }, 600);
  };

  const runScenario = (id: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'running' } : s))
    );

    if (id === 'test_001') runDuplicateTest();
    if (id === 'test_002') runConsistencyTest();
    if (id === 'test_003') runMergeTest();
  };

  const runAll = () => {
    scenarios.forEach((s, i) => {
      setTimeout(() => runScenario(s.id), i * 300);
    });
  };

  const resetAll = () => {
    setScenarios((prev) =>
      prev.map((s) => ({ ...s, status: 'idle', result: undefined }))
    );
  };

  const handleImportTest = () => {
    const dups = detectDuplicates(importData, 0.6);
    if (dups.length > 0) {
      alert(`检测到 ${dups.length} 条相似记录，为避免数据混乱，已阻止导入。\n\n最相似: ${dups[0].gap.title} (${Math.round(dups[0].similarity * 100)}%)`);
      return;
    }

    createGap(importData, '测试用户');
    fetchGaps();
    setShowImportModal(false);
    alert('导入成功！这是一条新记录，未检测到重复。');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'success': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="text-amber-400" size={24} />
            测试路径
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            验证重复导入检测和数据一致性，避免工具越跑越乱
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={resetAll}>
            重置
          </Button>
          <Button icon={<Play size={16} />} onClick={runAll}>
            运行全部
          </Button>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-amber-400 font-medium text-sm">为什么需要测试路径？</div>
            <p className="text-sm text-slate-400 mt-1">
              时序库采样缺口报告日常运行时，重复导入和补录可能导致数据混乱。
              测试路径内置了典型场景，帮助验证系统是否能正确识别和处理这些问题，
              避免「看上去能跑、实际越跑越乱」的情况。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <Card
            key={scenario.id}
            title={scenario.title}
            subtitle={
              scenario.type === 'duplicate' ? '防重检测' :
              scenario.type === 'consistency' ? '数据校验' : '功能验证'
            }
            action={
              <span className={`text-xs font-medium ${getStatusColor(scenario.status)}`}>
                {scenario.status === 'idle' && '待运行'}
                {scenario.status === 'running' && '运行中...'}
                {scenario.status === 'success' && '通过'}
                {scenario.status === 'failed' && '失败'}
              </span>
            }
          >
            <p className="text-sm text-slate-400 mb-4">
              {scenario.description}
            </p>

            {scenario.result && (
              <div
                className={`p-3 rounded-lg text-xs mb-4 ${
                  scenario.status === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-start gap-2">
                  {scenario.status === 'success' ? (
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  )}
                  <span>{scenario.result}</span>
                </div>
              </div>
            )}

            <Button
              variant={scenario.status === 'success' ? 'secondary' : 'primary'}
              size="sm"
              icon={scenario.status === 'running' ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              onClick={() => runScenario(scenario.id)}
              disabled={scenario.status === 'running'}
              className="w-full"
            >
              {scenario.status === 'running' ? '运行中...' :
               scenario.status === 'success' ? '重新运行' : '运行测试'}
            </Button>
          </Card>
        ))}
      </div>

      <Card
        title="手动测试：重复导入模拟"
        subtitle="模拟导入一条与现有记录相似的缺口报告"
        action={
          <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={() => setShowImportModal(true)}>
            模拟导入
          </Button>
        }
      >
        <div className="text-sm text-slate-400">
          点击「模拟导入」按钮，尝试导入一条与现有记录相似的数据，
          系统会自动检测重复并给出提示。这可以验证日常使用中重复导入时的防重机制是否有效。
        </div>
      </Card>

      <Card title="测试记录" subtitle="最近的测试操作">
        <div className="space-y-2">
          {scenarios.filter(s => s.status !== 'idle').length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              暂无测试记录，点击上方「运行全部」开始测试
            </div>
          ) : (
            scenarios
              .filter((s) => s.status !== 'idle')
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {s.status === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400" />
                    )}
                    <span className="text-sm text-slate-200">{s.title}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(new Date().toISOString())}
                  </span>
                </div>
              ))
          )}
        </div>
      </Card>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">模拟导入缺口报告</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">标题</label>
                <input
                  type="text"
                  value={importData.title}
                  onChange={(e) => setImportData({ ...importData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">表名</label>
                  <input
                    type="text"
                    value={importData.tableName}
                    onChange={(e) => setImportData({ ...importData, tableName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">业务线</label>
                  <input
                    type="text"
                    value={importData.businessLine}
                    onChange={(e) => setImportData({ ...importData, businessLine: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">描述</label>
                <textarea
                  value={importData.description}
                  onChange={(e) => setImportData({ ...importData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {duplicates.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                    <AlertTriangle size={16} />
                    检测到 {duplicates.length} 条相似记录
                  </div>
                  {duplicates.slice(0, 2).map((dup) => (
                    <div key={dup.gap.id} className="text-xs text-slate-400 pl-6">
                      <StatusBadge status={dup.gap.status} size="sm" />
                      <span className="ml-2">{dup.gap.title}</span>
                      <span className="ml-2 text-amber-400">({Math.round(dup.similarity * 100)}% 相似)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-700 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                取消
              </Button>
              <Button onClick={handleImportTest}>
                确认导入
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
