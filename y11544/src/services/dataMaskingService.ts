import { UserRole } from '../types';

const SENSITIVE_FIELDS: Record<string, string[]> = {
  operator: [],
  reviewer: [],
  manager: [],
  auditor: [],
  admin: []
};

const MASKED_FIELDS: Record<string, string[]> = {
  operator: ['originalName'],
  reviewer: [],
  manager: [],
  auditor: [],
  admin: []
};

export class DataMaskingService {
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    return name.length > 2
      ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] + '@' + domain
      : '*'.repeat(name.length) + '@' + domain;
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '*'.repeat(phone.length - 7) + phone.slice(-4);
  }

  private maskName(name: string): string {
    if (!name || name.length <= 1) return name;
    return name[0] + '*'.repeat(name.length - 1);
  }

  private maskValue(value: string, fieldType: string): string {
    if (!value) return value;

    switch (fieldType) {
      case 'email':
        return this.maskEmail(value);
      case 'phone':
        return this.maskPhone(value);
      case 'name':
        return this.maskName(value);
      default:
        return this.maskName(value);
    }
  }

  maskExportData<T extends Record<string, any>>(data: T, role: UserRole): T {
    const result: Record<string, any> = { ...data };
    const maskedFields = MASKED_FIELDS[role] || [];

    for (const field of maskedFields) {
      if (result[field] !== undefined) {
        result[field] = this.maskValue(String(result[field]), field);
      }
    }

    return result as T;
  }

  maskMaterialDetail<T extends Record<string, any>>(data: T, role: UserRole): T {
    return this.maskExportData(data, role);
  }

  canAccessField(role: UserRole, field: string): boolean {
    const sensitiveFields = SENSITIVE_FIELDS[role] || [];
    return !sensitiveFields.includes(field);
  }

  filterByRole<T extends Record<string, any>>(data: T, role: UserRole): Partial<T> {
    const result: Partial<T> = {};
    const sensitiveFields = SENSITIVE_FIELDS[role] || [];

    for (const [key, value] of Object.entries(data)) {
      if (!sensitiveFields.includes(key)) {
        result[key as keyof T] = value as T[keyof T];
      }
    }

    return result;
  }
}

export const dataMaskingService = new DataMaskingService();
