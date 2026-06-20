from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import hashlib
from pathlib import Path

from .database import (
    FunnelSnapshot, TrainingLog, SampleJudgment, JudgmentHistory,
    ChangeHistory, FeatureMaterial, JudgmentExplanation
)
from .schemas import (
    FunnelSnapshotCreate, ThresholdConfig, SampleJudgmentUpdate,
    SnapshotCompareResult, LateArrivalResponse,
    SealMonthProcessResponse, FeatureMaterialUpload,
    ChangeHistoryResponse, FeatureMaterialResponse
)
from .config import settings


def _generate_snapshot_version(snapshot_name: str, model_version: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{snapshot_name}-{model_version}-{timestamp}"
    short_hash = hashlib.md5(raw.encode()).hexdigest()[:8]
    return f"v{timestamp}-{short_hash}"


def _save_snapshot_data(snapshot_id: int, samples: List[Dict[str, Any]]) -> str:
    data_dir = settings.SNAPSHOT_DATA_DIR
    data_dir.mkdir(parents=True, exist_ok=True)
    file_path = data_dir / f"snapshot_{snapshot_id}_data.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump({
            "snapshot_id": snapshot_id,
            "generated_at": datetime.now().isoformat(),
            "samples": samples
        }, f, ensure_ascii=False, indent=2)
    return str(file_path)


def _save_training_log_content(snapshot_id: int, batch_number: int,
                                 log_content: str) -> str:
    log_dir = settings.TRAINING_LOG_DIR
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_path = log_dir / f"snapshot_{snapshot_id}_batch{batch_number}_{timestamp}.log"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(log_content)
    return str(file_path)


def create_snapshot(db: Session, data: FunnelSnapshotCreate) -> FunnelSnapshot:
    version = _generate_snapshot_version(data.snapshot_name, data.model_version)
    threshold_dict = data.threshold_config.model_dump()

    snapshot = FunnelSnapshot(
        snapshot_name=data.snapshot_name,
        snapshot_version=version,
        model_version=data.model_version,
        threshold_config=threshold_dict,
        description=data.description,
        created_by=data.created_by,
        parent_snapshot_id=data.parent_snapshot_id,
        seal_month=data.seal_month,
        data_file_path=""
    )
    db.add(snapshot)
    db.flush()

    samples = data.initial_samples or []
    snapshot.data_file_path = _save_snapshot_data(snapshot.id, samples)

    for sample in samples:
        judgment = SampleJudgment(
            snapshot_id=snapshot.id,
            sample_id=sample.get("sample_id", f"sample_{datetime.now().timestamp()}_{snapshot.id}"),
            sample_content=sample.get("content"),
            model_prediction=sample.get("prediction", "unknown"),
            model_score=sample.get("score"),
            human_judgment=None,
            change_reason="initial_import"
        )
        db.add(judgment)

    if data.parent_snapshot_id:
        change = ChangeHistory(
            snapshot_id=snapshot.id,
            change_type="snapshot_fork",
            old_value=str(data.parent_snapshot_id),
            new_value=str(snapshot.id),
            changed_by=data.created_by,
            change_reason=f"从快照 #{data.parent_snapshot_id} 创建新版本快照",
            next_step_hint="请确认继承的人工判断是否需要更新"
        )
        db.add(change)

    db.commit()
    db.refresh(snapshot)
    return snapshot


def attach_training_log(db: Session, snapshot_id: int, log_data,
                       log_content: str) -> TrainingLog:
    snapshot = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise ValueError(f"快照 #{snapshot_id} 不存在")

    file_path = _save_training_log_content(snapshot_id, log_data.batch_number, log_content)

    training_log = TrainingLog(
        snapshot_id=snapshot_id,
        log_name=log_data.log_name,
        log_content_summary=log_data.log_content_summary,
        log_file_path=file_path,
        uploaded_by=log_data.uploaded_by,
        batch_number=log_data.batch_number,
        is_complete=log_data.is_complete,
        completeness_note=log_data.completeness_note
    )
    db.add(training_log)

    prev_count = db.query(TrainingLog).filter(TrainingLog.snapshot_id == snapshot_id).count()
    change = ChangeHistory(
        snapshot_id=snapshot_id,
        change_type="training_log_attached",
        field_name="training_log",
        old_value=f"已有{prev_count}份日志" if prev_count > 0 else None,
        new_value=f"新增第{log_data.batch_number}批: {log_data.log_name}",
        changed_by=log_data.uploaded_by,
        change_reason=f"关联训练日志第 {log_data.batch_number} 批: {log_data.log_content_summary[:100]}",
        next_step_hint=(
            "如日志不完整，请继续上传剩余批次；"
            "待全部完成后，可基于完整日志重跑模型对比结果。"
            if not log_data.is_complete
            else "训练日志已全部凑齐，可开始重跑快照对比。"
        )
    )
    db.add(change)

    db.commit()
    db.refresh(training_log)
    return training_log


