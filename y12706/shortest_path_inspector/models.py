"""数据模型定义。"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any
import json
from pathlib import Path


@dataclass
class Edge:
    """图的边。"""
    from_node: str
    to_node: str
    weight: float
    label: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {"from": self.from_node, "to": self.to_node, "weight": self.weight}
        if self.label:
            d["label"] = self.label
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Edge":
        return cls(
            from_node=d["from"],
            to_node=d["to"],
            weight=float(d["weight"]),
            label=d.get("label"),
        )


@dataclass
class GraphData:
    """完整的图数据输入。"""
    graph_id: str
    nodes: List[str] = field(default_factory=list)
    edges: List[Edge] = field(default_factory=list)
    source: Optional[str] = None
    target: Optional[str] = None
    expected_distance: Optional[float] = None
    expected_path: Optional[List[str]] = None
    tolerance: float = 1e-6
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "graph_id": self.graph_id,
            "nodes": self.nodes,
            "edges": [e.to_dict() for e in self.edges],
            "tolerance": self.tolerance,
        }
        if self.source:
            d["source"] = self.source
        if self.target:
            d["target"] = self.target
        if self.expected_distance is not None:
            d["expected_distance"] = self.expected_distance
        if self.expected_path is not None:
            d["expected_path"] = self.expected_path
        if self.notes:
            d["notes"] = self.notes
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "GraphData":
        return cls(
            graph_id=d["graph_id"],
            nodes=list(d.get("nodes", [])),
            edges=[Edge.from_dict(e) for e in d.get("edges", [])],
            source=d.get("source"),
            target=d.get("target"),
            expected_distance=d.get("expected_distance"),
            expected_path=d.get("expected_path"),
            tolerance=float(d.get("tolerance", 1e-6)),
            notes=d.get("notes"),
        )


@dataclass
class PathResult:
    """最短路计算结果。"""
    distance: Optional[float]
    path: Optional[List[str]]
    success: bool
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "distance": self.distance,
            "path": self.path,
            "success": self.success,
            "error": self.error,
        }


@dataclass
class ValidationItem:
    """单项校验结果。"""
    name: str
    passed: bool
    message: str
    before: Optional[Any] = None
    after: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {"name": self.name, "passed": self.passed, "message": self.message}
        if self.before is not None:
            d["before"] = self.before
        if self.after is not None:
            d["after"] = self.after
        return d


@dataclass
class InspectionResult:
    """单个图的完整巡检结果。"""
    graph_id: str
    computation: PathResult
    validations: List[ValidationItem] = field(default_factory=list)
    missing_drafts: List[str] = field(default_factory=list)
    needs_confirmation: bool = False
    confirmed: Optional[bool] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[str] = None

    @property
    def all_passed(self) -> bool:
        return all(v.passed for v in self.validations) and self.computation.success

    def to_dict(self) -> Dict[str, Any]:
        return {
            "graph_id": self.graph_id,
            "computation": self.computation.to_dict(),
            "validations": [v.to_dict() for v in self.validations],
            "missing_drafts": self.missing_drafts,
            "needs_confirmation": self.needs_confirmation,
            "confirmed": self.confirmed,
            "confirmed_by": self.confirmed_by,
            "confirmed_at": self.confirmed_at,
            "all_passed": self.all_passed,
        }


@dataclass
class BatchReport:
    """整批巡检报告。"""
    batch_id: str
    timestamp: str
    input_dir: str
    output_dir: str
    total: int = 0
    computed: int = 0
    passed: int = 0
    failed: int = 0
    missing_draft_graphs: List[str] = field(default_factory=list)
    needs_confirmation_graphs: List[str] = field(default_factory=list)
    results: Dict[str, InspectionResult] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "timestamp": self.timestamp,
            "input_dir": self.input_dir,
            "output_dir": self.output_dir,
            "total": self.total,
            "computed": self.computed,
            "passed": self.passed,
            "failed": self.failed,
            "missing_draft_graphs": self.missing_draft_graphs,
            "needs_confirmation_graphs": self.needs_confirmation_graphs,
            "results": {gid: r.to_dict() for gid, r in self.results.items()},
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)
