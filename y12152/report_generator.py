from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import os
import json
import pandas as pd

from config import OUTPUT_PATHS
from data_models import (
    FlywheelDataRecord,
    CalculationResult,
    ShutdownRecommendation,
    BatchProcessingResult,
    DataStatus,
    ViolationType
)
from boundary_checker import BoundaryChecker
from energy_calculator import EnergyCalculator
from material_tracker import MaterialParameterTracker
from shutdown_recommender import ShutdownRecommender


@dataclass
class SafetyReport:
    report_id: str
    generated_at: datetime
    experiment_id: str
    batch_id: str
    energy_calculation: Dict
    boundary_check: Dict
    shutdown_recommendation: Dict
    material_params: Optional[Dict]
    conclusions: List[str]
    recommendations: List[str]


class ReportGenerator:
    def __init__(self):
        self.boundary_checker = BoundaryChecker()
        self.energy_calculator = EnergyCalculator()
        self.material_tracker = MaterialParameterTracker()
        self.shutdown_recommender = ShutdownRecommender(self.boundary_checker)

    def generate_safety_report(self, record: FlywheelDataRecord,
                               energy_result: CalculationResult = None,
                               shutdown_rec: ShutdownRecommendation = None,
                               material_params_id: str = None) -> SafetyReport:
        if energy_result is None:
            material_params = None
            if record.experiment_id and self.material_tracker.has_material_params(record.experiment_id):
                material_params = self.material_tracker.get_latest_params(record.experiment_id)
            energy_result = self.energy_calculator.calculate_record_energy(record, material_params)

        if shutdown_rec is None:
            shutdown_rec = self.shutdown_recommender.generate_recommendation(record, energy_result)

        boundary_result = self.boundary_checker.check_record(record)

        material_info = None
        if record.experiment_id and self.material_tracker.has_material_params(record.experiment_id):
            mat_params = self.material_tracker.get_latest_params(record.experiment_id)
            material_info = {
                "param_id": mat_params.param_id,
                "tensile_strength_mpa": mat_params.tensile_strength_mpa,
                "density_kg_m3": mat_params.density_kg_m3,
                "elastic_modulus_gpa": mat_params.elastic_modulus_gpa,
                "poisson_ratio": mat_params.poisson_ratio,
                "source": mat_params.source,
                "change_reason": mat_params.change_reason,
                "version_count": len(self.material_tracker.get_all_versions(record.experiment_id))
            }

        energy_calc_details = {
            "kinetic_energy_j": energy_result.kinetic_energy_j,
            "stored_energy_kwh": energy_result.stored_energy_kwh,
            "max_stress_mpa": energy_result.max_stress_mpa,
            "safety_factor": energy_result.safety_factor,
            "calculation_method": "E = 0.5 * I * ω²",
            "moment_of_inertia_kg_m2": self.energy_calculator.params.moment_of_inertia_kg_m2,
            "efficiency": self.energy_calculator.params.efficiency,
            "formula": "动能 = 0.5 × 转动惯量 × 角速度²",
            "note": "基于最大转速计算，考虑系统效率后得到有效储能"
        }

        boundary_check_details = {
            "passed": boundary_result.passed,
            "is_warning": boundary_result.is_warning,
            "violations": [v.value for v in boundary_result.violations],
            "warnings": boundary_result.warnings,
            "max_speed_rpm": boundary_result.details.get("max_speed", 0),
            "max_vacuum_pa": boundary_result.details.get("max_vacuum", 0),
            "max_temperature_c": boundary_result.details.get("max_temperature", 0),
            "speed_limit": self.boundary_checker.boundaries.max_speed_rpm,
            "vacuum_limit": self.boundary_checker.boundaries.max_vacuum_pa,
            "temperature_limit": self.boundary_checker.boundaries.max_temperature_c
        }

        shutdown_details = {
            "should_shutdown": shutdown_rec.should_shutdown,
            "priority": shutdown_rec.priority,
            "reason": shutdown_rec.reason,
            "violation_types": [v.value for v in shutdown_rec.violation_types],
            "responsible_persons": shutdown_rec.responsible_persons,
            "next_steps": shutdown_rec.next_steps,
            "basis": "基于安全边界违规类型和严重程度判定"
        }

        conclusions = self._generate_conclusions(boundary_result, energy_result, shutdown_rec)
        recommendations = self._generate_recommendations(shutdown_rec, boundary_result)

        return SafetyReport(
            report_id=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            generated_at=datetime.now(),
            experiment_id=record.experiment_id,
            batch_id=record.batch_id,
            energy_calculation=energy_calc_details,
            boundary_check=boundary_check_details,
            shutdown_recommendation=shutdown_details,
            material_params=material_info,
            conclusions=conclusions,
            recommendations=recommendations
        )

    def _generate_conclusions(self, boundary_result, energy_result, shutdown_rec) -> List[str]:
        conclusions = []

        if boundary_result.passed:
            conclusions.append("安全边界检查通过")
        else:
            conclusions.append(f"安全边界检查未通过，发现 {len(boundary_result.violations)} 项违规")

        if energy_result.safety_factor > 0:
            if energy_result.safety_factor >= 2.0:
                conclusions.append(f"材料安全系数充足（{energy_result.safety_factor:.2f}）")
            elif energy_result.safety_factor >= 1.5:
                conclusions.append(f"材料安全系数合格（{energy_result.safety_factor:.2f}）")
            else:
                conclusions.append(f"材料安全系数偏低（{energy_result.safety_factor:.2f}），建议复核")

        if shutdown_rec.should_shutdown:
            conclusions.append("建议立即停机处理")
        elif shutdown_rec.priority == "medium":
            conclusions.append("需要关注运行状态，建议加强监测")
        else:
            conclusions.append("运行状态正常")

        return conclusions

    def _generate_recommendations(self, shutdown_rec, boundary_result) -> List[str]:
        recommendations = []

        if shutdown_rec.should_shutdown:
            recommendations.append("立即执行停机程序")
            recommendations.append("通知相关负责人现场确认")

        if boundary_result.violations:
            recommendations.append("针对违规项进行专项检查")

        if boundary_result.warnings:
            recommendations.append("加强对预警参数的监测频次")

        recommendations.append("定期复核材料参数和安全边界设置")
        recommendations.append("完整记录本次分析结果用于月度复盘")

        return recommendations

    def save_report_to_json(self, report: SafetyReport, filepath: str = None):
        if filepath is None:
            filepath = os.path.join(OUTPUT_PATHS["reports"], f"{report.report_id}.json")

        report_dict = {
            "report_id": report.report_id,
            "generated_at": report.generated_at.isoformat(),
            "experiment_id": report.experiment_id,
            "batch_id": report.batch_id,
            "energy_calculation": report.energy_calculation,
            "boundary_check": report.boundary_check,
            "shutdown_recommendation": report.shutdown_recommendation,
            "material_params": report.material_params,
            "conclusions": report.conclusions,
            "recommendations": report.recommendations
        }

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2)

        return filepath

    def save_report_to_text(self, report: SafetyReport, filepath: str = None):
        if filepath is None:
            filepath = os.path.join(OUTPUT_PATHS["reports"], f"{report.report_id}.txt")

        lines = []
        lines.append("=" * 60)
        lines.append("飞轮储能安全分析报告")
        lines.append("=" * 60)
        lines.append(f"报告编号: {report.report_id}")
        lines.append(f"生成时间: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"实验编号: {report.experiment_id}")
        lines.append(f"批次编号: {report.batch_id}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("一、能量计算详情")
        lines.append("-" * 60)
        ec = report.energy_calculation
        lines.append(f"计算方法: {ec['formula']}")
        lines.append(f"转动惯量: {ec['moment_of_inertia_kg_m2']} kg·m²")
        lines.append(f"系统效率: {ec['efficiency'] * 100:.1f}%")
        lines.append(f"最大动能: {ec['kinetic_energy_j']:.2f} J")
        lines.append(f"有效储能: {ec['stored_energy_kwh']:.4f} kWh")
        if ec['max_stress_mpa'] > 0:
            lines.append(f"最大应力: {ec['max_stress_mpa']:.2f} MPa")
            lines.append(f"安全系数: {ec['safety_factor']:.2f}")
        lines.append(f"备注: {ec['note']}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("二、安全边界检查")
        lines.append("-" * 60)
        bc = report.boundary_check
        lines.append(f"检查结果: {'通过' if bc['passed'] else '未通过'}")
        lines.append(f"预警状态: {'存在预警' if bc['is_warning'] else '正常'}")
        lines.append("")
        lines.append("关键参数:")
        lines.append(f"  最大转速: {bc['max_speed_rpm']:.1f} rpm (限值: {bc['speed_limit']} rpm)")
        lines.append(f"  最高真空: {bc['max_vacuum_pa']:.4f} Pa (限值: {bc['vacuum_limit']} Pa)")
        lines.append(f"  最高温度: {bc['max_temperature_c']:.1f} °C (限值: {bc['temperature_limit']} °C)")
        lines.append("")
        if bc['violations']:
            lines.append("违规项:")
            for v in bc['violations']:
                lines.append(f"  - {v}")
            lines.append("")
        if bc['warnings']:
            lines.append("预警信息:")
            for w in bc['warnings']:
                lines.append(f"  - {w}")
            lines.append("")

        lines.append("-" * 60)
        lines.append("三、停机建议")
        lines.append("-" * 60)
        sr = report.shutdown_recommendation
        lines.append(f"是否停机: {'是' if sr['should_shutdown'] else '否'}")
        lines.append(f"优先级: {sr['priority']}")
        lines.append(f"判定依据: {sr['basis']}")
        lines.append(f"原因: {sr['reason']}")
        lines.append("")
        lines.append("负责人员:")
        for person in sr['responsible_persons']:
            lines.append(f"  - {person}")
        lines.append("")
        lines.append("下一步行动:")
        for i, step in enumerate(sr['next_steps'], 1):
            lines.append(f"  {i}. {step}")
        lines.append("")

        if report.material_params:
            lines.append("-" * 60)
            lines.append("四、材料参数")
            lines.append("-" * 60)
            mp = report.material_params
            lines.append(f"参数编号: {mp['param_id']}")
            lines.append(f"抗拉强度: {mp['tensile_strength_mpa']} MPa")
            lines.append(f"密度: {mp['density_kg_m3']} kg/m³")
            lines.append(f"弹性模量: {mp['elastic_modulus_gpa']} GPa")
            lines.append(f"泊松比: {mp['poisson_ratio']}")
            lines.append(f"来源: {mp['source']}")
            lines.append(f"版本记录: 第 {mp['version_count']} 版")
            if mp['change_reason']:
                lines.append(f"变更原因: {mp['change_reason']}")
            lines.append("")

        lines.append("-" * 60)
        lines.append("五、结论")
        lines.append("-" * 60)
        for i, conclusion in enumerate(report.conclusions, 1):
            lines.append(f"{i}. {conclusion}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("六、建议")
        lines.append("-" * 60)
        for i, rec in enumerate(report.recommendations, 1):
            lines.append(f"{i}. {rec}")
        lines.append("")

        lines.append("=" * 60)
        lines.append("报告结束")
        lines.append("=" * 60)

        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        return filepath

    def generate_monthly_summary(self, batch_results: List[BatchProcessingResult], 
                                  month: str = None) -> Dict:
        if month is None:
            month = datetime.now().strftime("%Y-%m")

        total_records = sum(br.total_records for br in batch_results)
        total_normal = sum(br.normal_count for br in batch_results)
        total_boundary = sum(br.boundary_count for br in batch_results)
        total_bad = sum(br.bad_input_count for br in batch_results)
        total_pending = sum(br.pending_review_count for br in batch_results)

        summary = {
            "month": month,
            "total_batches": len(batch_results),
            "total_records": total_records,
            "normal_count": total_normal,
            "boundary_count": total_boundary,
            "bad_input_count": total_bad,
            "pending_review_count": total_pending,
            "normal_rate": total_normal / total_records if total_records > 0 else 0,
            "violation_rate": (total_boundary + total_pending) / total_records if total_records > 0 else 0,
            "batch_details": [
                {
                    "batch_id": br.batch_id,
                    "processed_at": br.processed_at.isoformat(),
                    "record_count": br.total_records
                }
                for br in batch_results
            ]
        }

        return summary

    def export_monthly_report(self, batch_results: List[BatchProcessingResult], 
                               filepath: str = None, month: str = None):
        summary = self.generate_monthly_summary(batch_results, month)
        
        if filepath is None:
            filepath = os.path.join(OUTPUT_PATHS["reports"], 
                                    f"monthly_report_{summary['month']}.xlsx")

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            pd.DataFrame([summary]).to_excel(writer, sheet_name='月度汇总', index=False)
            
            details_df = pd.DataFrame(summary['batch_details'])
            details_df.to_excel(writer, sheet_name='批次详情', index=False)

        return filepath

