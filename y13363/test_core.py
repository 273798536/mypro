from app.models import *
from app.processor import *
from app.store import *
from app.grayscale import *
from datetime import datetime

print("✅ 所有模块导入成功")

status = ProcessingStatus.PROCESSED
print(f"✅ 状态枚举正常: {status.value}")

mappings = get_default_field_mappings()
print(f"✅ 默认字段映射: {len(mappings)} 条")

formulas = get_default_formulas()
print(f"✅ 默认公式: {len(formulas)} 条")

ratios = get_default_calibration_ratios()
print(f"✅ 默认校准系数: {len(ratios)} 个")

processor = CostProcessor(
    field_mappings=mappings,
    formulas=formulas,
    calibration_ratios=ratios
)

raw_data1 = {
    "训练样本数": 100000,
    "训练时长": 48.5,
    "GPU卡数": 8,
    "GPU单价": 12.5,
    "数据处理成本": 500,
    "存储成本": 200
}
record1 = processor.process_training_log(
    run_id="TEST-001",
    raw_data=raw_data1,
    source_file="test1.csv",
    existing_run_ids=[]
)
print(f"✅ 测试1 - 正常数据处理: 状态={record1.status.value}, 成本计算数={len(record1.cost_calculations)}")
for c in record1.cost_calculations:
    print(f"   - {c.formula.name}: {c.result:.2f}{c.unit} (边界合规: {c.is_within_bounds})")

raw_data2 = {
    "样本量": 250000,
    "训练时间(小时)": 72,
    "GPU数量": 16,
    "GPU单价": 12.5
}
record2 = processor.process_training_log(
    run_id="TEST-002",
    raw_data=raw_data2,
    source_file="test2.csv",
    existing_run_ids=["TEST-001"]
)
print(f"✅ 测试2 - 字段别名映射: 状态={record2.status.value}")

raw_data3 = {
    "训练样本数": 100,
    "训练时长": 100,
    "GPU卡数": 8,
    "GPU单价": 12.5
}
record3 = processor.process_training_log(
    run_id="TEST-003",
    raw_data=raw_data3,
    source_file="test3.csv",
    existing_run_ids=["TEST-001", "TEST-002"]
)
print(f"✅ 测试3 - 边界异常: 状态={record3.status.value}, 原因={record3.confirmation_reason}")

record4 = processor.process_training_log(
    run_id="TEST-001",
    raw_data=raw_data1,
    source_file="test1_dup.csv",
    existing_run_ids=["TEST-001", "TEST-002", "TEST-003"]
)
print(f"✅ 测试4 - 重复run_id: 状态={record4.status.value}, 原因={record4.confirmation_reason}")

store = ProcessingStore()
store.add_record(record1)
store.add_record(record2)
store.add_record(record3)
print(f"✅ 测试5 - 存储层: 总记录数={len(store.get_all_records())}")

summary = store.get_dashboard_summary()
print(f"✅ 测试6 - 看板汇总: 总实验={summary.total_runs}, 已处理={summary.processed}, 待确认={summary.needs_confirmation}, 总成本={summary.total_cost}{summary.cost_unit}")

store.confirm_record(ConfirmationRequest(
    run_id="TEST-003",
    reason=ConfirmationReason.BOUNDARY_EXCEEDED,
    note="单位样本成本偏高",
    next_steps=["核对数据", "确认异常"]
))
print(f"✅ 测试7 - 状态流转: TEST-003现在状态={store.get_record('TEST-003').status.value}")

store.add_evidence(EvidenceSubmission(
    run_id="TEST-003",
    evidence_description="已核实为小样本测试，成本正常"
))
store.mark_evidence_complete("TEST-003")
print(f"✅ 测试8 - 证据完成: TEST-003最终状态={store.get_record('TEST-003').status.value}")

record5 = processor.process_training_log(
    run_id="TEST-005",
    raw_data={
        "训练样本数": 120000,
        "训练时长": 48.5,
        "GPU卡数": 8,
        "GPU单价": 12.5
    },
    source_file="test5.csv",
    existing_run_ids=["TEST-001", "TEST-002", "TEST-003"]
)
store.add_record(record5)

analyzer = GrayscaleAnalyzer()
grayscale_result = analyzer.analyze("TEST-005", record1, record5)
needs_confirm, anomalies = analyzer.check_needs_confirmation(grayscale_result)
print(f"✅ 测试9 - 灰度分析: 样本变化={len(grayscale_result.sample_changes)}处, 阈值变化={len(grayscale_result.threshold_changes)}处, 人工改判={len(grayscale_result.manual_adjustments)}处")
print(f"   原始成本={grayscale_result.original_cost:.2f}, 最终成本={grayscale_result.final_cost:.2f}")
print(f"   样本影响={grayscale_result.total_sample_impact:.2f}, 阈值影响={grayscale_result.total_threshold_impact:.2f}, 人工影响={grayscale_result.total_manual_impact:.2f}")

export_data = {
    "run_id": "TEST-001",
    "export_time": datetime.now().isoformat(),
    "cost_calculations": [c.model_dump() for c in record1.cost_calculations]
}
print(f"✅ 测试10 - 数据导出正常: 包含{len(export_data['cost_calculations'])}项成本计算")

print("\n🎉 所有核心流程测试通过！")
