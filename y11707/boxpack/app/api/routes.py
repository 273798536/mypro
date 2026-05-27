from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas.models import RecommendRequest, RecommendReport
from app.solver.ilp_pack import build_and_solve
from app.services.export import report_to_csv, compare_reports, sku_trace_map
from app.data.samples import normal_sample, boundary_sample, bad_data_sample

router = APIRouter(prefix="/api/v1", tags=["packing"])


@router.post("/pack/recommend", response_model=RecommendReport)
def recommend(payload: RecommendRequest) -> RecommendReport:
    try:
        report = build_and_solve(
            order_id=payload.order_id,
            lines=payload.lines,
            catalog=payload.catalog,
            boxes=payload.boxes,
            constraints=payload.constraints,
        )
        # 保留来源与修正痕迹
        report.trace["sku_trace"] = sku_trace_map(payload.catalog)
        report.trace["box_trace"] = {
            b.box_id: {"source": b.source, "note": b.note} for b in payload.boxes
        }
        report.trace["line_trace"] = [
            {"sku_id": ln.sku_id, "qty": ln.qty, "source": ln.source, "note": ln.note}
            for ln in payload.lines
        ]
        report.trace["constraints"] = payload.constraints.model_dump()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pack/recommend/csv")
def recommend_csv(payload: RecommendRequest) -> Response:
    report = build_and_solve(
        order_id=payload.order_id,
        lines=payload.lines,
        catalog=payload.catalog,
        boxes=payload.boxes,
        constraints=payload.constraints,
    )
    return Response(
        content=report_to_csv(report),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{payload.order_id}.csv"'},
    )


@router.post("/pack/compare")
def compare(payloads: list[RecommendRequest]) -> list[dict]:
    reports = []
    for p in payloads:
        r = build_and_solve(
            order_id=p.order_id,
            lines=p.lines,
            catalog=p.catalog,
            boxes=p.boxes,
            constraints=p.constraints,
        )
        reports.append(
            {
                "label": p.order_id,
                "order_id": r.order_id,
                "feasible": r.feasible,
                "total_cost": r.total_cost,
                "split_penalty_total": r.split_penalty_total,
                "boxes_opened": r.boxes_opened,
                "issues": r.issues,
                "trace": r.trace,
            }
        )
    return compare_reports(reports)


@router.get("/pack/samples")
def samples() -> dict:
    return {
        "normal": normal_sample().model_dump(),
        "boundary": boundary_sample().model_dump(),
        "bad": bad_data_sample().model_dump(),
    }


@router.get("/pack/samples/{name}")
def sample_by_name(name: str) -> dict:
    if name == "normal":
        return normal_sample().model_dump()
    if name == "boundary":
        return boundary_sample().model_dump()
    if name == "bad":
        return bad_data_sample().model_dump()
    raise HTTPException(status_code=404, detail=f"unknown sample: {name}")


@router.post("/pack/samples/{name}/run")
def run_sample(name: str) -> RecommendReport:
    if name == "normal":
        req = normal_sample()
    elif name == "boundary":
        req = boundary_sample()
    elif name == "bad":
        req = bad_data_sample()
    else:
        raise HTTPException(status_code=404, detail=f"unknown sample: {name}")
    return recommend(req)
