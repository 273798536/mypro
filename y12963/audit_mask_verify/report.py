"""报告导出：月底/课前复盘时解释结论用。

- JSON：完整机读
- Markdown：人类可读，含追溯跳转锚点
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .models import MaskVerifyConclusion, TraceChain
from .storage import Store


def _level_emoji(lvl: str) -> str:
    return {"FULL": "🟦", "PARTIAL": "🟨", "NONE": "🟥", "UNKNOWN": "⬜"}.get(lvl, "⬜")


def export_json(store: Store, out_dir: Path, batch_id: str | None = None,
                work_order_id: str | None = None) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    concls = store.list_active_conclusions(batch_id=batch_id, work_order_id=work_order_id)
    suffix = "_" + (work_order_id or batch_id or "all")
    path = out_dir / f"mask_verify_report{suffix}.json"
    payload = {
        "generated_at": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "filter": {"batch_id": batch_id, "work_order_id": work_order_id},
        "total": len(concls),
        "pass": sum(1 for c in concls if c.is_pass),
        "fail": sum(1 for c in concls if not c.is_pass),
        "conclusions": [c.to_dict() for c in concls],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def export_markdown(store: Store, out_dir: Path, batch_id: str | None = None,
                    work_order_id: str | None = None) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    concls = store.list_active_conclusions(batch_id=batch_id, work_order_id=work_order_id)
    suffix = "_" + (work_order_id or batch_id or "all")
    path = out_dir / f"mask_verify_report{suffix}.md"
    lines: list[str] = []
    total = len(concls)
    passed = sum(1 for c in concls if c.is_pass)
    lines.append("# 审计日志脱敏核验报告")
    lines.append("")
    lines.append(f"- 结论总数: **{total}**")
    lines.append(f"- 通过: ✅ {passed}")
    lines.append(f"- 不通过: ❌ {total - passed}")
    lines.append("")
    lines.append("## 结论明细")
    lines.append("")
    lines.append("| # | 工单ID | 字段路径 | 预期 | 实际 | 结果 | 处理记录 | 慢查询跳转 |")
    lines.append("|---|--------|----------|------|------|------|----------|------------|")
    for i, c in enumerate(concls, 1):
        sq_link = ", ".join(
            f"[{s.slow_log_id}](#slow-{s.slow_log_id})" for s in c.slow_query_refs
        ) or "-"
        pr = f"[{c.processing_record_id or '-'}](#pr-{c.processing_record_id or 'none'})"
        lines.append(
            f"| {i} | {c.work_order_id} | `{c.field_path}` | "
            f"{_level_emoji(c.expected_mask_level.value)}{c.expected_mask_level.value} | "
            f"{_level_emoji(c.actual_mask_level.value)}{c.actual_mask_level.value} | "
            f"{'✅' if c.is_pass else '❌'} | {pr} | {sq_link} |"
        )
    lines.append("")
    lines.append("## 追溯锚点")
    lines.append("")
    seen_sq = set()
    for c in concls:
        if c.processing_record_id:
            lines.append(f"<a id=\"pr-{c.processing_record_id}\"></a>")
            lines.append(f"### 处理记录 `{c.processing_record_id}`")
            lines.append(f"- 工单: {c.work_order_id}")
            lines.append(f"- 字段: `{c.field_path}`")
            lines.append(f"- 备注: {c.remark}")
            for s in c.source_refs:
                lines.append(f"- 来源: `{s.source_file}` L{s.source_line_start}-L{s.source_line_end}")
                if s.raw_excerpt:
                    lines.append(f"  ```\n  {s.raw_excerpt}\n  ```")
            lines.append("")
        for sq in c.slow_query_refs:
            if sq.slow_log_id in seen_sq:
                continue
            seen_sq.add(sq.slow_log_id)
            lines.append(f"<a id=\"slow-{sq.slow_log_id}\"></a>")
            lines.append(f"### 慢查询 `{sq.slow_log_id}`")
            lines.append(f"- 文件: `{sq.slow_log_file}` L{sq.slow_log_line}")
            lines.append(f"- 耗时: {sq.query_time_ms} ms")
            if sq.sql_excerpt:
                lines.append(f"  ```sql\n  {sq.sql_excerpt}\n  ```")
            lines.append(f"- 关联结论: [跳转](#{c.conclusion_id})")
            lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def export_trace_markdown(chain: TraceChain, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"trace_{chain.conclusion.conclusion_id}.md"
    c = chain.conclusion
    pr = chain.processing_record
    wo = chain.work_order
    lines = [
        f"# 追溯链 · {c.conclusion_id}",
        "",
        "## 🔍 最终结论",
        f"- 工单ID: **{c.work_order_id}**  [{wo.ticket_title}]({wo.ticket_url}) 负责人: {wo.assignee}",
        f"- 字段路径: `{c.field_path}`",
        f"- 预期脱敏: {_level_emoji(c.expected_mask_level.value)}{c.expected_mask_level.value}",
        f"- 实际脱敏: {_level_emoji(c.actual_mask_level.value)}{c.actual_mask_level.value}",
        f"- 结论: {'✅ 通过' if c.is_pass else '❌ 不通过'}",
        f"- 状态: `{c.status.value}`",
        f"- 备注: {c.remark}",
        "",
        "## 📝 处理记录（倒查入口）",
        f"- 记录ID: `{pr.record_id}`",
        f"- 批次: `{pr.batch_id}`",
        f"- 幂等键: `{pr.idempotency_key}`",
        f"- 内容哈希: `{pr.content_hash}`",
        f"- 状态: `{pr.status.value}`",
        f"- 操作员: {pr.operator}",
        f"- 输入: `{pr.input_file}`",
        f"- 开始: {pr.started_at} / 结束: {pr.finished_at or '-'}",
        "",
        "## 📂 来源日志",
    ]
    for i, s in enumerate(chain.sources, 1):
        lines.append(f"### 来源 #{i}")
        lines.append(f"- 文件: `{s.source_file}` L{s.source_line_start}-L{s.source_line_end}")
        if s.raw_excerpt:
            lines.append(f"  ```\n  {s.raw_excerpt}\n  ```")
    if not chain.sources:
        lines.append("- (无)")
    lines.append("")
    lines.append("## 🐢 慢查询（复盘时可点回）")
    for i, sq in enumerate(chain.slow_queries, 1):
        lines.append(f"### 慢查询 #{i} `{sq.slow_log_id}`")
        lines.append(f"- 文件: `{sq.slow_log_file}` L{sq.slow_log_line}")
        lines.append(f"- 耗时: {sq.query_time_ms} ms")
        if sq.sql_excerpt:
            lines.append(f"  ```sql\n  {sq.sql_excerpt}\n  ```")
    if not chain.slow_queries:
        lines.append("- (无)")
    path.write_text("\n".join(lines), encoding="utf-8")
    return path
