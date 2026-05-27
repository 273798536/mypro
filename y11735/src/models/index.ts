import sequelize from '../database';
import Student from './Student';
import Card from './Card';
import SubsidyRule from './SubsidyRule';
import LostCard from './LostCard';
import GraduationStatus from './GraduationStatus';
import RefundBatch from './RefundBatch';
import RefundRecord from './RefundRecord';
import AuditLog from './AuditLog';

Student.hasOne(Card, { foreignKey: 'studentId', sourceKey: 'studentId' });
Card.belongsTo(Student, { foreignKey: 'studentId', targetKey: 'studentId' });

Student.hasOne(GraduationStatus, { foreignKey: 'studentId', sourceKey: 'studentId' });
GraduationStatus.belongsTo(Student, { foreignKey: 'studentId', targetKey: 'studentId' });

RefundBatch.hasMany(RefundRecord, { foreignKey: 'batchNo', sourceKey: 'batchNo' });
RefundRecord.belongsTo(RefundBatch, { foreignKey: 'batchNo', targetKey: 'batchNo' });

export {
  sequelize,
  Student,
  Card,
  SubsidyRule,
  LostCard,
  GraduationStatus,
  RefundBatch,
  RefundRecord,
  AuditLog
};
