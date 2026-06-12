"""
海草床覆盖度估算 - 主流水线
串联全部处理步骤，共用同一批 ProcessingRecord。
"""

from datetime import datetime, timezone
from typing import List, Dict, Tuple

from .models import ProcessingRecord
from .weather import WeatherForecastProvider, batch_apply_weather
from .duplicate_check import detect_duplicates, DuplicateReport
from .tide import TideStation, batch_compute_tide
from .track_cleaner import clean_track
from .coverage import batch_estimate, aggregate_statistics
from .report import ReportGenerator
from .download import export_download_package
from .review import ReviewPortal


class SeagrassPipeline:
    """
    完整的处理流水线。
    所有步骤写入同一批 ProcessingRecord。
    """

    def __init__(self, tide_stations: List[TideStation],
                 output_dir: str = "output"):
        self.tide_stations = tide_stations
        self.output_dir = output_dir
        self.weather_provider = WeatherForecastProvider()
        self.batch_id: str = ""
        self.run_timestamp: datetime = datetime.now(timezone.utc)
        self.records: List[ProcessingRecord] = []
        self.duplicate_report: DuplicateReport = None
        self.stats: Dict = {}
        self.report_files: Dict[str, str] = {}
        self.download_zip: str = ""

    def run(self, records: List[ProcessingRecord],
            batch_id: str = None) -> Dict:
        """
        执行完整流水线。
        1. 气象预报
        2. 重复上报检测
        3. 潮汐计算
        4. 轨迹清洗
        5. 覆盖度估算
        6. 报告生成
        7. 下载包导出
        """
        if batch_id:
            self.batch_id = batch_id
        elif records and records[0].batch_id:
            self.batch_id = records[0].batch_id
        else:
            self.batch_id = f"BATCH_{self.run_timestamp.strftime('%Y%m%d_%H%M%S')}"

        for r in records:
            r.batch_id = self.batch_id

        self.records = records

        # Step 1: 气象预报
        batch_apply_weather(self.records, self.weather_provider)

        # Step 2: 重复上报检测
        self.records, self.duplicate_report = detect_duplicates(self.records)

        # Step 3: 潮汐计算（和轨迹清洗共用同一批处理记录）
        batch_compute_tide(self.records, self.tide_stations)

        # Step 4: 轨迹清洗（共用同一批记录，从 record.tide_data 读）
        self.records, _ = clean_track(self.records)

        # Step 5: 覆盖度估算（读 weather_data, tide_data, track_data）
        batch_estimate(self.records)

        self.stats = aggregate_statistics(self.records)

        # Step 6: 报告（图、表、文字三者对得上，都从 self.records 取）
        reporter = ReportGenerator(self.records, self.batch_id, self.run_timestamp)
        self.report_files = reporter.generate_all(output_dir=self.output_dir)

        # Step 7: 下载包（文件名区分运行批次）
        self.download_zip = export_download_package(
            self.records, self.batch_id, self.run_timestamp,
            self.report_files, output_dir=self.output_dir
        )

        return {
            "batch_id": self.batch_id,
            "run_timestamp": self.run_timestamp.isoformat(),
            "records_count": len(self.records),
            "statistics": self.stats,
            "report_files": self.report_files,
            "download_zip": self.download_zip,
        }

    def get_review_portal(self) -> ReviewPortal:
        """获取复核入口，海岛运维可查可改"""
        return ReviewPortal(self.records)

    def print_summary(self):
        """终端输出：处理摘要 + 复核入口"""
        print("")
        print("=" * 60)
        print("  SEAGRASS BED COVERAGE ESTIMATION - PIPELINE SUMMARY")
        print("=" * 60)
        print(f"  Batch:     {self.batch_id}")
        print(f"  Run time:  {self.run_timestamp.isoformat()}")
        print(f"  Records:   {self.stats['total_records']}")
        print(f"  Estimated: {self.stats['estimated_count']}")
        print(f"  Avg cov:   {self.stats['average_coverage']:.2%}")
        print(f"  Flagged:   {self.stats['flagged_count']}")
        print(f"  Duplicates:{self.stats['duplicate_count']}")
        print("")

        if self.duplicate_report and self.stats["duplicate_count"] > 0:
            print("  --- DUPLICATE RECORDS (NOT a vague reminder) ---")
            print(self.duplicate_report.summary())
            print("")

        print("  Report files:")
        for k, v in self.report_files.items():
            print(f"    {k}: {v}")
        print(f"  Download zip: {self.download_zip}")
        print("")

        portal = self.get_review_portal()
        print(portal.interactive_summary())
