export const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  '北京': { lat: 39.9042, lng: 116.4074 },
  '天津': { lat: 39.0842, lng: 117.2009 },
  '河北': { lat: 38.0428, lng: 114.5149 },
  '山西': { lat: 37.5689, lng: 112.1994 },
  '内蒙古': { lat: 40.8174, lng: 111.7650 },
  '辽宁': { lat: 41.8057, lng: 123.4315 },
  '吉林': { lat: 43.8868, lng: 125.3245 },
  '黑龙江': { lat: 45.7567, lng: 126.6528 },
  '上海': { lat: 31.2304, lng: 121.4737 },
  '江苏': { lat: 32.0603, lng: 118.7969 },
  '浙江': { lat: 30.2741, lng: 120.1551 },
  '安徽': { lat: 31.8206, lng: 117.2272 },
  '福建': { lat: 26.0745, lng: 119.2965 },
  '江西': { lat: 28.6820, lng: 115.8579 },
  '山东': { lat: 36.6512, lng: 117.1201 },
  '河南': { lat: 34.7466, lng: 113.6254 },
  '湖北': { lat: 30.5928, lng: 114.3055 },
  '湖南': { lat: 28.2282, lng: 112.9388 },
  '广东': { lat: 23.1291, lng: 113.2644 },
  '广西': { lat: 22.8170, lng: 108.3665 },
  '海南': { lat: 20.0174, lng: 110.3492 },
  '重庆': { lat: 29.5630, lng: 106.5516 },
  '四川': { lat: 30.5728, lng: 104.0668 },
  '贵州': { lat: 26.6470, lng: 106.6302 },
  '云南': { lat: 25.0389, lng: 102.7183 },
  '西藏': { lat: 29.6500, lng: 91.1000 },
  '陕西': { lat: 34.2658, lng: 108.9541 },
  '甘肃': { lat: 36.0611, lng: 103.8343 },
  '青海': { lat: 36.6171, lng: 101.7782 },
  '宁夏': { lat: 38.4872, lng: 106.2309 },
  '新疆': { lat: 43.7930, lng: 87.6271 },
  '台湾': { lat: 25.0330, lng: 121.5654 },
  '香港': { lat: 22.3193, lng: 114.1694 },
  '澳门': { lat: 22.1987, lng: 113.5439 },
};

const LAT_MIN = 18;
const LAT_MAX = 54;
const LNG_MIN = 73;
const LNG_MAX = 136;
const MAP_SIZE = 30;

export function geoTo3D(lat: number, lng: number): [number, number, number] {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_SIZE - MAP_SIZE / 2;
  const z = -((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MAP_SIZE + MAP_SIZE / 2;
  return [x, 0, z];
}

export function getProvincePosition(name: string): [number, number, number] {
  const coord = PROVINCE_COORDS[name];
  if (coord) {
    return geoTo3D(coord.lat, coord.lng);
  }
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const lat = LAT_MIN + (hash % 36);
  const lng = LNG_MIN + ((hash * 7) % 63);
  return geoTo3D(lat, lng);
}

export const METRIC_LABELS: Record<string, string> = {
  claimRate: '出险率',
  premium: '保费(万元)',
  claimAmount: '赔付额(万元)',
  policyCount: '保单数',
};

export const METRIC_COLORS: Record<string, string> = {
  claimRate: '#4FC3F7',
  premium: '#00E676',
  claimAmount: '#FF8F00',
  policyCount: '#AB47BC',
};
