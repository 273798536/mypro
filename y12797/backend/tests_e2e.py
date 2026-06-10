"""端到端测试：样例创建 → 复核 → 报告导出 + 异常追溯。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models  # noqa
from app import services, schemas
from app.utils.sample_data import build_sample_record
from app.utils.report_generator import generate_report_plain_explain, generate_audit_chain, export_pdf

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

print("=" * 60)
print("【步骤1】创建贴近日常的样例记录（含旧表/补录/漏填单位/重叠峰/称量不足）")
print("=" * 60)
sample = build_sample_record()
record = services.create_processing_record(db, sample, operator="张工(早班)")
print(f"✅ 创建成功：记录号={record.record_no}, 批次={record.batch_no}")
print(f"   物料：{record.material_name}")
print(f"   状态：{record.status}")
print(f"   反应条件数：{len(record.reaction_conditions)}")
print(f"   底物换算数：{len(record.substrate_conversions)}")
print(f"   谱图峰数：{len(record.spectrum_data)}")

print("\n【步骤1-1】温度单位混用检测")
assert record.has_temp_unit_mix, "❌ 应该检测到温度单位混用"
detail = record.temp_unit_issue_detail
print(f"✅ 检测到温度单位混用：使用了 {detail['units_used']}")
print(f"   摘要：{detail['summary']}")
for cond in record.reaction_conditions:
    if "温度" in cond.condition_name:
        tag = []
        if cond.is_unit_missing: tag.append("漏填单位")
        if cond.is_unit_mismatch: tag.append("单位不一致")
        if cond.is_abnormal: tag.append("数值异常")
        print(f"   • {cond.condition_name}: 原值={cond.condition_value} "
              f"→ 归一化={cond.normalized_value} {cond.normalized_unit} "
              f"({'/'.join(tag) if tag else 'OK'})")

print("\n【步骤1-2】漏填单位字段检测")
missing = record.missing_unit_fields or []
assert missing, "❌ 应该检测到漏填单位"
print(f"✅ 检测到 {len(missing)} 项漏填单位字段：")
for m in missing:
    print(f"   • [{m['type']}] {m['name']}：{m['issue']}")

print("\n【步骤1-3】谱峰重叠检测")
assert record.has_peak_overlap, "❌ 应该检测到谱峰重叠"
ovs = record.peak_overlap_detail["overlaps"]
print(f"✅ 检测到 {len(ovs)} 处峰重叠：")
for o in ovs:
    print(f"   • {o['peak_a']}(RT={o['peak_a_rt']}) ↔ {o['peak_b']}(RT={o['peak_b_rt']}) "
          f"Δ={o['delta_rt']}min [{o['severity_cn']}]")
    print(f"     说明：{o['note']}")

print("\n【步骤1-4】称量精度不足检测")
assert record.has_weighing_issue, "❌ 应该检测到称量精度问题"
wi = record.weighing_issue_detail
print(f"✅ 检测到 {wi['count']} 项称量精度问题：")
for it in wi["items"]:
    print(f"   • {it['substrate']} [{it['precision']}]")
    print(f"     普通话解释：{it['explain']}")

print("\n【步骤1-5】底物换算结果核对")
for s in record.substrate_conversions:
    print(f"   • {s.substrate_name}: 称样{s.initial_mass}{s.initial_mass_unit} "
          f"/ 体积{s.volume}{s.volume_unit} → 终浓度 {s.final_concentration} {s.final_concentration_unit}")
    if s.conversion_formula:
        print(f"     换算公式：{s.conversion_formula[:120]}...")

print("\n" + "=" * 60)
print("【步骤2】状态推进到复核中")
print("=" * 60)
ok, msg, record = services.transition_status(db, record.id, "配方工程师-李工", "next", "开始复核本批次")
assert ok, msg
print(f"✅ 推进成功：{msg}，当前状态={record.status}")
assert record.status == "reviewing"

print("\n" + "=" * 60)
print("【步骤3】提交复核（处理意见 + 安全备注 + 逐项复核）")
print("=" * 60)
review_payload = schemas.ReviewSubmitIn(
    reviewer="配方主管-王工",
    processing_opinion=(
        "同意本批次放行：1) 温度已统一按℃复核，保温槽310.15K=37℃与酶活最适温度一致；"
        "2) ONPG称样量0.3mg已通过微量天平(W330型)确认，请后续批次尽量增大到1mg以上；"
        "3) 产物峰与杂质X中度重叠，已按背景扣除法定量，相对标准偏差RSD<3%可接受；"
        "4) 乳糖单位漏填项已与上一班李工确认，按mmol/L处理无误。"
    ),
    safety_note=sample["safety_note"],
    supplementary_note=sample["supplementary_note"] + " 复核人补充：所有补录均已核对原始记录单。",
    reaction_condition_reviews={
        record.reaction_conditions[0].id: "310.15K=37℃，与工艺一致，已核对上一班记录。",
        record.reaction_conditions[3].id: "pH=7.4无单位为无量纲，补录说明合理。",
    },
    spectrum_interpretations={
        record.spectrum_data[2].id: (
            "产物峰(6.12min)与杂质X(6.02min)中度重叠，已采用276nm/405nm双波长校正，"
            "结合回收率96.8%验证定量可靠。建议后续方法开发中优化梯度洗脱分离度。"
        ),
    },
    pass_review=True,
)
ok, msg, record = services.submit_review(db, record.id, review_payload)
assert ok, msg
print(f"✅ 复核提交：{msg}")
print(f"   当前状态={record.status}, 复核人={record.reviewer}")
print(f"   处理意见：{record.processing_opinion[:100]}...")
assert record.status == "reviewed", f"状态应为 reviewed 但为 {record.status}"

print("\n" + "=" * 60)
print("【步骤4】生成普通话解释 + 异常追溯链 + PDF导出")
print("=" * 60)
from app.schemas import ProcessingRecordDetailOut
detail = ProcessingRecordDetailOut.model_validate(record).model_dump()

plain = generate_report_plain_explain(detail)
print("✅ 普通话解释（首段）：")
print("   " + plain.split("\n\n")[0][:120] + "...")

print("\n✅ 异常追溯链（以ONPG称量精度不足为起点）：")
chain = generate_audit_chain(detail, anomaly_key="ONPG")
for node in chain:
    print(f"   节点 L{node['level']}：{node['node']}")
    if isinstance(node["evidence"], dict):
        for k, v in list(node["evidence"].items())[:2]:
            v_str = str(v)[:80]
            print(f"     ↳ {k}: {v_str}")

print("\n✅ 生成PDF报告...")
filename = export_pdf(detail, chain)
print(f"   报告文件名：{filename}")
fp = Path("/Users/mac/pro/solo/workspaces/y12797/backend/data/exports") / filename
assert fp.exists(), "PDF文件未生成"
print(f"   文件大小：{fp.stat().st_size} bytes")

print("\n" + "=" * 60)
print("【步骤5】模拟服务重启后：查询上一轮处理痕迹（持久化验证）")
print("=" * 60)
# 关闭再重开session
db.close()
db2 = SessionLocal()
total, items = services.list_records(db2, keyword=record.batch_no)
assert total >= 1, "重启后应能查询到上一轮记录"
fetched = items[0]
print(f"✅ 重启后查询成功：共 {total} 条，首条={fetched.record_no}")
print(f"   批次={fetched.batch_no}, 状态={fetched.status}, 复核人={fetched.reviewer}")
assert fetched.status == "reviewed", "状态持久化失败"
assert fetched.reviewer == "配方主管-王工", "复核人持久化失败"
assert fetched.has_temp_unit_mix and fetched.has_peak_overlap and fetched.has_weighing_issue, "异常标记持久化失败"
print("   ✔ 所有异常标记均已持久化（温度混用/峰重叠/称量不足）")

# 浓度换算与谱图判读共用记录验证
detail2 = services.get_record_detail(db2, fetched.id)
assert len(detail2.substrate_conversions) > 0 and len(detail2.spectrum_data) > 0
assert detail2.substrate_conversions[0].record_id == detail2.spectrum_data[0].record_id == detail2.id
print(f"   ✔ 浓度换算({len(detail2.substrate_conversions)}项)与谱图判读({len(detail2.spectrum_data)}项)"
      f"共用同一条处理记录(关联record_id={detail2.id})")

# 状态日志追溯
print(f"\n✅ 状态推进日志：")
for log in detail2.status_logs:
    print(f"   • {log.operated_at} [{log.operator}] {log.from_status or '∅'} → {log.to_status} | {log.operation_note or ''}")
assert len(detail2.status_logs) >= 3, "应至少包含导入/推进/复核三次状态变更"

print("\n" + "=" * 60)
print("🎉 所有端到端测试通过！")
print("=" * 60)
db2.close()
