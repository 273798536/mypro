import { useState } from "react";
import { useAppStore } from "@/store";
import type { Contract } from "@/types";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Wrench,
  Calculator,
  RotateCcw,
  ArrowRightLeft,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "生效中", color: "bg-green-100 text-green-700" },
  terminated_early: { label: "提前终止", color: "bg-red-100 text-red-700" },
  completed: { label: "已完成", color: "bg-gray-100 text-gray-600" },
};

const changeFieldLabels: Record<string, string> = {
  annualAmount: "年度金额",
  monthlyAmount: "月均金额",
  startDate: "起始日期",
  endDate: "截止日期",
  version: "版本",
  status: "状态",
  equipmentId: "关联设备",
};

export default function Contracts() {
  const {
    contracts,
    equipments,
    contractVersions,
    workOrders,
    accrualRecords,
    reversalRecords,
    crossYearSettlements,
    fillContractAmount,
    confirmCrossYear,
  } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);

  const getEquipName = (eid: string) => equipments.find((e) => e.id === eid)?.name ?? eid;

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const handleFill = (c: (typeof contracts)[0]) => {
    const annual = 100000;
    const months =
      (new Date(c.endDate).getFullYear() - new Date(c.startDate).getFullYear()) * 12 +
      (new Date(c.endDate).getMonth() - new Date(c.startDate).getMonth()) + 1;
    fillContractAmount(c.id, annual, Math.round(annual / Math.max(months, 1)));
  };

  const renderBadge = (value: unknown, isCross?: boolean) => {
    if (isCross) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">跨年</span>;
    if (value === null || value === undefined)
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">缺失</span>;
    return <span className="text-sm">{Number(value).toLocaleString()}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">合同管理</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="w-8" />
              <th className="px-4 py-3 text-left">合同编号</th>
              <th className="px-4 py-3 text-left">关联设备</th>
              <th className="px-4 py-3 text-left">起止日期</th>
              <th className="px-4 py-3 text-left">年度金额</th>
              <th className="px-4 py-3 text-left">月均金额</th>
              <th className="px-4 py-3 text-left">版本</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">是否跨年</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <>
                <tr
                  key={c.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggle(c.id)}
                >
                  <td className="px-2 py-3 text-gray-400">
                    {expandedId === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="px-4 py-3 font-medium">{c.code}</td>
                  <td className="px-4 py-3">{getEquipName(c.equipmentId)}</td>
                  <td className="px-4 py-3">{c.startDate} ~ {c.endDate}</td>
                  <td className="px-4 py-3">
                    {c.annualAmount === null ? (
                      <button onClick={(e) => { e.stopPropagation(); handleFill(c); }} className="hover:underline">
                        {renderBadge(c.annualAmount)}
                      </button>
                    ) : renderBadge(c.annualAmount)}
                  </td>
                  <td className="px-4 py-3">{renderBadge(c.monthlyAmount)}</td>
                  <td className="px-4 py-3">{c.version}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[c.status]?.color}`}>
                      {statusConfig[c.status]?.label ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.isCrossYear ? renderBadge(null, true) : "—"}</td>
                </tr>

                {expandedId === c.id && (
                  <tr key={`${c.id}-detail`} className="border-t bg-gray-50/50">
                    <td colSpan={9} className="px-6 py-4">
                      <ExpandedDetail
                        contract={c}
                        contractVersions={contractVersions.filter((v) => v.contractId === c.id)}
                        workOrders={workOrders.filter((w) => w.contractId === c.id)}
                        accrualRecords={accrualRecords.filter((a) => a.contractId === c.id)}
                        reversalRecords={reversalRecords.filter((r) => r.contractId === c.id)}
                        crossYearSettlements={crossYearSettlements.filter((s) => s.contractId === c.id)}
                        onConfirmCrossYear={confirmCrossYear}
                        setCompareVersionId={setCompareVersionId}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {compareVersionId && <VersionCompareModal versionId={compareVersionId} onClose={() => setCompareVersionId(null)} />}
    </div>
  );
}

function ExpandedDetail({
  contract,
  contractVersions: versions,
  workOrders: wos,
  accrualRecords: accs,
  reversalRecords: revs,
  crossYearSettlements: settlements,
  onConfirmCrossYear,
  setCompareVersionId,
}: {
  contract: Contract;
  contractVersions: ReturnType<typeof useAppStore.getState>["contractVersions"];
  workOrders: ReturnType<typeof useAppStore.getState>["workOrders"];
  accrualRecords: ReturnType<typeof useAppStore.getState>["accrualRecords"];
  reversalRecords: ReturnType<typeof useAppStore.getState>["reversalRecords"];
  crossYearSettlements: ReturnType<typeof useAppStore.getState>["crossYearSettlements"];
  onConfirmCrossYear: (id: string) => void;
  setCompareVersionId: (id: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      {versions.length > 0 && (
        <Section icon={<FileText size={16} />} title="版本变更历史">
          {versions.map((v) => (
            <div key={v.id} className="border rounded p-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-medium">版本 {v.version} — {v.effectiveDate}</span>
                <button onClick={() => setCompareVersionId(v.id)} className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                  <ArrowRightLeft size={12} /> 对比变更
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">原因: {v.reason}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(v.changes).map(([field]) => (
                  <span key={field} className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                    {changeFieldLabels[field] ?? field}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section icon={<Wrench size={16} />} title={`关联工单 (${wos.length})`}>
        {wos.length === 0 ? <p className="text-gray-400 text-sm">暂无工单</p> : (
          <ul className="space-y-1 text-sm">
            {wos.map((w) => <li key={w.id} className="flex gap-4"><span>{w.code}</span><span className="text-gray-500">{w.orderDate}</span><span>{w.amount.toLocaleString()} 元</span></li>)}
          </ul>
        )}
      </Section>

      <Section icon={<Calculator size={16} />} title={`预提记录 (${accs.length})`}>
        {accs.length === 0 ? <p className="text-gray-400 text-sm">暂无预提</p> : (
          <ul className="space-y-1 text-sm">
            {accs.map((a) => <li key={a.id} className="flex gap-4"><span>{a.period}</span><span>{a.amount.toLocaleString()} 元</span><span className="text-gray-500">{a.calculationBasis}</span></li>)}
          </ul>
        )}
      </Section>

      <Section icon={<RotateCcw size={16} />} title={`冲回记录 (${revs.length})`}>
        {revs.length === 0 ? <p className="text-gray-400 text-sm">暂无冲回</p> : (
          <ul className="space-y-1 text-sm">
            {revs.map((r) => <li key={r.id} className="flex gap-4"><span>{r.reversalDate}</span><span className="text-red-600">-{r.amount.toLocaleString()} 元</span><span className="text-gray-500">{r.reason}</span></li>)}
          </ul>
        )}
      </Section>

      {contract.isCrossYear && settlements.map((s) => (
        <Section key={s.id} icon={<AlertTriangle size={16} />} title="跨年结转">
          <div className="border rounded p-3 bg-white space-y-2 text-sm">
            <div className="flex gap-6">
              <span>本期金额: <strong>{s.currentYearAmount.toLocaleString()} 元</strong></span>
              <span>下年金额: <strong>{s.nextYearAmount.toLocaleString()} 元</strong></span>
            </div>
            <div>期间: {s.fromPeriod} → {s.toPeriod}</div>
            <div>状态: <span className={s.status === "pending" ? "text-amber-600 font-medium" : "text-green-600"}>{s.status === "pending" ? "待确认" : s.status === "confirmed" ? "已确认" : "已审批"}</span></div>
            {s.status === "pending" && (
              <button onClick={() => onConfirmCrossYear(s.id)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                确认结转
              </button>
            )}
            {s.status === "confirmed" && s.approvalInfo && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle size={14} className="text-green-500" />
                审批人: {s.approvalInfo.approver} | 日期: {s.approvalInfo.date} | {s.approvalInfo.note}
              </div>
            )}
          </div>
        </Section>
      ))}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">{icon}{title}</div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function VersionCompareModal({ versionId, onClose }: { versionId: string; onClose: () => void }) {
  const { contractVersions } = useAppStore();
  const version = contractVersions.find((v) => v.id === versionId);
  if (!version) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">版本对比 — v{version.version}</h3>
          <button onClick={onClose}><XCircle size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">生效日期: {version.effectiveDate} | 原因: {version.reason}</p>
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">字段</th>
                <th className="px-3 py-2 text-left">旧值</th>
                <th className="px-3 py-2 text-left">新值</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(version.changes).map(([field, { old, new: newVal }]) => (
                <tr key={field} className="border-t">
                  <td className="px-3 py-2 font-medium bg-amber-50">{changeFieldLabels[field] ?? field}</td>
                  <td className="px-3 py-2 text-gray-500">{String(old ?? "—")}</td>
                  <td className="px-3 py-2 text-blue-700 font-medium">{String(newVal ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
