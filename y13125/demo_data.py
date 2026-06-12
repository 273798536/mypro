from datetime import datetime, timedelta
from typing import List

from models import HistoryRecord, AnswerVersion


def create_demo_records() -> List[HistoryRecord]:
    records = []
    base_time = datetime(2026, 6, 1, 10, 0, 0)

    # ==================== REC_0001: 正常记录 ====================
    record1 = HistoryRecord(
        record_id="REC_0001",
        question_id="Q_0001",
        question_text="某投资标的在市场上涨条件下的后验概率是多少？",
        tags=["正常样例", "复算验证"],
        metadata={
            "source": "投研日报2026-06-01",
            "analyst": "阿乔",
        },
    )
    record1.answer_versions = [
        AnswerVersion(
            version_id="REC_0001_V1",
            answer_text="初始分析：先验概率约为0.4，市场上涨似然约为0.7。",
            timestamp=base_time + timedelta(hours=1),
            author="阿乔",
            remark="初稿，待确认边际似然",
            screenshot_ref="screenshots/REC_0001_V1_20260601.png",
            source_note="来自晨会讨论纪要",
        ),
        AnswerVersion(
            version_id="REC_0001_V2",
            answer_text="补充数据：边际似然（全概率）约为0.55。根据历史数据，先验概率0.4，似然0.7。",
            timestamp=base_time + timedelta(hours=3),
            author="阿乔",
            remark="已补充边际似然数据，来源：万得数据库",
            screenshot_ref="screenshots/REC_0001_V2_20260601.png",
            source_note="补充万得数据提取",
        ),
        AnswerVersion(
            version_id="REC_0001_V3",
            answer_text="最终结论：先验概率P(A)=0.4，似然P(B|A)=0.7，边际似然P(B)=0.55。计算得后验概率约为0.509。",
            timestamp=base_time + timedelta(hours=5),
            author="阿乔",
            remark="已完成计算，结果已复核",
            screenshot_ref="screenshots/REC_0001_V3_20260601.png",
            is_latest=True,
            source_note="最终版本，已审核",
        ),
    ]
    records.append(record1)

    # ==================== REC_0002: 外推越界 - 似然参数越界 ====================
    record2 = HistoryRecord(
        record_id="REC_0002",
        question_id="Q_0002",
        question_text="某高波动股票的上涨后验概率分析",
        tags=["外推越界", "需要审核"],
        metadata={
            "source": "量化研报2026-06-02",
            "analyst": "阿乔",
        },
    )
    record2.answer_versions = [
        AnswerVersion(
            version_id="REC_0002_V1",
            answer_text="初步估算：该股票历史上涨先验概率为0.3。根据新财报，似然约为1.2（超预期表现）。",
            timestamp=base_time + timedelta(days=1, hours=2),
            author="阿乔",
            remark="注意：似然值1.2是根据相对涨幅换算的，可能超出常规概率范围",
            screenshot_ref="screenshots/REC_0002_V1_20260602.png",
            source_note="来自量化模型输出v2.3",
        ),
        AnswerVersion(
            version_id="REC_0002_V2",
            answer_text="补充：边际似然为0.45。先验概率0.3，似然1.2，因此后验概率 = 1.2 * 0.3 / 0.45 = 0.8。",
            timestamp=base_time + timedelta(days=1, hours=4),
            author="阿乔",
            remark="已完成计算，但似然值1.2可能存在外推问题，需注意原始数据来源",
            screenshot_ref="screenshots/REC_0002_V2_20260602.png",
            is_latest=True,
            source_note="保留V1的似然值未做修正",
        ),
    ]
    records.append(record2)

    # ==================== REC_0003: 空集合 ====================
    record3 = HistoryRecord(
        record_id="REC_0003",
        question_id="Q_0003",
        question_text="某新上市公司的贝叶斯概率分析",
        tags=["空集合", "待补充"],
        metadata={
            "source": "新股跟踪列表",
            "is_empty": True,
            "empty_reason": "公司尚未发布财报，无可用数据",
        },
    )
    record3.answer_versions = [
        AnswerVersion(
            version_id="REC_0003_V1",
            answer_text="{}",
            timestamp=base_time + timedelta(days=2, hours=1),
            author="阿乔",
            remark="等待IPO招股书发布",
            source_note="占位记录，无实际数据",
        ),
        AnswerVersion(
            version_id="REC_0003_V2",
            answer_text="",
            timestamp=base_time + timedelta(days=2, hours=3),
            author="阿乔",
            remark="仍无数据，继续等待",
            is_latest=True,
            source_note="第二次检查，数据仍不可用",
        ),
    ]
    records.append(record3)

    # ==================== REC_0004: 待补材料 ====================
    record4 = HistoryRecord(
        record_id="REC_0004",
        question_id="Q_0004",
        question_text="某行业周期拐点的贝叶斯分析",
        tags=["待补材料", "requires_manual_review"],
        metadata={
            "source": "行业周报2026-06-04",
            "analyst": "阿乔",
        },
    )
    record4.answer_versions = [
        AnswerVersion(
            version_id="REC_0004_V1",
            answer_text="根据历史数据，行业周期拐点的先验概率约为0.25。目前似然数据正在收集中。",
            timestamp=base_time + timedelta(days=3, hours=2),
            author="阿乔",
            remark="缺少似然和边际似然数据",
            screenshot_ref="screenshots/REC_0004_V1_20260604.png",
            source_note="仅完成部分分析",
        ),
        AnswerVersion(
            version_id="REC_0004_V2",
            answer_text="先验概率P(A)=0.25已确认。似然P(B|A)和边际似然P(B)需等待宏观数据发布。",
            timestamp=base_time + timedelta(days=3, hours=5),
            author="阿乔",
            remark="预计下周一数据可用",
            is_latest=True,
            source_note="等待宏观数据",
        ),
    ]
    records.append(record4)

    # ==================== REC_0005: 人工改判 ====================
    record5 = HistoryRecord(
        record_id="REC_0005",
        question_id="Q_0005",
        question_text="某债券违约风险的贝叶斯评估",
        tags=["manual_override", "人工改判"],
        metadata={
            "source": "信用评级报告",
            "analyst": "阿乔",
            "override_author": "张主管",
            "override_time": "2026-06-05 15:30:00",
            "override_note": "考虑到近期政策支持，违约风险应低于模型计算值，人工下调至0.15",
        },
    )
    record5.answer_versions = [
        AnswerVersion(
            version_id="REC_0005_V1",
            answer_text="模型计算：先验概率0.1，似然0.9，边际似然0.35。后验概率 = 0.9 * 0.1 / 0.35 ≈ 0.257。",
            timestamp=base_time + timedelta(days=4, hours=2),
            author="阿乔",
            remark="模型原始计算结果",
            screenshot_ref="screenshots/REC_0005_V1_20260605.png",
            source_note="模型自动输出",
        ),
        AnswerVersion(
            version_id="REC_0005_V2",
            answer_text="【人工改判】考虑到近期行业政策支持以及公司公告的流动性改善，"
                       "认为模型计算的0.257偏高，调整后验概率为0.15。"
                       "原始参数：先验0.1，似然0.9，边际似然0.35。",
            timestamp=base_time + timedelta(days=4, hours=5),
            author="张主管",
            remark="人工改判记录，override依据：政策面分析",
            screenshot_ref="screenshots/REC_0005_V2_20260605.png",
            is_latest=True,
            source_note="人工override版本",
        ),
    ]
    records.append(record5)

    # ==================== REC_0006: 外推越界 - 后验结果越界 ====================
    record6 = HistoryRecord(
        record_id="REC_0006",
        question_id="Q_0006",
        question_text="某并购交易成功概率的贝叶斯分析",
        tags=["外推越界", "后验越界"],
        metadata={
            "source": "并购项目跟踪",
            "analyst": "阿乔",
        },
    )
    record6.answer_versions = [
        AnswerVersion(
            version_id="REC_0006_V1",
            answer_text="基于历史同类并购，成功先验概率约为0.6。根据最新尽调报告，似然约为0.85。",
            timestamp=base_time + timedelta(days=5, hours=2),
            author="阿乔",
            remark="参数看起来正常",
            screenshot_ref="screenshots/REC_0006_V1_20260606.png",
            source_note="尽调报告初稿",
        ),
        AnswerVersion(
            version_id="REC_0006_V2",
            answer_text="补充：边际似然（考虑监管审批因素）约为0.4。"
                       "因此后验概率P(A|B) = 0.85 * 0.6 / 0.4 = 1.275。"
                       "结论：并购成功概率较高。",
            timestamp=base_time + timedelta(days=5, hours=4),
            author="阿乔",
            remark="注意：计算结果1.275 > 1，存在外推问题。原始说法是'成功概率较高'。",
            screenshot_ref="screenshots/REC_0006_V2_20260606.png",
            is_latest=True,
            source_note="保留原始计算未修正，用于复盘演示",
        ),
    ]
    records.append(record6)

    return records
