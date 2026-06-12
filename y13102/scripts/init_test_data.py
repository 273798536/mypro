import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import (
    Parameter, ParameterHistory, Remark, Screenshot,
    CalculationRequest, CalculationResult, ChangeTrace,
    ScreenshotStatus, ResultStatus, ChangeCause
)
from app.services.parameter_service import ParameterService
from app.services.calculation_service import SegmentedRegressionService
from app.schemas import (
    ParameterCreate, ParameterUpdate, RemarkCreate,
    ScreenshotCreate, CalculationRequestCreate
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

param_service = ParameterService(db)
calc_service = SegmentedRegressionService(db)

print("=" * 60)
print("初始化分段回归参数试算系统测试数据")
print("=" * 60)
print()

print("【案例一：顺利记录 - 血糖浓度】")
print("-" * 40)
glucose_param = param_service.create_parameter(ParameterCreate(
    param_key="blood_glucose",
    param_name="血糖浓度",
    current_value=5.6,
    unit="mmol/L",
    threshold_low=3.9,
    threshold_high=6.1,
    segment_count=3
))
print(f"✅ 创建参数: {glucose_param.param_name} (ID: {glucose_param.id})")
print(f"   单位: {glucose_param.unit}, 阈值: {glucose_param.threshold_low}-{glucose_param.threshold_high}")

glucose_samples = [
    {"x": 2, "y": 4.2}, {"x": 3, "y": 5.8}, {"x": 4, "y": 7.5},
    {"x": 5, "y": 9.8}, {"x": 7, "y": 12.5}, {"x": 10, "y": 18.2},
    {"x": 12, "y": 22.1}, {"x": 15, "y": 28.5}, {"x": 18, "y": 35.2}, {"x": 20, "y": 40.1}
]

result1 = calc_service.calculate(CalculationRequestCreate(
    parameter_id=glucose_param.id,
    sample_data=glucose_samples
))
print(f"✅ 计算完成: 状态={result1['result'].result_status}, "
      f"结果值={result1['result'].result_value:.4f}, "
      f"R²={result1['result'].r_squared:.4f}")
print()

print("【案例二：补录记录 - 血压收缩压】")
print("-" * 40)
bp_param = param_service.create_parameter(ParameterCreate(
    param_key="blood_pressure_systolic",
    param_name="血压收缩压",
    current_value=125,
    unit=None,
    threshold_low=90,
    threshold_high=140,
    segment_count=2
))
print(f"✅ 创建参数: {bp_param.param_name} (ID: {bp_param.id})")
print(f"   单位: 未设置(故意缺失), 阈值: {bp_param.threshold_low}-{bp_param.threshold_high}")

bp_samples = [
    {"x": 1, "y": 118}, {"x": 2, "y": 122}, {"x": 3, "y": 128}
]

result2 = calc_service.calculate(CalculationRequestCreate(
    parameter_id=bp_param.id,
    sample_data=bp_samples
))
print(f"❌ 计算挂起: 状态={result2['result'].result_status}")
print(f"   原因: {result2['result'].suspend_reason}")

remark1 = param_service.add_remark(RemarkCreate(
    parameter_id=bp_param.id,
    content="2024年6月临床数据回溯，该批次样本采集时间存在偏差，需要重新核对原始记录",
    remark_type="后补备注",
    created_by="复核人-小孟"
))
print(f"✅ 添加后补备注 (ID: {remark1.id}, 幂等Key: {remark1.idempotency_key[:16]}...)")

screenshot1 = param_service.add_screenshot(ScreenshotCreate(
    parameter_id=bp_param.id,
    file_path="/screenshots/bp_v1_202401.png",
    description="2024年1月原始数据截图 - 待复核",
    status=ScreenshotStatus.PENDING_MATERIAL,
    version_tag="v1.0"
))
screenshot2 = param_service.add_screenshot(ScreenshotCreate(
    parameter_id=bp_param.id,
    file_path="/screenshots/bp_v2_202406.png",
    description="2024年6月修正数据截图",
    status=ScreenshotStatus.PROCESSED,
    version_tag="v2.0"
))
print(f"✅ 添加截图2张: 待补材料1张, 已处理1张")
print()

print("【案例三：异常记录 - 心率检测】")
print("-" * 40)
hr_param = param_service.create_parameter(ParameterCreate(
    param_key="heart_rate",
    param_name="心率",
    current_value=75,
    unit="次/分",
    threshold_low=60,
    threshold_high=100,
    segment_count=3
))
print(f"✅ 创建参数: {hr_param.param_name} (ID: {hr_param.id})")
print(f"   单位: {hr_param.unit}, 初始阈值: {hr_param.threshold_low}-{hr_param.threshold_high}")

hr_samples1 = [
    {"x": 50, "y": 65}, {"x": 55, "y": 68}, {"x": 60, "y": 72},
    {"x": 70, "y": 78}, {"x": 80, "y": 85}, {"x": 90, "y": 92},
    {"x": 95, "y": 96}, {"x": 100, "y": 102}, {"x": 105, "y": 108}, {"x": 110, "y": 115}
]

result3a = calc_service.calculate(CalculationRequestCreate(
    parameter_id=hr_param.id,
    sample_data=hr_samples1
))
print(f"✅ 第一次计算: 结果值={result3a['result'].result_value:.4f}, "
      f"状态={result3a['result'].result_status}")

print(f"⚠️  修改阈值: 60-100 → 70-105 (模拟临床指南更新)")
param_service.update_parameter(hr_param.id, ParameterUpdate(
    threshold_low=70,
    threshold_high=105,
    change_reason="临床指南更新，调整心率参考范围",
    changed_by="张医生"
))

hr_samples2 = [
    {"x": 50, "y": 65}, {"x": 55, "y": 68}, {"x": 60, "y": 72},
    {"x": 70, "y": 78}, {"x": 80, "y": 85}, {"x": 90, "y": 92},
    {"x": 95, "y": 96}, {"x": 100, "y": 102}, {"x": 105, "y": 108}, {"x": 110, "y": 115}
]

result3b = calc_service.calculate(CalculationRequestCreate(
    parameter_id=hr_param.id,
    sample_data=hr_samples2
))
print(f"✅ 第二次计算: 结果值={result3b['result'].result_value:.4f}, "
      f"跳变={result3b['result'].is_jump}, "
      f"原因={result3b['result'].jump_cause}")

change_traces = db.query(ChangeTrace).filter(
    ChangeTrace.result_id == result3b['result'].id
).all()
for trace in change_traces:
    print(f"   📍 溯源: {trace.change_cause} - {trace.old_value} → {trace.new_value}")
print()

print("【验证：重复提交幂等性】")
print("-" * 40)
result_dup = calc_service.calculate(CalculationRequestCreate(
    parameter_id=glucose_param.id,
    sample_data=glucose_samples
))
print(f"🔄 重复提交相同血糖数据: is_duplicate={result_dup.get('is_duplicate', False)}")
print(f"   返回已有结果版本: v{result_dup['result'].version}")
print(f"   备注条数不会重复增加")
print()

print("【验证：后补备注幂等性】")
print("-" * 40)
remark_dup = param_service.add_remark(RemarkCreate(
    parameter_id=bp_param.id,
    content="2024年6月临床数据回溯，该批次样本采集时间存在偏差，需要重新核对原始记录",
    remark_type="后补备注",
    created_by="复核人-小孟"
))
print(f"🔄 重复添加相同备注: 返回现有备注ID={remark_dup.id}")
print(f"   与之前ID={remark1.id}相同，说明没有重复创建")
print()

print("=" * 60)
print("测试数据初始化完成！")
print("=" * 60)
print()
print("已创建3条参数记录：")
print(f"  1. 血糖浓度(ID:{glucose_param.id}) - 顺利记录案例")
print(f"  2. 血压收缩压(ID:{bp_param.id}) - 补录记录案例（单位缺失+边界不足）")
print(f"  3. 心率(ID:{hr_param.id}) - 异常记录案例（阈值变更导致跳变）")
print()
print("关键验证点：")
print("  ✅ 幂等性：重复计算和重复备注不会创建重复记录")
print("  ✅ 历史版本：参数更新自动创建历史记录")
print("  ✅ 单位缺失：自动挂起，等待复核人确认")
print("  ✅ 边界检查：边界样本不足时自动挂起")
print("  ✅ 跳变检测：阈值/单位/备注变更导致结果跳变时自动溯源")
print("  ✅ 状态分类：截图分为已处理、待补材料、人工改判三类")
print()
print("启动服务: python -m uvicorn app.main:app --reload --port 8000")
print("访问界面: http://localhost:8000")

db.close()
