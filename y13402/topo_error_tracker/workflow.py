import hashlib
import json
from datetime import datetime

from typing import Dict, List, Optional

from topo_error_tracker.models import (
    Edit,
    ExportSnapshot,
    Material,
    MaterialStatus,
    WorkflowState,
    WorkflowStep,
)
from topo_error_tracker.store import Store

TRIAL_RULE = (
    "规则：试用时按真实节奏走——先导入旧材料，再补备注，最后看导出有没有同步变化。"
    "每一步完成前，不能跳到下一步。"
)


class WorkflowManager:
    def __init__(self, store: Store):
        self.store = store

    def complete_import_step(self, batch_id: str, operator: Optional[str] = None) -> WorkflowState:
        ws = self.store.get_workflow_state(batch_id, WorkflowStep.IMPORT)
        if ws and ws.completed:
            return ws
        ws = WorkflowState(
            batch_id=batch_id,
            step=WorkflowStep.IMPORT,
            completed=True,
            timestamp=datetime.now(),
            operator=operator,
            note="旧材料导入完成",
        )
        self.store.save_workflow_state(ws)
        return ws

    def complete_annotate_step(self, batch_id: str, operator: Optional[str] = None) -> WorkflowState:
        import_state = self.store.get_workflow_state(batch_id, WorkflowStep.IMPORT)
        if not import_state or not import_state.completed:
            raise WorkflowStepOrderError(
                f"批次 {batch_id} 尚未完成导入步骤，不能跳到补备注。{TRIAL_RULE}"
            )
        ws = WorkflowState(
            batch_id=batch_id,
            step=WorkflowStep.ANNOTATE,
            completed=True,
            timestamp=datetime.now(),
            operator=operator,
            note="备注补充完成",
        )
        self.store.save_workflow_state(ws)
        return ws

    def check_export_sync(self, batch_id: str, operator: Optional[str] = None) -> List[ExportSnapshot]:
        annotate_state = self.store.get_workflow_state(batch_id, WorkflowStep.ANNOTATE)
        if not annotate_state or not annotate_state.completed:
            raise WorkflowStepOrderError(
                f"批次 {batch_id} 尚未完成备注步骤，不能校验导出同步。{TRIAL_RULE}"
            )
        materials = self.store.list_materials(batch_id)
        snapshots = []
        for mat in materials:
            snapshot = self._compute_export_snapshot(mat)
            self.store.save_export_snapshot(snapshot)
            snapshots.append(snapshot)

        ws = WorkflowState(
            batch_id=batch_id,
            step=WorkflowStep.EXPORT_CHECK,
            completed=True,
            timestamp=datetime.now(),
            operator=operator,
            note="导出同步校验完成",
        )
        self.store.save_workflow_state(ws)
        return snapshots

    def _compute_export_snapshot(self, material: Material) -> ExportSnapshot:
        edits = self.store.list_edits(material.id)
        drafts = self.store.list_draft_images(material.id)
        tracking = self.store.get_tracking_result(material.id)
        raw = self.store.read_raw_draft(material.id)

        content_parts = [material.original_text]
        for e in edits:
            content_parts.append(f"{e.field}:{e.new_value}")
        for d in drafts:
            content_parts.append(f"draft:{d.image_path}:{d.graph_visual_match}")
        if tracking:
            content_parts.append(tracking.explanation)
        content_hash = hashlib.sha256("|".join(content_parts).encode()).hexdigest()[:16]

        prev_export = self.store.get_latest_export(material.id)
        annotation_count = len(edits) + len(drafts)
        edit_count = len(edits)

        synced = True
        sync_details = None
        if prev_export:
            if prev_export.content_hash != content_hash:
                synced = False
                sync_details = (
                    f"内容哈希变化：上次 {prev_export.content_hash}，本次 {content_hash}。"
                    f"上次导出时标注数 {prev_export.annotation_count}，现在 {annotation_count}；"
                    f"上次编辑数 {prev_export.edit_count}，现在 {edit_count}。"
                )
        else:
            sync_details = "首次导出，无历史快照对比。"

        return ExportSnapshot(
            material_id=material.id,
            exported_at=datetime.now(),
            content_hash=content_hash,
            annotation_count=annotation_count,
            edit_count=edit_count,
            synced=synced,
            sync_details=sync_details,
        )

    def add_annotation(
        self,
        material_id: str,
        field: str,
        old_value: str,
        new_value: str,
        editor: str,
        reason: str,
    ) -> Edit:
        edit = Edit(
            material_id=material_id,
            field=field,
            old_value=old_value,
            new_value=new_value,
            editor=editor,
            edit_time=datetime.now(),
            reason=reason,
        )
        self.store.save_edit(edit)
        mat = self.store.get_material(material_id)
        if mat and mat.status == MaterialStatus.RAW:
            self.store.update_material_status(material_id, MaterialStatus.ANNOTATED)
        return edit

    def get_batch_status(self, batch_id: str) -> dict:
        import_state = self.store.get_workflow_state(batch_id, WorkflowStep.IMPORT)
        annotate_state = self.store.get_workflow_state(batch_id, WorkflowStep.ANNOTATE)
        export_state = self.store.get_workflow_state(batch_id, WorkflowStep.EXPORT_CHECK)
        materials = self.store.list_materials(batch_id)
        return {
            "batch_id": batch_id,
            "steps": {
                "import": {
                    "completed": import_state.completed if import_state else False,
                    "timestamp": import_state.timestamp.isoformat() if import_state else None,
                },
                "annotate": {
                    "completed": annotate_state.completed if annotate_state else False,
                    "timestamp": annotate_state.timestamp.isoformat() if annotate_state else None,
                },
                "export_check": {
                    "completed": export_state.completed if export_state else False,
                    "timestamp": export_state.timestamp.isoformat() if export_state else None,
                },
            },
            "material_count": len(materials),
            "trial_rule": TRIAL_RULE,
        }


class WorkflowStepOrderError(Exception):
    pass
