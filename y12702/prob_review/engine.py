import json
import os
from typing import List, Optional, Tuple, Dict, Any
from .models import (
    TreeNode,
    ErrorRecord,
    ProcessingRecord,
    RecordStatus,
    ErrorSeverity,
    generate_id,
    file_hash,
)


ERROR_THRESHOLDS = {
    ErrorSeverity.NONE: 0.0,
    ErrorSeverity.LOW: 0.02,
    ErrorSeverity.MEDIUM: 0.05,
    ErrorSeverity.HIGH: 0.10,
    ErrorSeverity.CRITICAL: 0.20,
}


def classify_severity(rel_error: float) -> ErrorSeverity:
    if rel_error >= ERROR_THRESHOLDS[ErrorSeverity.CRITICAL]:
        return ErrorSeverity.CRITICAL
    elif rel_error >= ERROR_THRESHOLDS[ErrorSeverity.HIGH]:
        return ErrorSeverity.HIGH
    elif rel_error >= ERROR_THRESHOLDS[ErrorSeverity.MEDIUM]:
        return ErrorSeverity.MEDIUM
    elif rel_error >= ERROR_THRESHOLDS[ErrorSeverity.LOW]:
        return ErrorSeverity.LOW
    return ErrorSeverity.NONE


def explain_error_in_chinese(
    node_label: str,
    expected: float,
    actual: float,
    abs_err: float,
    rel_err: float,
    severity: ErrorSeverity,
) -> Tuple[str, str, str]:
    severity_text = {
        ErrorSeverity.LOW: "轻微",
        ErrorSeverity.MEDIUM: "中等",
        ErrorSeverity.HIGH: "较大",
        ErrorSeverity.CRITICAL: "严重",
    }.get(severity, "无")

    if actual > expected:
        direction = "偏高"
        direction_detail = "高估了该事件发生的可能性"
    else:
        direction = "偏低"
        direction_detail = "低估了该事件发生的可能性"

    explanation = (
        f"节点「{node_label}」的概率估值存在{severity_text}偏差："
        f"预期值为 {expected:.4f}，实际录入值为 {actual:.4f}，"
        f"{direction}了 {abs_err:.4f}（相对误差 {rel_err*100:.2f}%）。"
        f"这意味着建模过程{direction_detail}，"
        f"可能导致后续联合概率计算出现连锁偏差。"
    )

    suggestion = (
        f"建议复核节点「{node_label}」的概率来源："
        f"检查计算草稿中的推导步骤，确认是否存在四舍五入误差、"
        f"条件概率混淆或主观估值偏差。如为历史数据统计所得，"
        f"请核对样本量和抽样方法；如为专家打分，建议补充2-3位同行评议。"
    )

    error_type = f"概率估值{direction}"

    return error_type, explanation, suggestion


def parse_tree_from_dict(data: Dict[str, Any], parent_id: Optional[str] = None) -> TreeNode:
    node = TreeNode(
        id=data.get("id", generate_id("node")),
        label=data["label"],
        probability=float(data.get("probability", 0.0)),
        parent_id=parent_id,
        source_ref=data.get("source_ref"),
        calc_note=data.get("calc_note"),
        raw_value=data.get("raw_value"),
    )
    for child_data in data.get("children", []):
        child = parse_tree_from_dict(child_data, parent_id=node.id)
        node.children.append(child)
    return node


def load_input_file(filepath: str) -> Tuple[List[TreeNode], Dict[str, Any]]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    trees = []
    meta = data.get("meta", {}) if isinstance(data, dict) else {}

    if isinstance(data, dict) and "trees" in data:
        for tree_data in data["trees"]:
            trees.append(parse_tree_from_dict(tree_data))
    elif isinstance(data, dict) and "label" in data:
        trees.append(parse_tree_from_dict(data))
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "label" in item:
                trees.append(parse_tree_from_dict(item))

    return trees, meta