def update_threshold_with_judgment_protection(db: Session, snapshot_id: int,
                                         new_threshold: ThresholdConfig,
                                         updated_by: str,
                                         update_reason: str) -> Dict[str, Any]:
    snapshot = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise ValueError(f"快照 #{snapshot_id} 不存在")

    old_threshold = snapshot.threshold_config
    new_threshold_dict = new_threshold.model_dump()

    judgments = db.query(SampleJudgment).filter(
        SampleJudgment.snapshot_id == snapshot_id
    ).all()

    locked_samples = []
    rejudged_samples = []
    affected_sample_ids = []

    for j in judgments:
        old_judgment = j.human_judgment
        if j.is_manual_locked and j.human_judgment:
            locked_samples.append({
                "sample_id": j.sample_id,
                "locked_judgment": j.human_judgment,
                "lock_reason": j.lock_reason
            })
            continue

        score = j.model_score or 0.0
        new_prediction = _apply_threshold(score, new_threshold_dict)

        if new_prediction != j.model_prediction:
            affected_sample_ids.append(j.sample_id)
            j.previous_judgment = j.model_prediction
            j.model_prediction = new_prediction
            j.change_reason = f"阈值更新: {update_reason[:100]}"
            rejudged_samples.append(SnapshotCompareResult(
                sample_id=j.sample_id,
                old_judgment=old_judgment,
                new_judgment=new_prediction,
                old_score=j.model_score,
                new_score=j.model_score,
                judgment_changed=(old_judgment != new_prediction) if old_judgment else False,
                explanation=f"模型预测变更: 阈值从{old_threshold}调整为{new_threshold_dict}",
                key_factors=["threshold_change"]
            ))

    snapshot.threshold_config = new_threshold_dict

    change = ChangeHistory(
        snapshot_id=snapshot_id,
        change_type="threshold_update",
        field_name="threshold_config",
        old_value=json.dumps(old_threshold, ensure_ascii=False),
        new_value=json.dumps(new_threshold_dict, ensure_ascii=False),
        changed_by=updated_by,
        change_reason=update_reason,
        affected_samples=affected_sample_ids,
        next_step_hint=(
            f"本次阈值更新影响 {len(affected_sample_ids)} 条样本，"
            f"其中 {len(locked_samples)} 条已人工锁定未被覆盖。"
            f"请人工复核受影响样本的判断。"
            if locked_samples
            else f"本次阈值更新影响 {len(affected_sample_ids)} 条样本，请逐一复核。"
        )
    )
    db.add(change)

    db.commit()
    db.refresh(snapshot)

    return {
        "snapshot": snapshot,
        "rejudged_samples": rejudged_samples,
        "locked_samples_protected": locked_samples,
        "total_affected": len(affected_sample_ids),
        "total_protected": len(locked_samples)
    }


def _apply_threshold(score: float, threshold: Dict[str, Any]) -> str:
    score_thresh = threshold.get("score_threshold", 0.5)
    recall_thresh = threshold.get("recall_threshold", 0.0)

    if score >= score_thresh + recall_thresh:
        return "positive"
    elif score >= score_thresh:
        return "borderline"
    else:
        return "negative"


