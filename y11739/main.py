from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app import models, schemas, crud, exposure_engine, exporter
from app.database import get_db
from app.models import Currency, OrderStatus, ExposureStatus, AlertType

app = FastAPI(
    title="外汇敞口限额监控 API",
    description="贸易公司外汇敞口管理系统 - 支持订单管理、远期合约、敞口计算、限额预警、变更回滚",
    version="1.0.0"
)


@app.get("/", tags=["系统"])
def root():
    return {
        "name": "外汇敞口限额监控 API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "订单管理": "/orders",
            "远期合约": "/contracts",
            "即期汇率": "/rates",
            "限额规则": "/limits",
            "敞口计算": "/exposure",
            "预警管理": "/alerts",
            "变更回滚": "/orders/changes",
            "数据导出": "/export"
        }
    }


@app.post("/orders/", response_model=schemas.ForeignOrder, tags=["订单管理"])
def create_order(order: schemas.ForeignOrderCreate, db: Session = Depends(get_db)):
    db_order = crud.get_order_by_no(db, order_no=order.order_no)
    if db_order:
        raise HTTPException(status_code=400, detail="订单号已存在")
    return crud.create_order(db=db, order=order)


@app.get("/orders/", response_model=List[schemas.ForeignOrder], tags=["订单管理"])
def read_orders(
    skip: int = 0,
    limit: int = 100,
    currency: Optional[Currency] = None,
    status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db)
):
    return crud.get_orders(db, skip=skip, limit=limit, currency=currency, status=status)


