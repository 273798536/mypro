import numpy as np
from datetime import datetime
from typing import List, Optional
import inspect
from physics_core import SimulationParams, FaradayLawCalculator, CalculationTrace
from parameter_validator import ValidationResult


class ReportExporter:
    def __init__(self, params: SimulationParams, calculator: FaradayLawCalculator):
        self.params = params
        self.calculator = calculator
        self._source = inspect.currentframe().f_lineno

    def export_text_report(self, times: np.ndarray, fluxes: np.ndarray, emfs: np.ndarray, 
                           currents: np.ndarray, validation_result: Optional[ValidationResult] = None,
                           save_path: str = "simulation_report.txt") -> None:
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("电磁感应模拟实验报告\n")
            f.write("=" * 80 + "\n")
            f.write(f"生成时间: {current_time}\n")
            f.write(f"生成位置: {__file__}:{source_line} (函数: {source_func})\n\n")
            
            f.write("-" * 80 + "\n")
            f.write("一、实验参数\n")
            f.write("-" * 80 + "\n")
            f.write(f"  磁铁速度 (v): {self.params.magnet_speed} m/s\n")
            f.write(f"  线圈匝数 (N): {self.params.coil_turns} 匝\n")
            f.write(f"  磁场强度 (B): {self.params.magnet_field_strength} T\n")
            f.write(f"  时间步长 (Δt): {self.params.time_step} s\n")
            f.write(f"  总时间 (T): {self.params.total_time} s\n")
            f.write(f"  线圈半径: {self.params.coil_radius} m\n")
            f.write(f"  磁铁长度: {self.params.magnet_length} m\n\n")
            
            if validation_result:
                f.write("-" * 80 + "\n")
                f.write("二、参数验证结果\n")
                f.write("-" * 80 + "\n")
                f.write(f"  验证状态: {'✓ 通过' if validation_result.is_valid else '✗ 存在错误'}\n\n")
                
                if validation_result.errors:
                    f.write("  错误信息:\n")
                    for i, error in enumerate(validation_result.errors, 1):
                        f.write(f"    {i}. {error}\n")
                    f.write("\n")
                
                if validation_result.warnings:
                    f.write("  警告信息:\n")
                    for i, warning in enumerate(validation_result.warnings, 1):
                        f.write(f"    {i}. {warning}\n")
                    f.write("\n")
                
                if validation_result.corrections:
                    f.write("  参数修正记录:\n")
                    for i, corr in enumerate(validation_result.corrections, 1):
                        f.write(f"    {i}. [{corr.source_file}:{corr.line_number}] {corr.variable_name}: "
                                f"{corr.value_before} → {corr.value_after}\n")
                        f.write(f"       原因: {corr.reason}\n")
                    f.write("\n")
            
            f.write("-" * 80 + "\n")
            f.write("三、物理原理\n")
            f.write("-" * 80 + "\n")
            f.write("  法拉第电磁感应定律:\n")
            f.write("    ε = -N · dΦ/dt\n")
            f.write("    其中 ε 为感应电动势，N 为线圈匝数，Φ 为磁通量\n\n")
            f.write("  磁通量计算:\n")
            f.write("    Φ = ∫ B·dA\n")
            f.write("    其中 B 为磁感应强度，dA 为面积元\n\n")
            f.write("  感应电流:\n")
            f.write("    I = ε / R\n")
            f.write("    其中 R 为线圈电阻（本模拟中假设 R = 10 Ω）\n\n")
            
            f.write("-" * 80 + "\n")
            f.write("四、实验结果分析\n")
            f.write("-" * 80 + "\n")
            
            max_flux_idx = np.argmax(np.abs(fluxes))
            max_emf_idx = np.argmax(np.abs(emfs))
            max_current_idx = np.argmax(np.abs(currents))
            
            f.write(f"  最大磁通量: |Φ|_max = {abs(fluxes[max_flux_idx]):.6f} Wb\n")
            f.write(f"    发生时间: t = {times[max_flux_idx]:.4f} s\n\n")
            f.write(f"  最大感应电动势: |ε|_max = {abs(emfs[max_emf_idx]):.6f} V\n")
            f.write(f"    发生时间: t = {times[max_emf_idx]:.4f} s\n\n")
            f.write(f"  最大感应电流: |I|_max = {abs(currents[max_current_idx]):.6f} A\n")
            f.write(f"    发生时间: t = {times[max_current_idx]:.4f} s\n\n")
            
            f.write("  电流方向变化分析:\n")
            sign_changes = np.where(np.diff(np.sign(currents)))[0]
            if len(sign_changes) > 0:
                f.write(f"    检测到 {len(sign_changes)} 次电流方向变化\n")
                for i, idx in enumerate(sign_changes, 1):
                    f.write(f"      第{i}次: t ≈ {times[idx]:.4f} s 附近\n")
            else:
                f.write("    未检测到电流方向变化\n")
            f.write("\n")
            
            f.write("-" * 80 + "\n")
            f.write("五、计算追踪记录（前20条）\n")
            f.write("-" * 80 + "\n")
            for i, trace in enumerate(self.calculator.traces[:20], 1):
                f.write(f"  {i}. [{trace.source_file}:{trace.line_number}] {trace.function_name}: "
                        f"{trace.variable_name} = {trace.value_after:.6f}\n")
                f.write(f"     说明: {trace.reason}\n")
            
            if len(self.calculator.traces) > 20:
                f.write(f"\n  ... 省略 {len(self.calculator.traces) - 20} 条记录\n")
            
            f.write("\n")
            f.write("=" * 80 + "\n")
            f.write("报告结束\n")
            f.write("=" * 80 + "\n")
        
        print(f"[INFO] {source_func} (L{source_line}): 文本报告已保存到 {save_path}")

    def export_csv_data(self, times: np.ndarray, fluxes: np.ndarray, emfs: np.ndarray,
                        currents: np.ndarray, save_path: str = "simulation_data.csv") -> None:
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        header = f"# 电磁感应模拟数据\n"
        header += f"# 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        header += f"# 参数: v={self.params.magnet_speed}m/s, N={self.params.coil_turns}匝, "
        header += f"B={self.params.magnet_field_strength}T, dt={self.params.time_step}s\n"
        header += f"# 列: 时间(s), 磁通量(Wb), 感应电动势(V), 感应电流(A)\n"
        
        data = np.column_stack((times, fluxes, emfs, currents))
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(header)
            np.savetxt(f, data, delimiter=',', fmt='%.8f', comments='')
        
        print(f"[INFO] {source_func} (L{source_line}): CSV数据已保存到 {save_path}")

    def export_markdown_report(self, times: np.ndarray, fluxes: np.ndarray, emfs: np.ndarray,
                               currents: np.ndarray, validation_result: Optional[ValidationResult] = None,
                               save_path: str = "simulation_report.md") -> None:
        source_func = inspect.currentframe().f_code.co_name
        source_line = inspect.currentframe().f_lineno + 1
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        max_flux = np.max(np.abs(fluxes))
        max_emf = np.max(np.abs(emfs))
        max_current = np.max(np.abs(currents))
        flux_time = times[np.argmax(np.abs(fluxes))]
        emf_time = times[np.argmax(np.abs(emfs))]
        current_time_idx = times[np.argmax(np.abs(currents))]
        
        md_content = (
            "# 电磁感应模拟实验报告\n\n"
            f"**生成时间**: {current_time}  \n"
            f"**生成位置**: `{__file__}:{source_line}`\n\n"
            "---\n\n"
            "## 一、实验参数\n\n"
            "| 参数 | 值 | 单位 |\n"
            "|------|-----|------|\n"
            f"| 磁铁速度 (v) | {self.params.magnet_speed} | m/s |\n"
            f"| 线圈匝数 (N) | {self.params.coil_turns} | 匝 |\n"
            f"| 磁场强度 (B) | {self.params.magnet_field_strength} | T |\n"
            f"| 时间步长 (Δt) | {self.params.time_step} | s |\n"
            f"| 总时间 (T) | {self.params.total_time} | s |\n"
            f"| 线圈半径 | {self.params.coil_radius} | m |\n"
            f"| 磁铁长度 | {self.params.magnet_length} | m |\n\n"
            "---\n\n"
            "## 二、物理原理\n\n"
            "### 法拉第电磁感应定律\n"
            "$$\\varepsilon = -N \\cdot \\frac{d\\Phi}{dt}$$\n\n"
            "其中:\n"
            "- $\\varepsilon$ 为感应电动势 (V)\n"
            "- $N$ 为线圈匝数\n"
            "- $\\Phi$ 为磁通量 (Wb)\n\n"
            "### 感应电流\n"
            "$$I = \\frac{\\varepsilon}{R}$$\n\n"
            "本模拟中假设线圈电阻 $R = 10 \\, \\Omega$\n\n"
            "---\n\n"
            "## 三、实验结果\n\n"
            "### 关键数据\n\n"
            "| 物理量 | 最大值 | 发生时间 |\n"
            "|--------|--------|----------|\n"
            f"| 磁通量 $|\\Phi|_{{max}}$ | {max_flux:.6f} Wb | t = {flux_time:.4f} s |\n"
            f"| 感应电动势 $|\\varepsilon|_{{max}}$ | {max_emf:.6f} V | t = {emf_time:.4f} s |\n"
            f"| 感应电流 $|I|_{{max}}$ | {max_current:.6f} A | t = {current_time_idx:.4f} s |\n\n"
            "### 电流方向变化\n"
        )
        
        sign_changes = np.where(np.diff(np.sign(currents)))[0]
        if len(sign_changes) > 0:
            md_content += f"\n检测到 **{len(sign_changes)}** 次电流方向变化:\n\n"
            for i, idx in enumerate(sign_changes, 1):
                md_content += f"- 第{i}次: t ≈ {times[idx]:.4f} s 附近\n"
        else:
            md_content += "\n未检测到电流方向变化。\n"
        
        if validation_result:
            md_content += "\n---\n\n## 四、参数验证\n\n"
            md_content += f"**验证状态**: {'✅ 通过' if validation_result.is_valid else '❌ 存在错误'}\n\n"
            
            if validation_result.errors:
                md_content += "### ❌ 错误信息\n\n"
                for i, error in enumerate(validation_result.errors, 1):
                    md_content += f"{i}. {error}\n\n"
            
            if validation_result.warnings:
                md_content += "### ⚠️ 警告信息\n\n"
                for i, warning in enumerate(validation_result.warnings, 1):
                    md_content += f"{i}. {warning}\n\n"
            
            if validation_result.corrections:
                md_content += "### 🔧 参数修正记录\n\n"
                md_content += "| # | 变量 | 原值 | 修正后 | 位置 | 原因 |\n"
                md_content += "|---|------|------|--------|------|------|\n"
                for i, corr in enumerate(validation_result.corrections, 1):
                    md_content += f"| {i} | {corr.variable_name} | {corr.value_before} | {corr.value_after} | "
                    md_content += f"`{corr.source_file.split('/')[-1]}:{corr.line_number}` | {corr.reason} |\n"
        
        md_content += "\n---\n\n## 五、结论\n\n"
        md_content += f"1. 感应电动势的最大值为 {max_emf:.4f} V，与线圈匝数和磁铁速度成正比。\n"
        md_content += f"2. 当磁铁进入和离开线圈时，磁通量变化率最大，产生感应电流峰值。\n"
        md_content += f"3. 根据楞次定律，感应电流的方向总是阻碍磁通量的变化。\n"
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        print(f"[INFO] {source_func} (L{source_line}): Markdown报告已保存到 {save_path}")
