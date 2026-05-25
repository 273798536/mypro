import { Role, RecordStatus } from '../types';

export interface FieldPermission {
  visible: boolean;
  editable: boolean;
}

export interface ActionPermission {
  allowed: boolean;
}

export interface EntityPermissions {
  fields: Record<string, FieldPermission>;
  actions: Record<string, ActionPermission>;
}

export const rolePermissions: Record<Role, {
  inspectionRecords: EntityPermissions;
  calibrationCertificates: EntityPermissions;
  maintenanceQuotes: EntityPermissions;
  secondaryConfirms: EntityPermissions;
  devices: EntityPermissions;
  importFailures: EntityPermissions;
  statusLogs: EntityPermissions;
}> = {
  [Role.DATA_ENTRY]: {
    inspectionRecords: {
      fields: {
        id: { visible: true, editable: false },
        recordNo: { visible: true, editable: true },
        deviceId: { visible: true, editable: true },
        deviceCode: { visible: true, editable: true },
        inspector: { visible: true, editable: true },
        inspectionDate: { visible: true, editable: true },
        inspectionItems: { visible: true, editable: true },
        conclusion: { visible: true, editable: true },
        status: { visible: true, editable: false },
        remarks: { visible: true, editable: true },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        submit: { allowed: true },
        delete: { allowed: false }
      }
    },
    calibrationCertificates: {
      fields: {
        id: { visible: true, editable: false },
        certificateNo: { visible: true, editable: true },
        deviceId: { visible: true, editable: true },
        deviceCode: { visible: true, editable: true },
        calibrationAgency: { visible: true, editable: true },
        calibrationDate: { visible: true, editable: true },
        expiryDate: { visible: true, editable: true },
        calibrationItems: { visible: true, editable: true },
        conclusion: { visible: true, editable: true },
        status: { visible: true, editable: false },
        fileUrl: { visible: true, editable: true },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        submit: { allowed: true },
        delete: { allowed: false }
      }
    },
    maintenanceQuotes: {
      fields: {
        id: { visible: true, editable: false },
        quoteNo: { visible: true, editable: true },
        deviceId: { visible: true, editable: true },
        deviceCode: { visible: true, editable: true },
        vendor: { visible: true, editable: true },
        quoteDate: { visible: true, editable: true },
        estimatedCost: { visible: true, editable: true },
        maintenanceItems: { visible: true, editable: true },
        status: { visible: true, editable: false },
        approvalStatus: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        submit: { allowed: true },
        delete: { allowed: false }
      }
    },
    secondaryConfirms: {
      fields: {
        id: { visible: true, editable: false },
        confirmNo: { visible: true, editable: true },
        relatedRecordType: { visible: true, editable: true },
        relatedRecordId: { visible: true, editable: true },
        deviceId: { visible: true, editable: true },
        deviceCode: { visible: true, editable: true },
        confirmer: { visible: true, editable: true },
        confirmDate: { visible: true, editable: true },
        confirmContent: { visible: true, editable: true },
        status: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        submit: { allowed: true },
        delete: { allowed: false }
      }
    },
    devices: {
      fields: {
        id: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        deviceName: { visible: true, editable: false },
        department: { visible: true, editable: false },
        status: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        submit: { allowed: false },
        delete: { allowed: false }
      }
    },
    importFailures: {
      fields: {
        id: { visible: true, editable: false },
        source: { visible: true, editable: false },
        rowNumber: { visible: true, editable: false },
        rawData: { visible: true, editable: false },
        errorMessage: { visible: true, editable: false },
        importedAt: { visible: true, editable: false },
        importedBy: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        retry: { allowed: false },
        delete: { allowed: false }
      }
    },
    statusLogs: {
      fields: {
        id: { visible: true, editable: false },
        entityType: { visible: true, editable: false },
        entityId: { visible: true, editable: false },
        oldStatus: { visible: true, editable: false },
        newStatus: { visible: true, editable: false },
        changedBy: { visible: true, editable: false },
        changedAt: { visible: true, editable: false },
        reason: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    }
  },
  [Role.REVIEWER]: {
    inspectionRecords: {
      fields: {
        id: { visible: true, editable: false },
        recordNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        inspector: { visible: true, editable: false },
        inspectionDate: { visible: true, editable: false },
        inspectionItems: { visible: true, editable: false },
        conclusion: { visible: true, editable: false },
        status: { visible: true, editable: false },
        remarks: { visible: true, editable: true },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        review: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: false }
      }
    },
    calibrationCertificates: {
      fields: {
        id: { visible: true, editable: false },
        certificateNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        calibrationAgency: { visible: true, editable: false },
        calibrationDate: { visible: true, editable: false },
        expiryDate: { visible: true, editable: false },
        calibrationItems: { visible: true, editable: false },
        conclusion: { visible: true, editable: false },
        status: { visible: true, editable: false },
        fileUrl: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        review: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: false }
      }
    },
    maintenanceQuotes: {
      fields: {
        id: { visible: true, editable: false },
        quoteNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        vendor: { visible: true, editable: false },
        quoteDate: { visible: true, editable: false },
        estimatedCost: { visible: true, editable: false },
        maintenanceItems: { visible: true, editable: false },
        status: { visible: true, editable: false },
        approvalStatus: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        review: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: false }
      }
    },
    secondaryConfirms: {
      fields: {
        id: { visible: true, editable: false },
        confirmNo: { visible: true, editable: false },
        relatedRecordType: { visible: true, editable: false },
        relatedRecordId: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        confirmer: { visible: true, editable: false },
        confirmDate: { visible: true, editable: false },
        confirmContent: { visible: true, editable: false },
        status: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        review: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: false }
      }
    },
    devices: {
      fields: {
        id: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        deviceName: { visible: true, editable: false },
        department: { visible: true, editable: false },
        status: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    importFailures: {
      fields: {
        id: { visible: true, editable: false },
        source: { visible: true, editable: false },
        rowNumber: { visible: true, editable: false },
        rawData: { visible: true, editable: false },
        errorMessage: { visible: true, editable: false },
        importedAt: { visible: true, editable: false },
        importedBy: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        retry: { allowed: true },
        delete: { allowed: false }
      }
    },
    statusLogs: {
      fields: {
        id: { visible: true, editable: false },
        entityType: { visible: true, editable: false },
        entityId: { visible: true, editable: false },
        oldStatus: { visible: true, editable: false },
        newStatus: { visible: true, editable: false },
        changedBy: { visible: true, editable: false },
        changedAt: { visible: true, editable: false },
        reason: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    }
  },
  [Role.SUPERVISOR]: {
    inspectionRecords: {
      fields: {
        id: { visible: true, editable: false },
        recordNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        inspector: { visible: true, editable: false },
        inspectionDate: { visible: true, editable: false },
        inspectionItems: { visible: true, editable: false },
        conclusion: { visible: true, editable: false },
        status: { visible: true, editable: false },
        remarks: { visible: true, editable: true },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        review: { allowed: true },
        approve: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: true },
        export: { allowed: true }
      }
    },
    calibrationCertificates: {
      fields: {
        id: { visible: true, editable: false },
        certificateNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        calibrationAgency: { visible: true, editable: false },
        calibrationDate: { visible: true, editable: false },
        expiryDate: { visible: true, editable: false },
        calibrationItems: { visible: true, editable: false },
        conclusion: { visible: true, editable: false },
        status: { visible: true, editable: false },
        fileUrl: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        review: { allowed: true },
        approve: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: true },
        export: { allowed: true }
      }
    },
    maintenanceQuotes: {
      fields: {
        id: { visible: true, editable: false },
        quoteNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        vendor: { visible: true, editable: false },
        quoteDate: { visible: true, editable: false },
        estimatedCost: { visible: true, editable: false },
        maintenanceItems: { visible: true, editable: false },
        status: { visible: true, editable: false },
        approvalStatus: { visible: true, editable: true },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        review: { allowed: true },
        approve: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: true },
        export: { allowed: true }
      }
    },
    secondaryConfirms: {
      fields: {
        id: { visible: true, editable: false },
        confirmNo: { visible: true, editable: false },
        relatedRecordType: { visible: true, editable: false },
        relatedRecordId: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        confirmer: { visible: true, editable: false },
        confirmDate: { visible: true, editable: false },
        confirmContent: { visible: true, editable: false },
        status: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        review: { allowed: true },
        approve: { allowed: true },
        reject: { allowed: true },
        delete: { allowed: true },
        export: { allowed: true }
      }
    },
    devices: {
      fields: {
        id: { visible: true, editable: false },
        deviceCode: { visible: true, editable: true },
        deviceName: { visible: true, editable: true },
        department: { visible: true, editable: true },
        status: { visible: true, editable: true },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: true },
        view: { allowed: true },
        edit: { allowed: true },
        deactivate: { allowed: true },
        delete: { allowed: true }
      }
    },
    importFailures: {
      fields: {
        id: { visible: true, editable: false },
        source: { visible: true, editable: false },
        rowNumber: { visible: true, editable: false },
        rawData: { visible: true, editable: false },
        errorMessage: { visible: true, editable: false },
        importedAt: { visible: true, editable: false },
        importedBy: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        retry: { allowed: true },
        delete: { allowed: true }
      }
    },
    statusLogs: {
      fields: {
        id: { visible: true, editable: false },
        entityType: { visible: true, editable: false },
        entityId: { visible: true, editable: false },
        oldStatus: { visible: true, editable: false },
        newStatus: { visible: true, editable: false },
        changedBy: { visible: true, editable: false },
        changedAt: { visible: true, editable: false },
        reason: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: true },
        export: { allowed: true }
      }
    }
  },
  [Role.READ_ONLY]: {
    inspectionRecords: {
      fields: {
        id: { visible: true, editable: false },
        recordNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        inspector: { visible: true, editable: false },
        inspectionDate: { visible: true, editable: false },
        inspectionItems: { visible: true, editable: false },
        conclusion: { visible: true, editable: false },
        status: { visible: true, editable: false },
        remarks: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    calibrationCertificates: {
      fields: {
        id: { visible: true, editable: false },
        certificateNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        calibrationAgency: { visible: true, editable: false },
        calibrationDate: { visible: true, editable: false },
        expiryDate: { visible: true, editable: false },
        calibrationItems: { visible: true, editable: false },
        conclusion: { visible: true, editable: false },
        status: { visible: true, editable: false },
        fileUrl: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    maintenanceQuotes: {
      fields: {
        id: { visible: true, editable: false },
        quoteNo: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        vendor: { visible: true, editable: false },
        quoteDate: { visible: true, editable: false },
        estimatedCost: { visible: true, editable: false },
        maintenanceItems: { visible: true, editable: false },
        status: { visible: true, editable: false },
        approvalStatus: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    secondaryConfirms: {
      fields: {
        id: { visible: true, editable: false },
        confirmNo: { visible: true, editable: false },
        relatedRecordType: { visible: true, editable: false },
        relatedRecordId: { visible: true, editable: false },
        deviceId: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        confirmer: { visible: true, editable: false },
        confirmDate: { visible: true, editable: false },
        confirmContent: { visible: true, editable: false },
        status: { visible: true, editable: false },
        createdBy: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    devices: {
      fields: {
        id: { visible: true, editable: false },
        deviceCode: { visible: true, editable: false },
        deviceName: { visible: true, editable: false },
        department: { visible: true, editable: false },
        status: { visible: true, editable: false },
        createdAt: { visible: true, editable: false },
        updatedAt: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    importFailures: {
      fields: {
        id: { visible: true, editable: false },
        source: { visible: true, editable: false },
        rowNumber: { visible: true, editable: false },
        rawData: { visible: false, editable: false },
        errorMessage: { visible: true, editable: false },
        importedAt: { visible: true, editable: false },
        importedBy: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    },
    statusLogs: {
      fields: {
        id: { visible: true, editable: false },
        entityType: { visible: true, editable: false },
        entityId: { visible: true, editable: false },
        oldStatus: { visible: true, editable: false },
        newStatus: { visible: true, editable: false },
        changedBy: { visible: true, editable: false },
        changedAt: { visible: true, editable: false },
        reason: { visible: true, editable: false }
      },
      actions: {
        create: { allowed: false },
        view: { allowed: true },
        edit: { allowed: false },
        delete: { allowed: false }
      }
    }
  }
};

export const statusTransitions: Record<RecordStatus, RecordStatus[]> = {
  [RecordStatus.DRAFT]: [RecordStatus.SUBMITTED, RecordStatus.CONFIRMED],
  [RecordStatus.SUBMITTED]: [RecordStatus.REVIEWED, RecordStatus.REJECTED, RecordStatus.CONFIRMED],
  [RecordStatus.REVIEWED]: [RecordStatus.CONFIRMED, RecordStatus.REJECTED],
  [RecordStatus.REJECTED]: [RecordStatus.DRAFT, RecordStatus.SUBMITTED],
  [RecordStatus.CONFIRMED]: []
};

export function canTransitionStatus(from: RecordStatus, to: RecordStatus, role: Role): boolean {
  const allowedTransitions = statusTransitions[from];
  if (!allowedTransitions.includes(to)) {
    return false;
  }

  if (to === RecordStatus.SUBMITTED) {
    return role === Role.DATA_ENTRY || role === Role.SUPERVISOR;
  }
  if (to === RecordStatus.REVIEWED) {
    return role === Role.REVIEWER || role === Role.SUPERVISOR;
  }
  if (to === RecordStatus.CONFIRMED) {
    return role === Role.SUPERVISOR;
  }
  if (to === RecordStatus.REJECTED) {
    return role === Role.REVIEWER || role === Role.SUPERVISOR;
  }
  if (to === RecordStatus.DRAFT) {
    return role === Role.DATA_ENTRY || role === Role.SUPERVISOR;
  }

  return false;
}

export function filterFieldsByRole<T extends Record<string, any>>(
  data: T,
  role: Role,
  entityType: keyof typeof rolePermissions[Role.DATA_ENTRY]
): Partial<T> {
  const permissions = rolePermissions[role][entityType];
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(data)) {
    const fieldPerm = permissions.fields[key];
    if (fieldPerm && fieldPerm.visible) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}