"""数据模块：样例数据加载、版本管理、重复检测"""

import json
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime

from .graph import Graph


@dataclass
class SampleRecord:
    """样本记录，包含完整的变更历史"""
    sample_id: str
    graph: Graph
    expected_cut_points: List[int]
    source: str
    version: str
    created_at: str
    updated_at: str
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    supplementary_note: Optional[str] = None
    boundary_flag: bool = False
    boundary_reason: Optional[str] = None
    checksum: str = ""

    def compute_checksum(self) -> str:
        """计算数据校验和，检测参数被篡改"""
        edges = sorted(
            (min(u, v), max(u, v))
            for u in self.graph.vertices
            for v in self.graph.get_neighbors(u)
        )
        content = json.dumps({
            "vertices": sorted(self.graph.vertices),
            "edges": edges,
            "expected": sorted(self.expected_cut_points),
            "version": self.version,
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]


@dataclass
class SampleDataset:
    """样本数据集"""
    records: List[SampleRecord] = field(default_factory=list)
    version_history: Dict[str, str] = field(default_factory=dict)

    def add_record(self, record: SampleRecord) -> None:
        record.checksum = record.compute_checksum()
        self.records.append(record)
        self.version_history[record.sample_id] = record.version

    def get_record(self, sample_id: str) -> Optional[SampleRecord]:
        for r in self.records:
            if r.sample_id == sample_id:
                return r
        return None

    def find_duplicates(self) -> List[Tuple[SampleRecord, SampleRecord]]:
        """查找重复样本"""
        duplicates = []
        seen = {}
        for record in self.records:
            key = record.checksum
            if key in seen:
                duplicates.append((seen[key], record))
            else:
                seen[key] = record
        return duplicates


class SampleDataLoader:
    """样例数据加载器"""

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def load_from_json(self, filename: str) -> SampleDataset:
        """从JSON文件加载样本数据"""
        filepath = self.data_dir / filename
        with open(filepath, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        dataset = SampleDataset()

        for item in raw_data.get("samples", []):
            graph = Graph()
            graph.metadata = item.get("metadata", {})

            for v in item.get("vertices", []):
                graph.add_vertex(v)

            for edge in item.get("edges", []):
                graph.add_edge(edge[0], edge[1])

            record = SampleRecord(
                sample_id=item["sample_id"],
                graph=graph,
                expected_cut_points=item.get("expected_cut_points", []),
                source=item.get("source", "unknown"),
                version=item.get("version", "1.0"),
                created_at=item.get("created_at", datetime.now().isoformat()),
                updated_at=item.get("updated_at", datetime.now().isoformat()),
                is_duplicate=item.get("is_duplicate", False),
                duplicate_of=item.get("duplicate_of"),
                supplementary_note=item.get("supplementary_note"),
                boundary_flag=item.get("boundary_flag", False),
                boundary_reason=item.get("boundary_reason"),
            )
            dataset.add_record(record)

        return dataset

    def save_to_json(self, dataset: SampleDataset, filename: str) -> None:
        """保存样本数据到JSON文件"""
        filepath = self.data_dir / filename
        data = {"samples": []}

        for record in dataset.records:
            edges = []
            seen = set()
            for u in record.graph.vertices:
                for v in record.graph.get_neighbors(u):
                    key = (min(u, v), max(u, v))
                    if key not in seen:
                        seen.add(key)
                        edges.append(list(key))

            data["samples"].append({
                "sample_id": record.sample_id,
                "vertices": record.graph.vertices,
                "edges": edges,
                "expected_cut_points": record.expected_cut_points,
                "source": record.source,
                "version": record.version,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "is_duplicate": record.is_duplicate,
                "duplicate_of": record.duplicate_of,
                "supplementary_note": record.supplementary_note,
                "boundary_flag": record.boundary_flag,
                "boundary_reason": record.boundary_reason,
                "metadata": record.graph.metadata,
                "_checksum": record.checksum,
            })

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def create_field_sample_data() -> SampleDataset:
    """创建贴近现场的小样例数据

    包含：
    - 普通样本：常规图结构
    - 边界样本：测试边界条件
    - 重复样本：故意重复的样本，触发复核分支
    - 补录说明：记录后来补充的信息
    """
    dataset = SampleDataset()

    graph1 = Graph()
    graph1.metadata["description"] = "课堂例题1 - 简单连通图"
    for v in [0, 1, 2, 3, 4]:
        graph1.add_vertex(v)
    graph1.add_edge(0, 1)
    graph1.add_edge(1, 2)
    graph1.add_edge(2, 0)
    graph1.add_edge(2, 3)
    graph1.add_edge(3, 4)
    dataset.add_record(SampleRecord(
        sample_id="SAMPLE-001",
        graph=graph1,
        expected_cut_points=[2, 3],
        source="课堂作业_第3章_第12题",
        version="1.0",
        created_at="2026-06-15T09:30:00",
        updated_at="2026-06-15T09:30:00",
    ))

    graph2 = Graph()
    graph2.metadata["description"] = "边界样本 - 单桥连接两分量"
    for v in [0, 1, 2, 3, 4, 5]:
        graph2.add_vertex(v)
    graph2.add_edge(0, 1)
    graph2.add_edge(1, 0)
    graph2.add_edge(1, 2)
    graph2.add_edge(2, 0)
    graph2.add_edge(2, 3)
    graph2.add_edge(3, 4)
    graph2.add_edge(4, 5)
    graph2.add_edge(5, 3)
    dataset.add_record(SampleRecord(
        sample_id="SAMPLE-002",
        graph=graph2,
        expected_cut_points=[2, 3],
        source="期末复习_边界题型汇编",
        version="1.1",
        created_at="2026-06-16T14:20:00",
        updated_at="2026-06-18T10:15:00",
        boundary_flag=True,
        boundary_reason="顶点2是桥的端点，移除后图分裂为2个分量，属于边界割点",
        supplementary_note="2026-06-18补录：学生提问为什么顶点2也算割点，补充说明这是桥的端点特征",
    ))

    graph3 = Graph()
    graph3.metadata["description"] = "边界样本 - 孤立点 + 星型图"
    for v in [0, 1, 2, 3, 4, 5]:
        graph3.add_vertex(v)
    graph3.add_edge(0, 1)
    graph3.add_edge(0, 2)
    graph3.add_edge(0, 3)
    graph3.add_edge(0, 4)
    dataset.add_record(SampleRecord(
        sample_id="SAMPLE-003",
        graph=graph3,
        expected_cut_points=[0],
        source="教材习题_P127_第8题",
        version="1.0",
        created_at="2026-06-17T11:00:00",
        updated_at="2026-06-17T11:00:00",
        boundary_flag=True,
        boundary_reason="包含孤立点(5)，同时顶点0是星型中心，移除后分裂为4个分量+1孤立点",
    ))

    graph4 = Graph()
    graph4.metadata["description"] = "重复样本 - 与SAMPLE-001数据完全一致，用于测试重复检测"
    for v in [0, 1, 2, 3, 4]:
        graph4.add_vertex(v)
    graph4.add_edge(0, 1)
    graph4.add_edge(1, 2)
    graph4.add_edge(2, 0)
    graph4.add_edge(2, 3)
    graph4.add_edge(3, 4)
    dataset.add_record(SampleRecord(
        sample_id="SAMPLE-004",
        graph=graph4,
        expected_cut_points=[2, 3],
        source="学生补交作业_张三",
        version="1.0",
        created_at="2026-06-19T16:45:00",
        updated_at="2026-06-19T16:45:00",
        is_duplicate=True,
        duplicate_of="SAMPLE-001",
        supplementary_note="2026-06-20复核发现：此样本与SAMPLE-001数据完全相同，但提交人不同。"
                          "已与两位同学确认，系合作完成后分别提交，不属于抄袭。"
                          "但为保证数据一致性，两条记录均保留，此标记用于触发人工复核流程。",
    ))

    graph5 = Graph()
    graph5.metadata["description"] = "普通样本 - 双连通分量（无割点）"
    for v in [0, 1, 2, 3, 4]:
        graph5.add_vertex(v)
    graph5.add_edge(0, 1)
    graph5.add_edge(1, 2)
    graph5.add_edge(2, 3)
    graph5.add_edge(3, 4)
    graph5.add_edge(4, 0)
    graph5.add_edge(0, 2)
    graph5.add_edge(1, 3)
    dataset.add_record(SampleRecord(
        sample_id="SAMPLE-005",
        graph=graph5,
        expected_cut_points=[],
        source="课堂小测_第5题",
        version="1.0",
        created_at="2026-06-20T08:30:00",
        updated_at="2026-06-20T08:30:00",
    ))

    graph6 = Graph()
    graph6.metadata["description"] = "边界样本 - 单点图（极端边界）"
    graph6.add_vertex(0)
    dataset.add_record(SampleRecord(
        sample_id="SAMPLE-006",
        graph=graph6,
        expected_cut_points=[],
        source="思考题_极端情况讨论",
        version="1.0",
        created_at="2026-06-21T13:15:00",
        updated_at="2026-06-21T13:15:00",
        boundary_flag=True,
        boundary_reason="只有一个顶点，没有边。属于边界情况中的极端案例，移除后图为空。",
        supplementary_note="2026-06-21补录：关于单点是否为割点的课堂讨论结论："
                          "割点定义要求移除后连通分量增加，但单点图移除后分量从1变0，不满足'增加'。"
                          "因此单点不是割点。此条作为边界样本保留。",
    ))

    return dataset
