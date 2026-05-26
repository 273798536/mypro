import { DataStore } from '../models/store';
import { Chain, TokenSymbol, TransactionType, TransactionSource } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class MockDataGenerator {
  private store: DataStore;

  constructor() {
    this.store = DataStore.getInstance();
  }

  generateDemoData(): {
    ownerId: string;
    addresses: string[];
    transactions: number;
    prices: number;
  } {
    this.store.clearAll();

    const owner = this.store.addOwner({
      name: '自由职业者 - 张三',
      email: 'zhangsan@example.com',
      addresses: []
    });

    const addresses: string[] = [];
    const walletAddresses = [
      { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB12', chain: 'ethereum' as Chain, label: '主钱包' },
      { address: '0x8A9c4d3e6f8a3b5c9d7e2f1a3b5c9d7e2f1a3b5c', chain: 'ethereum' as Chain, label: '备用钱包' },
      { address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', chain: 'polygon' as Chain, label: 'Polygon热钱包' },
      { address: 'BNB1xQpYzMnKpLqRsTwVzXuYpAsDfGhJkL', chain: 'bsc' as Chain, label: 'BSC钱包' },
      { address: '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1', chain: 'ethereum' as Chain, label: 'Binance Deposit', isExchange: true, exchangeName: 'Binance' },
    ];

    for (const addr of walletAddresses) {
      const wallet = this.store.addAddress({
        address: addr.address,
        chain: addr.chain,
        ownerId: owner.id,
        label: addr.label,
        isExchange: addr.isExchange || false,
        exchangeName: addr.exchangeName
      });
      addresses.push(wallet.id);
    }

    const prices = this.generatePriceData();

    const transactions = this.generateTransactionData(owner.id, walletAddresses);

    this.store.saveAll();

    return {
      ownerId: owner.id,
      addresses,
      transactions,
      prices
    };
  }

  private generatePriceData(): number {
    const priceData = [
      { symbol: 'ETH' as TokenSymbol, basePrice: 2200 },
      { symbol: 'MATIC' as TokenSymbol, basePrice: 0.75 },
      { symbol: 'BNB' as TokenSymbol, basePrice: 320 },
      { symbol: 'SOL' as TokenSymbol, basePrice: 95 },
    ];

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    let count = 0;
    for (const { symbol, basePrice } of priceData) {
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const variance = (Math.random() - 0.5) * 0.3;
        const price = basePrice * (1 + variance);
        
        this.store.addPrice({
          symbol,
          timestamp: new Date(currentDate),
          priceUsd: price,
          source: 'mock_coingecko',
          confidence: 0.9
        });
        count++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return count;
  }

  private generateTransactionData(ownerId: string, addresses: Array<{ address: string; chain: Chain; label: string }>): number {
    let count = 0;
    const startDate = new Date('2024-03-01');

    const scenarios = [
      ...this.generateIncomeScenarios(ownerId, addresses, startDate),
      ...this.generateExpenseScenarios(ownerId, addresses, startDate),
      ...this.generateInternalTransferScenarios(ownerId, addresses, startDate),
      ...this.generateBridgeScenarios(ownerId, addresses, startDate),
      ...this.generateExchangeScenarios(ownerId, addresses, startDate),
      ...this.generateGasFeeScenarios(ownerId, addresses, startDate),
    ];

    for (const tx of scenarios) {
      this.store.addTransaction(tx);
      count++;
    }

    return count;
  }

  private generateIncomeScenarios(ownerId: string, addresses: Array<{ address: string; chain: Chain }>, startDate: Date) {
    const txs = [];
    const incomeSources = [
      { from: '0xDa0c7aBcDeFgHiJkLmNoPqRsTuVwXyZaSdFgHjKl', amount: 2.5, symbol: 'ETH' as TokenSymbol, days: 5, type: 'income' as TransactionType },
      { from: '0xAbCdEfGhIjKlMnOpQrStUvWxYz1234567890aBcD', amount: 5000, symbol: 'USDC' as TokenSymbol, days: 12, type: 'income' as TransactionType },
      { from: '0xFeDcBa9876543210ZyXwVuTsRqPoNmLkJiHgFeD', amount: 1.2, symbol: 'ETH' as TokenSymbol, days: 25, type: 'income' as TransactionType },
      { from: '0x111122223333444455556666777788889999AaAa', amount: 8000, symbol: 'USDC' as TokenSymbol, days: 40, type: 'income' as TransactionType },
    ];

    const mainAddr = addresses[0];

    for (const income of incomeSources) {
      const txDate = new Date(startDate);
      txDate.setDate(txDate.getDate() + income.days);

      const price = this.store.getPrice(income.symbol, txDate);
      
      txs.push({
        txHash: `0x${uuidv4().replace(/-/g, '')}`,
        chain: mainAddr.chain,
        fromAddress: income.from,
        toAddress: mainAddr.address,
        tokenSymbol: income.symbol,
        amount: income.amount,
        timestamp: txDate,
        type: income.type,
        source: 'wallet' as TransactionSource,
        gasFee: 0.002 + Math.random() * 0.005,
        gasToken: 'ETH' as TokenSymbol,
        priceUsdAtTime: price?.priceUsd,
        priceSource: price?.source,
        isInternal: false,
        isBridge: false,
        ownerId,
        metadata: { incomeSource: 'freelance_work', client: income.from.substring(0, 10) }
      });
    }

    return txs;
  }

  private generateExpenseScenarios(ownerId: string, addresses: Array<{ address: string; chain: Chain }>, startDate: Date) {
    const txs = [];
    const expenses = [
      { to: '0xSeRvIcE1234567890PrOvIdErAaBcDeFgHiJkLmN', amount: 0.15, symbol: 'ETH' as TokenSymbol, days: 8 },
      { to: '0xNoDeSeRvEr9876543210AbCdEfGhIjKlMnOpQrS', amount: 250, symbol: 'USDC' as TokenSymbol, days: 18 },
    ];

    const mainAddr = addresses[0];

    for (const exp of expenses) {
      const txDate = new Date(startDate);
      txDate.setDate(txDate.getDate() + exp.days);

      const price = this.store.getPrice(exp.symbol, txDate);

      txs.push({
        txHash: `0x${uuidv4().replace(/-/g, '')}`,
        chain: mainAddr.chain,
        fromAddress: mainAddr.address,
        toAddress: exp.to,
        tokenSymbol: exp.symbol,
        amount: exp.amount,
        timestamp: txDate,
        type: 'expense' as TransactionType,
        source: 'wallet' as TransactionSource,
        gasFee: 0.001 + Math.random() * 0.003,
        gasToken: 'ETH' as TokenSymbol,
        priceUsdAtTime: price?.priceUsd,
        priceSource: price?.source,
        isInternal: false,
        isBridge: false,
        ownerId,
        metadata: { expenseCategory: 'tools' }
      });
    }

    return txs;
  }

  private generateInternalTransferScenarios(ownerId: string, addresses: Array<{ address: string; chain: Chain }>, startDate: Date) {
    const txs = [];
    const transfers = [
      { from: addresses[0], to: addresses[2], amount: 100, symbol: 'USDC' as TokenSymbol, days: 10 },
      { from: addresses[0], to: addresses[1], amount: 0.5, symbol: 'ETH' as TokenSymbol, days: 20 },
    ];

    for (const transfer of transfers) {
      const txDate = new Date(startDate);
      txDate.setDate(txDate.getDate() + transfer.days);

      const price = this.store.getPrice(transfer.symbol, txDate);

      txs.push({
        txHash: `0x${uuidv4().replace(/-/g, '')}`,
        chain: transfer.from.chain,
        fromAddress: transfer.from.address,
        toAddress: transfer.to.address,
        tokenSymbol: transfer.symbol,
        amount: transfer.amount,
        timestamp: txDate,
        type: 'transfer' as TransactionType,
        source: 'wallet' as TransactionSource,
        gasFee: 0.0015,
        gasToken: 'ETH' as TokenSymbol,
        priceUsdAtTime: price?.priceUsd,
        priceSource: price?.source,
        isInternal: false,
        isBridge: false,
        ownerId,
        metadata: { note: 'internal_fund_transfer' }
      });
    }

    return txs;
  }

  private generateBridgeScenarios(ownerId: string, addresses: Array<{ address: string; chain: Chain }>, startDate: Date) {
    const txs = [];
    const ethAddr = addresses[0];
    const polyAddr = addresses[2];

    const bridgeDate = new Date(startDate);
    bridgeDate.setDate(bridgeDate.getDate() + 15);
    const price = this.store.getPrice('USDC', bridgeDate);

    txs.push({
      txHash: `0x${uuidv4().replace(/-/g, '')}`,
      chain: ethAddr.chain,
      fromAddress: ethAddr.address,
      toAddress: '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1',
      tokenSymbol: 'USDC' as TokenSymbol,
      amount: 2000,
      timestamp: bridgeDate,
      type: 'bridge' as TransactionType,
      source: 'bridge' as TransactionSource,
      gasFee: 0.003,
      gasToken: 'ETH' as TokenSymbol,
      priceUsdAtTime: price?.priceUsd,
      priceSource: price?.source,
      isInternal: false,
      isBridge: true,
      ownerId,
      metadata: { bridge: 'polygon_bridge', destinationChain: 'polygon' }
    });

    const bridgeDate2 = new Date(bridgeDate);
    bridgeDate2.setMinutes(bridgeDate2.getMinutes() + 15);

    txs.push({
      txHash: `0x${uuidv4().replace(/-/g, '')}`,
      chain: polyAddr.chain,
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: polyAddr.address,
      tokenSymbol: 'USDC' as TokenSymbol,
      amount: 1998,
      timestamp: bridgeDate2,
      type: 'bridge' as TransactionType,
      source: 'bridge' as TransactionSource,
      gasFee: 0.01,
      gasToken: 'MATIC' as TokenSymbol,
      priceUsdAtTime: price?.priceUsd,
      priceSource: price?.source,
      isInternal: false,
      isBridge: true,
      ownerId,
      metadata: { bridge: 'polygon_bridge', sourceChain: 'ethereum' }
    });

    return txs;
  }

  private generateExchangeScenarios(ownerId: string, addresses: Array<{ address: string; chain: Chain }>, startDate: Date) {
    const txs = [];
    const mainAddr = addresses[0];
    const exchangeAddr = addresses[4];

    const withdrawDate = new Date(startDate);
    withdrawDate.setDate(withdrawDate.getDate() + 35);
    const ethPrice = this.store.getPrice('ETH', withdrawDate);

    txs.push({
      txHash: `0x${uuidv4().replace(/-/g, '')}`,
      chain: mainAddr.chain,
      fromAddress: exchangeAddr.address,
      toAddress: mainAddr.address,
      tokenSymbol: 'ETH' as TokenSymbol,
      amount: 0.8,
      timestamp: withdrawDate,
      type: 'exchange_withdraw' as TransactionType,
      source: 'exchange' as TransactionSource,
      gasFee: 0,
      gasToken: 'ETH' as TokenSymbol,
      priceUsdAtTime: ethPrice?.priceUsd,
      priceSource: ethPrice?.source,
      isInternal: false,
      isBridge: false,
      ownerId,
      metadata: { exchange: 'binance', withdrawalId: 'WDR123456' }
    });

    return txs;
  }

  private generateGasFeeScenarios(ownerId: string, addresses: Array<{ address: string; chain: Chain }>, startDate: Date) {
    const txs = [];
    const mainAddr = addresses[0];

    for (let i = 0; i < 5; i++) {
      const txDate = new Date(startDate);
      txDate.setDate(txDate.getDate() + i * 7 + 3);
      const ethPrice = this.store.getPrice('ETH', txDate);

      txs.push({
        txHash: `0x${uuidv4().replace(/-/g, '')}`,
        chain: mainAddr.chain,
        fromAddress: mainAddr.address,
        toAddress: `0xCoNtRaCt${i}${uuidv4().substring(2, 30)}`,
        tokenSymbol: 'ETH' as TokenSymbol,
        amount: 0,
        timestamp: txDate,
        type: 'gas' as TransactionType,
        source: 'wallet' as TransactionSource,
        gasFee: 0.002 + Math.random() * 0.008,
        gasToken: 'ETH' as TokenSymbol,
        priceUsdAtTime: ethPrice?.priceUsd,
        priceSource: ethPrice?.source,
        isInternal: false,
        isBridge: false,
        ownerId,
        metadata: { contractInteraction: true, functionName: 'approve' }
      });
    }

    return txs;
  }
}
