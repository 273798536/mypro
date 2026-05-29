from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import accounts, positions, quotes, margin_rates, margin_calls, export
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="券商融资融券追保系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router, prefix="/api/accounts", tags=["客户账户"])
app.include_router(positions.router, prefix="/api/positions", tags=["证券持仓"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["行情快照"])
app.include_router(margin_rates.router, prefix="/api/margin-rates", tags=["折算率表"])
app.include_router(margin_calls.router, prefix="/api/margin-calls", tags=["追保管理"])
app.include_router(export.router, prefix="/api/export", tags=["导出报表"])


@app.get("/")
def root():
    return {"message": "券商融资融券追保系统 API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
