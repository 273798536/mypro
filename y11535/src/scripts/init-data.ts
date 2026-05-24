import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../database/data-source';
import { UserEntity } from '../database/entities/UserEntity';
import { Role } from '../types';

const users = [
  {
    id: 'user-admin-001',
    employeeId: 'ADMIN001',
    name: '系统管理员',
    role: Role.ADMIN,
    department: '人力资源部',
    password: 'admin123'
  },
  {
    id: 'user-hrbp-001',
    employeeId: 'HRBP001',
    name: 'HRBP张三',
    role: Role.HRBP,
    department: '人力资源部',
    password: 'hrbp123'
  },
  {
    id: 'user-training-001',
    employeeId: 'TRAIN001',
    name: '培训管理员李四',
    role: Role.TRAINING_ADMIN,
    department: '人力资源部',
    password: 'train123'
  },
  {
    id: 'user-manager-001',
    employeeId: 'MGR001',
    name: '部门经理王五',
    role: Role.DEPT_MANAGER,
    department: '技术研发部',
    password: 'mgr123'
  },
  {
    id: 'user-employee-001',
    employeeId: 'EMP001',
    name: '员工赵六',
    role: Role.EMPLOYEE,
    department: '技术研发部',
    password: 'emp123'
  },
  {
    id: 'user-auditor-001',
    employeeId: 'AUDIT001',
    name: '审计员钱七',
    role: Role.AUDITOR,
    department: '内审部',
    password: 'audit123'
  }
];

async function initUsers() {
  const userRepository = AppDataSource.getRepository(UserEntity);

  for (const user of users) {
    const existing = await userRepository.findOne({ where: { id: user.id } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const newUser = userRepository.create({
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
        department: user.department,
        permissions: [],
        isActive: true,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await userRepository.save(newUser);
      console.log(`Created user: ${user.name} (${user.role})`);
    } else {
      console.log(`User already exists: ${user.name}`);
    }
  }
}

AppDataSource.initialize()
  .then(async () => {
    console.log('Database connected');
    await initUsers();
    console.log('Data initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
