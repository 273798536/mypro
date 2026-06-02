import os
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
import numpy as np

from .models import TrainingRecord, CheckResult

rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
rcParams["axes.unicode_minus"] = False


class ProcessVisualizer:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.visualization_snapshots: List[Dict] = []

    def visualize_all(
        self,
        records: List[TrainingRecord],
        check_results: List[CheckResult],
        process_snapshots: List[Dict],
    ) -> Dict[str, str]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_map = {r.record_id: r for r in check_results}
        output_paths = {}

        self._capture_snapshot("visualize_start", {
            "records_count": len(records),
            "timestamp": timestamp,
        })

        output_paths["overview"] = self._generate_overview_chart(
            records, check_results, timestamp
        )

        output_paths["per_record"] = []
        for record in records:
            cr = result_map.get(record.record_id)
            if not cr:
                continue
            path = self._generate_record_chart(record, cr, timestamp)
            if path:
                output_paths["per_record"].append(path)

        output_paths["comparison"] = self._generate_comparison_chart(
            records, check_results, timestamp
        )

        output_paths["issues_breakdown"] = self._generate_issues_breakdown_chart(
            check_results, timestamp
        )

        output_paths["process_flow"] = self._generate_process_flow_diagram(
            process_snapshots, timestamp
        )

        self._capture_snapshot("visualize_complete", {
            "charts_generated": len(output_paths),
        })

        return output_paths

    def _generate_overview_chart(
        self, records: List[TrainingRecord], check_results: List[CheckResult], timestamp: str
    ) -> str:
        result_map = {r.record_id: r for r in check_results}

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle("梯度下降调参分析总览", fontsize=16, fontweight="bold")

        status_counts = {"正常": 0, "学习率爆炸": 0, "局部极小": 0, "迭代不足": 0, "学习率缺失": 0}
        for record in records:
            cr = result_map.get(record.record_id)
            if not cr or not cr.issues:
                status_counts["正常"] += 1
                continue
            for issue in cr.issues:
                itype = issue.issue_type.value
                if itype == "learning_rate_explosion":
                    status_counts["学习率爆炸"] += 1
                elif itype == "local_minimum":
                    status_counts["局部极小"] += 1
                elif itype == "insufficient_iterations":
                    status_counts["迭代不足"] += 1
                elif itype == "missing_learning_rate":
                    status_counts["学习率缺失"] += 1

        ax = axes[0, 0]
        labels = list(status_counts.keys())
        values = list(status_counts.values())
        colors = ["#2ecc71", "#e74c3c", "#f39c12", "#e67e22", "#95a5a6"]
        bars = ax.bar(labels, values, color=colors, edgecolor="black", linewidth=0.5)
        ax.set_title("问题类型分布", fontsize=12, fontweight="bold")
        ax.set_ylabel("班级数量")
        ax.tick_params(axis="x", rotation=15)
        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                   str(val), ha="center", va="bottom", fontweight="bold")

        ax = axes[0, 1]
        total = len(records)
        normal = status_counts["正常"]
        has_issues = total - normal
        sizes = [normal, has_issues] if total > 0 else [1, 0]
        labels_pie = ["正常", "有问题"]
        colors_pie = ["#2ecc71", "#e74c3c"]
        if total > 0:
            wedges, texts, autotexts = ax.pie(
                sizes, labels=labels_pie, colors=colors_pie,
                autopct="%1.0f%%", startangle=90,
                textprops={"fontsize": 11}
            )
            for autotext in autotexts:
                autotext.set_color("white")
                autotext.set_fontweight("bold")
        ax.set_title("整体合格率", fontsize=12, fontweight="bold")

        ax = axes[1, 0]
        valid_records = [(r, result_map[r.record_id]) for r in records
                        if result_map.get(r.record_id) and r.loss_history]
        if valid_records:
            for idx, (record, cr) in enumerate(valid_records[:10]):
                loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
                iters = [h.iteration for h in loss_vals]
                losses = [h.loss_value for h in loss_vals]
                label = f"{record.class_name}"
                if any(i.issue_type.value == "insufficient_iterations" for i in cr.issues):
                    label += " (迭代不足)"
                    line_style = ":"
                    color = f"C{idx}"
                elif any(i.issue_type.value == "learning_rate_explosion" for i in cr.issues):
                    label += " (学习率爆炸)"
                    line_style = "-."
                    color = f"C{idx}"
                else:
                    line_style = "-"
                    color = f"C{idx}"
                ax.plot(iters, losses, label=label, linestyle=line_style, linewidth=2, color=color)
            ax.set_title("损失曲线对比（前10条）", fontsize=12, fontweight="bold")
            ax.set_xlabel("迭代次数")
            ax.set_ylabel("损失值")
            ax.legend(loc="upper right", fontsize=8, framealpha=0.9)
            ax.grid(True, alpha=0.3)
        else:
            ax.text(0.5, 0.5, "无有效数据", ha="center", va="center", fontsize=14, alpha=0.5)
            ax.axis("off")

        ax = axes[1, 1]
        iter_data = []
        for record in records:
            cr = result_map.get(record.record_id)
            if not cr:
                continue
            actual = len(record.loss_history)
            expected = record.iterations if record.iterations > 0 else 0
            has_issue = any(i.issue_type.value == "insufficient_iterations" for i in cr.issues)
            iter_data.append({
                "class": record.class_name,
                "actual": actual,
                "expected": expected,
                "has_issue": has_issue,
            })

        if iter_data:
            x = range(len(iter_data))
            actual_vals = [d["actual"] for d in iter_data]
            expected_vals = [d["expected"] if d["expected"] > 0 else d["actual"] for d in iter_data]
            colors_bars = ["#e74c3c" if d["has_issue"] else "#2ecc71" for d in iter_data]

            ax.bar(x, actual_vals, color=colors_bars, label="实际迭代", alpha=0.7, edgecolor="black")
            ax.plot(x, expected_vals, "r--", label="预期迭代", marker="o", markersize=4)
            ax.set_title("迭代数对比", fontsize=12, fontweight="bold")
            ax.set_ylabel("迭代次数")
            ax.set_xticks(x)
            ax.set_xticklabels([d["class"] for d in iter_data], rotation=45, ha="right", fontsize=8)
            ax.legend()
            ax.grid(True, alpha=0.3, axis="y")
        else:
            ax.text(0.5, 0.5, "无有效数据", ha="center", va="center", fontsize=14, alpha=0.5)
            ax.axis("off")

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])

        filename = os.path.join(self.output_dir, f"overview_chart_{timestamp}.png")
        plt.savefig(filename, dpi=150, bbox_inches="tight")
        plt.close(fig)

        self._capture_snapshot("overview_chart", {"filename": filename})

        return filename

    def _generate_record_chart(
        self, record: TrainingRecord, cr: CheckResult, timestamp: str
    ) -> Optional[str]:
        if not cr.loss_trend:
            return None

        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
        iters = [h.iteration for h in loss_vals]
        losses = [h.loss_value for h in loss_vals]

        ax = axes[0]
        line, = ax.plot(iters, losses, "b-", linewidth=2, label="损失值")

        for idx in cr.explosive_points:
            if 0 <= idx < len(iters):
                ax.axvline(x=iters[idx], color="red", linestyle="--", alpha=0.7, linewidth=1.5)
                ax.plot(iters[idx], losses[idx], "ro", markersize=8, label="_nolegend_")
                ax.annotate(f"💥 爆炸点\n迭代 {iters[idx]}\n损失 {losses[idx]:.4f}",
                           xy=(iters[idx], losses[idx]),
                           xytext=(iters[idx] + 2, losses[idx] * 1.1),
                           fontsize=9, color="red",
                           arrowprops=dict(arrowstyle="->", color="red", alpha=0.7))

        for start_idx, end_idx in cr.plateau_points:
            if 0 <= start_idx - 1 < len(iters) and 0 <= end_idx - 1 < len(iters):
                start_iter = iters[start_idx - 1]
                end_iter = iters[end_idx - 1]
                ax.axvspan(start_iter, end_iter, color="orange", alpha=0.2)
                mid_x = (start_iter + end_iter) / 2
                mid_y = max(losses) * 0.9
                ax.annotate(f"⛔ 局部极小\n{start_iter}-{end_iter}轮",
                           xy=(mid_x, mid_y), ha="center",
                           fontsize=9, color="orange", fontweight="bold")

        if any(i.issue_type.value == "insufficient_iterations" for i in cr.issues):
            actual = len(iters)
            expected = record.iterations if record.iterations > 0 else actual * 2
            ax.axvline(x=actual, color="purple", linestyle=":", linewidth=2, alpha=0.8)
            ax.axvline(x=max(actual + 1, expected), color="green", linestyle="--", linewidth=2, alpha=0.8)
            ax.annotate(f"⚠️ 当前: {actual}轮",
                       xy=(actual, max(losses) * 0.5),
                       xytext=(actual + 1, max(losses) * 0.7),
                       fontsize=9, color="purple",
                       arrowprops=dict(arrowstyle="->", color="purple", alpha=0.7))
            ax.annotate(f"✅ 建议: ≥{max(actual, expected)}轮",
                       xy=(max(actual, expected), max(losses) * 0.3),
                       fontsize=9, color="green", fontweight="bold")

        ax.set_title(f"{record.class_name} - 损失曲线分析", fontsize=13, fontweight="bold")
        ax.set_xlabel("迭代次数")
        ax.set_ylabel("损失值")
        ax.grid(True, alpha=0.3)
        ax.legend(loc="upper right")

        ax = axes[1]
        if len(losses) > 1:
            diffs = np.diff(losses)
            colors = ["green" if d < 0 else "red" if d > 0 else "gray" for d in diffs]
            bars = ax.bar(range(1, len(diffs) + 1), diffs, color=colors, edgecolor="black", linewidth=0.5)
            ax.axhline(y=0, color="black", linewidth=0.8)

            for idx in cr.explosive_points:
                if 1 <= idx < len(diffs) + 1:
                    ax.axvline(x=idx, color="red", linestyle="--", alpha=0.5)

            ax.set_title("损失变化梯度（每轮增量）", fontsize=13, fontweight="bold")
            ax.set_xlabel("迭代次数")
            ax.set_ylabel("损失变化值（负=下降）")
            ax.grid(True, alpha=0.3, axis="y")

            ax.text(0.02, 0.98,
                   f"参数说明：\n"
                   f"损失函数: {record.loss_function}\n"
                   f"学习率: {record.learning_rate if record.learning_rate else '缺失'}\n"
                   f"预期迭代: {record.iterations if record.iterations > 0 else '未填写'}\n"
                   f"实际迭代: {len(iters)}\n"
                   f"初始损失: {losses[0]:.4f}\n"
                   f"最终损失: {losses[-1]:.4f}\n"
                   f"下降幅度: {(losses[0] - losses[-1]):.4f} ({(losses[0]-losses[-1])/losses[0]*100:.1f}%)",
                   transform=ax.transAxes,
                   fontsize=9,
                   verticalalignment="top",
                   bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.7))
        else:
            ax.text(0.5, 0.5, "数据不足，无法计算梯度", ha="center", va="center", fontsize=12, alpha=0.5)
            ax.axis("off")

        plt.tight_layout()

        safe_name = "".join(c for c in record.class_name if c.isalnum() or c in "._- ")
        filename = os.path.join(self.output_dir, f"chart_{safe_name}_{timestamp}.png")
        plt.savefig(filename, dpi=150, bbox_inches="tight")
        plt.close(fig)

        self._capture_snapshot("record_chart", {
            "class_name": record.class_name,
            "filename": filename,
        })

        return filename

    def _generate_comparison_chart(
        self, records: List[TrainingRecord], check_results: List[CheckResult], timestamp: str
    ) -> str:
        result_map = {r.record_id: r for r in check_results}

        valid_records = [(r, result_map[r.record_id]) for r in records
                        if result_map.get(r.record_id) and r.loss_history]

        if len(valid_records) < 2:
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.text(0.5, 0.5, "需要至少 2 条有效记录才能生成对比图",
                   ha="center", va="center", fontsize=14, alpha=0.5)
            ax.axis("off")
            filename = os.path.join(self.output_dir, f"comparison_chart_{timestamp}.png")
            plt.savefig(filename, dpi=150, bbox_inches="tight")
            plt.close(fig)
            return filename

        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle("多班级参数对比分析", fontsize=16, fontweight="bold")

        ax = axes[0, 0]
        for idx, (record, cr) in enumerate(valid_records):
            loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
            iters = [h.iteration for h in loss_vals]
            losses = [h.loss_value for h in loss_vals]

            has_iter_issue = any(i.issue_type.value == "insufficient_iterations" for i in cr.issues)
            has_lr_issue = any(i.issue_type.value == "learning_rate_explosion" for i in cr.issues)

            line_style = "-"
            alpha = 1.0
            if has_iter_issue:
                line_style = ":"
                alpha = 0.7
            if has_lr_issue:
                line_style = "-."
                alpha = 0.7

            label = f"{record.class_name}"
            if has_iter_issue:
                label += " (⚠️ 迭代不足)"
            if has_lr_issue:
                label += " (💥 学习率爆炸)"

            ax.plot(iters, losses, label=label, linestyle=line_style,
                   linewidth=2, alpha=alpha, color=f"C{idx}")

        ax.set_title("损失曲线对比", fontsize=12, fontweight="bold")
        ax.set_xlabel("迭代次数")
        ax.set_ylabel("损失值")
        ax.legend(loc="upper right", fontsize=9, framealpha=0.9)
        ax.grid(True, alpha=0.3)

        ax = axes[0, 1]
        class_names = []
        initial_losses = []
        final_losses = []
        colors = []

        for record, cr in valid_records:
            loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
            class_names.append(record.class_name)
            initial_losses.append(loss_vals[0].loss_value)
            final_losses.append(loss_vals[-1].loss_value)

            has_issue = len(cr.issues) > 0
            colors.append("#e74c3c" if has_issue else "#2ecc71")

        x = range(len(class_names))
        width = 0.35

        bars1 = ax.bar([i - width/2 for i in x], initial_losses, width,
                      label="初始损失", color="#3498db", edgecolor="black")
        bars2 = ax.bar([i + width/2 for i in x], final_losses, width,
                      label="最终损失", color=colors, edgecolor="black")

        for i, (init, final) in enumerate(zip(initial_losses, final_losses)):
            drop = init - final
            drop_pct = drop / init * 100 if init != 0 else 0
            ax.annotate(f"↓{drop_pct:.0f}%",
                       xy=(i, max(init, final)),
                       xytext=(i, max(init, final) * 1.05),
                       ha="center", fontsize=9, fontweight="bold",
                       color="green" if drop > 0 else "red")

        ax.set_title("初始 vs 最终损失对比", fontsize=12, fontweight="bold")
        ax.set_ylabel("损失值")
        ax.set_xticks(x)
        ax.set_xticklabels(class_names, rotation=30, ha="right", fontsize=9)
        ax.legend()
        ax.grid(True, alpha=0.3, axis="y")

        ax = axes[1, 0]
        class_names_lr = []
        learning_rates = []
        final_losses_lr = []
        markers = []

        for record, cr in valid_records:
            if record.learning_rate is None:
                continue
            loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
            class_names_lr.append(record.class_name)
            learning_rates.append(record.learning_rate)
            final_losses_lr.append(loss_vals[-1].loss_value)

            has_lr_issue = any(i.issue_type.value == "learning_rate_explosion" for i in cr.issues)
            has_iter_issue = any(i.issue_type.value == "insufficient_iterations" for i in cr.issues)

            if has_lr_issue:
                markers.append("X")
            elif has_iter_issue:
                markers.append("s")
            else:
                markers.append("o")

        if learning_rates:
            for i in range(len(learning_rates)):
                ax.scatter(learning_rates[i], final_losses_lr[i],
                          marker=markers[i], s=100, edgecolors="black",
                          linewidths=1, label=class_names_lr[i], zorder=5)

            ax.set_xscale("log")
            ax.set_title("学习率 vs 最终损失（对数坐标）", fontsize=12, fontweight="bold")
            ax.set_xlabel("学习率（log scale）")
            ax.set_ylabel("最终损失")
            ax.legend(loc="upper right", fontsize=8, framealpha=0.9)
            ax.grid(True, alpha=0.3, which="both")

            ax.annotate("⭕ 正常\n■ 迭代不足\n✖ 学习率爆炸",
                       xy=(0.02, 0.98), xycoords="axes fraction",
                       fontsize=8, va="top",
                       bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.7))
        else:
            ax.text(0.5, 0.5, "无有效学习率数据", ha="center", va="center", fontsize=14, alpha=0.5)
            ax.axis("off")

        ax = axes[1, 1]
        class_names_iter = []
        actual_iters = []
        expected_iters = []
        bar_colors = []

        for record, cr in valid_records:
            loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
            class_names_iter.append(record.class_name)
            actual_iters.append(len(loss_vals))
            expected_iters.append(record.iterations if record.iterations > 0 else len(loss_vals))

            has_iter_issue = any(i.issue_type.value == "insufficient_iterations" for i in cr.issues)
            bar_colors.append("#e74c3c" if has_iter_issue else "#2ecc71")

        x_iter = range(len(class_names_iter))
        width = 0.35

        ax.bar([i - width/2 for i in x_iter], actual_iters, width,
              label="实际迭代", color=bar_colors, edgecolor="black")
        ax.bar([i + width/2 for i in x_iter], expected_iters, width,
              label="预期迭代", color="#3498db", alpha=0.7, edgecolor="black")

        for i in range(len(actual_iters)):
            if actual_iters[i] < expected_iters[i]:
                ax.annotate("⚠️", xy=(i - width/2, actual_iters[i]),
                           xytext=(i - width/2, actual_iters[i] + 2),
                           ha="center", fontsize=12)

        ax.set_title("实际 vs 预期迭代数", fontsize=12, fontweight="bold")
        ax.set_ylabel("迭代次数")
        ax.set_xticks(x_iter)
        ax.set_xticklabels(class_names_iter, rotation=30, ha="right", fontsize=9)
        ax.legend()
        ax.grid(True, alpha=0.3, axis="y")

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])

        filename = os.path.join(self.output_dir, f"comparison_chart_{timestamp}.png")
        plt.savefig(filename, dpi=150, bbox_inches="tight")
        plt.close(fig)

        self._capture_snapshot("comparison_chart", {"filename": filename})

        return filename

    def _generate_issues_breakdown_chart(
        self, check_results: List[CheckResult], timestamp: str
    ) -> str:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        issue_types = {
            "learning_rate_explosion": {"name": "学习率爆炸", "count": 0, "color": "#e74c3c"},
            "local_minimum": {"name": "局部极小", "count": 0, "color": "#f39c12"},
            "insufficient_iterations": {"name": "迭代不足", "count": 0, "color": "#e67e22"},
            "missing_learning_rate": {"name": "学习率缺失", "count": 0, "color": "#95a5a6"},
            "corrupted_loss_record": {"name": "损失记录损坏", "count": 0, "color": "#8e44ad"},
            "renamed_class_record": {"name": "班级名自动命名", "count": 0, "color": "#3498db"},
        }

        severity_counts = {"🔴 高": 0, "🟡 中": 0, "🟢 低": 0}

        for cr in check_results:
            for issue in cr.issues:
                itype = issue.issue_type.value
                if itype in issue_types:
                    issue_types[itype]["count"] += 1

                severity = issue.severity
                if severity == "high":
                    severity_counts["🔴 高"] += 1
                elif severity == "medium":
                    severity_counts["🟡 中"] += 1
                else:
                    severity_counts["🟢 低"] += 1

        ax = axes[0]
        labels = [v["name"] for v in issue_types.values()]
        values = [v["count"] for v in issue_types.values()]
        colors = [v["color"] for v in issue_types.values()]

        non_zero = [(l, v, c) for l, v, c in zip(labels, values, colors) if v > 0]
        if non_zero:
            labels_nz, values_nz, colors_nz = zip(*non_zero)
            bars = ax.bar(labels_nz, values_nz, color=colors_nz, edgecolor="black", linewidth=0.5)
            ax.set_title("问题类型分布", fontsize=12, fontweight="bold")
            ax.set_ylabel("出现次数")
            ax.tick_params(axis="x", rotation=15)

            for bar, val in zip(bars, values_nz):
                ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                       str(val), ha="center", va="bottom", fontweight="bold")

            for i, (label, val, color) in enumerate(non_zero):
                ax.text(i, val / 2, f"{val}", ha="center", va="center",
                       fontweight="bold", color="white", fontsize=14)
        else:
            ax.text(0.5, 0.5, "🎉 没有发现任何问题！",
                   ha="center", va="center", fontsize=16, color="#2ecc71")
            ax.axis("off")

        ax = axes[1]
        labels_sev = list(severity_counts.keys())
        values_sev = list(severity_counts.values())
        colors_sev = ["#e74c3c", "#f39c12", "#2ecc71"]

        non_zero_sev = [(l, v, c) for l, v, c in zip(labels_sev, values_sev, colors_sev) if v > 0]
        if non_zero_sev:
            labels_s, values_s, colors_s = zip(*non_zero_sev)
            wedges, texts, autotexts = ax.pie(
                values_s, labels=labels_s, colors=colors_s,
                autopct="%1.0f%%", startangle=90,
                textprops={"fontsize": 12, "fontweight": "bold"},
                wedgeprops={"edgecolor": "white", "linewidth": 2}
            )
            for autotext in autotexts:
                autotext.set_color("white")
                autotext.set_fontsize(12)
            ax.set_title("严重程度分布", fontsize=12, fontweight="bold")
        else:
            ax.text(0.5, 0.5, "✅ 无问题",
                   ha="center", va="center", fontsize=16, color="#2ecc71")
            ax.axis("off")

        plt.tight_layout()

        filename = os.path.join(self.output_dir, f"issues_breakdown_{timestamp}.png")
        plt.savefig(filename, dpi=150, bbox_inches="tight")
        plt.close(fig)

        self._capture_snapshot("issues_breakdown", {"filename": filename})

        return filename

    def _generate_process_flow_diagram(
        self, process_snapshots: List[Dict], timestamp: str
    ) -> str:
        fig, ax = plt.subplots(figsize=(16, 8))

        stages_order = ["import", "check", "advise", "export", "visualize"]
        stage_names = {
            "import": "1. 数据导入",
            "check": "2. 质量检查",
            "advise": "3. 修正建议",
            "export": "4. 结果导出",
            "visualize": "5. 可视化",
        }

        stage_counts = {stage: 0 for stage in stages_order}
        for snap in process_snapshots:
            stage = snap.get("stage", "unknown")
            if stage in stage_counts:
                stage_counts[stage] += 1

        y_positions = {stage: 5 - i for i, stage in enumerate(stages_order)}

        for stage in stages_order:
            y = y_positions[stage]
            count = stage_counts[stage]
            ax.barh([y], [count], height=0.6, color=f"C{stages_order.index(stage)}",
                   edgecolor="black", linewidth=1, alpha=0.8)
            ax.text(count + 0.5, y, f"{count} 次操作", va="center", fontsize=11, fontweight="bold")
            ax.text(-0.5, y, stage_names[stage], va="center", ha="right", fontsize=12, fontweight="bold")

            if y > 1:
                ax.arrow(count + 2, y - 0.3, 0, -0.4, head_width=0.1, head_length=0.1,
                        fc="gray", ec="gray", linewidth=2)

        ax.set_xlim(-max(stage_counts.values()) * 0.3, max(stage_counts.values()) * 1.3)
        ax.set_ylim(0, 6)
        ax.axis("off")
        ax.set_title("数据处理流程追溯图", fontsize=16, fontweight="bold", pad=20)

        operations_by_stage = {}
        for snap in process_snapshots:
            stage = snap.get("stage", "unknown")
            operation = snap.get("operation", "unknown")
            if stage not in operations_by_stage:
                operations_by_stage[stage] = {}
            if operation not in operations_by_stage[stage]:
                operations_by_stage[stage][operation] = 0
            operations_by_stage[stage][operation] += 1

        ops_text = ["各阶段操作明细：\n"]
        for stage in stages_order:
            if stage in operations_by_stage and operations_by_stage[stage]:
                ops_text.append(f"\n{stage_names[stage]}:")
                for op, cnt in operations_by_stage[stage].items():
                    ops_text.append(f"  - {op}: {cnt} 次")

        ax.text(0.02, 0.02, "\n".join(ops_text),
               transform=ax.transAxes, fontsize=9, va="bottom",
               bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.7))

        plt.tight_layout()

        filename = os.path.join(self.output_dir, f"process_flow_{timestamp}.png")
        plt.savefig(filename, dpi=150, bbox_inches="tight")
        plt.close(fig)

        self._capture_snapshot("process_flow", {"filename": filename})

        return filename

    def _capture_snapshot(self, operation: str, data: Dict) -> None:
        self.visualization_snapshots.append({
            "stage": "visualize",
            "operation": operation,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        })

    def get_visualization_snapshots(self) -> List[Dict]:
        return self.visualization_snapshots