def update_human_judgment(db: Session, snapshot_id: int,
                        judgment_data: SampleJudgmentUpdate,
                        is_temporary: bool = False,
                        editor_role: str = "evaluator") -> SampleJudgment:
    snapshot = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise ValueError(f"快照 #{snapshot_id} 不存在")

    judgment = db.query(SampleJudgment).filter(
        SampleJudgment.snapshot_id == snapshot_id,
        SampleJudgment.sample_id == judgment_data.sample_id
    ).first()

    if not judgment:
        judgment = SampleJudgment(
            snapshot_id=snapshot_id,
            sample_id=judgment_data.sample_id,
            model_prediction="unknown",
            change_reason="manual_create"
        )
        db.add(judgment)
        db.flush()

    old_judgment = judgment.human_judgment

    if old_judgment and judgment.is_manual_locked and not judgment_data.is_manual_locked:
        pass
    else:
        judgment.human_judgment = judgment_data.human_judgment
        judgment.judged_by = judgment_data.judged_by
        judgment.judged_at = datetime.utcnow()
        judgment.judgment_note = judgment_data.judgment_note
        judgment.is_manual_locked = judgment_data.is_manual_locked
        judgment.lock_reason = judgment_data.lock_reason
        if old_judgment:
            judgment.previous_judgment = old_judgment
        judgment.change_reason = judgment_data.change_reason or "人工更新判断"

    if old_judgment != judgment_data.human_judgment:
        hist = JudgmentHistory(
            judgment_id=judgment.id,
            old_judgment=old_judgment,
            new_judgment=judgment_data.human_judgment,
            changed_by=judgment_data.judged_by,
            change_reason=judgment_data.change_reason or "人工修改判断",
            is_temporary_edit=is_temporary,
            editor_role=editor_role
        )
        db.add(hist)

        change = ChangeHistory(
            snapshot_id=snapshot_id,
            change_type="human_judgment_update",
            field_name="human_judgment",
            old_value=old_judgment,
            new_value=judgment_data.human_judgment,
            changed_by=judgment_data.judged_by,
            change_reason=(
                f"样本 {judgment_data.sample_id} 判断变更"
                + ("（临时修改，交接班请留意）" if is_temporary else "")
            ),
            affected_samples=[judgment_data.sample_id],
            next_step_hint=(
                "此为临时修改，下一班评测人员请重新确认该样本判断。"
                if is_temporary
                else None
            )
        )
        db.add(change)

    db.commit()
    db.refresh(judgment)
    return judgment


