from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from .models import (
    Approver,
    Invoice,
    Loan,
    Project,
    Reimbursement,
    Source,
    SpotCheckReport,
)


@dataclass
class LoadError:
    source: Source
    message: str
    raw_row: dict[str, str]


@dataclass
class CorrectionTrace:
    field_name: str
    original_value: str
    corrected_value: str
    reason: str
    source: Source


@dataclass
class LoadResult:
    reimbursements: list[Reimbursement]
    invoices: list[Invoice]
    loans: list[Loan]
    projects: list[Project]
    approvers: list[Approver]
    spot_check_reports: list[SpotCheckReport]
    errors: list[LoadError] = field(default_factory=list)
    corrections: list[CorrectionTrace] = field(default_factory=list)


def _parse_date(value: str) -> tuple[datetime.date, str, str]:
    """返回 (解析结果, 归一化后字符串, 归一化说明)"""
    original = value.strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            parsed = datetime.strptime(original, fmt).date()
            normalized = parsed.strftime("%Y-%m-%d")
            note = "" if original == normalized else f"格式归一化（{fmt} → %Y-%m-%d）"
            return parsed, normalized, note
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {original}")


def _parse_float(value: str) -> tuple[float, str, str]:
    """返回 (解析结果, 归一化后字符串, 归一化说明)"""
    original = value.strip()
    normalized = original.replace(",", "")
    note = "" if original == normalized else "移除千分位逗号"
    return float(normalized), normalized, note


def _read_csv(path: Path) -> list[dict[str, str]]:
    encodings = ["utf-8-sig", "utf-8", "gbk"]
    for enc in encodings:
        try:
            with open(path, encoding=enc, newline="") as f:
                reader = csv.DictReader(f)
                rows = []
                for row in reader:
                    rows.append(
                        {
                            k.strip() if k else k: (v.strip() if v else "")
                            for k, v in row.items()
                        }
                    )
                return rows
        except UnicodeDecodeError:
            continue
    raise ValueError(f"无法读取文件 {path}，尝试了编码: {encodings}")


def _make_source(file_path: Path, line_no: int) -> Source:
    return Source(file=str(file_path.name), sheet=file_path.stem, line_no=line_no)


