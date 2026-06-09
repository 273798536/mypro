"""
处理记录管理模块
用于存储、查询和对比历史巡检记录，界面与报告共用同一批处理记录
"""

import json
import os
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict
from collections import defaultdict


@dataclass
class ProcessingRecord:
    """单条处理记录"""
    record_id: str
    graph_name: str
    graph_hash: str
    timestamp: str
    euler_type: str
    has_euler_path: bool
    has_euler_circuit: bool
    is_connected: bool
    vertex_count: int
    edge_count: int
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    boundary_cases: List[str] = field(default_factory=list)
    start_vertex: Optional[Any] = None
    end_vertex: Optional[Any] = None
    path_preview: Optional[str] = None
    review_notes: List[str] = field(default_factory=list)
    reviewed: bool = False
    raw_result: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["start_vertex"] = str(self.start_vertex) if self.start_vertex is not None else None
        d["end_vertex"] = str(self.end_vertex) if self.end_vertex is not None else None
        return d


@dataclass
class BatchRecord:
    """批次处理记录（界面与报告共用）"""
    batch_id: str
    timestamp: str
    records: List[ProcessingRecord] = field(default_factory=list)
    batch_notes: List[str] = field(default_factory=list)
    operator: str = "algorithm_engineer"

    @property
    def total_count(self) -> int:
        return len(self.records)

    @property
    def success_count(self) -> int:
        return sum(1 for r in self.records if not r.errors)

    @property
    def error_count(self) -> int:
        return sum(1 for r in self.records if r.errors)

    @property
    def boundary_count(self) -> int:
        return sum(1 for r in self.records if r.boundary_cases)

    @property
    def unreviewed_count(self) -> int:
        return sum(1 for r in self.records if not r.reviewed)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "timestamp": self.timestamp,
            "operator": self.operator,
            "batch_notes": self.batch_notes,
            "summary": {
                "total": self.total_count,
                "success": self.success_count,
                "error": self.error_count,
                "boundary": self.boundary_count,
                "unreviewed": self.unreviewed_count
            },
            "records": [r.to_dict() for r in self.records]
        }