def attach_feature_material(db: Session, snapshot_id: int,
                           material_data, file_content: bytes,
                           filename: str) -> FeatureMaterial:
    snapshot = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise ValueError(f"快照 #{snapshot_id} 不存在")

    data_dir = settings.SNAPSHOT_DATA_DIR / f"snapshot_{snapshot_id}" / "materials"
    data_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_name = Path(filename).name
    file_path = data_dir / f"{timestamp}_{safe_name}"
    with open(file_path, "wb") as f:
        f.write(file_content)

    is_late = material_data.is_late_arrival
    next_action = None
    affected_count = 0
    impact_desc = material_data.impact_description

    if is_late:
        judgments = db.query(SampleJudgment).filter(
            SampleJudgment.snapshot_id == snapshot_id
        ).all()
        affected_count = max(1, min(len(judgments) // 5, 10))

        next_action = (
            f"【下一步操作指引】\n"
            f"1. 请打开附件「{material_data.material_name}」检查迟到特征内容；\n"
            f"2. 在快照 #{snapshot_id} 中筛选受影响的约 {affected_count} 条样本；\n"
            f"3. 对每条样本重新评估模型预测是否合理；\n"
            f"4. 如需调整判断，务必勾选「人工锁定」防止后续重跑覆盖；\n"
            f"5. 在变更备注中注明：基于迟到特征「{material_data.material_name}」复核。"
        )
        if not impact_desc:
            impact_desc = (
                f"该特征材料在快照 #{snapshot_id} 生成后才到达，"
                f"预计影响约 {affected_count} 条样本的召回判断。"
            )

    material = FeatureMaterial(
        snapshot_id=snapshot_id,
        material_name=material_data.material_name,
        material_type=material_data.material_type,
        file_path=str(file_path),
        uploaded_by=material_data.uploaded_by,
        is_late_arrival=is_late,
        impact_description=impact_desc,
        next_action=next_action,
        affected_samples_count=affected_count
    )
    db.add(material)
    db.flush()

    change_type = "late_feature_material" if is_late else "feature_material_attached"
    change_reason = impact_desc or f"上传材料: {material_data.material_name}"
    change = ChangeHistory(
        snapshot_id=snapshot_id,
        change_type=change_type,
        field_name="feature_material",
        old_value=None,
        new_value=f"新增材料: {material_data.material_name}" + ("（迟到）" if is_late else ""),
        changed_by=material_data.uploaded_by,
        change_reason=change_reason,
        next_step_hint=next_action if is_late else "材料已归档，如需重跑快照请手动触发。"
    )
    db.add(change)

    db.commit()
    db.refresh(material)
    return material


def explain_judgment_change(db: Session, sample_id: str,
                            old_snapshot_id: int,
                            new_snapshot_id: int) -> JudgmentExplanation:
    old_snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == old_snapshot_id).first()
    new_snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == new_snapshot_id).first()
    if not old_snap or not new_snap:
        raise ValueError("快照不存在")

    old_judgment = db.query(SampleJudgment).filter(
        SampleJudgment.snapshot_id == old_snapshot_id,
        SampleJudgment.sample_id == sample_id
    ).first()
    new_judgment = db.query(SampleJudgment).filter(
        SampleJudgment.snapshot_id == new_snapshot_id,
        SampleJudgment.sample_id == sample_id
    ).first()

    if not old_judgment or not new_judgment:
        raise ValueError(f"样本 {sample_id} 在指定快照中不存在")

    old_j = old_judgment.human_judgment or old_judgment.model_prediction
    new_j = new_judgment.human_judgment or new_judgment.model_prediction

    old_thresh = old_snap.threshold_config
    new_thresh = new_snap.threshold_config

    key_factors = []
    threshold_diffs = {}
    for k in set(list(old_thresh.keys()) + list(new_thresh.keys())):
        ov = old_thresh.get(k)
        nv = new_thresh.get(k)
        if ov != nv:
            threshold_diffs[k] = {"old": ov, "new": nv}
    if threshold_diffs:
        key_factors.append("阈值配置变更")

    score_diff = (new_judgment.model_score or 0) - (old_judgment.model_score or 0)
    if abs(score_diff) > 0.01:
        key_factors.append(f"模型分数变化({score_diff:+.3f})")

    if new_judgment.sample_content and new_judgment.sample_content != old_judgment.sample_content:
        key_factors.append("样本特征内容更新")

    if new_judgment.change_reason and new_judgment.change_reason != old_judgment.change_reason:
        key_factors.append(f"备注: {new_judgment.change_reason}")

    explanation_parts = [
        f"样本 {sample_id} 的判断从「{old_j}」变更为「{new_j}」。",
    ]
    if threshold_diffs:
        thr_text = "；".join(
            f"{k}: {v['old']} → {v['new']}" for k, v in threshold_diffs.items()
        )
        explanation_parts.append(f"阈值调整: {thr_text}。")
    if abs(score_diff) > 0.01:
        explanation_parts.append(
            f"模型预测分数从 {old_judgment.model_score:.3f} 变为 {new_judgment.model_score:.3f}"
            f"（{score_diff:+.3f}）。"
        )
    if old_judgment.is_manual_locked:
        explanation_parts.append(f"旧版本中该样本被人工锁定为「{old_j}」。")
    if new_judgment.judgment_note:
        explanation_parts.append(f"人工备注: {new_judgment.judgment_note}。")

    explanation = "\n".join(explanation_parts)

    existing = db.query(JudgmentExplanation).filter(
        JudgmentExplanation.sample_id == sample_id,
        JudgmentExplanation.old_snapshot_id == old_snapshot_id,
        JudgmentExplanation.new_snapshot_id == new_snapshot_id
    ).first()

    if existing:
        existing.explanation_text = explanation
        existing.key_factors = key_factors
        existing.threshold_differences = threshold_diffs
        db.commit()
        db.refresh(existing)
        return existing

    expl = JudgmentExplanation(
        sample_id=sample_id,
        old_snapshot_id=old_snapshot_id,
        new_snapshot_id=new_snapshot_id,
        old_judgment=old_j,
        new_judgment=new_j,
        explanation_text=explanation,
        key_factors=key_factors,
        threshold_differences=threshold_diffs,
        feature_differences=None
    )
    db.add(expl)
    db.commit()
    db.refresh(expl)
    return expl


