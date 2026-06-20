from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import json
import os

from .database import engine, Base, get_db, EXPORT_DIR
from . import models, schemas
from .replay_engine import (
    list_available_snapshots,
    check_alias_points_old,
    execute_replay,
    compare_parameters,
    compare_metrics,
    analyze_influencing_factors,
    generate_task_summary,
    ensure_demo_snapshots,
)

Base.metadata.create_all(bind=engine)
ensure_demo_snapshots()

app = FastAPI(title="向量索引异常回放系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/snapshots")
def get_snapshots():
    return {"snapshots": list_available_snapshots()}


@app.get("/api/tasks", response_model=List[schemas.ReplayTaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(models.ReplayTask).order_by(models.ReplayTask.updated_at.desc()).all()
    return tasks


@app.post("/api/tasks", response_model=schemas.ReplayTaskResponse)
def create_task(task_in: schemas.ReplayTaskCreate, db: Session = Depends(get_db)):
    alias_warning = check_alias_points_old(task_in.snapshot_alias or "")

    task = models.ReplayTask(
        name=task_in.name,
        snapshot_version=task_in.snapshot_version,
        snapshot_alias=task_in.snapshot_alias,
        snapshot_alias_points_old=alias_warning.get("points_to_old", False),
        current_status="任务已创建，等待首次回放",
        page_summary="暂无回放记录，请点击'新建回放'开始",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.get("/api/tasks/{task_id}", response_model=schemas.ReplayTaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.get("/api/tasks/{task_id}/summary", response_model=schemas.TaskSummary)
def get_task_summary(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    runs = db.query(models.ReplayRun).filter(models.ReplayRun.task_id == task_id).order_by(models.ReplayRun.run_number).all()
    return generate_task_summary(task, runs)


@app.post("/api/tasks/{task_id}/runs", response_model=schemas.ReplayRunResponse)
def create_run(task_id: int, run_in: schemas.ReplayRunCreate, db: Session = Depends(get_db)):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    last_run = db.query(models.ReplayRun).filter(models.ReplayRun.task_id == task_id).order_by(models.ReplayRun.run_number.desc()).first()
    run_number = (last_run.run_number + 1) if last_run else 1

    if not run_in.snapshot_file:
        snapshots = list_available_snapshots()
        if not snapshots:
            raise HTTPException(status_code=400, detail="没有可用的特征快照")
        run_in.snapshot_file = snapshots[0]["filename"]

    run = models.ReplayRun(
        task_id=task_id,
        run_number=run_number,
        threshold=run_in.threshold,
        snapshot_file=run_in.snapshot_file,
    )
    db.add(run)
    db.flush()

    parameters = run_in.parameters or {}
    prev_params = []
    if last_run:
        prev_params = last_run.parameters

    param_map_prev = {p.param_name: p.param_value for p in prev_params}

    for pname, pval in parameters.items():
        pval_str = str(pval)
        changed = (pname not in param_map_prev) or (param_map_prev[pname] != pval_str)
        param = models.RunParameter(
            run_id=run.id,
            param_name=pname,
            param_value=pval_str,
            changed_from_previous=changed,
            previous_value=param_map_prev.get(pname) if changed else None,
        )
        db.add(param)

    result = execute_replay(run_in.snapshot_file, run_in.threshold, parameters)
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result["message"])

    run.status = "completed"
    run.finished_at = datetime.utcnow()
    run.sample_count = result["sample_count"]
    run.anomaly_count = result["anomaly_count"]
    run.metrics = result["metrics"]
    run.sample_ids = result["sample_ids"]
    run.anomaly_ids = result["anomaly_ids"]

    alias_warning = check_alias_points_old(task.snapshot_alias or "")
    task.snapshot_alias_points_old = alias_warning.get("points_to_old", False)
    task.current_status = f"第{run_number}次回放已完成，发现{run.anomaly_count}个异常"
    task.page_summary = f"已完成{run_number}次回放，最新异常{run.anomaly_count}/{run.sample_count}个"
    task.status = "running" if run_number < 2 else "completed"
    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(run)
    return run


@app.get("/api/tasks/{task_id}/runs/{run_id}", response_model=schemas.ReplayRunResponse)
def get_run(task_id: int, run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.ReplayRun).filter(models.ReplayRun.id == run_id, models.ReplayRun.task_id == task_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="回放记录不存在")
    return run


@app.get("/api/tasks/{task_id}/compare")
def compare_runs(
    task_id: int,
    run_a: Optional[int] = None,
    run_b: Optional[int] = None,
    db: Session = Depends(get_db),
):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    runs = db.query(models.ReplayRun).filter(models.ReplayRun.task_id == task_id).order_by(models.ReplayRun.run_number).all()
    if len(runs) < 2:
        raise HTTPException(status_code=400, detail="至少需要2次回放才能对比")

    if run_a is None or run_b is None:
        run_a_obj = runs[-2]
        run_b_obj = runs[-1]
    else:
        run_a_obj = next((r for r in runs if r.id == run_a), None)
        run_b_obj = next((r for r in runs if r.id == run_b), None)
        if not run_a_obj or not run_b_obj:
            raise HTTPException(status_code=404, detail="指定的回放ID不存在")

    param_diffs = compare_parameters(run_a_obj.parameters, run_b_obj.parameters)
    metric_diffs = compare_metrics(run_a_obj.metrics or {}, run_b_obj.metrics or {})

    samples_a = set(run_a_obj.sample_ids or [])
    samples_b = set(run_b_obj.sample_ids or [])
    anomalies_a = set(run_a_obj.anomaly_ids or [])
    anomalies_b = set(run_b_obj.anomaly_ids or [])

    sample_diffs = {
        "added_samples": sorted(list(samples_b - samples_a)),
        "removed_samples": sorted(list(samples_a - samples_b)),
        "added_anomalies": sorted(list(anomalies_b - anomalies_a)),
        "removed_anomalies": sorted(list(anomalies_a - anomalies_b)),
    }

    threshold_diff = None
    if run_a_obj.threshold != run_b_obj.threshold:
        threshold_diff = {
            "previous": run_a_obj.threshold,
            "current": run_b_obj.threshold,
            "delta": round(run_b_obj.threshold - run_a_obj.threshold, 4),
        }

    judgments_a = db.query(models.ManualJudgment).filter(
        models.ManualJudgment.task_id == task_id,
        models.ManualJudgment.run_id == run_a_obj.id,
    ).all()
    judgments_b = db.query(models.ManualJudgment).filter(
        models.ManualJudgment.task_id == task_id,
        models.ManualJudgment.run_id == run_b_obj.id,
    ).all()

    judgment_diffs = []
    ja_map = {j.sample_id: j for j in judgments_a}
    jb_map = {j.sample_id: j for j in judgments_b}
    for sid in sorted(set(ja_map.keys()) | set(jb_map.keys())):
        ja = ja_map.get(sid)
        jb = jb_map.get(sid)
        if ja is None:
            judgment_diffs.append({"sample_id": sid, "change": "added", "new_label": jb.new_label, "reason": jb.reason})
        elif jb is None:
            judgment_diffs.append({"sample_id": sid, "change": "removed", "previous_label": ja.new_label})
        elif ja.new_label != jb.new_label:
            judgment_diffs.append({"sample_id": sid, "change": "modified", "previous_label": ja.new_label, "new_label": jb.new_label, "reason": jb.reason})

    notes_a = db.query(models.Note).filter(models.Note.task_id == task_id, models.Note.run_id == run_a_obj.id).all()
    notes_b = db.query(models.Note).filter(models.Note.task_id == task_id, models.Note.run_id == run_b_obj.id).all()
    note_diffs = [
        {"run_a_count": len(notes_a), "run_b_count": len(notes_b), "delta": len(notes_b) - len(notes_a)}
    ]

    alias_warning = check_alias_points_old(task.snapshot_alias or "")
    alias_info = schemas.AliasWarning(**alias_warning) if alias_warning.get("points_to_old") else None

    influencing = analyze_influencing_factors(
        run_a_obj, run_b_obj, judgments_a, judgments_b, notes_a, notes_b, alias_warning
    )

    return schemas.VersionDiff(
        param_diffs=param_diffs,
        metric_diffs=metric_diffs,
        sample_diffs=sample_diffs,
        threshold_diff=threshold_diff,
        judgment_diffs=judgment_diffs,
        note_diffs=note_diffs,
        influencing_factors=influencing,
        alias_warning=alias_info.model_dump() if alias_info else None,
    )


@app.post("/api/tasks/{task_id}/judgments", response_model=schemas.ManualJudgmentResponse)
def add_judgment(task_id: int, j_in: schemas.ManualJudgmentCreate, db: Session = Depends(get_db)):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    j = models.ManualJudgment(
        task_id=task_id,
        run_id=j_in.run_id,
        sample_id=j_in.sample_id,
        original_label=j_in.original_label,
        new_label=j_in.new_label,
        reason=j_in.reason,
    )
    db.add(j)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(j)
    return j


@app.get("/api/tasks/{task_id}/judgments", response_model=List[schemas.ManualJudgmentResponse])
def list_judgments(task_id: int, db: Session = Depends(get_db)):
    judgments = db.query(models.ManualJudgment).filter(models.ManualJudgment.task_id == task_id).order_by(models.ManualJudgment.created_at.desc()).all()
    return judgments


@app.post("/api/tasks/{task_id}/notes", response_model=schemas.NoteResponse)
def add_note(task_id: int, note_in: schemas.NoteCreate, db: Session = Depends(get_db)):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    note = models.Note(
        task_id=task_id,
        run_id=note_in.run_id,
        content=note_in.content,
        note_type=note_in.note_type,
    )
    db.add(note)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note


@app.get("/api/tasks/{task_id}/notes", response_model=List[schemas.NoteResponse])
def list_notes(task_id: int, db: Session = Depends(get_db)):
    notes = db.query(models.Note).filter(models.Note.task_id == task_id).order_by(models.Note.created_at.desc()).all()
    return notes


@app.get("/api/tasks/{task_id}/export")
def export_task(task_id: int, format: str = "json", db: Session = Depends(get_db)):
    task = db.query(models.ReplayTask).filter(models.ReplayTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    runs = db.query(models.ReplayRun).filter(models.ReplayRun.task_id == task_id).order_by(models.ReplayRun.run_number).all()
    judgments = db.query(models.ManualJudgment).filter(models.ManualJudgment.task_id == task_id).all()
    notes = db.query(models.Note).filter(models.Note.task_id == task_id).all()

    export_data = {
        "task": {
            "id": task.id,
            "name": task.name,
            "status": task.status,
            "snapshot_version": task.snapshot_version,
            "snapshot_alias": task.snapshot_alias,
            "snapshot_alias_points_old": task.snapshot_alias_points_old,
            "current_status": task.current_status,
            "page_summary": task.page_summary,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
        },
        "runs": [],
        "judgments": [],
        "notes": [],
    }

    for run in runs:
        export_data["runs"].append({
            "id": run.id,
            "run_number": run.run_number,
            "status": run.status,
            "threshold": run.threshold,
            "snapshot_file": run.snapshot_file,
            "sample_count": run.sample_count,
            "anomaly_count": run.anomaly_count,
            "metrics": run.metrics,
            "parameters": [{"name": p.param_name, "value": p.param_value} for p in run.parameters],
            "anomaly_ids": run.anomaly_ids,
            "started_at": run.started_at.isoformat(),
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        })

    for j in judgments:
        export_data["judgments"].append({
            "sample_id": j.sample_id,
            "original_label": j.original_label,
            "new_label": j.new_label,
            "reason": j.reason,
            "created_by": j.created_by,
            "created_at": j.created_at.isoformat(),
        })

    for n in notes:
        export_data["notes"].append({
            "content": n.content,
            "note_type": n.note_type,
            "created_by": n.created_by,
            "created_at": n.created_at.isoformat(),
        })

    os.makedirs(EXPORT_DIR, exist_ok=True)
    filename = f"replay_task_{task_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}"
    filepath = os.path.join(EXPORT_DIR, filename)

    if format == "json":
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
    elif format == "csv":
        import csv
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["模块", "字段", "值"])
            for k, v in export_data["task"].items():
                writer.writerow(["任务", k, v])
            for run in export_data["runs"]:
                for k, v in run.items():
                    writer.writerow([f"回放#{run['run_number']}", k, v])
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")

    return {"status": "success", "filepath": filepath, "data": export_data if format == "json" else None}
