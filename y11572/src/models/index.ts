import CompensationTicketModel from './CompensationTicket';
import StatusHistoryModel from './StatusHistory';
import RetryRecordModel from './RetryRecord';
import AuditLogModel from './AuditLog';
import ExportRecordModel from './ExportRecord';
import DeadLetterModel from './DeadLetter';

export const setupAssociations = (): void => {
  CompensationTicketModel.hasMany(StatusHistoryModel, {
    foreignKey: 'ticketId',
    as: 'statusHistory',
  });

  StatusHistoryModel.belongsTo(CompensationTicketModel, {
    foreignKey: 'ticketId',
    as: 'ticket',
  });

  CompensationTicketModel.hasMany(RetryRecordModel, {
    foreignKey: 'ticketId',
    as: 'retryRecords',
  });

  RetryRecordModel.belongsTo(CompensationTicketModel, {
    foreignKey: 'ticketId',
    as: 'ticket',
  });
};

export {
  CompensationTicketModel,
  StatusHistoryModel,
  RetryRecordModel,
  AuditLogModel,
  ExportRecordModel,
  DeadLetterModel,
};
