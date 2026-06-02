from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime
import uuid
import json


class OperationStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    VALIDATION_ERROR = "validation_error"
    ODE_ERROR = "ode_error"


class OperationType(Enum):
    PARAMETER_IMPORT = "parameter_import"
    DOSING_PLAN_IMPORT = "dosing_plan_import"
    VALIDATION = "validation"
    SIMULATION = "simulation"
    REPORT_EXPORT = "report_export"
    SAMPLING_POINT_ADD = "sampling_point_add"
    DATA_IMPORT = "data_import"


@dataclass
class OperationRecord:
    operation_id: str
    operation_type: OperationType
    status: OperationStatus
    timestamp: datetime
    triggered_by: Optional[str] = None
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    blocked_step: Optional[str] = None
    next_action: Optional[str] = None
    duration_ms: Optional[float] = None
    notes: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "operation_id": self.operation_id,
            "operation_type": self.operation_type.value,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "triggered_by": self.triggered_by,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "error_message": self.error_message,
            "blocked_step": self.blocked_step,
            "next_action": self.next_action,
            "duration_ms": self.duration_ms,
            "notes": self.notes,
            "metadata": self.metadata
        }

    def to_summary(self) -> Dict[str, Any]:
        return {
            "operation_id": self.operation_id,
            "operation_type": self.operation_type.value,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "triggered_by": self.triggered_by,
            "error_message": self.error_message,
            "blocked_step": self.blocked_step,
            "next_action": self.next_action,
            "notes": self.notes
        }


