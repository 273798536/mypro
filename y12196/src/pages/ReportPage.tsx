import { useState, useMemo, useCallback } from 'react';
import { FileText, Download, Share2, Printer, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStore } from '../store';
import { statusLabels } from '../data/mockData';
import type { BoxStatus, CityStatus } from '../types';

const STATUS_METHODOLOGY = [
  { status: 'pending', label: '待发货', description: '物资已登记但尚未安排运输，数据来源为物资管理员录入' },
  { status: 'transit', label: '运输中', description: '物资已发车在途，数据来源为物流系统追踪或人工标记' },
  { status: 'arrived', label: '已到达', description: '物资已抵达城市场馆，数据来源为场地签收人或物流确认' },
  { status: 'signed', label: '已签收', description: '物资已被场馆方签收确认，数据来源为签收照片与签收人记录' },
  { status: 'scheduled', label: '已排期', description: '城市场次已确定排期，数据来源为场次协调员录入' },
  { status: 'in-progress', label: '进行中', description: '城市场次正在执行中，数据来源为场次协调员标记' },
  { status: 'completed', label: '已完成', description: '城市场次已结束，数据来源为场次协调员确认' },
];

const BOX_STATUS_OPTIONS: { value: BoxStatus; label: string }[] = [
  { value: 'pending', label: '待发货' },
  { value: 'transit', label: '运输中' },
  { value: 'arrived', label: '已到达' },
  { value: 'signed', label: '已签收' },
];

