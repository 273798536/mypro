import { useParams, Navigate, Link } from "react-router-dom";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { useRecordStore } from "@/store/useRecordStore";
import TLCPlate from "@/components/TLCPlate";
import InfoTable from "@/components/InfoTable";
import ComponentTable from "@/components/ComponentTable";
import ConclusionSection from "@/components/ConclusionSection";
import AnomalyCard from "@/components/AnomalyCard";
import StatusBadge from "@/components/StatusBadge";

export default function ReportPreview() {
  const { id } = useParams<{ id: string }>();
  const { getRecord } = useRecordStore();
  const record = id ? getRecord(id) : undefined;

  if (!record) {
    return <Navigate to="/" replace />;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 no-print">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            to={`/records/${record.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-lab-blue hover:text-lab-blue-light transition-colors"
          >
            <ArrowLeft width={16} height={16} />
            返回详情
          </Link>
          <h1 className="font-serif text-lg font-bold text-lab-ink">实验复盘报告预览</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-lab-blue text-white rounded hover:bg-blue-800 transition-colors"
            >
              <Printer width={14} height={14} />
              打印 / 导出 PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white shadow-card rounded p-10 print:shadow-none print:p-4 print:rounded-none">
          <div className="text-center mb-8 pb-6 border-b-2 border-lab-blue">
            <h1 className="font-serif text-3xl font-bold text-lab-ink tracking-wide mb-2">
              薄层色谱展开复盘报告
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
              <span className="font-mono text-lab-blue font-semibold">{record.batchNo}</span>
              <span>·</span>
              <span>{record.date}</span>
              <span>·</span>
              <StatusBadge status={record.status} />
              {record.isDuplicate && (
                <>
                  <span>·</span>
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 border border-red-200 rounded font-semibold">
                    批号重复 · 已拦截
                  </span>
                </>
              )}
            </div>
          </div>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-lab-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-lab-blue rounded-sm inline-block" />
              一、实验基本信息
            </h2>
            <InfoTable record={record} highlightAnomalies={false} />
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-lab-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-lab-blue rounded-sm inline-block" />
              二、薄层色谱谱图
            </h2>
            <div className="flex justify-center p-4 border border-slate-200 rounded bg-slate-50 paper-texture">
              <TLCPlate record={record} width={300} height={450} />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-bold text-lab-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-lab-blue rounded-sm inline-block" />
              三、组分分析数据表
            </h2>
            <ComponentTable record={record} />
          </section>

          {record.notes.length > 0 && (
            <section className="mb-8">
              <h2 className="font-serif text-xl font-bold text-lab-ink mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-lab-orange rounded-sm inline-block" />
                四、异常情况说明
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                以下为系统自动检测到的异常及对应的处理说明，质检主管可据此判断是否放行。
              </p>
              <div className="space-y-3">
                {record.notes.map((note, i) => (
                  <div
                    key={i}
                    className="border rounded bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-4"
                  >
                    <div className="mb-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-white border border-amber-300 text-amber-700 rounded">
                        异常 {i + 1}：{note.message}
                      </span>
                    </div>
                    <div className="pl-4 border-l-2 border-amber-300">
                      <p className="text-sm leading-relaxed text-stone-700 whitespace-pre-wrap">
                        {note.explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mb-4">
            <h2 className="font-serif text-xl font-bold text-lab-ink mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-lab-blue rounded-sm inline-block" />
              五、实验结论与备注
            </h2>
            <ConclusionSection conclusion={record.conclusion} manualRemark={record.manualRemark} />
          </section>

          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p>报告生成时间：{new Date().toLocaleString("zh-CN")}</p>
              <p>报告系统：薄层色谱展开复盘系统</p>
            </div>
            <div className="text-right">
              <p>审核签字：____________</p>
              <p className="mt-1">日期：____________</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400 no-print">
          <p>点击右上角"打印 / 导出 PDF"按钮可将报告另存为 PDF 或直接打印</p>
        </div>
      </div>
    </div>
  );
}
