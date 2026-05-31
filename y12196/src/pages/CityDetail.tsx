import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft,
  MapPin,
  Edit3,
  Calendar,
  Building,
  User,
  Clock,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/store';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChangeHistoryList } from '@/components/common/ChangeHistoryList';

export function CityDetail() {
  const { id: cityId } = useParams<{ id: string }>();
  const cities = useStore((s) => s.cities);
  const shipments = useStore((s) => s.shipments);
  const boxes = useStore((s) => s.boxes);
  const changeHistory = useStore((s) => s.changeHistory);
  const [editing, setEditing] = useState(false);

  const city = useMemo(() => cities.find((c) => c.id === cityId), [cities, cityId]);

  const cityShipments = useMemo(
    () => shipments.filter((s) => s.cityId === cityId),
    [shipments, cityId],
  );

  const boxMap = useMemo(() => {
    const map: Record<string, { boxNumber: string; description: string }> = {};
    boxes.forEach((b) => {
      map[b.id] = { boxNumber: b.boxNumber, description: b.description };
    });
    return map;
  }, [boxes]);

  const cityChanges = useMemo(
    () =>
      changeHistory.filter(
        (r) => r.entityType === 'city' && r.entityId === cityId,
      ),
    [changeHistory, cityId],
  );

  if (!city) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <MapPin size={64} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-500 mb-2">未找到城市场次</h2>
        <p className="text-gray-400 mb-6">城市 ID {cityId} 不存在</p>
        <Link
          to="/cities"
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          返回城市场次列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/cities"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-text">城市详情</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing(!editing)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              editing
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-white text-gray-700 border border-neutral-border hover:bg-gray-50'
            }`}
          >
            <Edit3 size={16} />
            {editing ? '完成编辑' : '编辑'}
          </button>
          <Link
            to="/cities"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-neutral-border rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
            返回列表
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <MapPin size={24} className="text-primary-600" />
              <h2 className="text-2xl font-bold text-neutral-text">{city.name}</h2>
            </div>
          </div>
          <StatusBadge status={city.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-border">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">演出日期</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-neutral-text">
                {format(new Date(city.performanceDate), 'yyyy-MM-dd', { locale: zhCN })}
              </p>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">场地</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Building size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-neutral-text">{city.venue}</p>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">创建人</span>
            <div className="flex items-center gap-1.5 mt-1">
              <User size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-neutral-text">{city.createdBy}</p>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">创建时间</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock size={14} className="text-gray-400" />
              <p className="text-sm text-neutral-text">
                {format(new Date(city.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package size={20} className="text-primary-600" />
          <h3 className="text-lg font-bold text-neutral-text">关联物资</h3>
          <span className="text-sm text-gray-500">({cityShipments.length} 件)</span>
        </div>
        {cityShipments.length > 0 ? (
          <div className="space-y-3">
            {cityShipments.map((shipment) => {
              const boxInfo = boxMap[shipment.boxId];
              const missingSignature = !shipment.signatureDate && shipment.status === 'arrived';
              return (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between py-3 px-4 bg-neutral-bg rounded-md border border-neutral-border"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-neutral-text">
                      {boxInfo?.boxNumber || shipment.boxId}
                    </span>
                    <span className="text-xs text-gray-500">{boxInfo?.description}</span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>
                        到达: {shipment.arrivalDate
                          ? format(new Date(shipment.arrivalDate), 'yyyy-MM-dd', { locale: zhCN })
                          : '待定'}
                      </span>
                    </div>
                    {shipment.signatureDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>
                          签收: {format(new Date(shipment.signatureDate), 'yyyy-MM-dd', { locale: zhCN })}
                        </span>
                      </div>
                    )}
                    {shipment.receivedBy && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User size={12} />
                        <span>{shipment.receivedBy}</span>
                      </div>
                    )}
                    {missingSignature && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600">
                        <AlertTriangle size={14} className="text-orange-500" />
                        <span>未签收</span>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={shipment.status} size="sm" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400">暂无关联物资</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <h3 className="text-lg font-bold text-neutral-text mb-4">变更记录</h3>
        <ChangeHistoryList records={cityChanges} />
      </div>
    </div>
  );
}
