from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import import_router, matching_router, settlement_router, export_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="跨境结算到账裂缝 API",
    description="处理跨境多币种分批打款、银行水单与平台账单延迟到账、月底催款名单误报等问题",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router.router, prefix="/api")
app.include_router(matching_router.router, prefix="/api")
app.include_router(settlement_router.router, prefix="/api")
app.include_router(export_router.router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "跨境结算到账裂缝 API",
        "docs": "/docs",
        "endpoints": {
            "import_sample": "POST /api/import/sample",
            "import_batch": "POST /api/import/batch",
            "import_orders": "POST /api/import/orders",
            "import_slips": "POST /api/import/bank-slips",
            "import_bills": "POST /api/import/platform-bills",
            "import_file": "POST /api/import/file",
            "run_matching": "POST /api/matching/run",
            "list_settlements": "GET /api/settlements/",
            "get_settlement": "GET /api/settlements/{id}",
            "advance_status": "POST /api/settlements/{id}/advance",
            "fee_deduction": "GET /api/settlements/{id}/fee-deduction",
            "pending_confirm": "GET /api/settlements/pending-confirm/list",
            "export_json": "GET /api/export/json",
            "export_csv": "GET /api/export/csv",
        },
    }
