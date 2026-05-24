from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100))
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(50), nullable=False)
    department = Column(String(100))
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)

    status_histories = relationship("StatusHistory", back_populates="operator_user", foreign_keys="StatusHistory.operator_id")
    ledger_comments = relationship("LedgerComment", back_populates="comment_user", foreign_keys="LedgerComment.user_id")


ROLE_PERMISSIONS = {
    "entry": {
        "name": "录入员",
        "visible_fields": [
            "wave_no", "wave_date", "picker_name", "sku_code", "sku_name",
            "pick_qty", "actual_pick_qty", "diff_qty", "diff_type", "diff_reason"
        ],
        "actions": ["create", "edit", "submit", "view_draft"]
    },
    "reviewer": {
        "name": "复核员",
        "visible_fields": [
            "wave_no", "wave_date", "picker_name", "reviewer_name", "sku_code", "sku_name",
            "pick_qty", "actual_pick_qty", "review_qty", "diff_qty", "diff_type",
            "diff_reason", "status", "submit_time"
        ],
        "actions": ["view_pending", "review", "reject", "confirm"]
    },
    "supervisor": {
        "name": "主管",
        "visible_fields": [
            "wave_no", "wave_date", "picker_name", "reviewer_name", "sku_code", "sku_name",
            "pick_qty", "actual_pick_qty", "review_qty", "diff_qty", "diff_type",
            "diff_reason", "status", "submit_time", "review_time", "handle_opinion",
            "performance_impact", "inventory_impact"
        ],
        "actions": ["view_all", "second_confirm", "audit", "export", "assign"]
    },
    "readonly": {
        "name": "只读查看",
        "visible_fields": [
            "wave_no", "wave_date", "picker_name", "sku_code", "sku_name",
            "diff_qty", "diff_type", "status"
        ],
        "actions": ["view_audited"]
    }
}
