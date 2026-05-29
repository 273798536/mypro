"""P2P历史兑付清算 - 状态持久化

支持将处理后的数据集（含争议、修正日志）保存为JSON，
避免每次重新检测，方便分步处理和结果留存。
"""

import json
import os
from typing import Dict, List

from models import (
    Dataset, Investor, Contract, Voucher, Repayment, Dispute, AuditEntry,
    VoucherStatus, RepaymentStatus, RepaymentType,
    DisputeType, DisputeStatus,
)


def _enum_value(obj):
    """将枚举值转为字符串"""
    if hasattr(obj, "value"):
        return obj.value
    return obj


def _dataset_to_dict(ds: Dataset) -> dict:
    """将Dataset序列化为dict"""
    return {
        "investors": [
            {
                "investor_id": inv.investor_id,
                "name": inv.name,
                "aliases": inv.aliases,
                "id_card": inv.id_card,
                "merged_into": inv.merged_into,
                "notes": inv.notes,
            }
            for inv in ds.investors.values()
        ],
        "contracts": [
            {
                "contract_id": c.contract_id,
                "investor_id": c.investor_id,
                "principal_amount": c.principal_amount,
                "interest_rate": c.interest_rate,
                "start_date": c.start_date,
                "maturity_date": c.maturity_date,
                "source": c.source,
                "notes": c.notes,
            }
            for c in ds.contracts.values()
        ],
        "vouchers": [
            {
                "voucher_id": v.voucher_id,
                "contract_id": v.contract_id,
                "file_ref": v.file_ref,
                "content_hash": v.content_hash,
                "upload_date": v.upload_date,
                "voucher_type": v.voucher_type,
                "status": _enum_value(v.status),
                "claimed_by": v.claimed_by,
                "duplicate_of": v.duplicate_of,
                "source": v.source,
                "notes": v.notes,
            }
            for v in ds.vouchers.values()
        ],
        "repayments": [
            {
                "repayment_id": r.repayment_id,
                "contract_id": r.contract_id,
                "amount": r.amount,
                "repayment_type": _enum_value(r.repayment_type),
                "date": r.date,
                "voucher_id": r.voucher_id,
                "status": _enum_value(r.status),
                "source": r.source,
                "notes": r.notes,
            }
            for r in ds.repayments.values()
        ],
        "disputes": [
            {
                "dispute_id": d.dispute_id,
                "related_entity_id": d.related_entity_id,
                "related_entity_type": d.related_entity_type,
                "dispute_type": _enum_value(d.dispute_type),
                "description": d.description,
                "evidence": d.evidence,
                "status": _enum_value(d.status),
                "created_at": d.created_at,
                "resolved_at": d.resolved_at,
                "resolution_notes": d.resolution_notes,
            }
            for d in ds.disputes
        ],
        "audit_log": [
            {
                "timestamp": a.timestamp,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "field": a.field,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "operator": a.operator,
                "reason": a.reason,
            }
            for a in ds.audit_log
        ],
    }


def _dict_to_dataset(data: dict) -> Dataset:
    """从dict反序列化为Dataset"""
    ds = Dataset()

    for inv_data in data.get("investors", []):
        inv = Investor(
            investor_id=inv_data["investor_id"],
            name=inv_data["name"],
            aliases=inv_data.get("aliases", []),
            id_card=inv_data.get("id_card"),
            merged_into=inv_data.get("merged_into"),
            notes=inv_data.get("notes", ""),
        )
        ds.investors[inv.investor_id] = inv

    for c_data in data.get("contracts", []):
        c = Contract(
            contract_id=c_data["contract_id"],
            investor_id=c_data["investor_id"],
            principal_amount=c_data["principal_amount"],
            interest_rate=c_data["interest_rate"],
            start_date=c_data["start_date"],
            maturity_date=c_data["maturity_date"],
            source=c_data.get("source", ""),
            notes=c_data.get("notes", ""),
        )
        ds.contracts[c.contract_id] = c

    for v_data in data.get("vouchers", []):
        v = Voucher(
            voucher_id=v_data["voucher_id"],
            contract_id=v_data["contract_id"],
            file_ref=v_data["file_ref"],
            content_hash=v_data["content_hash"],
            upload_date=v_data["upload_date"],
            voucher_type=v_data.get("voucher_type", "receipt"),
            status=VoucherStatus(v_data.get("status", "valid")),
            claimed_by=v_data.get("claimed_by"),
            duplicate_of=v_data.get("duplicate_of"),
            source=v_data.get("source", ""),
            notes=v_data.get("notes", ""),
        )
        ds.vouchers[v.voucher_id] = v

    for r_data in data.get("repayments", []):
        r = Repayment(
            repayment_id=r_data["repayment_id"],
            contract_id=r_data["contract_id"],
            amount=r_data["amount"],
            repayment_type=RepaymentType(r_data.get("repayment_type", "principal")),
            date=r_data["date"],
            voucher_id=r_data.get("voucher_id"),
            status=RepaymentStatus(r_data.get("status", "pending")),
            source=r_data.get("source", ""),
            notes=r_data.get("notes", ""),
        )
        ds.repayments[r.repayment_id] = r

    for d_data in data.get("disputes", []):
        d = Dispute(
            dispute_id=d_data["dispute_id"],
            related_entity_id=d_data["related_entity_id"],
            related_entity_type=d_data["related_entity_type"],
            dispute_type=DisputeType(d_data.get("dispute_type", "amount_mismatch")),
            description=d_data["description"],
            evidence=d_data.get("evidence", []),
            status=DisputeStatus(d_data.get("status", "open")),
            created_at=d_data.get("created_at", ""),
            resolved_at=d_data.get("resolved_at"),
            resolution_notes=d_data.get("resolution_notes", ""),
        )
        ds.add_dispute(d)

    for a_data in data.get("audit_log", []):
        a = AuditEntry(
            timestamp=a_data["timestamp"],
            entity_type=a_data["entity_type"],
            entity_id=a_data["entity_id"],
            field=a_data["field"],
            old_value=a_data["old_value"],
            new_value=a_data["new_value"],
            operator=a_data.get("operator", "system"),
            reason=a_data.get("reason", ""),
        )
        ds.add_audit(a)

    return ds


def save_state(ds: Dataset, filepath: str) -> None:
    """保存数据集状态到JSON文件"""
    data = _dataset_to_dict(ds)
    os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_state(filepath: str) -> Dataset:
    """从JSON文件加载数据集状态"""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return _dict_to_dataset(data)
