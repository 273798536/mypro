import hashlib
import os
from typing import List, Tuple, Optional
from schemas import ScoreCreate, PartCreate, ValidationError
from sqlalchemy.orm import Session
import models

VALID_KEYS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]
VALID_INSTRUMENTS = ["二胡", "高胡", "中胡", "板胡", "京胡", "琵琶", "阮", "柳琴", "月琴", "三弦", "古筝", "扬琴", "笛子", "笙", "箫", "唢呐", "管子", "打击乐", "大提琴", "低音提琴"]


def validate_score_data(score_data: ScoreCreate, db: Session) -> Tuple[List[ValidationError], List[ValidationError]]:
    errors = []
    warnings = []

    if not score_data.key or score_data.key.strip() == "":
        errors.append(ValidationError(
            error_type="key_missing",
            field="key",
            message=f"曲谱「{score_data.title}」调式缺失",
            suggestion="请填写调式，如：C调、G调、D调、F调等"
        ))
    else:
        key_clean = score_data.key.replace("调", "").strip()
        if key_clean not in VALID_KEYS:
            warnings.append(ValidationError(
                error_type="key_unknown",
                field="key",
                message=f"曲谱「{score_data.title}」调式「{score_data.key}」不在标准调式列表",
                suggestion=f"标准调式包括：{', '.join(VALID_KEYS)}"
            ))

    if score_data.total_pages < 1:
        errors.append(ValidationError(
            error_type="invalid_pages",
            field="total_pages",
            message=f"曲谱「{score_data.title}」总页数不能小于1",
            suggestion="请填写正确的扫描页数"
        ))

    for i, part in enumerate(score_data.parts):
        part_errors, part_warnings = validate_part(part, score_data, i)
        errors.extend(part_errors)
        warnings.extend(part_warnings)

    page_overlaps = check_page_overlap(score_data.parts, score_data.title)
    errors.extend(page_overlaps)

    return errors, warnings


def validate_part(part: PartCreate, score_data: ScoreCreate, part_index: int) -> Tuple[List[ValidationError], List[ValidationError]]:
    errors = []
    warnings = []

    if not part.instrument or part.instrument.strip() == "":
        errors.append(ValidationError(
            error_type="instrument_missing",
            field=f"parts[{part_index}].instrument",
            message=f"声部 {part_index + 1}：乐器名称不能为空",
            suggestion="请填写乐器名称，如：二胡、琵琶、笛子等"
        ))
    elif part.instrument not in VALID_INSTRUMENTS:
        warnings.append(ValidationError(
            error_type="instrument_unknown",
            field=f"parts[{part_index}].instrument",
            message=f"声部「{part.instrument}」不在常见民乐器列表",
            suggestion=f"常见民乐器包括：{', '.join(VALID_INSTRUMENTS[:10])}..."
        ))

    if part.page_start > part.page_end:
        errors.append(ValidationError(
            error_type="page_range_invalid",
            field=f"parts[{part_index}].page_start/end",
            message=f"声部「{part.instrument}」页码范围错误：起始页{part.page_start}大于结束页{part.page_end}",
            suggestion="请核对扫描件页码，确保起始页小于等于结束页"
        ))

    if part.page_end > score_data.total_pages:
        errors.append(ValidationError(
            error_type="page_exceeds_total",
            field=f"parts[{part_index}].page_end",
            message=f"声部「{part.instrument}」结束页{part.page_end}超出曲谱总页数{score_data.total_pages}",
            suggestion="请检查总页数或该声部的扫描范围"
        ))

    return errors, warnings


def check_page_overlap(parts: List[PartCreate], score_title: str) -> List[ValidationError]:
    errors = []
    page_usage = {}

    for part in parts:
        for page in range(part.page_start, part.page_end + 1):
            if page in page_usage:
                errors.append(ValidationError(
                    error_type="page_overlap",
                    field=f"parts.page_range",
                    message=f"曲谱「{score_title}」第{page}页重复：声部「{page_usage[page]}」与声部「{part.instrument}」扫描重页",
                    suggestion=f"请核对第{page}页扫描件，确认该页属于哪个声部"
                ))
            else:
                page_usage[page] = part.instrument

    return errors


def calculate_file_hash(file_content: bytes) -> str:
    return hashlib.sha256(file_content).hexdigest()


def check_duplicate_file(file_hash: str, db: Session, current_score_id: Optional[int] = None) -> Optional[ValidationError]:
    query = db.query(models.Score).filter(models.Score.file_hash == file_hash)
    if current_score_id:
        query = query.filter(models.Score.id != current_score_id)
    existing = query.first()

    if existing:
        return ValidationError(
            error_type="duplicate_file",
            field="file",
            message=f"文件重复：曲谱「{existing.title}」(ID:{existing.id}) 已上传过相同文件",
            suggestion=f"请确认是否重复上传，或访问 /scores/{existing.id} 查看已有曲谱"
        )
    return None
