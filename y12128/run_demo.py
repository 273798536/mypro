import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cf_diag import CFDiagPipeline


def main():
    samples_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
    os.makedirs(output_dir, exist_ok=True)

    pipe = CFDiagPipeline()

    print("=" * 60)
    print("  协同过滤相似度诊断 — 端到端演示")
    print("=" * 60)

    print("\n[1] 导入用户行为...")
    pipe.load_user_behaviors(os.path.join(samples_dir, "user_behavior.json"))
    print(f"   已导入 {sum(len(v) for v in pipe.store.user_behaviors.values())} 条行为记录")

    print("\n[2] 导入物品标签...")
    pipe.load_item_tags(os.path.join(samples_dir, "item_tags.json"))
    print(f"   已导入 {len(pipe.store.item_tags)} 个物品的标签")

    print("\n[3] 导入评分矩阵...")
    pipe.load_rating_matrix(os.path.join(samples_dir, "rating_matrix.json"))
    print(f"   已导入 {len(pipe.store.rating_matrix)} 个用户的评分")

    print("\n[4] 计算相似度（cosine / pearson / jaccard）...")
    pipe.compute_similarities()
    print(f"   共计算 {len(pipe.store.similarity_results)} 对相似度")

    print("\n[5] 运行诊断（热门挤占 + 稀疏矩阵）...")
    pipe.run_diagnostics()
    for d in pipe.store.diagnoses:
        print(f"   [{d.severity}] {d.diag_type}: {d.details}")
        print(f"          下一步: {d.next_step} → 找 {d.next_contact}")

    print("\n[6] 查看待确认冷启动项...")
    pending = pipe.get_pending_cold_starts()
    for cs in pending:
        print(f"   物品 {cs.item_id}: {cs.reason} (状态: {cs.status})")

    print("\n[7] 确认冷启动项（i5 确认正常，i4 确认冷启动）...")
    pipe.confirm_cold_start_item("i5", "实习生A", "confirmed_normal")
    pipe.confirm_cold_start_item("i4", "实习生A", "confirmed_cold")
    print("   i5 → confirmed_normal, i4 → confirmed_cold")

    print("\n[8] 人工修正（修正 i1-i2 cosine 相似度，理由：业务侧反馈偏高）...")
    pipe.apply_correction(
        "i1", "i2", "cosine", "score", "0.85",
        "业务侧反馈该相似度偏高，需下调", "实习生B"
    )
    print("   修正已记录并留痕")

    print("\n[9] 补录曝光记录...")
    pipe.load_exposures(os.path.join(samples_dir, "exposure.json"))
    print(f"   已补录曝光数据，数据版本升至 v{pipe.store.data_version}")

    print("\n[10] 曝光补录后重新计算相似度...")
    pipe.compute_similarities()
    changed = pipe.get_exposure_impact()
    print(f"   曝光补录导致 {len(changed)} 条结论变动:")
    for c in changed:
        print(f"   - {c['key']}: 分数 {c['old_score']}→{c['new_score']}, 状态 {c['old_status']}→{c['new_status']}")

    print("\n[11] 正向溯源：从用户行为查到最终结果...")
    fwd = pipe.trace_forward("u1")
    for item in fwd:
        print(f"   用户u1 行为: {item['behavior']['action']} 物品{item['behavior']['item_id']}")
        for sim in item["related_similarities"]:
            print(f"     → 相似度 {sim['similarity_key']}: {sim['score']} ({sim['method']}, {sim['status']})")

    print("\n[12] 反向溯源：从结果反查物品标签...")
    bwd = pipe.trace_backward("i1")
    print(f"   物品 i1 标签: {bwd['tags']}")
    for sim in bwd["related_similarities"]:
        print(f"     ← 相似度与 {sim['other_item']}: {sim['score']} ({sim['method']})")
        print(f"       对方标签: {sim['other_tags']}")
    if bwd["corrections"]:
        print(f"   该物品涉及的修正:")
        for c in bwd["corrections"]:
            print(f"     修正{c['correction_id']}: {c['field']} {c['old_value']}→{c['new_value']}")

    print("\n[13] 推荐解释（以 i1 为例）...")
    expl = pipe.explain("i1")
    print(f"   物品 i1 标签: {expl['tags']}")
    if expl["cold_start"]:
        print(f"   冷启动状态: {expl['cold_start']}")
    print(f"   相似物品 Top3:")
    for s in expl["similar_items"][:3]:
        print(f"     {s['item_id']} (相似度={s['similarity']}, {s['method']})")

    print("\n[14] 分组评估...")
    evals = pipe.evaluate_groups()
    for method, stats in evals.items():
        print(f"   {method}: 平均={stats['avg_score']}, 最高={stats['max_score']}, "
              f"最低={stats['min_score']}, 确认={stats['confirmed']}, 待定={stats['pending']}, "
              f"冷启动影响={stats['cold_start_affected']}")

    print("\n[15] 导出报告...")
    report_path = os.path.join(output_dir, "cf_diag_report.json")
    pipe.generate_report(report_path)
    print(f"   报告已导出: {report_path}")

    print("\n[16] 路由清单（下一步找谁核）...")
    routings = pipe.get_routings()
    for r in routings:
        print(f"   [{r['severity']}] {r['diagnosis_type']}: → 找 {r['contact']}")
        print(f"     {r['summary']}")
        print(f"     下一步: {r['next_step']}")

    print("\n" + "=" * 60)
    print("  演示完成！从用户行为到报告输出全链路已走通。")
    print("=" * 60)


if __name__ == "__main__":
    main()
