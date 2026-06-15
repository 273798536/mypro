import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Filter, Search, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { ComplaintSource, ComplaintStatus, RESULT_WORDS, STATUS_COLORS } from "@/types";

const ALL_SOURCES: ComplaintSource[] = ["12345热线", "社区信箱", "网格员上报", "媒体曝光", "其他"];
const ALL_STATUSES: ComplaintStatus[] = ["pending", "processing", "duplicate", "closed"];

export function FilterPanel() {
  const isOpen = useAppStore((s) => s.isFilterPanelOpen);
  const toggleFilterPanel = useAppStore((s) => s.toggleFilterPanel);
  const filters = useAppStore((s) => s.filters);
  const updateFilters = useAppStore((s) => s.updateFilters);
  const applyFilters = useAppStore((s) => s.applyFilters);
  const filteredCount = useAppStore((s) => s.filteredPoints.length);
  const totalCount = useAppStore((s) => s.points.length);

  const toggleSource = (src: ComplaintSource) => {
    const next = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src];
    updateFilters({ sources: next });
    setTimeout(applyFilters, 0);
  };

  const toggleStatus = (st: ComplaintStatus) => {
    const next = filters.statuses.includes(st)
      ? filters.statuses.filter((s) => s !== st)
      : [...filters.statuses, st];
    updateFilters({ statuses: next });
    setTimeout(applyFilters, 0);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 bottom-0 w-80 z-20"
          >
            <div className="glass-panel-strong h-full flex flex-col rounded-r-2xl overflow-hidden">
              <div className="p-5 border-b border-deepsea-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-amberwarm-400" />
                    <h2 className="font-serif text-lg text-white">条件筛选</h2>
                  </div>
                  <span className="text-xs text-slategray-400 font-mono">
                    {filteredCount}/{totalCount}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
                <div>
                  <label className="block text-xs text-slategray-400 uppercase tracking-wider mb-2">
                    关键词搜索
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slategray-500"
                    />
                    <input
                      type="text"
                      value={filters.searchQuery}
                      onChange={(e) => {
                        updateFilters({ searchQuery: e.target.value });
                        setTimeout(applyFilters, 0);
                      }}
                      placeholder="搜索地址、编号、投诉内容..."
                      className="w-full bg-deepsea-800/60 border border-deepsea-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slategray-500 focus:outline-none focus:border-amberwarm-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slategray-400 uppercase tracking-wider mb-2">
                    <ShieldCheck size={14} className="text-amberwarm-400" />
                    来源 · 保底字段
                  </label>
                  <div className="grid grid-cols-2 gap-2 border-2 border-amberwarm-500/30 rounded-xl p-2 bg-amberwarm-500/5">
                    {ALL_SOURCES.map((src) => {
                      const active = filters.sources.includes(src);
                      return (
                        <button
                          key={src}
                          onClick={() => toggleSource(src)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            active
                              ? "bg-amberwarm-500 text-white shadow-glow"
                              : "bg-deepsea-700/50 text-slategray-300 hover:bg-deepsea-600/60"
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs text-slategray-400 uppercase tracking-wider mb-2">
                    <ShieldCheck size={14} className="text-amberwarm-400" />
                    处理状态 · 保底字段
                  </label>
                  <div className="space-y-2 border-2 border-amberwarm-500/30 rounded-xl p-2 bg-amberwarm-500/5">
                    {ALL_STATUSES.map((st) => {
                      const active = filters.statuses.includes(st);
                      return (
                        <button
                          key={st}
                          onClick={() => toggleStatus(st)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            active ? "bg-deepsea-500/60" : "bg-deepsea-700/30 hover:bg-deepsea-700/50"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: STATUS_COLORS[st],
                              boxShadow: active ? `0 0 8px ${STATUS_COLORS[st]}` : "none",
                            }}
                          />
                          <span className="text-white text-left">{RESULT_WORDS[st]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slategray-400 uppercase tracking-wider mb-2">
                    特殊标记
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        updateFilters({ showConflictOnly: !filters.showConflictOnly });
                        setTimeout(applyFilters, 0);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        filters.showConflictOnly
                          ? "bg-amberwarm-500/20 border border-amberwarm-500/50 text-amberwarm-200"
                          : "bg-deepsea-700/40 border border-deepsea-500/20 text-slategray-300 hover:bg-deepsea-700/60"
                      }`}
                    >
                      <AlertTriangle size={16} />
                      <span>仅显示街口冲突点位</span>
                      {filters.showConflictOnly && (
                        <span className="ml-auto text-xs bg-amberwarm-500 text-white px-2 py-0.5 rounded-full">
                          已启用
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-deepsea-500/30">
                <button
                  onClick={() => {
                    updateFilters({
                      sources: [],
                      statuses: [],
                      showConflictOnly: false,
                      searchQuery: "",
                    });
                    setTimeout(applyFilters, 0);
                  }}
                  className="w-full py-2.5 rounded-xl bg-deepsea-600/60 hover:bg-deepsea-500/60 text-slategray-200 text-sm font-medium transition-colors"
                >
                  重置筛选条件
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleFilterPanel}
        className={`absolute top-1/2 -translate-y-1/2 z-20 p-2 glass-panel rounded-r-xl hover:bg-deepsea-500/60 text-slategray-300 hover:text-white transition-all ${
          isOpen ? "left-80" : "left-0"
        }`}
      >
        {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </>
  );
}
