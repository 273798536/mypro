import os
import json
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
import pandas as pd
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Question, ParameterVersion, SupplementRecord,
    ImportRecord, ImportItem, ChangeLog
)
from schemas import ImportSummary
from utils import (
    compute_file_hash, compute_dict_hash,
    check_sort_stability, read_data_file, generate_batch_no
)
from config import UPLOAD_DIR


QUESTION_KEY_COLUMNS = ["question_no", "title"]
PARAMETER_KEY_COLUMNS = ["question_no", "param_name", "version_no"]
SUPPLEMENT_KEY_COLUMNS = ["question_no", "supplement_type", "batch_no"]


def _find_existing_question(db: Session, data: Dict[str, Any]) -> Optional[Question]:
    q = db.query(Question)
    if data.get("question_no"):
        q = q.filter(Question.question_no == data["question_no"])
    else:
        return None
    return q.first()


def _find_existing_parameter(
    db: Session, question_id: int, data: Dict[str, Any]
) -> Optional[ParameterVersion]:
    q = db.query(ParameterVersion).filter(ParameterVersion.question_id == question_id)
    if data.get("param_name"):
        q = q.filter(ParameterVersion.param_name == data["param_name"])
    else:
        return None
    if data.get("version_no"):
        q = q.filter(ParameterVersion.version_no == data["version_no"])
    return q.first()


def _log_change(
    db: Session, target_type: str, target_id: int, action: str,
    field_name: Optional[str] = None, old_value: Optional[str] = None,
    new_value: Optional[str] = None, changed_by: Optional[str] = None,
    batch_no: Optional[str] = None, remark: Optional[str] = None,
    parameter_id: Optional[int] = None,
) -> ChangeLog:
    log = ChangeLog(
        target_type=target_type,
        target_id=target_id,
        action=action,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
        batch_no=batch_no,
        remark=remark,
        parameter_id=parameter_id,
    )
    db.add(log)
    db.flush()
    return log


def _create_question(db: Session, data: Dict[str, Any], operator: str, batch_no: str) -> Tuple[Question, str]:
    existing = _find_existing_question(db, data)
    if existing:
        updated = False
        for field in ["title", "formula", "description", "difficulty", "category"]:
            new_val = data.get(field)
            if new_val is not None and new_val != "":
                old_val = getattr(existing, field)
                if str(old_val) != str(new_val):
                    _log_change(
                        db, "question", existing.id, "update",
                        field_name=field, old_value=str(old_val),
                        new_value=str(new_val), changed_by=operator,
                        batch_no=batch_no, remark=f"题目[{data.get('question_no')}]字段更新"
                    )
                    setattr(existing, field, new_val)
                    updated = True
        existing.updated_at = datetime.now()
        db.flush()
        status = "updated" if updated else "skipped"
        return existing, status

    question = Question(
        question_no=data.get("question_no", ""),
        title=data.get("title", ""),
        formula=data.get("formula"),
        description=data.get("description"),
        difficulty=data.get("difficulty"),
        category=data.get("category"),
    )
    db.add(question)
    db.flush()
    _log_change(
        db, "question", question.id, "create",
        changed_by=operator, batch_no=batch_no,
        remark=f"新增题目[{question.question_no}]"
    )
    return question, "new"


