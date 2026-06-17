import { useState, useEffect } from 'react';
import useAppStore from '@/store/useAppStore';
import type { ExportConfig, PrecheckResult } from '@/types';
import { cn } from '@/lib/utils';
import { Download, FileText, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2, Shield, Zap, Link, Lock, Eye, RefreshCw } from 'lucide-react';

type FormatType = 'pdf' | 'excel';

const MODULE_OPTIONS = [
  { id: 'dashboard', label: '仪表盘总览', icon: FileText },
  { id: 'confidence', label: '置信区间分析', icon: FileText },
  { id: 'correction', label: '修正记录明细', icon: FileText },
  { id: 'gray', label: '灰度版本对比', icon: FileText },
  { id: 'distribution', label: '分布统计结论', icon: FileText },
  { id: 'safety', label: '安全规则校验', icon: FileText },
];

const PRECHECK_STEPS = [
  { key: 'safety_rules', label: '安全规则校验', icon: Shield, desc: '检查规则一致性与通过情况' },
  { key: 'reproducibility', label: '样例可复现性', icon: Zap, desc: '验证样本评测结果复现' },
  { key: 'traceability', label: '追溯完整度', icon: Link, desc: '校验溯源信息完整性' },
];

export default function ExportPage() {
  const { runPrecheck, exportReport, currentVersionId, versions } = useAppStore();
  const [format, setFormat] = useState<FormatType>('pdf');
  const [modules, setModules] = useState<string[]>(MODULE_OPTIONS.map(m => m.id));
  const [watermark, setWatermark] = useState(true);
  const [versionStamp, setVersionStamp] = useState(true);
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<PrecheckResult[]>([]);
  const [stepStatus, setStepStatus] = useState<Record<string, 'idle' | 'running' | 'done' | 'fail'>>({});
  const [allDone, setAllDone] = useState(false);
  const [exporting, setExporting] = useState(false);

  const currentVersion = versions.find(v => v.id === currentVersionId);

  function toggleModule(id: string) {
    setModules(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }

  function allPassed() {
    return results.length > 0 && results.every(r => r.status !== 'fail');
  }

  async function handleRunPrecheck() {
    setRunning(true);
    setAllDone(false);
    setResults([]);
    setStepStatus({});

    const allResults = runPrecheck();

    for (let i = 0; i < PRECHECK_STEPS.length; i++) {
      const step = PRECHECK_STEPS[i];
      setStepStatus(prev => ({ ...prev, [step.key]: 'running' }));
      await new Promise(resolve => setTimeout(resolve, 900 + Math.random() * 500));
      const result = allResults.find(r => r.type === step.key) ?? allResults[i];
      setResults(prev => [...prev, result]);
      setStepStatus(prev => ({
        ...prev,
        [step.key]: result?.status === 'pass' || result?.status === 'warning' ? 'done' : 'fail',
      }));
    }

    setRunning(false);
    setAllDone(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const config: ExportConfig = {
        title: '模型评测置信区间分析报告',
        author: '数据标注团队',
        createdAt: new Date().toISOString(),
        versionId: currentVersionId,
        includeCharts: format === 'pdf',
        includeRawData: modules.includes('correction'),
      };
      const blob = await exportReport(config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eval_report_${currentVersionId}_${new Date().toISOString().slice(0,10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const passedCount = results.filter(r => r.status === 'pass').length;
  const totalCount = results.length || PRECHECK_STEPS.length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Download size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-300 via-rose-300 to-pink-300 bg-clip-text text-transparent">
                导出中心
              </h1>
              <p className="text-lg text-slate-400 mt-0.5">
                一键生成完整的评测分析报告
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-6 rounded-full bg-orange-500" />
                <h2 className="text-lg font-semibold text-slate-100">导出配置</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-sm font-medium text-slate-200 mb-3">报告格式</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormat('pdf')}
                      className={cn(
                        'relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                        format === 'pdf'
                          ? 'bg-sky-600/20 border-sky-500 text-sky-200'
                          : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                      )}
                    >
                      <FileText size={28} />
                      <div className="font-semibold">PDF 报告</div>
                      <div className="text-[10px opacity-70">含图表 · 适合汇报</div>
                      {format === 'pdf' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      )}
                    </button>
                    <button
                      onClick={() => setFormat('excel')}
                      className={cn(
                        'relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                        format === 'excel'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900/40 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                      )}
                    >
                      <FileSpreadsheet size={28} />
                      <div className="font-semibold">Excel 数据</div>
                      <div className="text-[10px] opacity-70">原始数据 · 可二次分析</div>
                      {format === 'excel' && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-slate-200">包含模块</div>
                    <span className="text-xs text-slate-500">{modules.length}/{MODULE_OPTIONS.length} 个模块</span>
                  </div>
                  <div className="space-y-2">
                    {MODULE_OPTIONS.map(opt => {
                      const checked = modules.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
                            checked
                              ? 'bg-sky-500/10 border border-sky-500/30'
                              : 'bg-slate-900/30 border border-transparent hover:bg-slate-800/60'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModule(opt.id)}
                            className="w-4 h-4 rounded accent-sky-500"
                          />
                          <opt.icon size={16} className={cn(
                            'flex-shrink-0',
                            checked ? 'text-sky-400' : 'text-slate-500'
                          )} />
                          <span className={cn(
                            'text-sm',
                            checked ? 'text-slate-200' : 'text-slate-500'
                          )}>
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                  <div className="text-sm font-medium text-slate-200 mb-3">附加选项</div>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/30 hover:bg-slate-800/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={watermark}
                          onChange={e => setWatermark(e.target.checked)}
                          className="w-4 h-4 rounded accent-sky-500"
                        />
                        <Eye size={16} className="text-slate-400" />
                        <div>
                          <div className="text-sm text-slate-200">添加水印</div>
                          <div className="text-xs text-slate-500">报告每页添加「内部使用水印</div>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/30 hover:bg-slate-800/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={versionStamp}
                          onChange={e => setVersionStamp(e.target.checked)}
                          className="w-4 h-4 rounded accent-sky-500"
                        />
                        <FileText size={16} className="text-slate-400" />
                        <div>
                          <div className="text-sm text-slate-200">加版本戳</div>
                          <div className="text-xs text-slate-500">页眉显示版本号与生成时间</div>
                        </div>
                      </div>
                    </label>

                    <div>
                      <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/30 hover:bg-slate-800/60 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={encrypt}
                            onChange={e => {
                              setEncrypt(e.target.checked);
                              if (!e.target.checked) setPassword('');
                            }}
                            className="w-4 h-4 rounded accent-sky-500"
                          />
                          <Lock size={16} className={cn('text-slate-400', encrypt && 'text-amber-400')} />
                          <div>
                            <div className={cn('text-sm', encrypt ? 'text-amber-300' : 'text-slate-200')}>加密密码（可选）</div>
                            <div className="text-xs text-slate-500">打开文件需要输入密码</div>
                          </div>
                        </div>
                      </label>
                      {encrypt && (
                        <div className="mt-2 pl-8">
                          <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="请输入密码..."
                            className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-amber-500/30 text-sm text-amber-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRunPrecheck}
                  disabled={running}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                    running
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-sky-600 to-violet-600 text-white hover:from-sky-500 hover:to-violet-500 shadow-lg shadow-sky-600/25'
                  )}
                >
                  {running ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      预检运行中...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      运行预检并生成
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 rounded-full bg-emerald-500" />
                  <h2 className="text-lg font-semibold text-slate-100">预检进度</h2>
                </div>
                {allDone && (
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                    allPassed()
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  )}>
                    {allPassed() ? (
                      <><CheckCircle2 size={12} /> 全部通过 ✓</>
                    ) : (
                      <><AlertTriangle size={12} /> 存在待修复项</>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                {PRECHECK_STEPS.map((step, idx) => {
                  const status = stepStatus[step.key] ?? 'idle';
                  return (
                    <>
                      <div className="flex flex-col items-center flex-1">
                      <div className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500',
                        status === 'idle' && 'bg-slate-800/60 border-slate-700 text-slate-500',
                        status === 'running' && 'bg-sky-500/20 border-sky-500 text-sky-400 animate-pulse shadow-lg shadow-sky-500/30',
                        (status === 'done' || status === 'fail') && status === 'done' && 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
                        (status === 'done' || status === 'fail') && status === 'fail' && 'bg-rose-500/20 border-rose-500 text-rose-400',
                      )}>
                        {status === 'running' ? (
                          <Loader2 size={24} className="animate-spin" />
                        ) : status === 'done' || status === 'fail' ? (
                          status === 'done' ? <CheckCircle2 size={26} /> : <XCircle size={26} />
                        ) : (
                          <step.icon size={24} />
                        )}
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-200 text-center">{step.label}</div>
                      <div className="text-[10px] text-slate-500 text-center mt-0.5 max-w-[100px]">{step.desc}</div>
                    </div>
                    {idx < PRECHECK_STEPS.length - 1 && (
                      <div className={cn(
                        'w-12 h-0.5 -mt-8 mb-8 rounded-full transition-all duration-500',
                        (stepStatus[step.key] === 'done' || stepStatus[step.key] === 'fail')
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : 'bg-slate-700'
                      )} />
                    )}
                    </>
                  );
                })}
              </div>

              <div className="space-y-3">
                {results.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/60 mb-3">
                      <Shield size={32} className="text-slate-600" />
                    </div>
                    <div className="text-slate-500 text-sm">点击左侧「运行预检并生成」开始执行预检流程</div>
                    <div className="text-slate-600 text-xs mt-1">将依次校验安全规则、样例复现、追溯完整度</div>
                  </div>
                ) : (
                  results.map((r) => {
                  const isPass = r.status === 'pass';
                  const isWarn = r.status === 'warning';
                  const details = r.details as Record<string, any>;
                  const passed = details?.passed ?? details?.reproducible ?? details?.complete ?? 0;
                  const total = details?.total ?? 0;
                  const failed = details?.failed ?? 0;
                  const pct = total > 0 ? Math.round((passed / total) * 100) : 100;

                  return (
                    <div key={r.type} className={cn(
                      'rounded-xl border p-4 transition-all',
                      isPass && 'border-emerald-500/30 bg-emerald-500/5',
                      isWarn && 'border-amber-500/30 bg-amber-500/5',
                      !isPass && !isWarn && 'border-rose-500/30 bg-rose-500/5'
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {isPass ? (
                            <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          ) : isWarn ? (
                            <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle size={20} className="text-rose-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-semibold text-slate-100">{r.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{r.message}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl font-bold font-mono">
                            <span className={cn(
                              isPass ? 'text-emerald-300' : isWarn ? 'text-amber-300' : 'text-rose-300'
                            )}>
                              {passed}
                            </span>
                            <span className="text-slate-500 text-sm">/{total}</span>
                          </div>
                          <div className={cn(
                            'text-xs font-medium mt-0.5',
                            isPass ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400'
                          )}>
                            ({pct}%)
                          </div>
                        </div>
                      </div>
                      {!isPass && failed > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="text-xs font-semibold text-rose-400 mb-2">🛠 修复建议：</div>
                          <ul className="text-xs text-slate-400 space-y-1.5">
                            {r.type === 'safety_rules' && (
                              <>
                                <li>• 检查导出配置中的规则开关是否与页面保持一致</li>
                                <li>• 对于不一致规则：{details?.failedRules?.slice(0, 3)?.join('、') ?? '请查看详情'}</li>
                              </>
                            )}
                            {r.type === 'reproducibility' && (
                              <>
                                <li>• 确认模型推理环境是否与训练时一致</li>
                                <li>• 检查预处理 pipeline 是否有版本更新</li>
                                <li>• 建议使用固定随机种子重新评测</li>
                              </>
                            )}
                            {r.type === 'traceability' && (
                              <>
                                <li>• 补充缺失的源文件名和行号信息</li>
                                <li>• 检查导入脚本，确保数据源配置正确</li>
                              </>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              </div>

              {allDone && (
                <div className={cn(
                  'mt-6 rounded-xl p-5 text-center border-2 transition-all',
                  allPassed()
                    ? 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border-emerald-500/40'
                    : 'bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-orange-500/15 border-rose-500/40'
                )}>
                  {allPassed() ? (
                    <>
                      <div className="text-3xl mb-2">✅</div>
                      <div className="text-xl font-bold text-emerald-200 mb-1">预检全部通过</div>
                      <div className="text-sm text-emerald-300/80 mb-4">
                        {passedCount}/{totalCount} 项检查合格，报告可以安全导出</div>
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className={cn(
                          'inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base transition-all',
                          exporting
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-2xl shadow-emerald-500/30'
                        )}
                      >
                        {exporting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            正在生成...
                          </>
                        ) : (
                          <>
                            <Download size={18} />
                            下载 {format.toUpperCase()} 报告
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl mb-2">⚠️</div>
                      <div className="text-xl font-bold text-rose-200 mb-1">预检发现待修复项</div>
                      <div className="text-sm text-rose-300/80 mb-4">
                        建议先修复上述问题，再重新运行预检</div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={handleRunPrecheck}
                          disabled={running}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600 transition-all"
                        >
                          <RefreshCw size={16} className={running ? 'animate-spin' : ''} />
                          重新预检
                        </button>
                        <button
                          onClick={handleExport}
                          disabled={exporting}
                          className={cn(
                            'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all',
                            exporting
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:from-rose-400 hover:to-orange-400 shadow-lg shadow-rose-500/20'
                          )}
                        >
                          {exporting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              正在生成...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              仍要导出
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
