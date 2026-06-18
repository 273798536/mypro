import { useEffect, useState } from 'react';
import {
  FileDown,
  FileText,
  AlertTriangle,
  Database,
  Search,
  ShieldAlert,
  Users,
  Download,
  Eye,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import {
  api,
  ANOMALY_TYPE_LABEL,
  STATUS_LABEL,
  formatBytes,
  formatDate,
} from '@/utils/api';
import type { ReportData } from '../../shared/types';

export default function ReportPage() {
  const { currentRoundId } = useAuditStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentRoundId) return;
    setLoading(true);
    api
      .getReportPreview(currentRoundId)
      .then((d) => setReport(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [currentRoundId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">审计报告导出</h1>
        <div className="card text-center py-12 muted">加载报告数据中...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">审计报告导出</h1>
        <div className="card text-center py-12 muted">请先选择一个审计轮次</div>
      </div>
    );
  }

  const { summary, anomalies, suggestions, records } = report;
  const exportUrl = api.getReportExportUrl(currentRoundId!);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">审计报告导出</h1>
          <p className="muted text-sm mt-1">
            研发团队只需阅读导出报告，就能明白字段类型漂移为什么被拦下来
          </p>
        </div>
        <a
          href={exportUrl}
          className="btn-primary"
          download
        >
          <Download className="w-4 h-4" /> 导出 Excel 审计报告
        </a>
      </div>

      <div className="card bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs text-navy-300 uppercase tracking-wider">审计报告 · 预览</div>
            <div className="font-serif text-2xl font-bold mt-1">{report.round.name}</div>
            <div className="text-xs text-navy-300 mt-1.5 space-x-3">
              <span className="flex items-center gap-1 inline-flex">
                <Users className="w-3 h-3" /> {report.round.operator}
              </span>
              <span>开始于 {formatDate(report.round.startedAt)}</span>
              <span className="badge-confirmed text-navy-900">
                {STATUS_LABEL[report.round.status]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <div className="text-[10px] text-navy-300 uppercase">异常总计</div>
              <div className="text-2xl font-bold font-serif">{anomalies.length}</div>
            </div>
            <div className="text-center px-4 py-2 bg-jade/10 rounded-lg border border-jade/30">
              <div className="text-[10px] text-jade-soft uppercase">已处理</div>
              <div className="text-2xl font-bold font-serif text-jade-soft">{summary.resolvedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="label">备份记录</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {summary.totalRecords}
            </div>
            <div className="text-xs muted">条备份字段记录</div>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-rose-soft/50 text-rose flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="label">字段类型漂移</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {summary.typeDriftCount}
            </div>
            <div className="text-xs muted">需要补材料或改口径</div>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-soft/50 text-amber flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="label">容量不一致</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {summary.mismatchCount}
            </div>
            <div className="text-xs muted">偏差超过阈值 5%</div>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-navy-100 text-navy-700 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="label">慢查询归因</div>
            <div className="mt-0.5 text-2xl font-serif font-bold text-navy-800">
              {summary.slowQueryCount}
            </div>
            <div className="text-xs muted">已生成 {suggestions.length} 条索引建议</div>
          </div>
        </div>
      </div>

      <div className="card border-rose/20 bg-gradient-to-br from-rose-soft/10 to-white">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-rose" />
          <div className="section-title text-rose-700">研发视角：字段类型漂移拦截说明</div>
        </div>
        <div className="space-y-3 text-sm text-slatex-700 leading-relaxed">
          <p>
            <strong className="text-navy-800">规则 #AUD-203</strong>：审计合规要求备份与指标报表字段类型完全一致。
            当字段类型从高精度缩窄到低精度（如 <span className="mono bg-slatex-100 px-1 rounded">BIGINT → INT</span>、
            <span className="mono bg-slatex-100 px-1 rounded"> DECIMAL(18,4) → DECIMAL(10,2)</span>、
            <span className="mono bg-slatex-100 px-1 rounded"> TEXT → VARCHAR(255)</span>、
            <span className="mono bg-slatex-100 px-1 rounded"> JSON → TEXT</span>）时，
            系统自动标记异常并拦截，防止数据截断、数值溢出、字符被截等风险。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/70 rounded-lg p-3 border border-rose/20">
              <div className="flex items-center gap-1.5 text-rose-700 font-medium text-xs mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 处理方式 A
              </div>
              <p className="text-xs leading-relaxed">
                若业务真实需要精度缩窄，提交变更审批单，在"异常复核中心"使用"补材料"流程。
              </p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-amber/20">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-xs mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 处理方式 B
              </div>
              <p className="text-xs leading-relaxed">
                若指标报表统计口径错误，修改报表统计逻辑，在"异常复核中心"使用"改口径"流程。
              </p>
            </div>
            <div className="bg-white/70 rounded-lg p-3 border border-navy-200">
              <div className="flex items-center gap-1.5 text-navy-700 font-medium text-xs mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 同步处理
              </div>
              <p className="text-xs leading-relaxed">
                参考本报告"索引建议"章节，一并修复慢查询归因问题，工单补录后归因会自动联动更新。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose" /> 异常明细
          </div>
          <span className="text-xs muted">{anomalies.length} 条</span>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slatex-500 border-b border-slatex-200">
                <th className="pb-2 font-medium">异常类型</th>
                <th className="pb-2 font-medium">描述</th>
                <th className="pb-2 font-medium">证据</th>
                <th className="pb-2 font-medium">建议</th>
                <th className="pb-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.id} className="border-b border-slatex-100">
                  <td className="py-2">
                    <span className={`inline-flex items-center gap-1 ${
                      a.type === 'type_drift' ? 'text-rose-700' :
                      a.type === 'data_mismatch' ? 'text-amber-700' :
                      'text-navy-700'
                    } text-xs font-medium`}>
                      {a.type === 'type_drift' && <ShieldAlert className="w-3 h-3" />}
                      {ANOMALY_TYPE_LABEL[a.type] || a.type}
                    </span>
                  </td>
                  <td className="py-2 text-slatex-700 text-xs max-w-sm">{a.description}</td>
                  <td className="py-2 text-xs muted mono max-w-xs truncate">{a.evidence}</td>
                  <td className="py-2">
                    <span className="badge-pending">
                      {a.suggestedAction === 'supply_material' ? '补材料' : a.suggestedAction === 'adjust_caliber' ? '改口径' : '跳过'}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`badge-${a.status}`}>{STATUS_LABEL[a.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title flex items-center gap-2">
            <Search className="w-4 h-4 text-navy-600" /> 索引建议
          </div>
          <span className="text-xs muted">{suggestions.length} 条持续性建议，非一次性判断</span>
        </div>
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-slatex-50 hover:bg-slatex-100 transition">
              <ChevronRight className="w-4 h-4 text-slatex-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="mono text-xs font-semibold text-navy-700 bg-white px-1.5 py-0.5 rounded border border-slatex-200">
                    {s.tableName}
                  </span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                    s.priority === 'high' ? 'bg-rose-soft text-rose-700' :
                    s.priority === 'medium' ? 'bg-amber-soft text-amber-700' :
                    'bg-navy-50 text-navy-700'
                  }`}>
                    {s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                  {s.relatedWorkOrder && (
                    <span className="text-[11px] muted mono">关联 {s.relatedWorkOrder}</span>
                  )}
                </div>
                <div className="mono text-xs mt-1 bg-slatex-900 text-navy-100 px-2 py-1.5 rounded inline-block">
                  {s.suggestedIndex}
                </div>
                <div className="text-xs text-slatex-600 mt-1.5 leading-relaxed">
                  <Eye className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {s.reason}
                </div>
                <div className="text-xs text-jade-700 mt-1">预期收益：{s.expectedBenefit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="section-title flex items-center gap-2">
            <Database className="w-4 h-4 text-navy-600" /> 备份记录概览
          </div>
          <span className="text-xs muted">{records.length} 条</span>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slatex-500 border-b border-slatex-200">
                <th className="pb-2 font-medium">表名</th>
                <th className="pb-2 font-medium">字段</th>
                <th className="pb-2 font-medium">备份类型</th>
                <th className="pb-2 font-medium">报表类型</th>
                <th className="pb-2 font-medium">备份容量</th>
                <th className="pb-2 font-medium">报表容量</th>
                <th className="pb-2 font-medium">预警</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-slatex-100">
                  <td className="py-1.5 mono font-medium text-navy-800">{r.tableName}</td>
                  <td className="py-1.5 mono text-slatex-700">{r.fieldName}</td>
                  <td className={`py-1.5 mono text-xs ${r.hasTypeDrift ? 'text-rose font-semibold' : ''}`}>
                    {r.backupType}
                  </td>
                  <td className={`py-1.5 mono text-xs ${r.hasTypeDrift ? 'text-rose font-semibold' : ''}`}>
                    {r.reportType}
                  </td>
                  <td className={`py-1.5 mono text-xs ${r.hasSizeMismatch ? 'text-amber font-semibold' : ''}`}>
                    {formatBytes(r.backupSize)}
                  </td>
                  <td className={`py-1.5 mono text-xs ${r.hasSizeMismatch ? 'text-amber font-semibold' : ''}`}>
                    {formatBytes(r.reportSize)}
                  </td>
                  <td className="py-1.5">
                    {r.hasTypeDrift && <span className="badge-pending mr-1">类型漂移</span>}
                    {r.hasSizeMismatch && <span className="badge-pending">容量差异</span>}
                    {!r.hasTypeDrift && !r.hasSizeMismatch && (
                      <span className="badge-resolved">正常</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <a href={exportUrl} className="btn-primary" download>
          <FileDown className="w-4 h-4" /> 下载完整 Excel 报告
        </a>
      </div>
    </div>
  );
}
