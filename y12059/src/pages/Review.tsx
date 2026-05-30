import { useParams } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { levels } from "@/data/levels";
import { RISK_TYPE_LABELS } from "@/types";
import type { Settlement, SettlementItem, QuotaLockRecord, ChangeRecord } from "@/types";
import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Lock, AlertTriangle } from "lucide-react";

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-base-100 text-lg font-semibold border-l-4 border-amber pl-3">
      {title}
    </h2>
  );
}

function ScoreDisplay({ score }: { score: number }) {
  const color = score > 70 ? "text-safe" : score > 40 ? "text-amber" : "text-danger";
  return (
    <span className={`font-mono text-5xl font-bold ${color}`}>{score}</span>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-base-800 rounded-lg px-4 py-3 flex flex-col items-center gap-1">
      <span className="text-base-300 text-sm">{label}</span>
      <span className="font-mono text-xl text-base-100">{value}</span>
    </div>
  );
}

function SettlementSummary({ settlement }: { settlement: Settlement }) {
  return (
    <section className="flex flex-col items-center gap-4">
      <ScoreDisplay score={settlement.totalScore} />
      <div className="flex gap-4 w-full max-w-md">
        <StatCard label="扣分合计" value={settlement.deductions} />
        <StatCard label="额度锁定次数" value={settlement.quotaLockCount} />
        <StatCard label="风险提示命中数" value={settlement.riskAlertHitCount} />
      </div>
    </section>
  );
}

