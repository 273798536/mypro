"""弹簧疲劳寿命试算主入口"""

from .units import UnitValidator
from .materials import MaterialDatabase
from .spring_params import SpringParameter, SpringParameterMerger, SpringType
from .load_cycles import LoadCycle, LoadSpectrum, LoadCycleType
from .fatigue_calc import FatigueCalculator
from .report import ReportGenerator
from datetime import datetime


class SpringFatigueSystem:
    def __init__(self):
        self.material_db = MaterialDatabase()
        self.unit_validator = UnitValidator()
        self.fatigue_calc = FatigueCalculator(self.material_db)
        self.report_gen = ReportGenerator(self.material_db)
        self.param_merger = SpringParameterMerger()
    
    def validate_and_calculate(
        self,
        spring_param: SpringParameter,
        load_spectrum: LoadSpectrum,
        check_units: bool = True,
        stop_on_error: bool = True
    ) -> dict:
        self.unit_validator.errors = []
        self.fatigue_calc.clear_anomalies()
        
        if check_units:
            spring_param.validate_units(self.unit_validator)
            load_spectrum.validate_all(self.unit_validator)
            
            if stop_on_error and self.unit_validator.has_errors():
                return {
                    "success": False,
                    "error": "单位校验失败，请修正后重试",
                    "unit_errors": self.unit_validator.get_error_summary(),
                    "details": None
                }
        
        results = self.fatigue_calc.calculate_spectrum_fatigue(
            spring_param, load_spectrum, self.unit_validator
        )
        
        return {
            "success": True,
            "results": results,
            "unit_errors": self.unit_validator.errors,
            "anomalies": results.get("anomalies", [])
        }
    
    def generate_life_report(
        self,
        spring_param: SpringParameter,
        load_spectrum: LoadSpectrum,
        calc_results: dict,
        reviewer: str = "",
        notes: str = ""
    ):
        return self.report_gen.generate_report(
            spring_param, load_spectrum, calc_results,
            self.unit_validator,
            self.param_merger.conflicts,
            reviewer, notes
        )
    
    def check_parameter_conflicts(
        self,
        param_a: SpringParameter,
        param_b: SpringParameter
    ) -> bool:
        self.param_merger.merge(param_a, param_b)
        return self.param_merger.has_conflicts()


def run_example():
    print("=" * 60)
    print("弹簧疲劳寿命试算系统 - 示例运行")
    print("=" * 60)
    
    system = SpringFatigueSystem()
    
    spring1 = SpringParameter(
        record_id="SPR_2024_001",
        maintained_by="张工程师",
        last_updated=datetime.now().isoformat(),
        wire_diameter=5.0,
        wire_diameter_unit="mm",
        mean_coil_diameter=30.0,
        mean_coil_diameter_unit="mm",
        active_coils=8.0,
        material_grade="60Si2MnA",
        spring_type=SpringType.COMPRESSION
    )
    
    spring2 = SpringParameter(
        record_id="SPR_2024_002",
        maintained_by="李工程师",
        last_updated=datetime.now().isoformat(),
        wire_diameter=5.2,
        wire_diameter_unit="mm",
        mean_coil_diameter=30.0,
        mean_coil_diameter_unit="mm",
        active_coils=7.5,
        material_grade="50CrVA",
        spring_type=SpringType.COMPRESSION
    )
    
    print("\n--- 检查参数冲突 ---")
    has_conflict = system.check_parameter_conflicts(spring1, spring2)
    if has_conflict:
        print(system.param_merger.get_conflict_summary())
    else:
        print("无参数冲突")
    
    spectrum = LoadSpectrum(
        spectrum_id="LOAD_SPEC_001",
        name="典型工作载荷谱"
    )
    
    spectrum.add_cycle(LoadCycle(
        record_id="LOAD_001",
        maintained_by="王试验员",
        last_updated=datetime.now().isoformat(),
        cycle_type=LoadCycleType.CONSTANT_AMPLITUDE,
        min_load=100,
        max_load=500,
        load_unit="N",
        cycles=10000
    ))
    
    spectrum.add_cycle(LoadCycle(
        record_id="LOAD_002",
        maintained_by="王试验员",
        last_updated=datetime.now().isoformat(),
        cycle_type=LoadCycleType.CONSTANT_AMPLITUDE,
        min_load=200,
        max_load=800,
        load_unit="N",
        cycles=5000
    ))
    
    print("\n--- 单位校验与疲劳计算 ---")
    result = system.validate_and_calculate(spring1, spectrum)
    
    if not result["success"]:
        print(result["error"])
        print(result["unit_errors"])
        return
    
    calc_results = result["results"]
    print(f"总损伤比: {calc_results['total_damage']:.6f}")
    print(f"Miner法则: {calc_results['miner_rule_check']}")
    
    if calc_results['estimated_total_cycles'] == float('inf'):
        print("估算寿命: 无限寿命")
    else:
        print(f"估算寿命: {calc_results['estimated_total_cycles']:,.0f} 次")
    
    print("\n--- 生成报告 ---")
    report = system.generate_life_report(
        spring1, spectrum, calc_results,
        reviewer="赵主管",
        notes="首次试算，后续需补充试验数据验证"
    )
    
    report_path = "/Users/mac/pro/solo/workspaces/y12148/reports/fatigue_report_example.md"
    report.save_to_file(report_path)
    print(f"报告已保存到: {report_path}")
    
    print("\n--- 错误单位拦截演示 ---")
    bad_spectrum = LoadSpectrum(spectrum_id="BAD_SPEC", name="错误单位测试")
    bad_spectrum.add_cycle(LoadCycle(
        record_id="BAD_LOAD",
        maintained_by="测试",
        last_updated=datetime.now().isoformat(),
        cycle_type=LoadCycleType.CONSTANT_AMPLITUDE,
        min_load=100,
        max_load=500,
        load_unit="psi",
        cycles=10000
    ))
    
    bad_result = system.validate_and_calculate(spring1, bad_spectrum)
    if not bad_result["success"]:
        print("拦截成功!")
        print(bad_result["unit_errors"])
    
    print("\n" + "=" * 60)
    print("示例运行完成")
    print("=" * 60)


if __name__ == "__main__":
    run_example()
