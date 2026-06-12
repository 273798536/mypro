"""
凸包面积参数试算 - 数据管理模块
负责数据加载、脏数据标记、重复样本检测，保留原始数据来源
"""

import pandas as pd
import numpy as np
from typing import List, Tuple, Dict, Optional, Union
from io import BytesIO, StringIO
from convex_hull_calculator import PointData


class DataManager:
    """数据管理器，负责数据加载、清洗标记、重复检测"""

    def __init__(self):
        self.raw_data: Optional[pd.DataFrame] = None
        self.raw_source: str = ""
        self.points: List[PointData] = []
        self.duplicate_groups: List[List[str]] = []
        self.dirty_records: List[Dict] = []

    def load_from_csv(self, file_path: Union[str, BytesIO, StringIO], source_name: str = "") -> List[PointData]:
        """从 CSV 文件加载数据，保留原始数据
        支持文件路径字符串或文件对象
        """
        if isinstance(file_path, str):
            self.raw_source = source_name or file_path
        else:
            self.raw_source = source_name or "上传文件"
        self.raw_data = pd.read_csv(file_path)
        return self._process_dataframe(self.raw_data, self.raw_source)

    def load_from_excel(self, file_path: Union[str, BytesIO], sheet_name: Union[str, int] = 0, source_name: str = "") -> List[PointData]:
        """从 Excel 文件加载数据，保留原始数据
        支持文件路径字符串或文件对象
        """
        if isinstance(file_path, str):
            self.raw_source = source_name or f"{file_path} (Sheet: {sheet_name})"
        else:
            self.raw_source = source_name or f"上传文件 (Sheet: {sheet_name})"
        self.raw_data = pd.read_excel(file_path, sheet_name=sheet_name)
        return self._process_dataframe(self.raw_data, self.raw_source)

    def load_from_dataframe(self, df: pd.DataFrame, source_name: str = "手动输入") -> List[PointData]:
        """从 DataFrame 加载数据"""
        self.raw_source = source_name
        self.raw_data = df.copy()
        return self._process_dataframe(self.raw_data, self.raw_source)

    def load_demo_data(self) -> List[PointData]:
        """加载演示数据（含重复样本、后补备注等脏数据）"""
        demo_data = pd.DataFrame([
            {"id": "S001", "x": 65.0, "y": 72.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S002", "x": 78.0, "y": 85.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S003", "x": 45.0, "y": 50.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S004", "x": 90.0, "y": 88.0, "note": "尖子生", "source": "期中测试"},
            {"id": "S005", "x": 55.0, "y": 60.0, "note": "需关注", "source": "期中测试"},
            {"id": "S006", "x": 72.0, "y": 78.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S007", "x": 82.0, "y": 75.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S008", "x": 60.0, "y": 65.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S005", "x": 55.0, "y": 60.0, "note": "重复录入", "source": "补录数据"},
            {"id": "S009", "x": None, "y": 70.0, "note": "x值缺失", "source": "手工填写"},
            {"id": "S010", "x": 85.0, "y": None, "note": "y值缺失", "source": "手工填写"},
            {"id": "S011", "x": 200.0, "y": 30.0, "note": "疑似录入错误", "source": "手工填写"},
            {"id": "S012", "x": 70.0, "y": 80.0, "note": "后补备注：学生请假后补考", "source": "补考数据"},
            {"id": "S013", "x": 68.0, "y": 74.0, "note": "正常样本", "source": "期中测试"},
            {"id": "S014", "x": 75.0, "y": 68.0, "note": "正常样本", "source": "期中测试"},
        ])
        return self.load_from_dataframe(demo_data, source_name="演示数据集（含脏数据）")

    def _process_dataframe(self, df: pd.DataFrame, source_name: str) -> List[PointData]:
        """处理 DataFrame，标记脏数据和重复样本"""
        self.points = []
        self.dirty_records = []
        self.duplicate_groups = []

        # 标准化列名
        df = df.copy()
        col_map = self._detect_columns(df)

        for idx, row in df.iterrows():
            point_id = str(row.get(col_map["id"], f"row_{idx}"))
            x_val = row.get(col_map["x"], None)
            y_val = row.get(col_map["y"], None)
            note = str(row.get(col_map["note"], "")) if pd.notna(row.get(col_map["note"], "")) else ""
            source = str(row.get(col_map["source"], source_name)) if pd.notna(row.get(col_map["source"], "")) else source_name

            is_dirty = False
            dirty_reasons = []

            # 检查数值有效性
            try:
                x_float = float(x_val) if pd.notna(x_val) else None
            except (ValueError, TypeError):
                x_float = None
                is_dirty = True
                dirty_reasons.append("x值格式错误")

            try:
                y_float = float(y_val) if pd.notna(y_val) else None
            except (ValueError, TypeError):
                y_float = None
                is_dirty = True
                dirty_reasons.append("y值格式错误")

            # 检查缺失
            if x_float is None:
                is_dirty = True
                dirty_reasons.append("x值缺失")
                x_float = 0.0

            if y_float is None:
                is_dirty = True
                dirty_reasons.append("y值缺失")
                y_float = 0.0

            # 检查异常值（简单范围检查）
            if x_float < 0 or x_float > 150:
                is_dirty = True
                dirty_reasons.append("x值异常范围")

            if y_float < 0 or y_float > 150:
                is_dirty = True
                dirty_reasons.append("y值异常范围")

            dirty_reason = "; ".join(dirty_reasons) if dirty_reasons else ""

            if is_dirty:
                self.dirty_records.append({
                    "id": point_id,
                    "reason": dirty_reason,
                    "original_x": x_val,
                    "original_y": y_val,
                    "row_index": idx,
                })

            point = PointData(
                id=point_id,
                x=x_float,
                y=y_float,
                is_dirty=is_dirty,
                dirty_reason=dirty_reason,
                original_x=float(x_val) if pd.notna(x_val) and x_float is not None else None,
                original_y=float(y_val) if pd.notna(y_val) and y_float is not None else None,
                note=note,
                source=source,
            )
            self.points.append(point)

        # 检测重复样本
        self._detect_duplicates()

        return self.points

    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """自动检测列名映射"""
        col_map = {"id": "id", "x": "x", "y": "y", "note": "note", "source": "source"}

        columns_lower = {col.lower(): col for col in df.columns}

        for key, candidates in [
            ("id", ["id", "编号", "学号", "学生id", "样本id", "名称"]),
            ("x", ["x", "语文", "数学", "维度1", "x轴", "横坐标"]),
            ("y", ["y", "英语", "物理", "维度2", "y轴", "纵坐标"]),
            ("note", ["note", "备注", "说明", "标记", "标签"]),
            ("source", ["source", "来源", "数据源", "出处"]),
        ]:
            for cand in candidates:
                if cand.lower() in columns_lower:
                    col_map[key] = columns_lower[cand.lower()]
                    break

        return col_map

    def _detect_duplicates(self):
        """检测重复样本，按ID和坐标两种方式检测"""
        id_groups: Dict[str, List[int]] = {}
        coord_groups: Dict[Tuple[float, float], List[int]] = {}

        for idx, pt in enumerate(self.points):
            # 按ID分组
            if pt.id not in id_groups:
                id_groups[pt.id] = []
            id_groups[pt.id].append(idx)

            # 按坐标分组（非脏数据才参与坐标重复检测）
            if not pt.is_dirty:
                coord_key = (round(pt.x, 4), round(pt.y, 4))
                if coord_key not in coord_groups:
                    coord_groups[coord_key] = []
                coord_groups[coord_key].append(idx)

        # 标记ID重复
        for pid, indices in id_groups.items():
            if len(indices) > 1:
                self.duplicate_groups.append([self.points[i].id for i in indices])
                for i in indices:
                    self.points[i].is_duplicate = True
                    if "重复ID" not in self.points[i].dirty_reason:
                        if self.points[i].dirty_reason:
                            self.points[i].dirty_reason += "; 重复ID"
                        else:
                            self.points[i].dirty_reason = "重复ID"
                    self.points[i].is_dirty = True

        # 标记坐标重复
        for coord, indices in coord_groups.items():
            if len(indices) > 1:
                for i in indices:
                    if not self.points[i].is_duplicate:
                        self.points[i].is_duplicate = True
                        if "重复坐标" not in self.points[i].dirty_reason:
                            if self.points[i].dirty_reason:
                                self.points[i].dirty_reason += "; 重复坐标"
                            else:
                                self.points[i].dirty_reason = "重复坐标"
                        self.points[i].is_dirty = True

    def get_data_summary(self) -> Dict:
        """获取数据概览"""
        total = len(self.points)
        dirty = sum(1 for p in self.points if p.is_dirty)
        duplicates = sum(1 for p in self.points if p.is_duplicate)
        clean = total - dirty

        return {
            "total": total,
            "clean": clean,
            "dirty": dirty,
            "duplicates": duplicates,
            "source": self.raw_source,
            "duplicate_groups": self.duplicate_groups,
            "dirty_records": self.dirty_records,
        }

    def filter_points(
        self,
        exclude_duplicates: bool = True,
        exclude_dirty: bool = True,
        id_filter: Optional[List[str]] = None,
        source_filter: Optional[List[str]] = None,
    ) -> List[PointData]:
        """根据条件筛选数据点"""
        result = []
        for pt in self.points:
            if exclude_duplicates and pt.is_duplicate:
                continue
            if exclude_dirty and pt.is_dirty:
                continue
            if id_filter and pt.id not in id_filter:
                continue
            if source_filter and pt.source not in source_filter:
                continue
            result.append(pt)
        return result

    def get_sources(self) -> List[str]:
        """获取所有数据源"""
        return list(set(p.source for p in self.points))
