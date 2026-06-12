import { useEffect } from 'react';
import { Printer, FileText, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store';

export default function ExportReport() {
  const { report, fetchReport, loading } = useAppStore();

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => window.print();

  if (loading.report && !report) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">生成报告中...</div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">暂无报告数据</div>
    );
  }

  const { sampleStats, anomalyStats, samples } = report;

  const supplementCount = anomalyStats.byType.supplement ?? 0;
  const recalibrateCount = anomalyStats.byType.recalibrate ?? 0;

  const samplesWithAnomaly = samples.filter((s) => s.anomaly);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-warning-amber" /> 导出报告
        </h1>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-deep-sea text-warning-amber rounded text-sm font-medium hover:bg-deep-sea/80 transition-colors"
        >
          <Printer className="w-4 h-4" /> 打印/导出PDF
        </button>
      </div>

      <div className="report-container bg-white text-slate-900 rounded-lg p-8 max-w-[210mm] mx-auto shadow-lg">
        <header className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold">赤潮监测样本复核报告</h1>
          <p className="text-sm text-slate-500 mt-1">生成时间：{new Date(report.generatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
        </header>

        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b border-slate-300 pb-1 mb-3">一、概要</h2>
          <div className="grid grid-cols-5 gap-3 text-center text-sm">
            <div className="bg-slate-100 rounded p-2">
              <p className="text-slate-500">总样本数</p>
              <p className="text-xl font-bold">{sampleStats.total}</p>
            </div>
            <div className="bg-green-50 rounded p-2">
              <p className="text-green-700">已通过</p>
              <p className="text-xl font-bold text-green-700">{sampleStats.reviewed}</p>
            </div>
            <div className="bg-red-50 rounded p-2">
              <p className="text-red-700">未通过</p>
              <p className="text-xl font-bold text-red-700">{sampleStats.rejected}</p>
            </div>
            <div className="bg-amber-50 rounded p-2">
              <p className="text-amber-700">待复核</p>
              <p className="text-xl font-bold text-amber-700">{sampleStats.pending}</p>
            </div>
            <div className="bg-slate-100 rounded p-2">
              <p className="text-slate-500">异常总数</p>
              <p className="text-xl font-bold">{anomalyStats.total}</p>
            </div>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            需补材料：<span className="font-semibold text-amber-700">{supplementCount}</span> 项 ·
            需改口径：<span className="font-semibold text-red-700">{recalibrateCount}</span> 项
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b border-slate-300 pb-1 mb-3">二、样本详情</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1.5 text-left">站位</th>
                  <th className="border border-slate-300 px-2 py-1.5">时间</th>
                  <th className="border border-slate-300 px-2 py-1.5">水温</th>
                  <th className="border border-slate-300 px-2 py-1.5">盐度</th>
                  <th className="border border-slate-300 px-2 py-1.5">溶解氧</th>
                  <th className="border border-slate-300 px-2 py-1.5">叶绿素a</th>
                  <th className="border border-slate-300 px-2 py-1.5">状态</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id}>
                    <td className="border border-slate-300 px-2 py-1">{s.stationName}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{s.sampleDate}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{s.temperature}°C</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{s.salinity}‰</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{s.dissolvedOxygen}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{s.chlorophyllA}</td>
                    <td className={`border border-slate-300 px-2 py-1 text-center font-medium ${
                      s.status === 'reviewed' ? 'text-green-700' : s.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {s.status === 'reviewed' ? '通过' : s.status === 'rejected' ? '未通过' : '待复核'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b border-slate-300 pb-1 mb-3">三、异常详情</h2>
          {samplesWithAnomaly.length === 0 ? (
            <p className="text-sm text-slate-500">无异常记录</p>
          ) : (
            <div className="space-y-2">
              {samplesWithAnomaly.map((s) => {
                const a = s.anomaly!;
                return (
                  <div key={s.id} className={`rounded border p-2.5 text-xs ${a.type === 'supplement' ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span className={`font-semibold px-1.5 py-0.5 rounded text-white text-[10px] ${a.type === 'supplement' ? 'bg-amber-500' : 'bg-red-500'}`}>
                        {a.type === 'supplement' ? '需补材料' : '需改口径'}
                      </span>
                      <span className="font-medium">{s.stationName}</span>
                    </div>
                    <p className="text-slate-600">{a.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b border-slate-300 pb-1 mb-3">四、拦截说明</h2>
          {samplesWithAnomaly.filter((s) => s.anomaly?.interceptionExplanation).length === 0 ? (
            <p className="text-sm text-slate-500">无拦截记录</p>
          ) : (
            <div className="space-y-3">
              {samplesWithAnomaly.filter((s) => s.anomaly?.interceptionExplanation).map((s) => (
                <div key={s.id} className="bg-slate-50 border border-slate-200 rounded p-3">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{s.stationName} — {s.anomaly!.type === 'supplement' ? '需补材料' : '需改口径'}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.anomaly!.interceptionExplanation}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
