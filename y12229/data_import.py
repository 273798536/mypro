import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
import os

from models import (
    PriceLockAgreement,
    BookingOrder,
    AmendmentRecord,
    BAFRate,
    CostReport,
    ContainerType,
)


def parse_date(date_str: Any) -> datetime.date:
    if pd.isna(date_str):
        return None
    if isinstance(date_str, datetime):
        return date_str.date()
    if isinstance(date_str, str):
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"]:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
    raise ValueError(f"无法解析日期: {date_str}")


def parse_container_type(ct_str: str) -> ContainerType:
    if pd.isna(ct_str):
        return None
    ct_str = str(ct_str).strip().upper()
    mapping = {
        "20GP": ContainerType.TE20,
        "20'GP": ContainerType.TE20,
        "20": ContainerType.TE20,
        "40GP": ContainerType.TE40,
        "40'GP": ContainerType.TE40,
        "40": ContainerType.TE40,
        "40HQ": ContainerType.TE40HQ,
        "40'HQ": ContainerType.TE40HQ,
        "45HQ": ContainerType.TE45,
        "45'HQ": ContainerType.TE45,
    }
    return mapping.get(ct_str, ContainerType.TE20)


def import_price_lock_agreements(file_path: str) -> List[PriceLockAgreement]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    agreements = []
    for _, row in df.iterrows():
        agreement = PriceLockAgreement(
            agreement_id=str(row.get("协议编号", row.get("agreement_id", ""))).strip(),
            customer_name=str(row.get("客户名称", row.get("customer_name", ""))).strip(),
            trade_lane=str(row.get("航线", row.get("trade_lane", ""))).strip(),
            origin=str(row.get("起运港", row.get("origin", ""))).strip(),
            destination=str(row.get("目的港", row.get("destination", ""))).strip(),
            carrier=str(row.get("船公司", row.get("carrier", ""))).strip(),
            container_type=parse_container_type(row.get("箱型", row.get("container_type", ""))),
            base_rate=float(row.get("基本运费", row.get("base_rate", 0)) or 0),
            baf_rate=float(row.get("燃油费率", row.get("baf_rate", 0)) or 0),
            effective_date=parse_date(row.get("生效日期", row.get("effective_date"))),
            expiry_date=parse_date(row.get("到期日期", row.get("expiry_date"))),
            quote_version=str(row.get("报价版本", row.get("quote_version", "v1"))).strip(),
            currency=str(row.get("币种", row.get("currency", "USD"))).strip(),
            remarks=str(row.get("备注", row.get("remarks", ""))).strip() if pd.notna(row.get("备注", row.get("remarks"))) else None,
        )
        agreements.append(agreement)
    return agreements


def import_booking_orders(file_path: str) -> List[BookingOrder]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    bookings = []
    for _, row in df.iterrows():
        booking = BookingOrder(
            booking_no=str(row.get("订舱号", row.get("booking_no", ""))).strip(),
            agreement_id=str(row.get("协议编号", row.get("agreement_id", ""))).strip(),
            customer_name=str(row.get("客户名称", row.get("customer_name", ""))).strip(),
            trade_lane=str(row.get("航线", row.get("trade_lane", ""))).strip(),
            origin=str(row.get("起运港", row.get("origin", ""))).strip(),
            destination=str(row.get("目的港", row.get("destination", ""))).strip(),
            carrier=str(row.get("船公司", row.get("carrier", ""))).strip(),
            container_type=parse_container_type(row.get("箱型", row.get("container_type", ""))),
            container_count=int(row.get("箱量", row.get("container_count", 1)) or 1),
            etd=parse_date(row.get("开船日期", row.get("etd"))),
            quote_version=str(row.get("报价版本", row.get("quote_version", "v1"))).strip(),
            agreed_base_rate=float(row.get("约定基本运费", row.get("agreed_base_rate", 0)) or 0) if pd.notna(row.get("约定基本运费", row.get("agreed_base_rate"))) else None,
            agreed_baf_rate=float(row.get("约定燃油费率", row.get("agreed_baf_rate", 0)) or 0) if pd.notna(row.get("约定燃油费率", row.get("agreed_baf_rate"))) else None,
            remarks=str(row.get("备注", row.get("remarks", ""))).strip() if pd.notna(row.get("备注", row.get("remarks"))) else None,
        )
        bookings.append(booking)
    return bookings


