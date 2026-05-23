const Joi = require('joi');

const schemas = {
  submitQueue: Joi.object({
    batchNo: Joi.string().required().messages({
      'string.base': '批号必须是字符串',
      'any.required': '批号是必填项'
    }),
    materialType: Joi.string().required().messages({
      'string.base': '材料类型必须是字符串',
      'any.required': '材料类型是必填项'
    }),
    materialName: Joi.string().optional(),
    materialSpec: Joi.string().optional(),
    appointmentNo: Joi.string().optional(),
    patientName: Joi.string().optional(),
    invoiceNo: Joi.string().optional(),
    approvalEmailId: Joi.string().optional(),
    originalData: Joi.alternatives().try(Joi.object(), Joi.array()).required().messages({
      'any.required': '原始数据是必填项'
    }),
    parsedData: Joi.alternatives().try(Joi.object(), Joi.array()).optional(),
    department: Joi.string().optional(),
    sourceFile: Joi.string().optional(),
    sourceRow: Joi.number().integer().optional(),
    importId: Joi.number().integer().optional(),
    maxRetry: Joi.number().integer().min(1).max(10).default(3)
  }),

  importData: Joi.object({
    sourceType: Joi.string().required().messages({
      'any.required': '来源类型是必填项'
    }),
    rows: Joi.array().min(1).required().messages({
      'array.min': '至少需要导入一条数据',
      'any.required': '数据行是必填项'
    }),
    sourceFile: Joi.string().required().messages({
      'any.required': '来源文件名是必填项'
    }),
    importedBy: Joi.string().optional(),
    remark: Joi.string().optional()
  }),

  markForRetry: Joi.object({
    errorMessage: Joi.string().required().messages({
      'any.required': '错误信息是必填项'
    }),
    operator: Joi.string().optional(),
    retryDelayMinutes: Joi.number().integer().min(1).max(1440).default(5)
  }),

  markPermanentFailed: Joi.object({
    errorMessage: Joi.string().required().messages({
      'any.required': '错误信息是必填项'
    }),
    operator: Joi.string().optional()
  }),

  manualTakeover: Joi.object({
    operator: Joi.string().required().messages({
      'any.required': '操作人是必填项'
    }),
    remark: Joi.string().optional()
  }),

  compensate: Joi.object({
    operator: Joi.string().required().messages({
      'any.required': '操作人是必填项'
    }),
    remark: Joi.string().optional(),
    parsedData: Joi.object().optional()
  }),

  close: Joi.object({
    operator: Joi.string().required().messages({
      'any.required': '操作人是必填项'
    }),
    remark: Joi.string().optional()
  }),

  listQuery: Joi.object({
    status: Joi.string().optional(),
    batchNo: Joi.string().optional(),
    department: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20)
  })
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: '验证规则未定义' });
    }

    const data = schemaName === 'listQuery' ? req.query : req.body;
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ error: '参数验证失败', errors });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = validate;
