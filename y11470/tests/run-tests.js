const runTests = require('./test-core');

console.log('准备运行测试...\n');

runTests().then((allPassed) => {
  console.log('\n测试执行完成');
  process.exit(allPassed ? 0 : 1);
}).catch((err) => {
  console.error('测试执行出错:', err);
  process.exit(1);
});
