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


def _parse_date(value: str) -> datetime.date:
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {value}")


def _parse_float(value: str) -> float:
    value = value.strip().replace(",", "")
    return float(value)


def _read_csv(path: Path) -> list[dict[str, str]]:
    encodings = ["utf-8-sig", "utf-8", "gbk"]
    for enc in encodings:
        try:
            with open(path, encoding=enc, newline="") as f:
                reader = csv.DictReader(f)
                rows = []
                for row in reader:
                    rows.append({k.strip(): v.strip() for k, v in row.items()})
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

    # ------------------------------------------------------------------

    def _load_reimbursements(self, path: Path):
        rows = _read_csv(path)
        for idx, row in enumerate(rows, start=2):
            source = _make_source(path, idx)
            try:
                obj = Reimbursement(
                    reimburse_id=row.get("reimburse_id", "").strip() or "",
                    applicant=row.get("applicant", "").strip() or "",
                    amount=_parse_float(row.get("amount", "0")),
                    project_code=row.get("project_code", "").strip() or "",
                    submit_date=_parse_date(row.get("submit_date", "")),
                    approver=row.get("approver", "").strip() or "",
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
                obj = Invoice(
                    invoice_no=row.get("invoice_no", "").strip() or "",
                    invoice_date=_parse_date(row.get("invoice_date", "")),
                    amount=_parse_float(row.get("amount", "0")),
                    reimburse_id=row.get("reimburse_id", "").strip() or "",
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
                settle_raw = row.get("settle_date", "").strip()
                settle_date = _parse_date(settle_raw) if settle_raw else None
                obj = Loan(
                    loan_id=row.get("loan_id", "").strip() or "",
                    borrower=row.get("borrower", "").strip() or "",
                    amount=_parse_float(row.get("amount", "0")),
                    loan_date=_parse_date(row.get("loan_date", "")),
                    settle_date=settle_date,
                    reimburse_id=row.get("reimburse_id", "").strip() or "",
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
                obj = Project(
                    code=row.get("code", "").strip() or "",
                    name=row.get("name", "").strip() or "",
                    manager=row.get("manager", "").strip() or "",
                    budget=_parse_float(row.get("budget", "0")),
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
                obj = Approver(
                    name=row.get("name", "").strip() or "",
                    level=int(row.get("level", "0")),
                    max_amount=_parse_float(row.get("max_amount", "0")),
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
