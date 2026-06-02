"""参数历史模块 - 追踪参数变化并与预览导出联动"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any


class ParameterHistory:
    """参数历史记录器"""
    
    def __init__(self):
        self.records: List[Dict[str, Any]] = []
        self.band_labels: Dict[str, tuple] = {}
    
    def add_record(self, file_name: str, params: Dict, issues: List = None):
        """添加参数记录"""
        record = {
            "file_name": file_name,
            "timestamp": datetime.now().isoformat(),
            "parameters": params,
            "issues": issues or [],
            "band_label": self._get_band_label(params)
        }
        self.records.append(record)
        return record
    
    def _get_band_label(self, params: Dict) -> str:
        """根据参数获取频段标签"""
        band_start = params.get("band_start", 0) or 0
        band_end = params.get("band_end", 20000) or 20000
        
        labels = [
            ("Sub-bass", 20, 60),
            ("Bass", 60, 250),
            ("Low Midrange", 250, 500),
            ("Midrange", 500, 2000),
            ("Upper Midrange", 2000, 4000),
            ("Presence", 4000, 6000),
            ("Brilliance", 6000, 20000),
        ]
        
        for label, start, end in labels:
            if band_start >= start and band_end <= end:
                return label
            elif band_start < end and band_end > start:
                return f"{label} (partial)"
        
        return "Custom"
    
    def update_band_label(self, old_label: str, new_label: str, new_range: tuple):
        """更新频段标签 - 触发预览和参数历史联动更新"""
        if old_label in self.band_labels:
            del self.band_labels[old_label]
        
        self.band_labels[new_label] = new_range
        
        for record in self.records:
            params = record["parameters"]
            band_start = params.get("band_start", 0)
            band_end = params.get("band_end", 20000)
            
            if (band_start >= new_range[0] and band_end <= new_range[1]):
                record["band_label"] = new_label
                record["band_label_updated"] = True
                record["band_label_updated_at"] = datetime.now().isoformat()
    
    def get_records_by_band(self, band_label: str) -> List[Dict]:
        """按频段标签获取记录"""
        return [r for r in self.records if r.get("band_label") == band_label]
    
    def export_json(self, output_path: Path):
        """导出参数历史为JSON"""
        export_data = {
            "exported_at": datetime.now().isoformat(),
            "record_count": len(self.records),
            "band_labels": self.band_labels,
            "records": self._format_records_for_export()
        }
        
        Path(output_path).write_text(
            json.dumps(export_data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
    
    def _format_records_for_export(self) -> List[Dict]:
        """格式化记录用于导出"""
        formatted = []
        for record in self.records:
            formatted_record = {
                "file_name": record["file_name"],
                "timestamp": record["timestamp"],
                "band_label": record["band_label"],
                "parameters": {
                    "threshold": record["parameters"].get("threshold"),
                    "band_start": record["parameters"].get("band_start") or 0,
                    "band_end": record["parameters"].get("band_end") or 22050,
                },
                "issue_count": len(record.get("issues", [])),
                "issues": record.get("issues", [])
            }
            
            if "band_label_updated" in record:
                formatted_record["band_label_updated"] = True
                formatted_record["band_label_updated_at"] = record["band_label_updated_at"]
            
            formatted.append(formatted_record)
        return formatted
    
    def get_summary(self) -> Dict:
        """获取历史摘要"""
        summary = {
            "total_records": len(self.records),
            "band_distribution": {},
            "threshold_range": {
                "min": None,
                "max": None,
                "avg": None
            },
            "total_issues": 0
        }
        
        if not self.records:
            return summary
        
        thresholds = []
        for record in self.records:
            band = record.get("band_label", "Unknown")
            summary["band_distribution"][band] = summary["band_distribution"].get(band, 0) + 1
            
            thresh = record["parameters"].get("threshold")
            if thresh is not None:
                thresholds.append(thresh)
            
            summary["total_issues"] += len(record.get("issues", []))
        
        if thresholds:
            summary["threshold_range"]["min"] = min(thresholds)
            summary["threshold_range"]["max"] = max(thresholds)
            summary["threshold_range"]["avg"] = sum(thresholds) / len(thresholds)
        
        return summary
