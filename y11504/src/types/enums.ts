export enum LedgerStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
  AUDITED = 'audited',
}

export enum PartType {
  NORMAL = 'normal',
  RETURNED = 'returned',
  SCRAPPED = 'scrapped',
}

export enum UserRole {
  ENGINEER = 'engineer',
  SERVICE_MANAGER = 'service_manager',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
}

export enum DataQuality {
  VALID = 'valid',
  INVALID = 'invalid',
  SUSPICIOUS = 'suspicious',
}

export enum ChangeAction {
  CREATE = 'create',
  UPDATE = 'update',
  SUBMIT = 'submit',
  REJECT = 'reject',
  CONFIRM = 'confirm',
  AUDIT = 'audit',
}

export enum ReceiptSource {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum SensitiveFieldLevel {
  NONE = 'none',
  MASK = 'mask',
  HIDE = 'hide',
}
