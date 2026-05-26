from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.common import BusinessBase, AuditFields


class OutsourceDeliveryBase(BaseModel):
    delivery_no: str = Field(..., max_length=50, description="送货单号")
    supplier_code: str = Field(..., max_length=50, description="供应商编码")
    supplier_name: str = Field(..., max_length=200, description="供应商名称")
    product_code: str = Field(..., max_length=50, description="产品编码")
    product_name: str = Field(..., max_length=200, description="产品名称")
    delivery_date: date = Field(..., description="送货日期")
    quantity: Decimal = Field(..., description="数量")
    unit_price: Decimal = Field(..., description="单价")
    total_amount: Decimal = Field(..., description="总金额")
    batch_no: Optional[str] = Field(None, max_length=50, description="批次号")
    work_order_no: Optional[str] = Field(None, max_length=50, description="工单号")
    status: Optional[str] = Field("pending", max_length=50, description="状态")
    remark: Optional[str] = Field(None, description="备注")
    metadata_: Optional[Dict[str, Any]] = Field(None, description="元数据")


class OutsourceDeliveryCreate(OutsourceDeliveryBase):
    pass


class OutsourceDeliveryUpdate(BaseModel):
    supplier_name: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    status: Optional[str] = None
    remark: Optional[str] = None


class OutsourceDelivery(OutsourceDeliveryBase, BusinessBase):
    model_config = ConfigDict(from_attributes=True)


class RepairRecordBase(BaseModel):
    repair_no: str = Field(..., max_length=50, description="返修单号")
    delivery_id: int = Field(..., description="关联送货单ID")
    repair_date: date = Field(..., description="返修日期")
    repair_type: str = Field(..., max_length=50, description="返修类型")
    repair_reason: str = Field(..., max_length=500, description="返修原因")
    repair_quantity: Decimal = Field(..., description="返修数量")
    repair_cost: Decimal = Field(..., description="返修费用")
    responsible_party: str = Field(..., max_length=50, description="责任方")
    batch_no: Optional[str] = Field(None, max_length=50, description="批次号")
    status: Optional[str] = Field("pending", max_length=50, description="状态")
    remark: Optional[str] = Field(None, description="备注")
    metadata_: Optional[Dict[str, Any]] = Field(None, description="元数据")


class RepairRecordCreate(RepairRecordBase):
    pass


class RepairRecordUpdate(BaseModel):
    repair_type: Optional[str] = None
    repair_reason: Optional[str] = None
    repair_quantity: Optional[Decimal] = None
    repair_cost: Optional[Decimal] = None
    responsible_party: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None


class RepairRecord(RepairRecordBase, BusinessBase):
    model_config = ConfigDict(from_attributes=True)


class DeductionDetailBase(BaseModel):
    deduction_no: str = Field(..., max_length=50, description="扣款单号")
    delivery_id: Optional[int] = Field(None, description="关联送货单ID")
    repair_id: Optional[int] = Field(None, description="关联返修记录ID")
    deduction_type: str = Field(..., max_length=50, description="扣款类型")
    deduction_date: date = Field(..., description="扣款日期")
    deduction_amount: Decimal = Field(..., description="扣款金额")
    deduction_reason: str = Field(..., max_length=500, description="扣款原因")
    deduction_basis: Optional[str] = Field(None, max_length=200, description="扣款依据")
    status: Optional[str] = Field("pending", max_length=50, description="状态")
    remark: Optional[str] = Field(None, description="备注")
    metadata_: Optional[Dict[str, Any]] = Field(None, description="元数据")


class DeductionDetailCreate(DeductionDetailBase):
    pass


class DeductionDetailUpdate(BaseModel):
    deduction_type: Optional[str] = None
    deduction_amount: Optional[Decimal] = None
    deduction_reason: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None


class DeductionDetail(DeductionDetailBase, BusinessBase):
    model_config = ConfigDict(from_attributes=True)


