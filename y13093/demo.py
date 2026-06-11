from models import FilterCondition, ViewSnapshot, ViewAngle, MaterialStatus
from processor import MaterialProcessor
from handover import HandoverWorkflow


def build_sample_materials(p: MaterialProcessor):
    """攒够三类材料：传感器记录正常样本 + 一条边界样本 + 后补说明"""

    fc_main = FilterCondition(
        section_range="K125+300~K125+500",
        sensor_type="位移计/LVDT",
        anomaly_level_min=1,
        anomaly_level_max=5,
        date_from="2026-05-01",
        date_to="2026-06-10",
        raw_query="桥隧检修平台剖面-北侧位移",
    )

    p.create_from_sensor(
        sensor_record_id="SNS-20260608-0147",
        fc=fc_main,
        view=ViewSnapshot(
            angle=ViewAngle.PROFILE_SIDE,
            zoom_level=1.0,
            pan_offset_x=0, pan_offset_y=0,
            highlighted_objects=["AO-211"],
        ),
        scene_text="北侧检修平台上弦杆侧向位移剖面，AO-211处超阈值3.2mm",
        side_items=[
            (1, "采集频率1Hz，温漂已扣"),
            (2, "对照值：同截面南侧<0.5mm"),
            (3, "建议：重点关注AO-211节点焊缝"),
        ],
        anomaly_refs=["AO-211"],
        status=MaterialStatus.ANOMALY,
    )

    p.create_from_sensor(
        sensor_record_id="SNS-20260608-0152",
        fc=fc_main,
        view=ViewSnapshot(
            angle=ViewAngle.PROFILE_CROSS,
            zoom_level=1.2,
            pan_offset_x=-20, pan_offset_y=10,
            highlighted_objects=["AO-211", "AO-208"],
        ),
        scene_text="跨中断面横向挠度分布，AO-211/AO-208连线存在扭转变形",
        side_items=[
            (1, "横断面取点间距0.5m"),
            (2, "扭转角=0.032°，接近预警值"),
        ],
        anomaly_refs=["AO-211", "AO-208"],
        status=MaterialStatus.NORMAL,
    )

    p.create_from_sensor(
        sensor_record_id="SNS-20260607-0098",
        fc=FilterCondition(
            section_range="K125+395~K125+405",
            sensor_type="应变计/FOG",
            anomaly_level_min=0,
            anomaly_level_max=1,
            date_from="2026-06-05",
            date_to="2026-06-08",
            raw_query="边界样本-节点屈服临近",
        ),
        view=ViewSnapshot(
            angle=ViewAngle.CLOSE_UP,
            zoom_level=2.8,
            pan_offset_x=45, pan_offset_y=-30,
            highlighted_objects=["AO-BND-03"],
        ),
        scene_text="AO-BND-03节点腹板应变时程，微应变峰值118接近120阈值",
        side_items=[
            (1, "边界样本：连续3小时>110με"),
            (2, "未入异常，但建议每周复核"),
        ],
        anomaly_refs=[],
        status=MaterialStatus.BOUNDARY,
        boundary_note="2026-06-07 14:37~17:42 连续超限，风速6级配合，疑似工况耦合边界",
    )

    p.create_from_sensor(
        sensor_record_id="SNS-20260609-0201-SUP",
        fc=FilterCondition(
            section_range="K125+300~K125+500",
            sensor_type="温湿度/补",
            anomaly_level_min=0,
            anomaly_level_max=5,
            date_from="2026-06-08",
            date_to="2026-06-09",
            raw_query="后补说明-环境温湿度对位移解耦的影响",
        ),
        view=ViewSnapshot(
            angle=ViewAngle.TOP_DOWN,
            zoom_level=0.8,
            pan_offset_x=0, pan_offset_y=0,
            highlighted_objects=[],
        ),
        scene_text="环境温湿度叠合曲线，用于位移数据热胀冷缩解耦参考",
        side_items=[
            (1, "6/8 11:00 升温3.1℃，对应位移同步1.8mm"),
            (2, "后补说明：排除温度影响后AO-211净位移1.4mm"),
        ],
        anomaly_refs=["AO-211"],
        status=MaterialStatus.SUPPLEMENT,
        supplement_note="方案经理小赵6/10追加：温变解耦后净位移仍超限，确认异常成立",
    )

    p.create_from_sensor(
        sensor_record_id="SNS-20260606-0032",
        fc=FilterCondition(
            section_range="K126+100~K126+300",
            sensor_type="位移计/LVDT",
            anomaly_level_min=1,
            anomaly_level_max=5,
            date_from="2026-06-04",
            date_to="2026-06-06",
            raw_query="相邻段对照",
        ),
        view=ViewSnapshot(
            angle=ViewAngle.PROFILE_SIDE,
            zoom_level=1.0,
            pan_offset_x=0, pan_offset_y=0,
            highlighted_objects=["AO-305"],
        ),
        scene_text="K126+200检修平台对照剖面，最大位移0.8mm",
        side_items=[
            (1, "同设计工况对照段，变形正常"),
            (2, "支撑对比K125+400段刚度差约12%"),
        ],
        anomaly_refs=["AO-305"],
        status=MaterialStatus.ANOMALY,
    )


