import csv
import json
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd

from .models import (
    TraceInfo, Security, FeeItem, TradeConfirmation, CashFlow,
    TradeCalendar, Discrepancy, ReconcileContext, TradeSide, DiscrepancyType
)
from .exceptions import DataValidationError


def _parse_date(value: str) -> date:
    if not value or pd.isna(value):
        raise DataValidationError("日期不能为空")
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"]:
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    raise DataValidationError(f"无法解析日期: {value}")


def _parse_float(value: Any) -> float:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", "").replace("￥", "").replace("¥", "")
    if not s:
        return 0.0
    try:
        return float(s)
    except ValueError as e:
        raise DataValidationError(f"无法解析数字: {value}") from e


def _make_trace(file_path: str, line_num: int) -> TraceInfo:
    return TraceInfo(
        source_file=str(Path(file_path).name),
        source_line=line_num,
    )


def import_securities(file_path: str) -> Dict[str, Security]:
    securities: Dict[str, Security] = {}
    df = pd.read_csv(file_path, dtype=str).fillna("")
    for idx, row in df.iterrows():
        line_num = idx + 2
        trace = _make_trace(file_path, line_num)
        code = str(row.get("code", row.get("证券代码", ""))).strip()
        if not code:
            raise DataValidationError(f"证券代码不能为空 (第{line_num}行)")
        security = Security(
            code=code,
            name=str(row.get("name", row.get("证券名称", ""))).strip(),
            type=str(row.get("type", row.get("证券类型", "股票"))).strip(),
            trace=trace,
        )
        securities[code] = security
    return securities


def import_fee_items(file_path: str) -> Dict[str, FeeItem]:
    fee_items: Dict[str, FeeItem] = {}
    df = pd.read_csv(file_path, dtype=str).fillna("")
    for idx, row in df.iterrows():
        line_num = idx + 2
        trace = _make_trace(file_path, line_num)
        fee_code = str(row.get("fee_code", row.get("费用代码", ""))).strip()
        if not fee_code:
            raise DataValidationError(f"费用代码不能为空 (第{line_num}行)")
        fee = FeeItem(
            fee_code=fee_code,
            fee_name=str(row.get("fee_name", row.get("费用名称", ""))).strip(),
            category=str(row.get("category", row.get("费用类别", "其他"))).strip(),
            trace=trace,
        )
        fee_items[fee_code] = fee
    return fee_items


def import_trades(file_path: str) -> Dict[str, TradeConfirmation]:
    trades: Dict[str, TradeConfirmation] = {}
    df = pd.read_csv(file_path, dtype=str).fillna("")
    for idx, row in df.iterrows():
        line_num = idx + 2
        trace = _make_trace(file_path, line_num)
        trade_id = str(row.get("trade_id", row.get("成交编号", ""))).strip()
        if not trade_id:
            raise DataValidationError(f"成交编号不能为空 (第{line_num}行)")

        side_val = str(row.get("side", row.get("买卖方向", ""))).strip().upper()
        side = TradeSide.BUY if side_val in ["BUY", "买", "买入"] else TradeSide.SELL

        fees: Dict[str, float] = {}
        for col in df.columns:
            if col.startswith("fee_") or col.startswith("费用_"):
                fee_key = col.replace("fee_", "").replace("费用_", "")
                fees[fee_key] = _parse_float(row[col])

        trade = TradeConfirmation(
            trade_id=trade_id,
            trade_date=_parse_date(row.get("trade_date", row.get("成交日期", ""))),
            settlement_date=_parse_date(row.get("settlement_date", row.get("交收日期", ""))),
            security_code=str(row.get("security_code", row.get("证券代码", ""))).strip(),
            security_name=str(row.get("security_name", row.get("证券名称", ""))).strip(),
            side=side,
            quantity=_parse_float(row.get("quantity", row.get("成交数量", 0))),
            price=_parse_float(row.get("price", row.get("成交价格", 0))),
            gross_amount=_parse_float(row.get("gross_amount", row.get("成交金额", 0))),
            fees=fees,
            net_amount=_parse_float(row.get("net_amount", row.get("净金额", 0))),
            trace=trace,
        )
        trades[trade_id] = trade
    return trades


