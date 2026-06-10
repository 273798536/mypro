import { useParams, Link, useNavigate } from "react-router-dom";
import { Home, ChevronRight, FileText, ArrowLeft, AlertCircle } from "lucide-react";
import { useSampleStore } from "@/store/useSampleStore";
import StatusBadge from "@/components/detail/StatusBadge";
import MetricsRadar from "@/components/detail/MetricsRadar";
import ReviewPanel from "@/components/detail/ReviewPanel";
import LineageTimeline from "@/components/detail/LineageTimeline";
import { useMemo } from "react";

function NotFound() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-primary-200 bg-white p-10 text-center shadow-card">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-10 w-10 text-lab-danger" strokeWidth={1.8} />
        </div>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-primary-900">
          404 · 样本未找到
        </h1>
        <p className="mb-2 text-sm text-primary-500">
          样本 ID：<span className="font-mono font-semibold text-primary-700">{id}</span>
        </p>
        <p className="mb-8 text-sm text-primary-600">
          该样本可能已被删除、归档，或您输入的链接有误。
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-white px-6 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:shadow-md sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </button>
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-800 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg sm:w-auto"
          >
            <Home className="h-4 w-4" />
            返回样本列表
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const samples = useSampleStore((s) => s.samples);
  const sample = useMemo(() => (id ? samples.find((x) => x.id === id) : undefined), [samples, id]);

  if (!id || !sample) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center gap-1.5 text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-primary-500 transition hover:bg-primary-100 hover:text-primary-800"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="font-medium">样本总览</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-primary-300" />
          <span className="rounded-md bg-primary-100/60 px-2 py-1 font-medium text-primary-700">
            样本详情
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-primary-300" />
          <span className="font-mono font-semibold text-primary-900">{sample.id}</span>
        </nav>

        <div className="space-y-6">
          <div className="animate-fade-in-up">
            <StatusBadge sample={sample} />
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <MetricsRadar sample={sample} />
          </div>

          <div
            className="grid grid-cols-1 gap-6 animate-fade-in-up lg:grid-cols-2"
            style={{ animationDelay: "160ms" }}
          >
            <div className="h-[640px]">
              <ReviewPanel sample={sample} />
            </div>
            <div className="h-[640px]">
              <LineageTimeline lineage={sample.lineage} />
            </div>
          </div>

          <div className="pb-6 pt-2 text-center text-xs text-primary-400">
            <FileText className="mr-1 inline h-3 w-3" />
            样本编号 {sample.id} · 所属批次 {sample.batch}
          </div>
        </div>
      </div>
    </div>
  );
}
