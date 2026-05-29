"""撮合引擎和费用重算模块"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class TradeResult:
    """成交结果"""
    datetime: pd.Timestamp
    symbol: str
    direction: int
    volume: float
    price: float
    amount: float
    fee: float
    slippage: float
    net_amount: float
    match_price: float
    match_method: str
    is_suspended: bool
    fee_detail: Dict = field(default_factory=dict)
    slippage_detail: Dict = field(default_factory=dict)


class FeeCalculator:
    """手续费计算器 - 支持阶梯费率、最低收费、印花税等"""

    def __init__(self, fee_config: Dict):
        self.config = fee_config or {}

    def _get_tier_rate(self, total_amount: float, direction: int) -> Tuple[float, float]:
        """获取阶梯费率

        Returns:
            Tuple[适用费率, 另一方向费率]
            - 买入时: (buy_rate, sell_rate)
            - 卖出时: (sell_rate, buy_rate)
        """
        tiers = self.config.get('tiers', [])
        default_buy = self.config.get('commission', {}).get('buy', {})
        default_sell = self.config.get('commission', {}).get('sell', {})

        buy_rate = default_buy.get('rate', 0.0003)
        sell_rate = default_sell.get('rate', 0.0013)

        for tier in sorted(tiers, key=lambda x: x.get('threshold', 0), reverse=True):
            if total_amount >= tier.get('threshold', 0):
                buy_rate = tier.get('buy_rate', buy_rate)
                sell_rate = tier.get('sell_rate', sell_rate)
                break

        if direction > 0:
            return (buy_rate, sell_rate)
        else:
            return (sell_rate, buy_rate)

    def calculate(self, amount: float, direction: int, total_amount: float = 0) -> Tuple[float, Dict]:
        """计算手续费

        Args:
            amount: 成交金额
            direction: 1=买入, -1=卖出
            total_amount: 累计成交金额（用于阶梯费率）

        Returns:
            (总手续费, 费用明细)
        """
        detail = {}
        total_fee = 0

        buy_cfg = self.config.get('commission', {}).get('buy', {})
        sell_cfg = self.config.get('commission', {}).get('sell', {})

        if direction > 0:
            rate = buy_cfg.get('rate', 0.0003)
            min_fee = buy_cfg.get('min_fee', 0)
            if self.config.get('tiers'):
                rate, _ = self._get_tier_rate(total_amount, direction)
        else:
            rate = sell_cfg.get('rate', 0.0013)
            min_fee = sell_cfg.get('min_fee', 0)
            stamp_duty = sell_cfg.get('stamp_duty', 0)
            if self.config.get('tiers'):
                rate, _ = self._get_tier_rate(total_amount, direction)
            if stamp_duty > 0:
                stamp_fee = amount * stamp_duty
                detail['stamp_duty'] = stamp_fee
                total_fee += stamp_fee

        commission = max(amount * rate, min_fee)
        detail['commission'] = commission
        detail['rate_used'] = rate
        total_fee += commission

        detail['total'] = total_fee
        return total_fee, detail


class SlippageCalculator:
    """滑点计算器 - 支持固定滑点、比例滑点、波动率滑点"""

    def __init__(self, params: Dict):
        self.params = params or {}
        self.model = self.params.get('model', 'fixed')

    def calculate(
        self,
        price: float,
        direction: int,
        kline_data: Optional[pd.DataFrame] = None,
        current_idx: int = 0
    ) -> Tuple[float, Dict]:
        """计算滑点

        Args:
            price: 原始成交价格
            direction: 1=买入, -1=卖出
            kline_data: K线数据（用于波动率模型）
            current_idx: 当前K线索引

        Returns:
            (滑点金额, 滑点明细)
        """
        detail = {'model': self.model}
        slippage_amount = 0

        if self.model == 'fixed':
            cfg = self.params.get('fixed', {})
            if direction > 0:
                bps = cfg.get('buy_bps', 3)
            else:
                bps = cfg.get('sell_bps', 3)
            slippage_pct = bps / 10000
            slippage_amount = price * slippage_pct
            detail['bps'] = bps

        elif self.model == 'percentage':
            cfg = self.params.get('percentage', {})
            if direction > 0:
                ratio = cfg.get('buy_ratio', 0.0003)
            else:
                ratio = cfg.get('sell_ratio', 0.0003)
            slippage_amount = price * ratio
            detail['ratio'] = ratio

        elif self.model == 'volatility' and kline_data is not None and len(kline_data) > 0:
            cfg = self.params.get('volatility', {})
            lookback = cfg.get('lookback', 20)
            multiplier = cfg.get('multiplier', 0.1)

            start_idx = max(0, current_idx - lookback)
            if current_idx > 0:
                recent_closes = kline_data.iloc[start_idx:current_idx]['close'].values
                if len(recent_closes) > 1:
                    returns = np.diff(np.log(recent_closes))
                    volatility = np.std(returns)
                    slippage_pct = volatility * multiplier
                    slippage_amount = price * slippage_pct
                    detail['volatility'] = volatility
                    detail['multiplier'] = multiplier
                    detail['lookback'] = lookback

        detail['slippage_per_share'] = slippage_amount
        return slippage_amount, detail


class MatchingEngine:
    """撮合引擎 - 根据K线和信号重新撮合"""

    def __init__(self, kline_data: pd.DataFrame, fee_config: Dict, slippage_params: Dict):
        self.kline = kline_data
        self.fee_calc = FeeCalculator(fee_config)
        self.slippage_calc = SlippageCalculator(slippage_params)
        self.total_buy_amount = 0
        self.total_sell_amount = 0

    def _get_match_price(
        self,
        signal_price: float,
        kline_row: pd.Series,
        direction: int,
        order_type: str = 'market'
    ) -> Tuple[float, str]:
        """确定撮合价格

        Args:
            signal_price: 信号价格
            kline_row: 当前K线数据
            direction: 1=买入, -1=卖出
            order_type: 订单类型 (market/limit)

        Returns:
            (撮合价格, 撮合方式说明)
        """
        open_price = kline_row.get('open', signal_price)
        high = kline_row.get('high', signal_price)
        low = kline_row.get('low', signal_price)

        if order_type == 'market':
            match_price = open_price
            method = '市价单-开盘价成交'
        else:
            if direction > 0:
                if signal_price >= high:
                    match_price = high
                    method = '限价单-最高价成交'
                elif signal_price <= low:
                    match_price = signal_price
                    method = '限价单-未成交'
                else:
                    match_price = signal_price
                    method = '限价单-挂单价格成交'
            else:
                if signal_price <= low:
                    match_price = low
                    method = '限价单-最低价成交'
                elif signal_price >= high:
                    match_price = signal_price
                    method = '限价单-未成交'
                else:
                    match_price = signal_price
                    method = '限价单-挂单价格成交'

        return match_price, method

    def match_signal(
        self,
        signal: pd.Series,
        suspension_dates: Optional[pd.DataFrame] = None
    ) -> TradeResult:
        """撮合单个信号

        Args:
            signal: 信号数据
            suspension_dates: 停牌日历

        Returns:
            TradeResult 成交结果
        """
        symbol = signal.get('symbol', '')
        signal_time = signal.get('datetime')
        direction = signal.get('direction', 1)
        volume = signal.get('volume', 0)
        signal_price = signal.get('price', 0)
        order_type = signal.get('order_type', 'market')

        is_suspended = False
        if suspension_dates is not None and len(suspension_dates) > 0:
            sus = suspension_dates[
                (suspension_dates['symbol'] == symbol) &
                (suspension_dates['suspend_date'] <= signal_time) &
                (suspension_dates['resume_date'] >= signal_time)
            ]
            is_suspended = len(sus) > 0

        kline_row = self.kline[
            (self.kline['symbol'] == symbol) &
            (self.kline['datetime'] >= signal_time)
        ].head(1)

        if len(kline_row) == 0:
            kline_row = self.kline[self.kline['symbol'] == symbol].tail(1)

        if len(kline_row) == 0:
            match_price = signal_price
            method = '无行情数据-使用信号价格'
            kline_idx = 0
        else:
            match_price, method = self._get_match_price(signal_price, kline_row.iloc[0], direction, order_type)
            kline_idx = kline_row.index[0] if isinstance(kline_row.index, pd.RangeIndex) else 0

        slippage_per_share, slip_detail = self.slippage_calc.calculate(
            match_price, direction, self.kline, kline_idx
        )

        if direction > 0:
            final_price = match_price + slippage_per_share
        else:
            final_price = match_price - slippage_per_share

        amount = volume * match_price
        total_slippage = volume * slippage_per_share

        total_amount_for_tier = self.total_buy_amount if direction > 0 else self.total_sell_amount
        fee, fee_detail = self.fee_calc.calculate(amount, direction, total_amount_for_tier)

        if direction > 0:
            net_amount = amount + fee + total_slippage
            self.total_buy_amount += amount
        else:
            net_amount = amount - fee - total_slippage
            self.total_sell_amount += amount

        return TradeResult(
            datetime=signal_time,
            symbol=symbol,
            direction=direction,
            volume=volume,
            price=final_price,
            amount=amount,
            fee=fee,
            slippage=total_slippage,
            net_amount=net_amount,
            match_price=match_price,
            match_method=method,
            is_suspended=is_suspended,
            fee_detail=fee_detail,
            slippage_detail=slip_detail,
        )

    def match_all(self, signals: pd.DataFrame, suspension_dates: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """撮合所有信号"""
        results = []
        self.total_buy_amount = 0
        self.total_sell_amount = 0

        for _, signal in signals.iterrows():
            result = self.match_signal(signal, suspension_dates)
            results.append(result)

        records = []
        for r in results:
            rec = {
                'datetime': r.datetime,
                'symbol': r.symbol,
                'direction': r.direction,
                'volume': r.volume,
                'price': r.price,
                'match_price': r.match_price,
                'amount': r.amount,
                'fee': r.fee,
                'slippage': r.slippage,
                'net_amount': r.net_amount,
                'match_method': r.match_method,
                'is_suspended': r.is_suspended,
            }
            for k, v in r.fee_detail.items():
                rec[f'fee_{k}'] = v
            for k, v in r.slippage_detail.items():
                rec[f'slip_{k}'] = v
            records.append(rec)

        return pd.DataFrame(records)


def recalculate_trades(
    signals: pd.DataFrame,
    kline: pd.DataFrame,
    fee_config: Dict,
    slippage_params: Dict,
    suspension: Optional[pd.DataFrame] = None
) -> pd.DataFrame:
    """重算所有成交

    便捷函数，创建撮合引擎并撮合所有信号
    """
    engine = MatchingEngine(kline, fee_config, slippage_params)
    return engine.match_all(signals, suspension)
