import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from topo_error_tracker.audit import AuditManager
from topo_error_tracker.report import ReportGenerator
from topo_error_tracker.store import Store
from topo_error_tracker.tracker import TopologyTracker
from topo_error_tracker.workflow import WorkflowManager, WorkflowStepOrderError

app = FastAPI(
    title="拓扑路径错因追踪 API",
    description="面向数学教学的错因追踪计算服务，所有接口返回解释字段",
)

_store: Optional[Store] = None


def _get_store() -> Store:
    global _store
    if _store is None:
        db_path = os.environ.get("TOPO_DB", "topo_tracker.db")
        drafts_dir = "drafts"
        _store = Store(db_path=db_path, drafts_dir=drafts_dir)
    return _store


class ImportRequest(BaseModel):
    batch_id: str
    source_label: Optional[str] = None
    operator: Optional[str] = None
    materials: List[Dict[str, Any]] = Field(
        description="材料列表，每项须含 original_text 字段"
    )


class ImportResponse(BaseModel):
    batch_id: str
    imported_count: int
    material_ids: List[str]
    explanation: str = Field(description="导入结果解释")


class AnnotateRequest(BaseModel):
    material_id: str
    field: str
    old_value: str
    new_value: str
    editor: str
    reason: str
    batch_id: Optional[str] = None
    operator: Optional[str] = None


class AnnotateResponse(BaseModel):
    edit_id: str
    material_id: str
    explanation: str = Field(description="标注结果解释")


class TrackRequest(BaseModel):
    material_id: str


class ErrorNodeResponse(BaseModel):
    node_id: str
    step_label: str
    formula: Optional[str] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    severity: str
    explanation: Optional[str] = None
    unit_conversion: Optional[str] = None
    counter_example: Optional[str] = None


class TrackResponse(BaseModel):
    material_id: str
    path_id: str
    error_nodes: List[ErrorNodeResponse]
    explanation: str = Field(description="整条拓扑路径的错因综合解释——接口必返")
    anomalous_samples: List[str]
    tracked_at: str


class ReviewRequest(BaseModel):
    material_id: str
    reviewer: str
    approved: bool
    reason: str
    extrapolation_boundary: bool = False


class ReviewResponse(BaseModel):
    decision_id: str
    material_id: str
    approved: bool
    explanation: str = Field(description="复核结果解释")
    previous_reviewer: Optional[str] = None
    previous_reason: Optional[str] = None
    rule_violation: Optional[str] = None


class ExportRequest(BaseModel):
    batch_id: str
    operator: Optional[str] = None


class ExportSnapshotResponse(BaseModel):
    material_id: str
    synced: bool
    content_hash: str
    annotation_count: int
    edit_count: int
    sync_details: Optional[str] = None
    explanation: str = Field(description="导出同步状态解释")


class ExportResponse(BaseModel):
    batch_id: str
    synced_count: int
    total_count: int
    snapshots: List[ExportSnapshotResponse]
    explanation: str = Field(description="导出校验综合解释")


class ReportResponse(BaseModel):
    material_id: str
    report: str = Field(description="Markdown 格式报告，含 LaTeX 公式和反例")
    explanation: str = Field(description="报告生成解释")


class BatchStatusResponse(BaseModel):
    batch_id: str
    steps: Dict[str, Any]
    material_count: int
    trial_rule: str
    explanation: str = Field(description="状态解释")


@app.post("/import", response_model=ImportResponse)
def import_materials(req: ImportRequest):
    store = _get_store()
    materials = []
    for item in req.materials:
        from topo_error_tracker.models import Material
        original_text = item.get("original_text", json.dumps(item, ensure_ascii=False))
        m = Material(
            batch_id=req.batch_id,
            original_text=original_text,
            source_label=req.source_label or item.get("source_label"),
            metadata=item.get("metadata", {}),
        )
        store.save_material(m)
        materials.append(m)

    wf = WorkflowManager(store)
    wf.complete_import_step(req.batch_id, req.operator)

    return ImportResponse(
        batch_id=req.batch_id,
        imported_count=len(materials),
        material_ids=[m.id for m in materials],
        explanation=f"成功导入 {len(materials)} 条材料到批次 {req.batch_id}，"
                    f"原始说法和导入时间已保留。导入步骤已完成。",
    )


@app.post("/annotate", response_model=AnnotateResponse)
def annotate(req: AnnotateRequest):
    store = _get_store()
    wf = WorkflowManager(store)
    edit = wf.add_annotation(
        req.material_id, req.field, req.old_value, req.new_value,
        req.editor, req.reason,
    )
    batch_note = ""
    if req.batch_id:
        try:
            wf.complete_annotate_step(req.batch_id, req.operator)
            batch_note = f"批次 {req.batch_id} 备注步骤已完成。"
        except WorkflowStepOrderError as e:
            batch_note = f"⚠ {e}"

    return AnnotateResponse(
        edit_id=edit.id,
        material_id=req.material_id,
        explanation=f"已添加标注：{req.field} 从「{req.old_value}」改为「{req.new_value}」"
                    f"，编辑人 {req.editor}，原因：{req.reason}。{batch_note}",
    )