def demo():
    print("=" * 70)
    print("桥隧检修平台剖面讲解 —— 样例材料与接手流程演示")
    print("=" * 70)

    p = MaterialProcessor()
    build_sample_materials(p)
    print(f"\n[材料清单] 共加载 {len(p.materials)} 份材料")
    for m in p.materials:
        print(f"  {m.material_id} | {m.status.value:10s} | {m.sensor_record_id:20s} | {m.detail_marker()}")

    orphans = p.scan_orphan_screenshots()
    print(f"\n[坏材料扫描] 截图条件丢失/三套话不一致：{len(orphans)} 条")
    for o in orphans:
        print(f"  ⚠  {o}")

    print("\n" + "-" * 70)
    print("[接手流程] 启动 HandoverWorkflow：找异常 → 换视角 → 验证三件事")
    print("-" * 70)

    hw = HandoverWorkflow(p)
    anomalies = hw.step1_anomaly_first()
    print(f"\nSTEP 1 — 先找异常对象：共 {len(anomalies)} 条")
    for a in anomalies:
        print(f"  ● {a['object_id']} L{a['level']} | 关联{a['anomaly_material_count']}份异常材料 | 入口={a['quick_entry_material_id']}")

    target = anomalies[0]
    print(f"\nSTEP 2 — 换视角截图，入口材料={target['quick_entry_material_id']}，高亮={target['object_id']}")
    s2 = hw.step2_switch_view(
        target["quick_entry_material_id"],
        angle=ViewAngle.CLOSE_UP,
        zoom=2.5,
        pan_x=30, pan_y=-15,
        highlight=[target["object_id"]],
    )
    for k, v in s2.items():
        print(f"    {k}: {v}")

    print(f"\nSTEP 3 — 三件事验证：放样例 / 重跑 / 看异常队列")
    s3 = hw.step3_verify_export(target["quick_entry_material_id"])
    print(f"  三套话一致性: {s3['triplet_consistent']}")
    print(f"  整体验证通过: {s3['verify']['全部通过']}")
    for k, v in s3["verify"].items():
        if k != "全部通过":
            print(f"    {k}: {v}")

    print("\n" + "-" * 70)
    print("[导出样例] 边界材料 & 后补说明")
    print("-" * 70)
    for m in p.materials:
        if m.status in (MaterialStatus.BOUNDARY, MaterialStatus.SUPPLEMENT):
            print("\n" + p.export_brief(m.material_id))

    orphans2 = p.scan_orphan_screenshots()
    print(f"\n[最终坏材料扫描] 共 {len(orphans2)} 条")
    for o in orphans2:
        print(f"  ⚠  {o}")

    print("\n" + "=" * 70)
    print("接手流程步骤日志：")
    print(hw.summary())
    print("=" * 70)


if __name__ == "__main__":
    demo()
