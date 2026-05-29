from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class LeaseContract(Base):
    __tablename__ = "lease_contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String, unique=True, index=True, nullable=False)
    tenant_name = Column(String, nullable=False)
    room_no = Column(String, nullable=False)
    monthly_rent = Column(Float, nullable=False)
    deposit_amount = Column(Float, nullable=False)
    rent_free_days = Column(Integer, default=0)
    lease_start_date = Column(DateTime, nullable=False)
    lease_end_date = Column(DateTime, nullable=False)
    check_out_date = Column(DateTime)
    status = Column(String, default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    deposit_flows = relationship("DepositFlow", back_populates="contract")
    utility_bills = relationship("UtilityBill", back_populates="contract")
    repair_orders = relationship("RepairOrder", back_populates="contract")
    deposit_ledgers = relationship("DepositLedger", back_populates="contract")


class DepositFlow(Base):
    __tablename__ = "deposit_flows"

    id = Column(Integer, primary_key=True, index=True)
    flow_no = Column(String, unique=True, index=True, nullable=False)
    contract_id = Column(Integer, ForeignKey("lease_contracts.id"), nullable=False)
    flow_type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    occurred_at = Column(DateTime, nullable=False)
    remark = Column(Text)
    operator = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    contract = relationship("LeaseContract", back_populates="deposit_flows")
    ledger_items = relationship("DepositLedgerItem", back_populates="deposit_flow")


class UtilityBill(Base):
    __tablename__ = "utility_bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_no = Column(String, unique=True, index=True, nullable=False)
    contract_id = Column(Integer, ForeignKey("lease_contracts.id"), nullable=False)
    bill_period = Column(String, nullable=False)
    water_fee = Column(Float, default=0)
    electricity_fee = Column(Float, default=0)
    gas_fee = Column(Float, default=0)
    other_fee = Column(Float, default=0)
    total_amount = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=False)
    billed_at = Column(DateTime, nullable=False)
    remark = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    contract = relationship("LeaseContract", back_populates="utility_bills")
    ledger_items = relationship("DepositLedgerItem", back_populates="utility_bill")


class RepairOrder(Base):
    __tablename__ = "repair_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String, unique=True, index=True, nullable=False)
    contract_id = Column(Integer, ForeignKey("lease_contracts.id"), nullable=False)
    repair_type = Column(String, nullable=False)
    description = Column(Text)
    repair_cost = Column(Float, default=0)
    is_tenant_responsible = Column(Boolean)
    status = Column(String, default="pending")
    reported_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    contract = relationship("LeaseContract", back_populates="repair_orders")
    ledger_items = relationship("DepositLedgerItem", back_populates="repair_order")


class DepositLedger(Base):
    __tablename__ = "deposit_ledgers"

    id = Column(Integer, primary_key=True, index=True)
    ledger_no = Column(String, unique=True, index=True, nullable=False)
    contract_id = Column(Integer, ForeignKey("lease_contracts.id"), nullable=False)
    total_deposit = Column(Float, nullable=False)
    total_deduction = Column(Float, default=0)
    refund_amount = Column(Float, default=0)
    status = Column(String, default="calculating")
    disputed = Column(Boolean, default=False)
    dispute_status = Column(String)
    next_verifier = Column(String)
    rent_free_adjustment = Column(Float, default=0)
    is_rent_free_pending = Column(Boolean, default=False)
    calculated_at = Column(DateTime)
    confirmed_at = Column(DateTime)
    remark = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contract = relationship("LeaseContract", back_populates="deposit_ledgers")
    ledger_items = relationship("DepositLedgerItem", back_populates="ledger", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="ledger", cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="ledger", cascade="all, delete-orphan")


class DepositLedgerItem(Base):
    __tablename__ = "deposit_ledger_items"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("deposit_ledgers.id"), nullable=False)
    item_type = Column(String, nullable=False)
    deduction_order = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    source_id = Column(Integer)
    deposit_flow_id = Column(Integer, ForeignKey("deposit_flows.id"))
    utility_bill_id = Column(Integer, ForeignKey("utility_bills.id"))
    repair_order_id = Column(Integer, ForeignKey("repair_orders.id"))
    created_at = Column(DateTime, server_default=func.now())

    ledger = relationship("DepositLedger", back_populates="ledger_items")
    deposit_flow = relationship("DepositFlow", back_populates="ledger_items")
    utility_bill = relationship("UtilityBill", back_populates="ledger_items")
    repair_order = relationship("RepairOrder", back_populates="ledger_items")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("deposit_ledgers.id"), nullable=False)
    field_name = Column(String, nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(String)
    change_reason = Column(Text)
    changed_at = Column(DateTime, server_default=func.now())

    ledger = relationship("DepositLedger", back_populates="audit_logs")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("deposit_ledgers.id"), nullable=False)
    dispute_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="pending")
    next_verifier = Column(String, nullable=False)
    raised_by = Column(String)
    raised_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime)
    resolution = Column(Text)

    ledger = relationship("DepositLedger", back_populates="disputes")
