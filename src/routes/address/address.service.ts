import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { Repository } from 'typeorm';
import * as mvc from 'mvc-lib';
import { TxOutEntity } from '../../entities/txOut.entity';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(TransactionEntity)
    private transactionEntityRepository: Repository<TransactionEntity>,
    @InjectRepository(TxOutEntity)
    private txOutEntityRepository: Repository<TxOutEntity>,
  ) {}

  async balance(address: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    const p1 = this.transactionEntityRepository.query(
      `
      SELECT 
          sum(tx_out.satoshis) as balance, count(*) as ct
      FROM 
          tx_out 
          JOIN tx on tx.txid = tx_out.txid
      WHERE
          tx_out.address_hex = ?
          AND tx_out.is_used = false
          AND tx_out.is_deleted = false
          AND tx.block_hash IS NOT NULL
          AND tx_out.script_type = 2
          AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
    `,
      [addressHex],
    );
    const p2 = this.transactionEntityRepository.query(
      `
      SELECT 
          sum(tx_out.satoshis) as balance, count(*) as ct
      FROM 
          tx_out
          JOIN tx on tx.txid = tx_out.txid
      WHERE
          tx_out.address_hex = ?
          AND tx_out.is_used = false
          AND tx_out.is_deleted = false 
          AND tx.block_hash IS NULL
          AND tx_out.script_type = 2
          AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
    `,
      [addressHex],
    );
    const [resp1, resp2] = await Promise.all([p1, p2]);
    let satoshi = 0;
    let pendingSatoshi = 0;
    let utxoCount = 0;
    if (resp1.length > 0) {
      satoshi += Number(resp1[0].balance || 0);
      utxoCount += Number(resp1[0].ct || 0);
    }
    if (resp2.length > 0) {
      pendingSatoshi += Number(resp2[0].balance) || 0;
      utxoCount += Number(resp2[0].ct || 0);
    }
    return {
      address: address,
      confirmed: satoshi,
      unconfirmed: pendingSatoshi,
      utxoCount: utxoCount,
    };
  }

  /** GET /address/{address}/tx —— 地址交易列表（flag 分页，size 默认 20） */
  async tx(address: string, size: string, flag: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    const limit = Math.min(parseInt(size) || 20, 100);
    let cursorId = 0;
    if (flag) {
      const flagRecord = await this.txOutEntityRepository.findOne({
        where: {
          outpoint: flag,
          is_deleted: false,
        },
      });
      if (flagRecord) {
        cursorId = flagRecord.cursor_id;
      }
    }
    const records = await this.transactionEntityRepository.query(
      `
      SELECT
          tx.txid,
          tx_out.outpoint as flag,
          block.height as block_height,
          block.time as time,
          tx.created_at as create_at
      FROM
          tx_out
          JOIN tx ON tx_out.txid = tx.txid
          LEFT JOIN block ON tx.block_hash = block.hash
      WHERE
          tx_out.address_hex = ?
          AND tx_out.is_deleted = false
          AND tx_out.cursor_id > ?
      GROUP BY tx.txid, tx_out.outpoint, block.height, block.time, tx.created_at
      ORDER BY MIN(tx_out.cursor_id) DESC
      LIMIT ?;
      `,
      [addressHex, cursorId, limit],
    );
    for (const record of records) {
      record['address'] = address;
      record['genesis'] = '';
    }
    return records;
  }

  /** GET /address/{address}/txCount —— 地址交易数量 */
  async txCount(address: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    const rows = await this.transactionEntityRepository.query(
      `
      SELECT COUNT(DISTINCT tx.txid) as txCount
      FROM
          tx_out
          JOIN tx ON tx_out.txid = tx.txid
      WHERE
          tx_out.address_hex = ?
          AND tx_out.is_deleted = false
      ;
      `,
      [addressHex],
    );
    return { txCount: Number(rows[0]?.txCount || 0) };
  }

  async utxo(address: string, flag: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    let cursorId = 0;
    if (flag) {
      const flagRecord = await this.txOutEntityRepository.findOne({
        where: {
          outpoint: flag,
          is_deleted: false,
        },
      });
      if (flagRecord) {
        cursorId = flagRecord.cursor_id;
      }
    }
    const records = await this.transactionEntityRepository.query(
      `
            SELECT
                tx_out.outpoint as flag,
                tx_out.txid as txid,
                tx_out.outputIndex as outIndex,
                tx_out.satoshis as value,
                tx_out.satoshis as satoshi,
                block.height as height
            FROM
                tx_out
                JOIN tx ON tx_out.txid = tx.txid
                LEFT JOIN block ON tx.block_hash = block.hash
            WHERE
                tx_out.address_hex = ?
                AND tx_out.is_used = false
                AND tx_out.is_deleted = false  
                AND tx_out.script_type = 2
          AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE) 
                AND tx_out.cursor_id > ?
                LIMIT 100;
        `,
      [addressHex, cursorId],
    );
    for (const record of records) {
      record['address'] = address;
      record['satoshi'] = Number(record.satoshi);
      record['value'] = Number(record.value);
      record['outIndex'] = Number(record.outIndex);
      record['height'] = Number(record.height);
    }
    return records;
  }
}
