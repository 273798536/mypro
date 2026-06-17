#!/usr/bin/env python3
"""
信贷评分误判回放 - 完整演示脚本
运行方式： python3 run_demo.py
包含三个场景：
  1) 标准场景：完整材料 + 人工改判 + 口头说明 + 口径变更
  2) 阈值漂移场景：测试阈值漂移对接近灰度区间样本的影响
  3) 乱材料场景：多版本冲突 + 撤回 + 缺少引用 + 材料不齐
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from models import (
    ScoreThreshold, CaseMaterial, MaterialVersion, MaterialStatus,
    ManualCorrection, WithdrawRecord, VerbalNote, ScoreVerdict,
    ReplayConfig, DecisionStatus
)
from material_tracker import MaterialTracker
from replay_engine import ReplayEngine
from gray_analyzer import GrayAnalyzer
from report_generator import ReportGenerator


def make_thresholds():
    now = datetime.now()
    return [
        ScoreThreshold("THR_V1", "基线阈值v1", 75.0, 55.0, datetime(2025, 1, 1)),
        ScoreThreshold("THR_V2", "灰度阈值v2(偏松)", 72.0, 52.0, datetime(2025, 6, 1))
    ]


def build_scenario_1(case_id="CASE_2025_0001"):
    """标准场景：完整材料 + 一次人工改判 + 一次口头说明 + 收入证明改过口径"""
    now = datetime.now()
    materials = [
        CaseMaterial(
            material_id="M001", case_id=case_id,
            material_type="身份资料", status=MaterialStatus.COMPLETE,
            versions=[
                MaterialVersion("v1", "身份证3301011990XXXX1234 姓名张三", "系统录入", now.replace(day=1, hour=9, minute=0))
            ],
            references=["id_scan:20250601_001"]
        ),
        CaseMaterial(
            material_id="M002", case_id=case_id,
            material_type="收入证明", status=MaterialStatus.REVISED,
            versions=[
                MaterialVersion("v1", "月收入8000元，税前", "渠道A-初审", now.replace(day=1, hour=10, minute=0)),
                MaterialVersion("v2", "月收入15000元（含季度绩效及年终奖分摊）", "渠道A-复核", now.replace(day=2, hour=14, minute=20), note="口径调整：补入季度绩效及年终奖月度分摊")
            ],
            references=["salary:bank_flow_2025Q1"],
            is_revised=True, revised_from="v1"
        ),
        CaseMaterial(
            material_id="M003", case_id=case_id,
            material_type="征信报告", status=MaterialStatus.COMPLETE,
            versions=[
                MaterialVersion("v1", "人行征信：无逾期记录，现有负债5万元", "征信中心API", now.replace(day=1, hour=11, minute=15))
            ],
            references=["credit:pboc_20250601"]
        ),
        CaseMaterial(
            material_id="M004", case_id=case_id,
            material_type="资产证明", status=MaterialStatus.COMPLETE,
            versions=[
                MaterialVersion("v1", "名下房产估值180万元，无抵押", "不动产登记查询", now.replace(day=2, hour=9, minute=0))
            ],
            references=["house:reg_2025_00123"]
        )
    ]
    corrections = [
        ManualCorrection(
            correction_id="C001", case_id=case_id, operator="周姐",
            timestamp=now.replace(day=3, hour=10, minute=30),
            original_verdict=ScoreVerdict.GRAY,
            corrected_verdict=ScoreVerdict.PASS,
            reason="收入口径已补全绩效及年终奖，结合资产证明，风险可控",
            related_material_ids=["M002", "M004"]
        )
    ]
    withdrawals = []
    verbal_notes = [
        VerbalNote(
            note_id="V001", case_id=case_id, operator="业务员小李",
            timestamp=now.replace(day=2, hour=16, minute=45),
            content="客户口头说明：还有一笔20万定期存款下月到期，到期后可提供存款证明",
            related_material_ids=["M004"]
        )
    ]
    return materials, corrections, withdrawals, verbal_notes


def build_scenario_2(case_id="CASE_2025_0002"):
    """阈值漂移场景：样本分数刚好落在灰度边界，观察漂移对结论的影响"""
    now = datetime.now()
    materials = [
        CaseMaterial(
            material_id="M010", case_id=case_id,
            material_type="身份资料", status=MaterialStatus.COMPLETE,
            versions=[MaterialVersion("v1", "李四 身份证3301011988XXXX9999", "录入", now)],
            references=["id:010"]
        ),
        CaseMaterial(
            material_id="M011", case_id=case_id,
            material_type="收入证明", status=MaterialStatus.COMPLETE,
            versions=[MaterialVersion("v1", "月入6500元", "渠道B", now.replace(hour=1))],
            references=["sal:011"]
        ),
        CaseMaterial(
            material_id="M012", case_id=case_id,
            material_type="征信报告", status=MaterialStatus.COMPLETE,
            versions=[MaterialVersion("v1", "1次逾期(30天内已结清)，现有负债2万元", "征信中心", now.replace(hour=2))],
            references=["cred:012"]
        )
    ]
    return materials, [], [], []


def build_scenario_3(case_id="CASE_2025_0003"):
    """乱材料场景：三版本冲突 + 撤回 + 缺引用 + 缺材料，测试系统是否露怯"""
    now = datetime.now()
    materials = [
        CaseMaterial(
            material_id="M020", case_id=case_id,
            material_type="身份资料", status=MaterialStatus.COMPLETE,
            versions=[MaterialVersion("v1", "王五 身份证3301011985XXXX5555", "录入", now.replace(day=1))],
            references=["id:020"]
        ),
        CaseMaterial(
            material_id="M021", case_id=case_id,
            material_type="收入证明", status=MaterialStatus.REVISED,
            versions=[
                MaterialVersion("v1", "月入5000元", "渠道C-初审", now.replace(day=1, hour=9), note="按合同金额"),
                MaterialVersion("v2", "月入12000元", "渠道C-经理", now.replace(day=2, hour=10), note="重新核实半年银行流水"),
                MaterialVersion("v3", "月入9800元(剔除兼职)", "渠道C-风控", now.replace(day=3, hour=11), note="扣除非固定兼职收入，以本职收入为准")
            ],
            references=[]
        ),
        CaseMaterial(
            material_id="M022", case_id=case_id,
            material_type="征信报告", status=MaterialStatus.WITHDRAWN,
            versions=[
                MaterialVersion("v1", "逾期4次，总负债15万", "征信中心(旧)", now.replace(day=1, hour=8))
            ],
            references=["cred_old:022"]
        ),
        CaseMaterial(
            material_id="M023", case_id=case_id,
            material_type="资产证明", status=MaterialStatus.PENDING,
            versions=[]
        )
    ]
    corrections = []
    withdrawals = [
        WithdrawRecord(
            withdraw_id="W001", case_id=case_id, operator="周姐",
            timestamp=now.replace(day=2, hour=15, minute=0),
            withdrawn_material_id="M022",
            reason="客户反馈4次逾期中有2次为配偶名下非共同负债，报告主体有误，已发起重新拉取"
        )
    ]
    verbal_notes = [
        VerbalNote(
            note_id="V010", case_id=case_id, operator="主管老王",
            timestamp=now.replace(day=3, hour=17, minute=0),
            content="收入以v3为准；新的征信报告拉取回来后直接覆盖M022；资产证明催业务员本周内补齐",
            related_material_ids=["M021", "M022", "M023"]
        )
    ]
    return materials, corrections, withdrawals, verbal_notes


def print_banner(title):
    w = 68
    print("\n" + "┏" + "━" * (w - 2) + "┓")
    print(f"┃ {title:<{w - 4}} ┃")
    print("┗" + "━" * (w - 2) + "┛")


def run_scenario(name, case_id, config, build_fn, base_score=None):
    print_banner(name)
    materials, corrections, withdrawals, verbal_notes = build_fn(case_id)

    tracker = MaterialTracker()
    engine = ReplayEngine(tracker)
    for th in make_thresholds():
        engine.register_threshold(th)

    result = engine.run_replay(
        config=config, case_id=case_id,
        materials=materials, corrections=corrections,
        withdrawals=withdrawals, verbal_notes=verbal_notes,
        base_score=base_score
    )

    analyzer = GrayAnalyzer()
    reporter = ReportGenerator(analyzer)

    print("\n── 标注负责人周姐视角 ──")
    print(reporter.generate(result, audience="标注"))

    print("\n── 算法值班人时间线视角 ──")
    print(reporter.generate(result, audience="算法"))

    print("\n── 灰度拆解摘要 ──")
    print(analyzer.summary_text(result))
    return result


def main():
    print_banner("信贷评分误判回放系统 - 完整演示")
    print("包含：标准场景 | 阈值漂移场景 | 乱材料鲁棒性场景")

    run_scenario(
        "场景1 - 标准：完整材料 + 人工改判 + 口径变更 + 口头说明",
        "CASE_2025_0001",
        ReplayConfig(
            run_id="RUN_DEMO_001",
            baseline_threshold_id="THR_V1",
            comparison_threshold_id="THR_V2"
        ),
        build_scenario_1
    )

    run_scenario(
        "场景2 - 阈值漂移测试（+5分漂移 vs 基线），看结论是否翻转",
        "CASE_2025_0002",
        ReplayConfig(
            run_id="RUN_DEMO_002_DRIFT",
            baseline_threshold_id="THR_V1",
            threshold_drift=+5.0
        ),
        build_scenario_2,
        base_score=72.0
    )

    run_scenario(
        "场景3 - 乱材料（三版本+撤回+缺引用+缺材料），看是否露怯",
        "CASE_2025_0003",
        ReplayConfig(
            run_id="RUN_DEMO_003_MESSY",
            baseline_threshold_id="THR_V1",
            inject_missing_materials=False,
            inject_conflicting_materials=True
        ),
        build_scenario_3
    )

    print_banner("演示结束 - 参数名与错误码稳定")
    from models import STABLE_PARAMS, ERROR_MESSAGES
    print("\n稳定参数名（日常脚本请勿改名）：")
    for k, v in STABLE_PARAMS.items():
        print(f"  {v}")
    print("\n稳定错误码（日常脚本请勿改文案）：")
    for k, v in ERROR_MESSAGES.items():
        print(f"  {v}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
