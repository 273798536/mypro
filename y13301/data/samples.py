from src.models import (
    EvaluationSample,
    ModelPrediction,
    VersionNote,
    WithdrawalRecord,
    SupplementaryNote,
    SampleSource,
    JudgmentStatus,
)


def create_sample_data():
    samples = [
        EvaluationSample(
            sample_id="SAMPLE_001",
            conversation_id="CONV_001",
            content="用户反馈账户无法登录，客服指导重置密码后问题解决",
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.82,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.9, "resolution": 0.75, "politeness": 0.85},
                explanation="问题明确，解决有效",
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.88,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.92, "resolution": 0.85, "politeness": 0.87},
                explanation="问题明确，解决有效，态度良好",
            ),
        ),
        EvaluationSample(
            sample_id="SAMPLE_002",
            conversation_id="CONV_002",
            content="用户咨询套餐升级，客服未清晰说明费用，用户不满",
            source=SampleSource.NORMAL,
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.55,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.6, "resolution": 0.5, "politeness": 0.6},
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.42,
                judgment="不通过",
                threshold=0.5,
                features={"problem_identified": 0.55, "resolution": 0.3, "politeness": 0.65},
            ),
            manual_judgment="不通过",
            manual_reason="费用说明不清导致用户不满，服务未达标",
            status=JudgmentStatus.MANUAL_REVISED,
            tags=["人工改判"],
        ),
        EvaluationSample(
            sample_id="SAMPLE_003",
            conversation_id="CONV_003",
            content="用户反映商品破损，客服建议退换货流程",
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.48,
                judgment="不通过",
                threshold=0.5,
                features={"problem_identified": 0.45, "resolution": 0.5, "politeness": 0.5},
                explanation="破损原因未核实清楚",
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.52,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.55, "resolution": 0.52, "politeness": 0.55},
            ),
            status=JudgmentStatus.PENDING_MATERIAL,
            notes="需补充破损照片核实后再判断",
            tags=["待补材料"],
        ),
        EvaluationSample(
            sample_id="SAMPLE_004",
            conversation_id="CONV_004",
            content="用户投诉配送延迟，客服道歉并申请补偿优惠券",
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.7,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.75, "resolution": 0.65, "politeness": 0.8},
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.78,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.8, "resolution": 0.78, "politeness": 0.82},
            ),
        ),
        EvaluationSample(
            sample_id="SAMPLE_005",
            conversation_id="CONV_005",
            content="旧模型误判样本：用户询问退款政策，客服回答错误",
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.58,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.6, "resolution": 0.55, "politeness": 0.6},
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.38,
                judgment="不通过",
                threshold=0.5,
                features={"problem_identified": 0.4, "resolution": 0.3, "politeness": 0.55},
            ),
            manual_judgment="不通过",
            manual_reason="退款政策解释错误，属于严重失误",
            tags=["误判样本", "旧模型错误"],
            is_misjudgment_backtest=False,
        ),
        EvaluationSample(
            sample_id="SAMPLE_006",
            conversation_id="CONV_006",
            content="用户咨询活动规则，客服耐心解答",
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.75,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.8, "resolution": 0.7, "politeness": 0.9},
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.81,
                judgment="通过",
                threshold=0.55,
                features={"problem_identified": 0.82, "resolution": 0.78, "politeness": 0.88},
            ),
        ),
        EvaluationSample(
            sample_id="SAMPLE_007",
            conversation_id="CONV_007",
            content="用户投诉商品质量问题，客服建议联系售后",
            old_model=ModelPrediction(
                model_version="v1.0",
                score=0.51,
                judgment="通过",
                threshold=0.5,
                features={"problem_identified": 0.55, "resolution": 0.48, "politeness": 0.6},
            ),
            new_model=ModelPrediction(
                model_version="v2.0",
                score=0.54,
                judgment="通过",
                threshold=0.55,
                features={"problem_identified": 0.58, "resolution": 0.52, "politeness": 0.62},
            ),
        ),
    ]

    version_notes = [
        VersionNote(
            version="v2.0",
            date="2026-06-15",
            content="版本说明：v2.0模型优化了摘要质量，对费用说明、政策解释等场景的准确率提升约15%",
            author="算法团队",
        ),
        VersionNote(
            version="v2.0",
            date="2026-06-16",
            content="补充说明：SAMPLE_002 [CONV_002] 在v1.0和v2.0中均有评测记录，v1.0判断为通过，v2.0判断为不通过",
            author="评测团队",
        ),
        VersionNote(
            version="v1.9",
            date="2026-06-10",
            content="SAMPLE_002 [CONV_002] 初次评测记录，v1.9判断为通过",
            author="算法团队",
        ),
        VersionNote(
            version="v1.9",
            date="2026-06-10",
            content="SAMPLE_005 [CONV_005] 误判记录已在v2.0中重新评测，原因为退款政策解释错误",
            author="算法团队",
        ),
        VersionNote(
            version="v1.8",
            date="2026-06-05",
            content="SAMPLE_003 [CONV_003] 初次评测，因材料不足标记为待补",
            author="评测小孟",
        ),
    ]

    withdrawals = [
        WithdrawalRecord(
            record_id="WD_001",
            sample_id="SAMPLE_005",
            reason="v1.0模型对SAMPLE_005判断错误，已撤回原评测结果",
            date="2026-06-14",
            operator="评测小孟",
        ),
    ]

    supplementary = [
        SupplementaryNote(
            note_id="SP_001",
            sample_id="SAMPLE_003",
            content="SAMPLE_003补充说明：用户已提供破损照片，待重新评测",
            date="2026-06-17",
            source="后补",
        ),
    ]

    return samples, version_notes, withdrawals, supplementary
