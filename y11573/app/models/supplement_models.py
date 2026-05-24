from typing import List
from app.models.base_model import BaseModel


class TemporarySupplement(BaseModel):
    table_name = "temporary_supplements"
    primary_key = "id"

    @classmethod
    def get_by_ticket_id(cls, ticket_id: int) -> List['TemporarySupplement']:
        return cls.query("ticket_id = ?", (ticket_id,), order_by="created_at DESC")

    @classmethod
    def get_by_type(cls, ticket_id: int, supplement_type: str) -> List['TemporarySupplement']:
        return cls.query(
            "ticket_id = ? AND supplement_type = ?",
            (ticket_id, supplement_type),
            order_by="created_at DESC"
        )
