from typing import Optional
from app.models.base_model import BaseModel
from datetime import datetime


class HistoryArchive(BaseModel):
    table_name = "history_archives"
    primary_key = "id"

    @classmethod
    def get_by_date(cls, archive_date: str) -> Optional['HistoryArchive']:
        results = cls.query("archive_date = ?", (archive_date,), order_by="archived_at DESC", limit=1)
        return results[0] if results else None

    @classmethod
    def create_archive(cls, archive_date: str, archive_type: str,
                       archive_path: str, file_size: int = 0,
                       record_count: int = 0, archived_by: str = None,
                       checksum: str = None, remark: str = None) -> 'HistoryArchive':
        return cls.create(
            archive_date=archive_date,
            archive_type=archive_type,
            archive_path=archive_path,
            file_size=file_size,
            record_count=record_count,
            archived_by=archived_by,
            checksum=checksum,
            remark=remark
        )

    @classmethod
    def get_by_type(cls, archive_type: str, limit: int = 100):
        return cls.query(
            "archive_type = ?",
            (archive_type,),
            order_by="archive_date DESC",
            limit=limit
        )
