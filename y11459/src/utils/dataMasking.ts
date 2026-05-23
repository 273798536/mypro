export type UserRole = 'admin' | 'city_manager' | 'warehouse' | 'leader' | 'auditor' | 'customer_service';

export interface MaskingConfig {
  fields: Record<string, boolean>;
}

const roleMaskingConfigs: Record<UserRole, MaskingConfig> = {
  admin: {
    fields: {
      leaderPhone: false,
      userPhone: false,
      userId: false,
      leaderId: false,
    }
  },
  city_manager: {
    fields: {
      leaderPhone: true,
      userPhone: true,
      userId: true,
      leaderId: true,
    }
  },
  warehouse: {
    fields: {
      leaderPhone: true,
      userPhone: true,
      userId: true,
      leaderId: true,
    }
  },
  leader: {
    fields: {
      leaderPhone: false,
      userPhone: true,
      userId: true,
      leaderId: false,
    }
  },
  auditor: {
    fields: {
      leaderPhone: true,
      userPhone: true,
      userId: true,
      leaderId: true,
    }
  },
  customer_service: {
    fields: {
      leaderPhone: true,
      userPhone: false,
      userId: false,
      leaderId: true,
    }
  }
};

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

export function maskId(id: string): string {
  if (!id || id.length < 6) return id;
  return id.substring(0, 2) + '****' + id.substring(id.length - 2);
}

export function maskData<T extends Record<string, any>>(
  data: T,
  role: UserRole,
  sensitiveFields: string[] = ['leaderPhone', 'userPhone', 'userId', 'leaderId']
): T {
  const config = roleMaskingConfigs[role] || roleMaskingConfigs.auditor;
  const result = { ...data };

  for (const field of sensitiveFields) {
    if (config.fields[field] && result[field]) {
      if (field.includes('Phone')) {
        result[field] = maskPhone(result[field]) as any;
      } else if (field.includes('Id')) {
        result[field] = maskId(result[field]) as any;
      }
    }
  }

  return result;
}

export function maskDataArray<T extends Record<string, any>>(
  data: T[],
  role: UserRole,
  sensitiveFields?: string[]
): T[] {
  return data.map(item => maskData(item, role, sensitiveFields));
}
