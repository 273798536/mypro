from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import json
import traceback
from .models import DeadLetter

from .database import get_db
from .models import ContractStatus, RoleType, SourceFileType, ImportStatus, DeadLetterStatus
from .schemas import (
    ContractCreate, ContractUpdate, ContractResponse,
    PaymentNodeCreate, PaymentNodeUpdate, PaymentNodeResponse,
    AcceptanceEmailCreate, AcceptanceEmailResponse,
    SupplementalAgreementCreate, SupplementalAgreementResponse,
    ImportSourceResponse, ChangeRecordResponse, AuditLogResponse,
    ManualJudgmentCreate, ManualJudgmentResponse,
    StatusTransitionRequest, ImportResponse, FreezeRequest,
    ExportRequest, ExportResponse, RoleViewResponse, ChangeAnalysisResponse,
    DeadLetterResponse, DeadLetterRetryResponse
)
from .services import (
    ContractService, PaymentNodeService, ChangeService, AuditService,
    ImportService, ManualJudgmentService, ExportService, RoleViewService,
    DeadLetterService
)
from .config import settings

router = APIRouter(prefix="/api/v1", tags=["contracts"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EXPORT_DIR, exist_ok=True)


@router.post("/contracts", response_model=ContractResponse, status_code=201)
def create_contract(contract_data: ContractCreate, db: Session = Depends(get_db)):
    existing = ContractService.get_contract_by_no(db, contract_data.contract_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"合同编号 {contract_data.contract_no} 已存在，请勿重复提交")
    try:
        return ContractService.create_contract(db, contract_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建合同失败: {str(e)}")


@router.get("/contracts", response_model=List[ContractResponse])
def list_contracts(
    skip: int = 0,
    limit: int = 100,
    status: Optional[ContractStatus] = None,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    contracts = ContractService.list_contracts(db, skip=skip, limit=limit, status=status)
    AuditService.create_audit_log(
        db=db,
        action="查询合同列表",
        action_detail=f"查询合同列表，筛选状态: {status}, 数量: {len(contracts)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        before_data={"status": status, "skip": skip, "limit": limit},
        after_data={"count": len(contracts)},
        is_readonly_access=True
    )
    db.commit()
    return contracts


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
def get_contract(
    contract_id: int,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    contract = ContractService.get_contract(db, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询合同详情",
        action_detail=f"查询合同 {contract.contract_no} 详情",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"contract_no": contract.contract_no, "status": contract.status},
        is_readonly_access=True
    )
    db.commit()
    return contract


@router.put("/contracts/{contract_id}", response_model=ContractResponse)
def update_contract(contract_id: int, update_data: ContractUpdate, db: Session = Depends(get_db)):
    try:
        contract = ContractService.update_contract(db, contract_id, update_data)
        if not contract:
            raise HTTPException(status_code=404, detail="合同不存在")
        return contract
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新合同失败: {str(e)}")


@router.post("/contracts/{contract_id}/status", response_model=ContractResponse)
def transition_status(contract_id: int, request: StatusTransitionRequest, db: Session = Depends(get_db)):
    success, message, contract = ContractService.transition_status(db, contract_id, request)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return contract


@router.post("/contracts/{contract_id}/freeze", response_model=ContractResponse)
def freeze_contract(contract_id: int, request: FreezeRequest, db: Session = Depends(get_db)):
    success, message, contract = ContractService.freeze_contract(
        db, contract_id, request.frozen_by, request.frozen_by_role, request.reason
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return contract


@router.post("/contracts/{contract_id}/unfreeze", response_model=ContractResponse)
def unfreeze_contract(contract_id: int, request: FreezeRequest, db: Session = Depends(get_db)):
    success, message, contract = ContractService.unfreeze_contract(
        db, contract_id, request.frozen_by, request.frozen_by_role, request.reason
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return contract


@router.post("/contracts/{contract_id}/payment-nodes", response_model=PaymentNodeResponse, status_code=201)
def create_payment_node(contract_id: int, node_data: PaymentNodeCreate, db: Session = Depends(get_db)):
    contract = ContractService.get_contract(db, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    if contract.is_frozen:
        raise HTTPException(status_code=400, detail="合同已冻结，无法添加节点")
    node_data.contract_id = contract_id
    return PaymentNodeService.create_payment_node(db, node_data)


@router.get("/contracts/{contract_id}/payment-nodes", response_model=List[PaymentNodeResponse])
def get_payment_nodes(
    contract_id: int,
    latest_only: bool = True,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    nodes = PaymentNodeService.get_nodes_by_contract(db, contract_id, latest_only=latest_only)
    contract = ContractService.get_contract(db, contract_id)
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询付款节点",
        action_detail=f"查询合同 {contract.contract_no if contract else contract_id} 的付款节点，数量: {len(nodes)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        before_data={"latest_only": latest_only},
        after_data={"node_count": len(nodes)},
        is_readonly_access=True
    )
    db.commit()
    return nodes


@router.put("/payment-nodes/{node_id}", response_model=PaymentNodeResponse)
def update_payment_node(node_id: int, update_data: PaymentNodeUpdate, db: Session = Depends(get_db)):
    success, message, node = PaymentNodeService.update_payment_node(db, node_id, update_data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return node


@router.get("/contracts/{contract_id}/changes", response_model=List[ChangeRecordResponse])
def get_contract_changes(
    contract_id: int,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    changes = ChangeService.get_changes_by_contract(db, contract_id)
    contract = ContractService.get_contract(db, contract_id)
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询变更记录",
        action_detail=f"查询合同 {contract.contract_no if contract else contract_id} 的变更记录，数量: {len(changes)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"change_count": len(changes)},
        is_readonly_access=True
    )
    db.commit()
    return changes


@router.get("/contracts/{contract_id}/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    contract_id: int,
    skip: int = 0,
    limit: int = 100,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    logs = AuditService.get_audit_logs(db, contract_id, skip=skip, limit=limit)
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询审计日志",
        action_detail=f"查询合同 {contract_id} 的审计日志，数量: {len(logs)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        before_data={"skip": skip, "limit": limit},
        after_data={"log_count": len(logs)},
        is_readonly_access=True
    )
    db.commit()
    return logs


@router.post("/import", response_model=ImportResponse)
async def import_file(
    file: UploadFile = File(...),
    file_type: SourceFileType = Form(...),
    upload_by: str = Form(...),
    contract_no: Optional[str] = Form(None),
    contract_name: Optional[str] = Form(None),
    force_import: bool = Form(False),
    db: Session = Depends(get_db),
    request: Request = None
):
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    safe_filename = file.filename.replace('/', '_').replace('\\', '_') if file.filename else 'unknown'
    file_path = os.path.join(settings.UPLOAD_DIR, f"{timestamp}_{safe_filename}")
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    contract_id = None
    if contract_no:
        contract = ContractService.get_contract_by_no(db, contract_no)
        if contract:
            contract_id = contract.id
        elif contract_name:
            from .schemas import ContractCreate
            contract_data = ContractCreate(
                contract_no=contract_no,
                contract_name=contract_name,
                created_by=upload_by,
                created_by_role=RoleType.CONTRACT_MANAGER
            )
            contract = ContractService.create_contract(db, contract_data)
            contract_id = contract.id

    import_source, is_duplicate, dup_message = ImportService.create_import_source(
        db, safe_filename, file_type, file_path, len(content), upload_by, contract_id, force_import
    )

    if is_duplicate:
        return ImportResponse(
            success=True,
            import_source_id=import_source.id,
            status=import_source.import_status,
            message=dup_message,
            is_duplicate=True,
            parsed_count=import_source.parsed_count,
            success_count=import_source.success_count,
            failed_count=import_source.failed_count
        )

    parsed_data = None
    parse_errors = []
    parse_metadata = None

    try:
        if file.content_type and 'json' in file.content_type:
            content_str = content.decode('utf-8')
            parsed_data = json.loads(content_str)
            parse_metadata = {"method": "direct_json_parse", "content_length": len(content)}
        else:
            parse_result = ImportService.parse_file(file_path, safe_filename, file_type)
            parsed_data = parse_result.data
            parse_errors = parse_result.errors
            parse_metadata = parse_result.metadata

    except json.JSONDecodeError as e:
        parse_errors = [f"JSON解析失败: {str(e)}，行号: {e.lineno}"]
        DeadLetterService.create_dead_letter(
            db=db,
            import_source_id=import_source.id,
            source_type="json_parse",
            source_data={"raw_content_preview": content[:1000].decode('utf-8', errors='ignore')},
            error_message=str(e),
            error_type="JSONDecodeError",
            stack_trace=traceback.format_exc()
        )
    except Exception as e:
        parse_errors = [f"文件解析失败: {str(e)}"]
        DeadLetterService.create_dead_letter(
            db=db,
            import_source_id=import_source.id,
            source_type="file_parse",
            source_data={"file_name": safe_filename, "file_type": file_type.value},
            error_message=str(e),
            error_type=type(e).__name__,
            stack_trace=traceback.format_exc()
        )

    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="文件导入",
        action_detail=f"导入文件 {safe_filename}, 类型: {file_type.value}, 是否重复: {is_duplicate}",
        operator=upload_by,
        operator_role=RoleType.CONTRACT_MANAGER,
        ip_address=request.client.host if request and request.client else None,
        after_data={"file_type": file_type.value, "file_size": len(content)}
    )
    db.commit()

    if contract_id is not None:
        success, errors, results = ImportService.parse_and_import(
            db, import_source.id, contract_id, parsed_data
        )
        all_errors = parse_errors + errors

        dead_letter_count = db.query(DeadLetter).filter(
            DeadLetter.import_source_id == import_source.id
        ).count()

        return ImportResponse(
            success=success and len(parse_errors) == 0,
            import_source_id=import_source.id,
            status=import_source.import_status,
            message="导入完成" if (success and len(parse_errors) == 0) else "导入存在错误",
            is_duplicate=False,
            parsed_count=import_source.parsed_count,
            success_count=import_source.success_count,
            failed_count=import_source.failed_count,
            dead_letter_count=dead_letter_count,
            errors=all_errors if all_errors else None,
            parse_metadata=parse_metadata
        )

    return ImportResponse(
        success=len(parse_errors) == 0,
        import_source_id=import_source.id,
        status=ImportStatus.PENDING,
        message="文件已上传，但未指定关联合同号，数据未入库",
        is_duplicate=False,
        errors=parse_errors if parse_errors else None,
        parse_metadata=parse_metadata
    )


@router.get("/import-sources", response_model=List[ImportSourceResponse])
def list_import_sources(
    contract_id: Optional[int] = None,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    from .models import ImportSource
    query = db.query(ImportSource)
    if contract_id:
        query = query.filter(ImportSource.contract_id == contract_id)
    sources = query.order_by(ImportSource.upload_time.desc()).all()
    AuditService.create_audit_log(
        db=db,
        action="查询导入源",
        action_detail=f"查询导入源列表，数量: {len(sources)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"count": len(sources)},
        is_readonly_access=True
    )
    db.commit()
    return sources


@router.post("/manual-judgments", response_model=ManualJudgmentResponse, status_code=201)
def create_manual_judgment(judgment_data: ManualJudgmentCreate, db: Session = Depends(get_db)):
    contract = ContractService.get_contract(db, judgment_data.contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return ManualJudgmentService.create_judgment(db, judgment_data)


@router.get("/contracts/{contract_id}/manual-judgments", response_model=List[ManualJudgmentResponse])
def get_manual_judgments(
    contract_id: int,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    judgments = ManualJudgmentService.get_judgments_by_contract(db, contract_id)
    contract = ContractService.get_contract(db, contract_id)
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询人工改判",
        action_detail=f"查询合同 {contract.contract_no if contract else contract_id} 的人工改判记录，数量: {len(judgments)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"judgment_count": len(judgments)},
        is_readonly_access=True
    )
    db.commit()
    return judgments


@router.post("/export", response_model=ExportResponse)
def export_data(request: ExportRequest, db: Session = Depends(get_db)):
    try:
        export_data, record_count = ExportService.export_contracts(
            db, contract_ids=request.contract_ids, mask_sensitive=request.mask_sensitive
        )

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        file_name = f"contract_export_{timestamp}.json"
        file_path = os.path.join(settings.EXPORT_DIR, file_name)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        export_record = ExportService.create_export_record(
            db,
            export_type=request.export_type,
            export_by=request.export_by,
            export_by_role=request.export_by_role,
            file_name=file_name,
            file_path=file_path,
            record_count=record_count,
            is_sensitive_masked=request.mask_sensitive,
            contract_ids=request.contract_ids,
            remark=request.remark
        )

        return ExportResponse(
            success=True,
            file_name=file_name,
            file_path=file_path,
            record_count=record_count,
            export_time=export_record.export_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/role-view/{role}", response_model=RoleViewResponse)
def get_role_view(
    role: RoleType,
    operator: str = Query("anonymous", description="操作人"),
    db: Session = Depends(get_db),
    request: Request = None
):
    view_data = RoleViewService.get_role_view(db, role)
    AuditService.create_audit_log(
        db=db,
        action="查询角色视图",
        action_detail=f"查询角色 {role.value} 的工作视图",
        operator=operator,
        operator_role=role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"pending_count": view_data["pending_count"], "total_count": view_data["total_count"]},
        is_readonly_access=True
    )
    db.commit()
    return view_data


@router.get("/contracts/{contract_id}/change-analysis", response_model=ChangeAnalysisResponse)
def get_change_analysis(
    contract_id: int,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.BUSINESS_HEAD, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    analysis = RoleViewService.get_change_analysis(db, contract_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="合同不存在")
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询变更分析",
        action_detail=f"查询合同变更分析报告，变更数: {analysis['total_changes']}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={
            "total_changes": analysis["total_changes"],
            "manual_revisions": analysis["manual_revisions"],
            "sensitive_changes": len(analysis["sensitive_field_changes"])
        },
        is_readonly_access=True
    )
    db.commit()
    return analysis


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_all_audit_logs(
    skip: int = 0,
    limit: int = 100,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    logs = AuditService.get_audit_logs(db, skip=skip, limit=limit)
    AuditService.create_audit_log(
        db=db,
        action="查询审计日志",
        action_detail=f"查询全局审计日志，数量: {len(logs)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"log_count": len(logs)},
        is_readonly_access=True
    )
    db.commit()
    return logs


@router.get("/manual-revisions", response_model=List[ChangeRecordResponse])
def list_manual_revisions(
    contract_id: Optional[int] = None,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.AUDITOR, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    revisions = ChangeService.get_manual_revisions(db, contract_id)
    AuditService.create_audit_log(
        db=db,
        contract_id=contract_id,
        action="查询人工改判记录",
        action_detail=f"查询人工改判记录，数量: {len(revisions)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"revision_count": len(revisions)},
        is_readonly_access=True
    )
    db.commit()
    return revisions


@router.get("/dead-letters", response_model=List[DeadLetterResponse])
def list_dead_letters(
    status: Optional[DeadLetterStatus] = None,
    import_source_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    operator: str = Query("anonymous", description="操作人"),
    operator_role: RoleType = Query(RoleType.ADMIN, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    dead_letters = DeadLetterService.list_dead_letters(db, status, import_source_id, skip, limit)
    AuditService.create_audit_log(
        db=db,
        action="查询死信队列",
        action_detail=f"查询死信队列，状态: {status}, 数量: {len(dead_letters)}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"count": len(dead_letters)},
        is_readonly_access=True
    )
    db.commit()
    return dead_letters


@router.post("/dead-letters/{dead_letter_id}/retry", response_model=DeadLetterRetryResponse)
def retry_dead_letter(
    dead_letter_id: int,
    operator: str = Query("admin", description="操作人"),
    operator_role: RoleType = Query(RoleType.ADMIN, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    success, message, dead_letter = DeadLetterService.retry_dead_letter(db, dead_letter_id)
    AuditService.create_audit_log(
        db=db,
        action="重试死信",
        action_detail=f"重试死信记录 {dead_letter_id}: {message}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"success": success, "message": message}
    )
    db.commit()
    return DeadLetterRetryResponse(
        success=success,
        message=message,
        dead_letter=dead_letter
    )


@router.post("/dead-letters/{dead_letter_id}/resolve", response_model=DeadLetterRetryResponse)
def resolve_dead_letter(
    dead_letter_id: int,
    resolution_note: str = Form(...),
    operator: str = Query("admin", description="操作人"),
    operator_role: RoleType = Query(RoleType.ADMIN, description="操作人角色"),
    db: Session = Depends(get_db),
    request: Request = None
):
    success, message, dead_letter = DeadLetterService.mark_resolved(
        db, dead_letter_id, operator, resolution_note
    )
    AuditService.create_audit_log(
        db=db,
        action="标记死信已解决",
        action_detail=f"标记死信 {dead_letter_id} 已解决: {resolution_note}",
        operator=operator,
        operator_role=operator_role,
        ip_address=request.client.host if request and request.client else None,
        after_data={"success": success, "message": message}
    )
    db.commit()
    return DeadLetterRetryResponse(
        success=success,
        message=message,
        dead_letter=dead_letter
    )
