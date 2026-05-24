from app.api.batches import router as batches_router
from app.api.receipts import router as receipts_router
from app.api.attachments import router as attachments_router
from app.api.reports import router as reports_router
from app.api.remarks import router as remarks_router

batches = batches_router
receipts = receipts_router
attachments = attachments_router
reports = reports_router
remarks = remarks_router
