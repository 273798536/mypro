from datetime import datetime
from typing import List, Dict, Any, Optional

from .models import (
    RecordSource,
    ReviewStatus,
    ReviewRecord,
    ReviewResult,
    Evidence,
)


class ReviewEngine:
    REQUIRED_FIELDS = ["record_id", "question_text"]

    def __init__(self):
        pass

    def review(self, raw_records: List[Dict[str, Any]]) -> ReviewResult:
        result = ReviewResult()
        result.generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        source_counts: Dict[str, int] = {}

        if not raw_records:
            result.empty_count = 1
            result.total_count = 0
            result.input_summary = {
                "received_count": 0,
                "source_distribution": {},
                "warning": "输入为空集合，未发现任何错题记录",
            }
            return result

        for raw in raw_records:
            source_counts.setdefault(raw.get("source", "unknown"), 0)
            source_counts[raw.get("source", "unknown")] += 1

        result.input_summary = {
            "received_count": len(raw_records),
            "source_distribution": source_counts,
        }

        for idx, raw in enumerate(raw_records):
            record = self._process_single_record(raw, idx)
            result.records.append(record)

            if record.status == ReviewStatus.PASSED:
                result.passed_count += 1
            elif record.status == ReviewStatus.WARNING:
                result.warning_count += 1
            elif record.status == ReviewStatus.ERROR:
                result.error_count += 1
            elif record.status == ReviewStatus.EMPTY:
                result.empty_count += 1

            if record.affected_conclusion:
                result.conclusion_affectors.append(record)

        result.total_count = len(result.records)
        return result

    def _process_single_record(self, raw: Dict[str, Any], idx: int) -> ReviewRecord:
        record_id = raw.get("record_id") or f"auto-{idx + 1:03d}"
        source_raw = raw.get("source", "official")
        try:
            source = RecordSource(source_raw)
        except ValueError:
            source = RecordSource.OFFICIAL

        question_text = raw.get("question_text", "")

        record = ReviewRecord(
            record_id=record_id,
            source=source,
            question_text=question_text,
            student_answer=raw.get("student_answer"),
            correct_answer=raw.get("correct_answer"),
            condition_number=raw.get("condition_number"),
            unit=raw.get("unit"),
            raw_data=raw,
        )

        record.evidence.append(
            Evidence(
                field_name="source",
                raw_value=source_raw,
                description=f"数据来源：{source.display_name}",
            )
        )

        is_effective = True

        if not question_text or not str(question_text).strip():
            record.issues.append("题干内容为空")
            record.evidence.append(
                Evidence(
                    field_name="question_text",
                    raw_value=question_text,
                    description="题干字段缺失或为空，无法进行有效复盘",
                )
            )
            is_effective = False

        for field in self.REQUIRED_FIELDS:
            if field not in raw and field != "question_text":
                record.issues.append(f"缺失必填字段：{field}")

        cond = raw.get("condition_number")
        if cond is not None:
            try:
                cond_val = float(cond)
                record.condition_number = cond_val
                record.evidence.append(
                    Evidence(
                        field_name="condition_number",
                        raw_value=cond,
                        description=f"矩阵条件数取值：{cond_val}，来源字段 condition_number",
                    )
                )
                if cond_val <= 0:
                    record.issues.append(f"矩阵条件数非正：{cond_val}")
            except (TypeError, ValueError):
                record.issues.append(f"矩阵条件数无法解析为数值：{cond}")
                record.evidence.append(
                    Evidence(
                        field_name="condition_number",
                        raw_value=cond,
                        description=f"条件数原始值无法转为浮点数，已标记异常",
                    )
                )

        unit = raw.get("unit")
        if unit is None or not str(unit).strip():
            record.issues.append("单位缺失")
            record.evidence.append(
                Evidence(
                    field_name="unit",
                    raw_value=unit,
                    description="未提供单位信息，该条记录不能视为正常通过",
                )
            )
            if is_effective:
                if record.status == ReviewStatus.PASSED:
                    record.status = ReviewStatus.WARNING
        else:
            record.evidence.append(
                Evidence(
                    field_name="unit",
                    raw_value=unit,
                    description=f"单位取值：{unit}",
                )
            )

        if not is_effective:
            record.status = ReviewStatus.EMPTY
        elif record.issues:
            if record.status != ReviewStatus.EMPTY:
                if any("非正" in i or "无法解析" in i for i in record.issues):
                    record.status = ReviewStatus.ERROR
                else:
                    record.status = ReviewStatus.WARNING

        if source in (
            RecordSource.STUDENT_OLD_VERSION,
            RecordSource.MANUAL_REVISION,
            RecordSource.VERBAL_NOTE,
        ):
            record.affected_conclusion = True
            record.evidence.append(
                Evidence(
                    field_name="affected_conclusion",
                    raw_value=True,
                    description=f"该条来自【{source.display_name}】，会影响最终复盘结论，需重点复核",
                )
            )

        return record
