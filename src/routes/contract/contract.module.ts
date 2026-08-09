import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../../entities/transaction.entity';
import { TxOutEntity } from '../../entities/txOut.entity';
import { TxOutNftEntity } from '../../entities/txOutNftEntity';
import { TxOutFtEntity } from '../../entities/txOutFtEntity';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionEntity, TxOutEntity, TxOutNftEntity, TxOutFtEntity])],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
