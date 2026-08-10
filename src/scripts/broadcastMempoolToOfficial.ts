/**
 * mempool 补偿广播工具：
 * 将本地节点 mempool 中的交易按交易链依赖顺序（旧→新：被引用的交易先广播）
 * 广播到官方端点，补偿本地节点与官方节点间 mempool 同步不稳定。
 *
 * 用法：
 *   npx ts-node src/scripts/broadcastMempoolToOfficial.ts          # 单次运行
 *   npx ts-node src/scripts/broadcastMempoolToOfficial.ts --watch  # 轮询模式（默认 30s）
 *
 * 增量逻辑：
 *   - 已推送过的交易 txid 记录到本地文件（默认 /tmp/mvc_broadcasted_txids.json），
 *     重启后仍保留，避免重复推送
 *   - 每轮只推送"新增"交易（当前 mempool - 已推送记录）
 *   - 记录自动清理：已推送但已不在 mempool 中的 txid 会被删除（交易已确认/移除），
 *     记录规模 = 当前 mempool 规模，不会膨胀
 *
 * 配置（.env）：
 *   # 本地节点 RPC（读 mempool 用，复用 RPC_* 变量）
 *   RPC_HOST / RPC_PORT / RPC_USER / RPC_PASSWORD
 *   # 官方端点（二选一）
 *   OFFICIAL_ENDPOINT_TYPE=rpc|http
 *   # rpc 模式：
 *   OFFICIAL_RPC_HOST / OFFICIAL_RPC_PORT / OFFICIAL_RPC_USER / OFFICIAL_RPC_PASSWORD
 *   # http 模式（POST JSON { hex } 的广播端点）：
 *   OFFICIAL_HTTP_URL=https://.../tx/broadcast
 *   # watch 模式轮询间隔（ms）
 *   BROADCAST_POLL_INTERVAL=30000
 *   # 已推送记录文件路径
 *   BROADCAST_RECORD_FILE=/tmp/mvc_broadcasted_txids.json
 *
 * 失败策略：already-known（"already in mempool/block chain"）跳过继续；
 *          其他错误中断（单次模式退出，watch 模式停止本轮等待下一轮）。
 */
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// ---------------- 配置 ----------------
const LOCAL_RPC_URL = `http://${process.env.RPC_HOST || '127.0.0.1'}:${process.env.RPC_PORT || '9882'}`;
const LOCAL_AUTH = 'Basic ' + Buffer.from(`${process.env.RPC_USER}:${process.env.RPC_PASSWORD}`).toString('base64');

const OFFICIAL_TYPE = (process.env.OFFICIAL_ENDPOINT_TYPE || 'rpc').toLowerCase();
const OFFICIAL_RPC_URL = `http://${process.env.OFFICIAL_RPC_HOST || ''}:${process.env.OFFICIAL_RPC_PORT || '9882'}`;
const OFFICIAL_AUTH =
  'Basic ' +
  Buffer.from(
    `${process.env.OFFICIAL_RPC_USER || ''}:${process.env.OFFICIAL_RPC_PASSWORD || ''}`,
  ).toString('base64');
const OFFICIAL_HTTP_URL = process.env.OFFICIAL_HTTP_URL || '';
const POLL_INTERVAL = Number(process.env.BROADCAST_POLL_INTERVAL || 30000);
const RECORD_FILE = process.env.BROADCAST_RECORD_FILE || '/tmp/mvc_broadcasted_txids.json';

const WATCH = process.argv.includes('--watch');

// ---------------- RPC 帮助 ----------------
async function rpcRaw(url: string, auth: string, method: string, params: any[]) {
  const resp = await axios.post(
    url,
    { jsonrpc: '1.0', id: Date.now() + Math.random(), method, params },
    {
      headers: { 'Content-Type': 'text/plain', Authorization: auth },
      timeout: 60000,
    },
  );
  return resp.data; // { result, error }
}

async function rpc(url: string, auth: string, method: string, params: any[]) {
  const data = await rpcRaw(url, auth, method, params);
  if (data.error) {
    throw new Error(`${method} error: ${JSON.stringify(data.error)}`);
  }
  return data.result;
}

// ---------------- 已推送记录（持久化，只存 txid） ----------------
function loadRecord(): Set<string> {
  try {
    const data = JSON.parse(fs.readFileSync(RECORD_FILE, 'utf-8'));
    return new Set(Array.isArray(data) ? data : []);
  } catch {
    return new Set();
  }
}

function saveRecord(record: Set<string>) {
  fs.writeFileSync(RECORD_FILE, JSON.stringify([...record]));
}

