const { DirtyRecord, DIRTY_TYPES, PROCESS_STATUS } = require('../models/DirtyRecord');
const dayjs = require('dayjs');

const detectMissingFields = (data, requiredFields) => {
  const missing = [];
  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  });
  return missing;
};

const detectCrossDate = (date, baseDate) => {
  const recordDate = dayjs(date);
  const base = dayjs(baseDate);
  return !recordDate.isSame(base, 'day');
};

const detectNameChange = (oldName, newName, productId) => {
  return oldName && newName && oldName !== newName;
};

const detectAmountConflict = (oldAmount, newAmount, tolerance = 0) => {
  return Math.abs((oldAmount || 0) - (newAmount || 0)) > tolerance;
};

const detectQuantityConflict = (oldQty, newQty, tolerance = 0) => {
  return Math.abs((oldQty || 0) - (newQty || 0)) > tolerance;
};

const detectDuplicateImport = async (sourceType, uniqueKey, uniqueValue) => {
  const existing = await DirtyRecord.findOne({
    sourceType,
    [`originalData.${uniqueKey}`]: uniqueValue,
    processStatus: { $in: [PROCESS_STATUS.PENDING, PROCESS_STATUS.PROCESSING] }
  });
  return !!existing;
};

const createDirtyRecord = async (options) => {
  const {
    dirtyType,
    sourceType,
    sourceId,
    sourceNo,
    ledgerId,
    cabinetId,
    originalData,
    missingFields = [],
    conflictFields = [],
    crossDateInfo = null,
    nameChangeInfo = null,
    detectedBy = null,
    remark = ''
  } = options;

  const dirtyRecord = new DirtyRecord({
    dirtyType,
    sourceType,
    sourceId,
    sourceNo,
    ledgerId,
    cabinetId,
    originalData,
    missingFields,
    conflictFields,
    crossDateInfo,
    nameChangeInfo,
    detectedBy,
    remark
  });

  await dirtyRecord.save();
  return dirtyRecord;
};

const processDirtyRecord = async (dirtyRecordId, userId, processOpinion, correctionData, correctionRemark) => {
  const dirtyRecord = await DirtyRecord.findById(dirtyRecordId);
  if (!dirtyRecord) {
    throw new Error('脏记录不存在');
  }

  dirtyRecord.processStatus = PROCESS_STATUS.PROCESSING;
  dirtyRecord.processOpinion = processOpinion;
  dirtyRecord.processedBy = userId;
  dirtyRecord.processedAt = new Date();
  dirtyRecord.correctionData = correctionData;
  dirtyRecord.correctionRemark = correctionRemark;

  await dirtyRecord.save();
  return dirtyRecord;
};

const resolveDirtyRecord = async (dirtyRecordId, resummarize = false) => {
  const dirtyRecord = await DirtyRecord.findById(dirtyRecordId);
  if (!dirtyRecord) {
    throw new Error('脏记录不存在');
  }

  dirtyRecord.processStatus = PROCESS_STATUS.RESOLVED;
  if (resummarize) {
    dirtyRecord.isResummarized = true;
    dirtyRecord.resummarizedAt = new Date();
  }

  await dirtyRecord.save();
  return dirtyRecord;
};

const ignoreDirtyRecord = async (dirtyRecordId, userId, reason) => {
  const dirtyRecord = await DirtyRecord.findById(dirtyRecordId);
  if (!dirtyRecord) {
    throw new Error('脏记录不存在');
  }

  dirtyRecord.processStatus = PROCESS_STATUS.IGNORED;
  dirtyRecord.processOpinion = reason;
  dirtyRecord.processedBy = userId;
  dirtyRecord.processedAt = new Date();

  await dirtyRecord.save();
  return dirtyRecord;
};

const getDirtyRecords = async (filters = {}, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.dirtyType) query.dirtyType = filters.dirtyType;
  if (filters.processStatus) query.processStatus = filters.processStatus;
  if (filters.ledgerId) query.ledgerId = filters.ledgerId;
  if (filters.cabinetId) query.cabinetId = filters.cabinetId;
  if (filters.sourceType) query.sourceType = filters.sourceType;

  const records = await DirtyRecord.find(query)
    .sort({ detectedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('processedBy', 'name role');

  const total = await DirtyRecord.countDocuments(query);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const validateAndCreateDirtyRecords = async (dataList, sourceType, requiredFields, ledgerId = null) => {
  const dirtyRecords = [];
  const validData = [];

  for (const data of dataList) {
    let isDirty = false;
    const dirtyOptions = {
      sourceType,
      sourceId: data._id,
      sourceNo: data.ledgerNo || data.refundNo || data.photoId,
      ledgerId,
      cabinetId: data.cabinetId,
      originalData: data.toObject ? data.toObject() : data
    };

    const missingFields = detectMissingFields(data, requiredFields);
    if (missingFields.length > 0) {
      isDirty = true;
      dirtyOptions.dirtyType = DIRTY_TYPES.MISSING_FIELD;
      dirtyOptions.missingFields = missingFields;
      dirtyOptions.remark = `缺少必填字段: ${missingFields.join(', ')}`;
    }

    if (data.inventoryDiffs) {
      const conflicts = data.inventoryDiffs.filter(diff => 
        diff.diffType === 'amount_conflict' || diff.diffType === 'quantity_conflict'
      );
      if (conflicts.length > 0) {
        isDirty = true;
        dirtyOptions.dirtyType = dirtyOptions.dirtyType || DIRTY_TYPES.QUANTITY_CONFLICT;
        dirtyOptions.conflictFields = conflicts.map(c => ({
          field: c.productName,
          oldValue: c.expectedQuantity,
          newValue: c.actualQuantity
        }));
      }
    }

    if (isDirty) {
      const dirtyRecord = await createDirtyRecord(dirtyOptions);
      dirtyRecords.push(dirtyRecord);
    } else {
      validData.push(data);
    }
  }

  return { dirtyRecords, validData };
};

const getDirtyStats = async (filters = {}) => {
  const query = {};
  if (filters.ledgerId) query.ledgerId = filters.ledgerId;
  if (filters.cabinetId) query.cabinetId = filters.cabinetId;

  const stats = await DirtyRecord.aggregate([
    { $match: query },
    {
      $group: {
        _id: { dirtyType: '$dirtyType', processStatus: '$processStatus' },
        count: { $sum: 1 }
      }
    }
  ]);

  return stats;
};

module.exports = {
  detectMissingFields,
  detectCrossDate,
  detectNameChange,
  detectAmountConflict,
  detectQuantityConflict,
  detectDuplicateImport,
  createDirtyRecord,
  processDirtyRecord,
  resolveDirtyRecord,
  ignoreDirtyRecord,
  getDirtyRecords,
  validateAndCreateDirtyRecords,
  getDirtyStats,
  DIRTY_TYPES,
  PROCESS_STATUS
};
