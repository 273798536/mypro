import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

let authToken = '';

async function login() {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: '123456'
  });
  authToken = response.data.token;
  console.log('✅ 登录成功');
  return response.data;
}

function getHeaders() {
  return {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
}

async function submitRegistration(data: any) {
  try {
    const response = await axios.post(`${API_BASE}/data/registration`, data, getHeaders());
    console.log(`✅ 报名表提交成功: ${data.employeeName}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ 报名表提交失败: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function submitSignin(data: any) {
  try {
    const response = await axios.post(`${API_BASE}/data/signin`, data, getHeaders());
    console.log(`✅ 签到提交成功: ${data.employeeName}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ 签到提交失败: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function submitHomework(data: any) {
  try {
    const response = await axios.post(`${API_BASE}/data/homework`, data, getHeaders());
    console.log(`✅ 作业提交成功: ${data.employeeName}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ 作业提交失败: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function submitPriceAdjustment(data: any) {
  try {
    const response = await axios.post(`${API_BASE}/data/price-adjustment`, data, getHeaders());
    console.log(`✅ 改价提交成功: ${data.employeeName}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ 改价提交失败: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function getQueueList() {
  const response = await axios.get(`${API_BASE}/queue`, getHeaders());
  console.log(`📋 队列记录数: ${response.data.total}`);
  return response.data;
}

async function getSigninReport() {
  const response = await axios.get(`${API_BASE}/reports/signin`, getHeaders());
  console.log(`📊 签到报表记录数: ${response.data.total}`);
  return response.data;
}

async function getFailedRecords() {
  const response = await axios.get(`${API_BASE}/reports/failed-records`, getHeaders());
  console.log(`⚠️  失败记录数: ${response.data.total}`);
  return response.data;
}

async function getHrbpDashboard() {
  const response = await axios.get(`${API_BASE}/reports/hrbp-dashboard`, getHeaders());
  console.log('📈 HRBP仪表盘数据获取成功');
  return response.data;
}

async function runTestScenario() {
  console.log('\n========================================');
  console.log('🚀 企业培训签到重试补偿系统 - 测试脚本');
  console.log('========================================\n');

  try {
    await login();

    console.log('\n--- 测试场景1: 正常数据提交 ---');
    await submitRegistration({
      employeeId: 'E001',
      employeeName: '张三',
      department: '技术部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      trainingLocation: '培训室A',
      trainer: '李明',
      source: 'registration_form'
    });

    await submitSignin({
      employeeId: 'E001',
      employeeName: '张三',
      department: '技术部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      signinTime: '2026-05-20T09:00:00',
      signinType: 'normal',
      source: 'signin_qrcode',
      qrcodeId: 'QR20260520001',
      location: '培训室A',
      latitude: 39.9042,
      longitude: 116.4074,
      isProxy: false
    });

    await submitHomework({
      employeeId: 'E001',
      employeeName: '张三',
      department: '技术部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      submitTime: '2026-05-20T18:00:00',
      homeworkTitle: '第一周作业：Spring Boot实战',
      homeworkContent: '完成Spring Boot项目搭建，实现RESTful API...',
      source: 'homework',
      score: 95,
      grade: 'A'
    });

    await submitPriceAdjustment({
      employeeId: 'E001',
      employeeName: '张三',
      department: '技术部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      originalPrice: 2999,
      adjustedPrice: 2499,
      adjustmentReason: '早鸟优惠',
      effectiveDate: '2026-05-01',
      source: 'manual_price',
      approvedBy: '培训部主管'
    });

    console.log('\n--- 测试场景2: 重复签到（触发补偿队列）---');
    await submitSignin({
      employeeId: 'E002',
      employeeName: '李四',
      department: '产品部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      signinTime: '2026-05-20T09:05:00',
      signinType: 'normal',
      source: 'signin_qrcode',
      qrcodeId: 'QR20260520002',
      isProxy: false
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('  提交重复签到...');
    await submitSignin({
      employeeId: 'E002',
      employeeName: '李四',
      department: '产品部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      signinTime: '2026-05-20T09:10:00',
      signinType: 'retry',
      source: 'signin_qrcode',
      qrcodeId: 'QR20260520003',
      isProxy: false
    });

    console.log('\n--- 测试场景3: 代签标记 ---');
    await submitSignin({
      employeeId: 'E003',
      employeeName: '王五',
      department: '市场部',
      trainingId: 'TRN001',
      trainingName: 'Java高级开发实战',
      trainingDate: '2026-05-20',
      signinTime: '2026-05-20T09:00:00',
      signinType: 'normal',
      source: 'signin_qrcode',
      qrcodeId: 'QR20260520004',
      isProxy: true,
      proxyEmployeeId: 'E004',
      proxyEmployeeName: '赵六',
      location: '培训室A',
      latitude: 39.9042,
      longitude: 116.4074
    });

    console.log('\n--- 查看系统状态 ---');
    await getQueueList();
    await getSigninReport();
    await getFailedRecords();
    await getHrbpDashboard();

    console.log('\n========================================');
    console.log('✅ 所有测试场景执行完成!');
    console.log('========================================');
    console.log('\n📌 下一步操作:');
    console.log('  1. 打开前端: http://localhost:5173');
    console.log('  2. 使用 admin / 123456 登录');
    console.log('  3. 查看「补偿队列」处理重复记录');
    console.log('  4. 查看「签到报表」验证数据');
    console.log('  5. 查看「HRBP控制台」了解统计');
    console.log('  6. 查看「失败记录」了解异常');
    console.log('');

  } catch (error) {
    console.error('\n❌ 测试执行出错:', error);
    process.exit(1);
  }
}

runTestScenario();
