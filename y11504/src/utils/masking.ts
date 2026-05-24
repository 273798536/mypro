import { SensitiveFieldLevel } from '../types/enums';

export const SENSITIVE_FIELDS: Record<string, SensitiveFieldLevel> = {
  'customerPhone': SensitiveFieldLevel.MASK,
  'customerName': SensitiveFieldLevel.MASK,
  'customerAddress': SensitiveFieldLevel.MASK,
  'productSn': SensitiveFieldLevel.MASK,
  'engineerId': SensitiveFieldLevel.MASK,
  'scannerId': SensitiveFieldLevel.MASK,
  'uploaderId': SensitiveFieldLevel.MASK,
};

export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
};

export const maskName = (name: string): string => {
  if (!name || name.length <= 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
};

export const maskAddress = (address: string): string => {
  if (!address) return address;
  if (address.length <= 6) return address;
  return address.substring(0, 6) + '****';
};

export const maskString = (str: string, visibleStart: number = 2, visibleEnd: number = 2): string => {
  if (!str || str.length <= visibleStart + visibleEnd) return str;
  return str.substring(0, visibleStart) + '****' + str.substring(str.length - visibleEnd);
};

export const applyMasking = (
  data: Record<string, any>,
  level: SensitiveFieldLevel
): Record<string, any> => {
  if (level === SensitiveFieldLevel.NONE) return data;

  const result = JSON.parse(JSON.stringify(data));

  for (const [field, fieldLevel] of Object.entries(SENSITIVE_FIELDS)) {
    if (fieldLevel === SensitiveFieldLevel.NONE) continue;
    if (level === SensitiveFieldLevel.MASK && fieldLevel !== SensitiveFieldLevel.MASK) continue;

    const value = getNestedValue(result, field);
    if (value !== undefined && typeof value === 'string') {
      let maskedValue: string;
      if (field.includes('Phone') || field.includes('phone')) {
        maskedValue = maskPhone(value);
      } else if (field.includes('Name') || field.includes('name')) {
        maskedValue = maskName(value);
      } else if (field.includes('Address') || field.includes('address')) {
        maskedValue = maskAddress(value);
      } else {
        maskedValue = maskString(value);
      }
      setNestedValue(result, field, maskedValue);
    }
  }

  return result;
};

const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const setNestedValue = (obj: Record<string, any>, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};
