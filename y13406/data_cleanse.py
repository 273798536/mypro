import re
import uuid
from typing import List, Dict, Any, Optional
import pandas as pd
from config import Config
from models import (
    ErrorQuestionSample,
    SampleStatus,
    CleanseResult,
)


def _generate_sample_id() -> str:
    return f"S{uuid.uuid4().hex[:12].upper()}"


def _detect_and_strip_unit(
    raw_value: Any,
    field_name: str,
) -> tuple[Optional[float], Optional[str]]:
    if raw_value is None or (isinstance(raw_value, float) and pd.isna(raw_value)):
        return None, None

    if isinstance(raw_value, (int, float)):
        return float(raw_value), None

    text = str(raw_value).strip()
    if not text:
        return None, None

    allowed_units = []
    if field_name == "error_score":
        allowed_units = Config.REQUIRED_UNITS.get("score", [])
    elif field_name == "error_question_count":
        allowed_units = Config.REQUIRED_UNITS.get("count", [])

    unit_found = None
    number_str = text

    for unit in sorted(allowed_units, key=len, reverse=True):
        if text.endswith(unit):
            unit_found = unit
            number_str = text[: -len(unit)].strip()
            break

    if unit_found is None:
        m = re.match(r"^([\d\.]+)\s*(.*)$", text)
        if m:
            number_str = m.group(1)
            trailing = m.group(2).strip()
            if trailing:
                unit_found = trailing

    try:
        number = float(number_str)
        return number, unit_found
    except ValueError:
        return None, None


def _rename_old_terms(row: Dict[str, Any]) -> tuple[Dict[str, Any], List[Dict[str, str]]]:
    renamed = []
    new_row = dict(row)
    for old_term, new_term in Config.TERM_MAPPING.items():
        if old_term in new_row:
            new_row[new_term] = new_row.pop(old_term)
            renamed.append({"from": old_term, "to": new_term})
    return new_row, renamed


def cleanse_samples(raw_records: List[Dict[str, Any]]) -> CleanseResult:
    result = CleanseResult()
    result.total_input = len(raw_records)

    for idx, raw in enumerate(raw_records):
        sample_id = _generate_sample_id()
        original_fields = dict(raw)

        row, renamed = _rename_old_terms(raw)
        if renamed:
            result.old_term_renamed.append({"row": idx, "renames": renamed})

        sample = ErrorQuestionSample(
            sample_id=sample_id,
            raw_row_no=idx + 2,
            original_fields=original_fields,
        )

        sample.student_id = row.get("student_id") or row.get("学生ID")
        sample.student_name = row.get("student_name") or row.get("学生姓名")
        sample.class_id = row.get("class_id") or row.get("班级") or row.get("class")
        sample.remark = row.get("remark") or row.get("备注") or row.get("说明")
        sample.remark_supplement = row.get("remark_supplement") or row.get("后补说明") or row.get("后补")
        sample.screenshot_ref = row.get("screenshot") or row.get("截图") or row.get("screenshot_ref")

        if sample.remark_supplement and not sample.remark:
            sample.remark = sample.remark_supplement
            sample.add_issue("supplement_merged", "后补说明合并入备注字段", "remark")
            result.supplement_merged += 1
        elif sample.remark_supplement and sample.remark:
            sample.remark = f"{sample.remark} | {sample.remark_supplement}"
            sample.add_issue("supplement_merged", "后补说明追加到备注字段", "remark")
            result.supplement_merged += 1

        raw_count = row.get("error_question_count") or row.get("错题数") or row.get("错题数量")
        raw_score = row.get("error_score") or row.get("失分") or row.get("错题失分")

        count_val, count_unit = _detect_and_strip_unit(raw_count, "error_question_count")
        score_val, score_unit = _detect_and_strip_unit(raw_score, "error_score")

        sample.error_question_count = count_val
        sample.error_question_count_unit = count_unit
        sample.error_score = score_val
        sample.error_score_unit = score_unit

        has_missing = False

        if count_val is None:
            sample.add_issue("missing_value", "错题数量缺失或无法解析", "error_question_count")
            result.missing_value_count += 1
            sample.status = SampleStatus.MISSING_VALUE
            has_missing = True

        if score_val is None:
            sample.add_issue("missing_value", "错题失分缺失或无法解析", "error_score")
            result.missing_value_count += 1
            sample.status = SampleStatus.MISSING_VALUE
            has_missing = True

        if not has_missing:
            if count_unit is None:
                sample.add_issue(
                    "unit_missing",
                    f"错题数量无单位，允许单位: {Config.REQUIRED_UNITS['count']}",
                    "error_question_count_unit",
                )
                sample.status = SampleStatus.UNIT_MISSING
                result.unit_missing_count += 1
                result.excluded_unit_missing_ids.append(sample_id)

            if score_unit is None:
                sample.add_issue(
                    "unit_missing",
                    f"错题失分无单位，允许单位: {Config.REQUIRED_UNITS['score']}",
                    "error_score_unit",
                )
                sample.status = SampleStatus.UNIT_MISSING
                result.unit_missing_count += 1
                if sample_id not in result.excluded_unit_missing_ids:
                    result.excluded_unit_missing_ids.append(sample_id)

            if sample.status == SampleStatus.VALID:
                bt = Config.BOUNDARY_THRESHOLD
                outlier_reasons = []
                if count_val < bt["min_count"] or count_val > bt["max_count"]:
                    outlier_reasons.append(f"错题数量 {count_val} 超出边界 [{bt['min_count']}, {bt['max_count']}]")
                if score_val < bt["min_score"] or score_val > bt["max_score"]:
                    outlier_reasons.append(f"错题失分 {score_val} 超出边界 [{bt['min_score']}, {bt['max_score']}]")

                if outlier_reasons:
                    sample.status = SampleStatus.BOUNDARY_OUTLIER
                    for reason in outlier_reasons:
                        sample.add_issue("boundary_outlier", reason)
                    result.boundary_outlier_count += 1

        result.cleanse_log.append({
            "sample_id": sample_id,
            "raw_row": sample.raw_row_no,
            "final_status": sample.status.value,
            "issues": sample.issues,
        })

        result.samples.append(sample)

    result.valid_count = sum(1 for s in result.samples if s.status == SampleStatus.VALID)
    result.excluded_count = sum(
        1 for s in result.samples
        if s.status in (SampleStatus.MISSING_VALUE, SampleStatus.UNIT_MISSING, SampleStatus.EXCLUDED)
    )

    return result


def load_from_dataframe(df: pd.DataFrame) -> List[Dict[str, Any]]:
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")
