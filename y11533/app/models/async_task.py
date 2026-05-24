from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Index

from app.database import Base

class AsyncTask(Base):
    __tablename__ = "async_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(100), unique=True, index=True, comment="任务ID")
    task_type = Column(String(50), nullable=False, comment="任务类型：import/export/replay/reconcile")
    task_name = Column(String(200), comment="任务名称")
    status = Column(String(50), default="pending", comment="任务状态：pending/running/success/waiting_retry/waiting_manual/failed")
    priority = Column(Integer, default=0, comment="优先级")
    
    failure_category = Column(String(50), comment="失败分类：WAITING_RETRY/WAITING_MANUAL/PERMANENT_FAILED")
    failure_reason = Column(Text, comment="失败原因")
    retry_count = Column(Integer, default=0, comment="重试次数")
    max_retry_count = Column(Integer, default=3, comment="最大重试次数")
    next_retry_time = Column(DateTime, comment="下次重试时间")
    
    manual_opinion = Column(Text, comment="人工处理意见")
    manual_operator = Column(String(100), comment="人工处理人")
    manual_time = Column(DateTime, comment="人工处理时间")
    
    input_data = Column(Text, comment="输入数据(JSON)")
    output_data = Column(Text, comment="输出数据(JSON)")
    error_trace = Column(Text, comment="错误堆栈")
    
    progress = Column(Integer, default=0, comment="进度百分比")
    progress_message = Column(String(500), comment="进度消息")
    
    created_by = Column(String(100), comment="创建人")
    created_at = Column(DateTime, default=datetime.now)
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    
    parent_task_id = Column(String(100), comment="父任务ID")
    is_resumable = Column(Boolean, default=True, comment="是否可恢复")
    checkpoint = Column(Text, comment="检查点数据(JSON)")
    
    __table_args__ = (
        Index('idx_status_priority', 'status', 'priority'),
        Index('idx_next_retry_time', 'next_retry_time'),
    )
