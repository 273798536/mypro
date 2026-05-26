from typing import List, Dict, Tuple
from datetime import date
from collections import defaultdict
from ..models import (
    ReplenishRecord,
    ReplenishStatus,
    RiskType,
    BankReturn,
    CustomerPlan,
    FailureReason,
    ReplenishWindow,
    ManualRemark,
    ReconciliationSummary,
)
from .state_machine import StateMachine
from .holiday_manager import HolidayManager
from .idempotent_manager import IdempotentManager


class ReplenishProcessor:
    def __init__(
        self,
        idempotent_manager: IdempotentManager,
        holiday_manager: HolidayManager = None,
    ):
        self.state_machine = StateMachine()
        self.holiday_manager = holiday_manager or HolidayManager()
        self.idempotent_manager = idempotent_manager
        self.records: List[ReplenishRecord] = []
        self.warnings: List[str] = []

    def build_records(
        self,
        bank_returns: List[BankReturn],
        customer_plans: Dict[str, CustomerPlan],
        failure_reasons: Dict[str, FailureReason],
        replenish_windows: Dict[str, ReplenishWindow],
        manual_remarks: Dict[str, List[ManualRemark]],
    ) -> List[ReplenishRecord]:
        records = []
        duplicate_check: Dict[str, List[str]] = defaultdict(list)

        for bank_return in bank_returns:
            plan_id = bank_return.plan_id
            plan = customer_plans.get(plan_id)

            if not plan:
                self.warnings.append(
                    f"[WARN] 回盘流水 {bank_return.serial_no} 未找到对应定投计划 {plan_id}"
                )
                continue

            record_id = self.idempotent_manager.generate_record_key(bank_return)
            duplicate_key = f"{bank_return.customer_id}_{plan_id}_{bank_return.deduct_date.isoformat()}"
            duplicate_check[duplicate_key].append(bank_return.serial_no)

            record = ReplenishRecord(
                record_id=record_id,
                bank_return=bank_return,
                customer_plan=plan,
                failure_reason=failure_reasons.get(bank_return.return_code),
                replenish_window=replenish_windows.get(plan_id),
                manual_remarks=manual_remarks.get(bank_return.serial_no, []),
            )
            records.append(record)

        for dup_key, serials in duplicate_check.items():
            if len(serials) > 1:
                for record in records:
                    if record.bank_return.serial_no in serials:
                        record.add_risk(RiskType.DUPLICATE)
                        self.warnings.append(
                            f"[RISK] 检测到重复扣款风险: 客户 {record.bank_return.customer_id} "
                            f"计划 {record.bank_return.plan_id} 日期 {record.bank_return.deduct_date} "
                            f"涉及回盘: {', '.join(serials)}"
                        )

        self.records = records
        return records

    def process_all(self, run_date: date = None) -> Tuple[List[ReplenishRecord], ReconciliationSummary]:
        run_date = run_date or date.today()
        batch_id = f"RECON_{run_date.strftime('%Y%m%d')}_{len(self.records)}"

        for record in self.records:
            self._process_single_record(record, run_date)

        summary = self._generate_summary(batch_id, run_date)
        return self.records, summary

    def _process_single_record(self, record: ReplenishRecord, run_date: date):
        initial_status = self.state_machine.evaluate_initial_state(record)

        if initial_status != record.status:
            self.state_machine.transition(
                record,
                initial_status,
                "初始状态评估",
                "state_machine",
            )

        if record.status == ReplenishStatus.ELIGIBLE:
            self._schedule_replenish(record, run_date)

        if record.status == ReplenishStatus.ELIGIBLE and record.replenish_window:
            window = record.replenish_window
            if window.attempts_made > 0:
                self.state_machine.transition(
                    record,
                    ReplenishStatus.REVIEW_REQUIRED,
                    f"已尝试补扣 {window.attempts_made} 次，需人工复核",
                    "processor",
                )
                record.add_risk(RiskType.MANUAL_REVIEW)

        if record.status == ReplenishStatus.PAUSED:
            self.warnings.append(
                f"[PAUSED] 客户 {record.bank_return.customer_name}({record.bank_return.customer_id}) "
                f"的定投计划 {record.bank_return.plan_id} 已暂停，跳过补扣"
            )

        if record.status == ReplenishStatus.DUPLICATE_RISK:
            self.warnings.append(
                f"[DUPLICATE] 回盘流水 {record.bank_return.serial_no} 存在重复扣款风险，已标记待处理"
            )

    def _schedule_replenish(self, record: ReplenishRecord, run_date: date):
        try:
            window = record.replenish_window
            if window:
                replenish_date = self.holiday_manager.calculate_replenish_date(
                    base_date=run_date,
                    window_start=window.window_start,
                    window_end=window.window_end,
                    defer_days=window.attempts_made + 1,
                )
            else:
                replenish_date = self.holiday_manager.next_workday(run_date)

            if self.holiday_manager.is_holiday(replenish_date):
                self.state_machine.transition(
                    record,
                    ReplenishStatus.HOLIDAY_DEFERRED,
                    f"补扣日 {replenish_date} 为节假日，顺延至下一个工作日",
                    "holiday_manager",
                )
                record.add_risk(RiskType.HOLIDAY)
                record.scheduled_replenish_date = self.holiday_manager.next_workday(replenish_date)
                self.warnings.append(
                    f"[HOLIDAY] 回盘 {record.bank_return.serial_no} 补扣日为节假日，顺延至 {record.scheduled_replenish_date}"
                )
            else:
                record.scheduled_replenish_date = replenish_date

        except ValueError as e:
            self.state_machine.transition(
                record,
                ReplenishStatus.REVIEW_REQUIRED,
                f"无法安排补扣日期: {str(e)}",
                "processor",
            )
            record.add_risk(RiskType.MANUAL_REVIEW)

    def _generate_summary(self, batch_id: str, run_date: date) -> ReconciliationSummary:
        summary = ReconciliationSummary(
            batch_id=batch_id,
            run_date=run_date,
            total_records=len(self.records),
        )

        source_files = set()
        for record in self.records:
            source_files.add(record.bank_return.source_file)
            source_files.add(record.customer_plan.source_file)

            summary.total_amount += record.bank_return.amount

            if record.status == ReplenishStatus.SUCCESS:
                summary.success_count += 1
                summary.success_amount += record.bank_return.amount
            elif record.status == ReplenishStatus.FAILED:
                summary.failed_count += 1
                summary.failed_amount += record.bank_return.amount
            elif record.status == ReplenishStatus.PENDING:
                summary.pending_count += 1
            elif record.status == ReplenishStatus.PAUSED:
                summary.paused_count += 1
            elif record.status == ReplenishStatus.REVIEW_REQUIRED:
                summary.review_required_count += 1
            elif record.status == ReplenishStatus.HOLIDAY_DEFERRED:
                summary.deferred_count += 1
            elif record.status == ReplenishStatus.DUPLICATE_RISK:
                summary.duplicate_risk_count += 1
            elif record.status == ReplenishStatus.CANCELLED:
                summary.cancelled_count += 1

        summary.source_files = list(source_files)
        return summary

    def get_records_by_status(self, status: ReplenishStatus) -> List[ReplenishRecord]:
        return [r for r in self.records if r.status == status]

    def get_records_with_risk(self, risk: RiskType) -> List[ReplenishRecord]:
        return [r for r in self.records if risk in r.risks]
