from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas
from ..database import get_db
from ..errors.handlers import PromptVersionNotFound

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("/distribution", response_model=List[schemas.DistributionItem])
def score_distribution(
    prompt_version_id: int,
    metric: str = Query(default="score", description="score | status"),
    db: Session = Depends(get_db),
):
    pv = crud.get_prompt_version(db, prompt_version_id)
    if not pv:
        raise PromptVersionNotFound.by_id(prompt_version_id, used_by="评分分布统计")
    if metric == "status":
        return crud.eval_status_distribution(db, prompt_version_id)
    return crud.score_distribution(db, prompt_version_id)


@router.get("/safety-violations", response_model=List[schemas.ViolationItem])
def safety_violations(prompt_version_id: int, db: Session = Depends(get_db)):
    pv = crud.get_prompt_version(db, prompt_version_id)
    if not pv:
        raise PromptVersionNotFound.by_id(prompt_version_id, used_by="违规类型分布统计")
    return crud.safety_violation_distribution(db, prompt_version_id)


@router.get("/trend", response_model=List[schemas.TrendPoint])
def trend(version_ids: Optional[str] = Query(default=None, description="逗号分隔的版本 ID 列表"), db: Session = Depends(get_db)):
    if not version_ids:
        all_pv = crud.list_prompt_versions(db, limit=20)
        ids = [p.id for p in all_pv]
    else:
        ids = [int(x.strip()) for x in version_ids.split(",") if x.strip()]
    missing = []
    for i in ids:
        if not crud.get_prompt_version(db, i):
            missing.append(i)
    if missing:
        raise PromptVersionNotFound.by_id(missing[0], used_by=f"趋势图查询 (missing_ids={missing})")
    rows = crud.trend_metrics(db, ids)
    return [schemas.TrendPoint(**r) for r in rows]
