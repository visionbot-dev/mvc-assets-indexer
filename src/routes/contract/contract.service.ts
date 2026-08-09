import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { Repository } from 'typeorm';
import * as mvc from 'mvc-lib';
import { mergeFtBalance } from '../../lib/utils';
import { TxOutEntity } from '../../entities/txOut.entity';
import { TxOutNftEntity } from '../../entities/txOutNftEntity';

@Injectable()
export class ContractService {
  constructor(
    @InjectRepository(TransactionEntity)
    private transactionEntityRepository: Repository<TransactionEntity>,
    @InjectRepository(TxOutEntity)
    private txOutEntityRepository: Repository<TxOutEntity>,
    @InjectRepository(TxOutNftEntity)
    private txOutNftEntityRepository: Repository<TxOutNftEntity>,
  ) {}

  async ftAddressBalance(address: string, codeHash: string, genesis: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    let sql: string;
    if (codeHash && genesis) {
      sql = `
SELECT
    tx_out_ft.codeHash,
    tx_out_ft.genesis,
    tx_out_ft.name,
    tx_out_ft.symbol,
    tx_out_ft.decimal,
    tx_out_ft.sensibleId,
    CASE
        WHEN tx.block_hash is NULL THEN 'unconfirmed'
        ELSE
            'confirmed'
    END AS is_confirm,
    COUNT(*) as utxoCount,
    CONCAT(SUM(tx_out_ft.value), '') AS balance
FROM
    tx_out
    JOIN tx_out_ft ON tx_out.outpoint = tx_out_ft.outpoint
    JOIN tx on tx.txid = tx_out.txid
WHERE
    address_hex = ?
    AND tx_out.is_used = false
    AND tx_out_ft.codeHash = ?
    AND tx_out_ft.genesis = ?
    AND tx_out.check_token = 1
    AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
GROUP BY
    tx_out_ft.codeHash,
    tx_out_ft.genesis,
    tx_out_ft.name,
    tx_out_ft.symbol,
    tx_out_ft.decimal,
    tx_out_ft.sensibleId,
    CASE
        WHEN tx.block_hash is NULL THEN 'unconfirmed'
        ELSE
            'confirmed'
    END;
`;
    } else {
      sql = `
SELECT
    tx_out_ft.codeHash,
    tx_out_ft.genesis,
    tx_out_ft.name,
    tx_out_ft.symbol,
    tx_out_ft.decimal,
    tx_out_ft.sensibleId,
    CASE
        WHEN tx.block_hash is NULL THEN 'unconfirmed'
        ELSE
            'confirmed'
    END AS is_confirm,
    COUNT(*) as utxoCount,
    CONCAT(SUM(tx_out_ft.value), '') AS balance
FROM
    tx_out
    JOIN tx_out_ft ON tx_out.outpoint = tx_out_ft.outpoint
    JOIN tx on tx.txid = tx_out.txid
WHERE
    address_hex = ?
    AND tx_out.is_used = false
    AND tx_out.check_token = 1
    AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
GROUP BY
    tx_out_ft.codeHash,
    tx_out_ft.genesis,
    tx_out_ft.name,
    tx_out_ft.symbol,
    tx_out_ft.decimal,
    tx_out_ft.sensibleId,
    CASE
        WHEN tx.block_hash is NULL THEN 'unconfirmed'
        ELSE
            'confirmed'
    END;
`;
    }
    const balanceList = await this.transactionEntityRepository.query(sql, [
      addressHex,
      codeHash,
      genesis,
    ]);
    for (const balanceListElement of balanceList) {
      balanceListElement['address'] = address;
    }
    return mergeFtBalance(balanceList);
  }

