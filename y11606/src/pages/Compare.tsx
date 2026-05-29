import { useMemo } from 'react';
import { Card, Table, Button, Tag, Space, Popconfirm } from 'antd';
import { GitCompare, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store';
import { formatCurrency } from '@/utils/calculator';
import type { PrepaymentResult, ComparisonScheme } from '@/types';

export default function Compare() {
  const navigate = useNavigate();
  const { prepaymentResults, comparisonSchemes, removeComparisonScheme, clearComparisonSchemes, addComparisonScheme } = useAppStore();

  const schemesWithResults = useMemo(() => {
    return comparisonSchemes.map(scheme => ({
      ...scheme,
      result: prepaymentResults.find(r => r.id === scheme.resultId),
    })).filter(s => s.result) as (ComparisonScheme & { result: PrepaymentResult })[];
  }, [comparisonSchemes, prepaymentResults]);

  if (prepaymentResults.length === 0) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <GitCompare size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">暂无试算结果</h3>
          <p className="text-slate-400 mb-4">请先完成提前还款试算并保存结果</p>
          <Button type="primary" onClick={() => navigate('/calculator')}>
            去试算
          </Button>
        </Card>
      </div>
    );
  }

  const getBarChartOption = () => {
    const names = schemesWithResults.map(s => s.name);
    const savedInterest = schemesWithResults.map(s => s.result.interestSaved);
    const penalty = schemesWithResults.map(s => s.result.penaltyAmount);
    const netBenefit = schemesWithResults.map(s => s.result.netBenefit);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['节省利息', '违约金', '净收益'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: names },
      yAxis: { type: 'value', name: '金额(元)' },
      series: [
        { name: '节省利息', type: 'bar', data: savedInterest, itemStyle: { color: '#10b981' } },
        { name: '违约金', type: 'bar', data: penalty, itemStyle: { color: '#ef4444' } },
        { name: '净收益', type: 'bar', data: netBenefit, itemStyle: { color: '#3b82f6' } },
      ],
    };
  };

  const columns: ColumnsType<ComparisonScheme & { result: PrepaymentResult }> = [
    {
      title: '方案名称',
      dataIndex: 'name',
      fixed: 'left',
      width: 180,
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: record.color }} />
          {text}
        </div>
      ),
    },
    {
      title: '提前还款日期',
      dataIndex: ['result', 'params', 'prepaymentDate'],
      width: 120,
    },
    {
      title: '还款类型',
      dataIndex: ['result', 'params', 'prepaymentType'],
      width: 100,
      render: (v) => (v === 'full' ? '全部还款' : '部分还款'),
    },
    {
      title: '提前还款金额',
      dataIndex: ['result', 'params', 'prepaymentAmount'],
      width: 130,
      render: (v) => formatCurrency(v),
    },
    {
      title: '部分还款方式',
      dataIndex: ['result', 'params', 'partialOption'],
      width: 120,
      render: (v) => (v === 'reduce_payment' ? '减少月供' : v === 'reduce_term' ? '缩短期限' : '-'),
    },
    {
      title: '已还期数',
      dataIndex: ['result', 'periodAtPrepayment'],
      width: 80,
      render: (v) => `${v}期`,
    },
    {
      title: '剩余本金',
      dataIndex: ['result', 'remainingPrincipal'],
      width: 120,
      render: (v) => formatCurrency(v),
    },
    {
      title: '节省利息',
      dataIndex: ['result', 'interestSaved'],
      width: 120,
      render: (v) => <span className="text-emerald-600 font-medium">{formatCurrency(v)}</span>,
    },
    {
      title: '违约金',
      dataIndex: ['result', 'penaltyAmount'],
      width: 100,
      render: (v) => <span className={v > 0 ? 'text-red-600' : 'text-slate-400'}>{v > 0 ? formatCurrency(v) : '无'}</span>,
    },
    {
      title: '净收益',
      dataIndex: ['result', 'netBenefit'],
      width: 120,
      render: (v) => (
        <span className={`font-semibold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: '新月供',
      dataIndex: ['result', 'newMonthlyPayment'],
      width: 120,
      render: (v) => (v !== undefined ? formatCurrency(v) : '-'),
    },
    {
      title: '新期限',
      dataIndex: ['result', 'newTerm'],
      width: 80,
      render: (v) => (v !== undefined ? `${v}期` : '-'),
    },
    {
      title: '风险提示',
      dataIndex: ['result', 'warnings'],
      width: 100,
      render: (warnings) => {
        if (!warnings || warnings.length === 0) return <Tag color="green">无</Tag>;
        const hasError = warnings.some(w => w.level === 'error');
        const hasWarning = warnings.some(w => w.level === 'warning');
        return hasError ? <Tag color="red">需注意</Tag> : hasWarning ? <Tag color="orange">有提示</Tag> : <Tag color="blue">有信息</Tag>;
      },
    },
    {
      title: '操作',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Popconfirm title="移出对比?" onConfirm={() => removeComparisonScheme(record.id)}>
          <Button type="link" danger size="small" icon={<Trash2 size={14} />}>移出</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">方案对比</h1>
          <p className="text-slate-500 text-sm mt-1">并排对比多个提前还款方案，找出最优选择</p>
        </div>
        <Space>
          <Button
            icon={<Plus size={14} />}
            onClick={() => {
              prepaymentResults.forEach((r, idx) => {
                if (!comparisonSchemes.find(s => s.resultId === r.id)) {
                  addComparisonScheme({
                    resultId: r.id,
                    name: r.name || `方案${idx + 1}`,
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                  });
                }
              });
            }}
          >
            全部加入
          </Button>
          <Button onClick={() => navigate('/calculator')}>去试算</Button>
          <Popconfirm title="清空所有对比方案?" onConfirm={clearComparisonSchemes}>
            <Button danger>清空</Button>
          </Popconfirm>
        </Space>
      </div>

      {schemesWithResults.length === 0 ? (
        <Card className="text-center py-16">
          <GitCompare size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">暂无对比方案</h3>
          <p className="text-slate-400 mb-4">请在试算页面将方案加入对比</p>
          <div className="flex justify-center gap-4">
            {prepaymentResults.slice(0, 3).map((r, idx) => (
              <Button
                key={r.id}
                icon={<Plus size={14} />}
                onClick={() => addComparisonScheme({
                  resultId: r.id,
                  name: r.name || `方案${idx + 1}`,
                  color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                })}
              >
                加入「{r.name || `方案${idx + 1}`}」
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Card title="指标对比图表" className="mb-6">
            <ReactECharts option={getBarChartOption()} style={{ height: 350 }} />
          </Card>

          <Card
            title={`方案详情对比（${schemesWithResults.length}个方案）`}
            extra={
              <span className="text-sm text-slate-500">
                横向滚动查看完整数据
              </span>
            }
          >
            <Table
              columns={columns}
              dataSource={schemesWithResults}
              rowKey="id"
              scroll={{ x: 1400 }}
              size="middle"
              pagination={false}
            />
          </Card>

          <Card title="最优方案推荐" className="mt-6">
            {schemesWithResults.length > 0 && (
              <>
                {(() => {
                  const sorted = [...schemesWithResults].sort((a, b) => b.result.netBenefit - a.result.netBenefit);
                  const best = sorted[0];
                  return (
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <Tag color="green" className="mb-3">推荐方案</Tag>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">{best.name}</h3>
                          <p className="text-slate-600 mb-4">
                            {best.result.params.prepaymentType === 'full' ? '全部提前还款' : `提前还款 ${formatCurrency(best.result.params.prepaymentAmount)}`}
                            {best.result.params.partialOption && `，${best.result.params.partialOption === 'reduce_payment' ? '减少月供' : '缩短期限'}`}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-slate-500">净收益</p>
                              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(best.result.netBenefit)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">节省利息</p>
                              <p className="text-lg font-semibold text-emerald-600">{formatCurrency(best.result.interestSaved)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">违约金</p>
                              <p className="text-lg font-semibold text-red-500">{formatCurrency(best.result.penaltyAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">新期限</p>
                              <p className="text-lg font-semibold text-slate-700">{best.result.newTerm !== undefined ? `${best.result.newTerm}期` : '结清'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {best.result.warnings.length > 0 && (
                            <div className="text-xs text-amber-600">
                              <p>有 {best.result.warnings.length} 个风险提示需要注意</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
