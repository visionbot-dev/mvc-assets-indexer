import { Injectable, Logger } from '@nestjs/common';
import { RpcService } from '../../service/rpc/rpc.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockEntity } from '../../entities/block.entity';
import { TransactionEntity } from '../../entities/transaction.entity';
import * as mvc from 'mvc-lib';

@Injectable()
export class DefaultService {
  private readonly logger = new Logger(DefaultService.name);
  constructor(
    @InjectRepository(BlockEntity)
    private blockEntityRepository: Repository<BlockEntity>,
    @InjectRepository(TransactionEntity)
    private transactionEntityRepository: Repository<TransactionEntity>,
    private readonly rpcService: RpcService,
  ) {}

  /** address_hex(hash160) → 地址字符串（MVC 主网 livenet） */
  private _addrHexToStr(addressHex: string): string {
    try {
      return new mvc.Address.fromPublicKeyHash(
        Buffer.from(addressHex, 'hex'),
      ).toString();
    } catch (e) {
      return addressHex;
    }
  }

  /** 查询某块的矿工地址与奖励（coinbase 首个 P2PKH 输出） */
  private async _blockMiner(
    blockHash: string,
  ): Promise<{ miner: string; reward: number; coinbase: string }> {
    const rows = await this.transactionEntityRepository.query(
      `SELECT tx.txid, tx_out.address_hex, tx_out.satoshis
       FROM tx JOIN tx_out ON tx.txid = tx_out.txid
       WHERE tx.block_hash = ? AND tx.tx_in_coinbase = 1 AND tx_out.script_type = 2
       ORDER BY tx_out.outputIndex ASC LIMIT 1`,
      [blockHash],
    );
    if (rows.length === 0) {
      return { miner: '', reward: 0, coinbase: '' };
    }
    return {
      miner: this._addrHexToStr(rows[0].address_hex),
      reward: Number(rows[0].satoshis || 0),
      coinbase: rows[0].txid,
    };
  }

  /** GET /block —— 区块列表（last 游标，默认最新 20 条） */
  async blockList(last: string) {
    let endHeight: number | null = null;
    if (last) {
      const lastRecord = await this.blockEntityRepository.findOne({
        where: [{ hash: last }, { height: last as any }],
      });
      if (lastRecord) {
        endHeight = lastRecord.height;
      }
    }
    const where =
      endHeight != null ? `WHERE block.height < ${Number(endHeight)}` : '';
    const sql = `SELECT block.hash as blockHash, block.height as height,
      block.mediantime as medianTime, block.size as size, block.time as timestamp,
      block.num_tx as txCount
      FROM block
      ${where}
      ORDER BY block.height DESC
      LIMIT 20;`;
    const rows = await this.blockEntityRepository.query(sql);
    const result = [];
    for (const row of rows) {
      const { miner, reward } = await this._blockMiner(row.blockHash);
      result.push({
        blockHash: row.blockHash,
        height: Number(row.height),
        medianTime: Number(row.medianTime),
        miner,
        reward,
        size: Number(row.size),
        timestamp: Number(row.timestamp),
        txCount: Number(row.txCount),
      });
    }
    return result;
  }

  /** GET /block/info —— 链信息 */
  async blockInfo() {
    const resp = await this.rpcService.getBlockChainInfo();
    const r = resp.data.result;
    return {
      chain: r.chain,
      blocks: r.blocks,
      headers: r.headers,
      bestBlockHash: r.bestblockhash,
      difficulty: String(r.difficulty ?? ''),
      medianTime: r.mediantime,
      chainwork: r.chainwork,
      estimatedBlockSize: r.estimatedblocksize || 0,
      mempoolTxCount: r.mempooltxcount || r.mempool_tx_count || 0,
      mempoolUsage: r.mempoolusage || r.mempool_usage || 0,
      networkHashPerSecond: String(
        r.networkhashps || r.networkHashPerSecond || '',
      ),
    };
  }

  /** GET /block/{hash} —— 区块详情 */
  async blockDetail(hash: string) {
    const row = await this.blockEntityRepository.findOne({
      where: { hash },
    });
    if (!row) {
      return null;
    }
    const counts = await this.transactionEntityRepository.query(
      `SELECT COALESCE(SUM(tx.tx_in_num),0) as inputCount,
              COALESCE(SUM(tx.tx_out_num),0) as outputCount
       FROM tx WHERE tx.block_hash = ? AND tx.is_deleted = false`,
      [hash],
    );
    const { miner, reward, coinbase } = await this._blockMiner(hash);
    return {
      bits: parseInt(row.bits, 16) || 0,
      blockHash: row.hash,
      coinbase,
      height: row.height,
      inputCount: Number(counts[0]?.inputCount || 0),
      medianTime: row.mediantime,
      merkleRoot: row.merkleroot,
      miner,
      minerAddress: miner,
      nonce: row.nonce,
      outputCount: Number(counts[0]?.outputCount || 0),
      prevBlockHash: row.previousblockhash,
      reward,
      size: row.size,
      timestamp: row.time,
      txCount: row.num_tx,
      version: parseInt(row.versionHex, 16) || 0,
    };
  }

  /** GET /block/{hash}/tx —— 区块交易列表 */
  async blockTx(hash: string, cursor: number, size: number) {
    const blockRecord = await this.blockEntityRepository.findOne({
      where: { hash },
    });
    if (!blockRecord) {
      return null;
    }
    const txList = await this.transactionEntityRepository.find({
      where: {
        block_hash: blockRecord.hash,
      },
      skip: cursor || 0,
      take: size || 20,
    });
    return {
      num_tx: blockRecord.num_tx,
      tx: txList.map((value) => value.txid),
    };
  }

  async blockchainInfo() {
    return this.blockInfo();
  }

  async getRawMempool() {
    const resp = await this.rpcService.getRawMempool();
    return resp.data.result;
  }

  async mempoolInfo() {
    const resp = await this.rpcService.getMempoolInfo();
    return {
      ntx: resp.data.result.size,
    };
  }

  async pushTx(txHex: string) {
    this.logger.debug('pushTx', txHex);
    const resp = await this.rpcService.pushTx(txHex);
    return resp.data.result;
  }

  async blockTxPage(q: string, cursor: number, size: number) {
    return this.blockTx(q.trim(), cursor, size);
  }
}
