import { performHitDetection, calculateArea, validateRecord } from '../utils/hitDetection';

export const equipmentList = [
  { id: 'EQ001', name: 'GNSS接收机', model: 'Trimble R10', status: 'working', lastCalibration: '2024-01-15' },
  { id: 'EQ002', name: '全站仪', model: 'Leica TS16', status: 'working', lastCalibration: '2024-02-20' },
  { id: 'EQ003', name: '无人机', model: 'DJI Phantom 4 RTK', status: 'maintenance', lastCalibration: '2024-01-10' },
  { id: 'EQ004', name: '激光测距仪', model: 'Bosch GLM 400', status: 'working', lastCalibration: '2024-03-01' },
  { id: 'EQ005', name: '平板电脑', model: 'iPad Pro 12.9', status: 'working', lastCalibration: '-' },
];

const rawRecords = [
  {
    id: 'REC001',
    rowNumber: 1,
    fieldName: '东沟村地块A1',
    sourceFile: '东沟村_20240315.tif',
    imageName: 'farmland_001.jpg',
    sourceNote: '2024年春季测量数据，无人机正射影像',
    coordinates: {
      bottomLeft: [118.5234, 32.1567],
      bottomRight: [118.5289, 32.1567],
      topLeft: [118.5234, 32.1621],
      topRight: [118.5289, 32.1621]
    },
    labelCoordinates: {
      bottomLeft: [118.52345, 32.15672],
      bottomRight: [118.52888, 32.15673],
      topLeft: [118.52342, 32.16208],
      topRight: [118.52891, 32.16209]
    },
    createdAt: '2024-03-15 09:30:00',
    operator: '张三',
    remarks: '边界清晰，数据准确'
  },
  {
    id: 'REC002',
    rowNumber: 2,
    fieldName: '西湾村地块B3',
    sourceFile: '西湾村_20240316.tif',
    imageName: 'farmland_002.jpg',
    sourceNote: '2024年春季测量，局部阴影区域',
    coordinates: {
      bottomLeft: [118.6543, 32.2345],
      bottomRight: [118.6612, 32.2345],
      topLeft: [118.6543, 32.2408],
      topRight: [118.6612, 32.2408]
    },
    labelCoordinates: {
      bottomLeft: [118.6538, 32.2342],
      bottomRight: [118.6618, 32.2348],
      topLeft: [118.6548, 32.2412],
      topRight: [118.6608, 32.2405]
    },
    createdAt: '2024-03-16 14:20:00',
    operator: '李四',
    remarks: '西南角边界存在偏移，建议现场核实'
  },
  {
    id: 'REC003',
    rowNumber: 3,
    fieldName: '南岗村地块C7',
    sourceFile: '南岗村_20240317.tif',
    imageName: 'farmland_003.jpg',
    sourceNote: '数据采集异常，疑似标注错误',
    coordinates: {
      bottomLeft: [118.7890, 32.3456],
      bottomRight: [118.7956, 32.3456],
      topLeft: [118.7890, 32.3512],
      topRight: [118.7956, 32.3512]
    },
    labelCoordinates: {
      bottomLeft: [118.7850, 32.3420],
      bottomRight: [118.8000, 32.3480],
      topLeft: [118.7870, 32.3550],
      topRight: [118.7980, 32.3530]
    },
    createdAt: '2024-03-17 10:15:00',
    operator: '王五',
    remarks: '标注数据明显错误，需重新采集'
  },
  {
    id: 'REC004',
    rowNumber: 4,
    fieldName: '北坡村地块D2',
    sourceFile: '北坡村_20240318.tif',
    imageName: 'farmland_004.jpg',
    sourceNote: '2024年春季测量，平地区域',
    coordinates: {
      bottomLeft: [118.4123, 32.4567],
      bottomRight: [118.4189, 32.4567],
      topLeft: [118.4123, 32.4621],
      topRight: [118.4189, 32.4621]
    },
    labelCoordinates: {
      bottomLeft: [118.41232, 32.45671],
      bottomRight: [118.41889, 32.45668],
      topLeft: [118.41228, 32.46209],
      topRight: [118.41892, 32.46212]
    },
    createdAt: '2024-03-18 16:45:00',
    operator: '赵六',
    remarks: '数据质量优秀'
  },
  {
    id: 'REC005',
    rowNumber: 5,
    fieldName: '中心村地块E5',
    sourceFile: '中心村_20240319.tif',
    imageName: 'farmland_005.jpg',
    sourceNote: '边界模糊区域，需人工确认',
    coordinates: {
      bottomLeft: [118.5678, 32.5678],
      bottomRight: [118.5745, 32.5678],
      topLeft: [118.5678, 32.5734],
      topRight: [118.5745, 32.5734]
    },
    labelCoordinates: {
      bottomLeft: [118.5672, 32.5675],
      bottomRight: [118.5750, 32.5680],
      topLeft: [118.5680, 32.5738],
      topRight: [118.5742, 32.5732]
    },
    createdAt: '2024-03-19 08:30:00',
    operator: '孙七',
    remarks: '东北角边界需确认，临近道路'
  },
  {
    id: 'REC006',
    rowNumber: 6,
    fieldName: '河边村地块F8',
    sourceFile: '河边村_20240320.tif',
    imageName: 'farmland_006.jpg',
    sourceNote: '坐标缺失的坏数据样例',
    coordinates: {
      bottomLeft: null,
      bottomRight: [118.9012, 32.6789],
      topLeft: [118.8956, 32.6845],
      topRight: [118.9012, 32.6845]
    },
    labelCoordinates: {
      bottomLeft: [118.8958, 32.6791],
      bottomRight: [118.9010, 32.6788],
      topLeft: [118.8957, 32.6843],
      topRight: [118.9011, 32.6844]
    },
    createdAt: '2024-03-20 11:00:00',
    operator: '周八',
    remarks: '左下角坐标采集失败'
  }
];

