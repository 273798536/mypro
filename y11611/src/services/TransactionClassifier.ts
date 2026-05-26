import { DataStore } from '../models/store';
import { Transaction, WarningType, TransactionType } from '../models/types';

const BRIDGE_CONTRACTS = new Set([
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1',
  '0x4c6fc3b929839989570515435669696838636667',
  '0x1a2a06a37931336011183c42d4e323c41dca1881',
  '0x6a39909e805af3b8c4c3e9a0593d4d2a6c105966',
]);

export class TransactionClassifier {
  private store: DataStore;

  constructor() {
    this.store = DataStore.getInstance();
  }

  detectInternalTransfers(ownerId: string): {
    internalTransfers: Transaction[];
    marked: number;
  } {
    const ownerAddresses = new Set(
      this.store.getAddressesByOwner(ownerId).map(a => a.address.toLowerCase())
    );
    
    const transactions = this.store.getTransactionsByOwner(ownerId);
    const internalTransfers: Transaction[] = [];

    for (const tx of transactions) {
      const fromInternal = ownerAddresses.has(tx.fromAddress.toLowerCase());
      const toInternal = ownerAddresses.has(tx.toAddress.toLowerCase());

      if (fromInternal && toInternal) {
        if (!tx.isInternal) {
          this.store.updateTransaction(
            tx.id,
            {
              isInternal: true,
              type: 'internal_transfer'
            },
            'auto_detected_internal_transfer',
            'system'
          );
        }
        internalTransfers.push(tx);
      }
    }

    return {
      internalTransfers,
      marked: internalTransfers.filter(t => !t.isInternal).length
    };
  }

  detectBridgeTransactions(): {
    bridges: Transaction[];
    pairs: Map<string, Transaction[]>;
    duplicates: Transaction[];
  } {
    const transactions = this.store.getAllTransactions();
    const bridges: Transaction[] = [];
    const pairs = new Map<string, Transaction[]>();
    const duplicates: Transaction[] = [];

    for (const tx of transactions) {
      const isBridgeContract = BRIDGE_CONTRACTS.has(tx.toAddress.toLowerCase()) ||
                               BRIDGE_CONTRACTS.has(tx.fromAddress.toLowerCase());
      
      const hasBridgeMetadata = tx.metadata?.bridge || 
                                tx.type === 'bridge' ||
                                tx.txHash.toLowerCase().includes('bridge');

      if (isBridgeContract || hasBridgeMetadata || tx.isBridge) {
        if (!tx.isBridge) {
          this.store.updateTransaction(
            tx.id,
            { isBridge: true },
            'auto_detected_bridge_transaction',
            'system'
          );
        }
        bridges.push(tx);

        const pairKey = this.findBridgePairKey(tx, transactions);
        if (pairKey) {
          if (!pairs.has(pairKey)) {
            pairs.set(pairKey, []);
          }
          pairs.get(pairKey)!.push(tx);
        }
      }
    }

    for (const [key, pairTxs] of pairs) {
      if (pairTxs.length > 1) {
        for (const tx of pairTxs) {
          if (!tx.warnings.includes('bridge_duplicate')) {
            this.store.updateTransaction(
              tx.id,
              {
                warnings: [...tx.warnings, 'bridge_duplicate'],
                bridgePairId: key
              },
              'bridge_duplicate_detected',
              'system'
            );
            duplicates.push(tx);
          }
        }
      }
    }

    return { bridges, pairs, duplicates };
  }

  private findBridgePairKey(tx: Transaction, allTxs: Transaction[]): string | null {
    const timeWindow = 2 * 60 * 60 * 1000;
    const txTime = tx.timestamp.getTime();

    for (const other of allTxs) {
      if (other.id === tx.id) continue;
      if (other.chain === tx.chain) continue;

      const otherTime = other.timestamp.getTime();
      const timeDiff = Math.abs(otherTime - txTime);

      if (timeDiff < timeWindow) {
        const amountMatch = Math.abs(other.amount - tx.amount) / tx.amount < 0.05;
        if (amountMatch && other.tokenSymbol === tx.tokenSymbol) {
          return [tx.id, other.id].sort().join('_');
        }
      }
    }

    return null;
  }

