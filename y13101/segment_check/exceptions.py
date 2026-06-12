class ValidationError(Exception):
    pass


class DivisionByZeroError(ValidationError):
    def __init__(self, message: str, segment: str = None):
        self.segment = segment
        super().__init__(message)


class SuspendedError(ValidationError):
    def __init__(self, message: str, reason: str = None):
        self.reason = reason
        super().__init__(message)


class DataQualityError(ValidationError):
    pass


class MaterialMismatchError(ValidationError):
    def __init__(self, message: str, expected_name: str, actual_name: str):
        self.expected_name = expected_name
        self.actual_name = actual_name
        super().__init__(message)
