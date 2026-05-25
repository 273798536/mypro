const http = require('http');
const express = require('express');

console.log('测试端口启动...');

const ports = [50001, 49152, 51000, 52000, 53000];
let currentPortIndex = 0;

function testPort(port) {
  return new Promise((resolve) => {
    const app = express();
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`✓ 端口 ${port} 可用`);
      server.close();
      resolve({ port, success: true });
    });
    server.on('error', (err) => {
      console.log(`✗ 端口 ${port} 失败: ${err.code}`);
      server.close();
      resolve({ port, success: false, error: err.code });
    });
    setTimeout(() => {
      server.close();
      resolve({ port, success: false, error: 'timeout' });
    }, 3000);
  });
}

async function runTests() {
  for (const port of ports) {
    const result = await testPort(port);
    if (result.success) {
      console.log(`\n找到可用端口: ${port}`);
      process.exit(0);
    }
  }
  console.log('\n所有测试端口均不可用');
  process.exit(1);
}

runTests();
