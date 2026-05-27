import React from 'react';
import { TrendingUp, TrendingDown, Users, UserX, Info } from 'lucide-react';
import type { PredictionResult, UserState } from '../../types';
import { formatPercent } from '../../utils/cn';
import { Card } from '../common/Card';

interface ResultCardProps {
  prediction: PredictionResult;
  states: UserState[];
}

export const ResultCard: React.FC<ResultCardProps> = ({ prediction, states }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card hover>
        <Card.Content className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 mb-1">预测活跃率</p>
          <p className="text-3xl font-bold text-green-600">
            {formatPercent(prediction.activeRate)}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>{prediction.month}</span>
          </div>
        </Card.Content>
      </Card>

      <Card hover>
        <Card.Content className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
            <UserX className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm text-gray-500 mb-1">预测流失率</p>
          <p className="text-3xl font-bold text-red-600">
            {formatPercent(prediction.churnRate)}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2 text-sm text-red-500">
            <TrendingDown className="w-4 h-4" />
            <span>{prediction.month}</span>
          </div>
        </Card.Content>
      </Card>

      <Card hover className="lg:col-span-2">
        <Card.Content>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-gray-800">结果解读</h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {prediction.explanation}
          </p>
        </Card.Content>
      </Card>
    </div>
  );
};

interface DistributionChartProps {
  prediction: PredictionResult;
  states: UserState[];
}

export const DistributionChart: React.FC<DistributionChartProps> = ({ prediction, states }) => {
  return (
    <Card>
      <Card.Header>
        <Card.Title>状态分布对比</Card.Title>
        <Card.Description>当前分布 vs 预测分布</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          {states.map((state, i) => {
            const initial = prediction.initialDistribution[i] || 0;
            const predicted = prediction.predictedDistribution[i] || 0;
            const change = predicted - initial;
            const changePct = initial > 0 ? (change / initial) * 100 : 0;
            
            return (
              <div key={state.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: state.color }}
                    />
                    <span className="font-medium text-gray-700">{state.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      当前: {formatPercent(initial)}
                    </span>
                    <span className="font-medium" style={{ color: state.color }}>
                      预测: {formatPercent(predicted)}
                    </span>
                    <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {change >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="h-full bg-gray-300 transition-all duration-500"
                      style={{ width: `${initial * 100}%` }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.abs(change) * 100}%`,
                        backgroundColor: change >= 0 ? '#10B981' : '#EF4444',
                        marginLeft: change < 0 ? `-${Math.abs(change) * 100}%` : '0'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
};
