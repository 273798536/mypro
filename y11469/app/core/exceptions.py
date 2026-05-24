class LedgerException(Exception):
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code or "LEDGER_ERROR"
        super().__init__(self.message)


class InvalidStatusTransition(LedgerException):
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            message=f"Invalid status transition: {from_status} -> {to_status}",
            code="INVALID_STATUS_TRANSITION"
        )


class DuplicateSubmission(LedgerException):
    def __init__(self, identifier: str):
        super().__init__(
            message=f"Duplicate submission detected: {identifier}",
            code="DUPLICATE_SUBMISSION"
        )


class RecordFrozen(LedgerException):
    def __init__(self, record_id: str):
        super().__init__(
            message=f"Record {record_id} is frozen and cannot be modified",
            code="RECORD_FROZEN"
        )


class OriginalEvidenceProtected(LedgerException):
    def __init__(self):
        super().__init__(
            message="Original evidence cannot be overwritten",
            code="ORIGINAL_EVIDENCE_PROTECTED"
        )


class PartialImportFailure(LedgerException):
    def __init__(self, success_count: int, failed_count: int):
        super().__init__(
            message=f"Partial import: {success_count} succeeded, {failed_count} failed",
            code="PARTIAL_IMPORT_FAILURE"
        )
        self.success_count = success_count
        self.failed_count = failed_count
