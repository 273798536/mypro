import { Calendar, MapPin, User, Package } from "lucide-react";
import { PrimerSample, SampleStatus } from "@/types";
import { statusLabel, statusColor } from "@/utils/boundaryCheck";

interface ReportHeaderProps {
  sample: PrimerSample;
}

export default function ReportHeader({ sample }: ReportHeaderProps) {
  const statusBarColor = {
    [SampleStatus.NORMAL]: "bg-teal-500",
    [SampleStatus.BORDERLINE]: "bg-amber-500",
    [SampleStatus.ABNORMAL]: "bg-red-500",
  }[sample.status];

  const statusBg = {
    [SampleStatus.NORMAL]: "bg-teal-50 border-teal-300",
    [SampleStatus.BORDERLINE]: "bg-amber-50 border-amber-300",
    [SampleStatus.ABNORMAL]: "bg-red-50 border-red-300",
  }[sample.status];

  const statusText = {
    [SampleStatus.NORMAL]: "text-teal-800",
    [SampleStatus.BORDERLINE]: "text-amber-800",
    [SampleStatus.ABNORMAL]: "text-red-800",
  }[sample.status];

  return (
    <div className="bg-white border-b-4 border-primary-700 print:border-b-2">
      <div className={`h-2 w-full ${statusBarColor} print:h-1`} />
      <div className="px-8 py-6 print:px-6 print:py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-primary-700 flex items-center justify-center print:w-10 print:h-10">
                <Package className="w-6 h-6 text-white print:w-5 print:h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary-900 tracking-tight print:text-xl">
                  引物设计边界检查报告
                </h1>
                <p className="text-sm text-primary-500 print:text-xs">
                  Primer Design Boundary Inspection Report
                </p>
              </div>
            </div>
          </div>
          <div
            className={`flex-shrink-0 px-5 py-2 rounded-lg border-2 ${statusBg} print:px-4 print:py-1.5`}
          >
            <div
              className="text-xs font-medium text-center mb-0.5 opacity-75 print:text-[10px]"
              style={{ color: statusColor(sample.status) }}
            >
              当前状态
            </div>
            <div className={`text-lg font-bold text-center ${statusText} print:text-base`}>
              {statusLabel(sample.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-primary-100 print:grid-cols-4 print:gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary-500 print:text-[10px]">
              <Package className="w-3.5 h-3.5" />
              批次号
            </div>
            <div className="font-mono text-base font-semibold text-primary-900 print:text-sm">
              {sample.batch}
            </div>
            <div className="text-xs text-primary-600 font-mono bg-primary-50 inline-block px-2 py-0.5 rounded print:text-[10px]">
              {sample.id}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary-500 print:text-[10px]">
              <User className="w-3.5 h-3.5" />
              样本名 / 采样人
            </div>
            <div className="text-base font-semibold text-primary-900 print:text-sm">
              {sample.name}
            </div>
            <div className="text-xs text-primary-600 print:text-[10px]">
              {sample.operator}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary-500 print:text-[10px]">
              <MapPin className="w-3.5 h-3.5" />
              采样地点
            </div>
            <div className="text-base font-semibold text-primary-900 print:text-sm">
              {sample.location}
            </div>
            <div className="text-xs text-primary-600 print:text-[10px]">
              动物房采样点
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary-500 print:text-[10px]">
              <Calendar className="w-3.5 h-3.5" />
              采样日期
            </div>
            <div className="text-base font-semibold text-primary-900 print:text-sm">
              {sample.collectionDate}
            </div>
            <div className="text-xs text-primary-600 print:text-[10px]">
              报告生成：{new Date().toLocaleString("zh-CN")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
