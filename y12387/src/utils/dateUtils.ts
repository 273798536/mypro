export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const getDaysUntilExpiry = (endDate: string): number => {
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const isExpired = (endDate: string): boolean => {
  return getDaysUntilExpiry(endDate) < 0;
};

export const isExpiringSoon = (endDate: string, daysThreshold = 30): boolean => {
  const days = getDaysUntilExpiry(endDate);
  return days >= 0 && days <= daysThreshold;
};

export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};
