from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional, List
from io import BytesIO
from datetime import datetime
import json
import os

from database import (
    SessionLocal, init_db,
    STATUS_CHOICES, STATUS_EXPORT_DESCRIPTIONS,
    PROCESSING_STATUS_CHOICES, TRACE_STAGE_CHOICES
)
import schemas
import services
from excel_io import export_trials_to_excel, export_single_detail, import_from_records

app = FastAPI(
    title="贝叶斯先验参数试算系统",
    description=(
        "投研助理阿乔的贝叶斯先验参数试算系统。\n\n"
        "核心能力：\n"
        "- 历史答案与权重修改记录关联（改权重必须记录参考了哪个历史答案）\n"
        "- 状态一致性：接口返回的status与导出截图说明文字同源\n"
        "- 保留历史答案来源和处理状态，字段名前后不一也没关系\n"
        "- 重复样本标记（筛选/详情/导出全链路留标记）\n"
        "- 追溯线索（数字从哪来，用人话写，可讲给不看代码的人听）\n"
        "- 导出瞬间快照：页面状态与文件说法保持一致\n"
        "- 项目经理交接：无需问人即可知道材料在哪、异常在哪、怎么重新导出"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============ 全局枚举/字典接口（前端无需硬编码） ============

@app.get("/api/dicts", tags=["字典"], summary="获取状态码/阶段等字典（前后端一致）")
def get_dicts():
    """供前端获取所有枚举字典，保证前后端说法一致"""
    return {
        "status": [
            {"code": k, "label": v, "export_description": STATUS_EXPORT_DESCRIPTIONS[k]}
            for k, v in STATUS_CHOICES.items()
        ],
        "processing_status": [
            {"code": k, "label": v}
            for k, v in PROCESSING_STATUS_CHOICES.items()
        ],
        "trace_stage": [
            {"code": k, "label": v}
            for k, v in TRACE_STAGE_CHOICES.items()
        ],
    }


@app.get("/api/directories", tags=["交接指引"],
         summary="项目经理交接指引：材料在哪、异常在哪、怎么重新导出")
def get_directories():
    """
    项目经理接手系统时的导航指引（无需问开发）：
    - 原始材料放哪
    - 在哪看异常/重复样本
    - 如何重新导出
    """
    return {
        "project_handover": {
            "title": "贝叶斯先验参数试算 - 项目经理交接指引",
            "sections": [
                {
                    "title": "📂 材料存放位置",
                    "items": [
                        "接口 POST /api/trials/batch-import 可批量上传，自动记录source_filename和source_batch_no",
                        "原始字段名映射保存在 field_mapping_snapshot，原始内容保存在 raw_data_snapshot",
                        "项目经理交来的历史答案通过 POST /api/trials/{id}/historical-answers 录入，"
                        "完整保留 original_field_names（哪怕前后不一）和 raw_answer_payload",
                        "数据库文件路径: backend/data/bayesian_prior.db （SQLite，可直接查看）",
                    ],
                },
                {
                    "title": "⚠️ 异常与重复样本查看位置",
                    "items": [
                        "列表筛选 is_duplicate=true 查看所有重复样本（GET /api/trials?is_duplicate=true）",
                        "详情页 weight_changes 权重改动次数过多或幅度过大提示异常",
                        "详情页 historical_answers 处理状态 pending 的需要人工确认",
                        "status=rejected 已驳回记录需要关注并调整",
                    ],
                },
                {
                    "title": "📤 重新导出操作",
                    "items": [
                        "批量导出（带截图说明Sheet）：POST /api/trials/export",
                        "单条详情全量导出（含历史答案/权重变更/追溯/导出记录）：GET /api/trials/{id}/export-detail",
                        "所有导出历史在 GET /api/export-records 可查，每次导出都会快照当时状态、权重、重复标记",
                        "导出文件的『截图说明』Sheet 与接口 status 返回的状态文字同源，保证一致",
                    ],
                },
                {
                    "title": "🔍 给不看代码的人讲数字从哪来",
                    "items": [
                        "详情页 trace_records 是『人话版』时间线，按阶段（材料→预处理→计算→调整→定稿）排列",
                        "每条 trace 都有 narrative 字段，可直接读给业务同事听",
                        "配合 evidence_ref 可定位到原始文件名/单元格/消息链接",
                    ],
                },
                {
                    "title": "🔗 关键接口一览",
                    "items": [
                        "列表/筛选: GET /api/trials",
                        "创建: POST /api/trials",
                        "详情(含所有关联): GET /api/trials/{id}",
                        "更新(权重/状态自动记录日志): PUT /api/trials/{id}",
                        "批量导入: POST /api/trials/batch-import",
                        "历史答案CRUD: /api/trials/{id}/historical-answers",
                        "追溯线索: /api/trials/{id}/traces",
                        "批量导出: POST /api/trials/export",
                        "单条详情导出: GET /api/trials/{id}/export-detail",
                        "查重检测: POST /api/trials/{id}/check-duplicate",
                    ],
                },
            ],
        }
    }


# ============ 汇总统计 ============

@app.get("/api/summary", tags=["统计"], summary="首页汇总统计")
def summary(db: Session = Depends(get_db)):
    return services.summary(db)


# ============ 试算主接口 ============

@app.post("/api/trials", tags=["试算主表"], response_model=schemas.TrialCalculationOut,
          summary="创建试算（自动计算后验/自动查重/自动加追溯线索）")
def create_trial(data: schemas.TrialCalculationCreate, db: Session = Depends(get_db)):
    t = services.create_trial(db, data)
    return services.enrich_trial_labels(t)


@app.get("/api/trials", tags=["试算主表"], response_model=schemas.TrialCalculationListResponse,
         summary="试算列表（支持状态/重复样本/来源批次筛选）")
def list_trials(
    keyword: Optional[str] = Query(None, description="关键词搜索（编号/项目/参数/来源文件）"),
    status: Optional[str] = Query(None, description="状态码 draft/pending/approved/rejected/exported"),
    project_name: Optional[str] = Query(None),
    is_duplicate: Optional[bool] = Query(None, description="是否只看重复样本"),
    source_batch_no: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    items, total = services.list_trials(
        db, page=page, page_size=page_size, keyword=keyword,
        status=status, project_name=project_name,
        is_duplicate=is_duplicate, source_batch_no=source_batch_no,
        sort_by=sort_by, sort_order=sort_order,
    )
    return {
        "items": [services.enrich_trial_labels(t) for t in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@app.get("/api/trials/{trial_id}", tags=["试算主表"],
         summary="试算详情（含所有关联记录：权重变更/状态变更/历史答案/追溯/导出）")
def get_trial(trial_id: int, db: Session = Depends(get_db)):
    t = services.get_trial(db, trial_id)
    if not t:
        raise HTTPException(404, "试算不存在")
    return services.enrich_trial_detail(db, t)


@app.get("/api/trials/no/{trial_no}", tags=["试算主表"],
         summary="按试算编号查询")
def get_trial_by_no(trial_no: str, db: Session = Depends(get_db)):
    t = services.get_trial_by_no(db, trial_no)
    if not t:
        raise HTTPException(404, "试算不存在")
    return services.enrich_trial_detail(db, t)


@app.put("/api/trials/{trial_id}", tags=["试算主表"],
         summary="更新试算（权重变更自动记日志+关联历史答案/状态变更自动记日志）")
def update_trial(trial_id: int, data: schemas.TrialCalculationUpdate,
                 db: Session = Depends(get_db)):
    t = services.update_trial(db, trial_id, data)
    if not t:
        raise HTTPException(404, "试算不存在")
    return services.enrich_trial_labels(t)


@app.post("/api/trials/batch-import", tags=["试算主表"],
          summary="批量导入（保留原始字段名映射和原始数据，字段名前后不一也没关系）")
async def batch_import(
    source_filename: str = Form(...),
    source_batch_no: Optional[str] = Form(None),
    source_uploader: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None, description="上传Excel/CSV自动解析"),
    records_json: Optional[str] = Form(None, description="JSON字符串数组，可选（无文件时直接传）"),
    field_mapping_json: Optional[str] = Form(None, description="字段映射JSON: {原始字段:标准字段}"),
    db: Session = Depends(get_db),
):
    """
    批量导入流程：
    1. 优先读 file（Excel/CSV），否则用 records_json
    2. 用 field_mapping_json 将原始字段名映射为标准字段（哪怕字段名前后不一也能处理）
    3. 每条记录保留 raw_data_snapshot 和 field_mapping_snapshot
    """
    import pandas as _pd

    field_mapping = {}
    if field_mapping_json:
        try:
            field_mapping = json.loads(field_mapping_json)
        except Exception as e:
            raise HTTPException(400, f"field_mapping_json解析失败: {e}")

    raw_records = []
    if file:
        content = await file.read()
        try:
            if file.filename.endswith(".csv"):
                df = _pd.read_csv(BytesIO(content))
            else:
                df = _pd.read_excel(BytesIO(content))
            raw_records = df.where(_pd.notnull(df), None).to_dict(orient="records")
        except Exception as e:
            raise HTTPException(400, f"文件解析失败: {e}")
    elif records_json:
        try:
            raw_records = json.loads(records_json)
        except Exception as e:
            raise HTTPException(400, f"records_json解析失败: {e}")
    else:
        raise HTTPException(400, "请上传文件或提供records_json")

    converted = import_from_records(raw_records, field_mapping)

    created = []
    errors = []
    for idx, item in enumerate(converted):
        try:
            std = item["standardized"]
            required = ["project_name", "parameter_name", "prior_alpha", "prior_beta"]
            missing = [k for k in required if k not in std]
            if missing:
                raise ValueError(f"缺少必填字段（映射后）: {missing}")

            create_data = schemas.TrialCalculationCreate(
                project_name=std["project_name"],
                parameter_name=std["parameter_name"],
                description=std.get("description"),
                prior_alpha=float(std["prior_alpha"]),
                prior_beta=float(std["prior_beta"]),
                weight=float(std.get("weight", 1.0)) or 1.0,
                sample_success=int(std.get("sample_success", 0) or 0),
                sample_total=int(std.get("sample_total", 0) or 0),
                source_batch_no=source_batch_no or std.get("source_batch_no"),
                source_filename=source_filename or std.get("source_filename"),
                source_uploader=source_uploader or std.get("source_uploader"),
                raw_data_snapshot=item["raw_payload"],
                field_mapping_snapshot=item["reverse_mapping"],
                created_by=source_uploader,
            )
            t = services.create_trial(db, create_data)
            created.append({
                "row": idx + 1,
                "trial_id": t.id,
                "trial_no": t.trial_no,
                "is_duplicate": t.is_duplicate,
            })
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e), "raw": item["raw_payload"]})

    return {
        "total": len(raw_records),
        "created_count": len(created),
        "error_count": len(errors),
        "created": created,
        "errors": errors,
        "field_mapping_used": field_mapping,
        "source_filename": source_filename,
        "source_batch_no": source_batch_no,
    }


@app.post("/api/trials/{trial_id}/check-duplicate", tags=["重复样本"],
          summary="对指定试算执行重复样本检测")
def check_duplicate(trial_id: int, db: Session = Depends(get_db)):
    t = services.get_trial(db, trial_id)
    if not t:
        raise HTTPException(404, "试算不存在")
    info = services.detect_duplicate_for_new(db, t)
    if info:
        return {
            "checked_id": t.id,
            "checked_trial_no": t.trial_no,
            "total_matches": 1,
            "duplicates_found": [info],
        }
    return {
        "checked_id": t.id,
        "checked_trial_no": t.trial_no,
        "total_matches": 0,
        "duplicates_found": [],
    }


@app.post("/api/trials/{trial_id}/mark-duplicate", tags=["重复样本"],
          summary="人工标记为重复样本")
def mark_duplicate(trial_id: int, duplicate_of_id: int, reason: str,
                   operator: Optional[str] = None, db: Session = Depends(get_db)):
    t = services.manual_mark_duplicate(db, trial_id, duplicate_of_id, reason, operator)
    if not t:
        raise HTTPException(404, "试算或主样本不存在")
    return services.enrich_trial_labels(t)


# ============ 历史答案接口 ============

@app.post("/api/trials/{trial_id}/historical-answers", tags=["历史答案"],
          summary="给某试算添加历史答案（完整保留原始字段，哪怕前后不一）")
def add_historical_answer(trial_id: int, data: schemas.HistoricalAnswerCreate,
                          db: Session = Depends(get_db)):
    ha = services.add_historical_answer(db, trial_id, data)
    if not ha:
        raise HTTPException(404, "试算不存在")
    return {
        "id": ha.id,
        "trial_id": ha.trial_id,
        "answer_source": ha.answer_source,
        "answer_batch": ha.answer_batch,
        "original_field_names": ha.original_field_names,
        "standardized_field_map": ha.standardized_field_map,
        "answer_value": ha.answer_value,
        "answer_confidence": ha.answer_confidence,
        "processing_status": ha.processing_status,
        "processing_status_label": PROCESSING_STATUS_CHOICES.get(
            ha.processing_status, ha.processing_status
        ),
        "processing_remark": ha.processing_remark,
        "raw_answer_payload": ha.raw_answer_payload,
        "created_by": ha.created_by,
        "created_at": ha.created_at,
    }


@app.get("/api/trials/{trial_id}/historical-answers", tags=["历史答案"],
         summary="查询某试算的历史答案列表")
def list_historical_answers(trial_id: int,
                            processing_status: Optional[str] = None,
                            db: Session = Depends(get_db)):
    items = services.list_historical_answers(db, trial_id, processing_status)
    return [
        {
            "id": h.id,
            "trial_id": h.trial_id,
            "answer_source": h.answer_source,
            "answer_batch": h.answer_batch,
            "original_field_names": h.original_field_names,
            "standardized_field_map": h.standardized_field_map,
            "answer_value": h.answer_value,
            "answer_confidence": h.answer_confidence,
            "processing_status": h.processing_status,
            "processing_status_label": PROCESSING_STATUS_CHOICES.get(
                h.processing_status, h.processing_status
            ),
            "processing_remark": h.processing_remark,
            "raw_answer_payload": h.raw_answer_payload,
            "created_by": h.created_by,
            "created_at": h.created_at,
            "adopted_at": h.adopted_at,
            "weight_change_used_count": len(h.weight_changes),
        }
        for h in items
    ]


@app.put("/api/historical-answers/{answer_id}", tags=["历史答案"],
         summary="更新历史答案的处理状态（映射/采纳/忽略）")
def update_historical_answer(answer_id: int, data: schemas.HistoricalAnswerUpdate,
                             db: Session = Depends(get_db)):
    ha = services.update_historical_answer(db, answer_id, data)
    if not ha:
        raise HTTPException(404, "历史答案不存在")
    return {
        "id": ha.id,
        "processing_status": ha.processing_status,
        "processing_status_label": PROCESSING_STATUS_CHOICES.get(
            ha.processing_status, ha.processing_status
        ),
        "processing_remark": ha.processing_remark,
        "adopted_at": ha.adopted_at,
    }


# ============ 追溯线索接口 ============

@app.post("/api/trials/{trial_id}/traces", tags=["追溯线索"],
          summary="添加追溯线索（数字从哪来，用人话讲给业务听）")
def add_trace(trial_id: int, data: schemas.TraceRecordCreate,
              db: Session = Depends(get_db)):
    t = services.add_trace(db, trial_id, data)
    if not t:
        raise HTTPException(404, "试算不存在")
    return {
        "id": t.id,
        "trace_stage": t.trace_stage,
        "trace_stage_label": TRACE_STAGE_CHOICES.get(t.trace_stage, t.trace_stage),
        "narrative": t.narrative,
        "evidence_ref": t.evidence_ref,
        "operated_at": t.operated_at,
    }


@app.get("/api/trials/{trial_id}/traces", tags=["追溯线索"],
         summary="按时间顺序获取追溯线索（彩排讲故事用）")
def list_traces(trial_id: int, db: Session = Depends(get_db)):
    t = services.get_trial(db, trial_id)
    if not t:
        raise HTTPException(404, "试算不存在")
    items = services.list_traces(db, trial_id)
    return [
        {
            "id": x.id,
            "trace_stage": x.trace_stage,
            "trace_stage_label": TRACE_STAGE_CHOICES.get(x.trace_stage, x.trace_stage),
            "field_name": x.field_name,
            "field_value_before": x.field_value_before,
            "field_value_after": x.field_value_after,
            "narrative": x.narrative,
            "evidence_ref": x.evidence_ref,
            "operator": x.operator,
            "operated_at": x.operated_at,
        }
        for x in items
    ]


# ============ 导出接口（状态一致性核心） ============

@app.post("/api/trials/export", tags=["导出"],
          summary="批量导出试算（含截图说明Sheet，状态文字与接口完全一致）")
def export_trials(
    trial_ids: List[int],
    data: schemas.ExportRequest,
    db: Session = Depends(get_db),
):
    trials = []
    for tid in trial_ids:
        t = services.get_trial(db, tid)
        if t:
            trials.append(services.enrich_trial_labels(t))
    if not trials:
        raise HTTPException(400, "没有可导出的试算")

    # 为每条试算创建导出记录（快照当时状态，保证一致性）
    export_filename = (
        f"贝叶斯先验参数试算_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.xlsx"
    )
    for tid in trial_ids:
        services.create_export_record(db, tid, data, export_filename)

    caption = data.caption_override or ""
    content = export_trials_to_excel(trials, data.export_type, caption)

    # 同时保存到文件目录
    export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "data", "exports")
    os.makedirs(export_dir, exist_ok=True)
    file_path = os.path.join(export_dir, export_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    return StreamingResponse(
        BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{export_filename}"
        },
    )


