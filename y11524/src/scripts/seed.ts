import { importAppointmentOrder, importTechnicianLocation, importUserReview, importSecondConfirmation } from '../services/ledgerService';
import { getDatabase } from '../database/connection';
import { AppointmentOrderInput, TechnicianLocationInput, UserReviewInput, SecondConfirmationInput } from '../validation/schemas';

const sampleAppointments: AppointmentOrderInput[] = [
  {
    appointmentNo: 'APT20240101001',
    batchNo: 'BATCH001',
    customerName: '张三',
    customerPhone: '13800138001',
    customerAddress: '北京市朝阳区建国路88号',
    area: '北京',
    applianceType: '空调',
    appointmentTime: '2024-01-15 10:00:00',
    technicianId: 'TECH001',
    technicianName: '李师傅',
    status: '已完成',
    operatorId: 'OP001',
    operatorName: '系统管理员',
  },
  {
    appointmentNo: 'APT20240101002',
    batchNo: 'BATCH001',
    customerName: '李四',
    customerPhone: '13800138002',
    customerAddress: '上海市浦东新区陆家嘴环路1000号',
    area: '上海',
    applianceType: '洗衣机',
    appointmentTime: '2024-01-15 14:00:00',
    technicianId: 'TECH002',
    technicianName: '王师傅',
    status: '已完成',
    operatorId: 'OP001',
    operatorName: '系统管理员',
  },
  {
    appointmentNo: 'APT20240101003',
    batchNo: 'BATCH002',
    customerName: '王五',
    customerPhone: '13800138003',
    customerAddress: '广州市天河区天河路385号',
    area: '广州',
    applianceType: '冰箱',
    appointmentTime: '2024-01-16 09:00:00',
    technicianId: 'TECH003',
    technicianName: '赵师傅',
    status: '改约',
    operatorId: 'OP001',
    operatorName: '系统管理员',
  },
];

const sampleLocations: TechnicianLocationInput[] = [
  {
    appointmentNo: 'APT20240101001',
    batchNo: 'BATCH001',
    technicianId: 'TECH001',
    checkInTime: '2024-01-15 09:55:00',
    checkOutTime: '2024-01-15 11:30:00',
    locationAddress: '北京市朝阳区建国路88号',
    latitude: 39.9042,
    longitude: 116.4074,
    distanceToCustomer: 50,
  },
  {
    appointmentNo: 'APT20240101002',
    batchNo: 'BATCH001',
    technicianId: 'TECH002',
    checkInTime: '2024-01-15 14:10:00',
    checkOutTime: '2024-01-15 15:45:00',
    locationAddress: '上海市浦东新区陆家嘴环路1000号',
    latitude: 31.2304,
    longitude: 121.4737,
    distanceToCustomer: 30,
  },
];

const sampleReviews: UserReviewInput[] = [
  {
    appointmentNo: 'APT20240101001',
    batchNo: 'BATCH001',
    rating: 5,
    reviewContent: '安装师傅很专业，服务态度很好，安装效果满意！',
    reviewTime: '2024-01-15 18:00:00',
    reviewerPhone: '13800138001',
  },
  {
    appointmentNo: 'APT20240101002',
    batchNo: 'BATCH001',
    rating: 2,
    reviewContent: '安装师傅迟到了，而且安装后有噪音，不太满意。',
    negativeReason: '师傅迟到+安装质量问题',
    reviewTime: '2024-01-15 19:30:00',
    reviewerPhone: '13800138002',
  },
];

const sampleConfirmations: SecondConfirmationInput[] = [
  {
    appointmentNo: 'APT20240101003',
    batchNo: 'BATCH002',
    confirmType: 'reschedule',
    confirmResult: '客户同意改约至1月18日',
    confirmTime: '2024-01-16 08:30:00',
    operatorId: 'CS001',
    operatorName: '客服小张',
    remark: '客户临时有事，需要改约',
  },
];

export function seedSampleData(): void {
  console.log('开始导入样例数据...');

  sampleAppointments.forEach((apt, index) => {
    const result = importAppointmentOrder(apt);
    console.log(`预约单 ${index + 1}: ${result.created ? '新建' : '已存在'} - ${apt.appointmentNo}`);
  });

  sampleLocations.forEach((loc, index) => {
    try {
      const result = importTechnicianLocation(loc);
      console.log(`定位数据 ${index + 1}: ${result.created ? '新建' : '已存在'} - ${loc.appointmentNo}`);
    } catch (e) {
      console.log(`定位数据 ${index + 1}: 失败 - ${(e as Error).message}`);
    }
  });

  sampleReviews.forEach((review, index) => {
    try {
      const result = importUserReview(review);
      console.log(`评价数据 ${index + 1}: ${result.created ? '新建' : '已存在'} - ${review.appointmentNo}`);
    } catch (e) {
      console.log(`评价数据 ${index + 1}: 失败 - ${(e as Error).message}`);
    }
  });

  sampleConfirmations.forEach((conf, index) => {
    try {
      const result = importSecondConfirmation(conf);
      console.log(`二次确认 ${index + 1}: ${result.created ? '新建' : '已存在'} - ${conf.appointmentNo}`);
    } catch (e) {
      console.log(`二次确认 ${index + 1}: 失败 - ${(e as Error).message}`);
    }
  });

  console.log('样例数据导入完成！');
}

if (require.main === module) {
  getDatabase();
  seedSampleData();
}