@app.post("/track", response_model=TrackResponse)
def track(req: TrackRequest):
    store = _get_store()
    material = store.get_material(req.material_id)
    if material is None:
        raise HTTPException(status_code=404, detail=f"材料 {req.material_id} 不存在")
    tracker = TopologyTracker(store)
    result = tracker.track(material)
    return TrackResponse(
        material_id=result.material_id,
        path_id=result.path_id,
        error_nodes=[
            ErrorNodeResponse(
                node_id=n.node_id,
                step_label=n.step_label,
                formula=n.formula,
                expected_value=n.expected_value,
                actual_value=n.actual_value,
                severity=n.severity.value,
                explanation=n.explanation,
                unit_conversion=n.unit_conversion,
                counter_example=n.counter_example,
            )
            for n in result.error_nodes
        ],
        explanation=result.explanation,
        anomalous_samples=result.anomalous_samples,
        tracked_at=result.tracked_at.isoformat(),
    )


@app.post("/review", response_model=ReviewResponse)
def review(req: ReviewRequest):
    store = _get_store()
    audit = AuditManager(store)
    decision = audit.submit_review(
        req.material_id, req.reviewer, req.approved,
        req.reason, req.extrapolation_boundary,
    )
    status_text = "通过" if req.approved else "未通过"
    rule = None
    if req.extrapolation_boundary and not req.approved:
        from topo_error_tracker.audit import EXTRAPOLATION_REVIEW_RULE
        rule = EXTRAPOLATION_REVIEW_RULE
    return ReviewResponse(
        decision_id=decision.id,
        material_id=req.material_id,
        approved=req.approved,
        explanation=f"复核结果：{status_text}。复核人 {req.reviewer}，原因：{req.reason}。"
                    f"{'涉及外推越界。' if req.extrapolation_boundary else ''}",
        previous_reviewer=decision.previous_reviewer,
        previous_reason=decision.previous_reason,
        rule_violation=rule,
    )


@app.post("/export", response_model=ExportResponse)
def export_check(req: ExportRequest):
    store = _get_store()
    wf = WorkflowManager(store)
    try:
        snapshots = wf.check_export_sync(req.batch_id, req.operator)
    except WorkflowStepOrderError as e:
        raise HTTPException(status_code=400, detail=str(e))

    snap_responses = []
    for s in snapshots:
        sync_text = "同步" if s.synced else "未同步"
        snap_responses.append(
            ExportSnapshotResponse(
                material_id=s.material_id,
                synced=s.synced,
                content_hash=s.content_hash,
                annotation_count=s.annotation_count,
                edit_count=s.edit_count,
                sync_details=s.sync_details,
                explanation=f"材料 {s.material_id} 导出状态：{sync_text}。{s.sync_details or ''}",
            )
        )

    synced_count = sum(1 for s in snapshots if s.synced)
    return ExportResponse(
        batch_id=req.batch_id,
        synced_count=synced_count,
        total_count=len(snapshots),
        snapshots=snap_responses,
        explanation=f"批次 {req.batch_id} 导出同步校验完成："
                    f"{synced_count}/{len(snapshots)} 条材料同步。"
                    f"{'存在未同步材料，请检查标注是否已反映到导出中。' if synced_count < len(snapshots) else '所有材料同步正常。'}",
    )


@app.get("/report/{material_id}", response_model=ReportResponse)
def get_report(material_id: str):
    store = _get_store()
    gen = ReportGenerator(store)
    content = gen.generate(material_id)
    return ReportResponse(
        material_id=material_id,
        report=content,
        explanation=f"已生成材料 {material_id} 的 Markdown 报告，含关键公式、单位换算和反例。",
    )


@app.get("/status/{batch_id}", response_model=BatchStatusResponse)
def get_batch_status(batch_id: str):
    store = _get_store()
    wf = WorkflowManager(store)
    info = wf.get_batch_status(batch_id)
    steps_summary = "、".join(
        f"{'✅' if v['completed'] else '⬜'}{k}"
        for k, v in info["steps"].items()
    )
    return BatchStatusResponse(
        batch_id=batch_id,
        steps=info["steps"],
        material_count=info["material_count"],
        trial_rule=info["trial_rule"],
        explanation=f"批次 {batch_id} 状态：{steps_summary}，共 {info['material_count']} 条材料。"
                    f"试用规则：{info['trial_rule']}",
    )


@app.on_event("shutdown")
def shutdown():
    global _store
    if _store is not None:
        _store.close()
        _store = None
