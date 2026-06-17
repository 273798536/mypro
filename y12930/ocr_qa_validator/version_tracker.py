"""版本追踪模块 - 管理数据集版本、样本变更历史"""

from typing import List, Optional
from datetime import datetime
from .models import DatasetVersion, Sample
from .storage import SampleStore, VersionStore


class VersionTracker:
    """版本追踪器 - 串起样本、版本、人工修正"""

    def __init__(self, sample_store: SampleStore, version_store: VersionStore):
        self.sample_store = sample_store
        self.version_store = version_store

    def create_version(
        self,
        version_name: str,
        description: str = "",
        samples: Optional[List[Sample]] = None,
        parent_version: Optional[str] = None,
        created_by: str = "system",
        tags: Optional[List[str]] = None,
    ) -> DatasetVersion:
        """创建一个新的数据集版本

        Args:
            version_name: 版本名称，如 v1.2
            description: 版本描述
            samples: 该版本包含的样本列表，为空则使用当前所有样本
            parent_version: 父版本名称
            created_by: 创建者
            tags: 标签列表

        Returns:
            创建的 DatasetVersion 对象
        """
        if samples is None:
            samples = self.sample_store.list_all()

        sample_ids = [s.sample_id for s in samples]

        version = DatasetVersion(
            version_name=version_name,
            description=description,
            sample_count=len(samples),
            parent_version=parent_version,
            created_by=created_by,
            sample_ids=sample_ids,
            tags=tags or [],
        )

        self.version_store.save(version)
        return version

    def get_version(self, version_name: str) -> Optional[DatasetVersion]:
        """获取指定版本"""
        return self.version_store.load_by_name(version_name)

    def list_versions(self) -> List[dict]:
        """列出所有版本摘要"""
        return self.version_store.list_all()

    def get_version_samples(self, version_name: str) -> List[Sample]:
        """获取指定版本的所有样本"""
        version = self.version_store.load_by_name(version_name)
        if not version:
            return []

        samples = []
        for sample_id in version.sample_ids:
            sample = self.sample_store.load(sample_id)
            if sample:
                samples.append(sample)
        return samples

    def diff_versions(self, version_a: str, version_b: str) -> dict:
        """比较两个版本的差异

        Returns:
            {
                'added': [...],  # 新增样本 ID
                'removed': [...], # 删除样本 ID
                'common': [...],  # 共有的样本 ID
            }
        """
        ver_a = self.version_store.load_by_name(version_a)
        ver_b = self.version_store.load_by_name(version_b)

        if not ver_a or not ver_b:
            return {"added": [], "removed": [], "common": []}

        set_a = set(ver_a.sample_ids)
        set_b = set(ver_b.sample_ids)

        return {
            "added": list(set_b - set_a),
            "removed": list(set_a - set_b),
            "common": list(set_a & set_b),
        }

    def get_latest_version(self) -> Optional[str]:
        """获取最新版本名称"""
        latest = self.version_store.get_latest()
        return latest["version_name"] if latest else None

    def bump_minor_version(self, description: str = "") -> DatasetVersion:
        """自动递增小版本号，创建新版本

        例如 v1.2 -> v1.3
        """
        latest_name = self.get_latest_version()
        if not latest_name:
            new_name = "v1.0"
        else:
            parts = latest_name.lstrip("v").split(".")
            if len(parts) >= 2:
                major = parts[0]
                minor = int(parts[1]) + 1
                new_name = f"v{major}.{minor}"
            else:
                new_name = latest_name + ".1"

        return self.create_version(
            version_name=new_name,
            description=description,
            parent_version=latest_name,
        )
