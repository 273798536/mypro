import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Parameter, ParameterHistory, CalculationResult, ChangeTrace
from app.services.parameter_service import ParameterService
from app.services.calculation_service import SegmentedRegressionService
from app.schemas import ParameterCreate, ParameterUpdate, CalculationRequestCreate

db = SessionLocal()
param_service = ParameterService(db)
calc_service = SegmentedRegressionService(db)

print("=" * 60)
print("跳变检测调试")
print("=" * 60)
print()

hr_param = param_service.create_parameter(ParameterCreate(
    param_key="debug_heart_rate",
    param_name="调试心率",
    current_value=75,
    unit="次/分",
    threshold_low=60,
    threshold_high=100,
    segment_count=3
))
print(f"✅ 创建参数 ID={hr_param.id}")

history_count = db.query(ParameterHistory).filter(
    ParameterHistory.parameter_id == hr_param.id
).count()
print(f"   参数历史记录数: {history_count}")
histories = db.query(ParameterHistory).filter(
    ParameterHistory.parameter_id == hr_param.id
).order_by(ParameterHistory.created_at.desc()).all()
for h in histories:
    print(f"   v{h.version}: 阈值 {h.threshold_low}-{h.threshold_high}")

hr_samples1 = [
    {"x": 50, "y": 65}, {"x": 55, "y": 68}, {"x": 60, "y": 72},
    {"x": 70, "y": 78}, {"x": 80, "y": 85}, {"x": 90, "y": 92},
    {"x": 95, "y": 96}, {"x": 100, "y": 102}, {"x": 105, "y": 108}, {"x": 110, "y": 115}
]

print()
print("第一次计算...")
result1 = calc_service.calculate(CalculationRequestCreate(
    parameter_id=hr_param.id,
    sample_data=hr_samples1
))
print(f"   结果ID={result1['result'].id}, 版本v{result1['result'].version}")
print(f"   状态={result1['result'].result_status}, 值={result1['result'].result_value}")
print(f"   is_jump={result1['result'].is_jump}")

history_count = db.query(ParameterHistory).filter(
    ParameterHistory.parameter_id == hr_param.id
).count()
print(f"   计算后参数历史记录数: {history_count}")
histories = db.query(ParameterHistory).filter(
    ParameterHistory.parameter_id == hr_param.id
).order_by(ParameterHistory.created_at.desc()).all()
for h in histories:
    print(f"   v{h.version}: 阈值 {h.threshold_low}-{h.threshold_high}")

print()
print("更新参数阈值: 60-100 → 70-105")
param_service.update_parameter(hr_param.id, ParameterUpdate(
    threshold_low=70,
    threshold_high=105,
    change_reason="调试：临床指南更新",
    changed_by="张医生"
))

history_count = db.query(ParameterHistory).filter(
    ParameterHistory.parameter_id == hr_param.id
).count()
print(f"   更新后参数历史记录数: {history_count}")
histories = db.query(ParameterHistory).filter(
    ParameterHistory.parameter_id == hr_param.id
).order_by(ParameterHistory.created_at.desc()).all()
for h in histories:
    print(f"   v{h.version}: 阈值 {h.threshold_low}-{h.threshold_high}")

print()
print("第二次计算...")
result2 = calc_service.calculate(CalculationRequestCreate(
    parameter_id=hr_param.id,
    sample_data=hr_samples1
))
print(f"   结果ID={result2['result'].id}, 版本v{result2['result'].version}")
print(f"   状态={result2['result'].result_status}, 值={result2['result'].result_value}")
print(f"   is_jump={result2['result'].is_jump}")
print(f"   jump_cause={result2['result'].jump_cause}")
print(f"   jump_description={result2['result'].jump_description}")

print()
print("变更溯源记录:")
traces = db.query(ChangeTrace).filter(
    ChangeTrace.result_id == result2['result'].id
).all()
for t in traces:
    print(f"   {t.change_cause}: {t.old_value} → {t.new_value}")

print()
print("结果历史:")
results = db.query(CalculationResult).filter(
    CalculationResult.parameter_id == hr_param.id
).order_by(CalculationResult.created_at.asc()).all()
for r in results:
    print(f"   v{r.version}: ID={r.id}, is_jump={r.is_jump}, cause={r.jump_cause}")

db.close()
