import React, { useState } from "react";
import { BuoyRecord, BuoyField, FIELD_LABELS, FIELD_UNITS } from "@/types";
import { useBuoyStore } from "@/store/useBuoyStore";
import QualityBadge from "./QualityBadge";
import ReviewBadge from "./ReviewBadge";
import DisplayTag from "./DisplayTag";
import CorrectionPanel from "./CorrectionPanel";
import { formatTimestamp } from "@/utils/correctionLogger";
import { Edit3, MessageSquare, AlertOctagon, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELDS: BuoyField[] = [
  "plasticConcentration",
  "turbidity",
  "salinity",
  "temperature",
];

interface Props {
  records: BuoyRecord[];
  pageSize?: number;
}

export default function BuoyDataTable({ records, pageSize = 10 }: Props) {
  const { page, setPage, selectedRecordId, setSelectedRecord } = useBuoyStore();
  const [, setEditingField] = useState<{
    recordId: string;
    field: BuoyField | "remark";
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const pageRecords = records.slice(startIdx, startIdx + pageSize);

  const renderCellValue = (record: BuoyRecord, field: BuoyField) => {
    const value = record[field];
    const isNull = value === null || value === undefined;

    if (isNull) {
      return (
        <span className="italic text-ocean-400/50 empty-cell px-2 py-1 rounded text-xs">
          —
        </span>
      );
    }

    return (
      <span className="text-ocean-50">
        {value}
        <span className="text-ocean-400/60 text-xs ml-1">{FIELD_UNITS[field]}</span>
      </span>
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead className="bg-ocean-900/60 border-b border-ocean-600/30">
            <tr>
              <th className="table-header w-12"></th>
              <th className="table-header">浮标编号</th>
              <th className="table-header">时间</th>
              <th className="table-header">位置</th>
              {FIELDS.map((f) => (
                <th key={f} className="table-header">{FIELD_LABELS[f]}</th>
              ))}
              <th className="table-header">备注</th>
              <th className="table-header">质量</th>
              <th className="table-header">审核</th>
              <th className="table-header">使用</th>
              <th className="table-header w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRecords.map((record) => (
              <React.Fragment key={record.id}>
                <tr
                  className={cn(
                    "border-b border-ocean-700/30 hover:bg-ocean-700/20 transition-colors",
                    record.isDuplicate && "duplicate-row",
                    selectedRecordId === record.id && "bg-ocean-600/30"
                  )}
                >
                  <td className="table-cell">
                    {record.isDuplicate && (
                      <div className="flex items-center" title="重复数据">
                        <Copy size={14} className="text-quality-recollect" />
                      </div>
                    )}
                  </td>
                  <td className="table-cell font-mono text-sm text-ocean-200">
                    {record.buoyId}
                  </td>
                  <td className="table-cell text-ocean-300/80 text-xs">
                    {formatTimestamp(record.timestamp)}
                  </td>
                  <td className="table-cell text-ocean-200">{record.location}</td>
                  {FIELDS.map((f) => (
                    <td key={f} className="table-cell">
                      {renderCellValue(record, f)}
                    </td>
                  ))}
                  <td className="table-cell max-w-[180px]">
                    {record.extractedRemark ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-ocean-600/30 text-ocean-200 text-xs">
                        <MessageSquare size={12} />
                        <span className="truncate">{record.extractedRemark}</span>
                      </span>
                    ) : (
                      <span className="text-ocean-500/50 text-xs">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <QualityBadge
                      quality={record.quality}
                      reasons={record.qualityReasons}
                    />
                  </td>
                  <td className="table-cell">
                    <ReviewBadge status={record.reviewStatus} />
                  </td>
                  <td className="table-cell">
                    <DisplayTag record={record} />
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedRecord(record.id)}
                        className={cn(
                          "p-1.5 rounded-md transition-all",
                          "text-ocean-400 hover:text-ocean-50 hover:bg-ocean-600/50",
                          selectedRecordId === record.id && "bg-ocean-600/40 text-ocean-50"
                        )}
                        title="修正数据"
                      >
                        <Edit3 size={14} />
                      </button>
                      {record.hasNullValue && (
                        <span
                          className="p-1.5 text-quality-pending"
                          title="含空值字段"
                        >
                          <AlertOctagon size={14} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {selectedRecordId === record.id && (
                  <tr>
                    <td colSpan={12} className="bg-ocean-900/40 border-b border-ocean-700/30">
                      <CorrectionPanel
                        record={record}
                        onClose={() => setSelectedRecord(null)}
                        onEditField={(field) =>
                          setEditingField({ recordId: record.id, field })
                        }
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {records.length === 0 && (
          <div className="py-12 text-center text-ocean-400/70">
            暂无符合条件的数据
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ocean-700/30 bg-ocean-900/40">
            <span className="text-sm text-ocean-400/70">
              第 {page} / {totalPages} 页，共 {records.length} 条记录
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-md text-sm bg-ocean-700/50 text-ocean-200 hover:bg-ocean-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-md text-sm bg-ocean-700/50 text-ocean-200 hover:bg-ocean-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
