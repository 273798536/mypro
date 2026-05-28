export const useCurrency = () => {
  const formatCurrency = (
    value: number,
    currency: string = 'CNY',
    minimumFractionDigits: number = 2
  ): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (
    value: number,
    minimumFractionDigits: number = 2
  ): string => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (
    value: number,
    minimumFractionDigits: number = 2
  ): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  return {
    formatCurrency,
    formatNumber,
    formatPercent,
  };
};
