import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ChevronRight,
  Clock,
  Edit3,
  GitCompare,
  MessageSquare,
  Save,
  User,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function HistoryDrawer() {
  const isOpen = useAppStore((s) => s.isHistoryDrawerOpen);
  const toggleHistoryDrawer = useAppStore((s) => s.toggleHistoryDrawer);
  const selectedPoint = useAppStore((s) => s.getSelectedPoint());
  const addJudgment = useAppStore((s) => s.addJudgment);
  const [newJudgment, setNewJudgment] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSave = () => {
    if (!newJudgment.trim() || !selectedPoint) return;
    addJudgment(selectedPoint.id, newJudgment.trim(), reason.trim() || "未填写原因");
    setNewJudgment("");
    setReason("");
    setShowForm(false);
  };

  return (
    <AnimatePresence>
      {isOpen && selectedPoint && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleHistoryDrawer}
            className="absolute inset-0 z-30 bg-black/30 backdrop-blur-xs"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 bottom-0 w-[460px] max-w-[95vw] z-40"
          >
            <div className="glass-panel-strong h-full flex flex-col rounded-l-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-deepsea-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCompare size={18} className="text-amberwarm-400" />
                  <h2 className="font-serif text-lg text-white">判断历史追溯</h2>
                </div>
                <button
                  onClick={toggleHistoryDrawer}
                  className="p-1.5 rounded-lg hover:bg-deepsea-500/40 text-slategray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-deepsea-500/20 bg-deepsea-800/30">
                <div className="text-xs text-slategray-400 mb-1">点位编号</div>
                <div className="font-mono text-sm text-white">{selectedPoint.id}</div>
                <div className="text-xs text-slategray-400 mt-2 mb-1">地址</div>
                <div className="text-sm text-deepsea-100">{selectedPoint.address}</div>
              </div>

              <div className="p-4 border-b border-deepsea-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slategray-400 uppercase tracking-wider">
                    历次判断记录（不可删除）
                  </div>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amberwarm-500/20 hover:bg-amberwarm-500/30 text-amberwarm-300 text-xs font-medium transition-colors"
                  >
                    <Edit3 size={13} />
                    新增判断
                  </button>
                </div>

                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 bg-deepsea-700/50 rounded-xl p-4 border border-amberwarm-500/30"
                  >
                    <label className="block text-xs text-slategray-400 mb-1.5">
                      新判断内容
                    </label>
                    <textarea
                      value={newJudgment}
                      onChange={(e) => setNewJudgment(e.target.value)}
                      placeholder="请输入规划师判断..."
                      rows={3}
                      className="w-full bg-deepsea-800/60 border border-deepsea-500/30 rounded-xl p-3 text-sm text-white placeholder-slategray-500 focus:outline-none focus:border-amberwarm-500/50 resize-none font-serif"
                    />
                    <label className="block text-xs text-slategray-400 mb-1.5 mt-3">
                      修改原因
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="如：补充现场勘察数据、收到居民新反馈..."
                      className="w-full bg-deepsea-800/60 border border-deepsea-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder-slategray-500 focus:outline-none focus:border-amberwarm-500/50"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleSave}
                        disabled={!newJudgment.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amberwarm-400 to-amberwarm-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-shadow"
                      >
                        <Save size={14} />
                        保存判断（留痕）
                      </button>
                      <button
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 rounded-xl bg-deepsea-600/60 text-slategray-300 text-sm hover:bg-deepsea-500/60 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
                <div className="relative">
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-amberwarm-500 via-deepsea-400 to-deepsea-600" />

                  {selectedPoint.history.length === 0 && (
                    <div className="text-center py-10 text-slategray-500 text-sm">
                      暂无判断记录
                    </div>
                  )}

                  {selectedPoint.history
                    .slice()
                    .reverse()
                    .map((h, idx, arr) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative pl-10 pb-6"
                      >
                        <div
                          className={`absolute left-1.5 top-1.5 w-5 h-5 rounded-full border-2 ${
                            idx === 0
                              ? "bg-amberwarm-500 border-amberwarm-300 shadow-glow"
                              : "bg-deepsea-700 border-deepsea-400"
                          }`}
                        />

                        <div className="bg-deepsea-700/40 rounded-xl p-4 border border-deepsea-500/30 hover:border-deepsea-400/50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <User size={13} className="text-deepsea-300" />
                              <span className="text-sm text-white font-medium">
                                {h.operator}
                              </span>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amberwarm-500/20 text-amberwarm-300 text-[10px] font-medium">
                                  最新
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slategray-400">
                              <Clock size={12} />
                              {h.modifiedAt}
                            </div>
                          </div>

                          {idx !== arr.length - 1 && (
                            <div className="mb-3">
                              <div className="text-[10px] text-slategray-500 uppercase tracking-wider mb-1">
                                修改前
                              </div>
                              <div className="text-sm text-slategray-500 line-through font-serif">
                                {h.judgmentBefore}
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="text-[10px] text-slategray-400 uppercase tracking-wider mb-1">
                              {idx === 0 ? "当前判断" : idx === arr.length - 1 ? "初始判断" : "修改后"}
                            </div>
                            <div
                              className={`text-sm font-serif leading-relaxed ${
                                idx === 0 ? "text-amberwarm-200" : "text-white"
                              }`}
                            >
                              {h.judgmentAfter}
                            </div>
                          </div>

                          {h.changeReason && (
                            <div className="mt-3 pt-3 border-t border-deepsea-600/50">
                              <div className="flex items-start gap-1.5 text-xs text-slategray-400">
                                <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                <span>{h.changeReason}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>

              {selectedPoint.photos.length > 0 && (
                <div className="border-t border-deepsea-500/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera size={14} className="text-mint-400" />
                    <span className="text-xs text-slategray-300 font-medium">
                      现场补录照片（{selectedPoint.photos.length}张）
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                    {selectedPoint.photos.map((ph) => (
                      <div
                        key={ph.id}
                        className="flex-shrink-0 group relative"
                      >
                        <img
                          src={ph.photoUrl}
                          alt={ph.remark}
                          className="w-24 h-24 object-cover rounded-lg border border-deepsea-500/40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                          <div className="text-[10px] text-white">
                            <div className="truncate">{ph.remark}</div>
                            <div className="text-slategray-300">{ph.uploadedAt.slice(5, 16)}</div>
                          </div>
                        </div>
                        <ChevronRight
                          size={14}
                          className="absolute top-1/2 -translate-y-1/2 right-1 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