  async ftAddressUtxo(
    address: string,
    codeHash: string,
    genesis: string,
    flag: string,
  ) {
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
    let sql: string;
    if (codeHash && genesis) {
      sql = `SELECT
    tx_out_ft.codeHash,
    tx_out_ft.genesis,
    tx_out_ft.name,
    tx_out_ft.symbol,
    tx_out_ft.sensibleId,
    tx_out_ft.decimal,
    tx_out.txid,
    tx_out.outputIndex as txIndex,
    tx_out_ft.value as valueString,
    tx_out.satoshis as satoshiString,
    block.height as height,
    tx_out.outpoint as flag
FROM
    tx_out
    JOIN tx_out_ft ON tx_out.outpoint = tx_out_ft.outpoint
    JOIN tx on tx.txid = tx_out.txid
    LEFT JOIN block on tx.block_hash = block.hash
WHERE
    address_hex = ?
    AND tx_out.is_used = false
    AND tx_out.cursor_id > ?
    AND tx_out.check_token = 1
    AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
    AND tx_out_ft.codeHash = ?
    AND tx_out_ft.genesis = ?
    LIMIT 100;`;
    } else {
      sql = `SELECT
    tx_out_ft.codeHash,
    tx_out_ft.genesis,
    tx_out_ft.name,
    tx_out_ft.symbol,
    tx_out_ft.sensibleId,
    tx_out_ft.decimal,
    tx_out.txid,
    tx_out.outputIndex as txIndex,
    tx_out_ft.value as valueString,
    tx_out.satoshis as satoshiString,
    block.height as height,
    tx_out.outpoint as flag
FROM
    tx_out
    JOIN tx_out_ft ON tx_out.outpoint = tx_out_ft.outpoint
    JOIN tx ON tx.txid = tx_out.txid
    LEFT JOIN block on tx.block_hash = block.hash
WHERE
    address_hex = ?
    AND tx_out.is_used = false
    AND tx_out.cursor_id > ?
    AND tx_out.check_token = 1
    AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
    LIMIT 100;`;
    }
    const utxoList = await this.transactionEntityRepository.query(sql, [
      addressHex,
      cursorId,
      codeHash,
      genesis,
    ]);
    for (const utxoListElement of utxoList) {
      utxoListElement['value'] = Number(utxoListElement.valueString);
      utxoListElement['satoshi'] = Number(utxoListElement.satoshiString);
      utxoListElement['address'] = address;
    }
    return utxoList;
  }


  // ===================== NFT 查询（对齐 doc.json respond.ContractNftUtxo）=====================

  /** address_hex(hash160) → 地址字符串（MVC 主网 livenet） */
  private _addrHexToStr(addressHex: string): string {
    try {
      return new mvc.Address.fromPublicKeyHash(Buffer.from(addressHex, 'hex')).toString();
    } catch (e) {
      return addressHex;
    }
  }

  /** 行 → ContractNftUtxo（对齐 doc.json：address/codeHash/flag/genesis/height/metaOutputIndex/metaTxid/satoshi/satoshiString/sensibleId/tokenIndex/tokenSupply/txIndex/txid） */
  private _mapNftUtxo(row: any, address: string): any {
    return {
      address: this._addrHexToStr(row.address_hex) || address,
      codeHash: row.codeHash,
      flag: row.flag,
      genesis: row.genesis,
      height: row.height != null ? Number(row.height) : 0,
      metaOutputIndex: Number(row.metaOutputIndex ?? 0),
      metaTxid: row.metaTxid || '',
      satoshi: Number(row.satoshis ?? 0),
      satoshiString: String(row.satoshis ?? 0),
      sensibleId: row.sensibleId || '',
      tokenIndex: Number(row.tokenIndex ?? 0),
      tokenSupply: Number(row.tokenSupply ?? 0),
      txIndex: Number(row.txIndex ?? 0),
      txid: row.txid,
    };
  }

  /** NFT utxo 查询基础 WHERE（is_used + is_deleted + 实时反查 tx_in——防已花费返回） */
  private _nftUnspentWhere(extra: string): string {
    return `tx_out.is_used = false
    AND tx_out.is_deleted = false
    AND NOT EXISTS (SELECT 1 FROM tx_in ti WHERE ti.outpoint = tx_out.outpoint AND ti.is_deleted = FALSE)
    ${extra}`;
  }

