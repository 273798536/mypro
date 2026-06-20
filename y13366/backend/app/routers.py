from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from .database import get_db, FunnelSnapshot, TrainingLog, SampleJudgment, ChangeHistory, FeatureMaterial
from .schemas import (
    FunnelSnapshotCreate, FunnelSnapshotResponse,
    TrainingLogUpload, TrainingLogResponse,
    SampleJudgmentUpdate, SampleJudgmentResponse,
    JudgmentHistoryResponse, ChangeHistoryResponse,
    FeatureMaterialUpload, FeatureMaterialResponse,
    ThresholdUpdate, SnapshotCompareResult,
    LateArrivalResponse, SealMonthProcessResponse,
    JudgmentExplanationResponse
)
from . import services

router = APIRouter(prefix="/api/v1", tags=["召回漏斗版本快照"])


@router.post("/snapshots", response_model=FunnelSnapshotResponse)
def create_snapshot(data: FunnelSnapshotCreate, db: Session = Depends(get_db)):
    """创建召回漏斗版本快照"""
    try:
        return services.create_snapshot(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/snapshots", response_model=List[FunnelSnapshotResponse])
def list_snapshots(skip: int = 0, limit: int = 50,
                   seal_month: Optional[str] = None,
                   db: Session = Depends(get_db)):
    """列出所有快照"""
    return services.list_snapshots(db, skip, limit, seal_month)


@router.get("/snapshots/{snapshot_id}", response_model=FunnelSnapshotResponse)
def get_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    """获取单个快照详情"""
    snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="快照不存在")
    return snap


@router.post("/snapshots/{snapshot_id}/training-logs", response_model=TrainingLogResponse)
async def attach_training_log(
    snapshot_id: int,
    log_name: str = Form(...),
    log_content_summary: str = Form(...),
    uploaded_by: str = Form(...),
    batch_number: int = Form(1),
    is_complete: bool = Form(False),
    completeness_note: Optional[str] = Form(None),
    log_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """关联训练日志到快照（支持分批上传，留存关联关系）"""
    content = await log_file.read()
    log_content = content.decode("utf-8", errors="replace")
    log_data = TrainingLogUpload(
        log_name=log_name,
        log_content_summary=log_content_summary,
        uploaded_by=uploaded_by,
        batch_number=batch_number,
        is_complete=is_complete,
        completeness_note=completeness_note
    )
    try:
        return services.attach_training_log(db, snapshot_id, log_data, log_content)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/snapshots/{snapshot_id}/training-logs", response_model=List[TrainingLogResponse])
def list_training_logs(snapshot_id: int, db: Session = Depends(get_db)):
    """获取快照关联的所有训练日志"""
    snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="快照不存在")
    return db.query(TrainingLog).filter(TrainingLog.snapshot_id == snapshot_id).order_by(TrainingLog.batch_number).all()


@router.put("/snapshots/{snapshot_id}/threshold")
def update_threshold_protected(
    snapshot_id: int,
    data: ThresholdUpdate,
    db: Session = Depends(get_db)
):
    """更新阈值（自动保护人工锁定判断不被覆盖）"""
    try:
        result = services.update_threshold_with_judgment_protection(
            db, snapshot_id, data.threshold_config, data.updated_by, data.update_reason
        )
        return {
            "snapshot": FunnelSnapshotResponse.model_validate(result["snapshot"]),
            "rejudged_samples": result["rejudged_samples"],
            "locked_samples_protected": result["locked_samples_protected"],
            "total_affected": result["total_affected"],
            "total_protected": result["total_protected"],
            "message": (
                f"阈值更新完成。影响 {result['total_affected']} 条样本，"
                f"保护 {result['total_protected']} 条人工锁定样本未覆盖。"
                + (" 请逐一复核受影响样本的判断。" if result["total_affected"] > 0 else "")
            )
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/snapshots/{snapshot_id}/judgments", response_model=SampleJudgmentResponse)
def update_human_judgment(
    snapshot_id: int,
    data: SampleJudgmentUpdate,
    is_temporary: bool = False,
    editor_role: str = "evaluator",
    db: Session = Depends(get_db)
):
    """更新人工判断（自动留存历史，标记临时修改让下一班可见）"""
    try:
        return services.update_human_judgment(
            db, snapshot_id, data, is_temporary=is_temporary, editor_role=editor_role
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/snapshots/{snapshot_id}/judgments", response_model=List[SampleJudgmentResponse])
def list_judgments(snapshot_id: int, db: Session = Depends(get_db)):
    """列出快照所有样本判断"""
    snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="快照不存在")
    return db.query(SampleJudgment).filter(SampleJudgment.snapshot_id == snapshot_id).all()


@router.get("/snapshots/{snapshot_id}/judgments/{sample_id}/history",
            response_model=List[JudgmentHistoryResponse])
def get_sample_judgment_history(snapshot_id: int, sample_id: str,
                                 db: Session = Depends(get_db)):
    """获取单个样本的判断历史（含评测工程师临时修改记录）"""
    histories = services.get_judgment_histories(db, snapshot_id, sample_id)
    if not histories:
        j = db.query(SampleJudgment).filter(
            SampleJudgment.snapshot_id == snapshot_id,
            SampleJudgment.sample_id == sample_id
        ).first()
        if not j:
            raise HTTPException(status_code=404, detail="样本不存在")
    return histories


@router.get("/snapshots/{snapshot_id}/judgments/history",
            response_model=List[JudgmentHistoryResponse])
def get_all_judgment_histories(snapshot_id: int, db: Session = Depends(get_db)):
    """获取快照所有判断的历史（交接班追溯临时修改）"""
    snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="快照不存在")
    return services.get_judgment_histories(db, snapshot_id)


