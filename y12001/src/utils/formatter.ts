
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
};

export const formatShortDate = (date: Date): string => {
  return format(date, 'MM-dd HH:mm', { locale: zhCN });
};

export const maskCardNumber = (cardNumber: string): string => {
  if (cardNumber.length <= 8) return cardNumber;
  const prefix = cardNumber.slice(0, 4);
  const suffix = cardNumber.slice(-4);
  return `${prefix} **** **** ${suffix}`;
};

export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '待清算',
    settled: '已清算',
    exception: '异常',
    completed: '已完成',
    active: '营业中',
    closed: '已撤店',
  };
  return statusMap[status] || status;
};

export const getExceptionLabel = (type: string): string => {
  const exceptionMap: Record<string, string> = {
    store_closed: '门店撤店',
    bonus_refund: '赠金不可退',
    over_consume: '超额消费',
  };
  return exceptionMap[type] || type;
};

export const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    recharge: '充值',
    consume: '消费',
    refund: '退款',
  };
  return typeMap[type] || type;
};
