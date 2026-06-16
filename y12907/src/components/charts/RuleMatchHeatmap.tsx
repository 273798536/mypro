import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import { AnalysisResult } from '../../types';
import { getRuleById } from '../../data/securityRules';

interface RuleMatchHeatmapProps {
  analysisResult: AnalysisResult;
  onRuleClick?: (ruleId: string) => void;
  highlightRuleId?: string | null;
}

// 安全规则匹配热力图
export const RuleMatchHeatmap: React.FC<RuleMatchHeatmapProps> = ({
  analysisResult,
  onRuleClick,
  highlightRuleId
}) => {
  const { byRuleMatch } = analysisResult.distributionStats;

  const option = useMemo(() => {
    const ruleIds = Object.keys(byRuleMatch).filter(id => byRuleMatch[id].matched + byRuleMatch[id].unmatched > 0);
    const xAxisData = ruleIds;
    const yAxisData = ['命中数', '未命中数'];

    const data: Array<[number, number, number, string]> = [];
    const maxValue = Math.max(...ruleIds.map(id => byRuleMatch[id].matched + byRuleMatch[id].unmatched), 1);

    ruleIds.forEach((ruleId, xIndex) => {
      const stats = byRuleMatch[ruleId];
      const rule = getRuleById(ruleId);

      data.push([xIndex, 0, stats.matched, rule?.ruleName || ruleId]);
      data.push([xIndex, 1, stats.unmatched, rule?.ruleName || ruleId]);
    });

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const rule = getRuleById(xAxisData[params.data[0]]);
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${rule?.ruleId} - ${rule?.ruleName || '未知规则'}</div>
              <div>${yAxisData[params.data[1]]}: ${params.data[2]}条</div>
              <div style="color: #64748b; font-size: 11px; margin-top: 4px;">${rule?.ruleDescription || ''}</div>
            </div>
          `;
        }
      },
      grid: {
        left: '15%',
        right: '5%',
        top: '10%',
        bottom: '20%'
      },
      xAxis: {
        type: 'category',
        data: xAxisData.map(id => {
          return {
            value: id,
            textStyle: {
              color: highlightRuleId === id ? '#ef4444' : '#334155',
              fontWeight: highlightRuleId === id ? 'bold' : 'normal'
            }
          };
        }),
        axisLabel: {
          rotate: 0,
          fontSize: 11,
          fontFamily: '"Source Han Sans CN", sans-serif'
        }
      },
      yAxis: {
        type: 'category',
        data: yAxisData,
        axisLabel: {
          fontSize: 11,
          fontFamily: '"Source Han Sans CN", sans-serif'
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1']
        },
        textStyle: {
          fontSize: 10
        }
      },
      series: [
        {
          name: '规则匹配',
          type: 'heatmap',
          data: data.map((d) => ({
            value: [d[0], d[1], d[2]],
            itemStyle: highlightRuleId === xAxisData[d[0]] ? {
              borderColor: '#ef4444',
              borderWidth: 2,
              shadowBlur: 10,
              shadowColor: 'rgba(239, 68, 68, 0.3)'
            } : undefined
          })),
          label: {
            show: true,
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [byRuleMatch, highlightRuleId]);

  const handleClick = (params: any) => {
    if (onRuleClick && params.data) {
      const ruleId = Object.keys(byRuleMatch)[params.data[0]];
      onRuleClick(ruleId);
    }
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '280px', width: '100%' }}
      onEvents={{ click: handleClick }}
      opts={{ renderer: 'canvas' }}
    />
  );
};
