from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List


class OrderStatus(str, Enum):
    PENDING_DEPOSIT = "待付定金"
    DEPOSIT_PAID = "定金已付"
    PENDING_BALANCE = "待付尾款"
    BALANCE_PAID = "尾款已付"
    COMPLETED = "交易完成"
    DEPOSIT_NOT_REFUND = "定金不退"
    BALANCE_TIMEOUT = "尾款超时"
    CANCELLED = "已取消"


class ExceptionType(str, Enum):
    NORMAL = "正常"
    DEPOSIT_NOT_REFUND = "定金不退"
    BALANCE_TIMEOUT = "尾款超时"
    DEPOSIT_MISMATCH = "定金金额不符"
    BALANCE_MISMATCH = "尾款金额不符"
    MISSING_DEPOSIT = "缺失定金流水"
    MISSING_BALANCE = "缺失尾款支付"
    MISSING_ORDER = "缺失预售订单"
    AMOUNT_MISMATCH = "总金额不符"


class DataSource(str, Enum):
    ORDER = "预售订单表"
    DEPOSIT = "定金流水表"
    BALANCE = "尾款支付表"


@dataclass
class PreSaleOrder:
    order_no: str
    product_name: str
    total_amount: float
    deposit_amount: float
    balance_amount: float
    deposit_deadline: Optional[datetime]
    balance_deadline: Optional[datetime]
    buyer_name: str = ""
    status: OrderStatus = OrderStatus.PENDING_DEPOSIT
    create_time: Optional[datetime] = None
    remark: str = ""


@dataclass
class DepositRecord:
    transaction_no: str
    order_no: str
    pay_amount: float
    pay_time: Optional[datetime] = None
    pay_channel: str = ""
    payer: str = ""
    remark: str = ""


@dataclass
class BalanceRecord:
    transaction_no: str
    order_no: str
    pay_amount: float
    pay_time: Optional[datetime] = None
    pay_channel: str = ""
    payer: str = ""
    remark: str = ""


@dataclass
class ReconciliationItem:
    order_no: str
    order: Optional[PreSaleOrder] = None
    deposit: Optional[DepositRecord] = None
    balance: Optional[BalanceRecord] = None
    is_matched: bool = False
    exception_type: ExceptionType = ExceptionType.NORMAL
    exception_desc: str = ""
    problem_source: List[DataSource] = field(default_factory=list)
    reconcile_time: Optional[datetime] = None

    def add_problem_source(self, source: DataSource):
        if source not in self.problem_source:
            self.problem_source.append(source)


@dataclass
class ReconciliationSummary:
    total_orders: int = 0
    matched_count: int = 0
    exception_count: int = 0
    deposit_not_refund_count: int = 0
    balance_timeout_count: int = 0
    amount_mismatch_count: int = 0
    missing_data_count: int = 0
    total_deposit_amount: float = 0.0
    total_balance_amount: float = 0.0
    total_order_amount: float = 0.0
    exception_details: List[ReconciliationItem] = field(default_factory=list)
    all_results: List[ReconciliationItem] = field(default_factory=list)
