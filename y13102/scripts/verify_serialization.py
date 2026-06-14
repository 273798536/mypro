import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import ScreenshotStatus, ResultStatus, ChangeCause
from app.schemas import CalculationResultResponse, SegmentResult
from app.services.parameter_service import ParameterService
from app.services.calculation_service import SegmentedRegressionService
from app.schemas import ParameterCreate, ParameterUpdate, CalculationRequestCreate
import json

db = SessionLocal()
ps = ParameterService(db)
cs = SegmentedRegressionService(db)

print("=== 1. 枚举序列化验证 ===")
print(f"  ScreenshotStatus.PROCESSED.value = {repr(ScreenshotStatus.PROCESSED.value)}")
print(f"  ResultStatus.SUSPENDED.value = {repr(ResultStatus.SUSPENDED.value)}")
print(f"  ChangeCause.THRESHOLD.value = {repr(ChangeCause.THRESHOLD.value)}")
print(f"  str(ScreenshotStatus.PROCESSED) = {repr(str(ScreenshotStatus.PROCESSED))}")
print(f"  ScreenshotStatus.PROCESSED == '已处理' = {ScreenshotStatus.PROCESSED == '已处理'}")

print("\n=== 2. Pydantic序列化验证 ===")
from app.models import CalculationResult
r = db.query(CalculationResult).first()
if r:
    resp = CalculationResultResponse.model_validate(r)
    d = resp.model_dump()
    print(f"  result_status (raw) = {repr(r.result_status)}")
    print(f"  result_status (pydantic) = {repr(d['result_status'])}")
    print(f"  result_status type = {type(d['result_status'])}")
else:
    print("  no results in db")

print("\n=== 3. 挂起状态结果验证 ===")
suspended = db.query(CalculationResult).filter(CalculationResult.result_status == ResultStatus.SUSPENDED).first()
if suspended:
    resp = CalculationResultResponse.model_validate(suspended)
    d = resp.model_dump()
    print(f"  result_status = {repr(d['result_status'])}")
    print(f"  segments = {repr(d['segments'])}")
    print(f"  r_squared = {repr(d['r_squared'])}")
    print(f"  suspend_reason = {repr(d['suspend_reason'])}")
else:
    print("  no suspended results")

print("\n=== 4. 截图状态验证 ===")
from app.models import Screenshot
shots = db.query(Screenshot).all()
for s in shots:
    print(f"  id={s.id} status (raw)={repr(s.status)} status (str)={repr(str(s.status))}")

print("\n=== 5. 变更溯源验证 ===")
from app.models import ChangeTrace
traces = db.query(ChangeTrace).all()
for t in traces:
    print(f"  cause (raw)={repr(t.change_cause)} cause (str)={repr(str(t.change_cause))}")

print("\n=== 6. format_calc_result验证 ===")
from app.main import format_calc_result
r = db.query(CalculationResult).first()
if r:
    fr = format_calc_result(r)
    d = fr.model_dump()
    print(f"  result_status = {repr(d['result_status'])}")
    print(f"  segments type = {type(d['segments'])}")
    if d['segments']:
        print(f"  segments[0] = {d['segments'][0]}")
    print(f"  r_squared = {repr(d['r_squared'])}")

db.close()
