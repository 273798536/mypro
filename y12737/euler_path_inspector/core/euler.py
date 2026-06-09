"""
欧拉路径/回路检测核心算法模块
实现欧拉路径和欧拉回路的检测、构造与分析。
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

from .graph import Graph, Edge


class EulerType(str, Enum):
    """欧拉路径类型"""
    NONE = "none"
    EULER_PATH = "euler_path"
    EULER_CIRCUIT = "euler_circuit"


@dataclass
class EulerCheckResult:
    """欧拉检测结果"""
    has_euler_path: bool
    has_euler_circuit: bool
    euler_type: EulerType
    is_connected: bool
    odd_degree_vertices: List[Any]
    in_out_degree_diff: Dict[Any, int]
    start_vertex: Optional[Any] = None
    end_vertex: Optional[Any] = None
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    boundary_cases: List[str] = field(default_factory=list)


@dataclass
class EulerPathResult:
    """欧拉路径构造结果"""
    check_result: EulerCheckResult
    path: Optional[List[Any]] = None
    path_edges: Optional[List[Edge]] = None
    used_edges: int = 0
    total_edges: int = 0
    is_complete: bool = False
    construction_notes: List[str] = field(default_factory=list)


def check_euler_conditions(graph: Graph) -> EulerCheckResult:
    """
    检查图是否满足欧拉路径/回路的条件
    
    无向图判定规则:
    - 欧拉回路存在: 所有非孤立顶点连通，且所有顶点度数均为偶数
    - 欧拉路径存在（非回路）: 所有非孤立顶点连通，且恰好有2个顶点度数为奇数
    
    有向图判定规则:
    - 欧拉回路存在: 所有非孤立顶点弱连通，且每个顶点入度等于出度
    - 欧拉路径存在（非回路）: 所有非孤立顶点弱连通，且恰好有1个顶点出度-入度=1（起点），
      恰好有1个顶点入度-出度=1（终点），其余顶点入度等于出度
    """
    warnings: List[str] = []
    errors: List[str] = []
    boundary_cases: List[str] = []

    if graph.is_empty():
        boundary_cases.append("EMPTY_GRAPH: 图为空（无顶点）")
        warnings.append("空图输入：未检测到任何顶点")
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff={},
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )

    if not graph.has_edges():
        boundary_cases.append("NO_EDGES: 图有顶点但无边")
        warnings.append("图中无任何边：所有顶点均为孤立点")
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff={},
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )

    single_edge = graph.edge_count == 1
    if single_edge:
        boundary_cases.append("SINGLE_EDGE: 图仅包含1条边")

    if graph.vertex_count == 2 and graph.edge_count == 1:
        boundary_cases.append("TWO_VERTEX_ONE_EDGE: 两顶点单边图")

    if graph.directed:
        return _check_directed_euler(graph, warnings, errors, boundary_cases)
    else:
        return _check_undirected_euler(graph, warnings, errors, boundary_cases)


def _check_undirected_euler(
    graph: Graph,
    warnings: List[str],
    errors: List[str],
    boundary_cases: List[str]
) -> EulerCheckResult:
    """检查无向图的欧拉条件"""
    is_connected = graph.is_connected()
    odd_vertices = graph.get_odd_degree_vertices()
    odd_count = len(odd_vertices)

    isolated_count = sum(1 for v in graph.vertices if graph.get_degree(v) == 0)
    if isolated_count > 0:
        warnings.append(f"检测到 {isolated_count} 个孤立顶点（度数为0）")

    if not is_connected:
        errors.append("图不连通：存在多个连通分量（忽略孤立点）")
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=False,
            odd_degree_vertices=odd_vertices,
            in_out_degree_diff={},
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )

    if odd_count == 0:
        start_v = next(iter(graph.vertices)) if graph.vertex_count > 0 else None
        return EulerCheckResult(
            has_euler_path=True,
            has_euler_circuit=True,
            euler_type=EulerType.EULER_CIRCUIT,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff={},
            start_vertex=start_v,
            end_vertex=start_v,
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )
    elif odd_count == 2:
        start, end = odd_vertices
        return EulerCheckResult(
            has_euler_path=True,
            has_euler_circuit=False,
            euler_type=EulerType.EULER_PATH,
            is_connected=True,
            odd_degree_vertices=odd_vertices,
            in_out_degree_diff={},
            start_vertex=start,
            end_vertex=end,
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )
    else:
        errors.append(
            f"度数为奇数的顶点数量为 {odd_count}，欧拉路径要求为0或2个"
        )
        boundary_cases.append(
            f"ODD_VERTEX_COUNT_{odd_count}: 奇数度顶点数量异常"
        )
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=True,
            odd_degree_vertices=odd_vertices,
            in_out_degree_diff={},
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )


def _check_directed_euler(
    graph: Graph,
    warnings: List[str],
    errors: List[str],
    boundary_cases: List[str]
) -> EulerCheckResult:
    """检查有向图的欧拉条件"""
    is_weakly_connected = graph.is_weakly_connected()
    degree_diff = graph.get_in_out_degree_diff()

    isolated_count = sum(1 for v in graph.vertices if graph.get_degree(v) == 0)
    if isolated_count > 0:
        warnings.append(f"检测到 {isolated_count} 个孤立顶点（度数为0）")

    if not is_weakly_connected:
        errors.append("有向图不弱连通：忽略边方向后仍不连通")
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=False,
            odd_degree_vertices=[],
            in_out_degree_diff=degree_diff,
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )

    start_candidates = [v for v, d in degree_diff.items() if d == 1]
    end_candidates = [v for v, d in degree_diff.items() if d == -1]
    others = [v for v, d in degree_diff.items() if d not in (-1, 0, 1)]

    if others:
        for v in others:
            errors.append(
                f"顶点 {v} 的(出度-入度)={degree_diff[v]}，欧拉路径要求为-1、0或1"
            )
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff=degree_diff,
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )

    if not degree_diff:
        start_v = None
        for v in graph.vertices:
            if graph.get_out_degree(v) > 0:
                start_v = v
                break
        return EulerCheckResult(
            has_euler_path=True,
            has_euler_circuit=True,
            euler_type=EulerType.EULER_CIRCUIT,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff={},
            start_vertex=start_v,
            end_vertex=start_v,
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )
    elif len(start_candidates) == 1 and len(end_candidates) == 1:
        return EulerCheckResult(
            has_euler_path=True,
            has_euler_circuit=False,
            euler_type=EulerType.EULER_PATH,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff=degree_diff,
            start_vertex=start_candidates[0],
            end_vertex=end_candidates[0],
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )
    else:
        errors.append(
            f"出度-入度=1的顶点有{len(start_candidates)}个，"
            f"出度-入度=-1的顶点有{len(end_candidates)}个，"
            f"欧拉路径要求各恰好1个或全为0"
        )
        return EulerCheckResult(
            has_euler_path=False,
            has_euler_circuit=False,
            euler_type=EulerType.NONE,
            is_connected=True,
            odd_degree_vertices=[],
            in_out_degree_diff=degree_diff,
            warnings=warnings,
            errors=errors,
            boundary_cases=boundary_cases
        )


def find_euler_path(graph: Graph, start_vertex: Optional[Any] = None) -> EulerPathResult:
    """
    使用Hierholzer算法寻找欧拉路径/回路
    
    返回路径顶点序列和路径边序列
    """
    check_result = check_euler_conditions(graph)
    total_edges = graph.edge_count

    notes: List[str] = []

    if not check_result.has_euler_path:
        notes.append("不满足欧拉路径条件，无法构造完整路径")
        return EulerPathResult(
            check_result=check_result,
            path=None,
            path_edges=None,
            used_edges=0,
            total_edges=total_edges,
            is_complete=False,
            construction_notes=notes
        )

    if start_vertex is None:
        start_vertex = check_result.start_vertex

    if start_vertex is None:
        notes.append("无法确定起始顶点")
        return EulerPathResult(
            check_result=check_result,
            path=None,
            path_edges=None,
            used_edges=0,
            total_edges=total_edges,
            is_complete=False,
            construction_notes=notes
        )

    used_count = [0]

    if graph.directed:
        path, path_edges = _hierholzer_directed(graph, start_vertex, used_count)
    else:
        path, path_edges = _hierholzer_undirected(graph, start_vertex, used_count)

    is_complete = used_count[0] == total_edges

    if not is_complete:
        notes.append(
            f"仅构造了 {used_count[0]}/{total_edges} 条边的路径，可能存在未遍历的边"
        )

    return EulerPathResult(
        check_result=check_result,
        path=path,
        path_edges=path_edges,
        used_edges=used_count[0],
        total_edges=total_edges,
        is_complete=is_complete,
        construction_notes=notes
    )


def _hierholzer_undirected(
    graph: Graph, start: Any, used_count: list
) -> Tuple[List[Any], List[Edge]]:
    """无向图Hierholzer算法"""
    edge_used: Dict[int, bool] = {i: False for i in range(len(graph.edges))}
    adj_edges: Dict[Any, List[int]] = defaultdict(list)

    for i, edge in enumerate(graph.edges):
        adj_edges[edge.source].append(i)
        adj_edges[edge.target].append(i)

    path_vertices: List[Any] = []
    path_edges: List[Edge] = []

    stack = [start]

    while stack:
        current = stack[-1]
        found = False

        while adj_edges[current]:
            edge_idx = adj_edges[current].pop()
            if edge_used[edge_idx]:
                continue

            edge = graph.edges[edge_idx]
            edge_used[edge_idx] = True
            used_count[0] += 1

            if edge.source == current:
                next_v = edge.target
            else:
                next_v = edge.source

            stack.append(next_v)
            found = True
            break

        if not found:
            path_vertices.append(stack.pop())

    path_vertices.reverse()

    for i in range(len(path_vertices) - 1):
        u, v = path_vertices[i], path_vertices[i + 1]
        for edge in graph.edges:
            if (edge.source == u and edge.target == v) or \
               (edge.source == v and edge.target == u):
                path_edges.append(edge)
                break

    return path_vertices, path_edges


def _hierholzer_directed(
    graph: Graph, start: Any, used_count: list
) -> Tuple[List[Any], List[Edge]]:
    """有向图Hierholzer算法"""
    edge_used: Dict[int, bool] = {i: False for i in range(len(graph.edges))}
    adj_edges: Dict[Any, List[int]] = defaultdict(list)

    for i, edge in enumerate(graph.edges):
        adj_edges[edge.source].append(i)

    path_vertices: List[Any] = []
    path_edges: List[Edge] = []

    stack = [start]

    while stack:
        current = stack[-1]
        found = False

        while adj_edges[current]:
            edge_idx = adj_edges[current].pop()
            if edge_used[edge_idx]:
                continue

            edge = graph.edges[edge_idx]
            edge_used[edge_idx] = True
            used_count[0] += 1

            stack.append(edge.target)
            found = True
            break

        if not found:
            path_vertices.append(stack.pop())

    path_vertices.reverse()

    for i in range(len(path_vertices) - 1):
        u, v = path_vertices[i], path_vertices[i + 1]
        for edge in graph.edges:
            if edge.source == u and edge.target == v:
                path_edges.append(edge)
                break

    return path_vertices, path_edges


def generate_explanation(result: EulerPathResult) -> List[str]:
    """生成检测结果的解释说明"""
    lines: List[str] = []
    check = result.check_result

    lines.append("=" * 60)
    lines.append("欧拉路径巡检分析报告")
    lines.append("=" * 60)

    lines.append(f"\n检测结果类型: {check.euler_type.value}")

    if check.euler_type == EulerType.EULER_CIRCUIT:
        lines.append("✓ 存在欧拉回路：可以从任意顶点出发经过每条边恰好一次后回到起点")
    elif check.euler_type == EulerType.EULER_PATH:
        lines.append("✓ 存在欧拉路径（非回路）：可以从起点出发经过每条边恰好一次到达终点")
    else:
        lines.append("✗ 不存在欧拉路径或欧拉回路")

    lines.append(f"\n连通性: {'是' if check.is_connected else '否'}")

    if check.start_vertex is not None:
        lines.append(f"建议起始顶点: {check.start_vertex}")
    if check.end_vertex is not None and check.end_vertex != check.start_vertex:
        lines.append(f"建议终止顶点: {check.end_vertex}")

    if check.odd_degree_vertices:
        lines.append(f"\n奇数度顶点 ({len(check.odd_degree_vertices)} 个): {check.odd_degree_vertices}")

    if check.in_out_degree_diff:
        lines.append("\n有向图顶点(出度-入度)差异:")
        for v, diff in sorted(check.in_out_degree_diff.items()):
            lines.append(f"  顶点 {v}: {diff:+d}")

    if check.warnings:
        lines.append("\n⚠ 警告:")
        for w in check.warnings:
            lines.append(f"  - {w}")

    if check.errors:
        lines.append("\n✗ 错误:")
        for e in check.errors:
            lines.append(f"  - {e}")

    if check.boundary_cases:
        lines.append("\n◈ 边界样例标记:")
        for bc in check.boundary_cases:
            lines.append(f"  - {bc}")

    if result.path is not None:
        lines.append(f"\n构造路径 ({result.used_edges}/{result.total_edges} 条边):")
        lines.append("  顶点序列: " + " → ".join(str(v) for v in result.path))
        if not result.is_complete:
            lines.append("  ⚠ 路径不完整，部分边未被遍历")

    if result.construction_notes:
        lines.append("\n构造说明:")
        for note in result.construction_notes:
            lines.append(f"  - {note}")

    lines.append("\n" + "=" * 60)
    return lines
