import csv
import io
import json
from typing import List, Tuple
from sqlalchemy.orm import Session

from app.models import Question, QuestionBank, DataSplit, SplitType, AuditLog, ActionType
from app.schemas import QuestionItem, ImportResult, SplitUpdateItem


def import_questions_from_json(db: Session, bank_id: int, json_str: str, actor: str = "system") -> ImportResult:
    data = json.loads(json_str)
    items = [QuestionItem(**item) for item in data]
    return _import_items(db, bank_id, items, actor)


def import_questions_from_csv(db: Session, bank_id: int, csv_str: str, actor: str = "system") -> ImportResult:
    reader = csv.DictReader(io.StringIO(csv_str))
    items = []
    for row in reader:
        split_val = row.get("split_type", "test").strip().lower()
        split_type = SplitType.TEST
        if split_val in ("train", "val", "test"):
            split_type = SplitType(split_val)
        items.append(QuestionItem(
            question_id=row.get("question_id", "").strip(),
            content=row.get("content", "").strip(),
            answer=row.get("answer", "").strip(),
            category=row.get("category", "").strip(),
            difficulty=row.get("difficulty", "").strip(),
            split_type=split_type,
            human_note=row.get("human_note", "").strip(),
            metadata=json.loads(row["metadata"]) if row.get("metadata", "").strip() else {},
        ))
    return _import_items(db, bank_id, items, actor)


def _import_items(db: Session, bank_id: int, items: List[QuestionItem], actor: str) -> ImportResult:
    bank = db.query(QuestionBank).filter(QuestionBank.id == bank_id).first()
    if not bank:
        raise ValueError(f"题库 {bank_id} 不存在")

    existing_fps = set(
        row[0] for row in db.query(Question.dedup_fingerprint)
        .filter(Question.bank_id == bank_id, Question.dedup_fingerprint.isnot(None))
        .all()
    )

    duplicates_found = 0
    new_unique = 0
    imported_questions = []

    for item in items:
        fp = Question.compute_fingerprint(item.content, item.answer)
        is_dup = fp in existing_fps

        if is_dup:
            duplicates_found += 1
            existing_q = db.query(Question).filter(
                Question.bank_id == bank_id,
                Question.dedup_fingerprint == fp
            ).first()
            dup_of = existing_q.id if existing_q else None
        else:
            new_unique += 1
            existing_fps.add(fp)
            dup_of = None

        q = Question(
            bank_id=bank_id,
            question_id=item.question_id,
            content=item.content,
            answer=item.answer,
            category=item.category,
            difficulty=item.difficulty,
            split_type=item.split_type,
            human_note=item.human_note,
            dedup_fingerprint=fp,
            is_duplicate=is_dup,
            duplicate_of=dup_of,
            metadata_json=item.metadata,
        )
        db.add(q)
        imported_questions.append(q)

    db.commit()

    _rebuild_split_counts(db, bank_id)
    _log_import(db, bank_id, len(items), duplicates_found, new_unique, actor)

    return ImportResult(
        bank_id=bank_id,
        total_imported=len(items),
        duplicates_found=duplicates_found,
        new_unique=new_unique,
    )


def update_splits_and_dedup(db: Session, bank_id: int, updates: List[SplitUpdateItem], actor: str = "system") -> int:
    updated = 0
    for upd in updates:
        q = db.query(Question).filter(
            Question.bank_id == bank_id,
            Question.question_id == upd.question_id
        ).first()
        if q:
            old_split = q.split_type
            q.split_type = upd.split_type
            fp = Question.compute_fingerprint(q.content, q.answer)
            existing = db.query(Question).filter(
                Question.bank_id == bank_id,
                Question.dedup_fingerprint == fp,
                Question.id != q.id
            ).first()
            q.dedup_fingerprint = fp
            q.is_duplicate = existing is not None
            q.duplicate_of = existing.id if existing else None
            updated += 1

    if updated > 0:
        db.commit()
        _rebuild_split_counts(db, bank_id)
        _recalculate_all_duplicates(db, bank_id)

        log = AuditLog(
            bank_id=bank_id,
            action=ActionType.SPLIT_UPDATE,
            actor=actor,
            detail=f"更新了 {updated} 条题目的切分归属并重新去重",
            snapshot={"updated_count": updated},
        )
        db.add(log)
        db.commit()

    return updated


def _rebuild_split_counts(db: Session, bank_id: int):
    from sqlalchemy import func
    results = db.query(Question.split_type, func.count(Question.id)).filter(
        Question.bank_id == bank_id,
        Question.is_duplicate == False,
    ).group_by(Question.split_type).all()

    db.query(DataSplit).filter(DataSplit.bank_id == bank_id).delete()

    for split_type, count in results:
        ds = DataSplit(
            bank_id=bank_id,
            split_name=split_type.value,
            split_type=split_type,
            question_count=count,
        )
        db.add(ds)
    db.commit()


def _recalculate_all_duplicates(db: Session, bank_id: int):
    questions = db.query(Question).filter(Question.bank_id == bank_id).all()
    fp_map = {}
    for q in questions:
        fp = q.dedup_fingerprint
        if fp:
            if fp not in fp_map:
                fp_map[fp] = []
            fp_map[fp].append(q)

    for fp, qs in fp_map.items():
        if len(qs) > 1:
            primary = qs[0]
            primary.is_duplicate = False
            primary.duplicate_of = None
            for dup in qs[1:]:
                dup.is_duplicate = True
                dup.duplicate_of = primary.id
        else:
            qs[0].is_duplicate = False
            qs[0].duplicate_of = None

    db.commit()

    log = AuditLog(
        bank_id=bank_id,
        action=ActionType.DEDUP_UPDATE,
        actor="system",
        detail="切分清单补录后重新计算样本去重",
        snapshot={},
    )
    db.add(log)
    db.commit()


def _log_import(db: Session, bank_id: int, total: int, dupes: int, unique: int, actor: str):
    log = AuditLog(
        bank_id=bank_id,
        action=ActionType.IMPORT,
        actor=actor,
        detail=f"导入题目 {total} 条，重复 {dupes} 条，新增唯一 {unique} 条",
        snapshot={"total": total, "duplicates": dupes, "unique": unique},
    )
    db.add(log)
    db.commit()
