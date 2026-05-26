import json
import csv
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path
import pandas as pd

from .models import Contract, Vehicle, DownPayment, BalancePlan, GpsWorkOrder, Delivery, Refund, AuditLog
from .validation import validate_contract, summarize_issues, group_issues_by_severity


def get_contract_summary(db, contract: Contract) -> Dict:
    total_down_paid = sum(p.amount for p in contract.down_payments if p.status == "paid")
    total_balance_settled = sum(p.actual_settled_amount or 0 for p in contract.balance_plans if p.status == "settled")

    gps_installed = any(
        o.status == "completed" and o.type == "install"
        for o in contract.vehicle.gps_orders if o.contract_id == contract.id
    ) if contract.vehicle else False

    deliveries = sorted(contract.deliveries, key=lambda d: d.created_at, reverse=True)
    latest_delivery = deliveries[0] if deliveries else None

    issues = validate_contract(db, contract)
    issue_summary = summarize_issues(issues)

    return {
        "合同编号": contract.contract_no,
        "版本号": contract.version,
        "VIN": contract.vin,
        "客户姓名": contract.customer_name,
        "客户电话": contract.customer_phone or "",
        "合同总价": contract.total_amount,
        "首付金额": contract.down_payment_amount,
        "尾款金额": contract.balance_amount,
        "已付首付": total_down_paid,
        "首付差额": contract.down_payment_amount - total_down_paid,
        "已到账尾款": total_balance_settled,
        "尾款差额": contract.balance_amount - total_balance_settled,
        "合同状态": contract.status,
        "签约日期": contract.signed_at.strftime("%Y-%m-%d") if contract.signed_at else "",
        "生效日期": contract.effective_at.strftime("%Y-%m-%d") if contract.effective_at else "",
        "GPS已安装": "是" if gps_installed else "否",
        "已交车": "是" if latest_delivery and latest_delivery.delivered_at else "否",
        "交车日期": latest_delivery.delivered_at.strftime("%Y-%m-%d") if latest_delivery and latest_delivery.delivered_at else "",
        "交车已锁定": "是" if latest_delivery and latest_delivery.is_locked else "否",
        "存在退款": "是" if contract.refunds else "否",
        "退款金额": sum(r.amount for r in contract.refunds if r.status in ["approved", "completed"]),
        "异常数量": issue_summary["total"],
        "高优先级异常": issue_summary["high_count"],
        "中优先级异常": issue_summary["medium_count"],
        "低优先级异常": issue_summary["low_count"],
        "数据来源": contract.source or "",
        "创建时间": contract.created_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


def export_contracts_to_excel(db, output_path: str, status_filter: Optional[str] = None) -> str:
    contracts = db.query(Contract).filter(Contract.is_current == True)
    if status_filter:
        contracts = contracts.filter(Contract.status == status_filter)
    contracts = contracts.all()

    data = [get_contract_summary(db, c) for c in contracts]
    df = pd.DataFrame(data)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_path = output_path.replace(".xlsx", f"_{timestamp}.xlsx")
    df.to_excel(final_path, index=False, sheet_name="合同台账")

    return final_path


def export_issues_to_excel(db, output_path: str, contract_no: Optional[str] = None) -> str:
    from .validation import validate_all_contracts

    if contract_no:
        contract = db.query(Contract).filter(
            Contract.contract_no == contract_no,
            Contract.is_current == True
        ).first()
        issues = validate_contract(db, contract) if contract else []
    else:
        issues = validate_all_contracts(db)

    data = []
    for issue in issues:
        data.append({
            "合同编号": issue.contract_no or "",
            "异常类型": issue.issue_type,
            "严重程度": issue.severity,
            "消息": issue.message,
            "实体类型": issue.entity_type or "",
            "实体ID": issue.entity_id or "",
            "详情": json.dumps(issue.details, ensure_ascii=False),
        })

    df = pd.DataFrame(data)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_path = output_path.replace(".xlsx", f"_{timestamp}.xlsx")
    df.to_excel(final_path, index=False, sheet_name="异常清单")

    return final_path


def export_audit_log_to_excel(db, output_path: str, entity_type: Optional[str] = None,
                               entity_id: Optional[int] = None, limit: int = 10000) -> str:
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    logs = query.limit(limit).all()

    data = []
    for log in logs:
        data.append({
            "时间": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "实体类型": log.entity_type,
            "实体ID": log.entity_id,
            "操作": log.action,
            "字段": log.field_name or "",
            "原值": log.old_value or "",
            "新值": log.new_value or "",
            "来源": log.source or "",
            "操作人": log.operator or "",
            "备注": log.remark or "",
        })

    df = pd.DataFrame(data)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    final_path = output_path.replace(".xlsx", f"_{timestamp}.xlsx")
    df.to_excel(final_path, index=False, sheet_name="操作日志")

    return final_path


def export_full_report(db, output_path: str) -> Dict[str, str]:
    from .validation import validate_all_contracts

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_path = output_path.replace(".xlsx", "")

    contracts_path = f"{base_path}_合同台账_{timestamp}.xlsx"
    issues_path = f"{base_path}_异常清单_{timestamp}.xlsx"
    audit_path = f"{base_path}_操作日志_{timestamp}.xlsx"

    contracts = db.query(Contract).filter(Contract.is_current == True).all()
    contract_data = [get_contract_summary(db, c) for c in contracts]
    pd.DataFrame(contract_data).to_excel(contracts_path, index=False, sheet_name="合同台账")

    issues = validate_all_contracts(db)
    issue_data = []
    for issue in issues:
        issue_data.append({
            "合同编号": issue.contract_no or "",
            "异常类型": issue.issue_type,
            "严重程度": issue.severity,
            "消息": issue.message,
            "实体类型": issue.entity_type or "",
            "实体ID": issue.entity_id or "",
            "详情": json.dumps(issue.details, ensure_ascii=False),
        })
    pd.DataFrame(issue_data).to_excel(issues_path, index=False, sheet_name="异常清单")

    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10000).all()
    log_data = []
    for log in logs:
        log_data.append({
            "时间": log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "实体类型": log.entity_type,
            "实体ID": log.entity_id,
            "操作": log.action,
            "字段": log.field_name or "",
            "原值": log.old_value or "",
            "新值": log.new_value or "",
            "来源": log.source or "",
            "操作人": log.operator or "",
            "备注": log.remark or "",
        })
    pd.DataFrame(log_data).to_excel(audit_path, index=False, sheet_name="操作日志")

    return {
        "contracts": contracts_path,
        "issues": issues_path,
        "audit_log": audit_path,
    }


