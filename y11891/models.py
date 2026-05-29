from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple
from datetime import date, datetime


class SalesState(str, Enum):
    VERY_LOW = "VERY_LOW"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    OVERSTOCK = "OVERSTOCK"

    @classmethod
    def from_quantity(cls, qty: float, avg_sales: float) -> 'SalesState':
        if qty <= 0:
            return cls.OUT_OF_STOCK
        ratio = qty / avg_sales if avg_sales > 0 else 1.0
        if ratio < 0.3:
            return cls.VERY_LOW
        elif ratio < 0.7:
            return cls.LOW
        elif ratio < 1.3:
            return cls.MEDIUM
        elif ratio < 1.8:
            return cls.HIGH
        else:
            return cls.VERY_HIGH


class WeatherTag(str, Enum):
    SUNNY = "SUNNY"
    CLOUDY = "CLOUDY"
    RAINY = "RAINY"
    SNOWY = "SNOWY"
    HOT = "HOT"
    COLD = "COLD"

    @classmethod
    def from_temperature_and_condition(cls, temp: float, condition: str) -> 'WeatherTag':
        condition = condition.upper()
        if "SNOW" in condition:
            return cls.SNOWY
        elif "RAIN" in condition:
            return cls.RAINY
        elif temp >= 32:
            return cls.HOT
        elif temp <= 5:
            return cls.COLD
        elif "CLOUD" in condition or "OVERCAST" in condition:
            return cls.CLOUDY
        else:
            return cls.SUNNY


class HolidayTag(str, Enum):
    NORMAL = "NORMAL"
    WEEKEND = "WEEKEND"
    HOLIDAY = "HOLIDAY"
    PRE_HOLIDAY = "PRE_HOLIDAY"
    POST_HOLIDAY = "POST_HOLIDAY"

    @classmethod
    def from_date(cls, d: date, is_holiday: bool = False,
                  is_pre_holiday: bool = False,
                  is_post_holiday: bool = False) -> 'HolidayTag':
        if is_holiday:
            return cls.HOLIDAY
        elif is_pre_holiday:
            return cls.PRE_HOLIDAY
        elif is_post_holiday:
            return cls.POST_HOLIDAY
        elif d.weekday() >= 5:
            return cls.WEEKEND
        else:
            return cls.NORMAL


@dataclass
class StateKey:
    sales_state: SalesState
    weather: WeatherTag
    holiday: HolidayTag

    def __hash__(self):
        return hash((self.sales_state, self.weather, self.holiday))

    def __eq__(self, other):
        if not isinstance(other, StateKey):
            return False
        return (self.sales_state == other.sales_state and
                self.weather == other.weather and
                self.holiday == other.holiday)

    def to_tuple(self) -> Tuple[str, str, str]:
        return (self.sales_state.value, self.weather.value, self.holiday.value)

    @classmethod
    def from_tuple(cls, t: Tuple[str, str, str]) -> 'StateKey':
        return cls(
            sales_state=SalesState(t[0]),
            weather=WeatherTag(t[1]),
            holiday=HolidayTag(t[2])
        )

    def __repr__(self) -> str:
        return f"StateKey(sales={self.sales_state.value}, weather={self.weather.value}, holiday={self.holiday.value})"


@dataclass
class DailyRecord:
    date: date
    product_id: str
    product_name: str
    sales_quantity: float
    beginning_inventory: float
    ending_inventory: float
    temperature: float
    weather_condition: str
    is_holiday: bool = False
    is_pre_holiday: bool = False
    is_post_holiday: bool = False
    avg_sales: Optional[float] = None
    sales_state: Optional[SalesState] = None
    weather_tag: Optional[WeatherTag] = None
    holiday_tag: Optional[HolidayTag] = None
    state_key: Optional[StateKey] = None
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None

    def compute_states(self, avg_sales: float):
        self.avg_sales = avg_sales
        self.sales_state = SalesState.from_quantity(self.sales_quantity, avg_sales)
        self.weather_tag = WeatherTag.from_temperature_and_condition(
            self.temperature, self.weather_condition
        )
        self.holiday_tag = HolidayTag.from_date(
            self.date, self.is_holiday, self.is_pre_holiday, self.is_post_holiday
        )
        self.state_key = StateKey(
            sales_state=self.sales_state,
            weather=self.weather_tag,
            holiday=self.holiday_tag
        )

        if self.sales_quantity < 0:
            self.is_anomaly = True
            self.anomaly_reason = "负销量"
        elif self.sales_state == SalesState.VERY_HIGH and self.avg_sales and self.sales_quantity > self.avg_sales * 3:
            self.is_anomaly = True
            self.anomaly_reason = "销量异常偏高（>3倍均值）"
        elif self.sales_state == SalesState.VERY_LOW and self.avg_sales and self.sales_quantity < self.avg_sales * 0.1 and self.sales_quantity > 0:
            self.is_anomaly = True
            self.anomaly_reason = "销量异常偏低（<0.1倍均值）"
        elif self.ending_inventory < 0:
            self.is_anomaly = True
            self.anomaly_reason = "负库存"
        elif self.ending_inventory > self.avg_sales * 7 if self.avg_sales else False:
            self.is_anomaly = True
            self.anomaly_reason = "库存过高（>7天销量）"


@dataclass
class RestockSuggestion:
    product_id: str
    product_name: str
    forecast_date: date
    current_inventory: float
    forecast_demand: float
    suggested_restock: float
    safety_stock: float
    max_stock: float
    confidence: float
    forecast_states: List[SalesState]
    reasoning: str
    state_transitions: List[Tuple[StateKey, StateKey, float]] = field(default_factory=list)


@dataclass
class PredictionResult:
    product_id: str
    product_name: str
    run_timestamp: datetime
    current_state: StateKey
    transition_matrix: dict
    state_probabilities: dict
    forecast_days: int
    daily_forecast: List[dict]
    total_forecast: float
    restock_suggestion: RestockSuggestion
    data_quality: dict
    anomalies: List[DailyRecord]
    cold_start_applied: bool = False
    sparse_data_warning: bool = False
    state_jump_detected: bool = False


@dataclass
class ComparisonResult:
    product_id: str
    product_name: str
    first_run: PredictionResult
    second_run: PredictionResult
    transition_matrix_changes: List[dict]
    restock_changes: dict
    state_probability_changes: List[dict]
    new_anomalies: List[DailyRecord]
    data_quality_changes: dict
