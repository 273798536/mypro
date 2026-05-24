import bcrypt from 'bcryptjs';
import sequelize from './index';
import { User } from '../models';
import { UserRole, DataSource } from '../models/types';

async function seed() {
  console.log('🌱 开始初始化测试数据...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const users = await User.bulkCreate([
      {
        username: 'admin',
        password: hashedPassword,
        realName: '系统管理员',
        email: 'admin@company.com',
        role: UserRole.SUPERVISOR,
        department: '人力资源部',
        isActive: true
      },
      {
        username: 'reviewer',
        password: hashedPassword,
        realName: '张复核',
        email: 'reviewer@company.com',
        role: UserRole.REVIEWER,
        department: '人力资源部',
        isActive: true
      },
      {
        username: 'entry',
        password: hashedPassword,
        realName: '李录入',
        email: 'entry@company.com',
        role: UserRole.DATA_ENTRY,
        department: '培训部',
        isActive: true
      },
      {
        username: 'viewer',
        password: hashedPassword,
        realName: '王查看',
        email: 'viewer@company.com',
        role: UserRole.READ_ONLY,
        department: '财务部',
        isActive: true
      }
    ]);
    
    console.log('✅ 测试用户创建成功:');
    console.log('  - admin / 123456 (主管权限)');
    console.log('  - reviewer / 123456 (复核权限)');
    console.log('  - entry / 123456 (录入权限)');
    console.log('  - viewer / 123456 (只读权限)');
    
    console.log('\n✅ 数据初始化完成!');
    
  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
