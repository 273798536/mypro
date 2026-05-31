from __future__ import annotations

import csv
import io
import sys
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse

from engine import DRGEngine
from models import (
    CaseCreateRequest,
    CaseStatus,
    DeptSummary,
    DischargeCase,
    DRGGroup,
    NoteUpdateRequest,
    ReclassifyRequest,
    WarningReport,
    WarningStatus,
    WarningType,
)
from sample_data import load_sample_cases, load_sample_groups

app = FastAPI(title="DRG差额补偿预警API", version="1.0.0")

cases_db: dict[str, DischargeCase] = load_sample_cases()
groups_db: dict[str, DRGGroup] = load_sample_groups()
warnings_db: dict[str, WarningReport] = {}

engine = DRGEngine(cases_db, groups_db, warnings_db)
engine.refresh_all_warnings()


def _dept_code_impact(case: DischargeCase) -> dict:
    impact: dict = {
        "dept_code": case.dept_code,
        "dept_name": case.dept_name,
        "impact_note": None,
    }
    if case.dept_code.startswith("DEPT-"):
        dept_num = case.dept_code.replace("DEPT-", "")
        if not dept_num.isdigit():
            impact["impact_note"] = (
                f"科室编码 {case.dept_code} 非标准格式，"
                "可能影响科室汇总归类和预警追踪的准确性"
            )
    else:
        impact["impact_note"] = (
            f"科室编码 {case.dept_code} 非标准格式(DEPT-NN)，"
            "会影响科室汇总归类和预警追踪"
        )

    if case.original_drg_group_code is not None:
        impact["group_reclassified"] = True
        impact["original_group"] = case.original_drg_group_code
        impact["current_group"] = case.drg_group_code
        impact["impact_note"] = (
            (impact["impact_note"] + "；" if impact["impact_note"] else "")
            + f"病组已从 {case.original_drg_group_code} 重算为 {case.drg_group_code}，"
            "科室汇总中该病例差额已按新分组重新计算"
        )
    else:
        impact["group_reclassified"] = False

    if case.status == CaseStatus.MISSING_FIELDS or any(
        v is None for v in case.cost_items.values()
    ):
        missing = [k for k, v in case.cost_items.items() if v is None]
        if case.missing_fields:
            missing = list(set(missing + case.missing_fields))
        cost_note = f"成本缺项: {', '.join(missing)}" if missing else "存在缺项字段"
        impact["impact_note"] = (
            (impact["impact_note"] + "；" if impact["impact_note"] else "")
            + f"{cost_note}，科室汇总中该病例差额可能不准确"
        )

    return impact


def _warning_dept_impact(warning: WarningReport) -> dict:
    impact: dict = {
        "dept_code": warning.dept_code,
        "dept_name": warning.dept_name,
    }
    notes: list[str] = []
    if warning.is_group_changed:
        notes.append(
            f"病组已从 {warning.original_group_code} 重算为 {warning.drg_group_code}，"
            "科室汇总按新分组计算"
        )
    if warning.warning_type == WarningType.MISSING_COST_ITEM:
        notes.append("存在成本缺项，科室汇总中差额可能偏低")
    impact["impact_note"] = "；".join(notes) if notes else "科室编码无异常影响"
    return impact


@app.get("/")
def root():
    return {
        "service": "DRG差额补偿预警API",
        "version": "1.0.0",
        "endpoints": {
            "出院病例": "/cases",
            "病例详情": "/cases/{case_id}",
            "DRG分组": "/groups",
            "预警列表": "/warnings",
            "预警详情": "/warnings/{report_id}",
            "科室汇总": "/departments/summary",
            "病组重算": "POST /cases/{case_id}/reclassify",
            "备注更新": "PUT /warnings/{report_id}/note",
            "导出CSV": "/export/warnings.csv",
        },
    }


@app.get("/cases", tags=["出院病例"])
def list_cases(
    dept_code: Optional[str] = Query(None, description="按科室编码筛选"),
    status: Optional[CaseStatus] = Query(None, description="按状态筛选"),
    drg_group: Optional[str] = Query(None, description="按DRG分组编码筛选"),
):
    results = list(cases_db.values())
    if dept_code:
        results = [c for c in results if c.dept_code == dept_code]
    if status:
        results = [c for c in results if c.status == status]
    if drg_group:
        results = [c for c in results if c.drg_group_code == drg_group]
    return {"total": len(results), "cases": results}


