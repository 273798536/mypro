"""
边界样例定义与追溯模块
定义常见的边界样例及其处理意见，支持从异常结果反向追溯
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


@dataclass
class BoundaryCase:
    """边界样例定义"""
    tag: str
    name: str
    description: str
    detection_condition: str
    handling_advice: str
    severity: str = "info"
    examples: List[str] = field(default_factory=list)


BOUNDARY_CASES: Dict[str, BoundaryCase] = {
    "EMPTY_GRAPH": BoundaryCase(
        tag="EMPTY_GRAPH",
        name="空图",
        description="图中没有任何顶点",
        detection_condition="graph.vertex_count == 0",
        handling_advice="空图在数学上不定义欧拉路径。建议检查数据源是否正常提供了顶点数据，或确认这是否为预期的测试场景。如为测试用例，应标记为特殊情况而非系统错误。",
        severity="warning",
        examples=[
            "输入文件为空",
            "数据源返回空列表",
            "过滤条件过于严格导致无顶点保留"
        ]
    ),
    "NO_EDGES": BoundaryCase(
        tag="NO_EDGES",
        name="无边图",
        description="图中有顶点但没有任何边",
        detection_condition="graph.vertex_count > 0 and graph.edge_count == 0",
        handling_advice="无边图中每个顶点都是孤立点。欧拉路径需要遍历所有边，而边数为0时结果为平凡（空路径）。建议：1）确认是否遗漏了边数据；2）如为有意测试，应明确处理逻辑。",
        severity="warning",
        examples=[
            "仅导入了顶点数据，未导入边数据",
            "边的ID映射失败导致所有边被丢弃"
        ]
    ),
    "SINGLE_EDGE": BoundaryCase(
        tag="SINGLE_EDGE",
        name="单边图",
        description="图中仅有一条边",
        detection_condition="graph.edge_count == 1",
        handling_advice="单边图是最简单的非平凡图，必定存在欧拉路径。用于验证算法基本正确性的最小测试用例。建议：算法实现时确保能正确处理这种最小情况。",
        severity="info",
        examples=[
            "两个顶点一条边：A--B",
            "单个顶点自环"
        ]
    ),
    "TWO_VERTEX_ONE_EDGE": BoundaryCase(
        tag="TWO_VERTEX_ONE_EDGE",
        name="两顶点单边",
        description="恰好两个顶点和一条边连接它们",
        detection_condition="graph.vertex_count == 2 and graph.edge_count == 1",
        handling_advice="这是欧拉路径的基本测试场景，路径就是这条边本身。起点和终点分别为两个端点。用于验证路径构造算法的正确性。",
        severity="info",
        examples=[
            "顶点A连接顶点B"
        ]
    ),
    "ODD_VERTEX_COUNT": BoundaryCase(
        tag="ODD_VERTEX_COUNT",
        name="奇数度顶点异常",
        description="无向图中奇数度顶点数量不是0或2",
        detection_condition="len(odd_degree_vertices) not in (0, 2)",
        handling_advice="无向图存在欧拉路径的必要条件是奇数度顶点数为0（回路）或2（路径）。当前值不满足条件。建议：1）检查是否有边被遗漏或重复导入；2）考虑添加辅助边使图满足条件。",
        severity="error",
        examples=[
            "4个奇数度顶点",
            "1个奇数度顶点（在无向图中不可能，说明数据有误）"
        ]
    ),
    "DISCONNECTED": BoundaryCase(
        tag="DISCONNECTED",
        name="不连通图",
        description="存在多个连通分量（忽略孤立点）",
        detection_condition="not graph.is_connected()",
        handling_advice="欧拉路径要求图连通（忽略孤立点）。建议：1）确认是否应将多个连通分量分开处理；2）检查是否有连接边缺失；3）如业务允许多连通分量，需逐分量检测。",
        severity="error",
        examples=[
            "两个完全独立的子图",
            "桥边缺失导致图被截断"
        ]
    ),
    "ISOLATED_VERTICES": BoundaryCase(
        tag="ISOLATED_VERTICES",
        name="含孤立顶点",
        description="图中存在度数为0的孤立顶点",
        detection_condition="any(degree == 0 for degree in vertex_degrees)",
        handling_advice="孤立顶点不影响欧拉路径的存在性（可忽略），但可能暗示数据导入问题。建议：1）确认这些顶点是否应该有连接边；2）如无问题，可在输出中明确标记已忽略。",
        severity="info",
        examples=[
            "导入了顶点但未导入对应的边",
            "顶点拼写错误导致无法匹配边"
        ]
    ),
    "DIRECTED_DEGREE_MISMATCH": BoundaryCase(
        tag="DIRECTED_DEGREE_MISMATCH",
        name="有向图入度出度不匹配",
        description="有向图中(出度-入度)的值不满足欧拉路径条件",
        detection_condition="存在顶点的(出度-入度)不在{-1, 0, 1}集合中",
        handling_advice="有向图欧拉路径条件：最多1个顶点出度-入度=1（起点），最多1个顶点入度-出度=1（终点），其余为0。建议检查边方向是否正确，或是否有边遗漏/多余。",
        severity="error",
        examples=[
            "某顶点出度比入度多2",
            "多个起点候选"
        ]
    ),
    "SELF_LOOP": BoundaryCase(
        tag="SELF_LOOP",
        name="自环边",
        description="存在顶点连向自身的边",
        detection_condition="存在边的source == target",
        handling_advice="自环对欧拉路径的影响：增加顶点度数2（无向）或出度入度各+1（有向），不改变奇偶性/差值。通常可正常处理，但需确认业务是否允许自环。",
        severity="info",
        examples=[
            "A -> A",
            "B -- B"
        ]
    ),
    "MULTIPLE_EDGES": BoundaryCase(
        tag="MULTIPLE_EDGES",
        name="重边",
        description="同一对顶点之间存在多条边",
        detection_condition="同一对顶点间边数 > 1",
        handling_advice="重边是允许的，每条边都要被欧拉路径遍历。确保算法支持多条边的处理（不能简单用邻接矩阵去重）。",
        severity="info",
        examples=[
            "A到B之间有3条有向边",
            "两城市间有多条航线"
        ]
    )
}


def get_boundary_case(tag: str) -> Optional[BoundaryCase]:
    """根据标签获取边界样例定义"""
    for key, bc in BOUNDARY_CASES.items():
        if tag.startswith(key):
            return bc
    return None


def trace_boundary_case(tag: str, record=None) -> Dict[str, Any]:
    """
    从异常结果反向追溯边界样例
    
    返回边界样例的完整信息和处理意见
    """
    bc = get_boundary_case(tag)

    result = {
        "tag": tag,
        "found": bc is not None,
        "definition": None,
        "related_records": [],
        "trace_path": []
    }

    if bc is None:
        result["trace_path"].append(
            f"未找到标签 '{tag}' 对应的预定义边界样例，可能为新情况，建议补充定义"
        )
        return result

    result["definition"] = {
        "name": bc.name,
        "description": bc.description,
        "severity": bc.severity,
        "detection_condition": bc.detection_condition,
        "handling_advice": bc.handling_advice,
        "examples": bc.examples
    }

    result["trace_path"].extend([
        f"识别到边界样例: {bc.name} ({tag})",
        f"问题描述: {bc.description}",
        f"触发条件: {bc.detection_condition}",
        f"处理建议: {bc.handling_advice}"
    ])

    if record is not None:
        result["trace_path"].append(f"关联记录: {record.record_id} (图: {record.graph_name})")
        if record.warnings:
            result["trace_path"].append(f"记录中的警告: {'; '.join(record.warnings)}")
        if record.errors:
            result["trace_path"].append(f"记录中的错误: {'; '.join(record.errors)}")

    return result


def get_all_boundary_tags() -> List[str]:
    """获取所有边界样例标签"""
    return list(BOUNDARY_CASES.keys())


def summarize_boundary_cases(tags: List[str]) -> Dict[str, Any]:
    """汇总一批边界样例标签"""
    summary = {
        "total": len(tags),
        "by_severity": {"error": 0, "warning": 0, "info": 0},
        "by_tag": {},
        "details": []
    }

    for tag in tags:
        bc = get_boundary_case(tag)
        if bc:
            summary["by_severity"][bc.severity] = summary["by_severity"].get(bc.severity, 0) + 1
            key = tag.split(":")[0] if ":" in tag else tag
            summary["by_tag"][key] = summary["by_tag"].get(key, 0) + 1
            summary["details"].append({
                "tag": tag,
                "name": bc.name,
                "severity": bc.severity,
                "advice": bc.handling_advice
            })
        else:
            summary["by_severity"]["info"] = summary["by_severity"].get("info", 0) + 1
            summary["details"].append({
                "tag": tag,
                "name": "未定义边界样例",
                "severity": "unknown",
                "advice": "建议补充该边界情况的定义和处理方案"
            })

    return summary
