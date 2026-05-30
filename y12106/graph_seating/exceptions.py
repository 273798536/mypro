from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


class GraphSeatingError(Exception):
    pass


class DataValidationError(GraphSeatingError):
    def __init__(self, message: str, bad_rows: Optional[List[Dict[str, Any]]] = None):
        super().__init__(message)
        self.bad_rows = bad_rows or []


class ConflictCycleError(GraphSeatingError):
    def __init__(self, message: str, cycle_nodes: List[str] = None):
        super().__init__(message)
        self.cycle_nodes = cycle_nodes or []


class CapacityError(GraphSeatingError):
    def __init__(self, message: str, required: int, available: int):
        super().__init__(message)
        self.required = required
        self.available = available


class ColoringError(GraphSeatingError):
    def __init__(self, message: str, uncolored_nodes: List[str] = None):
        super().__init__(message)
        self.uncolored_nodes = uncolored_nodes or []


@dataclass
class DataAnomaly:
    row_index: int
    anomaly_type: str
    severity: str
    description: str
    raw_data: Dict[str, Any]
    column: Optional[str] = None
    suggested_action: str = "review"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "row_index": self.row_index,
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "description": self.description,
            "column": self.column,
            "raw_data": self.raw_data,
            "suggested_action": self.suggested_action
        }


@dataclass
class ConflictCycle:
    cycle_id: str
    nodes: List[str]
    edges: List[tuple]
    weight: float
    detected_at: str
    isolated: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cycle_id": self.cycle_id,
            "nodes": self.nodes,
            "edges": [(str(e[0]), str(e[1]), e[2]) for e in self.edges],
            "weight": self.weight,
            "detected_at": self.detected_at,
            "isolated": self.isolated
        }
