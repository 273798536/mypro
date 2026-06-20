"""核心 API - 对外统一接口"""
from typing import List, Optional, Dict, Any

from .storage import Storage
from .sample_importer import SampleImporter
from .snapshot import SnapshotManager, CorrectionManager
from .gray_check import GrayRatioChecker
from .report import ReportGenerator
from .models import Sample, Correction, VersionSnapshot, GrayIssue, Report


class ModelCompressSnapshot:
    """模型压缩版本快照 - 对外主接口

    串起样本、版本、人工修正和报告
    """

    def __init__(self, data_dir: str = "./data"):
        self.storage = Storage(data_dir)
        self.importer = SampleImporter(self.storage)
        self.snapshot_mgr = SnapshotManager(self.storage)
        self.correction_mgr = CorrectionManager(self.storage)
        self.gray_checker = GrayRatioChecker(self.storage)
        self.report_gen = ReportGenerator(self.storage)

    # ---- 样本导入 ----

    def import_file(self, file_path: str, model_version: str,
                    source_name: Optional[str] = None) -> List[Sample]:
        """从文件导入样本"""
        return self.importer.import_file(file_path, source_name, model_version)

    def import_from_string(self, content: str, source_name: str,
                          model_version: str,
                          format_hint: str = "jsonl") -> List[Sample]:
        """从字符串内容导入"""
        return self.importer.import_from_string(content, source_name,
                                               model_version, format_hint)

    def import_single_sample(self, data: Dict[str, Any], source_name: str,
                        model_version: str) -> Sample:
        """导入单条样本（如旧误判样本放回等场景）"""
        return self.importer.import_single_dict(data, source_name, model_version)

    # ---- 快照 ----

    def create_snapshot(self, name: str, model_version: str,
                        description: str = "",
                        created_by: str = "",
                        parent_snapshot_id: Optional[str] = None,
                        sample_ids: Optional[List[str]] = None) -> VersionSnapshot:
        """创建版本快照"""
        return self.snapshot_mgr.create_snapshot(
            name, model_version, sample_ids, description,
            created_by, parent_snapshot_id
        )

    def add_samples_to_snapshot(self, snapshot_id: str,
                                sample_ids: List[str]) -> Optional[VersionSnapshot]:
        return self.snapshot_mgr.add_samples_to_snapshot(snapshot_id, sample_ids)

    # ---- 人工修正 ----

    def correct_sample(self, sample_id: str, new_label: str,
                       operator: str = "", reason: str = "",
                       note: str = "") -> Optional[Correction]:
        """人工修正样本标签"""
        correction = self.correction_mgr.correct_sample(
            sample_id, new_label, operator, reason, note
        )
        return correction

    def get_sample_corrections(self, sample_id: str) -> List[Correction]:
        return self.correction_mgr.get_sample_history(sample_id)

    # ---- 灰度检查 ----

    def check_gray_ratio(self, snapshot_id: str) -> List[GrayIssue]:
        return self.gray_checker.check_snapshot(snapshot_id)

    # ---- 报告 ----

    def generate_report(self, snapshot_id: str,
                      title: Optional[str] = None) -> Report:
        """生成完整报告"""
        return self.report_gen.generate_full_report(snapshot_id, title)

    def generate_diff_report(self, new_snapshot_id: str,
                             old_snapshot_id: str,
                             title: Optional[str] = None) -> Report:
        """生成对比报告"""
        return self.report_gen.generate_diff_report(
            new_snapshot_id, old_snapshot_id, title
        )

    # ---- 查询 ----

    def list_samples(self) -> List[Sample]:
        return self.storage.list_samples()

    def list_snapshots(self) -> List[VersionSnapshot]:
        return self.storage.list_snapshots()

    def get_snapshot(self, snapshot_id: str) -> Optional[VersionSnapshot]:
        return self.storage.load_snapshot(snapshot_id)

    def list_reports(self) -> List[Report]:
        return self.storage.list_reports()

    def get_raw_dir(self) -> str:
        return self.storage.get_raw_path()
