import { DataSource } from 'typeorm';
import { databaseConfig } from './database.config';
import { User } from '../entities/user.entity';
import { Role } from '../common/enums/role.enum';

async function seed() {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);

  const users = [
    {
      username: 'operator1',
      password: '123456',
      name: '张录入',
      role: Role.OPERATOR,
    },
    {
      username: 'reviewer1',
      password: '123456',
      name: '李复核',
      role: Role.REVIEWER,
    },
    {
      username: 'manager1',
      password: '123456',
      name: '王主管',
      role: Role.MANAGER,
    },
    {
      username: 'viewer1',
      password: '123456',
      name: '赵查看',
      role: Role.VIEWER,
    },
  ];

  for (const userData of users) {
    const existing = await userRepository.findOne({ where: { username: userData.username } });
    if (!existing) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`Created user: ${userData.username} (${userData.role})`);
    } else {
      console.log(`User already exists: ${userData.username}`);
    }
  }

  const allUsers = await userRepository.find();
  console.log('\nAll users:');
  allUsers.forEach(u => {
    console.log(`  ID: ${u.id}, Username: ${u.username}, Name: ${u.name}, Role: ${u.role}`);
  });

  await dataSource.destroy();
  console.log('\nSeed completed!');
}

seed().catch(console.error);
