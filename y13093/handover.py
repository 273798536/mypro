from typing import List, Dict, Optional
from processor import MaterialProcessor
from models import Material, ViewSnapshot, ViewAngle, MaterialStatus


class HandoverWorkflow:
    """接手同事标准工作流：先找异常 → 换视角 → 截图，视图条件跟着保存"""

    def __init__(self, processor: MaterialProcessor):
        self.p = processor
        self.step_log: List[str] = []

    def step1_anomaly_first(self) -> List[Dict]:
        """第一步：先找异常对象，按 关联真异常材料数→level→last_seen 排序

        只有 anomaly_material_ids 非空的对象才是接手同事真正要处理的入口；
        只有 related_material_ids（被 normal/supplement 引用但无真异常材料）
        的对象仅作参考，不能作为接手流程入口。
        """
        queue = self.p.anomaly_queue_sorted()
        result = []
        for item in queue:
            valid_entry = len(item.anomaly_material_ids) > 0
            quick_entry_material_id = item.anomaly_material_ids[0] if valid_entry else None
            result.append({
                "object_id": item.object_id,
                "object_name": item.object_name,
                "level": item.level,
                "anomaly_material_count": len(item.anomaly_material_ids),
                "anomaly_material_ids": list(item.anomaly_material_ids),
                "reference_material_count": len(item.related_material_ids) - len(item.anomaly_material_ids),
                "all_related_materials": list(item.related_material_ids),
                "queue_entry_valid": valid_entry,
                "quick_entry_material_id": quick_entry_material_id,
            })
        self.step_log.append(
            f"[STEP1] 异常队列已检索，共{len(result)}条，"
            f"其中有效接手入口{sum(1 for r in result if r['queue_entry_valid'])}条"
        )
        return result

    def step2_switch_view(self, material_id: str,
                          angle: ViewAngle,
                          zoom: float = 1.0,
                          pan_x: int = 0,
                          pan_y: int = 0,
                          highlight: Optional[List[str]] = None) -> Dict:
        """第二步：换视角，视图条件自动关联原筛选条件

        核心检查点：入口材料必须 status=anomaly，否则不是接手同事该处理的路径，
        直接报错阻断，避免在正常材料上跑异常接手流程。
        """
        mat = self.p._find(material_id)
        if mat.status != MaterialStatus.ANOMALY:
            raise ValueError(
                f"[STEP2-检查失败] 接手流程入口材料 status={mat.status.value}，"
                f"必须为 anomaly。material_id={material_id}"
            )
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
            f"[STEP2] 换视角 {material_id}(status={mat.status.value}): "
            f"{angle.value} zoom={zoom}, "
            f"视图筛选关联: {'OK' if exported.view_snapshot and exported.view_snapshot.filter_fp else 'FAIL'}"
        )
        return {
            "material_id": exported.material_id,
            "material_status": exported.status.value,
            "new_view_tag": exported.view_snapshot.tag() if exported.view_snapshot else "",
            "filter_fp_bound": exported.view_snapshot.filter_fp if exported.view_snapshot else "",
            "expected_fp": exported.filter_condition.fingerprint(),
            "bound_ok": (exported.view_snapshot.filter_fp == exported.filter_condition.fingerprint()) if exported.view_snapshot else False,
            "highlighted": new_view.highlighted_objects,
        }

    def step3_verify_export(self, material_id: str) -> Dict:
        """第三步：检查三件事：放样例、重跑、看异常队列

        强化检查：
        - 放样例：sensor_record_id 非空
        - 重跑：view 绑定了筛选条件，且 fingerprint 和原筛选一致
        - 看异常队列：①材料本身 status=anomaly；②anomaly_refs 非空
        """
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
                "ok": mat.status == MaterialStatus.ANOMALY and len(mat.anomaly_refs) > 0,
                "material_status": mat.status.value,
                "anomaly_refs": mat.anomaly_refs,
            },
        }
        all_ok = (
            verify["放_样例"]["ok"]
            and verify["重_跑"]["ok"]
            and verify["重_跑"]["match"]
            and verify["看_异常队列"]["ok"]
        )
        verify["全部通过"] = all_ok
        self.step_log.append(
            f"[STEP3] {material_id}(status={mat.status.value}) 验证结果: "
            f"{'通过' if all_ok else '不通过'}"
        )
        return {
            "detail_marker": detail["detail_marker"],
            "material_status": mat.status.value,
            "triplet_consistent": detail["triplet_check"]["consistent"],
            "verify": verify,
            "export_stamps": detail.get("handover_checklist", []),
            "brief": brief,
        }

    def quick_start(self, anomaly_object_id: Optional[str] = None) -> List[Dict]:
        """一键式：从有效异常对象（anomaly_material_ids 非空）开始到截图完成

        只选 queue_entry_valid=True 的对象作为入口；如果指定的 anomaly_object_id
        无效，自动回退到排序最前的有效对象；如果一个有效对象都没有，直接报错。
        """
        outputs = []
        anomalies = self.step1_anomaly_first()
        valid_entries = [a for a in anomalies if a["queue_entry_valid"]]
        if not valid_entries:
            self.step_log.append("[QUICK] 无有效异常接手入口（所有对象 anomaly_material_ids 均为空），退出")
            return outputs
        target = None
        if anomaly_object_id:
            for a in valid_entries:
                if a["object_id"] == anomaly_object_id:
                    target = a
                    break
            if not target:
                self.step_log.append(
                    f"[QUICK] 指定 anomaly_object_id={anomaly_object_id} 不是有效接手入口，"
                    f"改用最优先的 {valid_entries[0]['object_id']}"
                )
        if not target:
            target = valid_entries[0]
        outputs.append({"step": "1-异常定位", "data": target})
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