def seal_month_process(db: Session, seal_month: str,
                       created_by: str,
                       old_snapshot_id: int,
                       late_material_data: Optional[Dict[str, Any]] = None,
                       late_file_content: Optional[bytes] = None,
                       late_filename: Optional[str] = None) -> SealMonthProcessResponse:
    old_snap = db.query(FunnelSnapshot).filter(FunnelSnapshot.id == old_snapshot_id).first()
    if not old_snap:
        raise ValueError(f"旧快照 #{old_snapshot_id} 不存在")

    old_judgments = {
        j.sample_id: j for j in db.query(SampleJudgment).filter(
            SampleJudgment.snapshot_id == old_snapshot_id
        ).all()
    }

    stage1_create = FunnelSnapshotCreate(
        snapshot_name=f"{old_snap.snapshot_name}-{seal_month}-封账",
        model_version=old_snap.model_version,
        threshold_config=ThresholdConfig(**old_snap.threshold_config),
        description=f"{seal_month}月底封账快照 - 导入旧材料",
        created_by=created_by,
        parent_snapshot_id=old_snapshot_id,
        seal_month=seal_month,
        initial_samples=None
    )
    new_snap = create_snapshot(db, stage1_create)

    for old_j in old_judgments.values():
        new_j = SampleJudgment(
            snapshot_id=new_snap.id,
            sample_id=old_j.sample_id,
            sample_content=old_j.sample_content,
            model_prediction=old_j.model_prediction,
            model_score=old_j.model_score,
            human_judgment=old_j.human_judgment,
            judged_by=old_j.judged_by,
            judged_at=old_j.judged_at,
            is_manual_locked=old_j.is_manual_locked,
            lock_reason=old_j.lock_reason,
            judgment_note=old_j.judgment_note,
            change_reason=f"从 #{old_snapshot_id} 继承"
        )
        db.add(new_j)
    db.flush()

    all_changes = db.query(ChangeHistory).filter(
        ChangeHistory.snapshot_id == new_snap.id
    ).order_by(ChangeHistory.changed_at).all()
    new_materials = []
    rejudged_list = []

    summary_parts = [
        f"【{seal_month}月底封账流程完成。",
        f"阶段1: 已从快照 #{old_snapshot_id} 导入 {len(old_judgments)} 条样本记录。"
    ]
    action_items = []

    if late_material_data and late_file_content and late_filename:
        from .schemas import FeatureMaterialUpload
        mat_upload = FeatureMaterialUpload(**late_material_data)
        mat_upload.is_late_arrival = True
        material = attach_feature_material(
            db, new_snap.id, mat_upload, late_file_content, late_filename
        )
        new_materials.append(material)
        summary_parts.append(
            f"阶段2: 补录迟到附件「{material.material_name}」，"
            f"影响约 {material.affected_samples_count} 条样本。"
        )
        if material.next_action:
            for line in material.next_action.split("\n"):
                if line.startswith(tuple("0123456789")):
                    action_items.append(line)

        updated = update_threshold_with_judgment_protection(
            db, new_snap.id,
            ThresholdConfig(**new_snap.threshold_config),
            created_by,
            f"补录迟到材料后重跑 - {material.material_name}"
        )
        rejudged_list.extend(updated["rejudged_samples"])

        if updated["locked_samples_protected"]:
            summary_parts.append(
                f"保护了 {updated['total_protected']} 条人工锁定样本未被覆盖。"
            )

    final_changes = db.query(ChangeHistory).filter(
        ChangeHistory.snapshot_id == new_snap.id
    ).order_by(ChangeHistory.changed_at).all()

    new_snap.status = "sealed"
    db.commit()
    db.refresh(new_snap)

    summary_parts.append(
        f"最终状态: 共 {len(final_changes)} 条变更记录，"
        f"封账完成。"
    )

    return SealMonthProcessResponse(
        stage="sealed",
        snapshot_id=new_snap.id,
        changes_summary=[
            ChangeHistoryResponse.model_validate(c) for c in final_changes
        ],
        new_materials=[
            FeatureMaterialResponse.model_validate(m) for m in new_materials
        ],
        rejudged_samples=rejudged_list,
        final_status="sealed",
        human_readable_summary="\n".join(summary_parts),
        action_required=action_items or ["封账完成，无需额外操作。"]
    )


def get_snapshot_changes(db: Session, snapshot_id: int) -> List[ChangeHistory]:
    return db.query(ChangeHistory).filter(
        ChangeHistory.snapshot_id == snapshot_id
    ).order_by(desc(ChangeHistory.changed_at)).all()


def get_judgment_histories(db: Session, snapshot_id: int,
                            sample_id: Optional[str] = None) -> List[JudgmentHistory]:
    query = db.query(JudgmentHistory).join(SampleJudgment).filter(
        SampleJudgment.snapshot_id == snapshot_id
    )
    if sample_id:
        query = query.filter(SampleJudgment.sample_id == sample_id)
    return query.order_by(desc(JudgmentHistory.changed_at)).all()


def list_snapshots(db: Session, skip: int = 0, limit: int = 50,
                    seal_month: Optional[str] = None) -> List[FunnelSnapshot]:
    query = db.query(FunnelSnapshot)
    if seal_month:
        query = query.filter(FunnelSnapshot.seal_month == seal_month)
    return query.order_by(desc(FunnelSnapshot.created_at)).offset(skip).limit(limit).all()
