"""核心校验引擎"""

from typing import Dict, List, Tuple
from datetime import date, datetime
from collections import defaultdict
import statistics
import uuid

from .config import AppConfig
from .models import (
    AnalysisDataset, AnomalyRecord, AnomalyAction, AnomalySeverity,
    BatchCVResult, RecordStatus, ManualNote
)


def _anomaly_id(prefix: str, batch_no: str, key: str) -> str:
    short = uuid.uuid5(uuid.NAMESPACE_URL, f"{prefix}:{batch_no}:{key}").hex[:8].upper()
    return f"{prefix}-{batch_no}-{short}"


class ValidationEngine:
    """核心校验引擎"""

    def __init__(self, config: AppConfig, dataset: AnalysisDataset):
        self.config = config
        self.dataset = dataset
        self.anomalies: List[AnomalyRecord] = []
        self.cv_results: List[BatchCVResult] = []

    def run_all(self) -> None:
        """运行所有校验"""
        self.check_blank_control()
        self.check_reaction_time_missing()
        self.check_reaction_time_deviation()
        self.check_weighing_deviation()
        self.check_temperature_curves()
        self.check_reagent_expiry()
        self.check_reagent_ledger_completeness()
        self.calculate_batch_cv()
        self.dataset.anomalies = self.anomalies
        self.dataset.cv_results = self.cv_results

    # ── 1. 空白对照缺失检测 ──────────────────────────────────
    def check_blank_control(self) -> None:
        min_count = self.config.thresholds.min_blank_control_count
        exp_by_batch: Dict[str, List] = defaultdict(list)
        for exp in self.dataset.experiment_records:
            exp_by_batch[exp.batch_no].append(exp)
        for batch_no, exps in exp_by_batch.items():
            total_blanks = sum(e.blank_control_count for e in exps)
            exp_count = len(exps)
            if exp_count == 0:
                continue
            detail_parts = []
            per_exp_counts = []
            for e in exps:
                per_exp_counts.append(f"{e.experiment_no}={e.blank_control_count}个")
                if e.blank_control_count == 0:
                    detail_parts.append(
                        f"实验{e.experiment_no}({e.experiment_type})完全未设置空白对照"
                    )
            avg_blanks = total_blanks / exp_count
            if total_blanks < min_count or avg_blanks < 1:
                detail_msg = (
                    f"本批次共{exp_count}个实验，空白对照总数={total_blanks}个，"
                    f"平均每个实验={avg_blanks:.1f}个。"
                    + (" ".join(detail_parts) if detail_parts else "")
                    + f" 各实验明细：{', '.join(per_exp_counts)}"
                )
                aid = _anomaly_id("BC", batch_no, f"blank{min_count}")
                if total_blanks == 0:
                    severity = AnomalySeverity.CRITICAL
                    action = AnomalyAction.SUPPLY_MATERIAL
                    title = "空白对照完全缺失"
                    blocking = (
                        f"根据《试剂盒批间差分析规范》要求，每批次至少需设置{min_count}个空白对照，"
                        f"本批次0个，数据无法通过统计检验。必须补做含空白对照的平行实验，"
                        f"否则无法评估试剂本底污染和交叉污染风险。"
                    )
                else:
                    severity = AnomalySeverity.WARNING
                    action = AnomalyAction.RECHECK
                    title = f"空白对照数量不足（需≥{min_count}个）"
                    blocking = (
                        f"规范要求每批次至少{min_count}个空白对照用于批间差CV计算，"
                        f"本批次仅{total_blanks}个。如不补充，CV结果置信度不足，"
                        f"结论仅作为参考，不建议用于试剂盒放行判定。"
                    )
                rel_ids = [e.record_id for e in exps]
                notes = []
                for e in exps:
                    notes.extend(e.manual_notes)
                self.anomalies.append(AnomalyRecord(
                    anomaly_id=aid,
                    batch_no=batch_no,
                    related_batch_no=batch_no,
                    source_module="空白对照校验",
                    anomaly_type="空白对照缺失/不足",
                    severity=severity,
                    action=action,
                    title=title,
                    detail_message=detail_msg,
                    blocking_reason=blocking,
                    related_record_ids=rel_ids,
                    manual_notes=notes,
                    raw_context={
                        "required_min": min_count,
                        "actual_total": total_blanks,
                        "experiment_count": exp_count,
                        "per_experiment": [
                            {"exp_no": e.experiment_no, "count": e.blank_control_count}
                            for e in exps
                        ],
                    },
                ))

    # ── 2. 反应时间漏记检测 ─────────────────────────────────
    def check_reaction_time_missing(self) -> None:
        rt_by_batch: Dict[str, List] = defaultdict(list)
        for rt in self.dataset.reaction_times:
            rt_by_batch[rt.batch_no].append(rt)
        for batch_no, rts in rt_by_batch.items():
            missing = [r for r in rts if r.is_missing]
            if not missing:
                continue
            exp_groups: Dict[str, List] = defaultdict(list)
            for m in missing:
                exp_groups[m.experiment_no].append(m)
            exp_parts = []
            rel_ids = []
            for exp_no, steps in exp_groups.items():
                step_names = [s.step_name for s in steps]
                exp_parts.append(f"实验{exp_no}漏记{len(steps)}步：{', '.join(step_names)}")
                rel_ids.extend([s.record_id for s in steps])
            detail_msg = (
                f"共{len(missing)}条反应时间未记录实际时长，涉及{len(exp_groups)}个实验。"
                + " ".join(exp_parts)
            )
            aid = _anomaly_id("RTM", batch_no, f"missing{len(missing)}")
            notes = []
            for m in missing:
                m.status = RecordStatus.PENDING
                notes.extend(m.manual_notes)
            self.anomalies.append(AnomalyRecord(
                anomaly_id=aid,
                batch_no=batch_no,
                related_batch_no=batch_no,
                source_module="反应时间校验",
                anomaly_type="反应时间漏记",
                severity=AnomalySeverity.WARNING,
                action=AnomalyAction.CORRECT_RECORD,
                title=f"{len(missing)}条反应时间实际时长未填写",
                detail_message=detail_msg,
                blocking_reason=(
                    f"反应时间是批间差分析的关键协变量。"
                    f"漏记导致无法判断是试剂本底差异还是操作时间差异引起的结果波动。"
                    f"请从仪器日志或实验监控录像中补录实际时长；如确实无法回忆，"
                    f"请在备注栏标注\"按标准时间计\"并签字确认。"
                ),
                related_record_ids=rel_ids,
                manual_notes=notes,
                raw_context={
                    "missing_count": len(missing),
                    "experiment_count": len(exp_groups),
                    "per_experiment": [
                        {"exp_no": k, "steps": [s.step_name for s in v]}
                        for k, v in exp_groups.items()
                    ],
                },
            ))

    # ── 3. 反应时间偏差检测 ─────────────────────────────────
    def check_reaction_time_deviation(self) -> None:
        tol = self.config.thresholds.reaction_time_tolerance_min
        rt_by_batch: Dict[str, List] = defaultdict(list)
        for rt in self.dataset.reaction_times:
            rt_by_batch[rt.batch_no].append(rt)
        for batch_no, rts in rt_by_batch.items():
            deviating = []
            for r in rts:
                if not r.is_missing and r.deviation_min is not None and r.deviation_min > tol:
                    deviating.append(r)
            if not deviating:
                continue
            detail_parts = []
            rel_ids = []
            for r in deviating:
                detail_parts.append(
                    f"{r.experiment_no}/{r.step_name}: 标准{r.standard_duration_min:.0f}min vs "
                    f"实际{r.actual_duration_min:.0f}min, 差{r.deviation_min:.1f}min"
                )
                rel_ids.append(r.record_id)
            aid = _anomaly_id("RTD", batch_no, f"dev{len(deviating)}")
            notes = []
            for r in deviating:
                notes.extend(r.manual_notes)
            self.anomalies.append(AnomalyRecord(
                anomaly_id=aid,
                batch_no=batch_no,
                related_batch_no=batch_no,
                source_module="反应时间校验",
                anomaly_type="反应时间超差",
                severity=AnomalySeverity.WARNING,
                action=AnomalyAction.REVIEW_ONLY,
                title=f"{len(deviating)}条反应时间偏差超过±{tol}分钟",
                detail_message="；".join(detail_parts),
                blocking_reason=(
                    f"反应时间偏差可能影响酶促反应动力学，需结合对应孔的OD值变化综合判断。"
                    f"如该孔同时伴随CV异常，建议标注为可疑数据；如结果稳定，可在备注中说明原因后保留。"
                ),
                related_record_ids=rel_ids,
                manual_notes=notes,
                raw_context={
                    "tolerance_min": tol,
                    "deviating_count": len(deviating),
                    "details": [
                        {"exp_no": r.experiment_no, "step": r.step_name,
                         "standard": r.standard_duration_min, "actual": r.actual_duration_min,
                         "deviation_min": r.deviation_min}
                        for r in deviating
                    ],
                },
            ))

    # ── 4. 称量偏差检测 ─────────────────────────────────────
    def check_weighing_deviation(self, warn_pct: float = 2.0, crit_pct: float = 5.0) -> None:
        ws_by_batch: Dict[str, List] = defaultdict(list)
        for ws in self.dataset.weighing_sheets:
            ws_by_batch[ws.batch_no].append(ws)
        for batch_no, wss in ws_by_batch.items():
            crit = [w for w in wss if w.deviation_percent > crit_pct]
            warn = [w for w in wss if warn_pct < w.deviation_percent <= crit_pct]
            if not crit and not warn:
                continue
            def fmt(w):
                return (f"{w.experiment_no}/{w.reagent_name}: 理论{w.theoretical_weight}{w.unit} "
                        f"实际{w.actual_weight}{w.unit} 偏差{w.deviation_percent:.1f}%")
            if crit:
                aid = _anomaly_id("WSC", batch_no, f"crit{len(crit)}")
                notes = []
                for w in crit:
                    notes.extend(w.manual_notes)
                self.anomalies.append(AnomalyRecord(
                    anomaly_id=aid,
                    batch_no=batch_no,
                    related_batch_no=batch_no,
                    source_module="称量单校验",
                    anomaly_type="称量偏差过大",
                    severity=AnomalySeverity.CRITICAL,
                    action=AnomalyAction.SUPPLY_MATERIAL,
                    title=f"{len(crit)}项称量偏差超过{crit_pct}%",
                    detail_message="；".join(fmt(w) for w in crit),
                    blocking_reason=(
                        f"称量偏差超过{crit_pct}%已超出分析天平允许范围，"
                        f"可能影响试剂浓度配比。建议重新称量并复核；"
                        f"如系试剂本身吸湿性导致，请在备注中记录温湿度并重新标定浓度。"
                    ),
                    related_record_ids=[w.record_id for w in crit],
                    manual_notes=notes,
                    raw_context={"threshold_pct": crit_pct, "items": [
                        {"exp_no": w.experiment_no, "reagent": w.reagent_name,
                         "dev_pct": w.deviation_percent} for w in crit]},
                ))
            if warn:
                aid = _anomaly_id("WSW", batch_no, f"warn{len(warn)}")
                notes = []
                for w in warn:
                    notes.extend(w.manual_notes)
                self.anomalies.append(AnomalyRecord(
                    anomaly_id=aid,
                    batch_no=batch_no,
                    related_batch_no=batch_no,
                    source_module="称量单校验",
                    anomaly_type="称量偏差偏大",
                    severity=AnomalySeverity.WARNING,
                    action=AnomalyAction.REVIEW_ONLY,
                    title=f"{len(warn)}项称量偏差介于{warn_pct}%~{crit_pct}%",
                    detail_message="；".join(fmt(w) for w in warn),
                    blocking_reason=(
                        f"称量偏差在允许边缘，请在复核时重点检查对应孔的复现性；"
                        f"如无其他异常可放行。"
                    ),
                    related_record_ids=[w.record_id for w in warn],
                    manual_notes=notes,
                    raw_context={"warn_pct": warn_pct, "crit_pct": crit_pct, "items": [
                        {"exp_no": w.experiment_no, "reagent": w.reagent_name,
                         "dev_pct": w.deviation_percent} for w in warn]},
                ))

    # ── 5. 温度曲线检测 ─────────────────────────────────────
    def check_temperature_curves(self) -> None:
        max_dev = self.config.thresholds.temp_curve_max_deviation
        tc_by_batch: Dict[str, List] = defaultdict(list)
        for tc in self.dataset.temp_curves:
            tc_by_batch[tc.batch_no].append(tc)
        for batch_no, tcs in tc_by_batch.items():
            bad_curves = []
            for tc in tcs:
                md = tc.max_deviation()
                if md is not None and md > max_dev:
                    bad_curves.append((tc, md))
            if not bad_curves:
                continue
            detail_parts = []
            rel_ids = []
            suggestions = set()
            for tc, md in bad_curves:
                detail_parts.append(
                    f"{tc.experiment_no}/{tc.curve_name}: 最大偏差{md:.1f}℃"
                )
                rel_ids.append(tc.record_id)
                suggestions.add("温度曲线超差")
                bt = self.dataset.batch_tracking.get(batch_no)
                if bt is not None:
                    for s in suggestions:
                        if s not in bt.recheck_suggestions:
                            bt.recheck_suggestions.append(s)
            aid = _anomaly_id("TC", batch_no, f"temp{len(bad_curves)}")
            notes = []
            for tc, _ in bad_curves:
                notes.extend(tc.manual_notes)
            self.anomalies.append(AnomalyRecord(
                anomaly_id=aid,
                batch_no=batch_no,
                related_batch_no=batch_no,
                source_module="温度曲线校验",
                anomaly_type="温度曲线超差",
                severity=AnomalySeverity.WARNING,
                action=AnomalyAction.RECHECK,
                title=f"{len(bad_curves)}条温度曲线偏差超过±{max_dev}℃",
                detail_message="；".join(detail_parts),
                blocking_reason=(
                    f"温度偏差超过±{max_dev}℃可能改变酶活和杂交效率。"
                    f"如为设备偶发故障且时间<3min，可补录说明后保留；"
                    f"如持续异常，建议更换温控模块后复测对应批次，"
                    f"否则批间差CV结果不具备可比性。"
                ),
                related_record_ids=rel_ids,
                manual_notes=notes,
                raw_context={"max_allowed_deviation": max_dev, "curves": [
                    {"exp_no": tc.experiment_no, "curve": tc.curve_name,
                     "max_dev": md} for tc, md in bad_curves]},
            ))

    # ── 6. 试剂有效期检测 ───────────────────────────────────
    def check_reagent_expiry(self) -> None:
        today = date.today()
        rl_by_batch: Dict[str, List] = defaultdict(list)
        for rl in self.dataset.reagent_ledgers:
            rl_by_batch[rl.batch_no].append(rl)
        for batch_no, rls in rl_by_batch.items():
            expired = [r for r in rls if r.is_expired(today)]
            if expired:
                aid = _anomaly_id("EXP", batch_no, f"exp{len(expired)}")
                notes = []
                for e in expired:
                    notes.extend(e.manual_notes)
                self.anomalies.append(AnomalyRecord(
                    anomaly_id=aid,
                    batch_no=batch_no,
                    related_batch_no=batch_no,
                    source_module="试剂台账校验",
                    anomaly_type="试剂过期",
                    severity=AnomalySeverity.CRITICAL,
                    action=AnomalyAction.SUPPLY_MATERIAL,
                    title=f"{len(expired)}个试剂已过期",
                    detail_message="；".join(
                        f"{r.reagent_name}(效期{r.expiry_date})" for r in expired
                    ),
                    blocking_reason=(
                        f"已过期试剂不允许用于试剂盒放行分析。"
                        f"请更换在效期内的试剂并重新实验，"
                        f"如系台账录入错误，请先更新台账再重新分析。"
                    ),
                    related_record_ids=[r.record_id for r in expired],
                    manual_notes=notes,
                    raw_context={"check_date": str(today), "items": [
                        {"reagent": r.reagent_name, "expiry": str(r.expiry_date)}
                        for r in expired]},
                ))

    # ── 7. 试剂台账完整性 ───────────────────────────────────
    def check_reagent_ledger_completeness(self) -> None:
        batches = self.dataset.get_batch_numbers()
        for bn in batches:
            batch_recs = self.dataset.get_records_for_batch(bn)
            missing_modules = []
            if not batch_recs["reagent_ledgers"]:
                missing_modules.append("试剂台账")
            if not batch_recs["experiment_records"]:
                missing_modules.append("实验记录")
            if not batch_recs["weighing_sheets"]:
                missing_modules.append("称量单")
            if not batch_recs["reaction_times"]:
                missing_modules.append("反应时间")
            if missing_modules:
                aid = _anomaly_id("INC", bn, "incomplete")
                action = AnomalyAction.SUPPLY_MATERIAL if "试剂台账" in missing_modules \
                    else AnomalyAction.CORRECT_RECORD
                self.anomalies.append(AnomalyRecord(
                    anomaly_id=aid,
                    batch_no=bn,
                    related_batch_no=bn,
                    source_module="台账完整性",
                    anomaly_type="批次材料不完整",
                    severity=AnomalySeverity.WARNING,
                    action=action,
                    title=f"缺少{', '.join(missing_modules)}",
                    detail_message=(
                        f"批次{bn}未提交{', '.join(missing_modules)}；"
                        f"分析仅基于现有数据，结论可能不完整。"
                    ),
                    blocking_reason=(
                        f"试剂盒批间差分析要求提交完整的\"试剂台账+实验记录+称量单+反应时间\"四联材料。"
                        f"当前缺少{', '.join(missing_modules)}，请尽快补录后重新运行分析。"
                    ),
                    related_record_ids=[],
                    raw_context={"missing_modules": missing_modules},
                ))

    # ── 8. 批间差 CV 计算 ───────────────────────────────────
    def calculate_batch_cv(self) -> None:
        cv_threshold = self.config.thresholds.max_batch_cv_percent
        batches = self.dataset.get_batch_numbers()
        for bn in batches:
            batch_recs = self.dataset.get_records_for_batch(bn)
            weights = [w.actual_weight for w in batch_recs["weighing_sheets"]
                       if w.actual_weight > 0]
            if len(weights) >= 3:
                mean_w = statistics.mean(weights)
                std_w = statistics.stdev(weights) if len(weights) > 1 else 0.0
                cv_w = (std_w / mean_w * 100) if mean_w > 0 else 0.0
                self.cv_results.append(BatchCVResult(
                    batch_no=bn,
                    indicator_name="称量值批间CV",
                    mean_value=mean_w,
                    std_value=std_w,
                    cv_percent=cv_w,
                    pass_threshold=cv_threshold,
                    is_pass=cv_w <= cv_threshold,
                    sample_count=len(weights),
                    data_source="称量单",
                ))
            blank_counts = [e.blank_control_count for e in batch_recs["experiment_records"]]
            if len(blank_counts) >= 2:
                mean_b = statistics.mean(blank_counts)
                std_b = statistics.stdev(blank_counts) if len(blank_counts) > 1 else 0.0
                cv_b = (std_b / mean_b * 100) if mean_b > 0 else 0.0
                self.cv_results.append(BatchCVResult(
                    batch_no=bn,
                    indicator_name="空白对照批间CV",
                    mean_value=mean_b,
                    std_value=std_b,
                    cv_percent=cv_b,
                    pass_threshold=cv_threshold,
                    is_pass=cv_b <= cv_threshold,
                    sample_count=len(blank_counts),
                    data_source="实验记录",
                ))
            actual_times = [r.actual_duration_min for r in batch_recs["reaction_times"]
                            if r.actual_duration_min is not None]
            if len(actual_times) >= 3:
                mean_t = statistics.mean(actual_times)
                std_t = statistics.stdev(actual_times) if len(actual_times) > 1 else 0.0
                cv_t = (std_t / mean_t * 100) if mean_t > 0 else 0.0
                self.cv_results.append(BatchCVResult(
                    batch_no=bn,
                    indicator_name="反应时间批间CV",
                    mean_value=mean_t,
                    std_value=std_t,
                    cv_percent=cv_t,
                    pass_threshold=cv_threshold,
                    is_pass=cv_t <= cv_threshold,
                    sample_count=len(actual_times),
                    data_source="反应时间",
                ))
        failed_cv = [c for c in self.cv_results if not c.is_pass]
        cv_by_batch: Dict[str, List] = defaultdict(list)
        for c in failed_cv:
            cv_by_batch[c.batch_no].append(c)
        for bn, cvs in cv_by_batch.items():
            aid = _anomaly_id("CV", bn, f"cvfail{len(cvs)}")
            details = []
            for c in cvs:
                details.append(
                    f"{c.indicator_name}: CV={c.cv_percent:.1f}% (阈值≤{c.pass_threshold}%, "
                    f"均值={c.mean_value:.3f}, SD={c.std_value:.3f}, n={c.sample_count})"
                )
            self.anomalies.append(AnomalyRecord(
                anomaly_id=aid,
                batch_no=bn,
                related_batch_no=bn,
                source_module="批间差计算",
                anomaly_type="批间差CV超差",
                severity=AnomalySeverity.CRITICAL,
                action=AnomalyAction.RECHECK,
                title=f"{len(cvs)}项指标批间差CV超标",
                detail_message="；".join(details),
                blocking_reason=(
                    f"批间差变异系数(CV)超过{cv_threshold}%，"
                    f"表明该批次试剂在不同实验间的一致性不足。"
                    f"请结合\"反应时间漏记/称量偏差/温度曲线\"等异常综合排查；"
                    f"排除操作因素后，建议增加平行实验数量重新评估。"
                ),
                related_record_ids=[],
                raw_context={"cv_threshold_pct": cv_threshold, "failed_indicators": [
                    {"name": c.indicator_name, "cv_pct": c.cv_percent,
                     "mean": c.mean_value, "sd": c.std_value, "n": c.sample_count}
                    for c in cvs]},
            ))
