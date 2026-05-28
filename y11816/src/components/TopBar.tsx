import { Bell, User, DatabaseZap, RotateCcw } from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { useState } from "react";

export default function TopBar() {
  const { loadMockData, clearAll, importBatches, getCurrentProcessBatch } = useSettlementStore();
  const [showLoadConfirm, setShowLoadConfirm] = useState(false);
  const currentProcessBatch = getCurrentProcessBatch();

  const pendingAnomalies = useSettlementStore((state) =>
    state.anomalies.filter((a) => a.status === "pending").length
  );

  const handleLoadMock = () => {
    if (importBatches.length > 0) {
      setShowLoadConfirm(true);
    } else {
      loadMockData();
    }
  };

  return (
    <>
      <header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-ink-200 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          {currentProcessBatch && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-500">当前批次</span>
              <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded text-sm font-medium">
                {currentProcessBatch.name}
              </span>
              <span className="text-xs text-ink-400 font-mono">
                {currentProcessBatch.id}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadMock}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-600 hover:text-ink-800 hover:bg-ink-100 rounded transition-colors"
            title="加载演示数据"
          >
            <DatabaseZap size={16} />
            <span>加载演示数据</span>
          </button>

          <button
            onClick={clearAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-ink-600 hover:text-accent-danger hover:bg-red-50 rounded transition-colors"
            title="清空所有数据"
          >
            <RotateCcw size={16} />
            <span>清空</span>
          </button>

          <div className="h-6 w-px bg-ink-200" />

          <button className="relative p-2 text-ink-500 hover:text-ink-700 hover:bg-ink-100 rounded transition-colors">
            <Bell size={18} />
            {pendingAnomalies > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-danger text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {pendingAnomalies > 9 ? "9+" : pendingAnomalies}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center">
              <User size={16} className="text-ink-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-ink-700 leading-tight">财务操作员</p>
              <p className="text-xs text-ink-400">finance@cinema.com</p>
            </div>
          </div>
        </div>
      </header>

      {showLoadConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="font-display text-lg font-semibold mb-3">确认操作</h3>
            <p className="text-sm text-ink-600 mb-4">
              加载演示数据将覆盖当前所有数据，此操作不可撤销。是否继续？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLoadConfirm(false)}
                className="btn-secondary text-sm px-4 py-1.5"
              >
                取消
              </button>
              <button
                onClick={() => {
                  clearAll();
                  loadMockData();
                  setShowLoadConfirm(false);
                }}
                className="btn-primary text-sm px-4 py-1.5"
              >
                确认加载
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
