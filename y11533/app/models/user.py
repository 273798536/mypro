from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime

from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), unique=True, index=True, comment="用户ID")
    username = Column(String(100), comment="用户名")
    role = Column(String(50), nullable=False, comment="角色：branch_manager/admin/teller_supervisor/operator")
    branch_id = Column(String(50), comment="所属网点ID")
    branch_name = Column(String(200), comment="所属网点名称")
    created_at = Column(DateTime, default=datetime.now)
    
    @staticmethod
    def get_default_users():
        return [
            {"user_id": "U001", "username": "张行长", "role": "branch_manager", "branch_id": "B001", "branch_name": "中关村支行"},
            {"user_id": "U002", "username": "李主管", "role": "teller_supervisor", "branch_id": "B001", "branch_name": "中关村支行"},
            {"user_id": "U003", "username": "王柜员", "role": "operator", "branch_id": "B001", "branch_name": "中关村支行"},
            {"user_id": "U004", "username": "系统管理员", "role": "admin", "branch_id": None, "branch_name": None},
        ]
