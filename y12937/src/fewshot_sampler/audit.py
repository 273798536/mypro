from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from fewshot_sampler.feedback import FeedbackManager
from fewshot_sampler.schemas import FeedbackStatus
from fewshot_sampler.storage import RecordStorage


@dataclass
class TraceNode:
    level: str
    title: str
    details: Dict[str, Any] = field(default_factory=dict)
    children: List["TraceNode"] = field(default_factory=list)

    def render(self, indent: int = 0) -> str:
        prefix = "  " * indent
        lines = [f"{prefix}▸ [{self.level}] {self.title}"]
        for k, v in self.details.items():
            if isinstance(v, str) and len(v) > 100:
                v = v[:97] + "..."
            lines.append(f"{prefix}   · {k}: {v}")
        for child in self.children:
            lines.append(child.render(indent + 1))
        return "\n".join(lines)


class AuditTrail:
    def __init__(self, storage_root: str = "./.fewshot_storage"):
        self.storage = RecordStorage(storage_root)
        self.feedback = FeedbackManager(storage_root)

    def trace_anomaly(self, batch_id: str, record_id: str, anomaly_index: int = 0) -> TraceNode:
        root = TraceNode(
            level="异常追溯",
            title=f"批次 {batch_id} / 记录 {record_id} / 异常 #{anomaly_index + 1}",
        )

        records = self.storage.load_records(batch_id)
        target_record = None
        for r in records:
            if r.get("record_id") == record_id:
                target_record = r
                break

        if target_record is None:
            root.children.append(TraceNode("错误", "未找到该记录，可能已被删除或ID有误"))
            return root

        rec_node = TraceNode(
            level="抽样记录",
            title=f"第 {target_record.get('source_row_index', -1) + 1} 行 · 来源文件: {target_record.get('source_file', '-')}",
            details={
                "抽样方式": target_record.get("sample_source", "-"),
                "异常总分": f"{int(target_record.get('anomaly_score', 0) * 100)}分",
                "抽样时间": target_record.get("created_at", "-"),
                "原始数据字段数": str(len(target_record.get("data", {}))),
            },
        )
        root.children.append(rec_node)

        data = target_record.get("data", {})
        data_preview = {}
        for k, v in list(data.items())[:10]:
            s = str(v) if v is not None else "空"
            if len(s) > 50:
                s = s[:47] + "..."
            data_preview[k] = s
        if data_preview:
            rec_node.children.append(TraceNode("数据预览", "原始业务数据（前10个字段）", details=data_preview))

        anomalies = target_record.get("anomalies", [])
        if anomaly_index >= len(anomalies):
            root.children.append(TraceNode("警告", f"异常索引超出范围，该记录仅有 {len(anomalies)} 条异常"))
            anomaly_index = max(0, len(anomalies) - 1)

        if anomalies:
            anom = anomalies[anomaly_index]
            anom_node = TraceNode(
                level="异常详情",
                title=f"{anom.get('异常类型', '未知')} · 字段: {anom.get('字段名', '-')}",
                details={
                    "问题描述": anom.get("问题描述", "-"),
                    "严重程度": anom.get("严重程度", "-"),
                    "原始值": anom.get("原始值", "-"),
                    "期望值": anom.get("期望值", "-"),
                },
            )
            if anom.get("截断原因") and anom["截断原因"] != "-":
                anom_node.details["截断原因说明"] = anom["截断原因"]
            root.children.append(anom_node)

        feedbacks = self.feedback.list_by_record(batch_id, record_id)
        relevant_fb = [f for f in feedbacks if f.anomaly_index in (None, anomaly_index)]

        if relevant_fb:
            fb_root = TraceNode("人工反馈", f"共 {len(relevant_fb)} 条处理意见")
            for fb in relevant_fb:
                fb_node = TraceNode(
                    level=f"反馈·{fb.status.label}",
                    title=f"{fb.feedback_id} · 处理人: {fb.handler or '未指定'}",
                    details={
                        "提交时间": fb.created_at,
                        "最后更新": fb.updated_at,
                        "处理意见": fb.comment or "无",
                        "处理结论": fb.resolution or "待填写",
                    },
                )
                if fb.tags:
                    fb_node.details["标签"] = ", ".join(fb.tags)
                fb_root.children.append(fb_node)
            root.children.append(fb_root)
        else:
            root.children.append(TraceNode("提示", "暂无人工反馈，可使用 feedback add 命令添加处理意见"))

        timeline = self.storage.get_shared_timeline(batch_id, record_id)
        if timeline:
            tl_root = TraceNode("共享处理时间线", f"回放与安全拦截共 {len(timeline)} 条记录")
            for t in timeline:
                src = t.get("_source", "?")
                action = t.get("action") or t.get("decision", "未知操作")
                user = t.get("user", "")
                note = t.get("note") or t.get("reason", "")
                tn = TraceNode(
                    level=src,
                    title=f"{action} · {t.get('timestamp', '')}",
                    details={},
                )
                if user:
                    tn.details["操作人"] = user
                if note:
                    tn.details["备注/原因"] = note
                if t.get("anomaly_type"):
                    tn.details["关联异常类型"] = t["anomaly_type"]
                tl_root.children.append(tn)
            root.children.append(tl_root)

        return root

    def trace_batch_summary(self, batch_id: str) -> TraceNode:
        meta = self.storage.get_batch_meta(batch_id)
        root = TraceNode(
            level="批次总览",
            title=batch_id,
            details={
                "描述": meta.description if meta else "-",
                "来源文件": ", ".join(meta.source_files) if meta else "-",
                "创建时间": meta.created_at if meta else "-",
                "抽样总数": str(meta.total_records) if meta else "-",
                "含异常记录数": str(meta.anomaly_records) if meta else "-",
            } if meta else {},
        )

        if meta:
            records = self.storage.load_records(batch_id)
            anomaly_type_count: Dict[str, int] = {}
            with_anomaly = 0
            for r in records:
                if r.get("anomalies"):
                    with_anomaly += 1
                for a in r.get("anomalies", []):
                    t = a.get("异常类型", "未知")
                    anomaly_type_count[t] = anomaly_type_count.get(t, 0) + 1

            if anomaly_type_count:
                dist_node = TraceNode("异常分布", "按类型统计")
                for t, c in sorted(anomaly_type_count.items(), key=lambda x: -x[1]):
                    dist_node.details[t] = str(c) + " 条"
                root.children.append(dist_node)

        fb_stats = self.feedback.stats(batch_id)
        if fb_stats.get("总反馈数", 0) > 0:
            fb_node = TraceNode("反馈统计", "人工处理进度")
            for k, v in fb_stats.items():
                fb_node.details[k] = str(v)
            root.children.append(fb_node)

        pending = self.feedback.list_by_status(batch_id, FeedbackStatus.PENDING)
        if pending:
            p_node = TraceNode("待办提醒", f"有 {len(pending)} 条记录待审核")
            for fb in pending[:5]:
                p_node.children.append(
                    TraceNode(
                        level="待审核",
                        title=f"{fb.record_id} · {fb.feedback_id}",
                        details={"提交时间": fb.created_at},
                    )
                )
            if len(pending) > 5:
                p_node.children.append(TraceNode("...", f"还有 {len(pending) - 5} 条未显示"))
            root.children.append(p_node)

        return root

    def list_traceable_anomalies(self, batch_id: str) -> List[Dict[str, Any]]:
        records = self.storage.load_records(batch_id)
        result = []
        for r in records:
            rid = r.get("record_id", "")
            anomalies = r.get("anomalies", [])
            for idx, a in enumerate(anomalies):
                result.append(
                    {
                        "record_id": rid,
                        "anomaly_index": idx,
                        "异常类型": a.get("异常类型", "-"),
                        "字段名": a.get("字段名", "-"),
                        "严重程度": a.get("严重程度", "-"),
                        "问题描述": a.get("问题描述", "-"),
                    }
                )
        result.sort(
            key=lambda x: int(x["严重程度"].rstrip("%")) if x["严重程度"].rstrip("%").isdigit() else 0,
            reverse=True,
        )
        return result
