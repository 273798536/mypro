import hashlib
from typing import List, Dict, Optional
from .models import TaxRecord, VerificationResult, BatchReport, ResultStatus, BoundaryFlag
from .ladder import TaxLadderEngine
from .constraints import ConstraintChecker


class BatchReviewer:
    def __init__(self, engine: Optional[TaxLadderEngine] = None):
        self.engine = engine or TaxLadderEngine()
        self.checker = ConstraintChecker(self.engine)

    @staticmethod
    def _fingerprint(record: TaxRecord) -> str:
        key = f"{record.income_amount:.2f}|{record.claimed_tax:.2f}|{record.taxpayer_name}|{record.tax_year}"
        return hashlib.md5(key.encode("utf-8")).hexdigest()

    def detect_duplicates(self, records: List[TaxRecord]) -> Dict[str, List[str]]:
        groups: Dict[str, List[str]] = {}
        for rec in records:
            fp = self._fingerprint(rec)
            groups.setdefault(fp, []).append(rec.record_id)
        return {fp: ids for fp, ids in groups.items() if len(ids) > 1}

    def verify_single(self, record: TaxRecord) -> VerificationResult:
        expected_tax, step, boundary = self.engine.verify_record(record)
        tax_diff = round(record.claimed_tax - expected_tax, 2)
        violations = self.checker.check(record, expected_tax)
        status, explanation = self.checker.determine_status(record, tax_diff, violations, boundary)
        return VerificationResult(
            record=record,
            status=status,
            boundary_flag=boundary,
            expected_tax=expected_tax,
            claimed_tax=record.claimed_tax,
            tax_diff=tax_diff,
            matched_step=step,
            constraint_violations=violations,
            explanation=explanation,
        )

    def review_batch(self, records: List[TaxRecord]) -> BatchReport:
        report = BatchReport(total_records=len(records))
        if not records:
            report.explanation = "输入数据为空集合，本次核验无可处理记录"
            return report
        dup_groups = self.detect_duplicates(records)
        dup_id_to_primary: Dict[str, str] = {}
        for ids in dup_groups.values():
            primary = ids[0]
            for rid in ids[1:]:
                dup_id_to_primary[rid] = primary
        for rec in records:
            result = self.verify_single(rec)
            if rec.record_id in dup_id_to_primary:
                result.is_duplicate = True
                result.duplicate_of = dup_id_to_primary[rec.record_id]
                if result.status == ResultStatus.USABLE:
                    result.status = ResultStatus.PENDING
                    result.explanation += f"；重复样本(与{result.duplicate_of}指纹相同)，需人工复核确认"
            report.results.append(result)
        self._fill_summary(report)
        return report

    @staticmethod
    def _fill_summary(report: BatchReport) -> None:
        for r in report.results:
            if r.status == ResultStatus.USABLE:
                report.usable_count += 1
            elif r.status == ResultStatus.PENDING:
                report.pending_count += 1
            elif r.status == ResultStatus.NEED_RECOLLECT:
                report.need_recollect_count += 1
            elif r.status == ResultStatus.NEED_REVIEW:
                report.need_review_count += 1
            if r.is_duplicate:
                report.duplicate_count += 1
            if r.boundary_flag in (
                BoundaryFlag.LOWER_BOUNDARY,
                BoundaryFlag.UPPER_BOUNDARY,
                BoundaryFlag.ACROSS_BOUNDARY,
            ):
                report.boundary_count += 1
        accurate = sum(1 for r in report.results if r.is_accurate)
        report.accuracy_rate = accurate / report.total_records if report.total_records > 0 else 0.0
