from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    OPERATOR = "operator"
    QC_INSPECTOR = "qc_inspector"
    TEAM_LEADER = "team_leader"
    PRODUCTION_MANAGER = "production_manager"
    AUDITOR = "auditor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.OPERATOR, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def has_permission(self, required_role: UserRole) -> bool:
        role_hierarchy = {
            UserRole.OPERATOR: 1,
            UserRole.QC_INSPECTOR: 2,
            UserRole.TEAM_LEADER: 3,
            UserRole.PRODUCTION_MANAGER: 4,
            UserRole.AUDITOR: 5,
            UserRole.ADMIN: 10,
        }
        return role_hierarchy.get(self.role, 0) >= role_hierarchy.get(required_role, 0)
