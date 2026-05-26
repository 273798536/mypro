from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import uuid4


class MatchStatus(str, Enum):
    PENDING = "待匹配"
    MATCHED = "已匹配"
    CONFLICT = "冲突"
    SPLIT = "拆分中"
    MANUAL = "人工确认"
    FLAGGED = "异常标记"
    RED_INVOICE = "红冲发票"


class DataSource(str, Enum):
    BANK = "银行流水"
    INVOICE = "发票台账"
    CONTRACT = "合同号"
    KEYWORD = "摘要关键词"
    MANUAL = "人工确认"
    MATCH_REPORT = "匹配报告"


@dataclass
class BankFlow:
    id: str
    trade_date: str
    trade_time: str
    amount: float
    direction: str
    counterparty: str
    summary: str
    balance: float
    bank_account: str
    source: DataSource = DataSource.BANK


@dataclass
class Invoice:
    id: str
    invoice_code: str
    invoice_number: str
    invoice_date: str
    amount: float
    tax_amount: float
    total_amount: float
    seller_name: str
    buyer_name: str
    invoice_type: str
    status: str = "正常"
    source: DataSource = DataSource.INVOICE


@dataclass
class Contract:
    id: str
    contract_no: str
    contract_date: str
    party_a: str
    party_b: str
    contract_amount: float
    payment_terms: str
    source: DataSource = DataSource.CONTRACT


@dataclass
class MatchRecord:
    id: str = field(default_factory=lambda: str(uuid4()))
    bank_flow_id: str = ""
    invoice_ids: List[str] = field(default_factory=list)
    contract_id: Optional[str] = None
    matched_amount: float = 0.0
    status: MatchStatus = MatchStatus.PENDING
    match_score: float = 0.0
    match_method: str = ""
    sources: List[DataSource] = field(default_factory=list)
    remarks: str = ""
    flags: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: int = 1


@dataclass
class HistoryEntry:
    id: str = field(default_factory=lambda: str(uuid4()))
    record_id: str = ""
    field_name: str = ""
    old_value: str = ""
    new_value: str = ""
    operator: str = "system"
    changed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    source: DataSource = DataSource.MATCH_REPORT


@dataclass
class AppState:
    bank_flows: List[BankFlow] = field(default_factory=list)
    invoices: List[Invoice] = field(default_factory=list)
    contracts: List[Contract] = field(default_factory=list)
    matches: List[MatchRecord] = field(default_factory=list)
    history: List[HistoryEntry] = field(default_factory=list)
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())
