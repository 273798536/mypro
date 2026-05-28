import os
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import asdict

from .models import (
    RiderPayment,
    BatchReport,
    PaymentStatus,
    FreezeStatus,
    DiffResult,
)
from .core import PaymentProcessor


class BatchProcessor:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        self.processor = PaymentProcessor()
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(f"{self.output_dir}/reports", exist_ok=True)
        os.makedirs(f"{self.output_dir}/traces", exist_ok=True)

    def generate_batch_id(self, data_hash: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"BATCH_{timestamp}_{data_hash[:8]}"

    def calculate_data_hash(
        self, riders: List[RiderPayment], freezes_count: int
    ) -> str:
        data_str = (
            f"{len(riders)}_{freezes_count}_"
            f"{sum(r.total_amount for r in riders)}_"
            f"{datetime.now().strftime('%Y%m%d')}"
        )
        return hashlib.md5(data_str.encode()).hexdigest()

    def process_batch(
        self,
        riders: List[RiderPayment],
        diffs: List[DiffResult],
        previous_batch_id: Optional[str] = None,
    ) -> BatchReport:
        data_hash = self.calculate_data_hash(
            riders, sum(len(r.freezes) for r in riders)
        )
        batch_id = self.generate_batch_id(data_hash)

        report = BatchReport(
            batch_id=batch_id, created_at=datetime.now(), diffs=diffs
        )

        previous_report = None
        if previous_batch_id:
            previous_report = self.load_batch_report(previous_batch_id)

        for rider in riders:
            rider.batch_id = batch_id
            self.processor.transition_status(
                rider, PaymentStatus.CHECKING, "开始批次处理"
            )

            report.total_riders += 1
            report.total_amount += rider.total_amount

            duplicates = self.processor.check_duplicate_freezes(rider)
            report.duplicate_freezes.extend(duplicates)

            negatives = self.processor.check_negative_subsidies(rider)
            report.negative_subsidies.extend(negatives)

            bank_ok, bank_msg = self.processor.validate_bank_account(rider)
            if not bank_ok:
                report.bank_failures.append(
                    {
                        "rider_id": rider.rider_id,
                        "rider_name": rider.rider_name,
                        "reason": bank_msg,
                        "human_reason": (
                            f"骑手{rider.rider_name}银行卡验证失败：{bank_msg}，"
                            f"请核对后重新提交"
                        ),
                    }
                )

            self.processor.process_freezes(rider, batch_id)

            if rider.freezes:
                report.frozen_count += 1
                frozen_amount = sum(
                    f.amount
                    for f in rider.freezes
                    if f.status == FreezeStatus.APPROVED
                )
                report.frozen_amount += frozen_amount
                self.processor.transition_status(
                    rider,
                    PaymentStatus.FROZEN,
                    f"存在{len(rider.freezes)}项冻结",
                )

            if bank_ok and rider.final_amount > 0:
                self.processor.transition_status(
                    rider, PaymentStatus.READY, "准备发放"
                )
            elif not bank_ok:
                self.processor.transition_status(
                    rider, PaymentStatus.FAILED, bank_msg
                )

        if previous_report:
            inconsistencies = self._check_consistency(report, previous_report)
            report.inconsistencies = inconsistencies

        self._save_batch_trace(batch_id, riders)
        self._save_batch_report(report)

        return report

    def _check_consistency(
        self, current: BatchReport, previous: BatchReport
    ) -> List[Dict[str, Any]]:
        inconsistencies = []

        if current.frozen_count != previous.frozen_count:
            inconsistencies.append(
                {
                    "type": "冻结数量变化",
                    "previous": previous.frozen_count,
                    "current": current.frozen_count,
                    "human_reason": (
                        f"冻结人数从{previous.frozen_count}人"
                        f"变为{current.frozen_count}人，"
                        f"差异：{current.frozen_count - previous.frozen_count}人"
                    ),
                }
            )

        if abs(current.frozen_amount - previous.frozen_amount) > 0.01:
            inconsistencies.append(
                {
                    "type": "冻结金额变化",
                    "previous": round(previous.frozen_amount, 2),
                    "current": round(current.frozen_amount, 2),
                    "human_reason": (
                        f"冻结总金额从{previous.frozen_amount:.2f}元"
                        f"变为{current.frozen_amount:.2f}元，"
                        f"差异：{current.frozen_amount - previous.frozen_amount:.2f}元"
                    ),
                }
            )

        if current.total_riders != previous.total_riders:
            inconsistencies.append(
                {
                    "type": "发放人数变化",
                    "previous": previous.total_riders,
                    "current": current.total_riders,
                    "human_reason": (
                        f"发放总人数从{previous.total_riders}人"
                        f"变为{current.total_riders}人，"
                        f"差异：{current.total_riders - previous.total_riders}人"
                    ),
                }
            )

        return inconsistencies

    def _save_batch_trace(
        self, batch_id: str, riders: List[RiderPayment]
    ):
        trace_data = []
        for rider in riders:
            trace_data.append(
                {
                    "rider_id": rider.rider_id,
                    "rider_name": rider.rider_name,
                    "payment_status": rider.payment_status.value,
                    "final_amount": rider.final_amount,
                    "status_trace": self.processor.get_status_trace(rider),
                    "freezes": [
                        {
                            "type": f.freeze_type.value,
                            "amount": f.amount,
                            "status": f.status.value,
                            "reason": f.reason,
                            "sequence": f.sequence,
                        }
                        for f in rider.freezes
                    ],
                }
            )

        with open(
            f"{self.output_dir}/traces/{batch_id}_trace.json",
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(trace_data, f, ensure_ascii=False, indent=2)

    def _save_batch_report(self, report: BatchReport):
        report_dict = asdict(report)
        report_dict["created_at"] = report.created_at.isoformat()

        with open(
            f"{self.output_dir}/reports/{report.batch_id}_report.json",
            "w",
            encoding="utf-8",
        ) as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2, default=str)

    def load_batch_report(self, batch_id: str) -> Optional[BatchReport]:
        report_path = f"{self.output_dir}/reports/{batch_id}_report.json"
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                data["created_at"] = datetime.fromisoformat(
                    data["created_at"]
                )
                return BatchReport(**data)
        return None

    def get_rider_trace(
        self, batch_id: str, rider_id: str
    ) -> Optional[Dict[str, Any]]:
        trace_path = f"{self.output_dir}/traces/{batch_id}_trace.json"
        if os.path.exists(trace_path):
            with open(trace_path, "r", encoding="utf-8") as f:
                traces = json.load(f)
                for trace in traces:
                    if trace["rider_id"] == rider_id:
                        return trace
        return None

    def list_batches(self) -> List[str]:
        reports_dir = f"{self.output_dir}/reports"
        if os.path.exists(reports_dir):
            return sorted(
                [
                    f.replace("_report.json", "")
                    for f in os.listdir(reports_dir)
                    if f.endswith("_report.json")
                ],
                reverse=True,
            )
        return []