  detectUnknownAddresses(): {
    warnings: Array<{ txId: string; address: string; direction: 'from' | 'to' }>;
  } {
    const knownAddresses = new Set(
      this.store.getAllAddresses().map(a => a.address.toLowerCase())
    );
    
    const transactions = this.store.getAllTransactions();
    const warnings: Array<{ txId: string; address: string; direction: 'from' | 'to' }> = [];

    for (const tx of transactions) {
      if (!knownAddresses.has(tx.fromAddress.toLowerCase())) {
        if (!tx.warnings.includes('address_unknown')) {
          this.store.updateTransaction(
            tx.id,
            { warnings: [...tx.warnings, 'address_unknown'] },
            'unknown_from_address',
            'system'
          );
        }
        warnings.push({ txId: tx.id, address: tx.fromAddress, direction: 'from' });
      }

      if (!knownAddresses.has(tx.toAddress.toLowerCase())) {
        if (!tx.warnings.includes('address_unknown') && tx.fromAddress.toLowerCase() !== tx.toAddress.toLowerCase()) {
          this.store.updateTransaction(
            tx.id,
            { warnings: [...tx.warnings, 'address_unknown'] },
            'unknown_to_address',
            'system'
          );
        }
        warnings.push({ txId: tx.id, address: tx.toAddress, direction: 'to' });
      }
    }

    return { warnings };
  }

  classifyIncomeExpense(ownerId: string): {
    income: Transaction[];
    expense: Transaction[];
    internal: Transaction[];
    needsReview: Transaction[];
  } {
    const ownerAddresses = new Set(
      this.store.getAddressesByOwner(ownerId).map(a => a.address.toLowerCase())
    );
    
    const transactions = this.store.getTransactionsByOwner(ownerId);
    const income: Transaction[] = [];
    const expense: Transaction[] = [];
    const internal: Transaction[] = [];
    const needsReview: Transaction[] = [];

    for (const tx of transactions) {
      if (tx.isInternal) {
        internal.push(tx);
        continue;
      }

      if (tx.warnings.length > 0) {
        needsReview.push(tx);
        continue;
      }

      const fromInternal = ownerAddresses.has(tx.fromAddress.toLowerCase());
      const toInternal = ownerAddresses.has(tx.toAddress.toLowerCase());

      let newType: TransactionType | null = null;

      if (!fromInternal && toInternal) {
        newType = 'income';
        income.push(tx);
      } else if (fromInternal && !toInternal) {
        newType = 'expense';
        expense.push(tx);
      } else {
        needsReview.push(tx);
      }

      if (newType && tx.type !== newType) {
        this.store.updateTransaction(
          tx.id,
          { type: newType },
          'auto_classified_income_expense',
          'system'
        );
      }
    }

    return { income, expense, internal, needsReview };
  }

  runAllChecks(ownerId: string): {
    internalTransfers: number;
    bridgeTransactions: number;
    bridgeDuplicates: number;
    addressesToReview: number;
    transactionsToReview: number;
  } {
    const internalResult = this.detectInternalTransfers(ownerId);
    const bridgeResult = this.detectBridgeTransactions();
    const addressResult = this.detectUnknownAddresses();
    const classifyResult = this.classifyIncomeExpense(ownerId);

    return {
      internalTransfers: internalResult.internalTransfers.length,
      bridgeTransactions: bridgeResult.bridges.length,
      bridgeDuplicates: bridgeResult.duplicates.length,
      addressesToReview: addressResult.warnings.length,
      transactionsToReview: classifyResult.needsReview.length
    };
  }
}
