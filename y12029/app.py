from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import json
import sqlite3
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from contextlib import contextmanager

app = FastAPI(title="航运燃油附加费系统")

DB_PATH = "surcharge.db"

class SurchargeStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    REVIEWED = "reviewed"
    REJECTED = "rejected"

class DiscrepancyType(str, Enum):
    QUOTE_EXPIRED = "quote_expired"
    CONTAINER_MISMATCH = "container_mismatch"
    ROUTE_NOT_FOUND = "route_not_found"
    ORDER_NOT_FOUND = "order_not_found"
    RATE_NOT_FOUND = "rate_not_found"

class ContainerTypeCreate(BaseModel):
    code: str
    name: str
    teu: float = Field(description="标准箱换算系数，20尺=1，40尺=2")
    remark: Optional[str] = None

class ContainerType(ContainerTypeCreate):
    id: int
    created_at: datetime

class RouteRateCreate(BaseModel):
    route_code: str
    route_name: str
    effective_date: date
    expiry_date: date
    bunker_rate: float = Field(description="燃油附加费率，美元/TEU")
    version: str = Field(description="报价版本号，如V1, V2")
    remark: Optional[str] = None

class RouteRate(RouteRateCreate):
    id: int
    created_at: datetime

class TransportOrderCreate(BaseModel):
    order_no: str
    container_code: str
    route_code: str
    sailing_date: date
    cargo_weight: float
    remark: Optional[str] = None

class TransportOrder(TransportOrderCreate):
    id: int
    created_at: datetime

class SurchargeCalculateRequest(BaseModel):
    order_no: str
    route_rate_version: Optional[str] = None

class Discrepancy(BaseModel):
    type: DiscrepancyType
    message: str
    detail: Dict[str, Any]
    source_material: str

class SurchargeRecord(BaseModel):
    id: int
    order_no: str
    route_code: str
    container_code: str
    teu: float
    bunker_rate: float
    total_amount: float
    rate_version: str
    sailing_date: date
    effective_date: date
    expiry_date: date
    status: SurchargeStatus
    discrepancies: List[Discrepancy] = []
    review_comment: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS container_types (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                teu REAL NOT NULL,
                remark TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS route_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_code TEXT NOT NULL,
                route_name TEXT NOT NULL,
                effective_date DATE NOT NULL,
                expiry_date DATE NOT NULL,
                bunker_rate REAL NOT NULL,
                version TEXT NOT NULL,
                remark TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(route_code, version)
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS transport_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_no TEXT UNIQUE NOT NULL,
                container_code TEXT NOT NULL,
                route_code TEXT NOT NULL,
                sailing_date DATE NOT NULL,
                cargo_weight REAL NOT NULL,
                remark TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS surcharge_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_no TEXT NOT NULL,
                route_code TEXT NOT NULL,
                container_code TEXT NOT NULL,
                teu REAL NOT NULL,
                bunker_rate REAL NOT NULL,
                total_amount REAL NOT NULL,
                rate_version TEXT NOT NULL,
                sailing_date DATE NOT NULL,
                effective_date DATE NOT NULL,
                expiry_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                discrepancies TEXT DEFAULT '[]',
                review_comment TEXT,
                reviewed_by TEXT,
                reviewed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

init_db()

def find_route_rate(conn, route_code: str, sailing_date: date, version: Optional[str] = None):
    c = conn.cursor()
    if version:
        c.execute("""
            SELECT * FROM route_rates 
            WHERE route_code = ? AND version = ?
            ORDER BY created_at DESC LIMIT 1
        """, (route_code, version))
    else:
        c.execute("""
            SELECT * FROM route_rates 
            WHERE route_code = ? AND effective_date <= ? AND expiry_date >= ?
            ORDER BY created_at DESC LIMIT 1
        """, (route_code, sailing_date, sailing_date))
    row = c.fetchone()
    return dict(row) if row else None

def find_container(conn, code: str):
    c = conn.cursor()
    c.execute("SELECT * FROM container_types WHERE code = ?", (code,))
    row = c.fetchone()
    return dict(row) if row else None

def find_order(conn, order_no: str):
    c = conn.cursor()
    c.execute("SELECT * FROM transport_orders WHERE order_no = ?", (order_no,))
    row = c.fetchone()
    return dict(row) if row else None

def parse_discrepancies(json_str: str) -> List[Discrepancy]:
    items = json.loads(json_str) if json_str else []
    return [Discrepancy(**item) for item in items]

def serialize_discrepancies(discrepancies: List[Discrepancy]) -> str:
    return json.dumps([d.model_dump() for d in discrepancies], ensure_ascii=False)

@app.post("/api/container-types", response_model=ContainerType)
def create_container_type(data: ContainerTypeCreate):
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute("""
                INSERT INTO container_types (code, name, teu, remark)
                VALUES (?, ?, ?, ?)
            """, (data.code, data.name, data.teu, data.remark))
            conn.commit()
            c.execute("SELECT * FROM container_types WHERE id = ?", (c.lastrowid,))
            return dict(c.fetchone())
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail=f"箱型代码 {data.code} 已存在")