function QuotaLockTimeline() {
  const quotaLockRecords = useGameStore((s) => s.quotaLockRecords);

  if (quotaLockRecords.length === 0) {
    return <p className="text-base-400 text-sm py-4">本关卡无额度锁定</p>;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-base-600" />
      <div className="flex flex-col gap-4">
        {quotaLockRecords.map((record) => (
          <div key={record.id} className="relative">
            <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-amber border-2 border-base-900" />
            <div className="bg-base-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-amber" />
                <span className="font-mono text-amber font-semibold">{record.currencyPair}</span>
              </div>
              <p className="text-base-200 text-sm mb-1">{record.reason}</p>
              <p className="text-base-300 text-xs mb-1">
                涉及订单: {record.involvedOrders.join(", ")}
              </p>
              <p className="text-safe-light text-xs">解锁条件: {record.unlockCondition}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskAlertTable({ items }: { items: SettlementItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-base-300 border-b border-base-700">
            <th className="text-left py-2 px-3">订单ID</th>
            <th className="text-left py-2 px-3">风险类型</th>
            <th className="text-left py-2 px-3">判断结果</th>
            <th className="text-left py-2 px-3">修正建议</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={`${item.orderId}-${item.riskType}-${i}`} className="border-b border-base-800">
              <td className="py-2 px-3 font-mono text-base-200">{item.orderId}</td>
              <td className="py-2 px-3 text-base-200">{RISK_TYPE_LABELS[item.riskType]}</td>
              <td className="py-2 px-3">
                {item.userCorrect ? (
                  <span className="bg-safe/20 text-safe-light px-2 py-0.5 rounded text-xs font-medium">
                    ✓ 正确
                  </span>
                ) : (
                  <span className="bg-danger/20 text-danger-light px-2 py-0.5 rounded text-xs font-medium">
                    ✗ 漏判/误判
                  </span>
                )}
              </td>
              <td className="py-2 px-3 text-base-300 text-xs max-w-xs">{item.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CorrectionSuggestions({ items }: { items: SettlementItem[] }) {
  const missed = items.filter((item) => !item.userCorrect);
  if (missed.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {missed.map((item, i) => (
        <div key={`${item.orderId}-${item.riskType}`} className="bg-amber/10 border border-amber/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber text-base-900 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <span className="font-mono text-base-100 text-sm">{item.orderId}</span>
            <span className="text-amber text-xs">· {RISK_TYPE_LABELS[item.riskType]}</span>
          </div>
          <p className="text-base-200 text-sm pl-8">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function ChangeComparison() {
  const changeRecords = useGameStore((s) => s.changeRecords);
  const settlements = useGameStore((s) => s.settlements);

  if (changeRecords.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {changeRecords.map((record) => {
        const oldSettlement = settlements.find((s) => s.id === record.oldSettlementId);
        const newSettlement = settlements.find((s) => s.id === record.newSettlementId);
        return (
          <div key={record.id} className="bg-base-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber" />
              <span className="font-mono text-base-200 text-sm">订单 {record.orderId}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-base-700 rounded p-3">
                <p className="text-base-400 text-xs mb-1">修改前</p>
                <p className="text-sm">
                  <span className="text-base-300">{record.field}: </span>
                  <span className="text-danger-light font-mono">{record.oldValue}</span>
                </p>
                {oldSettlement && (
                  <p className="text-xs text-base-400 mt-1">
                    得分: <span className="font-mono text-base-200">{oldSettlement.totalScore}</span>
                  </p>
                )}
              </div>
              <div className="bg-base-700 rounded p-3 animate-flash-twice">
                <p className="text-base-400 text-xs mb-1">修改后</p>
                <p className="text-sm">
                  <span className="text-base-300">{record.field}: </span>
                  <span className="text-safe-light font-mono">{record.newValue}</span>
                </p>
                {newSettlement && (
                  <p className="text-xs text-base-400 mt-1">
                    得分: <span className="font-mono text-base-200">{newSettlement.totalScore}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function exportReport(
  levelName: string,
  settlement: Settlement,
  quotaLockRecords: QuotaLockRecord[],
  changeRecords: ChangeRecord[]
) {
  const date = new Date(settlement.createdAt).toLocaleString("zh-CN");
  let text = `外汇交易风控局 - 复盘报告\n关卡: ${levelName}\n日期: ${date}\n\n`;
  text += `=== 结算摘要 ===\n总分: ${settlement.totalScore}\n扣分: ${settlement.deductions}\n额度锁定次数: ${settlement.quotaLockCount}\n风险提示命中数: ${settlement.riskAlertHitCount}\n\n`;
  text += `=== 额度锁定记录 ===\n`;
  if (quotaLockRecords.length === 0) {
    text += `本关卡无额度锁定\n`;
  } else {
    quotaLockRecords.forEach((r, i) => {
      text += `${i + 1}. [${r.currencyPair}] ${r.reason}\n   涉及订单: ${r.involvedOrders.join(", ")}\n   解锁条件: ${r.unlockCondition}\n`;
    });
  }
  text += `\n=== 风险提示清单 ===\n`;
  settlement.items.forEach((item) => {
    const result = item.userCorrect ? "✓ 正确" : "✗ 漏判/误判";
    text += `${item.orderId} | ${RISK_TYPE_LABELS[item.riskType]} | ${result} | ${item.detail}\n`;
  });
  const missed = settlement.items.filter((item) => !item.userCorrect);
  if (missed.length > 0) {
    text += `\n=== 修正建议汇总 ===\n`;
    missed.forEach((item, i) => {
      text += `${i + 1}. [${item.orderId}] ${RISK_TYPE_LABELS[item.riskType]}: ${item.detail}\n`;
    });
  }
  if (changeRecords.length > 0) {
    text += `\n=== 变更对比 ===\n`;
    changeRecords.forEach((r) => {
      text += `订单 ${r.orderId} - ${r.field}: ${r.oldValue} → ${r.newValue}\n`;
    });
  }
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `复盘报告_${levelName}_${date.replace(/[/: ]/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Review() {
  const navigate = useNavigate();
  const { levelId: urlLevelId } = useParams<{ levelId: string }>();
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const quotaLockRecords = useGameStore((s) => s.quotaLockRecords);
  const changeRecords = useGameStore((s) => s.changeRecords);
  const getLevelState = useGameStore((s) => s.getLevelState);

  const levelId = urlLevelId ?? currentLevelId ?? "1";
  const levelState = getLevelState(levelId);
  const settlement = levelState.settlement;
  const level = levels.find((l) => l.id === levelId);
  const levelName = level?.name ?? "未知关卡";

  if (!settlement) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <p className="text-base-400">暂无结算数据</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-900 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-10">
        <section className="flex flex-col items-center gap-2">
          <p className="text-base-300 text-sm">复盘报告 · {levelName}</p>
          <SettlementSummary settlement={settlement} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeader title="额度锁定记录" />
          <QuotaLockTimeline />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeader title="风险提示清单" />
          <RiskAlertTable items={settlement.items} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeader title="修正建议汇总" />
          <CorrectionSuggestions items={settlement.items} />
        </section>

        {changeRecords.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHeader title="变更对比" />
            <ChangeComparison />
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-base-800 border-t border-base-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => exportReport(levelName, settlement, quotaLockRecords, changeRecords)}
            className="flex-1 flex items-center justify-center gap-2 bg-amber text-base-900 font-semibold py-2.5 rounded-lg hover:bg-amber-light transition-colors"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 bg-base-700 text-base-200 font-semibold py-2.5 rounded-lg hover:bg-base-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回大厅
          </button>
        </div>
      </div>
    </div>
  );
}
