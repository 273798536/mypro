import json
import os
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .storage import Storage
from .field_adapter import FieldAdapter
from .param_version import ParamVersionManager
from .gap_detector import GapDetector


class ReportExporter:
    """
    声学混响报告导出核心。

    保证:
      - 每次导出都绑定参数版本, 重启/重跑后历史备注、状态、截图说明都能对上
      - 失败时把 "失败原因 + 截图说明" 落库, 值班脚本可读
      - 导出产物 (JSON/CSV) 自描述, 评审会上不看代码也能讲
    """

    def __init__(
        self,
        storage: Storage,
        field_adapter: FieldAdapter = None,
        param_manager: ParamVersionManager = None,
        gap_detector: GapDetector = None,
        output_dir: str = None,
    ):
        self.storage = storage
        self.field_adapter = field_adapter or FieldAdapter()
        self.param_manager = param_manager or ParamVersionManager(storage)
        self.gap_detector = gap_detector or GapDetector(storage)
        if output_dir is None:
            output_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "exports",
            )
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    # ---------- 照片接入 ----------
    def ingest_photos(
        self,
        photo_rows: List[Dict[str, Any]],
        source_system: str = "",
        report_run_id: int = None,
    ) -> Dict[str, Any]:
        """
        接入复核人交来的现场照片, 自动做字段归一化, 保住来源与处理状态。
        photo_rows: 任意字段名的行列表。
        """
        summary = {
            "total": len(photo_rows),
            "ingested": 0,
            "failed": 0,
            "unmapped_fields": [],
            "by_status": {},
        }
        for row in photo_rows:
            try:
                normalized, unmapped = self.field_adapter.normalize(row, source_system)
                if unmapped:
                    summary["unmapped_fields"].extend(
                        (k, normalized.get("source_system") or source_system or "unknown")
                        for k in unmapped
                    )
                photo_id = normalized.get("photo_id")
                if not photo_id:
                    summary["failed"] += 1
                    continue
                status = normalized.get("process_status") or "pending"
                pid = self.storage.upsert_photo(
                    photo_id=photo_id,
                    original_fields=row,
                    normalized_fields=normalized,
                    source_system=normalized.get("source_system") or source_system,
                    raw_description=normalized.get("raw_description", ""),
                    file_path=normalized.get("file_path", ""),
                    upload_time=normalized.get("upload_time", ""),
                    reviewer=normalized.get("reviewer", ""),
                    process_status=status,
                )
                if report_run_id is not None:
                    self.storage.set_photo_status(
                        photo_id, status, report_run_id=report_run_id
                    )
                summary["ingested"] += 1
                summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
            except Exception:
                summary["failed"] += 1
        return summary

    # ---------- 执行导出 ----------
    def run_export(
        self,
        sample_rows: List[Dict[str, Any]] = None,
        photo_rows: List[Dict[str, Any]] = None,
        source_file: str = "",
        source_system: str = "",
        screenshot_path: str = "",
        screenshot_description: str = "",
        triggered_by: str = "scheduled",
        current_remark: str = "",
        historical_remark: str = "",
        param_version_tag: str = None,
        extra_payload: Dict[str, Any] = None,
        inherit_from_run_id: int = None,
    ) -> Dict[str, Any]:
        """
        执行一次完整的导出流程, 值班脚本只需调用这一个入口。

        返回结构始终包含: run_id / run_tag / status / failure_reason / export_path
        这样值班脚本即使失败也能稳定解析。

        inherit_from_run_id: 重跑时传入旧 run_id, 会把旧 run 关联的采样缺口
            (含人工补录) 复制到新 run, 保证导出内容与现场照片、处理结果对得上。
        """
        result = {
            "run_id": None,
            "run_tag": None,
            "status": "running",
            "failure_reason": "",
            "export_path": "",
            "param_version_tag": "",
            "gap_count": 0,
            "photo_count": 0,
        }
        try:
            pv = self.param_manager.get(param_version_tag)
            if not pv:
                raise RuntimeError(
                    "没有可用的参数版本, 请先通过 param_manager.save 注册参数"
                )
            result["param_version_tag"] = pv["version_tag"]
            params = pv["params"]

            run_id, run_tag = self.storage.create_report_run(
                param_version_id=pv["id"],
                triggered_by=triggered_by,
                historical_remark=historical_remark,
            )
            result["run_id"] = run_id
            result["run_tag"] = run_tag

            # 照片接入
            if photo_rows:
                ing = self.ingest_photos(
                    photo_rows,
                    source_system=source_system,
                    report_run_id=run_id,
                )
                result["photo_count"] = ing["ingested"]
                for p in self.storage.list_photos(report_run_id=run_id):
                    self.storage.set_photo_status(
                        p["photo_id"], "linked", report_run_id=run_id
                    )

            # 缺口检测
            gap_count = 0
            if sample_rows:
                detected = self.gap_detector.detect_from_rows(
                    rows=sample_rows,
                    report_run_id=run_id,
                    sample_rate=int(params.get("sample_rate", 48000)),
                    gap_tolerance_samples=int(params.get("gap_tolerance_samples", 3)),
                    source_file=source_file,
                )
                gap_count = len(detected)
            # 重跑继承: 把旧 run 的缺口 (含人工补录) 复制到新 run
            if inherit_from_run_id:
                inherited = self._inherit_gaps(
                    old_run_id=inherit_from_run_id,
                    new_run_id=run_id,
                    re_detected=bool(sample_rows),
                )
                gap_count += inherited
            result["gap_count"] = gap_count

            # 先落库截图/备注/成功状态, 再生成导出文件, 确保导出内容与 DB(页面)一致
            self.storage.update_report_run(
                run_id=run_id,
                status="success",
                screenshot_path=screenshot_path,
                screenshot_description=screenshot_description,
                current_remark=current_remark,
                operator=triggered_by,
            )

            # 生成导出文件 (此时 DB 已含截图说明/当前备注/状态, 文件内容与页面一致)
            export_path, export_summary = self._build_export_artifact(
                run_id=run_id,
                run_tag=run_tag,
                pv=pv,
                extra_payload=extra_payload or {},
            )
            result["export_path"] = export_path

            self.storage.update_report_run(
                run_id=run_id,
                export_path=export_path,
                operator=triggered_by,
            )
            result["status"] = "success"
            result["summary"] = export_summary
            return result
        except Exception as exc:
            tb = traceback.format_exc()
            failure_reason = f"{type(exc).__name__}: {exc}"
            result["status"] = "failed"
            result["failure_reason"] = failure_reason
            if result["run_id"]:
                self.storage.update_report_run(
                    run_id=result["run_id"],
                    status="failed",
                    failure_reason=failure_reason + "\n" + tb,
                    screenshot_path=screenshot_path,
                    screenshot_description=screenshot_description or "导出异常, 请查看失败原因",
                    current_remark=current_remark,
                    operator=triggered_by,
                )
            return result

    def _build_export_artifact(
        self,
        run_id: int,
        run_tag: str,
        pv: Dict[str, Any],
        extra_payload: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any]]:
        run = self.storage.get_report_run(run_id)
        photos = self.storage.list_photos(report_run_id=run_id)
        gaps = self.gap_detector.list_for_report(run_id)
        audit_trail = self.storage.list_audit_log(
            entity_type="report_run", entity_id=run_id, limit=50
        )
        param_trace = self.param_manager.trace_for_report(run)

        # 给不看代码的人看的摘要: 数字从哪来
        human_summary = {
            "报告编号": run_tag,
            "开始时间": run.get("started_at"),
            "触发方": run.get("triggered_by"),
            "参数版本": pv["version_tag"],
            "参数来源": param_trace.get("param_source", ""),
            "参数操作人": param_trace.get("param_operator", ""),
            "参数备注": param_trace.get("param_remark", ""),
            "参数内容": pv["params"],
            "照片数量": len(photos),
            "采样缺口数量": len(gaps),
            "缺口影响范围": [g["impact_scope"] for g in gaps],
            "历史备注": run.get("historical_remark", ""),
            "当前备注": run.get("current_remark", ""),
            "截图说明": run.get("screenshot_description", ""),
            "导出时间": datetime.now().isoformat(timespec="seconds"),
        }

        artifact = {
            "human_summary": human_summary,
            "param_trace": param_trace,
            "photos": [
                {
                    "photo_id": p["photo_id"],
                    "source_system": p["source_system"],
                    "process_status": p["process_status"],
                    "raw_description": p["raw_description"],
                    "file_path": p["file_path"],
                    "reviewer": p["reviewer"],
                    "upload_time": p["upload_time"],
                    "original_fields": p["original_fields"],
                    "normalized_fields": p["normalized_fields"],
                }
                for p in photos
            ],
            "sampling_gaps": gaps,
            "extra": extra_payload,
            "audit_trail_tail": audit_trail[:20],
        }

        file_name = f"reverb-report-{run_tag}.json"
        export_path = os.path.join(self.output_dir, file_name)
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump(artifact, f, ensure_ascii=False, indent=2)
        return export_path, human_summary

    # ---------- 重跑 / 状态补录 ----------
    def _inherit_gaps(
        self,
        old_run_id: int,
        new_run_id: int,
        re_detected: bool,
    ) -> int:
        """
        把旧 run 的缺口复制到新 run。
        - 人工补录缺口 (is_manual=True) 始终复制, 现场判断不丢。
        - 自动检测缺口仅在未重新检测 (re_detected=False) 时复制, 避免与新鲜检测重复。
        返回复制的条数。
        """
        old_gaps = self.storage.list_gaps(old_run_id)
        copied = 0
        for g in old_gaps:
            is_manual = bool(g.get("is_manual"))
            if re_detected and not is_manual:
                continue
            self.storage.add_sampling_gap(
                report_run_id=new_run_id,
                gap_type=g["gap_type"],
                impact_scope=g["impact_scope"],
                source_file=g.get("source_file") or "",
                source_row=g.get("source_row"),
                start_time=g.get("start_time") or "",
                end_time=g.get("end_time") or "",
                frequency_range=g.get("frequency_range") or "",
                description=g.get("description") or "",
                is_manual=is_manual,
            )
            copied += 1
        return copied

    def retry(
        self,
        run_tag: str,
        screenshot_path: str = "",
        screenshot_description: str = "",
        current_remark: str = "",
        triggered_by: str = "retry",
        sample_rows: List[Dict[str, Any]] = None,
        photo_rows: List[Dict[str, Any]] = None,
        source_file: str = "",
        source_system: str = "",
    ) -> Dict[str, Any]:
        """
        重启后针对某次 run 进行重跑。

        会继承旧 run 关联的:
          - 照片 (用原始字段重新接入并挂到新 run, 原始说法不丢)
          - 采样缺口 (含人工补录, 复制到新 run, 来源行/影响范围保留)
          - 历史备注 (旧 current_remark + 失败原因 并入 historical_remark)
        从而保证重跑后导出内容与现场照片、处理结果仍能对得上。
        """
        prev = self.storage.get_report_run(run_tag=run_tag)
        if not prev:
            return {
                "status": "failed",
                "failure_reason": f"找不到 run_tag={run_tag}",
                "run_tag": run_tag,
            }
        prev_id = prev["id"]

        # 继承照片: 未显式传入时, 用旧 run 的原始字段重新接入
        inherited_source_system = source_system
        if photo_rows is None:
            prev_photos = self.storage.list_photos(report_run_id=prev_id)
            photo_rows = [p["original_fields"] for p in prev_photos]
            if not inherited_source_system:
                for p in prev_photos:
                    if p.get("source_system"):
                        inherited_source_system = p["source_system"]
                        break

        # 继承历史备注: 把之前的 current_remark 并入 historical_remark
        new_hist = (
            (prev.get("historical_remark") or "").rstrip()
            + (f"\n[{prev.get('finished_at') or prev.get('started_at')}] {prev.get('status')}:"
               f" {prev.get('current_remark') or ''} {prev.get('failure_reason') or ''}".strip()
               if (prev.get("current_remark") or prev.get("failure_reason"))
               else "")
        ).strip()

        active_pv = self.storage.get_param_version(None)
        if not active_pv:
            return {
                "status": "failed",
                "failure_reason": "没有可用的参数版本, 请先注册参数",
                "run_tag": run_tag,
            }
        return self.run_export(
            sample_rows=sample_rows,
            photo_rows=photo_rows,
            source_file=source_file,
            source_system=inherited_source_system,
            screenshot_path=screenshot_path,
            screenshot_description=screenshot_description,
            triggered_by=triggered_by,
            current_remark=current_remark,
            historical_remark=new_hist,
            param_version_tag=active_pv["version_tag"],
            inherit_from_run_id=prev_id,
        )

    def attach_screenshot(
        self,
        run_tag: str,
        screenshot_path: str,
        screenshot_description: str,
        operator: str = "system",
    ) -> bool:
        """
        独立入口: 为某次 run 补录截图和说明, 确保重启后还能对得上。
        """
        run = self.storage.get_report_run(run_tag=run_tag)
        if not run:
            return False
        self.storage.update_report_run(
            run_id=run["id"],
            screenshot_path=screenshot_path,
            screenshot_description=screenshot_description,
            operator=operator,
        )
        return True

    def attach_remark(
        self, run_tag: str, current_remark: str, operator: str = "system"
    ) -> bool:
        run = self.storage.get_report_run(run_tag=run_tag)
        if not run:
            return False
        self.storage.update_report_run(
            run_id=run["id"],
            current_remark=current_remark,
            operator=operator,
        )
        return True

    # ---------- 查询 ----------
    def list_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.storage.list_report_runs(limit)

    def get_run_detail(self, run_tag: str) -> Optional[Dict[str, Any]]:
        run = self.storage.get_report_run(run_tag=run_tag)
        if not run:
            return None
        run["photos"] = self.storage.list_photos(report_run_id=run["id"])
        run["gaps"] = self.gap_detector.list_for_report(run["id"])
        run["param_trace"] = self.param_manager.trace_for_report(run)
        run["audit"] = self.storage.list_audit_log(
            entity_type="report_run", entity_id=run["id"]
        )
        return run