@app.post("/api/route-rates", response_model=RouteRate)
def create_route_rate(data: RouteRateCreate):
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute("""
                INSERT INTO route_rates (route_code, route_name, effective_date, expiry_date, bunker_rate, version, remark)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (data.route_code, data.route_name, data.effective_date, data.expiry_date, 
                  data.bunker_rate, data.version, data.remark))
            conn.commit()
            c.execute("SELECT * FROM route_rates WHERE id = ?", (c.lastrowid,))
            return dict(c.fetchone())
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail=f"航线 {data.route_code} 版本 {data.version} 已存在")

@app.post("/api/transport-orders", response_model=TransportOrder)
def create_transport_order(data: TransportOrderCreate):
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute("""
                INSERT INTO transport_orders (order_no, container_code, route_code, sailing_date, cargo_weight, remark)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (data.order_no, data.container_code, data.route_code, 
                  data.sailing_date, data.cargo_weight, data.remark))
            conn.commit()
            c.execute("SELECT * FROM transport_orders WHERE id = ?", (c.lastrowid,))
            return dict(c.fetchone())
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail=f"订单号 {data.order_no} 已存在")

@app.post("/api/surcharge/calculate")
def calculate_surcharge(req: SurchargeCalculateRequest):
    discrepancies: List[Discrepancy] = []
    
    with get_db() as conn:
        order = find_order(conn, req.order_no)
        if not order:
            raise HTTPException(status_code=404, detail={
                "type": DiscrepancyType.ORDER_NOT_FOUND,
                "message": f"运输订单 {req.order_no} 不存在",
                "source_material": "运输订单表"
            })
        
        container = find_container(conn, order["container_code"])
        if not container:
            discrepancies.append(Discrepancy(
                type=DiscrepancyType.CONTAINER_MISMATCH,
                message=f"箱型 {order['container_code']} 在箱型清单中未找到",
                detail={"order_container": order["container_code"], "available_containers": []},
                source_material="箱型清单"
            ))
            teu = 1.0
        else:
            teu = container["teu"]
        
        route_rate = find_route_rate(conn, order["route_code"], order["sailing_date"], req.route_rate_version)
        if not route_rate:
            c = conn.cursor()
            c.execute("SELECT * FROM route_rates WHERE route_code = ? ORDER BY expiry_date DESC", (order["route_code"],))
            all_rates = [dict(r) for r in c.fetchall()]
            
            if all_rates:
                latest = all_rates[0]
                discrepancies.append(Discrepancy(
                    type=DiscrepancyType.QUOTE_EXPIRED,
                    message=f"报价已过期：开航日期 {order['sailing_date']} 超出最新报价有效期 {latest['effective_date']} 至 {latest['expiry_date']}",
                    detail={
                        "sailing_date": order["sailing_date"],
                        "latest_effective": latest["effective_date"],
                        "latest_expiry": latest["expiry_date"],
                        "latest_version": latest["version"],
                        "all_versions": [{"version": r["version"], "effective": r["effective_date"], "expiry": r["expiry_date"]} for r in all_rates]
                    },
                    source_material=f"航线费率表({order['route_code']})"
                ))
                route_rate = latest
                bunker_rate = route_rate["bunker_rate"]
            else:
                discrepancies.append(Discrepancy(
                    type=DiscrepancyType.ROUTE_NOT_FOUND,
                    message=f"航线 {order['route_code']} 无任何报价记录",
                    detail={"route_code": order["route_code"]},
                    source_material="航线费率表"
                ))
                bunker_rate = 0.0
        else:
            sailing_date = order["sailing_date"]
            if sailing_date < route_rate["effective_date"] or sailing_date > route_rate["expiry_date"]:
                discrepancies.append(Discrepancy(
                    type=DiscrepancyType.QUOTE_EXPIRED,
                    message=f"报价过期：开航日期 {sailing_date} 不在报价有效期 {route_rate['effective_date']} 至 {route_rate['expiry_date']} 内",
                    detail={
                        "sailing_date": sailing_date,
                        "effective_date": route_rate["effective_date"],
                        "expiry_date": route_rate["expiry_date"],
                        "version": route_rate["version"]
                    },
                    source_material=f"航线费率表({order['route_code']} {route_rate['version']})"
                ))
            bunker_rate = route_rate["bunker_rate"]
        
        total_amount = round(teu * bunker_rate, 2)
        status = SurchargeStatus.PENDING_REVIEW if discrepancies else SurchargeStatus.DRAFT
        
        c = conn.cursor()
        c.execute("""
            INSERT INTO surcharge_records 
            (order_no, route_code, container_code, teu, bunker_rate, total_amount, 
             rate_version, sailing_date, effective_date, expiry_date, status, discrepancies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order["order_no"],
            order["route_code"],
            order["container_code"],
            teu,
            bunker_rate,
            total_amount,
            route_rate["version"] if route_rate else "UNKNOWN",
            order["sailing_date"],
            route_rate["effective_date"] if route_rate else "",
            route_rate["expiry_date"] if route_rate else "",
            status.value,
            serialize_discrepancies(discrepancies)
        ))
        
        record_id = c.lastrowid
        conn.commit()
        
        c.execute("SELECT * FROM surcharge_records WHERE id = ?", (record_id,))
        row = dict(c.fetchone())
        row["discrepancies"] = parse_discrepancies(row["discrepancies"])
        
        return {
            "id": row["id"],
            "order_no": row["order_no"],
            "total_amount": row["total_amount"],
            "status": row["status"],
            "teu": row["teu"],
            "bunker_rate": row["bunker_rate"],
            "rate_version": row["rate_version"],
            "discrepancies": row["discrepancies"],
            "calculation": f"{row['teu']} TEU × {row['bunker_rate']} USD/TEU = {row['total_amount']} USD"
        }

@app.get("/api/surcharge/export", response_class=PlainTextResponse)
def export_surcharge(status: Optional[SurchargeStatus] = None):
    with get_db() as conn:
        c = conn.cursor()
        if status:
            c.execute("SELECT * FROM surcharge_records WHERE status = ? ORDER BY created_at DESC", (status.value,))
        else:
            c.execute("SELECT * FROM surcharge_records ORDER BY created_at DESC")
        rows = c.fetchall()
        
        lines = ["订单号,航线,箱型,TEU,燃油费率,总金额,报价版本,开航日期,有效期起,有效期止,状态,差异数,复核人,复核时间"]
        all_discrepancies = []
        for row in rows:
            row = dict(row)
            discrepancies = parse_discrepancies(row["discrepancies"])
            all_discrepancies.extend([(row["order_no"], d) for d in discrepancies])
            lines.append(
                f"{row['order_no']},{row['route_code']},{row['container_code']},{row['teu']},"
                f"{row['bunker_rate']},{row['total_amount']},{row['rate_version']},"
                f"{row['sailing_date']},{row['effective_date']},{row['expiry_date']},"
                f"{row['status']},{len(discrepancies)},{row['reviewed_by'] or ''},{row['reviewed_at'] or ''}"
            )
        
        if all_discrepancies:
            lines.append("")
            lines.append("=" * 80)
            lines.append("差异明细：")
            for order_no, d in all_discrepancies:
                lines.append(f"[{order_no}] [{d.source_material}] {d.type.value}: {d.message}")
                lines.append(f"  详情: {json.dumps(d.detail, ensure_ascii=False)}")
        
        return "\n".join(lines)

@app.get("/api/surcharge/{record_id}")
def get_surcharge(record_id: int):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM surcharge_records WHERE id = ?", (record_id,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="记录不存在")
        row = dict(row)
        row["discrepancies"] = parse_discrepancies(row["discrepancies"])
        return row

@app.post("/api/surcharge/{record_id}/review")
def review_surcharge(record_id: int, comment: str = Query(...), approved: bool = Query(...), reviewer: str = Query(...)):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM surcharge_records WHERE id = ?", (record_id,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="记录不存在")
        
        status = SurchargeStatus.REVIEWED if approved else SurchargeStatus.REJECTED
        c.execute("""
            UPDATE surcharge_records 
            SET status = ?, review_comment = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (status.value, comment, reviewer, record_id))
        conn.commit()
        
        c.execute("SELECT * FROM surcharge_records WHERE id = ?", (record_id,))
        row = dict(c.fetchone())
        row["discrepancies"] = parse_discrepancies(row["discrepancies"])
        return row

@app.get("/api/transport-orders")
def list_orders():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM transport_orders ORDER BY created_at DESC")
        return [dict(r) for r in c.fetchall()]

@app.get("/api/route-rates")
def list_rates():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM route_rates ORDER BY created_at DESC")
        return [dict(r) for r in c.fetchall()]

@app.get("/api/container-types")
def list_containers():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM container_types ORDER BY created_at DESC")
        return [dict(r) for r in c.fetchall()]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
