"""报告生成模块

保证三点：
1. 所有文字、表格、图表都从同一份 ProcessingRecord 读取，口径一致；
2. 提供一段"普通话解释"，数据分析员可以直接复制给同事；
3. 每条异常/告警都附上参数表和处理意见，方便顺着异常回溯。
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
from tabulate import tabulate

from .records import BatchProcessor, ProcessingRecord
from .visualization import MarkovVisualizer


def _plain_text_interpretation(rec: ProcessingRecord) -> str:
    """生成一段普通话解释，数据分析员可直接复制给同事。"""
    lines: List[str] = []
    lines.append(f"【模型概览】 本次分析的模型 '{rec.label}'（记录ID：{rec.record_id}）共包含 {len(rec.states)} 个状态：{'、'.join(rec.states)}。")

    if rec.status == "failed":
        err = rec.error or {}
        lines.append(
            f"【计算未完成】 该样例因为『{err.get('message', '未知原因')}』未能完成计算。"
            f"建议：{err.get('suggestion', '请核对原始数据。')}"
        )
        return "\n".join(lines)

    # 初始分布
    init = rec.param_snapshot.get("initial_dist", {})
    init_parts = [f"{k} 占 {v*100:.1f}%" for k, v in init.items() if v > 0]
    lines.append("【起点】 初始分布为：" + ("、".join(init_parts) if init_parts else "均匀分布") + "。")

    # 稳态
    ss_df = rec.steady_state_df()
    if ss_df is not None and len(ss_df) > 0:
        top = ss_df.iloc[0]
        lines.append(
            f"【长期趋势】 经过足够多步后，系统会收敛到一个稳定的状态分布，"
            f"其中 '{top['状态']}' 出现的概率最高，约为 {top['稳态概率']*100:.1f}%。"
        )
        info = rec.results.get("steady_info", {})
        if not info.get("converged", True):
            lines.append(
                "【注意】 本次迭代尚未完全收敛，建议增大迭代步数或检查矩阵是否存在周期性。"
            )

    # 分布演化
    series_df = rec.distribution_df()
    if series_df is not None and len(series_df) >= 2:
        first = series_df.iloc[0]
        last = series_df.iloc[-1]
        changed = []
        for s in rec.states:
            delta = float(last[s] - first[s])
            if abs(delta) >= 0.01:
                direction = "上升" if delta > 0 else "下降"
                changed.append(f"{s} {direction} 约 {abs(delta)*100:.1f} 个百分点")
        if changed:
            lines.append("【演化过程】 在观察期内：" + "，".join(changed) + "。")
        else:
            lines.append("【演化过程】 在观察期内各状态占比变化不大，系统较为稳定。")

    # 典型路径
    path = rec.results.get("simulate_path")
    if path:
        uniq = []
        for s in path:
            if not uniq or uniq[-1] != s:
                uniq.append(s)
        lines.append(
            "【一次随机模拟】 随机模拟 20 步的典型访问顺序为："
            + " → ".join(uniq[:12]) + (" ……" if len(uniq) > 12 else "") + "。"
        )

    if rec.status == "warning":
        lines.append("【复核提示】 本条记录带有告警，请查阅文末的告警与处理意见。")

    lines.append("以上结论与附图、附表使用同一份计算结果，可交叉核对。")
    return "\n".join(lines)


def _df_to_table(df: pd.DataFrame, floatfmt: str = ".4f") -> str:
    return tabulate(df, headers="keys", tablefmt="github", floatfmt=floatfmt, showindex=False)


class ReportGenerator:
    """基于 BatchProcessor 生成 Markdown 报告"""

    def __init__(self, out_dir: str = "output") -> None:
        self.out_dir = out_dir
        self.fig_dir = os.path.join(out_dir, "figures")
        os.makedirs(self.fig_dir, exist_ok=True)
        self.visualizer = MarkovVisualizer(self.fig_dir)

    # ------------------------------------------------------------------
    # 单条记录的报告片段
    # ------------------------------------------------------------------
    def _record_section(self, rec: ProcessingRecord, fig_paths: Dict[str, str]) -> str:
        lines: List[str] = []
        status_icon = {"success": "✅", "warning": "⚠️", "failed": "❌"}.get(rec.status, "⏳")
        lines.append(f"\n## {status_icon} {rec.label}  （记录ID：`{rec.record_id}`）\n")
        lines.append(f"- 处理状态：**{rec.status}**")
        lines.append(f"- 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        lines.append("\n### 📝 普通话解释（可直接复制）\n")
        lines.append("```\n" + _plain_text_interpretation(rec) + "\n```\n")

        if rec.status in ("success", "warning"):
            lines.append("### 📊 参数表\n")
            snap = rec.param_snapshot
            lines.append(f"- 模型ID：`{snap.get('id')}`")
            lines.append(f"- 状态列表：{', '.join(snap.get('states', []))}")
            init_df = pd.DataFrame([
                {"状态": k, "初始概率": v}
                for k, v in snap.get("initial_dist", {}).items()
            ])
            lines.append("\n**初始分布：**\n")
            lines.append(_df_to_table(init_df))

            t1 = rec.transition_df(1)
            if t1 is not None:
                lines.append("\n**一步转移矩阵 P：**\n")
                lines.append(_df_to_table(t1.reset_index().rename(columns={"index": "状态\\下一步"})))

            lines.append("\n### 📈 计算结果表格\n")
            ss_df = rec.steady_state_df()
            if ss_df is not None:
                lines.append("**稳态分布（按概率从高到低）：**\n")
                lines.append(_df_to_table(ss_df))

            dist_df = rec.distribution_df()
            if dist_df is not None:
                last = dist_df.iloc[-1:].copy()
                last.insert(0, "步数", [len(dist_df) - 1])
                lines.append(f"\n**第 {len(dist_df)-1} 步状态分布：**\n")
                lines.append(_df_to_table(last))

            path = rec.results.get("simulate_path")
            if path:
                lines.append("\n**一次模拟路径（20 步）：**\n")
                lines.append(" → ".join(path))

            lines.append("\n### 🖼 附图\n")
            rel_fig_dir = os.path.relpath(self.fig_dir, self.out_dir)
            for name, p in fig_paths.items():
                caption = {
                    "distribution_series": "图 1  状态分布随时间演化",
                    "steady_state": "图 2  稳态分布柱状图",
                    "transition_graph": "图 3  状态转移有向图",
                }.get(name, name)
                lines.append(f"![{caption}]({rel_fig_dir}/{os.path.basename(p)})\n")
                lines.append(f"*{caption}*\n")

        # 异常 / 告警 / 复核意见
        if rec.status == "failed" or rec.status == "warning" or rec.review_notes:
            lines.append("\n### 🔍 异常 / 告警 / 复核意见\n")
            if rec.error:
                err = rec.error
                lines.append(f"- **错误类型**：{err.get('error_type')}")
                lines.append(f"- **错误说明**：{err.get('message')}")
                lines.append(f"- **处理意见**：{err.get('suggestion')}")
                ctx = err.get("context", {})
                if ctx:
                    lines.append("- **参数快照（可顺着回溯）**：")
                    for k, v in ctx.items():
                        lines.append(f"  - `{k}`: `{v}`")
            if rec.status == "warning":
                info = rec.results.get("steady_info", {})
                if "warning" in info:
                    lines.append(f"- **告警说明**：{info['warning']}")
                if "suggestion" in info:
                    lines.append(f"- **处理意见**：{info['suggestion']}")
            for note in rec.review_notes:
                lines.append(f"- {note}")

        lines.append(f"\n---\n")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # 批量报告
    # ------------------------------------------------------------------
    def generate(self, batch: BatchProcessor, filename: str = "report.md") -> str:
        lines: List[str] = []
        lines.append(f"# 马尔可夫链课堂模拟 —— 批量分析报告\n")
        lines.append(f"- **批次**：{batch.batch_label}（批次ID：`{batch.batch_id}`）")
        lines.append(f"- **生成时间**：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"- **样例总数**：{len(batch.records)}")
        lines.append(f"  - ✅ 成功：{len(batch.successful())}")
        lines.append(f"  - ❌ 失败：{len(batch.failed())}")

        # 批量概览表
        lines.append("\n## 📋 批量概览\n")
        overview_rows = []
        for rec in batch.records:
            err = rec.error or {}
            overview_rows.append({
                "记录ID": rec.record_id,
                "标签": rec.label,
                "状态": rec.status,
                "错误/告警": err.get("message", "") or (
                    "收敛告警" if rec.status == "warning" else ""
                ),
            })
        lines.append(_df_to_table(pd.DataFrame(overview_rows), floatfmt=""))

        # 缺口清单
        gaps = batch.gaps_summary()
        if len(gaps) > 0:
            lines.append("\n## ⚠️ 缺口清单（供数据分析员补数）\n")
            lines.append("以下样例未能完成计算，请按处理意见补齐或修正后重跑。\n")
            lines.append(_df_to_table(gaps, floatfmt=""))

        # 每条记录的详细报告
        lines.append("\n## 📑 各记录详细分析\n")
        for rec in batch.records:
            fig_paths = self.visualizer.plot_all(rec) if rec.status != "failed" else {}
            lines.append(self._record_section(rec, fig_paths))

        # 复核入口说明
        lines.append("\n## 🔧 复核入口\n")
        lines.append(
            "如需复核或修正某条记录：\n"
            "1. 记下该条的 **记录ID**（见上方表格或各章节标题）；\n"
            "2. 在命令行工具中执行 `python main.py review <记录ID>`，可重跑并覆盖参数；\n"
            "3. 复核意见会自动写入该条记录，生成的新报告中会同步显示。\n"
        )
        lines.append(
            "所有图表、表格、文字说明均基于同一份 `ProcessingRecord` 计算结果，"
            "不存在各算各的情况；顺着任何一条异常均可在本节中找到参数快照和处理意见。"
        )

        out_path = os.path.join(self.out_dir, filename)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return out_path
