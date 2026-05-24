"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const database_config_1 = require("./database.config");
const user_entity_1 = require("../entities/user.entity");
const role_enum_1 = require("../common/enums/role.enum");
async function seed() {
    const dataSource = new typeorm_1.DataSource(database_config_1.databaseConfig);
    await dataSource.initialize();
    const userRepository = dataSource.getRepository(user_entity_1.User);
    const users = [
        {
            username: 'operator1',
            password: '123456',
            name: '张录入',
            role: role_enum_1.Role.OPERATOR,
        },
        {
            username: 'reviewer1',
            password: '123456',
            name: '李复核',
            role: role_enum_1.Role.REVIEWER,
        },
        {
            username: 'manager1',
            password: '123456',
            name: '王主管',
            role: role_enum_1.Role.MANAGER,
        },
        {
            username: 'viewer1',
            password: '123456',
            name: '赵查看',
            role: role_enum_1.Role.VIEWER,
        },
    ];
    for (const userData of users) {
        const existing = await userRepository.findOne({ where: { username: userData.username } });
        if (!existing) {
            const user = userRepository.create(userData);
            await userRepository.save(user);
            console.log(`Created user: ${userData.username} (${userData.role})`);
        }
        else {
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
//# sourceMappingURL=seed.js.map