import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json
from datetime import datetime

from config import config, OUTPUT_DIR
from data_loader import LoadedData
from quality_check import QualityResult
from energy_calculator import EnergyResult

@dataclass
class ExportResult:
    files: List[str]
    summary: Dict[str, Any]

class DataExporter:
    def __init__(self, output_dir: str = None):
        self.output_dir = Path(output_dir) if output_dir else OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.export_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def _get_filename(self, name: str, ext: str) -> str:
        return f"{self.export_timestamp}_{name}.{ext}"
    
    def export_bad_rows(
        self,
        loaded_data: LoadedData,
        formats: List[str] = None
    ) -> List[str]:
        formats = formats or config.output_formats
        exported_files = []
        
        base_name = "坏行记录"
        
        if "csv" in formats and not loaded_data.bad_rows.empty:
            csv_path = self.output_dir / self._get_filename(base_name, "csv")
            loaded_data.bad_rows.to_csv(csv_path, index=False, encoding="utf-8-sig")
            exported_files.append(str(csv_path))
        
        if "xlsx" in formats and not loaded_data.bad_rows.empty:
            xlsx_path = self.output_dir / self._get_filename(base_name, "xlsx")
            loaded_data.bad_rows.to_excel(xlsx_path, index=False, sheet_name="坏行记录")
            exported_files.append(str(xlsx_path))
        
        return exported_files
    
    def export_quality_results(
        self,
        quality_result: QualityResult,
        formats: List[str] = None
    ) -> List[str]:
        formats = formats or config.output_formats
        exported_files = []
        
        for name, df in [
            ("电流缺采记录", quality_result.current_missing_data),
            ("站间重复记录", quality_result.duplicate_section_data),
            ("坡度版本错误", quality_result.wrong_slope_data)
        ]:
            if df.empty:
                continue
            
            if "csv" in formats:
                csv_path = self.output_dir / self._get_filename(name, "csv")
                df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                exported_files.append(str(csv_path))
            
            if "xlsx" in formats:
                xlsx_path = self.output_dir / self._get_filename(name, "xlsx")
                df.to_excel(xlsx_path, index=False, sheet_name=name)
                exported_files.append(str(xlsx_path))
        
        return exported_files
    
    def export_energy_results(
        self,
        energy_result: EnergyResult,
        formats: List[str] = None
    ) -> List[str]:
        formats = formats or config.output_formats
        exported_files = []
        
        for name, df in [
            ("原始能量数据", energy_result.raw_energy_data),
            ("区间能量汇总", energy_result.section_energy),
            ("列车能量汇总", energy_result.train_energy),
            ("损失估算明细", energy_result.loss_estimation)
        ]:
            if df.empty:
                continue
            
            if "csv" in formats:
                csv_path = self.output_dir / self._get_filename(name, "csv")
                df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                exported_files.append(str(csv_path))
        
        if "xlsx" in formats:
            xlsx_path = self.output_dir / self._get_filename("再生制动能量分析", "xlsx")
            with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
                if not energy_result.raw_energy_data.empty:
                    energy_result.raw_energy_data.to_excel(
                        writer, index=False, sheet_name="原始能量数据"
                    )
                if not energy_result.section_energy.empty:
                    energy_result.section_energy.to_excel(
                        writer, index=False, sheet_name="区间能量汇总"
                    )
                if not energy_result.train_energy.empty:
                    energy_result.train_energy.to_excel(
                        writer, index=False, sheet_name="列车能量汇总"
                    )
                if not energy_result.loss_estimation.empty:
                    energy_result.loss_estimation.to_excel(
                        writer, index=False, sheet_name="损失估算明细"
                    )
                
                summary_df = pd.DataFrame([
                    {"指标": k, "数值": v}
                    for k, v in energy_result.summary.items()
                ])
                summary_df.to_excel(writer, index=False, sheet_name="分析摘要")
            
            exported_files.append(str(xlsx_path))
        
        if "json" in formats:
            json_path = self.output_dir / self._get_filename("能量分析结果", "json")
            json_data = {
                "summary": energy_result.summary,
                "export_time": datetime.now().isoformat()
            }
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            exported_files.append(str(json_path))
        
        return exported_files
    
    def export_consolidated_report(
        self,
        loaded_data: LoadedData,
        quality_result: QualityResult,
        energy_result: EnergyResult,
        formats: List[str] = None
    ) -> ExportResult:
        formats = formats or config.output_formats
        all_files = []
        
        all_files.extend(self.export_bad_rows(loaded_data, formats))
        all_files.extend(self.export_quality_results(quality_result, formats))
        all_files.extend(self.export_energy_results(energy_result, formats))
        
        summary = {
            "export_timestamp": self.export_timestamp,
            "total_files_exported": len(all_files),
            "exported_files": all_files,
            "data_summary": {
                "initial_rows": loaded_data.metadata.get("总行数", 0),
                "valid_rows": len(quality_result.valid_data),
                "bad_rows": len(loaded_data.bad_rows),
                "current_missing_groups": len(quality_result.current_missing_data),
                "duplicate_sections": len(quality_result.duplicate_section_data),
                "wrong_slope_versions": len(quality_result.wrong_slope_data)
            },
            "energy_summary": energy_result.summary
        }
        
        summary_path = self.output_dir / self._get_filename("导出报告汇总", "json")
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        all_files.append(str(summary_path))
        
        return ExportResult(files=all_files, summary=summary)

def export_all_results(
    loaded_data: LoadedData,
    quality_result: QualityResult,
    energy_result: EnergyResult,
    output_dir: str = None,
    formats: List[str] = None
) -> ExportResult:
    exporter = DataExporter(output_dir)
    return exporter.export_consolidated_report(
        loaded_data, quality_result, energy_result, formats
    )

def export_current_missing_path(
    quality_result: QualityResult,
    output_dir: str = None
) -> str:
    exporter = DataExporter(output_dir)
    
    if quality_result.current_missing_data.empty:
        return ""
    
    csv_path = exporter.output_dir / exporter._get_filename("电流缺采失败路径", "csv")
    quality_result.current_missing_data.to_csv(csv_path, index=False, encoding="utf-8-sig")
    
    return str(csv_path)
