import re
from typing import Any, Dict, List, Optional

from topo_error_tracker.models import (
    ErrorNode,
    Material,
    MaterialStatus,
    Severity,
    TrackingResult,
)
from topo_error_tracker.store import Store


class TopologyTracker:
    def __init__(self, store: Store):
        self.store = store

    def track(self, material: Material) -> TrackingResult:
        raw = self.store.read_raw_draft(material.id)
        text = material.original_text
        if raw and "original_text" in raw:
            text = raw["original_text"]

        error_nodes = self._detect_error_nodes(text, raw)
        explanation = self._build_explanation(material, error_nodes)
        anomalous = self._collect_anomalous_samples(material, error_nodes)

        result = TrackingResult(
            material_id=material.id,
            error_nodes=error_nodes,
            explanation=explanation,
            anomalous_samples=anomalous,
        )

        self.store.save_tracking_result(result)
        self.store.update_material_status(material.id, MaterialStatus.TRACKED)
        return result

    def _detect_error_nodes(
        self, text: str, raw: Optional[Dict[str, Any]]
    ) -> List[ErrorNode]:
        nodes: List[ErrorNode] = []
        nodes.extend(self._check_unit_confusion(text))
        nodes.extend(self._check_sign_errors(text))
        nodes.extend(self._check_formula_misapplication(text))
        nodes.extend(self._check_extrapolation_boundary(text, raw))
        nodes.extend(self._check_visual_detail_mismatch(text, raw))
        return nodes

    def _check_unit_confusion(self, text: str) -> List[ErrorNode]:
        nodes: List[ErrorNode] = []
        unit_patterns = [
            (r"(\d+(?:\.\d+)?)\s*厘米", "cm", r"(\d+(?:\.\d+)?)\s*米", "m", 0.01),
            (r"(\d+(?:\.\d+)?)\s*米", "m", r"(\d+(?:\.\d+)?)\s*千米", "km", 0.001),
            (r"(\d+(?:\.\d+)?)\s*克", "g", r"(\d+(?:\.\d+)?)\s*千克", "kg", 0.001),
            (r"(\d+(?:\.\d+)?)\s*度", "°", r"(\d+(?:\.\d+)?)\s*弧度", "rad", None),
        ]
        idx = 0
        for src_pat, src_unit, dst_pat, dst_unit, factor in unit_patterns:
            src_matches = list(re.finditer(src_pat, text))
            dst_matches = list(re.finditer(dst_pat, text))
            if src_matches and dst_matches:
                for sm in src_matches:
                    val = float(sm.group(1))
                    if factor is not None:
                        converted = val * factor
                        conversion_desc = (
                            f"${val}\\ \\text{{{src_unit}}} = {converted}\\ \\text{{{dst_unit}}}$"
                        )
                    else:
                        converted = val * 3.14159265 / 180
                        conversion_desc = (
                            f"${val}^\\circ = {converted:.4f}\\ \\text{{rad}}$"
                        )
                    idx += 1
                    nodes.append(
                        ErrorNode(
                            node_id=f"unit_{idx}",
                            step_label="单位换算",
                            formula=conversion_desc,
                            expected_value=f"{converted} {dst_unit}",
                            actual_value=f"{val} {src_unit}（未换算）",
                            severity=Severity.HIGH,
                            explanation=f"学生在计算中同时出现 {src_unit} 和 {dst_unit}，但未正确进行单位换算。",
                            unit_conversion=conversion_desc,
                            counter_example=f"若输入 {val} {src_unit}，换算后应为 {converted} {dst_unit}，而非直接使用 {val}。",
                        )
                    )
        return nodes

    def _check_sign_errors(self, text: str) -> List[ErrorNode]:
        nodes: List[ErrorNode] = []
        neg_nums = list(re.finditer(r"-\s*(\d+(?:\.\d+)?)", text))
        if neg_nums:
            for i, m in enumerate(neg_nums, 1):
                val = m.group(1)
                nodes.append(
                    ErrorNode(
                        node_id=f"sign_{i}",
                        step_label="符号错误",
                        formula=f"$-({val})$ 应写为 $-{val}$",
                        expected_value=f"-{val}",
                        actual_value=val,
                        severity=Severity.HIGH,
                        explanation=f"负号处理错误：将 -{val} 误写为 {val}，导致后续计算符号翻转。",
                        counter_example=f"设 $x = -{val}$，则 $x^2 = {float(val)**2:.0f}$，而非 $-{float(val)**2:.0f}$。",
                    )
                )
        return nodes

    def _check_formula_misapplication(self, text: str) -> List[ErrorNode]:
        nodes: List[ErrorNode] = []
        area_circle = re.search(r"面积.*?(\d+(?:\.\d+)?)", text)
        radius = re.search(r"半径.*?(\d+(?:\.\d+)?)", text)
        if area_circle and radius:
            r = float(radius.group(1))
            reported_area = float(area_circle.group(1))
            correct_area = 3.14159265 * r * r
            if abs(reported_area - correct_area) / max(correct_area, 1e-9) > 0.05:
                nodes.append(
                    ErrorNode(
                        node_id="formula_1",
                        step_label="公式误用",
                        formula=f"$S = \\pi r^2 = \\pi \\times {r}^2 = {correct_area:.2f}$",
                        expected_value=f"{correct_area:.2f}",
                        actual_value=f"{reported_area}",
                        severity=Severity.CRITICAL,
                        explanation=f"圆面积公式应用错误：正确结果为 {correct_area:.2f}，但给出了 {reported_area}。可能误用了 $S=2\\pi r$ 或 $S=\\pi d$。",
                        counter_example=f"当 $r={r}$ 时，$S=\\pi \\times {r}^2={correct_area:.2f}$，不是 $2\\pi \\times {r}={2*3.14159265*r:.2f}$。",
                    )
                )

        perimeter_rect = re.search(r"周长.*?(\d+(?:\.\d+)?)", text)
        length = re.search(r"长.*?(\d+(?:\.\d+)?)", text)
        width = re.search(r"宽.*?(\d+(?:\.\d+)?)", text)
        if perimeter_rect and length and width:
            l = float(length.group(1))
            w = float(width.group(1))
            reported_p = float(perimeter_rect.group(1))
            correct_p = 2 * (l + w)
            if abs(reported_p - correct_p) / max(correct_p, 1e-9) > 0.05:
                nodes.append(
                    ErrorNode(
                        node_id="formula_2",
                        step_label="公式误用",
                        formula=f"$P = 2(l+w) = 2({l}+{w}) = {correct_p:.2f}$",
                        expected_value=f"{correct_p:.2f}",
                        actual_value=f"{reported_p}",
                        severity=Severity.CRITICAL,
                        explanation=f"矩形周长公式应用错误：正确结果为 {correct_p:.2f}，但给出了 {reported_p}。可能误用了 $P=l \\times w$。",
                        counter_example=f"当 $l={l}, w={w}$ 时，$P=2({l}+{w})={correct_p:.2f}$，不是 ${l} \\times {w}={l*w}$。",
                    )
                )
        return nodes

    def _check_extrapolation_boundary(
        self, text: str, raw: Optional[Dict[str, Any]]
    ) -> List[ErrorNode]:
        nodes: List[ErrorNode] = []
        if raw and raw.get("metadata", {}).get("extrapolation_boundary"):
            nodes.append(
                ErrorNode(
                    node_id="extrap_1",
                    step_label="外推越界",
                    formula=None,
                    expected_value="在定义域内",
                    actual_value="超出已知数据范围",
                    severity=Severity.CRITICAL,
                    explanation="该计算涉及外推越界：学生将结论推广到已知数据范围之外，缺乏支撑。",
                    counter_example="若仅观测 $x \\in [1,5]$ 的线性趋势，不能外推到 $x=100$ 的预测值。",
                )
            )
        extrapol_keywords = ["外推", "推广", "延伸到", "预测到"]
        for kw in extrapol_keywords:
            if kw in text:
                nodes.append(
                    ErrorNode(
                        node_id="extrap_kw",
                        step_label="外推越界",
                        formula=None,
                        expected_value="在已知范围内推理",
                        actual_value=f"含外推性表述「{kw}」",
                        severity=Severity.HIGH,
                        explanation=f"学生使用了外推性表述「{kw}」，需复核是否有充分依据。",
                        counter_example="线性模型仅在观测区间内有效，不能无依据地外推。",
                    )
                )
                break
        return nodes

    def _check_visual_detail_mismatch(
        self, text: str, raw: Optional[Dict[str, Any]]
    ) -> List[ErrorNode]:
        nodes: List[ErrorNode] = []
        drafts = []
        if raw and raw.get("material_id"):
            drafts = self.store.list_draft_images(raw["material_id"])
        for d in drafts:
            if not d.graph_visual_match:
                nodes.append(
                    ErrorNode(
                        node_id=f"visual_{d.id[:8]}",
                        step_label="图上顺但明细不匹配",
                        formula=None,
                        expected_value="图示与计算明细一致",
                        actual_value="图上看着顺，但明细对不回去",
                        severity=Severity.MEDIUM,
                        explanation=f"草稿图像 {d.image_path} 在图上看起来合理，但计算明细无法对应。{d.detail_mismatch_description or ''}",
                        counter_example="图上画的三角形看起来是等边的，但计算中三边分别为 3、4、5，非等边三角形。",
                    )
                )
        return nodes

    def _build_explanation(
        self, material: Material, error_nodes: List[ErrorNode]
    ) -> str:
        if not error_nodes:
            return f"材料 {material.id}（批次 {material.batch_id}）：未检测到拓扑路径上的典型错因。"
        parts = [f"材料 {material.id}（批次 {material.batch_id}）的拓扑路径错因追踪："]
        severity_count: Dict[str, int] = {}
        for n in error_nodes:
            severity_count[n.severity.value] = severity_count.get(n.severity.value, 0) + 1
        parts.append(
            f"共发现 {len(error_nodes)} 个错因节点："
            + "、".join(f"{v} 个 {k}" for k, v in sorted(severity_count.items()))
            + "。"
        )
        for n in error_nodes:
            parts.append(
                f"  - [{n.step_label}] {n.explanation}"
            )
        return "\n".join(parts)

    def _collect_anomalous_samples(
        self, material: Material, error_nodes: List[ErrorNode]
    ) -> List[str]:
        samples: List[str] = []
        edits = self.store.list_edits(material.id)
        for e in edits:
            samples.append(f"编辑 {e.id}：{e.field} 从「{e.old_value}」改为「{e.new_value}」——{e.reason}")
        for n in error_nodes:
            if n.counter_example:
                samples.append(f"反例[{n.step_label}]：{n.counter_example}")
        return samples
