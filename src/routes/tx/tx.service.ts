import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { BlockEntity } from '../../entities/block.entity';
import { RpcService } from '../../service/rpc/rpc.service';
import * as mvc from 'mvc-lib';

@Injectable()
export class TxService {
  constructor(
    @InjectRepository(TransactionEntity)
    private transactionEntityRepository: Repository<TransactionEntity>,
    @InjectRepository(BlockEntity)
    private blockEntityRepository: Repository<BlockEntity>,
    private readonly rpcService: RpcService,
  ) {}

  /** GET /tx/{txId} —— 交易详情（库中无记录时返回 txDetail: null） */
  async getTx(txId: string) {
    const tx = await this.transactionEntityRepository.findOne({
      where: { txid: txId },
    });
    if (!tx) {
      return { txDetail: null };
    }
    const block = tx.block_hash
      ? await this.blockEntityRepository.findOne({
          where: { hash: tx.block_hash },
        })
      : null;
    return {
      txDetail: {
        txid: tx.txid,
        blockHash: tx.block_hash || '',
        height: block ? block.height : 0,
        timestamp: block ? block.time : 0,
      },
    };
  }

  /** GET /tx/{txId}/raw —— 实时从节点 REST 拉 raw（mempool 交易也可拿） */
  async getRawTx(txId: string) {
    const resp = await this.rpcService.getRawTxByRest(txId);
    return { hex: (resp && resp.data) || '' };
  }

  /** POST /tx/broadcast/batch —— 批量广播（结果按 known/evicted/invalid/unconfirmed 分类） */
  async broadcastBatch(transactions: { hex: string }[]) {
    const evicted: string[] = [];
    const invalid: any[] = [];
    const known: string[] = [];
    const unconfirmed: any[] = [];
    for (const item of transactions || []) {
      try {
        const resp = await this.rpcService.pushTx(item.hex);
        const txid = resp.data.result;
        if (txid) {
          unconfirmed.push({ txid, ancestors: [] });
        } else {
          known.push('');
        }
      } catch (e) {
        let txid = '';
        try {
          txid = new mvc.Transaction(item.hex).hash;
        } catch (e2) {}
        const err = (e.response && e.response.data && e.response.data.error) || {};
        invalid.push({
          txid,
          reject_code: err.code || 0,
          reject_reason: err.message || String(e.message || 'error'),
          collided_with: [],
        });
      }
    }
    return { evicted, invalid, known, message: 'ok', unconfirmed };
  }
}
