"""
数据导入导出模块
支持 JSON、CSV、边列表 等多种格式
"""

import json
import csv
import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

from ..core.graph import Graph


@dataclass
class ImportResult:
    """数据导入结果"""
    graph: Optional[Graph] = None
    graph_name: str = "unnamed"
    success: bool = False
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    missing_fields: List[str] = field(default_factory=list)
    raw_data: Optional[Dict[str, Any]] = None


@dataclass
class ExportResult:
    """数据导出结果"""
    success: bool = False
    file_path: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    record_count: int = 0


def import_graph(file_path: str, file_format: Optional[str] = None) -> ImportResult:
    """
    从文件导入图数据
    
    支持格式:
    - json: JSON格式
    - csv: CSV边列表格式
    - txt/edges: 边列表文本格式
    """
    result = ImportResult()

    if not os.path.exists(file_path):
        result.errors.append(f"文件不存在: {file_path}")
        return result

    if file_format is None:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".json":
            file_format = "json"
        elif ext == ".csv":
            file_format = "csv"
        elif ext in (".txt", ".edges", ".dat"):
            file_format = "txt"
        else:
            result.errors.append(f"无法识别文件格式，请通过 --format 指定 (json/csv/txt)")
            return result

    try:
        if file_format == "json":
            return _import_json(file_path, result)
        elif file_format == "csv":
            return _import_csv(file_path, result)
        elif file_format == "txt":
            return _import_txt(file_path, result)
        else:
            result.errors.append(f"不支持的格式: {file_format}")
            return result
    except Exception as e:
        result.errors.append(f"导入失败: {str(e)}")
        return result


def _import_json(file_path: str, result: ImportResult) -> ImportResult:
    """导入JSON格式"""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    result.raw_data = data

    if not isinstance(data, dict):
        result.errors.append("JSON根节点必须是对象")
        return result

    required_fields = ["edges"]
    for field_name in required_fields:
        if field_name not in data:
            result.missing_fields.append(field_name)

    if result.missing_fields:
        result.warnings.append(
            f"缺失字段: {', '.join(result.missing_fields)}，将尝试使用默认值继续处理"
        )

    directed = data.get("directed", False)
    graph_name = data.get("name", os.path.basename(file_path))
    result.graph_name = graph_name

    graph = Graph(directed=directed, name=graph_name)

    vertices = data.get("vertices", [])
    if isinstance(vertices, list):
        for v in vertices:
            graph.add_vertex(v)
    elif vertices:
        result.warnings.append("vertices字段格式不正确，已忽略")

    edges = data.get("edges", [])
    if not isinstance(edges, list):
        result.errors.append("edges字段必须是数组")
        return result

    for i, edge_data in enumerate(edges):
        if not isinstance(edge_data, dict):
            result.warnings.append(f"第{i+1}条边格式不正确，已跳过")
            continue

        source = edge_data.get("source")
        target = edge_data.get("target")

        if source is None or target is None:
            edge_missing = []
            if source is None:
                edge_missing.append("source")
            if target is None:
                edge_missing.append("target")
            result.warnings.append(
                f"第{i+1}条边缺少字段 {', '.join(edge_missing)}，已跳过"
            )
            continue

        weight = edge_data.get("weight", 1.0)
        metadata = edge_data.get("metadata", {})
        if not isinstance(metadata, dict):
            metadata = {}

        try:
            graph.add_edge(source, target, weight=float(weight), metadata=metadata)
        except Exception as e:
            result.warnings.append(f"第{i+1}条边添加失败: {str(e)}，已跳过")

    result.graph = graph
    result.success = True
    return result


def _import_csv(file_path: str, result: ImportResult) -> ImportResult:
    """导入CSV格式 (source,target,weight,metadata...)"""
    graph = Graph(name=os.path.basename(file_path))
    result.graph_name = graph.name

    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        if reader.fieldnames is None:
            result.errors.append("CSV文件为空或缺少表头")
            return result

        fields = [f.strip().lower() for f in reader.fieldnames]

        if "source" not in fields or "target" not in fields:
            if len(reader.fieldnames) >= 2:
                result.warnings.append(
                    f"CSV表头未找到 source/target，将使用前两列作为边的端点"
                )
                source_col = reader.fieldnames[0]
                target_col = reader.fieldnames[1]
                weight_col = reader.fieldnames[2] if len(reader.fieldnames) > 2 else None
            else:
                result.missing_fields = ["source", "target"]
                result.errors.append("CSV文件至少需要两列（source, target）")
                return result
        else:
            source_col = reader.fieldnames[fields.index("source")]
            target_col = reader.fieldnames[fields.index("target")]
            weight_col = None
            if "weight" in fields:
                weight_col = reader.fieldnames[fields.index("weight")]

        row_count = 0
        for row in reader:
            row_count += 1
            source = row.get(source_col)
            target = row.get(target_col)

            if source is None or target is None or source == "" or target == "":
                result.warnings.append(f"第{row_count}行缺少端点数据，已跳过")
                continue

            weight = 1.0
            if weight_col and row.get(weight_col):
                try:
                    weight = float(row[weight_col])
                except ValueError:
                    result.warnings.append(f"第{row_count}行weight格式不正确，使用默认值1.0")

            try:
                graph.add_edge(source, target, weight=weight)
            except Exception as e:
                result.warnings.append(f"第{row_count}行添加失败: {str(e)}，已跳过")

    result.graph = graph
    result.success = True
    return result


