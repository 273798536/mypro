from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class RentalContract(Base):
    __tablename__ = "rental_contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String, unique=True, index=True, comment="合同编号")
    lessee = Column(String, comment="承租方")
    start_date = Column(DateTime, comment="起租日期")
    end_date = Column(DateTime, comment="到期日期")
    total_deposit = Column(Float, comment="合同总押金")
    status = Column(String, default="active", comment="合同状态: active/expired/terminated")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    remark = Column(Text, nullable=True, comment="备注")
    
    deposit_flows = relationship("DepositFlow", back_populates="contract")
    devices = relationship("DeviceLedger", back_populates="contract")
    deposit_occupations = relationship("DepositOccupation", back_populates="contract")

class DepositFlow(Base):
    __tablename__ = "deposit_flows"
    
    id = Column(Integer, primary_key=True, index=True)
    flow_no = Column(String, unique=True, index=True, comment="流水号")
    contract_id = Column(Integer, ForeignKey("rental_contracts.id"), comment="合同ID")
    flow_type = Column(String, comment="流水类型: deposit_paid/deposit_refund/transfer_in/transfer_out")
    amount = Column(Float, comment="金额")
    flow_date = Column(DateTime, comment="流水日期")
    operator = Column(String, comment="操作人")
    status = Column(String, default="confirmed", comment="状态: pending/confirmed/rejected")
    source = Column(String, comment="来源: manual/system/transfer")
    created_at = Column(DateTime, default=datetime.now)
    remark = Column(Text, nullable=True, comment="备注")
    
    contract = relationship("RentalContract", back_populates="deposit_flows")

class DeviceLedger(Base):
    __tablename__ = "device_ledgers"
    
    id = Column(Integer, primary_key=True, index=True)
    device_no = Column(String, unique=True, index=True, comment="设备编号")
    contract_id = Column(Integer, ForeignKey("rental_contracts.id"), comment="合同ID")
    device_name = Column(String, comment="设备名称")
    device_model = Column(String, comment="设备型号")
    deposit_amount = Column(Float, comment="单台押金")
    device_status = Column(String, default="rented", comment="设备状态: rented/returned/maintaining/transferred")
    rent_date = Column(DateTime, comment="出租日期")
    return_date = Column(DateTime, nullable=True, comment="归还日期")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    remark = Column(Text, nullable=True, comment="备注")
    
    contract = relationship("RentalContract", back_populates="devices")

class DepositOccupation(Base):
    __tablename__ = "deposit_occupations"
    
    id = Column(Integer, primary_key=True, index=True)
    occupation_no = Column(String, unique=True, index=True, comment="占用单号")
    contract_id = Column(Integer, ForeignKey("rental_contracts.id"), comment="合同ID")
    occupation_type = Column(String, comment="占用类型: repair_damage/model_transfer/rent_overdue/other")
    occupation_reason = Column(String, comment="占用原因")
    amount = Column(Float, comment="占用金额")
    deduction_order = Column(Integer, comment="抵扣顺序")
    status = Column(String, default="pending", comment="状态: pending/reviewed/confirmed/closed")
    related_device_id = Column(Integer, ForeignKey("device_ledgers.id"), nullable=True, comment="关联设备")
    related_repair_order = Column(String, nullable=True, comment="关联维修单号")
    is_transfer = Column(Boolean, default=False, comment="是否转押")
    transfer_to_contract = Column(Integer, nullable=True, comment="转押至合同ID")
    has_conflict = Column(Boolean, default=False, comment="是否存在冲突")
    created_at = Column(DateTime, default=datetime.now)
    created_by = Column(String, comment="创建人")
    reviewed_at = Column(DateTime, nullable=True, comment="复核时间")
    reviewed_by = Column(String, nullable=True, comment="复核人")
    confirmed_at = Column(DateTime, nullable=True, comment="确认时间")
    confirmed_by = Column(String, nullable=True, comment="确认人")
    
    contract = relationship("RentalContract", back_populates="deposit_occupations")
    device = relationship("DeviceLedger")
    conflict_records = relationship("ConflictRecord", back_populates="occupation")
    status_history = relationship("OccupationStatusHistory", back_populates="occupation")

class OccupationStatusHistory(Base):
    __tablename__ = "occupation_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    occupation_id = Column(Integer, ForeignKey("deposit_occupations.id"), comment="占用单ID")
    from_status = Column(String, comment="原状态")
    to_status = Column(String, comment="新状态")
    changed_at = Column(DateTime, default=datetime.now, comment="变更时间")
    changed_by = Column(String, comment="变更人")
    remark = Column(Text, nullable=True, comment="变更说明")
    
    occupation = relationship("DepositOccupation", back_populates="status_history")

class ConflictRecord(Base):
    __tablename__ = "conflict_records"
    
    id = Column(Integer, primary_key=True, index=True)
    occupation_id = Column(Integer, ForeignKey("deposit_occupations.id"), comment="占用单ID")
    conflict_type = Column(String, comment="冲突类型: contract_vs_flow/contract_vs_device/flow_vs_device")
    description = Column(Text, comment="冲突描述")
    contract_data = Column(Text, nullable=True, comment="合同数据快照")
    flow_data = Column(Text, nullable=True, comment="流水数据快照")
    device_data = Column(Text, nullable=True, comment="设备数据快照")
    resolution = Column(String, nullable=True, comment="解决方案")
    resolved_at = Column(DateTime, nullable=True, comment="解决时间")
    resolved_by = Column(String, nullable=True, comment="解决人")
    created_at = Column(DateTime, default=datetime.now)
    
    occupation = relationship("DepositOccupation", back_populates="conflict_records")
