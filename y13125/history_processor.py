from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
import re

from models import HistoryRecord, AnswerVersion, RecordStatus, BayesianInput


class HistoryProcessor:
    EMPTY_SET_PATTERNS = [
        r"^\s*$",
        r"^\{\s*\}$",
        r"^\[\s*\]$",
        r"^空集.*$",
        r"^empty.*set.*$",
        r"^no.*data.*$",
        r"^无.*数据.*$",
        r"^无.*答案.*$",
        r"^未.*提供.*$",
        r"^null.*$",
        r"^none.*$",
    ]

    def __init__(self):
        self.empty_patterns = [re.compile(p, re.IGNORECASE) for p in self.EMPTY_SET_PATTERNS]

    def detect_empty_set(self, record: HistoryRecord) -> Tuple[bool, Optional[str]]:
        if not record.answer_versions:
            return True, "无任何答案版本"

        latest_answer = record.get_latest_answer()
        if not latest_answer or not latest_answer.answer_text:
            return True, "最新答案为空"

        text = latest_answer.answer_text.strip()
        for pattern in self.empty_patterns:
            if pattern.match(text):
                return True, f"匹配空集合模式: {text[:50]}"

        all_empty = all(
            not v.answer_text or not v.answer_text.strip()
            for v in record.answer_versions
        )
        if all_empty:
            return True, "所有历史版本均为空"

        if "is_empty" in record.metadata and record.metadata["is_empty"]:
            return True, record.metadata.get("empty_reason", "元数据标记为空集合")

        return False, None

    def assemble_mainline(self, record: HistoryRecord) -> Dict[str, Any]:
        sorted_versions = sorted(record.answer_versions, key=lambda x: x.timestamp)

        mainline_parts = []
        version_contributions = []
        historical_remarks = []
        screenshot_refs = []

        for idx, version in enumerate(sorted_versions, 1):
            if version.answer_text and version.answer_text.strip():
                mainline_parts.append(version.answer_text.strip())
                version_contributions.append({
                    "version_id": version.version_id,
                    "timestamp": version.timestamp,
                    "author": version.author,
                    "contribution": version.answer_text.strip(),
                    "order": idx,
                })

            if version.remark:
                historical_remarks.append({
                    "version_id": version.version_id,
                    "timestamp": version.timestamp,
                    "remark": version.remark,
                    "author": version.author,
                })

            if version.screenshot_ref:
                screenshot_refs.append({
                    "version_id": version.version_id,
                    "timestamp": version.timestamp,
                    "screenshot": version.screenshot_ref,
                })

        return {
            "mainline_text": " ".join(mainline_parts),
            "version_count": len(sorted_versions),
            "version_contributions": version_contributions,
            "historical_remarks": historical_remarks,
            "screenshot_refs": screenshot_refs,
            "all_versions_preserved": True,
            "latest_version_only": False,
        }

    def extract_bayesian_parameters(self, record: HistoryRecord) -> Optional[BayesianInput]:
        mainline = self.assemble_mainline(record)
        text = mainline["mainline_text"]

        params = {
            "prior": None,
            "likelihood": None,
            "evidence": None,
        }

        patterns = {
            "prior": [
                r"先验[^\d]*([\d.]+)",
                r"prior[^\d]*([\d.]+)",
                r"初始概率[^\d]*([\d.]+)",
                r"P\(A\)[^\d]*([\d.]+)",
            ],
            "likelihood": [
                r"似然[^\d]*([\d.]+)",
                r"likelihood[^\d]*([\d.]+)",
                r"条件概率[^\d]*([\d.]+)",
                r"P\(B\|A\)[^\d]*([\d.]+)",
            ],
            "evidence": [
                r"边际似然[^\d]*([\d.]+)",
                r"evidence[^\d]*([\d.]+)",
                r"全概率[^\d]*([\d.]+)",
                r"P\(B\)[^\d]*([\d.]+)",
            ],
        }

        for param_name, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        value = float(match.group(1))
                        params[param_name] = value
                        break
                    except (ValueError, IndexError):
                        continue

        for version in record.answer_versions:
            if version.remark:
                for param_name, pattern_list in patterns.items():
                    if params[param_name] is None:
                        for pattern in pattern_list:
                            match = re.search(pattern, version.remark, re.IGNORECASE)
                            if match:
                                try:
                                    value = float(match.group(1))
                                    params[param_name] = value
                                    break
                                except (ValueError, IndexError):
                                    continue

        source_versions = [v.version_id for v in record.answer_versions]

        if params["prior"] is not None and params["likelihood"] is not None and params["evidence"] is not None:
            return BayesianInput(
                prior_probability=params["prior"],
                likelihood=params["likelihood"],
                marginal_likelihood=params["evidence"],
                record_id=record.record_id,
                question_id=record.question_id,
                historical_context=mainline,
                source_versions=source_versions,
            )

        return None

    def trace_extrapolation_origin(
        self, record: HistoryRecord, param_type: str, value: float
    ) -> Optional[Dict[str, Any]]:
        sorted_versions = sorted(record.answer_versions, key=lambda x: x.timestamp, reverse=True)

        keywords = {
            "prior": ["先验", "prior", "初始概率", "P(A)"],
            "likelihood": ["似然", "likelihood", "条件概率", "P(B|A)"],
            "evidence": ["边际似然", "evidence", "全概率", "P(B)"],
            "posterior": ["后验", "posterior", "结论", "P(A|B)"],
        }

        search_keywords = keywords.get(param_type, [])

        for version in sorted_versions:
            text_to_search = version.answer_text + " " + (version.remark or "")
            for kw in search_keywords:
                if kw in text_to_search:
                    pattern = rf"{kw}[^\d]*([\d.]+)"
                    match = re.search(pattern, text_to_search, re.IGNORECASE)
                    if match:
                        try:
                            extracted_value = float(match.group(1))
                            if abs(extracted_value - value) < 0.001:
                                return {
                                    "original_text": version.answer_text,
                                    "version_id": version.version_id,
                                    "timestamp": version.timestamp,
                                    "author": version.author,
                                    "remark": version.remark,
                                    "screenshot_ref": version.screenshot_ref,
                                    "extracted_value": extracted_value,
                                    "keyword_matched": kw,
                                }
                        except (ValueError, IndexError):
                            continue

        return None

    def get_version_timeline(self, record: HistoryRecord) -> List[Dict[str, Any]]:
        timeline = []
        sorted_versions = sorted(record.answer_versions, key=lambda x: x.timestamp)

        for idx, version in enumerate(sorted_versions, 1):
            timeline.append({
                "order": idx,
                "version_id": version.version_id,
                "timestamp": version.timestamp,
                "author": version.author,
                "answer_excerpt": version.answer_text[:100] if version.answer_text else "",
                "has_remark": bool(version.remark),
                "has_screenshot": bool(version.screenshot_ref),
                "is_latest": version.is_latest,
                "source_note": version.source_note,
            })

        return timeline

    def check_pending_material(self, record: HistoryRecord) -> List[str]:
        missing_items = []

        if not record.answer_versions:
            missing_items.append("缺少所有答案版本")
            return missing_items

        mainline = self.assemble_mainline(record)
        if not mainline["mainline_text"]:
            missing_items.append("无法拼接出主线答案")

        params = self.extract_bayesian_parameters(record)
        if params is None:
            missing_items.append("无法提取完整的贝叶斯参数")
            if not any("先验" in v.answer_text for v in record.answer_versions):
                missing_items.append("缺少先验概率数据")
            if not any("似然" in v.answer_text for v in record.answer_versions):
                missing_items.append("缺少似然数据")
            if not any("边际似然" in v.answer_text for v in record.answer_versions):
                missing_items.append("缺少边际似然数据")

        if "requires_manual_review" in record.tags:
            missing_items.append("标记为需要人工审核")

        return missing_items
