from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from .database import get_db, engine, Base
from . import models, schemas
from .engine import engine as conic_engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="圆锥曲线参数器",
    description="用于复核圆锥曲线参数计算、记录处理痕迹、导出评审报告",
    version="1.0.0"
)


@app.get("/")
def root():
    return {"service": "圆锥曲线参数器", "version": "1.0.0", "status": "running"}


@app.get("/records", response_model=List[schemas.ConicRecordOut])
def list_records(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ConicRecord)
    if status:
        query = query.filter(models.ConicRecord.status == status)
    return query.order_by(models.ConicRecord.created_at.desc()).all()


@app.get("/records/{record_id}", response_model=schemas.RecordDetailOut)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {
        "record": record,
        "versions": record.versions,
        "issues": record.issues,
        "answers": record.answers,
        "late_params": record.late_params,
    }


@app.post("/records/import", response_model=schemas.ImportResponse)
def import_records(records: List[schemas.ConicRecordCreate], db: Session = Depends(get_db)):
    success_count = 0
    failed_count = 0
    created_records: List[models.ConicRecord] = []
    errors: List[str] = []

    for idx, data in enumerate(records):
        record_dict = data.model_dump()
        existing = db.query(models.ConicRecord).filter(
            models.ConicRecord.record_no == record_dict["record_no"]
        ).first()
        if existing:
            failed_count += 1
            errors.append(f"第{idx + 1}条：记录编号 {record_dict['record_no']} 已存在，已跳过")
            continue

        valid, issue_list = conic_engine.validate_record(record_dict)
        status = models.ReviewStatus.IMPORTED if valid else models.ReviewStatus.PENDING_CONFIRM

        record = models.ConicRecord(**record_dict)
        record.status = status
        db.add(record)
        db.flush()

        computed = conic_engine.compute_results(
            record.a, record.b, record.c, record.focus_x, record.focus_y,
            record.directrix, record.eccentricity, record.curve_type, record.unit
        )
        version = models.RecordVersion(
            record_id=record.id,
            version_no=1,
            a=record.a,
            b=record.b,
            c=record.c,
            curve_type=computed.get("curve_type"),
            eccentricity=computed.get("eccentricity"),
            formula=computed.get("formula"),
            computed_results=computed,
            chart_supplied=False,
            created_by="system_import",
            remark="系统导入初始版本"
        )
        db.add(version)

        seen_keys = set()
        for issue_data in issue_list:
            key = (issue_data["issue_type"], issue_data["description"])
            if key in seen_keys:
                continue
            seen_keys.add(key)
            issue = models.ReviewIssue(
                record_id=record.id,
                **issue_data
            )
            db.add(issue)

        success_count += 1
        created_records.append(record)

    db.commit()
    for r in created_records:
        db.refresh(r)
    message = f"导入完成：成功 {success_count} 条，失败 {failed_count} 条"
    if errors:
        message += "；" + "；".join(errors)
    return schemas.ImportResponse(
        success=success_count,
        failed=failed_count,
        message=message,
        records=created_records
    )