class ShiftRecordBase(BaseModel):
    shift_date: date = Field(..., description="班次日期")
    shift_type: str = Field(..., max_length=50, description="班次类型")
    team_code: str = Field(..., max_length=50, description="班组编码")
    team_name: str = Field(..., max_length=200, description="班组名称")
    worker_count: int = Field(..., description="人数")
    work_hours: Decimal = Field(..., description="工时")
    output_quantity: Decimal = Field(..., description="产量")
    product_code: Optional[str] = Field(None, max_length=50, description="产品编码")
    product_name: Optional[str] = Field(None, max_length=200, description="产品名称")
    status: Optional[str] = Field("pending", max_length=50, description="状态")
    remark: Optional[str] = Field(None, description="备注")
    metadata_: Optional[Dict[str, Any]] = Field(None, description="元数据")


class ShiftRecordCreate(ShiftRecordBase):
    pass


class ShiftRecord(ShiftRecordBase, BusinessBase):
    model_config = ConfigDict(from_attributes=True)


class CompensationQueueItem(AuditFields):
    business_type: str
    business_key: str
    business_id: Optional[int] = None
    status: str
    retry_count: int
    max_retries: int
    next_retry_at: datetime
    last_error: Optional[str] = None
    error_code: Optional[str] = None
    process_logs: Optional[List[Dict[str, Any]]] = None
    handled_by: Optional[int] = None
    handled_at: Optional[datetime] = None
    source_ids: Optional[List[int]] = None

    model_config = ConfigDict(from_attributes=True)


class QueueStatistics(BaseModel):
    pending: int
    processing: int
    success: int
    failed: int
    dead_letter: int
    manual_handling: int


class QueueStatisticsResponse(BaseModel):
    overview: QueueStatistics
    error_breakdown: Dict[str, Any]


class FailedRecordItem(AuditFields):
    business_type: str
    idempotent_key: str
    raw_data: Dict[str, Any]
    error_type: str
    error_message: str
    error_detail: Optional[Dict[str, Any]] = None
    is_resolved: str
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolution_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SettlementSummaryItem(AuditFields):
    summary_date: date
    supplier_code: str
    supplier_name: str
    product_code: str
    product_name: str
    delivery_amount: Decimal
    repair_amount: Decimal
    deduction_amount: Decimal
    final_amount: Decimal
    source_ids: Optional[Dict[str, Any]] = None
    version: int

    model_config = ConfigDict(from_attributes=True)


class ManualHandleRequest(BaseModel):
    action: str = Field(..., description="操作类型: retry/skip/adjust")
    note: str = Field(..., description="处理说明")


class TemporarySupplementBase(BaseModel):
    supplement_no: str = Field(..., max_length=50, description="补录单号")
    supplement_type: str = Field(..., max_length=50, description="补录类型")
    supplement_date: date = Field(..., description="补录日期")
    supplement_reason: str = Field(..., max_length=500, description="补录原因")
    related_order_no: Optional[str] = Field(None, max_length=50, description="关联单号")
    supplement_content: Optional[Dict[str, Any]] = Field(None, description="补录内容")
    amount: Optional[Decimal] = Field(None, description="金额")
    status: Optional[str] = Field("pending", max_length=50, description="状态")
    remark: Optional[str] = Field(None, description="备注")
    metadata_: Optional[Dict[str, Any]] = Field(None, description="元数据")


class TemporarySupplementCreate(TemporarySupplementBase):
    pass


class TemporarySupplementUpdate(BaseModel):
    supplement_type: Optional[str] = None
    supplement_reason: Optional[str] = None
    amount: Optional[Decimal] = None
    status: Optional[str] = None
    remark: Optional[str] = None


class TemporarySupplement(TemporarySupplementBase, BusinessBase):
    model_config = ConfigDict(from_attributes=True)


class ChangeHistoryItem(AuditFields):
    business_type: str
    business_id: int
    field_name: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    change_reason: Optional[str] = None
    operator_id: int
    operator_name: str

    model_config = ConfigDict(from_attributes=True)
