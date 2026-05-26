import csv
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import date, datetime
import pandas as pd
from ..models import (
    BankReturn,
    CustomerPlan,
    FailureReason,
    ReplenishWindow,
    ManualRemark,
    RiskType,
)


class DataLoader:
    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)
        if not self.input_dir.exists():
            raise FileNotFoundError(f"输入目录不存在: {input_dir}")

    def _parse_date(self, value) -> date:
        if value is None or (isinstance(value, float) and pd.isna(value)) or str(value).strip() == "":
            raise ValueError("日期为空")
        value_str = str(value).strip()
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
            try:
                return datetime.strptime(value_str, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"无法解析日期: {value}")

    def _parse_datetime(self, value: str) -> datetime:
        if not value:
            return datetime.now()
        for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d %H:%M:%S"]:
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
        return datetime.now()

    def load_bank_returns(self, filename: str = "bank_returns.csv") -> List[BankReturn]:
        filepath = self.input_dir / filename
        if not filepath.exists():
            return []

        records = []
        df = pd.read_csv(filepath, dtype=str)
        for _, row in df.iterrows():
            try:
                record = BankReturn(
                    serial_no=str(row.get("serial_no", "")).strip(),
                    customer_id=str(row.get("customer_id", "")).strip(),
                    customer_name=str(row.get("customer_name", "")).strip(),
                    plan_id=str(row.get("plan_id", "")).strip(),
                    deduct_date=self._parse_date(str(row.get("deduct_date", ""))),
                    return_date=self._parse_date(str(row.get("return_date", ""))),
                    amount=float(row.get("amount", 0)),
                    return_code=str(row.get("return_code", "")).strip(),
                    return_msg=str(row.get("return_msg", "")).strip(),
                    source_file=filename,
                )
                records.append(record)
            except Exception as e:
                print(f"[WARN] 解析银行回盘记录失败: {row.get('serial_no')}, 错误: {e}")
        return records

    def _is_empty(self, value) -> bool:
        if value is None:
            return True
        if isinstance(value, float) and pd.isna(value):
            return True
        s = str(value).strip().lower()
        return s in ["", "nan", "none", "null"]

    def load_customer_plans(self, filename: str = "customer_plans.csv") -> List[CustomerPlan]:
        filepath = self.input_dir / filename
        if not filepath.exists():
            return []

        records = []
        df = pd.read_csv(filepath, dtype=str)
        for _, row in df.iterrows():
            try:
                end_date_val = row.get("end_date")
                end_date = None
                if not self._is_empty(end_date_val):
                    end_date = self._parse_date(str(end_date_val))

                record = CustomerPlan(
                    plan_id=str(row.get("plan_id", "")).strip(),
                    customer_id=str(row.get("customer_id", "")).strip(),
                    customer_name=str(row.get("customer_name", "")).strip(),
                    fund_code=str(row.get("fund_code", "")).strip(),
                    fund_name=str(row.get("fund_name", "")).strip(),
                    monthly_amount=float(row.get("monthly_amount", 0)),
                    deduct_day=int(row.get("deduct_day", 0)),
                    start_date=self._parse_date(str(row.get("start_date", ""))),
                    end_date=end_date,
                    status=str(row.get("status", "正常")).strip(),
                    source_file=filename,
                )
                records.append(record)
            except Exception as e:
                print(f"[WARN] 解析客户计划失败: {row.get('plan_id')}, 错误: {e}")
        return records

    def load_failure_reasons(self, filename: str = "failure_reasons.csv") -> Dict[str, FailureReason]:
        filepath = self.input_dir / filename
        if not filepath.exists():
            return {}

        reasons = {}
        df = pd.read_csv(filepath, dtype=str)
        for _, row in df.iterrows():
            try:
                reason = FailureReason(
                    reason_code=str(row.get("reason_code", "")).strip(),
                    reason_name=str(row.get("reason_name", "")).strip(),
                    category=str(row.get("category", "")).strip(),
                    allow_replenish=str(row.get("allow_replenish", "true")).strip().lower() in ["true", "1", "yes"],
                    max_attempts=int(row.get("max_attempts", 3)),
                    description=str(row.get("description", "")).strip() or None,
                    source_file=filename,
                )
                reasons[reason.reason_code] = reason
            except Exception as e:
                print(f"[WARN] 解析失败原因失败: {row.get('reason_code')}, 错误: {e}")
        return reasons

    def load_replenish_windows(self, filename: str = "replenish_windows.csv") -> Dict[str, ReplenishWindow]:
        filepath = self.input_dir / filename
        if not filepath.exists():
            return {}

        windows = {}
        df = pd.read_csv(filepath, dtype=str)
        for _, row in df.iterrows():
            try:
                last_attempt_val = row.get("last_attempt_date")
                last_attempt_date = None
                if not self._is_empty(last_attempt_val):
                    last_attempt_date = self._parse_date(str(last_attempt_val))

                window = ReplenishWindow(
                    window_id=str(row.get("window_id", "")).strip(),
                    plan_id=str(row.get("plan_id", "")).strip(),
                    original_deduct_date=self._parse_date(str(row.get("original_deduct_date", ""))),
                    window_start=self._parse_date(str(row.get("window_start", ""))),
                    window_end=self._parse_date(str(row.get("window_end", ""))),
                    attempts_made=int(row.get("attempts_made", 0)),
                    last_attempt_date=last_attempt_date,
                    source_file=filename,
                )
                windows[window.plan_id] = window
            except Exception as e:
                print(f"[WARN] 解析补扣窗口失败: {row.get('window_id')}, 错误: {e}")
        return windows

    def load_manual_remarks(self, filename: str = "manual_remarks.csv") -> Dict[str, List[ManualRemark]]:
        filepath = self.input_dir / filename
        if not filepath.exists():
            return {}

        remarks: Dict[str, List[ManualRemark]] = {}
        df = pd.read_csv(filepath, dtype=str)
        for _, row in df.iterrows():
            try:
                remark = ManualRemark(
                    remark_id=str(row.get("remark_id", "")).strip(),
                    related_serial_no=str(row.get("related_serial_no", "")).strip(),
                    operator=str(row.get("operator", "")).strip(),
                    remark_time=self._parse_datetime(str(row.get("remark_time", ""))),
                    content=str(row.get("content", "")).strip(),
                    action=str(row.get("action", "")).strip(),
                    source_file=filename,
                )
                if remark.related_serial_no not in remarks:
                    remarks[remark.related_serial_no] = []
                remarks[remark.related_serial_no].append(remark)
            except Exception as e:
                print(f"[WARN] 解析人工备注失败: {row.get('remark_id')}, 错误: {e}")
        return remarks

    def load_all(self) -> Dict:
        return {
            "bank_returns": self.load_bank_returns(),
            "customer_plans": {p.plan_id: p for p in self.load_customer_plans()},
            "failure_reasons": self.load_failure_reasons(),
            "replenish_windows": self.load_replenish_windows(),
            "manual_remarks": self.load_manual_remarks(),
        }
