"""样本导入模块 - 保留原始来源，不清洗脏数据"""
import json
import re
from typing import List, Optional, Dict, Any
from pathlib import Path

from .models import Sample, _new_id
from .storage import Storage


class SampleImporter:
    """样本导入器

    原则：
    1. 原始文件原样保存，绝不修改
    2. 解析只做"尽力而为"，解析不出来就留空
    3. 每条样本都记录 raw_source 和 raw_content，方便回溯
    """

    def __init__(self, storage: Storage):
        self.storage = storage

    def import_file(self, file_path: str, source_name: Optional[str] = None,
                    model_version: str = "unknown") -> List[Sample]:
        """从文件导入样本

        支持格式：.jsonl, .csv, .log, .txt
        所有格式都会原样保存原始文件
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")

        raw_content = path.read_text(encoding="utf-8")
        source = source_name or path.name

        # 原始文件原样存入
        self.storage.save_raw_file(source, raw_content)

        # 根据后缀解析
        suffix = path.suffix.lower()
        if suffix == ".jsonl":
            samples = self._parse_jsonl(raw_content, source, model_version)
        elif suffix == ".csv":
            samples = self._parse_csv(raw_content, source, model_version)
        elif suffix in (".log", ".txt"):
            samples = self._parse_log(raw_content, source, model_version)
        else:
            # 未知格式，整个文件当一条样本
            samples = [self._make_single_sample(raw_content, source, model_version)]

        # 保存解析后的样本
        for s in samples:
            self.storage.save_sample(s)

        return samples

    def import_from_string(self, content: str, source_name: str,
                           model_version: str = "unknown",
                           format_hint: str = "jsonl") -> List[Sample]:
        """从字符串内容导入（用于晚到附件、补录等场景）"""
        # 原始内容原样保存
        self.storage.save_raw_file(source_name, content)

        if format_hint == "jsonl":
            samples = self._parse_jsonl(content, source_name, model_version)
        elif format_hint == "csv":
            samples = self._parse_csv(content, source_name, model_version)
        elif format_hint == "log":
            samples = self._parse_log(content, source_name, model_version)
        else:
            samples = [self._make_single_sample(content, source_name, model_version)]

        for s in samples:
            self.storage.save_sample(s)

        return samples

    def import_single_dict(self, data: Dict[str, Any], source_name: str,
                           model_version: str = "unknown") -> Sample:
        """导入单条字典格式的样本（用于人工补录、放回旧样本等）"""
        # 原始内容就是 JSON 字符串
        raw_content = json.dumps(data, ensure_ascii=False, indent=2)
        self.storage.save_raw_file(source_name, raw_content)

        sample = Sample(
            sample_id=_new_id("s"),
            raw_source=source_name,
            raw_content=raw_content,
            model_version=model_version,
            input_text=str(data.get("input", data.get("text", ""))),
            predicted_label=str(data.get("predicted", data.get("pred_label", ""))),
            true_label=str(data.get("true", data.get("true_label", ""))),
            confidence=float(data.get("confidence", 0.0) or 0.0),
            gray_ratio=self._safe_float(data.get("gray_ratio")),
            features={k: v for k, v in data.items()
                      if k not in ("input", "text", "predicted", "pred_label",
                                    "true", "true_label", "confidence", "gray_ratio")},
            is_misjudged=bool(data.get("is_misjudged", False)),
            note=str(data.get("note", "")),
        )
        self.storage.save_sample(sample)
        return sample

    # ---- 解析方法（尽力而为，绝不报错） ----

    def _parse_jsonl(self, content: str, source: str, model_version: str) -> List[Sample]:
        samples = []
        for i, line in enumerate(content.strip().splitlines()):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                sample = Sample(
                    sample_id=_new_id("s"),
                    raw_source=source,
                    raw_content=line,
                    model_version=str(data.get("model_version", model_version)),
                    input_text=str(data.get("input", data.get("text", ""))),
                    predicted_label=str(data.get("predicted", data.get("pred_label", ""))),
                    true_label=str(data.get("true", data.get("true_label", ""))),
                    confidence=float(data.get("confidence", 0.0) or 0.0),
                    gray_ratio=self._safe_float(data.get("gray_ratio")),
                    features={k: v for k, v in data.items()
                              if k not in ("model_version", "input", "text",
                                          "predicted", "pred_label", "true",
                                          "true_label", "confidence", "gray_ratio")},
                    is_misjudged=bool(data.get("is_misjudged", False)),
                    note=str(data.get("note", "")),
                )
                samples.append(sample)
            except (json.JSONDecodeError, ValueError):
                # 解析失败就当纯文本样本，原始内容完整保留
                sample = Sample(
                    sample_id=_new_id("s"),
                    raw_source=source,
                    raw_content=line,
                    model_version=model_version,
                    input_text=line,
                    note=f"JSON解析失败的原始行 #{i}",
                )
                samples.append(sample)
        return samples

    def _parse_csv(self, content: str, source: str, model_version: str) -> List[Sample]:
        samples = []
        lines = content.strip().splitlines()
        if not lines:
            return samples

        # 简单 CSV 解析，不依赖 csv 模块，避免引号复杂情况
        headers = [h.strip().strip('"') for h in lines[0].split(",")]

        for i, line in enumerate(lines[1:], start=1):
            if not line.strip():
                continue
            values = [v.strip().strip('"') for v in line.split(",")]
            data = dict(zip(headers, values)) if len(headers) == len(values) else {}

            sample = Sample(
                sample_id=_new_id("s"),
                raw_source=source,
                raw_content=line,
                model_version=data.get("model_version", model_version),
                input_text=data.get("input", data.get("text", "")),
                predicted_label=data.get("predicted", data.get("pred_label", "")),
                true_label=data.get("true", data.get("true_label", "")),
                confidence=self._safe_float(data.get("confidence")),
                gray_ratio=self._safe_float(data.get("gray_ratio")),
                features=data,
                note=f"CSV行 #{i}" if len(headers) != len(values) else "",
            )
            samples.append(sample)

        return samples

    def _parse_log(self, content: str, source: str, model_version: str) -> List[Sample]:
        """解析训练日志格式（尽力而为）

        常见格式: [时间] [级别] 预测结果: xxx 标签: yyy 置信度: 0.xx
        """
        samples = []
        # 尝试按行解析
        for i, line in enumerate(content.strip().splitlines()):
            line = line.strip()
            if not line:
                continue

            sample = Sample(
                sample_id=_new_id("s"),
                raw_source=source,
                raw_content=line,
                model_version=model_version,
                input_text="",
                predicted_label="",
                confidence=0.0,
                note=f"日志行 #{i}",
            )

            # 尝试提取预测标签
            m = re.search(r'pred(?:icted)?[:：]\s*(\S+)', line, re.IGNORECASE)
            if m:
                sample.predicted_label = m.group(1)

            # 尝试提取真实标签
            m = re.search(r'(?:true|label|ground)[:：]\s*(\S+)', line, re.IGNORECASE)
            if m:
                sample.true_label = m.group(1)

            # 尝试提取置信度
            m = re.search(r'(?:conf|confidence|score)[:：]\s*([0-9.]+)', line, re.IGNORECASE)
            if m:
                sample.confidence = self._safe_float(m.group(1)) or 0.0

            # 尝试提取灰度比例
            m = re.search(r'gray(?:_ratio)?[:：]\s*([0-9.]+)', line, re.IGNORECASE)
            if m:
                sample.gray_ratio = self._safe_float(m.group(1))

            samples.append(sample)

        return samples

    def _make_single_sample(self, content: str, source: str, model_version: str) -> Sample:
        return Sample(
            sample_id=_new_id("s"),
            raw_source=source,
            raw_content=content,
            model_version=model_version,
            input_text=content[:500],
            note=f"整体文件作为单条样本（原始格式未解析）",
        )

    @staticmethod
    def _safe_float(v) -> Optional[float]:
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None
