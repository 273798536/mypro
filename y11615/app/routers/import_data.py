from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
import io

from app.database import get_db
from app.models.models import ImportStrategy, DataSourceType
from app.schemas.schemas import ImportResult
from app.services.import_service import ImportService

router = APIRouter()


def read_excel_to_records(file: UploadFile) -> list:
    contents = file.file.read()
    df = pd.read_excel(io.BytesIO(contents))
    df = df.where(pd.notnull(df), None)
    records = df.to_dict('records')
    return records


def read_csv_to_records(file: UploadFile) -> list:
    contents = file.file.read()
    df = pd.read_csv(io.BytesIO(contents))
    df = df.where(pd.notnull(df), None)
    records = df.to_dict('records')
    return records


@router.post("/customers", response_model=ImportResult, summary="导入客户数据")
def import_customers(
    file: UploadFile = File(..., description="Excel或CSV文件"),
    strategy: ImportStrategy = Form(..., description="导入策略: ignore=忽略已存在, overwrite=覆盖, append=追加"),
    imported_by: str = Form("system", description="导入人"),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            records = read_excel_to_records(file)
        elif file.filename.endswith('.csv'):
            records = read_csv_to_records(file)
        else:
            raise HTTPException(status_code=400, detail="仅支持Excel(.xlsx, .xls)和CSV文件")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    service = ImportService(db)
    return service.import_customers(records, strategy, file.filename, imported_by)


@router.post("/contracts", response_model=ImportResult, summary="导入合同数据")
def import_contracts(
    file: UploadFile = File(..., description="Excel或CSV文件"),
    strategy: ImportStrategy = Form(..., description="导入策略"),
    imported_by: str = Form("system", description="导入人"),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            records = read_excel_to_records(file)
        elif file.filename.endswith('.csv'):
            records = read_csv_to_records(file)
        else:
            raise HTTPException(status_code=400, detail="仅支持Excel和CSV文件")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    service = ImportService(db)
    return service.import_contracts(records, strategy, file.filename, imported_by)


@router.post("/invoices", response_model=ImportResult, summary="导入发票数据")
def import_invoices(
    file: UploadFile = File(..., description="Excel或CSV文件"),
    strategy: ImportStrategy = Form(..., description="导入策略"),
    imported_by: str = Form("system", description="导入人"),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            records = read_excel_to_records(file)
        elif file.filename.endswith('.csv'):
            records = read_csv_to_records(file)
        else:
            raise HTTPException(status_code=400, detail="仅支持Excel和CSV文件")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    service = ImportService(db)
    return service.import_invoices(records, strategy, file.filename, imported_by)


@router.post("/receipts", response_model=ImportResult, summary="导入回款数据")
def import_receipts(
    file: UploadFile = File(..., description="Excel或CSV文件"),
    strategy: ImportStrategy = Form(..., description="导入策略"),
    imported_by: str = Form("system", description="导入人"),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            records = read_excel_to_records(file)
        elif file.filename.endswith('.csv'):
            records = read_csv_to_records(file)
        else:
            raise HTTPException(status_code=400, detail="仅支持Excel和CSV文件")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    service = ImportService(db)
    return service.import_receipts(records, strategy, file.filename, imported_by)


@router.post("/collection", response_model=ImportResult, summary="导入催收记录")
def import_collection(
    file: UploadFile = File(..., description="Excel或CSV文件"),
    strategy: ImportStrategy = Form(..., description="导入策略"),
    imported_by: str = Form("system", description="导入人"),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            records = read_excel_to_records(file)
        elif file.filename.endswith('.csv'):
            records = read_csv_to_records(file)
        else:
            raise HTTPException(status_code=400, detail="仅支持Excel和CSV文件")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    service = ImportService(db)
    return service.import_collection_records(records, strategy, file.filename, imported_by)


@router.post("/credit", response_model=ImportResult, summary="导入信用额度")
def import_credit(
    file: UploadFile = File(..., description="Excel或CSV文件"),
    strategy: ImportStrategy = Form(..., description="导入策略"),
    imported_by: str = Form("system", description="导入人"),
    db: Session = Depends(get_db)
):
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            records = read_excel_to_records(file)
        elif file.filename.endswith('.csv'):
            records = read_csv_to_records(file)
        else:
            raise HTTPException(status_code=400, detail="仅支持Excel和CSV文件")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    service = ImportService(db)
    return service.import_credit_limits(records, strategy, file.filename, imported_by)
