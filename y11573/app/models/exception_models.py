from typing import List
from app.models.base_model import BaseModel
from datetime import datetime


class PlaybackException(BaseModel):
    table_name = "playback_exceptions"
    primary_key = "id"

    @classmethod
    def create_exception(cls, ticket_id: int, exception_type: str,
                         exception_message: str, playback_step: str = None,
                         exception_code: str = None, context_data: dict = None,
                         assignee: str = None) -> 'PlaybackException':
        return cls.create(
            ticket_id=ticket_id,
            exception_type=exception_type,
            exception_code=exception_code,
            exception_message=exception_message,
            playback_step=playback_step,
            context_data=context_data or {},
            resolution_status='open',
            assignee=assignee
        )

    @classmethod
    def get_by_ticket_id(cls, ticket_id: int) -> List['PlaybackException']:
        return cls.query("ticket_id = ?", (ticket_id,), order_by="detected_at DESC")

    @classmethod
    def get_open_exceptions(cls, limit: int = 100) -> List['PlaybackException']:
        return cls.query("resolution_status = 'open'", order_by="detected_at DESC", limit=limit)

    @classmethod
    def get_by_type(cls, exception_type: str) -> List['PlaybackException']:
        return cls.query(
            "exception_type = ?",
            (exception_type,),
            order_by="detected_at DESC"
        )

    def resolve(self, resolution_note: str, resolved_by: str = None) -> None:
        self.update(
            self.id,
            resolution_status='resolved',
            resolved_at=datetime.now().isoformat(),
            resolution_note=resolution_note,
            assignee=resolved_by or self.assignee
        )

    def assign(self, assignee: str) -> None:
        self.update(self.id, assignee=assignee)
