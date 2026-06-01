import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from .models import (
    ScoreProject,
    Issue,
    IssueStatus,
    Correction,
    VersionHistory,
    IssueEvidence,
    Note,
    Accidental,
    Slur,
    Measure,
)


class CorrectionManager:
    def __init__(self, project: ScoreProject):
        self.project = project

    def apply_correction(
        self,
        issue_id: str,
        corrected_by: str,
        original_value: str,
        corrected_value: str,
        description: str,
        affects_other_issues: Optional[List[str]] = None,
    ) -> Correction:
        issue = self._find_issue(issue_id)
        if issue:
            issue.status = IssueStatus.RESOLVED
            issue.updated_at = datetime.now()

        correction = Correction(
            id=f"corr_{uuid.uuid4().hex[:8]}",
            issue_id=issue_id,
            corrected_by=corrected_by,
            corrected_at=datetime.now(),
            original_value=original_value,
            corrected_value=corrected_value,
            description=description,
            affects_other_issues=affects_other_issues or [],
        )

        if issue:
            issue.corrections.append(correction)

        self._update_version(
            f"修正问题: {description}",
            corrected_by,
            [f"问题ID: {issue_id}", f"从 '{original_value}' -> '{corrected_value}'"],
        )

        return correction

    def confirm_issue(self, issue_id: str, confirmed_by: str) -> Optional[Issue]:
        issue = self._find_issue(issue_id)
        if issue:
            issue.status = IssueStatus.CONFIRMED
            issue.updated_at = datetime.now()

            issue.evidence.append(
                IssueEvidence(
                    source="user_confirmation",
                    description="人工确认问题属实",
                    data={"confirmed_by": confirmed_by},
                )
            )

            self._update_version(
                f"确认问题: {issue.description}",
                confirmed_by,
                [f"问题ID: {issue_id}"],
            )

        return issue

    def dismiss_issue(self, issue_id: str, dismissed_by: str, reason: str) -> Optional[Issue]:
        issue = self._find_issue(issue_id)
        if issue:
            issue.status = IssueStatus.DISMISSED
            issue.updated_at = datetime.now()

            issue.evidence.append(
                IssueEvidence(
                    source="user_dismissal",
                    description=f"问题已驳回: {reason}",
                    data={"dismissed_by": dismissed_by, "reason": reason},
                )
            )

            self._update_version(
                f"驳回问题: {reason}",
                dismissed_by,
                [f"问题ID: {issue_id}"],
            )

        return issue

    def add_note_accidental(
        self,
        measure_id: str,
        note_id: str,
        accidental_type: str,
        added_by: str,
    ) -> Optional[Note]:
        measure = self._find_measure(measure_id)
        if not measure:
            return None

        note = self._find_note_in_measure(measure, note_id)
        if not note:
            return None

        original_accidental = note.accidental
        note.accidental = accidental_type

        self._update_version(
            f"为音符添加变音记号",
            added_by,
            [
                f"小节ID: {note_id}",
                f"变音记号: {accidental_type}",
            ],
        )

        return note

    def merge_slurs(
        self,
        measure_id: str,
        slur_ids: List[str],
        merged_by: str,
    ) -> Optional[Slur]:
        measure = self._find_measure(measure_id)
        if not measure:
            return None

        slurs = [s for s in measure.symbols if s.id in slur_ids]
        if len(slurs) < 2:
            return None

        merged = slurs[0]
        if len(slurs) > 1:
            last_slur = slurs[-1]
            merged.position.width = max(
                merged.position.width,
                last_slur.position.x + last_slur.position.width - merged.position.x
            )

        merged.is_complete = True
        merged.metadata["merged_from"] = [s.id for s in slurs[1:]]

        for s in slurs[1:]:
            measure.symbols.remove(s)

        self._update_version(
            "合并连音线",
            merged_by,
            [f"合并 {len(slurs)} 条连音线", f"结果ID: {merged.id}"],
        )

        return merged

    def fix_measure_numbering(
        self,
        start_measure: int,
        offset: int,
        fixed_by: str,
    ):
        for measure in self.project.measures:
            if measure.measure_number >= start_measure:
                measure.measure_number += offset

        self.project.measures.sort(key=lambda m: m.measure_number)

        for issue in self.project.issues:
            if issue.measure_number and issue.measure_number >= start_measure:
                issue.measure_number += offset

        self._update_version(
            "修正小节编号",
            fixed_by,
            [f"从第{start_measure}小节开始，偏移{offset}"],
        )

    def compare_versions(self, version_a: int, version_b: Optional[int] = None) -> Dict[str, Any]:
        if version_b is None:
            version_b = self.project.current_version

        changes = []
        for vh in self.project.version_history:
            if version_a < vh.version <= version_b:
                changes.append(vh)

        affected_issues = []
        for issue in self.project.issues:
            if issue.corrections:
                for corr in issue.corrections:
                    affected_issues.append({
                        "issue_id": issue.id,
                        "issue_description": issue.description,
                        "correction": corr,
                    })

        return {
            "from_version": version_a,
            "to_version": version_b,
            "version_changes": changes,
            "affected_issues": affected_issues,
        }

    def get_correction_impact(self, correction_id: str) -> Dict[str, Any]:
        for issue in self.project.issues:
            for corr in issue.corrections:
                if corr.id == correction_id:
                    return {
                        "correction": corr,
                        "source_issue": issue,
                        "affected_issues": [
                            ai for ai in self.project.issues if ai.id in corr.affects_other_issues
                        ],
                    }
        return {}

    def _find_issue(self, issue_id: str) -> Optional[Issue]:
        for issue in self.project.issues:
            if issue.id == issue_id:
                return issue
        return None

    def _find_measure(self, measure_id: str) -> Optional[Measure]:
        for measure in self.project.measures:
            if measure.id == measure_id:
                return measure
        return None

    def _find_note_in_measure(self, measure: Measure, note_id: str) -> Optional[Note]:
        for symbol in measure.symbols:
            if symbol.id == note_id:
                return symbol
        return None

    def _update_version(self, description: str, changed_by: str, changes: List[str]):
        self.project.current_version += 1
        self.project.updated_at = datetime.now()

        version_entry = VersionHistory(
            version=self.project.current_version,
            timestamp=datetime.now(),
            description=description,
            changed_by=changed_by,
            changes=changes,
        )
        self.project.version_history.append(version_entry)
