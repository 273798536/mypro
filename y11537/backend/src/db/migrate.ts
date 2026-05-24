import sequelize from './index';
import {
  User,
  TrainingRegistration,
  SigninRecord,
  Homework,
  ManualPriceAdjustment,
  CompensationQueue,
  AuditLog,
  FailedRecord
} from '../models';

async function migrate() {
  console.log('🚀 开始数据库迁移...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    await sequelize.sync({ alter: true });
    console.log('✅ 所有表创建/更新成功');
    
    console.log('\n📋 创建的表:');
    console.log('  - users (用户表)');
    console.log('  - training_registrations (报名表)');
    console.log('  - signin_records (签到记录表)');
    console.log('  - homeworks (课后作业表)');
    console.log('  - manual_price_adjustments (手工改价表)');
    console.log('  - compensation_queue (补偿队列表)');
    console.log('  - audit_logs (审计日志表)');
    console.log('  - failed_records (失败记录表)');
    
    console.log('\n✅ 数据库迁移完成!');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
