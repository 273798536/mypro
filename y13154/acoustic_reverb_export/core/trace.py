from typing import Any, Dict, List, Optional

from .storage import Storage
from .param_version import ParamVersionManager
from .gap_detector import GapDetector


class TraceQuerier:
    """
    交接/追溯查询。

    两个主要入口:
      1. from_photo(photo_id)        -> 从现场照片找到原始说法 (复核人原话 + 处理结果)
      2. from_report(run_tag)        -> 从报告 run 讲清截图说明和处理结果 (给老唐交接用)
      3. for_meeting(run_tag)        -> 评审会讲解素材 (数字从哪来)
    """

    def __init__(self, storage: Storage):
        self.storage = storage
        self.param_manager = ParamVersionManager(storage)
        self.gap_detector = GapDetector(storage)

    # ---- 1. 从照片出发: 找到原始说法 ----
    def from_photo(self, photo_id: str) -> Dict[str, Any]:
        photos = self.storage.list_photos(limit=10000)
        photo = next((p for p in photos if p["photo_id"] == photo_id), None)
        if not photo:
            return {
                "photo_id": photo_id,
                "found": False,
                "error": "未找到该照片记录",
            }

        run_info = None
        if photo.get("linked_report_run_id"):
            run = self.storage.get_report_run(photo["linked_report_run_id"])
            if run:
                run_info = {
                    "run_tag": run["run_tag"],
                    "status": run["status"],
                    "started_at": run["started_at"],
                    "finished_at": run["finished_at"],
                    "failure_reason": run.get("failure_reason", ""),
                    "screenshot_path": run.get("screenshot_path", ""),
                    "screenshot_description": run.get("screenshot_description", ""),
                    "current_remark": run.get("current_remark", ""),
                    "historical_remark": run.get("historical_remark", ""),
                    "export_path": run.get("export_path", ""),
                }

        photo_audit = self.storage.list_audit_log(
            entity_type="photo", entity_id=photo["id"], limit=50
        )

        return {
            "found": True,
            "photo_id": photo_id,
            "原始说法": {
                "raw_description": photo.get("raw_description", ""),
                "original_fields": photo["original_fields"],
                "来源系统": photo.get("source_system", ""),
                "复核人": photo.get("reviewer", ""),
                "上传时间": photo.get("upload_time", ""),
                "文件路径": photo.get("file_path", ""),
            },
            "当前处理状态": photo.get("process_status", ""),
            "归一化后字段": photo["normalized_fields"],
            "关联报告": run_info,
            "变更历史": [
                {
                    "time": a["created_at"],
                    "action": a["action"],
                    "operator": a.get("operator", ""),
                    "before": a.get("before"),
                    "after": a.get("after"),
                    "remark": a.get("remark", ""),
                }
                for a in photo_audit
            ],
            "交接话术": self._handoff_script_for_photo(photo, run_info),
        }

    @staticmethod
    def _handoff_script_for_photo(photo: Dict[str, Any], run_info: Optional[Dict[str, Any]]) -> str:
        parts = [f"照片编号 {photo['photo_id']}:"]
        if photo.get("raw_description"):
            parts.append(f"复核人原话: \"{photo['raw_description']}\"")
        if photo.get("source_system"):
            parts.append(f"(来源系统: {photo['source_system']}, 复核人: {photo.get('reviewer') or '未登记'})")
        parts.append(f"当前处理状态: {photo.get('process_status', 'pending')}")
        if run_info:
            parts.append(
                f"关联报告 {run_info['run_tag']} 状态 {run_info['status']};"
                f" 截图说明: {run_info.get('screenshot_description') or '无'}"
            )
            if run_info.get("failure_reason"):
                parts.append(f"失败原因: {run_info['failure_reason'].splitlines()[0]}")
            if run_info.get("current_remark"):
                parts.append(f"当前备注: {run_info['current_remark']}")
        return " ".join(parts)

    # ---- 2. 从报告出发: 讲清截图说明和处理结果 ----
    def from_report(self, run_tag: str) -> Dict[str, Any]:
        run = self.storage.get_report_run(run_tag=run_tag)
        if not run:
            return {"run_tag": run_tag, "found": False, "error": "未找到该报告 run"}
        photos = self.storage.list_photos(report_run_id=run["id"])
        gaps = self.gap_detector.list_for_report(run["id"])
        param_trace = self.param_manager.trace_for_report(run)
        audit = self.storage.list_audit_log(
            entity_type="report_run", entity_id=run["id"], limit=100
        )
        return {
            "found": True,
            "run_tag": run_tag,
            "基本信息": {
                "status": run["status"],
                "triggered_by": run.get("triggered_by", ""),
                "started_at": run["started_at"],
                "finished_at": run.get("finished_at", ""),
                "export_path": run.get("export_path", ""),
            },
            "截图说明": {
                "screenshot_path": run.get("screenshot_path", ""),
                "screenshot_description": run.get("screenshot_description", ""),
            },
            "失败原因": run.get("failure_reason", ""),
            "备注串": {
                "historical_remark": run.get("historical_remark", ""),
                "current_remark": run.get("current_remark", ""),
            },
            "参数来源": param_trace,
            "关联照片": [
                {
                    "photo_id": p["photo_id"],
                    "status": p["process_status"],
                    "raw_description": p.get("raw_description", ""),
                    "reviewer": p.get("reviewer", ""),
                }
                for p in photos
            ],
            "采样缺口": [
                {
                    "gap_type": g["gap_type"],
                    "source_file": g.get("source_file", ""),
                    "source_row": g.get("source_row"),
                    "impact_scope": g["impact_scope"],
                    "description": g.get("description", ""),
                }
                for g in gaps
            ],
            "审计追踪": audit,
            "交接话术": self._handoff_script_for_report(run, photos, gaps, param_trace),
        }

    @staticmethod
    def _handoff_script_for_report(
        run: Dict[str, Any],
        photos: List[Dict[str, Any]],
        gaps: List[Dict[str, Any]],
        param_trace: Dict[str, Any],
    ) -> str:
        parts = [
            f"报告 {run['run_tag']}: 状态 {run['status']}, 触发方 {run.get('triggered_by')}。"
        ]
        if param_trace.get("param_version_tag"):
            parts.append(
                f"使用参数版本 {param_trace['param_version_tag']}"
                f" (由 {param_trace.get('param_operator') or '未知'} 在 {param_trace.get('param_created_at')} 创建,"
                f" 来源: {param_trace.get('param_source') or '未标注'})。"
            )
        parts.append(f"接入照片 {len(photos)} 张, 检测到采样缺口 {len(gaps)} 处。")
        if gaps:
            parts.append("缺口影响: " + "; ".join(g["impact_scope"] for g in gaps) + "。")
        if run.get("screenshot_description"):
            parts.append(f"截图说明: \"{run['screenshot_description']}\"。")
        if run.get("failure_reason"):
            first = run["failure_reason"].splitlines()[0]
            parts.append(f"失败原因: {first}。")
        if run.get("current_remark"):
            parts.append(f"当前备注: {run['current_remark']}。")
        if run.get("historical_remark"):
            parts.append(
                f"历史备注 (重跑继承): {run['historical_remark'].splitlines()[-1] if run['historical_remark'] else ''}"
            )
        return "".join(parts)

    # ---- 3. 评审会讲解: 数字从哪来 ----
    def for_meeting(self, run_tag: str) -> Dict[str, Any]:
        detail = self.from_report(run_tag)
        if not detail.get("found"):
            return detail
        return {
            "run_tag": run_tag,
            "一句话总结": (
                f"报告 {run_tag} 于 {detail['基本信息']['started_at']} 由"
                f" {detail['基本信息']['triggered_by']} 触发, 状态 {detail['基本信息']['status']},"
                f" 共接入 {len(detail['关联照片'])} 张照片、检测到 {len(detail['采样缺口'])} 处采样缺口。"
            ),
            "参数线索": {
                "版本": detail["参数来源"].get("param_version_tag"),
                "创建人": detail["参数来源"].get("param_operator"),
                "创建时间": detail["参数来源"].get("param_created_at"),
                "来源": detail["参数来源"].get("param_source"),
                "备注": detail["参数来源"].get("param_remark"),
                "具体参数": detail["参数来源"].get("params"),
            },
            "采样缺口清单": [
                f"{i + 1}. {g['gap_type']}: {g['impact_scope']} (源文件 {g.get('source_file') or '未提供'}"
                f"{(' 第' + str(g['source_row']) + '行') if g.get('source_row') else ''})"
                for i, g in enumerate(detail["采样缺口"])
            ],
            "照片处理情况": [
                f"{p['photo_id']} [{p['status']}] {p.get('raw_description') or ''} (复核人: {p.get('reviewer') or '未登记'})"
                for p in detail["关联照片"]
            ],
            "处理结果说明": detail["截图说明"].get("screenshot_description") or detail["备注串"].get("current_remark") or "无",
            "失败原因(如有)": detail.get("失败原因", ""),
        }