  /** GET /contract/nft/address/{address}/utxo —— 地址持有 NFT utxo 列表（codeHash/genesis 可选过滤，flag 分页） */
  async nftAddressUtxo(address: string, codeHash: string, genesis: string, flag: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    let cursorId = 0;
    if (flag) {
      const flagRecord = await this.txOutEntityRepository.findOne({
        where: { outpoint: flag, is_deleted: false },
      });
      if (flagRecord) cursorId = flagRecord.cursor_id;
    }
    const filter = codeHash && genesis ? `AND tx_out_nft.codeHash = ? AND tx_out_nft.genesis = ?` : '';
    const sql = `SELECT
    tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenIndex,
    tx_out_nft.tokenSupply, tx_out_nft.metaTxid, tx_out_nft.metaOutputIndex,
    tx_out.txid, tx_out.outputIndex as txIndex, tx_out.satoshis, tx_out.address_hex, tx_out.outpoint as flag,
    block.height
    FROM tx_out
    JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
    JOIN tx ON tx.txid = tx_out.txid
    LEFT JOIN block ON tx.block_hash = block.hash
    WHERE tx_out.address_hex = ?
      AND ${this._nftUnspentWhere(filter)}
      AND tx_out.cursor_id > ?
    LIMIT 100;`;
    const params: any[] = codeHash && genesis ? [addressHex, codeHash, genesis, cursorId] : [addressHex, cursorId];
    const list = await this.transactionEntityRepository.query(sql, params);
    return list.map((row: any) => this._mapNftUtxo(row, address));
  }

  /** GET /contract/nft/address/{address}/count —— 地址持有 NFT 数量 */
  async nftAddressCount(address: string, codeHash: string, genesis: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    const filter = codeHash && genesis ? `AND tx_out_nft.codeHash = ? AND tx_out_nft.genesis = ?` : '';
    const sql = `SELECT COUNT(*) as count
    FROM tx_out
    JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
    WHERE tx_out.address_hex = ?
      AND ${this._nftUnspentWhere(filter)};`;
    const params: any[] = codeHash && genesis ? [addressHex, codeHash, genesis] : [addressHex];
    const rows = await this.transactionEntityRepository.query(sql, params);
    return { count: String(rows[0]?.count || 0) };
  }

  /** GET /contract/nft/address/{address}/summary —— 地址持有 NFT 系列汇总（按 codeHash+genesis 分组） */
  async nftAddressSummary(address: string, cursor: string, size: string) {
    const addressHex = mvc.Address(address).hashBuffer.toString('hex');
    const limit = Math.min(parseInt(size) || 20, 100);
    const offset = Math.max(parseInt(cursor) || 0, 0);
    const sql = `SELECT tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenSupply, COUNT(*) as cnt
    FROM tx_out
    JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
    WHERE tx_out.address_hex = ?
      AND ${this._nftUnspentWhere('')}
    GROUP BY tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenSupply
    ORDER BY tx_out_nft.genesis
    LIMIT ? OFFSET ?;`;
    const countSql = `SELECT COUNT(*) as total FROM (
      SELECT tx_out_nft.codeHash, tx_out_nft.genesis FROM tx_out
      JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
      WHERE tx_out.address_hex = ? AND ${this._nftUnspentWhere('')}
      GROUP BY tx_out_nft.codeHash, tx_out_nft.genesis
    ) t;`;
    const rows = await this.transactionEntityRepository.query(sql, [addressHex, limit, offset]);
    const totalRows = await this.transactionEntityRepository.query(countSql, [addressHex]);
    return {
      records: rows.map((row: any) => ({
        codeHash: row.codeHash, genesis: row.genesis, sensibleId: row.sensibleId || '', tokenSupply: Number(row.tokenSupply ?? 0),
      })),
      total: Number(totalRows[0]?.total || 0),
    };
  }

  /** GET /contract/nft/genesis/{codeHash}/{genesis}/utxo —— 系列 utxo（tokenIndex/max/min 过滤） */
  async nftGenesisUtxo(codeHash: string, genesis: string, tokenIndex: string, max: string, min: string) {
    let tokenFilter = '';
    const params: any[] = [codeHash, genesis];
    if (tokenIndex) { tokenFilter = `AND tx_out_nft.tokenIndex = ?`; params.push(tokenIndex); }
    else if (max && min) { tokenFilter = `AND tx_out_nft.tokenIndex >= ? AND tx_out_nft.tokenIndex <= ?`; params.push(min, max); }
    else if (min) { tokenFilter = `AND tx_out_nft.tokenIndex >= ?`; params.push(min); }
    else if (max) { tokenFilter = `AND tx_out_nft.tokenIndex <= ?`; params.push(max); }
    params.push(0);
    const sql = `SELECT
    tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenIndex,
    tx_out_nft.tokenSupply, tx_out_nft.metaTxid, tx_out_nft.metaOutputIndex,
    tx_out.txid, tx_out.outputIndex as txIndex, tx_out.satoshis, tx_out.address_hex, tx_out.outpoint as flag,
    block.height
    FROM tx_out
    JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
    JOIN tx ON tx.txid = tx_out.txid
    LEFT JOIN block ON tx.block_hash = block.hash
    WHERE tx_out_nft.codeHash = ? AND tx_out_nft.genesis = ?
      ${tokenFilter}
      AND ${this._nftUnspentWhere('')}
      AND tx_out.cursor_id > ?
    LIMIT 100;`;
    const list = await this.transactionEntityRepository.query(sql, params);
    return list.map((row: any) => this._mapNftUtxo(row, ''));
  }

