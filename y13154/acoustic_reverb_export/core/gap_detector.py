from typing import Any, Dict, List, Optional, Tuple

from .storage import Storage


class GapDetector:
    """
    采样缺口检测模块。

    以前采样缺口靠人眼扫, 现在本模块至少要做到:
      - 把每一个缺口的 "影响范围" 和 "来源行" 都保留下
      - 和具体的报告导出 run 绑定, 重启后可继续追溯
    """

    GAP_TYPES = ("time_missing", "frequency_missing", "amplitude_anomaly", "data_corrupt")

    def __init__(self, storage: Storage):
        self.storage = storage

    def detect_from_rows(
        self,
        rows: List[Dict[str, Any]],
        report_run_id: int,
        sample_rate: int,
        gap_tolerance_samples: int,
        source_file: str = "",
    ) -> List[Dict[str, Any]]:
        """
        从原始采样行列表中检测缺口。

        rows 每行至少应包含:
          - row_index:  所在源文件行号 (或自增序号)
          - timestamp:  采样时间戳 (秒, 浮点或整数)
          - freq_band:  频带标识 (可选, 用于频率缺口)
          - amplitude:  幅值 (可选, 用于异常检测)
        """
        gaps: List[Dict[str, Any]] = []
        if not rows:
            return gaps

        sorted_rows = sorted(rows, key=lambda r: (r.get("timestamp", 0), r.get("row_index", 0)))
        expected_dt = 1.0 / max(sample_rate, 1)
        tolerance = max(gap_tolerance_samples, 1) * expected_dt

        prev = None
        for row in sorted_rows:
            if prev is not None:
                dt = float(row.get("timestamp", 0)) - float(prev.get("timestamp", 0))
                if dt > tolerance:
                    gap = {
                        "report_run_id": report_run_id,
                        "gap_type": "time_missing",
                        "source_file": source_file,
                        "source_row": int(row.get("row_index", 0)),
                        "start_time": str(prev.get("timestamp", "")),
                        "end_time": str(row.get("timestamp", "")),
                        "frequency_range": "",
                        "impact_scope": (
                            f"时间缺失 {dt:.3f}s 约等于 {int(dt / expected_dt)} 个采样点, "
                            f"影响频带覆盖全部, 来源行 {prev.get('row_index')} ~ {row.get('row_index')}"
                        ),
                        "description": (
                            f"连续两帧时间差 {dt:.3f}s 超过容忍 {tolerance:.3f}s, "
                            f"源文件 {source_file or '未提供'} 行 {row.get('row_index')}"
                        ),
                        "is_manual": False,
                    }
                    self.storage.add_sampling_gap(**gap)
                    gaps.append(gap)
            prev = row

        band_rows: Dict[str, int] = {}
        for row in sorted_rows:
            band = str(row.get("freq_band", ""))
            if band:
                band_rows[band] = band_rows.get(band, 0) + 1
        if band_rows:
            min_count = min(band_rows.values())
            max_count = max(band_rows.values())
            if max_count - min_count > max(1, int(0.1 * max_count)):
                gap = {
                    "report_run_id": report_run_id,
                    "gap_type": "frequency_missing",
                    "source_file": source_file,
                    "source_row": None,
                    "start_time": "",
                    "end_time": "",
                    "frequency_range": ",".join(sorted(band_rows.keys())),
                    "impact_scope": (
                        f"频带采样数量不均匀, 最多 {max_count} 最少 {min_count}, "
                        f"涉及 {len(band_rows)} 个频带"
                    ),
                    "description": (
                        "各频带采样点数差异超过 10%, 请检查数据采集是否对所有频带一致, "
                        + "; ".join(f"{k}={v}" for k, v in sorted(band_rows.items()))
                    ),
                    "is_manual": False,
                }
                self.storage.add_sampling_gap(**gap)
                gaps.append(gap)

        return gaps

    def add_manual_gap(
        self,
        report_run_id: int,
        gap_type: str,
        impact_scope: str,
        source_file: str = "",
        source_row: int = None,
        start_time: str = "",
        end_time: str = "",
        frequency_range: str = "",
        description: str = "",
    ) -> int:
        """
        允许人眼发现的缺口也能录入, 并保留来源行。
        """
        if gap_type not in self.GAP_TYPES:
            raise ValueError(f"gap_type 必须是 {self.GAP_TYPES} 之一")
        return self.storage.add_sampling_gap(
            report_run_id=report_run_id,
            gap_type=gap_type,
            impact_scope=impact_scope,
            source_file=source_file,
            source_row=source_row,
            start_time=start_time,
            end_time=end_time,
            frequency_range=frequency_range,
            description=description,
            is_manual=True,
        )

    def list_for_report(self, report_run_id: int) -> List[Dict[str, Any]]:
        return self.storage.list_gaps(report_run_id)

    def summary_for_report(self, report_run_id: int) -> Dict[str, Any]:
        gaps = self.list_for_report(report_run_id)
        by_type: Dict[str, int] = {}
        rows_with_source = 0
        for g in gaps:
            by_type[g["gap_type"]] = by_type.get(g["gap_type"], 0) + 1
            if g.get("source_row"):
                rows_with_source += 1
        return {
            "report_run_id": report_run_id,
            "total_gaps": len(gaps),
            "by_type": by_type,
            "rows_with_source_row": rows_with_source,
            "all_impact_scopes": [g["impact_scope"] for g in gaps],
        }
