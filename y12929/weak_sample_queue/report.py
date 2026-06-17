import json
import csv
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

from .config import EXPORT_DIR
from .sample_processor import WeakSample


class ReportExporter:
    def __init__(self, export_dir: Path = EXPORT_DIR):
        self.export_dir = export_dir
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def _file_path(self, name: str, ext: str) -> Path:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        return self.export_dir / f"{name}_{ts}.{ext}"

    def export_json(self, samples: List[WeakSample], include_history: bool = True) -> Path:
        path = self._file_path("weak_samples_report", "json")
        data = []
        for s in samples:
            entry = {
                "sample_id": s.sample_id,
                "source": s.source,
                "status": s.status,
                "grayscale_score": s.grayscale_score,
                "grayscale_evidence": s.grayscale_evidence,
                "human_note": s.human_note,
                "text_preview": s.text[:300] + ("..." if len(s.text) > 300 else ""),
                "text_length": len(s.text),
                "truncation_info": s.truncation_info,
                "rule_hits": s.rule_hits,
                "created_at": s.created_at,
                "processed_at": s.processed_at,
            }
            if include_history:
                entry["review_history"] = s.review_history
            data.append(entry)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return path

    def export_csv(self, samples: List[WeakSample]) -> Path:
        path = self._file_path("weak_samples_report", "csv")
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "样本ID",
                "状态",
                "来源",
                "灰度评分",
                "文本长度",
                "是否被截断拦截",
                "拦截原因简述",
                "命中规则",
                "人工备注(原句保留)",
                "文本预览",
                "处理时间",
            ])
            for s in samples:
                truncated = s.truncation_info.get("is_truncated", False)
                block_reason = ""
                if truncated:
                    ti = s.truncation_info
                    block_reason = (
                        f"原文{ti['original_length']}字 超上限{ti['max_allowed']}字 "
                        f"溢出{ti['overflow_chars']}字，系统避免截断导致语义丢失自动转人工"
                    )
                rule_names = "; ".join([h["rule_name"] for h in s.rule_hits]) if s.rule_hits else "-"
                writer.writerow([
                    s.sample_id,
                    s.status,
                    s.source,
                    s.grayscale_score,
                    len(s.text),
                    "是" if truncated else "否",
                    block_reason,
                    rule_names,
                    s.human_note,
                    s.text[:120] + ("..." if len(s.text) > 120 else ""),
                    s.processed_at,
                ])
        return path

    def export_business_markdown(self, samples: List[WeakSample]) -> Path:
        path = self._file_path("business_report", "md")
        total = len(samples)
        truncated = [s for s in samples if s.truncation_info.get("is_truncated", False)]
        needs_review = [s for s in samples if s.status == "needs_review"]
        passed = [s for s in samples if s.status == "passed"]
        rejected = [s for s in samples if s.status == "rejected"]

        lines = []
        lines.append("# 弱项样本补采队列 — 业务方可读报告")
        lines.append("")
        lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"**样本总数**: {total}")
        lines.append("")
        lines.append("## 一、概览")
        lines.append("")
        lines.append(f"| 状态 | 数量 | 说明 |")
        lines.append(f"| --- | --- | --- |")
        lines.append(f"| ✅ 通过(passed) | {len(passed)} | 灰度评分达阈值，自动放行 |")
        lines.append(f"| ⚠️ 待人工确认(needs_review) | {len(needs_review)} | 含长文本截断或评分在灰区 |")
        lines.append(f"| ❌ 拒绝(rejected) | {len(rejected)} | 评分过低或命中强规则 |")
        lines.append("")
        lines.append("## 二、长文本截断拦截说明（重点）")
        lines.append("")
        lines.append(
            "**为什么被拦**：当样本字数超过系统最大长度阈值（默认 500 字）时，"
            "模型侧需要截断才能输入。截断位置若落在语义中段，会丢失上下文，"
            "导致后续评测标注结果失真。因此系统默认把超长样本转人工复核，"
            "由标注同学手动选择保留片段，而不是自动截断。"
        )
        lines.append("")
        if truncated:
            lines.append(f"**本次共 {len(truncated)} 条超长样本被拦截**：")
            lines.append("")
            for s in truncated:
                ti = s.truncation_info
                lines.append(f"### 样本 `{s.sample_id}`")
                lines.append("")
                lines.append(f"- **来源**: {s.source}")
                lines.append(f"- **原文长度**: {ti.get('original_length', '?')} 字")
                lines.append(f"- **系统阈值**: {ti.get('max_allowed', '?')} 字")
                lines.append(f"- **溢出字数**: {ti.get('overflow_chars', '?')} 字")
                lines.append(f"- **文首预览**: {ti.get('visible_preview', '')}")
                lines.append(f"- **文尾预览**: {ti.get('truncated_tail', '')}")
                if s.human_note:
                    lines.append(f"- **人工备注（原句保留）**: {s.human_note}")
                lines.append("")
                lines.append(
                    "> 📌 处理建议：请查看完整原文后，决定是拆分为多条短样本、"
                    "还是人工选定关键段落保留。系统不会擅自截断语义。"
                )
                lines.append("")
        else:
            lines.append("本次无超长样本。")
            lines.append("")

        lines.append("## 三、待人工确认样本清单")
        lines.append("")
        if needs_review:
            for s in needs_review:
                lines.append(f"- `{s.sample_id}` 评分 {s.grayscale_score} 来源 {s.source}")
                if s.human_note:
                    lines.append(f"  - 人工备注: {s.human_note}")
                for ev in s.grayscale_evidence:
                    lines.append(f"  - {ev}")
        else:
            lines.append("无。")
        lines.append("")

        lines.append("## 四、已通过样本（灰度放行）")
        lines.append("")
        if passed:
            for s in passed:
                lines.append(
                    f"- `{s.sample_id}` 评分 {s.grayscale_score} 来源 {s.source}"
                    + (f" | 备注: {s.human_note}" if s.human_note else "")
                )
        else:
            lines.append("无。")
        lines.append("")

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return path
