from typing import Optional, List
from datetime import date


class QueueSchedulerError(Exception):
    def __init__(self, message: str, suggestion: Optional[str] = None, details: Optional[List[str]] = None):
        self.message = message
        self.suggestion = suggestion
        self.details = details or []
        super().__init__(message)

    def __str__(self) -> str:
        parts = [f"❌ {self.message}"]
        if self.suggestion:
            parts.append(f"💡 建议：{self.suggestion}")
        if self.details:
            parts.append("📋 详情：")
            parts.extend(f"   - {d}" for d in self.details)
        return "\n".join(parts)


class DataValidationError(QueueSchedulerError):
    pass


class FileFormatError(QueueSchedulerError):
    pass


class MissingDataError(QueueSchedulerError):
    pass


class InvalidParameterError(QueueSchedulerError):
    pass


class SimulationError(QueueSchedulerError):
    pass


def validate_call_record_columns(df, required_cols):
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise FileFormatError(
            f"来电记录文件缺少必要列：{', '.join(missing)}",
            suggestion="请对照样例数据检查文件格式，确保包含所有必填列",
            details=[f"需要的列：{', '.join(required_cols)}", f"实际的列：{', '.join(df.columns)}"]
        )


def validate_time_range(start_time, end_time, context: str):
    if start_time >= end_time:
        raise InvalidParameterError(
            f"{context}：开始时间必须早于结束时间",
            suggestion="请检查班表或时段配置，确保时间顺序正确",
            details=[f"开始时间：{start_time}", f"结束时间：{end_time}"]
        )


def validate_date_order(start_date: date, end_date: date, context: str):
    if start_date > end_date:
        raise InvalidParameterError(
            f"{context}：开始日期不能晚于结束日期",
            suggestion="请调整日期范围",
            details=[f"开始日期：{start_date}", f"结束日期：{end_date}"]
        )


def validate_service_level(value: float):
    if not 0 < value <= 1:
        raise InvalidParameterError(
            f"服务水平目标 {value} 无效",
            suggestion="服务水平应设置在 0.01 到 1.00 之间（例如 0.8 表示80%）",
            details=["服务水平表示在目标等待时间内接听的电话比例"]
        )


def validate_agent_count(n: int, max_reasonable: int = 100):
    if n <= 0:
        raise InvalidParameterError(
            f"坐席数 {n} 无效",
            suggestion="坐席数必须是正整数",
            details=["至少需要1个坐席才能提供服务"]
        )
    if n > max_reasonable:
        raise InvalidParameterError(
            f"坐席数 {n} 超出合理范围",
            suggestion=f"单次模拟建议坐席数不超过 {max_reasonable}",
            details=["如确实需要更多坐席，请分批进行模拟或调整参数"]
        )


def validate_handle_time(avg_handle: float):
    if avg_handle <= 0:
        raise InvalidParameterError(
            f"平均通话时长 {avg_handle} 秒无效",
            suggestion="通话时长必须是正数",
            details=["通话时长是指从接听到挂断的平均处理时间"]
        )
    if avg_handle < 5:
        raise InvalidParameterError(
            f"平均通话时长 {avg_handle} 秒过短",
            suggestion="请检查数据是否正确，实际客服通话通常在30秒以上",
            details=["过短的通话时长会导致模拟结果与实际偏差较大"]
        )
    if avg_handle > 3600:
        raise InvalidParameterError(
            f"平均通话时长 {avg_handle} 秒过长",
            suggestion="请检查数据是否正确，1小时以上的通话时长属于异常情况",
            details=["过长的通话时长会大幅增加客户等待时间"]
        )


def validate_arrival_rate(rate: float):
    if rate < 0:
        raise InvalidParameterError(
            f"到达率 {rate} 无效",
            suggestion="到达率不能为负数",
            details=["到达率表示平均每小时的来电数量"]
        )
    if rate == 0:
        raise InvalidParameterError(
            "到达率为0，模拟无意义",
            suggestion="请检查来电数据是否正确导入",
            details=["没有来电的时段不需要安排坐席"]
        )
