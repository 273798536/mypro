import requests
import json
import sys

BASE = "http://localhost:8000/api"


def post(path, data):
    r = requests.post(f"{BASE}{path}", json=data)
    r.raise_for_status()
    return r.json()


def get(path):
    r = requests.get(f"{BASE}{path}")
    r.raise_for_status()
    return r.json()


def main():
    print("=== 1. 创建灰度批次 ===")
    batch = post("/batches/", {
        "name": "6月召回灰度对比",
        "old_model_version": "recall-v2.3",
        "new_model_version": "recall-v2.4-beta",
    })
    batch_id = batch["id"]
    print(f"批次创建成功: {batch['name']} (id={batch_id})")

    print("\n=== 2. 导入旧模型召回结果 ===")
    old_queries = [
        {"query_id": "Q001", "query_text": "如何申请年假", "doc_id": "D101", "doc_title": "年假申请流程", "rank": 1, "score": 0.95},
        {"query_id": "Q001", "query_text": "如何申请年假", "doc_id": "D102", "doc_title": "假期管理制度", "rank": 2, "score": 0.88},
        {"query_id": "Q002", "query_text": "报销标准是什么", "doc_id": "D201", "doc_title": "差旅报销标准", "rank": 1, "score": 0.91},
        {"query_id": "Q002", "query_text": "报销标准是什么", "doc_id": "D202", "doc_title": "报销流程说明", "rank": 2, "score": 0.82},
        {"query_id": "Q003", "query_text": "新人入职培训", "doc_id": "D301", "doc_title": "入职培训指南", "rank": 1, "score": 0.87},
    ]
    for q in old_queries:
        post("/recalls/", {"batch_id": batch_id, "side": "old", **q})
    print(f"导入 {len(old_queries)} 条旧模型召回结果")

    print("\n=== 3. 导入新模型召回结果 ===")
    new_queries = [
        {"query_id": "Q001", "query_text": "如何申请年假", "doc_id": "D101", "doc_title": "年假申请流程", "rank": 1, "score": 0.97},
        {"query_id": "Q001", "query_text": "如何申请年假", "doc_id": "D103", "doc_title": "请假系统操作手册", "rank": 2, "score": 0.85},
        {"query_id": "Q002", "query_text": "报销标准是什么", "doc_id": "D201", "doc_title": "差旅报销标准", "rank": 2, "score": 0.89},
        {"query_id": "Q002", "query_text": "报销标准是什么", "doc_id": "D203", "doc_title": "报销标准明细表", "rank": 1, "score": 0.94},
        {"query_id": "Q003", "query_text": "新人入职培训", "doc_id": "D301", "doc_title": "入职培训指南", "rank": 1, "score": 0.90},
    ]
    for q in new_queries:
        post("/recalls/", {"batch_id": batch_id, "side": "new", **q})
    print(f"导入 {len(new_queries)} 条新模型召回结果")

    print("\n=== 4. 查看差异对比 ===")
    diff = get(f"/recalls/diff/{batch_id}")
    print(f"仅旧模型召回: {len(diff['only_in_old'])} 条查询")
    for item in diff["only_in_old"]:
        print(f"  查询 {item['query_id']}: 仅旧模型有 {', '.join(d['doc_id'] for d in item['old_docs'])}")
    print(f"仅新模型召回: {len(diff['only_in_new'])} 条查询")
    for item in diff["only_in_new"]:
        print(f"  查询 {item['query_id']}: 仅新模型有 {', '.join(d['doc_id'] for d in item['new_docs'])}")
    print(f"排序变化: {len(diff['rank_changed'])} 条查询")
    for item in diff["rank_changed"]:
        print(f"  查询 {item['query_id']}: 排序变化")

    print("\n=== 5. 人工改判（Q002/D201 新模型排序下降，运营改判为应置顶）===")
    override1 = post("/overrides/", {
        "batch_id": batch_id,
        "query_id": "Q002",
        "doc_id": "D201",
        "original_side": "new",
        "original_judgment": "rank_down",
        "override_judgment": "should_top",
        "reason": "差旅报销标准是核心文档，排序不应低于明细表",
        "source": "运营主管-张三",
        "operator": "张三",
    })
    print(f"改判创建成功: id={override1['id']}, status={override1['status']}")

    print("\n=== 6. 二次改判（验证旧改判不被覆盖）===")
    override2 = post("/overrides/", {
        "batch_id": batch_id,
        "query_id": "Q002",
        "doc_id": "D201",
        "original_side": "new",
        "original_judgment": "rank_down",
        "override_judgment": "should_top_v2",
        "reason": "复核后确认置顶",
        "source": "运营主管-李四",
        "operator": "李四",
    })
    print(f"二次改判创建成功: id={override2['id']}, status={override2['status']}")

    print("\n=== 7. 查看改判追溯 ===")
    trace = get(f"/overrides/trace/{batch_id}/Q002/D201")
    print(f"当前生效改判: {trace['current_override']['override_judgment'] if trace['current_override'] else '无'}")
    print(f"改判历史 ({len(trace['history'])} 条):")
    for h in trace["history"]:
        print(f"  {h['override_id'][:8]}... judgment={h['override_judgment']} source={h['source']} status={h['status']} superseded_by={h['superseded_by']}")

    print("\n=== 8. 挂载材料（工单+备注+说明）===")
    ticket = post("/materials/", {
        "batch_id": batch_id,
        "material_type": "ticket",
        "title": "工单#2026-0618: Q002召回排序异常",
        "content": "运营反馈Q002查询下差旅报销标准排序偏低",
        "linked_query_id": "Q002",
        "linked_doc_id": "D201",
        "operator": "张三",
    })
    print(f"工单挂载: {ticket['title']}")

    note = post("/materials/", {
        "batch_id": batch_id,
        "material_type": "supplement_note",
        "title": "后补备注: D103为新入库文档",
        "content": "请假系统操作手册为6月新入库，旧模型未召回属正常",
        "linked_query_id": "Q001",
        "linked_doc_id": "D103",
        "operator": "李四",
    })
    print(f"备注挂载: {note['title']}")

    desc = post("/materials/", {
        "batch_id": batch_id,
        "material_type": "supplement_desc",
        "title": "后补说明: 报销标准变更说明",
        "content": "6月起报销标准有更新，新模型召回D203更准确",
        "linked_query_id": "Q002",
        "linked_doc_id": "D203",
        "operator": "张三",
    })
    print(f"说明挂载: {desc['title']}")

    print("\n=== 9. 标记样本泄漏 ===")
    leak = post("/leaks/", {
        "batch_id": batch_id,
        "query_id": "Q001",
        "doc_id": "D101",
        "impact_scope": "Q001相关所有查询, 影响约15条测试样本",
        "source_line": "训练集train_2026Q2.parquet第347行, query_text匹配",
        "operator": "张三",
    })
    print(f"泄漏标记: impact={leak['impact_scope']}")
    print(f"  source_line={leak['source_line']}")
    print(f"  status={leak['status']}")

    print("\n=== 10. 运营视图 ===")
    status = get(f"/dashboard/status/{batch_id}")
    print(f"批次: {status['batch_name']}")
    print(f"  总查询数: {status['total_queries']}")
    print(f"  改判总数: {status['overrides_total']} (已接受={status['overrides_accepted']}, 待处理={status['overrides_pending']})")
    print(f"  泄漏: 疑似={status['leaks_suspected']}, 确认={status['leaks_confirmed']}")
    print(f"  材料: {status['materials_count']} 条")

    print("\n=== 11. 完成批次 ===")
    completed = post(f"/batches/{batch_id}/complete", {})
    print(f"批次状态: {completed['status']}")

    print("\n✅ 全流程跑通！运营主管可自助操作。")


if __name__ == "__main__":
    main()