def import_amendment_records(file_path: str) -> List[AmendmentRecord]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    amendments = []
    for _, row in df.iterrows():
        amendment = AmendmentRecord(
            amendment_id=str(row.get("改单编号", row.get("amendment_id", ""))).strip(),
            booking_no=str(row.get("订舱号", row.get("booking_no", ""))).strip(),
            amendment_date=parse_date(row.get("改单日期", row.get("amendment_date"))),
            amendment_type=str(row.get("改单类型", row.get("amendment_type", ""))).strip(),
            field_changed=str(row.get("修改字段", row.get("field_changed", ""))).strip(),
            old_value=str(row.get("原值", row.get("old_value", ""))).strip(),
            new_value=str(row.get("新值", row.get("new_value", ""))).strip(),
            reason=str(row.get("改单原因", row.get("reason", ""))).strip() if pd.notna(row.get("改单原因", row.get("reason"))) else None,
        )
        amendments.append(amendment)
    return amendments


def import_baf_rates(file_path: str) -> List[BAFRate]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    rates = []
    for _, row in df.iterrows():
        rate = BAFRate(
            rate_id=str(row.get("费率编号", row.get("rate_id", ""))).strip(),
            carrier=str(row.get("船公司", row.get("carrier", ""))).strip(),
            trade_lane=str(row.get("航线", row.get("trade_lane", ""))).strip(),
            effective_date=parse_date(row.get("生效日期", row.get("effective_date"))),
            expiry_date=parse_date(row.get("到期日期", row.get("expiry_date"))),
            baf_20gp=float(row.get("20GP_BAF", row.get("baf_20gp", 0)) or 0),
            baf_40gp=float(row.get("40GP_BAF", row.get("baf_40gp", 0)) or 0),
            baf_40hq=float(row.get("40HQ_BAF", row.get("baf_40hq", 0)) or 0),
            currency=str(row.get("币种", row.get("currency", "USD"))).strip(),
        )
        rates.append(rate)
    return rates


def import_cost_reports(file_path: str) -> List[CostReport]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")

    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    reports = []
    for _, row in df.iterrows():
        report = CostReport(
            report_id=str(row.get("报告编号", row.get("report_id", ""))).strip(),
            booking_no=str(row.get("订舱号", row.get("booking_no", ""))).strip(),
            container_type=parse_container_type(row.get("箱型", row.get("container_type", ""))),
            container_count=int(row.get("箱量", row.get("container_count", 1)) or 1),
            actual_base_rate=float(row.get("实际基本运费", row.get("actual_base_rate", 0)) or 0),
            actual_baf_rate=float(row.get("实际燃油费率", row.get("actual_baf_rate", 0)) or 0),
            other_charges=float(row.get("其他费用", row.get("other_charges", 0)) or 0),
            total_amount=float(row.get("总金额", row.get("total_amount", 0)) or 0),
            report_date=parse_date(row.get("报告日期", row.get("report_date"))),
            currency=str(row.get("币种", row.get("currency", "USD"))).strip(),
            source=str(row.get("数据来源", row.get("source", ""))).strip(),
        )
        reports.append(report)
    return reports


class DataStore:
    def __init__(self):
        self.agreements: Dict[str, PriceLockAgreement] = {}
        self.bookings: Dict[str, BookingOrder] = {}
        self.amendments: Dict[str, List[AmendmentRecord]] = {}
        self.baf_rates: List[BAFRate] = []
        self.cost_reports: Dict[str, List[CostReport]] = {}

    def load_agreements(self, file_path: str):
        agreements = import_price_lock_agreements(file_path)
        for agg in agreements:
            self.agreements[agg.agreement_id] = agg

    def load_bookings(self, file_path: str):
        bookings = import_booking_orders(file_path)
        for bkg in bookings:
            self.bookings[bkg.booking_no] = bkg

    def load_amendments(self, file_path: str):
        amendments = import_amendment_records(file_path)
        for amd in amendments:
            if amd.booking_no not in self.amendments:
                self.amendments[amd.booking_no] = []
            self.amendments[amd.booking_no].append(amd)

    def load_baf_rates(self, file_path: str):
        self.baf_rates = import_baf_rates(file_path)

    def load_cost_reports(self, file_path: str):
        reports = import_cost_reports(file_path)
        for rep in reports:
            if rep.booking_no not in self.cost_reports:
                self.cost_reports[rep.booking_no] = []
            self.cost_reports[rep.booking_no].append(rep)

    def get_booking_amendments(self, booking_no: str) -> List[AmendmentRecord]:
        return self.amendments.get(booking_no, [])

    def get_booking_cost_reports(self, booking_no: str) -> List[CostReport]:
        return self.cost_reports.get(booking_no, [])

    def get_agreement(self, agreement_id: str) -> PriceLockAgreement:
        return self.agreements.get(agreement_id)

    def get_booking(self, booking_no: str) -> BookingOrder:
        return self.bookings.get(booking_no)