class DataLoader:
    """从 CSV 目录加载所有数据，记录来源和修正痕迹。"""

    def __init__(self, data_dir: str | Path):
        self.data_dir = Path(data_dir)
        self._result = LoadResult(
            reimbursements=[],
            invoices=[],
            loans=[],
            projects=[],
            approvers=[],
            spot_check_reports=[],
        )

    def load(self) -> LoadResult:
        files = {
            "reimbursements": self.data_dir / "reimbursements.csv",
            "invoices": self.data_dir / "invoices.csv",
            "loans": self.data_dir / "loans.csv",
            "projects": self.data_dir / "projects.csv",
            "approvers": self.data_dir / "approvers.csv",
            "spot_check_reports": self.data_dir / "spot_check_reports.csv",
        }

        for key, path in files.items():
            if path.exists():
                getattr(self, f"_load_{key}")(path)

        return self._result

    def _trace(self, source: Source, field_name: str, raw: str, corrected: str, reason: str):
        if raw != corrected:
            self._result.corrections.append(
                CorrectionTrace(
                    field_name=field_name,
                    original_value=raw,
                    corrected_value=corrected,
                    reason=reason,
                    source=source,
                )
            )

    def _safe_parse(self, source: Source, raw_row: dict[str, str], field: str, parser, default=""):
        raw = raw_row.get(field, "").strip()
        if raw == "":
            return default
        try:
            return parser(raw)
        except Exception as exc:
            self._result.errors.append(
                LoadError(source=source, message=f"{field} 解析失败: {exc}", raw_row=raw_row)
            )
            return default

    def _clean_str(
        self, source: Source, field: str, raw: str
    ) -> str:
        cleaned = raw.strip()
        if raw != cleaned:
            self._trace(source, field, raw, cleaned, "去除首尾空白")
        return cleaned

    # ------------------------------------------------------------------

    def _load_reimbursements(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                raw_amount = row.get("amount", "0")
                amount, amount_norm, amount_note = _parse_float(raw_amount)
                if amount_note:
                    self._trace(source, "amount", raw_amount, amount_norm, amount_note)

                raw_date = row.get("submit_date", "")
                submit_date, date_norm, date_note = _parse_date(raw_date)
                if date_note:
                    self._trace(source, "submit_date", raw_date, date_norm, date_note)

                raw_approver = row.get("approver", "")
                approver = self._clean_str(source, "approver", raw_approver)

                obj = Reimbursement(
                    reimburse_id=self._clean_str(source, "reimburse_id", row.get("reimburse_id", "")),
                    applicant=self._clean_str(source, "applicant", row.get("applicant", "")),
                    amount=amount,
                    project_code=self._clean_str(source, "project_code", row.get("project_code", "")),
                    submit_date=submit_date,
                    approver=approver,
                    source=source,
                )
                self._result.reimbursements.append(obj)
            except Exception as exc:
                self._result.errors.append(
                    LoadError(source=source, message=f"报销单行解析失败: {exc}", raw_row=row)
                )

    def _load_invoices(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                raw_amount = row.get("amount", "0")
                amount, amount_norm, amount_note = _parse_float(raw_amount)
                if amount_note:
                    self._trace(source, "amount", raw_amount, amount_norm, amount_note)

                raw_date = row.get("invoice_date", "")
                invoice_date, date_norm, date_note = _parse_date(raw_date)
                if date_note:
                    self._trace(source, "invoice_date", raw_date, date_norm, date_note)

                obj = Invoice(
                    invoice_no=self._clean_str(source, "invoice_no", row.get("invoice_no", "")),
                    invoice_date=invoice_date,
                    amount=amount,
                    reimburse_id=self._clean_str(source, "reimburse_id", row.get("reimburse_id", "")),
                    source=source,
                )
                self._result.invoices.append(obj)
            except Exception as exc:
                self._result.errors.append(
                    LoadError(source=source, message=f"票据解析失败: {exc}", raw_row=row)
                )

    def _load_loans(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                raw_amount = row.get("amount", "0")
                amount, amount_norm, amount_note = _parse_float(raw_amount)
                if amount_note:
                    self._trace(source, "amount", raw_amount, amount_norm, amount_note)

                raw_loan_date = row.get("loan_date", "")
                loan_date, loan_date_norm, loan_date_note = _parse_date(raw_loan_date)
                if loan_date_note:
                    self._trace(source, "loan_date", raw_loan_date, loan_date_norm, loan_date_note)

                settle_raw = row.get("settle_date", "").strip()
                settle_date = None
                if settle_raw:
                    settle_date, settle_norm, settle_note = _parse_date(settle_raw)
                    if settle_note:
                        self._trace(source, "settle_date", settle_raw, settle_norm, settle_note)

                obj = Loan(
                    loan_id=self._clean_str(source, "loan_id", row.get("loan_id", "")),
                    borrower=self._clean_str(source, "borrower", row.get("borrower", "")),
                    amount=amount,
                    loan_date=loan_date,
                    settle_date=settle_date,
                    reimburse_id=self._clean_str(source, "reimburse_id", row.get("reimburse_id", "")),
                    source=source,
                )
                self._result.loans.append(obj)
            except Exception as exc:
                self._result.errors.append(
                    LoadError(source=source, message=f"借款记录解析失败: {exc}", raw_row=row)
                )

    def _load_projects(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                raw_budget = row.get("budget", "0")
                budget, budget_norm, budget_note = _parse_float(raw_budget)
                if budget_note:
                    self._trace(source, "budget", raw_budget, budget_norm, budget_note)

                obj = Project(
                    code=self._clean_str(source, "code", row.get("code", "")),
                    name=self._clean_str(source, "name", row.get("name", "")),
                    manager=self._clean_str(source, "manager", row.get("manager", "")),
                    budget=budget,
                    source=source,
                )
                self._result.projects.append(obj)
            except Exception as exc:
                self._result.errors.append(
                    LoadError(source=source, message=f"项目解析失败: {exc}", raw_row=row)
                )

    def _load_approvers(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                raw_max = row.get("max_amount", "0")
                max_amount, max_norm, max_note = _parse_float(raw_max)
                if max_note:
                    self._trace(source, "max_amount", raw_max, max_norm, max_note)

                obj = Approver(
                    name=self._clean_str(source, "name", row.get("name", "")),
                    level=int(row.get("level", "0")),
                    max_amount=max_amount,
                    source=source,
                )
                self._result.approvers.append(obj)
            except Exception as exc:
                self._result.errors.append(
                    LoadError(source=source, message=f"审批人解析失败: {exc}", raw_row=row)
                )

    def _load_spot_check_reports(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                sample_ids_raw = row.get("sample_ids", "").strip()
                sample_ids = [s.strip() for s in sample_ids_raw.split(";") if s.strip()] if sample_ids_raw else []
                obj = SpotCheckReport(
                    report_id=row.get("report_id", "").strip() or "",
                    sample_ids=sample_ids,
                    findings=row.get("findings", "").strip() or "",
                    source=source,
                )
                self._result.spot_check_reports.append(obj)
            except Exception as exc:
                self._result.errors.append(
                    LoadError(source=source, message=f"抽检报告解析失败: {exc}", raw_row=row)
                )
