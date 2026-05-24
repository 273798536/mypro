from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import json

from .database import get_db
from .models import ContractStatus, RoleType, SourceFileType, ImportStatus
from .schemas import (
    ContractCreate, ContractUpdate, ContractResponse,
    PaymentNodeCreate, PaymentNodeUpdate, PaymentNodeResponse,
    AcceptanceEmailCreate, AcceptanceEmailResponse,
    SupplementalAgreementCreate, SupplementalAgreementResponse,
    ImportSourceResponse, ChangeRecordResponse, AuditLogResponse,
    ManualJudgmentCreate, ManualJudgmentResponse,
    StatusTransitionRequest, ImportResponse, FreezeRequest,
    ExportRequest, ExportResponse, RoleViewResponse, ChangeAnalysisResponse
)
from .services import (
    ContractService, PaymentNodeService, ChangeService, AuditService,
    ImportService, ManualJudgmentService, ExportService, RoleViewService
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
    db: Session = Depends(get_db)
):
    return ContractService.list_contracts(db, skip=skip, limit=limit, status=status)


@router.get("/contracts/{contract_id}", response_model=ContractResponse)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = ContractService.get_contract(db, contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
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
def get_payment_nodes(contract_id: int, latest_only: bool = True, db: Session = Depends(get_db)):
    return PaymentNodeService.get_nodes_by_contract(db, contract_id, latest_only=latest_only)


@router.put("/payment-nodes/{node_id}", response_model=PaymentNodeResponse)
def update_payment_node(node_id: int, update_data: PaymentNodeUpdate, db: Session = Depends(get_db)):
    success, message, node = PaymentNodeService.update_payment_node(db, node_id, update_data)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return node


@router.get("/contracts/{contract_id}/changes", response_model=List[ChangeRecordResponse])
def get_contract_changes(contract_id: int, db: Session = Depends(get_db)):
    return ChangeService.get_changes_by_contract(db, contract_id)


@router.get("/contracts/{contract_id}/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(contract_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return AuditService.get_audit_logs(db, contract_id, skip=skip, limit=limit)


@router.post("/import", response_model=ImportResponse)
async def import_file(
    file: UploadFile = File(...),
    file_type: SourceFileType = Form(...),
    upload_by: str = Form(...),
    contract_no: Optional[str] = Form(None),
    contract_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    file_path = os.path.join(settings.UPLOAD_DIR, f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
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

    import_source = ImportService.create_import_source(
        db, file.filename, file_type, file_path, len(content), upload_by, contract_id
    )

    parsed_data = {}
    try:
        if file.content_type and 'json' in file.content_type:
            content_str = content.decode('utf-8')
            parsed_data = json.loads(content_str)
        else:
            parsed_data = {
                "payment_nodes": [
                    {
                        "node_name": "首付款",
                        "node_no": "P001",
                        "planned_amount": 50000.0,
                        "milestone": "合同签订"
                    }
                ]
            }
    except Exception as e:
        parsed_data = {"error": f"解析失败: {str(e)}"}

    if contract_id and parsed_data:
        success, errors, results = ImportService.parse_and_import(db, import_source.id, contract_id, parsed_data)
        return ImportResponse(
            success=success,
            import_source_id=import_source.id,
            status=import_source.import_status,
            message="导入完成" if success else "导入存在错误",
            parsed_count=import_source.parsed_count,
            success_count=import_source.success_count,
            failed_count=import_source.failed_count,
            errors=errors if errors else None
        )

    return ImportResponse(
        success=True,
        import_source_id=import_source.id,
        status=ImportStatus.PENDING,
        message="文件已上传，等待处理"
    )


@router.get("/import-sources", response_model=List[ImportSourceResponse])
def list_import_sources(contract_id: Optional[int] = None, db: Session = Depends(get_db)):
    from .models import ImportSource
    query = db.query(ImportSource)
    if contract_id:
        query = query.filter(ImportSource.contract_id == contract_id)
    return query.order_by(ImportSource.upload_time.desc()).all()


@router.post("/manual-judgments", response_model=ManualJudgmentResponse, status_code=201)
def create_manual_judgment(judgment_data: ManualJudgmentCreate, db: Session = Depends(get_db)):
    contract = ContractService.get_contract(db, judgment_data.contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return ManualJudgmentService.create_judgment(db, judgment_data)


@router.get("/contracts/{contract_id}/manual-judgments", response_model=List[ManualJudgmentResponse])
def get_manual_judgments(contract_id: int, db: Session = Depends(get_db)):
    return ManualJudgmentService.get_judgments_by_contract(db, contract_id)


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
def get_role_view(role: RoleType, db: Session = Depends(get_db)):
    view_data = RoleViewService.get_role_view(db, role)
    return view_data


@router.get("/contracts/{contract_id}/change-analysis", response_model=ChangeAnalysisResponse)
def get_change_analysis(contract_id: int, db: Session = Depends(get_db)):
    analysis = RoleViewService.get_change_analysis(db, contract_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="合同不存在")
    return analysis


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_all_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return AuditService.get_audit_logs(db, skip=skip, limit=limit)


@router.get("/manual-revisions", response_model=List[ChangeRecordResponse])
def list_manual_revisions(contract_id: Optional[int] = None, db: Session = Depends(get_db)):
    return ChangeService.get_manual_revisions(db, contract_id)
