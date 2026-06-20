from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from models import (
    AnomalyResult,
    ManualCorrection,
    NoteEntry,
    ReplayReport,
    SampleRecord,
    VersionDiff,
    VersionSnapshot,
)
from provenance import ProvenanceChain, TimelineBuilder
from version_manager import FeatureSnapshotManager, VersionRegistry


class VersionComparator:
    def __init__(self, registry: VersionRegistry) -> None:
        self._registry = registry
        self._snapshot_mgr = FeatureSnapshotManager(registry)

    def compare_results(
        self,
        results_old: List[AnomalyResult],
        results_new: List[AnomalyResult],
        version_old: str,
        version_new: str,
    ) -> List[VersionDiff]:
        diffs: List[VersionDiff] = []
        old_map = {r.sample_id: r for r in results_old}
        new_map = {r.sample_id: r for r in results_new}
        all_ids = sorted(set(list(old_map.keys()) + list(new_map.keys())))

        for sid in all_ids:
            ro = old_map.get(sid)
            rn = new_map.get(sid)

            if ro and rn:
                if ro.is_anomaly != rn.is_anomaly:
                    diffs.append(
                        VersionDiff(
                            dimension="样本异常判定",
                            old_value=ro.is_anomaly,
                            new_value=rn.is_anomaly,
                            version_old=version_old,
                            version_new=version_new,
                            changed=True,
                        )
                    )
                if abs(ro.anomaly_score - rn.anomaly_score) > 1e-9:
                    diffs.append(
                        VersionDiff(
                            dimension="异常分数",
                            old_value=round(ro.anomaly_score, 4),
                            new_value=round(rn.anomaly_score, 4),
                            version_old=version_old,
                            version_new=version_new,
                            changed=True,
                        )
                    )
                if ro.threshold_used != rn.threshold_used:
                    diffs.append(
                        VersionDiff(
                            dimension="阈值",
                            old_value=ro.threshold_used,
                            new_value=rn.threshold_used,
                            version_old=ro.threshold_version,
                            version_new=rn.threshold_version,
                            changed=True,
                        )
                    )
                old_corrs = set(ro.manual_corrections_applied)
                new_corrs = set(rn.manual_corrections_applied)
                if old_corrs != new_corrs:
                    diffs.append(
                        VersionDiff(
                            dimension="人工修正",
                            old_value=sorted(old_corrs),
                            new_value=sorted(new_corrs),
                            version_old=version_old,
                            version_new=version_new,
                            changed=True,
                        )
                    )
                if ro.feature_snapshot_version != rn.feature_snapshot_version:
                    diffs.append(
                        VersionDiff(
                            dimension="特征快照版本",
                            old_value=ro.feature_snapshot_version,
                            new_value=rn.feature_snapshot_version,
                            version_old=version_old,
                            version_new=version_new,
                            changed=True,
                        )
                    )
                if ro.bad_data_flag != rn.bad_data_flag:
                    diffs.append(
                        VersionDiff(
                            dimension="坏数据标记",
                            old_value=ro.bad_data_flag,
                            new_value=rn.bad_data_flag,
                            version_old=version_old,
                            version_new=version_new,
                            changed=True,
                        )
                    )
            elif ro and not rn:
                diffs.append(
                    VersionDiff(
                        dimension="样本存在性",
                        old_value=f"存在 (异常={ro.is_anomaly})",
                        new_value="不存在",
                        version_old=version_old,
                        version_new=version_new,
                        changed=True,
                    )
                )
            elif rn and not ro:
                diffs.append(
                    VersionDiff(
                        dimension="样本存在性",
                        old_value="不存在",
                        new_value=f"存在 (异常={rn.is_anomaly})",
                        version_old=version_old,
                        version_new=version_new,
                        changed=True,
                    )
                )

        return diffs

    def compare_thresholds(
        self,
        version_ref_old: str,
        version_ref_new: str,
    ) -> List[VersionDiff]:
        snap_old = self._registry.resolve(version_ref_old)
        snap_new = self._registry.resolve(version_ref_new)
        if not snap_old or not snap_new:
            return []

        diffs: List[VersionDiff] = []
        all_keys = sorted(
            set(list(snap_old.thresholds.keys()) + list(snap_new.thresholds.keys()))
        )
        for key in all_keys:
            vo = snap_old.thresholds.get(key)
            vn = snap_new.thresholds.get(key)
            if vo != vn:
                diffs.append(
                    VersionDiff(
                        dimension=f"阈值.{key}",
                        old_value=vo,
                        new_value=vn,
                        version_old=snap_old.version_id,
                        version_new=snap_new.version_id,
                        changed=True,
                    )
                )
        return diffs

    def compare_feature_snapshots(
        self,
        version_ref_old: str,
        version_ref_new: str,
    ) -> List[VersionDiff]:
        return [
            VersionDiff(
                dimension=f"特征.{d['feature']}",
                old_value=d["old_value"],
                new_value=d["new_value"],
                version_old=d["version_old"],
                version_new=d["version_new"],
                changed=True,
            )
            for d in self._snapshot_mgr.compare_snapshots(version_ref_old, version_ref_new)
        ]

    def full_comparison(
        self,
        results_old: List[AnomalyResult],
        results_new: List[AnomalyResult],
        version_ref_old: str,
        version_ref_new: str,
    ) -> Dict[str, List[VersionDiff]]:
        return {
            "样本与判定": self.compare_results(
                results_old, results_new, version_ref_old, version_ref_new
            ),
            "阈值": self.compare_thresholds(version_ref_old, version_ref_new),
            "特征快照": self.compare_feature_snapshots(version_ref_old, version_ref_new),
        }


