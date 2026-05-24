from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import (
    BatchImportRequest,
    BatchImportResponse,
    ImportRecord,
    PaginatedResponse
)
from app.models.models import DataSourceType
from app.services.import_service import (
    batch_import_records,
    get_import_records_by_batch,
    get_import_record,
    list_import_records
)

router = APIRouter()


@router.post("/batch", response_model=BatchImportResponse)
def batch_import(
    request: BatchImportRequest,
    db: Session = Depends(get_db)
):
    try:
        batch_no, total_count, success_count, failed_records = batch_import_records(
            db=db,
            source_type=request.source_type,
            source_file=request.source_file,
            records=request.records,
            import_batch_no=request.import_batch_no,
            imported_by=request.imported_by
        )
        
        return BatchImportResponse(
            success=True,
            import_batch_no=batch_no,
            total_count=total_count,
            success_count=success_count,
            failed_count=len(failed_records),
            failed_records=failed_records
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/batch/{batch_no}", response_model=list[ImportRecord])
def get_batch_records(
    batch_no: str,
    db: Session = Depends(get_db)
):
    records = get_import_records_by_batch(db, batch_no)
    return records


@router.get("/records/{record_id}", response_model=ImportRecord)
def get_single_import_record(
    record_id: int,
    db: Session = Depends(get_db)
):
    record = get_import_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="导入记录不存在")
    return record


@router.get("/records", response_model=PaginatedResponse)
def list_import_records_api(
    source_type: Optional[DataSourceType] = None,
    import_batch_no: Optional[str] = None,
    is_used: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    items, total = list_import_records(
        db=db,
        source_type=source_type,
        import_batch_no=import_batch_no,
        is_used=is_used,
        page=page,
        page_size=page_size
    )
    
    items_dict = [
        {
            "id": item.id,
            "source_file": item.source_file,
            "source_type": item.source_type.value,
            "original_row_number": item.original_row_number,
            "original_data": item.original_data,
            "parsed_data": item.parsed_data,
            "import_batch_no": item.import_batch_no,
            "imported_by": item.imported_by,
            "imported_at": item.imported_at,
            "is_used": item.is_used,
            "remark": item.remark
        }
        for item in items
    ]
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items_dict
    )