def validate_node_children_sum(node: TreeNode) -> Optional[ErrorRecord]:
    if not node.children:
        return None

    child_sum = sum(c.probability for c in node.children)
    expected = 1.0
    abs_err = abs(child_sum - expected)
    rel_err = abs_err / expected if expected != 0 else 0.0
    severity = classify_severity(rel_err)

    if severity == ErrorSeverity.NONE:
        return None

    error_type, explanation, suggestion = explain_error_in_chinese(
        node_label=f"{node.label}（子节点概率和）",
        expected=expected,
        actual=child_sum,
        abs_err=abs_err,
        rel_err=rel_err,
        severity=severity,
    )
    explanation = (
        f"父节点「{node.label}」下所有子节点的概率之和不等于1.0。"
        f"当前求和为 {child_sum:.4f}，偏离标准值 {abs_err:.4f}（相对误差 {rel_err*100:.2f}%）。"
        f"这违反了概率树的基本公理，将导致整条分支的条件概率无法归一化。"
    )
    suggestion = (
        f"请逐一核对「{node.label}」下各子节点的概率值："
        f"检查是否遗漏了某个互斥事件，或存在重复计数。"
        f"如为近似计算，请统一保留小数位数并在末端进行归一化调整。"
    )

    return ErrorRecord(
        record_id=generate_id("err"),
        node_id=node.id,
        node_label=node.label,
        expected_prob=expected,
        actual_prob=child_sum,
        absolute_error=abs_err,
        relative_error=rel_err,
        severity=severity,
        error_type="子节点概率和不等于1",
        explanation_zh=explanation,
        suggestion_zh=suggestion,
        calc_draft_ref=node.calc_note,
        processing_note=f"子节点数: {len(node.children)}, 子节点概率列表: {[c.probability for c in node.children]}",
    )


def validate_node_probability_range(node: TreeNode) -> Optional[ErrorRecord]:
    prob = node.probability
    if 0.0 <= prob <= 1.0:
        return None

    expected = max(0.0, min(1.0, prob))
    abs_err = abs(prob - expected)
    rel_err = abs_err / 1.0
    severity = classify_severity(rel_err) if rel_err < 1.0 else ErrorSeverity.CRITICAL

    if prob < 0:
        direction = "为负值"
    else:
        direction = "大于1"

    explanation = (
        f"节点「{node.label}」的概率值{direction}：当前值为 {prob:.4f}。"
        f"概率的取值范围必须在 [0, 1] 之间，该值在数学上不合法，"
        f"将直接导致整条路径的联合概率计算失真。"
    )
    suggestion = (
        f"请立即复核节点「{node.label}」的原始计算草稿："
        f"检查是否存在单位混淆（如将百分比直接当小数使用）、"
        f"符号错误或数据录入笔误。如确为原始数据问题，请记录并在报告中注明。"
    )

    return ErrorRecord(
        record_id=generate_id("err"),
        node_id=node.id,
        node_label=node.label,
        expected_prob=expected,
        actual_prob=prob,
        absolute_error=abs_err,
        relative_error=min(rel_err, 1.0),
        severity=severity,
        error_type=f"概率值{direction}",
        explanation_zh=explanation,
        suggestion_zh=suggestion,
        calc_draft_ref=node.calc_note,
        processing_note=f"原始值: {node.raw_value}, 来源引用: {node.source_ref}",
    )


def validate_conditional_probability_context(
    node: TreeNode, parent: Optional[TreeNode]
) -> Optional[ErrorRecord]:
    if parent is None:
        return None

    joint_prob = parent.probability * node.probability
    if joint_prob > 1.0 + 1e-9:
        abs_err = joint_prob - 1.0
        rel_err = abs_err / 1.0
        severity = classify_severity(rel_err)

        explanation = (
            f"节点「{node.label}」的联合概率（父节点概率 × 当前节点条件概率）"
            f"= {parent.probability:.4f} × {node.probability:.4f} = {joint_prob:.4f} > 1.0。"
            f"这在数学上不合法，说明父节点或当前节点的概率估值存在组合性偏差，"
            f"需要同时复核两层节点的计算草稿。"
        )
        suggestion = (
            f"请同时复核父节点「{parent.label}」和子节点「{node.label}」的概率："
            f"确认两者记录的是条件概率还是联合概率，"
            f"并检查是否存在百分比/小数单位混淆。"
            f"若均为条件概率，请注意联合概率 P(A∩B) = P(A)·P(B|A) 不得超过 1。"
        )

        return ErrorRecord(
            record_id=generate_id("err"),
            node_id=node.id,
            node_label=node.label,
            expected_prob=1.0,
            actual_prob=joint_prob,
            absolute_error=abs_err,
            relative_error=rel_err,
            severity=severity,
            error_type="联合概率乘积大于1",
            explanation_zh=explanation,
            suggestion_zh=suggestion,
            calc_draft_ref=node.calc_note,
            processing_note=f"父节点P={parent.probability}, 当前节点P(条件)={node.probability}, 联合P乘积={joint_prob}",
        )
    return None