@router.post("/snapshots/{snapshot_id}/feature-materials", response_model=FeatureMaterialResponse)
async def attach_feature_material(
    snapshot_id: int,
    material_name: str = Form(...),
    material_type: str = Form(...),
    uploaded_by: str = Form(...),
    is_late_arrival: bool = Form(False),
    impact_description: Optional[str] = Form(None),
    material_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """后补特征材料（迟到材料会生成人能照着做的下一步提示，不覆盖人工判断）"""
    content = await material_file.read()
    mat_data = FeatureMaterialUpload(
        material_name=material_name,
        material_type=material_type,
        uploaded_by=uploaded_by,
        is_late_arrival=is_late_arrival,
        impact_description=impact_description
    )
    try:
        result = services.attach_feature_material(
            db, snapshot_id, mat_data, content, material_file.filename or "material"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/snapshots/{snapshot_id}/feature-materials", response_model=List[FeatureMaterialResponse])
def list_feature_materials(snapshot_id: int, db: Session = Depends(get_db)):
    """获取快照所有特征材料"""
    snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snap:
        raise HTTPException(status_code=404, detail="快照不存在")
    return db.query(FeatureMaterial).filter(FeatureMaterial.snapshot_id == snapshot_id).all()


@router.get("/snapshots/{snapshot_id}/changes", response_model=List[ChangeHistoryResponse])
def get_snapshot_changes(snapshot_id: int, db: Session = Depends(get_db)):
    """获取快照完整变更历史（后补材料无声覆盖检测）"""
    return services.get_snapshot_changes(db, snapshot_id)


@router.post("/snapshots/explain-change", response_model=JudgmentExplanationResponse)
def explain_judgment_change(
    sample_id: str,
    old_snapshot_id: int,
    new_snapshot_id: int,
    db: Session = Depends(get_db)
):
    """解释旧样本为什么改判（把误判样本放回新快照，看改判原因）"""
    try:
        return services.explain_judgment_change(db, sample_id, old_snapshot_id, new_snapshot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/snapshots/seal-month", response_model=SealMonthProcessResponse)
async def seal_month_process(
    seal_month: str = Form(..., description="封账月份，如 2026-06"),
    created_by: str = Form(...),
    old_snapshot_id: int = Form(...),
    late_material_name: Optional[str] = Form(None),
    late_material_type: Optional[str] = Form("attachment"),
    late_impact_description: Optional[str] = Form(None),
    late_material_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """月底封账场景：先导入旧材料，再补晚到附件，接口返回说清所有变化"""
    late_mat_data = None
    late_content = None
    late_fname = None

    if late_material_file and late_material_name:
        late_content = await late_material_file.read()
        late_fname = late_material_file.filename or f"late_{seal_month}"
        late_mat_data = {
            "material_name": late_material_name,
            "material_type": late_material_type,
            "uploaded_by": created_by,
            "is_late_arrival": True,
            "impact_description": late_impact_description
        }

    try:
        return services.seal_month_process(
            db, seal_month, created_by, old_snapshot_id,
            late_mat_data, late_content, late_fname
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/snapshots/{snapshot_id}/compare/{other_snapshot_id}")
def compare_snapshots(snapshot_id: int, other_snapshot_id: int,
                      db: Session = Depends(get_db)):
    """对比两个快照的判断差异"""
    snap1 = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    snap2 = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == other_snapshot_id).first()
    if not snap1 or not snap2:
        raise HTTPException(status_code=404, detail="快照不存在")

    j1_map = {j.sample_id: j for j in db.query(SampleJudgment).filter(SampleJudgment.snapshot_id == snapshot_id).all()}
    j2_map = {j.sample_id: j for j in db.query(SampleJudgment).filter(SampleJudgment.snapshot_id == other_snapshot_id).all()}

    all_samples = set(list(j1_map.keys()) + list(j2_map.keys()))
    diffs = []
    for sid in sorted(all_samples):
        j1 = j1_map.get(sid)
        j2 = j2_map.get(sid)
        j1_judg = (j1.human_judgment if j1 and j1.human_judgment else (j1.model_prediction if j1 else None))
        j2_judg = (j2.human_judgment if j2 and j2.human_judgment else (j2.model_prediction if j2 else None))
        changed = j1_judg != j2_judg
        diffs.append(SnapshotCompareResult(
            sample_id=sid,
            old_judgment=j1_judg,
            new_judgment=j2_judg or "N/A",
            old_score=j1.model_score if j1 else None,
            new_score=j2.model_score if j2 else None,
            judgment_changed=changed
        ))

    changed_count = sum(1 for d in diffs if d.judgment_changed)
    return {
        "snapshot_old": snapshot_id,
        "snapshot_new": other_snapshot_id,
        "total_samples": len(diffs),
        "changed_samples": changed_count,
        "differences": diffs
    }
