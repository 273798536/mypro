"""
作品存储和迭代记录模块
"""
import json
import os
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict, field


@dataclass
class FractalRecord:
    """分形生成记录"""
    id: str
    fractal_type: str
    params: Dict[str, Any]
    color_scheme: str
    width: int
    height: int
    student_note: str
    image_path: Optional[str]
    created_at: str
    validation_messages: List[Dict[str, Any]]
    render_time_ms: float
    parent_id: Optional[str] = None
    revision: int = 1
    source: str = "manual"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StudentPortfolio:
    """学生作品集"""
    student_id: str
    student_name: str
    records: List[FractalRecord] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "student_name": self.student_name,
            "created_at": self.created_at,
            "records": [r.to_dict() for r in self.records],
        }


class FractalStorage:
    """分形存储管理器"""

    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        self.images_dir = os.path.join(base_dir, "images")
        self.records_dir = os.path.join(base_dir, "records")
        self.portfolios_dir = os.path.join(base_dir, "portfolios")
        self._ensure_directories()

    def _ensure_directories(self):
        for d in [self.base_dir, self.images_dir, self.records_dir, self.portfolios_dir]:
            os.makedirs(d, exist_ok=True)

    def _generate_id(self) -> str:
        return str(uuid.uuid4())[:12]

    def save_record(self, fractal_type: str, params: Dict[str, Any],
                     color_scheme: str, width: int, height: int,
                     student_note: str = "", validation_messages: List[Dict[str, Any]] = None,
                     render_time_ms: float = 0.0, image_data: bytes = None,
                     parent_id: Optional[str] = None, source: str = "manual") -> FractalRecord:
        """保存分形记录"""
        record_id = self._generate_id()
        image_path = None

        if image_data:
            image_filename = f"{record_id}.png"
            image_path = os.path.join(self.images_dir, image_filename)
            with open(image_path, "wb") as f:
                f.write(image_data)
            image_path = image_path

        if validation_messages is None:
            validation_messages = []

        record = FractalRecord(
            id=record_id,
            fractal_type=fractal_type,
            params=params,
            color_scheme=color_scheme,
            width=width,
            height=height,
            student_note=student_note,
            image_path=image_path,
            created_at=datetime.now().isoformat(),
            validation_messages=validation_messages,
            render_time_ms=render_time_ms,
            parent_id=parent_id,
            revision=1 if not parent_id else self._get_next_revision(parent_id),
            source=source,
        )

        self._save_record_to_file(record)
        return record

    def _save_record_to_file(self, record: FractalRecord):
        record_file = os.path.join(self.records_dir, f"{record.id}.json")
        with open(record_file, "w", encoding="utf-8") as f:
            json.dump(record.to_dict(), f, ensure_ascii=False, indent=2)

    def _get_next_revision(self, parent_id: str) -> int:
        parent = self.get_record(parent_id)
        if not parent:
            return 1
        return parent.revision + 1

    def get_record(self, record_id: str) -> Optional[FractalRecord]:
        """获取单个记录"""
        record_file = os.path.join(self.records_dir, f"{record_id}.json")
        if not os.path.exists(record_file):
            return None

        with open(record_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        return FractalRecord(**data)

    def list_records(self, limit: int = 50, offset: int = 0,
                     fractal_type: Optional[str] = None) -> List[FractalRecord]:
        """列出记录"""
        records = []
        for filename in sorted(os.listdir(self.records_dir), reverse=True):
            if not filename.endswith(".json"):
                continue

            record_id = filename[:-5]
            record = self.get_record(record_id)
            if record:
                if fractal_type and record.fractal_type != fractal_type:
                    continue
                records.append(record)

        return records[offset:offset + limit]

    def get_record_history(self, record_id: str) -> List[FractalRecord]:
        """获取记录的迭代历史（包括父记录和所有子记录）"""
        records = []
        current = self.get_record(record_id)

        while current:
            records.insert(0, current)
            if not current.parent_id:
                break
            current = self.get_record(current.parent_id)

        return records

    def get_revisions(self, parent_id: str) -> List[FractalRecord]:
        """获取某个记录的所有修订版本"""
        revisions = []
        for filename in os.listdir(self.records_dir):
            if not filename.endswith(".json"):
                continue
            record_id = filename[:-5]
            record = self.get_record(record_id)
            if record and record.parent_id == parent_id:
                revisions.append(record)

        revisions.sort(key=lambda r: r.revision)
        return revisions

    def save_portfolio(self, student_id: str, student_name: str,
                        record_ids: List[str]) -> StudentPortfolio:
        """保存学生作品集"""
        portfolio = StudentPortfolio(
            student_id=student_id,
            student_name=student_name,
        )

        for record_id in record_ids:
            record = self.get_record(record_id)
            if record:
                portfolio.records.append(record)

        portfolio_file = os.path.join(self.portfolios_dir, f"{student_id}.json")
        with open(portfolio_file, "w", encoding="utf-8") as f:
            json.dump(portfolio.to_dict(), f, ensure_ascii=False, indent=2)

        return portfolio

    def get_portfolio(self, student_id: str) -> Optional[StudentPortfolio]:
        """获取学生作品集"""
        portfolio_file = os.path.join(self.portfolios_dir, f"{student_id}.json")
        if not os.path.exists(portfolio_file):
            return None

        with open(portfolio_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        portfolio = StudentPortfolio(
            student_id=data["student_id"],
            student_name=data["student_name"],
            created_at=data["created_at"],
        )

        for record_data in data["records"]:
            portfolio.records.append(FractalRecord(**record_data))

        return portfolio

    def delete_record(self, record_id: str) -> bool:
        """删除记录"""
        record = self.get_record(record_id)
        if not record:
            return False

        record_file = os.path.join(self.records_dir, f"{record_id}.json")
        if os.path.exists(record_file):
            os.remove(record_file)

        if record.image_path and os.path.exists(record.image_path):
            os.remove(record.image_path)

        return True

    def get_statistics(self) -> Dict[str, Any]:
        """获取存储统计信息"""
        total_records = len([f for f in os.listdir(self.records_dir) if f.endswith(".json")])
        total_images = len([f for f in os.listdir(self.images_dir) if f.endswith(".png")])
        total_portfolios = len([f for f in os.listdir(self.portfolios_dir) if f.endswith(".json")])

        total_size = 0
        for dirpath, dirnames, filenames in os.walk(self.base_dir):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total_size += os.path.getsize(filepath)

        return {
            "total_records": total_records,
            "total_images": total_images,
            "total_portfolios": total_portfolios,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }
