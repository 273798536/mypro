import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import (
    ScoreProject,
    Measure,
    Note,
    Accidental,
    Slur,
    Issue,
    IssueCategory,
    IssueSeverity,
    IssueStatus,
    IssueEvidence,
    SymbolType,
    AccidentalType,
    NotePitch,
    BoundingBox,
)


class ScoreChecker:
    def __init__(self, project: ScoreProject):
        self.project = project
        self._existing_issue_keys = set()

    def run_all_checks(self) -> List[Issue]:
        new_issues: List[Issue] = []

        new_issues.extend(self.check_accidental_missing())
        new_issues.extend(self.check_slur_broken())
        new_issues.extend(self.check_barline_misaligned())

        self._deduplicate_and_merge_issues(new_issues)
        return self.project.issues

    def _get_issue_key(self, category: IssueCategory, location_key: str) -> str:
        return f"{category.value}_{location_key}"

    def _deduplicate_and_merge_issues(self, new_issues: List[Issue]):
        for new_issue in new_issues:
            key = self._get_issue_key(
                new_issue.category,
                f"{new_issue.measure_id}_{'_'.join(new_issue.symbol_ids)}"
            )

            if key in self._existing_issue_keys:
                continue

            self._existing_issue_keys.add(key)
            self.project.issues.append(new_issue)

    def check_accidental_missing(self) -> List[Issue]:
        issues: List[Issue] = []

        for measure in self.project.measures:
            notes = [s for s in measure.symbols if isinstance(s, Note)]
            accidentals = [s for s in measure.symbols if isinstance(s, Accidental)]

            expected_accidentals = self._analyze_key_signature_context(measure)
            issues.extend(self._find_missing_accidentals(measure, notes, accidentals, expected_accidentals))
            issues.extend(self._find_misread_accidentals(measure, notes, accidentals))

        return issues

    def _analyze_key_signature_context(self, measure: Measure) -> Dict[Tuple[NotePitch, int], List[str]]:
        expected: Dict[Tuple[NotePitch, int], List[str]] = defaultdict(list)

        key_sig = measure.key_signature or self._guess_key_signature()
        if key_sig:
            sharps = ["F", "C", "G", "D", "A", "E", "B"]
            flats = ["B", "E", "A", "D", "G", "C", "F"]

            if "#" in key_sig:
                count = int(key_sig.replace("#", "")) if key_sig.replace("#", "").isdigit() else 1
                for note_name in sharps[:count]:
                    for octave in range(3, 7):
                        expected[(NotePitch(note_name), octave)].append(
                            f"调号{key_sig}要求{note_name}升半音"
                        )
            elif "b" in key_sig:
                count = int(key_sig.replace("b", "")) if key_sig.replace("b", "").isdigit() else 1
                for note_name in flats[:count]:
                    for octave in range(3, 7):
                        expected[(NotePitch(note_name), octave)].append(
                            f"调号{key_sig}要求{note_name}降半音"
                        )

        return expected

    def _guess_key_signature(self) -> Optional[str]:
        all_accidentals: List[Accidental] = []
        for measure in self.project.measures:
            all_accidentals.extend([s for s in measure.symbols if isinstance(s, Accidental)])

        if not all_accidentals:
            return None

        sharp_count = sum(1 for a in all_accidentals if a.accidental_type == AccidentalType.SHARP)
        flat_count = sum(1 for a in all_accidentals if a.accidental_type == AccidentalType.FLAT)

        if sharp_count > flat_count and sharp_count >= 3:
            return f"{min(sharp_count, 7)}#"
        elif flat_count > sharp_count and flat_count >= 3:
            return f"{min(flat_count, 7)}b"
        return None

    def _find_missing_accidentals(
        self,
        measure: Measure,
        notes: List[Note],
        accidentals: List[Accidental],
        expected: Dict[Tuple[NotePitch, int], List[str]],
    ) -> List[Issue]:
        issues: List[Issue] = []

        for note in notes:
            key = (note.pitch, note.octave)
            if key not in expected:
                continue

            if note.accidental is not None:
                continue

            has_nearby_accidental = self._has_accidental_near_note(note, accidentals)
            if has_nearby_accidental:
                continue

            issue = self._create_accidental_missing_issue(measure, note, expected[key])
            issues.append(issue)

        return issues

    def _has_accidental_near_note(self, note: Note, accidentals: List[Accidental]) -> bool:
        for acc in accidentals:
            dx = abs(acc.position.x - note.position.x)
            dy = abs(acc.position.y - note.position.y)
            if dx < note.position.width * 2 and dy < note.position.height:
                return True
        return False

    def _create_accidental_missing_issue(
        self, measure: Measure, note: Note, reasons: List[str]
    ) -> Issue:
        issue_id = f"issue_acc_{uuid.uuid4().hex[:8]}"

        evidence = [
            IssueEvidence(
                source="key_signature_analysis",
                description="调号分析",
                data={"reasons": reasons},
            ),
            IssueEvidence(
                source="note_analysis",
                description="音符检测",
                data={
                    "note_pitch": note.pitch.value,
                    "octave": note.octave,
                    "has_accidental": note.accidental is not None,
                    "confidence": note.confidence,
                },
            ),
        ]

        suggestions = [
            "检查该音符在原谱照片中的位置，确认是否有升降号",
            "根据调号判断是否需要补充升降号",
            "查看前后音符是否有类似变音记号",
            "如确认需要添加，请在修正时注明升降号类型",
        ]

        return Issue(
            id=issue_id,
            category=IssueCategory.ACCIDENTAL_MISSING,
            severity=IssueSeverity.ERROR,
            status=IssueStatus.PENDING,
            description=f"第{measure.measure_number}小节 {note.pitch}{note.octave} 音符可能缺失升降号",
            location=note.position,
            measure_id=measure.id,
            measure_number=measure.measure_number,
            symbol_ids=[note.id],
            evidence=evidence,
            suggestions=suggestions,
            metadata={
                "note_pitch": note.pitch.value,
                "octave": note.octave,
                "expected_reasons": reasons,
            },
        )

    def _find_misread_accidentals(
        self,
        measure: Measure,
        notes: List[Note],
        accidentals: List[Accidental],
    ) -> List[Issue]:
        issues: List[Issue] = []

        for acc in accidentals:
            if acc.confidence < 0.7:
                issue = self._create_accidental_misread_issue(measure, acc)
                issues.append(issue)

        return issues

    def _create_accidental_misread_issue(self, measure: Measure, acc: Accidental) -> Issue:
        issue_id = f"issue_acc_mis_{uuid.uuid4().hex[:8]}"

        evidence = [
            IssueEvidence(
                source="ocr_confidence",
                description="OCR可信度低",
                data={"confidence": acc.confidence, "threshold": 0.7},
            ),
        ]

        suggestions = [
            f"对照原谱照片确认该位置的变音记号类型",
            f"当前识别为{acc.accidental_type.value}，请核对是否正确",
            "检查是否为印刷模糊或拍摄角度导致的识别错误",
        ]

        return Issue(
            id=issue_id,
            category=IssueCategory.ACCIDENTAL_MISREAD,
            severity=IssueSeverity.WARNING,
            status=IssueStatus.PENDING,
            description=f"第{measure.measure_number}小节 {acc.accidental_type.value} 识别可信度低（{acc.confidence:.2f}）",
            location=acc.position,
            measure_id=measure.id,
            measure_number=measure.measure_number,
            symbol_ids=[acc.id],
            evidence=evidence,
            suggestions=suggestions,
            metadata={"accidental_type": acc.accidental_type.value, "confidence": acc.confidence},
        )

    def check_slur_broken(self) -> List[Issue]:
        issues: List[Issue] = []

        for measure in self.project.measures:
            slurs = [s for s in measure.symbols if isinstance(s, Slur)]

            for slur in slurs:
                if not slur.is_complete:
                    issue = self._create_broken_slur_issue(measure, slur, "连音线标记为不完整")
                    issues.append(issue)
                elif not slur.start_note_id or not slur.end_note_id:
                    issue = self._create_broken_slur_issue(measure, slur, "连音线缺少起点或终点音符关联")
                    issues.append(issue)

            issues.extend(self._check_fragmented_slurs(measure, slurs))

        return issues

    def _create_broken_slur_issue(self, measure: Measure, slur: Slur, reason: str) -> Issue:
        issue_id = f"issue_slur_{uuid.uuid4().hex[:8]}"

        evidence = [
            IssueEvidence(
                source="slur_analysis",
                description=reason,
                data={
                    "is_complete": slur.is_complete,
                    "has_start": slur.start_note_id is not None,
                    "has_end": slur.end_note_id is not None,
                },
            ),
        ]

        suggestions = [
            "在原谱照片中追踪连音线的完整路径",
            "确认连音线连接的起始和结束音符",
            "检查是否因换行导致连音线断裂",
            "如为延音线，请确认两个音符音高是否相同",
        ]

        return Issue(
            id=issue_id,
            category=IssueCategory.SLUR_BROKEN,
            severity=IssueSeverity.WARNING,
            status=IssueStatus.PENDING,
            description=f"第{measure.measure_number}小节连音线可能断裂: {reason}",
            location=slur.position,
            measure_id=measure.id,
            measure_number=measure.measure_number,
            symbol_ids=[slur.id],
            evidence=evidence,
            suggestions=suggestions,
            metadata={"slur_id": slur.id},
        )

    def _check_fragmented_slurs(self, measure: Measure, slurs: List[Slur]) -> List[Issue]:
        issues: List[Issue] = []

        if len(slurs) < 2:
            return issues

        for i, slur1 in enumerate(slurs):
            for j, slur2 in enumerate(slurs):
                if i >= j:
                    continue

                if self._slurs_are_adjacent(slur1, slur2):
                    issue_id = f"issue_slur_frag_{uuid.uuid4().hex[:8]}"

                    evidence = [
                        IssueEvidence(
                            source="slur_proximity",
                            description="两个连音线片段位置接近，可能是断裂的同一连音线",
                            data={
                                "slur1_id": slur1.id,
                                "slur2_id": slur2.id,
                                "distance_x": abs(slur1.position.x - slur2.position.x),
                                "distance_y": abs(slur1.position.y - slur2.position.y),
                            },
                        ),
                    ]

                    suggestions = [
                        "检查这两个连音线片段是否属于同一连音线",
                        "在原谱中确认连音线的完整形状",
                        "如果是同一连音线，请在修正时合并",
                    ]

                    issue = Issue(
                        id=issue_id,
                        category=IssueCategory.SLUR_BROKEN,
                        severity=IssueSeverity.WARNING,
                        status=IssueStatus.PENDING,
                        description=f"第{measure.measure_number}小节检测到可能断裂的连音线片段",
                        location=slur1.position,
                        measure_id=measure.id,
                        measure_number=measure.measure_number,
                        symbol_ids=[slur1.id, slur2.id],
                        evidence=evidence,
                        suggestions=suggestions,
                        metadata={"slur_ids": [slur1.id, slur2.id]},
                    )
                    issues.append(issue)

        return issues

    def _slurs_are_adjacent(self, slur1: Slur, slur2: Slur) -> bool:
        max_distance = max(slur1.position.width, slur2.position.width) * 0.5
        dx = abs(slur1.position.x - slur2.position.x)
        dy = abs(slur1.position.y - slur2.position.y)
        return dx < max_distance and dy < slur1.position.height * 1.5

    def check_barline_misaligned(self) -> List[Issue]:
        issues: List[Issue] = []

        if len(self.project.measures) < 2:
            return issues

        reference_y = None
        reference_height = None

        for measure in sorted(self.project.measures, key=lambda m: m.measure_number):
            if not measure.position:
                continue

            if reference_y is None:
                reference_y = measure.position.y
                reference_height = measure.position.height
                continue

            y_diff = abs(measure.position.y - reference_y)
            height_diff = abs(measure.position.height - reference_height) if reference_height else 0

            threshold_y = (reference_height or measure.position.height) * 0.3
            threshold_height = (reference_height or measure.position.height) * 0.2

            if y_diff > threshold_y or height_diff > threshold_height:
                issue = self._create_misaligned_barline_issue(
                    measure, y_diff, height_diff, threshold_y, threshold_height
                )
                issues.append(issue)

            reference_y = measure.position.y
            reference_height = measure.position.height

        issues.extend(self._check_measure_sequence_gaps())

        return issues

    def _create_misaligned_barline_issue(
        self,
        measure: Measure,
        y_diff: float,
        height_diff: float,
        threshold_y: float,
        threshold_height: float,
    ) -> Issue:
        issue_id = f"issue_bar_{uuid.uuid4().hex[:8]}"

        reasons = []
        if y_diff > threshold_y:
            reasons.append(f"垂直位置偏差过大: {y_diff:.1f}px > {threshold_y:.1f}px")
        if height_diff > threshold_height:
            reasons.append(f"高度差异过大: {height_diff:.1f}px > {threshold_height:.1f}px")

        evidence = [
            IssueEvidence(
                source="barline_alignment",
                description="小节线对齐异常",
                data={
                    "y_difference": y_diff,
                    "height_difference": height_diff,
                    "y_threshold": threshold_y,
                    "height_threshold": threshold_height,
                    "reasons": reasons,
                },
            ),
        ]

        suggestions = [
            "检查原谱照片中该小节的位置是否正确",
            "确认小节线是否因拍摄角度或透视变形导致错位",
            "检查前后小节的边界位置",
            "如小节编号有误，请重新调整小节划分",
        ]

        return Issue(
            id=issue_id,
            category=IssueCategory.BARLINE_MISALIGNED,
            severity=IssueSeverity.WARNING,
            status=IssueStatus.PENDING,
            description=f"第{measure.measure_number}小节位置可能错位: {'; '.join(reasons)}",
            location=measure.position,
            measure_id=measure.id,
            measure_number=measure.measure_number,
            symbol_ids=[],
            evidence=evidence,
            suggestions=suggestions,
            metadata={
                "y_difference": y_diff,
                "height_difference": height_diff,
            },
        )

    def _check_measure_sequence_gaps(self) -> List[Issue]:
        issues: List[Issue] = []
        measure_numbers = sorted(m.measure_number for m in self.project.measures)

        for i in range(len(measure_numbers) - 1):
            expected = measure_numbers[i] + 1
            actual = measure_numbers[i + 1]
            if actual != expected:
                missing = list(range(expected, actual))

                issue_id = f"issue_bar_gap_{uuid.uuid4().hex[:8]}"

                evidence = [
                    IssueEvidence(
                        source="measure_sequence",
                        description=f"小节编号不连续: 第{measure_numbers[i]}小节后直接是第{actual}小节",
                        data={"missing_measures": missing},
                    ),
                ]

                suggestions = [
                    f"检查是否遗漏了第{missing}小节",
                    "确认小节编号是否正确",
                    "查看原谱照片中是否有被漏掉的小节",
                ]

                for measure in self.project.measures:
                    if measure.measure_number == measure_numbers[i]:
                        ref_measure = measure
                        break
                else:
                    ref_measure = self.project.measures[0]

                issue = Issue(
                    id=issue_id,
                    category=IssueCategory.BARLINE_MISALIGNED,
                    severity=IssueSeverity.ERROR,
                    status=IssueStatus.PENDING,
                    description=f"小节编号不连续: 缺少第{missing}小节",
                    location=ref_measure.position,
                    measure_id=ref_measure.id,
                    measure_number=ref_measure.measure_number,
                    symbol_ids=[],
                    evidence=evidence,
                    suggestions=suggestions,
                    metadata={"missing_measures": missing},
                )
                issues.append(issue)

        return issues
