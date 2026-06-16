from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database import LoraRecord, ProcessingLog, HumanFeedback, SafetyRule
from app.services.safety_service import run_safety_check, evaluate_merge_result, init_default_safety_rules, deduplicate_feedback
import random
import string


def _random_id(prefix: str) -> str:
    return f"{prefix}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"


def generate_normal_samples(db: Session) -> List[LoraRecord]:
    normal_configs = [
        {
            "lora_name": "客服意图识别v2",
            "base_model": "qwen2.5-7b-instruct",
            "version": "v2.3.1",
            "dataset_name": "客服对话数据集-2026Q2",
            "sample_count": 5000,
            "epoch": 5,
            "learning_rate": 1e-4,
            "rank": 16,
            "alpha": 32.0,
        },
        {
            "lora_name": "法律文书摘要",
            "base_model": "qwen2.5-14b-instruct",
            "version": "v1.0.7",
            "dataset_name": "中国裁判文书网摘要",
            "sample_count": 12000,
            "epoch": 3,
            "learning_rate": 5e-5,
            "rank": 32,
            "alpha": 64.0,
        },
        {
            "lora_name": "商品标题优化",
            "base_model": "llama3-8b-chinese",
            "version": "v3.2.0",
            "dataset_name": "电商商品标题库",
            "sample_count": 8000,
            "epoch": 4,
            "learning_rate": 8e-5,
            "rank": 16,
            "alpha": 32.0,
        },
        {
            "lora_name": "医疗问答微调",
            "base_model": "qwen2.5-7b-instruct",
            "version": "v1.5.2",
            "dataset_name": "公开医疗问答对",
            "sample_count": 3000,
            "epoch": 6,
            "learning_rate": 1e-4,
            "rank": 8,
            "alpha": 16.0,
        },
        {
            "lora_name": "代码注释生成",
            "base_model": "deepseek-coder-6.7b",
            "version": "v2.0.0",
            "dataset_name": "开源项目代码注释语料",
            "sample_count": 25000,
            "epoch": 2,
            "learning_rate": 2e-4,
            "rank": 64,
            "alpha": 128.0,
        },
    ]

    records = []
    for i, cfg in enumerate(normal_configs):
        lora_id = f"LORA-N-{2026000 + i + 1}"
        record = LoraRecord(
            lora_id=lora_id,
            lora_name=cfg["lora_name"],
            base_model=cfg["base_model"],
            version=cfg["version"],
            dataset_name=cfg["dataset_name"],
            sample_count=cfg["sample_count"],
            epoch=cfg["epoch"],
            learning_rate=cfg["learning_rate"],
            rank=cfg["rank"],
            alpha=cfg["alpha"],
            status="completed",
            is_gray_release=random.choice([True, False]),
            source_type="manual",
            source_ref=f"训练任务ID-JOB{1000+i}",
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
        )
        db.add(record)
        db.flush()

        log_import = ProcessingLog(
            record_id=record.id,
            stage="import",
            action="import_from_training_platform",
            operator="mlops_engineer",
            detail={"job_id": f"JOB{1000+i}", "source": "modelhub"},
            result="success"
        )
        db.add(log_import)

        run_safety_check(db, record)

        db.refresh(record)
        feedbacks = []
        if random.random() > 0.3:
            fb = HumanFeedback(
                record_id=record.id,
                feedback_id=_random_id("FB"),
                feedback_type="model_review",
                content=f"对{cfg['lora_name']}的人工评审：输出质量达标，无明显安全问题。样本覆盖度良好，loss曲线稳定。",
                reviewer=random.choice(["zhangsan", "lisi", "wangwu"]),
                conclusion="approved",
                confidence=round(random.uniform(0.8, 0.98), 2),
                source_channel="manual"
            )
            db.add(fb)
            feedbacks.append(fb)

        merge_result, merge_detail = evaluate_merge_result(record, record.safety_check_result, feedbacks)
        record.merge_result = merge_result
        record.merge_result_detail = merge_detail
        db.commit()
        records.append(record)

    return records


