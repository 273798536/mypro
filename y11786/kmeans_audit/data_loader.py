"""数据加载模块 - 支持多种数据源，保留源位置信息"""

from typing import Optional, Tuple, Dict, Any, List
import os
import pandas as pd
import numpy as np

from .exceptions import DataSourceError, SourceLocation
from .audit import AuditTrail, ActionType
from .config import Constants


class DataSource:
    """数据源封装，保留原始位置信息"""

    def __init__(
        self,
        file_path: str,
        df: pd.DataFrame,
        sheet_name: Optional[str] = None,
        source_type: str = "file",
    ):
        self.file_path = file_path
        self.df = df
        self.sheet_name = sheet_name
        self.source_type = source_type
        self.original_row_numbers = list(range(2, len(df) + 2))

    def get_location(
        self,
        row_index: Optional[int] = None,
        column_name: Optional[str] = None,
        column_index: Optional[int] = None,
    ) -> SourceLocation:
        """获取指定位置的源位置信息"""
        row_number = None
        if row_index is not None and 0 <= row_index < len(self.original_row_numbers):
            row_number = self.original_row_numbers[row_index]

        return SourceLocation(
            file_path=self.file_path,
            sheet_name=self.sheet_name,
            row_number=row_number,
            column_name=column_name,
            column_index=column_index,
            source_type=self.source_type,
        )

    def get_row_location(self, row_index: int) -> SourceLocation:
        """获取行的源位置信息"""
        return self.get_location(row_index=row_index)

    def get_column_location(self, column_name: str) -> SourceLocation:
        """获取列的源位置信息"""
        return self.get_location(column_name=column_name)

    def get_cell_location(self, row_index: int, column_name: str) -> SourceLocation:
        """获取单元格的源位置信息"""
        return self.get_location(row_index=row_index, column_name=column_name)


class DataLoader:
    """数据加载器"""

    def __init__(self, audit_trail: Optional[AuditTrail] = None):
        self.audit_trail = audit_trail or AuditTrail()

    def load(
        self,
        file_path: str,
        sheet_name: Optional[str] = None,
        customer_id_col: Optional[str] = None,
        **kwargs,
    ) -> DataSource:
        """加载数据文件

        Args:
            file_path: 文件路径
            sheet_name: Excel工作表名（可选）
            customer_id_col: 客户ID列名（可选）
            **kwargs: 传递给pandas读取函数的额外参数

        Returns:
            DataSource对象
        """
        if not os.path.exists(file_path):
            location = SourceLocation(file_path=file_path)
            raise DataSourceError(
                f"{Constants.ERROR_MISSING_FILE}: {file_path}",
                location=location,
            )

        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext not in Constants.SUPPORTED_INPUT_FORMATS:
            location = SourceLocation(file_path=file_path)
            raise DataSourceError(
                f"{Constants.ERROR_INVALID_FORMAT}: {file_ext}，支持格式: {Constants.SUPPORTED_INPUT_FORMATS}",
                location=location,
            )

        try:
            if file_ext == ".csv":
                df = self._load_csv(file_path, **kwargs)
            elif file_ext in (".xlsx", ".xls"):
                df = self._load_excel(file_path, sheet_name, **kwargs)
                sheet_name = sheet_name or "Sheet1"

            self.audit_trail.log_info(
                action_type=ActionType.DATA_LOAD,
                message=f"成功加载数据文件: {file_path}",
                source_location=SourceLocation(file_path=file_path, sheet_name=sheet_name),
                rows=len(df),
                columns=list(df.columns),
                shape=df.shape,
            )

            return DataSource(
                file_path=file_path,
                df=df,
                sheet_name=sheet_name,
                source_type=file_ext.lstrip("."),
            )

        except Exception as e:
            location = SourceLocation(file_path=file_path, sheet_name=sheet_name)
            raise DataSourceError(
                f"加载文件失败: {str(e)}",
                location=location,
            ) from e

    def _load_csv(self, file_path: str, **kwargs) -> pd.DataFrame:
        """加载CSV文件"""
        default_kwargs = {"encoding": "utf-8-sig", "keep_default_na": True}
        default_kwargs.update(kwargs)
        return pd.read_csv(file_path, **default_kwargs)

    def _load_excel(
        self, file_path: str, sheet_name: Optional[str] = None, **kwargs
    ) -> pd.DataFrame:
        """加载Excel文件"""
        default_kwargs = {"keep_default_na": True}
        default_kwargs.update(kwargs)
        return pd.read_excel(file_path, sheet_name=sheet_name, **default_kwargs)

    def load_config_file(self, file_path: str) -> Dict[str, Any]:
        """加载配置文件（标准化规则、备注等）"""
        if not os.path.exists(file_path):
            location = SourceLocation(file_path=file_path)
            raise DataSourceError(
                f"{Constants.ERROR_MISSING_FILE}: {file_path}",
                location=location,
            )

        file_ext = os.path.splitext(file_path)[1].lower()

        try:
            if file_ext == ".csv":
                df = pd.read_csv(file_path)
            elif file_ext in (".xlsx", ".xls"):
                df = pd.read_excel(file_path)
            else:
                location = SourceLocation(file_path=file_path)
                raise DataSourceError(
                    f"{Constants.ERROR_INVALID_FORMAT}: {file_ext}",
                    location=location,
                )

            config = {}
            if "feature" in df.columns and "method" in df.columns:
                config["standardization_rules"] = df.to_dict("records")
            if "label" in df.columns and "remark" in df.columns:
                config["label_remarks"] = df.to_dict("records")
            if "customer_id" in df.columns and "reason" in df.columns:
                config["anomaly_records"] = df.to_dict("records")

            self.audit_trail.log_info(
                action_type=ActionType.DATA_LOAD,
                message=f"成功加载配置文件: {file_path}",
                source_location=SourceLocation(file_path=file_path),
                config_keys=list(config.keys()),
            )

            return config

        except Exception as e:
            location = SourceLocation(file_path=file_path)
            raise DataSourceError(
                f"加载配置文件失败: {str(e)}",
                location=location,
            ) from e

    def load_previous_report(self, file_path: str) -> Optional[Dict[str, Any]]:
        """加载历史分群报告用于对比"""
        try:
            if file_path.endswith(".json"):
                import json

                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            elif file_path.endswith(".xlsx"):
                df = pd.read_excel(file_path, sheet_name=None)
                return {
                    "sheets": {name: df[name].to_dict("records") for name in df}
                }
        except Exception as e:
            self.audit_trail.log_warning(
                action_type=ActionType.DATA_LOAD,
                message=f"加载历史报告失败，将跳过对比: {str(e)}",
                source_location=SourceLocation(file_path=file_path),
            )
        return None