@app.get("/cases/{case_id}", tags=["出院病例"])
def get_case(case_id: str):
    case = cases_db.get(case_id)
    if case is None:
        raise HTTPException(404, f"病例 {case_id} 不存在")

    diff = engine.calculate_diff(case)
    impact = _dept_code_impact(case)

    related_warnings = [
        w for w in warnings_db.values() if w.case_id == case_id
    ]

    return {
        "case": case,
        "diff_amount": round(diff, 2) if diff is not None else None,
        "dept_code_impact": impact,
        "related_warnings": related_warnings,
    }


@app.post("/cases", tags=["出院病例"])
def create_case(req: CaseCreateRequest):
    group = groups_db.get(req.drg_group_code)
    if group is None:
        raise HTTPException(400, f"DRG分组 {req.drg_group_code} 不存在")

    case_id = f"CASE-{len(cases_db) + 1:03d}"
    missing_fields: list[str] = []
    if req.actual_reimbursement is None:
        missing_fields.append("报销金额")

    cost_missing = [k for k, v in req.cost_items.items() if v is None]
    if cost_missing:
        missing_fields.extend(cost_missing)

    status = CaseStatus.NORMAL
    if missing_fields:
        status = CaseStatus.MISSING_FIELDS

    case = DischargeCase(
        case_id=case_id,
        patient_name=req.patient_name,
        dept_code=req.dept_code,
        dept_name=req.dept_name,
        admission_date=req.admission_date,
        discharge_date=req.discharge_date,
        total_cost=req.total_cost,
        drg_group_code=req.drg_group_code,
        drg_group_name=group.group_name,
        standard_cost=group.standard_cost,
        actual_reimbursement=req.actual_reimbursement,
        status=status,
        missing_fields=missing_fields,
        cost_items=req.cost_items,
        note="新录入病例" + (f"，缺项: {', '.join(missing_fields)}" if missing_fields else ""),
    )
    cases_db[case_id] = case

    new_warnings = engine.generate_warnings_for_case(case)
    for w in new_warnings:
        warnings_db[w.report_id] = w

    return {"case_id": case_id, "case": case, "generated_warnings": len(new_warnings)}


@app.get("/groups", tags=["DRG分组"])
def list_groups(mdc: Optional[str] = Query(None, description="按主要诊断大类筛选")):
    results = list(groups_db.values())
    if mdc:
        results = [g for g in results if g.mdc == mdc]

    enriched = []
    for g in results:
        case_count = sum(1 for c in cases_db.values() if c.drg_group_code == g.group_code)
        original_count = sum(
            1 for c in cases_db.values() if c.original_drg_group_code == g.group_code
        )
        enriched.append(
            {
                "group": g,
                "current_cases": case_count,
                "reclassified_from_count": original_count,
            }
        )
    return {"total": len(enriched), "groups": enriched}


@app.get("/groups/{group_code}", tags=["DRG分组"])
def get_group(group_code: str):
    group = groups_db.get(group_code)
    if group is None:
        raise HTTPException(404, f"DRG分组 {group_code} 不存在")

    related_cases = [c for c in cases_db.values() if c.drg_group_code == group_code]
    reclassified_from = [
        c for c in cases_db.values() if c.original_drg_group_code == group_code
    ]
    related_warnings = [w for w in warnings_db.values() if w.drg_group_code == group_code]

    return {
        "group": group,
        "current_cases": related_cases,
        "reclassified_from": reclassified_from,
        "warnings": related_warnings,
    }


@app.get("/warnings", tags=["预警报告"])
def list_warnings(
    dept_code: Optional[str] = Query(None, description="按科室编码筛选"),
    warning_type: Optional[WarningType] = Query(None, description="按预警类型筛选"),
    status: Optional[WarningStatus] = Query(None, description="按预警状态筛选"),
    is_group_changed: Optional[bool] = Query(None, description="是否经历过病组错分重算"),
):
    results = list(warnings_db.values())
    if dept_code:
        results = [w for w in results if w.dept_code == dept_code]
    if warning_type:
        results = [w for w in results if w.warning_type == warning_type]
    if status:
        results = [w for w in results if w.status == status]
    if is_group_changed is not None:
        results = [w for w in results if w.is_group_changed == is_group_changed]
    return {"total": len(results), "warnings": results}


