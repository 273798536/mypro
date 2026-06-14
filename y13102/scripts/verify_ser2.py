import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import CalculationResult, Screenshot, ChangeTrace, ScreenshotStatus, ResultStatus, ChangeCause
from app.main import format_calc_result

db = SessionLocal()

print("=== Pydantic model_dump 序列化 ===")
r = db.query(CalculationResult).first()
if r:
    fr = format_calc_result(r)
    d = fr.model_dump()
    print(f"result_status = {repr(d['result_status'])}")
    print(f"jump_cause = {repr(d.get('jump_cause'))}")
    print(f"segments type = {type(d['segments'])}")

print("\n=== 截图序列化 ===")
s = db.query(Screenshot).first()
if s:
    from app.schemas import ScreenshotResponse
    sr = ScreenshotResponse.model_validate(s)
    print(f"status = {repr(sr.model_dump()['status'])}")

print("\n=== 变更溯源序列化 ===")
t = db.query(ChangeTrace).first()
if t:
    from app.schemas import ChangeTraceResponse
    tr = ChangeTraceResponse.model_validate(t)
    print(f"change_cause = {repr(tr.model_dump()['change_cause'])}")

print("\n=== 挂起结果序列化 ===")
suspended = db.query(CalculationResult).filter(CalculationResult.result_status == ResultStatus.SUSPENDED).first()
if suspended:
    fr = format_calc_result(suspended)
    d = fr.model_dump()
    print(f"result_status = {repr(d['result_status'])}")
    print(f"segments = {repr(d['segments'])}")
    print(f"r_squared = {repr(d['r_squared'])}")
    print(f"suspend_reason = {repr(d.get('suspend_reason'))}")
else:
    print("no suspended results")

print("\n=== 计算API格式（/api/calculate/） ===")
from app.services.calculation_service import SegmentedRegressionService
from app.schemas import CalculationRequestCreate
cs = SegmentedRegressionService(db)
result = cs.calculate(CalculationRequestCreate(
    parameter_id=1,
    sample_data=[{"x": 2, "y": 4.2}, {"x": 3, "y": 5.8}, {"x": 4, "y": 7.5},
                 {"x": 5, "y": 9.8}, {"x": 7, "y": 12.5}, {"x": 10, "y": 18.2},
                 {"x": 12, "y": 22.1}, {"x": 15, "y": 28.5}, {"x": 18, "y": 35.2}, {"x": 20, "y": 40.1}]
))
if result.get("success"):
    calc_result = result["result"]
    fr = format_calc_result(calc_result)
    d = fr.model_dump()
    print(f"result_status = {repr(d['result_status'])}")
    print(f"is_duplicate in response = {result.get('is_duplicate')}")
    merged = {**d, "is_duplicate": result.get("is_duplicate", False)}
    print(f"merged keys = {sorted(merged.keys())}")
    print(f"merged is_duplicate = {repr(merged['is_duplicate'])}")

db.close()