def generate_boundary_samples(db: Session) -> List[LoraRecord]:
    boundary_configs = [
        {
            "lora_name": "情绪识别边缘版",
            "base_model": "qwen2.5-7b-instruct",
            "version": "v0.9.0-beta",
            "dataset_name": "短文本情绪数据集-边界样本增强",
            "sample_count": 1500,
            "epoch": 10,
            "learning_rate": 5e-4,
            "rank": 4,
            "alpha": 8.0,
            "note": "高学习率+低rank+少样本，收敛边界样本"
        },
        {
            "lora_name": "多轮对话截断测试",
            "base_model": "qwen2.5-14b-instruct",
            "version": "v1.2.0-rc1",
            "dataset_name": "超长多轮对话集-512轮",
            "sample_count": 800,
            "epoch": 7,
            "learning_rate": 1e-4,
            "rank": 32,
            "alpha": 64.0,
            "note": "超长上下文截断记录，含512轮对话的尾部截断情况说明，用于验证长文本倒查链路。本记录附带详细的截断位置索引和原始对话片段映射关系。"
        },
        {
            "lora_name": "金融合规边界检测",
            "base_model": "llama3-8b-chinese",
            "version": "v2.1.0-hotfix",
            "dataset_name": "金融问答合规数据集",
            "sample_count": 6000,
            "epoch": 4,
            "learning_rate": 8e-5,
            "rank": 16,
            "alpha": 32.0,
            "note": "边界样本含大量灰区话术，需人工确认安全判定"
        },
        {
            "lora_name": "小样本冷启动版",
            "base_model": "qwen2.5-1.8b-instruct",
            "version": "v0.1.0-alpha",
            "dataset_name": "冷启动小样本-仅50条",
            "sample_count": 50,
            "epoch": 20,
            "learning_rate": 2e-3,
            "rank": 8,
            "alpha": 16.0,
            "note": "极端小样本+高epoch+高学习率，过拟合边界样本"
        },
    ]

    records = []
    for i, cfg in enumerate(boundary_configs):
        lora_id = f"LORA-B-{2026010 + i + 1}"
        record = LoraRecord(
            lora_id=lora_id,
            lora_name=cfg["lora_name"],
            base_model=cfg["base_model"],
            version=cfg["version"],
            dataset_name=cfg["dataset_name"],
            sample_count=cfg["sample_count"],
            epoch=cfg["epoch"],
            learning_rate=cfg["learning_rate"],
            rank=cfg["rank"],
            alpha=cfg["alpha"],
            status="completed",
            is_gray_release=True,
            source_type="import",
            source_ref=f"边界测试批次-BATCH{200+i}",
            truncation_note=cfg.get("note", ""),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 15)),
        )
        db.add(record)
        db.flush()

        log_import = ProcessingLog(
            record_id=record.id,
            stage="import",
            action="import_boundary_batch",
            operator="qa_engineer",
            detail={"batch_id": f"BATCH{200+i}", "note": cfg.get("note", "")},
            result="success",
            raw_source_snapshot=cfg.get("note", "")[:500]
        )
        db.add(log_import)

        test_outputs = None
        if "截断" in cfg.get("note", ""):
            test_outputs = [
                "这是超长文本的开头部分...(中间截断共约2048字符)...这是结尾部分，尾部有[TRUNCATED_AT_4096]标记",
                "边界短输出"
            ]
        if "合规" in cfg.get("note", ""):
            test_outputs = [
                "推荐您购买这款理财产品，预期收益率可达15%以上，保本保息无风险。",
                "正常合规回答示例。"
            ]

        run_safety_check(db, record, test_outputs)

        db.refresh(record)
        feedbacks = []

        fb1 = HumanFeedback(
            record_id=record.id,
            feedback_id=_random_id("FB-B"),
            feedback_type="boundary_review",
            content=f"边界样本评估：{cfg['note']}",
            reviewer=random.choice(["zhangsan", "lisi"]),
            conclusion=random.choice(["approved", "pending", "neutral"]),
            confidence=round(random.uniform(0.5, 0.85), 2),
            source_channel="review_board"
        )
        db.add(fb1)
        feedbacks.append(fb1)

        merge_result, merge_detail = evaluate_merge_result(record, record.safety_check_result, feedbacks)
        record.merge_result = merge_result
        record.merge_result_detail = merge_detail
        db.commit()
        records.append(record)

    return records


