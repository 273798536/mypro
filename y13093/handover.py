from typing import List, Dict, Optional
from processor import MaterialProcessor
from models import Material, ViewSnapshot, ViewAngle, MaterialStatus


class HandoverWorkflow:
    """接手同事标准工作流：先找异常 → 换视角 → 截图，视图条件跟着保存"""

    def __init__(self, processor: MaterialProcessor):
        self.p = processor
        self.step_log: List[str] = []

    def step1_anomaly_first(self) -> List[Dict]:
        """第一步：先找异常对象，按优先级排序"""
        queue = self.p.anomaly_queue_sorted()
        result = []
        for item in queue:
            related_anomaly_mats = [
                m for m in self.p.materials
                if item.object_id in m.anomaly_refs
                and m.status == MaterialStatus.ANOMALY
            ]
            related_all = [
                m.material_id for m in self.p.materials
                if item.object_id in m.anomaly_refs
            ]
            result.append({
                "object_id": item.object_id,
                "object_name": item.object_name,
                "level": item.level,
                "anomaly_material_count": len(related_anomaly_mats),
                "all_related_materials": related_all,
                "quick_entry_material_id": related_anomaly_mats[0].material_id if related_anomaly_mats else (related_all[0] if related_all else None),
            })
        self.step_log.append(f"[STEP1] 异常队列已检索，共{len(result)}条")
        return result

    def step2_switch_view(self, material_id: str,
                          angle: ViewAngle,
                          zoom: float = 1.0,
                          pan_x: int = 0,
                          pan_y: int = 0,
                          highlight: Optional[List[str]] = None) -> Dict:
        """第二步：换视角，视图条件自动关联原筛选条件"""
        mat = self.p._find(material_id)
        new_view = ViewSnapshot(
            angle=angle,
            zoom_level=zoom,
            pan_offset_x=pan_x,
            pan_offset_y=pan_y,
            highlighted_objects=highlight or mat.anomaly_refs,
            filter_fp="",
        )
        exported = self.p.switch_view_and_export(material_id, new_view)
        self.step_log.append(
            f"[STEP2] 换视角 {material_id}: {angle.value} zoom={zoom}, "
            f"视图筛选关联: {'OK' if exported.view_snapshot and exported.view_snapshot.filter_fp else 'FAIL'}"
        )
        return {
            "material_id": exported.material_id,
            "new_view_tag": exported.view_snapshot.tag() if exported.view_snapshot else "",
            "filter_fp_bound": exported.view_snapshot.filter_fp if exported.view_snapshot else "",
            "expected_fp": exported.filter_condition.fingerprint(),
            "bound_ok": (exported.view_snapshot.filter_fp == exported.filter_condition.fingerprint()) if exported.view_snapshot else False,
            "highlighted": new_view.highlighted_objects,
        }

    def step3_verify_export(self, material_id: str) -> Dict:
        """第三步：检查三件事：放样例、重跑、看异常队列"""
        detail = self.p.open_detail(material_id)
        brief = self.p.export_brief(material_id)
        mat = self.p._find(material_id)
        verify = {
            "放_样例": {
                "ok": bool(mat.sensor_record_id),
                "sensor_record_id": mat.sensor_record_id,
            },
            "重_跑": {
                "ok": bool(mat.view_snapshot and mat.view_snapshot.filter_fp),
                "filter_fp": mat.filter_condition.fingerprint(),
                "view_filter_fp": mat.view_snapshot.filter_fp if mat.view_snapshot else "",
                "match": (mat.view_snapshot.filter_fp == mat.filter_condition.fingerprint()) if mat.view_snapshot else False,
            },
            "看_异常队列": {
                "ok": len(mat.anomaly_refs) > 0 if mat.status == MaterialStatus.ANOMALY else True,
                "anomaly_refs": mat.anomaly_refs,
            },
        }
        verify["全部通过"] = all(v["ok"] for k, v in verify.items() if k != "全部通过") and (
            verify["重_跑"]["match"] if verify["重_跑"]["ok"] else True
        )
        self.step_log.append(f"[STEP3] {material_id} 验证结果: {'通过' if verify['全部通过'] else '不通过'}")
        return {
            "detail_marker": detail["detail_marker"],
            "triplet_consistent": detail["triplet_check"]["consistent"],
            "verify": verify,
            "export_stamps": detail.get("handover_checklist", []),
            "brief": brief,
        }

    def quick_start(self, anomaly_object_id: Optional[str] = None) -> List[Dict]:
        """一键式：从异常对象开始到截图完成"""
        outputs = []
        anomalies = self.step1_anomaly_first()
        if not anomalies:
            self.step_log.append("[QUICK] 无异常对象，退出")
            return outputs
        target = None
        if anomaly_object_id:
            for a in anomalies:
                if a["object_id"] == anomaly_object_id:
                    target = a
                    break
        if not target:
            target = anomalies[0]
        outputs.append({"step": "1-异常定位", "data": target})
        if target["quick_entry_material_id"]:
            mid = target["quick_entry_material_id"]
            s2 = self.step2_switch_view(
                mid,
                angle=ViewAngle.CLOSE_UP,
                zoom=2.0,
                pan_x=0, pan_y=0,
                highlight=[target["object_id"]],
            )
            outputs.append({"step": "2-换视角截图", "data": s2})
            s3 = self.step3_verify_export(mid)
            outputs.append({"step": "3-三件事验证", "data": s3})
        return outputs

    def summary(self) -> str:
        return "\n".join(self.step_log)
