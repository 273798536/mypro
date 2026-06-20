from typing import List, Dict, Any, Optional
from collections import Counter

from .models import (
    Sample, SampleStatus, SampleSource, ModelVersion,
    DecisionRecord, DecisionReason, GatekeeperResult, ManualCorrection,
    AuditHistory, MetricSnapshot, generate_id,
)
from .data_importer import DataImporter
from .contamination_detector import ContaminationDetector
from .misclassified_analyzer import MisclassifiedAnalyzer
from .manual_confirmation import ManualConfirmationManager
from .report_generator import MarkdownReportGenerator, ReportExporter


class GatekeeperThresholds:
    MIN_AUC = 0.70
    MIN_ACCURACY = 0.65
    MIN_F1 = 0.60
    MAX_CONTAMINATION_RATE = 0.05
    MIN_MISCLASSIFIED_EXPLANATION_RATE = 0.60


class ABGatekeeperPipeline:
    def __init__(
        self,
        model_version: ModelVersion,
        history_dir: Optional[str] = None,
        thresholds: Optional[GatekeeperThresholds] = None,
    ):
        self.model_version = model_version
        self.thresholds = thresholds or GatekeeperThresholds()
        self.importer = DataImporter()
        self.contamination_detector = ContaminationDetector()
        self.misclassified_analyzer = MisclassifiedAnalyzer()
        self.confirmation_manager = ManualConfirmationManager(history_dir=history_dir)
        self.samples: List[Sample] = []
        self.decisions: List[DecisionRecord] = []
        self._contamination_report: Dict[str, Any] = {}
        self._misclassified_report: Dict[str, Any] = {}

    def ingest_data(self, raw_data: List[Dict[str, Any]]):
        self.samples = self.importer.import_batch(raw_data)

    def ingest_json(self, json_path: str):
        self.samples = self.importer.import_json_file(json_path)

    def _check_metric_thresholds(self, sample: Sample) -> Optional[DecisionRecord]:
        m = sample.metrics
        failures = []
        if m.auc is not None and m.auc < self.thresholds.MIN_AUC:
            failures.append(f"AUC={m.auc:.4f} < 阈值{self.thresholds.MIN_AUC}")
        if m.accuracy is not None and m.accuracy < self.thresholds.MIN_ACCURACY:
            failures.append(f"ACC={m.accuracy:.4f} < 阈值{self.thresholds.MIN_ACCURACY}")
        if m.f1 is not None and m.f1 < self.thresholds.MIN_F1:
            failures.append(f"F1={m.f1:.4f} < 阈值{self.thresholds.MIN_F1}")
        if failures:
            return DecisionRecord(
                decision_id=generate_id("dec"),
                sample_id=sample.sample_id,
                passed=False,
                reason=DecisionReason.METRIC_BELOW_THRESHOLD,
                detail="；".join(failures),
                evidence_chain=[f"threshold_check:{k}" for k in failures],
                affected_by_sources=[sample.source],
            )
        return None

    def _check_old_log_inconsistency(self, sample: Sample) -> Optional[DecisionRecord]:
        if sample.source != SampleSource.TRAIN_LOG_OLD:
            return None
        return DecisionRecord(
            decision_id=generate_id("dec"),
            sample_id=sample.sample_id,
            passed=False,
            reason=DecisionReason.OLD_LOG_INCONSISTENCY,
            detail=(
                f"该样本来自旧版训练日志({sample.source.value})，时间戳{sample.timestamp}，"
                f"版本不匹配当前实验，仅作参考不纳入上线结论"
            ),
            evidence_chain=[f"source_mismatch:{sample.source.value}"],
            affected_by_sources=[SampleSource.TRAIN_LOG_OLD],
        )

    def _check_withdraw_evidence(self, sample: Sample, related_withdraws: List[Sample]) -> Optional[DecisionRecord]:
        if not related_withdraws:
            return None
        w = related_withdraws[0]
        return DecisionRecord(
            decision_id=generate_id("dec"),
            sample_id=sample.sample_id,
            passed=False,
            reason=DecisionReason.WITHDRAW_EVIDENCE,
            detail=(
                f"同任务存在撤回记录（样本{w.sample_id}，{w.timestamp}），"
                f"可能影响当前实验结论：{w.content[:80]}"
            ),
            evidence_chain=[f"withdraw_ref:{w.sample_id}"],
            affected_by_sources=[sample.source, SampleSource.WITHDRAW_RECORD],
        )

    def _check_verbal_conflict(self, sample: Sample, related_verbals: List[Sample]) -> Optional[DecisionRecord]:
        if not related_verbals:
            return None
        v = related_verbals[0]
        return DecisionRecord(
            decision_id=generate_id("dec"),
            sample_id=sample.sample_id,
            passed=True,
            reason=DecisionReason.VERBAL_NOTE_CONFLICT,
            detail=(
                f"存在口头备注（{v.timestamp}）：{v.content[:80]}；"
                f"口头备注不改变算法判定结论，但已标记供人工复核"
            ),
            evidence_chain=[f"verbal_note:{v.sample_id}"],
            affected_by_sources=[sample.source, SampleSource.VERBAL_NOTE],
        )

    def _check_contamination(self, sample: Sample) -> Optional[DecisionRecord]:
        if not sample.is_contaminated:
            return None
        return DecisionRecord(
            decision_id=generate_id("dec"),
            sample_id=sample.sample_id,
            passed=False,
            reason=DecisionReason.VALIDATION_CONTAMINATION,
            detail=sample.contamination_reason or "验证集样本存在污染风险",
            evidence_chain=["contamination_detected"],
            affected_by_sources=[SampleSource.VALIDATION_SET, SampleSource.TRAIN_LOG_CURRENT],
        )

    def run_algorithm_decisions(self):
        self.decisions = []

        self._contamination_report = self.contamination_detector.detect(self.samples)

        for s in self.samples:
            task_samples = [x for x in self.samples if x.task_id == s.task_id]
            related_withdraws = [x for x in task_samples if x.source == SampleSource.WITHDRAW_RECORD and x.sample_id != s.sample_id]
            related_verbals = [x for x in task_samples if x.source == SampleSource.VERBAL_NOTE and x.sample_id != s.sample_id]

            decision = None
            if s.source == SampleSource.VALIDATION_SET:
                decision = self._check_contamination(s)
                if decision is None:
                    decision = self._check_metric_thresholds(s)
            elif s.source == SampleSource.TRAIN_LOG_OLD:
                decision = self._check_old_log_inconsistency(s)
            elif s.source == SampleSource.WITHDRAW_RECORD:
                decision = DecisionRecord(
                    decision_id=generate_id("dec"),
                    sample_id=s.sample_id,
                    passed=False,
                    reason=DecisionReason.WITHDRAW_EVIDENCE,
                    detail=f"这是一条撤回记录本身（{s.content[:80]}），用于佐证而非直接判定",
                    evidence_chain=["withdraw_record_self"],
                    affected_by_sources=[SampleSource.WITHDRAW_RECORD],
                )
            elif s.source == SampleSource.VERBAL_NOTE:
                decision = DecisionRecord(
                    decision_id=generate_id("dec"),
                    sample_id=s.sample_id,
                    passed=True,
                    reason=DecisionReason.VERBAL_NOTE_CONFLICT,
                    detail=f"这是一条口头备注（{s.content[:80]}），不构成结论性判定依据",
                    evidence_chain=["verbal_note_self"],
                    affected_by_sources=[SampleSource.VERBAL_NOTE],
                )
            else:
                decision = self._check_metric_thresholds(s)

            if decision is None and related_withdraws and s.source in (SampleSource.TRAIN_LOG_CURRENT, SampleSource.VALIDATION_SET):
                wd = self._check_withdraw_evidence(s, related_withdraws)
                if wd:
                    decision = wd

            if related_verbals and s.source in (SampleSource.TRAIN_LOG_CURRENT, SampleSource.VALIDATION_SET):
                vd = self._check_verbal_conflict(s, related_verbals)
                if vd:
                    if decision is None:
                        decision = vd
                    else:
                        decision.affected_by_sources = list(
                            set(decision.affected_by_sources + vd.affected_by_sources)
                        )
                        decision.detail += f" （附加口头备注标记）"
                        decision.evidence_chain.extend(vd.evidence_chain)

            if decision is None:
                decision = DecisionRecord(
                    decision_id=generate_id("dec"),
                    sample_id=s.sample_id,
                    passed=True,
                    reason=DecisionReason.METRIC_BELOW_THRESHOLD if False else DecisionReason.METRIC_BELOW_THRESHOLD,
                    detail="指标满足阈值且无污染/撤回冲突，算法判定通过",
                    evidence_chain=["all_checks_passed"],
                    affected_by_sources=[s.source],
                )
                if s.metrics and (s.metrics.auc or s.metrics.accuracy):
                    passed_metrics = []
                    if s.metrics.auc:
                        passed_metrics.append(f"AUC={s.metrics.auc:.4f}")
                    if s.metrics.accuracy:
                        passed_metrics.append(f"ACC={s.metrics.accuracy:.4f}")
                    if passed_metrics:
                        decision.detail = f"指标达标（{'、'.join(passed_metrics)}）且无异常，算法判定通过"

            self.decisions.append(decision)

        misclassified_decisions = self.misclassified_analyzer.build_decision_records(self.samples)
        self._misclassified_report = self.misclassified_analyzer.analyze_all(self.samples)

        decision_map = {d.sample_id: d for d in self.decisions}
        for md in misclassified_decisions:
            if md.sample_id in decision_map:
                orig = decision_map[md.sample_id]
                orig.affected_by_sources = list(set(orig.affected_by_sources + md.affected_by_sources))
                orig.detail += f" （误判回检：{md.detail}）"
                orig.evidence_chain.extend(md.evidence_chain)
                if md.reason == DecisionReason.MISCLASSIFIED_EXPLAINED:
                    orig.passed = md.passed
                    orig.reason = md.reason
            else:
                self.decisions.append(md)

    def apply_manual_correction(
        self,
        sample_id: str,
        action,
        operator: str,
        comment: str,
        override_passed: Optional[bool] = None,
        override_reason_detail: str = "",
        scheduling_note: str = "",
    ) -> Optional[ManualCorrection]:
        sample = next((s for s in self.samples if s.sample_id == sample_id), None)
        if sample is None:
            return None
        prev_decision = next((d for d in self.decisions if d.sample_id == sample_id), None)
        new_decision = None
        if override_passed is not None:
            new_decision = self.confirmation_manager.create_override_decision(
                sample, override_passed, operator, override_reason_detail,
            )
            for i, d in enumerate(self.decisions):
                if d.sample_id == sample_id:
                    self.decisions[i] = new_decision
                    break
            else:
                self.decisions.append(new_decision)
        return self.confirmation_manager.apply_correction(
            sample=sample,
            action=action,
            operator=operator,
            comment=comment,
            previous_decision=prev_decision,
            new_decision=new_decision,
            scheduling_note=scheduling_note,
        )

    def get_manual_confirmation_queue(self) -> List[Dict[str, Any]]:
        return self.confirmation_manager.get_manual_confirmation_queue(
            self.samples, self.decisions,
        )

    def build_result(self) -> GatekeeperResult:
        sample_counter = Counter(s.status.value for s in self.samples)
        decision_map = {d.sample_id: d for d in self.decisions}

        blocking_reasons = []
        warning_reasons = []
        manual_required = False
        manual_details = self.get_manual_confirmation_queue()

        cr = self._contamination_report
        if cr:
            if cr.get("is_blocking"):
                blocking_reasons.append(
                    f"验证集污染阻断：{cr.get('contaminated_count', 0)}条样本存在污染风险"
                    f"（{cr.get('severity_distribution', {})}）"
                )
            elif cr.get("needs_manual_confirmation"):
                warning_reasons.append(
                    f"验证集污染告警：{cr.get('contaminated_count', 0)}条样本可疑，建议人工复核"
                )

        mr = self._misclassified_report
        if mr and mr.get("total_misclassified_samples", 0) > 0:
            if mr.get("needs_manual_review"):
                warning_reasons.append(
                    f"误判回检待解释：{mr.get('needs_manual_review_count', 0)}条暂无法自动归因"
                )
            if mr.get("introduced_error_count", 0) > 0:
                warning_reasons.append(
                    f"新模型引入新错误：{mr.get('introduced_error_count', 0)}条"
                )

        old_log_count = sum(1 for s in self.samples if s.source == SampleSource.TRAIN_LOG_OLD)
        if old_log_count > 0:
            warning_reasons.append(
                f"混有{old_log_count}条旧版训练日志，已从主结论中隔离，仅作参考"
            )

        withdraw_count = sum(1 for s in self.samples if s.source == SampleSource.WITHDRAW_RECORD)
        if withdraw_count > 0:
            affected_tasks = set()
            for s in self.samples:
                if s.source == SampleSource.WITHDRAW_RECORD:
                    affected_tasks.add(s.task_id)
            warning_reasons.append(
                f"包含{withdraw_count}条撤回记录，涉及任务：{'、'.join(sorted(affected_tasks))}"
            )

        verbal_count = sum(1 for s in self.samples if s.source == SampleSource.VERBAL_NOTE)
        if verbal_count > 0:
            warning_reasons.append(
                f"附带{verbal_count}条口头备注，不构成证据链核心，请人工核查"
            )

        if manual_details:
            manual_required = True

        overall_pass = (not blocking_reasons) and (not manual_required)
        for s in self.samples:
            d = decision_map.get(s.sample_id)
            if s.status == SampleStatus.PENDING:
                if d:
                    if d.passed and not s.is_contaminated:
                        s.status = SampleStatus.PASSED
                    elif not d.passed and not s.is_contaminated:
                        s.status = SampleStatus.FAILED

        return GatekeeperResult(
            overall_pass=overall_pass,
            blocking_reasons=blocking_reasons,
            warning_reasons=warning_reasons,
            sample_summary=dict(Counter(s.status.value for s in self.samples)),
            manual_confirmation_required=manual_required,
            manual_confirmation_details=manual_details,
            contamination_report=cr or {},
            misclassified_report=mr or {},
            decisions=self.decisions,
            corrections=self.confirmation_manager.corrections,
            history=self.confirmation_manager.history,
            model_version=self.model_version,
        )

    def generate_report(self, output_path: Optional[str] = None) -> str:
        result = self.build_result()
        if output_path:
            return ReportExporter.export(result, output_path)
        return ReportExporter.to_string(result)

    def run_full_pipeline(
        self,
        raw_data: List[Dict[str, Any]],
        report_path: Optional[str] = None,
    ) -> GatekeeperResult:
        self.ingest_data(raw_data)
        self.run_algorithm_decisions()
        result = self.build_result()
        if report_path:
            ReportExporter.export(result, report_path)
        return result
