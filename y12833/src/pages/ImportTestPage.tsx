import { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  Database,
  GitBranch,
  FileDiff,
  FileCheck,
  BarChart3,
  RefreshCcw,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  AlertCircle,
  ChevronRight,
  Eye,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { DuplicateCheckResult, ImportStrategy, SequencingRun, ConsistencyReport } from '@/types';
import {
  cn,
  computeSimpleMD5,
  getMatchTypeText,
  getStrategyText,
  fieldLabel,
  formatDateTime,
} from '@/utils';

type SimScenario = 'clean' | 'exact_md5' | 'same_batch_conflict' | 'same_batch_minor';

const SCENARIOS: Array<{
  id: SimScenario;
  name: string;
  desc: string;
  icon: any;
  color: string;
}> = [
  {
    id: 'clean',
    name: '正常导入（无重复）',
    desc: '新批次新数据，顺利通过校验入库',
    icon: CheckCircle2,
    color: 'tundra-green',
  },
  {
    id: 'exact_md5',
    name: '完全重复（MD5一致）',
    desc: '误操作点了两次同一文件，MD5完全相同',
    icon: RefreshCcw,
    color: 'amber-warning',
  },
  {
    id: 'same_batch_minor',
    name: '同批次补录（小差异）',
    desc: '同一天同批次重测，质量值略有波动<5%',
    icon: GitBranch,
    color: 'deep-ocean',
  },
  {
    id: 'same_batch_conflict',
    name: '同批次冲突（大差异）',
    desc: '质量值差>5%+说明文字变化，需要人工决策',
    icon: AlertTriangle,
    color: 'red-500',
  },
];

export default function ImportTestPage() {
  const store = useAppStore();
  const [scenario, setScenario] = useState<SimScenario>('exact_md5');
  const [simStep, setSimStep] = useState<0 | 1 | 2 | 3>(0);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('SPL-20260601-001');
  const [strategy, setStrategy] = useState<ImportStrategy | null>(null);
  const [simCheckResult, setSimCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [simImportedPayload, setSimImportedPayload] = useState<any>(null);
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const existingRunForSample = useMemo(
    () => store.sequencingRuns.find((r) => r.sampleId === selectedSampleId),
    [store.sequencingRuns, selectedSampleId]
  );

  const buildSimPayload = (): Omit<SequencingRun, 'id' | 'importTime'> & { forceStrategy?: ImportStrategy } => {
    const base = existingRunForSample || store.sequencingRuns[0];
    const sameSampleId = selectedSampleId;
    switch (scenario) {
      case 'clean': {
        const newBatch = 'BATCH-2026-W23-999';
        return {
          sampleId: sameSampleId,
          batchNo: newBatch,
          geneLocus: base.geneLocus + ' (补充位点)',
          sequencingDepth: 55,
          qualityScore: 42,
          gcContent: 47.0,
          matchedSpecies: base.matchedSpecies,
          dataMd5: computeSimpleMD5(newBatch + Date.now() + Math.random()),
          description: '【新增批次】针对 '+base.geneLocus+' 的验证实验，独立生物学重复。',
          importOperator: '测试员-自动模拟',
        };
      }
      case 'exact_md5': {
        return {
          sampleId: base.sampleId,
          batchNo: base.batchNo,
          geneLocus: base.geneLocus,
          sequencingDepth: base.sequencingDepth,
          qualityScore: base.qualityScore,
          gcContent: base.gcContent,
          matchedSpecies: base.matchedSpecies,
          dataMd5: base.dataMd5,
          description: base.description,
          importOperator: base.importOperator + '(重复导入)',
        };
      }
      case 'same_batch_minor': {
        return {
          sampleId: base.sampleId,
          batchNo: base.batchNo,
          geneLocus: base.geneLocus,
          sequencingDepth: Math.round(base.sequencingDepth * 1.02),
          qualityScore: Math.round(base.qualityScore * 1.01 * 10) / 10,
          gcContent: base.gcContent,
          matchedSpecies: base.matchedSpecies,
          dataMd5: computeSimpleMD5(base.dataMd5 + 'minor_v2'),
          description: base.description,
          importOperator: '测试员-补录修正',
        };
      }
      case 'same_batch_conflict': {
        return {
          sampleId: base.sampleId,
          batchNo: base.batchNo,
          geneLocus: base.geneLocus,
          sequencingDepth: Math.round(base.sequencingDepth * 0.85),
          qualityScore: Math.round(base.qualityScore * 0.9 * 10) / 10,
          gcContent: base.gcContent + 2.5,
          matchedSpecies: base.matchedSpecies,
          dataMd5: computeSimpleMD5(base.dataMd5 + 'conflict_version'),
          description:
            '【冲突数据】同一批次另一台仪器出的结果，数值有偏差。怀疑是样品交叉污染引起的测序深度下降，质量值偏低。需与原数据对比后人工裁决。',
          importOperator: '测试员-冲突模拟',
        };
      }
    }
  };

  const runStep1 = () => {
    const payload = buildSimPayload();
    setSimImportedPayload(payload);
    const check = store.checkDuplicateImport('sequencing', payload);
    setSimCheckResult(check);
    setSimStep(1);
    setStrategy(null);

    if (check.isDuplicate) {
      if (check.matchType === 'exact_md5') setStrategy('skip');
      else if (check.conflictingFields.length <= 1) setStrategy('merge');
      else setStrategy(null);
    }
  };

  const runStep2_applyStrategy = () => {
    if (!simImportedPayload) return;
    setSimImportedPayload({ ...simImportedPayload, forceStrategy: strategy });
    setSimStep(2);
  };

  const runStep3_executeImport = () => {
    if (!simImportedPayload || !strategy) return;
    store.importSequencingData({ ...simImportedPayload, forceStrategy: strategy });
    setSimStep(3);
  };

  const resetSim = () => {
    setSimStep(0);
    setSimCheckResult(null);
    setSimImportedPayload(null);
    setStrategy(null);
  };

  const runConsistency = () => {
    const r = store.runConsistencyCheck();
    setReport(r);
    setShowReport(true);
  };

  const conflictFields = simCheckResult?.conflictingFields || [];
  const oldRecord = simCheckResult?.existingRecordId
    ? store.sequencingRuns.find((r) => r.id === simCheckResult.existingRecordId)
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">测试工具 / 数据一致性</div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 font-serif-cn flex items-center gap-2">
            ⚠️ 重复导入测试 & 一致性校验
            <span className="ml-3 px-2 py-0.5 rounded bg-amber-warning/15 text-amber-warning text-xs font-normal border border-amber-warning/30">
              测试路径必跑，防越跑越乱
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            每次真正导入前，先在这里模拟4种典型场景。系统会检测重复、给出策略、生成报告，避免出现"一事两结论"。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetSim} className="btn-secondary text-sm flex items-center gap-1.5">
            <RefreshCcw className="w-4 h-4" />
            重置模拟
          </button>
          <button onClick={runConsistency} className="btn-warning text-sm flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            运行全库一致性报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {SCENARIOS.map((s) => {
          const active = scenario === s.id;
          const IconCmp = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => { setScenario(s.id); resetSim(); }}
              className={cn(
                'card text-left !p-4 transition-all',
                active && `!border-2 !border-${s.color} !shadow-lg -translate-y-1`
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center mb-2',
                s.color === 'tundra-green' && 'bg-tundra-green/15 text-tundra-green-dark',
                s.color === 'amber-warning' && 'bg-amber-warning/15 text-amber-warning',
                s.color === 'deep-ocean' && 'bg-deep-ocean/15 text-deep-ocean',
                s.color === 'red-500' && 'bg-red-500/15 text-red-600',
              )}>
                <IconCmp className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-slate-800 mb-1">{s.name}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{s.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-5">
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold text-slate-800 font-serif-cn text-sm flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-deep-ocean" />
              导入配置
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1.5">选择样本</label>
                <select
                  value={selectedSampleId}
                  onChange={(e) => { setSelectedSampleId(e.target.value); resetSim(); }}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-deep-ocean"
                >
                  {store.samples.slice(0, 6).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} · {s.species}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="font-semibold text-slate-600 mb-1.5">当前场景</div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11.5px] text-slate-600 leading-relaxed">
                  {SCENARIOS.find((x) => x.id === scenario)?.desc}
                </div>
              </div>
              {existingRunForSample && (
                <div>
                  <div className="font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> 现有记录参考
                  </div>
                  <div className="p-2.5 rounded-lg bg-deep-ocean/[0.04] border border-deep-ocean/20 space-y-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">测序轮次:</span><span className="font-mono-data font-semibold">{existingRunForSample.id}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">批次号:</span><span className="font-mono-data">{existingRunForSample.batchNo}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">测序深度:</span><span className="font-mono-data">{existingRunForSample.sequencingDepth}×</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">质量值:</span><span className="font-mono-data">Q{existingRunForSample.qualityScore}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">数据MD5:</span><span className="font-mono-data text-[9px] break-all">{existingRunForSample.dataMd5.slice(0,16)}...</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-gradient-to-br from-deep-ocean to-deep-ocean-light text-white">
            <h3 className="font-bold font-serif-cn text-sm flex items-center gap-2 mb-3">
              <Play className="w-4 h-4" />
              模拟执行步骤
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { k: 1, label: '生成数据并校验重复', done: simStep >= 1 },
                { k: 2, label: '选择合并策略(如有冲突)', done: simStep >= 2 },
                { k: 3, label: '执行导入并记录日志', done: simStep >= 3 },
              ].map((step) => (
                <div key={step.k} className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 border-2',
                    step.done ? 'bg-tundra-green border-tundra-green text-white' : 'bg-white/10 border-white/30 text-slate-200'
                  )}>
                    {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.k}
                  </div>
                  <span className={step.done ? 'text-white' : 'text-slate-300'}>{step.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 space-y-2">
              {simStep === 0 && (
                <button onClick={runStep1} className="w-full !bg-tundra-green hover:!bg-tundra-green-light !text-white !border-0 btn-secondary text-sm py-2.5 flex items-center justify-center gap-1.5">
                  <UploadCloud className="w-4 h-4" />
                  步骤1：开始校验
                </button>
              )}
              {simStep === 1 && simCheckResult?.isDuplicate && (
                <div className="text-amber-light text-[11px] flex items-start gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  检测到{simCheckResult.conflictingFields.length > 0 ? `${simCheckResult.conflictingFields.length}个冲突字段` : '完全重复'}，请选择策略
                </div>
              )}
              {simStep === 1 && (
                <button
                  onClick={runStep2_applyStrategy}
                  disabled={simCheckResult?.isDuplicate && !strategy}
                  className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                  步骤2：确认策略 →
                </button>
              )}
              {simStep === 2 && (
                <button onClick={runStep3_executeImport} className="w-full !bg-white/95 hover:!bg-white !text-deep-ocean !border-0 btn-secondary text-sm py-2.5 flex items-center justify-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4" />
                  步骤3：执行导入入库
                </button>
              )}
              {simStep === 3 && (
                <button onClick={resetSim} className="w-full !bg-white/15 hover:!bg-white/25 !text-white !border-0 btn-secondary text-sm py-2.5">
                  ✓ 完成，再测一次
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-warning/[0.08] to-transparent flex items-center justify-between">
              <h3 className="font-bold text-slate-800 font-serif-cn text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-warning" />
                重复导入检测面板
              </h3>
              {simCheckResult && (
                <span className={cn(
                  'badge',
                  simCheckResult.isDuplicate
                    ? 'bg-amber-warning/15 text-amber-warning border border-amber-warning/30'
                    : 'bg-tundra-green/15 text-tundra-green-dark border border-tundra-green/30'
                )}>
                  {simCheckResult.isDuplicate ? '⚠️ 发现重复' : '✓ 校验通过'}
                </span>
              )}
            </div>

            {simStep === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <UploadCloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
                点击左侧「开始校验」启动重复检测流程
                <div className="text-xs mt-2 text-slate-400/80">
                  检测维度：数据文件MD5 → 样本ID+批次号组合 → 字段级差异比对
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 mb-1 text-[10px] uppercase tracking-wide">匹配类型</div>
                    <div className={cn(
                      'font-bold text-sm',
                      simCheckResult?.isDuplicate ? 'text-amber-warning' : 'text-tundra-green-dark'
                    )}>
                      {getMatchTypeText(simCheckResult?.matchType || 'none')}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 mb-1 text-[10px] uppercase tracking-wide">冲突字段</div>
                    <div className="font-bold text-sm text-deep-ocean font-mono-data">
                      {conflictFields.length} 个
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {conflictFields.length === 0 ? '数据完全一致' : `超过5%差异阈值`}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 mb-1 text-[10px] uppercase tracking-wide">已有记录</div>
                    <div className="font-mono-data font-bold text-sm text-slate-700">
                      {simCheckResult?.existingRecordId || '—'}
                    </div>
                  </div>
                </div>

                {conflictFields.length > 0 && oldRecord && simImportedPayload && (
                  <div className="p-3 rounded-lg border border-amber-warning/40 bg-amber-warning/[0.03]">
                    <div className="flex items-center gap-2 text-amber-warning font-bold mb-2.5 text-sm">
                      <FileDiff className="w-4 h-4" />
                      字段差异对比 (原数据 vs 新导入)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {conflictFields.map((f) => {
                        const oldV = (oldRecord as any)[f];
                        const newV = (simImportedPayload as any)[f];
                        return (
                          <div key={f} className="p-2 rounded bg-white border border-slate-100">
                            <div className="text-[10px] text-slate-400 font-semibold mb-1">{fieldLabel(f)}</div>
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-mono-data line-through decoration-red-400/50">
                                {typeof oldV === 'number' ? oldV : String(oldV).slice(0, 30)}
                              </span>
                              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                              <span className="px-1.5 py-0.5 rounded bg-tundra-green/10 text-tundra-green-dark font-mono-data">
                                {typeof newV === 'number' ? newV : String(newV).slice(0, 30)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {simStep >= 1 && simCheckResult?.isDuplicate && (
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-700 mb-2 text-sm">
                      <GitBranch className="w-4 h-4 text-deep-ocean" />
                      选择合并处理策略
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['skip', 'overwrite', 'merge', 'manual'] as ImportStrategy[]).map((s, idx) => (
                        <button
                          key={s}
                          onClick={() => setStrategy(s)}
                          className={cn(
                            'p-2.5 rounded-lg border-2 text-left transition-all',
                            strategy === s
                              ? 'border-deep-ocean bg-deep-ocean/5 shadow-md -translate-y-0.5'
                              : 'border-slate-100 bg-slate-50/60 hover:border-slate-200'
                          )}
                        >
                          <div className={cn(
                            'w-6 h-6 rounded-md flex items-center justify-center mb-1.5 text-[11px] font-bold',
                            strategy === s ? 'bg-deep-ocean text-white' : 'bg-white text-slate-500 border border-slate-200'
                          )}>
                            {idx + 1}
                          </div>
                          <div className="text-[10.5px] font-semibold text-slate-700 leading-tight">
                            {getStrategyText(s).split('：')[0]}
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5 leading-tight">
                            {getStrategyText(s).split('：')[1] || ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {simStep >= 3 && (
                  <div className="p-3 rounded-lg bg-tundra-green/8 border-2 border-tundra-green/40">
                    <div className="flex items-center gap-2 text-tundra-green-dark font-bold mb-1.5 text-sm">
                      <FileCheck className="w-4 h-4" />
                      ✓ 导入完成，已写入导入日志
                    </div>
                    <div className="text-[11px] text-slate-600">
                      数据已持久化至本地存储。下方一致性报告可验证本次导入是否产生了"一事两结论"。
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-deep-ocean/5 to-transparent flex items-center justify-between">
              <h3 className="font-bold text-slate-800 font-serif-cn text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-deep-ocean" />
                历史导入日志 (含本次模拟)
              </h3>
              <span className="text-xs text-slate-400">共 {store.importLogs.length} 条记录</span>
            </div>
            <div className="overflow-x-auto scrollbar-thin max-h-[280px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0">
                  <tr className="table-header text-left">
                    <th className="px-3 py-2 font-semibold">日志ID</th>
                    <th className="px-3 py-2 font-semibold">样本/测序</th>
                    <th className="px-3 py-2 font-semibold">类型</th>
                    <th className="px-3 py-2 font-semibold">结果</th>
                    <th className="px-3 py-2 font-semibold">策略</th>
                    <th className="px-3 py-2 font-semibold">操作人</th>
                    <th className="px-3 py-2 font-semibold">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {[...store.importLogs].reverse().slice(0, 15).map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono-data font-semibold text-deep-ocean">{log.id}</td>
                      <td className="px-3 py-2 font-mono-data text-slate-600">
                        {log.sampleId.slice(-7)} / {log.runId?.slice(-3) || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          {log.dataType === 'sequencing' ? '测序' : log.dataType === 'pathology' ? '病理' : '标注'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'badge',
                          log.importStatus === 'success' && 'bg-tundra-green/15 text-tundra-green-dark',
                          log.importStatus === 'duplicate' && 'bg-slate-100 text-slate-600',
                          log.importStatus === 'conflict' && 'bg-amber-warning/15 text-amber-warning',
                          log.importStatus === 'merged' && 'bg-deep-ocean/15 text-deep-ocean',
                        )}>
                          {log.importStatus === 'success' ? '成功' : log.importStatus === 'duplicate' ? '重复(跳过)' : log.importStatus === 'conflict' ? '冲突' : '已合并'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[10px]">
                        {log.conflictStrategy ? getStrategyText(log.conflictStrategy).split('：')[0] : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{log.operator}</td>
                      <td className="px-3 py-2 font-mono-data text-slate-400 text-[10px]">
                        {formatDateTime(log.importTime).slice(5)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showReport && report && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="p-5 bg-gradient-to-r from-deep-ocean to-deep-ocean-light text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif-cn">一致性校验报告</h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      检测全库是否存在"一事两结论"、未关联锚点、导入异常等问题
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-300">综合得分</div>
                  <div className={cn(
                    'text-4xl font-bold font-mono-data',
                    report.overallScore >= 85 ? 'text-tundra-green-light' : report.overallScore >= 60 ? 'text-amber-light' : 'text-red-300'
                  )}>
                    {report.overallScore}
                    <span className="text-xl">/100</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <Database className="w-5 h-5 text-deep-ocean shrink-0" />
                  <div>
                    <div className="text-slate-400">检测对象总数</div>
                    <div className="font-bold text-lg text-slate-800 font-mono-data">{report.totalChecked}</div>
                  </div>
                </div>
                <div className={cn(
                  'p-3 rounded-lg flex items-center gap-3 border',
                  report.duplicateConclusions.length > 0 ? 'bg-red-50 border-red-200' : 'bg-tundra-green/5 border-tundra-green/20'
                )}>
                  {report.duplicateConclusions.length > 0 ? (
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-tundra-green-dark shrink-0" />
                  )}
                  <div>
                    <div className="text-slate-500">一事两结论风险</div>
                    <div className={cn(
                      'font-bold text-lg font-mono-data',
                      report.duplicateConclusions.length > 0 ? 'text-red-600' : 'text-tundra-green-dark'
                    )}>
                      {report.duplicateConclusions.length} 个样本
                    </div>
                  </div>
                </div>
                <div className={cn(
                  'p-3 rounded-lg flex items-center gap-3 border',
                  report.orphanNotes.length > 0 ? 'bg-amber-warning/8 border-amber-warning/30' : 'bg-tundra-green/5 border-tundra-green/20'
                )}>
                  <Unlink className="w-5 h-5 text-amber-warning shrink-0" />
                  <div>
                    <div className="text-slate-500">未关联结论的备注</div>
                    <div className={cn(
                      'font-bold text-lg font-mono-data',
                      report.orphanNotes.length > 0 ? 'text-amber-warning' : 'text-tundra-green-dark'
                    )}>
                      {report.orphanNotes.length} 条
                    </div>
                  </div>
                </div>
                <div className={cn(
                  'p-3 rounded-lg flex items-center gap-3 border',
                  report.orphanConclusions.length > 0 ? 'bg-amber-warning/8 border-amber-warning/30' : 'bg-tundra-green/5 border-tundra-green/20'
                )}>
                  <Unlink className="w-5 h-5 text-amber-warning shrink-0" />
                  <div>
                    <div className="text-slate-500">未关联备注的结论</div>
                    <div className={cn(
                      'font-bold text-lg font-mono-data',
                      report.orphanConclusions.length > 0 ? 'text-amber-warning' : 'text-tundra-green-dark'
                    )}>
                      {report.orphanConclusions.length} 条
                    </div>
                  </div>
                </div>
              </div>

              {(report.duplicateConclusions.length > 0 || report.orphanNotes.length > 0 || report.importAnomalies.length > 0) && (
                <div className="p-4 rounded-lg bg-amber-warning/5 border border-amber-warning/30 text-xs space-y-2">
                  <div className="font-bold text-amber-warning flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    需要处理的问题清单
                  </div>
                  {report.duplicateConclusions.length > 0 && (
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="font-mono-data text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5">高风险</span>
                      <span>样本 {report.duplicateConclusions.join('、')} 疑似存在"一事两结论"，请在病理/结论页核对。</span>
                    </div>
                  )}
                  {report.orphanNotes.length > 0 && (
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="font-mono-data text-[10px] bg-amber-warning/15 text-amber-warning px-1.5 py-0.5 rounded shrink-0 mt-0.5">中风险</span>
                      <span>病理备注 {report.orphanNotes.map(id=>id).join('、')} 还没有关联任何最终结论，签发结论时记得建立双向锚点。</span>
                    </div>
                  )}
                  {report.importAnomalies.length > 0 && (
                    <div className="flex items-start gap-2 text-slate-700">
                      <span className="font-mono-data text-[10px] bg-deep-ocean/10 text-deep-ocean px-1.5 py-0.5 rounded shrink-0 mt-0.5">提示</span>
                      <span>导入日志 {report.importAnomalies.join('、')} 经历过冲突/人工处理，建议抽查是否对最终结论造成影响。</span>
                    </div>
                  )}
                </div>
              )}

              {report.overallScore >= 85 && (
                <div className="p-4 rounded-lg bg-tundra-green/8 border border-tundra-green/40 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-tundra-green-dark shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-tundra-green-dark text-sm mb-0.5">数据一致性良好 ✓</div>
                    <div className="text-slate-600">
                      病理备注与最终结论的双向锚点覆盖率高，重复导入都有对应处理策略记录。
                      继续保持：每次导入先跑本页的模拟校验。
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                生成时间: {report.generatedAt}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={runConsistency} className="btn-secondary text-xs flex items-center gap-1.5">
                  <RefreshCcw className="w-3.5 h-3.5" />
                  重新检测
                </button>
                <button onClick={() => setShowReport(false)} className="btn-primary text-xs">
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