def import_cash_flows(file_path: str) -> Dict[str, CashFlow]:
    cash_flows: Dict[str, CashFlow] = {}
    df = pd.read_csv(file_path, dtype=str).fillna("")
    for idx, row in df.iterrows():
        line_num = idx + 2
        trace = _make_trace(file_path, line_num)
        flow_id = str(row.get("flow_id", row.get("流水编号", ""))).strip()
        if not flow_id:
            raise DataValidationError(f"流水编号不能为空 (第{line_num}行)")

        sec_code = row.get("security_code", row.get("证券代码", ""))
        sec_code = str(sec_code).strip() if sec_code else None

        fee_code = row.get("fee_code", row.get("费用代码", ""))
        fee_code = str(fee_code).strip() if fee_code else None

        fee_name = row.get("fee_name", row.get("费用名称", ""))
        fee_name = str(fee_name).strip() if fee_name else None

        cf = CashFlow(
            flow_id=flow_id,
            trade_date=_parse_date(row.get("trade_date", row.get("交易日期", ""))),
            settlement_date=_parse_date(row.get("settlement_date", row.get("交收日期", ""))),
            security_code=sec_code,
            amount=_parse_float(row.get("amount", row.get("发生金额", 0))),
            fee_code=fee_code,
            fee_name=fee_name,
            direction=str(row.get("direction", row.get("资金方向", "支出"))).strip(),
            trace=trace,
        )
        cash_flows[flow_id] = cf
    return cash_flows


def import_calendar(file_path: str) -> Dict[date, TradeCalendar]:
    calendar: Dict[date, TradeCalendar] = {}
    df = pd.read_csv(file_path, dtype=str).fillna("")
    for idx, row in df.iterrows():
        line_num = idx + 2
        trace = _make_trace(file_path, line_num)
        t_date = _parse_date(row.get("trade_date", row.get("交易日", "")))
        is_trading = str(row.get("is_trading_day", row.get("是否交易日", "1"))).strip() in ["1", "true", "是", "Y"]
        s_date = row.get("settlement_day", row.get("交收日", ""))
        settlement = _parse_date(s_date) if s_date else None

        tc = TradeCalendar(
            trade_date=t_date,
            is_trading_day=is_trading,
            settlement_day=settlement,
            trace=trace,
        )
        calendar[t_date] = tc
    return calendar


def import_discrepancies(file_path: str) -> List[Discrepancy]:
    discrepancies: List[Discrepancy] = []
    df = pd.read_csv(file_path, dtype=str).fillna("")
    for idx, row in df.iterrows():
        line_num = idx + 2
        disc_id = str(row.get("discrepancy_id", row.get("差异编号", ""))).strip()
        if not disc_id:
            raise DataValidationError(f"差异编号不能为空 (第{line_num}行)")

        type_val = str(row.get("type", row.get("差异类型", ""))).strip()
        disc_type = None
        for dt in DiscrepancyType:
            if dt.value == type_val or dt.name == type_val:
                disc_type = dt
                break
        if disc_type is None:
            disc_type = DiscrepancyType.UNMATCHED

        trade_ids_str = str(row.get("trade_ids", row.get("成交编号列表", ""))).strip()
        trade_ids = [t.strip() for t in trade_ids_str.split(",")] if trade_ids_str else []

        flow_ids_str = str(row.get("flow_ids", row.get("流水编号列表", ""))).strip()
        flow_ids = [f.strip() for f in flow_ids_str.split(",")] if flow_ids_str else []

        disc = Discrepancy(
            discrepancy_id=disc_id,
            type=disc_type,
            severity=str(row.get("severity", row.get("严重程度", "中"))).strip(),
            description=str(row.get("description", row.get("差异描述", ""))).strip(),
            trade_ids=trade_ids,
            flow_ids=flow_ids,
            expected_value=row.get("expected_value", row.get("期望值", None)),
            actual_value=row.get("actual_value", row.get("实际值", None)),
            resolved=str(row.get("resolved", row.get("是否已解决", "0"))).strip() in ["1", "true", "是", "Y"],
            resolution_note=str(row.get("resolution_note", row.get("解决说明", ""))).strip() or None,
        )
        discrepancies.append(disc)
    return discrepancies


def import_all(data_dir: str, report_date: date) -> ReconcileContext:
    ctx = ReconcileContext(report_date=report_date)
    base = Path(data_dir)

    sec_file = base / "securities.csv"
    if sec_file.exists():
        ctx.securities = import_securities(str(sec_file))

    fee_file = base / "fee_items.csv"
    if fee_file.exists():
        ctx.fee_items = import_fee_items(str(fee_file))

    trade_file = base / "trades.csv"
    if trade_file.exists():
        ctx.trades = import_trades(str(trade_file))

    cf_file = base / "cash_flows.csv"
    if cf_file.exists():
        ctx.cash_flows = import_cash_flows(str(cf_file))

    cal_file = base / "calendar.csv"
    if cal_file.exists():
        ctx.calendar = import_calendar(str(cal_file))

    disc_file = base / "discrepancies.csv"
    if disc_file.exists():
        ctx.discrepancies = import_discrepancies(str(disc_file))

    return ctx
