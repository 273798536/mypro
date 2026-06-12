import networkx as nx
from typing import Dict, List, Tuple, Optional, Any
import re


UNIT_CONVERSIONS: Dict[str, Dict[str, float]] = {
    "meter": {"kilometer": 0.001, "centimeter": 100, "millimeter": 1000, "mile": 0.000621371, "foot": 3.28084, "minute_walk": 1/80},
    "kilometer": {"meter": 1000, "centimeter": 100000, "millimeter": 1000000, "mile": 0.621371, "foot": 3280.84, "minute_walk": 12.5},
    "centimeter": {"meter": 0.01, "kilometer": 0.00001, "millimeter": 10, "mile": 0.00000621371, "foot": 0.0328084, "minute_walk": 1/8000},
    "millimeter": {"meter": 0.001, "kilometer": 0.000001, "centimeter": 0.1, "mile": 0.000000621371, "foot": 0.00328084, "minute_walk": 1/80000},
    "mile": {"meter": 1609.34, "kilometer": 1.60934, "centimeter": 160934, "millimeter": 1609340, "foot": 5280, "minute_walk": 1/0.048},
    "foot": {"meter": 0.3048, "kilometer": 0.0003048, "centimeter": 30.48, "millimeter": 304.8, "mile": 0.000189394, "minute_walk": 1/262.5},
    "minute_walk": {"meter": 80, "kilometer": 0.08, "centimeter": 8000, "millimeter": 80000, "mile": 0.048, "foot": 262.5}
}

REASONABLE_BOUNDS: Dict[str, Tuple[float, float]] = {
    "meter": (0.1, 100000),
    "kilometer": (0.0001, 100),
    "centimeter": (1, 10000000),
    "millimeter": (1, 100000000),
    "mile": (0.00006, 62.1371),
    "foot": (0.32, 328084),
    "minute_walk": (0.00125, 1250)
}


def convert_unit(value: float, from_unit: str, to_unit: str) -> Tuple[float, float, str]:
    if from_unit == to_unit:
        return value, 1.0, f"{from_unit} -> {to_unit}: identity conversion"

    if from_unit not in UNIT_CONVERSIONS or to_unit not in UNIT_CONVERSIONS[from_unit]:
        raise ValueError(f"Unsupported unit conversion: {from_unit} -> {to_unit}")

    factor = UNIT_CONVERSIONS[from_unit][to_unit]
    result = value * factor

    formula = f"{value} {from_unit} × {factor} = {result} {to_unit}"
    return result, factor, formula


def get_deviation_note(original_value: float, original_unit: str,
                       converted_value: float, to_unit: str) -> Optional[str]:
    rounded_orig = round(original_value, 6)
    back_converted, _, _ = convert_unit(converted_value, to_unit, original_unit)
    back_rounded = round(back_converted, 6)

    if abs(rounded_orig - back_rounded) > 1e-6:
        relative_error = abs(rounded_orig - back_rounded) / max(abs(rounded_orig), 1e-9) * 100
        if relative_error > 0.01:
            return (f"单位换算偏差提示: {rounded_orig} {original_unit} -> {converted_value} {to_unit} "
                    f"-> 回算 {back_rounded} {original_unit}, "
                    f"相对误差 {relative_error:.6f}%。"
                    f"注意: 换算因子为近似值，跨数量级换算时可能出现可见偏差。")
    return None


def check_bounds(value: float, unit: str) -> Tuple[bool, Optional[str]]:
    if unit not in REASONABLE_BOUNDS:
        return True, None

    min_val, max_val = REASONABLE_BOUNDS[unit]
    if value < min_val:
        return False, (f"值 {value} {unit} 低于合理下限 {min_val} {unit}。"
                       f"可能为外推越界或单位混淆（如把 meter 写成 kilometer）。")
    if value > max_val:
        return False, (f"值 {value} {unit} 超过合理上限 {max_val} {unit}。"
                       f"可能为外推越界或单位混淆（如把 kilometer 写成 meter）。")
    return True, None


