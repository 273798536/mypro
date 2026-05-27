import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Edit, Calendar, Server, Cloud, Share2, Clock, User, ChevronRight } from 'lucide-react';
import { useAmortizationStore } from '@/store/amortizationStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnomalyAlert } from '@/components/ui/AnomalyAlert';
import { PageContainer } from '@/components/layout/PageContainer';

export default function AmortizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    amortizationRecords,
    projects,
    anomalies,
    corrections,
    reservedInstances,
    sharedGateways,
    cloudBills,
  } = useAmortizationStore();

  const record = amortizationRecords.find((r) => r.id === id);
  const project = projects.find((p) => p.id === record?.projectId);
  const recordAnomalies = anomalies.filter((a) => a.amortizationId === id);
  const recordCorrections = corrections
    .filter((c) => c.targetType === 'amortization' && c.targetId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const reservedInstance = record?.sources.reservedInstanceId
    ? reservedInstances.find((ri) => ri.id === record.sources.reservedInstanceId)
    : null;

  const sharedGateway = record?.sources.sharedGatewayId
    ? sharedGateways.find((sg) => sg.id === record.sources.sharedGatewayId)
    : null;

  const relatedBill = cloudBills.find((bill) => bill.billDate.startsWith(record?.period || ''));

  if (!record || !project) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-500">未找到该摊销记录</p>
        </div>
      </PageContainer>
    );
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <PageContainer
      breadcrumbs={[
        { label: '摊销管理', href: '/' },
        { label: `${project.name} - ${record.period}` },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {project.name} - {record.period} 摊销详情
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              创建于 {formatDate(record.createdAt)} · 最后更新于 {formatDate(record.updatedAt)}
            </p>
          </div>
          <Button onClick={() => navigate(`/amortization/${id}/edit`)}>
            <Edit size={16} />
            编辑
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="基本信息" icon={<Calendar size={18} className="text-primary-600" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">项目名称</p>
                  <p className="text-base font-medium text-neutral-900 mt-1">{project.name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">项目编码</p>
                  <p className="text-base font-medium text-neutral-900 mt-1">{project.code}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">期间</p>
                  <p className="text-base font-medium text-neutral-900 mt-1">{record.period}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">负责人</p>
                  <p className="text-base font-medium text-neutral-900 mt-1">{project.owner}</p>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4">
                <p className="text-sm font-medium text-neutral-700 mb-3">成本明细</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">预留抵扣</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {formatMoney(record.reservedDeduction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">共享分摊</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {formatMoney(record.sharedAllocation)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">直接成本</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {formatMoney(record.directCost)}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-neutral-200 pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700">总计</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatMoney(record.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {record.tags.length > 0 && (
                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-sm font-medium text-neutral-700 mb-3">标签</p>
                  <div className="flex flex-wrap gap-2">
                    {record.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-neutral-100 text-xs text-neutral-600"
                      >
                        {tag.key}: {tag.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="异常标注" icon={<Server size={18} className="text-amber-500" />}>
            {recordAnomalies.length > 0 ? (
              <div className="space-y-3">
                {recordAnomalies.map((anomaly) => (
                  <AnomalyAlert
                    key={anomaly.id}
                    severity={anomaly.severity}
                    title={anomaly.description}
                    details={
                      anomaly.amount
                        ? `涉及金额：${formatMoney(anomaly.amount)}，检测时间：${formatDate(anomaly.detectedAt)}`
                        : `检测时间：${formatDate(anomaly.detectedAt)}`
                    }
                    collapsible
                    defaultExpanded={!anomaly.resolved}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <Server size={24} className="text-green-500" />
                </div>
                <p className="text-sm text-neutral-500">暂无异常记录</p>
              </div>
            )}
          </Card>

          <Card title="来源追溯" icon={<Cloud size={18} className="text-blue-500" />}>
            <div className="space-y-4">
              {relatedBill && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">云账单</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-blue-800">账单ID: {relatedBill.id}</p>
                    <p className="text-sm text-blue-800">
                      账单期间: {formatDate(relatedBill.billDate).slice(0, 7)}
                    </p>
                    <p className="text-sm text-blue-800">总金额: {formatMoney(relatedBill.totalAmount)}</p>
                  </div>
                </div>
              )}

              {reservedInstance && (
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Server size={16} className="text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">预留实例</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-purple-800">实例类型: {reservedInstance.instanceType}</p>
                    <p className="text-sm text-purple-800">
                      区域: {reservedInstance.region} · 数量: {reservedInstance.count}台
                    </p>
                    <p className="text-sm text-purple-800">
                      有效期: {formatDate(reservedInstance.effectiveDate).slice(0, 7)} ~{' '}
                      {formatDate(reservedInstance.expirationDate).slice(0, 7)}
                    </p>
                    <p className="text-sm text-purple-800">总成本: {formatMoney(reservedInstance.totalCost)}</p>
                  </div>
                </div>
              )}

              {sharedGateway && (
                <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 size={16} className="text-teal-600" />
                    <span className="text-sm font-medium text-teal-900">共享网关</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-teal-800">网关名称: {sharedGateway.name}</p>
                    <p className="text-sm text-teal-800">类型: {sharedGateway.type}</p>
                    <p className="text-sm text-teal-800">
                      分摊规则: {sharedGateway.allocationRule}
                    </p>
                    <p className="text-sm text-teal-800">总成本: {formatMoney(sharedGateway.totalCost)}</p>
                  </div>
                </div>
              )}

              {!relatedBill && !reservedInstance && !sharedGateway && (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-500">暂无来源信息</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="修正历史" icon={<Clock size={18} className="text-neutral-500" />}>
            {recordCorrections.length > 0 ? (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-neutral-200" />
                <div className="space-y-4">
                  {recordCorrections.map((correction, index) => (
                    <div key={correction.id} className="relative pl-8">
                      <div
                        className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                          index === 0
                            ? 'bg-primary-500 border-primary-500'
                            : 'bg-white border-neutral-300'
                        }`}
                      />
                      <div className="bg-neutral-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-neutral-500" />
                            <span className="text-sm font-medium text-neutral-900">
                              {correction.operator}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-500">
                            {formatDate(correction.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 mb-1">
                          <span className="font-medium">原因：</span>
                          {correction.reason}
                        </p>
                        <p className="text-sm text-neutral-600">
                          <span className="font-medium">变更：</span>
                          {correction.changeSummary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} className="text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500">暂无修正记录</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
