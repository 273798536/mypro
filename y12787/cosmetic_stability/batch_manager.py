"""
批次管理与处理记录模块
核心原则：批次追踪与异常留痕共用同一批处理记录
"""
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from .models import (
    LedgerData, BatchInfo, TestPoint, TestItem,
    ProcessingRecord, AnomalyRecord, StorageCondition,
    AnomalyType, SampleStatus, StabilityResult
)


class BatchManager:
    """批次管理器"""

    def __init__(self, work_dir: str):
        self.work_dir = Path(work_dir)
        self.data_file = self.work_dir / "ledger_data.json"
        self.ledger = LedgerData()
        self._record_counter = 0
        self.load()

    def _generate_id(self, prefix: str) -> str:
        """生成唯一ID"""
        self._record_counter += 1
        return f"{prefix}-{uuid.uuid4().hex[:8]}-{self._record_counter:04d}"

    def load(self):
        """加载台账数据"""
        if self.data_file.exists():
            with open(self.data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._deserialize(data)

    def save(self):
        """保存台账数据"""
        self.work_dir.mkdir(parents=True, exist_ok=True)
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(self._serialize(), f, ensure_ascii=False, indent=2, default=str)

    def _serialize(self) -> Dict:
        """序列化数据"""
        return {
            "batches": {k: self._dc_to_dict(v) for k, v in self.ledger.batches.items()},
            "test_points": {k: [self._dc_to_dict(tp) for tp in v] for k, v in self.ledger.test_points.items()},
            "test_items": {k: [self._dc_to_dict(ti) for ti in v] for k, v in self.ledger.test_items.items()},
            "stability_results": {k: [self._dc_to_dict(sr) for sr in v] for k, v in self.ledger.stability_results.items()},
            "anomalies": [self._dc_to_dict(a) for a in self.ledger.anomalies],
            "processing_records": [self._dc_to_dict(pr) for pr in self.ledger.processing_records],
        }

    def _deserialize(self, data: Dict):
        """反序列化数据"""
        for batch_no, batch_data in data.get("batches", {}).items():
            batch_data["storage_condition"] = StorageCondition(batch_data["storage_condition"])
            self.ledger.batches[batch_no] = BatchInfo(**batch_data)

        for batch_no, tps in data.get("test_points", {}).items():
            self.ledger.test_points[batch_no] = [
                TestPoint(**self._parse_datetime(tp, ["record_time"])) for tp in tps
            ]

        for batch_no, tis in data.get("test_items", {}).items():
            self.ledger.test_items[batch_no] = [TestItem(**ti) for ti in tis]

        for batch_no, srs in data.get("stability_results", {}).items():
            self.ledger.stability_results[batch_no] = [StabilityResult(**sr) for sr in srs]

        self.ledger.anomalies = [
            AnomalyRecord(**self._parse_enum(self._parse_datetime(a, ["detected_time", "handle_time"]),
                                            {"anomaly_type": AnomalyType, "status": SampleStatus}))
            for a in data.get("anomalies", [])
        ]

        self.ledger.processing_records = [
            ProcessingRecord(**self._parse_datetime(pr, ["timestamp"]))
            for pr in data.get("processing_records", [])
        ]

        max_id = 0
        for pr in self.ledger.processing_records:
            parts = pr.record_id.split("-")
            if len(parts) >= 3 and parts[-1].isdigit():
                max_id = max(max_id, int(parts[-1]))
        for a in self.ledger.anomalies:
            parts = a.anomaly_id.split("-")
            if len(parts) >= 3 and parts[-1].isdigit():
                max_id = max(max_id, int(parts[-1]))
        self._record_counter = max_id

    def _dc_to_dict(self, dc) -> Dict:
        """dataclass转字典"""
        d = {}
        for field in dc.__dataclass_fields__:
            value = getattr(dc, field)
            if hasattr(value, "value"):
                value = value.value
            d[field] = value
        return d

    def _parse_datetime(self, data: Dict, fields: List[str]) -> Dict:
        """解析日期时间字段"""
        for field in fields:
            if data.get(field):
                try:
                    data[field] = datetime.fromisoformat(data[field])
                except (ValueError, TypeError):
                    data[field] = None
        return data

    def _parse_enum(self, data: Dict, field_map: Dict[str, type]) -> Dict:
        """解析枚举字段"""
        for field, enum_cls in field_map.items():
            if data.get(field):
                try:
                    if isinstance(data[field], str):
                        data[field] = enum_cls(data[field])
                except (ValueError, TypeError):
                    pass
        return data

    def create_processing_record(self, batch_no: str, operator: str, action: str,
                                  input_files: List[str] = None,
                                  output_files: List[str] = None,
                                  anomaly_ids: List[str] = None,
                                  remarks: str = "",
                                  metadata: Dict = None) -> ProcessingRecord:
        """
        创建批处理记录
        批次追踪和异常留痕共用此记录
        """
        record = ProcessingRecord(
            record_id=self._generate_id("PROC"),
            batch_no=batch_no,
            operator=operator,
            action=action,
            timestamp=datetime.now(),
            input_files=input_files or [],
            output_files=output_files or [],
            anomaly_ids=anomaly_ids or [],
            remarks=remarks,
            metadata=metadata or {}
        )
        self.ledger.processing_records.append(record)
        return record

    def add_batch(self, batch: BatchInfo, operator: str, source_file: str = "") -> Tuple[BatchInfo, ProcessingRecord]:
        """添加批次，自动生成处理记录"""
        if batch.batch_no in self.ledger.batches:
            existing = self.ledger.batches[batch.batch_no]
            pr = self.create_processing_record(
                batch_no=batch.batch_no,
                operator=operator,
                action="批次信息更新",
                input_files=[source_file] if source_file else [],
                remarks=f"更新批次{batch.batch_no}的信息",
                metadata={"action": "update"}
            )
        else:
            pr = self.create_processing_record(
                batch_no=batch.batch_no,
                operator=operator,
                action="批次信息录入",
                input_files=[source_file] if source_file else [],
                remarks=f"新增批次{batch.batch_no}",
                metadata={"action": "create"}
            )

        self.ledger.batches[batch.batch_no] = batch
        return batch, pr

    def add_test_point(self, test_point: TestPoint, operator: str, source_file: str = "") -> Tuple[TestPoint, ProcessingRecord]:
        """添加考察时间点，自动生成处理记录"""
        batch_no = test_point.batch_no
        if batch_no not in self.ledger.test_points:
            self.ledger.test_points[batch_no] = []

        existing_idx = None
        for i, tp in enumerate(self.ledger.test_points[batch_no]):
            if tp.time_point == test_point.time_point and tp.is_blank_control == test_point.is_blank_control:
                existing_idx = i
                break

        if existing_idx is not None:
            old = self.ledger.test_points[batch_no][existing_idx]
            self.ledger.test_points[batch_no][existing_idx] = test_point
            pr = self.create_processing_record(
                batch_no=batch_no,
                operator=operator,
                action="考察点更新",
                input_files=[source_file] if source_file else [],
                remarks=f"更新批次{batch_no}{test_point.time_point}考察点数据",
                metadata={
                    "action": "update",
                    "time_point": test_point.time_point,
                    "old_test_date": old.test_date,
                    "new_test_date": test_point.test_date
                }
            )
        else:
            self.ledger.test_points[batch_no].append(test_point)
            pr = self.create_processing_record(
                batch_no=batch_no,
                operator=operator,
                action="考察点录入",
                input_files=[source_file] if source_file else [],
                remarks=f"新增批次{batch_no}{test_point.time_point}考察点",
                metadata={
                    "action": "create",
                    "time_point": test_point.time_point
                }
            )

        return test_point, pr

    def add_test_item(self, test_item: TestItem, operator: str, source_file: str = "") -> Tuple[TestItem, ProcessingRecord]:
        """添加检验项目，自动生成处理记录"""
        batch_no = test_item.batch_no
        if batch_no not in self.ledger.test_items:
            self.ledger.test_items[batch_no] = []

        existing_idx = None
        for i, ti in enumerate(self.ledger.test_items[batch_no]):
            if ti.item_code == test_item.item_code and ti.time_point == test_item.time_point:
                existing_idx = i
                break

        if existing_idx is not None:
            old = self.ledger.test_items[batch_no][existing_idx]
            self.ledger.test_items[batch_no][existing_idx] = test_item
            pr = self.create_processing_record(
                batch_no=batch_no,
                operator=operator,
                action="检验结果更新",
                input_files=[source_file] if source_file else [],
                remarks=f"更新批次{batch_no}{test_item.time_point}{test_item.item_name}检验结果",
                metadata={
                    "action": "update",
                    "item_name": test_item.item_name,
                    "time_point": test_item.time_point,
                    "old_value": old.measured_value,
                    "new_value": test_item.measured_value
                }
            )
        else:
            self.ledger.test_items[batch_no].append(test_item)
            pr = self.create_processing_record(
                batch_no=batch_no,
                operator=operator,
                action="检验结果录入",
                input_files=[source_file] if source_file else [],
                remarks=f"新增批次{batch_no}{test_item.time_point}{test_item.item_name}检验结果",
                metadata={
                    "action": "create",
                    "item_name": test_item.item_name,
                    "time_point": test_item.time_point
                }
            )

        return test_item, pr

    def add_anomaly(self, anomaly: AnomalyRecord, operator: str) -> Tuple[AnomalyRecord, ProcessingRecord]:
        """
        添加异常记录，并关联到处理记录
        异常留痕必须与批次追踪共用处理记录
        幂等性：同一批次、同一类型、同一位置的待处理异常不重复添加
        """
        for existing in self.ledger.anomalies:
            if (existing.batch_no == anomaly.batch_no
                    and existing.anomaly_type == anomaly.anomaly_type
                    and existing.location == anomaly.location
                    and existing.status == SampleStatus.PENDING):
                return existing, None

        self.ledger.anomalies.append(anomaly)

        pr = self.create_processing_record(
            batch_no=anomaly.batch_no,
            operator=operator,
            action="异常登记",
            anomaly_ids=[anomaly.anomaly_id],
            remarks=f"登记异常：{anomaly.anomaly_type.value} - {anomaly.description}",
            metadata={
                "anomaly_type": anomaly.anomaly_type.value,
                "severity": anomaly.severity,
                "location": anomaly.location
            }
        )

        anomaly.processing_record_id = pr.record_id
        return anomaly, pr

    def update_anomaly_handling(self, anomaly_id: str, handling_opinion: str,
                                 handler: str, status: str) -> Optional[AnomalyRecord]:
        """更新异常处理意见，生成处理记录"""
        status_enum = SampleStatus(status) if isinstance(status, str) else status
        for anomaly in self.ledger.anomalies:
            if anomaly.anomaly_id == anomaly_id:
                anomaly.handling_opinion = handling_opinion
                anomaly.handler = handler
                anomaly.handle_time = datetime.now()
                anomaly.status = status_enum

                self.create_processing_record(
                    batch_no=anomaly.batch_no,
                    operator=handler,
                    action="异常处理",
                    anomaly_ids=[anomaly_id],
                    remarks=f"处理异常：{handling_opinion}",
                    metadata={
                        "anomaly_id": anomaly_id,
                        "new_status": status if isinstance(status, str) else status.value,
                        "handling_opinion": handling_opinion
                    }
                )
                return anomaly
        return None

    def get_batch_trace(self, batch_no: str) -> Dict:
        """获取批次完整追踪链（包含处理记录和关联的异常）"""
        batch = self.ledger.batches.get(batch_no)
        if not batch:
            return {}

        related_records = [
            pr for pr in self.ledger.processing_records
            if pr.batch_no == batch_no
        ]

        related_anomalies = [
            a for a in self.ledger.anomalies
            if a.batch_no == batch_no
        ]

        anomaly_record_map = {a.anomaly_id: a for a in related_anomalies}

        for pr in related_records:
            pr_anomalies = [anomaly_record_map.get(aid) for aid in pr.anomaly_ids]
            pr.metadata["_linked_anomalies"] = [a for a in pr_anomalies if a]

        return {
            "batch": batch,
            "test_points": self.ledger.test_points.get(batch_no, []),
            "test_items": self.ledger.test_items.get(batch_no, []),
            "stability_results": self.ledger.stability_results.get(batch_no, []),
            "processing_records": related_records,
            "anomalies": related_anomalies
        }

    def get_anomaly_trace(self, anomaly_id: str) -> Dict:
        """顺着异常往回查，获取完整链路"""
        anomaly = None
        for a in self.ledger.anomalies:
            if a.anomaly_id == anomaly_id:
                anomaly = a
                break

        if not anomaly:
            return {}

        pr = None
        for record in self.ledger.processing_records:
            if record.record_id == anomaly.processing_record_id:
                pr = record
                break

        related_records = [
            r for r in self.ledger.processing_records
            if r.batch_no == anomaly.batch_no
        ]

        batch = self.ledger.batches.get(anomaly.batch_no)

        return {
            "anomaly": anomaly,
            "processing_record": pr,
            "batch": batch,
            "all_records_for_batch": related_records,
            "test_points": self.ledger.test_points.get(anomaly.batch_no, []),
            "test_items": self.ledger.test_items.get(anomaly.batch_no, [])
        }

    def list_batches(self) -> List[BatchInfo]:
        """列出所有批次"""
        return sorted(self.ledger.batches.values(), key=lambda b: b.create_time, reverse=True)

    def list_anomalies(self, batch_no: str = None, status: str = None) -> List[AnomalyRecord]:
        """列出异常记录"""
        anomalies = self.ledger.anomalies
        if batch_no:
            anomalies = [a for a in anomalies if a.batch_no == batch_no]
        if status:
            anomalies = [a for a in anomalies if a.status.value == status]
        return sorted(anomalies, key=lambda a: a.detected_time, reverse=True)

    def list_processing_records(self, batch_no: str = None, action: str = None) -> List[ProcessingRecord]:
        """列出处理记录"""
        records = self.ledger.processing_records
        if batch_no:
            records = [r for r in records if r.batch_no == batch_no]
        if action:
            records = [r for r in records if r.action == action]
        return sorted(records, key=lambda r: r.timestamp, reverse=True)
