"""报告生成器 - 普通话解释、并排对比、异常追溯链"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from tabulate import tabulate

from .audit import AuditManager
from .models import (
    AnomalyTrace,
    AuditAction,
    AuditLog,
    DiffConclusion,
    ProcessingRecord,
    RecordStatus,
    RecordType,
    SchemaSnapshot,
)
from .snapshot import SnapshotComparator
from .storage import StorageManager


class ReportGenerator:
    """
    报告生成器
    - 普通话解释段落（可直接复制给同事）
    - 表结构快照并排对比（旧 vs 新）
    - 异常追溯链（顺着异常 → 快照 → 处理意见）
    - 审计变更历史
    - 与处理记录共用数据，界面报告一致
    """

    CONCLUSION_CN = {
        DiffConclusion.MATCH: "完全一致",
        DiffConclusion.TYPE_MISMATCH: "字段类型不匹配",
        DiffConclusion.COLUMN_MISSING: "缓存缺少字段",
        DiffConclusion.COLUMN_EXTRA: "DB多出字段",
        DiffConclusion.INDEX_MISMATCH: "索引不一致",
        DiffConclusion.PK_MISMATCH: "主键不一致",
        DiffConclusion.MULTIPLE_DIFFS: "存在多处差异",
    }

    RECORD_TYPE_CN = {
        RecordType.MIGRATION_DUPLICATE: "迁移重复执行",
        RecordType.ROLLBACK: "回滚记录",
        RecordType.SCHEMA_DIFF: "缓存与DB结构差异",
        RecordType.PAGINATION_ORDER: "分页顺序稳定性",
        RecordType.ANOMALY_TRACE: "异常追溯记录",
    }

    STATUS_CN = {
        RecordStatus.PENDING: "待处理",
        RecordStatus.PROCESSING: "处理中",
        RecordStatus.CONFIRMED: "已确认",
        RecordStatus.REVIEW_PASSED: "复核通过",
        RecordStatus.REJECTED: "已驳回",
        RecordStatus.RESOLVED: "已解决",
    }

    def __init__(self, storage: StorageManager,
                 comparator: Optional[SnapshotComparator] = None,
                 audit: Optional[AuditManager] = None):
        self.storage = storage
        self.comparator = comparator or SnapshotComparator(storage)
        self.audit = audit or AuditManager(storage)

    # ---------- 公用：普通话解释模板 ----------
    def generate_plain_explanation(self, rec: ProcessingRecord) -> str:
        """
        生成一段普通话解释，后端负责人可以直接复制给同事，不用重新翻译
        """
        type_cn = self.RECORD_TYPE_CN.get(rec.record_type, rec.record_type.value)
        status_cn = self.STATUS_CN.get(rec.status, rec.status.value)

        if rec.record_type == RecordType.MIGRATION_DUPLICATE:
            dup = rec.duplicate_info
            if not dup:
                return f"【{type_cn}】当前为{status_cn}状态。"
            return (
                f"【{type_cn}】迁移脚本「{dup.migration_name}」被重复执行了 {dup.execution_count} 次，"
                f"首次执行时间 {dup.first_execution.strftime('%Y-%m-%d %H:%M:%S')}，"
                f"最近一次 {dup.last_execution.strftime('%Y-%m-%d %H:%M:%S')}。"
                f"当前处理状态：{status_cn}。建议相关同事检查该脚本是否已对数据造成影响，"
                f"如需回滚请同步记录。"
            )

        elif rec.record_type in (RecordType.SCHEMA_DIFF, RecordType.ROLLBACK):
            diff = rec.schema_diff
            if not diff:
                return f"【{type_cn}】当前为{status_cn}状态。"
            table = diff.table_name
            conclusion_cn = self.CONCLUSION_CN.get(diff.conclusion, diff.conclusion.value)
            if rec.record_type == RecordType.ROLLBACK:
                prefix = "【回滚场景-结构对比】"
            else:
                prefix = "【缓存与DB结构差异】"
            summary_parts = []
            for d in diff.diffs[:3]:
                summary_parts.append(d.description or d.diff_type.value)
            extra = f"；另有 {len(diff.diffs) - 3} 项差异未一一列出" if len(diff.diffs) > 3 else ""
            summary = "；".join(summary_parts) + extra
            return (
                f"{prefix}表「{table}」对比结论：{conclusion_cn}。"
                f"具体问题：{summary}。当前处理状态：{status_cn}。"
                f"请缓存侧与DB侧负责人核对，避免缓存读取到脏数据或写入失败。"
            )

        elif rec.record_type == RecordType.PAGINATION_ORDER:
            cfg = rec.pagination_config
            if not cfg:
                return f"【{type_cn}】当前为{status_cn}状态。"
            order_str = ",".join(cfg.order_by_columns) if cfg.order_by_columns else "（未指定排序字段）"
            stable_cn = "排序稳定" if cfg.is_stable else "排序不稳定，可能导致分页跳数据"
            reviewer_text = ""
            if cfg.reviewer and cfg.review_time:
                reviewer_text = (
                    f"已由 {cfg.reviewer} 在 {cfg.review_time.strftime('%Y-%m-%d %H:%M:%S')} 复核通过，"
                    f"复核意见：{cfg.review_comment or '无'}。"
                )
            return (
                f"【{type_cn}】表「{cfg.table_name}」当前排序字段为 {order_str}，"
                f"结论：{stable_cn}。{reviewer_text}"
                f"当前处理状态：{status_cn}。请查询接口负责人确认排序字段是否包含唯一键。"
            )

        elif rec.record_type == RecordType.ANOMALY_TRACE:
            return (
                f"【{type_cn}】这是一条异常追溯汇总记录，关联 {len(rec.related_record_ids)} 条子处理记录，"
                f"涉及 {len(rec.snapshot_refs)} 份结构快照。当前状态：{status_cn}。"
                f"请从根异常开始倒查，具体见追溯链章节。"
            )

        return f"【{type_cn}】当前处理状态：{status_cn}。"

    # ---------- 主报告入口 ----------
    def generate_full_report(self, include_sbs: bool = True,
                             include_traces: bool = True,
                             include_audit: bool = True,
                             operator: str = "system") -> Path:
        """生成完整 Markdown 报告"""
        batch_info = self.storage.load_batch_info()
        records = self.storage.load_processing_records(batch_only=True)
        snapshots = self.storage.load_snapshots(batch_only=True)
        traces = self.storage.load_anomaly_traces(batch_only=True)
        audit_logs = self.storage.load_audit_logs(batch_only=True)

        by_type: Dict[RecordType, List[ProcessingRecord]] = defaultdict(list)
        for r in records:
            by_type[r.record_type].append(r)

        now = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.storage.batch_output_dir / "reports" / f"report_{now}.md"
        report_path.parent.mkdir(parents=True, exist_ok=True)

        lines: List[str] = []
        lines.extend(self._render_header(batch_info, records, snapshots, traces))
        lines.extend(self._render_summary_by_type(by_type))

        for rt in [RecordType.MIGRATION_DUPLICATE, RecordType.SCHEMA_DIFF,
                   RecordType.ROLLBACK, RecordType.PAGINATION_ORDER]:
            if rt in by_type:
                lines.extend(self._render_record_group(rt, by_type[rt]))

        if include_sbs:
            tables_with_history = {s.table_schema.table_name for s in snapshots}
            if tables_with_history:
                lines.append("\n## 五、表结构快照新旧并排对比\n")
                lines.append("> 表结构快照被改过以后，旧结论和新结论最好能并排看，方便评估影响范围。\n")
                for tname in sorted(tables_with_history):
                    sbs = self.comparator.side_by_side_compare(tname)
                    if "error" not in sbs:
                        lines.extend(self._render_side_by_side(sbs))

        if include_traces and traces:
            lines.extend(self._render_anomaly_traces(traces))

        if include_audit and audit_logs:
            lines.extend(self._render_audit_section(audit_logs))

        lines.extend(self._render_plain_language_section(records))

        report_text = "\n".join(lines)
        report_path.write_text(report_text, encoding="utf-8")

        global_report = self.storage.output_dir / "reports" / f"{self.storage.batch_id}_report.md"
        global_report.parent.mkdir(parents=True, exist_ok=True)
        global_report.write_text(report_text, encoding="utf-8")

        return report_path

    # ---------- 章节渲染 ----------
    def _render_header(self, batch_info, records, snapshots, traces) -> List[str]:
        lines = []
        lines.append(f"# 缓存与数据库差异分析报告\n")
        lines.append(f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ")
        if batch_info:
            lines.append(f"> 批次编号：`{batch_info.batch_id}`  ")
            lines.append(f"> 输入目录：`{batch_info.input_dir}`  ")
            lines.append(f"> 输出目录：`{batch_info.output_dir}`  ")
            if batch_info.is_rerun:
                lines.append(f"> **幂等重跑**：基于历史批次 `{batch_info.rerun_of_batch}`  \n")
        lines.append("")
        lines.append("## 一、总览\n")
        stats = [
            ["处理记录总数", len(records)],
            ["结构快照数", len(snapshots)],
            ["异常追溯链数", len(traces)],
        ]
        lines.append(tabulate(stats, tablefmt="github"))
        lines.append("")
        return lines

    def _render_summary_by_type(self, by_type) -> List[str]:
        lines = ["\n## 二、按类型统计\n"]
        summary_rows = []
        for rt, recs in by_type.items():
            total = len(recs)
            resolved = sum(1 for r in recs if r.status in
                           (RecordStatus.RESOLVED, RecordStatus.CONFIRMED, RecordStatus.REVIEW_PASSED))
            summary_rows.append([
                self.RECORD_TYPE_CN.get(rt, rt.value),
                total, resolved, total - resolved,
            ])
        lines.append(tabulate(summary_rows,
                              headers=["记录类型", "总数", "已处理", "待处理"],
                              tablefmt="github"))
        lines.append("")
        return lines

    def _render_record_group(self, rt: RecordType,
                             recs: List[ProcessingRecord]) -> List[str]:
        section_no = {
            RecordType.MIGRATION_DUPLICATE: "三",
            RecordType.SCHEMA_DIFF: "四",
            RecordType.ROLLBACK: "四-2",
            RecordType.PAGINATION_ORDER: "四-3",
        }.get(rt, "X")
        lines = [f"\n## {section_no}、{self.RECORD_TYPE_CN.get(rt, rt.value)}\n"]

        for idx, rec in enumerate(recs, 1):
            lines.extend(self._render_single_record(idx, rec))
        return lines

    def _render_single_record(self, idx: int, rec: ProcessingRecord) -> List[str]:
        lines = []
        title_hint = rec.table_name or rec.migration_name or rec.record_id[:8]
        lines.append(f"### {idx}. `{title_hint}` (记录ID: `{rec.record_id[:8]}...`)\n")
        lines.append(f"- **状态**：{self.STATUS_CN.get(rec.status, rec.status.value)}")
        lines.append(f"- **创建时间**：{rec.create_time.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"- **创建人**：{rec.creator or 'system'}")
        if rec.snapshot_refs:
            lines.append(f"- **关联快照**：{', '.join(f'`{s[:8]}`' for s in rec.snapshot_refs)}")
        if rec.related_record_ids:
            lines.append(f"- **关联记录**：{', '.join(f'`{r[:8]}`' for r in rec.related_record_ids)}")
        lines.append("")

        expl = self.generate_plain_explanation(rec)
        lines.append(f"> **一句话说明（可直接转发）**：{expl}\n")

        if rec.record_type == RecordType.MIGRATION_DUPLICATE and rec.duplicate_info:
            lines.append("#### 执行明细\n")
            dup = rec.duplicate_info
            rows = [[i + 1, e.execution_time.strftime('%Y-%m-%d %H:%M:%S'),
                     e.checksum or "-", "成功" if e.success else f"失败：{e.error_message}"]
                    for i, e in enumerate(dup.executions)]
            lines.append(tabulate(rows,
                                  headers=["次数", "执行时间", "校验和", "结果"],
                                  tablefmt="github"))
            lines.append("")

        if rec.schema_diff and rec.schema_diff.has_diff():
            diff = rec.schema_diff
            lines.append("#### 差异明细\n")
            rows = []
            for d in diff.diffs:
                col = d.column_name or "(全局)"
                field = d.field or "-"
                cv = str(d.cache_value)[:30] if d.cache_value is not None else "-"
                dv = str(d.db_value)[:30] if d.db_value is not None else "-"
                rows.append([col, self.CONCLUSION_CN.get(d.diff_type, d.diff_type.value),
                             field, cv, dv])
            lines.append(tabulate(rows,
                                  headers=["列/项", "差异类型", "字段", "缓存值", "DB值"],
                                  tablefmt="github"))
            lines.append("")

        if rec.pagination_config:
            cfg = rec.pagination_config
            lines.append("#### 分页配置\n")
            rows = [
                ["排序字段", ", ".join(cfg.order_by_columns) or "-"],
                ["排序是否稳定", "是" if cfg.is_stable else "否（可能跳数据）"],
                ["复核状态", self.STATUS_CN.get(cfg.review_status, cfg.review_status.value)],
                ["复核人", cfg.reviewer or "-"],
                ["复核时间", cfg.review_time.strftime('%Y-%m-%d %H:%M:%S') if cfg.review_time else "-"],
                ["复核意见", cfg.review_comment or "-"],
                ["变更原因", cfg.change_reason or "-"],
            ]
            lines.append(tabulate(rows, tablefmt="github"))
            lines.append("")

        if rec.opinions:
            lines.append("#### 处理意见\n")
            rows = [[i + 1, o.handler, o.opinion,
                     o.suggestion or "-", o.handle_time.strftime('%Y-%m-%d %H:%M:%S')]
                    for i, o in enumerate(rec.opinions)]
            lines.append(tabulate(rows,
                                  headers=["序号", "处理人", "意见", "建议", "时间"],
                                  tablefmt="github"))
            lines.append("")

        # 变更历史
        history = self.audit.get_change_history("processing_record", rec.record_id)
        if history:
            lines.append("#### 变更历史（谁改的、什么时候改的、为什么改）\n")
            rows = []
            for h in history:
                old_v = str(h.old_value)[:30] if h.old_value is not None else "-"
                new_v = str(h.new_value)[:30] if h.new_value is not None else "-"
                rows.append([h.action_time.strftime('%Y-%m-%d %H:%M:%S'),
                             h.operator, h.action.value, old_v, new_v,
                             h.reason or h.comment or "-"])
            lines.append(tabulate(rows,
                                  headers=["时间", "操作人", "动作", "原值", "新值", "原因/备注"],
                                  tablefmt="github"))
            lines.append("")
        return lines

    def _render_side_by_side(self, sbs: Dict[str, Any]) -> List[str]:
        lines = []
        tname = sbs["table_name"]
        lines.append(f"### 表：`{tname}`\n")
        lines.append(
            f"- **旧快照** `{sbs['old_snapshot']['id'][:8]}` "
            f"（{sbs['old_snapshot']['time'][:19]}，来源：{sbs['old_snapshot']['source']}，"
            f"操作人：{sbs['old_snapshot']['operator'] or '-'}）"
        )
        lines.append(
            f"- **新快照** `{sbs['new_snapshot']['id'][:8]}` "
            f"（{sbs['new_snapshot']['time'][:19]}，来源：{sbs['new_snapshot']['source']}，"
            f"操作人：{sbs['new_snapshot']['operator'] or '-'}）\n"
        )

        conclusion = sbs["diff_result"].conclusion
        lines.append(
            f"**对比结论**：{self.CONCLUSION_CN.get(conclusion, conclusion.value)}，"
            f"共 {len(sbs['diff_result'].diffs)} 处差异\n"
        )

        lines.append("#### 列定义并排\n")
        rows = []
        for r in sbs["columns_side_by_side"]:
            name = r["column_name"]
            mark = " ⚠️" if r["changed"] else ""
            old_d = r["old"]
            new_d = r["new"]
            old_str = (f"{old_d['data_type']} "
                       f"{'NOT NULL' if not old_d['is_nullable'] else 'NULL'} "
                       f"DEFAULT {old_d['default']}" if old_d else "(不存在)")
            new_str = (f"{new_d['data_type']} "
                       f"{'NOT NULL' if not new_d['is_nullable'] else 'NULL'} "
                       f"DEFAULT {new_d['default']}" if new_d else "(不存在)")
            rows.append([name + mark, old_str, new_str])
        lines.append(tabulate(rows, headers=["列名", "旧快照", "新快照"], tablefmt="github"))
        lines.append("")

        if sbs["indexes_side_by_side"]:
            lines.append("#### 索引并排\n")
            rows = []
            for r in sbs["indexes_side_by_side"]:
                name = r["index_name"]
                mark = " ⚠️" if r["changed"] else ""
                old_d = r["old"]
                new_d = r["new"]
                old_str = (f"UNIQUE " if old_d and old_d.get("is_unique") else "") + \
                          (f"({', '.join(old_d['columns'])})" if old_d else "(不存在)")
                new_str = (f"UNIQUE " if new_d and new_d.get("is_unique") else "") + \
                          (f"({', '.join(new_d['columns'])})" if new_d else "(不存在)")
                rows.append([name + mark, old_str, new_str])
            lines.append(tabulate(rows, headers=["索引名", "旧快照", "新快照"], tablefmt="github"))
            lines.append("")

        pk = sbs["primary_key"]
        if pk["old"] != pk["new"]:
            lines.append("#### 主键变化\n")
            lines.append(f"- 旧主键：{pk['old'] or '(无)'}")
            lines.append(f"- 新主键：{pk['new'] or '(无)'}\n")
        return lines

    def _render_anomaly_traces(self, traces: List[AnomalyTrace]) -> List[str]:
        lines = ["\n## 六、异常追溯链\n"]
        lines.append(
            "> 顺着异常往回查，能查到表结构快照和处理意见，才算顺。\n"
        )
        for idx, t in enumerate(traces, 1):
            lines.append(f"### {idx}. {t.anomaly_description} (ID: `{t.anomaly_id[:8]}...`)\n")
            lines.append(f"- **异常类型**：{t.anomaly_type}")
            lines.append(f"- **发现时间**：{t.discovered_time.strftime('%Y-%m-%d %H:%M:%S')}")
            lines.append(f"- **根处理记录**：`{t.root_record_id[:8]}...`")
            lines.append(f"- **是否解决**：{'✅ 已解决' if t.is_resolved else '❌ 未解决'}")
            if t.resolver:
                lines.append(f"- **解决人**：{t.resolver}")
            if t.resolution_summary:
                lines.append(f"- **解决说明**：{t.resolution_summary}")
            lines.append("")

            # 追溯链 - 处理记录
            lines.append("#### 🔗 处理记录追溯链（时间顺序）\n")
            rec_rows = []
            for i, rid in enumerate(t.record_chain, 1):
                rec = self.storage.find_processing_record(record_id=rid)
                if rec:
                    type_cn = self.RECORD_TYPE_CN.get(rec.record_type, rec.record_type.value)
                    status_cn = self.STATUS_CN.get(rec.status, rec.status.value)
                    target = rec.table_name or rec.migration_name or "-"
                    opinion = rec.opinions[-1].opinion if rec.opinions else "(暂无处理意见)"
                    rec_rows.append([i, rid[:8], type_cn, target, status_cn, opinion[:30]])
                else:
                    rec_rows.append([i, rid[:8], "(记录丢失)", "-", "-", "-"])
            lines.append(tabulate(rec_rows,
                                  headers=["顺序", "记录ID", "类型", "涉及对象", "状态", "处理意见摘要"],
                                  tablefmt="github"))
            lines.append("")

            # 追溯链 - 快照
            lines.append("#### 📸 表结构快照链\n")
            snap_rows = []
            for i, sid in enumerate(t.snapshot_chain, 1):
                snap = self.storage.load_snapshot(sid)
                if snap:
                    snap_rows.append([
                        i, sid[:8], snap.table_schema.table_name,
                        snap.snapshot_time.strftime('%Y-%m-%d %H:%M:%S'),
                        snap.source, snap.operator or "-",
                        snap.table_schema.to_hash()[:12],
                    ])
                else:
                    snap_rows.append([i, sid[:8], "(快照丢失)", "-", "-", "-", "-"])
            lines.append(tabulate(snap_rows,
                                  headers=["顺序", "快照ID", "表名", "快照时间", "来源",
                                           "操作人", "结构哈希"],
                                  tablefmt="github"))
            lines.append("")
        return lines

    def _render_audit_section(self, audit_logs: List[AuditLog]) -> List[str]:
        lines = ["\n## 七、审计日志（所有变更留痕）\n"]
        lines.append(
            "> 分页顺序不稳定被复核通过时，历史里要知道是谁改的、什么时候改的、为什么改。\n"
        )
        rows = []
        for h in audit_logs:
            action_cn = {
                AuditAction.SNAPSHOT_MODIFIED: "快照修改",
                AuditAction.CONCLUSION_CHANGED: "结论变更",
                AuditAction.PAGINATION_REVIEWED: "分页复核",
                AuditAction.RECORD_CONFIRMED: "记录确认",
                AuditAction.ROLLBACK_PERFORMED: "回滚执行",
                AuditAction.REVIEW_PASSED: "复核通过",
            }.get(h.action, h.action.value)
            rows.append([
                h.action_time.strftime('%Y-%m-%d %H:%M:%S'),
                h.operator,
                action_cn,
                f"{h.target_type}/{h.target_id[:8]}",
                h.reason or h.comment or "-",
            ])
        lines.append(tabulate(rows,
                              headers=["时间", "操作人", "动作类型", "目标", "原因/备注"],
                              tablefmt="github"))
        lines.append("")
        return lines

    def _render_plain_language_section(self, records: List[ProcessingRecord]) -> List[str]:
        lines = ["\n## 八、转发用普通话汇总（直接复制）\n"]
        lines.append(
            "> 下面每一条都是人话，后端负责人可以直接复制给同事，不用重新翻译。\n"
        )
        for i, rec in enumerate(records, 1):
            expl = self.generate_plain_explanation(rec)
            lines.append(f"{i}. {expl}\n")
        return lines