export const boundaryRecords = rawRecords.map(record => {
  const hitDetection = performHitDetection(record.coordinates, record.labelCoordinates);
  const area = calculateArea(record.coordinates);
  const validation = validateRecord(record);
  
  return {
    ...record,
    hitDetection,
    area,
    unit: '亩',
    status: hitDetection.status,
    validation
  };
});

export const getStatusStats = (records) => {
  const stats = {
    total: records.length,
    success: records.filter(r => r.status === 'success').length,
    pending: records.filter(r => r.status === 'pending').length,
    error: records.filter(r => r.status === 'error').length
  };
  stats.passRate = stats.total > 0 ? parseFloat(((stats.success / stats.total) * 100).toFixed(1)) : 0;
  return stats;
};

export const getStatusChartData = (records) => {
  const stats = getStatusStats(records);
  return {
    labels: ['顺利通过', '待确认', '数据异常'],
    datasets: [{
      data: [stats.success, stats.pending, stats.error],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderWidth: 0
    }]
  };
};

export const getMatchRateChartData = (records) => {
  return {
    labels: records.map(r => r.fieldName),
    datasets: [{
      label: '匹配率 (%)',
      data: records.map(r => r.hitDetection.matchRate),
      backgroundColor: records.map(r => {
        if (r.hitDetection.status === 'success') return 'rgba(34, 197, 94, 0.8)';
        if (r.hitDetection.status === 'pending') return 'rgba(245, 158, 11, 0.8)';
        return 'rgba(239, 68, 68, 0.8)';
      }),
      borderColor: records.map(r => {
        if (r.hitDetection.status === 'success') return '#22c55e';
        if (r.hitDetection.status === 'pending') return '#f59e0b';
        return '#ef4444';
      }),
      borderWidth: 1,
      borderRadius: 4
    }]
  };
};

export const filterRecords = (records, { status = 'all', searchText = '', sortBy = 'rowNumber', sortOrder = 'asc' } = {}) => {
  let filtered = [...records];
  
  if (status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }
  
  if (searchText && searchText.trim()) {
    const keyword = searchText.trim().toLowerCase();
    filtered = filtered.filter(r =>
      r.fieldName.toLowerCase().includes(keyword) ||
      r.sourceFile.toLowerCase().includes(keyword) ||
      (r.imageName && r.imageName.toLowerCase().includes(keyword)) ||
      String(r.rowNumber).includes(keyword) ||
      r.operator.toLowerCase().includes(keyword)
    );
  }
  
  filtered.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'rowNumber':
        valA = a.rowNumber;
        valB = b.rowNumber;
        break;
      case 'matchRate':
        valA = a.hitDetection.matchRate;
        valB = b.hitDetection.matchRate;
        break;
      case 'deviation':
        valA = a.hitDetection.deviation;
        valB = b.hitDetection.deviation;
        break;
      case 'createdAt':
        valA = a.createdAt;
        valB = b.createdAt;
        break;
      case 'area':
        valA = a.area;
        valB = b.area;
        break;
      default:
        valA = a.rowNumber;
        valB = b.rowNumber;
    }
    if (sortOrder === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    }
    return valA < valB ? 1 : valA > valB ? -1 : 0;
  });
  
  return filtered;
};