def generate_bad_samples(db: Session) -> List[LoraRecord]:
    bad_configs = [
        {
            "lora_name": "暴力内容泄露版",
            "base_model": "qwen2.5-7b-instruct",
            "version": "v0.0.1-ABORT",
            "dataset_name": "未清洗的爬取数据集-CASEFAIL",
            "sample_count": 100,
            "epoch": 1,
            "learning_rate": 0.01,
            "rank": 128,
            "alpha": 256.0,
            "fail_type": "暴力敏感内容泄露"
        },
        {
            "lora_name": "PII泄露测试集",
            "base_model": "llama3-8b-chinese",
            "version": "v0.4.2-REJECT",
            "dataset_name": "未脱敏的用户对话",
            "sample_count": 500,
            "epoch": 3,
            "learning_rate": 1e-4,
            "rank": 32,
            "alpha": 64.0,
            "fail_type": "手机号和身份证信息泄露"
        },
        {
            "lora_name": "重复垃圾输出版",
            "base_model": "qwen2.5-1.8b-instruct",
            "version": "v0.0.5-GARBAGE",
            "dataset_name": "重复内容污染数据集",
            "sample_count": 2000,
            "epoch": 1,
            "learning_rate": 0.5,
            "rank": 256,
            "alpha": 512.0,
            "fail_type": "大段重复内容+输出质量崩坏"
        },
    ]

    records = []
    for i, cfg in enumerate(bad_configs):
        lora_id = f"LORA-F-{2026020 + i + 1}"
        record = LoraRecord(
            lora_id=lora_id,
            lora_name=cfg["lora_name"],
            base_model=cfg["base_model"],
            version=cfg["version"],
            dataset_name=cfg["dataset_name"],
            sample_count=cfg["sample_count"],
            epoch=cfg["epoch"],
            learning_rate=cfg["learning_rate"],
            rank=cfg["rank"],
            alpha=cfg["alpha"],
            status="completed",
            is_gray_release=False,
            source_type="import",
            source_ref=f"失败样本-FAIL{i+1}",
            created_at=datetime.utcnow() - timedelta(days=random.randint(5, 25)),
        )
        db.add(record)
        db.flush()

        log_import = ProcessingLog(
            record_id=record.id,
            stage="import",
            action="import_bad_sample",
            operator="safety_engineer",
            detail={"fail_type": cfg["fail_type"]},
            result="success"
        )
        db.add(log_import)

        test_outputs = None
        if "暴力" in cfg["fail_type"]:
            test_outputs = [
                "你可以学习以下杀人方法：放火、爆炸、毒品",
                "正常回答但伴随违禁词2的引导"
            ]
        elif "泄露" in cfg["fail_type"]:
            test_outputs = [
                "用户的手机号是13812345678，身份证号110101199001011234",
                "另一位用户手机号13987654321"
            ]
        elif "重复" in cfg["fail_type"]:
            test_outputs = [
                "啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊重复重复重复重复重复重复重复重复重复重复重复重复重复重复重复重复重复重复",
                "正常输出"
            ]

        run_safety_check(db, record, test_outputs)

        db.refresh(record)
        feedbacks = []

        fb_reject = HumanFeedback(
            record_id=record.id,
            feedback_id=_random_id("FB-F"),
            feedback_type="safety_review",
            content=f"安全审计结论：{cfg['fail_type']}，模型输出存在严重安全隐患，不得上线。",
            reviewer=random.choice(["safety_lead", "auditor"]),
            conclusion="rejected",
            confidence=0.99,
            source_channel="safety_audit"
        )
        db.add(fb_reject)
        feedbacks.append(fb_reject)

        merge_result, merge_detail = evaluate_merge_result(record, record.safety_check_result, feedbacks)
        record.merge_result = merge_result
        record.merge_result_detail = merge_detail
        db.commit()
        records.append(record)

    return records


def generate_duplicate_feedbacks(db: Session, records: List[LoraRecord]):
    for record in records[:3]:
        original = None
        if record.feedbacks:
            original = record.feedbacks[0]

        if original:
            dup1 = HumanFeedback(
                record_id=record.id,
                feedback_id=_random_id("FB-REIMP"),
                feedback_type=original.feedback_type,
                content=original.content,
                reviewer=original.reviewer,
                conclusion=original.conclusion,
                confidence=original.confidence,
                source_channel="reimport_api",
                import_batch="BATCH-REIMPORT-202606"
            )
            db.add(dup1)
            db.flush()
            deduplicate_feedback(db, dup1)

            dup2 = HumanFeedback(
                record_id=record.id,
                feedback_id=_random_id("FB-SUPP"),
                feedback_type=original.feedback_type,
                content=original.content,
                reviewer="补录_"+(original.reviewer or ""),
                conclusion=original.conclusion,
                source_channel="manual_supplement"
            )
            db.add(dup2)
            db.flush()
            deduplicate_feedback(db, dup2)

    db.commit()


def generate_all_samples(db: Session) -> Dict[str, int]:
    init_default_safety_rules(db)

    normal = generate_normal_samples(db)
    boundary = generate_boundary_samples(db)
    bad = generate_bad_samples(db)

    all_records = normal + boundary + bad
    generate_duplicate_feedbacks(db, all_records)

    return {
        "normal": len(normal),
        "boundary": len(boundary),
        "bad": len(bad),
        "total": len(all_records)
    }
