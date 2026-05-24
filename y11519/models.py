from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class MaterialStatus(str, enum.Enum):
    DRAFT = "草稿"
    SUBMITTED = "已提交"
    REJECTED = "已驳回"
    CONFIRMED = "二次确认"
    AUDIT = "只读审计"
    EXPORTED = "已导出"


class DataSource(str, enum.Enum):
    WORK_ORDER = "派工单"
    VALVE_INVENTORY = "阀门库存"
    SCENE_PHOTO = "现场照片"
    ABNORMAL_PHOTO = "异常照片"
    SMS_SCREENSHOT = "短信截图"


class SyncStrategy(str, enum.Enum):
    IGNORE = "忽略"
    OVERWRITE = "覆盖"
    APPEND = "追加"


class TaskStatus(str, enum.Enum):
    PENDING = "待处理"
    PROCESSING = "处理中"
    WAIT_RETRY = "等重试"
    WAIT_MANUAL = "等人工"
    PERMANENT_FAILED = "永久失败"
    COMPLETED = "已完成"


class Role(str, enum.Enum):
    SITE_MANAGER = "站点负责人"
    AUDITOR = "审计员"
    OPERATOR = "操作员"
    ADMIN = "管理员"


class MaterialLedger(Base):
    __tablename__ = "material_ledger"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(100), index=True, comment="批次号")
    material_name = Column(String(200), comment="材料名称")
    material_code = Column(String(100), index=True, comment="材料编码")
    quantity = Column(Float, comment="数量")
    unit = Column(String(50), comment="单位")
    source = Column(String(50), comment="数据来源")
    work_order_no = Column(String(100), index=True, comment="派工单号")
    site_name = Column(String(200), comment="站点名称")
    operator = Column(String(100), comment="当前操作者")
    status = Column(String(50), default=MaterialStatus.DRAFT.value, comment="状态")
    is_negative_inventory = Column(Boolean, default=False, comment="是否负库存")
    repair_time = Column(DateTime, comment="抢修时间")
    photo_urls = Column(JSON, default=list, comment="照片URL列表")
    sms_content = Column(Text, comment="短信内容")
    remark = Column(Text, comment="备注")
    sensitive_fields = Column(JSON, default=dict, comment="敏感字段标记")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(100), comment="创建人")

    status_histories = relationship("StatusHistory", back_populates="ledger", cascade="all, delete-orphan")
    change_histories = relationship("ChangeHistory", back_populates="ledger", cascade="all, delete-orphan")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("material_ledger.id"))
    from_status = Column(String(50), comment="源状态")
    to_status = Column(String(50), comment="目标状态")
    operator = Column(String(100), comment="操作者")
    operate_time = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text, comment="变更原因")
    role = Column(String(50), comment="操作者角色")

    ledger = relationship("MaterialLedger", back_populates="status_histories")


class ChangeHistory(Base):
    __tablename__ = "change_history"

    id = Column(Integer, primary_key=True, index=True)
    ledger_id = Column(Integer, ForeignKey("material_ledger.id"))
    field_name = Column(String(100), comment="字段名")
    old_value = Column(Text, comment="旧值")
    new_value = Column(Text, comment="新值")
    operator = Column(String(100), comment="操作者")
    operate_time = Column(DateTime(timezone=True), server_default=func.now())
    change_reason = Column(Text, comment="变更原因")

    ledger = relationship("MaterialLedger", back_populates="change_histories")


class AsyncTask(Base):
    __tablename__ = "async_task"

    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String(100), comment="任务名称")
    task_type = Column(String(50), comment="任务类型")
    batch_no = Column(String(100), index=True, comment="关联批次号")
    status = Column(String(50), default=TaskStatus.PENDING.value, comment="任务状态")
    sync_strategy = Column(String(50), comment="同步策略")
    retry_count = Column(Integer, default=0, comment="重试次数")
    max_retries = Column(Integer, default=3, comment="最大重试次数")
    error_message = Column(Text, comment="错误信息")
    error_detail = Column(JSON, comment="错误详情")
    payload = Column(JSON, comment="任务载荷")
    result = Column(JSON, comment="执行结果")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    next_retry_at = Column(DateTime, comment="下次重试时间")


class UserRole(Base):
    __tablename__ = "user_role"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, comment="用户名")
    role = Column(String(50), comment="角色")
    site_name = Column(String(200), comment="负责站点")
    permissions = Column(JSON, default=list, comment="权限列表")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
