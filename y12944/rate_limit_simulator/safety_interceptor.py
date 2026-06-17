import hashlib
import re
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from .models import (
    InterceptReason,
    InterceptResult,
    Sample,
    SafetyRule,
    SimulatorConfig,
)


class SafetyInterceptor:
    def __init__(self, config: SimulatorConfig):
        self.config = config
        self._seen_hashes: Dict[str, str] = {}
        self._split_list_versions: Dict[str, int] = {}
        self._check_rounds: Dict[str, int] = {}
        self._last_split_list_hash: Optional[str] = None

    def _compute_split_list_hash(self) -> str:
        sorted_entries = sorted(self.config.train_test_split_list)
        content = "|".join(sorted_entries)
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def update_split_list(self, new_entries: List[str]) -> None:
        for entry in new_entries:
            self.config.add_split_entry(entry)
        new_hash = self._compute_split_list_hash()
        if new_hash != self._last_split_list_hash:
            self._last_split_list_hash = new_hash
            self._invalidate_duplicate_cache()

    def _invalidate_duplicate_cache(self) -> None:
        self._seen_hashes = {}

    def _compute_dedup_hash(self, sample: Sample) -> str:
        parts = []
        for key in self.config.duplicate_dedup_keys:
            if key == "prompt":
                parts.append(sample.prompt)
            elif key == "response" and sample.response:
                parts.append(sample.response)
            elif key == "group_id":
                parts.append(sample.group_id)
            elif key in sample.features:
                parts.append(str(sample.features[key]))
            elif sample.labels and key in sample.labels:
                parts.append(str(sample.labels[key]))
        content = "|".join(parts)
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def _check_duplicate(self, sample: Sample) -> Tuple[bool, Optional[str]]:
        if not self.config.enable_duplicate_check:
            return False, None
        dedup_hash = self._compute_dedup_hash(sample)
        if dedup_hash in self._seen_hashes:
            existing_id = self._seen_hashes[dedup_hash]
            return True, f"与样本 {existing_id} 重复（去重哈希：{dedup_hash[:12]}）"
        self._seen_hashes[dedup_hash] = sample.sample_id
        return False, None

    def _check_train_test_leakage(self, sample: Sample) -> Tuple[bool, Optional[str]]:
        if not self.config.enable_leakage_check:
            return False, None
        leakage_details = []
        split_list = self.config.train_test_split_list
        if sample.data_source.value in ["validation", "test"]:
            if sample.prompt in split_list:
                leakage_details.append(
                    f"提示词存在于训练集切分清单中，属于{sample.data_source.value}集但内容泄漏"
                )
            if sample.response and sample.response in split_list:
                leakage_details.append(
                    f"响应内容存在于训练集切分清单中，属于{sample.data_source.value}集但内容泄漏"
                )
            for key, value in sample.features.items():
                if str(value) in split_list:
                    leakage_details.append(
                        f"特征[{key}]的值[{value}]存在于训练集切分清单中"
                    )
        if leakage_details:
            return True, "; ".join(leakage_details)
        return False, None

    def _check_safety_rules(
        self, sample: Sample
    ) -> Tuple[bool, List[str], List[str]]:
        if not self.config.enable_safety_rules:
            return False, [], []
        matched_rules: List[str] = []
        matched_details: List[str] = []
        for rule in self.config.safety_rules:
            if not rule.is_enabled:
                continue
            is_match = False
            detail = ""
            if rule.rule_pattern:
                try:
                    if re.search(rule.rule_pattern, sample.prompt, re.IGNORECASE):
                        is_match = True
                        detail = f"提示词匹配规则模式：{rule.rule_pattern}"
                    elif sample.response and re.search(
                        rule.rule_pattern, sample.response, re.IGNORECASE
                    ):
                        is_match = True
                        detail = f"响应匹配规则模式：{rule.rule_pattern}"
                except re.error:
                    continue
            if not is_match and rule.parameters:
                for param_name, param_value in rule.parameters.items():
                    if param_name == "boundary_key" and param_value in sample.features:
                        feature_val = sample.features[param_value]
                        threshold = rule.parameters.get("threshold", 0)
                        operator = rule.parameters.get("operator", ">")
                        if operator == ">" and feature_val > threshold:
                            is_match = True
                            detail = f"特征[{param_value}]={feature_val} 超过阈值 {threshold}"
                        elif operator == "<" and feature_val < threshold:
                            is_match = True
                            detail = f"特征[{param_value}]={feature_val} 低于阈值 {threshold}"
                        elif operator == "==" and feature_val == threshold:
                            is_match = True
                            detail = f"特征[{param_value}]={feature_val} 等于阈值 {threshold}"
            if is_match:
                matched_rules.append(rule.rule_id)
                matched_details.append(f"[{rule.rule_name}] {detail}")
        return len(matched_rules) > 0, matched_rules, matched_details

    def _check_boundary_values(self, sample: Sample) -> Tuple[bool, Optional[str]]:
        boundary_hits = []
        for key, boundary_info in self.config.boundary_values.items():
            if key in sample.features:
                value = sample.features[key]
                if isinstance(boundary_info, dict):
                    if "max" in boundary_info and value > boundary_info["max"]:
                        boundary_hits.append(
                            f"特征[{key}]={value} 超过边界最大值 {boundary_info['max']}"
                        )
                    if "min" in boundary_info and value < boundary_info["min"]:
                        boundary_hits.append(
                            f"特征[{key}]={value} 低于边界最小值 {boundary_info['min']}"
                        )
                elif isinstance(boundary_info, list) and value in boundary_info:
                    boundary_hits.append(
                        f"特征[{key}]={value} 命中边界值列表 {boundary_info}"
                    )
        if boundary_hits:
            return True, "; ".join(boundary_hits)
        return False, None

    def _check_format(self, sample: Sample) -> Tuple[bool, Optional[str]]:
        if not sample.prompt or len(sample.prompt.strip()) == 0:
            return True, "提示词为空"
        if len(sample.prompt) > 10000:
            return True, f"提示词长度({len(sample.prompt)})超过最大限制"
        return False, None

    def check_sample(
        self, sample: Sample, force_round: Optional[int] = None
    ) -> InterceptResult:
        if force_round is not None:
            check_round = force_round
        else:
            self._check_rounds[sample.sample_id] = (
                self._check_rounds.get(sample.sample_id, 0) + 1
            )
            check_round = self._check_rounds[sample.sample_id]

        intercept_reasons: List[InterceptReason] = []
        intercept_details: List[str] = []
        matched_rules: List[str] = []
        suggestions: List[str] = []

        is_duplicate, dup_detail = self._check_duplicate(sample)
        if is_duplicate:
            intercept_reasons.append(InterceptReason.DUPLICATE_SAMPLE)
            intercept_details.append(dup_detail or "")
            suggestions.append("建议：检查是否为误判，或使用新版本号重新提交")

        is_leakage, leakage_detail = self._check_train_test_leakage(sample)
        if is_leakage:
            intercept_reasons.append(InterceptReason.TRAIN_TEST_LEAKAGE)
            intercept_details.append(leakage_detail or "")
            suggestions.append(
                "建议：核实该样本是否应该属于训练集，检查切分清单是否完整"
            )

        has_safety_violation, rules, safety_details = self._check_safety_rules(sample)
        if has_safety_violation:
            intercept_reasons.append(InterceptReason.SAFETY_RULE_VIOLATION)
            intercept_details.extend(safety_details)
            matched_rules.extend(rules)
            suggestions.append("建议：根据安全规则调整提示词或响应内容")

        is_boundary, boundary_detail = self._check_boundary_values(sample)
        if is_boundary:
            intercept_reasons.append(InterceptReason.BOUNDARY_VALUE)
            intercept_details.append(boundary_detail or "")
            suggestions.append("建议：检查特征值是否在合理范围内")

        is_invalid, format_detail = self._check_format(sample)
        if is_invalid:
            intercept_reasons.append(InterceptReason.INVALID_FORMAT)
            intercept_details.append(format_detail or "")
            suggestions.append("建议：修正输入格式后重新提交")

        is_blocked = len(intercept_reasons) > 0

        return InterceptResult(
            sample_id=sample.sample_id,
            is_blocked=is_blocked,
            intercept_reasons=intercept_reasons,
            intercept_details=intercept_details,
            matched_rules=matched_rules,
            check_round=check_round,
            content_hash=sample.content_hash(),
            suggestions=suggestions,
        )

    def batch_check(
        self, samples: List[Sample]
    ) -> Dict[str, InterceptResult]:
        results = {}
        for sample in samples:
            results[sample.sample_id] = self.check_sample(sample)
        return results

    def recheck_after_split_update(
        self, samples: List[Sample]
    ) -> Dict[str, InterceptResult]:
        self._invalidate_duplicate_cache()
        results = {}
        for sample in samples:
            current_round = self._check_rounds.get(sample.sample_id, 0)
            results[sample.sample_id] = self.check_sample(
                sample, force_round=current_round + 1
            )
        return results

    def get_split_list_version(self) -> int:
        current_hash = self._compute_split_list_hash()
        if current_hash not in self._split_list_versions:
            self._split_list_versions[current_hash] = (
                len(self._split_list_versions) + 1
            )
        return self._split_list_versions[current_hash]
