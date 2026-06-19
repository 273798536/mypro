from __future__ import annotations

from typing import Dict, List, Set, Tuple

from .models import (
    ReconResult,
    ReconSession,
    ReconStatus,
    RollbackRecord,
    Transaction,
    WorkOrder,
)


AMOUNT_TOLERANCE = 0.01
AMOUNT_ANOMALY_RATIO = 0.5


class ReconEngine:
    def __init__(self) -> None:
        self._seen_migration_batches: Dict[str, List[str]] = {}

    def run(
        self,
        transactions: List[Transaction],
        work_orders: Dict[str, WorkOrder],
        session: ReconSession,
    ) -> None:
        self._seen_migration_batches = {}
        for txn in transactions:
            result = self._reconcile_one(txn, work_orders)
            session.results.append(result)
            if result.status in (ReconStatus.ANOMALY, ReconStatus.BLOCKED_DUPLICATE_MIGRATION):
                rb = RollbackRecord(
                    session_id=session.session_id,
                    transaction_id=txn.transaction_id,
                    work_order_id=txn.work_order_id,
                    reason=result.reason,
                    action="blocked" if result.status == ReconStatus.BLOCKED_DUPLICATE_MIGRATION else "flagged",
                )
                session.rollbacks.append(rb)

    def _reconcile_one(self, txn: Transaction, work_orders: Dict[str, WorkOrder]) -> ReconResult:
        if not txn.transaction_id or not txn.work_order_id:
            return ReconResult(
                transaction=txn,
                work_order=None,
                status=ReconStatus.ANOMALY,
                reason="关键字段缺失：交易号或工单号为空",
                detail="该记录缺少 transaction_id 或 work_order_id，无法进行对账。"
                "常见原因：源系统导出时字段丢失、手动编辑时误删列。需回源系统核实原始数据。",
            )

        dup_check = self._check_duplicate_migration(txn)
        if dup_check:
            return dup_check

        wo = work_orders.get(txn.work_order_id)
        if wo is None:
            return ReconResult(
                transaction=txn,
                work_order=None,
                status=ReconStatus.PENDING,
                reason=f"工单 {txn.work_order_id} 在工单表中未找到",
                detail=(
                    f"流水 {txn.transaction_id} 引用的工单号 {txn.work_order_id} "
                    "在当前工单数据集中不存在。可能原因：工单尚未同步至对账系统、"
                    "工单号拼写错误、或该工单属于其他业务线。需人工确认是否补录工单。"
                ),
            )

        anomaly_check = self._check_anomaly(txn, wo)
        if anomaly_check:
            return anomaly_check

        pending_check = self._check_pending(txn, wo)
        if pending_check:
            return pending_check

        return ReconResult(
            transaction=txn,
            work_order=wo,
            status=ReconStatus.MATCHED,
            reason="金额一致，工单状态正常",
            detail=(
                f"流水 {txn.transaction_id} 与工单 {txn.work_order_id} 对账成功。"
                f"金额 {txn.amount:.2f} 与预期 {wo.expected_amount:.2f} 一致，"
                f"工单状态为「{wo.status}」，对账通过。"
            ),
        )

    def _check_duplicate_migration(self, txn: Transaction) -> ReconResult | None:
        batch = txn.migration_batch
        if not batch:
            return None
        if batch in self._seen_migration_batches:
            prev_txn_ids = self._seen_migration_batches[batch]
            return ReconResult(
                transaction=txn,
                work_order=None,
                status=ReconStatus.BLOCKED_DUPLICATE_MIGRATION,
                reason=f"迁移批次 {batch} 已有 {len(prev_txn_ids)} 条记录，本次为重复执行",
                detail=(
                    f"拦截原因：迁移批次「{batch}」此前已处理过 {len(prev_txn_ids)} 条流水"
                    f"（首条: {prev_txn_ids[0]}），当前流水 {txn.transaction_id} 属于同一批次的重复执行。"
                    "系统已拦截，防止账务数据被重复写入。"
                    "如确需重新执行，请先在回滚日志中确认前批数据已清理，再标记该回滚记录为「已解决」。"
                ),
            )
        self._seen_migration_batches.setdefault(batch, []).append(txn.transaction_id)
        return None

    def _check_anomaly(self, txn: Transaction, wo: WorkOrder) -> ReconResult | None:
        if txn.amount <= 0:
            return ReconResult(
                transaction=txn,
                work_order=wo,
                status=ReconStatus.ANOMALY,
                reason=f"金额异常：{txn.amount}",
                detail=(
                    f"流水 {txn.transaction_id} 金额为 {txn.amount}，非正数，属于明显坏数据。"
                    "可能原因：源系统金额字段为空导致默认为 0、金额符号反转、或导出格式错误。"
                    "需立即回源系统排查，不建议直接对账。"
                ),
            )

        if wo.expected_amount > 0 and abs(txn.amount - wo.expected_amount) / wo.expected_amount > AMOUNT_ANOMALY_RATIO:
            diff = txn.amount - wo.expected_amount
            return ReconResult(
                transaction=txn,
                work_order=wo,
                status=ReconStatus.ANOMALY,
                reason=f"金额严重偏离：流水 {txn.amount:.2f}，预期 {wo.expected_amount:.2f}，偏差 {diff:+.2f}",
                detail=(
                    f"流水 {txn.transaction_id} 金额 {txn.amount:.2f} 与工单预期 {wo.expected_amount:.2f} "
                    f"偏差超过 {AMOUNT_ANOMALY_RATIO*100:.0f}%（实际偏差 {diff:+.2f}）。"
                    "这不属于正常误差范围，极可能是数据录入错误或工单信息错误。"
                    "需人工介入核实双方数据源。"
                ),
            )

        if not txn.account_from or not txn.account_to:
            return ReconResult(
                transaction=txn,
                work_order=wo,
                status=ReconStatus.ANOMALY,
                reason="账户信息缺失",
                detail=(
                    f"流水 {txn.transaction_id} 的转出/转入账户为空，无法验证资金流向。"
                    "可能是源系统未记录账户信息或导出时遗漏。需回源系统补全。"
                ),
            )

        return None

    def _check_pending(self, txn: Transaction, wo: WorkOrder) -> ReconResult | None:
        if abs(txn.amount - wo.expected_amount) > AMOUNT_TOLERANCE:
            diff = txn.amount - wo.expected_amount
            return ReconResult(
                transaction=txn,
                work_order=wo,
                status=ReconStatus.PENDING,
                reason=f"金额偏差：流水 {txn.amount:.2f}，预期 {wo.expected_amount:.2f}，偏差 {diff:+.2f}",
                detail=(
                    f"流水 {txn.transaction_id} 金额 {txn.amount:.2f} 与工单 {wo.expected_amount:.2f} "
                    f"存在 {diff:+.2f} 的偏差。偏差在容忍范围外但未达异常阈值，"
                    "可能原因：手续费扣减、汇率差异、部分退款等。需人工确认。"
                ),
            )

        if wo.status not in ("completed", "done", "已完成", "完结"):
            return ReconResult(
                transaction=txn,
                work_order=wo,
                status=ReconStatus.PENDING,
                reason=f"工单状态未终结：{wo.status}",
                detail=(
                    f"流水 {txn.transaction_id} 对应的工单 {txn.work_order_id} 当前状态为「{wo.status}」，"
                    "尚未完结。金额虽已匹配，但工单未终结可能意味着业务流程尚未走完，"
                    "存在后续调整的可能。建议待工单完结后再次对账确认。"
                ),
            )

        return None
