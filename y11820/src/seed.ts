import { initDb, getDb, closeDb } from './db/init';
import sampleData from '../seed/sample-wallets.json';

function main() {
  initDb();
  const db = getDb();

  console.log('[SEED] 开始写入样例数据...');

  const transaction = db.transaction(() => {
    for (const w of sampleData.wallets) {
      try {
        db.prepare(
          'INSERT INTO wallet_addresses (address, chain, label, group_id) VALUES (?, ?, ?, ?)'
        ).run(w.address, w.chain, w.label, w.group_id || null);
        console.log(`  [钱包] ${w.label} (${w.chain}): ${w.address}`);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE')) {
          console.log(`  [钱包] 跳过已存在: ${w.label} (${w.chain})`);
        } else {
          throw err;
        }
      }
    }

    for (const t of sampleData.transfers) {
      try {
        db.prepare(
          'INSERT INTO chain_transfers (tx_hash, chain, from_address, to_address, token_symbol, amount, block_timestamp, is_internal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(t.tx_hash, t.chain, t.from_address, t.to_address, t.token_symbol, t.amount, t.block_timestamp, t.is_internal ? 1 : 0);
        console.log(`  [转账] ${t.token_symbol} ${t.amount} ${t.chain} ${t.is_internal ? '(内部)' : ''}`);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE')) {
          console.log(`  [转账] 跳过已存在: ${t.tx_hash}`);
        } else {
          throw err;
        }
      }
    }

    for (const b of sampleData.exchange_bills) {
      try {
        db.prepare(
          'INSERT INTO exchange_bills (exchange_name, asset_symbol, amount, bill_type, bill_date, reference_id) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(b.exchange_name, b.asset_symbol, b.amount, b.bill_type, b.bill_date, b.reference_id || null);
        console.log(`  [账单] ${b.exchange_name} ${b.asset_symbol} ${b.amount} ${b.bill_type}`);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE')) {
          console.log(`  [账单] 跳过已存在`);
        } else {
          throw err;
        }
      }
    }

    for (const p of sampleData.prices) {
      try {
        db.prepare(
          'INSERT INTO price_snapshots (token_symbol, price_usd, snapshot_date, source) VALUES (?, ?, ?, ?)'
        ).run(p.token_symbol, String(p.price_usd), p.snapshot_date, p.source || 'manual');
        console.log(`  [币价] ${p.token_symbol} $${p.price_usd} @ ${p.snapshot_date}`);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE')) {
          console.log(`  [币价] 跳过已存在: ${p.token_symbol} @ ${p.snapshot_date}`);
        } else {
          throw err;
        }
      }
    }

    for (const g of sampleData.gas_fees) {
      try {
        db.prepare(
          'INSERT INTO gas_fees (chain, tx_hash, gas_used, gas_price_gwei, fee_native, fee_usd, block_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(g.chain, g.tx_hash, g.gas_used, g.gas_price_gwei, g.fee_native, g.fee_usd || null, g.block_timestamp);
        console.log(`  [Gas] ${g.chain} ${g.tx_hash.slice(0, 10)}... $${g.fee_usd || 'N/A'}`);
      } catch (err: any) {
        if (err.message?.includes('UNIQUE')) {
          console.log(`  [Gas] 跳过已存在: ${g.tx_hash}`);
        } else {
          throw err;
        }
      }
    }
  });

  try {
    transaction();
    console.log('[SEED] 样例数据写入完成 ✓');
  } catch (err: any) {
    console.error('[SEED] 写入失败:', err.message);
    process.exit(1);
  }

  closeDb();
}

main();
