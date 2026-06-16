import database as db
import random
from typing import Dict, List, Any

CATEGORIES = ["阅读理解", "逻辑推理", "代码生成", "数学计算", "翻译任务", "常识问答"]
DIFFICULTIES = ["简单", "中等", "困难"]

QUESTION_TEMPLATES: Dict[str, List[str]] = {
    "阅读理解": [
        "请阅读以下材料并回答：全球变暖对北极冰盖的影响主要体现在哪些方面？",
        "根据上下文，解释文中划线句子的含义：历史的车轮滚滚向前。",
        "请概括本文的中心思想，不超过100字。",
        "作者在第三段使用了什么修辞手法？请举例说明。",
    ],
    "逻辑推理": [
        "如果所有的猫都是动物，所有的动物都需要食物，那么下列说法正确的是？",
        "甲比乙高，乙比丙矮，丙比丁高，请判断谁最高。",
        "某公司有30%的员工是销售，销售中有40%是男性，求男性销售占总员工的比例。",
        "请找出数列的规律并填写下一项：2, 6, 12, 20, 30, ?",
    ],
    "代码生成": [
        "用Python写一个快速排序算法。",
        "实现一个LRU缓存，支持get和put操作，时间复杂度O(1)。",
        "写一个正则表达式匹配中国手机号码。",
        "实现一个二叉树的前序遍历（非递归方式）。",
    ],
    "数学计算": [
        "求解方程：2x² + 5x - 3 = 0",
        "计算：1+2+3+...+100 = ?",
        "已知圆的半径为5，求其面积和周长。",
        "一个商品打8折后售价为240元，求原价。",
    ],
    "翻译任务": [
        "将以下英文翻译成中文：Artificial intelligence is transforming every industry.",
        "将以下中文翻译成英文：春风又绿江南岸，明月何时照我还。",
        "中译英：我们应该保护环境，减少碳排放。",
        "英译中：The quick brown fox jumps over the lazy dog.",
    ],
    "常识问答": [
        "中国的首都是哪里？请简要介绍。",
        "水的分子式是什么？常压下沸点是多少？",
        "请列出太阳系八大行星，按距离太阳由近到远排序。",
        "人体最大的器官是什么？有哪些主要功能？",
    ],
}

REFERENCE_ANSWERS: Dict[str, str] = {
    "阅读理解": "参考答案要点：结合材料关键信息，分点作答，逻辑清晰。",
    "逻辑推理": "参考答案：请展示推理过程并给出最终结论。",
    "代码生成": "参考答案：代码结构清晰，时间复杂度符合要求，通过边界测试。",
    "数学计算": "参考答案：结果正确，步骤清晰。",
    "翻译任务": "参考答案：翻译准确、通顺，符合目标语言表达习惯。",
    "常识问答": "参考答案：事实准确，表述完整。",
}

EXCEPTION_TYPES = ["超时", "输出截断", "格式错误", "敏感词命中", "服务不可用", "解析错误"]


def seed_question_bank(count: int = 50) -> Dict[str, int]:
    rows: List[Dict[str, Any]] = []
    idx = 1
    for _ in range(count):
        cat = random.choices(
            CATEGORIES,
            weights=[0.22, 0.18, 0.20, 0.15, 0.12, 0.13],
            k=1
        )[0]
        text = random.choice(QUESTION_TEMPLATES[cat])
        diff = random.choices(DIFFICULTIES, weights=[0.35, 0.45, 0.20], k=1)[0]
        rows.append({
            "question_id": f"Q{idx:04d}",
            "question_text": text + f"（编号变体{random.randint(1, 100)}）",
            "category": cat,
            "difficulty": diff,
            "knowledge_point": f"{cat}-{diff}",
            "source": f"评测集v{random.randint(1, 3)}.{random.randint(0, 9)}",
            "reference_answer": REFERENCE_ANSWERS[cat],
            "tags": [cat, diff],
        })
        idx += 1
    return db.upsert_question_bank(rows)


def seed_prompt_version(name: str = "prompt_v1.0_基线版") -> Dict[str, Any]:
    prompt = f"""你是一个专业的评测助手。
请严格按照题目要求作答，答案要准确、简洁、逻辑清晰。
版本：{name}
"""
    return db.import_prompt_version(
        version_name=name,
        prompt_content=prompt,
        description=f"示例：{name} 版本，用于基线评测",
        import_note="示例数据，自动生成",
        author="系统示例"
    )