  /** GET /contract/nft/{codeHash}/{genesis}/genesis —— 系列 genesis 信息（取该系列最新一个未花费 utxo） */
  async nftGenesisInfo(codeHash: string, genesis: string) {
    const sql = `SELECT
    tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenIndex,
    tx_out_nft.tokenSupply, tx_out_nft.metaTxid, tx_out_nft.metaOutputIndex,
    tx_out.txid, tx_out.outputIndex as txIndex, tx_out.satoshis, tx_out.address_hex, tx_out.outpoint as flag,
    block.height
    FROM tx_out
    JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
    JOIN tx ON tx.txid = tx_out.txid
    LEFT JOIN block ON tx.block_hash = block.hash
    WHERE tx_out_nft.codeHash = ? AND tx_out_nft.genesis = ?
      AND ${this._nftUnspentWhere('')}
    ORDER BY tx_out.cursor_id DESC
    LIMIT 1;`;
    const list = await this.transactionEntityRepository.query(sql, [codeHash, genesis]);
    return list.length > 0 ? this._mapNftUtxo(list[0], '') : null;
  }

  /** GET /contract/nft/{codeHash}/{genesis}/owners —— 系列持有者列表（按地址聚合） */
  async nftOwners(codeHash: string, genesis: string, cursor: string, size: string) {
    const limit = Math.min(parseInt(size) || 20, 100);
    const offset = Math.max(parseInt(cursor) || 0, 0);
    const sql = `SELECT tx_out.address_hex, tx_out_nft.codeHash, tx_out_nft.genesis, COUNT(*) as count
    FROM tx_out
    JOIN tx_out_nft ON tx_out.outpoint = tx_out_nft.outpoint
    WHERE tx_out_nft.codeHash = ? AND tx_out_nft.genesis = ?
      AND ${this._nftUnspentWhere('')}
    GROUP BY tx_out.address_hex, tx_out_nft.codeHash, tx_out_nft.genesis
    LIMIT ? OFFSET ?;`;
    const rows = await this.transactionEntityRepository.query(sql, [codeHash, genesis, limit, offset]);
    return rows.map((row: any) => ({
      address: this._addrHexToStr(row.address_hex),
      codeHash: row.codeHash,
      count: String(row.count || 0),
      genesis: row.genesis,
    }));
  }

  /** GET /contract/nft/summary —— 全部 NFT 系列汇总（目录） */
  async nftSummary(cursor: string, size: string) {
    const limit = Math.min(parseInt(size) || 20, 100);
    const offset = Math.max(parseInt(cursor) || 0, 0);
    const sql = `SELECT tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenSupply
    FROM tx_out_nft
    WHERE tx_out_nft.txid IS NOT NULL
    GROUP BY tx_out_nft.codeHash, tx_out_nft.genesis, tx_out_nft.sensibleId, tx_out_nft.tokenSupply
    LIMIT ? OFFSET ?;`;
    const totalSql = `SELECT COUNT(*) as total FROM (SELECT tx_out_nft.codeHash, tx_out_nft.genesis FROM tx_out_nft GROUP BY tx_out_nft.codeHash, tx_out_nft.genesis) t;`;
    const rows = await this.txOutNftEntityRepository.query(sql, [limit, offset]);
    const totalRows = await this.txOutNftEntityRepository.query(totalSql, []);
    return {
      records: rows.map((row: any) => ({
        codeHash: row.codeHash, genesis: row.genesis, sensibleId: row.sensibleId || '', tokenSupply: Number(row.tokenSupply ?? 0),
      })),
      total: Number(totalRows[0]?.total || 0),
    };
  }
}
