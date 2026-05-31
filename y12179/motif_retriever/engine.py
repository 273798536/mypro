from __future__ import annotations

from typing import Any, Optional

from .audit import AuditLog
from .importer import MotifImporter
from .matcher import MotifMatcher
from .models import MatchResult, Motif, VariationEvidence, VariationType
from .report import ReportGenerator
from .suggestions import SuggestionGenerator
from .variation import VariationDetector


class RetrievalEngine:
    def __init__(self) -> None:
        self.audit_log = AuditLog()
        self.importer = MotifImporter(self.audit_log)
        self.matcher = MotifMatcher()
        self.variation_detector = VariationDetector()
        self.suggestion_gen = SuggestionGenerator()
        self.report_gen = ReportGenerator()

    def load_samples(self, *paths: str) -> None:
        for path in paths:
            self.importer.import_from_file(path)

    def add_motif(self, motif: Motif) -> None:
        self.importer.motifs.append(motif)
        self.audit_log.log(
            action="add_motif",
            target_type="Motif",
            target_id=motif.id,
            after={"name": motif.name, "note_count": len(motif.notes), "missing_fields": motif.missing_fields},
            detail=f"添加动机 {motif.id}，缺失字段: {motif.missing_fields or '无'}",
        )

    def search(self, query_motif_id: str) -> list[MatchResult]:
        query = self._find_motif(query_motif_id)
        if query is None:
            raise ValueError(f"查询动机不存在: {query_motif_id}")

        results: list[MatchResult] = []
        for candidate in self.importer.motifs:
            if candidate.id == query_motif_id:
                continue

            match = self.matcher.match(query, candidate)

            transposition_ev = self.variation_detector.detect(query, candidate)
            has_transposition = transposition_ev is not None and transposition_ev.variation_type == VariationType.TRANSPOSITION

            rhythm_misalign_ev = self.variation_detector.check_rhythm_stretch_with_misalign(query, candidate)
            has_rhythm_misalign = rhythm_misalign_ev is not None and rhythm_misalign_ev.variation_type not in (
                VariationType.EXACT, VariationType.NO_MATCH,
            )

            if has_transposition and has_rhythm_misalign:
                combined_type, combined_ev = self._combine_transposition_with_other(
                    transposition_ev, rhythm_misalign_ev
                )
                match.variation_type = combined_type
                match.evidence = combined_ev
            elif has_transposition:
                match.evidence = transposition_ev
                match.variation_type = transposition_ev.variation_type
            elif has_rhythm_misalign:
                match.variation_type = rhythm_misalign_ev.variation_type
                match.evidence = rhythm_misalign_ev

            suggestions = self.suggestion_gen.generate(match, query, candidate)
            match.suggestions = suggestions

            if match.variation_type != VariationType.NO_MATCH:
                frag_id = candidate.metadata.get("source_fragment", candidate.id)
                ann = self.audit_log.create_annotation(
                    fragment_id=frag_id,
                    motif_id=candidate.id,
                    variation_type=match.variation_type,
                    evidence=match.evidence,
                )
                match.annotation_id = ann.id

            results.append(match)

        self.audit_log.log(
            action="search",
            target_type="Motif",
            target_id=query_motif_id,
            after={"match_count": len(results)},
            detail=f"检索动机 {query_motif_id}，找到 {len(results)} 条匹配",
        )

        return results

    def re_evaluate(self, match: MatchResult, query: Motif, candidate: Motif, reason: str = "") -> MatchResult:
        old_annotation_id = match.annotation_id

        new_match = self.matcher.match(query, candidate)

        transposition_ev = self.variation_detector.detect(query, candidate)
        has_transposition = transposition_ev is not None and transposition_ev.variation_type == VariationType.TRANSPOSITION

        rhythm_misalign_ev = self.variation_detector.check_rhythm_stretch_with_misalign(query, candidate)
        has_rhythm_misalign = rhythm_misalign_ev is not None and rhythm_misalign_ev.variation_type not in (
            VariationType.EXACT, VariationType.NO_MATCH,
        )

        if has_transposition and has_rhythm_misalign:
            combined_type, combined_ev = self._combine_transposition_with_other(
                transposition_ev, rhythm_misalign_ev
            )
            new_match.variation_type = combined_type
            new_match.evidence = combined_ev
        elif has_transposition:
            new_match.evidence = transposition_ev
            new_match.variation_type = transposition_ev.variation_type
        elif has_rhythm_misalign:
            new_match.variation_type = rhythm_misalign_ev.variation_type
            new_match.evidence = rhythm_misalign_ev

        new_match.suggestions = self.suggestion_gen.generate(new_match, query, candidate)

        if old_annotation_id:
            frag_id = candidate.metadata.get("source_fragment", candidate.id)
            new_ann = self.audit_log.supersede_annotation(
                old_annotation_id=old_annotation_id,
                new_variation_type=new_match.variation_type,
                new_evidence=new_match.evidence,
                reason=reason or "重新评估变奏识别",
            )
            new_match.annotation_id = new_ann.id
        else:
            frag_id = candidate.metadata.get("source_fragment", candidate.id)
            ann = self.audit_log.create_annotation(
                fragment_id=frag_id,
                motif_id=candidate.id,
                variation_type=new_match.variation_type,
                evidence=new_match.evidence,
            )
            new_match.annotation_id = ann.id

        self.audit_log.log(
            action="re_evaluate",
            target_type="MatchResult",
            target_id=f"{query.id}:{candidate.id}",
            before={"variation_type": match.variation_type.value},
            after={"variation_type": new_match.variation_type.value},
            detail=f"重新评估匹配 {query.id} vs {candidate.id}：{match.variation_type.value} → {new_match.variation_type.value}",
        )

        return new_match

    def manual_correct(
        self,
        target_type: str,
        target_id: str,
        field_name: str,
        new_value: Any,
        operator: str = "manual",
        reason: str = "",
    ) -> AuditEntry:
        if target_type == "Motif":
            motif = self._find_motif(target_id)
            if motif is None:
                raise ValueError(f"动机不存在: {target_id}")
            before = getattr(motif, field_name, None)
            setattr(motif, field_name, new_value)
            if field_name in motif.missing_fields:
                motif.missing_fields.remove(field_name)
            return self.audit_log.manual_correction(
                target_type, target_id, field_name, before, new_value, operator, reason
            )

        return self.audit_log.manual_correction(
            target_type, target_id, field_name, None, new_value, operator, reason
        )

    def generate_report(self, query_motif_id: str) -> tuple[Any, str]:
        matches = self.search(query_motif_id)
        audit_trail = self.audit_log.export_audit_trail()

        report = self.report_gen.generate_report(matches, audit_trail, query_motif_id)
        report.audit_trail = []

        text = self.report_gen.format_report(report)

        return report, text

    def save_report(self, report: Any, path: str) -> None:
        audit_trail = self.audit_log.export_audit_trail()
        self.report_gen.save_report(report, path, audit_trail=audit_trail)

    def save_audit(self, path: str) -> None:
        self.audit_log.save_to_file(path)

    def _find_motif(self, motif_id: str) -> Optional[Motif]:
        for m in self.importer.motifs:
            if m.id == motif_id:
                return m
        return None

    @staticmethod
    def _combine_transposition_with_other(
        transposition_ev: VariationEvidence,
        other_ev: VariationEvidence,
    ) -> tuple[VariationType, VariationEvidence]:
        has_misalign = other_ev.misalign_beats is not None and abs(other_ev.misalign_beats) > 0.5
        has_stretch = other_ev.stretch_ratio is not None and abs(other_ev.stretch_ratio - 1.0) > 0.05

        if has_misalign and has_stretch:
            combined_type = VariationType.TRANSPOSITION_PLUS_RHYTHM
            detail = (
                f"移调 + 节奏拉伸 + 小节错位复合变奏："
                f"移调 {transposition_ev.transposition_semitones} 半音，"
                f"拉伸比 {other_ev.stretch_ratio}，"
                f"错位 {other_ev.misalign_beats} 拍"
            )
        elif has_misalign:
            combined_type = VariationType.TRANSPOSITION_PLUS_MISALIGN
            detail = (
                f"移调 + 小节错位复合变奏："
                f"移调 {transposition_ev.transposition_semitones} 半音，"
                f"错位 {other_ev.misalign_beats} 拍（约 {other_ev.misalign_measures} 小节）"
            )
        elif has_stretch:
            combined_type = VariationType.TRANSPOSITION_PLUS_RHYTHM
            detail = (
                f"移调 + 节奏拉伸复合变奏："
                f"移调 {transposition_ev.transposition_semitones} 半音，"
                f"拉伸比 {other_ev.stretch_ratio}"
            )
        else:
            combined_type = transposition_ev.variation_type
            detail = transposition_ev.detail

        confidence = min(transposition_ev.confidence, other_ev.confidence) * 0.9

        return combined_type, VariationEvidence(
            variation_type=combined_type,
            confidence=confidence,
            detail=detail,
            transposition_semitones=transposition_ev.transposition_semitones,
            stretch_ratio=other_ev.stretch_ratio,
            misalign_beats=other_ev.misalign_beats,
            misalign_measures=other_ev.misalign_measures,
        )