def seed_eval_records(prompt_version_id: int) -> Dict[str, int]:
    questions = db.list_questions()
    records: List[Dict[str, Any]] = []
    for q in questions:
        cat = q.get("category") or "未分类"
        base_pass_prob = {
            "阅读理解": 0.78, "逻辑推理": 0.70, "代码生成": 0.65,
            "数学计算": 0.72, "翻译任务": 0.85, "常识问答": 0.90,
            "未分类": 0.70,
        }.get(cat, 0.7)
        diff_mod = {"简单": 0.10, "中等": 0.0, "困难": -0.18, "未标注": 0.0}.get(q.get("difficulty") or "未标注", 0)
        pass_prob = max(0.15, min(0.98, base_pass_prob + diff_mod))

        exception_prob = 0.08
        is_exception = random.random() < exception_prob
        if is_exception:
            records.append({
                "question_id": q["question_id"],
                "model_output": None,
                "score": None,
                "is_pass": None,
                "eval_status": "exception",
                "exception_type": random.choice(EXCEPTION_TYPES),
                "exception_detail": f"在处理{cat}题时发生异常，请求ID={random.randint(100000, 999999)}",
                "latency_ms": random.randint(5000, 30000),
            })
        else:
            passed = random.random() < pass_prob
            if passed:
                score = round(random.uniform(70, 99), 1)
            else:
                score = round(random.uniform(20, 59), 1)
            records.append({
                "question_id": q["question_id"],
                "model_output": f"【{cat}回答示例】针对题目{q['question_id']}的模型输出内容，质量{'合格' if passed else '不合格'}。",
                "score": score,
                "is_pass": 1 if passed else 0,
                "eval_status": "done",
                "exception_type": None,
                "exception_detail": None,
                "latency_ms": random.randint(120, 3500),
            })
    return db.upsert_eval_records(prompt_version_id, records)


def seed_expected_ratio(prompt_version_id: int):
    expected = {
        "阅读理解": 20.0,
        "逻辑推理": 20.0,
        "代码生成": 20.0,
        "数学计算": 15.0,
        "翻译任务": 12.0,
        "常识问答": 13.0,
    }
    db.set_expected_ratio(prompt_version_id, expected)


def seed_treatment_notes(prompt_version_id: int):
    exc_records = db.list_eval_records(prompt_version_id=prompt_version_id, only_exception=True)
    note_types = ["已修复", "标记样本问题", "提示词优化建议", "模型能力限制", "需补充训练数据"]
    for i, rec in enumerate(exc_records[: min(3, len(exc_records))]):
        etype = rec.get("exception_type") or "未知异常"
        db.add_treatment_note(
            eval_record_id=rec["id"],
            note_type=note_types[i % len(note_types)],
            note_content=f"针对【{etype}】的处理意见：已定位原因是{random.choice(['上游服务抖动', '输入超长', '规则过严', '模型版本切换'])}，建议{random.choice(['重试', '增加容错', '调整阈值', '标注后加入训练集'])}。",
            handler=f"示例处理人{i+1}",
        )
    fail_records = db.list_eval_records(prompt_version_id=prompt_version_id, only_fail=True)
    for i, rec in enumerate(fail_records[: min(2, len(fail_records))]):
        db.add_treatment_note(
            eval_record_id=rec["id"],
            note_type="提示词优化建议",
            note_content=f"该题不通过原因：模型在{rec.get('category', '未知')}类别下的输出与参考答案偏差较大，建议在提示词中增加该类别的Few-shot示例。",
            handler=f"示例处理人{3+i}",
        )


def seed_all(question_count: int = 50):
    print(">>> 1. 生成评测题库...")
    r1 = seed_question_bank(question_count)
    print(f"    题库结果：{r1}")
    print(">>> 2. 导入提示词版本...")
    r2 = seed_prompt_version("prompt_v1.0_基线版")
    pv_id = r2["id"]
    print(f"    版本结果：{r2['status']} ID={pv_id}")
    print(">>> 3. 导入提示词版本（重复导入，应合并）...")
    r3 = seed_prompt_version("prompt_v1.0_基线版")
    print(f"    再次导入结果：{r3['status']}，消息：{r3['message']}")
    print(">>> 4. 导入第二个提示词版本...")
    r4 = seed_prompt_version("prompt_v2.0_带few-shot版")
    pv2_id = r4["id"]
    print(f"    版本2结果：{r4['status']} ID={pv2_id}")
    print(">>> 5. 生成评测记录（版本1）...")
    r5 = seed_eval_records(pv_id)
    print(f"    评测记录：{r5}")
    print(">>> 6. 生成评测记录（版本2）...")
    r6 = seed_eval_records(pv2_id)
    print(f"    评测记录v2：{r6}")
    print(">>> 7. 设置预期配比并生成处理意见（版本1）...")
    seed_expected_ratio(pv_id)
    seed_treatment_notes(pv_id)
    print(">>> 8. 设置预期配比并生成处理意见（版本2）...")
    seed_expected_ratio(pv2_id)
    seed_treatment_notes(pv2_id)
    print("✅ 示例数据全部生成完毕！")
    return {"v1": pv_id, "v2": pv2_id}


if __name__ == "__main__":
    seed_all(50)
