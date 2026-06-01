import numpy as np
from typing import Dict, List, Tuple

from core.electromagnetic import ElectromagneticField, PointCharge, Coil, ChargeType
from models.particle import Particle, ParticleSimulator, SimulationConfig, ParticleStatus
from tracking.chain_tracker import ChainTracker
from classifier.result_classifier import ResultClassifier, BatchClassificationResult
from utils.annotation_manager import AnnotationManager, AnnotationType, ConfidenceLevel, AnnotationStatus


class DirtySampleType:
    FIELD_EXPLOSION = "field_explosion"
    DIRECTION_REVERSAL = "direction_reversal"
    OUT_OF_BOUNDS = "out_of_bounds"
    MASS_MISSING = "mass_missing"
    CHARGE_MISSING = "charge_missing"
    REVERSAL_OOB_OVERLAP = "reversal_oob_overlap"
    MULTIPLE_REVERSALS = "multiple_reversals"
    CLEAN_NORMAL = "clean_normal"


class DirtySampleSuite:
    def __init__(self):
        self.results: Dict[str, dict] = {}

    def create_field_explosion_sample(self) -> Dict[str, any]:
        em_field = ElectromagneticField()

        strong_charge = PointCharge(
            id="strong_charge_1",
            position=[0.0, 0.0, 0.0],
            charge=1.0,
            charge_type=ChargeType.POSITIVE
        )
        em_field.add_charge(strong_charge)

        config = SimulationConfig(
            time_step=1e-10,
            total_time=5e-9,
            boundary_min=np.array([-1.0, -1.0, -1.0]),
            boundary_max=np.array([1.0, 1.0, 1.0])
        )

        simulator = ParticleSimulator(em_field, config)

        particle_close = Particle(
            id="particle_explosion",
            position=[1e-15, 0.0, 0.0],
            velocity=[1e6, 0.0, 0.0],
            charge=1.6e-19,
            mass=9.11e-31,
            name="靠近强电荷的电子"
        )
        simulator.add_particle(particle_close)

        tracker = ChainTracker(tracking_id="explosion_sample")
        charge_node = tracker.add_charge_config(
            strong_charge.id,
            strong_charge.position,
            strong_charge.charge,
            strong_charge.charge_type.value
        )
        particle_node = tracker.add_particle_config(
            particle_close.id,
            particle_close.position,
            particle_close.velocity,
            particle_close.charge,
            particle_close.mass,
            particle_close.name,
            parent_ids=[charge_node]
        )

        frames = simulator.run_simulation()

        for step, frame_list in frames.items():
            for frame in frame_list:
                tracker.add_simulation_step(
                    frame.step_index,
                    step,
                    frame.position,
                    frame.velocity,
                    frame.acceleration,
                    frame.e_field,
                    frame.b_field,
                    frame.lorentz_force,
                    frame.status.value,
                    parent_ids=[particle_node]
                )
                tracker.advance_time()

        classifier = ResultClassifier()
        classification = classifier.classify_all(simulator)

        ann_manager = AnnotationManager(session_id="explosion_sample")
        for particle_id, frame_list in frames.items():
            for frame in frame_list[:3]:
                ann_manager.create_annotation(
                    AnnotationType.FIELD_STRENGTH,
                    frame.e_magnitude,
                    "V/m",
                    frame.position.tolist(),
                    f"电场强度采样 (步 {frame.step_index})",
                    "auto_annotator",
                    timestamp=frame.timestamp,
                    confidence=ConfidenceLevel.HIGH if not frame.field_has_explosion else ConfidenceLevel.LOW,
                    status=AnnotationStatus.CONFIRMED if not frame.field_has_explosion else AnnotationStatus.DRAFT,
                    simulation_step=frame.step_index,
                    particle_id=particle_id,
                    field_component="E"
                )

        error_merge_check = simulator.has_error_merging()

        return {
            "sample_type": DirtySampleType.FIELD_EXPLOSION,
            "description": "粒子过于靠近强电荷，引发场强爆炸的脏样例",
            "em_field": em_field,
            "simulator": simulator,
            "tracker": tracker,
            "classifier": classifier,
            "classification": classification,
            "annotation_manager": ann_manager,
            "error_merge_check": error_merge_check,
            "expected_issues": ["场强爆炸（NOT_USABLE）"],
            "frames": frames
        }

    def create_direction_reversal_sample(self) -> Dict[str, any]:
        em_field = ElectromagneticField()

        positive_plate = PointCharge(
            id="positive_plate",
            position=[0.01, 0.0, 0.0],
            charge=1e-9,
            charge_type=ChargeType.POSITIVE
        )
        negative_plate = PointCharge(
            id="negative_plate",
            position=[-0.01, 0.0, 0.0],
            charge=-1e-9,
            charge_type=ChargeType.NEGATIVE
        )
        em_field.add_charge(positive_plate)
        em_field.add_charge(negative_plate)

        coil = Coil(
            id="magnetic_coil",
            center=[0.0, 0.0, 0.0],
            normal=[0.0, 0.0, 1.0],
            radius=0.1,
            current=100.0
        )
        em_field.add_coil(coil)

        config = SimulationConfig(
            time_step=1e-11,
            total_time=1e-8,
            boundary_min=np.array([-0.5, -0.5, -0.5]),
            boundary_max=np.array([0.5, 0.5, 0.5])
        )

        simulator = ParticleSimulator(em_field, config)

        electron = Particle(
            id="electron_reversal",
            position=[0.005, 0.0, 0.0],
            velocity=[1e5, 1e5, 0.0],
            charge=-1.6e-19,
            mass=9.11e-31,
            name="可能反转的电子"
        )
        simulator.add_particle(electron)

        tracker = ChainTracker(tracking_id="reversal_sample")
        pos_node = tracker.add_charge_config(positive_plate.id, positive_plate.position, positive_plate.charge, positive_plate.charge_type.value)
        neg_node = tracker.add_charge_config(negative_plate.id, negative_plate.position, negative_plate.charge, negative_plate.charge_type.value)
        coil_node = tracker.add_coil_config(coil.id, coil.center, coil.normal, coil.radius, coil.current)
        particle_node = tracker.add_particle_config(
            electron.id, electron.position, electron.velocity,
            electron.charge, electron.mass, electron.name,
            parent_ids=[pos_node, neg_node, coil_node]
        )

        frames = simulator.run_simulation()

        for step, frame_list in frames.items():
            for frame in frame_list:
                tracker.add_simulation_step(
                    frame.step_index, step, frame.position, frame.velocity,
                    frame.acceleration, frame.e_field, frame.b_field,
                    frame.lorentz_force, frame.status.value,
                    parent_ids=[particle_node]
                )

        classifier = ResultClassifier()
        classification = classifier.classify_all(simulator)

        reversals = simulator.get_reversal_events("electron_reversal")
        ann_manager = AnnotationManager(session_id="reversal_sample")
        for i, rev in enumerate(reversals):
            ann_manager.create_annotation(
                AnnotationType.TRAJECTORY_POINT,
                i + 1,
                "次",
                rev.position.tolist(),
                f"方向反转事件 #{i+1}，来源: {rev.reversal_source.value}",
                "auto_annotator",
                timestamp=rev.timestamp,
                confidence=ConfidenceLevel.MEDIUM,
                status=AnnotationStatus.SUBMITTED,
                simulation_step=rev.step_index,
                particle_id="electron_reversal",
                metadata={"reversal_source": rev.reversal_source.value}
            )

        error_merge_check = simulator.has_error_merging()

        return {
            "sample_type": DirtySampleType.DIRECTION_REVERSAL,
            "description": "粒子在电场中运动可能发生方向反转的脏样例",
            "em_field": em_field,
            "simulator": simulator,
            "tracker": tracker,
            "classifier": classifier,
            "classification": classification,
            "annotation_manager": ann_manager,
            "error_merge_check": error_merge_check,
            "expected_issues": ["方向反转（NEEDS_REVIEW）"],
            "frames": frames,
            "reversal_events": reversals
        }

    def create_out_of_bounds_sample(self) -> Dict[str, any]:
        em_field = ElectromagneticField()

        charge = PointCharge(
            id="repelling_charge",
            position=[0.0, 0.0, 0.0],
            charge=1e-9,
            charge_type=ChargeType.POSITIVE
        )
        em_field.add_charge(charge)

        config = SimulationConfig(
            time_step=1e-11,
            total_time=5e-9,
            boundary_min=np.array([-0.1, -0.1, -0.1]),
            boundary_max=np.array([0.1, 0.1, 0.1])
        )

        simulator = ParticleSimulator(em_field, config)

        proton = Particle(
            id="proton_oob",
            position=[0.001, 0.0, 0.0],
            velocity=[2e7, 0.0, 0.0],
            charge=1.6e-19,
            mass=1.67e-27,
            name="高速质子"
        )
        simulator.add_particle(proton)

        frames = simulator.run_simulation()

        classifier = ResultClassifier()
        classification = classifier.classify_all(simulator)

        oob_events = simulator.get_out_of_bounds_events("proton_oob")

        return {
            "sample_type": DirtySampleType.OUT_OF_BOUNDS,
            "description": "粒子高速运动超出模拟边界的脏样例",
            "em_field": em_field,
            "simulator": simulator,
            "classification": classification,
            "expected_issues": ["粒子越界（NEEDS_REVIEW）"],
            "frames": frames,
            "oob_events": oob_events
        }

    def create_mass_missing_sample(self) -> Dict[str, any]:
        em_field = ElectromagneticField()

        charge = PointCharge(
            id="test_charge",
            position=[0.0, 0.0, 0.0],
            charge=1e-9,
            charge_type=ChargeType.POSITIVE
        )
        em_field.add_charge(charge)

        config = SimulationConfig(
            time_step=1e-10,
            total_time=1e-8,
            boundary_min=np.array([-1.0, -1.0, -1.0]),
            boundary_max=np.array([1.0, 1.0, 1.0])
        )

        simulator = ParticleSimulator(em_field, config)

        particle = Particle(
            id="particle_no_mass",
            position=[0.1, 0.0, 0.0],
            velocity=[1e5, 0.0, 0.0],
            charge=1.6e-19,
            mass=None,
            name="缺失质量的粒子"
        )
        simulator.add_particle(particle)

        validation_hints = particle.get_validation_hints()

        frames = simulator.run_simulation()

        classifier = ResultClassifier()
        classification = classifier.classify_all(simulator)

        return {
            "sample_type": DirtySampleType.MASS_MISSING,
            "description": "粒子质量缺失的脏样例",
            "em_field": em_field,
            "simulator": simulator,
            "classification": classification,
            "validation_hints": validation_hints,
            "expected_issues": ["质量缺失（NOT_USABLE）"],
            "frames": frames
        }

    def create_reversal_oob_overlap_sample(self) -> Dict[str, any]:
        em_field = ElectromagneticField()

        charge = PointCharge(
            id="strong_repeller",
            position=[0.0, 0.0, 0.0],
            charge=1e-6,
            charge_type=ChargeType.POSITIVE
        )
        em_field.add_charge(charge)

        config = SimulationConfig(
            time_step=1e-12,
            total_time=1e-9,
            boundary_min=np.array([-0.001, -0.001, -0.001]),
            boundary_max=np.array([0.001, 0.001, 0.001])
        )

        simulator = ParticleSimulator(em_field, config)

        proton = Particle(
            id="proton_overlap",
            position=[0.0005, 0.0, 0.0],
            velocity=[-2e8, 0.0, 0.0],
            charge=1.6e-19,
            mass=1.67e-27,
            name="可能同时反转和越界的质子"
        )
        simulator.add_particle(proton)

        frames = simulator.run_simulation()

        error_merge_check = simulator.has_error_merging()
        reversals = simulator.get_reversal_events("proton_overlap")
        oob_events = simulator.get_out_of_bounds_events("proton_overlap")

        classifier = ResultClassifier()
        classification = classifier.classify_all(simulator)

        return {
            "sample_type": DirtySampleType.REVERSAL_OOB_OVERLAP,
            "description": "方向反转与越界事件可能时间重叠的脏样例",
            "em_field": em_field,
            "simulator": simulator,
            "classification": classification,
            "error_merge_check": error_merge_check,
            "expected_issues": ["反转与越界重叠（NEEDS_REVIEW）"],
            "frames": frames,
            "reversal_events": reversals,
            "oob_events": oob_events
        }

    def create_clean_normal_sample(self) -> Dict[str, any]:
        em_field = ElectromagneticField()

        charge1 = PointCharge(
            id="charge_1",
            position=[1.0, 0.0, 0.0],
            charge=1e-9,
            charge_type=ChargeType.POSITIVE
        )
        charge2 = PointCharge(
            id="charge_2",
            position=[-1.0, 0.0, 0.0],
            charge=-1e-9,
            charge_type=ChargeType.NEGATIVE
        )
        em_field.add_charge(charge1)
        em_field.add_charge(charge2)

        config = SimulationConfig(
            time_step=1e-10,
            total_time=1e-8,
            boundary_min=np.array([-2.0, -2.0, -2.0]),
            boundary_max=np.array([2.0, 2.0, 2.0])
        )

        simulator = ParticleSimulator(em_field, config)

        electron = Particle(
            id="clean_electron",
            position=[0.0, 0.5, 0.0],
            velocity=[1e5, 0.0, 0.0],
            charge=-1.6e-19,
            mass=9.11e-31,
            name="正常运动的电子"
        )
        simulator.add_particle(electron)

        frames = simulator.run_simulation()

        classifier = ResultClassifier()
        classification = classifier.classify_all(simulator)

        return {
            "sample_type": DirtySampleType.CLEAN_NORMAL,
            "description": "正常轨迹的对照样例",
            "em_field": em_field,
            "simulator": simulator,
            "classification": classification,
            "expected_issues": ["无异常（DIRECT_USE）"],
            "frames": frames
        }

    def run_all_samples(self) -> Dict[str, dict]:
        print("=" * 60)
        print("运行脏样例测试套件")
        print("=" * 60)

        samples = {
            "field_explosion": self.create_field_explosion_sample(),
            "direction_reversal": self.create_direction_reversal_sample(),
            "out_of_bounds": self.create_out_of_bounds_sample(),
            "mass_missing": self.create_mass_missing_sample(),
            "reversal_oob_overlap": self.create_reversal_oob_overlap_sample(),
            "clean_normal": self.create_clean_normal_sample()
        }

        self.results = samples
        return samples

    def generate_test_report(self) -> str:
        report = []
        report.append("=" * 60)
        report.append("电磁场线粒子厅 - 脏样例测试报告")
        report.append("=" * 60)
        report.append("")

        for name, sample in self.results.items():
            report.append(f"【{name}】")
            report.append(f"  类型: {sample['sample_type']}")
            report.append(f"  描述: {sample['description']}")

            if 'classification' in sample:
                cls = sample['classification']
                report.append(f"  分类结果: {cls.overall_summary}")

                for pid, res in cls.particle_results.items():
                    report.append(f"    粒子 {pid}: {res.summary}")
                    report.append(f"      置信度: {res.confidence_score:.2f}")

                    for issue in res.issues:
                        if issue.severity > 0:
                            report.append(f"      - {issue.name}: {issue.description}")
                            if issue.suggestion:
                                report.append(f"        建议: {issue.suggestion}")

            if 'error_merge_check' in sample:
                for pid, check in sample['error_merge_check'].items():
                    if check['reversal_events_merged'] or check['out_of_bounds_merged'] or check['reversal_oob_overlap']:
                        report.append(f"  ⚠️  错误合并检测:")
                        report.append(f"    反转事件合并: {check['reversal_events_merged']}")
                        report.append(f"    越界事件合并: {check['out_of_bounds_merged']}")
                        report.append(f"    反转-越界重叠: {check['reversal_oob_overlap']}")
                        if check['overlap_steps']:
                            report.append(f"    重叠时间步: {check['overlap_steps']}")

            if 'validation_hints' in sample:
                report.append(f"  验证提示:")
                for field, hints in sample['validation_hints'].items():
                    report.append(f"    {field}:")
                    for hint in hints:
                        report.append(f"      - {hint}")

            report.append(f"  预期问题: {', '.join(sample['expected_issues'])}")
            report.append("")

        report.append("=" * 60)
        report.append("复核节点检查清单")
        report.append("=" * 60)
        report.append("1. 方向反转处理")
        report.append("   - 反转事件是否独立记录？")
        report.append("   - 反转来源（E场/B场）是否标注？")
        report.append("   - 反转与越界是否被错误合并？")
        report.append("")
        report.append("2. 场强爆炸处理")
        report.append("   - 爆炸点是否被标记为 NOT_USABLE？")
        report.append("   - 是否保留爆炸前的有效数据？")
        report.append("   - 是否给出可操作的调整建议？")
        report.append("")
        report.append("3. 数据链路完整性")
        report.append("   - 电荷位置是否可追溯到最终结果？")
        report.append("   - 线圈参数是否有完整记录？")
        report.append("   - 截图能否回溯到对应配置？")
        report.append("")
        report.append("4. 标注版本管理")
        report.append("   - 读数是否有版本历史？")
        report.append("   - 版本差异是否可对比？")
        report.append("   - 置信度是否有记录？")
        report.append("")
        report.append("5. 容错处理")
        report.append("   - 质量缺失是否给出提示？")
        report.append("   - 电荷缺失是否给出提示？")
        report.append("   - 是否提供常见参数参考值？")
        report.append("")

        return "\n".join(report)


if __name__ == "__main__":
    suite = DirtySampleSuite()
    suite.run_all_samples()
    print(suite.generate_test_report())
