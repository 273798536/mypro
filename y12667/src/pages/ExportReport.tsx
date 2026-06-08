import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, Eye, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { ExportReportData } from '@shared/types';
import { riskLevelInfo, formatDateTime } from '@/components/constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ExportReport() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ExportReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await api.getExportData(id);
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    })();
  }, [id]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`绳索角度模拟报告_${data?.record.code || id}.pdf`);
    } catch (e) {
      console.error(e);
      alert('导出失败，请重试');
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>加载报告数据中...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>记录不存在</p>
        <Link to="/" className="text-safety-blue underline mt-2 inline-block">返回列表</Link>
      </div>
    );
  }

  const { record, occlusionExplanation, history } = data;
  const rl = riskLevelInfo[record.riskLevel];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <Link to={id ? `/records/${id}` : '/'} className="p-1.5 rounded hover:bg-slate-700 text-slate-300">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-safety-blue" />
            导出报告预览
          </h2>
          <p className="text-xs text-slate-400">{record.code}</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {exporting ? '导出中...' : '下载 PDF 报告'}
        </button>
      </div>

      <div className="p-8 flex justify-center">
        <div
          ref={reportRef}
          className="w-[210mm] bg-white text-slate-900 shadow-2xl"
          style={{ minHeight: '297mm', padding: '24mm 20mm', fontFamily: '"Noto Sans SC", system-ui, sans-serif' }}
        >
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <div className="text-xs text-slate-500 uppercase tracking-widest">Rescue Rope Simulation</div>
            <h1 className="text-2xl font-bold mt-1 text-slate-900">救援绳索角度模拟复核报告</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-slate-500">报告编号：</span>
                <span className="font-mono font-semibold">{record.code}</span>
              </div>
              <div>
                <span className="text-slate-500">生成时间：</span>
                <span className="font-mono">{formatDateTime(new Date().toISOString())}</span>
              </div>
              <div>
                <span className="text-slate-500">风险等级：</span>
                <span className="font-semibold">{rl.label}</span>
              </div>
            </div>
          </div>

          <section className="mb-6">
            <h2 className="text-base font-bold text-slate-900 border-l-4 border-safety-orange pl-3 mb-3">
              一、记录基本信息
            </h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 bg-slate-50 w-1/4 text-slate-600">模拟编号</td>
                  <td className="border border-slate-300 px-3 py-2 font-mono">{record.code}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 bg-slate-50 text-slate-600">创建时间</td>
                  <td className="border border-slate-300 px-3 py-2">{formatDateTime(record.createdAt)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 bg-slate-50 text-slate-600">更新时间</td>
                  <td className="border border-slate-300 px-3 py-2">{formatDateTime(record.updatedAt)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 bg-slate-50 text-slate-600">模拟时段</td>
                  <td className="border border-slate-300 px-3 py-2">
                    {formatDateTime(record.startTime)} ~ {formatDateTime(record.endTime)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 bg-slate-50 text-slate-600">剖切帧数</td>
                  <td className="border border-slate-300 px-3 py-2">{record.sections.length} 帧</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 bg-slate-50 text-slate-600">角度采样点</td>
                  <td className="border border-slate-300 px-3 py-2">{record.angleData.length} 个</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-bold text-slate-900 border-l-4 border-safety-orange pl-3 mb-3">
              二、风险备注与复核结论
            </h2>
            <div className="border border-slate-300 rounded p-4 bg-slate-50">
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {record.riskNote}
              </div>
            </div>
            {record.anomalyType && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-slate-700">
                  异常类型：
                  <span className="font-semibold text-amber-700">
                    {record.anomalyType === 'time_mismatch' ? '时间参数不符' :
                     record.anomalyType === 'risk_mismatch' ? '风险备注不符' :
                     record.anomalyType === 'occlusion_misread' ? '透明遮挡误读' :
                     '剖面数据缺失'}
                  </span>
                </span>
              </div>
            )}
            {record.nextAction && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-slate-700">
                  建议操作：
                  <span className="font-semibold text-green-700">
                    {record.nextAction === 'fill_material' ? '补材料（补充剖面数据或原始证据）' : '改口径（调整风险标注与时间参数）'}
                  </span>
                </span>
              </div>
            )}
          </section>

          <section className="mb-6 break-inside-avoid-page">
            <h2 className="text-base font-bold text-slate-900 border-l-4 border-red-500 pl-3 mb-3">
              三、透明遮挡误读拦截说明
            </h2>
            <div className={`border-2 rounded p-4 ${
              record.occlusionRejected
                ? 'border-red-300 bg-red-50'
                : 'border-green-300 bg-green-50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {record.occlusionRejected ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <span className={`font-bold ${record.occlusionRejected ? 'text-red-700' : 'text-green-700'}`}>
                  {record.occlusionRejected ? '本批次数据存在透明遮挡误读风险，已被系统拦截' : '本批次数据未检测到透明遮挡误读风险'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-2">判定标准（系统拦截依据）：</h3>
              <ol className="space-y-1.5 text-sm text-slate-700 list-decimal list-inside">
                {occlusionExplanation.criteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>

              <h3 className="text-sm font-bold text-slate-800 mt-4 mb-2">本批次判定结论：</h3>
              <p className="text-sm text-slate-700 leading-relaxed border-l-2 border-slate-400 pl-3">
                {occlusionExplanation.rejectionReason}
              </p>

              <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" />
                说明：本章节为运维组提供透明遮挡拦截的详细依据，便于离线查阅报告时理解数据被拦截的原因。
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-bold text-slate-900 border-l-4 border-safety-orange pl-3 mb-3">
              四、修改历史（{history.length} 个版本）
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left w-20">版本</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">修改时间</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">修改人</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">变更摘要</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h) => (
                  <tr key={h.id}>
                    <td className="border border-slate-300 px-3 py-2 font-mono">v{h.version}</td>
                    <td className="border border-slate-300 px-3 py-2">{formatDateTime(h.modifiedAt)}</td>
                    <td className="border border-slate-300 px-3 py-2">{h.modifiedBy}</td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-600">
                      {h.changes.length === 0 ? '初始版本' : `${h.changes.length} 处字段变更`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="mt-12 pt-4 border-t border-slate-300 text-xs text-slate-500 flex justify-between">
            <span>救援绳索角度模拟工作台 · 自动生成报告</span>
            <span>仅供内部复核使用</span>
          </div>
        </div>
      </div>
    </div>
  );
}
