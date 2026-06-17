import json
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ActionableError(Exception):
    code: str
    message: str
    suggestion: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "suggestion": self.suggestion,
            "details": self.details
        }

    def format_for_user(self) -> str:
        lines = [
            f"[错误: {self.code}] {self.message}",
            f"  建议: {self.suggestion}"
        ]
        if self.details:
            for k, v in self.details.items():
                if isinstance(v, list):
                    lines.append(f"  {k}:")
                    for item in v:
                        lines.append(f"    - {item}")
                else:
                    lines.append(f"  {k}: {v}")
        return "\n".join(lines)


class ErrorHandler:
    @staticmethod
    def missing_human_feedback(
        material_file: Optional[str] = None,
        material_id: Optional[str] = None,
        required_types: Optional[List[str]] = None,
        available_feedback_dir: Optional[str] = None
    ) -> ActionableError:
        details: Dict[str, Any] = {}
        if material_file:
            details["关联材料"] = material_file
        if material_id:
            details["材料ID"] = material_id
        if required_types:
            details["需要的反馈类型"] = required_types
        if available_feedback_dir:
            details["反馈目录"] = available_feedback_dir
        suggestion_parts = ["请在人工反馈目录中添加对应文件"]
        if material_file:
            suggestion_parts.append(f"，文件名可参考材料名，例如 feedback_{material_file}")
        suggestion_parts.append("，或通过 import-feedback 子命令重新导入。")
        return ActionableError(
            code="MISSING_HUMAN_FEEDBACK",
            message="缺少关联的人工反馈材料",
            suggestion="".join(suggestion_parts),
            details=details
        )

    @staticmethod
    def unmatched_training_eval_pair(
        training_file: str,
        evaluation_file: str,
        reason: str
    ) -> ActionableError:
        return ActionableError(
            code="UNMATCHED_PAIR",
            message=f"训练样本与评测题目无法建立对应关系",
            suggestion=(
                f"请检查「{training_file}」和「{evaluation_file}」的知识点/主题是否"
                f"匹配。{reason}。可在材料的 metadata 中添加相同的 topic 或 knowledge_point 字段。"
            ),
            details={"训练样本": training_file, "评测题目": evaluation_file, "原因": reason}
        )

    @staticmethod
    def evaluation_skewed(
        category: str,
        eval_count: int,
        training_count: int,
        expected_ratio: Tuple[float, float]
    ) -> ActionableError:
        min_r, max_r = expected_ratio
        actual = eval_count / max(training_count, 1)
        return ActionableError(
            code="EVALUATION_SKEWED",
            message=f"评测集在「{category}」类别上分布偏科",
            suggestion=(
                f"当前该类别评测题数/训练样本数={actual:.2f}，"
                f"建议范围[{min_r}, {max_r}]。请补充该类别下的训练样本或调整评测分布，"
                f"使比例落入合理区间后重新运行审计。"
            ),
            details={
                "类别": category,
                "评测题数": eval_count,
                "训练样本数": training_count,
                "实际比例": round(actual, 3),
                "建议比例范围": list(expected_ratio)
            }
        )

    @staticmethod
    def conflict_previous_conclusion(
        pair_key: str,
        prev_summary: str,
        new_summary: str
    ) -> ActionableError:
        return ActionableError(
            code="CONFLICT_CONCLUSION",
            message=f"同一份材料对 {pair_key} 审计结论前后不一致",
            suggestion=(
                f"上次结论:「{prev_summary}」，本次:「{new_summary}」。"
                f"请在界面上勾选「强制重新审计」并核对原始材料，或补充人工反馈明确结论。"
            ),
            details={"材料对": pair_key, "上次结论": prev_summary, "本次结论": new_summary}
        )

    @staticmethod
    def batch_not_found(batch_id: str, batch_type: str) -> ActionableError:
        return ActionableError(
            code="BATCH_NOT_FOUND",
            message=f"找不到指定的{batch_type}批次: {batch_id}",
            suggestion=(
                f"请先通过 import 子命令导入对应批次。可用 list-batches 查看已有批次。"
            ),
            details={"批次ID": batch_id, "批次类型": batch_type}
        )

    @staticmethod
    def internal_error(original_error: Exception) -> ActionableError:
        return ActionableError(
            code="INTERNAL_ERROR",
            message=f"系统内部错误: {type(original_error).__name__}: {original_error}",
            suggestion=(
                "请将以下信息提供给技术支持：错误栈、当前运行批次ID、复现步骤。"
                "在修复前可先尝试重新导入原始目录下的材料，或使用 --force 强制重新审计。"
            ),
            details={"原始错误类型": type(original_error).__name__}
        )


def safe_str(obj: Any, default: str = "") -> str:
    try:
        return str(obj) if obj is not None else default
    except Exception:
        return default


def extract_topic_from_metadata(metadata_json: Optional[str]) -> List[str]:
    topics = []
    if not metadata_json:
        return topics
    try:
        data = json.loads(metadata_json)
        for key in ("topic", "category", "subject", "knowledge_point"):
            if key in data:
                val = data[key]
                if isinstance(val, list):
                    topics.extend(str(v) for v in val)
                elif val:
                    topics.append(str(val))
    except (json.JSONDecodeError, TypeError):
        pass
    return topics


def extract_topic_from_filename(fname: str, preview: str) -> List[str]:
    topics = []
    text = f"{fname} {preview or ''}"
    patterns = [
        r'知识点[：:]\s*([^\s，,。.]+)',
        r'主题[：:]\s*([^\s，,。.]+)',
        r'类别[：:]\s*([^\s，,。.]+)',
    ]
    for pat in patterns:
        for m in re.findall(pat, text):
            topics.append(m.strip())
    return topics
