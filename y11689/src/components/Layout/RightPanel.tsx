import { X, FileText, History, User, Calendar, Tag, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { useState } from 'react';
import { useViewStore } from '../../store/useViewStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useRiskStore } from '../../store/useRiskStore';
import { BurnDataPoint, Expense, RevenueForecast, Owner } from '../../types';

const formatCurrency = (value: number): string => {
  return `¥${value.toLocaleString()}`;
};

interface DataPointDetailProps {
  point: BurnDataPoint;
}

const DataPointDetail = ({ point }: DataPointDetailProps) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">{point.date}</p>
            <p className="text-xs text-slate-400">时间切片数据</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs text-blue-400 mb-1">预算</p>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(point.cumulativeBudget)}
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <p className="text-xs text-orange-400 mb-1">已支出</p>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(point.cumulativeSpent)}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-xs text-green-400 mb-1">预计收入</p>
              <p className="text-sm font-semibold text-white">
                {formatCurrency(point.cumulativeRevenue)}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">本周数据</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500">预算：</span>
                <span className="text-slate-300">{formatCurrency(point.budget)}</span>
              </div>
              <div>
                <span className="text-slate-500">支出：</span>
                <span className="text-slate-300">{formatCurrency(point.actualSpent)}</span>
              </div>
              <div>
                <span className="text-slate-500">收入：</span>
                <span className="text-slate-300">{formatCurrency(point.forecastRevenue)}</span>
              </div>
            </div>
          </div>

          {point.risks.length > 0 && (
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-xs text-red-400 mb-2">
                关联风险 ({point.risks.length})
              </p>
              {point.risks.map((risk) => (
                <div
                  key={risk.id}
                  className="p-2 bg-red-500/10 rounded-lg mb-2 last:mb-0"
                >
                  <p className="text-xs text-slate-300">{risk.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ExpenseDetailProps {
  expense: Expense;
  owners: Owner[];
}

const ExpenseDetail = ({ expense, owners }: ExpenseDetailProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const owner = owners.find((o) => o.id === expense.owner);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{expense.description}</p>
              <p className="text-xs text-slate-400">{expense.category}</p>
            </div>
          </div>
          <p className="text-lg font-bold text-orange-400">
            {formatCurrency(expense.amount)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">日期：</span>
            <span className="text-slate-300">{expense.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">来源：</span>
            <span className="text-slate-300">{expense.source}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">负责人：</span>
            <span className="text-slate-300">{owner?.name || '未知'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">ID：</span>
            <span className="text-slate-300 font-mono">{expense.id}</span>
          </div>
        </div>

        {expense.isDuplicate && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">
              ⚠️ 此支出已被标记为疑似重复
            </p>
          </div>
        )}

        {expense.revisionHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="mt-3 w-full flex items-center justify-between py-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              <span>修正历史 ({expense.revisionHistory.length})</span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {showHistory && expense.revisionHistory.length > 0 && (
          <div className="mt-2 space-y-2">
            {expense.revisionHistory.map((revision, index) => (
              <div
                key={revision.id}
                className="p-2 bg-slate-700/30 rounded-lg text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">
                    {new Date(revision.timestamp).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-blue-400">{revision.reason}</span>
                </div>
                <p className="text-slate-300">
                  {revision.field}: {revision.oldValue} → {revision.newValue}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface RevenueDetailProps {
  revenue: RevenueForecast;
  owners: Owner[];
}

const RevenueDetail = ({ revenue, owners }: RevenueDetailProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const owner = owners.find((o) => o.id === revenue.owner);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{revenue.description}</p>
              <p className="text-xs text-slate-400">{revenue.source}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-green-400">
              {formatCurrency(revenue.forecastAmount)}
            </p>
            {revenue.actualAmount && (
              <p className="text-xs text-slate-400">
                实际: {formatCurrency(revenue.actualAmount)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">预计：</span>
            <span className="text-slate-300">{revenue.date}</span>
          </div>
          {revenue.expectedDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-orange-400">修正：</span>
              <span className="text-orange-300">{revenue.expectedDate}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">负责人：</span>
            <span className="text-slate-300">{owner?.name || '未知'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">ID：</span>
            <span className="text-slate-300 font-mono">{revenue.id}</span>
          </div>
        </div>

        {revenue.isDelayed && (
          <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-400">
              ⚠️ 此收入已延期，预计新到账日：{revenue.expectedDate || '未知'}
            </p>
          </div>
        )}

        {revenue.revisionHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="mt-3 w-full flex items-center justify-between py-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              <span>修正历史 ({revenue.revisionHistory.length})</span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {showHistory && revenue.revisionHistory.length > 0 && (
          <div className="mt-2 space-y-2">
            {revenue.revisionHistory.map((revision) => (
              <div
                key={revision.id}
                className="p-2 bg-slate-700/30 rounded-lg text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400">
                    {new Date(revision.timestamp).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-blue-400">{revision.reason}</span>
                </div>
                <p className="text-slate-300">
                  {revision.field}: {revision.oldValue} → {revision.newValue}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const RightPanel = () => {
  const selectedDataPoint = useViewStore((state) => state.selectedDataPoint);
  const selectedExpenseId = useViewStore((state) => state.selectedExpenseId);
  const selectedRevenueId = useViewStore((state) => state.selectedRevenueId);
  const setSelectedDataPoint = useViewStore((state) => state.setSelectedDataPoint);
  const setSelectedExpenseId = useViewStore((state) => state.setSelectedExpenseId);
  const setSelectedRevenueId = useViewStore((state) => state.setSelectedRevenueId);
  const rightPanelOpen = useViewStore((state) => state.rightPanelOpen);
  const toggleRightPanel = useViewStore((state) => state.toggleRightPanel);

  const expenses = useProjectStore((state) => state.expenses);
  const revenues = useProjectStore((state) => state.revenues);
  const owners = useProjectStore((state) => state.owners);

  const selectedRiskId = useRiskStore((state) => state.selectedRiskId);
  const risks = useRiskStore((state) => state.risks);
  const selectRisk = useRiskStore((state) => state.selectRisk);

  const selectedRisk = risks.find((r) => r.id === selectedRiskId);
  const selectedExpense = expenses.find((e) => e.id === selectedExpenseId);
  const selectedRevenue = revenues.find((r) => r.id === selectedRevenueId);

  if (!rightPanelOpen) {
    return (
      <button
        onClick={toggleRightPanel}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-l-xl hover:bg-slate-700 transition-colors"
      >
        <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
      </button>
    );
  }

  return (
    <aside className="w-80 bg-slate-900/60 backdrop-blur-xl border-l border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">数据明细</h2>
        <button
          onClick={toggleRightPanel}
          className="p-1 hover:bg-slate-800 rounded"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedDataPoint && (
          <div>
            <button
              onClick={() => setSelectedDataPoint(null)}
              className="text-xs text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-1"
            >
              <ChevronDown className="w-3 h-3 -rotate-90" />
              清除选择
            </button>
            <DataPointDetail point={selectedDataPoint} />
          </div>
        )}

        {selectedExpense && (
          <div>
            <button
              onClick={() => setSelectedExpenseId(null)}
              className="text-xs text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-1"
            >
              <ChevronDown className="w-3 h-3 -rotate-90" />
              清除选择
            </button>
            <ExpenseDetail expense={selectedExpense} owners={owners} />
          </div>
        )}

        {selectedRevenue && (
          <div>
            <button
              onClick={() => setSelectedRevenueId(null)}
              className="text-xs text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-1"
            >
              <ChevronDown className="w-3 h-3 -rotate-90" />
              清除选择
            </button>
            <RevenueDetail revenue={selectedRevenue} owners={owners} />
          </div>
        )}

        {selectedRisk && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <button
              onClick={() => selectRisk(null)}
              className="text-xs text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-1"
            >
              <ChevronDown className="w-3 h-3 -rotate-90" />
              清除选择
            </button>
            <h3 className="text-sm font-medium text-red-400 mb-2">选中风险</h3>
            <p className="text-sm text-slate-300">{selectedRisk.description}</p>
            <p className="text-xs text-slate-500 mt-2">
              检测时间：{new Date(selectedRisk.detectedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        )}

        {!selectedDataPoint && !selectedExpense && !selectedRevenue && !selectedRisk && (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">点击3D曲面或风险项查看详情</p>
          </div>
        )}
      </div>
    </aside>
  );
};
