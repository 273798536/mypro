import os
import sys
from typing import Dict, List, Optional, Any
from datetime import datetime

from core.electromagnetic import ElectromagneticField, PointCharge, Coil, ChargeType, DirectionReversalType
from models.particle import Particle, ParticleSimulator, SimulationConfig, ParticleStatus
from tracking.chain_tracker import ChainTracker
from classifier.result_classifier import ResultClassifier, ResultCategory
from utils.annotation_manager import AnnotationManager, AnnotationType, ConfidenceLevel, AnnotationStatus
from utils.scheme_comparator import SchemeComparator
from tests.dirty_samples import DirtySampleSuite


class FieldParticleHall:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        self.em_field = ElectromagneticField()
        self.simulator: Optional[ParticleSimulator] = None
        self.tracker = ChainTracker()
        self.classifier = ResultClassifier()
        self.annotation_manager = AnnotationManager()
        self.scheme_comparator = SchemeComparator()

    def add_point_charge(self, charge_id: str, position: List[float], charge: float,
                         charge_type: str = "positive") -> str:
        ct = ChargeType.POSITIVE if charge_type == "positive" else ChargeType.NEGATIVE
        point_charge = PointCharge(
            id=charge_id,
            position=position,
            charge=charge,
            charge_type=ct
        )
        self.em_field.add_charge(point_charge)

        node_id = self.tracker.add_charge_config(
            charge_id, position, charge, charge_type
        )
        return node_id

    def add_coil(self, coil_id: str, center: List[float], normal: List[float],
                 radius: float, current: float, turns: int = 1) -> str:
        coil = Coil(
            id=coil_id,
            center=center,
            normal=normal,
            radius=radius,
            current=current,
            turns=turns
        )
        self.em_field.add_coil(coil)

        node_id = self.tracker.add_coil_config(
            coil_id, center, normal, radius, current, turns
        )
        return node_id

    def setup_simulator(self, time_step: float = 1e-10, total_time: float = 1e-8,
                        boundary_min: List[float] = None,
                        boundary_max: List[float] = None) -> None:
        if boundary_min is None:
            boundary_min = [-1.0, -1.0, -1.0]
        if boundary_max is None:
            boundary_max = [1.0, 1.0, 1.0]

        config = SimulationConfig(
            time_step=time_step,
            total_time=total_time,
            boundary_min=boundary_min,
            boundary_max=boundary_max
        )
        self.simulator = ParticleSimulator(self.em_field, config)

    def add_particle(self, particle_id: str, position: List[float], velocity: List[float],
                     charge: Optional[float] = None, mass: Optional[float] = None,
                     name: str = "") -> str:
        if self.simulator is None:
            self.setup_simulator()

        particle = Particle(
            id=particle_id,
            position=position,
            velocity=velocity,
            charge=charge,
            mass=mass,
            name=name
        )
        self.simulator.add_particle(particle)

        is_valid, errors = particle.validate()
        if not is_valid:
            print(f"⚠️  粒子 {particle_id} 验证警告:")
            hints = particle.get_validation_hints()
            for field, hint_list in hints.items():
                print(f"  {field}:")
                for hint in hint_list[:2]:
                    print(f"    - {hint}")

        node_id = self.tracker.add_particle_config(
            particle_id, position, velocity, charge, mass, name
        )
        return node_id

    def run_simulation(self, save_chain: bool = True) -> Dict[str, Any]:
        if self.simulator is None:
            raise ValueError("请先设置模拟器并添加粒子")

        print("▶️  开始模拟...")
        frames = self.simulator.run_simulation()

        if save_chain:
            for particle_id, frame_list in frames.items():
                for frame in frame_list:
                    particle_nodes = self.tracker.get_nodes_by_type(
                        self.tracker.get_node(list(self.tracker.nodes.keys())[0]).node_type
                    ) if self.tracker.nodes else []

        print(f"✅ 模拟完成，共 {len(frames)} 个粒子")

        classification = self.classifier.classify_all(self.simulator)
        print(f"📊 {classification.overall_summary}")

        result = {
            "frames": frames,
            "classification": classification,
            "simulator": self.simulator
        }

        return result

    def add_reading_annotation(self, particle_id: str, step_index: int,
                               annotation_type: str, value: float, unit: str,
                               description: str, annotator: str = "user",
                               confidence: str = "medium") -> tuple:
        at_map = {
            "field_strength": AnnotationType.FIELD_STRENGTH,
            "velocity": AnnotationType.PARTICLE_VELOCITY,
            "position": AnnotationType.PARTICLE_POSITION,
            "trajectory": AnnotationType.TRAJECTORY_POINT,
            "measurement": AnnotationType.MEASUREMENT
        }
        cl_map = {
            "high": ConfidenceLevel.HIGH,
            "medium": ConfidenceLevel.MEDIUM,
            "low": ConfidenceLevel.LOW,
            "speculative": ConfidenceLevel.SPECULATIVE
        }

        frames = self.simulator.frames.get(particle_id, []) if self.simulator else []
        position = [0.0, 0.0, 0.0]
        timestamp = 0.0
        for f in frames:
            if f.step_index == step_index:
                position = f.position.tolist()
                timestamp = f.timestamp
                break

        ann_id, version = self.annotation_manager.create_annotation(
            annotation_type=at_map.get(annotation_type, AnnotationType.MEASUREMENT),
            value=value,
            unit=unit,
            position=position,
            description=description,
            annotator=annotator,
            timestamp=timestamp,
            confidence=cl_map.get(confidence, ConfidenceLevel.MEDIUM),
            simulation_step=step_index,
            particle_id=particle_id
        )

        print(f"📝 添加标注: {description} = {value} {unit} (版本 {version})")
        return ann_id, version

    def compare_annotation_versions(self, annotation_id: str, version1: int, version2: int) -> Dict[str, Any]:
        comp = self.annotation_manager.compare_versions(annotation_id, version1, version2)
        if comp:
            return comp.to_dict()
        return {"error": "无法比较"}

    def save_current_scheme(self, name: str, description: str) -> str:
        if self.simulator is None:
            raise ValueError("请先运行模拟")

        scheme_id = self.scheme_comparator.add_scheme(
            name=name,
            description=description,
            em_field=self.em_field,
            simulator=self.simulator
        )
        print(f"💾 方案已保存: {name} (ID: {scheme_id[:8]}...)")
        return scheme_id

    def list_schemes(self) -> List[Dict[str, Any]]:
        return self.scheme_comparator.list_schemes()

    def compare_schemes(self, scheme_id1: str, scheme_id2: str) -> Dict[str, Any]:
        comp = self.scheme_comparator.compare_schemes(scheme_id1, scheme_id2)
        if comp:
            return comp.to_dict()
        return {"error": "方案不存在"}

    def export_all(self, prefix: str = "field_hall") -> Dict[str, str]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        export_dir = os.path.join(self.output_dir, f"{prefix}_{timestamp}")
        os.makedirs(export_dir, exist_ok=True)

        chain_path = os.path.join(export_dir, "tracking_chain.json")
        self.tracker.export_chain(chain_path)

        ann_path = os.path.join(export_dir, "annotations.json")
        self.annotation_manager.export_annotations(ann_path)

        if self.scheme_comparator.schemes:
            self.scheme_comparator.export_comparison_report(export_dir)

        if self.simulator and self.classifier:
            classification = self.classifier.classify_all(self.simulator)
            cls_path = os.path.join(export_dir, "classification.json")
            with open(cls_path, 'w', encoding='utf-8') as f:
                import json
                json.dump(classification.to_dict(), f, indent=2, ensure_ascii=False)

        readme_path = os.path.join(export_dir, "README.txt")
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write("电磁场线粒子厅 - 导出结果\n")
            f.write("=" * 50 + "\n\n")
            f.write("文件说明:\n")
            f.write("  - tracking_chain.json: 完整链路追踪数据\n")
            f.write("  - annotations.json: 版本化读数标注\n")
            f.write("  - classification.json: 结果分类报告\n")
            f.write("  - scheme_comparison_report.*: 方案比较报告\n\n")
            f.write("复核节点清单:\n")
            f.write("  1. 检查方向反转事件的来源（E场/B场）\n")
            f.write("  2. 确认反转与越界事件是否被错误合并\n")
            f.write("  3. 核对标注的版本历史和置信度\n")
            f.write("  4. 通过链路追踪追溯配置变更\n")

        print(f"📦 全部数据已导出到: {export_dir}")
        return {
            "export_dir": export_dir,
            "tracking_chain": chain_path,
            "annotations": ann_path
        }

    def run_dirty_sample_test(self) -> str:
        print("\n" + "=" * 60)
        print("🧪 运行脏样例测试套件")
        print("=" * 60)

        suite = DirtySampleSuite()
        samples = suite.run_all_samples()
        report = suite.generate_test_report()

        report_path = os.path.join(self.output_dir, "dirty_sample_report.txt")
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"\n📋 脏样例测试报告已保存: {report_path}")
        return report_path

    def get_review_guide(self) -> Dict[str, Any]:
        return {
            "classification_guide": self.classifier.get_classification_guide(),
            "review_checklist": [
                "方向反转处理: 检查反转事件是否独立记录，来源是否标注",
                "场强爆炸处理: 爆炸点是否标记，是否保留有效数据",
                "数据链路完整性: 电荷/线圈参数是否可追溯",
                "标注版本管理: 读数是否有版本历史，差异是否可对比",
                "容错处理: 质量/电荷缺失是否给出可操作提示"
            ]
        }


