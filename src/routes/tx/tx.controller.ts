import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TxService } from './tx.service';
import { BroadcastTxDto } from './dto/broadcastTx.dto';
import { RpcService } from '../../service/rpc/rpc.service';
import { TransactionService } from '../../service/transaction/transaction.service';
import { ApiTags } from '@nestjs/swagger';

@Controller()
export class TxController {
  constructor(
    private readonly txService: TxService,
    private readonly rpcService: RpcService,
    private readonly transactionService: TransactionService,
  ) {}

  @ApiTags('tx')
  @Get('/tx/:txid/raw')
  async getRawTx(@Param('txid') txid: string) {
    // 实时从节点 REST 拉 raw（mempool 交易也可拿）——SDK 索引延迟过滤（解析交易输入剔除已消费）依赖
    const resp = await this.rpcService.getRawTxByRest(txid);
    return { txid, hex: (resp && resp.data) || '' };
  }

  @ApiTags('tx')
  @Post('/tx/broadcast')
  async broadcastTx(@Body() broadcastTxDto: BroadcastTxDto) {
    try {
      const resp = await this.rpcService.pushTx(broadcastTxDto.hex);
      // ⚠️ 内联索引：广播成功后同步触发 mempool 索引（不等 ZMQ 链路）——
      //    立即入库 + markSpentUtxos 标记 is_used；失败不影响广播响应（幂等，ZMQ/对账兜底）
      if (resp.data && resp.data.result) {
        await this.transactionService.processBroadcastTx(broadcastTxDto.hex).catch(() => {});
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
}
