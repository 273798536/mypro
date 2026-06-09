from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from .processor import ProcessResult


class FriendlyExporter:
    def __init__(self, output_dir: Path):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_all(self, result: ProcessResult, timestamp: str = "") -> None:
        self._export_summary(result, timestamp)
        self._export_merged_ledger(result)
        self._export_blank_missing_report(result)
        self._export_ph_report(result)
        self._export_ph_switch_diff(result)
        self._export_other_issues(result)
        self._export_readme(result, timestamp)

    def _export_summary(self, result: ProcessResult, timestamp: str) -> None:
        lines = []
        lines.append("=" * 60)
        lines.append("        有机反应收率台账 —— 整理摘要")
        lines.append("=" * 60)
        if timestamp:
            lines.append(f"整理时间：{timestamp}")
        lines.append(f"pH 判定模式：{'严格模式' if result.strict_ph else '宽松模式'}")
        lines.append("")
        lines.append("一、数据来源文件：")
        for i, src in enumerate(result.source_files, 1):
            lines.append(f"  {i}. {src}")
        lines.append("")
        lines.append("二、统计概览：")
        lines.append(f"  总记录数       ：{result.total_records}")
        lines.append(f"  正常记录数     ：{result.normal_count}")
        lines.append(f"  异常记录数     ：{result.abnormal_count}")
        lines.append(f"  pH 越界记录数  ：{result.ph_out_of_range_count}")
        lines.append(f"  空白对照缺失   ：{result.blank_missing_count}")
        lines.append(f"  其他问题数     ：{len(result.other_issues)}")
        lines.append("")
        if result.ph_switch_diff:
            lines.append("三、pH 判定模式切换会改变结果的批次：")
            for d in result.ph_switch_diff:
                lines.append(f"  - 批次 {d.get('批次号')}："
                              f" pH={d.get('pH')}  宽松→合格  严格→异常")
            lines.append("")
        lines.append("=" * 60)
        lines.append("")
        (self.output_dir / "00_整理摘要.txt").write_text(
            "\n".join(lines), encoding="utf-8"
        )

    def _export_merged_ledger(self, result: ProcessResult) -> None:
        df = result.merged_data.copy()
        if "_原始顺序" in df.columns:
            df = df.drop(columns=["_原始顺序"])
        out_cols = [c for c in df.columns if not c.startswith("_")]
        show_cols = out_cols if out_cols else list(df.columns)
        df_show = df[show_cols].copy() if show_cols else df
        df_show.insert(0, "序号", range(1, len(df_show) + 1))
        xlsx_path = self.output_dir / "01_合并台账.xlsx"
        df_show.to_excel(xlsx_path, index=False)
        csv_path = self.output_dir / "01_合并台账.csv"
        df_show.to_csv(csv_path, index=False, encoding="utf-8-sig")

    def _to_df(self, records: list[dict]) -> pd.DataFrame:
        if not records:
            return pd.DataFrame()
        return pd.DataFrame(records)

    def _write_xlsx_csv(self, df: pd.DataFrame, base_name: str, title: str) -> None:
        if df.empty:
            note = pd.DataFrame([{"说明": f"本文件无相关记录"}])
            note.to_excel(self.output_dir / f"{base_name}.xlsx", index=False)
            note.to_csv(self.output_dir / f"{base_name}.csv", index=False, encoding="utf-8-sig")
            return
        df.to_excel(self.output_dir / f"{base_name}.xlsx", index=False)
        df.to_csv(self.output_dir / f"{base_name}.csv", index=False, encoding="utf-8-sig")

    def _export_ph_report(self, result: ProcessResult) -> None:
        records = []
        for item in result.ph_anomalies:
            records.append({
                "序号": item.get("序号"),
                "批次号": item.get("批次号"),
                "pH 测量值": item.get("pH 测量值", item.get("pH原始值")),
                "问题类型": item.get("问题类型") or ("pH 越界"),
                "严格模式允许范围": item.get("允许范围(严格)") or "",
                "宽松模式允许范围": item.get("允许范围(宽松)") or "",
                "当前判定模式": item.get("判定模式") or ("严格" if result.strict_ph else "宽松"),
                "判定结果": item.get("判定结果"),
                "对收率的影响": item.get("对收率的影响"),
                "处理建议": item.get("处理建议"),
            })
        self._write_xlsx_csv(self._to_df(records), "02_pH越界报告", "pH越界报告")

    def _export_blank_missing_report(self, result: ProcessResult) -> None:
        records = []
        for item in result.blank_missing:
            records.append({
                "序号": item.get("序号"),
                "批次号": item.get("批次号"),
                "问题类型": "空白对照缺失",
                "具体原因": item.get("具体原因"),
                "原始记录值": item.get("原始值", "(空)"),
                "对收率的影响": item.get("对收率的影响"),
                "处理建议": item.get("处理建议"),
            })
        self._write_xlsx_csv(self._to_df(records), "03_空白对照缺失报告", "空白对照缺失报告")

    def _export_ph_switch_diff(self, result: ProcessResult) -> None:
        records = []
        for item in result.ph_switch_diff:
            records.append({
                "序号": item.get("序号"),
                "批次号": item.get("批次号"),
                "谱图编号": item.get("谱图编号"),
                "pH 值": item.get("pH"),
                "宽松模式判定": item.get("宽松模式判定"),
                "严格模式判定": item.get("严格模式判定"),
                "谱图判读前后差别": item.get("谱图判读前后差别"),
                "建议操作": item.get("建议操作"),
            })
        self._write_xlsx_csv(self._to_df(records), "04_pH模式切换影响", "pH模式切换影响")

    def _export_other_issues(self, result: ProcessResult) -> None:
        self._write_xlsx_csv(self._to_df(result.other_issues), "05_其他问题", "其他问题报告")

    def _export_readme(self, result: ProcessResult, timestamp: str) -> None:
        lines = []
        lines.append("# 有机反应收率台账 输出说明")
        lines.append("")
        lines.append(f"生成时间：{timestamp or '未知'}")
        lines.append("")
        lines.append("## 文件说明")
        lines.append("")
        lines.append("| 文件名 | 说明 |")
        lines.append("| --- | --- |")
        lines.append("| `00_整理摘要.txt | 人读的摘要，一眼能看到统计数据和关键异常概况（不懂代码也能看 |")
        lines.append("| `01_合并台账.xlsx / .csv | 合并后的完整台账（旧表+补录，按批次去重，留最新 |")
        lines.append("| `02_pH越界报告.xlsx / .csv | pH不在范围内的批次，含判定结果与处理建议 |")
        lines.append("| `03_空白对照缺失报告.xlsx / .csv | 缺空白对照的批次，含原因、对收率影响、处理建议 |")
        lines.append("| `04_pH模式切换影响.xlsx / .csv | 严格/宽松 pH 判定差异，含谱图判读前后差别 |")
        lines.append("| `05_其他问题报告.xlsx / .csv | 单位缺失等其他问题 |")
        lines.append("")
        lines.append("## pH 判定规则")
        lines.append("")
        lines.append("- 严格模式 pH 允许范围：6.5 ~ 7.5")
        lines.append("- 宽松模式 pH 允许范围：6.5 ~ 8.0")
        lines.append("- 当 pH 在 7.5 ~ 8.0 之间时，严格模式判异常，宽松模式判合格——此时会写入 04 表，并给出谱图判读差别记录。")
        lines.append("")
        lines.append("## 幂等说明")
        lines.append("")
        lines.append("同一输入目录重复运行，只要文件没有变化，工具会跳过处理。要强制重跑请加 `--force`。")
        lines.append("")
        (self.output_dir / "输出说明.md").write_text("\n".join(lines), encoding="utf-8")