class OperationTracker:
    def __init__(self, max_history: int = 1000):
        self.records: List[OperationRecord] = []
        self.max_history = max_history
        self.active_operations: Dict[str, OperationRecord] = {}

    def start_operation(self, operation_type: OperationType, triggered_by: Optional[str] = None,
                        input_data: Optional[Dict[str, Any]] = None, notes: str = "") -> str:
        op_id = str(uuid.uuid4())
        record = OperationRecord(
            operation_id=op_id,
            operation_type=operation_type,
            status=OperationStatus.RUNNING,
            timestamp=datetime.now(),
            triggered_by=triggered_by,
            input_data=input_data or {},
            notes=notes
        )
        self.active_operations[op_id] = record
        self._add_record(record)
        return op_id

    def update_operation(self, operation_id: str, status: Optional[OperationStatus] = None,
                         output_data: Optional[Dict[str, Any]] = None,
                         error_message: Optional[str] = None,
                         blocked_step: Optional[str] = None,
                         next_action: Optional[str] = None,
                         notes: Optional[str] = None) -> None:
        if operation_id in self.active_operations:
            record = self.active_operations[operation_id]
        else:
            for rec in self.records:
                if rec.operation_id == operation_id:
                    record = rec
                    break
            else:
                raise ValueError(f"Operation not found: {operation_id}")

        if status is not None:
            record.status = status
        if output_data is not None:
            record.output_data = output_data
        if error_message is not None:
            record.error_message = error_message
        if blocked_step is not None:
            record.blocked_step = blocked_step
        if next_action is not None:
            record.next_action = next_action
        if notes is not None:
            record.notes = notes

        if status in [OperationStatus.COMPLETED, OperationStatus.FAILED,
                      OperationStatus.VALIDATION_ERROR, OperationStatus.ODE_ERROR]:
            duration = (datetime.now() - record.timestamp).total_seconds() * 1000
            record.duration_ms = round(duration, 2)
            if operation_id in self.active_operations:
                del self.active_operations[operation_id]

    def complete_operation(self, operation_id: str, output_data: Optional[Dict[str, Any]] = None,
                           notes: Optional[str] = None) -> None:
        self.update_operation(
            operation_id,
            status=OperationStatus.COMPLETED,
            output_data=output_data,
            notes=notes
        )

    def fail_operation(self, operation_id: str, error_message: str,
                       blocked_step: Optional[str] = None,
                       next_action: Optional[str] = None,
                       error_type: OperationStatus = OperationStatus.FAILED) -> None:
        self.update_operation(
            operation_id,
            status=error_type,
            error_message=error_message,
            blocked_step=blocked_step,
            next_action=next_action
        )

    def _add_record(self, record: OperationRecord) -> None:
        self.records.insert(0, record)
        if len(self.records) > self.max_history:
            self.records = self.records[:self.max_history]

    def get_operation(self, operation_id: str) -> Optional[OperationRecord]:
        for rec in self.records:
            if rec.operation_id == operation_id:
                return rec
        return None

    def get_operation_history(self, limit: Optional[int] = None,
                              status_filter: Optional[List[OperationStatus]] = None,
                              type_filter: Optional[List[OperationType]] = None) -> List[Dict[str, Any]]:
        filtered = self.records
        if status_filter:
            filtered = [r for r in filtered if r.status in status_filter]
        if type_filter:
            filtered = [r for r in filtered if r.operation_type in type_filter]
        if limit:
            filtered = filtered[:limit]
        return [r.to_summary() for r in filtered]

    def get_active_operations(self) -> List[Dict[str, Any]]:
        return [r.to_summary() for r in self.active_operations.values()]

    def get_error_trace(self, operation_id: str) -> Dict[str, Any]:
        record = self.get_operation(operation_id)
        if not record:
            return {"error": "Operation not found"}
        return {
            "operation_id": record.operation_id,
            "operation_type": record.operation_type.value,
            "status": record.status.value,
            "triggered_by": record.triggered_by,
            "timestamp": record.timestamp.isoformat(),
            "error_message": record.error_message,
            "blocked_step": record.blocked_step,
            "next_action": record.next_action,
            "input_summary": self._summarize_input(record.input_data),
            "notes": record.notes
        }

    def _summarize_input(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        summary = {}
        for key, value in input_data.items():
            if isinstance(value, (int, float, str, bool)):
                summary[key] = value
            elif isinstance(value, list):
                summary[key] = f"[列表，长度={len(value)}]"
            elif isinstance(value, dict):
                summary[key] = f"[字典，键={list(value.keys())[:5]}...]"
            else:
                summary[key] = f"[{type(value).__name__}]"
        return summary

    def get_statistics(self) -> Dict[str, Any]:
        total = len(self.records)
        by_status = {}
        for status in OperationStatus:
            by_status[status.value] = len([r for r in self.records if r.status == status])
        by_type = {}
        for op_type in OperationType:
            by_type[op_type.value] = len([r for r in self.records if r.operation_type == op_type])
        failed_ops = [r for r in self.records if r.status in [OperationStatus.FAILED,
                                                              OperationStatus.VALIDATION_ERROR,
                                                              OperationStatus.ODE_ERROR]]
        avg_duration = None
        completed = [r for r in self.records if r.status == OperationStatus.COMPLETED and r.duration_ms]
        if completed:
            avg_duration = sum(r.duration_ms for r in completed) / len(completed)
        return {
            "total_operations": total,
            "by_status": by_status,
            "by_type": by_type,
            "active_operations": len(self.active_operations),
            "failed_operations": len(failed_ops),
            "average_duration_ms": round(avg_duration, 2) if avg_duration else None
        }

    def export_history(self, filepath: str) -> None:
        data = [r.to_dict() for r in self.records]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    def create_operation_link(self, operation_id: str, related_id: str,
                              link_type: str = "depends_on") -> None:
        record = self.get_operation(operation_id)
        if record:
            if "links" not in record.metadata:
                record.metadata["links"] = []
            record.metadata["links"].append({
                "related_id": related_id,
                "link_type": link_type,
                "timestamp": datetime.now().isoformat()
            })

    def trace_data_origin(self, operation_id: str) -> List[Dict[str, Any]]:
        trace = []
        visited = set()
        stack = [operation_id]
        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue
            visited.add(current_id)
            record = self.get_operation(current_id)
            if record:
                trace.append(record.to_summary())
                links = record.metadata.get("links", [])
                for link in links:
                    if link["link_type"] == "depends_on":
                        stack.append(link["related_id"])
        return trace
