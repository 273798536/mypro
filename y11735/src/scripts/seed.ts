import { sequelize, Student, Card, SubsidyRule, LostCard, GraduationStatus } from '../models';

async function seed() {
  await sequelize.sync({ force: true });
  console.log('数据库重置完成');

  await SubsidyRule.bulkCreate([
    {
      ruleCode: 'SUBSIDY001',
      ruleName: '普通生活补贴',
      subsidyType: '生活补贴',
      isRefundable: true,
      description: '普通生活补贴可退',
      source: '学生资助管理系统'
    },
    {
      ruleCode: 'SUBSIDY002',
      ruleName: '困难补助',
      subsidyType: '困难补助',
      isRefundable: false,
      description: '困难补助不可退',
      source: '学生资助管理系统'
    },
    {
      ruleCode: 'SUBSIDY003',
      ruleName: '奖学金',
      subsidyType: '奖学金',
      isRefundable: true,
      description: '奖学金可退',
      source: '学生资助管理系统'
    }
  ]);
  console.log('补贴规则数据已插入');

  const students = await Student.bulkCreate([
    {
      studentId: '2020001',
      name: '张三',
      department: '计算机学院',
      grade: '2020级',
      className: '计科1班',
      phone: '13800138001',
      bankCard: '6222021234567890001',
      source: '学生档案系统'
    },
    {
      studentId: '2020002',
      name: '李四',
      department: '经济管理学院',
      grade: '2020级',
      className: '金融1班',
      phone: '13800138002',
      bankCard: '6222021234567890002',
      source: '学生档案系统'
    },
    {
      studentId: '2020003',
      name: '王五',
      department: '外国语学院',
      grade: '2020级',
      className: '英语1班',
      phone: '13800138003',
      bankCard: '6222021234567890003',
      source: '学生档案系统'
    },
    {
      studentId: '2020004',
      name: '赵六',
      department: '机械工程学院',
      grade: '2020级',
      className: '机械1班',
      phone: '13800138004',
      bankCard: '6222021234567890004',
      source: '学生档案系统'
    },
    {
      studentId: '2020005',
      name: '孙七',
      department: '信息工程学院',
      grade: '2020级',
      className: '通信1班',
      phone: '13800138005',
      bankCard: '6222021234567890005',
      source: '学生档案系统'
    },
    {
      studentId: '2020006',
      name: '周八',
      department: '材料科学与工程学院',
      grade: '2020级',
      className: '材料1班',
      phone: '13800138006',
      bankCard: '6222021234567890006',
      source: '学生档案系统'
    }
  ]);
  console.log('学生档案数据已插入');

  await Card.bulkCreate([
    {
      cardNo: 'CARD001',
      studentId: '2020001',
      balance: 580.50,
      selfRecharge: 400.00,
      subsidyAmount: 180.50,
      status: 'active',
      source: '一卡通系统'
    },
    {
      cardNo: 'CARD002',
      studentId: '2020002',
      balance: 1250.00,
      selfRecharge: 800.00,
      subsidyAmount: 450.00,
      status: 'active',
      source: '一卡通系统'
    },
    {
      cardNo: 'CARD003',
      studentId: '2020003',
      balance: 320.00,
      selfRecharge: 320.00,
      subsidyAmount: 0.00,
      status: 'active',
      source: '一卡通系统'
    },
    {
      cardNo: 'CARD004',
      studentId: '2020004',
      balance: 890.00,
      selfRecharge: 500.00,
      subsidyAmount: 390.00,
      status: 'lost',
      source: '一卡通系统'
    },
    {
      cardNo: 'CARD005',
      studentId: '2020005',
      balance: 2100.00,
      selfRecharge: 1500.00,
      subsidyAmount: 600.00,
      status: 'active',
      source: '一卡通系统'
    },
    {
      cardNo: 'CARD006',
      studentId: '2020006',
      balance: 750.00,
      selfRecharge: 450.00,
      subsidyAmount: 300.00,
      status: 'active',
      source: '一卡通系统'
    }
  ]);
  console.log('卡片余额数据已插入');

  await LostCard.bulkCreate([
    {
      cardNo: 'CARD004',
      studentId: '2020004',
      lostDate: new Date('2024-05-20'),
      status: 'confirmed',
      reportedBy: '赵六',
      source: '挂失系统'
    }
  ]);
  console.log('挂失记录数据已插入');

  await GraduationStatus.bulkCreate([
    {
      studentId: '2020001',
      status: 'approved',
      checkDate: new Date('2024-06-01'),
      checker: '教务处',
      remarks: '所有手续已完成',
      source: '离校系统'
    },
    {
      studentId: '2020002',
      status: 'approved',
      checkDate: new Date('2024-06-02'),
      checker: '教务处',
      remarks: '所有手续已完成',
      source: '离校系统'
    },
    {
      studentId: '2020003',
      status: 'pending',
      remarks: '图书馆待还书',
      source: '离校系统'
    },
    {
      studentId: '2020004',
      status: 'approved',
      checkDate: new Date('2024-06-01'),
      checker: '教务处',
      remarks: '所有手续已完成',
      source: '离校系统'
    },
    {
      studentId: '2020005',
      status: 'rejected',
      checkDate: new Date('2024-06-01'),
      checker: '财务处',
      remarks: '欠缴学费',
      source: '离校系统'
    },
    {
      studentId: '2020006',
      status: 'approved',
      checkDate: new Date('2024-06-03'),
      checker: '教务处',
      remarks: '所有手续已完成',
      source: '离校系统'
    }
  ]);
  console.log('离校状态数据已插入');

  console.log('\n测试数据插入完成！');
  console.log('\n测试场景说明：');
  console.log('1. 2020001 张三 - 正常可退款（余额580.50）');
  console.log('2. 2020002 李四 - 正常可退款（余额1250.00）');
  console.log('3. 2020003 王五 - 离校待确认（警告）');
  console.log('4. 2020004 赵六 - 卡片已挂失（拦截）');
  console.log('5. 2020005 孙七 - 离校被拒绝（拦截）');
  console.log('6. 2020006 周八 - 正常可退款（余额750.00）');
  console.log('\n补贴规则：SUBSIDY002 困难补助不可退');

  process.exit(0);
}

seed().catch(console.error);
