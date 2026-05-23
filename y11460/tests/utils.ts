import jwt from 'jsonwebtoken'
import { config } from '../src/config'
import { UserRole } from '../src/types/enums'

export const generateToken = (userId: string, role: UserRole, clinicId: string) => {
  return jwt.sign(
    { id: userId, username: 'test', role, clinicId },
    config.jwtSecret,
    { expiresIn: '1h' }
  )
}

export const testReceiptData = {
  batchNo: 'BATCH-2024-001',
  clinicId: 'test-clinic-001',
  implantBatchNumber: 'IMPLANT-BATCH-001',
  appointmentRecordNo: 'APT-2024-001',
  supplierInvoiceNo: 'INV-SUPP-001',
  patientName: '张三',
  implantModel: 'ITI-Straumann-01',
  implantQuantity: 2,
  unitPrice: 5000,
  totalAmount: 10000,
  receiptDate: '2024-01-15',
  supplier: '士卓曼(中国)医疗器械有限公司',
  remark: '常规种植手术'
}

export const tokens = {
  entry: generateToken('user-entry', UserRole.DATA_ENTRY, 'test-clinic-001'),
  reviewer: generateToken('user-reviewer', UserRole.REVIEWER, 'test-clinic-001'),
  supervisor: generateToken('user-supervisor', UserRole.SUPERVISOR, 'test-clinic-001'),
  viewer: generateToken('user-viewer', UserRole.READ_ONLY, 'test-clinic-001')
}
