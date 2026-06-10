from typing import List, Dict, Tuple, Optional
from .models import BatchRecord, AnalysisResult, SpectrumData


class IonBalanceAnalyzer:
    def __init__(self):
        self.ion_standard_wavelengths = {
            "铜离子(Cu²⁺)": {"wavelength": 810, "tolerance": 20, "unit": "g/L",
                          "normal_range": (150, 220), "color": "蓝色"},
            "镍离子(Ni²⁺)": {"wavelength": 395, "tolerance": 20, "unit": "g/L",
                          "normal_range": (60, 100), "color": "绿色"},
            "锌离子(Zn²⁺)": {"wavelength": 620, "tolerance": 20, "unit": "g/L",
                          "normal_range": (20, 50), "color": "无色"},
            "铬离子(Cr⁶⁺)": {"wavelength": 540, "tolerance": 20, "unit": "g/L",
                          "normal_range": (5, 20), "color": "黄色"},
            "硫酸根(SO₄²⁻)": {"wavelength": 420, "tolerance": 20, "unit": "g/L",
                            "normal_range": (100, 180), "color": "白色沉淀"},
        }
        self.temperature_correction_factor = 0.02
    
    def analyze_batch(self, record: BatchRecord) -> BatchRecord:
        record.analysis_results = []
        
        detected_ions = self._identify_ions_from_spectrum(record.spectrum_data)
        
        for ion_name, ion_info in detected_ions.items():
            concentration = self._calculate_concentration(
                ion_info["peak_absorbance"],
                ion_name,
                record.temperature
            )
            
            standard = self.ion_standard_wavelengths.get(ion_name, {})
            normal_range = standard.get("normal_range", (0, 9999))
            unit = standard.get("unit", "g/L")
            
            status = "normal"
            remark = ""
            
            if concentration < normal_range[0]:
                status = "abnormal"
                remark = f"浓度偏低，低于正常下限 {normal_range[0]} {unit}"
            elif concentration > normal_range[1]:
                status = "abnormal"
                remark = f"浓度偏高，超过正常上限 {normal_range[1]} {unit}"
            
            formula = f"根据朗伯-比尔定律：C = A / (ε × L)，温度修正系数={(1 + self.temperature_correction_factor * (record.temperature - 25)):.4f}"
            
            near_points = self._get_spectrum_points_near_wavelength(
                record.spectrum_data,
                ion_info["peak_wavelength"],
                20
            )
            
            result = AnalysisResult(
                ion_name=ion_name,
                concentration=round(concentration, 2),
                unit=unit,
                status=status,
                remark=remark,
                spectrum_points=near_points,
                calculation_formula=formula
            )
            record.analysis_results.append(result)
        
        record.overall_status = self._evaluate_overall_status(record.analysis_results)
        record.analysis_opinion = self._generate_analysis_opinion(record)
        
        return record
    
    def _identify_ions_from_spectrum(self, spectrum: List[SpectrumData]) -> Dict[str, Dict]:
        detected = {}
        
        if not spectrum:
            return detected
        
        max_abs = max(p.absorbance for p in spectrum) if spectrum else 0
        min_abs_threshold = max(0.3, max_abs * 0.25)
        
        for ion_name, ion_info in self.ion_standard_wavelengths.items():
            target_wl = ion_info["wavelength"]
            tolerance = ion_info["tolerance"]
            
            nearest_point = None
            min_diff = float('inf')
            peak_abs = 0.0
            peak_wl = target_wl
            
            for point in spectrum:
                diff = abs(point.wavelength - target_wl)
                if diff <= tolerance and diff < min_diff:
                    min_diff = diff
                    nearest_point = point
                    if point.absorbance > peak_abs:
                        peak_abs = point.absorbance
                        peak_wl = point.wavelength
            
            if nearest_point and peak_abs >= min_abs_threshold:
                detected[ion_name] = {
                    "peak_wavelength": peak_wl,
                    "peak_absorbance": peak_abs,
                    "nearest_point": nearest_point
                }
        
        return detected
    
    def _calculate_concentration(self, absorbance: float, ion_name: str, temperature: float) -> float:
        molar_absorptivity = {
            "铜离子(Cu²⁺)": 1.17,
            "镍离子(Ni²⁺)": 1.40,
            "锌离子(Zn²⁺)": 1.04,
            "铬离子(Cr⁶⁺)": 9.4,
            "硫酸根(SO₄²⁻)": 0.636,
        }
        
        epsilon = molar_absorptivity.get(ion_name, 10.0)
        path_length = 1.0
        
        temp_factor = 1 + self.temperature_correction_factor * (temperature - 25)
        
        concentration = absorbance / (epsilon * path_length) * temp_factor * 100
        return concentration
    
    def _get_spectrum_points_near_wavelength(self, spectrum: List[SpectrumData],
                                             target_wl: float, window: float) -> List[SpectrumData]:
        near_points = []
        for point in spectrum:
            if abs(point.wavelength - target_wl) <= window:
                near_points.append(point)
        near_points.sort(key=lambda p: p.wavelength)
        return near_points
    
    def _evaluate_overall_status(self, results: List[AnalysisResult]) -> str:
        if not results:
            return "pending"
        
        abnormal_count = sum(1 for r in results if r.status == "abnormal")
        
        if abnormal_count == 0:
            return "normal"
        elif abnormal_count == 1:
            return "warning"
        else:
            return "abnormal"
    
    def _generate_analysis_opinion(self, record: BatchRecord) -> str:
        if not record.analysis_results:
            return "未检测到有效离子数据，请检查谱图数据质量。"
        
        abnormal_ions = [r for r in record.analysis_results if r.status == "abnormal"]
        normal_ions = [r for r in record.analysis_results if r.status == "normal"]
        
        opinion_parts = []
        
        if normal_ions:
            ion_names = "、".join(r.ion_name for r in normal_ions)
            opinion_parts.append(f"{ion_names} 浓度正常，在工艺范围内。")
        
        if abnormal_ions:
            opinion_parts.append("存在异常项目：")
            for r in abnormal_ions:
                opinion_parts.append(f"  - {r.ion_name}: {r.remark}")
            
            if len(abnormal_ions) >= 2:
                opinion_parts.append("建议：多项离子浓度异常，请核查试剂添加记录和电镀工艺参数，必要时重新取样检测。")
            else:
                opinion_parts.append("建议：单项离子浓度异常，可先核查对应试剂的添加量和有效期，再决定是否调整。")
        
        if record.temperature < 15 or record.temperature > 35:
            opinion_parts.append(f"注意：工作温度为 {record.temperature}℃，偏离室温范围(20-30℃)，可能影响镀液性能。")
        
        return "\n".join(opinion_parts)
    
    def calculate_ion_balance(self, record: BatchRecord) -> Dict:
        cations = {}
        anions = {}
        
        for result in record.analysis_results:
            ion_name = result.ion_name
            if "²⁺" in ion_name or "⁺" in ion_name or "阳" in ion_name:
                cations[ion_name] = result.concentration
            elif "²⁻" in ion_name or "⁻" in ion_name or "阴" in ion_name or "根" in ion_name:
                anions[ion_name] = result.concentration
        
        total_cations = sum(cations.values())
        total_anions = sum(anions.values())
        
        balance_ratio = total_cations / total_anions if total_anions > 0 else 0
        
        balance_status = "balanced"
        balance_remark = ""
        
        if 0.85 <= balance_ratio <= 1.15:
            balance_status = "balanced"
            balance_remark = "阴阳离子基本平衡"
        elif balance_ratio < 0.85:
            balance_status = "anion_excess"
            balance_remark = "阴离子偏多，可能缺少阳离子或存在未检测阴离子"
        else:
            balance_status = "cation_excess"
            balance_remark = "阳离子偏多，可能缺少阴离子或存在未检测阳离子"
        
        return {
            "cations": cations,
            "anions": anions,
            "total_cations": round(total_cations, 2),
            "total_anions": round(total_anions, 2),
            "balance_ratio": round(balance_ratio, 3),
            "balance_status": balance_status,
            "balance_remark": balance_remark
        }
    
    def get_abnormal_trace(self, record: BatchRecord, ion_name: str) -> Optional[Dict]:
        for result in record.analysis_results:
            if result.ion_name == ion_name and result.status == "abnormal":
                return {
                    "batch_no": record.batch_no,
                    "ion_name": ion_name,
                    "concentration": result.concentration,
                    "unit": result.unit,
                    "status": result.status,
                    "remark": result.remark,
                    "spectrum_points": result.spectrum_points,
                    "calculation_formula": result.calculation_formula,
                    "reagent_records": record.reagent_records,
                    "weighing_records": record.weighing_records,
                    "temperature": record.temperature,
                    "temperature_unit": record.temperature_unit,
                    "analysis_opinion": record.analysis_opinion,
                    "run_id": record.run_id,
                    "run_time": record.run_time,
                    "source_file": record.source_file,
                }
        return None
