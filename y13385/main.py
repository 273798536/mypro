from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from models import (
    Task, TaskCreate, TaskStatus,
    Attachment, AttachmentCreate,
    Sample, SampleCreate,
    GrayscaleAbnormalRecord, GrayscaleAbnormalRecordCreate,
    JudgmentOverride, JudgmentOverrideCreate,
    Event, EventCreate, EventType,
    JudgmentResult,
    TaskTimeline, TaskConclusionDetail,
)
from db import (
    init_db, TaskDAO, AttachmentDAO, SampleDAO,
    GrayscaleAbnormalDAO, JudgmentOverrideDAO, EventDAO,
)
from service import DriftTrackerService

app = FastAPI(
    title="漂移监控任务追踪 API",
    description="供值班脚本稳定调用，追踪漂移评测任务的参数、失败原因、历史时间线",
    version="1.0.0",
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.post("/api/v1/tasks", response_model=Task, status_code=201,
          summary="创建漂移监控任务")
def create_task(data: TaskCreate) -> Task:
    return DriftTrackerService.create_task(data)


@app.get("/api/v1/tasks", response_model=List[Task],
         summary="列出任务（可按状态过滤）")
def list_tasks(status: Optional[TaskStatus] = Query(None),
               limit: int = Query(100, ge=1, le=500)) -> List[Task]:
    return TaskDAO.list(status=status, limit=limit)


@app.get("/api/v1/tasks/{task_id}", response_model=Task,
         summary="获取单个任务详情")
def get_task(task_id: str) -> Task:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return task


@app.post("/api/v1/tasks/{task_id}/start", response_model=Task,
          summary="标记任务开始评测")
def start_evaluation(task_id: str, operator: str = "platform_algo") -> Task:
    task = DriftTrackerService.start_evaluation(task_id, operator)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return task


@app.post("/api/v1/tasks/{task_id}/conclude", response_model=Task,
          summary="给出任务最终结论")
def conclude_task(task_id: str,
                  final_conclusion: JudgmentResult,
                  operator: str = "platform_algo",
                  note: Optional[str] = None) -> Task:
    task = DriftTrackerService.conclude_task(task_id, final_conclusion, operator, note)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return task


@app.post("/api/v1/tasks/{task_id}/close", response_model=Task,
          summary="关闭归档任务")
def close_task(task_id: str, operator: str = "platform_algo",
               note: Optional[str] = None) -> Task:
    task = DriftTrackerService.close_task(task_id, operator, note)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return task


@app.get("/api/v1/tasks/{task_id}/timeline", response_model=TaskTimeline,
         summary="获取任务完整时间线（事件+附件+样本+灰度异常+改判记录）")
def get_task_timeline(task_id: str) -> TaskTimeline:
    tl = DriftTrackerService.get_task_timeline(task_id)
    if not tl:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return tl


@app.get("/api/v1/tasks/{task_id}/conclusion-detail", response_model=TaskConclusionDetail,
         summary="获取结论细节：统计、拉偏样本、改判记录、最终附件")
def get_conclusion_detail(task_id: str) -> TaskConclusionDetail:
    detail = DriftTrackerService.get_conclusion_detail(task_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return detail


@app.get("/api/v1/tasks/{task_id}/original-eval",
         summary="追溯原始评测结果（改判前说法）")
def get_original_eval(task_id: str, sample_id: Optional[str] = None) -> Dict[str, Any]:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return DriftTrackerService.get_original_eval_result(task_id, sample_id)


@app.post("/api/v1/tasks/{task_id}/attachments", response_model=Attachment, status_code=201,
          summary="添加附件（含晚到附件）")
def add_attachment(task_id: str, data: AttachmentCreate,
                   operator: str = "system") -> Attachment:
    if data.task_id != task_id:
        raise HTTPException(status_code=400, detail="URL task_id 与 body.task_id 不一致")
    return DriftTrackerService.add_attachment(data, operator)


@app.get("/api/v1/tasks/{task_id}/attachments", response_model=List[Attachment],
         summary="列出任务全部附件")
def list_attachments(task_id: str) -> List[Attachment]:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return AttachmentDAO.list_by_task(task_id)


@app.post("/api/v1/tasks/{task_id}/attachments/{attachment_id}/link",
          summary="把晚到附件关联到任务结论")
def link_late_attachment(task_id: str, attachment_id: str,
                         operator: str = "platform_algo") -> Dict[str, Any]:
    ok = DriftTrackerService.link_late_attachment_to_conclusion(task_id, attachment_id, operator)
    if not ok:
        raise HTTPException(status_code=404, detail="附件不存在或不属于该任务")
    return {"ok": True, "attachment_id": attachment_id, "linked_to_conclusion": True}


@app.post("/api/v1/tasks/{task_id}/samples", response_model=Sample, status_code=201,
          summary="添加单条评测样本")
def add_sample(task_id: str, data: SampleCreate) -> Sample:
    if data.task_id != task_id:
        raise HTTPException(status_code=400, detail="URL task_id 与 body.task_id 不一致")
    return DriftTrackerService.add_sample(data)


@app.post("/api/v1/tasks/{task_id}/samples/bulk", response_model=List[Sample], status_code=201,
          summary="批量添加评测样本")
def add_samples_bulk(task_id: str, samples: List[SampleCreate]) -> List[Sample]:
    for s in samples:
        if s.task_id != task_id:
            raise HTTPException(status_code=400, detail=f"样本 {s.sample_id} 的 task_id 不匹配")
    return DriftTrackerService.add_samples_bulk(task_id, samples)


@app.get("/api/v1/tasks/{task_id}/samples", response_model=List[Sample],
         summary="列出任务全部样本")
def list_samples(task_id: str) -> List[Sample]:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return SampleDAO.list_by_task(task_id)


@app.post("/api/v1/tasks/{task_id}/samples/{sample_id}/judge", response_model=Sample,
          summary="判定单条样本，可标记为拉偏样本")
def judge_sample(task_id: str, sample_id: str,
                 judgment: JudgmentResult,
                 is_outlier: bool = False,
                 outlier_reason: Optional[str] = None,
                 judged_by: str = "auto_eval") -> Sample:
    updated = DriftTrackerService.judge_sample(
        task_id, sample_id, judgment, is_outlier, outlier_reason, judged_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"样本 {sample_id} 不存在")
    return updated


@app.post("/api/v1/tasks/{task_id}/grayscale-abnormals",
          response_model=GrayscaleAbnormalRecord, status_code=201,
          summary="记录灰度比例异常（单独拎出）")
def mark_grayscale_abnormal(task_id: str,
                            data: GrayscaleAbnormalRecordCreate) -> GrayscaleAbnormalRecord:
    if data.task_id != task_id:
        raise HTTPException(status_code=400, detail="URL task_id 与 body.task_id 不一致")
    return DriftTrackerService.mark_grayscale_abnormal(data)


@app.get("/api/v1/tasks/{task_id}/grayscale-abnormals",
         response_model=List[GrayscaleAbnormalRecord],
         summary="列出该任务所有灰度异常记录")
def list_grayscale_abnormals(task_id: str) -> List[GrayscaleAbnormalRecord]:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return GrayscaleAbnormalDAO.list_by_task(task_id)


@app.post("/api/v1/grayscale-abnormals/{record_id}/resolve",
          response_model=GrayscaleAbnormalRecord,
          summary="标记灰度异常已解决")
def resolve_grayscale_abnormal(record_id: str, resolution_note: str,
                               operator: str = "platform_algo") -> GrayscaleAbnormalRecord:
    record = DriftTrackerService.resolve_grayscale_abnormal(record_id, resolution_note, operator)
    if not record:
        raise HTTPException(status_code=404, detail=f"灰度异常记录 {record_id} 不存在")
    return record


@app.post("/api/v1/tasks/{task_id}/judgment-overrides",
          response_model=JudgmentOverride, status_code=201,
          summary="人工改判（自动留痕保留原判断）")
def override_judgment(task_id: str, data: JudgmentOverrideCreate) -> JudgmentOverride:
    if data.task_id != task_id:
        raise HTTPException(status_code=400, detail="URL task_id 与 body.task_id 不一致")
    return DriftTrackerService.override_judgment(data)


@app.get("/api/v1/tasks/{task_id}/judgment-overrides",
         response_model=List[JudgmentOverride],
         summary="列出该任务所有人工改判历史")
def list_judgment_overrides(task_id: str,
                            sample_id: Optional[str] = None) -> List[JudgmentOverride]:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return JudgmentOverrideDAO.list_by_task(task_id, sample_id)


@app.post("/api/v1/tasks/{task_id}/notes", response_model=Event, status_code=201,
          summary="添加备注/交接说明")
def add_note(task_id: str, message: str, operator: str = "platform_algo") -> Event:
    ev = DriftTrackerService.add_note(task_id, message, operator)
    if not ev:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return ev


@app.get("/api/v1/tasks/{task_id}/events", response_model=List[Event],
         summary="列出任务所有事件（可按类型过滤）")
def list_events(task_id: str, event_type: Optional[EventType] = None) -> List[Event]:
    task = TaskDAO.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"任务 {task_id} 不存在")
    return EventDAO.list_by_task(task_id, event_type)


@app.get("/healthz", summary="健康检查")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}
