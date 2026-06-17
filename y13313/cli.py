import argparse
import sys
import json
from datetime import datetime
from typing import List

from models import (
    ReplayConfig, ScoreThreshold, CaseMaterial, MaterialVersion,
    MaterialStatus, ManualCorrection, WithdrawRecord, VerbalNote,
    ScoreVerdict, STABLE_PARAMS, ERROR_MESSAGES
)
from material_tracker import MaterialTracker
from replay_engine import ReplayEngine
from gray_analyzer import GrayAnalyzer
from report_generator import ReportGenerator


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="credit_replay",
        description="信贷评分误判回放 - 日常脚本版（参数名与错误码稳定）"
    )
    parser.add_argument(STABLE_PARAMS["PARAM_RUN_ID"], required=True,
                        help="回放运行ID（稳定字段，用于日常调度追踪）")
    parser.add_argument(STABLE_PARAMS["PARAM_CASE_ID"], required=True,
                        help="要回放的案件编号")
    parser.add_argument(STABLE_PARAMS["PARAM_THRESHOLD_ID"], default="THR_V1",
                        help="基线阈值ID（默认THR_V1）")
    parser.add_argument(STABLE_PARAMS["PARAM_THRESHOLD_COMPARE"], default=None,
                        help="对比阈值ID（可选，用于灰度前后对比）")
    parser.add_argument(STABLE_PARAMS["PARAM_DRIFT"], type=float, default=None,
                        help="阈值漂移数值（用于鲁棒性测试，正=放宽,负=收紧）")
    parser.add_argument(STABLE_PARAMS["PARAM_INJECT_MISSING"], action="store_true",
                        help="注入缺少材料场景（鲁棒性测试开关）")
    parser.add_argument(STABLE_PARAMS["PARAM_INJECT_CONFLICT"], action="store_true",
                        help="注入冲突版本材料场景（鲁棒性测试开关）")
    parser.add_argument(STABLE_PARAMS["PARAM_OUTPUT_FORMAT"], choices=["text", "json"], default="text",
                        help="输出格式：text或json")
    parser.add_argument(STABLE_PARAMS["PARAM_AUDIENCE"], choices=["标注", "算法"], default="标注",
                        help="报告受众：标注(周姐视角) 或 算法(值班时间线视角)")
    parser.add_argument("--fixture", choices=["demo1", "demo2_drift", "demo3_messy"], default=None,
                        help="使用内置场景演示数据（不接外部存储）")
    return parser


def load_fixture(name: str, case_id: str):
    now = datetime.now()
    fixtures = {}
    th_v1 = ScoreThreshold(
        threshold_id="THR_V1",
        threshold_name="基线阈值v1",
        pass_line=75.0,
        reject_line=55.0,
        effective_from=datetime(2025, 1, 1)
    )
    th_v2 = ScoreThreshold(
        threshold_id="THR_V2",
        threshold_name="灰度阈值v2",
        pass_line=72.0,
        reject_line=52.0,
        effective_from=datetime(2025, 6, 1)
    )
    fixtures["thresholds"] = [th_v1, th_v2]

    if name == "demo1":
        materials = [
            CaseMaterial(
                material_id="M001", case_id=case_id,
                material_type="身份资料", status=MaterialStatus.COMPLETE,
                versions=[
                    MaterialVersion("v1", "身份证3301011990XXXX1234 姓名张三", "系统录入", now.replace(day=1, hour=9))
                ],
                references=["id_scan:001"]
            ),
            CaseMaterial(
                material_id="M002", case_id=case_id,
                material_type="收入证明", status=MaterialStatus.COMPLETE,
                versions=[
                    MaterialVersion("v1", "月收入8000元", "渠道A", now.replace(day=1, hour=10)),
                    MaterialVersion("v2", "月收入15000元(含绩效)", "渠道A-复核", now.replace(day=2, hour=14), note="口径调整：补入季度绩效")
                ],
                references=["salary:bank_202506"]
            ),
            CaseMaterial(
                material_id="M003", case_id=case_id,
                material_type="征信报告", status=MaterialStatus.COMPLETE,
                versions=[
                    MaterialVersion("v1", "无逾期记录，负债5万", "征信中心", now.replace(day=1, hour=11))
                ]
            )
        ]
        corrections = [
            ManualCorrection(
                correction_id="C001", case_id=case_id, operator="周姐",
                timestamp=now.replace(day=3, hour=10),
                original_verdict=ScoreVerdict.GRAY,
                corrected_verdict=ScoreVerdict.PASS,
                reason="收入口径已补全绩效，可通过",
                related_material_ids=["M002"]
            )
        ]
        withdrawals = []
        verbal_notes = [
            VerbalNote(
                note_id="V001", case_id=case_id, operator="业务员小李",
                timestamp=now.replace(day=2, hour=16),
                content="客户名下还有一套未过户房产，价值约80万，下周补资产证明",
                related_material_ids=[]
            )
        ]
    elif name == "demo2_drift":
        materials = [
            CaseMaterial(
                material_id="M010", case_id=case_id,
                material_type="身份资料", status=MaterialStatus.COMPLETE,
                versions=[MaterialVersion("v1", "李四 330101XXXX", "录入", now)],
                references=["id:010"]
            ),
            CaseMaterial(
                material_id="M011", case_id=case_id,
                material_type="收入证明", status=MaterialStatus.COMPLETE,
                versions=[MaterialVersion("v1", "月入6500", "渠道B", now.replace(hour=1))],
                references=["sal:011"]
            ),
            CaseMaterial(
                material_id="M012", case_id=case_id,
                material_type="征信报告", status=MaterialStatus.COMPLETE,
                versions=[MaterialVersion("v1", "1次逾期(30天内),负债2万", "征信中心", now.replace(hour=2))]
            )
        ]
        corrections = []
        withdrawals = []
        verbal_notes = []
    elif name == "demo3_messy":
        materials = [
            CaseMaterial(
                material_id="M020", case_id=case_id,
                material_type="身份资料", status=MaterialStatus.COMPLETE,
                versions=[MaterialVersion("v1", "王五 330101XXXX", "录入", now.replace(day=1))],
                references=["id:020"]
            ),
            CaseMaterial(
                material_id="M021", case_id=case_id,
                material_type="收入证明", status=MaterialStatus.REVISED,
                versions=[
                    MaterialVersion("v1", "月入5000元", "渠道C", now.replace(day=1, hour=9)),
                    MaterialVersion("v2", "月入12000元", "渠道C-经理", now.replace(day=2, hour=10), note="重新核实流水"),
                    MaterialVersion("v3", "月入9800元(剔除兼职)", "渠道C-风控", now.replace(day=3, hour=11), note="扣除非固定兼职收入")
                ],
                references=[]
            ),
            CaseMaterial(
                material_id="M022", case_id=case_id,
                material_type="征信报告", status=MaterialStatus.WITHDRAWN,
                versions=[MaterialVersion("v1", "逾期4次", "征信中心", now.replace(day=1))]
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
                timestamp=now.replace(day=2, hour=15),
                withdrawn_material_id="M022",
                reason="客户称报告主体有误，重新拉取征信中"
            )
        ]
        verbal_notes = [
            VerbalNote(
                note_id="V010", case_id=case_id, operator="主管",
                timestamp=now.replace(day=3, hour=17),
                content="收入以v3为准，征信重拉到了直接归档M022替换",
                related_material_ids=["M021", "M022"]
            )
        ]
    else:
        return None
    fixtures["materials"] = materials
    fixtures["corrections"] = corrections
    fixtures["withdrawals"] = withdrawals
    fixtures["verbal_notes"] = verbal_notes
    return fixtures