@app.get("/api/trials/{trial_id}/export-detail", tags=["导出"],
         summary="单条详情全量导出（含历史答案/权重变更/追溯/导出记录）")
def export_detail(trial_id: int, db: Session = Depends(get_db)):
    t = services.get_trial(db, trial_id)
    if not t:
        raise HTTPException(404, "试算不存在")
    detail = services.enrich_trial_detail(db, t)

    export_filename = (
        f"{detail['trial_no']}_详情导出_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.xlsx"
    )
    # 记录导出瞬间的快照
    services.create_export_record(
        db, trial_id,
        schemas.ExportRequest(export_type="detail", export_format="xlsx",
                              exported_by="system"),
        export_filename,
    )

    content = export_single_detail(detail)

    export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "data", "exports")
    os.makedirs(export_dir, exist_ok=True)
    file_path = os.path.join(export_dir, export_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    return StreamingResponse(
        BytesIO(content),
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{export_filename}"
        },
    )


@app.get("/api/export-records", tags=["导出"],
         summary="查询所有导出记录（每次导出都快照了当时的状态/权重/重复标记）")
def list_export_records(trial_id: Optional[int] = None,
                        db: Session = Depends(get_db)):
    items = services.list_export_records(db, trial_id)
    return [
        {
            "id": e.id,
            "trial_id": e.trial_id,
            "trial_no": e.trial.trial_no if e.trial else None,
            "export_type": e.export_type,
            "export_filename": e.export_filename,
            "export_status_label": e.export_status_label,
            "export_status_description": e.export_status_description,
            "status_at_export": e.status_at_export,
            "is_duplicate_at_export": e.is_duplicate_at_export,
            "weight_at_export": e.weight_at_export,
            "parameters_snapshot": e.parameters_snapshot,
            "export_screenshot_caption": e.export_screenshot_caption,
            "exported_by": e.exported_by,
            "exported_at": e.exported_at,
        }
        for e in items
    ]


