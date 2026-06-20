#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from copy import deepcopy


SAMPLES = [
    {
        "sample_id": "FL-SAMPLE-001",
        "case_type": "normal",
        "case_name": "正常特征血缘记录",
        "feature_name": "user_click_rate_7d",
        "upstream_tables": ["dwd.user_behavior_log"],
        "downstream_tables": ["ads.user_profile_daily"],
        "version_alias": "v20260615_prod",
        "version_target_file": "s3://prod-feature/20260615/user_click_rate.parquet",
        "actual_file_exists": True,
        "etl_status": "success",
        "checksum_match": True,
        "expected_conclusion": "PASS",
        "supplementary": False,
        "description": "标准特征：上游表正常产出，下游消费正常，版本别名指向当日新文件"
    },
    {
        "sample_id": "FL-SAMPLE-002",
        "case_type": "supplementary",
        "case_name": "补录特征血缘记录",
        "feature_name": "user_pay_amount_30d",
        "upstream_tables": ["dwd.user_pay_order", "dim.user_info"],
        "downstream_tables": ["ads.user_value_score"],
        "version_alias": "v20260614_backfill",
        "version_target_file": "s3://prod-feature/20260614/retry-02/user_pay_amount.parquet",
        "actual_file_exists": True,
        "etl_status": "backfill_success",
        "checksum_match": True,
        "expected_conclusion": "PASS_WITH_REMARK",
        "supplementary": True,
        "supplementary_note": "06-14原始任务失败，06-15凌晨重跑补录成功，下游延迟消费",
        "manual_intervention": {
            "operator": "小许",
            "time": "2026-06-15 03:22:18",
            "action": "OVERRIDE_FROM_FAIL_TO_PASS",
            "original_judgement": "FAIL",
            "final_judgement": "PASS_WITH_REMARK",
            "reason": "补录任务二次校验通过，checksum匹配，下游已有消费记录，按补录流程放行"
        },
        "description": "补录特征：原始任务失败，二次重跑补录，小许人工审核放行"
    },
    {
        "sample_id": "FL-SAMPLE-003",
        "case_type": "version_alias_stale",
        "case_name": "版本别名指向旧文件（灰度重跑覆盖问题）",
        "feature_name": "item_recall_score_v2",
        "upstream_tables": ["dwd.item_exposure_log", "dwd.item_click_log"],
        "downstream_tables": ["ads.recall_candidate_pool"],
        "version_alias": "v20260616_gray",
        "version_target_file": "s3://prod-feature/20260615/item_recall_score.parquet",
        "actual_file_exists": True,
        "etl_status": "rerun_success",
        "checksum_match": False,
        "expected_conclusion": "BLOCK",
        "supplementary": False,
        "stale_evidence": {
            "alias_declare_date": "2026-06-16",
            "actual_file_date": "2026-06-15",
            "stuck_stage": "版本别名解析 → 文件路径校验",
            "stuck_detail": "灰度配置重跑后，version_alias=v20260616_gray 仍解析到前一天的 s3://prod-feature/20260615/ 路径下的旧文件，新文件 s3://prod-feature/20260616/item_recall_score.parquet 未被别名覆盖指向",
            "rerun_side_effect": "重跑1次后，旧证据（06-15的checksum）被覆盖写入新的06-16任务记录中，无法回滚比对"
        },
        "manual_intervention": {
            "operator": "小许",
            "time": "2026-06-16 10:45:33",
            "action": "FLAG_FOR_INVESTIGATION",
            "original_judgement": "PASS",
            "final_judgement": "BLOCK",
            "reason": "初始灰度校验误判通过，小许二次复核发现版本别名仍卡在前一日文件路径，按异常流程拦截，附人工说明保留历史"
        },
        "description": "核心异常：版本别名未随重跑更新，旧文件被当新文件使用，灰度重跑覆盖了原始证据"
    },
    {
        "sample_id": "FL-SAMPLE-004",
        "case_type": "lineage_broken",
        "case_name": "血缘链路断裂异常",
        "feature_name": "user_tag_interest_90d",
        "upstream_tables": ["dwd.user_tag_raw"],
        "downstream_tables": ["ads.user_tag_wide"],
        "version_alias": "v20260616_prod",
        "version_target_file": "s3://prod-feature/20260616/user_tag_interest.parquet",
        "actual_file_exists": False,
        "etl_status": "upstream_missing",
        "checksum_match": None,
        "expected_conclusion": "FAIL",
        "supplementary": False,
        "broken_detail": {
            "missing_link": "dwd.user_tag_raw 2026-06-16分区未产出",
            "impacted_downstream": "ads.user_tag_wide 延迟等待超过4小时"
        },
        "description": "上游依赖缺失导致血缘断链，下游无法消费"
    }
]

