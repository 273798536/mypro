import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StatusChart = ({ data, onSegmentClick }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.parsed;
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${value} 条 (${pct}%)`;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (onSegmentClick && elements && elements.length > 0) {
        const index = elements[0].index;
        const label = data.labels[index];
        onSegmentClick(label);
      }
    },
    cutout: '60%'
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>检测状态分布</h2>
        {onSegmentClick && (
          <span style={{ fontSize: '0.75rem', color: '#666' }}>点击区块跳转到明细</span>
        )}
      </div>
      <div className="panel-body">
        <div className="chart-container">
          <Doughnut data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

const MatchRateChart = ({ data }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const statusText = context.raw >= 95 ? '顺利通过' : context.raw >= 70 ? '待确认' : '数据异常';
            return `匹配率: ${context.raw}% — ${statusText}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: '匹配率 (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: '地块名称'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          font: { size: 10 }
        }
      }
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>匹配率对比</h2>
        <span style={{ fontSize: '0.75rem', color: '#666' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px', marginRight: '4px' }}></span>通过
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px', margin: '0 4px 0 8px' }}></span>待确认
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', margin: '0 4px 0 8px' }}></span>异常
        </span>
      </div>
      <div className="panel-body">
        <div className="chart-container">
          <Bar data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

export { StatusChart, MatchRateChart };
