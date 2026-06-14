import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import CalculationResult, Screenshot, ChangeTrace
from app.main import format_calc_result
from fastapi.encoders import jsonable_encoder

db = SessionLocal()

print("=== FastAPI jsonable_encoder 输出 ===")
r = db.query(CalculationResult).first()
if r:
    fr = format_calc_result(r)
    encoded = jsonable_encoder(fr)
    print(f"result_status = {repr(encoded['result_status'])}")
    print(f"jump_cause = {repr(encoded.get('jump_cause'))}")

print("\n=== 截图 ===")
s = db.query(Screenshot).first()
if s:
    from app.schemas import ScreenshotResponse
    sr = ScreenshotResponse.model_validate(s)
    encoded = jsonable_encoder(sr)
    print(f"status = {repr(encoded['status'])}")

print("\n=== 变更溯源 ===")
t = db.query(ChangeTrace).first()
if t:
    from app.schemas import ChangeTraceResponse
    tr = ChangeTraceResponse.model_validate(t)
    encoded = jsonable_encoder(tr)
    print(f"change_cause = {repr(encoded['change_cause'])}")

print("\n=== JSON dumps 直接序列化 ===")
r2 = db.query(CalculationResult).first()
if r2:
    fr2 = format_calc_result(r2)
    d = fr2.model_dump(mode="json")
    print(f"result_status (mode=json) = {repr(d['result_status'])}")

print("\n=== 挂起结果 ===")
from app.models import ResultStatus
suspended = db.query(CalculationResult).filter(CalculationResult.result_status == ResultStatus.SUSPENDED).first()
if suspended:
    fr3 = format_calc_result(suspended)
    encoded = jsonable_encoder(fr3)
    print(f"result_status = {repr(encoded['result_status'])}")
    print(f"segments = {repr(encoded['segments'])}")
    print(f"r_squared = {repr(encoded.get('r_squared'))}")

db.close()
