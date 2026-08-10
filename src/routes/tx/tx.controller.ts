import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TxService } from './tx.service';
import { BroadcastTxDto } from './dto/broadcastTx.dto';
import { RpcService } from '../../service/rpc/rpc.service';
import { TransactionService } from '../../service/transaction/transaction.service';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@Controller()
export class TxController {
  constructor(
    private readonly txService: TxService,
    private readonly rpcService: RpcService,
    private readonly transactionService: TransactionService,
  ) {}

  @ApiTags('tx')
  @ApiOperation({ summary: 'Fetch transaction detail' })
  @ApiParam({ name: 'txId', required: true, type: String })
  @Get('/tx/:txId')
  async getTx(@Param('txId') txId: string) {
    return this.txService.getTx(txId);
  }

  @ApiTags('tx')
  @ApiOperation({ summary: 'Fetch transaction raw' })
  @ApiParam({ name: 'txId', required: true, type: String })
  @Get('/tx/:txId/raw')
  async getRawTx(@Param('txId') txId: string) {
    return this.txService.getRawTx(txId);
  }

  @ApiTags('tx')
  @ApiOperation({ summary: 'Broadcast transaction' })
  @Post('/tx/broadcast')
  async broadcastTx(@Body() broadcastTxDto: BroadcastTxDto) {
    try {
      const resp = await this.rpcService.pushTx(broadcastTxDto.hex);
      // ⚠️ 内联索引：广播成功后同步触发 mempool 索引（不等 ZMQ 链路）——
      //    立即入库 + markSpentUtxos 标记 is_used；失败不影响广播响应（幂等，ZMQ/对账兜底）
      if (resp.data && resp.data.result) {
        await this.transactionService
          .processBroadcastTx(broadcastTxDto.hex)
          .catch(() => {});
      }
      return {
        txid: resp.data.result,
        message: 'ok',
      };
    } catch (e) {
      return {
        txid: '',
        message: JSON.stringify(e.response.data.error),
      };
    }
  }

  @ApiTags('tx')
  @ApiOperation({ summary: 'Broadcast transaction batch' })
  @ApiBody({ type: [BroadcastTxDto] })
  @Post('/tx/broadcast/batch')
  async broadcastBatch(@Body() body: BroadcastTxDto[]) {
    return this.txService.broadcastBatch(body || []);
  }
}