def _create_parameter(db: Session, data: Dict[str, Any], operator: str, batch_no: str) -> Tuple[ParameterVersion, str]:
    question_no = data.get("question_no")
    if not question_no:
        raise ValueError("参数记录缺少 question_no 字段")

    question = _find_existing_question(db, {"question_no": question_no})
    if not question:
        question, _ = _create_question(
            db, {"question_no": question_no, "title": f"题目{question_no}"},
            operator, batch_no
        )

    existing = _find_existing_parameter(db, question.id, data)
    if existing:
        updated = False
        for field in ["param_value", "unit", "boundary_condition", "description", "remark"]:
            new_val = data.get(field)
            if new_val is not None and new_val != "":
                old_val = getattr(existing, field)
                if str(old_val) != str(new_val):
                    _log_change(
                        db, "parameter", existing.id, "update",
                        field_name=field, old_value=str(old_val),
                        new_value=str(new_val), changed_by=operator,
                        batch_no=batch_no, parameter_id=existing.id,
                        remark=f"参数[{data.get('param_name')}]字段更新"
                    )
                    setattr(existing, field, new_val)
                    updated = True
        db.flush()
        status = "updated" if updated else "skipped"
        return existing, status

    param = ParameterVersion(
        question_id=question.id,
        version_no=data.get("version_no", "v1.0"),
        param_name=data.get("param_name", ""),
        param_value=data.get("param_value"),
        unit=data.get("unit"),
        boundary_condition=data.get("boundary_condition"),
        description=data.get("description"),
        data_type=data.get("data_type", "string"),
        created_by=operator,
        remark=data.get("remark"),
    )
    db.add(param)
    db.flush()
    _log_change(
        db, "parameter", param.id, "create",
        changed_by=operator, batch_no=batch_no, parameter_id=param.id,
        remark=f"新增参数[{param.param_name}]，版本[{param.version_no}]"
    )
    return param, "new"


def _create_supplement(db: Session, data: Dict[str, Any], operator: str, batch_no: str) -> Tuple[SupplementRecord, str]:
    question_no = data.get("question_no")
    if not question_no:
        raise ValueError("补录记录缺少 question_no 字段")

    question = _find_existing_question(db, {"question_no": question_no})
    if not question:
        question, _ = _create_question(
            db, {"question_no": question_no, "title": f"题目{question_no}"},
            operator, batch_no
        )

    sup_type = data.get("supplement_type", "general")
    sup_batch = data.get("batch_no") or batch_no
    existing = db.query(SupplementRecord).filter(
        SupplementRecord.question_id == question.id,
        SupplementRecord.supplement_type == sup_type,
        SupplementRecord.batch_no == sup_batch,
    ).first()

    if existing:
        if data.get("content") and data.get("content") != existing.content:
            _log_change(
                db, "supplement", existing.id, "update",
                field_name="content", old_value=existing.content,
                new_value=data.get("content"), changed_by=operator,
                batch_no=batch_no, remark="补录内容更新"
            )
            existing.content = data.get("content")
            existing.source = data.get("source") or existing.source
            existing.remark = data.get("remark") or existing.remark
            db.flush()
            return existing, "updated"
        return existing, "skipped"

    sup = SupplementRecord(
        question_id=question.id,
        batch_no=sup_batch,
        supplement_type=sup_type,
        content=data.get("content"),
        source=data.get("source"),
        recorded_by=operator,
        remark=data.get("remark"),
    )
    db.add(sup)
    db.flush()
    _log_change(
        db, "supplement", sup.id, "create",
        changed_by=operator, batch_no=batch_no,
        remark=f"新增补录[{sup_type}]"
    )
    return sup, "new"


