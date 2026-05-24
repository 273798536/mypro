const { getAsync } = require('../config/database');

const idempotentMiddleware = async (req, res, next) => {
  const idempotentKey = req.headers['x-idempotent-key'] || 
                       req.body.idempotentKey || 
                       req.query.idempotentKey;

  if (!idempotentKey) {
    return next();
  }

  try {
    const existing = await getAsync(
      `SELECT * FROM operation_history WHERE idempotent_key = ?`,
      [idempotentKey]
    );

    if (existing) {
      const cachedResponse = JSON.parse(existing.change_content || '{}');
      return res.status(200).json({
        success: true,
        message: '请求已处理（幂等返回）',
        idempotent: true,
        data: cachedResponse.data || null
      });
    }

    req.idempotentKey = idempotentKey;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = idempotentMiddleware;
