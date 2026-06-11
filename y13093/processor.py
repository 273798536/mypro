from datetime import datetime
from typing import List, Dict, Tuple, Optional
from models import (
    Material, MaterialStatus, FilterCondition, ViewSnapshot, ViewAngle,
    SceneAnnotation, SideNote, AnomalyQueueItem,
)


class MaterialProcessor:
    TOPIC = "桥隧检修平台剖面讲解"

    def __init__(self):
        self.materials: List[Material] = []
        self.anomaly_queue: List[AnomalyQueueItem] = []
        self._id_counter = 1000

    def _next_id(self, prefix: str) -> str:
        self._id_counter += 1
        return f"{prefix}{self._id_counter}"

    def _bind_view_to_filter(self, material: Material, view: ViewSnapshot) -> Material:
        view.filter_fp = material.filter_condition.fingerprint()
        material.view_snapshot = view
        return material

    def _sync_triplet(self, material: Material,
                      scene_text: str,
                      side_items: List[Tuple[int, str]]) -> Material:
        base_marker = material.detail_marker()
        material.scene_annotation = SceneAnnotation(text=f"{base_marker} {scene_text}")
        material.side_notes = [
            SideNote(order=o, content=f"{base_marker} {c}")
            for o, c in side_items
        ]
        if material.anomaly_refs:
            for oid in material.anomaly_refs:
                self._register_anomaly_ref(oid, material.material_id)
        return material

    def _register_anomaly_ref(self, object_id: str, material_id: str):
        for item in self.anomaly_queue:
            if item.object_id == object_id:
                if material_id not in item.related_material_ids:
                    item.related_material_ids.append(material_id)
                    item.last_seen = datetime.now()
                return
        self.anomaly_queue.append(AnomalyQueueItem(
            object_id=object_id,
            object_name=f"异常对象-{object_id}",
            level=3,
            first_seen=datetime.now(),
            last_seen=datetime.now(),
            related_material_ids=[material_id],
        ))

    def create_from_sensor(self,
                           sensor_record_id: str,
                           fc: FilterCondition,
                           view: ViewSnapshot,
                           scene_text: str,
                           side_items: List[Tuple[int, str]],
                           anomaly_refs: Optional[List[str]] = None,
                           status: MaterialStatus = MaterialStatus.NORMAL,
                           boundary_note: str = "",
                           supplement_note: str = "") -> Material:
        mat = Material(
            material_id=self._next_id("MAT"),
            topic=self.TOPIC,
            status=status,
            sensor_record_id=sensor_record_id,
            capture_time=datetime.now(),
            filter_condition=fc,
            anomaly_refs=anomaly_refs or [],
            is_screenshot=False,
            boundary_note=boundary_note,
            supplement_note=supplement_note,
        )
        mat = self._bind_view_to_filter(mat, view)
        mat = self._sync_triplet(mat, scene_text, side_items)
        mat.export_stamp("筛选")
        self.materials.append(mat)
        return mat

    def open_detail(self, material_id: str) -> Dict:
        mat = self._find(material_id)
        mat.export_stamp("详情")
        triplet = mat.consistent_triplet()
        return {
            "material_id": mat.material_id,
            "status": mat.status.value,
            "detail_marker": mat.detail_marker(),
            "filter": vars(mat.filter_condition),
            "filter_fingerprint": mat.filter_condition.fingerprint(),
            "view": vars(mat.view_snapshot) if mat.view_snapshot else None,
            "scene_annotation": mat.scene_annotation.text if mat.scene_annotation else "",
            "side_notes": [n.content for n in mat.side_notes],
            "anomaly_refs": mat.anomaly_refs,
            "triplet_check": {
                "scene_marker": triplet["scene"].split()[0] if triplet["scene"] else "",
                "side_marker": triplet["side"].split()[0] if triplet["side"] else "",
                "anomaly_marker": triplet["anomaly"].split()[0],
                "detail_marker": mat.detail_marker(),
                "consistent": {
                    triplet["scene"].split()[0] if triplet["scene"] else "",
                    triplet["side"].split()[0] if triplet["side"] else "",
                    triplet["anomaly"].split()[0],
                    mat.detail_marker(),
                } == {mat.detail_marker()},
            },
            "handover_checklist": mat.handover_checklist(),
        }

    def _resync_triplet_after_view_change(self, mat: Material):
        new_marker = mat.detail_marker()
        if mat.scene_annotation and " " in mat.scene_annotation.text:
            body = mat.scene_annotation.text.split(" ", 1)[1]
            mat.scene_annotation.text = f"{new_marker} {body}"
        new_sides = []
        for n in mat.side_notes:
            if " " in n.content:
                body = n.content.split(" ", 1)[1]
                new_sides.append(SideNote(order=n.order, content=f"{new_marker} {body}"))
            else:
                new_sides.append(n)
        mat.side_notes = new_sides

    def switch_view_and_export(self,
                               material_id: str,
                               new_view: ViewSnapshot) -> Material:
        mat = self._find(material_id)
        old_view_tag = mat.view_snapshot.tag() if mat.view_snapshot else "NONE"
        mat = self._bind_view_to_filter(mat, new_view)
        self._resync_triplet_after_view_change(mat)
        mat.is_screenshot = True
        stamp = mat.export_stamp(f"导出-换视角[{old_view_tag}→{new_view.tag()}]")
        mat.export_stamp("导出")
        self._audit_screenshot(mat, stamp)
        return mat

    def _audit_screenshot(self, mat: Material, stamp: str):
        if not mat.view_snapshot or not mat.view_snapshot.filter_fp:
            print(f"[AUDIT-WARN] {stamp} 截图未绑定筛选条件！")
            return
        expected_fp = mat.filter_condition.fingerprint()
        if mat.view_snapshot.filter_fp != expected_fp:
            print(f"[AUDIT-WARN] {stamp} 视图筛选指纹不匹配！")
        if mat.export_markers and "筛选" in mat.export_markers[0]:
            pass

    def export_brief(self, material_id: str) -> str:
        mat = self._find(material_id)
        lines = [
            f"== {self.TOPIC} 材料导出 ==",
            f"编号: {mat.material_id}  状态: {mat.status.value}",
            f"标记: {mat.detail_marker()}",
            f"传感器记录: {mat.sensor_record_id}",
            f"筛选指纹: {mat.filter_condition.fingerprint()}",
            f"场景标注: {mat.scene_annotation.text if mat.scene_annotation else '(无)'}",
        ]
        for n in mat.side_notes:
            lines.append(f"侧边说明[{n.order}]: {n.content}")
        lines.append(f"异常队列: {', '.join(mat.anomaly_refs) or '(无)'}")
        lines.append(f"放样例 -> sensor_record_id: {mat.sensor_record_id}")
        lines.append(f"重跑   -> filter_fingerprint: {mat.filter_condition.fingerprint()}")
        lines.append(f"看异常 -> anomaly_refs: {mat.anomaly_refs}")
        lines.append("--- 全链路标记 ---")
        for m in mat.export_markers:
            lines.append(f"  {m}")
        if mat.status == MaterialStatus.BOUNDARY:
            lines.append(f"边界样本备注: {mat.boundary_note}")
        if mat.status == MaterialStatus.SUPPLEMENT:
            lines.append(f"后补说明备注: {mat.supplement_note}")
        return "\n".join(lines)

    def _find(self, material_id: str) -> Material:
        for m in self.materials:
            if m.material_id == material_id:
                return m
        raise KeyError(f"材料不存在: {material_id}")

    def scan_orphan_screenshots(self) -> List[str]:
        orphans = []
        for m in self.materials:
            if m.is_screenshot:
                if not m.view_snapshot or not m.view_snapshot.filter_fp:
                    orphans.append(f"{m.material_id}: 截图无筛选绑定")
                elif m.view_snapshot.filter_fp != m.filter_condition.fingerprint():
                    orphans.append(f"{m.material_id}: 视图筛选指纹不匹配")
                scene_marker = m.scene_annotation.text.split()[0] if (m.scene_annotation and m.scene_annotation.text) else ""
                side_marker = m.side_notes[0].content.split()[0] if m.side_notes else ""
                anomaly_marker = m.detail_marker()
                bases = {scene_marker, side_marker, anomaly_marker}
                if len(bases) > 1:
                    orphans.append(f"{m.material_id}: 三套话不一致 -> scene={scene_marker[:30]}.., side={side_marker[:30]}.., detail={anomaly_marker[:30]}..")
        return orphans

    def anomaly_queue_sorted(self) -> List[AnomalyQueueItem]:
        return sorted(self.anomaly_queue, key=lambda x: (-x.level, x.last_seen))
