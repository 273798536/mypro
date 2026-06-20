import json
from .database import get_db_cursor
from .tracker import NegSampleTracker
from .constants import (
    STATUS_LABELS,
    STATUS_REVIEWING,
    STATUS_PENDING,
    STATUS_APPROVED,
    STATUS_REJECTED,
    STATUS_FAILED,
    ERROR_CONFLICT_UNRESOLVED,
    ERROR_MESSAGES,
)


class ReportGenerator:
    def __init__(self, db_path=None):
        self.db_path = db_path
        self.tracker = NegSampleTracker(db_path)

    def generate_report(self, run_id):
        """
        生成负采样任务报告。
        输出业务导向结论，告诉老周：哪条该补、哪条放行。
        """
        run_data = self.tracker.get_run(run_id)
        if not run_data:
            return {
                "success": False,
                "error_code": "E002",
                "error_message": ERROR_MESSAGES["E002"],
            }

        run = run_data["run"]
        snapshots = run_data["feature_snapshots"]
        param_changes = run_data["param_changes"]
        conflicts = run_data["conflicts"]
        decisions = run_data["manual_decisions"]

        if conflicts:
            return {
                "success": False,
                "error_code": ERROR_CONFLICT_UNRESOLVED,
                "error_message": ERROR_MESSAGES[ERROR_CONFLICT_UNRESOLVED],
                "run_id": run_id,
                "conflict_count": len(conflicts),
            }

        feature_summary = self._build_feature_summary(snapshots)
        param_summary = self._build_param_summary(param_changes)
        conclusion, action_items = self._build_conclusion_and_actions(
            run, snapshots, param_changes, decisions
        )

        report_content = self._format_report_text(
            run, feature_summary, param_summary, conclusion, action_items, decisions
        )

        with get_db_cursor(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO reports
                (run_id, report_content, feature_summary, param_summary,
                 conclusion, action_items)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    report_content,
                    json.dumps(feature_summary, ensure_ascii=False),
                    json.dumps(param_summary, ensure_ascii=False),
                    conclusion,
                    json.dumps(action_items, ensure_ascii=False),
                )
            )

        return {
            "success": True,
            "run_id": run_id,
            "status": run["status"],
            "status_label": STATUS_LABELS.get(run["status"], run["status"]),
            "conclusion": conclusion,
            "action_items": action_items,
            "feature_summary": feature_summary,
            "param_summary": param_summary,
            "report_text": report_content,
        }

    def _build_feature_summary(self, snapshots):
        total = len(snapshots)
        dirty_count = sum(1 for s in snapshots if s["is_raw_dirty"])
        features = {}
        for s in snapshots:
            features[s["feature_name"]] = {
                "value": s["feature_value"],
                "raw_value": s["raw_value"],
                "data_source": s["data_source"],
                "is_dirty": bool(s["is_raw_dirty"]),
            }
        return {
            "total_count": total,
            "dirty_count": dirty_count,
            "clean_count": total - dirty_count,
            "features": features,
        }

    def _build_param_summary(self, param_changes):
        total = len(param_changes)
        changes = {}
        for p in param_changes:
            changes[p["param_name"]] = {
                "old_value": p["old_value"],
                "new_value": p["new_value"],
                "reason": p["change_reason"],
            }
        return {
            "total_changes": total,
            "changes": changes,
        }

    def _build_conclusion_and_actions(self, run, snapshots, param_changes, decisions):
        status = run["status"]
        action_items = []

        if status == STATUS_PENDING:
            conclusion = "待确认：存在冲突，需项目经理确认后再判断"
            action_items.append("处理冲突后再进行人工判断")
        elif status == STATUS_APPROVED:
            conclusion = "可放行：负采样结果已通过人工判断"
        elif status == STATUS_REJECTED:
            conclusion = "需补材料：负采样结果不通过，需补充材料"
        elif status == STATUS_FAILED:
            conclusion = "失败：任务执行失败"
        else:
            conclusion = "待判断：请人工审核后决定放行或补材料"

        dirty_count = sum(1 for s in snapshots if s["is_raw_dirty"])
        if dirty_count > 0:
            action_items.append(
                f"有 {dirty_count} 条特征快照数据不完整，已保留原始值未做清洗，"
                f"请核对数据来源是否可靠"
            )

        if not snapshots:
            action_items.append("未采集到特征快照，请检查数据接入是否正常")

        if decisions:
            latest = decisions[0]
            conclusion += f"（最新人工判断："
            if latest["decision"] == "approve":
                conclusion += "放行"
            else:
                conclusion += "补材料"
            if latest.get("decision_note"):
                conclusion += f"，备注：{latest['decision_note']}"
            conclusion += ")"

        return conclusion, action_items

    def _format_report_text(self, run, feature_summary, param_summary,
                            conclusion, action_items, decisions):
        lines = []
        lines.append("=" * 50)
        lines.append("负采样任务追踪报告")
        lines.append("=" * 50)
        lines.append("")
        lines.append(f"运行编号：{run['run_id']}")
        lines.append(f"模型版本：{run.get('model_version') or '未填写'}")
        lines.append(f"数据来源：{run.get('data_source') or '未填写'}")
        lines.append(f"当前状态：{STATUS_LABELS.get(run['status'], run['status'])}")
        if run.get("status_reason"):
            lines.append(f"状态说明：{run['status_reason']}")
        lines.append(f"创建时间：{run['created_at']}")
        lines.append("")

        lines.append("-" * 50)
        lines.append("一、特征快照概览")
        lines.append("-" * 50)
        lines.append(f"总特征数：{feature_summary['total_count']}")
        lines.append(f"干净数据：{feature_summary['clean_count']} 条")
        lines.append(f"不完整数据：{feature_summary['dirty_count']} 条")
        lines.append("")
        if feature_summary["features"]:
            lines.append("特征明细：")
            for name, info in feature_summary["features"].items():
                dirty_tag = " [数据不完整]" if info["is_dirty"] else ""
                src = f"（来源：{info['data_source']}）" if info["data_source"] else ""
                lines.append(f"  - {name}: {info['value'] or '空'}{dirty_tag}{src}")
                if info["is_dirty"] and info["raw_value"]:
                    lines.append(f"    原始值：{info['raw_value']}")
        else:
            lines.append("（无特征快照记录）")
        lines.append("")

        lines.append("-" * 50)
        lines.append("二、参数变化记录")
        lines.append("-" * 50)
        lines.append(f"参数变化次数：{param_summary['total_changes']}")
        lines.append("")
        if param_summary["changes"]:
            for name, info in param_summary["changes"].items():
                reason = f"（原因：{info['reason']}）" if info["reason"] else ""
                lines.append(
                    f"  - {name}: {info['old_value'] or '无'} → {info['new_value'] or '无'}{reason}"
                )
        else:
            lines.append("（无参数变化记录）")
        lines.append("")

        if decisions:
            lines.append("-" * 50)
            lines.append("三、人工判断历史")
            lines.append("-" * 50)
            for d in decisions:
                decision_label = "放行" if d["decision"] == "approve" else "补材料"
                who = f"（判断人：{d['decided_by']}）" if d.get("decided_by") else ""
                note = f" - {d['decision_note']}" if d.get("decision_note") else ""
                ver = f" [模型版本：{d['model_version_snapshot']}]" if d.get("model_version_snapshot") else ""
                lines.append(f"  [{d['created_at']}] {decision_label}{who}{ver}{note}")
            lines.append("")

        lines.append("-" * 50)
        lines.append("四、结论与待办")
        lines.append("-" * 50)
        lines.append(f"结论：{conclusion}")
        lines.append("")
        if action_items:
            lines.append("待办事项：")
            for i, item in enumerate(action_items, 1):
                lines.append(f"  {i}. {item}")
        else:
            lines.append("待办事项：无")
        lines.append("")
        lines.append("=" * 50)

        return "\n".join(lines)

    def get_report(self, run_id):
        """
        获取已生成的报告。"""
        with get_db_cursor(self.db_path) as conn:
            report = conn.execute(
                "SELECT * FROM reports WHERE run_id = ?", (run_id,)
            ).fetchone()
            if not report:
                return None
            return dict(report)

    def list_reports(self, limit=50, offset=0):
        """
        列出所有报告。"""
        with get_db_cursor(self.db_path) as conn:
            rows = conn.execute(
                """
                SELECT r.*, runs.status, runs.model_version
                FROM reports r
                JOIN runs ON r.run_id = runs.run_id
                ORDER BY r.generated_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset)
            ).fetchall()
            return [dict(r) for r in rows]
