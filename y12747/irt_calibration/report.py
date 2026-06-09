import os
import json
import math
from typing import Dict, List, Any, Optional
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from .models import ProcessingRecord, RecordStatus


plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "PingFang SC", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


class ReportGenerator:
    def __init__(self, record: ProcessingRecord, output_dir: str):
        self.record = record
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.assets_dir = os.path.join(output_dir, "assets")
        os.makedirs(self.assets_dir, exist_ok=True)

    def generate_all(self) -> str:
        self._plot_item_curve()
        self._plot_difficulty_histogram()
        self._plot_ability_distribution()
        self._plot_icc_curves()
        draft_path = self._save_calculation_draft()
        md_path = self._write_markdown_report()
        self._save_processing_json()
        return md_path

    def _plot_item_curve(self) -> str:
        r = self.record
        items = sorted([(iid, it) for iid, it in r.items.items() if it.difficulty is not None],
                       key=lambda x: x[1].difficulty)
        if not items:
            return ""

        labels = [f"{it.item_name}" for _, it in items]
        diffs = [it.difficulty for _, it in items]
        rates = [it.correct_rate if it.correct_rate is not None else 0 for _, it in items]

        fig, ax1 = plt.subplots(figsize=(max(8, len(items) * 0.6), 5))
        x = np.arange(len(items))
        bars = ax1.bar(x, diffs, color="#4C78A8", alpha=0.8, label="IRT难度b")
        ax1.axhline(0, color="gray", linestyle="--", linewidth=0.8)
        ax1.set_ylabel("难度参数 b (越大越难)")
        ax1.set_xticks(x)
        ax1.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)

        ax2 = ax1.twinx()
        ax2.plot(x, rates, color="#E45756", marker="o", linewidth=2, label="正确率")
        ax2.set_ylabel("正确率")
        ax2.set_ylim(0, 1.05)

        for i, (bar, rate) in enumerate(zip(bars, rates)):
            ax1.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.03,
                     f"{diffs[i]:.2f}", ha="center", va="bottom", fontsize=7, color="#4C78A8")
            ax2.text(i, rate + 0.02, f"{rate:.0%}", ha="center", fontsize=7, color="#E45756")

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc="upper left", fontsize=8)

        ax1.set_title(f"课程题目 IRT 难度 vs 正确率 (批次 {r.batch_id})")
        fig.tight_layout()
        path = os.path.join(self.assets_dir, "difficulty_vs_rate.png")
        fig.savefig(path, dpi=150)
        plt.close(fig)
        return path

    def _plot_difficulty_histogram(self) -> str:
        r = self.record
        diffs = [it.difficulty for it in r.items.values() if it.difficulty is not None]
        if not diffs:
            return ""

        fig, ax = plt.subplots(figsize=(7, 4.5))
        bins = np.linspace(-3, 3, 13)
        ax.hist(diffs, bins=bins, color="#72B7B2", edgecolor="white", alpha=0.9)
        ax.axvline(np.mean(diffs), color="#E45756", linestyle="--",
                   label=f"平均难度={np.mean(diffs):.2f}")
        ax.axvline(0, color="gray", linestyle=":", linewidth=0.8, label="0 (中等难度)")
        ax.set_xlabel("IRT 难度参数 b")
        ax.set_ylabel("题目数量")
        ax.set_title("题目难度分布直方图")
        ax.legend(fontsize=9)
        fig.tight_layout()
        path = os.path.join(self.assets_dir, "difficulty_histogram.png")
        fig.savefig(path, dpi=150)
        plt.close(fig)
        return path

    def _plot_ability_distribution(self) -> str:
        r = self.record
        abilities = [s.ability for s in r.students.values() if s.ability is not None]
        if not abilities:
            return ""

        fig, ax = plt.subplots(figsize=(7, 4.5))
        bins = np.linspace(-4, 4, 17)
        ax.hist(abilities, bins=bins, color="#F58518", edgecolor="white", alpha=0.9)
        ax.axvline(np.mean(abilities), color="#4C78A8", linestyle="--",
                   label=f"平均能力={np.mean(abilities):.2f}")
        ax.axvline(0, color="gray", linestyle=":", linewidth=0.8, label="0 (样本平均)")
        ax.set_xlabel("学生能力 θ")
        ax.set_ylabel("学生人数")
        ax.set_title("学生能力分布直方图")
        ax.legend(fontsize=9)
        fig.tight_layout()
        path = os.path.join(self.assets_dir, "ability_distribution.png")
        fig.savefig(path, dpi=150)
        plt.close(fig)
        return path

    def _plot_icc_curves(self) -> str:
        r = self.record
        items = [it for it in r.items.values() if it.difficulty is not None]
        if not items:
            return ""

        n_curves = min(8, len(items))
        selected = items[:n_curves]

        theta = np.linspace(-3, 3, 200)
        fig, ax = plt.subplots(figsize=(8, 5))
        colors = plt.cm.tab10(np.linspace(0, 1, n_curves))

        for idx, it in enumerate(selected):
            p = 1.0 / (1.0 + np.exp(-(theta - it.difficulty)))
            ax.plot(theta, p, color=colors[idx], linewidth=1.8,
                    label=f"{it.item_name} (b={it.difficulty:.2f})")

        ax.axhline(0.5, color="gray", linestyle=":", linewidth=0.8)
        ax.axvline(0, color="gray", linestyle=":", linewidth=0.8)
        ax.set_xlabel("学生能力 θ")
        ax.set_ylabel("答对概率 P(θ)")
        ax.set_title(f"题目特征曲线 ICC (前{n_curves}题)")
        ax.set_ylim(-0.02, 1.02)
        ax.legend(fontsize=8, loc="center left", bbox_to_anchor=(1.0, 0.5))
        fig.tight_layout()
        path = os.path.join(self.assets_dir, "icc_curves.png")
        fig.savefig(path, dpi=150)
        plt.close(fig)
        return path

    def _save_calculation_draft(self) -> str:
        r = self.record
        rows = []
        for a in r.student_answers:
            if a.is_correct is None:
                continue
            stu = r.students.get(a.student_id)
            it = r.items.get(a.item_id)
            if not stu or not it or stu.ability is None or it.difficulty is None:
                continue
            xb = stu.ability - it.difficulty
            p = 1.0 / (1.0 + math.exp(-xb)) if xb >= 0 else math.exp(xb) / (1.0 + math.exp(xb))
            residual = a.is_correct - p
            rows.append({
                "学生ID": a.student_id,
                "题目ID": a.item_id,
                "题目名称": it.item_name,
                "学生能力θ": round(stu.ability, 4),
                "题目难度b": round(it.difficulty, 4),
                "θ-b": round(xb, 4),
                "预测答对概率P": round(p, 4),
                "实际对错(1/0)": a.is_correct,
                "残差(实际-预测)": round(residual, 4),
                "数据来源": a.source
            })

        if rows:
            df = pd.DataFrame(rows)
            csv_path = os.path.join(self.assets_dir, "calculation_draft.csv")
            df.to_csv(csv_path, index=False, encoding="utf-8-sig")
        return os.path.join(self.assets_dir, "calculation_draft.csv")

    def _save_processing_json(self) -> str:
        path = os.path.join(self.assets_dir, "processing_record.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.record.to_dict(), f, ensure_ascii=False, indent=2, default=str)
        return path

    def _write_markdown_report(self) -> str:
        r = self.record
        md_path = os.path.join(self.output_dir, "IRT校准报告.md")

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(self._render_report())

        return md_path

    def _render_report(self) -> str:
        r = self.record
        lines: List[str] = []

        lines.append("# 课程难度 IRT 校准报告")
        lines.append("")
        lines.append(f"> 报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"> 批次号: {r.batch_id}  |  处理记录ID: {r.record_id}")
        lines.append(f"> 原始数据来源: {', '.join(r.raw_materials_ref) if r.raw_materials_ref else '未记录'}")
        lines.append("")

        lines.append("## 一、普通话解读（可直接转发同事）")
        lines.append("")
        lines.append(self._plain_language_summary())
        lines.append("")

        lines.append("## 二、样本概览")
        lines.append("")
        lines.append("| 指标 | 数值 | 说明 |")
        lines.append("|------|------|------|")
        lines.append(f"| 学生总数 | {len(r.students)} | 参与答题的学生 |")
        lines.append(f"| 题目总数 | {len(r.items)} | 被作答的题目 |")
        lines.append(f"| 有效答题记录 | {r.valid_answer_count} | 答案完整、可参与计算 |")
        lines.append(f"| 排除/缺失记录 | {r.excluded_answer_count} | 答案缺失或字段不全 |")
        lines.append(f"| 需风控补录缺口 | {r.gap_count} | 已单独导出缺口清单 |")
        lines.append(f"| 模型方法 | 1PL/Rasch | 单参数逻辑斯蒂模型，难度参数b |")
        lines.append("")

        lines.append("## 三、题目难度排序表（与图1对应）")
        lines.append("")
        items_sorted = sorted(
            [(iid, it) for iid, it in r.items.items()],
            key=lambda x: (x[1].difficulty if x[1].difficulty is not None else 999)
        )
        lines.append("| 排名 | 题目ID | 题目名称 | IRT难度b | 正确率 | 作答人数 | 稳定性标记 |")
        lines.append("|------|--------|----------|----------|--------|----------|------------|")
        unstable = r.irt_params.get("unstable_items", [])
        for rank, (iid, it) in enumerate(items_sorted, 1):
            b_str = f"{it.difficulty:.3f}" if it.difficulty is not None else "NA"
            rate_str = f"{it.correct_rate:.1%}" if it.correct_rate is not None else "NA"
            flag = "⚠️排序不稳" if iid in unstable else ""
            lines.append(f"| {rank} | {iid} | {it.item_name} | {b_str} | {rate_str} | {it.response_count} | {flag} |")
        lines.append("")

        lines.append("## 四、学生能力排序表（与图3对应）")
        lines.append("")
        stu_sorted = sorted(
            [(sid, s) for sid, s in r.students.items()],
            key=lambda x: (x[1].ability if x[1].ability is not None else -999),
            reverse=True
        )
        lines.append("| 排名 | 学生ID | 能力θ | 标准误SE | 有效答题数 |")
        lines.append("|------|--------|-------|----------|------------|")
        for rank, (sid, s) in enumerate(stu_sorted, 1):
            theta = f"{s.ability:.3f}" if s.ability is not None else "NA"
            se = f"{s.ability_se:.3f}" if s.ability_se is not None else "NA"
            lines.append(f"| {rank} | {sid} | {theta} | {se} | {s.valid_answers} |")
        lines.append("")

        lines.append("## 五、图表")
        lines.append("")
        lines.append("### 图1：题目难度 vs 正确率（与第三节排序表对应）")
        lines.append("")
        lines.append("![题目难度 vs 正确率](assets/difficulty_vs_rate.png)")
        lines.append("")
        lines.append("说明：蓝色柱为IRT难度参数b，越大越难；红色折线为实际正确率。")
        lines.append("两者应当呈负相关——难度越高，正确率越低。")
        lines.append("")

        lines.append("### 图2：题目难度分布直方图")
        lines.append("")
        lines.append("![题目难度分布](assets/difficulty_histogram.png)")
        lines.append("")
        lines.append("### 图3：学生能力分布直方图（与第四节排序表对应）")
        lines.append("")
        lines.append("![学生能力分布](assets/ability_distribution.png)")
        lines.append("")
        lines.append("### 图4：题目特征曲线 ICC（Item Characteristic Curve）")
        lines.append("")
        lines.append("![ICC曲线](assets/icc_curves.png)")
        lines.append("")
        lines.append("说明：每条曲线代表一道题，横坐标为学生能力θ，纵坐标为该生答对此题的概率。")
        lines.append("曲线越靠左，说明题目越简单；越靠右，题目越难。")
        lines.append("")

        lines.append("## 六、约束校验（与误差分析共用同一批处理记录）")
        lines.append("")
        lines.append("| 校验项 | 结果 | 详细说明 | 级别 |")
        lines.append("|--------|------|----------|------|")
        for c in r.constraint_checks:
            icon = "✅ 通过" if c["passed"] else "⚠️ 未通过"
            lines.append(f"| {c['name']} | {icon} | {c['detail']} | {c['level']} |")
        lines.append("")

        lines.append("## 七、误差分析")
        lines.append("")
        lines.append("| 指标 | 数值 | 单位 | 说明 |")
        lines.append("|------|------|------|------|")
        for e in r.error_analysis:
            lines.append(f"| {e['name']} | {e['value']} | {e['unit']} | {e['detail']} |")
        lines.append("")

        lines.append("## 八、问题清单（风控复核入口）")
        lines.append("")
        if r.issues:
            lines.append("| 问题ID | 类型 | 严重度 | 描述 | 处理建议 | 状态 |")
            lines.append("|--------|------|--------|------|----------|------|")
            for i in r.issues:
                status = "✅已解决" if i.resolved else ("👀已复核" if i.reviewed else "🔴待处理")
                note = f"（复核意见：{i.review_note}）" if i.review_note else ""
                lines.append(f"| {i.issue_id} | {i.issue_type.value} | {i.severity} | "
                             f"{i.description} | {i.suggestion} | {status}{note} |")
        else:
            lines.append("本次未检测到异常问题。")
        lines.append("")

        if r.review_notes:
            lines.append("## 九、复核操作记录")
            lines.append("")
            lines.append("| 时间 | 操作人 | 动作 | 说明 |")
            lines.append("|------|--------|------|------|")
            for n in r.review_notes:
                lines.append(f"| {n.get('time','')} | {n.get('reviewer','系统')} | {n.get('action','')} | {n.get('note','')} |")
            lines.append("")

        lines.append("## 十、计算草稿与溯源")
        lines.append("")
        lines.append("- 逐题逐生计算草稿（含θ、b、P(θ)、残差）：`assets/calculation_draft.csv`")
        lines.append("- 完整处理记录JSON（含校验、误差、问题、参数）：`assets/processing_record.json`")
        lines.append("- 缺口补录清单（单独导出）：见风控分析师缺口文件")
        lines.append("")
        lines.append("**异常回溯指引**：顺着任一问题ID → 看第八节中的关联学生/题目 → "
                     "打开calculation_draft.csv过滤该学生或题目 → 对照processing_record.json中的raw_materials追溯原始导入行。")
        lines.append("")

        return "\n".join(lines)

    def _plain_language_summary(self) -> str:
        r = self.record
        diffs = [it.difficulty for it in r.items.values() if it.difficulty is not None]
        abilities = [s.ability for s in r.students.values() if s.ability is not None]
        fit = r.irt_params.get("model_fit", {})
        unresolved = sum(1 for i in r.issues if not i.resolved)
        unstable = len(r.irt_params.get("unstable_items", []))

        parts = []
        parts.append(
            f"各位同事好：本批次共收集 {len(r.students)} 名学生对 {len(r.items)} 道题的答题数据，"
            f"其中 {r.valid_answer_count} 条记录完整可用，{r.gap_count} 条因答案缺失交由风控补录，"
            f"已不影响本次计算。"
        )

        if diffs:
            min_b, max_b = min(diffs), max(diffs)
            avg_b = sum(diffs) / len(diffs)
            parts.append(
                f"题目难度方面：最易题 b={min_b:.2f}，最难题 b={max_b:.2f}，平均 b={avg_b:.2f}。"
                f"难度跨度约 {max_b - min_b:.2f} 个 logit，"
                + ("难度分布较均匀。" if (max_b - min_b) > 1.5 else "整体难度偏集中，建议补充更有区分度的题目。")
            )

        if abilities:
            high = sum(1 for a in abilities if a > 1)
            low = sum(1 for a in abilities if a < -1)
            parts.append(
                f"学生能力方面：能力值 θ > 1 的优等生 {high} 人，θ < -1 的薄弱生 {low} 人，"
                f"其余 {len(abilities) - high - low} 人处于中等水平。"
            )

        if fit.get("rmse") is not None:
            parts.append(
                f"模型拟合 RMSE={fit['rmse']:.3f}（概率尺度，0~1），"
                + ("拟合良好，可作为排课和题目筛选依据。" if fit["rmse"] < 0.35
                   else "拟合一般，建议结合人工复核使用。")
            )

        if unresolved > 0 or unstable > 0:
            parts.append(
                f"注意：当前仍有 {unresolved} 条问题未处理、{unstable} 道题排序存在波动，"
                f"风控分析师可通过复核入口修正后重新校准。"
            )
        else:
            parts.append("本次未遗留未处理问题，结果稳定可用于决策。")

        return " ".join(parts)