export function ReportPage() {
  const boxes = useStore((s) => s.boxes);
  const cities = useStore((s) => s.cities);
  const shipments = useStore((s) => s.shipments);
  const alerts = useStore((s) => s.alerts);

  const [bannerOpen, setBannerOpen] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>(cities.map((c) => c.id));
  const [selectedStatuses, setSelectedStatuses] = useState<BoxStatus[]>(BOX_STATUS_OPTIONS.map((o) => o.value));
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleCity = (cityId: string) => {
    setSelectedCityIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  const toggleStatus = (status: BoxStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const filteredCities = useMemo(() => {
    return cities.filter((c) => selectedCityIds.includes(c.id));
  }, [cities, selectedCityIds]);

  const filteredBoxes = useMemo(() => {
    return boxes.filter((b) => selectedStatuses.includes(b.status));
  }, [boxes, selectedStatuses]);

  const summaryStats = useMemo(() => {
    const totalBoxes = filteredBoxes.length;
    const signedShipments = shipments.filter(
      (s) => selectedStatuses.includes('signed') && selectedCityIds.includes(s.cityId)
    );
    const relevantShipments = shipments.filter((s) => selectedCityIds.includes(s.cityId));
    const signedRate = relevantShipments.length > 0
      ? Math.round((signedShipments.length / relevantShipments.length) * 100)
      : 0;
    const activeAlertCount = alerts.filter((a) => a.status === 'active').length;
    return { totalBoxes, signedRate, activeAlertCount };
  }, [filteredBoxes, shipments, selectedStatuses, selectedCityIds, alerts]);

  const cityBreakdown = useMemo(() => {
    return filteredCities.map((city) => {
      const cityShipments = shipments.filter((s) => s.cityId === city.id);
      const cityBoxes = cityShipments.length;
      const signedCount = cityShipments.filter((s) => s.status === 'signed').length;
      const pendingItems = cityShipments.filter((s) => s.status !== 'signed').length;
      return {
        id: city.id,
        name: city.name,
        date: city.performanceDate,
        status: city.status,
        boxCount: cityBoxes,
        signedCount,
        pendingItems,
      };
    });
  }, [filteredCities, shipments]);

  const insuranceSummary = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let expiringSoon = 0;
    boxes.forEach((box) => {
      if (!box.insurance) return;
      const diffDays = Math.ceil(
        (new Date(box.insurance.expireDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 0) expired++;
      else if (diffDays <= 30) expiringSoon++;
    });
    return { expired, expiringSoon };
  }, [boxes]);

  const handleExportExcel = () => showToast('Excel 已生成');
  const handleExportPdf = () => showToast('PDF 已生成');
  const handleShare = () => {
    navigator.clipboard.writeText('https://tour-logistics.example.com/reports/shared/abc123')
      .then(() => showToast('分享链接已复制到剪贴板'))
      .catch(() => showToast('复制失败，请重试'));
  };
  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText size={28} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-neutral-text">物流报告</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setBannerOpen(!bannerOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-blue-800">城市状态口径说明</span>
          <span className="text-blue-600 text-xs">{bannerOpen ? '收起 ▲' : '展开 ▼'}</span>
        </button>
        {bannerOpen && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-blue-700 mb-2">
              以下为各状态的定义及计算口径，确保团队成员对状态含义达成一致，避免反复确认。
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {STATUS_METHODOLOGY.map((item) => (
                <div key={item.status} className="flex items-start gap-2 text-xs">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    statusLabels[item.status]?.color || 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.label}
                  </span>
                  <span className="text-blue-800">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="no-print bg-white rounded-lg shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-text">
          <Filter size={16} />
          报告筛选
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
          <div className="flex flex-wrap gap-3">
            {cities.map((city) => (
              <label key={city.id} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCityIds.includes(city.id)}
                  onChange={() => toggleCity(city.id)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-300"
                />
                {city.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">物资状态</label>
          <div className="flex flex-wrap gap-3">
            {BOX_STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(opt.value)}
                  onChange={() => toggleStatus(opt.value)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-300"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-5 space-y-5">
        <h2 className="text-lg font-semibold text-primary-800">报告预览</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{summaryStats.totalBoxes}</div>
            <div className="text-sm text-blue-600 mt-1">物资总数</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-700">{summaryStats.signedRate}%</div>
            <div className="text-sm text-green-600 mt-1">签收率</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{summaryStats.activeAlertCount}</div>
            <div className="text-sm text-red-600 mt-1">活跃预警</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-text mb-3">城市场次明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-left">
                  <th className="px-3 py-2 font-semibold text-primary-800">城市</th>
                  <th className="px-3 py-2 font-semibold text-primary-800">演出日期</th>
                  <th className="px-3 py-2 font-semibold text-primary-800">状态</th>
                  <th className="px-3 py-2 font-semibold text-primary-800">物资数</th>
                  <th className="px-3 py-2 font-semibold text-primary-800">已签收</th>
                  <th className="px-3 py-2 font-semibold text-primary-800">待处理</th>
                </tr>
              </thead>
              <tbody className="table-zebra">
                {cityBreakdown.map((row) => (
                  <tr key={row.id} className="border-t border-neutral-border">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {format(new Date(row.date), 'yyyy-MM-dd', { locale: zhCN })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusLabels[row.status as CityStatus]?.color || 'bg-gray-100 text-gray-600'
                      }`}>
                        {statusLabels[row.status as CityStatus]?.label || row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{row.boxCount}</td>
                    <td className="px-3 py-2 text-green-700 font-medium">{row.signedCount}</td>
                    <td className="px-3 py-2 text-orange-700 font-medium">{row.pendingItems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-text mb-3">保险状态汇总</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-sm">{insuranceSummary.expired}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-red-800">已过期</div>
                <div className="text-xs text-red-600">保险已失效的物资数量</div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-700 font-bold text-sm">{insuranceSummary.expiringSoon}</span>
              </div>
              <div>
                <div className="text-sm font-medium text-yellow-800">即将过期</div>
                <div className="text-xs text-yellow-600">30天内将过期的物资数量</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print flex items-center gap-3">
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          导出 Excel
        </button>
        <button
          onClick={handleExportPdf}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          导出 PDF
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Share2 size={16} />
          复制分享链接
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          <Printer size={16} />
          打印
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-neutral-text text-white px-5 py-3 rounded-lg shadow-cardHover text-sm animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