@app.get("/warnings/{report_id}", tags=["预警报告"])
def get_warning(report_id: str):
    warning = warnings_db.get(report_id)
    if warning is None:
        raise HTTPException(404, f"预警 {report_id} 不存在")

    case = cases_db.get(warning.case_id)
    impact = _warning_dept_impact(warning)

    return {
        "warning": warning,
        "dept_code_impact": impact,
        "case_snapshot": {
            "case_id": case.case_id,
            "patient_name": case.patient_name,
            "dept_code": case.dept_code,
            "total_cost": case.total_cost,
            "drg_group_code": case.drg_group_code,
            "original_drg_group_code": case.original_drg_group_code,
            "status": case.status,
            "missing_fields": case.missing_fields,
            "cost_items_missing": [k for k, v in case.cost_items.items() if v is None],
        } if case else None,
    }


@app.put("/warnings/{report_id}/note", tags=["预警报告"])
def update_warning_note(report_id: str, req: NoteUpdateRequest):
    warning = warnings_db.get(report_id)
    if warning is None:
        raise HTTPException(404, f"预警 {report_id} 不存在")

    old_note = warning.note
    warning.note = req.note
    warning.note_history.append(
        {
            "old_value": old_note,
            "new_value": req.note,
            "changed_at": datetime.now(),
            "changed_by": req.changed_by,
        }
    )
    warning.updated_at = datetime.now()
    return {"report_id": report_id, "note": warning.note}


@app.put("/warnings/{report_id}/status", tags=["预警报告"])
def update_warning_status(report_id: str, new_status: WarningStatus):
    warning = warnings_db.get(report_id)
    if warning is None:
        raise HTTPException(404, f"预警 {report_id} 不存在")
    warning.status = new_status
    warning.updated_at = datetime.now()
    return {"report_id": report_id, "status": warning.status}


@app.post("/cases/{case_id}/reclassify", tags=["病组重算"])
def reclassify_case(case_id: str, req: ReclassifyRequest):
    if case_id not in cases_db:
        raise HTTPException(404, f"病例 {case_id} 不存在")
    if req.new_group_code not in groups_db:
        raise HTTPException(400, f"DRG分组 {req.new_group_code} 不存在")

    old_group = cases_db[case_id].drg_group_code
    case = engine.reclassify_case(case_id, req.new_group_code, req.reason)
    if case is None:
        raise HTTPException(500, "重算失败")

    diff = engine.calculate_diff(case)

    affected_warnings = [w for w in warnings_db.values() if w.case_id == case_id]

    dept_summaries = engine.get_dept_summaries()
    affected_dept = [s for s in dept_summaries if s.dept_code == case.dept_code]

    return {
        "case_id": case_id,
        "old_group": old_group,
        "new_group": req.new_group_code,
        "diff_amount": round(diff, 2) if diff is not None else None,
        "regenerated_warnings": len(affected_warnings),
        "dept_summary_change": affected_dept[0] if affected_dept else None,
        "message": (
            f"病组从 {old_group} 重算为 {req.new_group_code}，"
            f"已重新生成 {len(affected_warnings)} 条预警，"
            "科室汇总已按新分组更新"
        ),
    }


@app.post("/refresh", tags=["系统"])
def refresh_warnings():
    count = engine.refresh_all_warnings()
    return {
        "regenerated_warnings": count,
        "message": f"已重新扫描全部病例，生成 {count} 条预警",
    }


@app.get("/departments/summary", tags=["科室汇总"])
def department_summary():
    summaries = engine.get_dept_summaries()
    return {"total_departments": len(summaries), "departments": summaries}


@app.get("/export/warnings.csv", tags=["导出"], response_class=PlainTextResponse)
def export_warnings_csv(
    dept_code: Optional[str] = Query(None, description="按科室编码筛选"),
):
    results = list(warnings_db.values())
    if dept_code:
        results = [w for w in results if w.dept_code == dept_code]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "预警ID", "病例ID", "预警类型", "差额",
        "科室编码", "科室名称", "DRG分组编码", "DRG分组名称",
        "病组是否错分重算", "原始分组",
        "备注", "状态", "创建时间", "更新时间",
        "科室编码影响说明",
    ])

    for w in results:
        impact = _warning_dept_impact(w)
        writer.writerow([
            w.report_id,
            w.case_id,
            w.warning_type.value,
            w.diff_amount,
            w.dept_code,
            w.dept_name,
            w.drg_group_code,
            w.drg_group_name,
            "是" if w.is_group_changed else "否",
            w.original_group_code or "",
            w.note,
            w.status.value,
            w.created_at.isoformat(),
            w.updated_at.isoformat(),
            impact.get("impact_note", ""),
        ])

    return PlainTextResponse(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=drg_warnings.csv"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8900)
