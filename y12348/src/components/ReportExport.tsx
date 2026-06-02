import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileDown,
  Printer,
  Copy,
  CheckCircle,
  Loader2,
  FileText,
  AlertTriangle,
  Clock,
  Droplets,
  Ruler,
  Settings,
} from 'lucide-react';
import type { CalculationSession, PressureUnit, ExportReport } from '@/types';
import { VALVE_NAMES } from '@/data/valveCoefficients';
import { FLUID_NAMES } from '@/data/fluidProperties';
import { formatNumber, cn } from '@/lib/utils';

interface ReportExportProps {
  session: CalculationSession;
  pressureUnit: PressureUnit;
}

export const ReportExport: React.FC<ReportExportProps> = ({
  session,
  pressureUnit,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = (): ExportReport => {
    const results = session.results;
    return {
      sessionId: session.id,
      generatedAt: Date.now(),
      summary: {
        totalPressureDrop: results?.totalPressureDrop ?? 0,
        unit: results?.pressureDropUnit ?? pressureUnit,
        totalFlowRate: session.totalFlowRate,
        flowUnit: session.flowRateUnit,
        contradictionCount: results?.contradictions.filter(c => c.severity === 'error').length ?? 0,
        warningCount: results?.contradictions.filter(c => c.severity === 'warning').length ?? 0,
      },
      fullResults: results,
      inputParameters: {
        fluid: session.fluid,
        segments: session.mainSegments,
        branches: session.branches,
        valve: session.mainValve,
      },
    };
  };

  const generateTextReport = (): string => {
    const report = generateReport();
    const lines: string[] = [];
    const sep = '═'.repeat(60);
    const subsep = '─'.repeat(60);

    lines.push(sep);
    lines.push(`  流体管路压降计算报告`);
    lines.push(`  ${session.title}`);
    lines.push(sep);
    lines.push('');

    lines.push(`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`);
    lines.push(`会话ID: ${report.sessionId}`);
    lines.push('');

    lines.push(subsep);
    lines.push('  一、计算摘要');
    lines.push(subsep);
    lines.push(`  总压降:     ${formatNumber(report.summary.totalPressureDrop)} ${report.summary.unit}`);
    lines.push(`  总流量:     ${formatNumber(report.summary.totalFlowRate)} ${report.summary.flowUnit}`);
    lines.push(`  流体类型:   ${FLUID_NAMES[session.fluid.type]}`);
    lines.push(`  流体温度:   ${session.fluid.temperature}°C`);
    lines.push(`  流体密度:   ${formatNumber(session.fluid.density)} kg/m³`);
    lines.push(`  流体粘度:   ${formatNumber(session.fluid.viscosity)} Pa·s`);
    lines.push(`  错误数:     ${report.summary.contradictionCount}`);
    lines.push(`  警告数:     ${report.summary.warningCount}`);
    lines.push('');

    lines.push(subsep);
    lines.push('  二、主管路段');
    lines.push(subsep);
    session.mainSegments.forEach((segment, index) => {
      lines.push(`  [${index + 1}] ${segment.name}`);
      lines.push(`      管径: ${segment.diameter} ${segment.diameterUnit}  管长: ${segment.length} ${segment.lengthUnit}`);
      lines.push(`      粗糙度: ${segment.roughness} mm  弯头: ${segment.elbowCount}×${segment.elbowAngle}°`);

      if (session.results?.segmentResults[segment.id]) {
        const result = session.results.segmentResults[segment.id];
        lines.push(`      ── 计算结果 ──`);
        lines.push(`      流速:       ${formatNumber(result.flowVelocity.value)} m/s`);
        lines.push(`      雷诺数:     ${formatNumber(result.reynoldsNumber.value)}`);
        lines.push(`      摩擦系数:   ${formatNumber(result.frictionFactor.value)}`);
        lines.push(`      沿程阻力:   ${formatNumber(result.frictionLoss.value)} m`);
        lines.push(`      局部阻力:   ${formatNumber(result.localLoss.value)} m`);
        lines.push(`      阀门阻力:   ${formatNumber(result.valveLoss.value)} m`);
        lines.push(`      总阻力:     ${formatNumber(result.totalLoss.value)} m`);
      }
      lines.push('');
    });

    lines.push(subsep);
    lines.push('  三、主阀门');
    lines.push(subsep);
    lines.push(`  类型: ${VALVE_NAMES[session.mainValve.valveType]}`);
    lines.push(`  开度: ${session.mainValve.openingPercentage}%`);
    lines.push(`  半开标记: ${session.mainValve.isHalfOpen ? '是' : '否'}`);
    lines.push(`  快照时间: ${new Date(session.mainValve.snapshotTimestamp).toLocaleString('zh-CN')}`);
    lines.push('');

    if (session.branches.length > 0) {
      lines.push(subsep);
      lines.push('  四、支路汇总');
      lines.push(subsep);
      session.branches.forEach((branch, index) => {
        const branchFlow = session.totalFlowRate * branch.flowRateRatio;
        lines.push(`  [${index + 1}] ${branch.name}`);
        lines.push(`      流量分配: ${(branch.flowRateRatio * 100).toFixed(1)}% → ${formatNumber(branchFlow)} ${session.flowRateUnit}`);
        lines.push(`      阀门: ${VALVE_NAMES[branch.valveConfig.valveType]} @ ${branch.valveConfig.openingPercentage}%${branch.valveConfig.isHalfOpen ? ' (半开)' : ''}`);
        lines.push(`      数据完整: ${branch.isMissingData ? `否 - 缺失: ${branch.missingFields.join('、')}` : '是'}`);

        if (session.results) {
          let totalHeadLoss = 0;
          branch.segments.forEach(seg => {
            const segResult = session.results!.segmentResults[seg.id];
            if (segResult) totalHeadLoss += segResult.totalLoss.value;
          });
          lines.push(`      支路总阻力: ${formatNumber(totalHeadLoss)} m`);
        }
        lines.push('');
      });
    }

    if (session.results?.contradictions && session.results.contradictions.length > 0) {
      lines.push(subsep);
      lines.push('  五、矛盾与警告');
      lines.push(subsep);
      session.results.contradictions.forEach((c, index) => {
        lines.push(`  [${index + 1}] [${c.severity === 'error' ? '错误' : '警告'}] ${c.message}`);
        lines.push(`      检测值A: ${c.evidence.fieldA.name} = ${formatNumber(c.evidence.fieldA.value)} ${c.evidence.fieldA.unit}`);
        if (c.evidence.fieldB) {
          lines.push(`      检测值B: ${c.evidence.fieldB.name} = ${formatNumber(c.evidence.fieldB.value)} ${c.evidence.fieldB.unit}`);
        }
        if (c.evidence.valveSnapshot) {
          lines.push(`      阀门证据: ${VALVE_NAMES[c.evidence.valveSnapshot.valveType]} @ ${c.evidence.valveSnapshot.openingPercentage}% (半开: ${c.evidence.valveSnapshot.isHalfOpen ? '是' : '否'})`);
        }
        lines.push(`      建议: ${c.evidence.suggestion}`);
        lines.push('');
      });
    }

    if (session.results?.unitValidations && session.results.unitValidations.length > 0) {
      lines.push(subsep);
      lines.push('  六、单位校验');
      lines.push(subsep);
      session.results.unitValidations.forEach((v, index) => {
        lines.push(`  [${index + 1}] [${v.errorType}] ${v.field}: ${v.value} ${v.currentUnit}`);
        lines.push(`      ${v.message}`);
        lines.push('');
      });
    }

    if (session.results?.evidenceChain && session.results.evidenceChain.length > 0) {
      lines.push(subsep);
      lines.push('  七、证据链');
      lines.push(subsep);
      session.results.evidenceChain.forEach((e, index) => {
        lines.push(`  [${index + 1}] [${e.type}] ${e.description}`);
        lines.push(`      时间: ${new Date(e.timestamp).toLocaleString('zh-CN')}`);
        lines.push('');
      });
    }

    lines.push(sep);
    lines.push('  报告结束 - 流体管路压降计算工具');
    lines.push(sep);

    return lines.join('\n');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      if (!reportRef.current) return;

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0A1929',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${session.title}_压降计算报告_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = async () => {
    const text = generateTextReport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const hasResults = session.results !== null;
  const errors = session.results?.contradictions.filter(c => c.severity === 'error').length ?? 0;
  const warnings = session.results?.contradictions.filter(c => c.severity === 'warning').length ?? 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-card p-5"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-800 rounded">
              <FileDown className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-industrial-text">报告导出</h3>
              <p className="text-xs text-industrial-textMuted">
                导出完整计算报告，可直接转给同事确认
              </p>
            </div>
          </div>
        </div>

        {!hasResults ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-industrial-textMuted mx-auto mb-4" />
            <p className="text-industrial-textMuted mb-2">尚无计算结果</p>
            <p className="text-xs text-industrial-textMuted/70">
              请先完成数据输入并执行计算，才能生成报告
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="tech-button flex items-center justify-center gap-2 py-3"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                {isExporting ? '正在导出...' : '导出 PDF'}
              </button>

              <button
                onClick={handleCopyText}
                className="tech-button-secondary flex items-center justify-center gap-2 py-3"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-success-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? '已复制' : '复制文本'}
              </button>

              <button
                onClick={handlePrint}
                className="tech-button-secondary flex items-center justify-center gap-2 py-3"
              >
                <Printer className="w-4 h-4" />
                打印报告
              </button>
            </div>

            <div className="p-3 bg-warning-500/10 border border-warning-500/30 rounded flex items-start gap-2 mb-6">
              <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-industrial-textMuted">
                <span className="text-warning-400 font-medium">报告口径说明：</span>
                支路汇总的流量口径为 {session.flowRateUnit}，压降口径为米水柱(m)，
                转换为 {session.results!.pressureDropUnit} 时的换算系数已包含在计算过程中。
                {errors > 0 && ` 当前存在 ${errors} 项错误，报告中的数据可能不准确。`}
                {warnings > 0 && ` 另有 ${warnings} 项警告需要关注。`}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {hasResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div ref={reportRef} className="tech-card p-8 print:p-4">
            <div className="border-b-2 border-primary-500 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-industrial-text text-center">
                流体管路压降计算报告
              </h2>
              <p className="text-center text-industrial-textMuted mt-2">
                {session.title} | {new Date().toLocaleString('zh-CN')}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-3 bg-primary-900/30 rounded text-center">
                <div className="text-xs text-industrial-textMuted mb-1">总压降</div>
                <div className="font-mono text-xl font-bold text-primary-400">
                  {formatNumber(session.results!.totalPressureDrop)}
                </div>
                <div className="text-xs text-industrial-textMuted">{session.results!.pressureDropUnit}</div>
              </div>
              <div className="p-3 bg-primary-900/30 rounded text-center">
                <div className="text-xs text-industrial-textMuted mb-1">总流量</div>
                <div className="font-mono text-xl font-bold text-industrial-text">
                  {formatNumber(session.totalFlowRate)}
                </div>
                <div className="text-xs text-industrial-textMuted">{session.flowRateUnit}</div>
              </div>
              <div className="p-3 bg-primary-900/30 rounded text-center">
                <div className="text-xs text-industrial-textMuted mb-1">流体</div>
                <div className="font-mono text-lg font-bold text-industrial-text">
                  {FLUID_NAMES[session.fluid.type]}
                </div>
                <div className="text-xs text-industrial-textMuted">{session.fluid.temperature}°C</div>
              </div>
              <div className="p-3 bg-primary-900/30 rounded text-center">
                <div className="text-xs text-industrial-textMuted mb-1">阀门</div>
                <div className="font-mono text-lg font-bold text-industrial-text">
                  {VALVE_NAMES[session.mainValve.valveType]}
                </div>
                <div className={cn(
                  'text-xs',
                  session.mainValve.isHalfOpen ? 'text-warning-400' : 'text-industrial-textMuted'
                )}>
                  {session.mainValve.openingPercentage}%
                  {session.mainValve.isHalfOpen ? ' (半开)' : ''}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-industrial-text mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary-400" />
                管路段计算详情
              </h3>
              {session.mainSegments.map((segment) => {
                const result = session.results!.segmentResults[segment.id];
                if (!result) return null;
                return (
                  <div key={segment.id} className="mb-4 p-4 bg-primary-900/20 rounded border border-industrial-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-industrial-text">{segment.name}</h4>
                      <span className="font-mono text-xs text-industrial-textMuted">
                        Φ{segment.diameter}{segment.diameterUnit} × {segment.length}{segment.lengthUnit}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-industrial-textMuted">流速: </span>
                        <span className="font-mono text-industrial-text">{formatNumber(result.flowVelocity.value)} m/s</span>
                      </div>
                      <div>
                        <span className="text-industrial-textMuted">雷诺数: </span>
                        <span className="font-mono text-industrial-text">{formatNumber(result.reynoldsNumber.value)}</span>
                      </div>
                      <div>
                        <span className="text-industrial-textMuted">摩擦系数: </span>
                        <span className="font-mono text-industrial-text">{formatNumber(result.frictionFactor.value)}</span>
                      </div>
                      <div>
                        <span className="text-industrial-textMuted">总阻力: </span>
                        <span className="font-mono text-primary-400 font-semibold">{formatNumber(result.totalLoss.value)} m</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm mt-2">
                      <div>
                        <span className="text-industrial-textMuted">沿程: </span>
                        <span className="font-mono text-blue-400">{formatNumber(result.frictionLoss.value)} m</span>
                      </div>
                      <div>
                        <span className="text-industrial-textMuted">局部: </span>
                        <span className="font-mono text-orange-400">{formatNumber(result.localLoss.value)} m</span>
                      </div>
                      <div>
                        <span className="text-industrial-textMuted">阀门: </span>
                        <span className="font-mono text-red-400">{formatNumber(result.valveLoss.value)} m</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {session.branches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-industrial-text mb-4 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-primary-400" />
                  支路汇总（口径: {session.flowRateUnit}）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-industrial-border">
                        <th className="text-left py-2 px-3 text-industrial-textMuted">支路</th>
                        <th className="text-right py-2 px-3 text-industrial-textMuted">分配比</th>
                        <th className="text-right py-2 px-3 text-industrial-textMuted">流量</th>
                        <th className="text-right py-2 px-3 text-industrial-textMuted">总阻力</th>
                        <th className="text-center py-2 px-3 text-industrial-textMuted">阀门</th>
                        <th className="text-center py-2 px-3 text-industrial-textMuted">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.branches.map((branch) => {
                        let totalHeadLoss = 0;
                        branch.segments.forEach(seg => {
                          const segResult = session.results!.segmentResults[seg.id];
                          if (segResult) totalHeadLoss += segResult.totalLoss.value;
                        });
                        return (
                          <tr key={branch.id} className="border-b border-industrial-border/30">
                            <td className="py-2 px-3 text-industrial-text">{branch.name}</td>
                            <td className="py-2 px-3 text-right font-mono text-industrial-text">
                              {(branch.flowRateRatio * 100).toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-industrial-text">
                              {formatNumber(session.totalFlowRate * branch.flowRateRatio)} {session.flowRateUnit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-primary-400">
                              {formatNumber(totalHeadLoss)} m
                            </td>
                            <td className="py-2 px-3 text-center text-xs">
                              {VALVE_NAMES[branch.valveConfig.valveType]} @ {branch.valveConfig.openingPercentage}%
                              {branch.valveConfig.isHalfOpen && <span className="text-warning-400 ml-1">(半开)</span>}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {branch.isMissingData ? (
                                <span className="text-danger-400 text-xs">
                                  缺失{branch.missingFields.length}项
                                </span>
                              ) : (
                                <span className="text-success-400 text-xs">完整</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {session.results!.contradictions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-industrial-text mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-400" />
                  矛盾与警告
                </h3>
                {session.results!.contradictions.map((c, index) => (
                  <div key={index} className={cn(
                    'p-3 mb-2 rounded border text-sm',
                    c.severity === 'error'
                      ? 'bg-danger-500/10 border-danger-500/30'
                      : 'bg-warning-500/10 border-warning-500/30'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        c.severity === 'error'
                          ? 'bg-danger-500/30 text-danger-400'
                          : 'bg-warning-500/30 text-warning-400'
                      )}>
                        {c.severity === 'error' ? '错误' : '警告'}
                      </span>
                      <span className="text-industrial-text">{c.message}</span>
                    </div>
                    {c.evidence.valveSnapshot && (
                      <div className="text-xs text-industrial-textMuted mt-1 flex items-center gap-2">
                        <Settings className="w-3 h-3" />
                        阀门证据: {VALVE_NAMES[c.evidence.valveSnapshot.valveType]} @ {c.evidence.valveSnapshot.openingPercentage}%
                        {c.evidence.valveSnapshot.isHalfOpen && ' (半开)'}
                      </div>
                    )}
                    <div className="text-xs text-industrial-textMuted mt-1">
                      建议: {c.evidence.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {session.results!.unitValidations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-industrial-text mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-400" />
                  单位校验记录
                </h3>
                {session.results!.unitValidations.map((v, index) => (
                  <div key={index} className="p-2 mb-1 bg-primary-900/20 rounded text-sm">
                    <span className="font-mono text-industrial-text">{v.field}</span>
                    <span className="text-industrial-textMuted ml-2">{v.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-industrial-border pt-4 text-center text-xs text-industrial-textMuted">
              流体管路压降计算工具 | 生成于 {new Date().toLocaleString('zh-CN')} | 会话ID: {session.id}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
