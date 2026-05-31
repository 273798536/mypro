from __future__ import annotations

from datetime import datetime
from typing import Optional

from models import (
    CaseStatus,
    DeptSummary,
    DischargeCase,
    DRGGroup,
    NoteChange,
    WarningReport,
    WarningStatus,
    WarningType,
)


class DRGEngine:
    def __init__(
        self,
        cases: dict[str, DischargeCase],
        groups: dict[str, DRGGroup],
        warnings: dict[str, WarningReport],
    ):
        self.cases = cases
        self.groups = groups
        self.warnings = warnings

    def calculate_diff(self, case: DischargeCase) -> Optional[float]:
        group = self.groups.get(case.drg_group_code)
        if group is None:
            return None
        standard = case.standard_cost if case.standard_cost is not None else group.standard_cost
        if case.actual_reimbursement is None:
            return None
        return standard - case.actual_reimbursement

    def generate_warnings_for_case(self, case: DischargeCase) -> list[WarningReport]:
        reports: list[WarningReport] = []
        diff = self.calculate_diff(case)
        group = self.groups.get(case.drg_group_code)

        if diff is not None and diff < 0:
            rid = f"W-{case.case_id}-overrun"
            reports.append(
                WarningReport(
                    report_id=rid,
                    case_id=case.case_id,
                    warning_type=WarningType.COST_OVERRUN,
                    diff_amount=round(diff, 2),
                    dept_code=case.dept_code,
                    dept_name=case.dept_name,
                    drg_group_code=case.drg_group_code,
                    drg_group_name=case.drg_group_name,
                    is_group_changed=case.original_drg_group_code is not None,
                    original_group_code=case.original_drg_group_code,
                )
            )

        if case.original_drg_group_code is not None and case.original_drg_group_code != case.drg_group_code:
            rid = f"W-{case.case_id}-misclass"
            reports.append(
                WarningReport(
                    report_id=rid,
                    case_id=case.case_id,
                    warning_type=WarningType.GROUP_MISCLASSIFICATION,
                    diff_amount=round(diff, 2) if diff else 0.0,
                    dept_code=case.dept_code,
                    dept_name=case.dept_name,
                    drg_group_code=case.drg_group_code,
                    drg_group_name=case.drg_group_name,
                    is_group_changed=True,
                    original_group_code=case.original_drg_group_code,
                )
            )

        missing_keys = [k for k, v in case.cost_items.items() if v is None]
        if missing_keys or case.status == CaseStatus.MISSING_FIELDS:
            rid = f"W-{case.case_id}-missing"
            reports.append(
                WarningReport(
                    report_id=rid,
                    case_id=case.case_id,
                    warning_type=WarningType.MISSING_COST_ITEM,
                    diff_amount=round(diff, 2) if diff else 0.0,
                    dept_code=case.dept_code,
                    dept_name=case.dept_name,
                    drg_group_code=case.drg_group_code,
                    drg_group_name=case.drg_group_name,
                    is_group_changed=case.original_drg_group_code is not None,
                    original_group_code=case.original_drg_group_code,
                    note=f"缺项字段: {', '.join(missing_keys) if missing_keys else '见病例备注'}",
                )
            )

        return reports

    def reclassify_case(self, case_id: str, new_group_code: str, reason: str) -> Optional[DischargeCase]:
        case = self.cases.get(case_id)
        if case is None:
            return None
        new_group = self.groups.get(new_group_code)
        if new_group is None:
            return None

        if case.original_drg_group_code is None:
            case.original_drg_group_code = case.drg_group_code

        old_group_code = case.drg_group_code
        old_group_name = case.drg_group_name

        case.drg_group_code = new_group_code
        case.drg_group_name = new_group.group_name
        case.standard_cost = new_group.standard_cost
        case.updated_at = datetime.now()

        for rid in list(self.warnings.keys()):
            w = self.warnings[rid]
            if w.case_id == case_id:
                self.warnings.pop(rid)

        new_warnings = self.generate_warnings_for_case(case)
        for w in new_warnings:
            w.note = (f"病组从 {old_group_code}({old_group_name}) 重算为 {new_group_code}({new_group.group_name})。"
                      f"原因: {reason}。" + (f" {w.note}" if w.note else "")).strip()
            self.warnings[w.report_id] = w

        return case

    def get_dept_summaries(self) -> list[DeptSummary]:
        dept_map: dict[str, DeptSummary] = {}

        for case in self.cases.values():
            dc = case.dept_code
            if dc not in dept_map:
                dept_map[dc] = DeptSummary(
                    dept_code=dc,
                    dept_name=case.dept_name,
                    total_cases=0,
                    total_diff_amount=0.0,
                    active_warnings=0,
                    resolved_warnings=0,
                )
            s = dept_map[dc]
            s.total_cases += 1
            diff = self.calculate_diff(case)
            if diff is not None:
                s.total_diff_amount += diff
            if case.original_drg_group_code is not None:
                s.group_change_count += 1
            missing_keys = [k for k, v in case.cost_items.items() if v is None]
            if missing_keys or case.status == CaseStatus.MISSING_FIELDS:
                s.missing_cost_item_count += 1

        for w in self.warnings.values():
            dc = w.dept_code
            if dc in dept_map:
                if w.status == WarningStatus.ACTIVE:
                    dept_map[dc].active_warnings += 1
                elif w.status == WarningStatus.RESOLVED:
                    dept_map[dc].resolved_warnings += 1

        for s in dept_map.values():
            s.total_diff_amount = round(s.total_diff_amount, 2)

        return list(dept_map.values())

    def refresh_all_warnings(self) -> int:
        self.warnings.clear()
        count = 0
        for case in self.cases.values():
            new_warnings = self.generate_warnings_for_case(case)
            for w in new_warnings:
                self.warnings[w.report_id] = w
                count += 1
        return count
