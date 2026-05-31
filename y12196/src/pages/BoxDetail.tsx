import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, isPast, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft,
  Package,
  Shield,
  Truck,
  Edit3,
  AlertTriangle,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { useStore } from '@/store';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChangeHistoryList } from '@/components/common/ChangeHistoryList';

export function BoxDetail() {
  const { id: boxId } = useParams<{ id: string }>();
  const boxes = useStore((s) => s.boxes);
  const cities = useStore((s) => s.cities);
  const shipments = useStore((s) => s.shipments);
  const changeHistory = useStore((s) => s.changeHistory);
  const [editing, setEditing] = useState(false);

  const box = useMemo(() => boxes.find((b) => b.id === boxId), [boxes, boxId]);

  const boxShipments = useMemo(
    () => shipments.filter((s) => s.boxId === boxId),
    [shipments, boxId],
  );

  const cityMap = useMemo(() => {
    const map: Record<string, string> = {};
    cities.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [cities]);

  const boxChanges = useMemo(
    () =>
      changeHistory.filter(
        (r) => r.entityType === 'box' && r.entityId === boxId,
      ),
    [changeHistory, boxId],
  );

  if (!box) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package size={64} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-500 mb-2">未找到物资</h2>
        <p className="text-gray-400 mb-6">箱号 ID {boxId} 不存在</p>
        <Link
          to="/boxes"
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          返回物资清单
        </Link>
      </div>
    );
  }

  const insurance = box.insurance;
  let insuranceExpiryClass = '';
  let insuranceExpiryLabel = '';
  if (insurance) {
    const expireDate = new Date(insurance.expireDate);
    if (isPast(expireDate)) {
      insuranceExpiryClass = 'text-accent-danger font-semibold';
      insuranceExpiryLabel = '已过期';
    } else {
      const daysLeft = differenceInDays(expireDate, new Date());
      if (daysLeft <= 30) {
        insuranceExpiryClass = 'text-accent-warning font-semibold';
        insuranceExpiryLabel = `${daysLeft}天后过期`;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/boxes"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-text">物资详情</h1>
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
            to="/boxes"
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
              <Package size={24} className="text-primary-600" />
              <h2 className="text-2xl font-bold text-neutral-text">
                {box.boxNumber}
              </h2>
            </div>
            <p className="text-gray-600 ml-9">{box.description}</p>
          </div>
          <StatusBadge status={box.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-border">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">重量</span>
            <p className="text-lg font-semibold text-neutral-text mt-0.5">
              {box.weight} <span className="text-sm text-gray-400 font-normal">kg</span>
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">体积</span>
            <p className="text-lg font-semibold text-neutral-text mt-0.5">
              {box.volume} <span className="text-sm text-gray-400 font-normal">m³</span>
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">创建人</span>
            <div className="flex items-center gap-1.5 mt-1">
              <User size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-neutral-text">{box.createdBy}</p>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">创建时间</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock size={14} className="text-gray-400" />
              <p className="text-sm text-neutral-text">
                {format(new Date(box.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-primary-600" />
          <h3 className="text-lg font-bold text-neutral-text">保险信息</h3>
        </div>
        {insurance ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">保单号</span>
                <p className="text-sm font-medium text-neutral-text mt-0.5">
                  {insurance.policyNumber}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">保险公司</span>
                <p className="text-sm font-medium text-neutral-text mt-0.5">
                  {insurance.insurer}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">到期日期</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar size={14} className="text-gray-400" />
                  <p className={`text-sm font-medium ${insuranceExpiryClass || 'text-neutral-text'}`}>
                    {format(new Date(insurance.expireDate), 'yyyy-MM-dd', { locale: zhCN })}
                  </p>
                  {insuranceExpiryLabel && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        insuranceExpiryLabel === '已过期'
                          ? 'bg-red-100 text-accent-danger'
                          : 'bg-orange-100 text-accent-warning'
                      }`}
                    >
                      {insuranceExpiryLabel}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">保额</span>
                <p className="text-sm font-medium text-neutral-text mt-0.5">
                  ¥{insurance.coverageAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4 px-4 bg-yellow-50 rounded-md border border-yellow-200">
            <AlertTriangle size={20} className="text-accent-warning" />
            <div>
              <p className="font-medium text-yellow-800">暂无保险</p>
              <p className="text-sm text-yellow-600">该物资尚未绑定保险保单，建议尽快添加保险</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Truck size={20} className="text-primary-600" />
          <h3 className="text-lg font-bold text-neutral-text">运输历史</h3>
        </div>
        {boxShipments.length > 0 ? (
          <div className="space-y-3">
            {boxShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="flex items-center justify-between py-3 px-4 bg-neutral-bg rounded-md border border-neutral-border"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-neutral-text">
                    {cityMap[shipment.cityId] || shipment.cityId}
                  </span>
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
                </div>
                <StatusBadge status={shipment.status} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400">暂无运输记录</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card p-6">
        <h3 className="text-lg font-bold text-neutral-text mb-4">变更记录</h3>
        <ChangeHistoryList records={boxChanges} />
      </div>
    </div>
  );
}
