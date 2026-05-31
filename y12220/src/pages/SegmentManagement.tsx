import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatCurrency } from '@/utils/calculator';
import dayjs from 'dayjs';
import {
  Plane,
  Wallet,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Percent,
  DollarSign,
  Calendar,
  Search,
  RefreshCw,
} from 'lucide-react';
import Loading, { TableLoadingSkeleton } from '@/components/Loading';
import Empty from '@/components/Empty';
import { cn } from '@/lib/utils';
import type { CabinPrice, TaxRule, CabinClass } from '@/types';
import { getCabinName } from '@/utils/mockData';

type TabType = 'cabin' | 'tax';

interface CabinPriceForm {
  flightNo: string;
  cabinClass: CabinClass;
  basePrice: string;
  effectiveDate: string;
}

interface TaxRuleForm {
  country: string;
  countryName: string;
  taxCode: string;
  taxName: string;
  rate: string;
  isFixed: boolean;
  fixedAmount: string;
}

export default function SegmentManagement() {
  const {
    cabinPrices,
    taxRules,
    isLoading,
    initialize,
    loadCabinPrices,
    loadTaxRules,
    addCabinPrice,
    updateCabinPrice,
    deleteCabinPrice,
    addTaxRule,
    updateTaxRule,
    deleteTaxRule,
  } = useStore();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('cabin');
  const [showCabinModal, setShowCabinModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingCabin, setEditingCabin] = useState<CabinPrice | null>(null);
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null);
  const [cabinSearch, setCabinSearch] = useState('');
  const [taxSearch, setTaxSearch] = useState('');
  const [cabinFormErrors, setCabinFormErrors] = useState<Record<string, string>>({});
  const [taxFormErrors, setTaxFormErrors] = useState<Record<string, string>>({});

  const [cabinForm, setCabinForm] = useState<CabinPriceForm>({
    flightNo: '',
    cabinClass: 'economy',
    basePrice: '',
    effectiveDate: dayjs().format('YYYY-MM-DD'),
  });

  const [taxForm, setTaxForm] = useState<TaxRuleForm>({
    country: 'CN',
    countryName: '中国',
    taxCode: '',
    taxName: '',
    rate: '',
    isFixed: true,
    fixedAmount: '',
  });

  useEffect(() => {
    const init = async () => {
      await initialize();
      await Promise.all([loadCabinPrices(), loadTaxRules()]);
      setTimeout(() => setIsPageLoading(false), 500);
    };
    init();
  }, [initialize, loadCabinPrices, loadTaxRules]);

  const filteredCabinPrices = useMemo(() => {
    return cabinPrices.filter(
      (price) =>
        !cabinSearch ||
        price.flightNo.toLowerCase().includes(cabinSearch.toLowerCase())
    );
  }, [cabinPrices, cabinSearch]);

  const filteredTaxRules = useMemo(() => {
    return taxRules.filter(
      (rule) =>
        !taxSearch ||
        rule.country.toLowerCase().includes(taxSearch.toLowerCase()) ||
        rule.countryName.toLowerCase().includes(taxSearch.toLowerCase()) ||
        rule.taxName.toLowerCase().includes(taxSearch.toLowerCase())
    );
  }, [taxRules, taxSearch]);

  const validateCabinForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!cabinForm.flightNo.trim()) errors.flightNo = '请输入航班号';
    if (!cabinForm.basePrice || parseFloat(cabinForm.basePrice) <= 0)
      errors.basePrice = '请输入有效价格';
    if (!cabinForm.effectiveDate) errors.effectiveDate = '请选择生效日期';

    setCabinFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTaxForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!taxForm.country.trim()) errors.country = '请选择国家';
    if (!taxForm.taxCode.trim()) errors.taxCode = '请输入税种代码';
    if (!taxForm.taxName.trim()) errors.taxName = '请输入税种名称';

    if (taxForm.isFixed) {
      if (!taxForm.fixedAmount || parseFloat(taxForm.fixedAmount) < 0)
        errors.fixedAmount = '请输入有效固定金额';
    } else {
      const rate = parseFloat(taxForm.rate);
      if (isNaN(rate) || rate < 0 || rate > 1)
        errors.rate = '税率应在 0-1 之间';
    }

    setTaxFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCabinModal = (cabin?: CabinPrice) => {
    if (cabin) {
      setEditingCabin(cabin);
      setCabinForm({
        flightNo: cabin.flightNo,
        cabinClass: cabin.cabinClass,
        basePrice: cabin.basePrice.toString(),
        effectiveDate: dayjs(cabin.effectiveDate).format('YYYY-MM-DD'),
      });
    } else {
      setEditingCabin(null);
      setCabinForm({
        flightNo: '',
        cabinClass: 'economy',
        basePrice: '',
        effectiveDate: dayjs().format('YYYY-MM-DD'),
      });
    }
    setCabinFormErrors({});
    setShowCabinModal(true);
  };

  const handleOpenTaxModal = (tax?: TaxRule) => {
    if (tax) {
      setEditingTax(tax);
      setTaxForm({
        country: tax.country,
        countryName: tax.countryName,
        taxCode: tax.taxCode,
        taxName: tax.taxName,
        rate: tax.rate.toString(),
        isFixed: tax.isFixed,
        fixedAmount: (tax.fixedAmount || 0).toString(),
      });
    } else {
      setEditingTax(null);
      setTaxForm({
        country: 'CN',
        countryName: '中国',
        taxCode: '',
        taxName: '',
        rate: '',
        isFixed: true,
        fixedAmount: '',
      });
    }
    setTaxFormErrors({});
    setShowTaxModal(true);
  };

  const handleSubmitCabin = async () => {
    if (!validateCabinForm()) return;

    try {
      if (editingCabin) {
        await updateCabinPrice(editingCabin.id, {
          flightNo: cabinForm.flightNo.trim(),
          cabinClass: cabinForm.cabinClass,
          basePrice: parseFloat(cabinForm.basePrice),
          effectiveDate: dayjs(cabinForm.effectiveDate).toISOString(),
        });
      } else {
        await addCabinPrice({
          flightNo: cabinForm.flightNo.trim(),
          cabinClass: cabinForm.cabinClass,
          basePrice: parseFloat(cabinForm.basePrice),
          effectiveDate: dayjs(cabinForm.effectiveDate).toISOString(),
        });
      }
      setShowCabinModal(false);
      setEditingCabin(null);
    } catch (error) {
      console.error('Failed to save cabin price:', error);
    }
  };

  const handleSubmitTax = async () => {
    if (!validateTaxForm()) return;

    try {
      if (editingTax) {
        await updateTaxRule(editingTax.id, {
          country: taxForm.country.trim(),
          countryName: taxForm.countryName.trim(),
          taxCode: taxForm.taxCode.trim(),
          taxName: taxForm.taxName.trim(),
          rate: taxForm.isFixed
            ? parseFloat(taxForm.fixedAmount)
            : parseFloat(taxForm.rate),
          isFixed: taxForm.isFixed,
          fixedAmount: taxForm.isFixed
            ? parseFloat(taxForm.fixedAmount)
            : undefined,
        });
      } else {
        await addTaxRule({
          country: taxForm.country.trim(),
          countryName: taxForm.countryName.trim(),
          taxCode: taxForm.taxCode.trim(),
          taxName: taxForm.taxName.trim(),
          rate: taxForm.isFixed
            ? parseFloat(taxForm.fixedAmount)
            : parseFloat(taxForm.rate),
          isFixed: taxForm.isFixed,
          fixedAmount: taxForm.isFixed
            ? parseFloat(taxForm.fixedAmount)
            : undefined,
        });
      }
      setShowTaxModal(false);
      setEditingTax(null);
    } catch (error) {
      console.error('Failed to save tax rule:', error);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    const countryMap: Record<string, string> = {
      CN: '中国',
      JP: '日本',
      US: '美国',
      SG: '新加坡',
      HK: '香港',
      KR: '韩国',
      UK: '英国',
      FR: '法国',
      DE: '德国',
    };
    setTaxForm((prev) => ({
      ...prev,
      country: countryCode,
      countryName: countryMap[countryCode] || countryCode,
    }));
  };

  if (isPageLoading || isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-primary-800 mb-6">航段管理</h1>
        <TableLoadingSkeleton rows={8} columns={4} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-800">航段管理</h1>
        <p className="text-sm text-primary-500 mt-1">
          管理舱位价格基准和税费规则配置
        </p>
      </div>

      <div className="bg-white rounded-xl border border-primary-100 mb-6">
        <div className="flex border-b border-primary-100">
          <button
            onClick={() => setActiveTab('cabin')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'cabin'
                ? 'text-primary-700 border-primary-700'
                : 'text-primary-500 border-transparent hover:text-primary-700'
            )}
          >
            <Plane className="w-4 h-4" />
            舱位价格基准
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={cn(
              'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'tax'
                ? 'text-primary-700 border-primary-700'
                : 'text-primary-500 border-transparent hover:text-primary-700'
            )}
          >
            <Wallet className="w-4 h-4" />
            税费规则配置
          </button>
        </div>

        {activeTab === 'cabin' && (
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-4 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input
                  type="text"
                  placeholder="搜索航班号..."
                  value={cabinSearch}
                  onChange={(e) => setCabinSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
              <button
                onClick={() => {
                  setCabinSearch('');
                  loadCabinPrices();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              <button
                onClick={() => handleOpenCabinModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增价格
              </button>
            </div>

            {filteredCabinPrices.length === 0 ? (
              <Empty
                title="暂无舱位价格配置"
                description="点击上方按钮添加舱位价格基准"
                icon={<Plane className="w-12 h-12" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        航班号
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        舱位等级
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        基准价格
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        生效日期
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {filteredCabinPrices.map((price) => (
                      <tr
                        key={price.id}
                        className="hover:bg-primary-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <span className="font-medium text-primary-800">
                            {price.flightNo}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                            {getCabinName(price.cabinClass)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-primary-800">
                            {formatCurrency(price.basePrice)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-primary-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary-400" />
                            {dayjs(price.effectiveDate).format('YYYY-MM-DD')}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenCabinModal(price)}
                              className="p-1.5 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除该价格配置吗？')) {
                                  deleteCabinPrice(price.id);
                                }
                              }}
                              className="p-1.5 text-accent-red-500 hover:text-accent-red-700 hover:bg-accent-red-50 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-4 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input
                  type="text"
                  placeholder="搜索国家/税种..."
                  value={taxSearch}
                  onChange={(e) => setTaxSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                />
              </div>
              <button
                onClick={() => {
                  setTaxSearch('');
                  loadTaxRules();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              <button
                onClick={() => handleOpenTaxModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增规则
              </button>
            </div>

            {filteredTaxRules.length === 0 ? (
              <Empty
                title="暂无税费规则配置"
                description="点击上方按钮添加税费规则"
                icon={<Wallet className="w-12 h-12" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        国家
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        税种代码
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        税种名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        税率/金额
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {filteredTaxRules.map((rule) => (
                      <tr
                        key={rule.id}
                        className="hover:bg-primary-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <span className="font-medium text-primary-800">
                              {rule.countryName}
                            </span>
                            <span className="text-xs text-primary-500 ml-2">
                              ({rule.country})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono text-primary-600">
                            {rule.taxCode}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-primary-700">
                          {rule.taxName}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                              rule.isFixed
                                ? 'bg-accent-amber-100 text-accent-amber-700'
                                : 'bg-accent-green-100 text-accent-green-700'
                            )}
                          >
                            {rule.isFixed ? (
                              <>
                                <DollarSign className="w-3 h-3" />
                                固定金额
                              </>
                            ) : (
                              <>
                                <Percent className="w-3 h-3" />
                                比例税率
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {rule.isFixed ? (
                            <span className="font-semibold text-primary-800">
                              {formatCurrency(rule.fixedAmount || 0)}
                            </span>
                          ) : (
                            <span className="font-semibold text-primary-800">
                              {(rule.rate * 100).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenTaxModal(rule)}
                              className="p-1.5 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded transition-colors"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除该税费规则吗？')) {
                                  deleteTaxRule(rule.id);
                                }
                              }}
                              className="p-1.5 text-accent-red-500 hover:text-accent-red-700 hover:bg-accent-red-50 rounded transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCabinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
              <h2 className="text-xl font-semibold text-primary-800">
                {editingCabin ? '编辑舱位价格' : '新增舱位价格'}
              </h2>
              <button
                onClick={() => setShowCabinModal(false)}
                className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  航班号 <span className="text-accent-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cabinForm.flightNo}
                  onChange={(e) =>
                    setCabinForm((prev) => ({
                      ...prev,
                      flightNo: e.target.value,
                    }))
                  }
                  placeholder="如：CA1234"
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                    cabinFormErrors.flightNo
                      ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                      : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                  )}
                />
                {cabinFormErrors.flightNo && (
                  <p className="mt-1 text-xs text-accent-red-500">
                    {cabinFormErrors.flightNo}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  舱位等级
                </label>
                <select
                  value={cabinForm.cabinClass}
                  onChange={(e) =>
                    setCabinForm((prev) => ({
                      ...prev,
                      cabinClass: e.target.value as CabinClass,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                >
                  <option value="economy">经济舱</option>
                  <option value="premium_economy">超级经济舱</option>
                  <option value="business">商务舱</option>
                  <option value="first">头等舱</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  基准价格 <span className="text-accent-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={cabinForm.basePrice}
                    onChange={(e) =>
                      setCabinForm((prev) => ({
                        ...prev,
                        basePrice: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className={cn(
                      'w-full pl-8 pr-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                      cabinFormErrors.basePrice
                        ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                        : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                    )}
                  />
                </div>
                {cabinFormErrors.basePrice && (
                  <p className="mt-1 text-xs text-accent-red-500">
                    {cabinFormErrors.basePrice}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  生效日期 <span className="text-accent-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={cabinForm.effectiveDate}
                  onChange={(e) =>
                    setCabinForm((prev) => ({
                      ...prev,
                      effectiveDate: e.target.value,
                    }))
                  }
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                    cabinFormErrors.effectiveDate
                      ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                      : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                  )}
                />
                {cabinFormErrors.effectiveDate && (
                  <p className="mt-1 text-xs text-accent-red-500">
                    {cabinFormErrors.effectiveDate}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-100 bg-primary-50">
              <button
                onClick={() => setShowCabinModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-primary-600 hover:bg-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitCabin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingCabin ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
              <h2 className="text-xl font-semibold text-primary-800">
                {editingTax ? '编辑税费规则' : '新增税费规则'}
              </h2>
              <button
                onClick={() => setShowTaxModal(false)}
                className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  国家 <span className="text-accent-red-500">*</span>
                </label>
                <select
                  value={taxForm.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                >
                  <option value="CN">中国 (CN)</option>
                  <option value="JP">日本 (JP)</option>
                  <option value="US">美国 (US)</option>
                  <option value="SG">新加坡 (SG)</option>
                  <option value="HK">香港 (HK)</option>
                  <option value="KR">韩国 (KR)</option>
                  <option value="UK">英国 (UK)</option>
                  <option value="FR">法国 (FR)</option>
                  <option value="DE">德国 (DE)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    税种代码 <span className="text-accent-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxForm.taxCode}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        taxCode: e.target.value,
                      }))
                    }
                    placeholder="如：CNY"
                    className={cn(
                      'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                      taxFormErrors.taxCode
                        ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                        : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                    )}
                  />
                  {taxFormErrors.taxCode && (
                    <p className="mt-1 text-xs text-accent-red-500">
                      {taxFormErrors.taxCode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    税种名称 <span className="text-accent-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taxForm.taxName}
                    onChange={(e) =>
                      setTaxForm((prev) => ({
                        ...prev,
                        taxName: e.target.value,
                      }))
                    }
                    placeholder="如：民航发展基金"
                    className={cn(
                      'w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                      taxFormErrors.taxName
                        ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                        : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                    )}
                  />
                  {taxFormErrors.taxName && (
                    <p className="mt-1 text-xs text-accent-red-500">
                      {taxFormErrors.taxName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">
                  税费类型
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={taxForm.isFixed}
                      onChange={() =>
                        setTaxForm((prev) => ({ ...prev, isFixed: true }))
                      }
                      className="w-4 h-4 text-primary-600 border-primary-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-primary-700">固定金额</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!taxForm.isFixed}
                      onChange={() =>
                        setTaxForm((prev) => ({ ...prev, isFixed: false }))
                      }
                      className="w-4 h-4 text-primary-600 border-primary-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-primary-700">比例税率</span>
                  </label>
                </div>
              </div>

              {taxForm.isFixed ? (
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    固定金额 <span className="text-accent-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500">
                      ¥
                    </span>
                    <input
                      type="number"
                      value={taxForm.fixedAmount}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          fixedAmount: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className={cn(
                        'w-full pl-8 pr-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                        taxFormErrors.fixedAmount
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                  </div>
                  {taxFormErrors.fixedAmount && (
                    <p className="mt-1 text-xs text-accent-red-500">
                      {taxFormErrors.fixedAmount}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1.5">
                    税率（0-1） <span className="text-accent-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      value={taxForm.rate}
                      onChange={(e) =>
                        setTaxForm((prev) => ({
                          ...prev,
                          rate: e.target.value,
                        }))
                      }
                      placeholder="如：0.075 表示 7.5%"
                      className={cn(
                        'w-full pr-12 pl-3 py-2.5 border rounded-lg outline-none transition-all text-sm',
                        taxFormErrors.rate
                          ? 'border-accent-red-300 focus:ring-2 focus:ring-accent-red-500'
                          : 'border-primary-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                      )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 text-sm">
                      {taxForm.rate
                        ? `(${(parseFloat(taxForm.rate) * 100).toFixed(1)}%)`
                        : ''}
                    </span>
                  </div>
                  {taxFormErrors.rate && (
                    <p className="mt-1 text-xs text-accent-red-500">
                      {taxFormErrors.rate}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary-100 bg-primary-50">
              <button
                onClick={() => setShowTaxModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-primary-600 hover:bg-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitTax}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingTax ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