def import_file(
    db: Session, file_path: str, original_filename: str,
    import_type: str = "question", operator: str = "system"
) -> Tuple[ImportRecord, ImportSummary]:
    file_hash = compute_file_hash(file_path)
    file_size = os.path.getsize(file_path)

    existing_import = db.query(ImportRecord).filter(
        ImportRecord.file_hash == file_hash
    ).first()

    is_duplicate = existing_import is not None
    duplicate_reason = None
    if is_duplicate:
        duplicate_reason = (
            f"该文件已于 {existing_import.imported_at.strftime('%Y-%m-%d %H:%M:%S')} "
            f"由 {existing_import.imported_by or '系统'} 导入（批次号：{existing_import.batch_no}），"
            f"为避免重复计数，本次跳过数据入库。"
        )

    batch_no = existing_import.batch_no if is_duplicate else generate_batch_no()

    if is_duplicate:
        record = ImportRecord(
            batch_no=batch_no,
            file_name=original_filename,
            file_hash=file_hash,
            file_size=file_size,
            import_type=import_type,
            total_count=existing_import.total_count,
            new_count=0,
            skipped_count=existing_import.total_count,
            updated_count=0,
            error_count=0,
            sort_stable=True,
            status="skipped_duplicate",
            error_message=duplicate_reason,
            imported_by=operator,
            detail={"is_duplicate": True, "original_import_id": existing_import.id},
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        summary = ImportSummary(
            batch_no=batch_no,
            total=existing_import.total_count,
            new=0,
            skipped=existing_import.total_count,
            updated=0,
            errors=0,
            is_duplicate_batch=True,
            duplicate_reason=duplicate_reason,
            skipped_items=[{"reason": "重复批次，已跳过", "row_no": i + 1} for i in range(min(existing_import.total_count, 20))],
        )
        return record, summary

    df = read_data_file(file_path)

    key_columns = {
        "question": QUESTION_KEY_COLUMNS,
        "parameter": PARAMETER_KEY_COLUMNS,
        "supplement": SUPPLEMENT_KEY_COLUMNS,
    }.get(import_type, ["question_no"])

    sort_stable, sort_msg = check_sort_stability(df, [c for c in key_columns if c in df.columns])

    if not sort_stable:
        record = ImportRecord(
            batch_no=batch_no,
            file_name=original_filename,
            file_hash=file_hash,
            file_size=file_size,
            import_type=import_type,
            total_count=len(df),
            new_count=0,
            skipped_count=0,
            updated_count=0,
            error_count=len(df),
            sort_stable=False,
            status="aborted_sort_unstable",
            error_message=sort_msg,
            missing_materials=(
                "请核对并补齐以下材料后重试："
                "1) 该批次数据对应的原始纸质或电子底单；"
                "2) 数据录入顺序说明文档；"
                "3) 如需调整排序，请在文件中标注行号并附说明。"
            ),
            imported_by=operator,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        summary = ImportSummary(
            batch_no=batch_no,
            total=len(df),
            new=0,
            skipped=0,
            updated=0,
            errors=len(df),
            is_duplicate_batch=False,
        )
        return record, summary

    total = len(df)
    new_count = 0
    skipped_count = 0
    updated_count = 0
    error_count = 0
    new_items: List[Dict[str, Any]] = []
    skipped_items: List[Dict[str, Any]] = []
    import_items: List[ImportItem] = []

    handler = {
        "question": _create_question,
        "parameter": _create_parameter,
        "supplement": _create_supplement,
    }.get(import_type, _create_question)

    for idx, row in df.iterrows():
        row_no = idx + 1
        try:
            data = {k: (str(v) if pd.notna(v) else None) for k, v in row.to_dict().items()}
            obj, status = handler(db, data, operator, batch_no)

            item_detail = {
                "question_no": data.get("question_no"),
                "param_name": data.get("param_name"),
                "row_content": {k: v for k, v in data.items() if v},
            }
            import_items.append(ImportItem(
                row_no=row_no,
                item_key=data.get("question_no") or data.get("param_name") or f"row_{row_no}",
                status=status,
                detail=item_detail,
                remark=f"第{row_no}行导入状态：{status}",
            ))

            if status == "new":
                new_count += 1
                new_items.append(item_detail)
            elif status == "updated":
                updated_count += 1
            elif status == "skipped":
                skipped_count += 1
                skipped_items.append({**item_detail, "reason": "数据未发生变化，已跳过"})
        except Exception as e:
            error_count += 1
            import_items.append(ImportItem(
                row_no=row_no,
                item_key=f"row_{row_no}",
                status="error",
                detail={"error": str(e)},
                remark=f"第{row_no}行导入失败：{str(e)}",
            ))

    db.flush()

    detail = {
        "sort_stable": sort_stable,
        "sort_msg": sort_msg,
    }

    record = ImportRecord(
        batch_no=batch_no,
        file_name=original_filename,
        file_hash=file_hash,
        file_size=file_size,
        import_type=import_type,
        total_count=total,
        new_count=new_count,
        skipped_count=skipped_count,
        updated_count=updated_count,
        error_count=error_count,
        sort_stable=sort_stable,
        status="completed" if error_count < total else "completed_with_errors",
        imported_by=operator,
        detail=detail,
        items=import_items,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    summary = ImportSummary(
        batch_no=batch_no,
        total=total,
        new=new_count,
        skipped=skipped_count,
        updated=updated_count,
        errors=error_count,
        is_duplicate_batch=False,
        new_items=new_items[:50],
        skipped_items=skipped_items[:50],
    )

    return record, summary
