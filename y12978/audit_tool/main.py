from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Optional, List
import os

from .database import get_db
from . import schemas, models, audit_service

app = FastAPI(
    title="时区字段统一审计工具",
    description="支持备份校验、权限审计、可追溯链路查询",
    version="1.0.0"
)

static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/api/audit/backup-check", response_model=schemas.BackupCheckResult, summary="日常入口: 备份校验")
def backup_check(db: Session = Depends(get_db)):
    return audit_service.run_backup_check(db)


@app.get("/api/audit/permission", response_model=schemas.PermissionAuditResult, summary="月底/课前入口: 权限审计")
def permission_audit(db: Session = Depends(get_db)):
    return audit_service.run_permission_audit(db)


@app.get("/api/audit/records", response_model=List[schemas.AuditConclusionItem], summary="审计结论列表(可按状态筛选)")
def list_records(
    status: Optional[str] = Query(None, description="pass/index_invalid/duplicate/timezone_mismatch/pending"),
    audit_type: Optional[str] = Query(None, description="backup/permission/timezone"),
    source_table: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return audit_service.list_conclusions(db, status=status, audit_type=audit_type, source_table=source_table)


@app.get("/api/audit/trace/{conclusion_id}", response_model=schemas.TraceChain, summary="追溯链路: 结论→来源→处理记录→数据字典")
def trace_chain(conclusion_id: int, db: Session = Depends(get_db)):
    chain = audit_service.build_trace_chain(db, conclusion_id)
    if not chain:
        raise HTTPException(status_code=404, detail="结论不存在")
    return chain


@app.get("/api/audit/timezone-compare/{source_record_id}", response_model=schemas.AuditConclusionItem, summary="时区字段比对")
def timezone_compare(source_record_id: int, db: Session = Depends(get_db)):
    result = audit_service.compare_timezone(db, source_record_id)
    if not result:
        raise HTTPException(status_code=404, detail="源记录不存在")
    return result


@app.post("/api/audit/deduplicate", summary="检测重复结论(防止同一件事两份结论)")
def deduplicate(db: Session = Depends(get_db)):
    count = audit_service.detect_duplicate_conclusions(db)
    return {"marked_duplicates": count}


@app.get("/api/source/records", response_model=List[schemas.SourceRecordItem], summary="源数据记录(含原始行号、来源备注)")
def list_sources(
    source_table: Optional[str] = None,
    import_batch: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return audit_service.list_source_records(db, source_table=source_table, import_batch=import_batch)


@app.get("/api/dictionary", response_model=List[schemas.DataDictionaryItem], summary="数据字典(点回去看字段期望时区)")
def list_dict(
    table_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return audit_service.list_dictionary(db, table_name=table_name)


@app.post("/api/dictionary", response_model=schemas.DataDictionaryItem, summary="新增数据字典条目")
def create_dict(item: schemas.DataDictionaryCreate, db: Session = Depends(get_db)):
    d = models.DataDictionary(**item.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return schemas.DataDictionaryItem.model_validate(d)


@app.post("/api/source/record", response_model=schemas.SourceRecordItem, summary="新增源数据记录(含行号、文件、备注)")
def create_source(item: schemas.SourceRecordCreate, db: Session = Depends(get_db)):
    s = models.SourceRecord(**item.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return schemas.SourceRecordItem.model_validate(s)


@app.post("/api/process/log", response_model=schemas.ProcessLogItem, summary="新增处理日志(导入/补录/去重)")
def create_process_log(item: schemas.ProcessLogCreate, db: Session = Depends(get_db)):
    p = models.ProcessLog(**item.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return schemas.ProcessLogItem.model_validate(p)


@app.post("/api/audit/conclusion", response_model=schemas.AuditConclusionItem, summary="新增审计结论")
def create_conclusion(item: schemas.AuditConclusionCreate, db: Session = Depends(get_db)):
    c = models.AuditConclusion(**item.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return schemas.AuditConclusionItem.model_validate(c)
