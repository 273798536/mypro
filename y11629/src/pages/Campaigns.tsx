import { useLedgerStore } from '../store/useLedgerStore';
import { Tag, Calendar, Clock, DollarSign, Users, GitCompare, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';
import { Campaign } from '../types';

export default function Campaigns() {
  const { campaigns, stats, subsidies } = useLedgerStore();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">活动版本</h1>
        <p className="text-navy-400 text-sm mt-1">
          管理积分活动配置、规则版本和补贴标准
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {campaigns.map(campaign => {
          const campaignCost = stats.costByCampaign.find(c => c.campaignId === campaign.id);
          const campaignSubsidies = subsidies.filter(s => s.campaignId === campaign.id);
          const now = new Date();
          const start = new Date(campaign.startDate);
          const end = new Date(campaign.endDate);
          const isActive = campaign.isActive && now >= start && now <= end;

          return (
            <div
              key={campaign.id}
              className={`cli-card cursor-pointer transition-all hover:border-navy-500 ${
                selectedCampaign?.id === campaign.id ? 'border-navy-400 ring-1 ring-navy-400' : ''
              }`}
              onClick={() => setSelectedCampaign(selectedCampaign?.id === campaign.id ? null : campaign)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-900/30' : 'bg-navy-800'}`}>
                    <Tag className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-navy-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{campaign.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-navy-400">{campaign.version}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                        isActive ? 'bg-emerald-900/30 text-emerald-400' : 'bg-navy-800 text-navy-400'
                      }`}>
                        {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {isActive ? '进行中' : '未开始/已结束'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-navy-500 transition-transform ${
                  selectedCampaign?.id === campaign.id ? 'rotate-90' : ''
                }`} />
              </div>

              <p className="text-navy-400 text-sm mb-3">{campaign.description}</p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-navy-800/50 rounded p-2 text-center">
                  <div className="text-amber-400 font-mono font-semibold text-lg">×{campaign.pointRate}</div>
                  <div className="text-[10px] text-navy-400">积分倍率</div>
                </div>
                <div className="bg-navy-800/50 rounded p-2 text-center">
                  <div className="text-emerald-400 font-mono font-semibold text-lg">{(campaign.subsidyRate * 100).toFixed(0)}%</div>
                  <div className="text-[10px] text-navy-400">补贴费率</div>
                </div>
                <div className="bg-navy-800/50 rounded p-2 text-center">
                  <div className="text-blue-400 font-mono font-semibold text-lg">¥{campaign.subsidyCap}</div>
                  <div className="text-[10px] text-navy-400">单笔上限</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-navy-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(campaign.startDate), 'MM/dd', { locale: zhCN })} - {format(new Date(campaign.endDate), 'MM/dd', { locale: zhCN })}
                </div>
                {campaignCost && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    成本 ¥{campaignCost.cost.toFixed(0)}
                  </div>
                )}
              </div>

              {selectedCampaign?.id === campaign.id && (
                <div className="mt-4 pt-4 border-t border-navy-700 animate-fade-in">
                  <h4 className="text-sm font-semibold text-navy-200 mb-3 flex items-center gap-2">
                    <GitCompare className="w-4 h-4" />
                    活动规则
                  </h4>
                  <div className="space-y-2">
                    {campaign.rules.map(rule => (
                      <div key={rule.id} className="bg-navy-800/50 rounded p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-navy-300">
                            {rule.type === 'points_multiplier' ? '积分倍率' :
                             rule.type === 'merchant_include' ? '包含商户' :
                             rule.type === 'merchant_exclude' ? '排除商户' :
                             rule.type === 'amount_threshold' ? '金额门槛' : rule.type}
                          </span>
                          <span className="text-white font-mono">
                            {Array.isArray(rule.value) ? rule.value.length + ' 个商户' : rule.value}
                          </span>
                        </div>
                        {rule.condition && (
                          <p className="text-xs text-navy-500 mt-1">{rule.condition}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {campaignSubsidies.length > 0 && (
                    <>
                      <h4 className="text-sm font-semibold text-navy-200 mt-4 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        关联商户补贴
                      </h4>
                      <div className="space-y-2">
                        {campaignSubsidies.map(s => (
                          <div key={s.id} className="bg-navy-800/50 rounded p-2 text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-navy-400" />
                              <span className="text-navy-200">{s.merchantName}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-400 font-mono text-sm">
                                {(s.rate * 100).toFixed(1)}%
                              </span>
                              <span className="text-navy-500 text-xs ml-2">
                                上限 ¥{s.capAmount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mt-4 flex items-center gap-2 text-xs text-navy-500">
                    <Clock className="w-3 h-3" />
                    创建于 {format(new Date(campaign.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cli-card">
        <h3 className="text-white font-semibold mb-4">补贴配置列表</h3>
        <div className="overflow-x-auto">
          <table className="cli-table">
            <thead>
              <tr>
                <th>商户</th>
                <th>活动</th>
                <th>补贴费率</th>
                <th>单笔上限</th>
                <th>生效时间</th>
                <th>到期时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {subsidies.map(s => {
                const campaign = campaigns.find(c => c.id === s.campaignId);
                const now = new Date();
                const isActive = s.isActive && now >= new Date(s.effectiveDate) && now <= new Date(s.expiryDate);
                return (
                  <tr key={s.id}>
                    <td className="text-navy-100">{s.merchantName}</td>
                    <td className="text-navy-300 text-sm">{campaign?.name || '-'}</td>
                    <td className="font-mono text-emerald-400">{(s.rate * 100).toFixed(1)}%</td>
                    <td className="font-mono text-white">¥{s.capAmount}</td>
                    <td className="font-mono text-navy-300 text-xs">{s.effectiveDate}</td>
                    <td className="font-mono text-navy-300 text-xs">{s.expiryDate}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        isActive ? 'bg-emerald-900/30 text-emerald-400' : 'bg-navy-800 text-navy-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-navy-500'}`} />
                        {isActive ? '生效中' : '未生效'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
