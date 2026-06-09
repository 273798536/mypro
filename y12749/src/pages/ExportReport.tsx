import { useBatchStore } from '@/store/useBatchStore';
import { buildExportReport } from '@/utils/difficultyEngine';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';

export default function ExportReport() {
  const { batch } = useBatchStore();
  const navigate = useNavigate();
  const report = buildExportReport(batch);

  const doPrint = () => {
    window.print();
  };

  const downloadHtml = () => {
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `难度均衡报告-${report.batchId}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="no-print bg-white border-b border-navy-100 px-8 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-secondary">
          <ArrowLeft size={14} />
          返回
        </button>
        <h1 className="font-serif text-lg font-semibold text-navy-800">导出报告预览</h1>
        <div className="flex items-center gap-2">
          <button onClick={downloadHtml} className="btn-secondary">
            <Download size={14} />
            下载 HTML
          </button>
          <button onClick={doPrint} className="btn-primary">
            <Printer size={14} />
            打印 / 导出 PDF
          </button>
        </div>
      </div>

      <div className="mx-auto my-8 w-[210mm] min-h-[297mm] bg-white shadow-lg p-12 font-sans text-navy-800">
        <header className="border-b-2 border-navy-600 pb-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-navy-700">竞赛题难度均衡复核报告</h1>
              <p className="mt-1 text-sm text-navy-500">
                批次：<code className="px-1.5 py-0.5 rounded bg-navy-50 text-navy-700 text-xs font-mono">{report.batchId}</code>
              </p>
            </div>
            <div className="text-right text-xs text-navy-500">
              <div>生成时间</div>
              <div className="text-navy-700">{new Date(report.exportedAt).toLocaleString('zh-CN')}</div>
            </div>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="font-serif text-base font-semibold text-navy-700 mb-2 pb-1 border-b border-navy-100">
            一、概览
          </h2>
          <p className="text-sm leading-relaxed text-navy-700">{report.overview}</p>
        </section>

        <section className="mb-6">
          <h2 className="font-serif text-base font-semibold text-navy-700 mb-2 pb-1 border-b border-navy-100">
            二、题目清单汇总
          </h2>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="border border-navy-100 px-3 py-1.5 bg-slate-50 text-navy-600 w-1/3">录入题目总数</td>
                <td className="border border-navy-100 px-3 py-1.5 font-semibold">{report.problemSummary.total} 道</td>
              </tr>
              <tr>
                <td className="border border-navy-100 px-3 py-1.5 bg-slate-50 text-navy-600">拦截重复题目</td>
                <td className="border border-navy-100 px-3 py-1.5 font-semibold text-red-600">
                  {report.problemSummary.duplicates} 道
                </td>
              </tr>
              <tr>
                <td className="border border-navy-100 px-3 py-1.5 bg-slate-50 text-navy-600">有效题目分布</td>
                <td className="border border-navy-100 px-3 py-1.5">
                  简单 <b>{report.problemSummary.byDifficulty.easy}</b> · 中等{' '}
                  <b>{report.problemSummary.byDifficulty.medium}</b> · 困难{' '}
                  <b>{report.problemSummary.byDifficulty.hard}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {report.duplicateDetails.length > 0 && (
          <section className="mb-6">
            <h2 className="font-serif text-base font-semibold text-navy-700 mb-2 pb-1 border-b border-navy-100">
              三、重复样本拦截明细
            </h2>
            <p className="text-xs text-navy-500 mb-2">
              运营同事可见：以下题目因与已有题目在指定字段上匹配而被拦截，未计入难度统计。
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-navy-600">
                  <th className="border border-navy-100 px-3 py-1.5 text-left font-medium w-1/5">被拦截编号</th>
                  <th className="border border-navy-100 px-3 py-1.5 text-left font-medium w-2/5">拦截原因</th>
                  <th className="border border-navy-100 px-3 py-1.5 text-left font-medium w-2/5">与…重复</th>
                </tr>
              </thead>
              <tbody>
                {report.duplicateDetails.map((d, i) => (
                  <tr key={i}>
                    <td className="border border-navy-100 px-3 py-1.5 font-mono">{d.code}</td>
                    <td className="border border-navy-100 px-3 py-1.5">{d.reason}</td>
                    <td className="border border-navy-100 px-3 py-1.5 text-navy-600">{d.duplicateOf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mb-6">
          <h2 className="font-serif text-base font-semibold text-navy-700 mb-2 pb-1 border-b border-navy-100">
            {report.duplicateDetails.length > 0 ? '四' : '三'}、难度均衡分析
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-navy-600">
                <th className="border border-navy-100 px-3 py-1.5 text-left font-medium">难度档</th>
                <th className="border border-navy-100 px-3 py-1.5 text-right font-medium">目标占比</th>
                <th className="border border-navy-100 px-3 py-1.5 text-right font-medium">实际占比</th>
                <th className="border border-navy-100 px-3 py-1.5 text-right font-medium">偏差</th>
              </tr>
            </thead>
            <tbody>
              {(['easy', 'medium', 'hard'] as const).map((k) => (
                <tr key={k}>
                  <td className="border border-navy-100 px-3 py-1.5">
                    {k === 'easy' ? '简单' : k === 'medium' ? '中等' : '困难'}
                  </td>
                  <td className="border border-navy-100 px-3 py-1.5 text-right">{report.difficultyBalance.target[k]}%</td>
                  <td className="border border-navy-100 px-3 py-1.5 text-right font-semibold">
                    {report.difficultyBalance.actual[k]}%
                  </td>
                  <td
                    className={`border border-navy-100 px-3 py-1.5 text-right ${
                      Math.abs(report.difficultyBalance.gap[k]) <= 5 ? 'text-teal-600' : 'text-red-600'
                    }`}
                  >
                    {report.difficultyBalance.gap[k] >= 0 ? '+' : ''}
                    {report.difficultyBalance.gap[k]}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-6">
          <h2 className="font-serif text-base font-semibold text-navy-700 mb-2 pb-1 border-b border-navy-100">
            {report.duplicateDetails.length > 0 ? '五' : '四'}、复核结论
          </h2>
          <ul className="space-y-2">
            {report.conclusions.map((c, i) => (
              <li key={i} className="p-3 rounded border border-navy-100 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      c.result === '通过'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {c.result}
                  </span>
                  <b className="text-sm text-navy-800">{c.title}</b>
                </div>
                <p className="mt-1 text-xs text-navy-600 leading-relaxed">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </section>

        {report.anomalies.length > 0 && (
          <section className="mb-6">
            <h2 className="font-serif text-base font-semibold text-navy-700 mb-2 pb-1 border-b border-navy-100">
              {report.duplicateDetails.length > 0 ? '六' : '五'}、待处理事项
            </h2>
            <ul className="space-y-2">
              {report.anomalies.map((a, i) => (
                <li key={i} className="p-3 rounded border border-navy-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-navy-100 text-navy-700">{a.category}</span>
                    <b className="text-sm text-navy-800">{a.title}</b>
                  </div>
                  <p className="mt-1 text-xs text-navy-600">下一步：{a.nextStep}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 pt-4 border-t border-navy-100 text-[11px] text-navy-400 text-center">
          本报告由「竞赛题难度均衡」工具自动生成 · 具体材料请以当轮批次附件为准
        </footer>
      </div>
    </div>
  );
}
