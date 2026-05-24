from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text

from app.database import Base

class ImportBatch(Base):
    __tablename__ = "import_batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(100), unique=True, index=True, comment="批次号")
    batch_name = Column(String(200), comment="批次名称")
    data_type = Column(String(50), nullable=False, comment="数据类型：schedule/leave/forecast/adjustment/record")
    source_file_name = Column(String(500), comment="源文件名")
    source_file_hash = Column(String(100), comment="源文件哈希，用于去重")
    source_file_path = Column(String(500), comment="源文件存储路径")
    
    total_rows = Column(Integer, default=0, comment="总行数")
    success_rows = Column(Integer, default=0, comment="成功行数")
    failed_rows = Column(Integer, default=0, comment="失败行数")
    skipped_rows = Column(Integer, default=0, comment="跳过敏行数")
    
    status = Column(String(50), default="processing", comment="状态")
    error_message = Column(Text, comment="错误信息")
    
    created_by = Column(String(100), comment="创建人")
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime, comment="完成时间")
