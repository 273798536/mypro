const { initDatabase, closeDatabase } = require('./database/db');
const ContractService = require('./services/contract-service');
const TransactionService = require('./services/transaction-service');
const PowerService = require('./services/power-service');
const RefundService = require('./services/refund-service');
const { ConflictService } = require('./services/conflict-service');

function loadSampleData() {
  initDatabase();

  console.log('='.repeat(60));
  console.log('正在加载音乐节摊位押金清退示例数据...');
  console.log('='.repeat(60));

  const scenarios = [
    {
      name: '【顺利样例】老张烧烤 - 无冲突正常清退',
      contract: {
        contract_no: 'CT-2026-001',
        booth_id: 'A-01',
        merchant_name: '老张烧烤',
        deposit_amount: 5000,
        power_included_kw: 3,
        contract_date: '2026-05-01',
        check_in_date: '2026-05-28',
        check_out_date: '2026-05-30',
        status: 'active'
      },
      transactions: [
        {
          transaction_type: 'deposit',
          amount: 5000,
          transaction_date: '2026-05-01',
          payment_method: 'bank_transfer',
          operator: '财务小王',
          photo_url: '/photos/tx-001-receipt.jpg',
          photo_upload_time: '2026-05-01 15:30:00',
          is_reconciled: 1
        }
      ],
      powerRequests: [
        {
          request_kw: 5,
          request_date: '2026-05-28',
          usage_days: 3,
          unit_price: 50,
          total_amount: 750,
          is_paid_from_deposit: 1,
          operator: '现场电工老李',
          on_site_photo_url: '/photos/pw-001-site.jpg',
          on_site_photo_time: '2026-05-28 10:00:00',
          status: 'confirmed'
        }
      ],
      deductions: [],
      expected: {
        refund_amount: 4250,
        has_conflicts: false
      }
    },
    {
      name: '【扣罚争议】小美文创 - 设施损坏扣罚有争议',
      contract: {
        contract_no: 'CT-2026-002',
        booth_id: 'B-05',
        merchant_name: '小美文创',
        deposit_amount: 3000,
        power_included_kw: 2,
        contract_date: '2026-05-02',
        check_in_date: '2026-05-28',
        check_out_date: '2026-05-30',
        status: 'active'
      },
      transactions: [
        {
          transaction_type: 'deposit',
          amount: 3000,
          transaction_date: '2026-05-02',
          payment_method: 'cash',
          operator: '财务小王',
          photo_url: '/photos/tx-002-receipt.jpg',
          photo_upload_time: '2026-05-02 11:00:00',
          is_reconciled: 1
        }
      ],
      powerRequests: [],
      deductions: [
        {
          type: 'facility_damage',
          amount: 800,
          reason: '摊位桌椅损坏，需赔偿维修费',
          evidence: '/photos/damage-002.jpg',
          contested: true,
          contest_remark: '桌椅进场时就有划痕，有照片为证',
          status: 'contested'
        }
      ],
      expected: {
        refund_amount: 3000,
        has_conflicts: false
      }
    },
    {
      name: '【加电补录】阿强饮品 - 现场照片晚到3天',
      contract: {
        contract_no: 'CT-2026-003',
        booth_id: 'C-12',
        merchant_name: '阿强饮品',
        deposit_amount: 4000,
        power_included_kw: 2,
        contract_date: '2026-05-03',
        check_in_date: '2026-05-28',
        check_out_date: '2026-05-30',
        status: 'active'
      },
      transactions: [
        {
          transaction_type: 'deposit',
          amount: 4000,
          transaction_date: '2026-05-03',
          payment_method: 'wechat',
          operator: '财务小王',
          photo_url: '/photos/tx-003-receipt.jpg',
          photo_upload_time: '2026-05-03 16:00:00',
          is_reconciled: 1
        }
      ],
      powerRequests: [
        {
          request_kw: 8,
          request_date: '2026-05-29',
          usage_days: 2,
          unit_price: 60,
          total_amount: 960,
          is_paid_from_deposit: 1,
          operator: '现场电工老李',
          on_site_photo_url: null,
          on_site_photo_time: null,
          status: 'confirmed',
          remarks: '制冰机需要大功率供电'
        }
      ],
      deductions: [],
      expected: {
        refund_amount: 3040,
        has_conflicts: true
      }
    },
    {
      name: '【押金重复】大刘美食 - 押金交了两次',
      contract: {
        contract_no: 'CT-2026-004',
        booth_id: 'A-08',
        merchant_name: '大刘美食',
        deposit_amount: 6000,
        power_included_kw: 5,
        contract_date: '2026-05-05',
        check_in_date: '2026-05-28',
        check_out_date: '2026-05-30',
        status: 'active'
      },
      transactions: [
        {
          transaction_type: 'deposit',
          amount: 6000,
          transaction_date: '2026-05-05',
          payment_method: 'bank_transfer',
          operator: '财务小王',
          photo_url: '/photos/tx-004a-receipt.jpg',
          photo_upload_time: '2026-05-05 10:00:00',
          is_reconciled: 1,
          remarks: '第一次转账'
        },
        {
          transaction_type: 'deposit',
          amount: 6000,
          transaction_date: '2026-05-05',
          payment_method: 'bank_transfer',
          operator: '财务小张',
          photo_url: '/photos/tx-004b-receipt.jpg',
          photo_upload_time: '2026-05-05 14:30:00',
          is_reconciled: 0,
          remarks: '重复转账，未确认'
        }
      ],
      powerRequests: [],
      deductions: [],
      expected: {
        refund_amount: 6000,
        has_conflicts: true
      }
    },
    {
      name: '【多方冲突】小芳手作 - 押金不匹配+照片缺失+扣罚争议',
      contract: {
        contract_no: 'CT-2026-005',
        booth_id: 'B-15',
        merchant_name: '小芳手作',
        deposit_amount: 3500,
        power_included_kw: 2,
        contract_date: '2026-05-10',
        check_in_date: '2026-05-28',
        check_out_date: '2026-05-30',
        status: 'active'
      },
      transactions: [
        {
          transaction_type: 'deposit',
          amount: 3000,
          transaction_date: '2026-05-10',
          payment_method: 'alipay',
          operator: '财务小王',
          photo_url: '/photos/tx-005-receipt.jpg',
          photo_upload_time: '2026-05-10 09:00:00',
          is_reconciled: 1,
          remarks: '只收到3000，合同写的3500'
        }
      ],
      powerRequests: [
        {
          request_kw: 3,
          request_date: '2026-05-28',
          usage_days: 3,
          unit_price: 50,
          total_amount: 450,
          is_paid_from_deposit: 1,
          operator: '现场电工老李',
          on_site_photo_url: null,
          on_site_photo_time: null,
          status: 'confirmed'
        }
      ],
      deductions: [
        {
          type: 'cleaning_fee',
          amount: 200,
          reason: '摊位卫生不达标，需扣除清洁费',
          evidence: '/photos/dirty-005.jpg',
          contested: false,
          status: 'approved'
        }
      ],
      expected: {
        refund_amount: 2350,
        has_conflicts: true
      }
    }
  ];

  let successCount = 0;
  let failCount = 0;

  scenarios.forEach((scenario, index) => {
    console.log(`\n[${index + 1}/${scenarios.length}] ${scenario.name}`);
    console.log('-'.repeat(60));

    try {
      const contractResult = ContractService.createContract(scenario.contract);
      console.log(`  ✓ 创建合同: ${contractResult.contract_no}`);

      scenario.transactions.forEach((tx, i) => {
        const txResult = TransactionService.addTransaction({
          contract_no: contractResult.contract_no,
          ...tx
        });
        console.log(`  ✓ 押金流水${i + 1}: ${txResult.transaction_no} - ¥${tx.amount}`);
      });

      scenario.powerRequests.forEach((pr, i) => {
        const prResult = PowerService.addRequest({
          contract_no: contractResult.contract_no,
          ...pr
        });
        console.log(`  ✓ 加电申请${i + 1}: ${prResult.request_no} - ¥${prResult.total_amount}`);
      });

      const refundResult = RefundService.createRefundRecord(contractResult.contract_no, 'system');
      console.log(`  ✓ 清退计算: ${refundResult.refund_no}`);
      console.log(`    应退金额: ¥${refundResult.refund_amount}`);
      console.log(`    冲突标记: ${refundResult.has_conflicts ? '有' : '无'}`);

      scenario.deductions.forEach((ded, i) => {
        const trialResult = ConflictService.createDeductionTrial(
          refundResult.refund_no,
          ded.type,
          ded.amount,
          ded.reason,
          ded.evidence,
          '财务主管'
        );
        console.log(`  ✓ 扣罚试算${i + 1}: ${trialResult.trial_no} - ¥${ded.amount}`);

        if (ded.status === 'approved') {
          ConflictService.resolveDeductionTrial(trialResult.trial_no, 'approved');
          console.log(`    状态: 已批准`);
        }

        if (ded.contested) {
          ConflictService.contestDeduction(trialResult.trial_no, ded.contest_remark);
          console.log(`    状态: 商户提出争议`);
        }
      });

      if (scenario.name.includes('【加电补录】')) {
        const pr = PowerService.getRequestsByContract(contractResult.contract_no)[0];
        if (pr && !pr.on_site_photo_url) {
          console.log(`  ⚠  检测到照片缺失，模拟3天后补录...`);
          setTimeout(() => {
            PowerService.updateOnSitePhoto(
              pr.request_no,
              '/photos/pw-003-site-late.jpg',
              '2026-06-02 14:00:00'
            );
            console.log(`  ✓ 照片补录完成: ${pr.request_no}`);
          }, 100);
        }
      }

      const fullTrace = RefundService.getRefundWithEvidence(refundResult.refund_no);
      console.log(`  ✓ 证据链完整: ${fullTrace.evidence_chain.length}条证据`);
      console.log(`  ✓ 历史记录: ${fullTrace.history.length}条`);

      const isCorrect = Math.abs(refundResult.refund_amount - scenario.expected.refund_amount) < 0.01
        && refundResult.has_conflicts === scenario.expected.has_conflicts;

      if (isCorrect) {
        console.log(`  ✅ 结果符合预期`);
        successCount++;
      } else {
        console.log(`  ❌ 结果不符合预期`);
        console.log(`     预期: ¥${scenario.expected.refund_amount}, 实际: ¥${refundResult.refund_amount}`);
        failCount++;
      }

    } catch (error) {
      console.log(`  ❌ 处理失败: ${error.message}`);
      failCount++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`数据加载完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);
  console.log('='.repeat(60));

  console.log('\n📊 冲突概览:');
  const unresolved = ConflictService.getUnresolvedConflicts();
  unresolved.forEach(cf => {
    console.log(`  • ${cf.merchant_name}(${cf.booth_id}): ${cf.description}`);
  });

  closeDatabase();
}

loadSampleData();
