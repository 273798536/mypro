"""
样例数据生成器 - 贴近日常知识库运营场景
包含：旧表数据、补录备注、漏填单位、评测偏科、安全拦截、版本回滚、标签冲突
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


def create_batch(name, description):
    """创建质检批次"""
    resp = requests.post(
        f"{BASE_URL}/api/batches",
        json={"name": name, "description": description}
    )
    data = resp.json()
    print(f"✓ 创建批次: {data['id']} - {data['name']}")
    return data


def import_training_samples(batch_id):
    """导入训练样本 - 混合日常场景"""
    items = [
        {
            "title": "客户咨询：保单现金价值怎么算？",
            "content": "投保人询问保单的现金价值计算方式，以及不同退保时间点对应的现金价值金额。",
            "answer": "保单现金价值 = 已交保费 - 保险公司运营成本分摊 - 风险保费 + 累计利息。具体金额请参考保单合同中的现金价值表。",
            "source": "客服工单-20240315",
            "difficulty": "medium",
            "knowledge_point": "保单现金价值"
        },
        {
            "title": "退保流程说明（2019旧版整理）",
            "content": "投保人申请退保需要准备的材料和办理流程。注：此为2019年版流程，2022年已更新线上办理通道。",
            "answer": "退保流程：1. 准备身份证、保单原件、银行卡；2. 前往线下网点填写退保申请书；3. 等待审核，约3-5个工作日到账。",
            "source": "历史知识库-2019Q4",
            "difficulty": "easy",
            "knowledge_point": "退保流程"
        },
        {
            "title": "理赔申请材料清单",
            "content": "客户申请理赔时需要提交的材料列表，包括医疗理赔、身故理赔、重疾理赔等不同类型。",
            "answer": "基础材料：理赔申请书、身份证明、保单原件。医疗理赔另需：诊断证明、医疗费用发票、费用明细。身故理赔另需：死亡证明、受益人身份证明。",
            "source": "理赔手册V3.2",
            "difficulty": "medium",
            "knowledge_point": "理赔申请"
        },
        {
            "title": "重疾险等待期",
            "content": "重疾险产品的等待期时长说明，以及等待期内出险的处理规则。",
            "answer": "重疾险等待期为90，等待期内确诊重疾不承担保险责任，无息退还已交保费。",
            "source": "产品条款摘录",
            "difficulty": "easy",
            "knowledge_point": "等待期"
        },
        {
            "title": "分红险收益计算方式",
            "content": "分红型保险的收益构成和计算方法，包括保证收益和浮动分红部分。",
            "answer": "分红险收益 = 保证利益 + 红利分配。保证利益写进合同，红利根据保险公司实际经营状况确定，分红水平不确定。",
            "source": "产品培训材料",
            "difficulty": "hard",
            "knowledge_point": "分红险"
        },
        {
            "title": "保单贷款额度及利率",
            "content": "保单贷款的最高额度、利率、期限等相关说明。",
            "answer": "保单贷款最高额度一般为现金价值的80%，贷款利率参照同期银行贷款利率，贷款期限最长6个月。",
            "source": "客服FAQ汇总",
            "difficulty": "medium",
            "knowledge_point": "保单贷款"
        },
    ]

    resp = requests.post(
        f"{BASE_URL}/api/batches/import",
        json={
            "batch_id": batch_id,
            "material_type": "training",
            "items": items
        }
    )
    data = resp.json()
    print(f"✓ 导入训练样本: {data['imported_count']} 条")
    return data["items"]


def import_eval_questions(batch_id):
    """导入评测题库 - 包含偏科坏数据"""
    items = [
        {
            "title": "犹豫期是多少天？",
            "content": "人身保险产品的犹豫期时长，以及犹豫期内退保的规则。",
            "answer": "犹豫期通常为10-15天，具体以合同约定为准。犹豫期内退保无息退还全部已交保费，仅收取工本费。",
            "source": "产品通用条款",
            "difficulty": "easy",
            "knowledge_point": "犹豫期"
        },
        {
            "title": "保单贷款额度上限是多少？",
            "content": "客户询问保单贷款最多能贷多少钱。",
            "answer": "保单贷款最高额度为保单现金价值的80%，具体以保险公司规定为准。",
            "source": "客服标准问答",
            "difficulty": "easy",
            "knowledge_point": "保单贷款"
        },
        {
            "title": "投连险与万能险的精算假设比较",
            "content": "从准备金评估利率、死亡率假设、费用率假设、退保率假设四个维度，比较投资连结保险和万能保险的精算模型差异，并分析其对偿付能力监管资本要求的影响。",
            "answer": "投连险和万能险在精算假设上存在多维度差异...（以下省略2000字精算术语推导）",
            "source": "精算部内部文档-摘录",
            "difficulty": "hard",
            "knowledge_point": "精算原理"
        },
        {
            "title": "理赔时效是多久？",
            "content": "保险公司收到理赔申请后，一般需要多长时间做出核定？",
            "answer": "情形简单的，应当在30日内作出核定；情形复杂的，最长不超过60日。核定结果应当及时通知受益人。",
            "source": "保险法摘要",
            "difficulty": "medium",
            "knowledge_point": "理赔时效"
        },
        {
            "title": "受益人变更流程",
            "content": "投保人如何变更保单的受益人？需要哪些材料？",
            "answer": "变更受益人需由投保人提出书面申请，经被保险人同意后，携带身份证、保单原件到保险公司办理，或通过线上服务渠道申请。",
            "source": "保全手册",
            "difficulty": "medium",
            "knowledge_point": "受益人变更"
        },
        {
            "title": "宽限期是多少天？",
            "content": "分期支付保费的保单，宽限期时长是多少？",
            "answer": "宽限期一般为60天，宽限期内保单仍然有效，出险仍可获得赔付，但会扣除欠交的保费。",
            "source": "客服标准问答",
            "difficulty": "easy",
            "knowledge_point": "宽限期"
        },
    ]

    resp = requests.post(
        f"{BASE_URL}/api/batches/import",
        json={
            "batch_id": batch_id,
            "material_type": "eval",
            "items": items
        }
    )
    data = resp.json()
    print(f"✓ 导入评测题库: {data['imported_count']} 条")
    return data["items"]


def mark_special_materials(training_items, eval_items):
    """标记特殊材料属性 - 旧表、补录、漏填、偏科"""
    print("\n--- 标记特殊属性材料 ---")

    special_map = {
        "退保流程说明（2019旧版整理）": {
            "is_old_table": True,
            "old_table_version": "2019旧版",
            "has_supplement_note": True,
            "supplement_note": "2022年已更新线上退保通道，此为历史归档版本仍被部分坐席引用"
        },
        "理赔申请材料清单": {
            "has_supplement_note": True,
            "supplement_note": "补充：2024年新增线上理赔渠道，可直接上传电子材料，无需提交纸质原件"
        },
        "重疾险等待期": {
            "missing_unit": True,
            "supplement_note": "答案中写的是90，没写单位（天/天），实际应为90天"
        },
        "投连险与万能险的精算假设比较": {
            "is_bias_sample": True,
            "has_supplement_note": True,
            "supplement_note": "评测集偏科样本：过深的精算专业题，超出日常客服场景，拉高了整体难度分布"
        },
    }

    all_items = training_items + eval_items
    for item in all_items:
        title = item["title"]
        if title in special_map:
            material_id = item["id"]
            updates = special_map[title]
            resp = requests.patch(
                f"{BASE_URL}/api/materials/{material_id}",
                json=updates
            )
            if resp.status_code == 200:
                print(f"  • {title} -> {list(updates.keys())}")
                item.update(resp.json())
            else:
                print(f"  ✗ {title} 更新失败: {resp.text}")

    return all_items


def create_agent_traces(batch_id, all_items):
    """生成多Agent轨迹 - 模拟多轮处理链路"""
    print("\n--- 生成多Agent轨迹 ---")

    traces_data = []

    for item in all_items:
        material_id = item["id"]
        title = item["title"]

        traces = []

        traces.append({
            "material_id": material_id,
            "agent_name": "意图识别Agent",
            "agent_role": "router",
            "step_order": 1,
            "input_text": title,
            "output_text": "识别为：保险知识问答类",
            "thought_process": "分析用户问题类型，判断属于知识查询而非操作类",
            "status": "completed",
            "cost_time_ms": 120,
            "tokens_used": 45,
            "judgment_before": "正常",
            "judgment_after": "正常",
            "is_intercepted": False,
        })

        traces.append({
            "material_id": material_id,
            "agent_name": "知识检索Agent",
            "agent_role": "retriever",
            "step_order": 2,
            "input_text": title,
            "output_text": f"检索到3条相关知识片段，top1相似度0.87",
            "thought_process": "向量检索 + 关键词召回，rerank后取top3",
            "status": "completed",
            "cost_time_ms": 280,
            "tokens_used": 120,
            "judgment_before": "正常",
            "judgment_after": "正常",
            "is_intercepted": False,
        })

        traces.append({
            "material_id": material_id,
            "agent_name": "答案生成Agent",
            "agent_role": "generator",
            "step_order": 3,
            "input_text": f"问题：{title}\n参考材料：...",
            "output_text": item.get("answer", ""),
            "thought_process": "基于检索到的知识片段，组织语言生成回答",
            "status": "completed",
            "cost_time_ms": 560,
            "tokens_used": 320,
            "judgment_before": "通过",
            "judgment_after": "通过",
            "is_intercepted": False,
        })

        if "分红" in title or "收益" in title:
            traces.append({
                "material_id": material_id,
                "agent_name": "合规审查Agent",
                "agent_role": "safety",
                "step_order": 4,
                "input_text": item.get("answer", ""),
                "output_text": "存在收益承诺风险，需修改表述",
                "thought_process": "检测到'保证收益'等绝对化表述，触发敏感词拦截",
                "status": "intercepted",
                "cost_time_ms": 90,
                "tokens_used": 60,
                "judgment_before": "通过",
                "judgment_after": "需复核",
                "is_intercepted": True,
                "interception_reason": "存在收益承诺表述，涉嫌误导消费者",
            })

            interception = {
                "material_id": material_id,
                "original_judgment": "通过",
                "original_score": 0.85,
                "intercepted_judgment": "需复核",
                "intercepted_score": 0.42,
                "interception_type": "合规风险",
                "interception_level": "medium",
                "interception_detail": "检测到'保证利益'、'确定'等绝对化表述，涉嫌承诺收益，违反人身保险产品宣传规定。",
            }
            resp = requests.post(f"{BASE_URL}/api/safety-interceptions", json=interception)
            print(f"  ⚠ 安全拦截: {title} - 从'通过'变为'需复核'")

        traces_data.extend(traces)

    for trace in traces_data:
        resp = requests.post(f"{BASE_URL}/api/traces", json=trace)
        if resp.status_code != 200:
            print(f"  ✗ 创建轨迹失败: {resp.text}")

    print(f"  共生成 {len(traces_data)} 条Agent轨迹")


def create_review_records(batch_id, all_items):
    """创建复核记录 + 标注记录 + 标签冲突 - 同一轮复核"""
    print("\n--- 创建复核记录（人工反馈+标注+标签冲突 同一轮） ---")

    training_items = [m for m in all_items if m["material_type"] == "training"]
    eval_items = [m for m in all_items if m["material_type"] == "eval"]

    reviews = []

    reviews.append({
        "material_id": training_items[1]["id"],
        "reviewer": "张运营",
        "feedback": "这条是2019年的旧版退保流程，现在已经有线上办理通道了，建议标记为'历史归档'，不要让模型直接用。答案里的线下网点流程太旧了。",
        "label": "退保类-历史版本",
        "score": 0.6,
        "has_label_conflict": True,
        "conflict_with": "模型标注",
        "original_label": "退保类-通用知识",
        "review_round": 1,
    })
    print(f"  • 复核[退保流程旧版]: 标签冲突（模型标'退保类-通用知识' vs 人工标'退保类-历史版本'）")

    reviews.append({
        "material_id": training_items[3]["id"],
        "reviewer": "张运营",
        "feedback": "答案里写的'90'没写单位，这是个典型的漏填单位问题。应该是'90天'，不写单位容易让客户误解为90个工作日或者别的。",
        "label": "等待期-需修正",
        "score": 0.4,
        "has_label_conflict": False,
        "review_round": 1,
    })
    print(f"  • 复核[重疾险等待期]: 漏填单位，标注为'等待期-需修正'")

    reviews.append({
        "material_id": eval_items[2]["id"],
        "reviewer": "李主管",
        "feedback": "这道精算题太偏了，日常客服根本不会遇到。评测集里放这种题会拉高整体难度，让评测结果看起来模型不行，但其实是题目偏科。建议从评测集里移除，或单独放到专业题库。",
        "label": "评测集-偏科样本",
        "score": 0.3,
        "has_label_conflict": True,
        "conflict_with": "原始标注",
        "original_label": "保险知识-精算",
        "review_round": 1,
    })
    print(f"  • 复核[精算假设比较]: 评测集偏科，标签冲突（'保险知识-精算' vs '评测集-偏科样本'）")

    reviews.append({
        "material_id": training_items[0]["id"],
        "reviewer": "张运营",
        "feedback": "这条没问题，现金价值的解释很清楚，也提示了以合同为准。",
        "label": "保单价值类-合格",
        "score": 0.9,
        "has_label_conflict": False,
        "review_round": 1,
    })
    print(f"  • 复核[现金价值]: 通过，无冲突")

    reviews.append({
        "material_id": training_items[2]["id"],
        "reviewer": "李主管",
        "feedback": "有补录备注很重要，标注团队后来补充的线上理赔信息。这条材料的标注质量不错，人工补录的信息也加进去了。",
        "label": "理赔类-已补录",
        "score": 0.8,
        "has_label_conflict": False,
        "review_round": 1,
    })
    print(f"  • 复核[理赔材料清单]: 有补录备注，通过")

    for review in reviews:
        resp = requests.post(f"{BASE_URL}/api/reviews/submit", json=review)
        if resp.status_code != 200:
            print(f"  ✗ 提交复核失败: {resp.text}")

    print(f"  共提交 {len(reviews)} 条复核记录（含2条标签冲突）")
    return reviews


def simulate_rollback(batch_id, all_items):
    """模拟版本回滚丢记录 - 2-3个常见例子，每个都真改变结果"""
    print("\n--- 模拟版本回滚（丢记录卡点追踪） ---")

    training_items = [m for m in all_items if m["material_type"] == "training"]

    old_table_item = training_items[1]
    missing_unit_item = training_items[3]

    rollback1 = {
        "batch_id": batch_id,
        "rollback_from_version": "V3.2",
        "rollback_to_version": "V2.1",
        "reason": "V3.2导入的新版退保流程有bug，回退到V2.1稳定版",
        "lost_material_ids": [old_table_item["id"]],
        "lost_material_titles": [old_table_item["title"]],
        "stuck_material_id": old_table_item["id"],
        "stuck_material_title": old_table_item["title"],
        "stuck_reason": "旧表格式不兼容，V2.1没有supplement_note字段，回滚时卡在这条材料上",
        "operator": "系统管理员",
    }
    resp = requests.post(f"{BASE_URL}/api/rollbacks", json=rollback1)
    print(f"  ⚠ 回滚1: V3.2 → V2.1，卡在[{old_table_item['title']}]，原因：旧表格式不兼容")

    rollback2 = {
        "batch_id": batch_id,
        "rollback_from_version": "V2.5",
        "rollback_to_version": "V2.0",
        "reason": "等待期数据批量修正后出现单位混乱，回滚到修正前版本排查",
        "lost_material_ids": [missing_unit_item["id"]],
        "lost_material_titles": [missing_unit_item["title"]],
        "stuck_material_id": missing_unit_item["id"],
        "stuck_material_title": missing_unit_item["title"],
        "stuck_reason": "漏填单位的材料在旧版schema中没有校验，回滚时单位字段映射失败",
        "operator": "知识库运营",
    }
    resp = requests.post(f"{BASE_URL}/api/rollbacks", json=rollback2)
    print(f"  ⚠ 回滚2: V2.5 → V2.0，卡在[{missing_unit_item['title']}]，原因：漏填单位字段映射失败")

    print("  共2条回滚记录，每条都真改变结果（丢了1条材料）")


def generate_report(batch_id):
    """生成质检报告"""
    print("\n--- 生成质检报告 ---")
    resp = requests.post(
        f"{BASE_URL}/api/reports/generate",
        json={
            "batch_id": batch_id,
            "title": "2024年Q2知识库质检报告（多Agent轨迹版）",
            "exported_by": "知识库运营-张主管"
        }
    )
    report = resp.json()
    print(f"  ✓ 报告生成: {report['title']}")
    print(f"    总材料数: {report['total_materials']}")
    print(f"    通过率: {report['pass_rate']}%")
    print(f"    问题数: {report['issue_count']}")
    print(f"    安全拦截: {report['interception_count']} 条")
    print(f"    标签冲突: {report['label_conflict_count']} 条")
    print(f"    回滚影响: {report['rollback_affected_count']} 条")
    print(f"    拦截前分布: {report['distribution_before']}")
    print(f"    拦截后分布: {report['distribution_after']}")
    if report['rollback_stuck_details']:
        print(f"    回滚卡点详情:")
        for k, v in report['rollback_stuck_details'].items():
            print(f"      - {v['stuck_material_title']}: {v['stuck_reason']}")
    return report


def main():
    print("=" * 60)
    print("  多Agent轨迹质检 - 样例数据生成")
    print("=" * 60)

    batch = create_batch(
        "2024年Q2知识库质检批次（多Agent轨迹版）",
        "包含训练样本和评测题库，检查多Agent处理链路中的质量问题。特别关注：旧表数据、补录备注、漏填单位、评测偏科、安全拦截、版本回滚等场景。"
    )
    batch_id = batch["id"]

    training_items = import_training_samples(batch_id)
    eval_items = import_eval_questions(batch_id)

    all_items = mark_special_materials(training_items, eval_items)

    create_agent_traces(batch_id, all_items)

    create_review_records(batch_id, all_items)

    simulate_rollback(batch_id, all_items)

    report = generate_report(batch_id)

    print("\n" + "=" * 60)
    print("  样例数据生成完成！")
    print("=" * 60)
    print(f"  批次ID: {batch_id}")
    print(f"  查看报告: GET /api/reports/{report['id']}")
    print(f"  API文档: http://127.0.0.1:8000/docs")
    print("=" * 60)


if __name__ == "__main__":
    main()
