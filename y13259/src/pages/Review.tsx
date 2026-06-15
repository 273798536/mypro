import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, Calculator, AlertCircle, MapPin, Users, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePublicListStore } from '@/store/usePublicListStore';
import { useCalculationStore } from '@/store/useCalculationStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useGisStore } from '@/store/useGisStore';
import { getStatusLabel, getStatusColor } from '@/services/detectionService';
import { getFullTraceData, formatDate } from '@/services/traceService';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import type { PublicListItem, PublicListItemStatus, CalculationRule } from '@/types';
import { cn } from '@/lib/utils';

type ChartDataKey = 'normal' | 'abnormal' | 'over_capacity' | 'complaint';

const STATUS_COLORS: Record<ChartDataKey, string> = {
  normal: '#16A34A',
  abnormal: '#EA580C',
  over_capacity: '#DC2626',
  complaint: '#9333EA',
};

const CHART_DATA_KEYS: ChartDataKey[] = ['normal', 'abnormal', 'over_capacity', 'complaint'];

interface ChartDataItem {
  date: string;
  normal: number;
  abnormal: number;
  over_capacity: number;
  complaint: number;
}

export default function Review() {
  const { items, loading, filterStatus, selectedItemId, fetchItems, setFilter, selectItem, updateItemStatus } = usePublicListStore();
  const { rules, fetchRules, selectedRuleId, selectRule } = useCalculationStore();
  const { addRecord, fetchRecords } = useHistoryStore();
  const { getPointById, highlightPoint } = useGisStore();

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeLegend, setActiveLegend] = useState<ChartDataKey | null>(null);
  const [selectedBarStatus, setSelectedBarStatus] = useState<PublicListItemStatus | null>(null);
  const [selectedBarDate, setSelectedBarDate] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [operationRemark, setOperationRemark] = useState('');

  useEffect(() => {
    fetchItems();
    fetchRules();
    fetchRecords();
  }, [fetchItems, fetchRules, fetchRecords]);

  useEffect(() => {
    if (rules.length > 0 && !selectedRuleId) {
      selectRule(rules[0].id);
    }
  }, [rules, selectedRuleId, selectRule]);

  const currentRule = useMemo((): CalculationRule | undefined => {
    if (!selectedRuleId) return undefined;
    return rules.find(r => r.id === selectedRuleId);
  }, [rules, selectedRuleId]);

  const chartData = useMemo((): ChartDataItem[] => {
    const dateMap = new Map<string, ChartDataItem>();

    items.forEach(item => {
      const date = new Date(item.createdAt).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      });

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          normal: 0,
          abnormal: 0,
          over_capacity: 0,
          complaint: 0,
        });
      }

      const entry = dateMap.get(date)!;
      if (item.status in entry) {
        entry[item.status as ChartDataKey]++;
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => {
      const dateA = new Date(`2026-${a.date.replace('/', '-')}`);
      const dateB = new Date(`2026-${b.date.replace('/', '-')}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [items]);

  const filteredItems = useMemo((): PublicListItem[] => {
    return items.filter(item => {
      if (selectedBarStatus && item.status !== selectedBarStatus) return false;
      if (selectedBarDate) {
        const itemDate = new Date(item.createdAt).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        });
        if (itemDate !== selectedBarDate) return false;
      }
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (dateRange.start) {
        const itemDate = new Date(item.createdAt);
        const startDate = new Date(dateRange.start);
        if (itemDate < startDate) return false;
      }
      if (dateRange.end) {
        const itemDate = new Date(item.createdAt);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
      return true;
    });
  }, [items, selectedBarStatus, selectedBarDate, filterStatus, dateRange]);

  const stats = useMemo(() => {
    return {
      normal: items.filter(item => item.status === 'normal').length,
      abnormal: items.filter(item => item.status === 'abnormal').length,
      overCapacity: items.filter(item => item.status === 'over_capacity').length,
      complaint: items.filter(item => item.status === 'complaint').length,
    };
  }, [items]);

  const handleLegendClick = (data: any) => {
    const value = data.value as ChartDataKey;
    if (activeLegend === value) {
      setActiveLegend(null);
      setSelectedBarStatus(null);
    } else {
      setActiveLegend(value);
      setSelectedBarStatus(value as PublicListItemStatus);
    }
  };

  const handleBarClick = (data: any) => {
    const clickedStatus = Object.keys(data).find(key =>
      CHART_DATA_KEYS.includes(key as ChartDataKey) && data[key] > 0
    ) as ChartDataKey | undefined;

    if (clickedStatus) {
      setSelectedBarStatus(clickedStatus as PublicListItemStatus);
      setSelectedBarDate(data.date);
      highlightPoint(items.find(item => {
        const itemDate = new Date(item.createdAt).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        });
        return item.status === clickedStatus && itemDate === data.date;
      })?.gisPointId || null);
    }
  };

  const handleReCalculate = () => {
    fetchItems();
  };

  const handleItemClick = (item: PublicListItem) => {
    selectItem(item.id);
    highlightPoint(item.gisPointId);
  };

  const handleConfirm = () => {
    if (!selectedItemId) return;
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    const beforeData = {
      listItemId: item.id,
      status: item.status,
      remark: item.remark,
    };

    updateItemStatus(item.id, item.status, operationRemark);

    addRecord(
      '当前用户',
      'confirm',
      beforeData,
      {
        ...beforeData,
        remark: operationRemark,
      },
      operationRemark
    );

    setShowConfirmModal(false);
    setOperationRemark('');
    selectItem(null);
  };

  const handleReject = () => {
    if (!selectedItemId) return;
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    const beforeData = {
      listItemId: item.id,
      status: item.status,
      remark: item.remark,
    };

    updateItemStatus(item.id, 'normal', operationRemark);

    addRecord(
      '当前用户',
      'reject',
      beforeData,
      {
        ...beforeData,
        status: 'normal',
        remark: operationRemark,
      },
      operationRemark
    );

    setShowRejectModal(false);
    setOperationRemark('');
    selectItem(null);
  };

  const getStreetByGisPointId = (gisPointId: string): string => {
    const point = getPointById(gisPointId);
    return point?.street || '未知街口';
  };

  const CustomBar = (props: any) => {
    const { x, y, width, height, fill, index, payload } = props;
    const barStatus = Object.keys(payload).find(key =>
      CHART_DATA_KEYS.includes(key as ChartDataKey) && payload[key] > 0
    ) as ChartDataKey | undefined;

    const isHighlighted = !activeLegend || activeLegend === barStatus;
    const isSelected = selectedBarStatus === barStatus && selectedBarDate === payload.date;

    if (height <= 0) return null;

    return (
      <g
        className="cursor-pointer transition-all duration-200 hover:-translate-y-1"
        onClick={() => handleBarClick(payload)}
      >
        <rect
          x={x}
          y={isSelected ? y - 4 : y}
          width={width}
          height={height}
          fill={fill}
          opacity={isHighlighted ? 1 : 0.3}
          rx={2}
          style={{
            filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' : 'none',
            transition: 'all 0.2s ease',
          }}
          className="hover:opacity-90"
        />
      </g>
    );
  };

  const selectedItem = selectedItemId ? items.find(i => i.id === selectedItemId) : null;
  const showOperationButtons = selectedItem && selectedItem.status !== 'normal';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">复核工作台</h1>
          <p className="mt-2 text-gray-600">图表联动分析，追溯计算口径</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
              />
            </div>

            <button
              onClick={handleReCalculate}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-municipal-600 rounded-lg hover:bg-municipal-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新计算
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.normal }} />
                <span className="text-gray-600">正常 <span className="font-semibold text-gray-900">{stats.normal}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.abnormal }} />
                <span className="text-gray-600">异常 <span className="font-semibold text-gray-900">{stats.abnormal}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.over_capacity }} />
                <span className="text-gray-600">超限 <span className="font-semibold text-gray-900">{stats.overCapacity}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.complaint }} />
                <span className="text-gray-600">投诉 <span className="font-semibold text-gray-900">{stats.complaint}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">状态分布趋势</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: number, name: string) => [value, getStatusLabel(name)]}
                    />
                    <Legend
                      onClick={handleLegendClick}
                      formatter={(value: string) => (
                        <span
                          className={cn(
                            'cursor-pointer transition-colors',
                            activeLegend && activeLegend !== value ? 'text-gray-400' : 'text-gray-700'
                          )}
                        >
                          {getStatusLabel(value)}
                        </span>
                      )}
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    {CHART_DATA_KEYS.map((key) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={STATUS_COLORS[key]}
                        shape={<CustomBar />}
                        hide={activeLegend ? activeLegend !== key : false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {(selectedBarStatus || selectedBarDate) && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span className="text-gray-500">当前筛选：</span>
                  {selectedBarStatus && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[selectedBarStatus as ChartDataKey] }} />
                      {getStatusLabel(selectedBarStatus)}
                    </span>
                  )}
                  {selectedBarDate && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
                      <Clock className="w-3 h-3" />
                      {selectedBarDate}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedBarStatus(null);
                      setSelectedBarDate(null);
                      setActiveLegend(null);
                      highlightPoint(null);
                    }}
                    className="text-municipal-600 hover:text-municipal-700 ml-2"
                  >
                    清除筛选
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                公示清单
                <span className="ml-2 text-sm font-normal text-gray-500">
                  共 {filteredItems.length} 条
                </span>
              </h2>
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-municipal-600 border-t-transparent"></div>
                  <p className="mt-4 text-gray-500">加载中...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-500">暂无匹配的数据</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredItems.map(item => {
                    const isSelected = selectedItemId === item.id;
                    const street = getStreetByGisPointId(item.gisPointId);
                    const traceData = getFullTraceData(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          'p-4 rounded-lg border transition-all cursor-pointer',
                          isSelected
                            ? 'border-municipal-500 bg-municipal-50 ring-2 ring-municipal-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-gray-900 truncate">{item.schoolName}</h3>
                              <StatusBadge status={item.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {street}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {item.actualCount}/{item.capacity}人
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(item.createdAt)}
                              </div>
                            </div>
                            {item.remark && (
                              <p className="mt-2 text-sm text-gray-500 truncate">备注：{item.remark}</p>
                            )}
                            {traceData && (
                              <p className="mt-2 text-xs text-gray-400 truncate">
                                <Calculator className="inline w-3 h-3 mr-1" />
                                计算规则：{traceData.calculationRule.name} v{traceData.calculationRule.version}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">计算口径</h2>
                <select
                  value={selectedRuleId || ''}
                  onChange={(e) => selectRule(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
                >
                  {rules.map(rule => (
                    <option key={rule.id} value={rule.id}>
                      v{rule.version}
                    </option>
                  ))}
                </select>
              </div>

              {currentRule ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900">{currentRule.name}</h3>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calculator className="w-4 h-4" />
                        版本 {currentRule.version}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        生效于 {formatDate(currentRule.effectiveAt)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">参数配置</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-500">容量系数</td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {currentRule.parameters.baseCapacityPerSquareMeter}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-500">安全系数</td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {currentRule.parameters.safetyFactor}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-500">峰值系数</td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {currentRule.parameters.peakMultiplier}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-500">超限阈值</td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {currentRule.parameters.overCapacityThreshold}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-500">冲突距离</td>
                          <td className="py-2 text-right font-medium text-gray-900">
                            {currentRule.parameters.conflictDistanceMeters} 米
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">算法描述</h4>
                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-line">
                      {currentRule.algorithm}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Calculator className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p>暂无计算规则</p>
                </div>
              )}
            </div>

            {showOperationButtons && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">异常确认</h2>
                <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning-800">{selectedItem?.schoolName}</p>
                      <p className="text-sm text-warning-600 mt-1">
                        状态：{getStatusLabel(selectedItem?.status || '')}
                      </p>
                      {selectedItem?.remark && (
                        <p className="text-sm text-warning-600 mt-1">备注：{selectedItem.remark}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    驳回
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-municipal-600 rounded-lg hover:bg-municipal-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    确认
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="确认异常"
        message="请填写处理说明（换班说明）："
        confirmText="确认"
        cancelText="取消"
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirmModal(false);
          setOperationRemark('');
        }}
        showInput={true}
        inputValue={operationRemark}
        inputPlaceholder="请输入处理说明..."
        onInputChange={setOperationRemark}
      />

      <ConfirmModal
        isOpen={showRejectModal}
        title="驳回异常"
        message="请填写驳回说明（换班说明）："
        confirmText="驳回"
        cancelText="取消"
        onConfirm={handleReject}
        onCancel={() => {
          setShowRejectModal(false);
          setOperationRemark('');
        }}
        showInput={true}
        inputValue={operationRemark}
        inputPlaceholder="请输入驳回说明..."
        onInputChange={setOperationRemark}
        confirmButtonClass="bg-gray-600 hover:bg-gray-700"
      />
    </div>
  );
}
