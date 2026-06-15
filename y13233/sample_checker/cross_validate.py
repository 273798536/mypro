from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple

from .models import (
    SamplePackage,
    DetectionRecord,
    DeliveryChecklistItem,
)


@dataclass
class CrossValidator:
    strict_checklist: bool = True

    # ── 1. 旧版本 vs 本次批注：看是否有版本跳变 ──────────────
    def validate_version_consistency(
        self,
        pkg: SamplePackage,
        record: DetectionRecord,
        previous_record: Optional[DetectionRecord] = None,
    ) -> List[str]:
        issues: List[str] = []
        if previous_record is None:
            if pkg.version:
                issues.append(
                    f"首次扫描，采样包版本={pkg.version}；无可对比旧版本，已记录基线。"
                )
            return issues

        if previous_record.package_version != pkg.version:
            issues.append(
                f"版本变化：上一次扫描 package_version="
                f"{previous_record.package_version}，本次={pkg.version}；"
                f"若未走版本升版流程请确认。"
            )

        prev_anns = set(previous_record.manual_annotations or [])
        curr_anns = set(record.manual_annotations or [])
        only_prev = prev_anns - curr_anns
        only_curr = curr_anns - prev_anns
        if only_prev:
            issues.append(
                f"人工批注减少（上次有本次无）：{sorted(only_prev)}；"
                f"请确认是否故意删除。"
            )
        if only_curr:
            issues.append(
                f"人工批注新增：{sorted(only_curr)}；请与交付清单核对。"
            )

        return issues

    # ── 2. 人工批注 vs 交付清单 ─────────────────────────────
    def validate_annotations_vs_checklist(
        self,
        record: DetectionRecord,
    ) -> List[str]:
        issues: List[str] = []
        if record.checklist is None:
            issues.append("缺少交付清单（delivery_checklist），无法交叉对齐。")
            return issues

        anns = [a.strip() for a in (record.manual_annotations or []) if a.strip()]
        missing_items: List[str] = []
        extra_notes: List[str] = []

        item_names_lower = {
            it.name.strip().lower(): it
            for it in record.checklist.items
        }

        for it in record.checklist.items:
            if it.expected and not it.found:
                # 看人工批注里有没有对应提到
                hit = any(it.name.strip().lower() in a.lower() for a in anns)
                if not hit:
                    missing_items.append(it.name)

        # 反过来：批注里提到但清单里没有的
        for a in anns:
            hit = any(name in a.lower() for name in item_names_lower.keys())
            if not hit and self.strict_checklist:
                extra_notes.append(a)

        if missing_items:
            issues.append(
                f"交付清单标记缺失且人工批注未提及：{missing_items}；"
                f"请补充批注或修正清单 found 标记。"
            )
        if extra_notes:
            issues.append(
                f"人工批注有但交付清单未登记：{extra_notes}；"
                f"请补齐 checklist 条目。"
            )
        if not missing_items and not extra_notes:
            issues.append("人工批注 ↔ 交付清单：已对齐。")

        return issues

    # ── 3. 旧结果 + 林姐改动历史 vs 本次 ────────────────────
    def validate_record_coherence(
        self,
        record: DetectionRecord,
        previous_record: Optional[DetectionRecord] = None,
    ) -> List[str]:
        issues: List[str] = []
        if previous_record is None:
            return issues

        prev_sigs = set(previous_record.note_signatures_seen or [])
        curr_sigs = set(record.note_signatures_seen or [])
        missing_sigs = prev_sigs - curr_sigs
        if missing_sigs:
            issues.append(
                f"历史上已处理的 {len(missing_sigs)} 条备注在本次扫描中缺失，"
                f"请确认是否故意移除。"
            )

        # HANG 状态必须被保留，除非有人工批注覆盖
        prev_hang = {
            r.title: r for r in previous_record.results
            if r.status.value == "hang"
        }
        curr_hang_titles = {
            r.title for r in record.results if r.status.value == "hang"
        }
        resolved_without_annotation = []
        for title, prev_r in prev_hang.items():
            if title not in curr_hang_titles:
                covered = any(
                    title[:8] in a or "已确认" in a or "主管确认" in a
                    for a in (record.manual_annotations or [])
                )
                if not covered:
                    resolved_without_annotation.append(title)
        if resolved_without_annotation:
            issues.append(
                f"上次 HANG 挂起项本次消失但缺少主管确认批注："
                f"{resolved_without_annotation}；请补充确认记录。"
            )

        return issues

    # ── 总入口：把三项对齐结果写回 record ───────────────────
    def apply(
        self,
        pkg: SamplePackage,
        record: DetectionRecord,
        previous_record: Optional[DetectionRecord] = None,
    ) -> DetectionRecord:
        issues: List[str] = []
        issues.extend(
            self.validate_version_consistency(pkg, record, previous_record)
        )
        issues.extend(self.validate_annotations_vs_checklist(record))
        issues.extend(self.validate_record_coherence(record, previous_record))

        ok_flags = [i for i in issues if "已对齐" in i or "已记录基线" in i]
        bad_flags = [i for i in issues if i not in ok_flags]
        record.cross_validation_ok = len(bad_flags) == 0
        record.cross_validation_issues = issues
        return record
