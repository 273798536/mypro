"""
收益率数据读取与合并模块
"""

import os
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class DataSource:
    file_path: str
    file_name: str
    asset_names: List[str]
    original_order: List[str]
    data: pd.DataFrame
    read_success: bool = True
    error_message: str = ""


@dataclass
class MergedData:
    returns: pd.DataFrame
    sources: List[DataSource]
    asset_universe: List[str]
    original_source_orders: Dict[str, List[str]] = field(default_factory=dict)
    asset_order_changes: Dict[str, List[str]] = field(default_factory=dict)


class DataReader:
    def __init__(self):
        self.error_files: List[Tuple[str, str]] = []
        self.supported_formats = {'.csv': self._read_csv, '.xlsx': self._read_excel, '.xls': self._read_excel}

    def read_single_file(self, file_path: str) -> DataSource:
        file_name = os.path.basename(file_path)
        _, ext = os.path.splitext(file_path)
        
        if ext.lower() not in self.supported_formats:
            self.error_files.append((file_name, f"不支持的文件格式: {ext}"))
            return DataSource(file_path=file_path, file_name=file_name, asset_names=[], original_order=[], 
                            data=pd.DataFrame(), read_success=False, 
                            error_message=f"不支持的文件格式: {ext}")
        
        try:
            reader_func = self.supported_formats[ext.lower()]
            df = reader_func(file_path)
            
            if df.empty:
                self.error_files.append((file_name, "文件为空或无法解析"))
                return DataSource(file_path=file_path, file_name=file_name, asset_names=[], original_order=[],
                                data=pd.DataFrame(), read_success=False,
                                error_message="文件为空或无法解析")
            
            asset_names = df.columns.tolist()
            original_order = asset_names.copy()
            
            return DataSource(file_path=file_path, file_name=file_name, asset_names=asset_names,
                            original_order=original_order, data=df, read_success=True)
        
        except Exception as e:
            error_msg = f"读取失败: {str(e)}"
            self.error_files.append((file_name, error_msg))
            return DataSource(file_path=file_path, file_name=file_name, asset_names=[], original_order=[],
                            data=pd.DataFrame(), read_success=False, error_message=error_msg)

    def _read_csv(self, file_path: str) -> pd.DataFrame:
        df = pd.read_csv(file_path, index_col=0, parse_dates=True)
        df.index.name = df.index.name or 'date'
        return df

    def _read_excel(self, file_path: str) -> pd.DataFrame:
        df = pd.read_excel(file_path, index_col=0, parse_dates=True)
        df.index.name = df.index.name or 'date'
        return df

    def merge_multiple_sources(self, file_paths: List[str], keep_original_names: bool = True) -> MergedData:
        sources: List[DataSource] = []
        all_data: Dict[str, pd.DataFrame] = {}
        original_source_orders: Dict[str, List[str]] = {}
        
        for file_path in file_paths:
            source = self.read_single_file(file_path)
            sources.append(source)
            
            if source.read_success:
                file_name = os.path.basename(file_path)
                if keep_original_names:
                    all_data[file_name] = source.data
                    original_source_orders[file_name] = source.original_order
                else:
                    all_data[file_path] = source.data
                    original_source_orders[file_path] = source.original_order
        
        if not all_data:
            return MergedData(returns=pd.DataFrame(), sources=sources, asset_universe=[],
                            original_source_orders=original_source_orders)
        
        merged_df = self._merge_dataframes(list(all_data.values()))
        asset_universe = merged_df.columns.tolist()
        
        asset_order_changes = self._detect_order_changes(original_source_orders, asset_universe)
        
        return MergedData(returns=merged_df, sources=sources, asset_universe=asset_universe,
                        original_source_orders=original_source_orders, asset_order_changes=asset_order_changes)

    def _merge_dataframes(self, dfs: List[pd.DataFrame]) -> pd.DataFrame:
        if not dfs:
            return pd.DataFrame()
        
        result = dfs[0]
        for df in dfs[1:]:
            result = result.join(df, how='outer', rsuffix='_dup')
            
            dup_cols = [c for c in result.columns if c.endswith('_dup')]
            for dup_col in dup_cols:
                orig_col = dup_col[:-4]
                result[orig_col] = result[orig_col].combine_first(result[dup_col])
                result = result.drop(columns=[dup_col])
        
        return result

    def _detect_order_changes(self, original_orders: Dict[str, List[str]], 
                             current_order: List[str]) -> Dict[str, List[str]]:
        changes = {}
        for source_name, orig_order in original_orders.items():
            current_in_source = [a for a in current_order if a in orig_order]
            orig_in_current = [a for a in orig_order if a in current_order]
            if current_in_source != orig_in_current:
                changes[source_name] = {
                    'original': orig_in_current,
                    'current': current_in_source
                }
        return changes

    def get_error_summary(self) -> List[Dict[str, str]]:
        return [{'file_name': fname, 'error': err} for fname, err in self.error_files]
