"""寿命报告导出模块"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json
import os

from .fatigue_calc import FatigueResult, AnomalyRecord
from .spring_params import SpringParameter, ConflictItem
from .materials import Material, MaterialSource, MaterialDatabase
from .units import UnitValidator, UnitError


@dataclass
class FatigueReport:
    report_id: str
    report_date: str
    spring_info: Dict
    load_spectrum_info: Dict
    material_info: Dict
    calculation_results: List[FatigueResult]
    total_damage: float
    estimated_life_cycles: float
    miner_rule_check: str
    unit_errors: List[UnitError]
    parameter_conflicts: List[ConflictItem]
    anomalies: List[AnomalyRecord]
    sn_source: MaterialSource
    reviewer: str = ""
    notes: str = ""
    
    def generate_markdown(self) -> str:
        lines = []
        lines.append("# 弹簧疲劳寿命试算报告")
        lines.append("")
        lines.append(f"**报告编号**: {self.report_id}")
        lines.append(f"**生成日期**: {self.report_date}")
        lines.append(f"**审核人**: {self.reviewer or '待审核'}")
        lines.append("")
        
        if self.unit_errors:
            lines.append("## ⚠️ 单位错误")
            lines.append("")
            lines.append("| 参数 | 期望单位 | 实际单位 | 记录ID | 错误信息 |")
            lines.append("|------|---------|---------|--------|---------|")
            for e in self.unit_errors:
                lines.append(f"| {e.parameter} | {e.expected_unit} | {e.actual_unit} | {e.record_id or '-'} | {e.message} |")
            lines.append("")
            lines.append("> **注意**: 存在单位错误，计算结果可能不准确，请先修正单位后重新计算！")
            lines.append("")
        
        if self.parameter_conflicts:
            lines.append("## ⚠️ 参数冲突")
            lines.append("")
            lines.append("| 字段 | 来源A | 来源B | 严重程度 |")
            lines.append("|------|-------|-------|---------|")
            for c in self.parameter_conflicts:
                severity = "🔴 严重" if c.severity == "error" else "🟡 警告"
                lines.append(f"| {c.field_name} | {c.param_a_value} ({c.param_a_source}) | {c.param_b_value} ({c.param_b_source}) | {severity} |")
            lines.append("")
            lines.append("> **说明**: 参数存在冲突，请协调相关人员确认正确参数后再计算。")
            lines.append("")
        
        if self.anomalies:
            lines.append("## ⚠️ 异常标记")
            lines.append("")
            lines.append("| 类型 | 描述 | 记录ID | 严重程度 |")
            lines.append("|------|------|--------|---------|")
            for a in self.anomalies:
                severity = "🔴 错误" if a.severity == "error" else "🟡 警告"
                lines.append(f"| {a.anomaly_type.value} | {a.description} | {a.source_record_id or '-'} | {severity} |")
            lines.append("")
        
        lines.append("## 1. 弹簧参数")
        lines.append("")
        lines.append("| 参数 | 数值 | 单位 | 记录ID | 维护人 |")
        lines.append("|------|------|------|--------|--------|")
        lines.append(f"| 钢丝直径 | {self.spring_info.get('wire_diameter', '-')} | {self.spring_info.get('wire_diameter_unit', '-')} | {self.spring_info.get('record_id', '-')} | {self.spring_info.get('maintained_by', '-')} |")
        lines.append(f"| 弹簧中径 | {self.spring_info.get('mean_coil_diameter', '-')} | {self.spring_info.get('mean_coil_diameter_unit', '-')} | {self.spring_info.get('record_id', '-')} | {self.spring_info.get('maintained_by', '-')} |")
        lines.append(f"| 有效圈数 | {self.spring_info.get('active_coils', '-')} | - | {self.spring_info.get('record_id', '-')} | {self.spring_info.get('maintained_by', '-')} |")
        lines.append(f"| 旋绕比 | {self.spring_info.get('spring_index', '-'):.2f} | - | - | - |")
        lines.append("")
        
        lines.append("## 2. 材料信息")
        lines.append("")
        mat = self.material_info
        lines.append(f"**材料牌号**: {mat.get('grade', '-')}")
        lines.append(f"**材料名称**: {mat.get('name', '-')}")
        lines.append(f"**抗拉强度**: {mat.get('tensile_strength_mpa', '-')} MPa")
        lines.append(f"**屈服强度**: {mat.get('yield_strength_mpa', '-')} MPa")
        lines.append(f"**疲劳极限**: {mat.get('fatigue_limit_mpa', '-')} MPa")
        lines.append("")
        lines.append("### S-N曲线来源")
        lines.append("")
        lines.append(f"**标准编号**: {self.sn_source.source_id}")
        lines.append(f"**标准名称**: {self.sn_source.name}")
        lines.append(f"**版本**: {self.sn_source.version}")
        lines.append(f"**发布日期**: {self.sn_source.date}")
        lines.append("")
        lines.append("> **说明**: 本报告所有疲劳计算均使用上述标准中的S-N曲线数据，保证口径统一。")
        lines.append("")
        
        lines.append("## 3. 载荷谱信息")
        lines.append("")
        lines.append(f"**载荷谱名称**: {self.load_spectrum_info.get('name', '-')}")
        lines.append(f"**载荷谱ID**: {self.load_spectrum_info.get('spectrum_id', '-')}")
        lines.append(f"**总循环数**: {self.load_spectrum_info.get('total_cycles', '-'):,}")
        lines.append("")
        
        lines.append("## 4. 疲劳计算结果")
        lines.append("")
        lines.append("| 载荷记录ID | 最大应力(MPa) | 最小应力(MPa) | 应力幅(MPa) | 应力比 | 估算寿命(次) | 损伤比 | S-N来源 | 疲劳极限 |")
        lines.append("|-----------|--------------|--------------|-------------|--------|-------------|--------|---------|----------|")
        
        for r in self.calculation_results:
            cycles_str = f"{r.estimated_cycles:.2e}" if r.estimated_cycles != float('inf') else "∞"
            lines.append(
                f"| {r.load_record_id} | {r.max_stress_mpa:.1f} | {r.min_stress_mpa:.1f} | "
                f"{r.stress_amplitude_mpa:.1f} | {r.stress_ratio:.3f} | {cycles_str} | "
                f"{r.damage_ratio:.6f} | {r.sn_source_record_id or '-'} | {r.fatigue_limit_check} |"
            )
        lines.append("")
        
        lines.append("## 5. 总损伤与寿命评估")
        lines.append("")
        lines.append(f"**总损伤比 (Miner累积)**: {self.total_damage:.6f}")
        
        if self.estimated_life_cycles == float('inf'):
            lines.append("**估算总寿命**: ∞ (无限寿命)")
        else:
            lines.append(f"**估算总寿命**: {self.estimated_life_cycles:,.0f} 次循环")
        
        lines.append(f"**Miner法则判定**: {'✅ 通过' if self.miner_rule_check == '通过' else '❌ 不通过'}")
        lines.append("")
        
        if self.notes:
            lines.append("## 6. 备注")
            lines.append("")
            lines.append(self.notes)
            lines.append("")
        
        lines.append("---")
        lines.append("*本报告由弹簧疲劳寿命试算系统自动生成*")
        
        return "\n".join(lines)
    
    def save_to_file(self, filepath: str, format: str = "markdown") -> bool:
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            if format == "markdown":
                content = self.generate_markdown()
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
            elif format == "json":
                data = {
                    "report_id": self.report_id,
                    "report_date": self.report_date,
                    "total_damage": self.total_damage,
                    "estimated_life_cycles": self.estimated_life_cycles,
                    "miner_rule_check": self.miner_rule_check,
                    "unit_errors": [str(e) for e in self.unit_errors],
                    "anomalies": [str(a) for a in self.anomalies]
                }
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                return False
            return True
        except Exception as e:
            print(f"保存报告失败: {e}")
            return False


class ReportGenerator:
    def __init__(self, material_db: MaterialDatabase):
        self.material_db = material_db
    
    def generate_report(
        self,
        spring: SpringParameter,
        spectrum,
        calc_results: Dict,
        unit_validator: UnitValidator,
        conflicts: List[ConflictItem] = None,
        reviewer: str = "",
        notes: str = ""
    ) -> FatigueReport:
        material = self.material_db.get_material(spring.material_grade)
        
        report_id = f"RPT-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        return FatigueReport(
            report_id=report_id,
            report_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            spring_info={
                "record_id": spring.record_id,
                "maintained_by": spring.maintained_by,
                "wire_diameter": spring.wire_diameter,
                "wire_diameter_unit": spring.wire_diameter_unit,
                "mean_coil_diameter": spring.mean_coil_diameter,
                "mean_coil_diameter_unit": spring.mean_coil_diameter_unit,
                "active_coils": spring.active_coils,
                "spring_index": spring.get_spring_index()
            },
            load_spectrum_info={
                "spectrum_id": spectrum.spectrum_id,
                "name": spectrum.name,
                "total_cycles": spectrum.get_total_cycles()
            },
            material_info={
                "grade": material.grade if material else spring.material_grade,
                "name": material.name if material else "未知",
                "tensile_strength_mpa": material.tensile_strength_mpa if material else "-",
                "yield_strength_mpa": material.yield_strength_mpa if material else "-",
                "fatigue_limit_mpa": material.fatigue_limit_mpa if material else "-"
            },
            calculation_results=calc_results.get("individual_results", []),
            total_damage=calc_results.get("total_damage", 0),
            estimated_life_cycles=calc_results.get("estimated_total_cycles", 0),
            miner_rule_check=calc_results.get("miner_rule_check", ""),
            unit_errors=unit_validator.errors,
            parameter_conflicts=conflicts or [],
            anomalies=calc_results.get("anomalies", []),
            sn_source=material.source if material else MaterialSource("-", "-", "-", "-"),
            reviewer=reviewer,
            notes=notes
        )