class RecordManager:
    """处理记录管理器"""

    def __init__(self, storage_path: str = "./euler_records"):
        self.storage_path = storage_path
        self._batches: Dict[str, BatchRecord] = {}
        self._current_batch: Optional[BatchRecord] = None
        os.makedirs(self.storage_path, exist_ok=True)

    def start_batch(self, operator: str = "algorithm_engineer",
                    notes: Optional[List[str]] = None) -> BatchRecord:
        """开始一个新的处理批次"""
        batch_id = self._generate_batch_id()
        batch = BatchRecord(
            batch_id=batch_id,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator=operator,
            batch_notes=notes or []
        )
        self._batches[batch_id] = batch
        self._current_batch = batch
        return batch

    def add_record(self, batch_id: str, record: ProcessingRecord) -> None:
        """向批次中添加处理记录"""
        if batch_id not in self._batches:
            raise KeyError(f"批次不存在: {batch_id}")
        self._batches[batch_id].records.append(record)

    def get_batch(self, batch_id: str) -> Optional[BatchRecord]:
        """获取指定批次"""
        return self._batches.get(batch_id)

    def list_batches(self, limit: int = 10) -> List[BatchRecord]:
        """列出最近的批次"""
        sorted_batches = sorted(
            self._batches.values(),
            key=lambda b: b.timestamp,
            reverse=True
        )
        return sorted_batches[:limit]

    def compare_records(self, record_id_1: str, record_id_2: str) -> Dict[str, Any]:
        """对比两条处理记录"""
        r1 = self._find_record(record_id_1)
        r2 = self._find_record(record_id_2)

        if r1 is None or r2 is None:
            return {"error": "找不到指定记录"}

        diffs = {
            "record_1": r1.to_dict(),
            "record_2": r2.to_dict(),
            "differences": {}
        }

        for field_name in [
            "graph_name", "euler_type", "has_euler_path", "has_euler_circuit",
            "is_connected", "vertex_count", "edge_count"
        ]:
            v1 = getattr(r1, field_name)
            v2 = getattr(r2, field_name)
            if v1 != v2:
                diffs["differences"][field_name] = {
                    "record_1": v1,
                    "record_2": v2
                }

        diffs["differences"]["warnings_only_in_1"] = [
            w for w in r1.warnings if w not in r2.warnings
        ]
        diffs["differences"]["warnings_only_in_2"] = [
            w for w in r2.warnings if w not in r1.warnings
        ]
        diffs["differences"]["errors_only_in_1"] = [
            e for e in r1.errors if e not in r2.errors
        ]
        diffs["differences"]["errors_only_in_2"] = [
            e for e in r2.errors if e not in r1.errors
        ]
        diffs["differences"]["boundary_cases_only_in_1"] = [
            b for b in r1.boundary_cases if b not in r2.boundary_cases
        ]
        diffs["differences"]["boundary_cases_only_in_2"] = [
            b for b in r2.boundary_cases if b not in r1.boundary_cases
        ]

        return diffs

    def find_by_boundary_case(self, boundary_tag: str) -> List[ProcessingRecord]:
        """根据边界样例标签查找记录"""
        results = []
        for batch in self._batches.values():
            for record in batch.records:
                if any(boundary_tag in bc for bc in record.boundary_cases):
                    results.append(record)
        return results

    def find_errors(self) -> List[ProcessingRecord]:
        """查找所有含错误的记录"""
        results = []
        for batch in self._batches.values():
            for record in batch.records:
                if record.errors:
                    results.append(record)
        return results

    def find_unreviewed(self) -> List[ProcessingRecord]:
        """查找所有未复核的记录"""
        results = []
        for batch in self._batches.values():
            for record in batch.records:
                if not record.reviewed:
                    results.append(record)
        return results

    def review_record(self, record_id: str, notes: Optional[str] = None) -> bool:
        """复核记录（提供复核入口，无需重新导入）"""
        record = self._find_record(record_id)
        if record is None:
            return False
        record.reviewed = True
        if notes:
            record.review_notes.append(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {notes}"
            )
        return True

    def save_batch(self, batch_id: str) -> bool:
        """保存批次到磁盘"""
        batch = self._batches.get(batch_id)
        if batch is None:
            return False

        file_path = os.path.join(self.storage_path, f"batch_{batch_id}.json")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(batch.to_dict(), f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            return False

    def load_batch(self, file_path: str) -> Optional[BatchRecord]:
        """从磁盘加载批次"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            records = []
            for rd in data.get("records", []):
                records.append(ProcessingRecord(**{
                    k: v for k, v in rd.items()
                    if k in ProcessingRecord.__dataclass_fields__
                }))

            batch = BatchRecord(
                batch_id=data.get("batch_id", "unknown"),
                timestamp=data.get("timestamp", ""),
                operator=data.get("operator", "algorithm_engineer"),
                batch_notes=data.get("batch_notes", []),
                records=records
            )
            self._batches[batch.batch_id] = batch
            return batch
        except Exception:
            return None

    def load_all(self) -> int:
        """加载所有已保存的批次"""
        count = 0
        if not os.path.exists(self.storage_path):
            return 0
        for filename in os.listdir(self.storage_path):
            if filename.startswith("batch_") and filename.endswith(".json"):
                if self.load_batch(os.path.join(self.storage_path, filename)):
                    count += 1
        return count

    @staticmethod
    def compute_graph_hash(graph_dict: Dict[str, Any]) -> str:
        """计算图的哈希值，用于去重和对比"""
        content = json.dumps(graph_dict, sort_keys=True, default=str)
        return hashlib.md5(content.encode("utf-8")).hexdigest()[:12]

    @staticmethod
    def _generate_batch_id() -> str:
        """生成批次ID"""
        return datetime.now().strftime("%Y%m%d_%H%M%S")

    def _find_record(self, record_id: str) -> Optional[ProcessingRecord]:
        """根据ID查找记录"""
        for batch in self._batches.values():
            for record in batch.records:
                if record.record_id == record_id:
                    return record
        return None

    @staticmethod
    def generate_record_id() -> str:
        """生成记录ID"""
        return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