@app.get("/orders/{order_id}", response_model=schemas.ForeignOrder, tags=["订单管理"])
def read_order(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id=order_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return db_order


@app.put("/orders/{order_id}", response_model=schemas.ForeignOrder, tags=["订单管理"])
def update_order(order_id: int, order_update: schemas.ForeignOrderUpdate, db: Session = Depends(get_db)):
    db_order = crud.update_order(db, order_id=order_id, order_update=order_update)
    if db_order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return db_order


@app.post("/orders/{order_id}/cancel", response_model=schemas.ForeignOrder, tags=["订单管理"])
def cancel_order(order_id: int, reason: str = Query(..., description="取消原因"), operator: str = "system", db: Session = Depends(get_db)):
    db_order = crud.cancel_order(db, order_id=order_id, reason=reason, operator=operator)
    if db_order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return db_order


@app.get("/orders/{order_id}/changes", response_model=List[schemas.OrderChange], tags=["变更回滚"])
def read_order_changes(order_id: int, db: Session = Depends(get_db)):
    return crud.get_order_changes(db, order_id=order_id)


@app.post("/orders/changes/rollback", response_model=schemas.ForeignOrder, tags=["变更回滚"])
def rollback_order_change(request: schemas.OrderRollbackRequest, db: Session = Depends(get_db)):
    db_order = crud.rollback_order_change(
        db,
        change_id=request.change_id,
        reason=request.rollback_reason,
        operator=request.rolled_back_by
    )
    if db_order is None:
        raise HTTPException(status_code=404, detail="变更记录不存在或回滚失败")
    return db_order


@app.post("/contracts/", response_model=schemas.ForwardContract, tags=["远期合约"])
def create_contract(contract: schemas.ForwardContractCreate, db: Session = Depends(get_db)):
    return crud.create_contract(db=db, contract=contract)


@app.get("/contracts/", response_model=List[schemas.ForwardContract], tags=["远期合约"])
def read_contracts(
    skip: int = 0,
    limit: int = 100,
    currency: Optional[Currency] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return crud.get_contracts(db, skip=skip, limit=limit, currency=currency, order_id=order_id)


@app.get("/contracts/{contract_id}", response_model=schemas.ForwardContract, tags=["远期合约"])
def read_contract(contract_id: int, db: Session = Depends(get_db)):
    db_contract = crud.get_contract(db, contract_id=contract_id)
    if db_contract is None:
        raise HTTPException(status_code=404, detail="合约不存在")
    return db_contract


@app.post("/rates/", response_model=schemas.SpotRate, tags=["即期汇率"])
def create_spot_rate(rate: schemas.SpotRateCreate, db: Session = Depends(get_db)):
    return crud.create_spot_rate(db=db, rate=rate)


@app.get("/rates/latest/{currency}", response_model=schemas.SpotRate, tags=["即期汇率"])
def read_latest_rate(currency: Currency, db: Session = Depends(get_db)):
    db_rate = crud.get_latest_spot_rate(db, currency=currency)
    if db_rate is None:
        raise HTTPException(status_code=404, detail="未找到该币种的汇率数据")
    return db_rate


@app.post("/limits/", response_model=schemas.LimitRule, tags=["限额规则"])
def create_limit_rule(rule: schemas.LimitRuleCreate, db: Session = Depends(get_db)):
    return crud.create_limit_rule(db=db, rule=rule)


@app.get("/limits/active/{currency}", response_model=schemas.LimitRule, tags=["限额规则"])
def read_active_limit(currency: Currency, db: Session = Depends(get_db)):
    db_rule = crud.get_active_limit_rule(db, currency=currency)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="未找到该币种的有效限额规则")
    return db_rule


@app.get("/exposure/calculate", response_model=List[schemas.ExposureCalculationResult], tags=["敞口计算"])
def calculate_exposure(db: Session = Depends(get_db)):
    return exposure_engine.calculate_all_exposures(db)


@app.get("/exposure/calculate/{currency}", response_model=schemas.ExposureCalculationResult, tags=["敞口计算"])
def calculate_exposure_by_currency(currency: Currency, db: Session = Depends(get_db)):
    return exposure_engine.calculate_exposure(db, currency=currency)


@app.post("/exposure/save", tags=["敞口计算"])
def save_exposure_calculation(operator: str = "system", db: Session = Depends(get_db)):
    results = exposure_engine.calculate_all_exposures(db)
    saved_records = []
    for result in results:
        record = exposure_engine.save_exposure_calculation(db, result, operator=operator)
        saved_records.append(record.id)
    return {"message": "敞口计算结果已保存", "record_ids": saved_records}


@app.get("/exposure/records", response_model=List[schemas.ExposureRecord], tags=["敞口计算"])
def read_exposure_records(
    skip: int = 0,
    limit: int = 100,
    currency: Optional[Currency] = None,
    db: Session = Depends(get_db)
):
    return crud.get_exposure_records(db, skip=skip, limit=limit, currency=currency)


@app.get("/alerts/", response_model=List[schemas.Alert], tags=["预警管理"])
def read_alerts(
    skip: int = 0,
    limit: int = 100,
    resolved: Optional[bool] = None,
    alert_type: Optional[AlertType] = None,
    db: Session = Depends(get_db)
):
    return crud.get_alerts(db, skip=skip, limit=limit, resolved=resolved, alert_type=alert_type)


@app.post("/alerts/{alert_id}/resolve", response_model=schemas.Alert, tags=["预警管理"])
def resolve_alert(alert_id: int, resolution: schemas.AlertResolve, db: Session = Depends(get_db)):
    db_alert = crud.resolve_alert(db, alert_id=alert_id, resolution=resolution)
    if db_alert is None:
        raise HTTPException(status_code=404, detail="预警不存在")
    return db_alert


@app.get("/export/excel", tags=["数据导出"])
def export_excel(db: Session = Depends(get_db)):
    records = crud.get_exposure_records(db, limit=1000)
    alerts = crud.get_alerts(db, limit=1000)
    excel_data = exporter.export_exposure_to_excel(records, alerts)
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=forex_exposure_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
    )


@app.get("/export/chart", tags=["数据导出"])
def export_chart(db: Session = Depends(get_db)):
    results = exposure_engine.calculate_all_exposures(db)
    chart_base64 = exporter.generate_exposure_chart(results)
    return {"chart": chart_base64, "format": "png", "encoding": "base64"}


@app.get("/export/trend/{currency}", tags=["数据导出"])
def export_trend_chart(currency: Currency, db: Session = Depends(get_db)):
    records = crud.get_exposure_records(db, currency=currency, limit=30)
    chart_base64 = exporter.generate_trend_chart(records, currency)
    return {"chart": chart_base64, "currency": currency, "format": "png", "encoding": "base64"}


@app.get("/export/report", tags=["数据导出"])
def export_report(db: Session = Depends(get_db)):
    results = exposure_engine.calculate_all_exposures(db)
    records = crud.get_exposure_records(db, limit=30)
    return exporter.generate_daily_report(results, records)


@app.get("/audit/logs", response_model=List[schemas.AuditLog], tags=["系统"])
def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_audit_logs(db, skip=skip, limit=limit, entity_type=entity_type)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
