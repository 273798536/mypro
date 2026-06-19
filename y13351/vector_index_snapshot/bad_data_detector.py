from typing import Any, Dict, List, Optional, Tuple, Callable
import re
from .models import SnapshotRecord, GrayConfig, BadDataError, ProcessingStatus


class BadDataDetector:
    def __init__(self):
        self.custom_checks: List[Callable[[Dict[str, Any]], Optional[Tuple[str, str]]]] = []
        self.detected_issues: List[Dict[str, Any]] = []

    def add_custom_check(
        self, check_func: Callable[[Dict[str, Any]], Optional[Tuple[str, str]]]
    ) -> None:
        self.custom_checks.append(check_func)

    def validate_config(self, raw_config: Dict[str, Any], source_line: Optional[int] = None) -> List[str]:
        issues = []

        if not isinstance(raw_config, dict):
            issues.append(f"配置不是字典类型，实际是 {type(raw_config)}")
            return issues

        issues.extend(self._check_required_fields(raw_config, source_line))
        issues.extend(self._check_value_types(raw_config, source_line))
        issues.extend(self._check_value_ranges(raw_config, source_line))
        issues.extend(self._run_custom_checks(raw_config, source_line))

        return issues

    def validate_record(self, record: SnapshotRecord) -> List[str]:
        issues = []

        if not isinstance(record.score, (int, float)):
            issues.append("score不是数值类型")
            record.mark_bad_data("score不是数值类型", record.gray_config.source_object_path)

        if not isinstance(record.threshold, (int, float)):
            issues.append("threshold不是数值类型")
            record.mark_bad_data("threshold不是数值类型", record.gray_config.source_object_path)

        if isinstance(record.score, (int, float)):
            if record.score < 0 or record.score > 1:
                location = self._build_location(record)
                issues.append(f"score超出合理范围 [0,1]: {record.score}")
                record.mark_bad_data(f"score超出合理范围 [0,1]: {record.score}", location)

        if record.gray_config.source_line:
            config_issues = self.validate_config(
                record.gray_config.raw_config, record.gray_config.source_line
            )
            for issue in config_issues:
                location = self._build_location(record)
                record.mark_bad_data(issue, location)
                issues.append(f"配置问题（{location}）: {issue}")

        for issue in issues:
            self.detected_issues.append({
                "record_id": record.record_id,
                "issue": issue,
                "source_line": record.gray_config.source_line,
                "source_object_path": record.gray_config.source_object_path,
            })

        return issues

    def find_original_row(
        self,
        config: GrayConfig,
        field_name: str,
        raw_data_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> Optional[Dict[str, Any]]:
        raw_field = config.get_raw_field(field_name)
        if not raw_field:
            return None

        raw_name, raw_value = raw_field

        if raw_data_rows and config.source_line is not None and 0 < config.source_line <= len(raw_data_rows):
            row = raw_data_rows[config.source_line - 1]
            if row.get(raw_name) == raw_value:
                return {
                    "row_index": config.source_line - 1,
                    "row_number": config.source_line,
                    "field_name": raw_name,
                    "field_value": raw_value,
                    "row_data": row,
                    "object_path": config.source_object_path,
                }

        return {
            "row_number": config.source_line,
            "field_name": raw_name,
            "field_value": raw_value,
            "object_path": config.source_object_path,
        }

    def pinpoint_config_issue(
        self, config: GrayConfig, issue_description: str
    ) -> Dict[str, Any]:
        problematic_fields = self._identify_problematic_fields(config, issue_description)

        return {
            "source_id": config.source_id,
            "source_line": config.source_line,
            "source_object_path": config.source_object_path,
            "issue": issue_description,
            "problematic_fields": problematic_fields,
            "raw_config_snippet": self._extract_snippet(config.raw_config, problematic_fields),
            "fix_suggestion": self._generate_fix_suggestion(issue_description, problematic_fields),
        }

    def get_bad_data_summary(self) -> Dict[str, Any]:
        by_line: Dict[int, List[str]] = {}
        by_type: Dict[str, int] = {}

        for issue in self.detected_issues:
            line = issue.get("source_line") or 0
            if line not in by_line:
                by_line[line] = []
            by_line[line].append(issue["issue"])

            issue_type = self._categorize_issue(issue["issue"])
            by_type[issue_type] = by_type.get(issue_type, 0) + 1

        return {
            "total_issues": len(self.detected_issues),
            "issues_by_source_line": by_line,
            "issues_by_type": by_type,
            "has_bad_data": len(self.detected_issues) > 0,
        }

    def _check_required_fields(self, config: Dict[str, Any], source_line: Optional[int]) -> List[str]:
        required_fields = ["threshold", "small_sample_size", "mean_mask_ratio"]
        issues = []

        config_keys_lower = {k.lower(): k for k in config.keys()}

        for field in required_fields:
            aliases = GrayConfigParser.STANDARD_FIELDS.get(field, [field])
            found = False
            for alias in aliases:
                if alias.lower() in config_keys_lower:
                    found = True
                    break
            if not found:
                location = f"行{source_line}" if source_line else "未知位置"
                issues.append(f"缺少必需字段 '{field}'（别名: {aliases}），{location}")

        return issues

    def _check_value_types(self, config: Dict[str, Any], source_line: Optional[int]) -> List[str]:
        issues = []
        numeric_fields = ["threshold", "small_sample_size", "mean_mask_ratio"]

        for field in numeric_fields:
            aliases = GrayConfigParser.STANDARD_FIELDS.get(field, [field])
            for alias in aliases:
                if alias in config:
                    value = config[alias]
                    if not isinstance(value, (int, float)):
                        location = f"行{source_line}" if source_line else "未知位置"
                        issues.append(f"字段 '{alias}' 应为数值类型，实际是 {type(value).__name__}，{location}")
                    break

        return issues

    def _check_value_ranges(self, config: Dict[str, Any], source_line: Optional[int]) -> List[str]:
        issues = []

        threshold_aliases = GrayConfigParser.STANDARD_FIELDS.get("threshold", ["threshold"])
        for alias in threshold_aliases:
            if alias in config:
                value = config[alias]
                if isinstance(value, (int, float)) and (value < 0 or value > 1):
                    location = f"行{source_line}" if source_line else "未知位置"
                    issues.append(f"阈值 '{alias}'={value} 超出合理范围 [0,1]，{location}")
                break

        sample_size_aliases = GrayConfigParser.STANDARD_FIELDS.get("small_sample_size", ["small_sample_size"])
        for alias in sample_size_aliases:
            if alias in config:
                value = config[alias]
                if isinstance(value, (int, float)) and value < 0:
                    location = f"行{source_line}" if source_line else "未知位置"
                    issues.append(f"小样本量 '{alias}'={value} 不能为负数，{location}")
                break

        return issues

    def _run_custom_checks(self, config: Dict[str, Any], source_line: Optional[int]) -> List[str]:
        issues = []
        for check_func in self.custom_checks:
            result = check_func(config)
            if result:
                issue, field = result
                location = f"行{source_line}" if source_line else "未知位置"
                issues.append(f"{issue}（字段: {field}），{location}")
        return issues

    def _build_location(self, record: SnapshotRecord) -> str:
        parts = []
        if record.gray_config.source_line:
            parts.append(f"行{record.gray_config.source_line}")
        if record.gray_config.source_object_path:
            parts.append(f"对象路径 {record.gray_config.source_object_path}")
        return "，".join(parts) if parts else "未知位置"

    def _identify_problematic_fields(self, config: GrayConfig, issue: str) -> List[str]:
        problematic = []
        issue_lower = issue.lower()

        keywords = {
            "threshold": ["阈值", "threshold", "pass_threshold"],
            "small_sample_size": ["小样本量", "min_sample", "sample_size"],
            "mean_mask_ratio": ["均值覆盖比", "mask_ratio", "coverage"],
            "score": ["score", "分数"],
        }

        for field, keywords_list in keywords.items():
            for kw in keywords_list:
                if kw in issue_lower:
                    problematic.append(field)
                    break

        return problematic

    def _extract_snippet(self, raw_config: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
        snippet = {}
        for field in fields:
            for key, value in raw_config.items():
                if field.lower() in key.lower():
                    snippet[key] = value
                    break
        return snippet

    def _generate_fix_suggestion(self, issue: str, fields: List[str]) -> str:
        if "缺少" in issue:
            return f"请在配置中添加以下字段: {', '.join(fields)}"
        if "超出" in issue or "范围" in issue:
            return f"请检查以下字段的取值范围: {', '.join(fields)}"
        if "类型" in issue:
            return f"请将以下字段修正为正确的数值类型: {', '.join(fields)}"
        return f"请检查以下字段: {', '.join(fields)}"

    def _categorize_issue(self, issue: str) -> str:
        if "缺少" in issue:
            return "missing_field"
        if "类型" in issue:
            return "wrong_type"
        if "超出" in issue or "范围" in issue:
            return "out_of_range"
        if "重复" in issue:
            return "duplicate"
        return "other"


from .config_parser import GrayConfigParser
