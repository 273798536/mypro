from models import MergeSession, ResidentFeedback, MergeRule
from merger import PointMerger, ManualOperator
from report import ReviewReport


def build_demo_feedbacks() -> list:
    return [
        ResidentFeedback(
            school_name="阳光第一小学",
            point_description="学校正门路口",
            peak_type="早高峰",
            raw_text="送孩子在阳光第一小学正门路口下车，早高峰很堵",
            source="居民微信群",
        ),
        ResidentFeedback(
            school_name="阳光第一小学",
            point_description="阳光一小大门口",
            peak_type="上午",
            raw_text="阳光一小大门口，早上车多",
            source="社区小程序",
        ),
        ResidentFeedback(
            school_name="阳光第一小学",
            point_description="正门东侧路口",
            peak_type="早高峰",
            raw_text="正门东侧路口红绿灯那里下车，不是大门正门口",
            source="居民电话",
        ),
        ResidentFeedback(
            school_name="阳光第一小学",
            point_description="正门西侧路口",
            peak_type="晚高峰",
            raw_text="下午接孩子，正门西侧路口等",
            source="社区小程序",
        ),
        ResidentFeedback(
            school_name="阳光第一小学",
            point_description="学校后门",
            peak_type="晚高峰",
            raw_text="阳光第一小学后门接孩子，下午4点半",
            source="居民微信群",
        ),
        ResidentFeedback(
            school_name="阳光第一小学",
            point_description="一小后门",
            peak_type="下午",
            raw_text="一小后门，靠近家属院那个门",
            source="社区网格员",
        ),
        ResidentFeedback(
            school_name="实验幼儿园",
            point_description="园门口",
            peak_type="送学",
            raw_text="实验幼儿园园门口早上送孩子",
            source="家长群",
        ),
        ResidentFeedback(
            school_name="实验幼儿园",
            point_description="实验幼儿园大门口",
            peak_type="接学",
            raw_text="实验幼儿园大门口下午接，没写高峰的那条下面算早晚",
            source="家长群",
        ),
        ResidentFeedback(
            school_name="实验幼儿园",
            point_description="幼儿园门口",
            peak_type="",
            raw_text="幼儿园门口（没标注高峰）",
            source="随手拍",
        ),
    ]


def main():
    session = MergeSession(version="gray-preview-1")
    session.rules.append(
        MergeRule(
            rule_name="文本相似度归并",
            description="归一化后路名相似度≥0.72自动归并，≥0.50且有方位词差异标记相邻路口风险",
            peak_scope="both",
            threshold=0.72,
        )
    )
    session.feedbacks = build_demo_feedbacks()
    print(f"[1] 加载居民反馈：{len(session.feedbacks)} 条")

    merger = PointMerger(session)
    anomalies = merger.run_merge()
    print(f"[2] 自动归并完成，生成点位 {len(session.merged_points)} 个，异常提示 {len(anomalies)} 条")
    for i, p in enumerate(session.merged_points):
        print(f"    点位#{i+1} [{p.school_name}] {p.canonical_name} "
              f"(早{p.peak_morning_count}/晚{p.peak_evening_count}) "
              f"异常={len(p.anomaly_flags)} 别名={len(p.aliases)}")

    operator = ManualOperator(session, operator="社区运营-阿宁")
    target_point = None
    for p in session.merged_points:
        if "阳光第一小学" in p.school_name and "正门" in p.canonical_name:
            target_point = p
            break
    if target_point and target_point.anomaly_flags:
        print(f"[3] 模拟人工处理点位：{target_point.canonical_name}")
        all_fids = list(target_point.feedback_refs)
        keep = all_fids[: len(all_fids) // 2 or 1]
        split_name = "正门东侧路口(红绿灯)"
        new_id = operator.split_point(
            point_id=target_point.point_id,
            keep_feedback_ids=keep,
            split_name=split_name,
            reason="对照百度地图核实，东侧红绿灯和西侧路口是两个不同的接送点",
        )
        print(f"    拆分完成，新建点位ID={new_id}，名称={split_name}")

        operator.rename_canonical(
            target_point.point_id,
            new_name="正门西侧路口(校牌处)",
            reason="原标准名过于笼统，补充方位词明确点位",
        )
        print(f"    重命名完成：{target_point.canonical_name}")

        operator.confirm_point(target_point.point_id, reason="地图+现场双确认")
        operator.confirm_point(new_id, reason="地图+现场双确认")
        print("    两处点位均已人工确认")

    others = [p for p in session.merged_points if not p.is_manual_confirmed]
    for p in others:
        operator.confirm_point(p.point_id, reason="名称一致，无相邻路口风险")
    print(f"[4] 其余 {len(others)} 个点位全部确认")

    session_path = "output_session.json"
    session.save(session_path)
    print(f"[5] 会话已保存到 {session_path}")

    report = ReviewReport(session)
    html_path = "output_report.html"
    report.render_html(html_path)
    print(f"[6] HTML 复核报告已生成：{html_path}")

    json_path = "output_data.json"
    report.render_flat_json(json_path)
    print(f"[7] JSON 接口对照数据已生成：{json_path}")

    hist_summary = {}
    for h in session.history:
        hist_summary[h.action] = hist_summary.get(h.action, 0) + 1
    print(f"[8] 灰度复盘历史：{hist_summary}")


if __name__ == "__main__":
    main()
