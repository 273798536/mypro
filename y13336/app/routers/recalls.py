import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import RecallResult, GrayBatch, RecallSide, BatchStatus
from app.schemas.schemas import RecallResultCreate, RecallResultOut, DiffItem, BatchDiffResponse

router = APIRouter()


@router.post("/", response_model=RecallResultOut)
def add_recall(body: RecallResultCreate, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == body.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    result = RecallResult(
        id=str(uuid.uuid4()),
        batch_id=body.batch_id,
        side=body.side,
        query_id=body.query_id,
        query_text=body.query_text,
        doc_id=body.doc_id,
        doc_title=body.doc_title,
        rank=body.rank,
        score=body.score,
        meta=body.meta,
        created_at=datetime.utcnow(),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.post("/bulk", response_model=list[RecallResultOut])
def add_recalls_bulk(items: list[RecallResultCreate], db: Session = Depends(get_db)):
    results = []
    for body in items:
        batch = db.query(GrayBatch).filter(GrayBatch.id == body.batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail=f"批次 {body.batch_id} 不存在")
        result = RecallResult(
            id=str(uuid.uuid4()),
            batch_id=body.batch_id,
            side=body.side,
            query_id=body.query_id,
            query_text=body.query_text,
            doc_id=body.doc_id,
            doc_title=body.doc_title,
            rank=body.rank,
            score=body.score,
            meta=body.meta,
            created_at=datetime.utcnow(),
        )
        db.add(result)
        results.append(result)
    db.commit()
    for r in results:
        db.refresh(r)
    return results


@router.get("/batch/{batch_id}", response_model=list[RecallResultOut])
def list_recalls(batch_id: str, side: RecallSide | None = None, db: Session = Depends(get_db)):
    q = db.query(RecallResult).filter(RecallResult.batch_id == batch_id)
    if side:
        q = q.filter(RecallResult.side == side)
    return q.order_by(RecallResult.query_id, RecallResult.rank).all()


@router.get("/diff/{batch_id}", response_model=BatchDiffResponse)
def diff_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    old_results = db.query(RecallResult).filter(
        RecallResult.batch_id == batch_id, RecallResult.side == RecallSide.old
    ).all()
    new_results = db.query(RecallResult).filter(
        RecallResult.batch_id == batch_id, RecallResult.side == RecallSide.new
    ).all()

    old_map: dict[str, dict[str, RecallResult]] = {}
    for r in old_results:
        old_map.setdefault(r.query_id, {})[r.doc_id] = r

    new_map: dict[str, dict[str, RecallResult]] = {}
    for r in new_results:
        new_map.setdefault(r.query_id, {})[r.doc_id] = r

    query_texts: dict[str, str] = {}
    for r in old_results + new_results:
        query_texts[r.query_id] = r.query_text

    only_in_old = []
    only_in_new = []
    rank_changed = []

    all_query_ids = set(old_map.keys()) | set(new_map.keys())
    for qid in sorted(all_query_ids):
        old_docs = old_map.get(qid, {})
        new_docs = new_map.get(qid, {})
        old_doc_ids = set(old_docs.keys())
        new_doc_ids = set(new_docs.keys())

        qtext = query_texts.get(qid, "")

        removed = old_doc_ids - new_doc_ids
        if removed:
            only_in_old.append(DiffItem(
                query_id=qid, query_text=qtext,
                old_docs=[RecallResultOut.model_validate(old_docs[d]) for d in sorted(removed)],
                new_docs=[],
            ))

        added = new_doc_ids - old_doc_ids
        if added:
            only_in_new.append(DiffItem(
                query_id=qid, query_text=qtext,
                old_docs=[],
                new_docs=[RecallResultOut.model_validate(new_docs[d]) for d in sorted(added)],
            ))

        common = old_doc_ids & new_doc_ids
        changed = [d for d in sorted(common) if old_docs[d].rank != new_docs[d].rank]
        if changed:
            rank_changed.append(DiffItem(
                query_id=qid, query_text=qtext,
                old_docs=[RecallResultOut.model_validate(old_docs[d]) for d in changed],
                new_docs=[RecallResultOut.model_validate(new_docs[d]) for d in changed],
            ))

    return BatchDiffResponse(
        batch_id=batch_id,
        only_in_old=only_in_old,
        only_in_new=only_in_new,
        rank_changed=rank_changed,
    )
