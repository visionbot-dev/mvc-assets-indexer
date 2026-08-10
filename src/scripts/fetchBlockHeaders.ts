/**
 * 一次性初始化脚本：通过 RPC 补写 [SYNC_FROM_HEIGHT, 链头] 的区块头到 block 表。
 * 用于裁剪同步（SYNC_FROM_HEIGHT > 0）时，补全目标区间缺失的 block 记录。
 * 用法：npx ts-node src/scripts/fetchBlockHeaders.ts
 */
import axios from 'axios';
import * as mysql from 'mysql2/promise';
import { PromisePool } from '@supercharge/promise-pool';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = `http://${process.env.RPC_HOST}:${process.env.RPC_PORT}`;
const AUTH =
  'Basic ' +
  Buffer.from(
    `${process.env.RPC_USER}:${process.env.RPC_PASSWORD}`,
  ).toString('base64');

async function rpc(method: string, params: any[]) {
  const resp = await axios.post(
    RPC_URL,
    { jsonrpc: '1.0', id: Date.now() + Math.random(), method, params },
    {
      headers: { 'Content-Type': 'text/plain', Authorization: AUTH },
      timeout: 60000,
    },
  );
  if (resp.data.error) {
    throw new Error(`${method} error: ${JSON.stringify(resp.data.error)}`);
  }
  return resp.data.result;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB,
  });
  const start = parseInt(process.env.SYNC_FROM_HEIGHT || '0');
  const count = await rpc('getblockcount', []);
  console.log(`chain height=${count}, fetch headers ${start}..${count}`);

  // 已存在的 hash 集合（避免重复插入/重复 RPC）
  const [existRows]: any = await conn.query('SELECT hash FROM block');
  const existSet = new Set(existRows.map((r: any) => r.hash));

  const tasks: number[] = [];
  for (let h = start; h <= count; h++) {
    tasks.push(h);
  }

  let inserted = 0;
  let skipped = 0;
  await PromisePool.withConcurrency(8)
    .for(tasks)
    .process(async (h) => {
      const hash = await rpc('getblockhash', [h]);
      if (existSet.has(hash)) {
        skipped++;
        return;
      }
      const b = await rpc('getblockheader', [hash]);
      await conn.query(
        `INSERT INTO block (hash, size, height, versionHex, merkleroot, num_tx, process_count, time, mediantime, nonce, bits, difficulty, chainwork, previousblockhash, status, is_chaintips, is_tail, is_reorg, processStatus)
         VALUES (?,?,?,?,?,?,0,?,?,?,?,?,?,?,?,0,0,0,0)
         ON DUPLICATE KEY UPDATE hash=hash`,
        [
          b.hash,
          b.size || 0,
          b.height,
          b.versionHex,
          b.merkleroot,
          b.num_tx,
          b.time,
          b.mediantime,
          b.nonce,
          b.bits,
          b.difficulty,
          b.chainwork,
          b.previousblockhash,
          JSON.stringify({}),
        ],
      );
      inserted++;
      if (inserted % 500 === 0) {
        console.log(
          `progress: inserted=${inserted}, skipped=${skipped}, h=${h}`,
        );
      }
    });

  console.log(`DONE: inserted=${inserted}, skipped=${skipped}`);
  await conn.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('fetchBlockHeaders error:', e);
  process.exit(1);
});
