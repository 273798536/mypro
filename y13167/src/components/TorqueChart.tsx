import React, { useMemo } from 'react';
import { Card, Tag, Tooltip } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppContext } from '../context/AppContext';
import { convertToNm } from '../utils/dataAnalysis';
import dayjs from 'dayjs';

const TorqueChart: React.FC = () => {
  const { filteredRecords, dispatch } = useAppContext();

  const chartOption = useMemo(() => {
    const sorted = [...filteredRecords].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const normalData: [string, number][] = [];
    const outlierHighData: [string, number][] = [];
    const outlierLowData: [string, number][] = [];
    const duplicateData: [string, number][] = [];
    const dirtyData: [string, number][] = [];

    sorted.forEach(record => {
      const value = convertToNm(record.torque_value, record.torque_unit);
      const time = dayjs(record.timestamp).format('YYYY-MM-DD HH:mm:ss');
      const point: [string, number] = [time, value];

      if (record.is_outlier && record.outlier_reason === 'extreme_high') {
        outlierHighData.push(point);
      } else if (record.is_outlier && record.outlier_reason === 'extreme_low') {
        outlierLowData.push(point);
      } else if (record.is_device_duplicate) {
        duplicateData.push(point);
      } else if (record.is_data_dirty) {
        dirtyData.push(point);
      } else {
        normalData.push(point);
      }
    });

    const ratedTorque = filteredRecords.length > 0 ? filteredRecords[0].rated_torque : 300;

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = Array.isArray(params) ? params[0] : params;
          if (!data || !data.data) return '';
          const [time, value] = data.data;
          const record = sorted.find(r =>
            dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss') === time &&
            Math.abs(convertToNm(r.torque_value, r.torque_unit) - value) < 0.01
          );
          if (!record) return `${time}<br/>扭矩: ${value.toFixed(2)} N·m`;

          let tags = [];
          if (record.is_outlier) tags.push('<span style="color:#faad14">异常值</span>');
          if (record.is_device_duplicate) tags.push('<span style="color:#ff4d4f">重复设备</span>');
          if (record.is_data_dirty) tags.push('<span style="color:#eb2f96">脏数据</span>');

          return `
            <div style="font-weight:bold">${time}</div>
            <div>设备: ${record.device_id} - ${record.device_name}</div>
            <div>扭矩: ${value.toFixed(2)} N·m (${record.torque_value} ${record.torque_unit})</div>
            <div>转速: ${record.speed} rpm</div>
            <div>电流: ${record.current} A</div>
            <div>温度: ${record.temperature} °C</div>
            ${tags.length > 0 ? `<div>标记: ${tags.join(' ')}</div>` : ''}
            ${record.maintenance_note_raw ? `<div>备注: ${record.maintenance_note_raw}</div>` : ''}
          `;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      legend: {
        data: ['正常数据', '偏高异常', '偏低异常', '重复设备', '脏数据', '额定扭矩'],
        top: 0
      },
      xAxis: {
        type: 'category',
        data: sorted.map(r => dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss')),
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: '扭矩 (N·m)',
        nameLocation: 'middle',
        nameGap: 50
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 5
        }
      ],
      series: [
        {
          name: '正常数据',
          type: 'line',
          data: normalData,
          symbolSize: 6,
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' }
        },
        {
          name: '偏高异常',
          type: 'scatter',
          data: outlierHighData,
          symbolSize: 12,
          itemStyle: { color: '#faad14', borderWidth: 2, borderColor: '#fff' }
        },
        {
          name: '偏低异常',
          type: 'scatter',
          data: outlierLowData,
          symbolSize: 12,
          itemStyle: { color: '#52c41a', borderWidth: 2, borderColor: '#fff' }
        },
        {
          name: '重复设备',
          type: 'scatter',
          data: duplicateData,
          symbolSize: 10,
          itemStyle: { color: '#ff4d4f', borderWidth: 2, borderColor: '#fff' }
        },
        {
          name: '脏数据',
          type: 'scatter',
          data: dirtyData,
          symbolSize: 10,
          itemStyle: { color: '#eb2f96', borderWidth: 2, borderColor: '#fff' }
        },
        {
          name: '额定扭矩',
          type: 'line',
          data: sorted.map(r => [
            dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            ratedTorque
          ]),
          lineStyle: { color: '#d9d9d9', type: 'dashed', width: 1 },
          symbol: 'none',
          silent: true
        }
      ]
    };
  }, [filteredRecords]);

  const handleChartClick = (event: any) => {
    if (!event || !event.data) return;
    const [time] = event.data;
    const sorted = [...filteredRecords].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const record = sorted.find(r =>
      dayjs(r.timestamp).format('YYYY-MM-DD HH:mm:ss') === time
    );
    if (record) {
      dispatch({ type: 'SELECT_RECORD', payload: record.id });
      dispatch({ type: 'TOGGLE_DETAIL_MODAL', payload: true });
    }
  };

  return (
    <Card
      title={
        <span>
          <LineChartOutlined style={{ marginRight: 8 }} />
          扭矩参数回放曲线
          <Tooltip title="极端值不会被平均，原始数据完整显示，点击数据点查看详情">
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>
              保留原始极端值
            </Tag>
          </Tooltip>
        </span>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {filteredRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无数据，请先导入数据或调整筛选条件
        </div>
      ) : (
        <ReactECharts
          option={chartOption}
          style={{ height: 400 }}
          onEvents={{ click: handleChartClick }}
          opts={{ renderer: 'canvas' }}
        />
      )}
    </Card>
  );
};

export default TorqueChart;
