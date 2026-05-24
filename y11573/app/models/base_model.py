import json
from datetime import datetime
from typing import List, Dict, Any, Optional, TypeVar, Type
from app.database import get_db_connection

T = TypeVar('T', bound='BaseModel')


class BaseModel:
    table_name: str = ""
    primary_key: str = "id"

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result

    @classmethod
    def from_row(cls, row) -> T:
        data = {}
        for key in row.keys():
            data[key] = row[key]
        return cls(**data)

    @classmethod
    def create(cls, **kwargs) -> T:
        columns = []
        placeholders = []
        values = []
        
        for key, value in kwargs.items():
            columns.append(key)
            placeholders.append("?")
            values.append(cls._serialize_value(value))
        
        query = f"""
            INSERT INTO {cls.table_name} ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
        """
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, values)
            new_id = cursor.lastrowid
            
            select_query = f"SELECT * FROM {cls.table_name} WHERE {cls.primary_key} = ?"
            cursor.execute(select_query, (new_id,))
            row = cursor.fetchone()
            if row:
                return cls.from_row(row)
            return None

    @classmethod
    def get_by_id(cls: Type[T], record_id: int) -> Optional[T]:
        query = f"SELECT * FROM {cls.table_name} WHERE {cls.primary_key} = ?"
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (record_id,))
            row = cursor.fetchone()
            if row:
                return cls.from_row(row)
        return None

    @classmethod
    def get_all(cls: Type[T], limit: int = 100, offset: int = 0) -> List[T]:
        query = f"SELECT * FROM {cls.table_name} ORDER BY {cls.primary_key} DESC LIMIT ? OFFSET ?"
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (limit, offset))
            rows = cursor.fetchall()
            return [cls.from_row(row) for row in rows]

    @classmethod
    def update(cls, record_id: int, **kwargs) -> bool:
        if not kwargs:
            return False
        
        set_clause = ", ".join([f"{key} = ?" for key in kwargs.keys()])
        values = [cls._serialize_value(value) for value in kwargs.values()]
        values.append(record_id)
        
        query = f"UPDATE {cls.table_name} SET {set_clause} WHERE {cls.primary_key} = ?"
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, values)
            return cursor.rowcount > 0

    @classmethod
    def delete(cls, record_id: int) -> bool:
        query = f"DELETE FROM {cls.table_name} WHERE {cls.primary_key} = ?"
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (record_id,))
            return cursor.rowcount > 0

    @classmethod
    def query(cls: Type[T], where_clause: str = "", params: tuple = (), 
              order_by: str = "", limit: int = 100, offset: int = 0) -> List[T]:
        query = f"SELECT * FROM {cls.table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        if order_by:
            query += f" ORDER BY {order_by}"
        query += f" LIMIT ? OFFSET ?"
        
        params = list(params) + [limit, offset]
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [cls.from_row(row) for row in rows]

    @classmethod
    def count(cls, where_clause: str = "", params: tuple = ()) -> int:
        query = f"SELECT COUNT(*) as cnt FROM {cls.table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            row = cursor.fetchone()
            return row['cnt'] if row else 0

    @staticmethod
    def _serialize_value(value: Any) -> Any:
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    @staticmethod
    def _deserialize_value(value: str) -> Any:
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
