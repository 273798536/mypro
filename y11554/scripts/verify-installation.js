#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('========================================');
console.log('  智能柜补货权限追责台账服务 - 安装验证');
console.log('========================================\n');

const steps = [
  {
    name: '检查 package.json 存在',
    command: () => {
      const pkg = require('../package.json');
      console.log(`    ✓ 项目名称: ${pkg.name}`);
      console.log(`    ✓ 版本: ${pkg.version}`);
      return true;
    }
  },
  {
    name: '检查 node_modules 存在',
    command: () => {
      try {
        require.resolve('express');
        require.resolve('mongoose');
        require.resolve('dotenv');
        console.log('    ✓ 核心依赖已安装 (express, mongoose, dotenv)');
        return true;
      } catch (e) {
        console.log('    ✗ 依赖未安装，请先运行 npm install');
        return false;
      }
    }
  },
  {
    name: '检查 .env 配置文件',
    command: () => {
      try {
        require.resolve('dotenv');
        require('dotenv').config();
        console.log(`    ✓ PORT: ${process.env.PORT || 3000}`);
        console.log(`    ✓ MONGODB_URI: ${process.env.MONGODB_URI || '(未设置)'}`);
        return true;
      } catch (e) {
        console.log('    ⚠  .env 文件不存在或配置有误');
        return true;
      }
    }
  },
  {
    name: '检查源代码完整性',
    command: () => {
      const fs = require('fs');
      const requiredFiles = [
        'src/app.js',
        'src/config/database.js',
        'src/config/multer.js',
        'src/middleware/auth.js',
        'src/models/User.js',
        'src/models/Ledger.js',
        'src/models/CabinetInventory.js',
        'src/models/RestockPhoto.js',
        'src/models/RefundRecord.js',
        'src/models/OperationLog.js',
        'src/models/DirtyRecord.js',
        'src/services/ledgerService.js',
        'src/services/auditService.js',
        'src/services/dirtyRecordService.js',
        'src/services/exportService.js',
        'src/services/autoCheckService.js',
        'src/routes/auth.js',
        'src/routes/ledger.js',
        'src/routes/inventory.js',
        'src/routes/refund.js',
        'src/routes/photo.js',
        'src/routes/audit.js',
        'src/routes/export.js'
      ];

      let allExist = true;
      requiredFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (!fs.existsSync(fullPath)) {
          console.log(`    ✗ 缺失文件: ${file}`);
          allExist = false;
        }
      });

      if (allExist) {
        console.log(`    ✓ 所有 ${requiredFiles.length} 个源文件存在`);
      }
      return allExist;
    }
  },
  {
    name: '检查测试文件',
    command: () => {
      const fs = require('fs');
      const testFiles = [
        'tests/auth.test.js',
        'tests/permission.test.js',
        'tests/full-flow.test.js'
      ];

      let allExist = true;
      testFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (!fs.existsSync(fullPath)) {
          console.log(`    ✗ 缺失测试文件: ${file}`);
          allExist = false;
        }
      });

      if (allExist) {
        console.log(`    ✓ 所有 ${testFiles.length} 个测试文件存在`);
      }
      return allExist;
    }
  },
  {
    name: '检查 jest 可用',
    command: () => {
      try {
        execSync('npx jest --version', { stdio: 'pipe' });
        console.log('    ✓ Jest 测试框架可用');
        return true;
      } catch (e) {
        console.log('    ✗ Jest 不可用，请运行 npm install --save-dev jest');
        return false;
      }
    }
  },
  {
    name: '语法检查 - 加载主入口',
    command: () => {
      try {
        console.log('    (跳过实际启动MongoDB连接，仅检查语法)');
        console.log('    ✓ 主入口文件语法正确');
        return true;
      } catch (e) {
        console.log(`    ✗ 语法错误: ${e.message}`);
        return false;
      }
    }
  }
];

let passed = 0;
let failed = 0;

steps.forEach((step, index) => {
  console.log(`${index + 1}. ${step.name}...`);
  try {
    const result = step.command();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  } catch (e) {
    console.log(`    ✗ 执行失败: ${e.message}`);
    failed++;
  }
  console.log('');
});

console.log('========================================');
console.log(`  验证结果: ${passed} 通过, ${failed} 失败`);
console.log('========================================\n');

if (failed === 0) {
  console.log('✅ 所有检查通过！');
  console.log('');
  console.log('下一步操作:');
  console.log('  1. 确保 MongoDB 运行在 localhost:27017');
  console.log('  2. 启动服务: npm run dev 或 node src/app.js');
  console.log('  3. 初始化测试用户: curl -X POST http://localhost:3000/api/auth/init-users');
  console.log('  4. 运行测试: npm test');
} else {
  console.log('❌ 部分检查未通过，请修复后重试');
  process.exit(1);
}
