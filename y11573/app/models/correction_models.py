from typing import List, Optional
from app.models.base_model import BaseModel


class ImportCorrection(BaseModel):
    table_name = "import_corrections"
    primary_key = "id"

    @classmethod
    def get_by_raw_id(cls, raw_id: int) -> List['ImportCorrection']:
        return cls.query("import_raw_id = ?", (raw_id,), order_by="created_at DESC")

    @classmethod
    def get_latest_by_raw_id(cls, raw_id: int) -> Optional['ImportCorrection']:
        results = cls.query(
            "import_raw_id = ?",
            (raw_id,),
            order_by="created_at DESC",
            limit=1
        )
        return results[0] if results else None

    @classmethod
    def get_pending_by_source(cls, source_id: int) -> List['ImportCorrection']:
        return cls.query(
            "import_raw_id IN (SELECT id FROM import_raw_data WHERE import_source_id = ?) AND correction_status = 'pending'",
            (source_id,),
            order_by="created_at DESC"
        )

    @classmethod
    def get_by_source(cls, source_id: int) -> List['ImportCorrection']:
        return cls.query(
            "import_raw_id IN (SELECT id FROM import_raw_data WHERE import_source_id = ?)",
            (source_id,),
            order_by="created_at DESC"
        )
