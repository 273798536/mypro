import { CreditCard, AlertTriangle, CheckCircle, Clock, TrendingUp, DollarSign, FileText, Car, Database, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { formatCurrency } from '@/utils/format';
import { generateAllMockData } from '@/utils/mockData';

export function DashboardPage() {
  const { renewalRecords, licensePlates, tempParkingRecords, discounts, badRows, 
          setLicensePlates, setMonthlyCards, setTempParkingRecords, setDiscounts, 
          setRenewalRecords, setBadRows, clearAllData } = useDataStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateMockData = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const mockData = generateAllMockData();
      clearAllData();
      setLicensePlates(mockData.licensePlates);
      setMonthlyCards(mockData.monthlyCards);
      setTempParkingRecords(mockData.tempParkingRecords);
      setDiscounts(mockData.discounts);
      setRenewalRecords(mockData.renewalRecords);
      setBadRows(mockData.badRows);
      setIsGenerating(false);
    }, 500);
  };

  const pendingCount = renewalRecords.filter((r) => r.status === 'pending').length;
  const reviewedCount = renewalRecords.filter((r) => r.status === 'reviewed').length;
  const confirmedCount = renewalRecords.filter((r) => r.status === 'confirmed').length;
  const errorCount = renewalRecords.filter((r) => r.reviewStatus === 'error').length;
  const warningCount = renewalRecords.filter((r) => r.reviewStatus === 'warning').length;

  const totalAmount = renewalRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalDeduction = renewalRecords.reduce((sum, r) => sum + r.tempParkingDeduction, 0);
  const totalDiscount = renewalRecords.reduce((sum, r) => sum + r.discountAmount, 0);

  const stats = [
    { label: '待处理续费', value: pendingCount, icon: Clock, color: 'bg-amber-500' },
    { label: '已复核', value: reviewedCount, icon: CheckCircle, color: 'bg-blue-500' },
    { label: '已确认', value: confirmedCount, icon: CreditCard, color: 'bg-green-500' },
    { label: '异常记录', value: errorCount, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  const financialStats = [
    { label: '应收总金额', value: formatCurrency(totalAmount), icon: DollarSign, color: 'text-green-600' },
    { label: '临停抵扣总额', value: formatCurrency(totalDeduction), icon: TrendingUp, color: 'text-blue-600' },
    { label: '优惠减免总额', value: formatCurrency(totalDiscount), icon: FileText, color: 'text-purple-600' },
    { label: '车牌档案数', value: licensePlates.length, icon: Car, color: 'text-slate-600' },
  ];

  const recentRecords = renewalRecords.slice(0, 5);
  const recentBadRows = badRows.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">仪表盘</h1>
          <p className="text-slate-500 mt-1">停车月卡续费管理概览</p>
        </div>
        <button
          onClick={handleGenerateMockData}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <Database size={18} />
          )}
          {isGenerating ? '生成中...' : '生成测试数据'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {financialStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-800 mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">最近续费记录</h3>
          </div>
          <div className="p-5">
            {recentRecords.length === 0 ? (
              <p className="text-center text-slate-400 py-8">暂无记录</p>
            ) : (
              <div className="space-y-4">
                {recentRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{record.plateNumber}</p>
                      <p className="text-sm text-slate-500">{record.ownerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{formatCurrency(record.totalAmount)}</p>
                      <p className={`text-xs ${
                        record.reviewStatus === 'normal' ? 'text-green-600' :
                        record.reviewStatus === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {record.reviewStatus === 'normal' ? '正常' :
                         record.reviewStatus === 'warning' ? '待关注' : '异常'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">导入异常记录</h3>
            {warningCount > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                {warningCount} 条待关注
              </span>
            )}
          </div>
          <div className="p-5">
            {recentBadRows.length === 0 ? (
              <p className="text-center text-slate-400 py-8">暂无异常记录</p>
            ) : (
              <div className="space-y-3">
                {recentBadRows.map((row) => (
                  <div key={row.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-red-700">第 {row.rowNumber} 行</span>
                      <span className="text-xs text-red-500">
                        {row.errorType === 'emptyRow' ? '空行' :
                         row.errorType === 'missingColumn' ? '缺少列' :
                         row.errorType === 'invalidFormat' ? '格式错误' :
                         row.errorType === 'duplicate' ? '重复数据' : '未知错误'}
                      </span>
                    </div>
                    <p className="text-xs text-red-600">{row.errorMessage}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">数据统计</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{licensePlates.length}</p>
            <p className="text-sm text-slate-500 mt-1">车牌档案</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{tempParkingRecords.length}</p>
            <p className="text-sm text-slate-500 mt-1">临停流水</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{discounts.length}</p>
            <p className="text-sm text-slate-500 mt-1">优惠记录</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{badRows.length}</p>
            <p className="text-sm text-slate-500 mt-1">异常行</p>
          </div>
        </div>
      </div>
    </div>
  );
}
