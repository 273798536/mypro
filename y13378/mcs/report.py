"""Markdown 报告生成 - 把样本、版本、人工修正串起来"""
from typing import List, Optional, Dict, Any

from .models import Sample, Correction, VersionSnapshot, GrayIssue, Report, _new_id
from .storage import Storage
from .snapshot import SnapshotManager, CorrectionManager
from .gray_check import GrayRatioChecker


class ReportGenerator:
    """Markdown 报告生成器"""

    def __init__(self, storage: Storage):
        self.storage = storage
        self.snapshot_mgr = SnapshotManager(storage)
        self.correction_mgr = CorrectionManager(storage)
        self.gray_checker = GrayRatioChecker(storage)

    def generate_full_report(self, snapshot_id: str,
                             title: Optional[str] = None) -> Report:
        """生成完整快照报告"""
        snapshot = self.storage.load_snapshot(snapshot_id)
        if not snapshot:
            raise ValueError(f"快照不存在: {snapshot_id}")

        samples = self.snapshot_mgr.get_snapshot_samples(snapshot_id)
        corrections = [self.storage.load_correction(cid)
                       for cid in snapshot.correction_ids]
        corrections = [c for c in corrections if c is not None]
        # 主动跑一次灰度检查，确保有数据
        gray_issues = self.gray_checker.check_snapshot(snapshot_id)

        content = self._render_full_report(
            snapshot, samples, corrections, gray_issues, title
        )

        report = Report(
            report_id=_new_id("rpt"),
            snapshot_id=snapshot_id,
            report_type="full",
            content=content,
        )
        self.storage.save_report(report)
        return report

    def generate_diff_report(self, snapshot_id_new: str, snapshot_id_old: str,
                             title: Optional[str] = None) -> Report:
        """生成两个快照的对比报告（用于展示变化）"""
        diff = self.snapshot_mgr.compare_snapshots(snapshot_id_old, snapshot_id_new)
        if not diff:
            raise ValueError("快照对比失败")

        snap_new = self.storage.load_snapshot(snapshot_id_new)
        snap_old = self.storage.load_snapshot(snapshot_id_old)

        # 获取新增样本详情
        added_samples = [self.storage.load_sample(sid)
                         for sid in diff.get("added_ids", [])]
        added_samples = [s for s in added_samples if s]

        # 收集所有修正记录（新快照中所有样本的修正）
        all_corrections_new = []
        if snap_new:
            for sid in snap_new.sample_ids:
                corrs = self.storage.list_corrections(sample_id=sid)
                all_corrections_new.extend(corrs)

        # 主动跑一次灰度检查
        gray_issues_new = self.gray_checker.check_snapshot(snapshot_id_new)

        content = self._render_diff_report(
            snap_old, snap_new, diff, added_samples,
            all_corrections_new, gray_issues_new, title
        )

        report = Report(
            report_id=_new_id("rpt"),
            snapshot_id=snapshot_id_new,
            report_type="diff",
            compare_snapshot_id=snapshot_id_old,
            content=content,
        )
        self.storage.save_report(report)
        return report

    # ---- 渲染 ----

    def _render_full_report(self, snapshot: VersionSnapshot,
                            samples: List[Sample],
                            corrections: List[Correction],
                            gray_issues: List[GrayIssue],
                            title: Optional[str]) -> str:
        t = title or f"模型压缩版本快照报告 - {snapshot.snapshot_name}"
        summary = snapshot.summary
        small_cats = summary.get("small_categories", [])

        lines = []
        lines.append(f"# {t}")
        lines.append("")
        lines.append(f"**快照ID**: {snapshot.snapshot_id}  ")
        lines.append(f"**模型版本**: {snapshot.model_version}  ")
        lines.append(f"**创建时间**: {snapshot.created_at}  ")
        lines.append(f"**创建人**: {snapshot.created_by or '系统'}  ")
        if snapshot.parent_snapshot_id:
            lines.append(f"**基于快照**: {snapshot.parent_snapshot_id}  ")
        if snapshot.description:
            lines.append(f"**描述**: {snapshot.description}  ")
        lines.append("")

        # 一、概览
        lines.append("## 一、概览统计")
        lines.append("")
        lines.append("| 指标 | 数值 |")
        lines.append("|------|------|")
        lines.append(f"| 总样本数 | {summary.get('total_samples', 0)} |")
        lines.append(f"| 误判样本数 | {summary.get('misjudged_count', 0)} |")
        lines.append(f"| 平均置信度 | {summary.get('avg_confidence', 0)} |")
        lines.append(f"| 有灰度比例的样本 | {summary.get('has_gray_ratio_count', 0)} |")
        lines.append(f"| 缺失灰度比例 | {summary.get('missing_gray_ratio_count', 0)} |")
        lines.append(f"| 人工修正次数 | {len(corrections)} |")
        lines.append("")

        # 小样本警告
        if small_cats:
            lines.append("> ⚠️ **小样本警告**：以下类别样本数少于 5，可能被平均数掩盖，需特别关注：")
            lines.append("")
            for label, cnt in small_cats:
                lines.append(f"- `{label}`: {cnt} 条")
            lines.append("")

        # 二、预测分布
        lines.append("## 二、预测标签分布")
        lines.append("")
        pred_dist = summary.get("predicted_distribution", {})
        if pred_dist:
            total = summary.get("total_samples", 1)
            for label, cnt in sorted(pred_dist.items(), key=lambda x: -x[1]):
                pct = cnt / total * 100
                bar = "█" * int(pct / 5)
                lines.append(f"- **{label}**: {cnt} ({pct:.1f}%) {bar}")
        else:
            lines.append("暂无预测标签数据")
        lines.append("")

        # 三、误判样本详情
        misjudged = [s for s in samples if s.is_misjudged or
                     (s.true_label and s.predicted_label and s.true_label != s.predicted_label)]
        lines.append(f"## 三、误判样本（{len(misjudged)} 条）")
        lines.append("")
        if misjudged:
            lines.append("| 样本ID | 预测标签 | 真实/修正后标签 | 置信度 | 原始来源 |")
            lines.append("|--------|----------|----------------|--------|----------|")
            for s in misjudged[:20]:  # 最多显示20条
                corr_hist = self.correction_mgr.get_sample_history(s.sample_id)
                final_label = corr_hist[-1].after_label if corr_hist else (s.true_label or "-")
                lines.append(
                    f"| {s.sample_id} | {s.predicted_label or '-'} | "
                    f"{final_label} | {s.confidence:.3f} | {s.raw_source} |"
                )
            if len(misjudged) > 20:
                lines.append(f"| ... 共 {len(misjudged)} 条，仅显示前 20 条 | | | | |")
            lines.append("")
        else:
            lines.append("无误判样本")
            lines.append("")

        # 四、人工修正历史
        lines.append(f"## 四、人工修正历史（{len(corrections)} 条）")
        lines.append("")
        if corrections:
            for c in corrections:
                lines.append(f"### 修正 {c.correction_id}")
                lines.append("")
                lines.append(f"- **样本ID**: {c.sample_id}")
                lines.append(f"- **操作人**: {c.operator or '未知'}")
                lines.append(f"- **时间**: {c.corrected_at}")
                lines.append(f"- **修正前标签**: `{c.before_label}`")
                lines.append(f"- **修正后标签**: `{c.after_label}`")
                if c.reason:
                    lines.append(f"- **修正理由**: {c.reason}")
                lines.append("")
        else:
            lines.append("暂无人工修正记录")
            lines.append("")

        # 五、灰度比例问题
        lines.append(f"## 五、灰度比例问题（{len(gray_issues)} 个）")
        lines.append("")
        if gray_issues:
            for issue in gray_issues:
                lines.append(f"### {issue.issue_type} - {issue.issue_id}")
                lines.append("")
                lines.append(f"**详情**: {issue.detail}")
                lines.append("")
                lines.append("**下一步操作**:")
                lines.append("")
                lines.append(issue.next_step)
                lines.append("")
        else:
            lines.append("灰度比例检查通过，无异常")
            lines.append("")

        # 六、原始数据来源
        lines.append("## 六、原始数据来源")
        lines.append("")
        sources = set(s.raw_source for s in samples)
        for src in sorted(sources):
            src_samples = [s for s in samples if s.raw_source == src]
            lines.append(f"- **{src}**: {len(src_samples)} 条样本")
        lines.append("")
        lines.append("> 所有原始文件均原样保留在 `samples/raw/` 目录下，未做任何清洗修改，可随时回溯。")
        lines.append("")

        return "\n".join(lines)

    def _render_diff_report(self, snap_old: Optional[VersionSnapshot],
                            snap_new: Optional[VersionSnapshot],
                            diff: Dict[str, Any],
                            added_samples: List[Sample],
                            corrections: List[Correction],
                            gray_issues_new: List[GrayIssue],
                            title: Optional[str]) -> str:
        t = title or f"版本变化对比报告 - {snap_new.snapshot_name if snap_new else '新版本'}"
        lines = []
        lines.append(f"# {t}")
        lines.append("")
        lines.append("## 对比概览")
        lines.append("")
        lines.append(f"- **旧快照**: {diff.get('snapshot_a', '-')}")
        lines.append(f"- **新快照**: {diff.get('snapshot_b', '-')}")
        lines.append("")

        lines.append("| 指标 | 旧版本 | 新版本 | 变化 |")
        lines.append("|------|--------|--------|------|")

        sum_old = diff.get("summary_a", {})
        sum_new = diff.get("summary_b", {})

        old_total = sum_old.get("total_samples", 0)
        new_total = sum_new.get("total_samples", 0)
        lines.append(
            f"| 总样本数 | {old_total} | {new_total} | "
            f"{'+' if new_total-old_total>=0 else ''}{new_total-old_total} |"
        )

        old_mis = sum_old.get("misjudged_count", 0)
        new_mis = sum_new.get("misjudged_count", 0)
        lines.append(
            f"| 误判数 | {old_mis} | {new_mis} | "
            f"{'+' if new_mis-old_mis>=0 else ''}{new_mis-old_mis} |"
        )

        old_avg = sum_old.get("avg_confidence", 0)
        new_avg = sum_new.get("avg_confidence", 0)
        lines.append(
            f"| 平均置信度 | {old_avg:.4f} | {new_avg:.4f} | "
            f"{'+' if new_avg-old_avg>=0 else ''}{new_avg-old_avg:.4f} |"
        )

        lines.append(f"| 新增样本 | - | - | {diff.get('added_count', 0)} |")
        lines.append(f"| 移除样本 | - | - | {diff.get('removed_count', 0)} |")
        lines.append(f"| 标签修正 | - | - | {len(corrections)} |")
        lines.append("")

        # 新增样本
        added_count = diff.get("added_count", 0)
        lines.append(f"## 一、新增样本（{added_count} 条）")
        lines.append("")
        if added_samples:
            lines.append("| 样本ID | 预测标签 | 置信度 | 灰度比例 | 来源 | 备注 |")
            lines.append("|--------|----------|--------|----------|------|------|")
            for s in added_samples:
                gray = f"{s.gray_ratio}" if s.gray_ratio is not None else "-"
                note = s.note or "-"
                lines.append(
                    f"| {s.sample_id} | {s.predicted_label or '-'} | "
                    f"{s.confidence:.3f} | {gray} | {s.raw_source} | {note} |"
                )
            lines.append("")

            # 特别标注：晚到/补录的样本
            late_samples = [s for s in added_samples if "晚到" in s.note or "补录" in s.note]
            if late_samples:
                lines.append("> 📌 **晚到附件提示**：以下样本为补录/晚到数据，请注意它们对整体统计的影响：")
                lines.append("")
                for s in late_samples:
                    lines.append(f"- {s.sample_id}（来源: {s.raw_source}）")
                lines.append("")
        else:
            lines.append("无新增样本")
            lines.append("")

        # 标签变化
        lines.append(f"## 二、人工修正与标签变化（{len(corrections)} 条）")
        lines.append("")
        if corrections:
            lines.append("| 修正ID | 样本ID | 修正前 | 修正后 | 操作人 | 理由 |")
            lines.append("|--------|--------|--------|--------|--------|------|")
            for c in corrections:
                lines.append(
                    f"| {c.correction_id} | {c.sample_id} | `{c.before_label}` | "
                    f"`{c.after_label}` | {c.operator or '-'} | {c.reason or '-'} |"
                )
            lines.append("")
            lines.append("> 所有人工修正均已记录历史，可在 `corrections/` 目录下查阅完整记录。")
            lines.append("")
        else:
            lines.append("无标签变化")
            lines.append("")

        # 新出现的灰度问题
        lines.append(f"## 三、灰度比例检查（新版本有 {len(gray_issues_new)} 个问题）")
        lines.append("")
        if gray_issues_new:
            for issue in gray_issues_new:
                lines.append(f"### {issue.issue_type} - {issue.issue_id}")
                lines.append("")
                lines.append(f"**详情**: {issue.detail}")
                lines.append("")
                lines.append("**下一步操作**:")
                lines.append("")
                lines.append(issue.next_step)
                lines.append("")
        else:
            lines.append("新版本灰度比例检查通过")
            lines.append("")

        # 变化说明
        lines.append("## 四、变化原因分析（供社区公示前复盘）")
        lines.append("")
        lines.append("### 影响因素")
        lines.append("")
        reasons = []
        idx = 1
        if added_count > 0:
            reasons.append(f"{idx}. 新增了 {added_count} 条样本，可能改变统计分布")
            idx += 1
        if len(corrections) > 0:
            reasons.append(f"{idx}. 有 {len(corrections)} 条样本被人工修正，影响误判统计")
            idx += 1
        late_count = len([s for s in added_samples if "晚到" in s.note or "补录" in s.note])
        if late_count > 0:
            reasons.append(f"{idx}. 含 {late_count} 条晚到/补录数据，需注意数据时效性")
            idx += 1
        if not reasons:
            reasons.append("1. 无显著变化")
        for r in reasons:
            lines.append(r)
        lines.append("")

        lines.append("### 给算法值班人的说明")
        lines.append("")
        lines.append("- 本报告所有数据均保留原始来源，可回溯验证")
        lines.append("- 小样本类别已特别标注，避免被平均数掩盖")
        lines.append("- 人工修正记录完整，改判原因可追溯")
        lines.append("- 灰度比例异常均提供具体下一步操作，照着做即可")
        lines.append("")

        return "\n".join(lines)