// ---------------- 交易输入解析（纯 JS，无 mvc-lib 依赖） ----------------
function readVarInt(b: Buffer, i: number): { value: number; len: number } {
  const first = b[i];
  if (first < 0xfd) return { value: first, len: 1 };
  if (first === 0xfd) return { value: b.readUInt16LE(i + 1), len: 3 };
  if (first === 0xfe) return { value: b.readUInt32LE(i + 1), len: 5 };
  return { value: Number(b.readBigUInt64LE(i + 1)), len: 9 };
}

function parseTxInputs(hex: string): { prevTxId: string; outputIndex: number }[] {
  const b = Buffer.from(hex, 'hex');
  let i = 4; // version
  const nIn = readVarInt(b, i);
  i += nIn.len;
  const inputs: { prevTxId: string; outputIndex: number }[] = [];
  for (let k = 0; k < nIn.value; k++) {
    const prevTxId = Buffer.from(b.slice(i, i + 32)).reverse().toString('hex');
    i += 32;
    const outputIndex = b.readUInt32LE(i);
    i += 4;
    const sl = readVarInt(b, i);
    i += sl.len + sl.value; // scriptSig
    i += 4; // sequence
    inputs.push({ prevTxId, outputIndex });
  }
  return inputs;
}

const COINBASE_PREV = '0000000000000000000000000000000000000000000000000000000000000000';

// ---------------- 广播 ----------------
function isAlreadyKnownError(err: any): boolean {
  const msg = String((err && (err.message || err)) || '').toLowerCase();
  return (
    msg.includes('already in block chain') ||
    msg.includes('already in the mempool') ||
    msg.includes('txn-already-in-mempool') ||
    msg.includes('txn-already-in-chain') ||
    msg.includes('txn-already-known') ||
    msg.includes('already known')
  );
}

async function broadcastOne(hex: string, txid: string): Promise<'ok' | 'already'> {
  if (OFFICIAL_TYPE === 'http') {
    if (!OFFICIAL_HTTP_URL) throw new Error('OFFICIAL_ENDPOINT_TYPE=http 但未配置 OFFICIAL_HTTP_URL');
    const resp = await axios.post(
      OFFICIAL_HTTP_URL,
      { hex },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000, validateStatus: () => true },
    );
    const body = resp.data || {};
    if (resp.status >= 200 && resp.status < 300) {
      // 成功判定：indexer 风格无 code 字段 / code===0
      if (body.code === undefined || body.code === 0) return 'ok';
      // 业务错误（官方 API：code=1 + message）
      const errMsg = JSON.stringify(body.message || body);
      if (isAlreadyKnownError(errMsg)) return 'already';
      throw new Error(`广播 ${txid} 失败: ${errMsg}`);
    }
    const errMsg = JSON.stringify(body.error || body.message || `HTTP ${resp.status}`);
    if (isAlreadyKnownError(errMsg)) return 'already';
    throw new Error(`广播 ${txid} 失败: ${errMsg}`);
  }
  // rpc 模式（节点可能对已存在交易返回 HTTP 404/500 + JSON-RPC error，需解析响应体）
  const resp = await axios.post(
    OFFICIAL_RPC_URL,
    { jsonrpc: '1.0', id: Date.now() + Math.random(), method: 'sendrawtransaction', params: [hex] },
    {
      headers: { 'Content-Type': 'text/plain', Authorization: OFFICIAL_AUTH },
      timeout: 60000,
      validateStatus: () => true,
    },
  );
  const data = resp.data || {};
  if (resp.status >= 200 && resp.status < 300 && !data.error) return 'ok';
  const errMsg = JSON.stringify(data.error || `HTTP ${resp.status}`);
  if (isAlreadyKnownError(errMsg) || data.error?.code === -27) return 'already';
  throw new Error(`广播 ${txid} 失败: ${errMsg}`);
}

