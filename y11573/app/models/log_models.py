from typing import List
from app.models.base_model import BaseModel


class OperationLog(BaseModel):
    table_name = "operation_logs"
    primary_key = "id"

    @classmethod
    def log_operation(cls, operation_type: str, operation_module: str,
                      operator: str = None, ip_address: str = None,
                      request_path: str = None, request_method: str = None,
                      request_params: dict = None, response_status: str = None,
                      response_data: dict = None, ticket_id: int = None,
                      user_agent: str = None) -> 'OperationLog':
        return cls.create(
            operation_type=operation_type,
            operation_module=operation_module,
            operator=operator,
            ip_address=ip_address,
            request_path=request_path,
            request_method=request_method,
            request_params=request_params or {},
            response_status=response_status,
            response_data=response_data or {},
            ticket_id=ticket_id,
            user_agent=user_agent
        )

    @classmethod
    def get_by_ticket_id(cls, ticket_id: int, limit: int = 100) -> List['OperationLog']:
        return cls.query(
            "ticket_id = ?",
            (ticket_id,),
            order_by="created_at DESC",
            limit=limit
        )

    @classmethod
    def get_by_operator(cls, operator: str, limit: int = 100) -> List['OperationLog']:
        return cls.query(
            "operator = ?",
            (operator,),
            order_by="created_at DESC",
            limit=limit
        )

    @classmethod
    def get_by_module(cls, module: str, limit: int = 100) -> List['OperationLog']:
        return cls.query(
            "operation_module = ?",
            (module,),
            order_by="created_at DESC",
            limit=limit
        )

    @classmethod
    def get_recent_logs(cls, minutes: int = 60, limit: int = 500) -> List['OperationLog']:
        return cls.query(
            "created_at >= datetime('now', ?)",
            (f'-{minutes} minutes',),
            order_by="created_at DESC",
            limit=limit
        )
