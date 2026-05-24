from typing import List, Dict, Any, Set, Tuple
from collections import defaultdict
from datetime import datetime
import hashlib

from .models import (
    ReimbursementRecord,
    RecordStatus,
    SourceType,
    Issue,
    IssueType,
    SourceEvidence
)
from .storage import AuditStorage


class AuditEngine:
    def __init__(self, storage: AuditStorage):
        self.storage = storage

    def check_all_records(self) -> Dict[str, Any]:
        records = self.storage.load_all_records()
        results = {
            "checked_count": 0,
            "flagged_count": 0,
            "issues_found": [],
            "duplicate_groups": [],
            "withdrawn_resubmitted": [],
            "partial_failures": []
        }

        self._check_duplicate_submissions(records, results)
        self._check_shared_trip_duplicates(records, results)
        self._check_withdrawn_resubmitted(records, results)
        self._check_amount_mismatch(records, results)
        self._check_date_mismatch(records, results)
        self._check_missing_evidences(records, results)

        for record in records:
            if not record.is_frozen:
                if any(not issue.resolved for issue in record.issues):
                    record.update_status(RecordStatus.FLAGGED, "audit_engine", "Issues detected")
                else:
                    record.update_status(RecordStatus.CHECKED, "audit_engine", "All checks passed")
                self.storage.save_record(record)
                results["checked_count"] += 1

        results["flagged_count"] = sum(
            1 for r in records if r.status == RecordStatus.FLAGGED
        )

        return results

    def check_single_record(self, record_id: str) -> Dict[str, Any]:
        record = self.storage.load_record(record_id)
        if not record:
            return {"error": "Record not found"}

        all_records = self.storage.load_all_records()
        results = {
            "record_id": record_id,
            "issues_found": [],
            "previous_issues": len([i for i in record.issues if not i.resolved])
        }

        record.issues = [i for i in record.issues if i.issue_type == IssueType.MANUAL_OVERRIDE]

        self._check_record_duplicates(record, all_records, results)
        self._check_record_shared_trip_duplicates(record, all_records, results)
        self._check_record_amount_mismatch(record, results)
        self._check_record_date_mismatch(record, results)
        self._check_record_missing_evidences(record, results)

        if not record.is_frozen:
            if any(not issue.resolved for issue in record.issues):
                record.update_status(RecordStatus.FLAGGED, "audit_engine", "Issues detected")
            else:
                record.update_status(RecordStatus.CHECKED, "audit_engine", "All checks passed")
            self.storage.save_record(record)

        results["new_issues"] = len([i for i in record.issues if not i.resolved])
        return results

    def _check_duplicate_submissions(self, records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        signature_groups = defaultdict(list)

        for record in records:
            sig = self._generate_duplicate_signature(record)
            signature_groups[sig].append(record)

        for sig, group in signature_groups.items():
            if len(group) > 1:
                sorted_group = sorted(group, key=lambda r: r.created_at)
                primary = sorted_group[0]
                duplicates = sorted_group[1:]

                evidence = {
                    "duplicate_signature": sig,
                    "primary_record": primary.record_id,
                    "matching_fields": self._explain_signature(sig)
                }

                for dup in duplicates:
                    issue = Issue(
                        issue_type=IssueType.DUPLICATE_SUBMISSION,
                        description=f"重复提交：与记录 {primary.record_id} 内容重复",
                        severity="high",
                        related_records=[primary.record_id],
                        evidence=evidence
                    )
                    dup.add_issue(issue)
                    results["issues_found"].append({
                        "record_id": dup.record_id,
                        "issue_type": IssueType.DUPLICATE_SUBMISSION.value,
                        "severity": "high"
                    })

                results["duplicate_groups"].append({
                    "signature": sig,
                    "primary": primary.record_id,
                    "duplicates": [r.record_id for r in duplicates],
                    "count": len(group)
                })

    def _check_shared_trip_duplicates(self, records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        trip_groups = defaultdict(list)
        for record in records:
            if record.shared_trip_id:
                trip_groups[record.shared_trip_id].append(record)

        for trip_id, trip_records in trip_groups.items():
            if len(trip_records) < 2:
                continue

            self._check_shared_accommodation_duplicates(trip_id, trip_records, results)
            self._check_shared_transportation_duplicates(trip_id, trip_records, results)

    def _check_shared_accommodation_duplicates(self, trip_id: str, trip_records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        accommodation_records = [
            r for r in trip_records
            if r.expense_type in ["住宿", "酒店", "hotel", "accommodation", "住宿费"]
        ]

        if len(accommodation_records) <= 1:
            return

        date_groups = defaultdict(list)
        for record in accommodation_records:
            date_key = self._normalize_date(record.expense_date)
            date_groups[date_key].append(record)

        for date, group in date_groups.items():
            if len(group) <= 1:
                continue

            total_amount = sum(r.amount for r in group)
            avg_amount = total_amount / len(group)

            for i, record in enumerate(group):
                other_records = [r.record_id for r in group if r.record_id != record.record_id]
                
                issue = Issue(
                    issue_type=IssueType.DUPLICATE_ACCOMMODATION,
                    description=f"共享行程住宿重复：{trip_id} 日期 {date} 多人报销同一住宿，总金额 {total_amount:.2f}，平均 {avg_amount:.2f}",
                    severity="medium",
                    related_records=other_records,
                    evidence={
                        "trip_id": trip_id,
                        "date": date,
                        "total_amount": total_amount,
                        "avg_amount": avg_amount,
                        "group_count": len(group)
                    }
                )
                record.add_issue(issue)
                results["issues_found"].append({
                    "record_id": record.record_id,
                    "issue_type": IssueType.DUPLICATE_ACCOMMODATION.value,
                    "severity": "medium"
                })

    def _check_shared_transportation_duplicates(self, trip_id: str, trip_records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        transport_records = [
            r for r in trip_records
            if r.expense_type in ["交通", "机票", "火车票", "高铁", "打车", "transportation", "flight", "train", "taxi"]
        ]

        if len(transport_records) <= 1:
            return

        route_groups = defaultdict(list)
        for record in transport_records:
            route_key = self._generate_route_key(record)
            route_groups[route_key].append(record)

        for route_key, group in route_groups.items():
            if len(group) <= 1:
                continue

            for i, record in enumerate(group):
                other_records = [r.record_id for r in group if r.record_id != record.record_id]
                
                issue = Issue(
                    issue_type=IssueType.DUPLICATE_TRANSPORTATION,
                    description=f"共享行程交通重复：{trip_id} 路线 {route_key} 多人报销相同交通",
                    severity="medium",
                    related_records=other_records,
                    evidence={
                        "trip_id": trip_id,
                        "route_key": route_key,
                        "group_count": len(group)
                    }
                )
                record.add_issue(issue)
                results["issues_found"].append({
                    "record_id": record.record_id,
                    "issue_type": IssueType.DUPLICATE_TRANSPORTATION.value,
                    "severity": "medium"
                })

    def _check_withdrawn_resubmitted(self, records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        parent_children = defaultdict(list)
        for record in records:
            if record.parent_record_id:
                parent_children[record.parent_record_id].append(record)

        for parent_id, children in parent_children.items():
            parent = next((r for r in records if r.record_id == parent_id), None)
            if not parent:
                continue

            if parent.status == RecordStatus.WITHDRAWN:
                for child in children:
                    child.resubmission_count = len(children)
                    
                    issue = Issue(
                        issue_type=IssueType.WITHDRAWN_RESUBMITTED,
                        description=f"撤回后重新提交：原记录 {parent_id} 已撤回，此为重新提交记录（第{child.resubmission_count}次）",
                        severity="low",
                        related_records=[parent_id],
                        evidence={
                            "parent_record": parent_id,
                            "parent_status": parent.status.value,
                            "resubmission_count": child.resubmission_count
                        }
                    )
                    child.add_issue(issue)
                    results["issues_found"].append({
                        "record_id": child.record_id,
                        "issue_type": IssueType.WITHDRAWN_RESUBMITTED.value,
                        "severity": "low"
                    })
                    results["withdrawn_resubmitted"].append({
                        "parent": parent_id,
                        "child": child.record_id,
                        "resubmission_count": child.resubmission_count
                    })

    def _check_amount_mismatch(self, records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        for record in records:
            self._check_record_amount_mismatch(record, results)

    def _check_record_amount_mismatch(self, record: ReimbursementRecord, results: Dict[str, Any]) -> None:
        if len(record.evidences) < 2:
            return

        amounts = {}
        for src_type, evidence in record.evidences.items():
            parsed = evidence.parsed_value
            if isinstance(parsed, dict) and "amount" in parsed:
                amounts[src_type.value] = float(parsed["amount"])

        if len(amounts) < 2:
            return

        values = list(amounts.values())
        if max(values) != min(values):
            issue = Issue(
                issue_type=IssueType.AMOUNT_MISMATCH,
                description=f"金额不一致：各来源金额不同 - {amounts}",
                severity="high",
                related_records=[],
                evidence={"source_amounts": amounts}
            )
            record.add_issue(issue)
            results["issues_found"].append({
                "record_id": record.record_id,
                "issue_type": IssueType.AMOUNT_MISMATCH.value,
                "severity": "high"
            })

    def _check_date_mismatch(self, records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        for record in records:
            self._check_record_date_mismatch(record, results)

    def _check_record_date_mismatch(self, record: ReimbursementRecord, results: Dict[str, Any]) -> None:
        if len(record.evidences) < 2:
            return

        dates = {}
        for src_type, evidence in record.evidences.items():
            parsed = evidence.parsed_value
            if isinstance(parsed, dict) and "expense_date" in parsed:
                dates[src_type.value] = self._normalize_date(parsed["expense_date"])

        if len(dates) < 2:
            return

        values = set(dates.values())
        if len(values) > 1:
            issue = Issue(
                issue_type=IssueType.DATE_MISMATCH,
                description=f"日期不一致：各来源日期不同 - {dates}",
                severity="medium",
                related_records=[],
                evidence={"source_dates": dates}
            )
            record.add_issue(issue)
            results["issues_found"].append({
                "record_id": record.record_id,
                "issue_type": IssueType.DATE_MISMATCH.value,
                "severity": "medium"
            })

    def _check_missing_evidences(self, records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        for record in records:
            self._check_record_missing_evidences(record, results)

    def _check_record_missing_evidences(self, record: ReimbursementRecord, results: Dict[str, Any]) -> None:
        required_sources = [SourceType.INVOICE_PDF]
        missing = [s for s in required_sources if s not in record.evidences]

        if missing:
            issue = Issue(
                issue_type=IssueType.MISSING_EVIDENCE,
                description=f"缺少证据：缺少 {[s.value for s in missing]}",
                severity="high",
                related_records=[],
                evidence={"missing_sources": [s.value for s in missing]}
            )
            record.add_issue(issue)
            results["issues_found"].append({
                "record_id": record.record_id,
                "issue_type": IssueType.MISSING_EVIDENCE.value,
                "severity": "high"
            })

    def _check_record_duplicates(self, record: ReimbursementRecord, all_records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        sig = self._generate_duplicate_signature(record)

        for other in all_records:
            if other.record_id == record.record_id:
                continue
            other_sig = self._generate_duplicate_signature(other)
            if sig == other_sig:
                issue = Issue(
                    issue_type=IssueType.DUPLICATE_SUBMISSION,
                    description=f"重复提交：与记录 {other.record_id} 内容重复",
                    severity="high",
                    related_records=[other.record_id],
                    evidence={
                        "duplicate_signature": sig,
                        "matching_fields": self._explain_signature(sig)
                    }
                )
                record.add_issue(issue)
                results["issues_found"].append({
                    "record_id": record.record_id,
                    "issue_type": IssueType.DUPLICATE_SUBMISSION.value,
                    "severity": "high"
                })
                break

    def _check_record_shared_trip_duplicates(self, record: ReimbursementRecord, all_records: List[ReimbursementRecord], results: Dict[str, Any]) -> None:
        if not record.shared_trip_id:
            return

        trip_records = [r for r in all_records if r.shared_trip_id == record.shared_trip_id]
        if len(trip_records) < 2:
            return

        if record.expense_type in ["住宿", "酒店", "hotel", "accommodation", "住宿费"]:
            same_date = [
                r for r in trip_records
                if r.record_id != record.record_id
                and r.expense_type in ["住宿", "酒店", "hotel", "accommodation", "住宿费"]
                and self._normalize_date(r.expense_date) == self._normalize_date(record.expense_date)
            ]
            if same_date:
                issue = Issue(
                    issue_type=IssueType.DUPLICATE_ACCOMMODATION,
                    description=f"共享行程住宿重复：{record.shared_trip_id} 日期 {self._normalize_date(record.expense_date)}",
                    severity="medium",
                    related_records=[r.record_id for r in same_date],
                    evidence={"trip_id": record.shared_trip_id}
                )
                record.add_issue(issue)
                results["issues_found"].append({
                    "record_id": record.record_id,
                    "issue_type": IssueType.DUPLICATE_ACCOMMODATION.value,
                    "severity": "medium"
                })

    def _generate_duplicate_signature(self, record: ReimbursementRecord) -> str:
        key_parts = [
            str(record.employee_id),
            str(record.expense_type),
            f"{record.amount:.2f}",
            self._normalize_date(record.expense_date)
        ]
        key = "|".join(key_parts)
        return hashlib.md5(key.encode()).hexdigest()[:12]

    def _explain_signature(self, sig: str) -> str:
        return "员工ID + 费用类型 + 金额 + 日期"

    def _generate_route_key(self, record: ReimbursementRecord) -> str:
        metadata = record.metadata or {}
        from_loc = metadata.get("from", metadata.get("出发地", ""))
        to_loc = metadata.get("to", metadata.get("目的地", ""))
        date = self._normalize_date(record.expense_date)
        return f"{from_loc}-{to_loc}-{date}"

    def _normalize_date(self, date_str: str) -> str:
        if not date_str:
            return ""
        date_str = str(date_str).strip()
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%Y-%m-%d %H:%M:%S"]:
            try:
                return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return date_str[:10]

    def get_failure_list(self) -> Dict[str, Any]:
        records = self.storage.load_all_records()
        failures = []

        for record in records:
            unresolved_issues = [i for i in record.issues if not i.resolved]
            if unresolved_issues:
                failure_info = {
                    "record_id": record.record_id,
                    "employee_name": record.employee_name,
                    "employee_id": record.employee_id,
                    "expense_type": record.expense_type,
                    "amount": record.amount,
                    "expense_date": record.expense_date,
                    "status": record.status.value,
                    "is_frozen": record.is_frozen,
                    "issues": []
                }

                for issue in unresolved_issues:
                    original_lines = {}
                    for src_type, evidence in record.evidences.items():
                        original_lines[src_type.value] = evidence.original_line

                    failure_info["issues"].append({
                        "type": issue.issue_type.value if hasattr(issue.issue_type, 'value') else issue.issue_type,
                        "description": issue.description,
                        "severity": issue.severity,
                        "original_lines": original_lines,
                        "source_files": {k.value: v.source_file for k, v in record.evidences.items()}
                    })

                failures.append(failure_info)

        return {
            "total_failures": len(failures),
            "by_severity": {
                "high": len([f for f in failures if any(i["severity"] == "high" for i in f["issues"])]),
                "medium": len([f for f in failures if any(i["severity"] == "medium" for i in f["issues"])]),
                "low": len([f for f in failures if any(i["severity"] == "low" for i in f["issues"])])
            },
            "failures": failures
        }

    def mark_issue_resolved(self, record_id: str, issue_index: int, operator: str, resolution: str) -> bool:
        record = self.storage.load_record(record_id)
        if not record or record.is_frozen:
            return False

        if 0 <= issue_index < len(record.issues):
            record.issues[issue_index].resolved = True
            record.issues[issue_index].resolution = resolution

            if all(issue.resolved for issue in record.issues):
                record.update_status(RecordStatus.FIXED, operator, f"All issues resolved: {resolution}")
            else:
                record.update_status(RecordStatus.PARTIAL_FAILURE, operator, f"Partial resolution: {resolution}")

            self.storage.save_record(record)
            return True

        return False

    def apply_manual_override(self, record_id: str, operator: str, reason: str, new_status: RecordStatus = RecordStatus.APPROVED) -> bool:
        record = self.storage.load_record(record_id)
        if not record or record.is_frozen:
            return False

        for issue in record.issues:
            if not issue.resolved:
                issue.resolved = True
                issue.resolution = f"Manual override: {reason}"

        issue = Issue(
            issue_type=IssueType.MANUAL_OVERRIDE,
            description=f"人工改判：{reason}",
            severity="info",
            related_records=[],
            evidence={"operator": operator, "reason": reason},
            resolved=True,
            resolution=reason
        )
        record.add_issue(issue)

        record.apply_manual_override(reason, operator, new_status)
        self.storage.save_record(record)
        return True

    def freeze_record(self, record_id: str, operator: str, reason: str) -> bool:
        record = self.storage.load_record(record_id)
        if not record:
            return False
        record.freeze(reason, operator)
        self.storage.save_record(record)
        return True

    def unfreeze_record(self, record_id: str, operator: str) -> bool:
        record = self.storage.load_record(record_id)
        if not record:
            return False
        record.unfreeze(operator)
        self.storage.save_record(record)
        return True
