import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import dayjs from 'dayjs';

import { PromptVersion } from '../../types';
import { getTimelineData } from '../../services/versionManager';

interface VersionTimelineProps {
  versions: PromptVersion[];
  onVersionClick?: (versionId: string) => void;
  highlightVersionId?: string | null;
}

// 版本追踪时间轴图
export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  onVersionClick,
  highlightVersionId
}) => {
  const timelineData = useMemo(() => {
    return getTimelineData().map(item => ({
      ...item,
      date: dayjs(item.time).format('MM-DD HH:mm')
    }));
  }, []);

  const option = useMemo(() => {
    const risks = timelineData.filter(t => t.hasRisk);
    const riskDates = risks.map(r => r.date);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: (params: any) => {
          const data = timelineData[params[0].dataIndex];
          const version = data.version;
          return `
            <div style="padding: 8px; min-width: 200px;">
              <div style="font-weight: bold; font-size: 13px; margin-bottom: 6px;">
                ${version.versionNumber}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">
                ${dayjs(version.releasedAt).format('YYYY-MM-DD HH:mm')}
              </div>
              ${data.hasRisk ? '<div style="color: #ef4444; margin-bottom: 8px;">⚠️ 存在版本时间线风险</div>' : ''}
              <div style="margin-bottom: 4px;"><strong>变更内容：</strong></div>
              <ul style="margin: 0; padding-left: 16px; font-size: 11px;">
                ${version.changes.map(c => `<li>${c}</li>`).join('')}
              </ul>
              ${data.sampleCount > 0 ? `<div style="margin-top: 8px;">关联样本：${data.sampleCount}条</div>` : ''}
            </div>
          `;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%'
      },
      xAxis: {
        type: 'category',
        data: timelineData.map(t => t.date),
        axisLabel: {
          rotate: 30,
          fontSize: 10,
          fontFamily: '"Source Han Sans CN", sans-serif',
          formatter: (value: string) => {
            return {
              value,
              textStyle: {
                color: riskDates.includes(value) ? '#ef4444' : '#334155',
                fontWeight: riskDates.includes(value) ? 'bold' : 'normal'
              }
            };
          }
        },
        axisLine: {
          lineStyle: {
            color: '#cbd5e1'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '样本数',
        nameTextStyle: {
          fontSize: 11,
          color: '#64748b'
        },
        axisLabel: {
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#e2e8f0'
          }
        }
      },
      series: [
        {
          name: '样本数量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: (_value: number, params: any) => {
            const isRisk = timelineData[params.dataIndex]?.hasRisk;
            return isRisk ? 14 : 10;
          },
          itemStyle: {
            color: (params: any) => {
              const isRisk = timelineData[params.dataIndex]?.hasRisk;
              const isHighlight = highlightVersionId === versions[params.dataIndex]?.versionId;
              if (isHighlight) return '#1e3a5f';
              return isRisk ? '#ef4444' : '#10b981';
            },
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: (params: any) => {
              const isHighlight = highlightVersionId === versions[params.dataIndex]?.versionId;
              return isHighlight ? 15 : 0;
            },
            shadowColor: (params: any) => {
              const isHighlight = highlightVersionId === versions[params.dataIndex]?.versionId;
              return isHighlight ? 'rgba(30, 58, 95, 0.5)' : 'transparent';
            }
          },
          lineStyle: {
            width: 2,
            color: '#1e3a5f'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(30, 58, 95, 0.2)' },
                { offset: 1, color: 'rgba(30, 58, 95, 0.02)' }
              ]
            }
          },
          data: timelineData.map(t => t.sampleCount),
          markPoint: {
            data: risks.map((r) => ({
              name: '风险提示',
              coord: [r.date, r.sampleCount],
              value: '⚠️ 版本晚到风险',
              symbol: 'pin',
              symbolSize: 40,
              itemStyle: {
                color: '#ef4444'
              },
              label: {
                show: false
              }
            }))
          }
        }
      ]
    };
  }, [timelineData, highlightVersionId, versions]);

  const handleClick = (params: any) => {
    if (onVersionClick && versions[params.dataIndex]) {
      onVersionClick(versions[params.dataIndex].versionId);
    }
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '260px', width: '100%' }}
      onEvents={{ click: handleClick }}
      opts={{ renderer: 'canvas' }}
    />
  );
};
