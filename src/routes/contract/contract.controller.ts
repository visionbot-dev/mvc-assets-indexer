import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @ApiTags('contract')
  @Get('/ft/address/:address/utxo')
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @ApiQuery({ name: 'flag', required: false, type: String })
  ftAddressUtxo(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
    @Query('flag') flag: string,
  ) {
    return this.contractService.ftAddressUtxo(address, codeHash, genesis, flag);
  }

  // ===================== NFT（对齐 doc.json）=====================

  @ApiTags('contract')
  @Get('/nft/address/:address/utxo')
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @ApiQuery({ name: 'flag', required: false, type: String })
  nftAddressUtxo(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
    @Query('flag') flag: string,
  ) {
    return this.contractService.nftAddressUtxo(address, codeHash, genesis, flag);
  }

  @ApiTags('contract')
  @Get('/nft/address/:address/count')
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  nftAddressCount(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
  ) {
    return this.contractService.nftAddressCount(address, codeHash, genesis);
  }

  @ApiTags('contract')
  @Get('/nft/address/:address/summary')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  nftAddressSummary(
    @Param('address') address: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.nftAddressSummary(address, cursor, size);
  }

  @ApiTags('contract')
  @Get('/nft/genesis/:codeHash/:genesis/utxo')
  @ApiQuery({ name: 'tokenIndex', required: false, type: String })
  @ApiQuery({ name: 'max', required: false, type: String })
  @ApiQuery({ name: 'min', required: false, type: String })
  nftGenesisUtxo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('tokenIndex') tokenIndex: string,
    @Query('max') max: string,
    @Query('min') min: string,
  ) {
    return this.contractService.nftGenesisUtxo(codeHash, genesis, tokenIndex, max, min);
  }

  @ApiTags('contract')
  @Get('/nft/:codeHash/:genesis/genesis')
  nftGenesisInfo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.nftGenesisInfo(codeHash, genesis);
  }

  @ApiTags('contract')
  @Get('/nft/:codeHash/:genesis/owners')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  nftOwners(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.nftOwners(codeHash, genesis, cursor, size);
  }

  @ApiTags('contract')
  @Get('/nft/summary')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  nftSummary(
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.nftSummary(cursor, size);
  }

  // ===================== FT 补齐（对齐 doc.json）=====================

  @ApiTags('contract')
  @Get('/ft/summary')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  @ApiQuery({ name: 'sensibleId', required: false, type: String })
  ftSummary(
    @Query('cursor') cursor: string,
    @Query('size') size: string,
    @Query('sensibleId') sensibleId: string,
  ) {
    return this.contractService.ftSummary(cursor, size, sensibleId);
  }

  @ApiTags('contract')
  @Get('/ft/:codeHash/:genesis/genesis')
  ftGenesisInfo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.ftGenesisInfo(codeHash, genesis);
  }

  @ApiTags('contract')
  @Get('/ft/:codeHash/:genesis/history')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  ftHistory(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.ftHistory(codeHash, genesis, cursor, size);
  }

  @ApiTags('contract')
  @Get('/ft/:codeHash/:genesis/owners')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  ftOwners(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.ftOwners(codeHash, genesis, cursor, size);
  }

  @ApiTags('contract')
  @Get('/ft/:codeHash/:genesis/supply')
  ftSupply(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.ftSupply(codeHash, genesis);
  }

  @ApiTags('contract')
  @Get('/ft/address/:address/balance')
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  ftAddressBalance(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
  ) {
    return this.contractService.ftAddressBalance(address, codeHash, genesis);
  }
}
