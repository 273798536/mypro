import os
import pandas as pd
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from pathlib import Path

from .models import (
    PreSaleOrder,
    DepositRecord,
    BalanceRecord,
    OrderStatus,
)


COLUMN_MAPPINGS = {
    "order": {
        "order_no": ["订单号", "预售订单号", "order_no", "order_id"],
        "product_name": ["商品名称", "商品", "product_name", "product"],
        "total_amount": ["订单总额", "商品总价", "总金额", "total_amount", "amount"],
        "deposit_amount": ["定金金额", "定金", "deposit_amount", "deposit"],
        "balance_amount": ["尾款金额", "尾款", "balance_amount", "balance"],
        "deposit_deadline": ["定金截止时间", "定金支付截止", "deposit_deadline"],
        "balance_deadline": ["尾款截止时间", "尾款支付截止", "balance_deadline"],
        "buyer_name": ["买家名称", "买家", "收货人", "buyer_name", "buyer"],
        "status": ["订单状态", "状态", "status", "order_status"],
        "create_time": ["创建时间", "下单时间", "create_time", "order_time"],
        "remark": ["备注", "remark"],
    },
    "deposit": {
        "transaction_no": ["交易流水号", "流水号", "transaction_no", "transaction_id", "pay_no"],
        "order_no": ["订单号", "预售订单号", "关联订单号", "order_no", "order_id"],
        "pay_amount": ["支付金额", "金额", "pay_amount", "amount"],
        "pay_time": ["支付时间", "交易时间", "pay_time", "transaction_time"],
        "pay_channel": ["支付渠道", "支付方式", "pay_channel", "channel"],
        "payer": ["付款人", "支付账号", "payer"],
        "remark": ["备注", "remark"],
    },
    "balance": {
        "transaction_no": ["交易流水号", "流水号", "transaction_no", "transaction_id", "pay_no"],
        "order_no": ["订单号", "预售订单号", "关联订单号", "order_no", "order_id"],
        "pay_amount": ["支付金额", "金额", "pay_amount", "amount"],
        "pay_time": ["支付时间", "交易时间", "pay_time", "transaction_time"],
        "pay_channel": ["支付渠道", "支付方式", "pay_channel", "channel"],
        "payer": ["付款人", "支付账号", "payer"],
        "remark": ["备注", "remark"],
    },
}

STATUS_MAPPING = {
    "待付定金": OrderStatus.PENDING_DEPOSIT,
    "定金已付": OrderStatus.DEPOSIT_PAID,
    "待付尾款": OrderStatus.PENDING_BALANCE,
    "尾款已付": OrderStatus.BALANCE_PAID,
    "交易完成": OrderStatus.COMPLETED,
    "定金不退": OrderStatus.DEPOSIT_NOT_REFUND,
    "尾款超时": OrderStatus.BALANCE_TIMEOUT,
    "已取消": OrderStatus.CANCELLED,
}


def _find_file(directory: str, keywords: List[str]) -> Optional[str]:
    if not os.path.exists(directory):
        return None
    
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if not os.path.isfile(filepath):
            continue
        
        name_lower = filename.lower()
        if any(kw.lower() in name_lower for kw in keywords):
            return filepath
    
    return None


def _read_file(filepath: str) -> pd.DataFrame:
    ext = Path(filepath).suffix.lower()
    if ext in ['.xlsx', '.xls']:
        return pd.read_excel(filepath)
    elif ext == '.csv':
        try:
            return pd.read_csv(filepath, encoding='utf-8-sig')
        except UnicodeDecodeError:
            return pd.read_csv(filepath, encoding='gbk')
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def _map_columns(df: pd.DataFrame, mapping_config: Dict) -> Dict[str, str]:
    column_map = {}
    df_columns = [str(col).strip() for col in df.columns]
    
    for target_field, possible_names in mapping_config.items():
        for possible_name in possible_names:
            for df_col in df_columns:
                if possible_name.lower() == df_col.lower():
                    column_map[target_field] = df_col
                    break
            if target_field in column_map:
                break
    
    return column_map


def _parse_datetime(value) -> Optional[datetime]:
    if pd.isna(value) or value is None or str(value).strip() == '':
        return None
    
    if isinstance(value, datetime):
        return value
    
    try:
        return pd.to_datetime(value).to_pydatetime()
    except (ValueError, TypeError):
        return None


def _parse_float(value) -> float:
    if pd.isna(value) or value is None or str(value).strip() == '':
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def _parse_status(value) -> OrderStatus:
    if pd.isna(value) or value is None:
        return OrderStatus.PENDING_DEPOSIT
    
    value_str = str(value).strip()
    return STATUS_MAPPING.get(value_str, OrderStatus.PENDING_DEPOSIT)