class ReportGenerator:
    @staticmethod
    def generate(
        run_id: str,
        version_tag: str,
        results: List[AnomalyResult],
        version_diffs: Optional[Dict[str, List[VersionDiff]]] = None,
    ) -> ReplayReport:
        timeline_builder = TimelineBuilder()
        for r in results:
            for tl in r.timeline:
                timeline_builder._entries.append(tl)
        full_timeline = timeline_builder.build()
        chain = ProvenanceChain(full_timeline)

        material_summary = chain.material_summary()
        material_entry_lines: List[str] = []
        for mtype, descs in material_summary.items():
            material_entry_lines.append(f"【{mtype}】")
            for d in descs:
                material_entry_lines.append(f"  - {d}")
        material_entry_summary = "\n".join(material_entry_lines)

        anomaly_count = sum(1 for r in results if r.is_anomaly)
        bad_count = sum(1 for r in results if r.bad_data_flag)
        corrected_ids = set()
        for r in results:
            corrected_ids.update(r.manual_corrections_applied)

        anomaly_exit_lines: List[str] = [
            f"回放版本: {version_tag}",
            f"总样本数: {len(results)}",
            f"判定异常: {anomaly_count}",
            f"坏数据隔离: {bad_count}",
            f"人工修正生效: {len(corrected_ids)} 条",
            "",
        ]

        for r in results:
            if r.is_anomaly:
                anomaly_exit_lines.append(
                    f"  异常样本 {r.sample_id}: "
                    f"分数={r.anomaly_score:.4f} "
                    f"阈值={r.threshold_used} (版本 {r.threshold_version}) "
                    f"快照={r.feature_snapshot_version}"
                )
                if r.manual_corrections_applied:
                    anomaly_exit_lines.append(
                        f"    人工修正: {', '.join(r.manual_corrections_applied)}"
                    )
                if r.notes_applied:
                    anomaly_exit_lines.append(
                        f"    关联备注: {', '.join(r.notes_applied)}"
                    )
            if r.bad_data_flag:
                anomaly_exit_lines.append(
                    f"  坏数据 {r.sample_id}: {r.bad_data_detail}"
                )
                if r.original_row_ref:
                    anomaly_exit_lines.append(
                        f"    定位: {r.original_row_ref}"
                    )

        anomaly_exit_summary = "\n".join(anomaly_exit_lines)

        flat_diffs: List[VersionDiff] = []
        if version_diffs:
            for diff_list in version_diffs.values():
                flat_diffs.extend(diff_list)

        return ReplayReport(
            run_id=run_id,
            version_tag=version_tag,
            results=results,
            version_diffs=flat_diffs,
            material_entry_summary=material_entry_summary,
            anomaly_exit_summary=anomaly_exit_summary,
        )

    @staticmethod
    def format_report(report: ReplayReport) -> str:
        lines: List[str] = []
        lines.append("=" * 60)
        lines.append(f"负采样异常回放报告")
        lines.append(f"运行ID: {report.run_id}")
        lines.append(f"版本: {report.version_tag}")
        lines.append(f"时间: {report.timestamp}")
        lines.append("=" * 60)
        lines.append("")
        lines.append("── 材料入口 ──")
        lines.append(report.material_entry_summary)
        lines.append("")
        lines.append("── 异常出口 ──")
        lines.append(report.anomaly_exit_summary)
        lines.append("")

        if report.version_diffs:
            lines.append("── 版本差异 ──")
            for d in report.version_diffs:
                if d.changed:
                    lines.append(
                        f"  [{d.dimension}] "
                        f"{d.version_old}: {d.old_value} -> "
                        f"{d.version_new}: {d.new_value}"
                    )
            lines.append("")

        lines.append("── 溯源明细 ──")
        for r in report.results:
            lines.append(f"  样本 {r.sample_id}:")
            for tl in r.timeline:
                influence_tag = {
                    "direct": "★直接影响",
                    "indirect": "◇间接影响",
                    "none": "○无影响",
                }.get(tl.influence_on_conclusion.value, "?")
                lines.append(
                    f"    [{tl.material_type.value}] {tl.source_description} {influence_tag}"
                )
            lines.append("")

        lines.append("=" * 60)
        return "\n".join(lines)
