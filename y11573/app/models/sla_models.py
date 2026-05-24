from typing import Optional, List
from app.models.base_model import BaseModel


class SlaRule(BaseModel):
    table_name = "sla_rules"
    primary_key = "id"

    @classmethod
    def get_by_code(cls, rule_code: str) -> Optional['SlaRule']:
        results = cls.query("rule_code = ?", (rule_code,), limit=1)
        return results[0] if results else None

    @classmethod
    def get_active_rules(cls) -> List['SlaRule']:
        return cls.query("is_active = 1", order_by="priority_level DESC")

    @classmethod
    def match_rule(cls, ticket_type: str, priority_level: str) -> Optional['SlaRule']:
        results = cls.query(
            "ticket_type = ? AND priority_level = ? AND is_active = 1",
            (ticket_type, priority_level),
            limit=1
        )
        return results[0] if results else None
