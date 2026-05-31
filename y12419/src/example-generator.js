const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { addDays, addHours, setHours, setMinutes, formatISO } = require('date-fns');

function generateExample(type, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseDate = new Date('2024-01-01');

  if (type === 'basic') {
    generateBasicExample(outputDir, baseDate);
  } else {
    generateEdgeCaseExample(outputDir, baseDate);
  }
}

function generateBasicExample(outputDir, baseDate) {
  const walletAddresses = [
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  ];

  const walletTransactions = [
    {
      hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      timestamp: formatISO(addDays(baseDate, 14)),
      blockNumber: '12345678',
      from: '0x0000000000000000000000000000000000000000',
      to: walletAddresses[0],
      tokenSymbol: 'ARB',
      tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      amount: '1250.5',
      amountUSD: '1563.125',
      transactionType: 'airdrop',
      gasFee: '0.001',
      gasFeeUSD: '2.5',
      methodId: 'claimAirdrop'
    },
    {
      hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      timestamp: formatISO(addDays(baseDate, 30)),
      blockNumber: '12345679',
      from: walletAddresses[0],
      to: walletAddresses[1],
      tokenSymbol: 'ETH',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      amount: '-1.5',
      amountUSD: '-3000',
      transactionType: 'transfer_out',
      gasFee: '0.005',
      gasFeeUSD: '10',
      methodId: 'transfer'
    },
    {
      hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      timestamp: formatISO(addDays(baseDate, 60)),
      blockNumber: '12345680',
      from: '0x0000000000000000000000000000000000000001',
      to: walletAddresses[0],
      tokenSymbol: 'OP',
      tokenAddress: '0x4200000000000000000000000000000000000042',
      amount: '800',
      amountUSD: '1200',
      transactionType: 'airdrop',
      gasFee: '0.0012',
      gasFeeUSD: '2.4',
      methodId: 'claim'
    },
    {
      hash: '0x4444444444444444444444444444444444444444444444444444444444444444',
      timestamp: formatISO(addDays(baseDate, 100)),
      blockNumber: '12345681',
      from: walletAddresses[0],
      to: '0xexchange1234567890123456789012345678901234',
      tokenSymbol: 'ARB',
      tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      amount: '-500',
      amountUSD: '-750',
      transactionType: 'sell',
      gasFee: '0.0008',
      gasFeeUSD: '1.6',
      methodId: 'swap'
    }
  ];

  const announcements = [
    {
      id: 'arb-airdrop-2024',
      projectName: 'Arbitrum',
      tokenSymbol: 'ARB',
      tokenAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      announcementDate: formatISO(addDays(baseDate, 0)),
      claimStartDate: formatISO(addDays(baseDate, 10)),
      claimEndDate: formatISO(addDays(baseDate, 60)),
      distributionDate: formatISO(addDays(baseDate, 14)),
      totalAllocation: 1250.5,
      lockupPeriod: 0,
      lockupEndDate: null,
      eligibilityCriteria: 'Early Arbitrum user',
      officialUrl: 'https://arbitrum.foundation',
      status: 'completed',
      withdrawalReason: ''
    },
    {
      id: 'op-airdrop-2024',
      projectName: 'Optimism',
      tokenSymbol: 'OP',
      tokenAddress: '0x4200000000000000000000000000000000000042',
      announcementDate: formatISO(addDays(baseDate, 45)),
      claimStartDate: formatISO(addDays(baseDate, 55)),
      claimEndDate: formatISO(addDays(baseDate, 100)),
      distributionDate: formatISO(addDays(baseDate, 60)),
      totalAllocation: 800,
      lockupPeriod: 180,
      lockupEndDate: formatISO(addDays(baseDate, 240)),
      vestingSchedule: [
        { percentage: 50, daysAfterDistribution: 0 },
        { percentage: 25, daysAfterDistribution: 90 },
        { percentage: 25, daysAfterDistribution: 180 }
      ],
      eligibilityCriteria: 'RetroPGF recipient',
      officialUrl: 'https://optimism.io',
      status: 'distributed',
      withdrawalReason: ''
    }
  ];

  const prices = [];
  for (let i = 0; i < 120; i++) {
    const date = addDays(baseDate, i);
    prices.push({
      tokenSymbol: 'ARB',
      timestamp: formatISO(date),
      priceUSD: (1.2 + Math.sin(i / 10) * 0.2).toFixed(4),
      source: 'coingecko'
    });
    prices.push({
      tokenSymbol: 'ETH',
      timestamp: formatISO(date),
      priceUSD: (2000 + Math.sin(i / 7) * 200).toFixed(2),
      source: 'coingecko'
    });
  }
  for (let i = 45; i < 120; i++) {
    const date = addDays(baseDate, i);
    prices.push({
      tokenSymbol: 'OP',
      timestamp: formatISO(date),
      priceUSD: (1.5 + Math.sin(i / 8) * 0.3).toFixed(4),
      source: 'coingecko'
    });
  }

  fs.writeFileSync(
    path.join(outputDir, 'wallet.csv'),
    stringify(walletTransactions, { header: true })
  );
  fs.writeFileSync(
    path.join(outputDir, 'announcements.json'),
    JSON.stringify(announcements, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'prices.csv'),
    stringify(prices, { header: true })
  );
}

