"""可操作的错误提示系统"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


class BPSError(Exception):
    """贝叶斯先验敏感性分析的基础异常"""

    def __init__(self, message: str, suggestion: str = "", details: str = ""):
        super().__init__(message)
        self.message = message
        self.suggestion = suggestion
        self.details = details

    def __str__(self) -> str:
        parts = [f"[错误] {self.message}"]
        if self.suggestion:
            parts.append(f"[建议] {self.suggestion}")
        if self.details:
            parts.append(f"[详情] {self.details}")
        return "\n".join(parts)


class MissingScoringRecordError(BPSError):
    """缺少评分记录"""

    def __init__(self, case_id: str, missing_scorer: Optional[list[str]] = None):
        scorers = missing_scorer or ["未指定评分人"]
        scorer_list = "、".join(scorers)
        super().__init__(
            message=f"边界样例 {case_id} 缺少评分记录",
            suggestion=f"请补充以下评分人的评分记录: {scorer_list}",
            details=f"边界样例 ID: {case_id}\n缺少评分记录来自评分人: {scorer_list}\n可使用命令: bps load-scoring --case-id {case_id} --scorer <评分人> --score <分数>",
        )
        self.case_id = case_id
        self.missing_scorer = missing_scorer or []


class MissingSourceMaterialError(BPSError):
    """缺少来源材料"""

    def __init__(self, case_id: str, material_type: str = ""):
        super().__init__(
            message=f"边界样例 {case_id} 缺少来源材料",
            suggestion=f"请补充: {material_type} 类型的来源材料",
            details=f"边界样例 ID: {case_id}\n缺少材料类型: {material_type}\n可使用命令: bps add-source --case-id {case_id} --type {material_type}",
        )
        self.case_id = case_id
        self.material_type = material_type


class ConstraintViolationError(BPSError):
    """约束校验失败"""

    def __init__(self, case_id: str, violations: list[str]):
        viol_text = "\n  - ".join(violations)
        super().__init__(
            message=f"边界样例 {case_id} 约束校验失败，共 {len(violations)} 条违规",
            suggestion="请根据下方违规列表逐条修正后重新运行约束校验",
            details=f"边界样例 ID: {case_id}\n违规项:\n  - {viol_text}",
        )
        self.case_id = case_id
        self.violations = violations


class PriorSensitivityError(BPSError):
    """先验敏感性计算失败"""

    def __init__(self, case_id: str, reason: str):
        super().__init__(
            message=f"边界样例 {case_id} 先验敏感性计算失败",
            suggestion="检查先验参数是否在合理范围内，或使用 --verbose 查看详细日志",
            details=f"边界样例 ID: {case_id}\n失败原因: {reason}",
        )
        self.case_id = case_id
        self.reason = reason


class DataFormatError(BPSError):
    """数据格式错误"""

    def __init__(self, file_path: str, line_no: int, issue: str):
        super().__init__(
            message=f"数据文件 {file_path} 第 {line_no} 行格式错误",
            suggestion="请对照样例数据格式，检查字段名和数据类型",
            details=f"文件: {file_path}\n行号: {line_no}\n问题: {issue}",
        )
        self.file_path = file_path
        self.line_no = line_no
        self.issue = issue


class InvalidStateTransitionError(BPSError):
    """状态流转非法"""

    def __init__(self, case_id: str, from_status: str, to_status: str, allowed: list[str]):
        allowed_list = "、".join(allowed)
        super().__init__(
            message=f"边界样例 {case_id} 状态流转非法: {from_status} → {to_status}",
            suggestion=f"仅允许流转到以下状态: {allowed_list}",
            details=f"边界样例 ID: {case_id}\n当前状态: {from_status}\n目标状态: {to_status}\n允许的目标状态: {allowed_list}",
        )
        self.case_id = case_id
        self.from_status = from_status
        self.to_status = to_status
        self.allowed = allowed


class UnknownCaseError(BPSError):
    """边界样例不存在"""

    def __init__(self, case_id: str):
        super().__init__(
            message=f"未找到边界样例 {case_id}",
            suggestion="确认 case_id 是否正确，或使用 bps list-cases 查看所有可用边界样例",
            details=f"边界样例 ID: {case_id}",
        )
        self.case_id = case_id
