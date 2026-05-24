from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.core.enums import RecordStatus, DataSourceType, RoleType, FabricStatus, ImportResult
from app.models.base import ImportEvidenceMixin, TimestampMixin


class LedgerRecord(Base, TimestampMixin):
    __tablename__ = "ledger_records"

    id = Column(Integer, primary_key=True, index=True)
    record_no = Column(String(100), unique=True, index=True, comment="台账编号")
    style_code = Column(String(100), index=True, comment="款号")
    style_name = Column(String(200), comment="款式名称")
    version = Column(Integer, default=1, comment="版本号")
    parent_version_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True, comment="父版本ID")

    status = Column(String(50), default=RecordStatus.DRAFT, comment="状态")
    current_role = Column(String(50), comment="当前处理角色")

    designer = Column(String(100), comment="设计师")
    pattern_maker = Column(String(100), comment="打版师")
    sample_maker = Column(String(100), comment="样衣工")
    warehouse_keeper = Column(String(100), comment="仓管")

    fabric_code = Column(String(100), comment="面料编码")
    fabric_name = Column(String(200), comment="面料名称")
    fabric_quantity = Column(Float, comment="面料数量")
    fabric_unit = Column(String(20), default="米", comment="单位")
    fabric_status = Column(String(50), default=FabricStatus.PENDING, comment="面料状态")

    is_frozen = Column(Boolean, default=False, comment="是否冻结")
    frozen_at = Column(DateTime, nullable=True, comment="冻结时间")
    frozen_by = Column(String(100), nullable=True, comment="冻结人")
    freeze_reason = Column(Text, nullable=True, comment="冻结原因")

    manual_adjusted = Column(Boolean, default=False, comment="是否人工改判")
    adjust_count = Column(Integer, default=0, comment="改判次数")
    last_adjusted_at = Column(DateTime, nullable=True, comment="最后改判时间")
    last_adjusted_by = Column(String(100), nullable=True, comment="最后改判人")
    adjust_reason = Column(Text, nullable=True, comment="改判原因")

    sensitive_fields_masked = Column(Boolean, default=False, comment="敏感字段是否脱敏")
    export_count = Column(Integer, default=0, comment="导出次数")
    last_exported_at = Column(DateTime, nullable=True, comment="最后导出时间")

    remarks = Column(Text, nullable=True, comment="备注")
    extra_data = Column(JSON, default=dict, comment="扩展数据")

    status_history = relationship("StatusHistory", back_populates="ledger_record", cascade="all, delete-orphan")
    fabric_records = relationship("FabricInventory", back_populates="ledger_record")
    sample_transfers = relationship("SampleTransfer", back_populates="ledger_record")
    size_modifications = relationship("SizeModification", back_populates="ledger_record")
    manual_pricings = relationship("ManualPricing", back_populates="ledger_record")
    children = relationship("LedgerRecord", remote_side=[id])


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=False)

    from_status = Column(String(50), nullable=True, comment="源状态")
    to_status = Column(String(50), nullable=False, comment="目标状态")
    transition_reason = Column(Text, nullable=False, comment="变更原因")

    operator = Column(String(100), nullable=False, comment="操作人")
    operator_role = Column(String(50), nullable=False, comment="操作人角色")
    operated_at = Column(DateTime, default=datetime.utcnow, comment="操作时间")

    extra_info = Column(JSON, default=dict, comment="额外信息")

    ledger_record = relationship("LedgerRecord", back_populates="status_history")


class SampleTransfer(Base, ImportEvidenceMixin, TimestampMixin):
    __tablename__ = "sample_transfers"

    id = Column(Integer, primary_key=True, index=True)
    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True)
    transfer_no = Column(String(100), unique=True, index=True, comment="流转单号")
    style_code = Column(String(100), index=True, comment="款号")
    version = Column(Integer, default=1, comment="版本")

    transfer_type = Column(String(50), comment="流转类型")
    from_department = Column(String(100), comment="转出部门")
    to_department = Column(String(100), comment="转入部门")
    from_person = Column(String(100), comment="转出人")
    to_person = Column(String(100), comment="转入人")

    sample_count = Column(Integer, comment="样衣数量")
    transfer_date = Column(DateTime, comment="流转日期")
    received_date = Column(DateTime, nullable=True, comment="接收日期")

    is_obsolete = Column(Boolean, default=False, comment="是否作废版本")
    obsolete_reason = Column(Text, nullable=True, comment="作废原因")

    status = Column(String(50), comment="状态")
    remarks = Column(Text, nullable=True, comment="备注")

    ledger_record = relationship("LedgerRecord", back_populates="sample_transfers")


class SizeModification(Base, ImportEvidenceMixin, TimestampMixin):
    __tablename__ = "size_modifications"

    id = Column(Integer, primary_key=True, index=True)
    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True)
    modification_no = Column(String(100), unique=True, index=True, comment="修改单号")
    style_code = Column(String(100), index=True, comment="款号")
    version = Column(Integer, default=1, comment="版本")

    size_type = Column(String(50), comment="尺码类型")
    original_specs = Column(JSON, default=dict, comment="原始规格")
    modified_specs = Column(JSON, default=dict, comment="修改后规格")
    modification_reason = Column(Text, comment="修改原因")

    designer = Column(String(100), comment="设计师")
    pattern_maker = Column(String(100), comment="打版师")
    modified_date = Column(DateTime, comment="修改日期")
    confirmed_date = Column(DateTime, nullable=True, comment="确认日期")

    requires_new_fabric = Column(Boolean, default=False, comment="是否需要新面料")
    old_fabric_disposition = Column(String(100), nullable=True, comment="旧面料处置")
    is_approved = Column(Boolean, default=False, comment="是否批准")

    remarks = Column(Text, nullable=True, comment="备注")

    ledger_record = relationship("LedgerRecord", back_populates="size_modifications")


