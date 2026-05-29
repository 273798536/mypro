"""P2P历史兑付清算 - 数据加载器

支持从CSV目录加载：投资合同、兑付记录、凭证索引、投资人名单、争议备注

CSV格式约定（与 exporter.py 导出格式一致）：

投资人 investors.csv:
  investor_id,name,aliases,id_card,merged_into,notes

投资合同 contracts.csv:
  contract_id,investor_id,principal_amount,interest_rate,start_date,maturity_date,source,notes

兑付记录 repayments.csv:
  repayment_id,contract_id,amount,repayment_type,date,voucher_id,status,source,notes

凭证索引 vouchers.csv:
  voucher_id,contract_id,file_ref,content_hash,upload_date,voucher_type,status,claimed_by,duplicate_of,source,notes

争议备注 disputes.csv（可选，用于导入已有争议记录）:
  dispute_id,related_entity_id,related_entity_type,dispute_type,description,evidence,status,created_at,resolved_at,resolution_notes
"""

import csv
import os
import ast
from typing import Dict, List

from models import (
    Dataset, Investor, Contract, Voucher, Repayment,
    VoucherStatus, RepaymentStatus, RepaymentType,
    DisputeType, DisputeStatus,
    Dispute, AuditEntry,
    voucher_hash,
)


def _parse_list(s: str) -> list:
    """解析CSV中的列表字段（如evidence,aliases）"""
    if not s:
        return []
    try:
        return ast.literal_eval(s)
    except (ValueError, SyntaxError):
        return [x.strip() for x in s.split(";") if x.strip()]


def _parse_float(s: str, default: float = 0.0) -> float:
    try:
        return float(s) if s else default
    except (ValueError, TypeError):
        return default


def _parse_enum(enum_cls, s: str, default):
    if not s:
        return default
    try:
        return enum_cls(s)
    except ValueError:
        return default


def load_from_csv(data_dir: str) -> Dataset:
    """从CSV目录加载所有数据文件"""
    ds = Dataset()

    # 1. 投资人名单
    inv_path = os.path.join(data_dir, "investors.csv")
    if os.path.exists(inv_path):
        with open(inv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                inv = Investor(
                    investor_id=row["investor_id"],
                    name=row["name"],
                    aliases=_parse_list(row.get("aliases", "")),
                    id_card=row.get("id_card") or None,
                    merged_into=row.get("merged_into") or None,
                    notes=row.get("notes", "")
                )
                ds.investors[inv.investor_id] = inv

    # 2. 投资合同
    c_path = os.path.join(data_dir, "contracts.csv")
    if os.path.exists(c_path):
        with open(c_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                contract = Contract(
                    contract_id=row["contract_id"],
                    investor_id=row["investor_id"],
                    principal_amount=_parse_float(row["principal_amount"]),
                    interest_rate=_parse_float(row["interest_rate"]),
                    start_date=row["start_date"],
                    maturity_date=row["maturity_date"],
                    source=row.get("source", ""),
                    notes=row.get("notes", "")
                )
                ds.contracts[contract.contract_id] = contract

    # 3. 兑付记录
    r_path = os.path.join(data_dir, "repayments.csv")
    if os.path.exists(r_path):
        with open(r_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rep = Repayment(
                    repayment_id=row["repayment_id"],
                    contract_id=row["contract_id"],
                    amount=_parse_float(row["amount"]),
                    repayment_type=_parse_enum(RepaymentType, row["repayment_type"], RepaymentType.PRINCIPAL),
                    date=row["date"],
                    voucher_id=row.get("voucher_id") or None,
                    status=_parse_enum(RepaymentStatus, row.get("status"), RepaymentStatus.PENDING),
                    source=row.get("source", ""),
                    notes=row.get("notes", "")
                )
                ds.repayments[rep.repayment_id] = rep

    # 4. 凭证索引
    v_path = os.path.join(data_dir, "vouchers.csv")
    if os.path.exists(v_path):
        with open(v_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                v = Voucher(
                    voucher_id=row["voucher_id"],
                    contract_id=row["contract_id"],
                    file_ref=row["file_ref"],
                    content_hash=row.get("content_hash") or voucher_hash(row["voucher_id"]),
                    upload_date=row["upload_date"],
                    voucher_type=row.get("voucher_type", "receipt"),
                    status=_parse_enum(VoucherStatus, row.get("status"), VoucherStatus.VALID),
                    claimed_by=row.get("claimed_by") or None,
                    duplicate_of=row.get("duplicate_of") or None,
                    source=row.get("source", ""),
                    notes=row.get("notes", "")
                )
                ds.vouchers[v.voucher_id] = v

    # 5. 争议备注（可选）
    d_path = os.path.join(data_dir, "disputes.csv")
    if os.path.exists(d_path):
        with open(d_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                disp = Dispute(
                    dispute_id=row["dispute_id"],
                    related_entity_id=row["related_entity_id"],
                    related_entity_type=row["related_entity_type"],
                    dispute_type=_parse_enum(DisputeType, row["dispute_type"], DisputeType.AMOUNT_MISMATCH),
                    description=row["description"],
                    evidence=_parse_list(row.get("evidence", "")),
                    status=_parse_enum(DisputeStatus, row.get("status"), DisputeStatus.OPEN),
                    created_at=row.get("created_at", ""),
                    resolved_at=row.get("resolved_at") or None,
                    resolution_notes=row.get("resolution_notes", "")
                )
                ds.add_dispute(disp)

    return ds


def load_dataset(source: str = None) -> Dataset:
    """加载数据集：优先从指定目录加载，否则使用样例数据"""
    if source and os.path.isdir(source):
        print(f"▶ 从目录加载数据: {source}")
        ds = load_from_csv(source)
        print(f"  投资人: {len(ds.investors)} 合同: {len(ds.contracts)} 凭证: {len(ds.vouchers)} 兑付: {len(ds.repayments)}")
        if not ds.investors and not ds.contracts:
            print("  ⚠ 未加载到数据，回退到样例数据")
            return build_sample_dataset()
        return ds
    print("▶ 使用内置样例数据")
    return build_sample_dataset()


# 延迟导入避免循环
from data import build_sample_dataset