def traverse_tree(
    node: TreeNode,
    parent: Optional[TreeNode],
    errors: List[ErrorRecord],
) -> None:
    err = validate_node_probability_range(node)
    if err:
        errors.append(err)

    err = validate_node_children_sum(node)
    if err:
        errors.append(err)

    err = validate_conditional_probability_context(node, parent)
    if err:
        errors.append(err)

    for child in node.children:
        traverse_tree(child, node, errors)


def build_overall_summary_zh(errors: List[ErrorRecord], tree_count: int) -> str:
    total = len(errors)
    if total == 0:
        return (
            f"本次共处理 {tree_count} 棵概率树，未发现概率估值偏差。"
            f"所有节点概率均满足取值范围要求，子节点概率和归一性校验通过，"
            f"父子节点概率关系符合概率公理。模型可进入下一阶段评审。"
        )

    severity_counts: Dict[str, int] = {}
    type_counts: Dict[str, int] = {}
    for e in errors:
        sev = e.severity.value
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        type_counts[e.error_type] = type_counts.get(e.error_type, 0) + 1

    sev_desc = []
    for sev_label, sev_key in [("严重", "critical"), ("较大", "high"), ("中等", "medium"), ("轻微", "low")]:
        if severity_counts.get(sev_key, 0) > 0:
            sev_desc.append(f"{sev_label}偏差 {severity_counts[sev_key]} 条")

    type_desc = "、".join([f"{k}({v}条)" for k, v in type_counts.items()])

    critical = [e for e in errors if e.severity in (ErrorSeverity.HIGH, ErrorSeverity.CRITICAL)]
    focus = ""
    if critical:
        focus_nodes = "、".join([f"「{e.node_label}」" for e in critical[:3]])
        focus = f" 其中需重点关注：{focus_nodes} 等节点。"

    return (
        f"本次共处理 {tree_count} 棵概率树，发现 {total} 处概率估值偏差，"
        f"其中{ '、'.join(sev_desc) if sev_desc else '无显著偏差' }。"
        f"主要问题类型为：{type_desc}。{focus}"
        f"建议按严重程度从高到低依次复核计算草稿，"
        f"优先修正严重和较大偏差后再重新校验。"
    )


def process_file(
    filepath: str,
    batch_id: str,
) -> ProcessingRecord:
    trees, meta = load_input_file(filepath)
    errors: List[ErrorRecord] = []

    for tree in trees:
        traverse_tree(tree, None, errors)

    rec = ProcessingRecord(
        id=generate_id("proc"),
        source_file=os.path.basename(filepath),
        source_hash=file_hash(filepath),
        batch_id=batch_id,
        status=RecordStatus.PROCESSED,
        tree_root=trees[0] if len(trees) == 1 else None,
        errors=errors,
        overall_summary_zh=build_overall_summary_zh(errors, len(trees)),
    )

    if len(trees) > 1 and not rec.tree_root:
        synthetic = TreeNode(
            id=generate_id("node"),
            label=f"批次根（含{len(trees)}棵独立树）",
            probability=1.0,
            children=trees,
            calc_note="合成节点：批次内多棵独立概率树的公共根",
        )
        rec.tree_root = synthetic

    return rec


def find_node_by_id(node: TreeNode, target_id: str) -> Optional[TreeNode]:
    if node.id == target_id:
        return node
    for child in node.children:
        found = find_node_by_id(child, target_id)
        if found:
            return found
    return None
