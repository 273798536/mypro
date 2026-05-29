const { initDatabase } = require('./src/config/database');
const crudService = require('./src/services/crud-service');

async function debug() {
  await initDatabase();

  console.log('1. 测试创建项目...');
  const project = crudService.projects.create({
    name: '测试项目',
    film_name: '测试影片',
    total_budget: 1000000,
    created_by: 'debug'
  });
  console.log('创建项目结果:', JSON.stringify(project, null, 2));

  console.log('\n2. 测试查询项目...');
  const projects = crudService.projects.getAll();
  console.log('所有项目:', JSON.stringify(projects, null, 2));
}

debug().catch(err => {
  console.error('错误:', err);
  console.error('堆栈:', err.stack);
});
