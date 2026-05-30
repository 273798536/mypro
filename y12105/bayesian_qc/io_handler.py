"""数据IO处理 - 读取抽样记录、先验参数、质检报告"""

import json
import csv
import os
from typing import List, Tuple, Dict, Any, Optional
from glob import glob

from .models import SampleRecord, PriorParams


class InputReader:
    """输入数据读取器"""

    def __init__(self, input_dir: str):
        self.input_dir = input_dir
        if not os.path.isdir(input_dir):
            raise ValueError(f"输入目录不存在: {input_dir}")

    def _find_files(self, patterns: List[str]) -> List[str]:
        """查找匹配模式的文件"""
        files = []
        for pattern in patterns:
            full_pattern = os.path.join(self.input_dir, pattern)
            files.extend(glob(full_pattern))
        return sorted(set(files))

    def read_samples(self) -> List[SampleRecord]:
        """
        读取所有抽样记录
        支持格式: JSON, CSV
        """
        files = self._find_files([
            "samples*.json",
            "sample*.json",
            "抽样*.json",
            "samples*.csv",
            "sample*.csv",
            "抽样*.csv",
            "*.json",
            "*.csv",
        ])

        samples = []
        for file_path in files:
            try:
                if file_path.endswith(".json"):
                    file_samples = self._read_json_samples(file_path)
                elif file_path.endswith(".csv"):
                    file_samples = self._read_csv_samples(file_path)
                else:
                    continue
                samples.extend(file_samples)
            except Exception as e:
                print(f"警告: 读取文件 {os.path.basename(file_path)} 失败: {e}")

        return samples

    def _read_json_samples(self, file_path: str) -> List[SampleRecord]:
        """从JSON文件读取抽样记录"""
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict) and "samples" in data:
            items = data["samples"]
        elif isinstance(data, list):
            items = data
        else:
            items = [data]

        samples = []
        source_name = os.path.basename(file_path)
        for item in items:
            if self._is_sample_record(item):
                samples.append(self._dict_to_sample(item, source_name))

        return samples

    def _read_csv_samples(self, file_path: str) -> List[SampleRecord]:
        """从CSV文件读取抽样记录"""
        samples = []
        source_name = os.path.basename(file_path)

        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if self._is_sample_record(row):
                    samples.append(self._dict_to_sample(row, source_name))

        return samples

    @staticmethod
    def _is_sample_record(item: Dict[str, Any]) -> bool:
        """判断是否为抽样记录"""
        has_sample = any(k in item for k in ["sample_id", "样本ID", "sample"])
        has_batch = any(k in item for k in ["batch_id", "批次ID", "batch"])
        has_defect = any(k in item for k in ["is_defective", "缺陷", "defective", "是否缺陷"])
        return has_sample and (has_batch or has_defect)

    @staticmethod
    def _dict_to_sample(item: Dict[str, Any], source_file: str) -> SampleRecord:
        """将字典转换为SampleRecord"""
        def get_value(*keys: str, default=None):
            for k in keys:
                if k in item and item[k] is not None and item[k] != "":
                    return item[k]
            return default

        sample_id = str(get_value("sample_id", "样本ID", "sample", "样品ID", default=""))
        batch_id = str(get_value("batch_id", "批次ID", "batch", "批号", default="unknown"))

        defect_val = get_value("is_defective", "缺陷", "defective", "是否缺陷", "不合格", default=False)
        if isinstance(defect_val, str):
            is_defective = defect_val.lower() in ["true", "是", "yes", "1", "有", "不合格", "defective"]
        else:
            is_defective = bool(defect_val)

        return SampleRecord(
            sample_id=sample_id,
            batch_id=batch_id,
            is_defective=is_defective,
            source_file=source_file,
            recorded_at=get_value("recorded_at", "检测时间", "时间"),
            inspector=get_value("inspector", "检验员", "检测人"),
            notes=get_value("notes", "备注", "说明"),
        )

    def read_prior(self) -> Optional[PriorParams]:
        """
        读取先验参数
        支持格式: JSON
        """
        files = self._find_files([
            "prior*.json",
            "先验*.json",
            "config*.json",
            "配置*.json",
        ])

        for file_path in files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if self._is_prior_params(data):
                    return self._dict_to_prior(data, os.path.basename(file_path))
            except Exception as e:
                print(f"警告: 读取先验文件 {os.path.basename(file_path)} 失败: {e}")

        return None

    @staticmethod
    def _is_prior_params(data: Dict[str, Any]) -> bool:
        """判断是否为先验参数"""
        if isinstance(data, dict) and "prior" in data:
            data = data["prior"]
        return isinstance(data, dict) and "alpha" in data and "beta" in data

    @staticmethod
    def _dict_to_prior(data: Dict[str, Any], source_file: str) -> PriorParams:
        """将字典转换为PriorParams"""
        if "prior" in data:
            data = data["prior"]

        return PriorParams(
            alpha=float(data.get("alpha", 1.0)),
            beta=float(data.get("beta", 1.0)),
            description=data.get("description", data.get("说明", "无信息先验")),
            source=data.get("source", source_file),
            updated_at=data.get("updated_at"),
        )

    def get_samples_by_batch(self) -> Dict[str, List[SampleRecord]]:
        """按批次分组的抽样记录"""
        samples = self.read_samples()
        batches: Dict[str, List[SampleRecord]] = {}
        for s in samples:
            if s.batch_id not in batches:
                batches[s.batch_id] = []
            batches[s.batch_id].append(s)
        return batches
