import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { ObjLoader } from '../../lib/objLoader';
import axios, { Method } from 'axios';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

@Injectable()
export class RpcService {
  private readonly rpcHost: string;
  private readonly rpcExtHost: string;
  private readonly rpcPort: string;
  private readonly rpcExtPort: string;
  private readonly rpcUser: string;
  private readonly rpcPassword: string;
  private readonly rpcUrl: string;
  private readonly headers: any;
  private objLoader: ObjLoader;

  constructor(private configService: ConfigService) {
    this.rpcHost = this.configService.get('rpcHost');
    this.rpcExtHost = this.configService.get('rpcExtHost');
    this.rpcPort = this.configService.get('rpcPort');
    this.rpcExtPort = this.configService.get('rpcExtPort');
    this.rpcUser = this.configService.get('rpcUser');
    this.rpcPassword = this.configService.get('rpcPassword');
    this.rpcUrl = `http://${this.rpcHost}:${this.rpcPort}`;
    this.objLoader = new ObjLoader(
      this.rpcExtHost,
      Number(this.rpcExtPort),
      this.rpcUser,
      this.rpcPassword,
    );
    this.headers = {
      'Content-Type': 'text/plain',
      Authorization:
        'Basic ' +
        Buffer.from(this.rpcUser + ':' + this.rpcPassword).toString('base64'),
    };
  }

  private async callRpc(data: any) {
    try {
      const method: Method = 'POST';
      const config = {
        method: method,
        maxBodyLength: Infinity,
        url: this.rpcUrl,
        headers: this.headers,
        data: data,
        httpAgent: httpAgent,
        httpsAgent: httpsAgent,
      };
      return await axios.request(config);
    } catch (e) {
      console.log('callRpc e', e);
    }
  }

  private async callRpcRaise(data: any) {
    const method: Method = 'POST';
    const config = {
      method: method,
      maxBodyLength: Infinity,
      url: this.rpcUrl,
      headers: this.headers,
      data: data,
      httpAgent: httpAgent,
      httpsAgent: httpsAgent,
    };
    return await axios.request(config);
  }

  public async getBlockChainInfo(): Promise<AxiosResponse<any> | undefined> {
    const now = Date.now();
    const rpcData = {
      jsonrpc: '1.0',
      id: now,
      method: 'getblockchaininfo',
    };
    return this.callRpc(rpcData);
  }

  public async getRawMempool(): Promise<AxiosResponse<any> | undefined> {
    const now = Date.now();
    const rpcData = {
      jsonrpc: '1.0',
      id: now,
      method: 'getrawmempool',
    };
    return this.callRpc(rpcData);
  }

  public async getMempoolInfo(): Promise<AxiosResponse<any> | undefined> {
    const now = Date.now();
    const rpcData = {
      jsonrpc: '1.0',
      id: now,
      method: 'getmempoolinfo',
    };
    return this.callRpc(rpcData);
  }

  public async pushTx(txHex: string): Promise<AxiosResponse<any> | undefined> {
    const now = Date.now();
    const rpcData = {
      jsonrpc: '1.0',
      id: now,
      method: 'sendrawtransaction',
      params: [txHex],
    };
    return this.callRpcRaise(rpcData);
  }

  public async getBlockHeader(
    blockHash: any,
  ): Promise<AxiosResponse<any> | undefined> {
    const now = Date.now();
    const rpcData = {
      jsonrpc: '1.0',
      id: now,
      method: 'getblockheader',
      params: [blockHash],
    };
    return this.callRpc(rpcData);
  }

  public async getBestBlockHash(): Promise<AxiosResponse<any> | undefined> {
    const now = Date.now();
    const rpcData = {
      jsonrpc: '1.0',
      id: now,
      method: 'getbestblockhash',
      params: [],
    };
    return this.callRpc(rpcData);
  }

  public async getRawTxByRest(
    txid: string,
  ): Promise<AxiosResponse<any> | undefined> {
    // 节点 REST (/rest/tx/...) 在此环境不可用(404)，改用 RPC getrawtransaction，
    // 返回格式保持兼容：resp.data 直接为 hex 字符串
    try {
      const now = Date.now();
      const rpcData = {
        jsonrpc: '1.0',
        id: now,
        method: 'getrawtransaction',
        params: [txid, false],
      };
      const resp = await this.callRpcRaise(rpcData);
      return { data: resp.data.result } as any;
    } catch (e) {
      console.log('getRawTxByRest e', e);
    }
  }

  public async getRawBlockByRest(
    blockHash: string,
    path: string,
  ): Promise<boolean> {
    try {
      // 直接用节点 RPC getblock 获取区块 hex（绕过 mvc-node-extend），写入缓存文件
      const now = Date.now();
      const rpcData = {
        jsonrpc: '1.0',
        id: now,
        method: 'getblock',
        params: [blockHash, 0],
      };
      const resp = await this.callRpcRaise(rpcData);
      const hex = resp.data && resp.data.result;
      if (!hex) {
        return false;
      }
      // hex → 原始二进制写入（processOneBlock 按二进制解析）
      fs.writeFileSync(path, Buffer.from(hex, 'hex'));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 节点权威区块数据（verbose=2 含 txid 列表）——verifyMerkle 用（绕开 mvc-lib 解析 coinbase bug）。
   * @param blockHash 区块 hash
   * @param verbose 0=hex；1=详情；2=详情+完整交易（含 txid）
   */
  public async getBlock(
    blockHash: string,
    verbose = 2,
  ): Promise<AxiosResponse<any> | undefined> {
    try {
      const now = Date.now();
      const rpcData = {
        jsonrpc: '1.0',
        id: now,
        method: 'getblock',
        params: [blockHash, verbose],
      };
      return await this.callRpc(rpcData);
    } catch (e) {
      console.log('getBlock e', e);
      return undefined;
    }
  }
}
