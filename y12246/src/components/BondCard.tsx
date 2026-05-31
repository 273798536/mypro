import React from 'react';
import { CreditCard, Building2, Star, Calendar, Percent, DollarSign } from 'lucide-react';
import { useCurrentLevel } from '../store/gameStore';

const BondCard: React.FC = () => {
  const level = useCurrentLevel();

  if (!level) return null;

  const { bondCard } = level;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{bondCard.name}</h3>
              <p className="text-slate-400 text-sm">债券代码：{bondCard.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-amber-400 font-semibold text-sm">{bondCard.rating}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Building2 className="w-3 h-3" />
              发行主体
            </div>
            <p className="font-medium text-sm">{bondCard.issuer}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <DollarSign className="w-3 h-3" />
              票面金额
            </div>
            <p className="font-medium text-sm">{bondCard.faceValue} 元</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Percent className="w-3 h-3" />
              票面利率
            </div>
            <p className="font-medium text-sm text-amber-400">{bondCard.couponRate}%</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Calendar className="w-3 h-3" />
              到期日期
            </div>
            <p className="font-medium text-sm">{bondCard.maturityDate}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-slate-400 text-xs mb-2">付息日期</p>
          <div className="flex flex-wrap gap-2">
            {bondCard.interestPaymentDates.map((date, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white/10 rounded text-xs font-medium"
              >
                {date}
              </span>
            ))}
          </div>
          {bondCard.putOptionDate && (
            <div className="mt-3">
              <p className="text-slate-400 text-xs mb-1">回售选择权日期</p>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                {bondCard.putOptionDate}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BondCard;
