import { useState } from "react";
import {
  Upload,
  PlusSquare,
  History,
  FileJson,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  mockBatch1,
  mockBatch2_manualNormal,
  buildComplaintRecords,
  type MockInput,
} from "../data/mockRecords";
import type { ComplaintRecord } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ImportPanel() {
  const { batches, importBatch, addManualRecord, resetAll } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manual, setManual] = useState({
    title: "",
    description: "",
    location_name: "",
    intersection: "",
    reporter: "",
    report_time: new Date(Date.now() - 3600000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " "),
    lat: 31.23,
    lng: 121.47,
  });

  const flashMessage = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string) as MockInput[];
          doImport(parsed, f.name);
        } catch (err) {
          flashMessage(`JSON解析失败：${(err as Error).message}`);
        }
      };
      reader.readAsText(f);
    });
  };

  const doImport = (data: MockInput[], batchName: string) => {
    setImporting(true);
    const fakeBatchId = "tmp";
    const records = buildComplaintRecords(data, fakeBatchId);
    const stripped = records.map(
      ({ id, fingerprint, source_batch_id, status, is_intersection_error, created_at, updated_at, ...rest }) => ({
        ...rest,
        id,
      })
    );
    const result = importBatch(
      stripped,
      batchName
    );
    flashMessage(
      `批次「${result.batch.name}」导入完成：新增${result.added_count}条 / 重复${result.duplicate_count}条 / 合错${result.intersection_error_count}条 / 坏数据${result.bad_data_count}条`
    );
    setImporting(false);
  };

  const handleMockDemo = () => {
    doImport(mockBatch1, "巡检照片批次_20260615_周姐整理");
  };

  const handleMockManual = () => {
    const fakeBatchId = "tmp";
    const built = buildComplaintRecords([mockBatch2_manualNormal], fakeBatchId);
    const r = built[0];
    const result = addManualRecord({
      title: r.title,
      description: r.description,
      location_name: r.location_name,
      lat: r.lat,
      lng: r.lng,
      intersection: r.intersection,
      reporter: r.reporter,
      report_time: r.report_time,
      complaint_source: r.complaint_source,
      photo_url: r.photo_url,
      original_row_ref: r.original_row_ref,
    });
    flashMessage(result.message);
  };

  const handleManualSubmit = () => {
    if (!manual.title.trim() || !manual.location_name.trim() || !manual.reporter.trim()) {
      flashMessage("请至少填写标题、地点、投诉人三项");
      return;
    }
    const result = addManualRecord({
      ...manual,
      report_time: manual.report_time.replace("T", " "),
      complaint_source: "手动补录",
      original_row_ref: `手动补录表单-${new Date().toLocaleString("zh-CN")}`,
    });
    flashMessage(result.message);
    if (!result.isDuplicate) {
      setShowForm(false);
      setManual({
        title: "",
        description: "",
        location_name: "",
        intersection: "",
        reporter: "",
        report_time: new Date(Date.now() - 3600000).toISOString().slice(0, 16).replace("T", " "),
        lat: 31.23,
        lng: 121.47,
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-zinc-50 to-white border-r border-zinc-200">
      <div className="p-4 border-b border-zinc-200">
        <h2 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-government-600" />
          数据导入与补录
        </h2>

        {message && (
          <div className="mb-3 px-3 py-2 text-xs rounded-lg bg-government-50 border border-government-200 text-government-700 font-medium">
            {message}
          </div>
        )}

        <div
          className={`mb-3 border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-government-500 bg-government-50"
              : "border-zinc-300 hover:border-government-400 hover:bg-government-50/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleFileDrop}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = (ev) => {
              const files = (ev.target as HTMLInputElement).files;
              if (files && files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const parsed = JSON.parse(e.target?.result as string) as MockInput[];
                    doImport(parsed, files[0].name);
                  } catch (err) {
                    flashMessage(`JSON解析失败：${(err as Error).message}`);
                  }
                };
                reader.readAsText(files[0]);
              }
            };
            input.click();
          }}
        >
          <FileJson className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
          <p className="text-xs text-zinc-600 font-medium">
            拖拽或点击导入 JSON 批次文件
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            模拟照片识别导出的巡检投诉记录
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleMockDemo}
            disabled={importing}
            className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-government-600 to-government-700 text-white text-xs font-medium shadow-sm hover:shadow-md hover:from-government-700 hover:to-government-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ① 导入巡检照片旧材料（10条演示包）
          </button>
          <button
            onClick={handleMockManual}
            disabled={importing}
            className="w-full px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium hover:bg-teal-100 transition-all flex items-center justify-center gap-2"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            ② 补一条正常记录（徐家汇公园）
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition-all flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <PlusSquare className="w-3.5 h-3.5" />
              手动补录任意记录
            </span>
            {showForm ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showForm && (
            <div className="mt-2 p-3 rounded-lg bg-white border border-zinc-200 space-y-2 animate-in fade-in">
              {[
                { key: "title", label: "标题*", placeholder: "例：公园南门广场舞扰民" },
                { key: "location_name", label: "地点名称*", placeholder: "例：中山公园南门广场" },
                { key: "intersection", label: "路口描述", placeholder: "例：XX路与YY路交叉口" },
                { key: "reporter", label: "投诉人*", placeholder: "例：李阿姨" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[11px] text-zinc-500 mb-1">
                    {f.label}
                  </label>
                  <input
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 focus:ring-1 focus:ring-government-200 outline-none"
                    placeholder={f.placeholder}
                    value={String((manual as Record<string, unknown>)[f.key] || "")}
                    onChange={(e) =>
                      setManual({ ...manual, [f.key]: e.target.value })
                    }
                  />
                </div>
              ))}
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">
                  投诉时间
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 focus:ring-1 focus:ring-government-200 outline-none"
                  value={manual.report_time.replace(" ", "T")}
                  onChange={(e) =>
                    setManual({ ...manual, report_time: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">纬度</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 outline-none"
                    value={manual.lat}
                    onChange={(e) =>
                      setManual({ ...manual, lat: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">经度</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 outline-none"
                    value={manual.lng}
                    onChange={(e) =>
                      setManual({ ...manual, lng: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">
                  情况描述
                </label>
                <textarea
                  rows={3}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-300 focus:border-government-500 focus:ring-1 focus:ring-government-200 outline-none resize-none"
                  placeholder="描述噪声情况、影响范围等..."
                  value={manual.description}
                  onChange={(e) =>
                    setManual({ ...manual, description: e.target.value })
                  }
                />
              </div>
              <button
                onClick={handleManualSubmit}
                className="w-full py-2 rounded-md bg-government-600 text-white text-xs font-medium hover:bg-government-700 transition"
              >
                提交补录（自动触发去重校验）
              </button>
            </div>
          )}

          <button
            onClick={resetAll}
            className="w-full mt-2 px-3 py-2 rounded-lg border border-databad-200 text-databad-600 text-xs font-medium hover:bg-databad-50 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空全部数据（重跑演示）
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-bold text-zinc-700 mb-3 flex items-center gap-2 sticky top-0 bg-gradient-to-b from-white to-transparent pt-1 pb-2 -mt-1">
          <History className="w-3.5 h-3.5 text-zinc-500" />
          批次历史时间线
        </h3>
        {batches.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-400">
            暂无导入批次
            <p className="mt-1">点击上方按钮开启第一步</p>
          </div>
        ) : (
          <div className="relative pl-4 space-y-3">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gradient-to-b from-government-300 via-zinc-200 to-transparent" />
            {[...batches]
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .map((b, i) => (
                <div
                  key={b.id}
                  className="relative bg-white rounded-lg p-3 shadow-card border border-zinc-100 hover:shadow-card-hover transition"
                >
                  <div
                    className={`absolute -left-2.5 top-3 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                      i === 0
                        ? "bg-government-500"
                        : b.type === "manual"
                        ? "bg-teal-500"
                        : "bg-zinc-400"
                    }`}
                  />
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-zinc-800 leading-tight line-clamp-1">
                        {b.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {formatDate(b.created_at)} ·{" "}
                        <span
                          className={
                            b.type === "manual"
                              ? "text-teal-600"
                              : "text-government-600"
                          }
                        >
                          {b.type === "manual" ? "手动操作" : "批量导入"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex justify-between px-2 py-1 rounded bg-zinc-50">
                      <span className="text-zinc-500">提交</span>
                      <span className="font-bold text-zinc-700">
                        {b.record_count}
                      </span>
                    </div>
                    <div className="flex justify-between px-2 py-1 rounded bg-zinc-50">
                      <span className="text-zinc-500">重复</span>
                      <span
                        className={`font-bold ${
                          b.duplicate_count > 0
                            ? "text-zinc-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {b.duplicate_count}
                      </span>
                    </div>
                    <div className="flex justify-between px-2 py-1 rounded bg-zinc-50">
                      <span className="text-zinc-500">合错</span>
                      <span
                        className={`font-bold ${
                          b.intersection_error_count > 0
                            ? "text-warning-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {b.intersection_error_count}
                      </span>
                    </div>
                    <div className="flex justify-between px-2 py-1 rounded bg-zinc-50">
                      <span className="text-zinc-500">坏数据</span>
                      <span
                        className={`font-bold ${
                          b.bad_data_count > 0
                            ? "text-databad-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {b.bad_data_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
