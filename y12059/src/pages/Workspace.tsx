import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { RISK_TYPE_LABELS } from "@/types";
import type { RiskType, Order } from "@/types";
import { generateCorrectionSuggestions } from "@/utils/settlement";
import { Lock, Pencil, X, ArrowLeft, Send } from "lucide-react";

const RISK_COLORS: Record<RiskType, string> = {
  quota_overrun: "border-amber text-amber",
  duplicate_order: "border-danger text-danger",
  missing_stoploss: "border-orange-400 text-orange-400",
  missing_field: "border-info text-info",
};

function QuotaRing({ used, total, isLocked }: { used: number; total: number; isLocked: boolean }) {
  const pct = Math.min((used / total) * 100, 100);
  const ratio = used / total;
  const color = ratio > 1 ? "#ef4444" : ratio > 0.8 ? "#f59e0b" : "#10b981";
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="88" height="88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#2a2d35" strokeWidth="6" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={c} strokeDashoffset={offset}
            strokeLinecap="round"
            className="quota-ring"
          />
        </svg>
        {isLocked && (
          <Lock size={14} className="text-danger animate-lock-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
      </div>
      <div className="font-mono text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-base-100 text-sm">{used.toLocaleString()}</span>
          <span className="text-base-400 text-xs">/</span>
          <span className="text-base-300 text-xs">{total.toLocaleString()}</span>
        </div>
        {isLocked && <span className="text-danger text-xs font-bold">已锁定</span>}
      </div>
    </div>
  );
}

function RiskCard({
  order, markedRisks, onToggle,
}: {
  order: Order;
  markedRisks: RiskType[];
  onToggle: (rt: RiskType) => void;
}) {
  const riskTypes: RiskType[] = ["quota_overrun", "duplicate_order", "missing_stoploss", "missing_field"];

  return (
    <div className="bg-base-800 rounded-lg p-3 animate-fade-in-up">
      <div className="text-xs text-base-300 mb-2 font-mono">{order.id}</div>
      <div className="flex flex-wrap gap-1.5">
        {riskTypes.map((rt) => {
          const active = markedRisks.includes(rt);
          return (
            <button
              key={rt}
              onClick={() => onToggle(rt)}
              className={`px-2 py-1 text-xs rounded border transition-all duration-200 ${
                active
                  ? `${RISK_COLORS[rt]} bg-base-700 scale-105`
                  : "border-base-600 text-base-400 hover:border-base-500"
              }`}
            >
              {RISK_TYPE_LABELS[rt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrderEditor({
  order, onClose, onSave,
}: {
  order: Order;
  onClose: () => void;
  onSave: (orderId: string, field: string, value: string | number | null) => void;
}) {
  const [amount, setAmount] = useState(order.amount?.toString() ?? "");
  const [price, setPrice] = useState(order.price.toString());
  const [stopLoss, setStopLoss] = useState(order.stopLoss?.toString() ?? "");
  const [remark, setRemark] = useState(order.remark);

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-base-800 border-l border-base-600 z-50 flex flex-col shadow-2xl animate-fade-in-up">
      <div className="flex items-center justify-between p-4 border-b border-base-700">
        <h3 className="text-sm font-bold text-base-100">编辑订单 {order.id}</h3>
        <button onClick={onClose} className="text-base-400 hover:text-base-100"><X size={18} /></button>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <label className="block">
          <span className="text-xs text-base-300">金额</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full bg-base-700 border border-base-600 rounded px-3 py-2 text-sm font-mono text-base-100 focus:border-info outline-none" />
        </label>
        <label className="block">
          <span className="text-xs text-base-300">价格</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full bg-base-700 border border-base-600 rounded px-3 py-2 text-sm font-mono text-base-100 focus:border-info outline-none" />
        </label>
        <label className="block">
          <span className="text-xs text-base-300">止损</span>
          <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            placeholder="未设置"
            className="mt-1 w-full bg-base-700 border border-base-600 rounded px-3 py-2 text-sm font-mono text-base-100 focus:border-info outline-none" />
        </label>
        <label className="block">
          <span className="text-xs text-base-300">备注</span>
          <input value={remark} onChange={(e) => setRemark(e.target.value)}
            className="mt-1 w-full bg-base-700 border border-base-600 rounded px-3 py-2 text-sm text-base-100 focus:border-info outline-none" />
        </label>
      </div>
      <div className="p-4 border-t border-base-700 space-y-2">
        <button onClick={() => {
          const changes: [string, string | number | null][] = [];
          const newAmount = amount === "" ? null : Number(amount);
          if (String(order.amount ?? "") !== String(newAmount ?? "")) changes.push(["amount", newAmount]);
          const newPrice = Number(price);
          if (order.price !== newPrice) changes.push(["price", newPrice]);
          const newStopLoss = stopLoss === "" ? null : Number(stopLoss);
          if (String(order.stopLoss ?? "") !== String(newStopLoss ?? "")) changes.push(["stopLoss", newStopLoss]);
          if (order.remark !== remark) changes.push(["remark", remark]);
          changes.forEach(([field, value]) => onSave(order.id, field, value));
          onClose();
        }} className="w-full py-2 bg-safe text-white rounded text-sm font-bold hover:bg-safe-dark transition-colors">
          保存修改
        </button>
        <button onClick={onClose} className="w-full py-2 bg-base-700 text-base-300 rounded text-sm hover:bg-base-600 transition-colors">
          取消
        </button>
      </div>
    </div>
  );
}

export default function Workspace() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const {
    currentLevelId, orders, quotas, quotasLoaded,
    userMarkedRisks, orderEditorOpen, editingOrderId,
    startLevel, markRisk, unmarkRisk, submitJudgments,
    modifyOrder, setOrderEditorOpen, setEditingOrderId,
  } = useGameStore();
  const getLevelState = useGameStore((s) => s.getLevelState);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isCompleted = currentLevelId ? getLevelState(currentLevelId).status === "completed" : false;

  useEffect(() => {
    if (!currentLevelId && levelId) startLevel(levelId);
  }, [currentLevelId, levelId, startLevel]);

  const computedQuotas = useMemo(() => {
    const simulated: Record<string, number> = {};
    quotas.forEach((q) => { simulated[q.currencyPair] = q.usedAmount; });
    for (const o of orders) {
      if (o.amount !== null && simulated[o.currencyPair] !== undefined) {
        simulated[o.currencyPair] += o.amount;
      }
    }
    return quotas.map((q) => {
      const newUsed = simulated[q.currencyPair];
      const isLocked = newUsed > q.totalLimit;
      return { ...q, usedAmount: newUsed, isLocked };
    });
  }, [orders, quotas]);

  const editingOrder = useMemo(
    () => orders.find((o) => o.id === editingOrderId) ?? null,
    [orders, editingOrderId]
  );

  const suggestions = useMemo(() => {
    const result: { orderId: string; riskType: RiskType; suggestion: string }[] = [];
    for (const [oid, risks] of Object.entries(userMarkedRisks)) {
      if (risks.length === 0) continue;
      const order = orders.find((o) => o.id === oid);
      if (!order) continue;
      for (const s of generateCorrectionSuggestions(order, orders, quotas)) {
        result.push({ orderId: oid, ...s });
      }
    }
    return result;
  }, [userMarkedRisks, orders, quotas]);

  const handleToggleRisk = (orderId: string, rt: RiskType) => {
    const current = userMarkedRisks[orderId] ?? [];
    current.includes(rt) ? unmarkRisk(orderId, rt) : markRisk(orderId, rt);
  };

  const handleSubmit = () => {
    submitJudgments();
    navigate(`/review/${currentLevelId}`);
  };

  const openEditor = (orderId: string) => {
    setEditingOrderId(orderId);
    setOrderEditorOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-base-900 text-base-200">
      <header className="flex items-center justify-between px-6 py-3 border-b border-base-700 shrink-0">
        <h1 className="text-lg font-bold">风控工作台</h1>
        <span className="text-xs text-base-400 font-mono">关卡 {levelId}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[60%] overflow-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-base-700 text-base-300 text-xs">
                {["订单ID", "客户名", "货币对", "方向", "金额", "价格", "止损", "备注"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  onDoubleClick={() => openEditor(o.id)}
                  className={`border-b border-base-700 cursor-pointer transition-colors ${
                    selectedId === o.id ? "bg-base-600" : "bg-base-800 hover:bg-base-700"
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-base-100">
                    {o.id}
                    {o.duplicateOf && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-danger/20 text-danger rounded font-bold">重复</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{o.clientName}</td>
                  <td className="px-3 py-2 font-mono">{o.currencyPair}</td>
                  <td className="px-3 py-2">
                    <span className={o.direction === "买入" ? "text-safe" : "text-danger"}>{o.direction}</span>
                  </td>
                  <td className={`px-3 py-2 font-mono ${o.amount === null ? "missing-field" : ""}`}>
                    {o.amount !== null ? o.amount.toLocaleString() : <span className="text-danger text-xs">缺失</span>}
                  </td>
                  <td className="px-3 py-2 font-mono">{o.price}</td>
                  <td className={`px-3 py-2 font-mono ${o.stopLoss === null ? "missing-field" : ""}`}>
                    {o.stopLoss !== null ? o.stopLoss : <span className="text-danger text-xs">未设</span>}
                  </td>
                  <td className="px-3 py-2">
                    {o.remark && (
                      <span className="inline-block px-1.5 py-0.5 text-[10px] bg-amber/15 text-amber rounded">{o.remark}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditor(o.id); }}
                      className="text-base-400 hover:text-base-100 transition-colors">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-[40%] border-l border-base-700 overflow-y-auto p-4 space-y-5">
          <section>
            <h2 className="text-xs text-base-400 font-bold mb-3 uppercase tracking-wider">额度状态</h2>
            {!quotasLoaded ? (
              <div className="flex gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-[88px] h-[88px] bg-base-700 rounded-full animate-pulse-slow" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-5">
                {computedQuotas.map((q) => (
                  <div key={q.currencyPair} className="relative flex flex-col items-center">
                    <QuotaRing used={q.usedAmount} total={q.totalLimit} isLocked={q.isLocked} />
                    <span className="text-[10px] text-base-400 mt-1 font-mono">{q.currencyPair}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs text-base-400 font-bold mb-3 uppercase tracking-wider">风险识别</h2>
            <div className="space-y-2">
              {orders.map((o) => (
                <RiskCard
                  key={o.id}
                  order={o}
                  markedRisks={userMarkedRisks[o.id] ?? []}
                  onToggle={(rt) => handleToggleRisk(o.id, rt)}
                />
              ))}
            </div>
          </section>

          {suggestions.length > 0 && (
            <section>
              <h2 className="text-xs text-base-400 font-bold mb-3 uppercase tracking-wider">修正建议</h2>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="bg-amber/10 border border-amber/20 rounded-lg p-3 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber">{i + 1}.</span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber/20 text-amber rounded">{RISK_TYPE_LABELS[s.riskType]}</span>
                      <span className="text-[10px] text-base-400 font-mono">{s.orderId}</span>
                    </div>
                    <p className="text-xs text-base-200 leading-relaxed">{s.suggestion}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between px-6 py-3 border-t border-base-700 shrink-0">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 text-sm text-base-300 hover:text-base-100 bg-base-800 rounded transition-colors">
          <ArrowLeft size={16} /> 返回大厅
        </button>
        <div className="flex items-center gap-3">
          {isCompleted && (
            <button onClick={() => navigate(`/review/${currentLevelId}`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-base-900 bg-amber rounded hover:bg-amber-light transition-colors">
              查看复盘
            </button>
          )}
          {!isCompleted && (
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-safe rounded hover:bg-safe-dark transition-colors">
              <Send size={16} /> 提交判断
            </button>
          )}
        </div>
      </footer>

      {orderEditorOpen && editingOrder && (
        <OrderEditor
          order={editingOrder}
          onClose={() => { setOrderEditorOpen(false); setEditingOrderId(null); }}
          onSave={modifyOrder}
        />
      )}
    </div>
  );
}
