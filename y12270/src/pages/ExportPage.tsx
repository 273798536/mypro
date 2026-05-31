import { useState } from 'react';
import { FileText, Download, CheckCircle, XCircle, AlertTriangle, Clock, User, FileSpreadsheet, File, Link2, Hash, Eye } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { checkConsistency } from '../engine/ConsistencyChecker';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export function ExportPage() {
  const {
    analysisResult,
    holdings,
    analysisParams,
    terminalLog,
    exportRecords,
    exportCorrespondences,
    exportReport,
    appendTerminalLog
  } = useAppStore();

  const [selectedExport, setSelectedExport] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const terminalDurationConclusion = terminalLog.find(
    log => log.message.includes('久期结论')
  )?.message || '';

  const consistencyCheckResult = analysisResult
    ? checkConsistency(
        analysisResult.durationConclusion,
        terminalLog,
        JSON.stringify(analysisResult),
        analysisResult
      )
    : null;

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!analysisResult) return;
    
    setIsExporting(true);
    
    try {
      const record = await exportReport(format);

      if (format === 'pdf') {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('债券组合风险分析报告', 20, 20);
        doc.setFontSize(12);
        doc.text(`版本: ${analysisResult.versionId}`, 20, 35);
        doc.text(`导出时间: ${new Date().toLocaleString()}`, 20, 45);
        doc.text(`分析时间: ${new Date(analysisResult.createdAt).toLocaleString()}`, 20, 55);
        doc.setFontSize(14);
        doc.text('久期结论', 20, 75);
        doc.setFontSize(11);
        doc.text(analysisResult.durationConclusion, 20, 85, { maxWidth: 170 });
        doc.setFontSize(14);
        doc.text('久期指标', 20, 110);
        doc.setFontSize(11);
        doc.text(`平均久期: ${analysisResult.avgDuration.toFixed(2)}年`, 20, 120);
        doc.text(`加权久期: ${analysisResult.weightedDuration.toFixed(2)}年`, 20, 130);
        doc.text(`平均收益率: ${analysisResult.avgYield.toFixed(2)}%`, 20, 140);
        doc.text(`债券总数: ${holdings.length}只`, 20, 150);
        doc.save(record.fileName);
      } else {
        const durationData = [
          { 指标: '平均久期', 值: `${analysisResult.avgDuration.toFixed(2)}年` },
          { 指标: '加权久期', 值: `${analysisResult.weightedDuration.toFixed(2)}年` },
          { 指标: '平均收益率', 值: `${analysisResult.avgYield.toFixed(2)}%` },
          { 指标: '债券总数', 值: `${holdings.length}只` }
        ];

        const holdingsData = holdings.map(h => ({
          债券代码: h.bondId,
          债券名称: h.bondName,
          行业: h.industry,
          久期: h.duration,
          收益率: h.yield,
          权重: h.weight,
          面值: h.faceValue,
          来源: h.source
        }));

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(durationData);
        const ws2 = XLSX.utils.json_to_sheet(holdingsData);
        XLSX.utils.book_append_sheet(wb, ws1, '久期结论');
        XLSX.utils.book_append_sheet(wb, ws2, '债券持仓');
        
        XLSX.writeFile(wb, record.fileName);
      }

      appendTerminalLog({
        level: 'success',
        message: `成功导出${format.toUpperCase()}报告: ${record.fileName}`
      });
    } catch (error) {
      appendTerminalLog({
        level: 'error',
        message: `导出失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 bg-slate-900/80 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
        <FileText size={16} className="text-slate-400" />
        <span className="text-sm text-slate-300">报告导出</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">导出报告</h2>

            {analysisResult ? (
              <div className="space-y-6">
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-200">久期结论一致性校验</h3>
                    {consistencyCheckResult && (
                      <span className={`flex items-center gap-1 text-xs`}>
                        {consistencyCheckResult.passed ? (
                          <>
                            <CheckCircle size={14} className="text-emerald-400" />
                            <span className="text-emerald-400">校验通过</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} className="text-red-400" />
                            <span className="text-red-400">校验失败</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">页面显示</div>
                      <div className="text-slate-200 break-words">
                        {analysisResult.durationConclusion}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">终端日志</div>
                      <div className="text-slate-200 break-words">
                        {terminalDurationConclusion || analysisResult.durationConclusion}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800 rounded border border-slate-700">
                      <div className="text-slate-500 mb-1">导出文件</div>
                      <div className="text-slate-200 break-words">
                        {analysisResult.durationConclusion}
                      </div>
                    </div>
                  </div>

                  {consistencyCheckResult && !consistencyCheckResult.passed && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
                      <p className="text-xs text-red-400 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        一致性校验失败，请检查数据一致性
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {analysisResult.avgDuration.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">平均久期(年)</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      {analysisResult.weightedDuration.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">加权久期(年)</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-400 mb-1">
                      {analysisResult.avgYield.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400">平均收益率</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {holdings.length}
                    </div>
                    <div className="text-xs text-slate-400">债券总数</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <File size={16} />
                    导出 PDF
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={isExporting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet size={16} />
                    导出 Excel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <AlertTriangle size={32} className="mx-auto mb-3" />
                <p>请先在工作台运行分析后再导出报告</p>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">导出历史</h2>
            
            {exportRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock size={32} className="mx-auto mb-3" />
                <p>暂无导出记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exportRecords.slice().reverse().map(record => {
                  const correspondence = exportCorrespondences.find(
                    c => c.exportId === record.exportId
                  );
                  return (
                    <div
                      key={record.exportId}
                      className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {record.format === 'pdf' ? (
                              <File size={16} className="text-red-400" />
                            ) : (
                              <FileSpreadsheet size={16} className="text-emerald-400" />
                            )}
                            <span className="text-sm font-medium text-slate-200">
                              {record.fileName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {record.exportedBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(record.exportedAt).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Hash size={12} />
                              {record.fileHash.slice(0, 16)}...
                            </span>
                            {record.consistencyPassed ? (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle size={12} />
                                一致性通过
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400">
                                <XCircle size={12} />
                                一致性失败
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedExport(
                            selectedExport === record.exportId ? null : record.exportId
                          )}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} />
                          {selectedExport === record.exportId ? '收起' : '查看对应关系'}
                        </button>
                      </div>

                      {selectedExport === record.exportId && correspondence && (
                        <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                            <p className="text-xs text-blue-300 flex items-center gap-2 mb-2">
                              <Link2 size={14} />
                              债券持仓 → 久期计算 → 报告导出 对应关系
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-800 rounded">
                              <div className="text-xs text-slate-400 mb-2 font-medium">债券持仓快照</div>
                              <div className="text-[10px] text-slate-500 space-y-1">
                                <div>债券数量: {correspondence.holdingSnapshot.length} 只</div>
                                <div>久期范围: {analysisParams.durationRange[0]}-{analysisParams.durationRange[1]} 年</div>
                                <div>收益率范围: {analysisParams.yieldRange[0]}-{analysisParams.yieldRange[1]}%</div>
                              </div>
                              <div className="text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-700">
                                示例债券: {correspondence.holdingSnapshot.slice(0, 3).map(h => h.bondName).join(', ')}
                                {correspondence.holdingSnapshot.length > 3 ? '...' : ''}
                              </div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded">
                              <div className="text-xs text-slate-400 mb-2 font-medium">久期计算结果</div>
                              <div className="text-[10px] text-slate-500 space-y-1">
                                <div>平均久期: {correspondence.analysisSnapshot.avgDuration.toFixed(2)} 年</div>
                                <div>加权久期: {correspondence.analysisSnapshot.weightedDuration.toFixed(2)} 年</div>
                                <div>平均收益率: {correspondence.analysisSnapshot.avgYield.toFixed(2)}%</div>
                              </div>
                              <div className="text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-700 break-words">
                                {correspondence.analysisSnapshot.durationConclusion.slice(0, 60)}...
                              </div>
                            </div>
                            <div className="p-3 bg-slate-800 rounded">
                              <div className="text-xs text-slate-400 mb-2 font-medium">报告导出记录</div>
                              <div className="text-[10px] text-slate-500 space-y-1">
                                <div>分析ID: {record.analysisId}</div>
                                <div>参数快照: 已保存</div>
                                <div>终端日志: 已保存</div>
                              </div>
                              <div className="text-[10px] text-slate-600 mt-2 pt-2 border-t border-slate-700">
                                文件哈希: {record.fileHash.slice(0, 24)}...
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-800 rounded">
                            <div className="text-xs text-slate-400 mb-2 font-medium">久期结论对比</div>
                            <div className="grid grid-cols-3 gap-3 text-[10px]">
                              <div>
                                <div className="text-slate-500 mb-1">页面显示</div>
                                <div className="text-slate-300">
                                  {record.pageDurationConclusion}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1">终端日志</div>
                                <div className="text-slate-300">
                                  {record.terminalDurationConclusion}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1">导出文件</div>
                                <div className="text-slate-300">
                                  {record.durationConclusion}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
