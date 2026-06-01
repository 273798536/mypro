import { useApp } from '../store';
import { getOverallAnomalyType, getAnomalyIcon, getAnomalyLabel } from '../anomalyDetector';
import { BarChart3, Download, TrendingUp, FileJson, FileSpreadsheet, Link } from 'lucide-react';
import { useState } from 'react';

export const BatchComparison = () => {
  const { 
    state, 
    getBatchRecords, 
    getRecordCalculation, 
    getRecordErrorEstimate, 
    getRecordAnomalies,
    exportToJSON,
    exportToCSV,
    generateReport,
    generateReportSummary,
    selectRecord,
    setTracePath
  } = useApp();

  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);

  if (state.batches.length === 0) {
    return null;
  }

  const handleExportJSON = (batchId: string) => {
    const json = exportToJSON(batchId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `摆钟实验报告_${state.batches.find(b => b.id === batchId)?.name || batchId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  const handleExportCSV = (batchId: string) => {
    const csv = exportToCSV(batchId);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `摆钟实验数据_${state.batches.find(b => b.id === batchId)?.name || batchId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  const handleGenerateReport = (batchId: string) => {
    const batch = state.batches.find(b => b.id === batchId);
    if (batch) {
      const report = generateReport(batchId, `${batch.name} 实验报告`);
      alert(`报告已生成！\n\n报告ID: ${report.id}\n总记录: ${report.summary.totalRecords}\n平均误差: ${report.summary.averageError.toFixed(2)}%\n异常数: ${report.summary.anomalyCount}`);
    }
    setShowExportMenu(null);
  };

  const handleNavigateToRecord = (recordId: string) => {
    selectRecord(recordId);
    setTracePath({
      from: 'record',
      recordId,
      step: 'record'
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <BarChart3 size={20} className="text-primary-600" />
        批次对比与误差分析
      </h3>

      {state.batches.map(batch => {
        const records = getBatchRecords(batch.id);
        const summary = generateReportSummary(batch.recordIds);
        const calculations = records.map(r => getRecordCalculation(r.id)).filter(Boolean);
        const errors = records.map(r => getRecordErrorEstimate(r.id)).filter(Boolean);

        if (records.length === 0) return null;

        const avgTheoreticalPeriod = calculations.length > 0
          ? calculations.reduce((sum, c) => 
              sum + (c!.usesLargeAngle ? c!.largeAnglePeriod : c!.smallAnglePeriod), 0
            ) / calculations.length
          : 0;

        const avgTotalError = errors.length > 0
          ? errors.reduce((sum, e) => sum + e!.totalError, 0) / errors.length
          : 0;

        const maxError = errors.length > 0
          ? Math.max(...errors.map(e => e!.totalError))
          : 0;

        return (
          <div key={batch.id} className="card">
            <div className="card-header flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800">{batch.name}</h4>
                {batch.description && (
                  <p className="text-sm text-slate-500">{batch.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-info">{records.length} 条记录</span>
                {summary.anomalyCount > 0 && (
                  <span className="badge badge-warning">
                    {summary.anomalyCount} 项异常
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(showExportMenu === batch.id ? null : batch.id)}
                    className="btn btn-primary text-sm"
                  >
                    <Download size={14} className="mr-1" />
                    导出
                  </button>
                  {showExportMenu === batch.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-10">
                      <button
                        onClick={() => handleExportJSON(batch.id)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <FileJson size={16} />
                        导出完整 JSON
                      </button>
                      <button
                        onClick={() => handleExportCSV(batch.id)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <FileSpreadsheet size={16} />
                        导出数据 CSV
                      </button>
                      <button
                        onClick={() => handleGenerateReport(batch.id)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <BarChart3 size={16} />
                        生成分析报告
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">平均周期</p>
                  <p className="text-xl font-bold text-slate-800 font-mono">
                    {avgTheoreticalPeriod.toFixed(4)} s
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">平均总误差</p>
                  <p className={`text-xl font-bold font-mono ${
                    avgTotalError > 5 ? 'text-red-600' :
                    avgTotalError > 2 ? 'text-amber-600' :
                    'text-green-600'
                  }`}>
                    {avgTotalError.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">最大误差</p>
                  <p className={`text-xl font-bold font-mono ${
                    maxError > 5 ? 'text-red-600' :
                    maxError > 2 ? 'text-amber-600' :
                    'text-green-600'
                  }`}>
                    {maxError.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600 mb-1">大角度近似</p>
                  <p className="text-xl font-bold text-amber-800">
                    {summary.largeAngleCount} 条
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 mb-1">其他异常</p>
                  <p className="text-xl font-bold text-blue-800">
                    {summary.unitErrorCount + summary.timingMissCount} 条
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-slate-600 mb-3">
                  批次内记录对比
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    点击记录可跳转到详情
                  </span>
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-medium text-slate-600">#</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">摆长</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">摆角</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">理论周期</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">测量周期</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">测量误差</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">总误差</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">异常</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => {
                        const calc = getRecordCalculation(record.id);
                        const error = getRecordErrorEstimate(record.id);
                        const anomalies = getRecordAnomalies(record.id);
                        const theoretical = calc?.usesLargeAngle 
                          ? calc.largeAnglePeriod 
                          : calc?.smallAnglePeriod;
                        const anomalyType = getOverallAnomalyType(anomalies);

                        return (
                          <tr 
                            key={record.id}
                            className="border-b border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => handleNavigateToRecord(record.id)}
                          >
                            <td className="py-2 px-3 text-slate-400">{index + 1}</td>
                            <td className="py-2 px-3 font-medium">
                              {record.length} {record.lengthUnit}
                            </td>
                            <td className="py-2 px-3">
                              <span className={calc?.usesLargeAngle ? 'text-amber-600 font-medium' : ''}>
                                {record.angle}°
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {theoretical?.toFixed(4)} s
                              {calc?.usesLargeAngle && (
                                <span className="text-xs text-amber-500 block">
                                  +{calc.largeAngleCorrection.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {record.measuredPeriod.toFixed(4)} s
                            </td>
                            <td className="py-2 px-3 font-mono">
                              <span className={
                                (calc?.measuredError || 0) > 5 ? 'text-red-600' :
                                (calc?.measuredError || 0) > 2 ? 'text-amber-600' :
                                'text-green-600'
                              }>
                                {calc?.measuredError.toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">
                              <span className={
                                (error?.totalError || 0) > 5 ? 'text-red-600' :
                                (error?.totalError || 0) > 2 ? 'text-amber-600' :
                                'text-green-600'
                              }>
                                {error?.totalError.toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {anomalies.length > 0 ? (
                                <span className={`badge ${
                                  anomalies.some(a => a.severity === 'high') ? 'badge-error' :
                                  anomalies.some(a => a.severity === 'medium') ? 'badge-warning' :
                                  'badge-info'
                                }`}>
                                  {getAnomalyIcon(anomalyType)} {getAnomalyLabel(anomalyType)}
                                </span>
                              ) : (
                                <span className="badge badge-success">✓ 正常</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {record.sourceRef && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Link size={12} />
                                  {record.sourceRef}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {state.reports.filter(r => r.batchId === batch.id).length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                    <BarChart3 size={16} />
                    已生成报告
                  </h5>
                  <div className="space-y-2">
                    {state.reports
                      .filter(r => r.batchId === batch.id)
                      .map(report => (
                        <div 
                          key={report.id}
                          className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200"
                        >
                          <div>
                            <p className="font-medium text-primary-800">{report.title}</p>
                            <p className="text-xs text-primary-600">
                              {new Date(report.exportedAt).toLocaleString()} · {report.summary.totalRecords} 条记录
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-primary-700">
                              平均误差: <span className="font-mono font-bold">{report.summary.averageError.toFixed(2)}%</span>
                            </p>
                            <p className="text-xs text-primary-600">
                              {report.summary.anomalyCount > 0 
                                ? `${report.summary.anomalyCount} 项异常` 
                                : '无异常'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {state.batches.length >= 2 && (
        <div className="card">
          <div className="card-header">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-600" />
              批次间对比汇总
            </h4>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600">批次</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">记录数</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">平均周期</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">平均误差</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">大角度</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">单位错误</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">计时漏拍</th>
                  </tr>
                </thead>
                <tbody>
                  {state.batches.map(batch => {
                    const summary = generateReportSummary(batch.recordIds);
                    return (
                      <tr key={batch.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium">{batch.name}</td>
                        <td className="py-2 px-3">{summary.totalRecords}</td>
                        <td className="py-2 px-3 font-mono">{summary.averagePeriod.toFixed(4)} s</td>
                        <td className="py-2 px-3 font-mono">
                          <span className={
                            summary.averageError > 5 ? 'text-red-600' :
                            summary.averageError > 2 ? 'text-amber-600' :
                            'text-green-600'
                          }>
                            {summary.averageError.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {summary.largeAngleCount > 0 ? (
                            <span className="badge badge-warning">{summary.largeAngleCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {summary.unitErrorCount > 0 ? (
                            <span className="badge badge-error">{summary.unitErrorCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {summary.timingMissCount > 0 ? (
                            <span className="badge badge-error">{summary.timingMissCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
