from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.security import require_roles
from app.models import UserRole
from app.export_service import ExportService

router = APIRouter(prefix="/export", tags=["导出"])


@router.post("/excel")
async def export_excel(
    filters: schemas.ExportFilter,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.SUPERVISOR, UserRole.REVIEWER))
):
    export_service = ExportService(db)
    excel_file = export_service.export_batches_to_excel(filters)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"中央厨房留样异常回执_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(excel_file.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
