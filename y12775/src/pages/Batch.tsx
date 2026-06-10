import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ResultBadge } from '@/components/ResultCard';
import {
  History, FlaskConical, Beaker, Calculator,
  ChevronRight, AlertTriangle, Clock, User,
  Package, FileWarning,
} from 'lucide-react';

type TimelineNodeType = 'batch' | 'reagent' | 'experiment' | 'result' | 'retest';

interface TimelineNode {
  type: TimelineNodeType;
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  status?: 'PASS' | 'REVIEW' | 'FAIL' | 'warning' | 'info';
  detail?: string;
}

const nodeConfig: Record<TimelineNodeType, {
  icon: typeof History;
  dotColor: string;
  label: string;
}> = {
  batch: { icon: Package, dotColor: 'bg-primary-500', label: '批次创建' },
  reagent: { icon: FlaskConical, dotColor: 'bg-primary-400', label: '试剂关联' },
  experiment: { icon: Beaker, dotColor: 'bg-primary-600', label: '实验记录' },
  result: { icon: Calculator, dotColor: 'bg-status-pass', label: '计算结果' },
  retest: { icon: FileWarning, dotColor: 'bg-status-review', label: '复测建议' },
};

function BatchPage() {
  const {
    batches,
    experiments,
    results,
    reagents,
    initializeWithMock,
    getExperimentsByBatch,
    getResultsByBatch,
    getReagentById,
  } = useAppStore();

  initializeWithMock();

  const batchTimelines = useMemo(() => {
    return batches.map((batch) => {
      const exps = getExperimentsByBatch(batch.id);
      const resList = getResultsByBatch(batch.id);
      const nodes: TimelineNode[] = [];

      nodes.push({
        type: 'batch',
        id: batch.id,
        title: `批次 ${batch.batchNo} 创建`,
        subtitle: batch.remark || '无备注',
        time: batch.createDate,
        status: 'info',
      });

      const reagentIds = new Set(exps.map((e) => e.reagentId).filter(Boolean));
      reagentIds.forEach((rid) => {
        const r = getReagentById(rid);
        if (r) {
          nodes.push({
            type: 'reagent',
            id: rid,
            title: `使用试剂：${r.name}`,
            subtitle: `${r.code}（批号：${r.batchNo || '未登记'}）`,
            status: r.status === 'expired' ? 'warning' : 'info',
            detail: r.status === 'expired' ? '⚠️ 试剂已过期' : undefined,
          });
        }
      });

      exps.forEach((exp) => {
        const r = exp.reagentId ? getReagentById(exp.reagentId) : undefined;
        nodes.push({
          type: 'experiment',
          id: exp.id,
          title: `实验记录 ${exp.sampleNo}`,
          subtitle: `m₁=${exp.sampleMass}g, m₂=${exp.dryMass}g, B=${exp.blankControl ?? '缺失'}${r ? ` | 试剂：${r.name}` : ''}`,
          time: new Date(exp.createTime).toLocaleString('zh-CN'),
          status: exp.blankControl ? 'info' : 'warning',
          detail: exp.blankControl ? undefined : '⚠️ 空白对照缺失，使用降级计算',
        });
      });

      resList.forEach((res) => {
        nodes.push({
          type: 'result',
          id: res.id,
          title: `计算结果：${res.waterContent.toFixed(4)}${res.unit}`,
          subtitle: res.formula,
          time: new Date(res.calculatedAt).toLocaleString('zh-CN'),
          status: res.status,
          detail: res.failureReason,
        });
        if (res.retestAdvice) {
          nodes.push({
            type: 'retest',
            id: `${res.id}_retest`,
            title: '复测建议已生成',
            subtitle: res.sourceTrace,
            status: 'REVIEW',
            detail: res.retestAdvice,
          });
        }
      });

      const hasWarning = nodes.some((n) => n.status === 'REVIEW' || n.status === 'warning');
      const hasFail = nodes.some((n) => n.status === 'FAIL');

      return {
        batch,
        nodes,
        stats: {
          total: exps.length,
          passed: resList.filter((r) => r.status === 'PASS').length,
          review: resList.filter((r) => r.status === 'REVIEW').length,
          failed: resList.filter((r) => r.status === 'FAIL').length,
        },
        riskLevel: hasFail ? 'high' : hasWarning ? 'medium' : 'low',
      };
    });
  }, [batches, experiments, results, reagents, getExperimentsByBatch, getResultsByBatch, getReagentById]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">批次总数</p>
              <p className="text-2xl font-serif font-bold text-primary-900 mt-1">{batches.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">中高风险批次</p>
              <p className="text-2xl font-serif font-bold text-status-review mt-1">
                {batchTimelines.filter((b) => b.riskLevel !== 'low').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-status-reviewBg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-status-review" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">关联实验记录</p>
              <p className="text-2xl font-serif font-bold text-slate-700 mt-1">{experiments.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {batchTimelines.some((b) => b.riskLevel !== 'low') && (
        <div className="card p-5 border-status-review/30 bg-status-reviewBg/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-review/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-status-review" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-status-review">安全风险提示</p>
              <p className="text-sm text-slate-600 mt-1">
                以下批次存在试剂过期、空白对照缺失、计算异常等情况，需要实验室管理员重点复核
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {batchTimelines
                  .filter((b) => b.riskLevel !== 'low')
                  .map((b) => (
                    <span
                      key={b.batch.id}
                      className={`badge ${b.riskLevel === 'high' ? 'bg-status-failBg text-status-fail' : 'bg-status-reviewBg text-status-review'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${b.riskLevel === 'high' ? 'bg-status-fail' : 'bg-status-review'}`} />
                      {b.batch.batchNo}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {batchTimelines.map(({ batch, nodes, stats, riskLevel }) => (
          <div key={batch.id} className="card overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    riskLevel === 'high' ? 'bg-status-failBg' :
                    riskLevel === 'medium' ? 'bg-status-reviewBg' : 'bg-primary-50'
                  }`}>
                    <History className={`w-5.5 h-5.5 ${
                      riskLevel === 'high' ? 'text-status-fail' :
                      riskLevel === 'medium' ? 'text-status-review' : 'text-primary-700'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-semibold text-slate-800">{batch.batchNo}</h3>
                      {riskLevel !== 'low' && (
                        <span className={`badge text-[10px] ${
                          riskLevel === 'high' ? 'bg-status-failBg text-status-fail' : 'bg-status-reviewBg text-status-review'
                        }`}>
                          {riskLevel === 'high' ? '高风险' : '中风险'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {batch.createDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {batch.operator || '未登记'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono text-slate-700">{stats.total}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">实验</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono text-status-pass">{stats.passed}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">通过</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono text-status-review">{stats.review}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">复核</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono text-status-fail">{stats.failed}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">失败</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="relative pl-8">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary-200 via-slate-200 to-slate-100" />

                {nodes.map((node, idx) => {
                  const cfg = nodeConfig[node.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={`${node.id}-${idx}`} className="relative pb-6 last:pb-0">
                      <div className={`absolute -left-[29px] top-0.5 w-6 h-6 rounded-full ${cfg.dotColor} flex items-center justify-center shadow-md`}>
                        <Icon className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>

                      <div className="card p-4 ml-4 !shadow-sm !border-slate-100 hover:!shadow-card-hover transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">{node.title}</p>
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                {cfg.label}
                              </span>
                              {node.status && node.status !== 'info' && (
                                <ResultBadge status={node.status as any} size="sm" />
                              )}
                            </div>
                            {node.subtitle && (
                              <p className="text-xs text-slate-500 mt-1 font-mono break-all">{node.subtitle}</p>
                            )}
                            {node.detail && (
                              <div className={`mt-2 text-xs p-2.5 rounded-lg whitespace-pre-line ${
                                node.status === 'FAIL' ? 'bg-status-failBg text-status-fail' :
                                node.status === 'REVIEW' || node.status === 'warning' ? 'bg-status-reviewBg text-status-review' :
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {node.detail}
                              </div>
                            )}
                          </div>
                          {node.time && (
                            <span className="text-[11px] text-slate-400 shrink-0">{node.time}</span>
                          )}
                        </div>
                      </div>

                      {idx < nodes.length - 1 && (
                        <ChevronRight className="absolute -left-[26px] top-[28px] w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BatchPage;
