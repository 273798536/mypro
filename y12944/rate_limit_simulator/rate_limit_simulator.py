from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from .models import (
    GroupMetrics,
    InterceptReason,
    InterceptResult,
    ManualCorrection,
    Sample,
    SampleStatus,
    SimulatorConfig,
)
from .safety_interceptor import SafetyInterceptor
from .report_generator import ReportGenerator
from .review_workflow import ReviewWorkflow


class RateLimitSimulator:
    def __init__(self, config: Optional[SimulatorConfig] = None):
        self.config = config or SimulatorConfig()
        self.interceptor = SafetyInterceptor(self.config)
        self.report_generator = ReportGenerator()
        self.review_workflow = ReviewWorkflow()
        self._samples: Dict[str, Sample] = {}
        self._intercept_results: Dict[str, InterceptResult] = {}
        self._sample_status: Dict[str, SampleStatus] = {}
        self._group_metrics: Dict[str, GroupMetrics] = {}

    def add_sample(self, sample: Sample) -> None:
        self._samples[sample.sample_id] = sample
        self._sample_status[sample.sample_id] = SampleStatus.PENDING
        if sample.group_id not in self._group_metrics:
            self._group_metrics[sample.group_id] = GroupMetrics(
                group_id=sample.group_id,
                group_name=f"分组_{sample.group_id}",
            )

    def add_samples(self, samples: List[Sample]) -> None:
        for sample in samples:
            self.add_sample(sample)

    def run_simulation(self) -> Dict[str, InterceptResult]:
        samples = list(self._samples.values())
        results = self.interceptor.batch_check(samples)
        self._intercept_results.update(results)

        for sample_id, result in results.items():
            if result.is_blocked:
                self._sample_status[sample_id] = SampleStatus.BLOCKED
            else:
                self._sample_status[sample_id] = SampleStatus.PASSED

        self._compute_group_metrics()
        return results

    def _compute_group_metrics(self) -> None:
        group_samples: Dict[str, List[Sample]] = defaultdict(list)
        for sample in self._samples.values():
            group_samples[sample.group_id].append(sample)

        for group_id, samples in group_samples.items():
            gm = self._group_metrics[group_id]
            gm.total_samples = len(samples)
            gm.passed_samples = 0
            gm.blocked_samples = 0
            gm.needs_review_samples = 0
            gm.duplicate_count = 0
            gm.leakage_count = 0
            gm.intercept_reasons = defaultdict(int)

            for sample in samples:
                status = self._sample_status.get(sample.sample_id, SampleStatus.PENDING)
                result = self._intercept_results.get(sample.sample_id)

                if status == SampleStatus.PASSED:
                    gm.passed_samples += 1
                elif status == SampleStatus.BLOCKED:
                    gm.blocked_samples += 1
                elif status == SampleStatus.NEEDS_REVIEW:
                    gm.needs_review_samples += 1

                if result:
                    for reason in result.intercept_reasons:
                        gm.intercept_reasons[reason.value] += 1
                        if reason == InterceptReason.DUPLICATE_SAMPLE:
                            gm.duplicate_count += 1
                        elif reason == InterceptReason.TRAIN_TEST_LEAKAGE:
                            gm.leakage_count += 1

            gm.compute_rates()

    def update_split_list_and_recheck(
        self, new_entries: List[str]
    ) -> Dict[str, InterceptResult]:
        self.interceptor.update_split_list(new_entries)
        samples = list(self._samples.values())
        results = self.interceptor.recheck_after_split_update(samples)
        self._intercept_results.update(results)

        for sample_id, result in results.items():
            if result.is_blocked:
                self._sample_status[sample_id] = SampleStatus.BLOCKED
            else:
                self._sample_status[sample_id] = SampleStatus.PASSED

        self._compute_group_metrics()
        return results

    def mark_for_review(self, sample_id: str) -> bool:
        if sample_id in self._sample_status:
            self._sample_status[sample_id] = SampleStatus.NEEDS_REVIEW
            self._compute_group_metrics()
            return True
        return False

    def apply_correction(self, sample_id: str, corrected_sample: Sample) -> bool:
        if sample_id not in self._samples:
            return False
        self._samples[sample_id] = corrected_sample
        self._sample_status[sample_id] = SampleStatus.CORRECTED

        result = self.interceptor.check_sample(corrected_sample)
        self._intercept_results[sample_id] = result

        if result.is_blocked:
            self._sample_status[sample_id] = SampleStatus.BLOCKED
        else:
            self._sample_status[sample_id] = SampleStatus.PASSED

        self._compute_group_metrics()
        return True

    def apply_manual_correction(
        self,
        sample_id: str,
        corrected_prompt: Optional[str] = None,
        corrected_response: Optional[str] = None,
        correction_note: str = "",
        corrected_by: str = "",
        auto_create_version: bool = True,
        auto_recheck: bool = True,
    ) -> Optional[ManualCorrection]:
        if sample_id not in self._samples:
            return None

        original_sample = self._samples[sample_id]

        new_prompt = corrected_prompt if corrected_prompt else original_sample.prompt
        new_response = (
            corrected_response if corrected_response else original_sample.response
        )

        correction = self.review_workflow.add_manual_correction(
            sample=original_sample,
            version=None,
            original_prompt=original_sample.prompt,
            corrected_prompt=corrected_prompt,
            original_response=original_sample.response,
            corrected_response=corrected_response,
            correction_note=correction_note,
            corrected_by=corrected_by,
        )

        if auto_create_version:
            self.review_workflow.create_new_version(
                sample=original_sample,
                new_prompt=new_prompt,
                new_response=new_response,
                created_by=corrected_by,
                change_reason=f"人工修正: {correction_note[:50]}",
            )

        if corrected_prompt:
            self._samples[sample_id] = original_sample.model_copy(
                update={"prompt": new_prompt}
            )
        if corrected_response:
            self._samples[sample_id] = self._samples[sample_id].model_copy(
                update={"response": new_response}
            )

        self._sample_status[sample_id] = SampleStatus.CORRECTED

        if auto_recheck:
            result = self.interceptor.check_sample(self._samples[sample_id])
            self._intercept_results[sample_id] = result
            if result.is_blocked:
                self._sample_status[sample_id] = SampleStatus.BLOCKED
            else:
                self._sample_status[sample_id] = SampleStatus.PASSED

        self._compute_group_metrics()
        return correction

    def approve_correction_and_apply(
        self,
        sample_id: str,
        correction_id: str,
        approved_by: str,
    ) -> bool:
        if sample_id not in self._samples:
            return False

        correction = None
        for corr in self.review_workflow.get_sample_corrections(sample_id):
            if corr.correction_id == correction_id:
                correction = corr
                break

        if not correction:
            return False

        self.review_workflow.approve_correction(correction_id, approved_by)

        original_sample = self._samples[sample_id]
        updated = False
        if correction.corrected_prompt:
            self._samples[sample_id] = original_sample.model_copy(
                update={"prompt": correction.corrected_prompt}
            )
            updated = True
        if correction.corrected_response:
            self._samples[sample_id] = self._samples[sample_id].model_copy(
                update={"response": correction.corrected_response}
            )
            updated = True

        if updated:
            result = self.interceptor.check_sample(self._samples[sample_id])
            self._intercept_results[sample_id] = result

            if result.is_blocked:
                self._sample_status[sample_id] = SampleStatus.BLOCKED
            else:
                self._sample_status[sample_id] = SampleStatus.PASSED

            self._compute_group_metrics()

        return True

    def get_sample(self, sample_id: str) -> Optional[Sample]:
        return self._samples.get(sample_id)

    def get_intercept_result(self, sample_id: str) -> Optional[InterceptResult]:
        return self._intercept_results.get(sample_id)

    def get_sample_status(self, sample_id: str) -> Optional[SampleStatus]:
        return self._sample_status.get(sample_id)

    def get_all_samples(self) -> List[Sample]:
        return list(self._samples.values())

    def get_group_metrics(self, group_id: Optional[str] = None) -> List[GroupMetrics]:
        if group_id:
            return [self._group_metrics[group_id]] if group_id in self._group_metrics else []
        return list(self._group_metrics.values())

    def get_blocked_samples(self) -> List[Tuple[Sample, InterceptResult]]:
        blocked = []
        for sample_id, status in self._sample_status.items():
            if status == SampleStatus.BLOCKED:
                sample = self._samples[sample_id]
                result = self._intercept_results[sample_id]
                blocked.append((sample, result))
        return blocked

    def get_passed_samples(self) -> List[Tuple[Sample, InterceptResult]]:
        passed = []
        for sample_id, status in self._sample_status.items():
            if status == SampleStatus.PASSED:
                sample = self._samples[sample_id]
                result = self._intercept_results[sample_id]
                passed.append((sample, result))
        return passed

    def generate_report(
        self,
        include_raw_data: bool = False,
        sample_ids: Optional[List[str]] = None,
    ) -> str:
        if sample_ids:
            samples = [self._samples[sid] for sid in sample_ids if sid in self._samples]
        else:
            samples = self.get_all_samples()

        group_metrics = self.get_group_metrics()

        review_records = {}
        corrections = {}
        versions = {}
        for sample in samples:
            sid = sample.sample_id
            review_records[sid] = self.review_workflow.get_sample_reviews(sid)
            corrections[sid] = self.review_workflow.get_sample_corrections(sid)
            versions[sid] = self.review_workflow.get_sample_versions(sid)

        return self.report_generator.generate_full_report(
            samples=samples,
            intercept_results=self._intercept_results,
            group_metrics=group_metrics,
            review_records=review_records,
            corrections=corrections,
            versions=versions,
            include_raw_data=include_raw_data,
        )

    def export_report(
        self,
        output_path: str,
        include_raw_data: bool = False,
        sample_ids: Optional[List[str]] = None,
    ) -> None:
        report = self.generate_report(
            include_raw_data=include_raw_data,
            sample_ids=sample_ids,
        )
        self.report_generator.export_report_to_file(report, output_path)

    def get_summary(self) -> Dict:
        total = len(self._samples)
        passed = sum(
            1 for s in self._sample_status.values() if s == SampleStatus.PASSED
        )
        blocked = sum(
            1 for s in self._sample_status.values() if s == SampleStatus.BLOCKED
        )
        needs_review = sum(
            1 for s in self._sample_status.values() if s == SampleStatus.NEEDS_REVIEW
        )
        corrected = sum(
            1 for s in self._sample_status.values() if s == SampleStatus.CORRECTED
        )

        top_reasons: Dict[str, int] = defaultdict(int)
        for result in self._intercept_results.values():
            for reason in result.intercept_reasons:
                top_reasons[reason.value] += 1

        return {
            "total_samples": total,
            "passed": passed,
            "blocked": blocked,
            "needs_review": needs_review,
            "corrected": corrected,
            "pass_rate": passed / total if total > 0 else 0,
            "block_rate": blocked / total if total > 0 else 0,
            "split_list_version": self.interceptor.get_split_list_version(),
            "split_list_size": len(self.config.train_test_split_list),
            "top_blocked_reasons": dict(top_reasons),
            "group_count": len(self._group_metrics),
        }
