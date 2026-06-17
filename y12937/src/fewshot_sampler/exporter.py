from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from fewshot_sampler.feedback import FeedbackManager
from fewshot_sampler.schemas import SampleBatch, SampleRecord
from fewshot_sampler.storage import RecordStorage


class ResultExporter:
    TRUNCATE_DISPLAY_LEN = 120

    def __init__(self, storage_root: str = "./.fewshot_storage"):
        self.storage = RecordStorage(storage_root)
        self.feedback = FeedbackManager(storage_root)

    def _truncate_text(self, text: Any, limit: Optional[int] = None) -> str:
        if text is None:
            return "(空)"
        s = str(text)
        limit = limit or self.TRUNCATE_DISPLAY_LEN
        if len(s) <= limit:
            return s
        return s[:limit] + f" ⋯（截断，原文{len(s)}字符，见'截断说明'）"

    def export_batch_excel(self, batch_id: str, output_path: str, for_audience: str = "all") -> str:
        output = Path(output_path).resolve()
        if output.suffix.lower() not in (".xlsx", ".xls"):
            output = output.with_suffix(".xlsx")

        meta = self.storage.get_batch_meta(batch_id)
        records = self.storage.load_records(batch_id)
        feedbacks = self.feedback.list_by_batch(batch_id)
        fb_by_record: Dict[str, List] = {}
        for fb in feedbacks:
            fb_by_record.setdefault(fb.record_id, []).append(fb)

        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            wb = writer.book
            fmt_header = wb.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1, "valign": "vcenter"})
            fmt_warn = wb.add_format({"bg_color": "#FFC7CE", "font_color": "#9C0006"})
            fmt_note = wb.add_format({"bg_color": "#FFF2CC", "italic": True})
            fmt_ok = wb.add_format({"bg_color": "#C6EFCE", "font_color": "#006100"})

            summary_rows = []
            if meta:
                summary_rows = [
                    ["批次编号", meta.batch_id],
                    ["批次描述", meta.description],
                    ["来源文件", "、".join(meta.source_files)],
                    ["创建时间", meta.created_at],
                    ["抽样总数", meta.total_records],
                    ["含异常的记录数", meta.anomaly_records],
                    ["异常占比", f"{meta.anomaly_records / max(1, meta.total_records) * 100:.1f}%"],
                    ["人工反馈总数", len(feedbacks)],
                    ["已处理反馈数", sum(1 for fb in feedbacks if fb.status.value == "resolved")],
                    ["待审核反馈数", sum(1 for fb in feedbacks if fb.status.value == "pending")],
                ]
            df_summary = pd.DataFrame(summary_rows, columns=["项目", "内容"])
            df_summary.to_excel(writer, sheet_name="0-总览", index=False, startrow=0)
            ws = writer.sheets["0-总览"]
            ws.set_column("A:A", 22)
            ws.set_column("B:B", 80)
            for row_idx in range(len(df_summary)):
                ws.set_row(row_idx + 1, None, None)
            for r in range(1, len(df_summary) + 1):
                ws.write(r, 0, df_summary.iloc[r - 1, 0], fmt_header)

            sample_rows = []
            for rec in records:
                rid = rec.get("record_id", "")
                data = rec.get("data", {})
                anomalies = rec.get("anomalies", [])
                rec_fb = fb_by_record.get(rid, [])

                anomaly_types = "；".join(a.get("异常类型", "") for a in anomalies) if anomalies else "无异常"
                latest_fb = rec_fb[-1] if rec_fb else None

                row = {
                    "记录编号": rid,
                    "来源文件": rec.get("source_file", ""),
                    "原始行号（Excel打开时的行号）": rec.get("source_row_index", -1) + 1 + 1,
                    "抽样方式": self._zh_sample_source(rec.get("sample_source", "")),
                    "异常数量": len(anomalies),
                    "异常类型汇总": anomaly_types,
                    "异常总评分": f"{int(rec.get('anomaly_score', 0) * 100)}分",
                    "人工反馈状态": latest_fb.status.label if latest_fb else "未处理",
                    "最后处理人": latest_fb.handler if latest_fb else "",
                    "最后处理结论": (latest_fb.resolution or "") if latest_fb else "",
                }

                data_cols = self._select_important_cols(list(data.keys()))
                for col in data_cols:
                    val = data.get(col)
                    display_val = self._truncate_text(val, 80)
                    col_name = self._friendly_col_name(col)
                    row[col_name] = display_val

                sample_rows.append(row)

            if sample_rows:
                df_samples = pd.DataFrame(sample_rows)
                df_samples.to_excel(writer, sheet_name="1-抽样明细", index=False)
                ws = writer.sheets["1-抽样明细"]
                for col_idx, col in enumerate(df_samples.columns):
                    width = min(max(len(str(col)) * 2 + 4, 14), 50)
                    ws.set_column(col_idx, col_idx, width)
                for col_idx in range(len(df_samples.columns)):
                    ws.write(0, col_idx, df_samples.columns[col_idx], fmt_header)
                self._apply_row_formats(ws, df_samples, fmt_warn, fmt_ok, 5)

            anomaly_rows = []
            truncation_explanations: List[str] = []
            for rec in records:
                rid = rec.get("record_id", "")
                anomalies = rec.get("anomalies", [])
                for idx, a in enumerate(anomalies):
                    row = {
                        "关联记录编号": rid,
                        "异常序号": idx + 1,
                        "异常类型": a.get("异常类型", ""),
                        "问题字段": self._friendly_col_name(a.get("字段名", "") or ""),
                        "问题描述": a.get("问题描述", ""),
                        "严重程度": a.get("严重程度", ""),
                        "字段里的原始值": self._truncate_text(a.get("原始值", ""), 200),
                        "系统建议的期望值/格式": self._truncate_text(a.get("期望值", ""), 200),
                        "处理建议": self._suggest_action(a),
                    }
                    anomaly_rows.append(row)

                    trunc_reason = a.get("截断原因", "")
                    if trunc_reason and trunc_reason != "-":
                        field_display = self._friendly_col_name(a.get("字段名", "") or "")
                        truncation_explanations.append(
                            f"记录{rid} 的字段「{field_display}」：{trunc_reason}"
                        )

            if anomaly_rows:
                df_anom = pd.DataFrame(anomaly_rows)
                df_anom.to_excel(writer, sheet_name="2-异常清单", index=False)
                ws = writer.sheets["2-异常清单"]
                for col_idx, col in enumerate(df_anom.columns):
                    width = min(max(len(str(col)) * 2 + 4, 16), 50)
                    ws.set_column(col_idx, col_idx, width)
                for col_idx in range(len(df_anom.columns)):
                    ws.write(0, col_idx, df_anom.columns[col_idx], fmt_header)
                self._apply_row_formats_by_severity(ws, df_anom, fmt_warn, fmt_note, 4)

            fb_rows = []
            for fb in feedbacks:
                row = {
                    "反馈编号": fb.feedback_id,
                    "关联记录编号": fb.record_id,
                    "关联异常序号": (f"第{fb.anomaly_index + 1}条" if fb.anomaly_index is not None else "整条记录"),
                    "处理状态": fb.status.label,
                    "处理人": fb.handler or "(未指定)",
                    "提交时间": fb.created_at,
                    "最后更新时间": fb.updated_at,
                    "处理意见（具体怎么判断的）": fb.comment or "(空)",
                    "处理结论（修复方式/为什么不管）": fb.resolution or "(空)",
                    "标签": "、".join(fb.tags) if fb.tags else "",
                }
                fb_rows.append(row)

            if fb_rows:
                df_fb = pd.DataFrame(fb_rows)
                df_fb.to_excel(writer, sheet_name="3-人工反馈", index=False)
                ws = writer.sheets["3-人工反馈"]
                for col_idx, col in enumerate(df_fb.columns):
                    width = min(max(len(str(col)) * 2 + 4, 16), 50)
                    ws.set_column(col_idx, col_idx, width)
                for col_idx in range(len(df_fb.columns)):
                    ws.write(0, col_idx, df_fb.columns[col_idx], fmt_header)

            if truncation_explanations:
                expl_rows = [["编号", "说明"]]
                for i, expl in enumerate(truncation_explanations, 1):
                    expl_rows.append([i, expl])
                df_expl = pd.DataFrame(expl_rows[1:], columns=expl_rows[0])
                df_expl.to_excel(writer, sheet_name="4-截断说明", index=False)
                ws = writer.sheets["4-截断说明"]
                ws.set_column("A:A", 8)
                ws.set_column("B:B", 100)
                ws.write(0, 0, "编号", fmt_header)
                ws.write(0, 1, "长文本被截断的原因（不是系统报错，是正常说明）", fmt_header)
                for r in range(len(df_expl)):
                    ws.write(r + 1, 1, df_expl.iloc[r, 1], fmt_note)

            timeline = self.storage.get_shared_timeline(batch_id)
            if timeline:
                tl_rows = []
                for t in timeline:
                    tl_rows.append(
                        {
                            "时间": t.get("timestamp", ""),
                            "来源系统": t.get("_source", ""),
                            "关联记录": t.get("record_id", ""),
                            "动作/决策": t.get("action") or t.get("decision", ""),
                            "操作人": t.get("user", ""),
                            "备注/拦截原因": t.get("note") or t.get("reason", ""),
                            "关联异常": t.get("anomaly_type", ""),
                        }
                    )
                df_tl = pd.DataFrame(tl_rows)
                df_tl.to_excel(writer, sheet_name="5-处理时间线", index=False)
                ws = writer.sheets["5-处理时间线"]
                for col_idx, col in enumerate(df_tl.columns):
                    width = min(max(len(str(col)) * 2 + 4, 14), 40)
                    ws.set_column(col_idx, col_idx, width)
                for col_idx in range(len(df_tl.columns)):
                    ws.write(0, col_idx, df_tl.columns[col_idx], fmt_header)

        return str(output)

    def _friendly_col_name(self, col: str) -> str:
        if not col:
            return "(未命名字段)"
        mapping = {
            "id": "ID编号",
            "name": "姓名/名称",
            "amount": "金额",
            "price": "价格",
            "qty": "数量",
            "quantity": "数量",
            "date": "日期",
            "time": "时间",
            "remark": "备注",
            "comment": "说明",
            "desc": "描述",
            "description": "详细描述",
            "legacy_id": "旧系统编号",
            "old_code": "老系统编码",
            "unit": "单位",
            "status": "状态",
            "type": "类型",
            "user": "用户",
            "create_time": "创建时间",
            "update_time": "更新时间",
        }
        lower = col.lower().strip()
        if lower in mapping:
            return mapping[lower]
        return col

    def _zh_sample_source(self, src: str) -> str:
        mapping = {
            "random": "随机抽样",
            "stratified": "分层抽样",
            "anomaly_score": "异常优先抽样",
            "recent": "最近数据抽样",
            "manual": "人工指定",
        }
        return mapping.get(src, src or "-")

    def _select_important_cols(self, cols: List[str], max_cols: int = 8) -> List[str]:
        priority_keywords = [
            "名称", "姓名", "编号", "id", "金额", "数量", "价格", "日期", "时间",
            "状态", "类型", "单位", "备注", "说明", "描述", "title", "name", "amount",
        ]
        scored = []
        for c in cols:
            score = 0
            cl = c.lower()
            for kw in priority_keywords:
                if kw.lower() in cl:
                    score += 10 - priority_keywords.index(kw)
            scored.append((score, c))
        scored.sort(key=lambda x: -x[0])
        return [c for _, c in scored[:max_cols]]

    def _suggest_action(self, anomaly: Dict[str, Any]) -> str:
        atype = anomaly.get("异常类型", "")
        field = anomaly.get("字段名", "")
        tips = {
            "缺少单位": f"补填「{field}」字段的单位（如 元、个、斤等）",
            "补录备注": f"确认「{field}」补录内容是否准确，保留补录痕迹",
            "旧表结构": f"评估是否将「{field}」迁移到新表结构对应字段",
            "数值异常": f"核对「{field}」来源数据，确认是录入错误还是真实特例",
            "格式不一致": f"统一「{field}」的填写格式，或做脏数据清洗",
            "重复记录": f"确认是否重复录入，保留有效记录并标记重复项",
            "长文本截断": f"查看'截断说明'sheet，判断是否需要拆分字段存储",
            "版本回滚": "重点核查！此记录疑似版本回滚产生，请勿当作正常样例使用",
            "待识别": f"人工复核「{field}」字段，判断具体问题类型",
        }
        return tips.get(atype, "请人工复核该异常")

    def _apply_row_formats(self, ws, df: pd.DataFrame, fmt_warn, fmt_ok, anomaly_col_idx: int):
        for r in range(len(df)):
            val = df.iloc[r, anomaly_col_idx] if anomaly_col_idx < len(df.columns) else 0
            try:
                n = int(str(val).split("分")[0]) if isinstance(val, str) else int(val)
            except (ValueError, TypeError):
                n = 0
            if n >= 80:
                for c in range(len(df.columns)):
                    ws.set_row(r + 1, None, fmt_warn)
            elif n == 0:
                for c in range(len(df.columns)):
                    ws.set_row(r + 1, None, fmt_ok)

    def _apply_row_formats_by_severity(self, ws, df: pd.DataFrame, fmt_warn, fmt_note, sev_col_idx: int):
        for r in range(len(df)):
            val = df.iloc[r, sev_col_idx] if sev_col_idx < len(df.columns) else "0%"
            try:
                n = int(str(val).rstrip("%"))
            except (ValueError, TypeError):
                n = 0
            if n >= 70:
                ws.set_row(r + 1, None, fmt_warn)
            elif n < 30:
                ws.set_row(r + 1, None, fmt_note)

    def export_sample_csv(self, batch: SampleBatch, output_path: str) -> str:
        output = Path(output_path).resolve()
        rows = []
        for rec in batch.records:
            row = rec.to_flat_dict()
            if rec.anomalies:
                row["异常类型列表"] = "；".join(a.anomaly_type.label for a in rec.anomalies)
                row["异常详情（CSV格式有限，详细请导Excel）"] = " | ".join(
                    f"[{a.anomaly_type.label}] {a.field_name or ''}: {a.description}"
                    for a in rec.anomalies
                )
            rows.append(row)
        pd.DataFrame(rows).to_csv(output, index=False, encoding="utf-8-sig")
        return str(output)
