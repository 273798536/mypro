from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Index

from app.database import Base

class ReplayChain(Base):
    __tablename__ = "replay_chains"
    
    id = Column(Integer, primary_key=True, index=True)
    chain_id = Column(String(100), unique=True, index=True, comment="链路ID")
    chain_name = Column(String(200), comment="链路名称")
    branch_id = Column(String(50), comment="网点ID")
    branch_name = Column(String(200), comment="网点名称")
    replay_date = Column(String(20), comment="回放日期")
    
    status = Column(String(50), default="created", comment="链路状态：created/data_ready/service_started/request_sent/reconciled/exported/completed/failed")
    
    data_generation_id = Column(String(100), comment="造数任务ID")
    service_start_time = Column(DateTime, comment="服务启动时间")
    service_stop_time = Column(DateTime, comment="服务停止时间")
    
    request_count = Column(Integer, default=0, comment="发送请求数")
    request_success_count = Column(Integer, default=0, comment="请求成功数")
    request_failed_count = Column(Integer, default=0, comment="请求失败数")
    
    reconcile_result = Column(Text, comment="对账结果(JSON)")
    reconcile_diff_count = Column(Integer, default=0, comment="对账差异数")
    
    export_file_path = Column(String(500), comment="导出文件路径")
    export_file_name = Column(String(200), comment="导出文件名")
    
    anomaly_count = Column(Integer, default=0, comment="异常数")
    anomaly_details = Column(Text, comment="异常详情(JSON)")
    
    created_by = Column(String(100), comment="创建人")
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime, comment="完成时间")
    duration_seconds = Column(Float, comment="耗时(秒)")
    
    http_request_log = Column(Text, comment="HTTP请求日志(JSON)")
    command_script_log = Column(Text, comment="命令脚本日志")
    persistence_log = Column(Text, comment="本地持久化日志")
    
    __table_args__ = (
        Index('idx_branch_date', 'branch_id', 'replay_date'),
    )
