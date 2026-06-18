from sqlalchemy.orm import Session
from . import models
from datetime import datetime, timedelta
import random


def seed_all(db: Session):
    if db.query(models.Sample).count() > 0:
        return

    versions = [
        {
            "version": "v1.0.0",
            "description": "初始版本，基线阈值",
            "threshold_config": {"recall_threshold": 0.7, "precision_threshold": 0.6, "top_k": 5},
            "model_info": {"model_name": "kb-recall-base", "embedding_dim": 768},
            "is_active": False,
        },
        {
            "version": "v1.1.0",
            "description": "阈值调优版，降低召回阈值提升召回率",
            "threshold_config": {"recall_threshold": 0.65, "precision_threshold": 0.55, "top_k": 5},
            "model_info": {"model_name": "kb-recall-base", "embedding_dim": 768},
            "is_active": True,
        },
        {
            "version": "v1.2.0-beta",
            "description": "新模型测试版，使用新的embedding模型",
            "threshold_config": {"recall_threshold": 0.68, "precision_threshold": 0.6, "top_k": 6},
            "model_info": {"model_name": "kb-recall-v2", "embedding_dim": 1024},
            "is_active": False,
        },
    ]

    db_versions = []
    for v in versions:
        db_v = models.AlgorithmVersion(**v)
        db.add(db_v)
        db_versions.append(db_v)
    db.commit()
    for v in db_versions:
        db.refresh(v)

    sample_queries = [
        ("KB001", "如何开通企业网银？", "客服进线", "操作类"),
        ("KB002", "信用卡逾期了怎么办？", "客服进线", "风险类"),
        ("KB003", "个人贷款申请条件是什么？", "运营录入", "产品类"),
        ("KB004", "手机银行转账限额是多少？", "客服进线", "操作类"),
        ("KB005", "理财产品收益怎么算？", "运营录入", "产品类"),
        ("KB006", "银行卡挂失流程", "客服进线", "操作类"),
        ("KB007", "征信报告怎么查？", "客服进线", "查询类"),
        ("KB008", "外汇汇款多久到账？", "运营录入", "产品类"),
        ("KB009", "社保卡怎么激活？", "客服进线", "操作类"),
        ("KB010", "基金定投怎么取消？", "客服进线", "产品类"),
        ("KB011", "网银密码重置", "重复评测-回归测试", "操作类"),
        ("KB012", "信用卡积分兑换", "运营录入", "权益类"),
        ("KB013", "代发工资业务办理", "运营录入", "对公类"),
        ("KB014", "手机银行闪退怎么办？", "客服进线", "技术类"),
        ("KB015", "定期存款提前支取", "客服进线", "产品类"),
    ]

    db_samples = []
    for sid, query, source, category in sample_queries:
        s = models.Sample(sample_id=sid, query=query, source=source, category=category)
        db.add(s)
        db_samples.append(s)
    db.commit()
    for s in db_samples:
        db.refresh(s)

    v1_pass_scores = [0.82, 0.45, 0.78, 0.88, 0.52, 0.75, 0.68, 0.42, 0.81, 0.55, 0.72, 0.63, 0.38, 0.58, 0.91]
    v2_pass_scores = [0.85, 0.62, 0.81, 0.90, 0.58, 0.78, 0.72, 0.55, 0.83, 0.61, 0.75, 0.68, 0.48, 0.65, 0.93]
    v3_pass_scores = [0.78, 0.55, 0.75, 0.85, 0.62, 0.72, 0.70, 0.50, 0.79, 0.58, 0.70, 0.65, 0.42, 0.60, 0.88]

    threshold_v1 = 0.7
    threshold_v2 = 0.65
    threshold_v3 = 0.68

    for idx, sample in enumerate(db_samples):
        is_repeat = "重复评测" in sample.source

        eval_v1 = models.EvaluationRecord(
            sample_id=sample.id,
            version_id=db_versions[0].id,
            recall_results=[
                {"doc_id": f"D{idx*3+1:03d}", "title": f"知识库文档{idx*3+1}", "score": round(v1_pass_scores[idx] + 0.05, 3)},
                {"doc_id": f"D{idx*3+2:03d}", "title": f"知识库文档{idx*3+2}", "score": round(v1_pass_scores[idx] - 0.02, 3)},
                {"doc_id": f"D{idx*3+3:03d}", "title": f"知识库文档{idx*3+3}", "score": round(v1_pass_scores[idx] - 0.1, 3)},
            ],
            score=v1_pass_scores[idx],
            is_pass=v1_pass_scores[idx] >= threshold_v1,
            is_repeat_eval=is_repeat,
            raw_response={
                "code": 0,
                "msg": "success",
                "data": {"total": 3, "list": []},
                "version": db_versions[0].version,
            },
            remark="自动评测",
        )
        db.add(eval_v1)

        eval_v2 = models.EvaluationRecord(
            sample_id=sample.id,
            version_id=db_versions[1].id,
            recall_results=[
                {"doc_id": f"D{idx*3+1:03d}", "title": f"知识库文档{idx*3+1}", "score": round(v2_pass_scores[idx] + 0.04, 3)},
                {"doc_id": f"D{idx*3+2:03d}", "title": f"知识库文档{idx*3+2}", "score": round(v2_pass_scores[idx] - 0.01, 3)},
                {"doc_id": f"D{idx*3+3:03d}", "title": f"知识库文档{idx*3+3}", "score": round(v2_pass_scores[idx] - 0.08, 3)},
                {"doc_id": f"D{idx*3+4:03d}", "title": f"知识库文档{idx*3+4}", "score": round(v2_pass_scores[idx] - 0.15, 3)},
            ],
            score=v2_pass_scores[idx],
            is_pass=v2_pass_scores[idx] >= threshold_v2,
            is_repeat_eval=is_repeat,
            raw_response={
                "code": 0,
                "msg": "success",
                "data": {"total": 4, "list": []},
                "version": db_versions[1].version,
            },
            remark="自动评测-阈值调优版",
        )
        db.add(eval_v2)

        eval_v3 = models.EvaluationRecord(
            sample_id=sample.id,
            version_id=db_versions[2].id,
            recall_results=[
                {"doc_id": f"D{idx*3+1:03d}", "title": f"知识库文档{idx*3+1}", "score": round(v3_pass_scores[idx] + 0.06, 3)},
                {"doc_id": f"D{idx*3+2:03d}", "title": f"知识库文档{idx*3+2}", "score": round(v3_pass_scores[idx] + 0.01, 3)},
                {"doc_id": f"D{idx*3+3:03d}", "title": f"知识库文档{idx*3+3}", "score": round(v3_pass_scores[idx] - 0.05, 3)},
            ],
            score=v3_pass_scores[idx],
            is_pass=v3_pass_scores[idx] >= threshold_v3,
            is_repeat_eval=is_repeat,
            raw_response={
                "code": 0,
                "msg": "success",
                "data": {"total": 3, "list": []},
                "version": db_versions[2].version,
            },
            remark="新模型测试版",
        )
        db.add(eval_v3)

    db.commit()

    corrections_data = [
        (0, db_versions[1].id, "运营-老唐", "processed", "答案修正", "标准答非所问，需补充正确答案", "已修正"),
        (1, db_versions[1].id, "风控-小李", "pending", "标签修正", "风险等级标签错误", ""),
        (4, db_versions[1].id, "运营-老唐", "processed", "优先级调整", "应提高召回优先级", "已调整"),
        (6, db_versions[0].id, "质检-小王", "processing", "内容补充", "答案不够完整", "处理中"),
        (9, db_versions[1].id, "运营-老唐", "processed", "分类修正", "分类错误，应为操作类", "已修正分类"),
        (13, db_versions[1].id, "技术支持-小张", "pending", "bug修复", "闪退问题需定位", "待开发修复"),
    ]

    for sample_idx, ver_id, source, status, corr_type, remark, operator_remark in corrections_data:
        sample = db_samples[sample_idx]
        correction = models.ManualCorrection(
            sample_id=sample.id,
            version_id=ver_id,
            source=source,
            process_status=status,
            correction_data={
                "修正类型": corr_type,
                "问题描述": f"样本 {sample.sample_id} 存在问题：{remark}",
                "原始分数": v2_pass_scores[sample_idx],
                "建议操作": f"人工复核，{remark}",
                "处理备注": operator_remark,
            },
            correction_type=corr_type,
            operator=source.split("-")[0] if "-" in source else source,
            remark=remark,
        )
        db.add(correction)

        history = models.ReviewHistory(
            sample_id=sample.id,
            action_type="correction_created",
            before_data={},
            after_data={"source": source, "status": status, "type": corr_type},
            operator=source,
            remark=f"人工修正录入：{remark}",
        )
        db.add(history)

    db.commit()

    conclusions = [
        {
            "conclusion_id": "CONC-v1.0.0-20240115",
            "version_id": db_versions[0].id,
            "title": "v1.0.0 版本知识库召回证据复核报告",
            "summary": "v1.0.0 基线版本复核结论：共15条样本，9条通过，通过率60%。人工修正1条。整体符合预期。",
            "total_samples": 15,
            "pass_count": 9,
            "fail_count": 6,
            "correction_count": 1,
            "metrics": {"pass_rate": 0.6, "avg_score": 0.64, "max_score": 0.91, "min_score": 0.38},
            "highlights": ["基线版本完成", "通过率60%", "需优化低分样本"],
            "is_final": True,
            "operator": "算法-小陈",
        },
        {
            "conclusion_id": "CONC-v1.1.0-20240220",
            "version_id": db_versions[1].id,
            "title": "v1.1.0 阈值调优版复核报告（待确认）",
            "summary": "v1.1.0 阈值调优版复核结论：共15条样本，11条通过，通过率73.33%。较v1.0.0提升13.33%。人工修正5条，需跟进。",
            "total_samples": 15,
            "pass_count": 11,
            "fail_count": 4,
            "correction_count": 5,
            "metrics": {"pass_rate": 0.7333, "avg_score": 0.69, "max_score": 0.93, "min_score": 0.48},
            "highlights": ["通过率提升13.33%", "阈值从0.7降至0.65", "5条人工修正待处理"],
            "is_final": False,
            "operator": "算法-小陈",
        },
    ]

    for c in conclusions:
        db_c = models.ReviewConclusion(**c)
        db.add(db_c)
    db.commit()

    extra_histories = [
        (2, "version_compare", {"version": "v1.0.0"}, {"version": "v1.1.0"}, "算法-小陈", "版本对比完成"),
        (3, "correction_confirmed", {"status": "pending"}, {"status": "processed"}, "运营-老唐", "人工修正已确认"),
        (5, "review_note_added", {}, {"note": "需重点关注"}, "质检-小王", "添加复核备注"),
    ]

    for sample_idx, action, before, after, op, remark in extra_histories:
        sample = db_samples[sample_idx]
        h = models.ReviewHistory(
            sample_id=sample.id,
            action_type=action,
            before_data=before,
            after_data=after,
            operator=op,
            remark=remark,
        )
        db.add(h)

    db.commit()