def build_graph(nodes_data: List[Dict], edges_data: List[Dict],
                target_unit: str = "meter") -> Tuple[nx.DiGraph, Dict[str, Dict]]:
    G = nx.DiGraph()

    for node in nodes_data:
        G.add_node(node["id"], name=node.get("name", node["id"]))

    edge_conversions = []

    for edge in edges_data:
        source = edge["source"]
        target = edge["target"]
        original_weight = edge["weight"]
        original_unit = edge.get("unit", "meter")

        converted_weight, factor, formula = convert_unit(
            original_weight, original_unit, target_unit
        )
        deviation_note = get_deviation_note(
            original_weight, original_unit, converted_weight, target_unit
        )

        attrs = edge.get("attributes", {}) or {}
        attrs.update({
            "original_weight": original_weight,
            "original_unit": original_unit,
            "conversion_factor": factor,
            "conversion_formula": formula,
            "deviation_note": deviation_note
        })

        G.add_edge(source, target, weight=converted_weight, **attrs)
        if not G.is_directed() or G.has_edge(target, source):
            pass
        else:
            G.add_edge(target, source, weight=converted_weight, **attrs)

        edge_conversions.append({
            "edge": f"{source}->{target}",
            "original_weight": original_weight,
            "original_unit": original_unit,
            "converted_weight": converted_weight,
            "target_unit": target_unit,
            "formula": formula,
            "deviation_note": deviation_note
        })

    return G, {"edge_conversions": edge_conversions}


def find_shortest_path(G: nx.DiGraph, source: str, target: str) -> Dict[str, Any]:
    result = {
        "found": False,
        "distance": None,
        "path": None,
        "path_units_detail": [],
        "error": None
    }

    if source not in G.nodes:
        result["error"] = f"起点 {source} 不在图中"
        return result
    if target not in G.nodes:
        result["error"] = f"终点 {target} 不在图中"
        return result

    try:
        distance = nx.dijkstra_path_length(G, source, target, weight="weight")
        path = nx.dijkstra_path(G, source, target, weight="weight")

        path_details = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge_data = G[u][v]
            path_details.append({
                "from": u,
                "to": v,
                "weight": edge_data["weight"],
                "original_weight": edge_data.get("original_weight"),
                "original_unit": edge_data.get("original_unit"),
                "conversion_formula": edge_data.get("conversion_formula"),
                "deviation_note": edge_data.get("deviation_note")
            })

        result["found"] = True
        result["distance"] = distance
        result["path"] = path
        result["path_units_detail"] = path_details
    except nx.NetworkXNoPath:
        result["error"] = f"从 {source} 到 {target} 不存在路径"
    except Exception as e:
        result["error"] = f"路径计算异常: {str(e)}"

    return result


def parse_numeric_value(raw: str) -> Tuple[Optional[float], Optional[str], Optional[str]]:
    raw = raw.strip()
    pattern = r'^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*([a-zA-Z_]+)?$'
    match = re.match(pattern, raw)

    if not match:
        return None, None, f"无法解析数值: '{raw}'"

    value_str, unit = match.groups()
    try:
        value = float(value_str)
        return value, unit or "meter", None
    except ValueError:
        return None, None, f"数值转换失败: '{value_str}'"


def detect_outlier_edges(edges_data: List[Dict]) -> List[Dict]:
    outliers = []
    for edge in edges_data:
        weight = edge["weight"]
        unit = edge.get("unit", "meter")
        in_bounds, note = check_bounds(weight, unit)
        if not in_bounds:
            outliers.append({
                "edge": f"{edge['source']}->{edge['target']}",
                "weight": weight,
                "unit": unit,
                "warning": note,
                "warning_type": "edge_weight_out_of_bounds"
            })

        if weight < 0:
            outliers.append({
                "edge": f"{edge['source']}->{edge['target']}",
                "weight": weight,
                "unit": unit,
                "warning": f"负权边 {weight} {unit}，最短路径算法可能不适用",
                "warning_type": "negative_weight"
            })

    return outliers
