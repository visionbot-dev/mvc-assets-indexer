import { Controller, Get, Param, Query } from '@nestjs/common';
import { AddressService } from './address.service';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiTags('address')
  @ApiOperation({ summary: 'Fetch address balance' })
  @Get(':address/balance')
  balance(@Param('address') address: string) {
    return this.addressService.balance(address);
  }

  @ApiTags('address')
  @ApiOperation({ summary: 'Fetch address transactions' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'flag', required: false, type: String })
  @Get(':address/tx')
  tx(
    @Param('address') address: string,
    @Query('size') size: string,
    @Query('flag') flag: string,
  ) {
    return this.addressService.tx(address, size, flag);
  }

  @ApiTags('address')
  @ApiOperation({ summary: 'Fetch address transaction count' })
  @ApiParam({ name: 'address', required: true, type: String })
  @Get(':address/txCount')
  txCount(@Param('address') address: string) {
    return this.addressService.txCount(address);
  }

  @ApiTags('address')
  @ApiOperation({ summary: 'Fetch address UTXO' })
  @ApiParam({ name: 'address', required: true, type: String })
  @ApiQuery({ name: 'flag', required: false, type: String })
  @Get(':address/utxo')
  utxo(@Param('address') address: string, @Query('flag') flag: string) {
    return this.addressService.utxo(address, flag);
  }
}
