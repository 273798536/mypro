const testData = {
  normalBatch: {
    temperaturePoints: [
      { id: 'P001', position: '左上', temperature: 85.2 },
      { id: 'P002', position: '中上', temperature: 88.5 },
      { id: 'P003', position: '右上', temperature: 86.1 },
      { id: 'P004', position: '左中', temperature: 82.3 },
      { id: 'P005', position: '中心', temperature: 90.2 },
      { id: 'P006', position: '右中', temperature: 84.7 },
      { id: 'P007', position: '左下', temperature: 79.5 },
      { id: 'P008', position: '中下', temperature: 81.2 },
      { id: 'P009', position: '右下', temperature: 78.9 }
    ],
    powerLevel: 100,
    turntableRotation: true
  },
  
  missingPointsBatch: {
    temperaturePoints: [
      { id: 'P001', position: '左上', temperature: 85.2 },
      { id: 'P002', position: '中上', temperature: null },
      { id: 'P003', position: '右上', temperature: 86.1 },
      { id: 'P004', position: '左中', temperature: null },
      { id: 'P005', position: '中心', temperature: 90.2 }
    ],
    powerLevel: 80,
    turntableRotation: true
  },
  
  turntableStoppedBatch: {
    temperaturePoints: [
      { id: 'P001', position: '左上', temperature: 95.2 },
      { id: 'P002', position: '中上', temperature: 92.5 },
      { id: 'P003', position: '右上', temperature: 60.1 },
      { id: 'P004', position: '左中', temperature: 88.3 },
      { id: 'P005', position: '中心', temperature: 94.2 },
      { id: 'P006', position: '右中', temperature: 55.7 },
      { id: 'P007', position: '左下', temperature: 89.5 },
      { id: 'P008', position: '中下', temperature: 62.2 },
      { id: 'P009', position: '右下', temperature: 58.9 }
    ],
    powerLevel: 100,
    turntableRotation: false
  },
  
  powerJumpBatch: {
    temperaturePoints: [
      { id: 'P001', position: '左上', temperature: 45.2 },
      { id: 'P002', position: '中上', temperature: 48.5 },
      { id: 'P003', position: '右上', temperature: 46.1 },
      { id: 'P004', position: '左中', temperature: 42.3 },
      { id: 'P005', position: '中心', temperature: 50.2 },
      { id: 'P006', position: '右中', temperature: 44.7 },
      { id: 'P007', position: '左下', temperature: 39.5 },
      { id: 'P008', position: '中下', temperature: 41.2 },
      { id: 'P009', position: '右下', temperature: 38.9 }
    ],
    powerLevel: 100,
    turntableRotation: true
  },
  
  foodDimensions: {
    small: { width: 10, depth: 10, height: 5 },
    medium: { width: 20, depth: 20, height: 10 },
    large: { width: 30, depth: 30, height: 15 }
  }
};

module.exports = testData;