AUDIT_HISTORY = []


@dataclass
class ReplayResult:
    sample_id: str
    case_name: str
    case_type: str
    stage_results: List[Dict] = field(default_factory=list)
    final_conclusion: str = ""
    conclusion_reason: str = ""
    audit_trail: List[Dict] = field(default_factory=list)
    deviation_flag: bool = False
    deviation_detail: str = ""
    stale_stuck_info: Optional[Dict] = None
    pass_with_remark: bool = False
    remark_text: str = ""


class LineageReplayEngine:
    STAGES = [
        ("version_alias_parse", "版本别名解析"),
        ("file_existence_check", "目标文件存在性校验"),
        ("etl_status_check", "ETL任务状态校验"),
        ("checksum_integrity", "Checksum完整性校验"),
        ("lineage_link_verify", "血缘链路上下游核对"),
        ("final_conclusion", "最终结论判定")
    ]

    CONCLUSION_ORDER = {"PASS": 0, "PASS_WITH_REMARK": 1, "FAIL": 2, "BLOCK": 3}
    CONCLUSION_LABEL = {
        "PASS": "正常通过",
        "PASS_WITH_REMARK": "通过（附备注）",
        "FAIL": "失败",
        "BLOCK": "阻断（需人工介入）"
    }
    CONCLUSION_COLOR = {
        "PASS": "\033[92m",
        "PASS_WITH_REMARK": "\033[93m",
        "FAIL": "\033[91m",
        "BLOCK": "\033[95m",
        "ENDC": "\033[0m"
    }

    def __init__(self, samples: List[Dict]):
        self.samples = samples
        self.results: List[ReplayResult] = []
        self.global_audit: List[Dict] = []

    def _log_audit(self, sample_id: str, operator: str, action: str,
                   original: str, final: str, reason: str, timestamp: str):
        entry = {
            "sample_id": sample_id,
            "operator": operator,
            "action": action,
            "original_judgement": original,
            "final_judgement": final,
            "reason": reason,
            "timestamp": timestamp,
            "logged_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        self.global_audit.append(entry)
        AUDIT_HISTORY.append(entry)
        return entry

    def _run_single_sample(self, sample: Dict) -> ReplayResult:
        result = ReplayResult(
            sample_id=sample["sample_id"],
            case_name=sample["case_name"],
            case_type=sample["case_type"]
        )

        if sample.get("manual_intervention"):
            mi = sample["manual_intervention"]
            audit_entry = self._log_audit(
                sample_id=sample["sample_id"],
                operator=mi["operator"],
                action=mi["action"],
                original=mi["original_judgement"],
                final=mi["final_judgement"],
                reason=mi["reason"],
                timestamp=mi["time"]
            )
            result.audit_trail.append(audit_entry)

        for stage_key, stage_name in self.STAGES[:-1]:
            stage_result = {"stage": stage_key, "stage_name": stage_name, "status": "PASS", "detail": ""}

            if stage_key == "version_alias_parse":
                alias = sample["version_alias"]
                target = sample["version_target_file"]
                alias_date = alias.replace("v", "").split("_")[0]
                target_date_in_path = target.split("/")[-2] if len(target.split("/")) >= 2 else ""
                if sample["case_type"] == "version_alias_stale":
                    stage_result["status"] = "WARN"
                    stage_result["detail"] = (
                        f"版本别名 {alias} 声明日期={alias_date}，"
                        f"但解析到的目标路径日期={target_date_in_path}（非当日），"
                        f"卡住位置：{sample['stale_evidence']['stuck_stage']}"
                    )
                else:
                    stage_result["detail"] = f"别名 {alias} → {target}"

            elif stage_key == "file_existence_check":
                if not sample["actual_file_exists"]:
                    stage_result["status"] = "FAIL"
                    stage_result["detail"] = f"目标文件不存在: {sample['version_target_file']}"
                else:
                    stage_result["detail"] = "文件存在"

            elif stage_key == "etl_status_check":
                status = sample["etl_status"]
                if status in ("success", "backfill_success", "rerun_success"):
                    if sample.get("supplementary"):
                        stage_result["status"] = "WARN"
                        stage_result["detail"] = f"ETL状态: {status}（补录任务）"
                    elif sample["case_type"] == "version_alias_stale":
                        stage_result["status"] = "WARN"
                        stage_result["detail"] = f"ETL状态: {status}，但版本别名指向文件需进一步核实"
                    else:
                        stage_result["detail"] = f"ETL状态: {status}"
                elif status == "upstream_missing":
                    stage_result["status"] = "FAIL"
                    stage_result["detail"] = f"ETL状态: {status}，上游分区未产出"
                else:
                    stage_result["status"] = "FAIL"
                    stage_result["detail"] = f"ETL状态异常: {status}"

            elif stage_key == "checksum_integrity":
                checksum = sample["checksum_match"]
                if checksum is True:
                    stage_result["detail"] = "Checksum校验通过"
                elif checksum is False:
                    stage_result["status"] = "FAIL"
                    if sample["case_type"] == "version_alias_stale":
                        stage_result["detail"] = (
                            "Checksum不匹配：灰度配置重跑1次后，"
                            "旧文件checksum覆盖写入新任务记录，原始证据丢失无法比对"
                        )
                    else:
                        stage_result["detail"] = "Checksum校验失败"
                elif checksum is None:
                    stage_result["status"] = "SKIP"
                    stage_result["detail"] = "文件不存在，跳过checksum校验"

            elif stage_key == "lineage_link_verify":
                if sample["case_type"] == "lineage_broken":
                    stage_result["status"] = "FAIL"
                    bd = sample["broken_detail"]
                    stage_result["detail"] = f"血缘断链: {bd['missing_link']}，下游影响: {bd['impacted_downstream']}"
                else:
                    up = ",".join(sample["upstream_tables"])
                    down = ",".join(sample["downstream_tables"])
                    stage_result["detail"] = f"链路完整 上游[{up}] → 特征 → 下游[{down}]"

            result.stage_results.append(stage_result)

        self._determine_conclusion(sample, result)

        return result

    def _determine_conclusion(self, sample: Dict, result: ReplayResult):
        worst = "PASS"
        for sr in result.stage_results:
            if sr["status"] == "FAIL":
                worst = "FAIL" if self.CONCLUSION_ORDER[worst] < self.CONCLUSION_ORDER["FAIL"] else worst
            elif sr["status"] == "WARN":
                worst = "PASS_WITH_REMARK" if self.CONCLUSION_ORDER[worst] < self.CONCLUSION_ORDER["PASS_WITH_REMARK"] else worst

        manual_final = None
        if sample.get("manual_intervention"):
            manual_final = sample["manual_intervention"]["final_judgement"]

        if manual_final:
            if self.CONCLUSION_ORDER.get(manual_final, 99) > self.CONCLUSION_ORDER[worst]:
                worst = manual_final

        if sample["case_type"] == "version_alias_stale":
            worst = "BLOCK"
            result.stale_stuck_info = sample.get("stale_evidence", {})
            result.deviation_flag = True
            result.deviation_detail = (
                f"样本{sample['sample_id']}：版本别名指向旧文件，"
                f"拉偏整体结论（若不人工拦截将误判为PASS）"
            )
        elif sample["case_type"] == "lineage_broken":
            worst = "FAIL"
            result.deviation_flag = True
            result.deviation_detail = f"样本{sample['sample_id']}：血缘断链，上游缺失导致失败"
        elif sample.get("supplementary"):
            worst = "PASS_WITH_REMARK"
            result.pass_with_remark = True
            result.remark_text = sample.get("supplementary_note", "")

        result.final_conclusion = worst
        reasons = []
        for sr in result.stage_results:
            if sr["status"] != "PASS":
                reasons.append(f"{sr['stage_name']}:{sr['detail']}")
        result.conclusion_reason = " | ".join(reasons) if reasons else "所有校验环节通过"

    def run_all(self) -> List[ReplayResult]:
        for sample in self.samples:
            print(f"\n{'='*60}")
            print(f"▶ 回放样本: {sample['sample_id']} - {sample['case_name']}")
            print(f"  描述: {sample['description']}")
            print(f"{'='*60}")
            res = self._run_single_sample(sample)
            self.results.append(res)
            self._print_sample_progress(res)
        return self.results

    def _print_sample_progress(self, res: ReplayResult):
        for sr in res.stage_results:
            status_icon = "✓" if sr["status"] == "PASS" else ("!" if sr["status"] == "WARN" else ("-" if sr["status"] == "SKIP" else "✗"))
            print(f"  [{status_icon}] {sr['stage_name']}: {sr['detail']}")
        c = self.CONCLUSION_COLOR.get(res.final_conclusion, "")
        e = self.CONCLUSION_COLOR["ENDC"]
        print(f"  ╰→ 结论: {c}{self.CONCLUSION_LABEL[res.final_conclusion]}{e}")
        if res.final_conclusion == "PASS_WITH_REMARK" and res.remark_text:
            print(f"     备注: {res.remark_text}")
        if res.final_conclusion == "BLOCK" and res.stale_stuck_info:
            print(f"     ⚠ 阻断详情: {res.stale_stuck_info['stuck_detail']}")
            print(f"     ⚠ 重跑副作用: {res.stale_stuck_info['rerun_side_effect']}")
        if res.audit_trail:
            for a in res.audit_trail:
                print(f"     🕒 [{a['timestamp']}] {a['operator']} {a['action']}: "
                      f"{a['original_judgement']}→{a['final_judgement']} 理由:{a['reason']}")


class ReplayReporter:
    def __init__(self, engine: LineageReplayEngine):
        self.engine = engine
        self.results = engine.results
        self.audit = engine.global_audit

    def _summary_metrics(self) -> Dict:
        total = len(self.results)
        counts = {k: 0 for k in LineageReplayEngine.CONCLUSION_ORDER.keys()}
        deviations = []
        for r in self.results:
            counts[r.final_conclusion] += 1
            if r.deviation_flag:
                deviations.append(r)
        return {
            "total": total,
            "counts": counts,
            "pass_rate": round((counts["PASS"] + counts["PASS_WITH_REMARK"]) / total * 100, 2) if total else 0.0,
            "deviations": deviations
        }

    def print_report(self):
        m = self._summary_metrics()
        sep = "=" * 72

        print(f"\n\n{sep}")
        print("📋 特征血缘异常回放 — 汇总报告")
        print(sep)
        print(f"  回放样本总数: {m['total']} 条")
        cc = LineageReplayEngine.CONCLUSION_COLOR
        cl = LineageReplayEngine.CONCLUSION_LABEL
        ce = cc["ENDC"]
        for k in ["PASS", "PASS_WITH_REMARK", "FAIL", "BLOCK"]:
            print(f"  {cc[k]}{cl[k]:<12}{ce}: {m['counts'][k]} 条")
        print(f"  整体通过率: {m['pass_rate']}%")

        if m["deviations"]:
            print(f"\n{'-' * 72}")
            print("🔍 拉偏结论的样本明细（评审追问重点）")
            print(f"{'-' * 72}")
            for r in m["deviations"]:
                tag = "⚠阻断" if r.final_conclusion == "BLOCK" else "✗失败"
                print(f"  [{tag}] {r.sample_id} - {r.case_name}")
                print(f"        拉偏原因: {r.deviation_detail}")
                print(f"        原因明细: {r.conclusion_reason}")
                if r.stale_stuck_info:
                    s = r.stale_stuck_info
                    print(f"        卡住环节: {s['stuck_stage']}")
                    print(f"        别名声明: {s['alias_declare_date']} 实际文件: {s['actual_file_date']}")
                    print(f"        重跑覆盖: {s['rerun_side_effect']}")

        print(f"\n{'-' * 72}")
        print("📜 人工干预历史记录（小许判断留痕，不止看最终结果）")
        print(f"{'-' * 72}")
        if self.audit:
            for a in self.audit:
                print(f"  [{a['timestamp']}] {a['sample_id']} | {a['operator']}")
                print(f"    动作: {a['action']}  判定变更: {a['original_judgement']} → {a['final_judgement']}")
                print(f"    理由: {a['reason']}")
                print(f"    系统落账: {a['logged_at']}")
        else:
            print("  （无人工干预记录）")

        print(f"\n{'-' * 72}")
        print("🔗 单条样例完整链路（正常记录 → 结论，不再依赖灰度硬拼）")
        print(f"{'-' * 72}")
        for r in self.results:
            if r.case_type == "normal":
                print(f"  {r.sample_id} | {r.case_name}")
                for sr in r.stage_results:
                    print(f"    → {sr['stage_name']}: {sr['detail']}")
                print(f"    ▶ 最终结论: {cl[r.final_conclusion]}")

    def exit_with_summary(self):
        m = self._summary_metrics()
        stale_blocks = [r for r in self.results if r.stale_stuck_info]

        print(f"\n\n{'#' * 72}")
        print("#  回放结束 · 退出说明")
        print(f"{'#' * 72}")

        if stale_blocks:
            print("""
┌──────────────────────────────────────────────────────────────────────┐
│  ⚠⚠⚠  版本别名指旧文件 —— 卡点说明（本次回放 BLOCK 样本核心问题）      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  卡住阶段:  版本别名解析 → 文件路径校验                               │
│                                                                      │
│  现象:                                                                │
│   1. version_alias 声明为 v20260616_gray（当日灰度）                 │
│   2. 实际解析路径却落在 s3://prod-feature/20260615/ （前一日目录）    │
│   3. 灰度重跑一次后，旧文件(06-15)的 checksum 被覆盖写入新任务(06-16) │
│      的证据字段，导致原始对比例证丢失，无法判断「旧文件卡在哪一步」     │
│                                                                      │
│  结论分类:  BLOCK（≠ PASS ≠ FAIL）                                    │
│    区别于普通通过和普通失败，此类记录明确标记为「阻断待人工」          │
│    处理结果绝不写成像正常通过的样子                                   │
│                                                                      │
│  根因定位:                                                           │
│    灰度配置 alias→path 映射表未随重跑原子更新，缓存或DB写回时序问题   │
│    → 建议修复: alias注册加版本号乐观锁，重跑时强制刷新映射            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
""")

        total = m["total"]
        block_cnt = m["counts"]["BLOCK"]
        fail_cnt = m["counts"]["FAIL"]
        pass_cnt = m["counts"]["PASS"]
        remark_cnt = m["counts"]["PASS_WITH_REMARK"]

        print(f"  样本分布: PASS×{pass_cnt} + PASS_WITH_REMARK×{remark_cnt} "
              f"+ FAIL×{fail_cnt} + BLOCK×{block_cnt} = {total} 条")
        print(f"  通过率:   {m['pass_rate']}%")
        print(f"  阻断样本: {', '.join([r.sample_id for r in stale_blocks]) if stale_blocks else '无'}")
        print(f"  审计落账: 共 {len(self.audit)} 条人工干预记录已写入历史（含小许操作）")

        print(f"\n  ▌算法值班人核对清单（3-4条小样例照着走）:")
        for r in self.results:
            if r.case_type == "normal":
                print(f"    □ {r.sample_id} 正常记录：全环节PASS，链路贯通 → 结论 PASS")
            elif r.case_type == "supplementary":
                print(f"    □ {r.sample_id} 补录记录：ETL补录成功，小许审核放行 → 结论 PASS_WITH_REMARK")
            elif r.case_type == "version_alias_stale":
                print(f"    □ {r.sample_id} 异常记录：版本别名卡旧文件，小许复核升级为 → 结论 BLOCK")
            elif r.case_type == "lineage_broken":
                print(f"    □ {r.sample_id} 异常记录：上游断链血缘断裂 → 结论 FAIL")

        print(f"\n  ▌评审时追问方向:")
        for r in m["deviations"]:
            print(f"    · {r.sample_id}: {r.deviation_detail}")

        has_block = block_cnt > 0 or fail_cnt > 0
        code = 1 if has_block else 0
        verb = "异常" if has_block else "正常"
        print(f"\n▶ 进程退出码: {code}（{verb}结束）")
        sys.exit(code)


def save_artifacts(engine: LineageReplayEngine):
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "replay_output")
    os.makedirs(out_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_path = os.path.join(out_dir, f"replay_results_{ts}.json")
    audit_path = os.path.join(out_dir, f"audit_history_{ts}.json")

    serializable_results = []
    for r in engine.results:
        d = asdict(r)
        serializable_results.append(d)

    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(serializable_results, f, ensure_ascii=False, indent=2)
    with open(audit_path, "w", encoding="utf-8") as f:
        json.dump(AUDIT_HISTORY, f, ensure_ascii=False, indent=2)

    print(f"\n💾 产物落盘:")
    print(f"  回放结果: {results_path}")
    print(f"  审计历史: {audit_path}")


def print_banner():
    print(r"""
  _____    _                     _                        _         
 |  ___|__| |_   _ _ __ ___  ___| |__   ___  _   _  __ _  ___| |__   ___ 
 | |_ / _ \ | | | | '__/ _ \/ __| '_ \ / _ \| | | |/ _` |/ __| '_ \ / _ \
 |  _|  __/ | |_| | | |  __/ (__| | | | (_) | |_| | (_| | (__| | | |  __/
 |_|  \___|_|\__,_|_|  \___|\___|_| |_|\___/ \__,_|\__,_|\___|_| |_|\___|
   ___                _      ____           __ _ _   _       _     
  / _ \__ _ ____   __| |    |  _ \ ___ _ __ / _(_) | (_) ___ | | __
 | | | / _` | '_ \ / _` |    | |_) / _ \ '__| |_| | |_| |/ _ \| |/ /
 | |_| | (_| | | | | (_| |    |  _ <  __/ |  |  _| |  _| | (_) |   < 
  \___/ \__,_|_| |_|\__,_|    |_| \_\___|_|  |_| |_|_| |_|\___/|_|\_\
""")
    print("  ▌ Feature Lineage Abnormal Replay Tool  v1.0")
    print("  ▌ 单命令回放 · 样本级追溯 · 人工干预留痕 · 版本别名卡点诊断")
    print("  ▌ 算法值班人: 照着3-4条小样例走，覆盖 正常/补录/异常 三类场景")
    print()


def main():
    print_banner()
    print(f"📦 本次回放样例包: 共 {len(SAMPLES)} 条（正常×1 + 补录×1 + 异常×2）")

    engine = LineageReplayEngine(SAMPLES)
    engine.run_all()

    reporter = ReplayReporter(engine)
    reporter.print_report()

    save_artifacts(engine)

    reporter.exit_with_summary()


if __name__ == "__main__":
    main()
