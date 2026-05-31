class VerificationException(Exception):
    def __init__(self, message: str, code: str = 'VERIFY_ERROR', context: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.context = context or {}

    def __str__(self):
        ctx_str = ', '.join([f'{k}={v}' for k, v in self.context.items()])
        return f'[{self.code}] {self.message}' + (f' ({ctx_str})' if ctx_str else '')


class DataQualityException(VerificationException):
    def __init__(self, message: str, field: str = None, row: int = None, context: dict = None):
        ctx = context or {}
        if field:
            ctx['field'] = field
        if row is not None:
            ctx['row'] = row
        super().__init__(message, 'DATA_QUALITY_ERROR', ctx)
        self.field = field
        self.row = row


class MatchingException(VerificationException):
    def __init__(self, message: str, contract_id: int = None, guest_name: str = None,
                 checkin_date=None, context: dict = None):
        ctx = context or {}
        if contract_id:
            ctx['contract_id'] = contract_id
        if guest_name:
            ctx['guest_name'] = guest_name
        if checkin_date:
            ctx['checkin_date'] = checkin_date
        super().__init__(message, 'MATCHING_ERROR', ctx)
        self.contract_id = contract_id
        self.guest_name = guest_name
        self.checkin_date = checkin_date


class CrossWeekRescheduleException(VerificationException):
    def __init__(self, message: str, reschedule_id: int = None, weeks_diff: int = None,
                 has_cancel: bool = None, context: dict = None):
        ctx = context or {}
        if reschedule_id:
            ctx['reschedule_id'] = reschedule_id
        if weeks_diff is not None:
            ctx['weeks_diff'] = weeks_diff
        if has_cancel is not None:
            ctx['has_cancel'] = has_cancel
        super().__init__(message, 'CROSS_WEEK_ERROR', ctx)
        self.reschedule_id = reschedule_id
        self.weeks_diff = weeks_diff
        self.has_cancel = has_cancel


class DuplicateNightException(VerificationException):
    def __init__(self, message: str, guest_name: str = None, checkin_date=None,
                 records: list = None, context: dict = None):
        ctx = context or {}
        if guest_name:
            ctx['guest_name'] = guest_name
        if checkin_date:
            ctx['checkin_date'] = checkin_date
        if records:
            ctx['record_count'] = len(records)
        super().__init__(message, 'DUPLICATE_NIGHT_ERROR', ctx)
        self.guest_name = guest_name
        self.checkin_date = checkin_date
        self.records = records or []
