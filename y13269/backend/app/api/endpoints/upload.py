from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import uuid
import shutil

from app.core.config import settings
from app.models.store import db
from app.services.data_import import incremental_import, parse_excel_or_csv
from app.services.merge_service import detect_merge_candidates
from app.services.bad_data import detect_bad_data

router = APIRouter(prefix="/upload", tags=["上传与导入"])

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


@router.post("/files")
async def upload_files(files: List[UploadFile] = File(...)):
    """上传 Excel/CSV 文件并执行增量导入

    接收一个或多个文件，保存到 settings.UPLOAD_DIR/batch_id/ 目录下，
    然后依次调用数据解析、增量导入、归并候选检测和坏数据检测服务，
    最终返回批次信息和导入统计。

    Args:
        files: 上传的文件列表，支持 .xlsx/.xls/.csv 格式

    Returns:
        dict: 包含 batch_id、batches（各文件批次信息）、import_summary（导入统计汇总）、
              merge_candidates_count（归并候选组数）、bad_data_count（坏数据条数）

    Raises:
        HTTPException: 400 - 文件格式不支持
        HTTPException: 500 - 文件保存或数据处理失败
    """
    batch_id = str(uuid.uuid4())
    batch_dir = settings.UPLOAD_DIR / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: List[Path] = []
    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式: {file.filename}，仅支持 {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )

        safe_filename = Path(file.filename).name
        dest = batch_dir / safe_filename
        try:
            with dest.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_paths.append(dest)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"保存文件 {file.filename} 失败: {str(e)}"
            )
        finally:
            await file.close()

    if not saved_paths:
        raise HTTPException(status_code=400, detail="没有有效文件被上传")

    total_new = 0
    total_updated = 0
    total_imported = 0
    total_rows = 0
    batch_infos = []

    try:
        for file_path in saved_paths:
            file_batch_id = f"{batch_id}-{Path(file_path).stem}"
            records_data, _ = parse_excel_or_csv(str(file_path))
            file_size = file_path.stat().st_size
            batch, processed_records = incremental_import(
                records_data, file_path.name, file_batch_id, file_size
            )
            detect_bad_data(processed_records)
            total_new += batch.new_records
            total_updated += batch.updated_records
            total_imported += batch.imported_rows
            total_rows += batch.total_rows
            batch_infos.append(batch)

        merge_groups = detect_merge_candidates()
        bad_data_results = detect_bad_data()

        db.save_to_disk()

        return {
            "batch_id": batch_id,
            "batches": batch_infos,
            "import_summary": {
                "total_files": len(saved_paths),
                "total_rows": total_rows,
                "imported_rows": total_imported,
                "new_records": total_new,
                "updated_records": total_updated,
            },
            "merge_candidates_count": len(merge_groups),
            "bad_data_count": len(bad_data_results),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"数据处理失败: {str(e)}"
        )
