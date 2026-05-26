import json
import csv
from datetime import datetime
from typing import List, Dict, Tuple, Any
from pathlib import Path
import pandas as pd

from .services import (
    create_contract_version, record_down_payment, create_balance_plan,
    create_gps_order, create_delivery, create_refund,
    update_balance_settlement, update_gps_order_status,
    cancel_gps_orders_for_contract, lock_delivery
)
from .models import Contract


def parse_date(value: Any) -> datetime:
    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, datetime):
        return value
    value = str(value).strip()
    for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d", "%Y%m%d"]:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(value).to_pydatetime()
    except:
        raise ValueError(f"无法解析日期: {value}")


def parse_float(value: Any) -> float:
    if value is None or str(value).strip() == "":
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    value = str(value).replace(",", "").strip()
    return float(value)


def parse_int(value: Any) -> int:
    if value is None or str(value).strip() == "":
        return 0
    return int(float(str(value).replace(",", "").strip()))


def parse_bool(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    value = str(value).strip().lower()
    return value in ["true", "1", "yes", "是", "y"]


class ImportResult:
    def __init__(self):
        self.success_count = 0
        self.failure_count = 0
        self.errors: List[Dict] = []
        self.created_ids: List[Tuple[str, int]] = []

    def add_success(self, entity_type: str, entity_id: int):
        self.success_count += 1
        self.created_ids.append((entity_type, entity_id))

    def add_error(self, row_index: int, error: str, data: Dict = None):
        self.failure_count += 1
        self.errors.append({
            "row": row_index,
            "error": error,
            "data": data,
        })


def import_contracts_from_excel(db, file_path: str, source: str = "excel_import",
                                 operator: str = None) -> ImportResult:
    result = ImportResult()
    df = pd.read_excel(file_path)

    for idx, row in df.iterrows():
        try:
            contract_data = {
                "contract_no": str(row.get("合同编号", "")),
                "vin": str(row.get("VIN", "")),
                "customer_name": str(row.get("客户姓名", "")),
                "customer_phone": str(row.get("客户电话", "")),
                "total_amount": parse_float(row.get("合同总价", 0)),
                "down_payment_amount": parse_float(row.get("首付金额", 0)),
                "balance_amount": parse_float(row.get("尾款金额", 0)),
                "status": str(row.get("合同状态", "active")),
                "signed_at": parse_date(row.get("签约日期")),
                "effective_at": parse_date(row.get("生效日期")),
                "remark": str(row.get("备注", "")),
            }

            required_fields = ["contract_no", "vin", "customer_name",
                               "total_amount", "down_payment_amount", "balance_amount"]
            for field in required_fields:
                if not contract_data[field]:
                    raise ValueError(f"缺少必填字段: {field}")

            contract = create_contract_version(db, contract_data, source=source, operator=operator)
            result.add_success("Contract", contract.id)

            if parse_float(row.get("已付首付", 0)) > 0:
                payment_data = {
                    "contract_no": contract_data["contract_no"],
                    "transaction_no": str(row.get("首付交易号", "")),
                    "amount": parse_float(row.get("已付首付", 0)),
                    "paid_at": parse_date(row.get("首付到账日期")),
                    "payer": str(row.get("付款人", "")),
                    "payment_method": str(row.get("付款方式", "")),
                    "status": "paid",
                    "remark": str(row.get("首付备注", "")),
                }
                record_down_payment(db, payment_data, source=source, operator=operator)

            if parse_float(row.get("尾款金额", 0)) > 0:
                plan_data = {
                    "contract_no": contract_data["contract_no"],
                    "plan_no": str(row.get("尾款计划号", "")),
                    "total_balance": parse_float(row.get("尾款金额", 0)),
                    "installment_count": parse_int(row.get("分期期数", 1)),
                    "first_payment_date": parse_date(row.get("首次还款日")),
                    "monthly_amount": parse_float(row.get("月供金额", 0)),
                    "status": str(row.get("尾款状态", "pending")),
                    "remark": str(row.get("尾款备注", "")),
                }
                create_balance_plan(db, plan_data, source=source, operator=operator)

            if str(row.get("GPS工单号", "")).strip():
                gps_data = {
                    "order_no": str(row.get("GPS工单号", "")),
                    "vin": contract_data["vin"],
                    "contract_no": contract_data["contract_no"],
                    "type": str(row.get("GPS类型", "install")),
                    "status": str(row.get("GPS状态", "pending")),
                    "scheduled_at": parse_date(row.get("GPS预约时间")),
                    "completed_at": parse_date(row.get("GPS完成时间")),
                    "technician": str(row.get("GPS技师", "")),
                    "device_no": str(row.get("GPS设备号", "")),
                    "remark": str(row.get("GPS备注", "")),
                }
                create_gps_order(db, gps_data, source=source, operator=operator)

            if str(row.get("交车单号", "")).strip():
                delivery_data = {
                    "contract_no": contract_data["contract_no"],
                    "delivery_no": str(row.get("交车单号", "")),
                    "vin": contract_data["vin"],
                    "delivered_at": parse_date(row.get("交车日期")),
                    "down_payment_verified": parse_bool(row.get("首付已核实", False)),
                    "gps_installed": parse_bool(row.get("GPS已安装", False)),
                    "balance_verified": parse_bool(row.get("尾款已核实", False)),
                    "delivered_by": str(row.get("交车人", "")),
                    "received_by": str(row.get("接车人", "")),
                    "remark": str(row.get("交车备注", "")),
                }
                create_delivery(db, delivery_data, source=source, operator=operator)

            if parse_float(row.get("退款金额", 0)) > 0:
                refund_data = {
                    "contract_no": contract_data["contract_no"],
                    "refund_no": str(row.get("退款单号", "")),
                    "amount": parse_float(row.get("退款金额", 0)),
                    "refund_type": str(row.get("退款类型", "full")),
                    "reason": str(row.get("退款原因", "")),
                    "status": str(row.get("退款状态", "pending")),
                    "refunded_at": parse_date(row.get("退款日期")),
                    "recipient": str(row.get("退款收款人", "")),
                    "remark": str(row.get("退款备注", "")),
                }
                create_refund(db, refund_data, source=source, operator=operator)

            db.commit()
        except Exception as e:
            db.rollback()
            result.add_error(idx + 2, str(e), row.to_dict())

    return result


def _parse_contract_dates(data: Dict) -> Dict:
    date_fields = ["signed_at", "effective_at", "paid_at", "first_payment_date",
                   "scheduled_at", "completed_at", "delivered_at", "refunded_at",
                   "actual_settled_at"]
    for field in date_fields:
        if field in data and data[field] is not None:
            data[field] = parse_date(data[field])
    return data


def import_contracts_from_json(db, file_path: str, source: str = "json_import",
                                operator: str = None) -> ImportResult:
    result = ImportResult()

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    contracts = data.get("contracts", [data] if isinstance(data, dict) else data)

    for idx, contract_data in enumerate(contracts):
        try:
            contract_data = _parse_contract_dates(contract_data)
            contract = create_contract_version(db, contract_data, source=source, operator=operator)
            result.add_success("Contract", contract.id)

            for payment in contract_data.get("down_payments", []):
                payment = _parse_contract_dates(payment)
                payment["contract_no"] = contract_data["contract_no"]
                record_down_payment(db, payment, source=source, operator=operator)

            for plan in contract_data.get("balance_plans", []):
                plan = _parse_contract_dates(plan)
                plan["contract_no"] = contract_data["contract_no"]
                actual_settled_at = plan.pop("actual_settled_at", None)
                actual_settled_amount = plan.pop("actual_settled_amount", None)
                balance_plan = create_balance_plan(db, plan, source=source, operator=operator)
                if actual_settled_at and actual_settled_amount:
                    update_balance_settlement(
                        db, balance_plan.id, actual_settled_at,
                        actual_settled_amount, source=source, operator=operator
                    )

            for gps in contract_data.get("gps_orders", []):
                gps = _parse_contract_dates(gps)
                if "vin" not in gps:
                    gps["vin"] = contract_data["vin"]
                if "contract_no" not in gps:
                    gps["contract_no"] = contract_data["contract_no"]
                create_gps_order(db, gps, source=source, operator=operator)

            for delivery in contract_data.get("deliveries", []):
                delivery = _parse_contract_dates(delivery)
                delivery["contract_no"] = contract_data["contract_no"]
                create_delivery(db, delivery, source=source, operator=operator)

            for refund in contract_data.get("refunds", []):
                refund = _parse_contract_dates(refund)
                refund["contract_no"] = contract_data["contract_no"]
                create_refund(db, refund, source=source, operator=operator)

            db.commit()
        except Exception as e:
            db.rollback()
            result.add_error(idx + 1, str(e), contract_data)

    return result


def batch_process_actions(db, actions: List[Dict], source: str = "batch",
                          operator: str = None) -> ImportResult:
    result = ImportResult()

    for idx, action in enumerate(actions):
        try:
            action_type = action.get("action")
            data = action.get("data", {})
            data = _parse_contract_dates(data)

            if action_type == "create_contract":
                entity = create_contract_version(db, data, source=source, operator=operator)
            elif action_type == "record_down_payment":
                entity = record_down_payment(db, data, source=source, operator=operator)
            elif action_type == "create_balance_plan":
                entity = create_balance_plan(db, data, source=source, operator=operator)
            elif action_type == "settle_balance":
                entity = update_balance_settlement(
                    db, data["plan_id"],
                    parse_date(data["settled_at"]),
                    parse_float(data["amount"]),
                    source=source, operator=operator
                )
            elif action_type == "create_gps_order":
                entity = create_gps_order(db, data, source=source, operator=operator)
            elif action_type == "update_gps_status":
                entity = update_gps_order_status(
                    db, data["order_id"], data["status"],
                    parse_date(data.get("completed_at")),
                    data.get("device_no"),
                    source=source, operator=operator
                )
            elif action_type == "create_delivery":
                entity = create_delivery(db, data, source=source, operator=operator)
            elif action_type == "lock_delivery":
                entity = lock_delivery(db, data["delivery_id"], source=source, operator=operator)
            elif action_type == "create_refund":
                entity = create_refund(db, data, source=source, operator=operator)
                cancel_gps_orders_for_contract(db, entity.contract_id, source=source, operator=operator)
            elif action_type == "cancel_gps_orders":
                entities = cancel_gps_orders_for_contract(
                    db, data["contract_id"], source=source, operator=operator
                )
                for e in entities:
                    result.add_success("GpsWorkOrder", e.id)
                db.commit()
                continue
            else:
                raise ValueError(f"未知的操作类型: {action_type}")

            result.add_success(action_type, entity.id)
            db.commit()
        except Exception as e:
            db.rollback()
            result.add_error(idx + 1, str(e), action)

    return result
