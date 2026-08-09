import { Module } from '@nestjs/common';
import { TxService } from './tx.service';
import { TxController } from './tx.controller';
import { RpcModule } from '../../service/rpc/rpc.module';
import { TransactionModule } from '../../service/transaction/transaction.module';

@Module({
  imports: [RpcModule, TransactionModule],
  controllers: [TxController],
  providers: [TxService],
})
export class TxModule {}
