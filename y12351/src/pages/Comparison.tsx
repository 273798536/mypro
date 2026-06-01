import { useState } from 'react';
import { Card, Select, Table, Tag, Tooltip } from 'antd';
import { useParameterStore } from '../store/parameterStore';
import { StatusBadge } from '../components/StatusBadge';
import {
  TISSUE_TYPE_LABELS,
  ARTIFACT_TYPE_LABELS,
  ANOMALY_TYPE_LABELS,
} from '../types';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

export const Comparison = () => {
  const {
    parameters,
    selectedParameterId,
    setSelectedParameter,
    getParameterResults,
    getParameterAnomalies,
  } = useParameterStore();

  const selectedParam = parameters.find((p) => p.id === selectedParameterId);
  const results = selectedParameterId ? getParameterResults(selectedParameterId) : [];
  const anomalies = selectedParameterId ? getParameterAnomalies(selectedParameterId) : [];

  const comparisonColumns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
      width: 150,
      className: 'font-medium text-slate-600',
    },
    ...results.map((r) => ({
      title: r.interfaceName,
      dataIndex: r.interfaceName,
      key: r.interfaceName,
      render: (value: any, record: any) => {
        const allValues = results.map((res) => res.resultData[record.key as keyof typeof res.resultData]);
        const isMin = value === Math.min(...allValues.filter((v) => typeof v === 'number'));
        const isMax = value === Math.max(...allValues.filter((v) => typeof v === 'number'));

        let className = '';
        if (record.key === 'qualityScore' || record.key === 'snr' || record.key === 'cnr' || record.key === 'tissueContrast') {
          className = isMax ? 'text-green-600 font-bold' : isMin ? 'text-amber-600' : '';
        } else if (record.key === 'scanTime' || record.key === 'artifactProbability') {
          className = isMin ? 'text-green-600 font-bold' : isMax ? 'text-amber-600' : '';
        }

        return <span className={className}>{value}</span>;
      },
    })),
  ];

  const comparisonData = [
    {
      key: 'snr',
      metric: '信噪比 (SNR)',
      ...Object.fromEntries(results.map((r) => [r.interfaceName, r.resultData.snr?.toFixed(1) || '-'])),
    },
    {
      key: 'cnr',
      metric: '对比度噪声比 (CNR)',
      ...Object.fromEntries(results.map((r) => [r.interfaceName, r.resultData.cnr?.toFixed(1) || '-'])),
    },
    {
      key: 'tissueContrast',
      metric: '组织对比度',
      ...Object.fromEntries(results.map((r) => [r.interfaceName, r.resultData.tissueContrast?.toFixed(2) || '-'])),
    },
    {
      key: 'scanTime',
      metric: '扫描时间 (秒)',
      ...Object.fromEntries(results.map((r) => [r.interfaceName, r.resultData.scanTime || '-'])),
    },
    {
      key: 'artifactProbability',
      metric: '伪影概率 (%)',
      ...Object.fromEntries(results.map((r) => [
        r.interfaceName,
        ((r.resultData.artifactProbability || 0) * 100).toFixed(1),
      ])),
    },
    {
      key: 'qualityScore',
      metric: '质量分数',
      ...Object.fromEntries(results.map((r) => [r.interfaceName, r.resultData.qualityScore || '-'])),
    },
    {
      key: 'confidence',
      metric: '置信度',
      ...Object.fromEntries(results.map((r) => [r.interfaceName, (r.confidence * 100).toFixed(0) + '%'])),
    },
    {
      key: 'recommended',
      metric: '推荐状态',
      ...Object.fromEntries(results.map((r) => [
        r.interfaceName,
        r.resultData.recommended ? (
          <Tag color="success" icon={<CheckCircle className="w-3 h-3" />}>
            推荐
          </Tag>
        ) : (
          <Tag color="error" icon={<XCircle className="w-3 h-3" />}>
            不推荐
          </Tag>
        ),
      ])),
    },
  ];

  const radarChart = {
    tooltip: {},
    legend: {
      data: results.map((r) => r.interfaceName),
      bottom: 0,
    },
    radar: {
      indicator: [
        { name: 'SNR', max: 150 },
        { name: 'CNR', max: 60 },
        { name: '对比度', max: 1 },
        { name: '扫描效率', max: 1 },
        { name: '质量分数', max: 100 },
      ],
    },
    series: [
      {
        type: 'radar',
        data: results.map((r) => ({
          value: [
            r.resultData.snr || 0,
            r.resultData.cnr || 0,
            r.resultData.tissueContrast || 0,
            1 - (r.resultData.scanTime || 0) / 400,
            r.resultData.qualityScore || 0,
          ],
          name: r.interfaceName,
        })),
      },
    ],
    color: ['#3B82F6', '#10B981', '#F59E0B'],
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">参数对比</h1>
        <p className="text-slate-500 mt-1">多接口计算结果对比分析，自动检测冲突和差异</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-slate-600 font-medium">选择参数：</span>
        <Select
          value={selectedParameterId}
          onChange={setSelectedParameter}
          style={{ width: 320 }}
          placeholder="请选择一个扫描参数"
          options={parameters.map((p) => ({
            label: `${p.id} - ${p.scanType}`,
            value: p.id,
          }))}
        />
        {selectedParam && <StatusBadge type="scan" status={selectedParam.status} />}
      </div>

      {selectedParam && (
        <>
          <Card title="基本参数信息">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-slate-500 text-sm">扫描类型</p>
                <p className="text-lg font-semibold text-slate-800">{selectedParam.scanType}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">TR / TE</p>
                <p className="text-lg font-semibold text-slate-800">
                  {selectedParam.tr}ms / {selectedParam.te}ms
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">组织类型</p>
                <p className="text-lg font-semibold text-slate-800">
                  {selectedParam.tissueType ? TISSUE_TYPE_LABELS[selectedParam.tissueType] : '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">伪影标签</p>
                <p className="text-lg font-semibold text-slate-800">
                  {selectedParam.artifactLabel ? ARTIFACT_TYPE_LABELS[selectedParam.artifactLabel] : '-'}
                </p>
              </div>
            </div>
          </Card>

          {anomalies.length > 0 && (
            <Card
              title={
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>检测到 {anomalies.length} 个异常</span>
                </div>
              }
              className="border-amber-200 bg-amber-50/30"
            >
              <div className="space-y-3">
                {anomalies.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-100"
                  >
                    <StatusBadge type="severity" status={a.severity} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">
                          {ANOMALY_TYPE_LABELS[a.type]}
                        </span>
                        <StatusBadge type="anomaly" status={a.status} />
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                      {a.affectedInterfaces && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500">影响接口：</span>
                          {a.affectedInterfaces.map((iface) => (
                            <Tag key={iface} color="blue">
                              {iface}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                    <Tooltip title="可前往异常清单页处理">
                      <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-6">
                <Card title="多维度对比雷达图">
                  <ReactECharts option={radarChart} style={{ height: 300 }} />
                </Card>
                <Card title="接口推荐统计">
                  <div className="space-y-4">
                    {results.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              r.resultData.recommended ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="font-medium text-slate-700">{r.interfaceName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-500">
                            置信度 {(r.confidence * 100).toFixed(0)}%
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              r.resultData.recommended
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.resultData.recommended ? '推荐' : '不推荐'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="详细指标对比">
                <Table
                  dataSource={comparisonData}
                  columns={comparisonColumns}
                  pagination={false}
                  bordered
                />
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <strong>说明：</strong> 表格中绿色标记为最优值，橙色为相对较差值。推荐状态由各接口独立判断。
                </div>
              </Card>
            </>
          ) : (
            <Card className="text-center py-12">
              <p className="text-slate-500">暂无计算结果，请先在参数录入页执行计算</p>
            </Card>
          )}
        </>
      )}

      {!selectedParam && (
        <Card className="text-center py-12">
          <p className="text-slate-500">请选择一个扫描参数查看对比结果</p>
        </Card>
      )}
    </div>
  );
};