def get_statistics(db) -> Dict:
    contracts = db.query(Contract).filter(Contract.is_current == True).all()

    status_counts = {}
    for c in contracts:
        status_counts[c.status] = status_counts.get(c.status, 0) + 1

    total_amount = sum(c.total_amount for c in contracts)
    total_down = sum(c.down_payment_amount for c in contracts)
    total_balance = sum(c.balance_amount for c in contracts)

    actual_down = sum(
        p.amount for c in contracts for p in c.down_payments if p.status == "paid"
    )
    actual_balance = sum(
        p.actual_settled_amount or 0 for c in contracts for p in c.balance_plans if p.status == "settled"
    )

    delivered = sum(
        1 for c in contracts for d in c.deliveries if d.delivered_at
    )
    locked = sum(
        1 for c in contracts for d in c.deliveries if d.is_locked
    )

    refunded = sum(1 for c in contracts if c.refunds)
    refund_amount = sum(
        r.amount for c in contracts for r in c.refunds if r.status in ["approved", "completed"]
    )

    from .validation import validate_all_contracts
    issues = validate_all_contracts(db)
    issue_summary = summarize_issues(issues)

    return {
        "合同总数": len(contracts),
        "合同状态分布": status_counts,
        "合同总金额": total_amount,
        "应收首付总额": total_down,
        "应收尾款总额": total_balance,
        "已收首付总额": actual_down,
        "已收尾款总额": actual_balance,
        "待收首付": total_down - actual_down,
        "待收尾款": total_balance - actual_balance,
        "已交车数量": delivered,
        "已锁定交车数量": locked,
        "已退款合同数": refunded,
        "退款总金额": refund_amount,
        "异常统计": issue_summary,
    }
