import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContractService } from './contract.service';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT address UTXO' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @ApiQuery({ name: 'flag', required: false, type: String })
  @Get('/ft/address/:address/utxo')
  ftAddressUtxo(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
    @Query('flag') flag: string,
  ) {
    return this.contractService.ftAddressUtxo(address, codeHash, genesis, flag);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT address balance' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @Get('/ft/address/:address/balance')
  ftAddressBalance(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
  ) {
    return this.contractService.ftAddressBalance(address, codeHash, genesis);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT summary' })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'sensibleId', required: false, type: String })
  @Get('/ft/summary')
  ftSummary(
    @Query('cursor') cursor: string,
    @Query('size') size: string,
    @Query('sensibleId') sensibleId: string,
  ) {
    return this.contractService.ftSummary(cursor, size, sensibleId);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT genesis' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @Get('/ft/:codeHash/:genesis/genesis')
  ftGenesisInfo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.ftGenesisInfo(codeHash, genesis);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT history' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @Get('/ft/:codeHash/:genesis/history')
  ftHistory(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.ftHistory(codeHash, genesis, cursor, size);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT owners' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @Get('/ft/:codeHash/:genesis/owners')
  ftOwners(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.ftOwners(codeHash, genesis, cursor, size);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch FT supply' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @Get('/ft/:codeHash/:genesis/supply')
  ftSupply(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.ftSupply(codeHash, genesis);
  }

  // ===================== NFT（对齐 doc.json）=====================

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT address UTXO' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @ApiQuery({ name: 'flag', required: false, type: String })
  @Get('/nft/address/:address/utxo')
  nftAddressUtxo(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
    @Query('flag') flag: string,
  ) {
    return this.contractService.nftAddressUtxo(address, codeHash, genesis, flag);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT address count' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @Get('/nft/address/:address/count')
  nftAddressCount(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
  ) {
    return this.contractService.nftAddressCount(address, codeHash, genesis);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT address summary' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @Get('/nft/address/:address/summary')
  nftAddressSummary(
    @Param('address') address: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.nftAddressSummary(address, cursor, size);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT genesis UTXO' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @ApiQuery({ name: 'tokenIndex', required: true, type: String })
  @ApiQuery({ name: 'max', required: false, type: String })
  @ApiQuery({ name: 'min', required: false, type: String })
  @Get('/nft/genesis/:codeHash/:genesis/utxo')
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
  @ApiOperation({ summary: 'Fetch NFT genesis' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @Get('/nft/:codeHash/:genesis/genesis')
  nftGenesisInfo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.nftGenesisInfo(codeHash, genesis);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT owners' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @Get('/nft/:codeHash/:genesis/owners')
  nftOwners(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.nftOwners(codeHash, genesis, cursor, size);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT summary' })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @Get('/nft/summary')
  nftSummary(
    @Query('cursor') cursor: string,
    @Query('size') size: string,
  ) {
    return this.contractService.nftSummary(cursor, size);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT sell address UTXO' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'codeHash', required: false, type: String })
  @ApiQuery({ name: 'genesis', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'flag', required: false, type: String })
  @Get('/nft/sell/address/:address/utxo')
  nftSellAddressUtxo(
    @Param('address') address: string,
    @Query('codeHash') codeHash: string,
    @Query('genesis') genesis: string,
    @Query('limit') limit: string,
    @Query('flag') flag: string,
  ) {
    return this.contractService.nftSellAddressUtxo(address, codeHash, genesis, limit, flag);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch NFT sell genesis UTXO' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @ApiQuery({ name: 'tokenIndex', required: true, type: Number })
  @ApiQuery({ name: 'max', required: false, type: Number })
  @ApiQuery({ name: 'min', required: false, type: Number })
  @Get('/nft/sell/genesis/:codeHash/:genesis/utxo')
  nftSellGenesisUtxo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
    @Query('tokenIndex') tokenIndex: string,
    @Query('max') max: string,
    @Query('min') min: string,
  ) {
    return this.contractService.nftSellGenesisUtxo(codeHash, genesis, tokenIndex, max, min);
  }

  @ApiTags('contract')
  @ApiOperation({ summary: 'Fetch Unique genesis UTXO' })
  @ApiParam({ name: 'codeHash', required: true, type: String })
  @ApiParam({ name: 'genesis', required: true, type: String })
  @Get('/unique/genesis/:codeHash/:genesis/utxo')
  uniqueGenesisUtxo(
    @Param('codeHash') codeHash: string,
    @Param('genesis') genesis: string,
  ) {
    return this.contractService.uniqueGenesisUtxo(codeHash, genesis);
  }
}
