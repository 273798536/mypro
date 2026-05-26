"""数据加载模块 - 加载行情K线、成交信号、手续费表、停牌日历、滑点参数、回测报告"""

from __future__ import annotations

import os
import glob
import yaml
import hashlib
import pandas as pd
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class DataSource:
    """数据源信息 - 用于审计追踪"""
    name: str
    path: str
    file_hash: str
    load_time: datetime
    row_count: int
    columns: List[str]

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "path": self.path,
            "file_hash": self.file_hash,
            "load_time": self.load_time.isoformat(),
            "row_count": self.row_count,
            "columns": self.columns,
        }


@dataclass
class LoadedData:
    """已加载的所有数据"""
    kline: pd.DataFrame = field(default_factory=pd.DataFrame)
    signals: pd.DataFrame = field(default_factory=pd.DataFrame)
    fee_table: Dict = field(default_factory=dict)
    suspension: pd.DataFrame = field(default_factory=pd.DataFrame)
    slippage_params: Dict = field(default_factory=dict)
    backtest_report: pd.DataFrame = field(default_factory=pd.DataFrame)
    sources: Dict[str, DataSource] = field(default_factory=dict)


def _file_hash(filepath: str) -> str:
    """计算文件哈希用于版本追踪"""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()[:16]


def _find_file(directory: str, patterns: List[str]) -> Optional[str]:
    """在目录中查找匹配模式的文件"""
    for pattern in patterns:
        files = glob.glob(os.path.join(directory, pattern))
        if files:
            return sorted(files)[0]
    return None


def _read_file(filepath: str, **kwargs) -> pd.DataFrame:
    """根据扩展名读取文件"""
    ext = Path(filepath).suffix.lower()
    if ext == '.parquet':
        return pd.read_parquet(filepath, **kwargs)
    elif ext == '.csv':
        return pd.read_csv(filepath, **kwargs)
    elif ext in ['.xlsx', '.xls']:
        return pd.read_excel(filepath, **kwargs)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def load_kline(input_dir: str) -> Tuple[pd.DataFrame, Optional[DataSource]]:
    """加载行情K线数据

    预期字段: datetime, symbol, open, high, low, close, volume, amount
    """
    kline_dir = os.path.join(input_dir, 'kline')
    filepath = _find_file(kline_dir, ['*.parquet', '*.csv', '*.xlsx'])
    if not filepath:
        return pd.DataFrame(), None

    df = _read_file(filepath)
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values(['symbol', 'datetime']).reset_index(drop=True)

    source = DataSource(
        name='kline',
        path=filepath,
        file_hash=_file_hash(filepath),
        load_time=datetime.now(),
        row_count=len(df),
        columns=list(df.columns),
    )
    return df, source


def load_signals(input_dir: str) -> Tuple[pd.DataFrame, Optional[DataSource]]:
    """加载成交信号数据

    预期字段: datetime, symbol, direction, volume, price, order_type
    direction: 1=买入, -1=卖出
    """
    signals_dir = os.path.join(input_dir, 'signals')
    filepath = _find_file(signals_dir, ['*.parquet', '*.csv', '*.xlsx'])
    if not filepath:
        return pd.DataFrame(), None

    df = _read_file(filepath)
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime').reset_index(drop=True)

    source = DataSource(
        name='signals',
        path=filepath,
        file_hash=_file_hash(filepath),
        load_time=datetime.now(),
        row_count=len(df),
        columns=list(df.columns),
    )
    return df, source