def quick_start_demo():
    print("🚀 电磁场线粒子厅 - 快速演示")
    print("=" * 60)

    hall = FieldParticleHall(output_dir="./demo_output")

    hall.add_point_charge("charge1", [0.1, 0.0, 0.0], 1e-9, "positive")
    hall.add_point_charge("charge2", [-0.1, 0.0, 0.0], -1e-9, "negative")
    hall.add_coil("coil1", [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], 0.05, 50.0)

    hall.setup_simulator(
        time_step=1e-11,
        total_time=1e-9,
        boundary_min=[-0.5, -0.5, -0.5],
        boundary_max=[0.5, 0.5, 0.5]
    )

    hall.add_particle(
        particle_id="electron1",
        position=[0.0, 0.05, 0.0],
        velocity=[1e5, 0.0, 0.0],
        charge=-1.6e-19,
        mass=9.11e-31,
        name="演示电子"
    )

    result = hall.run_simulation()

    hall.add_reading_annotation(
        particle_id="electron1",
        step_index=10,
        annotation_type="field_strength",
        value=1000.0,
        unit="V/m",
        description="电场强度采样",
        confidence="high"
    )

    hall.save_current_scheme("基础方案", "演示用的基础配置方案")

    export_paths = hall.export_all("demo")

    print("\n" + "=" * 60)
    print("✅ 演示完成")
    print("=" * 60)
    print(f"导出目录: {export_paths['export_dir']}")

    guide = hall.get_review_guide()
    print("\n📋 复核指南:")
    for i, item in enumerate(guide['review_checklist'], 1):
        print(f"  {i}. {item}")

    return hall


if __name__ == "__main__":
    hall = quick_start_demo()
    hall.run_dirty_sample_test()
