from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import List, Optional
import uuid

from app.models.matrix import BatchJob, MatrixStatus, ChangeSource, MatrixRecord, MatrixData
from app.services.matrix_service import (
    create_batch_job, add_record_to_batch, reprocess_batch,
    manual_override_record, get_out_of_bound_records, get_empty_records,
    process_matrix_record
)
from app.services.file_service import parse_file
from app.services.report_service import generate_markdown_report
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/api/batches", tags=["batches"])

_batches: dict = {}


def _init_demo_data():
    from app.models.matrix import JumpReason

    batch = create_batch_job("6月第二周矩阵条件数验算", threshold=20)
    batch.gray_release_note = "本次灰度发布优化了空集合检测逻辑，新增了越界记录隔离功能，所有状态变更均可溯源。"

    matrices = [
        ("产品销量矩阵", [[1, 2, 3], [4, 5, 6], [7, 8, 10]], "data_6月.csv"),
        ("单位矩阵A", [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "data_6月.csv"),
        ("空集合测试", [], "data_6月.csv"),
        ("奇异矩阵B", [[1, 2], [2, 4]], "data_6月.csv"),
        ("排班矩阵C", [[2, 1], [1, 2]], "data_6月.csv"),
        ("库存矩阵D", [[3, 1, 2], [1, 3, 1], [2, 1, 3]], "data_6月.csv"),
        ("晚到附件矩阵", [[5, 2], [2, 5]], "晚到_补充数据.csv"),
        ("空集合-待补充", [[]], "data_6月.csv"),
    ]

    for name, values, source in matrices:
        if not values or (len(values) == 1 and len(values[0]) == 0):
            matrix_data = MatrixData(rows=0, cols=0, values=[])
        else:
            matrix_data = MatrixData(
                rows=len(values),
                cols=len(values[0]),
                values=values
            )

        record = MatrixRecord(
            id=f"demo_{name}",
            name=name,
            matrix=matrix_data,
            source_file=source
        )
        add_record_to_batch(batch, record)

    reprocess_batch(batch, threshold=20)

    for record in batch.records:
        if record.name == "奇异矩阵B":
            manual_override_record(record, MatrixStatus.OUT_OF_BOUND, "老叶", "经复核，该矩阵虽奇异但需标记关注")
            break

    for record in batch.records:
        if record.name == "晚到附件矩阵" and record.jump_analysis:
            record.jump_analysis.has_jump = True
            record.jump_analysis.reason = JumpReason.LATE_ATTACHMENT
            record.jump_analysis.description = "晚到附件导致结果跳变"
            record.jump_analysis.previous_condition = 3.0
            record.jump_analysis.change_ratio = 0.8
            break

    _batches[batch.id] = batch
    return batch


_init_demo_data()


def _get_batch(batch_id: str) -> BatchJob:
    batch = _batches.get(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.post("", response_model=BatchJob)
async def create_batch(
    name: str = Query(..., description="批次名称"),
    threshold: Optional[float] = Query(None, description="条件数阈值")
):
    batch = create_batch_job(name, threshold)
    _batches[batch.id] = batch
    return batch


@router.get("", response_model=List[BatchJob])
async def list_batches():
    return list(_batches.values())


@router.get("/{batch_id}", response_model=BatchJob)
async def get_batch(batch_id: str):
    return _get_batch(batch_id)


@router.post("/{batch_id}/upload", response_model=BatchJob)
async def upload_files(batch_id: str, files: List[UploadFile] = File(...)):
    batch = _get_batch(batch_id)

    for file in files:
        content = await file.read()
        try:
            records = parse_file(content, file.filename)
            for record in records:
                add_record_to_batch(batch, record)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    return batch


@router.post("/{batch_id}/process", response_model=BatchJob)
async def process_batch(
    batch_id: str,
    threshold: Optional[float] = Query(None, description="条件数阈值"),
    threshold_changed: bool = Query(False, description="是否阈值变更"),
    unit_changed: bool = Query(False, description="是否单位变更"),
    has_late_attachment: bool = Query(False, description="是否有晚到附件")
):
    batch = _get_batch(batch_id)

    source = ChangeSource.AUTO_CALC
    if threshold_changed:
        source = ChangeSource.THRESHOLD_CHANGE
    elif unit_changed:
        source = ChangeSource.UNIT_CHANGE
    elif has_late_attachment:
        source = ChangeSource.LATE_ATTACHMENT

    if threshold is None:
        threshold = batch.threshold

    reprocess_batch(
        batch,
        threshold=threshold,
        source=source,
        threshold_changed=threshold_changed,
        unit_changed=unit_changed,
        has_late_attachment=has_late_attachment
    )

    return batch


@router.post("/{batch_id}/records/{record_id}/override", response_model=BatchJob)
async def override_record(
    batch_id: str,
    record_id: str,
    new_status: MatrixStatus = Query(..., description="新状态"),
    operator: str = Query(..., description="操作人"),
    reason: str = Query(..., description="改判原因")
):
    batch = _get_batch(batch_id)

    record = None
    for r in batch.records:
        if r.id == record_id:
            record = r
            break

    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    manual_override_record(record, new_status, operator, reason)

    return batch


@router.get("/{batch_id}/out-of-bound", response_model=List)
async def list_out_of_bound(batch_id: str):
    batch = _get_batch(batch_id)
    return get_out_of_bound_records(batch)


@router.get("/{batch_id}/empty", response_model=List)
async def list_empty(batch_id: str):
    batch = _get_batch(batch_id)
    return get_empty_records(batch)


@router.get("/{batch_id}/report.md", response_class=PlainTextResponse)
async def get_report(batch_id: str):
    batch = _get_batch(batch_id)
    report = generate_markdown_report(batch)
    return PlainTextResponse(
        content=report,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{batch.name}_报告.md"'}
    )


@router.patch("/{batch_id}/gray-note", response_model=BatchJob)
async def update_gray_note(batch_id: str, note: str = Query(..., description="灰度发布说明")):
    batch = _get_batch(batch_id)
    batch.gray_release_note = note
    return batch
