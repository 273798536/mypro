from typing import List, Optional
from app.models.base_model import BaseModel


class SessionSummary(BaseModel):
    table_name = "session_summaries"
    primary_key = "id"

    @classmethod
    def get_by_ticket_id(cls, ticket_id: int) -> List['SessionSummary']:
        return cls.query("ticket_id = ?", (ticket_id,), order_by="version DESC")

    @classmethod
    def get_latest_by_ticket_id(cls, ticket_id: int) -> Optional['SessionSummary']:
        results = cls.query(
            "ticket_id = ?",
            (ticket_id,),
            order_by="version DESC",
            limit=1
        )
        return results[0] if results else None
