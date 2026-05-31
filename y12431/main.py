import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import uvicorn

from config import UPLOAD_DIR, TEMPLATE_DIR
from data_parser import parse_excel_file
from royalty_analyzer import RoyaltyAnalyzer
from exporter import export_to_excel

app = FastAPI(title="品牌联名授权回款分析系统")


@app.get("/", response_class=HTMLResponse)
async def index():
    with open(os.path.join(TEMPLATE_DIR, "index.html"), "r", encoding="utf-8") as f:
        return f.read()


@app.post("/api/analyze")
async def analyze(files: List[UploadFile] = File(...)):
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    
    all_contracts = []
    all_deposits = []
    all_payments = []
    source_files = []
    
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        source_files.append(file.filename)
        contracts, deposits, payments = parse_excel_file(file_path)
        all_contracts.extend(contracts)
        all_deposits.extend(deposits)
        all_payments.extend(payments)
    
    analyzer = RoyaltyAnalyzer()
    result = analyzer.run_full_analysis(
        all_contracts, all_deposits, all_payments, source_files
    )
    
    return result


@app.post("/api/export")
async def export_excel(result: dict):
    try:
        filepath = export_to_excel(result)
        return FileResponse(
            filepath,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=os.path.basename(filepath)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