def main(argv=None):
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    run_id = getattr(args, STABLE_PARAMS["PARAM_RUN_ID"].lstrip("-").replace("-", "_"))
    case_id = getattr(args, STABLE_PARAMS["PARAM_CASE_ID"].lstrip("-").replace("-", "_"))
    baseline_th_id = getattr(args, STABLE_PARAMS["PARAM_THRESHOLD_ID"].lstrip("-").replace("-", "_"))
    compare_th_id = getattr(args, STABLE_PARAMS["PARAM_THRESHOLD_COMPARE"].lstrip("-").replace("-", "_"))
    drift = getattr(args, STABLE_PARAMS["PARAM_DRIFT"].lstrip("-").replace("-", "_"))
    inject_missing = getattr(args, STABLE_PARAMS["PARAM_INJECT_MISSING"].lstrip("-").replace("-", "_"))
    inject_conflict = getattr(args, STABLE_PARAMS["PARAM_INJECT_CONFLICT"].lstrip("-").replace("-", "_"))
    fmt = getattr(args, STABLE_PARAMS["PARAM_OUTPUT_FORMAT"].lstrip("-").replace("-", "_"))
    audience = getattr(args, STABLE_PARAMS["PARAM_AUDIENCE"].lstrip("-").replace("-", "_"))

    config = ReplayConfig(
        run_id=run_id,
        threshold_drift=drift,
        inject_missing_materials=inject_missing,
        inject_conflicting_materials=inject_conflict,
        baseline_threshold_id=baseline_th_id,
        comparison_threshold_id=compare_th_id
    )

    if args.fixture:
        fixture = load_fixture(args.fixture, case_id)
        if fixture is None:
            print(f"{ERROR_MESSAGES['INVALID_CASE_ID']}", file=sys.stderr)
            return 2
    else:
        print("[ERR_CFG_002] 未指定--fixture，当前版本仅支持内置演示场景", file=sys.stderr)
        print("        可用场景：demo1 | demo2_drift | demo3_messy", file=sys.stderr)
        return 2

    tracker = MaterialTracker()
    engine = ReplayEngine(tracker)
    for th in fixture["thresholds"]:
        engine.register_threshold(th)

    result = engine.run_replay(
        config=config,
        case_id=case_id,
        materials=fixture["materials"],
        corrections=fixture["corrections"],
        withdrawals=fixture["withdrawals"],
        verbal_notes=fixture["verbal_notes"]
    )

    analyzer = GrayAnalyzer()
    reporter = ReportGenerator(analyzer)

    if result.errors:
        for e in result.errors:
            print(e, file=sys.stderr)

    if fmt == "json":
        out = reporter.to_dict(result)
        print(json.dumps(out, ensure_ascii=False, indent=2, default=str))
    else:
        print(reporter.generate(result, audience=audience))

    exit_codes = {
        "已处理": 0,
        "灰度中": 0,
        "人工改判": 0,
        "待补材料": 3
    }
    return exit_codes.get(result.final_status.value, 1)


if __name__ == "__main__":
    sys.exit(main())
