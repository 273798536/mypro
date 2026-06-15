import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";
import {
  AlertTriangle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Repeat2,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { RESULT_WORDS, STATUS_COLORS, PhotoAttachment } from "@/types";

export function DetailTable() {
  const [isOpen, setIsOpen] = useState(true);
  const filteredPoints = useAppStore((s) => s.filteredPoints);
  const selectedPointId = useAppStore((s) => s.selectedPointId);
  const selectPoint = useAppStore((s) => s.selectPoint);
  const addPhoto = useAppStore((s) => s.addPhoto);
  const setFocusPosition = useAppStore((s) => s.setFocusPosition);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const rows = filteredPoints.map((p) => ({
      编号: p.id,
      地址: p.address,
      来源: p.source,
      处理状态: RESULT_WORDS[p.status],
      街口冲突: p.isConflict ? "是" : "否",
      重复投诉: p.isDuplicate ? "是" : "否",
      投诉次数: p.complaintCount,
      首次投诉: p.firstComplaintAt,
      最近投诉: p.latestComplaintAt,
      当前判断: p.currentJudgment,
      照片数量: p.photos.length,
      判断历史次数: p.history.length,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `社区充电投诉明细_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePhotoUpload = (pointId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const photo: PhotoAttachment = {
        id: `${pointId}-photo-${Date.now()}`,
        pointId,
        photoUrl: reader.result as string,
        uploader: "规划师小赵",
        uploadedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        remark: "现场补录照片",
      };
      addPhoto(pointId, photo);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="table"
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 bottom-0 w-[420px] z-20"
          >
            <div className="glass-panel-strong h-full flex flex-col rounded-l-2xl overflow-hidden">
              <div className="p-4 border-b border-deepsea-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-amberwarm-400" />
                    <h2 className="font-serif text-lg text-white">CSV明细</h2>
                    <span className="text-xs text-slategray-400 font-mono">
                      {filteredPoints.length} 条
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleExportCSV}
                      className="p-2 rounded-lg hover:bg-deepsea-500/40 text-slategray-300 hover:text-white transition-colors"
                      title="导出CSV"
                    >
                      <Download size={16} />
                    </button>
                    <label className="p-2 rounded-lg hover:bg-deepsea-500/40 text-slategray-300 hover:text-white transition-colors cursor-pointer">
                      <Upload size={16} />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-slategray-400">
                    <span className="w-2 h-2 rounded-full bg-amberwarm-500" />
                    街口冲突
                  </span>
                  <span className="flex items-center gap-1 text-slategray-400">
                    <span className="w-2 h-2 rounded-full bg-magenta-500" />
                    重复投诉
                  </span>
                  <span className="flex items-center gap-1 text-slategray-400">
                    <Camera size={11} className="text-mint-500" />
                    已补录照片
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-deepsea-700/90 backdrop-blur text-xs text-slategray-400">
                      <th className="text-left py-3 px-3 font-medium">编号/地址</th>
                      <th className="text-left py-3 px-2 font-medium">状态</th>
                      <th className="text-left py-3 px-2 font-medium">标记</th>
                      <th className="text-center py-3 px-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPoints.map((p) => {
                      const isSelected = selectedPointId === p.id;
                      return (
                        <motion.tr
                          key={p.id}
                          onClick={() => {
                            selectPoint(p.id);
                            const CENTER_LNG = 116.337;
                            const CENTER_LAT = 39.986;
                            const SCALE = 200;
                            setFocusPosition([
                              (p.lng - CENTER_LNG) * SCALE,
                              0,
                              (CENTER_LAT - p.lat) * SCALE,
                            ]);
                          }}
                          className={`cursor-pointer border-b border-deepsea-700/50 transition-colors ${
                            isSelected
                              ? "bg-amberwarm-500/15"
                              : p.isDuplicate
                                ? "striped-duplicate"
                                : "hover:bg-deepsea-600/40"
                          }`}
                          whileHover={{ backgroundColor: isSelected ? "rgba(255,140,66,0.15)" : "rgba(26,63,133,0.5)" }}
                        >
                          <td className="py-3 px-3">
                            <div className="font-mono text-xs text-deepsea-200">{p.id}</div>
                            <div className="text-white text-xs mt-0.5 leading-snug line-clamp-2">
                              {p.address}
                            </div>
                            <div className="text-[10px] text-slategray-500 mt-1">
                              来源:{p.source} · {p.complaintCount}次投诉
                            </div>
                          </td>
                          <td className="py-3 px-2 align-top">
                            <span
                              className="inline-block px-2 py-1 rounded-md text-[10px] font-medium"
                              style={{
                                backgroundColor: `${STATUS_COLORS[p.status]}22`,
                                color: STATUS_COLORS[p.status],
                                border: `1px solid ${STATUS_COLORS[p.status]}55`,
                              }}
                            >
                              {RESULT_WORDS[p.status]}
                            </span>
                          </td>
                          <td className="py-3 px-2 align-top">
                            <div className="flex flex-col gap-1">
                              {p.isConflict && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amberwarm-500/20 text-amberwarm-300"
                                  title="街口冲突"
                                >
                                  <AlertTriangle size={10} />
                                  冲突
                                </span>
                              )}
                              {p.isDuplicate && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-magenta-500/20 text-magenta-300"
                                  title="重复投诉"
                                >
                                  <Repeat2 size={10} />
                                  重复
                                </span>
                              )}
                              {p.photos.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-mint-500/20 text-mint-300"
                                  title={`已补录${p.photos.length}张照片`}
                                >
                                  <Camera size={10} />
                                  {p.photos.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center align-top">
                            <label className="inline-flex p-1.5 rounded-lg hover:bg-deepsea-500/60 text-slategray-400 hover:text-mint-300 transition-colors cursor-pointer">
                              <Camera size={14} />
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(p.id, e)}
                              />
                            </label>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-20 p-2 glass-panel rounded-l-xl hover:bg-deepsea-500/60 text-slategray-300 hover:text-white transition-all ${
          isOpen ? "right-[420px]" : "right-0"
        }`}
      >
        {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </>
  );
}