@app.post("/records/{record_id}/status", response_model=schemas.ConicRecordOut)
def update_status(record_id: int, payload: schemas.StatusUpdate, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    allowed = {
        models.ReviewStatus.IMPORTED: [models.ReviewStatus.REVIEWING, models.ReviewStatus.REJECTED],
        models.ReviewStatus.PENDING_CONFIRM: [models.ReviewStatus.REVIEWING, models.ReviewStatus.REJECTED],
        models.ReviewStatus.REVIEWING: [models.ReviewStatus.CONFIRMED, models.ReviewStatus.PENDING_CONFIRM, models.ReviewStatus.REJECTED],
        models.ReviewStatus.CONFIRMED: [models.ReviewStatus.EXPORTED],
    }
    current = record.status
    target = payload.target_status
    if current not in allowed or target not in allowed[current]:
        raise HTTPException(
            status_code=400,
            detail=f"状态流转不允许：{current} -> {target}"
        )

    if target == models.ReviewStatus.CONFIRMED:
        blockers = [i for i in record.issues if not i.is_resolved and i.severity == "blocker"]
        if blockers:
            raise HTTPException(
                status_code=400,
                detail=f"存在未解决的阻断性问题，无法确认：{blockers[0].description}"
            )

    record.status = target
    db.commit()
    db.refresh(record)
    return record


@app.post("/records/{record_id}/chart-supplement")
def supplement_chart(record_id: int, payload: schemas.ChartSupplement, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    last_version = db.query(models.RecordVersion).filter(
        models.RecordVersion.record_id == record_id
    ).order_by(models.RecordVersion.version_no.desc()).first()

    next_version_no = (last_version.version_no + 1) if last_version else 1

    computed = conic_engine.compute_results(
        record.a, record.b, record.c, record.focus_x, record.focus_y,
        record.directrix, record.eccentricity, record.curve_type, record.unit
    )

    new_version = models.RecordVersion(
        record_id=record.id,
        version_no=next_version_no,
        a=record.a,
        b=record.b,
        c=record.c,
        curve_type=computed.get("curve_type"),
        eccentricity=computed.get("eccentricity"),
        formula=computed.get("formula"),
        computed_results=computed,
        chart_supplied=payload.chart_supplied,
        created_by=payload.updated_by or "reviewer",
        remark="图表补录后重新计算"
    )
    db.add(new_version)
    record.chart_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_version)

    return {
        "message": "图表补录完成，公式计算已同步更新",
        "new_version": schemas.RecordVersionOut.model_validate(new_version).model_dump()
    }


@app.get("/records/{record_id}/compare")
def compare_versions(record_id: int, db: Session = Depends(get_db)):
    versions = db.query(models.RecordVersion).filter(
        models.RecordVersion.record_id == record_id
    ).order_by(models.RecordVersion.version_no.asc()).all()

    if len(versions) < 1:
        raise HTTPException(status_code=404, detail="没有可用的版本记录")

    comparisons = []
    for i in range(len(versions)):
        v = versions[i]
        comparisons.append({
            "version_no": v.version_no,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "created_by": v.created_by,
            "remark": v.remark,
            "chart_supplied": v.chart_supplied,
            "formula": v.formula,
            "curve_type": v.curve_type,
            "eccentricity": v.eccentricity,
            "computed_results": v.computed_results,
        })

    changes = []
    if len(versions) >= 2:
        for i in range(1, len(versions)):
            prev, curr = versions[i - 1], versions[i]
            diff = {
                "from_version": prev.version_no,
                "to_version": curr.version_no,
                "changes": []
            }
            for field in ["a", "b", "c", "curve_type", "eccentricity", "formula"]:
                p_val = getattr(prev, field)
                c_val = getattr(curr, field)
                if p_val != c_val:
                    diff["changes"].append({
                        "field": field,
                        "before": p_val,
                        "after": c_val,
                    })
            if diff["changes"]:
                changes.append(diff)

    return {
        "versions": comparisons,
        "changes": changes,
    }


@app.post("/records/{record_id}/issues/{issue_id}/resolve", response_model=schemas.ReviewIssueOut)
def resolve_issue(record_id: int, issue_id: int, payload: schemas.ReviewIssueResolve,
                  db: Session = Depends(get_db)):
    issue = db.query(models.ReviewIssue).filter(
        models.ReviewIssue.id == issue_id,
        models.ReviewIssue.record_id == record_id
    ).first()
    if not issue:
        raise HTTPException(status_code=404, detail="问题不存在")
    issue.is_resolved = payload.resolved
    issue.resolved_at = datetime.utcnow() if payload.resolved else None
    db.commit()
    db.refresh(issue)
    return issue


@app.get("/records/{record_id}/issues", response_model=List[schemas.ReviewIssueOut])
def list_issues(record_id: int, unresolved_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.ReviewIssue).filter(models.ReviewIssue.record_id == record_id)
    if unresolved_only:
        query = query.filter(models.ReviewIssue.is_resolved == False)
    return query.all()


@app.post("/records/{record_id}/answers", response_model=schemas.StudentAnswerOut)
def add_student_answer(record_id: int, payload: schemas.StudentAnswerIn, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    answer = models.StudentAnswer(
        record_id=record_id,
        **payload.model_dump()
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


@app.post("/records/{record_id}/late-params", response_model=schemas.LateParamOut)
def submit_late_parameter(record_id: int, payload: schemas.LateParamIn, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    param_map = {"a": record.a, "b": record.b, "c": record.c, "eccentricity": record.eccentricity, "unit": record.unit}
    old_value_raw = param_map.get(payload.param_name)
    old_value = str(old_value_raw) if old_value_raw is not None else None

    last_version = db.query(models.RecordVersion).filter(
        models.RecordVersion.record_id == record_id
    ).order_by(models.RecordVersion.version_no.desc()).first()
    current_results = last_version.computed_results if last_version and last_version.computed_results else {}

    impacted = conic_engine.compute_late_impact(
        payload.param_name, old_value, payload.new_value, current_results
    )

    late_param = models.LateParameter(
        record_id=record_id,
        param_name=payload.param_name,
        old_value=old_value,
        new_value=payload.new_value,
        impacted_conclusions=impacted,
        merged=False,
    )
    db.add(late_param)
    db.commit()
    db.refresh(late_param)
    return late_param


@app.get("/records/{record_id}/late-params/impact-summary")
def late_param_impact_summary(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    unmerged = db.query(models.LateParameter).filter(
        models.LateParameter.record_id == record_id,
        models.LateParameter.merged == False
    ).all()

    impacted_set = set()
    for lp in unmerged:
        for c in lp.impacted_conclusions:
            impacted_set.add(c)

    return {
        "record_no": record.record_no,
        "pending_late_params": [
            {"param_name": lp.param_name, "old_value": lp.old_value, "new_value": lp.new_value}
            for lp in unmerged
        ],
        "impacted_conclusions": sorted(list(impacted_set)),
        "warning": "以上结论受到晚到参数影响，当前报告仍展示旧结果，请确认是否合并新参数后重新计算。"
    }


@app.post("/records/{record_id}/late-params/{late_param_id}/merge")
def merge_late_parameter(record_id: int, late_param_id: int, db: Session = Depends(get_db)):
    lp = db.query(models.LateParameter).filter(
        models.LateParameter.id == late_param_id,
        models.LateParameter.record_id == record_id
    ).first()
    if not lp:
        raise HTTPException(status_code=404, detail="晚到参数记录不存在")
    if lp.merged:
        raise HTTPException(status_code=400, detail="该晚到参数已合并")

    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()

    try:
        numeric_value = float(lp.new_value) if lp.param_name != "unit" and lp.param_name != "directrix" else lp.new_value
    except ValueError:
        numeric_value = lp.new_value

    if hasattr(record, lp.param_name):
        setattr(record, lp.param_name, numeric_value)

    last_version = db.query(models.RecordVersion).filter(
        models.RecordVersion.record_id == record_id
    ).order_by(models.RecordVersion.version_no.desc()).first()
    next_version_no = (last_version.version_no + 1) if last_version else 1

    computed = conic_engine.compute_results(
        record.a, record.b, record.c, record.focus_x, record.focus_y,
        record.directrix, record.eccentricity, record.curve_type, record.unit
    )

    new_version = models.RecordVersion(
        record_id=record.id,
        version_no=next_version_no,
        a=record.a,
        b=record.b,
        c=record.c,
        curve_type=computed.get("curve_type"),
        eccentricity=computed.get("eccentricity"),
        formula=computed.get("formula"),
        computed_results=computed,
        chart_supplied=last_version.chart_supplied if last_version else False,
        created_by="late_param_merge",
        remark=f"合并晚到参数 {lp.param_name}: {lp.old_value} -> {lp.new_value}"
    )
    db.add(new_version)
    lp.merged = True
    db.commit()

    return {
        "message": "晚到参数已合并，已生成新版本并重新计算",
        "new_version_no": next_version_no,
    }


@app.get("/records/{record_id}/export")
def export_report(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.ConicRecord).filter(models.ConicRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    blockers = [i for i in record.issues if not i.is_resolved and i.severity == "blocker"]
    if blockers:
        unique_descriptions = list(dict.fromkeys([b.description for b in blockers]))
        blocker_detail = "；".join(unique_descriptions)
        resp = {
            "export_allowed": False,
            "reason": "存在阻断性问题未解决，导出已被拦截",
            "blocker_details": blocker_detail,
            "record_no": record.record_no,
            "status": record.status,
        }
        return JSONResponse(status_code=422, content=resp)

    unmerged_late = db.query(models.LateParameter).filter(
        models.LateParameter.record_id == record_id,
        models.LateParameter.merged == False
    ).all()

    last_version = db.query(models.RecordVersion).filter(
        models.RecordVersion.record_id == record_id
    ).order_by(models.RecordVersion.version_no.desc()).first()

    answers = db.query(models.StudentAnswer).filter(
        models.StudentAnswer.record_id == record_id
    ).all()

    resolved_issues = [i for i in record.issues if i.is_resolved]
    unresolved_issues = [i for i in record.issues if not i.is_resolved]

    report = {
        "report_title": "圆锥曲线参数复核报告",
        "generated_at": datetime.utcnow().isoformat(),
        "record": {
            "record_no": record.record_no,
            "student_name": record.student_name,
            "question_id": record.question_id,
            "status": record.status,
        },
        "parameters": {
            "curve_type": last_version.curve_type if last_version else record.curve_type,
            "a": record.a,
            "b": record.b,
            "c": record.c,
            "eccentricity": last_version.eccentricity if last_version else record.eccentricity,
            "unit": record.unit,
            "raw_formula": record.raw_formula,
        },
        "computed_results": last_version.computed_results if last_version and last_version.computed_results else {},
        "formula": last_version.formula if last_version else None,
        "version_info": {
            "current_version": last_version.version_no if last_version else 0,
            "chart_supplied": last_version.chart_supplied if last_version else False,
            "remark": last_version.remark if last_version else None,
        },
        "review_info": {
            "resolved_issues": [{"type": i.issue_type, "description": i.description} for i in resolved_issues],
            "unresolved_issues": [{"type": i.issue_type, "description": i.description, "severity": i.severity} for i in unresolved_issues],
        },
        "student_answers": [
            {
                "answer_type": a.answer_type,
                "answer_content": a.answer_content,
                "is_correct": a.is_correct,
                "source": a.source,
            }
            for a in answers
        ],
        "late_params_warning": (
            f"注意：存在 {len(unmerged_late)} 条晚到参数尚未合并，报告中仍展示旧结果。受影响结论包括："
            + ", ".join(sorted({c for lp in unmerged_late for c in lp.impacted_conclusions}))
        ) if unmerged_late else None,
        "audit_trail": [
            {
                "version_no": v.version_no,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "created_by": v.created_by,
                "remark": v.remark,
            }
            for v in sorted(record.versions, key=lambda x: x.version_no)
        ],
    }

    content = json.dumps(report, ensure_ascii=False, indent=2)
    filename = f"conic_report_{record.record_no}.json"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    record.status = models.ReviewStatus.EXPORTED
    db.commit()
    return Response(content=content, media_type="application/json", headers=headers)
