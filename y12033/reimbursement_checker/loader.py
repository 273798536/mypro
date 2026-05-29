import json
import csv
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime, date
from .models import (
    Budget,
    Contract,
    Invoice,
    ReimbursementRecord,
    SourceReference,
)


def _parse_date(value: str) -> date:
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except (ValueError, AttributeError):
            continue
    raise ValueError(f"无法解析日期: {value}")


def _parse_float(value: str) -> float:
    if value is None or value == "":
        return 0.0
    cleaned = str(value).replace(",", "").replace("¥", "").strip()
    return float(cleaned)


def _make_source(file_path: Path, row_num: int, field_name: str = None, raw_value: str = None) -> SourceReference:
    return SourceReference(
        file_name=file_path.name,
        sheet_name=None,
        row_number=row_num,
        field_name=field_name,
        raw_value=str(raw_value) if raw_value is not None else None,
    )


def load_budgets(input_dir: Path) -> Dict[Tuple[str, str], Budget]:
    budgets: Dict[Tuple[str, str], Budget] = {}
    budget_file = input_dir / "budgets.csv"

    if not budget_file.exists():
        budget_file = input_dir / "budgets.json"

    if not budget_file.exists():
        return budgets

    if budget_file.suffix == ".csv":
        with open(budget_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                key = (row["project_id"], row["subject_code"])
                budgets[key] = Budget(
                    project_id=row["project_id"],
                    project_name=row["project_name"],
                    subject_code=row["subject_code"],
                    subject_name=row["subject_name"],
                    total_amount=_parse_float(row["total_amount"]),
                    used_amount=_parse_float(row["used_amount"]),
                    source=_make_source(
                        budget_file,
                        i,
                        "total_amount",
                        row.get("total_amount"),
                    ),
                )
    elif budget_file.suffix == ".json":
        with open(budget_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for i, item in enumerate(data, start=1):
                key = (item["project_id"], item["subject_code"])
                budgets[key] = Budget(
                    project_id=item["project_id"],
                    project_name=item["project_name"],
                    subject_code=item["subject_code"],
                    subject_name=item["subject_name"],
                    total_amount=_parse_float(str(item["total_amount"])),
                    used_amount=_parse_float(str(item["used_amount"])),
                    source=_make_source(
                        budget_file,
                        i,
                        "total_amount",
                        str(item.get("total_amount")),
                    ),
                )

    return budgets


def load_contracts(input_dir: Path) -> Dict[str, Contract]:
    contracts: Dict[str, Contract] = {}
    contract_file = input_dir / "contracts.csv"

    if not contract_file.exists():
        contract_file = input_dir / "contracts.json"

    if not contract_file.exists():
        return contracts

    if contract_file.suffix == ".csv":
        with open(contract_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                contracts[row["contract_id"]] = Contract(
                    contract_id=row["contract_id"],
                    contract_name=row["contract_name"],
                    project_id=row["project_id"],
                    supplier=row["supplier"],
                    total_amount=_parse_float(row["total_amount"]),
                    invoiced_amount=_parse_float(row["invoiced_amount"]),
                    paid_amount=_parse_float(row["paid_amount"]),
                    source=_make_source(
                        contract_file,
                        i,
                        "total_amount",
                        row.get("total_amount"),
                    ),
                )
    elif contract_file.suffix == ".json":
        with open(contract_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for i, item in enumerate(data, start=1):
                contracts[item["contract_id"]] = Contract(
                    contract_id=item["contract_id"],
                    contract_name=item["contract_name"],
                    project_id=item["project_id"],
                    supplier=item["supplier"],
                    total_amount=_parse_float(str(item["total_amount"])),
                    invoiced_amount=_parse_float(str(item["invoiced_amount"])),
                    paid_amount=_parse_float(str(item["paid_amount"])),
                    source=_make_source(
                        contract_file,
                        i,
                        "total_amount",
                        str(item.get("total_amount")),
                    ),
                )

    return contracts


def load_invoices(input_dir: Path) -> Dict[str, Invoice]:
    invoices: Dict[str, Invoice] = {}
    invoice_file = input_dir / "invoices.csv"

    if not invoice_file.exists():
        invoice_file = input_dir / "invoices.json"

    if not invoice_file.exists():
        return invoices

    if invoice_file.suffix == ".csv":
        with open(invoice_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                invoices[row["invoice_id"]] = Invoice(
                    invoice_id=row["invoice_id"],
                    invoice_code=row["invoice_code"],
                    invoice_number=row["invoice_number"],
                    invoice_date=_parse_date(row["invoice_date"]),
                    total_amount=_parse_float(row["total_amount"]),
                    supplier=row["supplier"],
                    source=_make_source(
                        invoice_file,
                        i,
                        "total_amount",
                        row.get("total_amount"),
                    ),
                )
    elif invoice_file.suffix == ".json":
        with open(invoice_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for i, item in enumerate(data, start=1):
                invoices[item["invoice_id"]] = Invoice(
                    invoice_id=item["invoice_id"],
                    invoice_code=item["invoice_code"],
                    invoice_number=item["invoice_number"],
                    invoice_date=_parse_date(str(item["invoice_date"])),
                    total_amount=_parse_float(str(item["total_amount"])),
                    supplier=item["supplier"],
                    source=_make_source(
                        invoice_file,
                        i,
                        "total_amount",
                        str(item.get("total_amount")),
                    ),
                )

    return invoices


def load_reimbursement_records(input_dir: Path) -> List[ReimbursementRecord]:
    records: List[ReimbursementRecord] = []
    records_file = input_dir / "reimbursements.csv"

    if not records_file.exists():
        records_file = input_dir / "reimbursements.json"

    if not records_file.exists():
        return records

    if records_file.suffix == ".csv":
        with open(records_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, start=2):
                record = ReimbursementRecord(
                    record_id=row["record_id"],
                    project_id=row["project_id"],
                    project_name=row["project_name"],
                    subject_code=row["subject_code"],
                    subject_name=row["subject_name"],
                    invoice_id=row["invoice_id"],
                    contract_id=row.get("contract_id") or None,
                    amount=_parse_float(row["amount"]),
                    applicant=row["applicant"],
                    apply_date=_parse_date(row["apply_date"]),
                    approval_history=[
                        h.strip() for h in row.get("approval_history", "").split(";") if h.strip()
                    ],
                )
                record.source = _make_source(
                    records_file,
                    i,
                    "amount",
                    row.get("amount"),
                )
                records.append(record)
    elif records_file.suffix == ".json":
        with open(records_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for i, item in enumerate(data, start=1):
                record = ReimbursementRecord(
                    record_id=item["record_id"],
                    project_id=item["project_id"],
                    project_name=item["project_name"],
                    subject_code=item["subject_code"],
                    subject_name=item["subject_name"],
                    invoice_id=item["invoice_id"],
                    contract_id=item.get("contract_id") or None,
                    amount=_parse_float(str(item["amount"])),
                    applicant=item["applicant"],
                    apply_date=_parse_date(str(item["apply_date"])),
                    approval_history=item.get("approval_history", []),
                )
                record.source = _make_source(
                    records_file,
                    i,
                    "amount",
                    str(item.get("amount")),
                )
                records.append(record)

    return records


def load_all_data(input_dir: Path) -> Tuple[
    List[ReimbursementRecord],
    Dict[Tuple[str, str], Budget],
    Dict[str, Invoice],
    Dict[str, Contract],
]:
    input_path = Path(input_dir)
    budgets = load_budgets(input_path)
    contracts = load_contracts(input_path)
    invoices = load_invoices(input_path)
    records = load_reimbursement_records(input_path)
    return records, budgets, invoices, contracts