// ---------------- 主流程 ----------------
async function runOnce(): Promise<void> {
  // 1. 获取本地 mempool
  const txidList: string[] = await rpc(LOCAL_RPC_URL, LOCAL_AUTH, 'getrawmempool', []);
  const currentSet = new Set(txidList);

  // 2. 加载已推送记录，并清理"已不在 mempool"的 txid（交易已确认/移除，无需保留）
  const record = loadRecord();
  let pruned = 0;
  for (const txid of record) {
    if (!currentSet.has(txid)) {
      record.delete(txid);
      pruned++;
    }
  }

  // 3. 只处理新增交易（mempool - 已推送）
  const newTxids = txidList.filter((t) => !record.has(t));
  if (newTxids.length === 0) {
    if (!WATCH) {
      console.log(`[${new Date().toISOString()}] 无新增交易（记录 ${record.size} 笔，清理 ${pruned} 笔），无需广播`);
    }
    saveRecord(record);
    return;
  }
  console.log(
    `[${new Date().toISOString()}] 新增 ${newTxids.length} 笔交易（mempool ${txidList.length}，已推送记录 ${record.size}，清理 ${pruned}），开始按依赖链排序...`,
  );

  // 4. 拉取新增交易 raw hex + 解析输入
  const txMap = new Map<string, { hex: string; inputs: { prevTxId: string; outputIndex: number }[] }>();
  for (const txid of newTxids) {
    try {
      const hex = await rpc(LOCAL_RPC_URL, LOCAL_AUTH, 'getrawtransaction', [txid, false]);
      txMap.set(txid, { hex, inputs: parseTxInputs(hex) });
    } catch (e: any) {
      console.error(`获取交易 ${txid} raw 失败（可能已被确认/移除），跳过: ${e.message}`);
    }
  }
  if (txMap.size === 0) {
    console.log('未能获取任何新增交易的 raw hex');
    saveRecord(record);
    return;
  }

  // 5. 构建依赖图（仅限新增集合内互相引用；引用已推送/链上交易的输入不算依赖）
  const indegree = new Map<string, number>(); // txid → 依赖数（新增集合内）
  const dependents = new Map<string, string[]>(); // txid → 依赖它的交易列表
  for (const [txid, tx] of txMap) {
    let depCount = 0;
    const seenDep = new Set<string>();
    for (const input of tx.inputs) {
      if (input.prevTxId === COINBASE_PREV) continue;
      // 仅在新增集合内算依赖（已推送过的输入：官方已有，无需等待）
      if (txMap.has(input.prevTxId) && !seenDep.has(input.prevTxId)) {
        seenDep.add(input.prevTxId);
        depCount++;
        const list = dependents.get(input.prevTxId) || [];
        list.push(txid);
        dependents.set(input.prevTxId, list);
      }
    }
    indegree.set(txid, depCount);
  }

  // 6. 拓扑分层（Kahn）：入度 0 的先广播（无新增集合内依赖 = 最旧）
  const queue: string[] = [...txMap.keys()].filter((t) => indegree.get(t) === 0);
  let broadcasted = 0;
  let already = 0;
  while (queue.length > 0) {
    const batch = queue;
    queue.length = 0;
    for (const txid of batch) {
      const tx = txMap.get(txid)!;
      try {
        const res = await broadcastOne(tx.hex, txid);
        if (res === 'ok') {
          broadcasted++;
          console.log(`  ✅ 广播成功 ${txid.slice(0, 16)}...`);
        } else {
          already++;
          console.log(`  ⏭️  already-known 跳过 ${txid.slice(0, 16)}...`);
        }
        record.add(txid); // 成功/already 都视为已推送
      } catch (e: any) {
        // 非 already 错误：中断（用户策略）；失败的不入记录，下轮重试
        console.error(`\n❌ 广播 ${txid.slice(0, 16)}... 失败，中断: ${e.message}`);
        console.error(`   已广播 ${broadcasted} 笔，already-known ${already} 笔，剩余 ${txMap.size - broadcasted - already} 笔未处理`);
        saveRecord(record);
        process.exitCode = 1;
        return;
      }
      // 广播（或已存在）后，解除依赖它的交易的约束
      for (const dep of dependents.get(txid) || []) {
        const d = indegree.get(dep)! - 1;
        indegree.set(dep, d);
        if (d === 0) queue.push(dep);
      }
    }
  }
  // 残留 = 环（mempool 内互相引用成环，正常不会出现）
  const cycle = [...txMap.keys()].filter((t) => indegree.get(t)! > 0);

  saveRecord(record);
  console.log(`\n===== 本次广播汇总 =====`);
  console.log(`新增交易: ${txMap.size}`);
  console.log(`广播成功: ${broadcasted}`);
  console.log(`already-known: ${already}`);
  console.log(`已推送记录: ${record.size} 笔`);
  if (cycle.length > 0) {
    console.log(`⚠️ 存在依赖环未广播: ${cycle.length} 笔（${cycle.slice(0, 5).join(', ')}...）`);
  }
}

async function main() {
  if (!WATCH) {
    await runOnce();
    return;
  }
  console.log(`[${new Date().toISOString()}] 轮询模式启动，间隔 ${POLL_INTERVAL}ms（Ctrl+C 退出），记录文件: ${RECORD_FILE}`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runOnce();
    } catch (e: any) {
      console.error(`[${new Date().toISOString()}] 本轮执行出错: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main().catch((e) => {
  console.error('工具执行失败:', e.message);
  process.exit(1);
});
