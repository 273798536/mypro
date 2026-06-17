import hashlib
import json
import os
from typing import List, Dict, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime

from .models import (
    HallucinationRecord,
    RecordStatus,
    SafetyCheckResult,
    SourceMaterial,
)


class TrackableError(Exception):
    def __init__(self, message: str, actionable_guidance: str,
                 missing_resources: Optional[List[str]] = None,
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.actionable_guidance = actionable_guidance
        self.missing_resources = missing_resources or []
        self.details = details or {}

    def to_safety_result(self, check_name: str) -> SafetyCheckResult:
        return SafetyCheckResult(
            check_name=check_name,
            passed=False,
            severity="high",
            message=str(self),
            actionable_guidance=self.actionable_guidance,
            missing_resources=self.missing_resources,
            details=self.details,
        )


class SafetyGuard:
    def __init__(self, logs_dir: Optional[str] = None, storage_dir: Optional[str] = None):
        if logs_dir is None:
            logs_dir = Path(__file__).parent.parent / "data" / "model_logs"
        if storage_dir is None:
            storage_dir = Path(__file__).parent.parent / "data"

        self.logs_dir = Path(logs_dir)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir = Path(storage_dir)
        self.check_results_dir = self.storage_dir / "safety_checks"
        self.check_results_dir.mkdir(parents=True, exist_ok=True)

    def _get_log_path(self, model_name: str, log_type: str) -> Path:
        return self.logs_dir / f"{model_name}_{log_type}.log"

    def _check_log_exists(self, model_name: str, log_type: str) -> Tuple[bool, str]:
        log_path = self._get_log_path(model_name, log_type)
        if not log_path.exists():
            return False, str(log_path)
        return True, str(log_path)

    def _hash_sample(self, input_query: str, model_output: str) -> str:
        content = f"{input_query}|||{model_output}".encode("utf-8")
        return hashlib.md5(content).hexdigest()

    def check_train_val_leakage(self, record: HallucinationRecord,
                                train_log_model_name: str = "default",
                                val_log_model_name: str = "default") -> SafetyCheckResult:
        try:
            train_exists, train_path = self._check_log_exists(train_log_model_name, "train_samples")
            val_exists, val_path = self._check_log_exists(val_log_model_name, "val_samples")

            missing = []
            if not train_exists:
                missing.append(train_path)
            if not val_exists:
                missing.append(val_path)

            if missing:
                raise TrackableError(
                    message=f"无法完成训练验证泄漏检测：缺失 {len(missing)} 份模型日志文件",
                    actionable_guidance=(
                        "请按以下步骤操作：\n"
                        "1. 导出模型训练集样本日志，保存为: {train_path}\n"
                        "2. 导出模型验证集样本日志，保存为: {val_path}\n"
                        "3. 日志格式要求：每行一个样本的JSON，包含 input_query 字段\n"
                        "4. 重新运行安全检测"
                    ).format(train_path=train_path, val_path=val_path),
                    missing_resources=missing,
                    details={
                        "required_files": [
                            {"type": "train_log", "path": train_path},
                            {"type": "val_log", "path": val_path},
                        ]
                    }
                )

            sample_hash = self._hash_sample(record.input_query, record.model_output)

            train_hashes = set()
            with open(train_path, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        data = json.loads(line.strip())
                        if "input_query" in data and "model_output" in data:
                            h = self._hash_sample(data["input_query"], data["model_output"])
                            train_hashes.add(h)
                    except Exception:
                        continue

            val_hashes = set()
            with open(val_path, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        data = json.loads(line.strip())
                        if "input_query" in data and "model_output" in data:
                            h = self._hash_sample(data["input_query"], data["model_output"])
                            val_hashes.add(h)
                    except Exception:
                        continue

            in_train = sample_hash in train_hashes
            in_val = sample_hash in val_hashes

            if in_train and in_val:
                return SafetyCheckResult(
                    check_name="train_val_leakage",
                    passed=False,
                    severity="critical",
                    message="检测到训练验证泄漏：样本同时出现在训练集和验证集中",
                    actionable_guidance=(
                        "该样本存在数据泄漏风险！请：\n"
                        "1. 从验证集中移除该样本\n"
                        "2. 检查训练数据划分脚本，确认随机种子和划分逻辑\n"
                        "3. 重新划分数据集后重新训练模型"
                    ),
                    details={
                        "sample_hash": sample_hash,
                        "in_train": True,
                        "in_val": True,
                    }
                )
            elif in_train:
                return SafetyCheckResult(
                    check_name="train_val_leakage",
                    passed=True,
                    severity="low",
                    message="样本在训练集中，无泄漏",
                    details={"sample_hash": sample_hash, "in_train": True, "in_val": False}
                )
            elif in_val:
                return SafetyCheckResult(
                    check_name="train_val_leakage",
                    passed=False,
                    severity="high",
                    message="样本在验证集中但不在训练集中，评估结果可能不可靠",
                    actionable_guidance=(
                        "建议：\n"
                        "1. 确认该样本是否应该被用于评估\n"
                        "2. 如果是训练数据不足导致，考虑增加训练样本多样性\n"
                        "3. 交叉验证时注意数据划分的一致性"
                    ),
                    details={"sample_hash": sample_hash, "in_train": False, "in_val": True}
                )
            else:
                return SafetyCheckResult(
                    check_name="train_val_leakage",
                    passed=True,
                    severity="low",
                    message="样本不在训练集或验证集中，无泄漏",
                    details={"sample_hash": sample_hash, "in_train": False, "in_val": False}
                )

        except TrackableError as e:
            return e.to_safety_result("train_val_leakage")
        except Exception as e:
            return SafetyCheckResult(
                check_name="train_val_leakage",
                passed=False,
                severity="high",
                message=f"检测过程发生错误: {str(e)}",
                actionable_guidance=(
                    "检测遇到未知错误，请：\n"
                    "1. 检查日志文件格式是否正确（每行一个JSON）\n"
                    "2. 确认日志文件包含 input_query 和 model_output 字段\n"
                    "3. 如问题持续，请联系模型训练工程师排查"
                ),
                details={"error_type": type(e).__name__}
            )

    def check_source_authenticity(self, record: HallucinationRecord) -> SafetyCheckResult:
        try:
            if not record.source_materials:
                return SafetyCheckResult(
                    check_name="source_authenticity",
                    passed=False,
                    severity="high",
                    message="样本没有关联任何来源材料，无法验证真实性",
                    actionable_guidance=(
                        "请补充来源材料：\n"
                        "1. 收集该样本对应的原始文档、网页或知识库条目\n"
                        "2. 在系统中上传来源材料并与该样本关联\n"
                        "3. 重新进行安全检测"
                    ),
                    missing_resources=["source_materials"],
                    details={"record_id": record.record_id}
                )

            unverified = []
            for source in record.source_materials:
                if not source.material_id or not source.content:
                    unverified.append(source)

            if unverified:
                return SafetyCheckResult(
                    check_name="source_authenticity",
                    passed=False,
                    severity="medium",
                    message=f"有 {len(unverified)} 份来源材料信息不完整",
                    actionable_guidance=(
                        "请完善以下来源材料信息：\n"
                        + "\n".join([f"- 第{i+1}份：缺少 material_id 或 content 字段"
                                    for i, _ in enumerate(unverified)])
                    ),
                    details={"incomplete_sources": len(unverified)}
                )

            output_mentions = self._extract_entity_mentions(record.model_output)
            source_mentions = set()
            for source in record.source_materials:
                source_mentions.update(self._extract_entity_mentions(source.content))

            missing_entities = output_mentions - source_mentions
            if missing_entities and len(missing_entities) > len(output_mentions) * 0.3:
                return SafetyCheckResult(
                    check_name="source_authenticity",
                    passed=False,
                    severity="high",
                    message=f"模型输出中有 {len(missing_entities)} 个实体在来源材料中找不到依据",
                    actionable_guidance=(
                        "请检查：\n"
                        "1. 这些实体是否为模型幻觉产物\n"
                        "2. 是否遗漏了相关的来源材料\n"
                        f"3. 缺失的实体包括：{', '.join(list(missing_entities)[:5])}"
                    ),
                    details={
                        "missing_entities": list(missing_entities),
                        "output_entities": list(output_mentions),
                        "source_entities": list(source_mentions),
                    }
                )

            return SafetyCheckResult(
                check_name="source_authenticity",
                passed=True,
                severity="low",
                message="来源材料完整，输出内容可追溯",
                details={
                    "source_count": len(record.source_materials),
                    "verified_entities_count": len(source_mentions),
                }
            )

        except Exception as e:
            return SafetyCheckResult(
                check_name="source_authenticity",
                passed=False,
                severity="high",
                message=f"来源验证错误: {str(e)}",
                actionable_guidance="请检查来源材料格式是否正确，必要时联系技术支持",
                details={"error_type": type(e).__name__}
            )

    def _extract_entity_mentions(self, text: str) -> set:
        import re
        patterns = [
            r'[""]([^""]+)[""]',
            r'《([^》]+)》',
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',
            r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?',
        ]
        entities = set()
        for pattern in patterns:
            matches = re.findall(pattern, text)
            entities.update(matches)
        return entities

    def run_all_checks(self, record: HallucinationRecord,
                       train_log_model_name: str = "default",
                       val_log_model_name: str = "default",
                       auto_block: bool = True) -> List[SafetyCheckResult]:
        checks = [
            self.check_train_val_leakage(record, train_log_model_name, val_log_model_name),
            self.check_source_authenticity(record),
        ]

        failed_high = [c for c in checks if not c.passed and c.severity in ["high", "critical"]]

        if auto_block and failed_high:
            record.status = RecordStatus.SAFETY_BLOCKED
            record.updated_at = datetime.now()

        record.safety_checks = checks
        self._save_check_result(record.record_id, checks)

        return checks

    def _save_check_result(self, record_id: str, checks: List[SafetyCheckResult]) -> None:
        file_path = self.check_results_dir / f"{record_id}.json"
        data = [
            {
                **c.model_dump(),
            }
            for c in checks
        ]
        for d in data:
            if "details" in d and isinstance(d["details"], dict):
                d["details"] = d["details"]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def get_check_history(self, record_id: str) -> List[SafetyCheckResult]:
        file_path = self.check_results_dir / f"{record_id}.json"
        if not file_path.exists():
            return []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [SafetyCheckResult(**item) for item in data]
        except Exception:
            return []