class FabricInventory(Base, ImportEvidenceMixin, TimestampMixin):
    __tablename__ = "fabric_inventory"

    id = Column(Integer, primary_key=True, index=True)
    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True)
    inventory_no = Column(String(100), unique=True, index=True, comment="出入库单号")
    style_code = Column(String(100), index=True, comment="款号")
    version = Column(Integer, default=1, comment="对应版本")

    fabric_code = Column(String(100), comment="面料编码")
    fabric_name = Column(String(200), comment="面料名称")
    fabric_batch = Column(String(100), comment="面料批次")
    color = Column(String(100), comment="颜色")

    operation_type = Column(String(50), comment="操作类型:入库/出库/退库")
    quantity = Column(Float, comment="数量")
    unit = Column(String(20), default="米", comment="单位")
    operation_date = Column(DateTime, comment="操作日期")

    operator = Column(String(100), comment="操作人")
    receiver = Column(String(100), nullable=True, comment="领用人")
    receiver_role = Column(String(50), nullable=True, comment="领用角色")

    is_old_version = Column(Boolean, default=False, comment="是否旧版本面料")
    old_version_note = Column(Text, nullable=True, comment="旧版本说明")
    disposition_status = Column(String(50), nullable=True, comment="处置状态")

    remarks = Column(Text, nullable=True, comment="备注")

    ledger_record = relationship("LedgerRecord", back_populates="fabric_records")


class ManualPricing(Base, ImportEvidenceMixin, TimestampMixin):
    __tablename__ = "manual_pricings"

    id = Column(Integer, primary_key=True, index=True)
    ledger_record_id = Column(Integer, ForeignKey("ledger_records.id"), nullable=True)
    pricing_no = Column(String(100), unique=True, index=True, comment="改价单号")
    style_code = Column(String(100), index=True, comment="款号")

    original_price = Column(Float, comment="原价")
    modified_price = Column(Float, comment="改后价")
    price_difference = Column(Float, comment="差价")
    pricing_reason = Column(Text, comment="改价原因")

    approved_by = Column(String(100), comment="审批人")
    approved_date = Column(DateTime, nullable=True, comment="审批日期")
    is_approved = Column(Boolean, default=False, comment="是否批准")

    remarks = Column(Text, nullable=True, comment="备注")

    ledger_record = relationship("LedgerRecord", back_populates="manual_pricings")


class ShiftRecord(Base, ImportEvidenceMixin, TimestampMixin):
    __tablename__ = "shift_records"

    id = Column(Integer, primary_key=True, index=True)
    shift_no = Column(String(100), unique=True, index=True, comment="班次编号")
    shift_date = Column(DateTime, comment="班次日期")
    shift_type = Column(String(50), comment="班次类型:早班/晚班")

    worker = Column(String(100), comment="工人")
    worker_role = Column(String(50), comment="角色")
    style_code = Column(String(100), index=True, comment="关联款号")
    work_content = Column(Text, comment="工作内容")

    work_hours = Column(Float, comment="工时")
    output_quantity = Column(Integer, nullable=True, comment="产出数量")

    remarks = Column(Text, nullable=True, comment="备注")


class ImportBatch(Base, TimestampMixin):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(100), unique=True, index=True, comment="批次ID")
    source_type = Column(String(50), comment="数据源类型")
    source_file = Column(String(500), comment="来源文件")

    total_count = Column(Integer, default=0, comment="总记录数")
    success_count = Column(Integer, default=0, comment="成功数")
    failed_count = Column(Integer, default=0, comment="失败数")
    import_result = Column(String(50), comment="导入结果")

    imported_by = Column(String(100), comment="导入人")
    completed_at = Column(DateTime, nullable=True, comment="完成时间")

    error_details = Column(JSON, default=list, comment="错误详情")
    remarks = Column(Text, nullable=True, comment="备注")


class ProcessingChain(Base, TimestampMixin):
    __tablename__ = "processing_chains"

    id = Column(Integer, primary_key=True, index=True)
    chain_no = Column(String(100), unique=True, index=True, comment="链条编号")
    style_code = Column(String(100), index=True, comment="款号")

    root_ledger_id = Column(Integer, ForeignKey("ledger_records.id"), comment="根台账ID")
    chain_nodes = Column(JSON, default=list, comment="链条节点")
    version_path = Column(String(500), comment="版本路径")

    has_old_fabric_issue = Column(Boolean, default=False, comment="是否存在旧面料问题")
    old_fabric_records = Column(JSON, default=list, comment="旧面料记录")
    responsibility_analysis = Column(Text, nullable=True, comment="责任分析")

    chain_status = Column(String(50), default="pending", comment="链条状态")
    reviewed_by = Column(String(100), nullable=True, comment="复核人")
    reviewed_at = Column(DateTime, nullable=True, comment="复核时间")

    remarks = Column(Text, nullable=True, comment="备注")
