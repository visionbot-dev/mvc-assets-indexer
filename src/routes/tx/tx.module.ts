import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TxService } from './tx.service';
import { TxController } from './tx.controller';
import { RpcModule } from '../../service/rpc/rpc.module';
import { TransactionModule } from '../../service/transaction/transaction.module';
import { TransactionEntity } from '../../entities/transaction.entity';
import { BlockEntity } from '../../entities/block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity, BlockEntity]),
    RpcModule,
    TransactionModule,
  ],
  controllers: [TxController],
  providers: [TxService],
})
export class TxModule {}