function generateEdgeCaseExample(outputDir, baseDate) {
  const walletAddresses = [
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  ];

  const walletTransactions = [
    {
      hash: '0xedge_001_airdrop',
      timestamp: formatISO(addDays(baseDate, 15)),
      blockNumber: '12345700',
      from: '0x0000000000000000000000000000000000000000',
      to: walletAddresses[0],
      tokenSymbol: 'EDGE',
      tokenAddress: '0xedge123456789012345678901234567890123456',
      amount: '5000',
      amountUSD: '',
      transactionType: 'airdrop',
      gasFee: '0.001',
      gasFeeUSD: '2.5',
      methodId: 'claimAirdrop'
    },
    {
      hash: '0xedge_002_internal1',
      timestamp: formatISO(setMinutes(setHours(addDays(baseDate, 20), 10), 0)),
      blockNumber: '12345701',
      from: walletAddresses[0],
      to: walletAddresses[1],
      tokenSymbol: 'ETH',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      amount: '-2.5',
      amountUSD: '-5000',
      transactionType: 'transfer',
      gasFee: '0.005',
      gasFeeUSD: '10',
      methodId: 'transfer'
    },
    {
      hash: '0xedge_003_internal2_duplicate',
      timestamp: formatISO(setMinutes(setHours(addDays(baseDate, 20), 10), 5)),
      blockNumber: '12345702',
      from: walletAddresses[0],
      to: walletAddresses[1],
      tokenSymbol: 'ETH',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      amount: '-2.5',
      amountUSD: '-5000',
      transactionType: 'transfer',
      gasFee: '0.005',
      gasFeeUSD: '10',
      methodId: 'transfer'
    },
    {
      hash: '0xedge_004_internal3_back',
      timestamp: formatISO(setMinutes(setHours(addDays(baseDate, 20), 10), 10)),
      blockNumber: '12345703',
      from: walletAddresses[1],
      to: walletAddresses[0],
      tokenSymbol: 'ETH',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      amount: '2.5',
      amountUSD: '5000',
      transactionType: 'transfer',
      gasFee: '0.005',
      gasFeeUSD: '10',
      methodId: 'transfer'
    },
    {
      hash: '0xedge_005_early_unlock',
      timestamp: formatISO(addDays(baseDate, 30)),
      blockNumber: '12345704',
      from: '0xvestingcontract12345678901234567890123456789',
      to: walletAddresses[0],
      tokenSymbol: 'EDGE',
      tokenAddress: '0xedge123456789012345678901234567890123456',
      amount: '2000',
      amountUSD: '',
      transactionType: 'unlock',
      gasFee: '0.002',
      gasFeeUSD: '5',
      methodId: 'earlyUnlock'
    },
    {
      hash: '0xedge_006_sell_after_unlock',
      timestamp: formatISO(addDays(baseDate, 35)),
      blockNumber: '12345705',
      from: walletAddresses[0],
      to: '0xexchange1234567890123456789012345678901234',
      tokenSymbol: 'EDGE',
      tokenAddress: '0xedge123456789012345678901234567890123456',
      amount: '-1500',
      amountUSD: '-3000',
      transactionType: 'sell',
      gasFee: '0.001',
      gasFeeUSD: '2.5',
      methodId: 'swap'
    },
    {
      hash: '0xedge_007_withdrawn_airdrop',
      timestamp: formatISO(addDays(baseDate, 50)),
      blockNumber: '12345706',
      from: '0xscam1234567890123456789012345678901234567',
      to: walletAddresses[0],
      tokenSymbol: 'SCAM',
      tokenAddress: '0xscam1234567890123456789012345678901234567',
      amount: '10000',
      amountUSD: '',
      transactionType: 'airdrop',
      gasFee: '0.001',
      gasFeeUSD: '2.5',
      methodId: 'claim'
    }
  ];

  const announcements = [
    {
      id: 'edge-token-airdrop',
      projectName: 'Edge Protocol',
      tokenSymbol: 'EDGE',
      tokenAddress: '0xedge123456789012345678901234567890123456',
      announcementDate: formatISO(addDays(baseDate, 0)),
      claimStartDate: formatISO(addDays(baseDate, 10)),
      claimEndDate: formatISO(addDays(baseDate, 30)),
      distributionDate: formatISO(addDays(baseDate, 15)),
      totalAllocation: 5000,
      lockupPeriod: 90,
      lockupEndDate: formatISO(addDays(baseDate, 105)),
      vestingSchedule: [
        { percentage: 40, daysAfterDistribution: 0 },
        { percentage: 30, daysAfterDistribution: 45 },
        { percentage: 30, daysAfterDistribution: 90 }
      ],
      eligibilityCriteria: 'Testnet participant',
      officialUrl: 'https://edge-protocol.example',
      status: 'distributed',
      withdrawalReason: ''
    },
    {
      id: 'scam-airdrop-withdrawn',
      projectName: 'Scam Project',
      tokenSymbol: 'SCAM',
      tokenAddress: '0xscam1234567890123456789012345678901234567',
      announcementDate: formatISO(addDays(baseDate, 40)),
      claimStartDate: formatISO(addDays(baseDate, 45)),
      claimEndDate: formatISO(addDays(baseDate, 60)),
      distributionDate: formatISO(addDays(baseDate, 50)),
      totalAllocation: 10000,
      lockupPeriod: 0,
      lockupEndDate: null,
      eligibilityCriteria: 'Twitter follower',
      officialUrl: 'https://scam-project.example',
      status: 'withdrawn',
      withdrawalReason: '项目团队跑路,空投作废'
    }
  ];

  const prices = [];
  for (let i = 0; i < 15; i++) {
    const date = addDays(baseDate, i);
    prices.push({
      tokenSymbol: 'EDGE',
      timestamp: formatISO(date),
      priceUSD: (2.0 + Math.sin(i / 5) * 0.5).toFixed(4),
      source: 'coingecko'
    });
  }
  for (let i = 18; i < 60; i++) {
    const date = addDays(baseDate, i);
    prices.push({
      tokenSymbol: 'EDGE',
      timestamp: formatISO(date),
      priceUSD: (1.8 + Math.sin(i / 6) * 0.4).toFixed(4),
      source: 'coingecko'
    });
  }
  for (let i = 0; i < 60; i++) {
    const date = addDays(baseDate, i);
    prices.push({
      tokenSymbol: 'ETH',
      timestamp: formatISO(date),
      priceUSD: (2000 + Math.sin(i / 7) * 200).toFixed(2),
      source: 'coingecko'
    });
  }
  prices.push({
    tokenSymbol: 'SCAM',
    timestamp: formatISO(addDays(baseDate, 49)),
    priceUSD: '0.0001',
    source: 'dex'
  });
  prices.push({
    tokenSymbol: 'SCAM',
    timestamp: formatISO(addDays(baseDate, 55)),
    priceUSD: '0.0000001',
    source: 'dex'
  });

  fs.writeFileSync(
    path.join(outputDir, 'wallet-edge.csv'),
    stringify(walletTransactions, { header: true })
  );
  fs.writeFileSync(
    path.join(outputDir, 'announcements-edge.json'),
    JSON.stringify(announcements, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'prices-edge.csv'),
    stringify(prices, { header: true })
  );
}

module.exports = generateExample;
