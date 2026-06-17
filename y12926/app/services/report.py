import os
from datetime import datetime
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from app.config import EXPORTS_DIR, BatchStatus, QuestionStatus
from app.services.crud import (
    BatchCRUD, MaterialCRUD, QuestionCRUD, ChangeCRUD,
    RoutingCRUD, ReviewCRUD, RollbackCRUD
)


class ReportService:
    @staticmethod
    def _generate_filename(batch, ext: str = "xlsx") -> str:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in (batch.batch_name or "report"))
        return f"路由命中分析报告_{safe_name}_{batch.batch_no}_R{batch.current_round}_{ts}.{ext}"

    @staticmethod
    def build_report_data(db: Session, batch_id: int) -> Dict[str, Any]:
        batch = BatchCRUD.get(db, batch_id)
        if not batch:
            raise ValueError("批次不存在")

        materials = MaterialCRUD.list_by_batch(db, batch_id)
        questions = QuestionCRUD.list_by_batch(db, batch_id, limit=50000)
        routings = RoutingCRUD.list_by_batch(db, batch_id)
        changes = ChangeCRUD.list_by_batch(db, batch_id)
        reviews = ReviewCRUD.list_by_batch(db, batch_id)
        rollbacks = RollbackCRUD.list_by_batch(db, batch_id)

        q_routing_map: Dict[int, Any] = {}
        for r in routings:
            if r.question_id not in q_routing_map or r.is_primary:
                q_routing_map[r.question_id] = r

        routing_summary: Dict[str, int] = {}
        status_summary: Dict[str, int] = {}
        material_question_count: Dict[str, int] = {}

        for q in questions:
            status_summary[q.status] = status_summary.get(q.status, 0) + 1
            mat = q.source_material or "未标记"
            material_question_count[mat] = material_question_count.get(mat, 0) + 1
            rr = q_routing_map.get(q.id)
            if rr:
                routing_summary[rr.model_name] = routing_summary.get(rr.model_name, 0) + 1

        blocked_materials = [m for m in materials if m.is_rollback_blocker]
        blocker_material_names = [m.material_name for m in blocked_materials]

        rollback_blockers_report = []
        for rb in rollbacks:
            rollback_blockers_report.append({
                "round": rb.round_no,
                "from_status": rb.from_status,
                "to_status": rb.to_status,
                "reason": rb.rollback_reason or "",
                "blocker_material": rb.blocker_material_name or "",
                "blocker_material_id": rb.blocker_material_id,
                "blocked_question_count": len(rb.blocker_question_ids) if rb.blocker_question_ids else 0,
                "operator": rb.operator,
                "time": rb.created_at.strftime("%Y-%m-%d %H:%M:%S") if rb.created_at else "",
                "detail": rb.blocker_detail or {},
            })

        question_rows = []
        for q in questions:
            rr = q_routing_map.get(q.id)
            dup_of_title = ""
            if q.duplicate_of_id:
                master = QuestionCRUD.get(db, q.duplicate_of_id)
                dup_of_title = master.title if master else ""
            issue_flags = []
            if q.is_old_format:
                issue_flags.append("旧表格式")
            if q.has_missing_unit:
                issue_flags.append("漏填单位")
            if q.has_append_remark:
                issue_flags.append("含补录备注")
            question_rows.append({
                "question_id": q.id,
                "question_no": q.question_no or "",
                "title": q.title or "",
                "category": q.category or "",
                "difficulty": q.difficulty or "",
                "source_material": q.source_material or "",
                "source_sheet": q.source_sheet or "",
                "source_row": q.source_row or "",
                "status": q.status,
                "is_duplicate": q.status == QuestionStatus.DUPLICATE,
                "duplicate_of": q.duplicate_of_id or "",
                "duplicate_of_title": dup_of_title,
                "dedup_round": q.dedup_round,
                "unit": q.unit or "",
                "remark": q.remark or "",
                "remark_append": q.remark_append or "",
                "issue_flags": "、".join(issue_flags),
                "is_old_format": q.is_old_format,
                "has_missing_unit": q.has_missing_unit,
                "has_append_remark": q.has_append_remark,
                "routed_model": rr.model_name if rr else "",
                "routing_confidence": rr.confidence if rr else 0,
                "routing_rule": rr.routing_rule if rr else "",
                "need_review": rr.need_review if rr else False,
                "review_reason": rr.review_reason if rr else "",
                "routing_match_tags": "、".join(rr.match_tags) if (rr and rr.match_tags) else "",
            })

        change_rows = []
        for c in changes:
            change_rows.append({
                "id": c.id,
                "question_id": c.question_id or "",
                "change_type": c.change_type,
                "field": c.field_name or "",
                "before_status": c.before_status or "",
                "after_status": c.after_status or "",
                "before_value": str(c.before_value) if c.before_value else "",
                "after_value": str(c.after_value) if c.after_value else "",
                "operator": c.operator,
                "round": c.operation_round,
                "reason": c.reason or "",
                "source_material": c.source_material or "",
                "time": c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
            })

        review_rows = []
        for r in reviews:
            diff_str = ""
            if r.change_diff:
                parts = []
                for k, v in (r.change_diff or {}).items():
                    if isinstance(v, dict) and "before" in v and "after" in v:
                        parts.append(f"{k}: {v['before']} -> {v['after']}")
                    else:
                        parts.append(f"{k}: {v}")
                diff_str = "; ".join(parts)
            review_rows.append({
                "id": r.id,
                "question_id": r.question_id or "",
                "reviewer": r.reviewer,
                "review_type": r.review_type or "",
                "review_action": r.review_action or "",
                "before_status": r.before_status or "",
                "after_status": r.after_status or "",
                "manual_fix": "是" if r.manual_fix else "否",
                "change_diff": diff_str,
                "comment": r.comment or "",
                "round": r.operation_round,
                "time": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            })

        summary = {
            "batch_id": batch.id,
            "batch_no": batch.batch_no,
            "batch_name": batch.batch_name,
            "status": batch.status,
            "current_round": batch.current_round,
            "importer": batch.importer,
            "remark": batch.remark or "",
            "source_file": batch.source_file or "",
            "created_at": batch.created_at.strftime("%Y-%m-%d %H:%M:%S") if batch.created_at else "",
            "updated_at": batch.updated_at.strftime("%Y-%m-%d %H:%M:%S") if batch.updated_at else "",
            "last_operation": batch.last_operation or "",
            "last_operator": batch.last_operator or "",
            "total_count": batch.total_count,
            "valid_count": batch.valid_count,
            "duplicate_count": batch.duplicate_count,
            "conflict_count": batch.conflict_count,
            "rollback_count": batch.rollback_count,
            "routing_summary": routing_summary,
            "status_summary": status_summary,
            "material_question_count": material_question_count,
            "blocked_materials": blocker_material_names,
            "reviewed_by": list({r.reviewer for r in reviews}),
            "rollback_count_log": len(rollbacks),
        }

        return {
            "summary": summary,
            "materials": [
                {
                    "id": m.id,
                    "name": m.material_name,
                    "type": m.material_type or "",
                    "sheet": m.sheet_name or "",
                    "row": m.source_row or "",
                    "order": m.import_order,
                    "is_blocker": m.is_rollback_blocker,
                    "blocker_reason": m.blocker_reason or "",
                    "remark": m.remark or "",
                }
                for m in materials
            ],
            "rollback_blockers": rollback_blockers_report,
            "questions": question_rows,
            "changes": change_rows,
            "reviews": review_rows,
        }

    @staticmethod
    def export_excel(db: Session, batch_id: int) -> Tuple[str, str]:
        try:
            import pandas as pd
            import xlsxwriter
        except ImportError:
            raise RuntimeError("需要安装 pandas、openpyxl 和 xlsxwriter")

        data = ReportService.build_report_data(db, batch_id)
        batch = BatchCRUD.get(db, batch_id)
        filename = ReportService._generate_filename(batch, "xlsx")
        filepath = os.path.join(EXPORTS_DIR, filename)

        with pd.ExcelWriter(filepath, engine="xlsxwriter") as writer:
            wb = writer.book
            red_fmt = wb.add_format({"font_color": "red", "bold": True})
            yellow_fmt = wb.add_format({"bg_color": "#FFFF99"})
            header_fmt = wb.add_format({"bold": True, "bg_color": "#4472C4", "font_color": "white"})

            s = data["summary"]
            summary_rows = [
                ["批次编号", s["batch_no"]],
                ["批次名称", s["batch_name"]],
                ["当前状态", s["status"]],
                ["当前轮次", f"第{s['current_round']}轮"],
                ["导入人", s["importer"]],
                ["源文件", s["source_file"]],
                ["备注", s["remark"]],
                ["创建时间", s["created_at"]],
                ["最近操作", f"{s['last_operator']} @ {s['last_operation']}"],
                ["最后更新", s["updated_at"]],
                ["", ""],
                ["题目总数", s["total_count"]],
                ["有效题目", s["valid_count"]],
                ["重复题目", s["duplicate_count"]],
                ["冲突题目", s["conflict_count"]],
                ["回滚标记题", s["rollback_count"]],
                ["", ""],
                ["发生回滚次数", f"{s['rollback_count_log']} 次"],
                ["版本回滚卡点材料", "、".join(s["blocked_materials"]) if s["blocked_materials"] else "无"],
                ["", ""],
                ["路由命中分布", ""],
            ]
            for model, cnt in sorted(s["routing_summary"].items(), key=lambda x: -x[1]):
                summary_rows.append([f"  {model}", cnt])
            summary_rows.append(["", ""])
            summary_rows.append(["题目状态分布", ""])
            for st, cnt in s["status_summary"].items():
                summary_rows.append([f"  {st}", cnt])
            summary_rows.append(["", ""])
            summary_rows.append(["材料题量分布", ""])
            for mat, cnt in s["material_question_count"].items():
                summary_rows.append([f"  {mat}", cnt])

            pd.DataFrame(summary_rows, columns=["项目", "内容"]).to_excel(
                writer, sheet_name="汇总", index=False
            )
            ws = writer.sheets["汇总"]
            for col in range(2):
                ws.set_column(col, col, 30)
            for row_num in range(len(summary_rows)):
                for col_num in range(2):
                    ws.write(row_num, col_num, summary_rows[row_num][col_num],
                             header_fmt if row_num == 0 else None)

            if data["rollback_blockers"]:
                rb_df = pd.DataFrame(data["rollback_blockers"])
                rb_df.to_excel(writer, sheet_name="回滚卡点", index=False)
                ws_rb = writer.sheets["回滚卡点"]
                for i, col in enumerate(rb_df.columns):
                    ws_rb.set_column(i, i, 18)
                for i in range(len(rb_df)):
                    ws_rb.set_row(i + 1, None, red_fmt)

            mats_df = pd.DataFrame(data["materials"])
            mats_df.rename(columns={
                "id": "材料ID", "name": "材料名称", "type": "类型",
                "sheet": "工作表", "row": "起始行", "order": "导入顺序",
                "is_blocker": "是否回滚卡点", "blocker_reason": "卡点原因", "remark": "备注",
            }, inplace=True)
            mats_df.to_excel(writer, sheet_name="材料清单", index=False)
            ws_m = writer.sheets["材料清单"]
            for i in range(len(mats_df.columns)):
                ws_m.set_column(i, i, 18)

            q_df = pd.DataFrame(data["questions"])
            q_df.rename(columns={
                "question_id": "题目ID", "question_no": "题编号", "title": "题干",
                "category": "分类", "difficulty": "难度", "source_material": "来源材料",
                "source_sheet": "来源工作表", "source_row": "来源行号", "status": "状态",
                "is_duplicate": "是否重复", "duplicate_of": "合并进ID",
                "duplicate_of_title": "合并进题目标题", "dedup_round": "去重轮次",
                "unit": "单位", "remark": "备注", "remark_append": "补录备注",
                "issue_flags": "数据问题", "is_old_format": "旧表格式",
                "has_missing_unit": "漏填单位", "has_append_remark": "含补录备注",
                "routed_model": "命中模型", "routing_confidence": "命中置信度",
                "routing_rule": "命中规则", "need_review": "需复核",
                "review_reason": "复核原因", "routing_match_tags": "命中关键词",
            }, inplace=True)
            q_df.to_excel(writer, sheet_name="题目明细", index=False)
            ws_q = writer.sheets["题目明细"]
            ws_q.set_column(0, 1, 10)
            ws_q.set_column(2, 2, 60)
            ws_q.set_column(3, 10, 14)
            ws_q.set_column(19, 19, 18)
            ws_q.set_column(20, 22, 12)

            ch_df = pd.DataFrame(data["changes"])
            ch_df.rename(columns={
                "id": "变更ID", "question_id": "题目ID", "change_type": "变更类型",
                "field": "字段", "before_status": "前状态", "after_status": "后状态",
                "before_value": "变更前", "after_value": "变更后",
                "operator": "操作人", "round": "轮次", "reason": "原因",
                "source_material": "来源材料", "time": "时间",
            }, inplace=True)
            ch_df.to_excel(writer, sheet_name="变更记录", index=False)

            rv_df = pd.DataFrame(data["reviews"])
            rv_df.rename(columns={
                "id": "复核ID", "question_id": "题目ID", "reviewer": "复核人",
                "review_type": "复核类型", "review_action": "动作",
                "before_status": "前状态", "after_status": "后状态",
                "manual_fix": "人工修正", "change_diff": "字段变化",
                "comment": "备注", "round": "轮次", "time": "时间",
            }, inplace=True)
            rv_df.to_excel(writer, sheet_name="复核记录", index=False)

        return filename, filepath

    @staticmethod
    def export_json(db: Session, batch_id: int) -> Tuple[str, str, Dict[str, Any]]:
        data = ReportService.build_report_data(db, batch_id)
        batch = BatchCRUD.get(db, batch_id)
        filename = ReportService._generate_filename(batch, "json")
        filepath = os.path.join(EXPORTS_DIR, filename)
        import json
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        return filename, filepath, data
