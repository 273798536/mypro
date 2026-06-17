from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..errors.handlers import EvalSamplesNotFound, PromptVersionNotFound

router = APIRouter(prefix="/api/replay", tags=["replay"])


@router.post("/trace", response_model=schemas.ReplayTrace)
def trace(payload: dict, db: Session = Depends(get_db)):
    sample_id = payload.get("eval_sample_id")
    if sample_id is None:
        return {"error": "eval_sample_id 字段必填"}
    sample = crud.get_eval_sample(db, sample_id)
    if not sample:
        raise EvalSamplesNotFound.by_ids([sample_id])
    pv = crud.get_prompt_version(db, sample.prompt_version_id)
    if not pv:
        raise PromptVersionNotFound.by_id(sample.prompt_version_id, used_by="评测回放溯源")
    feedbacks = crud.list_feedback_by_sample(db, sample_id)
    affected_rule_ids = set()
    for fb in feedbacks:
        for rid in (fb.affected_rule_ids or []):
            affected_rule_ids.add(rid)
    rules = []
    for r in (pv.safety_rules_snapshot or {}).get("rules", []):
        if r.get("id") in affected_rule_ids:
            rules.append(schemas.SafetyRule(**r))
    snippet = pv.content[:200] + ("..." if len(pv.content) > 200 else "")
    return schemas.ReplayTrace(
        sample_id=sample.id,
        source_material_ref=sample.source_material_ref,
        input_text=sample.input_text,
        model_output=sample.model_output,
        score=sample.score,
        eval_status=sample.eval_status,
        feedback_history=feedbacks,
        affected_rules=rules,
        prompt_version_tag=pv.version_tag,
        prompt_content_snippet=snippet,
    )
