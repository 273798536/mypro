import csv
import io
from .database import get_db_cursor
from .tracker import NegSampleTracker
from .constants import STATUS_LABELS, DECISION_LABELS


class CSVExporter:
    def __init__(self, db_path=None):
        self.db_path = db_path
        self.tracker = NegSampleTracker(db_path)

    def export_runs(self, output_path=None, status=None):
        """
        导出运行记录为 CSV。
        状态使用中文标签，与页面显示一致。
        """
        runs = self.tracker.list_runs(status=status, limit=10000)

        headers = [
            "运行编号",
            "模型版本",
            "数据来源",
            "当前状态",
            "状态说明",
            "特征快照数",
            "参数变化数",
            "最新判断",
            "创建时间",
            "更新时间",
        ]

        rows = []
        for run in runs:
            run_id = run["run_id"]
            detail = self.tracker.get_run(run_id)
            if detail:
                snap_count = len(detail["feature_snapshots"])
                param_count = len(detail["param_changes"])
                decisions = detail["manual_decisions"]
                latest_decision = ""
                if decisions:
                    d = decisions[0]
                    label = DECISION_LABELS.get(d["decision"], d["decision"])
                    latest_decision = label
                    if d.get("decision_note"):
                        latest_decision += f"（{d['decision_note']}）"
            else:
                snap_count = 0
                param_count = 0
                latest_decision = ""

            status_label = STATUS_LABELS.get(run["status"], run["status"])

            rows.append([
                run_id,
                run.get("model_version") or "",
                run.get("data_source") or "",
                status_label,
                run.get("status_reason") or "",
                snap_count,
                param_count,
                latest_decision,
                run.get("created_at") or "",
                run.get("updated_at") or "",
            ])

        return self._write_csv(headers, rows, output_path)

    def export_feature_snapshots(self, run_id, output_path=None):
        """
        导出单条 run 的特征快照明细。
        保留原始数据来源和脏数据标记。
        """
        detail = self.tracker.get_run(run_id)
        if not detail:
            return {
                "success": False,
                "error": f"未找到运行记录：{run_id}",
            }

        snapshots = detail["feature_snapshots"]

        headers = [
            "运行编号",
            "特征名称",
            "特征值",
            "原始值",
            "数据来源",
            "是否脏数据",
            "快照顺序",
            "采集时间",
        ]

        rows = []
        for s in snapshots:
            rows.append([
                run_id,
                s["feature_name"],
                s.get("feature_value") or "",
                s.get("raw_value") or "",
                s.get("data_source") or "",
                "是" if s["is_raw_dirty"] else "否",
                s["snapshot_order"],
                s.get("created_at") or "",
            ])

        return self._write_csv(headers, rows, output_path)

    def export_param_changes(self, run_id, output_path=None):
        """
        导出单条 run 的参数变化明细。
        """
        detail = self.tracker.get_run(run_id)
        if not detail:
            return {
                "success": False,
                "error": f"未找到运行记录：{run_id}",
            }

        changes = detail["param_changes"]

        headers = [
            "运行编号",
            "参数名",
            "原值",
            "新值",
            "变化原因",
            "变化顺序",
            "记录时间",
        ]

        rows = []
        for p in changes:
            rows.append([
                run_id,
                p["param_name"],
                p.get("old_value") or "",
                p.get("new_value") or "",
                p.get("change_reason") or "",
                p["change_order"],
                p.get("created_at") or "",
            ])

        return self._write_csv(headers, rows, output_path)

    def export_decisions(self, output_path=None, decision=None):
        """
        导出人工判断历史。
        """
        from .decision import DecisionManager
        dm = DecisionManager(self.db_path)
        decisions = dm.list_decisions(decision=decision, limit=10000)

        headers = [
            "运行编号",
            "判断结果",
            "判断备注",
            "判断人",
            "模型版本快照",
            "判断时间",
        ]

        rows = []
        for d in decisions:
            label = DECISION_LABELS.get(d["decision"], d["decision"])
            rows.append([
                d["run_id"],
                label,
                d.get("decision_note") or "",
                d.get("decided_by") or "",
                d.get("model_version_snapshot") or "",
                d.get("created_at") or "",
            ])

        return self._write_csv(headers, rows, output_path)

    def export_full_detail(self, run_id, output_path=None):
        """
        导出单条 run 的完整明细（快照 + 参数 + 判断）。
        生成一个 CSV，包含所有相关信息。
        """
        detail = self.tracker.get_run(run_id)
        if not detail:
            return {
                "success": False,
                "error": f"未找到运行记录：{run_id}",
            }

        run = detail["run"]
        snapshots = detail["feature_snapshots"]
        param_changes = detail["param_changes"]
        decisions = detail["manual_decisions"]

        headers = [
            "类别",
            "运行编号",
            "名称/参数",
            "值",
            "原始值",
            "数据来源",
            "状态/结果",
            "备注",
            "顺序",
            "时间",
        ]

        rows = []

        status_label = STATUS_LABELS.get(run["status"], run["status"])
        rows.append([
            "基本信息",
            run_id,
            "当前状态",
            status_label,
            "",
            run.get("data_source") or "",
            status_label,
            run.get("status_reason") or "",
            0,
            run.get("created_at") or "",
        ])
        rows.append([
            "基本信息",
            run_id,
            "模型版本",
            run.get("model_version") or "",
            "",
            "",
            "",
            "",
            1,
            run.get("created_at") or "",
        ])

        for idx, s in enumerate(snapshots):
            dirty_label = "是" if s["is_raw_dirty"] else "否"
            rows.append([
                "特征快照",
                run_id,
                s["feature_name"],
                s.get("feature_value") or "",
                s.get("raw_value") or "",
                s.get("data_source") or "",
                f"脏数据：{dirty_label}",
                "",
                s["snapshot_order"],
                s.get("created_at") or "",
            ])

        for idx, p in enumerate(param_changes):
            rows.append([
                "参数变化",
                run_id,
                p["param_name"],
                f"{p.get('old_value') or ''} → {p.get('new_value') or ''}",
                "",
                "",
                "",
                p.get("change_reason") or "",
                p["change_order"],
                p.get("created_at") or "",
            ])

        for idx, d in enumerate(decisions):
            label = DECISION_LABELS.get(d["decision"], d["decision"])
            rows.append([
                "人工判断",
                run_id,
                f"第{len(decisions) - idx}次判断",
                label,
                "",
                "",
                label,
                d.get("decision_note") or "",
                idx,
                d.get("created_at") or "",
            ])

        return self._write_csv(headers, rows, output_path)

    def _write_csv(self, headers, rows, output_path=None):
        """
        写入 CSV。如果提供 output_path 就写文件，否则返回内容字符串。
        """
        if output_path:
            with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                writer.writerows(rows)
            return {
                "success": True,
                "output_path": output_path,
                "row_count": len(rows),
            }
        else:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(rows)
            return {
                "success": True,
                "content": output.getvalue(),
                "row_count": len(rows),
            }
