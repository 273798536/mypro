const { AppError } = require('../utils/helpers');

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || '内部服务器错误';
  let actionableInfo = err.actionableInfo || null;

  if (!err.isOperational) {
    console.error('未预期的错误:', err);
    message = '服务内部错误，请联系技术支持';
    actionableInfo = {
      error_type: 'internal_error',
      suggestion: '请稍后重试，如果问题持续存在请联系系统管理员'
    };
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    if (err.message.includes('UNIQUE')) {
      message = '数据已存在，请勿重复操作';
      actionableInfo = {
        error_type: 'duplicate_data',
        suggestion: '该数据已导入过，请检查是否重复提交，或使用新版本号导入'
      };
    }
  }

  if (err.code === 'SQLITE_ERROR') {
    statusCode = 400;
    message = '数据操作失败';
    actionableInfo = {
      error_type: 'database_error',
      suggestion: '请检查输入数据格式是否正确'
    };
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message: message,
      actionable_info: actionableInfo
    }
  });
}

function notFoundHandler(req, res, next) {
  const err = new AppError(`找不到路径: ${req.originalUrl}`, 404, {
    error_type: 'not_found',
    available_endpoints: [
      'GET /api/work-orders - 工单列表',
      'POST /api/work-orders - 创建工单',
      'GET /api/work-orders/:id - 工单详情',
      'POST /api/work-orders/:id/status - 推进状态',
      'POST /api/work-orders/:id/import/dictionary - 导入数据字典',
      'POST /api/work-orders/:id/compare - 执行表结构对比',
      'GET /api/work-orders/:id/comparisons - 对比记录列表',
      'GET /api/comparisons/:id - 对比详情',
      'GET /api/comparisons/:id/rollback - 回滚记录',
      'GET /api/comparisons/:id/index-suggestions - 索引建议',
      'POST /api/work-orders/:id/permission-audit - 权限审计',
      'POST /api/work-orders/:id/slow-query - 导入慢查询日志',
      'POST /api/work-orders/:id/report - 导出报告'
    ]
  });
  next(err);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