def load_orders(input_dir: str) -> Tuple[List[PreSaleOrder], Optional[str]]:
    filepath = _find_file(input_dir, ["order", "订单", "预售订单"])
    if not filepath:
        return [], None
    
    df = _read_file(filepath)
    col_map = _map_columns(df, COLUMN_MAPPINGS["order"])
    
    required_fields = ["order_no", "product_name", "total_amount", "deposit_amount", "balance_amount"]
    missing_fields = [f for f in required_fields if f not in col_map]
    if missing_fields:
        raise ValueError(
            f"预售订单表缺少必要列: {', '.join(missing_fields)}。"
            f"已识别列: {list(col_map.keys())}，文件列名: {list(df.columns)}"
        )
    
    orders = []
    for _, row in df.iterrows():
        order_no = str(row[col_map["order_no"]]).strip()
        if not order_no or order_no == 'nan':
            continue
        
        order = PreSaleOrder(
            order_no=order_no,
            product_name=str(row[col_map["product_name"]]).strip(),
            total_amount=_parse_float(row[col_map["total_amount"]]),
            deposit_amount=_parse_float(row[col_map["deposit_amount"]]),
            balance_amount=_parse_float(row[col_map["balance_amount"]]),
            deposit_deadline=_parse_datetime(row[col_map["deposit_deadline"]]) if "deposit_deadline" in col_map else None,
            balance_deadline=_parse_datetime(row[col_map["balance_deadline"]]) if "balance_deadline" in col_map else None,
            buyer_name=str(row[col_map["buyer_name"]]).strip() if "buyer_name" in col_map else "",
            status=_parse_status(row[col_map["status"]]) if "status" in col_map else OrderStatus.PENDING_DEPOSIT,
            create_time=_parse_datetime(row[col_map["create_time"]]) if "create_time" in col_map else None,
            remark=str(row[col_map["remark"]]).strip() if "remark" in col_map else "",
        )
        orders.append(order)
    
    return orders, filepath


def load_deposits(input_dir: str) -> Tuple[List[DepositRecord], Optional[str]]:
    filepath = _find_file(input_dir, ["deposit", "定金", "定金流水"])
    if not filepath:
        return [], None
    
    df = _read_file(filepath)
    col_map = _map_columns(df, COLUMN_MAPPINGS["deposit"])
    
    required_fields = ["transaction_no", "order_no", "pay_amount"]
    missing_fields = [f for f in required_fields if f not in col_map]
    if missing_fields:
        raise ValueError(
            f"定金流水表缺少必要列: {', '.join(missing_fields)}。"
            f"已识别列: {list(col_map.keys())}，文件列名: {list(df.columns)}"
        )
    
    deposits = []
    for _, row in df.iterrows():
        transaction_no = str(row[col_map["transaction_no"]]).strip()
        order_no = str(row[col_map["order_no"]]).strip()
        
        if not transaction_no or transaction_no == 'nan':
            continue
        if not order_no or order_no == 'nan':
            continue
        
        deposit = DepositRecord(
            transaction_no=transaction_no,
            order_no=order_no,
            pay_amount=_parse_float(row[col_map["pay_amount"]]),
            pay_time=_parse_datetime(row[col_map["pay_time"]]) if "pay_time" in col_map else None,
            pay_channel=str(row[col_map["pay_channel"]]).strip() if "pay_channel" in col_map else "",
            payer=str(row[col_map["payer"]]).strip() if "payer" in col_map else "",
            remark=str(row[col_map["remark"]]).strip() if "remark" in col_map else "",
        )
        deposits.append(deposit)
    
    return deposits, filepath


def load_balances(input_dir: str) -> Tuple[List[BalanceRecord], Optional[str]]:
    filepath = _find_file(input_dir, ["balance", "尾款", "尾款支付"])
    if not filepath:
        return [], None
    
    df = _read_file(filepath)
    col_map = _map_columns(df, COLUMN_MAPPINGS["balance"])
    
    required_fields = ["transaction_no", "order_no", "pay_amount"]
    missing_fields = [f for f in required_fields if f not in col_map]
    if missing_fields:
        raise ValueError(
            f"尾款支付表缺少必要列: {', '.join(missing_fields)}。"
            f"已识别列: {list(col_map.keys())}，文件列名: {list(df.columns)}"
        )
    
    balances = []
    for _, row in df.iterrows():
        transaction_no = str(row[col_map["transaction_no"]]).strip()
        order_no = str(row[col_map["order_no"]]).strip()
        
        if not transaction_no or transaction_no == 'nan':
            continue
        if not order_no or order_no == 'nan':
            continue
        
        balance = BalanceRecord(
            transaction_no=transaction_no,
            order_no=order_no,
            pay_amount=_parse_float(row[col_map["pay_amount"]]),
            pay_time=_parse_datetime(row[col_map["pay_time"]]) if "pay_time" in col_map else None,
            pay_channel=str(row[col_map["pay_channel"]]).strip() if "pay_channel" in col_map else "",
            payer=str(row[col_map["payer"]]).strip() if "payer" in col_map else "",
            remark=str(row[col_map["remark"]]).strip() if "remark" in col_map else "",
        )
        balances.append(balance)
    
    return balances, filepath


def load_all_data(input_dir: str) -> Dict:
    orders, order_file = load_orders(input_dir)
    deposits, deposit_file = load_deposits(input_dir)
    balances, balance_file = load_balances(input_dir)
    
    return {
        "orders": orders,
        "deposits": deposits,
        "balances": balances,
        "order_file": order_file,
        "deposit_file": deposit_file,
        "balance_file": balance_file,
    }
