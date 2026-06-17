from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

OK = "ok"
WARN = "warn"
FAIL = "fail"

BLOCKING = "blocking"
NON_BLOCKING = "non_blocking"

MISSING_MODEL_LOG = "MISSING_MODEL_LOG"
MISSING_PROMPT_DEFINITION = "MISSING_PROMPT_DEFINITION"
MISSING_EVAL_RUN = "MISSING_EVAL_RUN"
UNPARSEABLE_RECORD = "UNPARSEABLE_RECORD"
DUPLICATE_SAMPLE_ID = "DUPLICATE_SAMPLE_ID"
SPLIT_AMBIGUOUS = "SPLIT_AMBIGUOUS"
LEAKAGE_UNTRACEABLE = "LEAKAGE_UNTRACEABLE"
REPLAY_INCOMPLETE = "REPLAY_INCOMPLETE"
EXPORT_MISMATCH = "EXPORT_MISMATCH"

_REMEDIATION = {
    MISSING_MODEL_LOG: "请补录缺失的模型训练日志文件后重跑；可使用 `prompt-impact run` 重新汇总。",
    MISSING_PROMPT_DEFINITION: "请确认 prompts/<prompt_id>/<version>.json 存在且版本号与日志引用一致。",
    MISSING_EVAL_RUN: "请确认 runs/<eval_run_id>/meta.json 与 results.jsonl 完整存在后重跑。",
    UNPARSEABLE_RECORD: "请修正对应文件中的 JSON/CSV 行；记录位置见 detail.loc。",
    DUPLICATE_SAMPLE_ID: "请合并或去重同一 split 内重复的 sample_id，避免结论歧义。",
    SPLIT_AMBIGUOUS: "请为该 sample_id 明确标注 split(train/val/test)，补录标注记录后重跑。",
    LEAKAGE_UNTRACEABLE: "该泄漏记录缺少来源证据，请补录对应训练日志/标注记录以补全追溯链。",
    REPLAY_INCOMPLETE: "评测回放存在未覆盖样本或缺失证据，请补齐材料后重跑 replay。",
    EXPORT_MISMATCH: "导出与摘要不一致（不应发生），请重新执行 export 重新生成。",
}


@dataclass
class ActionableError:
    code: str
    message: str
    severity: str = FAIL
    blocking: str = BLOCKING
    missing_artifact: Optional[str] = None
    remediation: str = ""
    detail: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.remediation:
            self.remediation = _REMEDIATION.get(self.code, "请根据 detail 排查后重跑。")

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "severity": self.severity,
            "blocking": self.blocking,
            "missing_artifact": self.missing_artifact,
            "remediation": self.remediation,
            "detail": self.detail,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ActionableError":
        return cls(
            code=d.get("code", "UNKNOWN"),
            message=d.get("message", ""),
            severity=d.get("severity", FAIL),
            blocking=d.get("blocking", BLOCKING),
            missing_artifact=d.get("missing_artifact"),
            remediation=d.get("remediation", ""),
            detail=d.get("detail", {}),
        )


def missing_model_log(run_id: str, expected_path: str) -> ActionableError:
    return ActionableError(
        code=MISSING_MODEL_LOG,
        message=f"缺少模型训练日志: run_id={run_id} (期望文件 {expected_path})",
        missing_artifact=expected_path,
        detail={"run_id": run_id, "expected_path": expected_path},
    )


def missing_prompt_definition(prompt_version: str) -> ActionableError:
    return ActionableError(
        code=MISSING_PROMPT_DEFINITION,
        message=f"缺少 Prompt 定义: 版本 {prompt_version} 在 prompts/ 下未找到",
        missing_artifact=f"prompts/{prompt_version.split('@')[0]}/{prompt_version.split('@')[-1]}.json",
        detail={"prompt_version": prompt_version},
    )


def missing_eval_run(eval_run_id: str) -> ActionableError:
    return ActionableError(
        code=MISSING_EVAL_RUN,
        message=f"缺少评测运行目录: runs/{eval_run_id}/ 不存在或不完整",
        missing_artifact=f"runs/{eval_run_id}/",
        detail={"eval_run_id": eval_run_id},
    )


def unparseable_record(path: str, line_no: int, raw: str, why: str) -> ActionableError:
    return ActionableError(
        code=UNPARSEABLE_RECORD,
        message=f"无法解析记录: {path}:{line_no} ({why})",
        severity=FAIL,
        detail={"loc": f"{path}:{line_no}", "why": why, "raw": raw[:200]},
    )


def duplicate_sample_id(sample_id: str, split: str, path: str) -> ActionableError:
    return ActionableError(
        code=DUPLICATE_SAMPLE_ID,
        message=f"sample_id 重复: {sample_id} 在 split={split} 中出现多次 ({path})",
        severity=WARN,
        blocking=NON_BLOCKING,
        detail={"sample_id": sample_id, "split": split, "path": path},
    )


def split_ambiguous(sample_id: str, path: str) -> ActionableError:
    return ActionableError(
        code=SPLIT_AMBIGUOUS,
        message=f"sample_id={sample_id} 的 split 未标注 ({path})",
        severity=WARN,
        blocking=NON_BLOCKING,
        detail={"sample_id": sample_id, "path": path},
    )


def leakage_untraceable(finding_id: str) -> ActionableError:
    return ActionableError(
        code=LEAKAGE_UNTRACEABLE,
        message=f"训练验证泄漏记录 {finding_id} 缺少来源证据，无法完成倒查",
        detail={"finding_id": finding_id},
    )


def blocking(errors: List[ActionableError]) -> bool:
    return any(e.blocking == BLOCKING for e in errors)