def load_fee_table(input_dir: str) -> Tuple[Dict, Optional[DataSource]]:
    """加载手续费表

    支持YAML或CSV格式，支持阶梯费率
    示例YAML:
    commission:
      buy:
        rate: 0.0003
        min_fee: 5
      sell:
        rate: 0.0013
        min_fee: 5
        stamp_duty: 0.001
    tiers:
      - threshold: 1000000
        buy_rate: 0.00025
        sell_rate: 0.0011
    """
    fee_dir = os.path.join(input_dir, 'fee_table')
    yaml_file = _find_file(fee_dir, ['*.yaml', '*.yml'])
    csv_file = _find_file(fee_dir, ['*.csv'])

    if yaml_file:
        with open(yaml_file, 'r', encoding='utf-8') as f:
            fee_config = yaml.safe_load(f)
        filepath = yaml_file
    elif csv_file:
        df = _read_file(csv_file)
        fee_config = df.to_dict('records')
        filepath = csv_file
    else:
        return {}, None

    source = DataSource(
        name='fee_table',
        path=filepath,
        file_hash=_file_hash(filepath),
        load_time=datetime.now(),
        row_count=len(fee_config) if isinstance(fee_config, list) else 1,
        columns=list(fee_config.keys()) if isinstance(fee_config, dict) else [],
    )
    return fee_config, source


def load_suspension(input_dir: str) -> Tuple[pd.DataFrame, Optional[DataSource]]:
    """加载停牌日历

    预期字段: symbol, suspend_date, resume_date, reason
    """
    suspension_dir = os.path.join(input_dir, 'suspension')
    filepath = _find_file(suspension_dir, ['*.csv', '*.parquet', '*.xlsx'])
    if not filepath:
        return pd.DataFrame(), None

    df = _read_file(filepath)
    for col in ['suspend_date', 'resume_date']:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col])

    source = DataSource(
        name='suspension',
        path=filepath,
        file_hash=_file_hash(filepath),
        load_time=datetime.now(),
        row_count=len(df),
        columns=list(df.columns),
    )
    return df, source


def load_slippage_params(input_dir: str) -> Tuple[Dict, Optional[DataSource]]:
    """加载滑点参数

    支持YAML格式，多种滑点模型
    示例:
    model: fixed        # fixed | percentage | volatility
    fixed:
      buy_bps: 3
      sell_bps: 3
    percentage:
      buy_ratio: 0.0003
      sell_ratio: 0.0003
    volatility:
      lookback: 20
      multiplier: 0.1
    """
    params_dir = os.path.join(input_dir, 'slippage_params')
    filepath = _find_file(params_dir, ['*.yaml', '*.yml'])
    if not filepath:
        default_params = {
            "model": "fixed",
            "fixed": {"buy_bps": 3, "sell_bps": 3}
        }
        return default_params, None

    with open(filepath, 'r', encoding='utf-8') as f:
        params = yaml.safe_load(f)

    source = DataSource(
        name='slippage_params',
        path=filepath,
        file_hash=_file_hash(filepath),
        load_time=datetime.now(),
        row_count=1,
        columns=list(params.keys()),
    )
    return params, source


def load_backtest_report(input_dir: str) -> Tuple[pd.DataFrame, Optional[DataSource]]:
    """加载原始回测报告

    预期字段: datetime, symbol, direction, volume, price, fee, slippage, net_pnl
    """
    report_dir = os.path.join(input_dir, 'backtest_report')
    filepath = _find_file(report_dir, ['*.csv', '*.parquet', '*.xlsx'])
    if not filepath:
        return pd.DataFrame(), None

    df = _read_file(filepath)
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])

    source = DataSource(
        name='backtest_report',
        path=filepath,
        file_hash=_file_hash(filepath),
        load_time=datetime.now(),
        row_count=len(df),
        columns=list(df.columns),
    )
    return df, source


def load_all_data(input_dir: str) -> LoadedData:
    """加载所有输入数据"""
    if not os.path.exists(input_dir):
        raise FileNotFoundError(f"输入目录不存在: {input_dir}")

    data = LoadedData()

    data.kline, src = load_kline(input_dir)
    if src:
        data.sources['kline'] = src

    data.signals, src = load_signals(input_dir)
    if src:
        data.sources['signals'] = src

    data.fee_table, src = load_fee_table(input_dir)
    if src:
        data.sources['fee_table'] = src

    data.suspension, src = load_suspension(input_dir)
    if src:
        data.sources['suspension'] = src

    data.slippage_params, src = load_slippage_params(input_dir)
    if src:
        data.sources['slippage_params'] = src

    data.backtest_report, src = load_backtest_report(input_dir)
    if src:
        data.sources['backtest_report'] = src

    return data
