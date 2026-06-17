import { useState, useMemo } from 'react';
import useAppStore from '@/store/useAppStore';
import SafetyStatusTable from '@/components/dashboard/SafetyStatusTable';
import { cn } from '@/lib/utils';
import { ShieldCheck, RefreshCw, FileDown, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

type SimulatedExportStatus = {
  pageStatus: boolean;
  exportStatus: boolean;
  isConsistent: boolean;
};

export default function SafetyRulesPage() {
  const { safetyRules, runSafetyChecks } = useAppStore();
  const [running, setRunning] = useState(false);
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<Set<string>>(new Set());

  const simulatedExportRules = useMemo<SimulatedExportStatus[]>(() => {
    return safetyRules.map((r) => ({
      pageStatus: r.pageStatus ?? true,
      exportStatus: Math.random() > 0.3 ? (r.exportStatus ?? true) : !(r.exportStatus ?? true),
      isConsistent: false,
    }));
  }, [safetyRules]);

  const pageStats = useMemo(() => {
    const pagePass = safetyRules.filter((r) => r.pageStatus === true).length;
    const pageFail = safetyRules.filter((r) => r.pageStatus === false).length;
    const pagePending = safetyRules.filter((r) => r.pageStatus === undefined).length;

    const exportPass = simulatedExportRules.filter((r) => r.exportStatus).length;
    const exportFail = simulatedExportRules.filter((r) => !r.exportStatus).length;

    const inconsistencies = safetyRules.filter((r, i) => r.pageStatus !== simulatedExportRules[i].exportStatus).length;
    const total = safetyRules.length;
    const consistentRate = total > 0 ? ((total - inconsistencies) / total) * 100 : 100;

    return {
      pagePass, pageFail, pagePending, exportPass, exportFail, inconsistencies, consistentRate, total
    };
  }, [safetyRules, simulatedExportRules]);

  const inconsistentItems = useMemo(() =>
    safetyRules
      .map((r, i) => ({ rule: r, idx: i, sim: simulatedExportRules[i] }))
      .filter(({ rule, idx }) => rule.pageStatus !== simulatedExportRules[idx].exportStatus)
  , [safetyRules, simulatedExportRules]);

  function toggleIncon(id: string) {
    setExpandedInconsistencies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRecheck() {
    setRunning(true);
    setTimeout(() => {
      runSafetyChecks();
      setRunning(false);
    }, 1200);
  }

  function handleExport() {
    alert('已开始导出规则校验报告...');
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                安全规则校验
              </h1>
              <p className="text-lg text-slate-400 mt-0.5">
                全维度校验评测流程合规性，确保数据质量可靠
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRecheck}
              disabled={running}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                running
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-600 text-white hover:bg-sky-500 shadow-lg shadow-sky-600/25 hover:shadow-sky-500/30'
              )}
            >
              <RefreshCw size={16} className={running ? 'animate-spin' : ''} />
              {running ? '校验中...' : '重新校验全部规则'}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600 transition-all"
            >
              <FileDown size={16} />
              导出规则校验报告
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                PASS <span className="font-mono font-bold text-emerald-300">{pageStats.pagePass}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle size={14} className="text-rose-400" />
                FAIL <span className="font-mono font-bold text-rose-300">{pageStats.pageFail}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-400" />
                不一致 <span className="font-mono font-bold text-amber-300">{safetyRules.filter(r => r.isConsistent === false).length}</span>
              </div>
            </div>
          </div>
        </div>

        <SafetyStatusTable />

        <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-amber-500" />
          <h2 className="text-lg font-semibold text-slate-100">页面与导出一致性说明</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">页面摘要</div>
                <div className="text-xs text-slate-500">当前页面显示的规则结果</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-sm text-slate-200">通过</span>
                </div>
                <span className="font-mono font-bold text-emerald-300 text-lg">{pageStats.pagePass}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-rose-400" />
                  <span className="text-sm text-slate-200">未通过</span>
                </div>
                <span className="font-mono font-bold text-rose-300 text-lg">{pageStats.pageFail}</span>
              </div>
              {pageStats.pagePending > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-600/30 border border-slate-600/50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-300">待校验</span>
                  </div>
                  <span className="font-mono font-bold text-slate-300 text-lg">{pageStats.pagePending}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <FileDown size={16} className="text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">导出文件摘要</div>
                <div className="text-xs text-slate-500">模拟导出报告中的规则结果</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-sm text-slate-200">通过</span>
                </div>
                <span className="font-mono font-bold text-emerald-300 text-lg">{pageStats.exportPass}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-rose-400" />
                  <span className="text-sm text-slate-200">未通过</span>
                </div>
                <span className="font-mono font-bold text-rose-300 text-lg">{pageStats.exportFail}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/40 border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">总数</span>
                </div>
                <span className="font-mono font-bold text-slate-200 text-lg">{pageStats.total}</span>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                pageStats.consistentRate >= 90
                  ? 'bg-emerald-500/20'
                  : pageStats.consistentRate >= 70
                  ? 'bg-amber-500/20'
                  : 'bg-rose-500/20'
              )}>
                <AlertTriangle size={16} className={cn(
                  pageStats.consistentRate >= 90
                    ? 'text-emerald-400'
                    : pageStats.consistentRate >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
                )} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">一致性对比</div>
                <div className="text-xs text-slate-500">页面与导出文件的规则结果对比</div>
              </div>
            </div>

            <div className="text-center mb-4">
              <div className={cn(
                'text-5xl font-bold font-mono mb-1',
                pageStats.consistentRate >= 90
                  ? 'text-emerald-300'
                  : pageStats.consistentRate >= 70
                  ? 'text-amber-300'
                  : 'text-rose-300'
              )}>
                {pageStats.consistentRate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">一致率</div>
            </div>

            <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden mb-4">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  pageStats.consistentRate >= 90
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                    : pageStats.consistentRate >= 70
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-rose-400 to-rose-500'
                )}
                style={{ width: `${pageStats.consistentRate}%` }}
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>一致项</span>
                <span className="font-mono text-emerald-300 font-bold">{pageStats.total - pageStats.inconsistencies}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>不一致项</span>
                <span className="font-mono text-amber-300 font-bold">{pageStats.inconsistencies}</span>
              </div>
            </div>
          </div>
        </div>

        {inconsistentItems.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">不一致项详情（{inconsistentItems.length}）</span>
            </div>
            <div className="space-y-2">
              {inconsistentItems.map(({ rule, idx }) => {
                const expanded = expandedInconsistencies.has(rule.id);
                return (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleIncon(rule.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/10 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-amber-300">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200">{rule.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{rule.description}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={cn(
                            'px-2 py-0.5 rounded font-mono font-bold',
                            rule.pageStatus ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          )}>
                            页面：{rule.pageStatus ? 'PASS' : 'FAIL'}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className={cn(
                            'px-2 py-0.5 rounded font-mono font-bold',
                            simulatedExportRules[rule.idx]?.exportStatus ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          )}>
                            导出：{simulatedExportRules[rule.idx]?.exportStatus ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                      </div>
                    </button>
                    {expanded && (
                      <div className="border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-900/30">
                        <div className="rounded-lg p-3 bg-slate-800/60 border border-slate-700/50">
                          <div className="text-xs font-semibold text-sky-400 mb-1.5">📄 页面显示 PASS/FAIL 的原因</div>
                          <div className="text-sm text-slate-300 leading-relaxed">
                            {rule.detail ?? `页面配置为${rule.pageStatus ? '启用' : '关闭'}，
                            检测${rule.pageStatus ? '通过' : '未通过'}各项阈值校验，
                            结果为${rule.pageStatus ? 'PASS' : 'FAIL'}。`}
                          </div>
                        </div>
                        <div className="rounded-lg p-3 bg-slate-800/60 border border-slate-700/50">
                          <div className="text-xs font-semibold text-amber-400 mb-1.5">📥 导出文件显示 待确认/FAIL 的原因</div>
                          <div className="text-sm text-slate-300 leading-relaxed">
                            {`导出报告中，该规则${simulatedExportRules[rule.idx]?.exportStatus ? '通过' : '未通过'}，
                            原因：检测样本集可能因导出时使用的筛选条件与页面不同，或缓存数据版本不一致，
                            建议检查导出配置是否与页面保持一致。`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
