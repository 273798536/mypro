import { useState, useRef } from "react";
import {
  Ticket,
  Receipt,
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Clock,
  Tag,
  FileSpreadsheet,
} from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { formatDate, parseCSV } from "@/utils/helpers";
import type { ImportBatch, ImportSource, ParsedFile, ImportResult } from "@/types";

const tabs = [
  { key: "ticket_code" as ImportSource, label: "票券码", icon: Ticket, description: "包含券码、类型、影院、面值等信息" },
  { key: "redemption_record" as ImportSource, label: "核销记录", icon: Receipt, description: "包含券码、影院、核销时间、渠道、金额等信息" },
  { key: "channel_contract" as ImportSource, label: "渠道合同", icon: FileText, description: "包含渠道、服务费率、版本、生效日期等信息" },
];

export default function DataImport() {
  const [activeTab, setActiveTab] = useState<ImportSource>("ticket_code");
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { importBatches, importData, removeImportBatch } = useSettlementStore();

  const handleFileUpload = async (file: File) => {
    try {
      let data: Record<string, unknown>[] = [];

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        data = parseCSV(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else if (file.name.endsWith(".json")) {
        const text = await file.text();
        data = JSON.parse(text);
      } else {
        alert("不支持的文件格式，请上传 CSV、Excel 或 JSON 文件");
        return;
      }

      const parsedFile: ParsedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        data,
      };

      const result = importData(activeTab, parsedFile);
      setImportResult(result);
    } catch (error) {
      console.error("文件解析失败:", error);
      alert("文件解析失败，请检查文件格式");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentTab = tabs.find((t) => t.key === activeTab)!;
  const sortedBatches = [...importBatches].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const currentSourceBatches = importBatches.filter((b) => b.source === activeTab);

  const sourceIconMap: Record<ImportSource, React.ReactNode> = {
    ticket_code: <Ticket size={14} />,
    redemption_record: <Receipt size={14} />,
    channel_contract: <FileText size={14} />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">数据导入</h2>
        <p className="text-sm text-ink-500 mt-1">
          依次导入票券码、核销记录、渠道合同，系统会按导入顺序标记时序
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex gap-1 bg-ink-100 p-1 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setImportResult(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-ink-700 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-ink-100 rounded-lg">
                  <currentTab.icon size={20} className="text-ink-600" />
                </div>
                <div>
                  <h3 className="font-medium text-ink-700">导入 {currentTab.label}</h3>
                  <p className="text-sm text-ink-500">{currentTab.description}</p>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-brand-400 bg-brand-50"
                    : "border-ink-200 hover:border-brand-400 hover:bg-brand-50/30"
                }`}
              >
                <Upload size={32} className={`mx-auto mb-3 ${isDragging ? "text-brand-500" : "text-ink-400"}`} />
                <p className="font-medium text-ink-700">点击或拖拽文件到此处上传</p>
                <p className="text-sm text-ink-400 mt-1">支持 CSV、Excel (.xlsx/.xls)、JSON 格式</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {importResult && (
                <div className={`mt-4 p-4 rounded-lg ${importResult.failCount > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {importResult.failCount > 0 ? (
                        <AlertCircle size={18} className="text-accent-danger" />
                      ) : (
                        <CheckCircle size={18} className="text-accent-success" />
                      )}
                      <span className="font-medium">
                        导入完成：成功 {importResult.successCount} 条
                        {importResult.failCount > 0 && `，失败 ${importResult.failCount} 条`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {importResult.failCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowErrors(!showErrors);
                          }}
                          className="text-sm text-accent-danger hover:underline"
                        >
                          {showErrors ? "收起错误" : "查看错误详情"}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportResult(null);
                        }}
                        className="p-1 hover:bg-white/50 rounded"
                      >
                        <X size={16} className="text-ink-400" />
                      </button>
                    </div>
                  </div>
                  {showErrors && importResult.errors.length > 0 && (
                    <div className="mt-3 text-sm text-red-700 font-mono text-left max-h-40 overflow-y-auto">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx}>第 {err.row} 行：{err.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display text-lg font-medium">已导入批次 - {currentTab.label}</h3>
              <span className="text-sm text-ink-500">共 {currentSourceBatches.length} 批</span>
            </div>
            <div className="card-body p-0">
              {currentSourceBatches.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>批次号</th>
                      <th>文件名</th>
                      <th>记录数</th>
                      <th>导入时间</th>
                      <th>是否后补</th>
                      <th className="text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSourceBatches
                      .sort((a, b) => b.importTime - a.importTime)
                      .map((batch) => (
                        <tr key={batch.id}>
                          <td>
                            <span className="font-mono text-sm">{batch.id}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet size={14} className="text-ink-400" />
                              <span>{batch.fileName || "未命名"}</span>
                            </div>
                          </td>
                          <td>{batch.recordCount} 条</td>
                          <td className="text-ink-500 text-sm">{formatDate(batch.importTime)}</td>
                          <td>
                            {batch.isSupplementary ? (
                              <span className="badge badge-warning">后补</span>
                            ) : (
                              <span className="badge badge-success">正常</span>
                            )}
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => removeImportBatch(batch.id)}
                              className="p-1.5 text-ink-400 hover:text-accent-danger hover:bg-red-50 rounded transition-colors"
                              title="删除批次"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-ink-400">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>暂无 {currentTab.label} 导入批次</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-display text-lg font-medium">导入时序</h3>
              <p className="text-xs text-ink-400 mt-1">按导入顺序排列，后补数据会标记橙色</p>
            </div>
            <div className="card-body">
              {sortedBatches.length > 0 ? (
                <div className="space-y-0">
                  {sortedBatches.map((batch, idx) => (
                    <div
                      key={batch.id}
                      className={`timeline-item ${batch.source === activeTab ? "timeline-item-active" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                          batch.isSupplementary
                            ? "bg-orange-100 text-orange-800"
                            : "bg-ink-100 text-ink-600"
                        }`}>
                          {sourceIconMap[batch.source]}
                          {batch.sourceLabel}
                        </span>
                        {batch.isSupplementary && (
                          <Tag size={10} className="text-accent-warning" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-ink-700">
                        批次 #{batch.sequenceOrder}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">
                        {formatDate(batch.importTime, "MM-DD HH:mm")}
                      </div>
                      <div className="text-xs text-ink-400">
                        {batch.recordCount} 条记录
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-ink-400">
                  <Clock size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无导入数据</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-display text-lg font-medium">字段说明</h3>
            </div>
            <div className="card-body">
              <div className="text-xs text-ink-500 space-y-2">
                {activeTab === "ticket_code" && (
                  <>
                    <p><span className="font-medium text-ink-600">必填字段：</span></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><code className="bg-ink-100 px-1 rounded">code</code> / <code className="bg-ink-100 px-1 rounded">券码</code> - 票券编号</li>
                    </ul>
                    <p className="mt-2"><span className="font-medium text-ink-600">可选字段：</span></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><code className="bg-ink-100 px-1 rounded">type</code> / <code className="bg-ink-100 px-1 rounded">类型</code> - group_buy/membership/channel</li>
                      <li><code className="bg-ink-100 px-1 rounded">cinemaId</code> / <code className="bg-ink-100 px-1 rounded">影院ID</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">cinemaName</code> / <code className="bg-ink-100 px-1 rounded">影院名称</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">faceValue</code> / <code className="bg-ink-100 px-1 rounded">面值</code></li>
                    </ul>
                  </>
                )}
                {activeTab === "redemption_record" && (
                  <>
                    <p><span className="font-medium text-ink-600">必填字段：</span></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><code className="bg-ink-100 px-1 rounded">ticketCode</code> / <code className="bg-ink-100 px-1 rounded">券码</code></li>
                    </ul>
                    <p className="mt-2"><span className="font-medium text-ink-600">可选字段：</span></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><code className="bg-ink-100 px-1 rounded">cinemaId</code> / <code className="bg-ink-100 px-1 rounded">影院ID</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">cinemaName</code> / <code className="bg-ink-100 px-1 rounded">影院名称</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">channelId</code> / <code className="bg-ink-100 px-1 rounded">渠道ID</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">channelName</code> / <code className="bg-ink-100 px-1 rounded">渠道名称</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">amount</code> / <code className="bg-ink-100 px-1 rounded">金额</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">redemptionTime</code> / <code className="bg-ink-100 px-1 rounded">核销时间</code></li>
                    </ul>
                  </>
                )}
                {activeTab === "channel_contract" && (
                  <>
                    <p><span className="font-medium text-ink-600">必填字段：</span></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><code className="bg-ink-100 px-1 rounded">channelId</code> / <code className="bg-ink-100 px-1 rounded">渠道ID</code></li>
                    </ul>
                    <p className="mt-2"><span className="font-medium text-ink-600">可选字段：</span></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><code className="bg-ink-100 px-1 rounded">channelName</code> / <code className="bg-ink-100 px-1 rounded">渠道名称</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">serviceFeeRate</code> / <code className="bg-ink-100 px-1 rounded">服务费率</code>（%）</li>
                      <li><code className="bg-ink-100 px-1 rounded">feeVersion</code> / <code className="bg-ink-100 px-1 rounded">费率版本</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">validFrom</code> / <code className="bg-ink-100 px-1 rounded">生效日期</code></li>
                      <li><code className="bg-ink-100 px-1 rounded">validTo</code> / <code className="bg-ink-100 px-1 rounded">截止日期</code></li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