@app.get("/api/exports/{filename}", tags=["导出"],
         summary="下载历史导出文件")
def download_export_file(filename: str):
    export_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "data", "exports")
    file_path = os.path.join(export_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "文件不存在")
    return FileResponse(
        file_path,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        filename=filename,
    )


# ============ 健康检查 & DEMO数据 ============

@app.get("/healthz", tags=["系统"])
def healthz():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.post("/api/seed-demo-data", tags=["系统"],
          summary="生成演示数据（方便试用）")
def seed_demo_data(db: Session = Depends(get_db)):
    """一键生成演示项目、重复样本、历史答案、权重修改"""
    import random
    projects = ["A系列消费贷模型", "B系列小微企业评分", "C系列车险定价"]
    params = ["首期违约率先验", "30天转化率先验", "报案频率先验", "赔付率先验"]
    people = ["阿乔", "项目经理A", "项目经理B", "数据组小陈"]

    created_ids = []
    for i in range(8):
        p = projects[i % len(projects)]
        param = params[i % len(params)]
        pa = round(random.uniform(1.0, 15.0), 2)
        pb = round(random.uniform(5.0, 80.0), 2)
        s = random.randint(5, 200)
        n = s + random.randint(50, 1500)
        t = services.create_trial(db, schemas.TrialCalculationCreate(
            project_name=p,
            parameter_name=param,
            description=f"演示数据-{i+1}",
            prior_alpha=pa,
            prior_beta=pb,
            weight=round(random.uniform(0.5, 2.0), 2),
            sample_success=s,
            sample_total=n,
            source_filename=f"演示数据_batch{(i%3)+1}.xlsx",
            source_batch_no=f"BATCH-2026-00{i%3+1}",
            source_uploader=people[i % len(people)],
            created_by=people[i % len(people)],
        ))
        created_ids.append(t.id)

        # 随机加历史答案
        if i % 2 == 0:
            hist_val = round(t.posterior_mean * random.uniform(0.8, 1.2), 6)
            services.add_historical_answer(db, t.id, schemas.HistoricalAnswerCreate(
                answer_source=people[(i+1) % len(people)],
                answer_batch=f"HIST-2025-Q{(i%4)+1}",
                original_field_names=["先验参数", "历史值", "参考值", "置信水平"],
                standardized_field_map={
                    "先验参数": param, "历史值": hist_val,
                    "参考值": f"去年同期{param}", "置信水平": 0.85,
                },
                answer_value=hist_val,
                answer_confidence=round(random.uniform(0.6, 0.95), 2),
                processing_status=schemas.ProcessingStatusEnum.MAPPED if i % 4 else schemas.ProcessingStatusEnum.ADOPTED,
                processing_remark="来自历史项目，仅供参考" if i % 4 else "已采纳作为权重调整依据",
                raw_answer_payload={
                    "字段一": param,
                    "Value历史项目答案": hist_val,
                    "备注（项目经理手写）": "去年Q4做过类似项目",
                    "字段名前后不一正常": True,
                },
                created_by=people[(i+2) % len(people)],
            ))

    # 手动制造一个重复样本
    first = services.get_trial(db, created_ids[0])
    if first:
        dup = services.create_trial(db, schemas.TrialCalculationCreate(
            project_name=first.project_name,
            parameter_name=first.parameter_name,
            prior_alpha=first.prior_alpha,
            prior_beta=first.prior_beta,
            weight=first.weight,
            sample_success=first.sample_success,
            sample_total=first.sample_total,
            source_filename="重复导入_误操作.xlsx",
            created_by="系统自测",
        ))

    # 模拟一次权重修改（关联历史答案）
    t2 = services.get_trial(db, created_ids[1])
    if t2 and t2.historical_answers:
        services.update_trial(db, t2.id, schemas.TrialCalculationUpdate(
            weight=round(t2.weight * 1.3, 2),
            weight_change_reason="参考去年同参数先验答案，提高权重",
            weight_change_historical_answer_id=t2.historical_answers[0].id,
            updated_by="阿乔",
        ))

    # 模拟状态流转
    for cid in created_ids[:3]:
        services.update_trial(db, cid, schemas.TrialCalculationUpdate(
            status=schemas.StatusEnum.PENDING,
            status_remark="提交项目经理审核",
            updated_by="阿乔",
        ))
    services.update_trial(db, created_ids[0], schemas.TrialCalculationUpdate(
        status=schemas.StatusEnum.APPROVED,
        status_remark="参数合理，先验设定符合业务预期",
        updated_by="项目经理A",
    ))

    return {"message": "演示数据已生成", "total_created": len(created_ids)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
