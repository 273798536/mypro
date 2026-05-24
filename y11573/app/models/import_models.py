from typing import Optional, List
from app.models.base_model import BaseModel
from app.database import get_db_connection


class ImportSource(BaseModel):
    table_name = "import_sources"
    primary_key = "id"

    @classmethod
    def get_by_hash(cls, file_hash: str) -> Optional['ImportSource']:
        results = cls.query("source_file_hash = ?", (file_hash,), limit=1)
        return results[0] if results else None

    @classmethod
    def check_duplicate(cls, file_hash: str) -> bool:
        return cls.count("source_file_hash = ?", (file_hash,)) > 0


class ImportRawData(BaseModel):
    table_name = "import_raw_data"
    primary_key = "id"

    @classmethod
    def get_by_source_and_line(cls, source_id: int, line_number: int) -> Optional['ImportRawData']:
        results = cls.query(
            "import_source_id = ? AND source_line_number = ?",
            (source_id, line_number),
            limit=1
        )
        return results[0] if results else None

    @classmethod
    def get_by_source_id(cls, source_id: int) -> List['ImportRawData']:
        return cls.query("import_source_id = ?", (source_id,), order_by="source_line_number ASC", limit=10000)

    @classmethod
    def bulk_create(cls, records: List[dict]) -> None:
        if not records:
            return
        
        columns = list(records[0].keys())
        placeholders = ", ".join(["?" for _ in columns])
        query = f"""
            INSERT OR IGNORE INTO {cls.table_name} ({', '.join(columns)})
            VALUES ({placeholders})
        """
        
        values_list = []
        for record in records:
            values = [record.get(col) for col in columns]
            values_list.append(values)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(query, values_list)
