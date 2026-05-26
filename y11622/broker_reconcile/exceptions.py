class ReconcileError(Exception):
    pass


class DataValidationError(ReconcileError):
    pass


class CalendarMismatchError(ReconcileError):
    pass


class FeeClassificationError(ReconcileError):
    pass


class PartialMatchError(ReconcileError):
    pass
