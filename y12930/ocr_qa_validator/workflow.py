"""校验工作流 - 串联所有模块的主工作流"""

from typing import List, Dict, Optional
from pathlib import Path

from .config import load_config, ensure_dirs
from .storage import SampleStore, AnnotationStore, VersionStore, ValidationResultStore
from .models import Sample, ValidationResult, SourceTrace
from .safety_filter import SafetyFilter
from .version_tracker import VersionTracker
from .metrics import MetricsCalculator
from .report import ReportExporter
from .correction import CorrectionWorkflow


class ValidationWorkflow:
    """OCR 文档问答校验主工作流 - 串起样本、版本、安全校验、人工修正、报告导出"""

    def __init__(self, config_path: str = None):
        self.config = load_config(config_path)
        ensure_dirs(self.config)

        paths = self.config["paths"]

        self.sample_store = SampleStore(paths["samples_dir"])
        self.annotation_store = AnnotationStore(paths["annotations_dir"])
        self.version_store = VersionStore(paths["versions_dir"])
        self.result_store = ValidationResultStore(paths["reports_dir"])

        self.safety_filter = SafetyFilter(self.config.get("safety_filter", {}))
        self.version_tracker = VersionTracker(self.sample_store, self.version_store)
        self.metrics_calculator = MetricsCalculator(
            self.config.get("metrics", {}).get("group_by", [])
        )
        self.report_exporter = ReportExporter(self.config)
        self.correction = CorrectionWorkflow(self.annotation_store, self.sample_store)

    def add_sample(
        self,
        question: str,
        answer: str,
        context: str = "",
        confidence: float = 1.0,
        data_type: str = "general",
        difficulty: str = "medium",
        source_file: str = "",
        source_row: Optional[int] = None,
        image_name: str = "",
        source_note: str = "",
        version: str = "v1",
    ) -> Sample:
        """添加一条样本"""
        sample = Sample(
            question=question,
            answer=answer,
            context=context,
            confidence=confidence,
            data_type=data_type,
            difficulty=difficulty,
            source_trace=SourceTrace(
                source_file=source_file,
                source_row=source_row,
                image_name=image_name,
                source_note=source_note,
            ),
            version=version,
        )
        self.sample_store.save(sample)
        return sample

    def validate_sample(self, sample: Sample) -> ValidationResult:
        """校验单条样本

        综合安全检查结果和标注状态，给出最终校验状态。
        """
        safety_result = self.safety_filter.check(sample)

        latest_annotation = self.correction.get_latest_annotation(sample.sample_id)

        result = ValidationResult(
            sample_id=sample.sample_id,
            sample_version=sample.version,
            safety_check=safety_result,
            annotation=latest_annotation,
        )

        if not safety_result.passed:
            if safety_result.risk_level == "high":
                result.validation_status = ValidationResult.STATUS_BLOCKED
            else:
                result.validation_status = ValidationResult.STATUS_NEEDS_REVIEW
        else:
            if latest_annotation and latest_annotation.status == "pending":
                result.validation_status = ValidationResult.STATUS_NEEDS_REVIEW
            elif latest_annotation and latest_annotation.status in ("rejected", "needs_review"):
                result.validation_status = ValidationResult.STATUS_NEEDS_REVIEW
            else:
                result.validation_status = ValidationResult.STATUS_PASSED

        self.result_store.save(result)
        return result

    def validate_all(self) -> List[ValidationResult]:
        """校验所有样本"""
        samples = self.sample_store.list_all()
        results = []
        for sample in samples:
            result = self.validate_sample(sample)
            results.append(result)
        return results

    def validate_version(self, version_name: str) -> List[ValidationResult]:
        """校验指定版本的所有样本"""
        samples = self.version_tracker.get_version_samples(version_name)
        results = []
        for sample in samples:
            result = self.validate_sample(sample)
            results.append(result)
        return results

    def run_full_pipeline(self, version_name: str = None) -> dict:
        """运行完整校验流水线

        1. 获取版本样本
        2. 执行安全校验
        3. 计算指标
        4. 检测偏科
        5. 导出报告

        Returns:
            包含所有结果的汇总字典
        """
        if version_name is None:
            version_name = self.version_tracker.get_latest_version()
            if version_name is None:
                version_name = "v1"

        samples = self.version_tracker.get_version_samples(version_name)
        if not samples:
            samples = self.sample_store.list_all()

        results = [self.validate_sample(s) for s in samples]

        overall = self.metrics_calculator.calculate_overall(results)
        grouped_stats = self.metrics_calculator.calculate_grouped(samples, results)
        biases = self.metrics_calculator.detect_bias(grouped_stats)

        report_path = self.report_exporter.export(
            version_name=version_name,
            samples=samples,
            results=results,
            overall_metrics=overall,
            grouped_stats=grouped_stats,
            biases=biases,
            output_dir=self.config["paths"]["reports_dir"],
        )

        return {
            "version": version_name,
            "sample_count": len(samples),
            "overall": overall,
            "grouped_stats": {k: v.to_dict(orient="records") for k, v in grouped_stats.items()},
            "biases": biases,
            "report_path": report_path,
            "results": [r.to_dict() for r in results],
        }

    def get_status_summary(self) -> dict:
        """获取整体状态摘要"""
        samples = self.sample_store.list_all()
        results = [self.result_store.load(s.sample_id) for s in samples]
        results = [r for r in results if r is not None]

        status_counts = {}
        for r in results:
            status_counts[r.validation_status] = status_counts.get(r.validation_status, 0) + 1

        return {
            "total_samples": len(samples),
            "validated_count": len(results),
            "status_counts": status_counts,
            "versions": self.version_tracker.list_versions(),
            "annotation_summary": self.correction.summary(),
        }
