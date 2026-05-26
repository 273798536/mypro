from datetime import date, datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class ReplenishStatus(str, Enum):
    PENDING = "待处理"
    REVIEW_REQUIRED = "待人工复核"
    ELIGIBLE = "可补扣"
    PAUSED = "客户暂停"
    CANCELLED = "已作废"
    PROCESSING = "补扣中"
    SUCCESS = "补扣成功"
    FAILED = "补扣失败"
    HOLIDAY_DEFERRED = "节假日顺延"
    DUPLICATE_RISK = "重复扣款风险"


class RiskType(str, Enum):
    DUPLICATE = "重复扣款风险"
    HOLIDAY = "节假日"
    PAUSED = "客户暂停"
    INVALID_DATA = "数据异常"
    MANUAL_REVIEW = "需人工确认"
    BALANCE_MISMATCH = "余额不符"


class BankReturn(BaseModel):
    serial_no: str = Field(description="银行回盘流水号")
    customer_id: str = Field(description="客户编号")
    customer_name: str = Field(description="客户姓名")
    plan_id: str = Field(description="定投计划编号")
    deduct_date: date = Field(description="原定扣款日")
    return_date: date = Field(description="银行回盘日期")
    amount: float = Field(description="扣款金额")
    return_code: str = Field(description="回盘返回码")
    return_msg: str = Field(description="回盘信息")
    source_file: str = Field(description="来源文件")
    created_at: datetime = Field(default_factory=datetime.now)

    @field_validator("amount")
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("扣款金额必须大于0")
        return round(v, 2)


class CustomerPlan(BaseModel):
    plan_id: str = Field(description="定投计划编号")
    customer_id: str = Field(description="客户编号")
    customer_name: str = Field(description="客户姓名")
    fund_code: str = Field(description="基金代码")
    fund_name: str = Field(description="基金名称")
    monthly_amount: float = Field(description="每月定投金额")
    deduct_day: int = Field(description="每月扣款日(1-28)")
    start_date: date = Field(description="计划开始日期")
    end_date: Optional[date] = Field(None, description="计划结束日期")
    status: str = Field(description="计划状态: 正常/暂停/终止")
    source_file: str = Field(description="来源文件")

    @field_validator("deduct_day")
    def deduct_day_valid(cls, v):
        if v < 1 or v > 28:
            raise ValueError("扣款日必须在1-28之间")
        return v


class FailureReason(BaseModel):
    reason_code: str = Field(description="失败原因编码")
    reason_name: str = Field(description="失败原因名称")
    category: str = Field(description="原因分类: 账户/余额/系统/其他")
    allow_replenish: bool = Field(description="是否允许补扣")
    max_attempts: int = Field(default=3, description="最大补扣次数")
    description: Optional[str] = Field(None, description="详细说明")
    source_file: str = Field(description="来源文件")


class ReplenishWindow(BaseModel):
    window_id: str = Field(description="补扣窗口编号")
    plan_id: str = Field(description="定投计划编号")
    original_deduct_date: date = Field(description="原定扣款日")
    window_start: date = Field(description="补扣窗口期开始")
    window_end: date = Field(description="补扣窗口期结束")
    attempts_made: int = Field(default=0, description="已尝试补扣次数")
    last_attempt_date: Optional[date] = Field(None, description="上次尝试日期")
    source_file: str = Field(description="来源文件")


class ManualRemark(BaseModel):
    remark_id: str = Field(description="备注编号")
    related_serial_no: str = Field(description="关联回盘流水号")
    operator: str = Field(description="操作人")
    remark_time: datetime = Field(description="备注时间")
    content: str = Field(description="备注内容")
    action: str = Field(description="处理动作: 同意补扣/拒绝补扣/暂停/继续")
    source_file: str = Field(description="来源文件")


class AuditTrail(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.now)
    from_status: Optional[ReplenishStatus] = Field(None)
    to_status: ReplenishStatus
    operator: str = Field(default="system")
    reason: str = Field(description="变更原因")
    source: str = Field(description="来源模块")


class ReplenishRecord(BaseModel):
    record_id: str = Field(description="补扣记录唯一ID")
    bank_return: BankReturn
    customer_plan: CustomerPlan
    failure_reason: Optional[FailureReason] = None
    replenish_window: Optional[ReplenishWindow] = None
    manual_remarks: List[ManualRemark] = Field(default_factory=list)
    status: ReplenishStatus = ReplenishStatus.PENDING
    risks: List[RiskType] = Field(default_factory=list)
    audit_trail: List[AuditTrail] = Field(default_factory=list)
    scheduled_replenish_date: Optional[date] = None
    actual_replenish_date: Optional[date] = None
    replenish_attempts: int = 0
    is_reconciled: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def add_audit(self, to_status: ReplenishStatus, reason: str, source: str, operator: str = "system"):
        trail = AuditTrail(
            from_status=self.status,
            to_status=to_status,
            operator=operator,
            reason=reason,
            source=source,
        )
        self.audit_trail.append(trail)
        self.status = to_status
        self.updated_at = datetime.now()

    def add_risk(self, risk: RiskType):
        if risk not in self.risks:
            self.risks.append(risk)

    def clear_risk(self, risk: RiskType):
        if risk in self.risks:
            self.risks.remove(risk)


class ReconciliationSummary(BaseModel):
    batch_id: str = Field(description="对账批次号")
    run_date: date = Field(default_factory=date.today)
    total_records: int = 0
    success_count: int = 0
    failed_count: int = 0
    pending_count: int = 0
    paused_count: int = 0
    review_required_count: int = 0
    deferred_count: int = 0
    duplicate_risk_count: int = 0
    cancelled_count: int = 0
    total_amount: float = 0.0
    success_amount: float = 0.0
    failed_amount: float = 0.0
    source_files: List[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.now)
