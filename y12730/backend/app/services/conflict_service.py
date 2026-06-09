import json
from sqlalchemy.orm import Session
from app.models import QuestionItem, ParamRecord, ConflictRecord, BatchStatus
from app.services.batch_service import update_batch_status
from datetime import datetime
from typing import List, Optional, Dict


def _try_parse_float(s: Optional[str]) -> Optional[float]:
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _params_to_dict(params: List[ParamRecord]) -> Dict[str, str]:
    d = {}
    for p in params:
        d[p.param_key] = p.param_value
    return d


def detect_conflicts(db: Session, batch_id: int) -> tuple[List[ConflictRecord], dict]:
    update_batch_status(db, batch_id, BatchStatus.CONFLICT_CHECKING)

    questions = db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id).all()
    params_list = db.query(ParamRecord).filter(ParamRecord.batch_id == batch_id).all()

    q_by_code: Dict[str, QuestionItem] = {}
    for q in questions:
        q_by_code[q.question_code] = q

    p_by_code: Dict[str, List[ParamRecord]] = {}
    for p in params_list:
        if p.question_code not in p_by_code:
            p_by_code[p.question_code] = []
        p_by_code[p.question_code].append(p)

    all_codes = set(q_by_code.keys()) | set(p_by_code.keys())

    db.query(ConflictRecord).filter(ConflictRecord.batch_id == batch_id).delete()
    db.commit()

    conflicts: List[ConflictRecord] = []
    stats = {
        "total_codes": len(all_codes),
        "missing_in_params": 0,
        "missing_in_questions": 0,
        "value_mismatch": 0,
        "param_count_mismatch": 0
    }

    for code in all_codes:
        q = q_by_code.get(code)
        p_list = p_by_code.get(code, [])
        p_dict = _params_to_dict(p_list)
        p_record_ids = [p.id for p in p_list]
        p_id = p_record_ids[0] if p_record_ids else None

        if q and not p_list:
            stats["missing_in_params"] += 1
            c = ConflictRecord(
                batch_id=batch_id,
                question_id=q.id,
                param_record_id=None,
                question_code=code,
                conflict_type="参数表缺失",
                conflict_field="整体",
                question_value=f"存在题目:{q.question_title or '无标题'}",
                param_value="无",
                description=f"题目清单第{q.original_row_no}行存在题目「{code}」，但参数表中未找到对应参数记录",
                resolution_suggestion="请检查参数表是否漏录；若为新增题目，请补录该题的 KKT 参数（补材料）"
            )
            db.add(c)
            conflicts.append(c)
            continue

        if p_list and not q:
            stats["missing_in_questions"] += 1
            p0 = p_list[0]
            c = ConflictRecord(
                batch_id=batch_id,
                question_id=None,
                param_record_id=p_id,
                question_code=code,
                conflict_type="题目缺失",
                conflict_field="整体",
                question_value="无",
                param_value=f"参数表有{p0.original_row_no}行共{len(p_list)}条参数记录",
                description=f"参数表第{p0.original_row_no}行存在题目「{code}」共{len(p_list)}条参数，但题目清单中未找到该题",
                resolution_suggestion="请核对题目清单是否漏录；若为冗余参数，可删除参数表对应记录（改口径）"
            )
            db.add(c)
            conflicts.append(c)
            continue

        if q and p_list:
            p0 = p_list[0]
            try:
                q_params = {}
                if q.kkt_params_json:
                    try:
                        q_params = json.loads(q.kkt_params_json)
                    except (json.JSONDecodeError, TypeError):
                        pass
            except Exception:
                q_params = {}

            all_keys = set(q_params.keys()) | set(p_dict.keys())

            for key in all_keys:
                q_val = str(q_params.get(key, "")).strip() if key in q_params else None
                p_val = str(p_dict.get(key, "")).strip() if key in p_dict else None

                if q_val is None and p_val is not None:
                    stats["param_count_mismatch"] += 1
                    c = ConflictRecord(
                        batch_id=batch_id,
                        question_id=q.id,
                        param_record_id=p_id,
                        question_code=code,
                        conflict_type="参数多余",
                        conflict_field=key,
                        question_value="题目清单无此字段",
                        param_value=p_val,
                        description=f"题目「{code}」参数「{key}」仅存在于参数表（第{p0.original_row_no if p_list else 0}行），题目清单第{q.original_row_no}行无对应字段",
                        resolution_suggestion="请核对该参数是否应纳入题目参数（改口径）；若确实需要，请在题目清单补录（补材料）"
                    )
                    db.add(c)
                    conflicts.append(c)
                    continue

                if p_val is None and q_val is not None:
                    stats["param_count_mismatch"] += 1
                    c = ConflictRecord(
                        batch_id=batch_id,
                        question_id=q.id,
                        param_record_id=p_id,
                        question_code=code,
                        conflict_type="参数缺失",
                        conflict_field=key,
                        question_value=q_val,
                        param_value="参数表无此字段",
                        description=f"题目「{code}」参数「{key}」仅存在于题目清单第{q.original_row_no}行，参数表中缺失",
                        resolution_suggestion="请在参数表补录该参数（补材料）；若为冗余字段，可删除题目清单中该字段（改口径）"
                    )
                    db.add(c)
                    conflicts.append(c)
                    continue

                if q_val is not None and p_val is not None:
                    qf = _try_parse_float(q_val)
                    pf = _try_parse_float(p_val)
                    match = False
                    if qf is not None and pf is not None:
                        if abs(qf - pf) < 1e-9:
                            match = True
                    else:
                        if q_val == p_val:
                            match = True

                    if not match:
                        stats["value_mismatch"] += 1
                        diff_desc = f"数值差异" if (qf is not None and pf is not None) else "文本差异"
                        c = ConflictRecord(
                            batch_id=batch_id,
                            question_id=q.id,
                            param_record_id=p_id,
                            question_code=code,
                            conflict_type=diff_desc,
                            conflict_field=key,
                            question_value=q_val,
                            param_value=p_val,
                            description=f"题目「{code}」参数「{key}」不一致：题目清单第{q.original_row_no}行为「{q_val}」，参数表第{p_list[0].original_row_no}行为「{p_val}」",
                            resolution_suggestion="请核对原始来源材料确认正确值，修正不一致项（改口径）；若为允差范围，标注可用即可"
                        )
                        db.add(c)
                        conflicts.append(c)

    db.commit()

    unresolved = len(conflicts)
    if unresolved > 0:
        update_batch_status(db, batch_id, BatchStatus.PENDING_REVIEW)
    else:
        update_batch_status(db, batch_id, BatchStatus.PENDING_REVIEW)

    stats["total_conflicts"] = unresolved
    return conflicts, stats


def list_conflicts(db: Session, batch_id: int, only_unresolved: bool = False,
                    skip: int = 0, limit: int = 200) -> List[ConflictRecord]:
    query = db.query(ConflictRecord).filter(ConflictRecord.batch_id == batch_id)
    if only_unresolved:
        query = query.filter(ConflictRecord.is_resolved == False)
    return query.order_by(ConflictRecord.created_at.desc()).offset(skip).limit(limit).all()


def resolve_conflict(db: Session, conflict_id: int, is_resolved: bool,
                    resolution_suggestion: Optional[str] = None) -> Optional[ConflictRecord]:
    c = db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()
    if not c:
        return None
    c.is_resolved = is_resolved
    if is_resolved:
        c.resolved_at = datetime.utcnow()
    if resolution_suggestion:
        c.resolution_suggestion = resolution_suggestion
    db.commit()
    db.refresh(c)
    return c
