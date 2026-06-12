import React from 'react';
import {
  FileText, Calculator, AlertTriangle, CheckCircle2, XCircle, Clock, Database, Settings, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnomalyTypeBadge, SeverityBadge, StatusBadge } from '@/components/common/StatusBadge';
import { getAnomalyTypeLabel } from '@/utils/anomaly';
import type { Anomaly, UnitMismatch, DirectionReversal, ThresholdAnomaly } from '@/types';

export const ReviewPanel: React.FC = () => {
  const {
    selectedAnomalyId, anomalies, parameterVersion, confirmAnomaly, dismissAnomaly } =
    useAppStore();

  const selectedAnomaly = anomalies.find((a) => a.id === selectedAnomalyId) || null;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderUnitMismatchDetails = (details: UnitMismatch) => (
    <div className="space-y-3">
      <div className="p-3 bg-deep-sea-700 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-deep-sea-100 mb-2">
          <Calculator className="w-4 h-4 text-ocean-400" />
          换算过程
        </div>
        <div className="flex items-center gap-3 text-sm font-mono">
          <span className="text-alert-red">{details.valueBefore}</span>
          <span className="text-deep-sea-400">{details.actualUnit}</span>
          <ArrowRight className="w-4 h-4 text-deep-sea-500" />
          <span className="text-alert-green">{details.valueAfter.toFixed(2)}</span>
          <span className="text-deep-sea-200">{details.expectedUnit}</span>
        </div>
        <div className="text-xs text-deep-sea-400 mt-2">
          换算因子: ×{details.conversionFactor.toFixed(4)}
        </div>
      </div>

      <div className="p-3 bg-alert-yellow/10 border border-alert-yellow/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-alert-yellow mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-alert-yellow">
              数量级偏差
            </div>
            <div className="text-xs text-deep-sea-200 mt-1">
              原始单位 {details.actualUnit} 与标准单位{' '}
              {details.expectedUnit} 不一致，导致{' '}
              {Math.abs(details.conversionFactor) >= 1000
                ? '存在1000倍'
                : Math.abs(details.conversionFactor) >= 10
                ? '存在10倍'
                : '存在'}
              数量级偏差。
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDirectionReversalDetails = (details: DirectionReversal) => (
    <div className="space-y-3">
      <div className="p-3 bg-alert-yellow/10 border border-alert-yellow/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-alert-yellow mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-alert-yellow mb-2">
              待确认：方向可能写反
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-deep-sea-300">检测到方向:</span>
              <span className="font-mono text-alert-red font-bold">
                {details.detectedDirection}
              </span>
            </div>
            <div className="text-xs text-deep-sea-400 mt-1">
              与历史主导方向相反，请人工确认
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-deep-sea-700 rounded-lg">
        <div className="text-sm font-medium text-deep-sea-100 mb-2">
          可能原因
        </div>
        <ul className="space-y-1">
          {details.possibleCauses.map((cause, idx) => (
            <li key={idx} className="text-xs text-deep-sea-300 flex items-start gap-2">
              <span className="text-ocean-400">•</span>
              {cause}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 bg-deep-sea-700 rounded-lg">
        <div className="text-sm font-medium text-deep-sea-100 mb-2">
          影响范围
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
          <div className="text-deep-sea-400">开始时间</div>
          <div className="text-deep-sea-100 font-mono">
            {formatTime(details.impactScope.startTime)}
          </div>
        </div>
          <div>
            <div className="text-deep-sea-400">结束时间</div>
            <div className="text-deep-sea-100 font-mono">
              {formatTime(details.impactScope.endTime)}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-deep-sea-400">受影响记录</div>
            <div className="text-deep-sea-100">
              {details.impactScope.affectedCount} 条记录
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );

  const renderThresholdDetails = (details: ThresholdAnomaly) => (
    <div className="space-y-3">
      <div className="p-3 bg-deep-sea-700 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-deep-sea-100 mb-2">
          <Calculator className="w-4 h-4 text-ocean-400" />
          阈值配置
        </div>
        <div className="flex items-center gap-3">
          <span className="text-deep-sea-300">范围:</span>
          <span className="font-mono text-deep-sea-100">
            {details.threshold.min} - {details.threshold.max}
          </span>
          <span className="text-deep-sea-400">{selectedAnomaly?.data.unit}</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-deep-sea-300">当前值:</span>
          <span className={`font-mono font-bold text-alert-red">
            {details.value.toFixed(2)} {selectedAnomaly?.data.unit}
          </span>
        </div>
      </div>

      <div className="p-3 bg-alert-red/10 border border-alert-red/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-alert-red mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-alert-red">
              {details.type === 'above_max' ? '超过上限' : '低于下限'}
            </div>
            <div className="text-xs text-deep-sea-200 mt-1">
              超出阈值{' '}
              {details.type === 'above_max'
                ? (details.value - details.threshold.max).toFixed(2)
                : (details.threshold.min - details.value).toFixed(2)}{' '}
              {selectedAnomaly?.data.unit}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnomalyDetails = (anomaly: Anomaly) => {
    switch (anomaly.type) {
      case 'unit_mismatch':
        return renderUnitMismatchDetails(anomaly.details as UnitMismatch);
      case 'direction_reversal':
        return renderDirectionReversalDetails(
          anomaly.details as DirectionReversal);
      case 'threshold':
        return renderThresholdDetails(anomaly.details as ThresholdAnomaly);
      default:
        return null;
    }
  };

  if (!selectedAnomaly) {
    return (
      <div className="h-full flex flex-col bg-deep-sea-600/50 border border-deep-sea-500 rounded-lg">
        <div className="p-3 border-b border-deep-sea-500">
          <h3 className="font-medium text-deep-sea-100">复核面板</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-deep-sea-400 p-6">
          <div className="text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">选择一个异常点查看详情</p>
            <p className="text-xs mt-1 mt-1">点击图表或异常列表中的异常记录</p>
          </div>
        </div>

        <div className="p-3 border-t border-deep-sea-500">
          <div className="flex items-center gap-2 text-xs text-deep-sea-400 mb-2">
          <Settings className="w-4 h-4" />
          <span>当前参数版本</span>
        </div>
        <div className="text-sm font-mono text-deep-sea-200">
          {parameterVersion.version}
        </div>
        <div className="text-xs text-deep-sea-500 mt-1">
          创建于 {formatDate(parameterVersion.createdAt)}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-deep-sea-600/50 border border-deep-sea-500 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-deep-sea-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-deep-sea-100">复核面板</h3>
          <StatusBadge status={selectedAnomaly.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AnomalyTypeBadge type={selectedAnomaly.type} />
          <SeverityBadge severity={selectedAnomaly.severity} />
          <span className="text-xs text-deep-sea-400 font-mono">
            {formatTime(selectedAnomaly.timestamp)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <div className="p-3 bg-deep-sea-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-deep-sea-100 mb-2">
          <FileText className="w-4 h-4 text-ocean-400" />
          异常说明
        </div>
          <p className="text-sm text-deep-sea-200">
            {selectedAnomaly.explanation}
          </p>
        </div>

        {renderAnomalyDetails(selectedAnomaly)}

        <div className="p-3 bg-deep-sea-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-deep-sea-100 mb-2">
          <Calculator className="w-4 h-4 text-ocean-400" />
          计算口径
        </div>
          <p className="text-sm text-deep-sea-200 font-mono">
            {selectedAnomaly.calculationNote}
          </p>
        </div>

        <div className="p-3 bg-deep-sea-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-deep-sea-100 mb-2">
          <Database className="w-4 h-4 text-ocean-400" />
          原始日志
        </div>
          <div className="bg-deep-sea-800 rounded p-3 font-mono text-xs text-deep-sea-200 overflow-x-auto">
            <div className="text-deep-sea-400 mb-1">
              // 来源: {selectedAnomaly.data.rawLog.source}
            </div>
            <div>行号: {selectedAnomaly.data.rawLog.lineNumber}</div>
            <div className="mt-2 text-alert-cyan">
              {selectedAnomaly.data.rawLog.rawValue}{' '}
              {selectedAnomaly.data.rawLog.rawUnit}
              {selectedAnomaly.data.rawLog.rawDirection &&
                ` ${selectedAnomaly.data.rawLog.rawDirection}`}
            </div>
          </div>
          <div className="mt-2 text-xs text-deep-sea-400">
            <span className="text-deep-sea-300">标准化后:</span>{' '}
            <span className="text-alert-green">
              {selectedAnomaly.data.value.toFixed(2)}{' '}
              {selectedAnomaly.data.unit}
            </span>
            {selectedAnomaly.data.direction && (
              <span> {selectedAnomaly.data.direction}</span>
            )}
          </div>
        </div>

        <div className="p-3 bg-deep-sea-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-deep-sea-100 mb-2">
          <Settings className="w-4 h-4 text-ocean-400" />
          参数版本
        </div>
          <div className="text-xs text-deep-sea-300 space-y-1">
            <div className="flex justify-between">
              <span>版本号</span>
              <span className="font-mono text-deep-sea-100">
                {parameterVersion.version}
              </span>
            </div>
            <div className="flex justify-between">
              <span>创建时间</span>
              <span className="font-mono text-deep-sea-100">
                {formatDate(parameterVersion.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>单位规则</span>
              <span className="text-deep-sea-100">
                {parameterVersion.unitRules.length} 类
              </span>
            </div>
            <div className="flex justify-between">
              <span>阈值配置</span>
              <span className="text-deep-sea-100">
                {parameterVersion.thresholds.length} 项
              </span>
            </div>
          </div>
        </div>
      </div>

      {selectedAnomaly.status === 'pending' && (
        <div className="p-3 border-t border-deep-sea-500 flex gap-2">
          <button
            onClick={() => confirmAnomaly(selectedAnomaly.id)}
            className="flex-1 btn-success flex items-center justify-center gap-2 text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            确认异常
          </button>
          <button
            onClick={() => dismissAnomaly(selectedAnomaly.id)}
            className="flex-1 btn-danger flex items-center justify-center gap-2 text-sm"
          >
            <XCircle className="w-4 h-4" />
            忽略
          </button>
        </div>
      )}
    </div>
  );
};
