const errorHandler = (err, req, res, next) => {
  console.error('错误:', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || '服务器内部错误',
      details: err.details || null
    }
  });
};

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message = '参数验证失败', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class StateTransitionError extends AppError {
  constructor(message = '状态转换不允许') {
    super(message, 400, 'STATE_TRANSITION_ERROR');
  }
}

class IdempotentConflictError extends AppError {
  constructor(message = '幂等冲突') {
    super(message, 409, 'IDEMPOTENT_CONFLICT');
  }
}

class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message, 400, code);
  }
}

module.exports = {
  errorHandler,
  AppError,
  NotFoundError,
  ValidationError,
  StateTransitionError,
  IdempotentConflictError,
  BusinessError
};
