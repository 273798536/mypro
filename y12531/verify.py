import json

report = json.load(open("output/prediction_report.json", encoding="utf-8"))
s = report["summary"]

print("=== 摘要(验证需求覆盖) ===")
print(f"缺采样总数: {s['missing_sample_count']}  -> 摘要可见")
print(f"缺采样设备: {s['missing_sample_ids']}  -> 摘要可见")
print(f"异常尖峰: 补录来源={s['anomaly_spike_from_backfill']}, 原始材料来源={s['anomaly_spike_from_original']}  -> 来源区分")
print(f"型号补录影响设备: {s['model_backfill_affected_equipment']}  -> 标记影响")
print(f"平均置信区间: [{s['avg_confidence_lower']:.1f}, {s['avg_confidence_upper']:.1f}]  -> 日常+复盘口径一致")

print()
print("=== 预测明细(检查缺采样是否在摘要而非备注) ===")
for p in report["prediction_details"]:
    print(f"  {p['equipment_id']}: 缺采样={p['missing_sample_count']}, 型号补录影响={p['affected_by_model_backfill']}")

print()
print("=== 检查标记(区分补录/原始) ===")
for f in report["flags"]:
    print(f"  {f['equipment_id']} | {f['flag_type']} | 来源={f['source']}")
