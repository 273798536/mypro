from typing import Optional, List
from app.models.base_model import BaseModel


class Ticket(BaseModel):
    table_name = "tickets"
    primary_key = "id"

    @classmethod
    def get_by_ticket_no(cls, ticket_no: str) -> Optional['Ticket']:
        results = cls.query("ticket_no = ?", (ticket_no,), limit=1)
        return results[0] if results else None

    @classmethod
    def get_by_status(cls, status: str) -> List['Ticket']:
        return cls.query("status = ?", (status,), order_by="created_at DESC")

    @classmethod
    def get_by_handler(cls, handler: str) -> List['Ticket']:
        return cls.query("current_handler = ?", (handler,), order_by="updated_at DESC")


class TicketTransferLog(BaseModel):
    table_name = "ticket_transfer_logs"
    primary_key = "id"

    @classmethod
    def get_by_ticket_id(cls, ticket_id: int) -> List['TicketTransferLog']:
        return cls.query("ticket_id = ?", (ticket_id,), order_by="transfer_time ASC")

    @classmethod
    def get_transfer_count(cls, ticket_id: int) -> int:
        return cls.count("ticket_id = ?", (ticket_id,))