def _import_txt(file_path: str, result: ImportResult) -> ImportResult:
    """导入文本边列表格式"""
    graph = Graph(name=os.path.basename(file_path))
    result.graph_name = graph.name

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    line_num = 0
    for line in lines:
        line_num += 1
        line = line.strip()

        if not line or line.startswith("#") or line.startswith("//"):
            continue

        if line.lower().startswith("directed"):
            parts = line.split("=")
            if len(parts) == 2:
                val = parts[1].strip().lower()
                graph.directed = val in ("true", "1", "yes")
                result.warnings.append(f"检测到有向图设置: directed={graph.directed}")
            continue

        if line.lower().startswith("name"):
            parts = line.split("=", 1)
            if len(parts) == 2:
                graph.name = parts[1].strip()
                result.graph_name = graph.name
            continue

        parts = line.split()
        if len(parts) < 2:
            result.warnings.append(f"第{line_num}行格式不正确（至少需要两个顶点），已跳过")
            continue

        source = parts[0]
        target = parts[1]
        weight = 1.0

        if len(parts) >= 3:
            try:
                weight = float(parts[2])
            except ValueError:
                result.warnings.append(f"第{line_num}行权重格式不正确，使用默认值1.0")

        try:
            graph.add_edge(source, target, weight=weight)
        except Exception as e:
            result.warnings.append(f"第{line_num}行添加失败: {str(e)}，已跳过")

    result.graph = graph
    result.success = True
    return result


def import_batch(file_paths: List[str], file_format: Optional[str] = None) -> List[ImportResult]:
    """
    批量导入图数据
    参数表缺失时不会整批失败，会逐个处理并记录缺口
    """
    results = []
    for path in file_paths:
        result = import_graph(path, file_format)
        results.append(result)
    return results


def export_result(
    graph: Graph,
    euler_result: Any,
    output_path: str,
    export_format: str = "json",
    include_graph: bool = True
) -> ExportResult:
    """
    导出巡检结果
    """
    result = ExportResult()

    try:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)

        data = {
            "graph_name": graph.name,
            "directed": graph.directed,
            "timestamp": _get_timestamp(),
            "check_result": {
                "has_euler_path": euler_result.check_result.has_euler_path,
                "has_euler_circuit": euler_result.check_result.has_euler_circuit,
                "euler_type": euler_result.check_result.euler_type.value,
                "is_connected": euler_result.check_result.is_connected,
                "start_vertex": euler_result.check_result.start_vertex,
                "end_vertex": euler_result.check_result.end_vertex,
                "odd_degree_vertices": euler_result.check_result.odd_degree_vertices,
                "in_out_degree_diff": {
                    str(k): v for k, v in euler_result.check_result.in_out_degree_diff.items()
                },
                "warnings": euler_result.check_result.warnings,
                "errors": euler_result.check_result.errors,
                "boundary_cases": euler_result.check_result.boundary_cases,
            },
            "path_result": {
                "path": euler_result.path,
                "used_edges": euler_result.used_edges,
                "total_edges": euler_result.total_edges,
                "is_complete": euler_result.is_complete,
                "construction_notes": euler_result.construction_notes,
            },
            "explanation": _get_explanation_lines(euler_result)
        }

        if include_graph:
            data["graph"] = graph.to_dict()

        if export_format == "json":
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            result.record_count = 1
        elif export_format == "txt":
            with open(output_path, "w", encoding="utf-8") as f:
                for line in data["explanation"]:
                    f.write(line + "\n")
            result.record_count = 1
        else:
            result.errors.append(f"不支持的导出格式: {export_format}")
            return result

        result.success = True
        result.file_path = output_path
        return result

    except Exception as e:
        result.errors.append(f"导出失败: {str(e)}")
        return result


def _get_timestamp() -> str:
    """获取当前时间戳字符串"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _get_explanation_lines(euler_result: Any) -> List[str]:
    """获取解释文本行"""
    from ..core.euler import generate_explanation
    return generate_explanation(euler_result)
