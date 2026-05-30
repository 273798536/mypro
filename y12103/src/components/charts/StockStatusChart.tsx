import ReactECharts from 'echarts-for-react';

interface StockStatusChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export default function StockStatusChart({ data }: StockStatusChartProps) {
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'rgba(15, 59, 95, 0.95)',
      borderColor: '#0F3B5F',
      textStyle: {
        color: '#fff',
        fontFamily: 'Inter',
      },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        fontFamily: 'Inter',
        fontSize: 12,
        color: '#475569',
      },
    },
    series: [
      {
        name: '库存状态',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'Inter',
          },
        },
        data: data.map((d) => ({
          value: d.value,
          name: d.name,
          itemStyle: {
            color: d.color,
          },
        })),
      },
    ],
  };
  
  return <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'svg' }} />;
}
