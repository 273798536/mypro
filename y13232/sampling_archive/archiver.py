import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Optional
from .models.material import Material, MaterialStatus
from .core.storage import Storage
from .core.deduplicator import Deduplicator
from .core.version_detector import VersionDetector
from .core.annotation import AnnotationManager
from .report.markdown_generator import MarkdownGenerator


class SamplingArchive:
    def __init__(self, data_dir: str = "data", output_dir: str = "output"):
        self.storage = Storage(data_dir)
        self.deduplicator = Deduplicator(threshold=0.75)
        self.version_detector = VersionDetector()
        self.annotation_manager = AnnotationManager()
        self.report_generator = MarkdownGenerator()
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def import_materials(self, materials_data: List[Dict], source: str = "人工录入") -> List[Material]:
        existing_materials = self.storage.load_materials()
        new_materials = []
        skipped_duplicates = []
        version_conflicts = []

        for item in materials_data:
            material = Material.from_dict(item)
            if not material.source:
                material.source = source
            if not material.source_raw:
                material.source_raw = str(item)

            self.storage.save_raw_data(material.id, item, source)

            is_dup, dup_material, confidence = self.deduplicator.is_duplicate(material, existing_materials)

            same_name = [m for m in existing_materials if m.name == material.name]
            reference_material = dup_material if is_dup else (same_name[0] if same_name else None)

            same_version = False
            if reference_material:
                same_version = self.version_detector.compare_versions(
                    material.version, reference_material.version
                ) == 0

            if is_dup and dup_material and same_version:
                skipped_duplicates.append({
                    "new": material.name,
                    "existing": dup_material.name,
                    "confidence": confidence,
                    "existing_id": dup_material.id
                })
                merged = self.deduplicator.merge_duplicates(dup_material, material, confidence)
                self.storage.update_material(merged)
                existing_materials = self.storage.load_materials()
            else:
                conflict = None
                if reference_material and not same_version:
                    conflict = self.version_detector.detect_conflict(material, reference_material)

                if conflict:
                    material = self.version_detector.handle_version_conflict(material, reference_material, conflict)
                    version_conflicts.append({
                        "name": material.name,
                        "type": conflict["type"],
                        "recommendation": conflict["recommendation"]
                    })

                new_materials.append(material)
                self.storage.add_material(material)
                existing_materials.append(material)

        all_materials = self.storage.load_materials()

        report_path = self._generate_report(all_materials)

        print(f"\n{'='*50}")
        print(f"  采样包素材清单归档 - 导入完成")
        print(f"{'='*50}")
        print(f"  新增材料: {len(new_materials)} 条")
        print(f"  识别重复: {len(skipped_duplicates)} 条（已合并）")
        print(f"  版本冲突: {len(version_conflicts)} 条（需人工处理）")
        print(f"")
        print(f"  报告已生成: {report_path}")
        print(f"{'='*50}\n")

        if skipped_duplicates:
            print("重复项明细:")
            for d in skipped_duplicates:
                print(f"  - {d['new']} → {d['existing']} (相似度: {d['confidence']:.2%})")
            print()

        if version_conflicts:
            print("版本冲突明细:")
            for vc in version_conflicts:
                print(f"  - {vc['name']}: {vc['type']}")
                print(f"    建议: {vc['recommendation']}")
            print()

        return new_materials

    def run_full_report(self) -> str:
        materials = self.storage.load_materials()
        report_path = self._generate_report(materials)

        processed = len([m for m in materials if m.status == MaterialStatus.PROCESSED])
        pending = len([m for m in materials if m.status == MaterialStatus.PENDING])
        manual = len([m for m in materials if m.status == MaterialStatus.MANUAL_REVIEW])
        conflicts = len([m for m in materials if m.status == MaterialStatus.CONFLICT])

        print(f"\n{'='*50}")
        print(f"  采样包素材清单归档 - 报告生成")
        print(f"{'='*50}")
        print(f"  材料总数: {len(materials)}")
        print(f"  已处理:   {processed}")
        print(f"  待补材料: {pending}")
        print(f"  人工改判: {manual}")
        print(f"  版本冲突: {conflicts}")
        print(f"")
        print(f"  报告位置: {report_path}")
        print(f"{'='*50}\n")

        return report_path

    def _generate_report(self, materials: List[Material]) -> str:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_name = f"采样包素材清单_{timestamp}.md"
        report_path = os.path.join(self.output_dir, report_name)
        self.report_generator.save_report(materials, report_path)

        latest_path = os.path.join(self.output_dir, "最新报告.md")
        self.report_generator.save_report(materials, latest_path)

        return report_path

    def add_annotation(self, material_id: str, comment: str, reviewer: str,
                       new_status: Optional[str] = None, source_line: str = "") -> Optional[Material]:
        material = self.storage.get_material(material_id)
        if not material:
            print(f"错误: 未找到材料 ID={material_id}")
            return None

        status_enum = None
        if new_status:
            try:
                status_enum = MaterialStatus(new_status)
            except ValueError:
                print(f"警告: 无效状态 '{new_status}'，仅添加批注不改变状态")

        affected_fields = []
        if new_status:
            affected_fields.append("status")

        material = self.annotation_manager.add_annotation(
            material=material,
            comment=comment,
            reviewer=reviewer,
            new_status=status_enum,
            affected_fields=affected_fields,
            source_line=source_line
        )
        self.storage.update_material(material)
        print(f"已添加批注: {material.name}")
        return material

    def list_materials(self, status_filter: Optional[str] = None) -> List[Material]:
        materials = self.storage.load_materials()
        if status_filter:
            try:
                status = MaterialStatus(status_filter)
                materials = [m for m in materials if m.status == status]
            except ValueError:
                pass
        for i, m in enumerate(materials, 1):
            print(f"{i}. [{m.status.value}] {m.name} (v{m.version})")
            print(f"   ID: {m.id}")
            if m.source:
                print(f"   来源: {m.source}")
            print()
        return materials


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "..", "data")
    output_dir = os.path.join(base_dir, "..", "output")

    archive = SamplingArchive(data_dir=data_dir, output_dir=output_dir)

    if len(sys.argv) < 2:
        print("\n采样包素材清单归档系统")
        print("=" * 40)
        print("用法:")
        print("  python -m sampling_archive report          生成最新报告")
        print("  python -m sampling_archive import <文件>   从JSON文件导入材料")
        print("  python -m sampling_archive list [状态]     列出材料")
        print("  python -m sampling_archive annotate <ID> <批注> 添加批注")
        print()
        print("状态可选值: 已处理, 待补材料, 人工改判, 版本冲突")
        print()
        print("快速开始: 直接运行 report 查看最新报告")
        print()
        return

    command = sys.argv[1]

    if command == "report":
        archive.run_full_report()
    elif command == "import":
        if len(sys.argv) < 3:
            print("请指定要导入的JSON文件路径")
            return
        file_path = sys.argv[2]
        if not os.path.exists(file_path):
            print(f"错误: 文件不存在: {file_path}")
            return
        with open(file_path, 'r', encoding='utf-8') as f:
            materials_data = json.load(f)
        source = sys.argv[3] if len(sys.argv) > 3 else "JSON导入"
        archive.import_materials(materials_data, source=source)
    elif command == "list":
        status_filter = sys.argv[2] if len(sys.argv) > 2 else None
        archive.list_materials(status_filter)
    elif command == "annotate":
        if len(sys.argv) < 4:
            print("用法: annotate <材料ID> <批注内容> [审核人] [新状态]")
            return
        material_id = sys.argv[2]
        comment = sys.argv[3]
        reviewer = sys.argv[4] if len(sys.argv) > 4 else "系统"
        new_status = sys.argv[5] if len(sys.argv) > 5 else None
        archive.add_annotation(material_id, comment, reviewer, new_status)
    else:
        print(f"未知命令: {command}")


if __name__ == "__main__":
    main()
