const { BAY_STATUS, MATERIAL_SOURCE } = require('../models/constants');

const mockBays = [
  {
    name: '中山路人民广场站',
    road: '中山路',
    direction: '东向西',
    location: '人民广场南侧',
    coordinates: { lat: 31.2304, lng: 121.4737 },
    status: BAY_STATUS.APPROVED,
    remark: '方案已确认，符合公示要求',
    materials: [
      {
        name: '中山路人民广场公交港湾设计图',
        source: MATERIAL_SOURCE.GIS,
        isNameConsistent: true,
        description: 'GIS点位导出的设计图纸，名称与点位一致'
      },
      {
        name: '人民广场站客流调查报告',
        source: MATERIAL_SOURCE.MANUAL,
        isNameConsistent: true,
        description: '2024年Q4客流调查数据'
      }
    ],
    photos: [
      {
        url: '/photos/zhongshan-1.jpg',
        thumbnail: '/photos/zhongshan-1-thumb.jpg',
        uploader: '张工',
        description: '现场现状照片-正面',
        changes: '补充现场现状照片，确认点位位置准确'
      }
    ]
  },
  {
    name: '解放路图书馆站',
    road: '解放路',
    direction: '南向北',
    location: '市图书馆东侧',
    coordinates: { lat: 31.2356, lng: 121.4802 },
    status: BAY_STATUS.COORDINATE_MISMATCH,
    remark: 'GIS坐标偏至相邻的文化路，实际点位在图书馆东门，与地图标注相差约120米',
    materials: [
      {
        name: '解放路公交港湾规划图',
        source: MATERIAL_SOURCE.GIS,
        isNameConsistent: true,
        description: 'GIS系统导出的规划点位图'
      }
    ],
    photos: []
  },
  {
    name: '人民路百货大楼站',
    road: '人民路',
    direction: '西向东',
    location: '百货大楼对面',
    coordinates: { lat: 31.2289, lng: 121.4698 },
    status: BAY_STATUS.NAME_MISMATCH,
    remark: '材料名称与GIS点位名称不一致，需核实是否为同一位置',
    materials: [
      {
        name: '人民路百货大楼站',
        source: MATERIAL_SOURCE.GIS,
        isNameConsistent: true,
        description: 'GIS点位原始名称'
      },
      {
        name: '人民路商业中心站',
        source: MATERIAL_SOURCE.MANUAL,
        isNameConsistent: false,
        nameRemark: '材料中称"商业中心站"，但GIS点位名为"百货大楼站"，疑似为同一位置的不同命名',
        description: '设计院提供的方案材料，使用了"商业中心站"名称'
      },
      {
        name: '百货大楼站交通影响评估',
        source: MATERIAL_SOURCE.FIELD,
        isNameConsistent: true,
        description: '现场调研的交通影响评估报告'
      }
    ],
    photos: []
  },
  {
    name: '建设路公园站',
    road: '建设路',
    direction: '北向南',
    location: '城市公园西门',
    coordinates: { lat: 31.2401, lng: 121.4756 },
    status: BAY_STATUS.PHOTO_SUPPLEMENTED,
    remark: '现场照片已补录，点位位置已确认',
    materials: [
      {
        name: '建设路公园站GIS点位数据',
        source: MATERIAL_SOURCE.GIS,
        isNameConsistent: true,
        description: 'GIS系统导出数据'
      }
    ],
    photos: [
      {
        url: '/photos/jianshe-1.jpg',
        thumbnail: '/photos/jianshe-1-thumb.jpg',
        uploader: '李工',
        description: '公园西门公交站位现状',
        changes: '补录现场照片，确认站位在公园西门北侧约30米处，与GIS坐标一致'
      },
      {
        url: '/photos/jianshe-2.jpg',
        thumbnail: '/photos/jianshe-2-thumb.jpg',
        uploader: '李工',
        description: '周边道路情况',
        changes: '补充周边道路环境照片，辅助判断港湾设置可行性'
      }
    ]
  },
  {
    name: '长江大道市政府站',
    road: '长江大道',
    direction: '东向西',
    location: '市政府南门',
    coordinates: { lat: 31.2250, lng: 121.4850 },
    status: BAY_STATUS.PENDING,
    remark: '材料齐全，待审核',
    materials: [
      {
        name: '长江大道市政府公交港湾方案',
        source: MATERIAL_SOURCE.GIS,
        isNameConsistent: true,
        description: 'GIS点位及初步方案'
      }
    ],
    photos: []
  },
  {
    name: '黄河路小区站',
    road: '黄河路',
    direction: '南向北',
    location: '阳光小区门口',
    coordinates: { lat: 31.2450, lng: 121.4600 },
    status: BAY_STATUS.DRAFT,
    remark: '草稿，待补充材料',
    materials: [],
    photos: []
  }
];

module.exports = mockBays;
