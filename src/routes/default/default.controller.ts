import { Controller, Get, Param, Query } from '@nestjs/common';
import { DefaultService } from './default.service';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@Controller()
export class DefaultController {
  constructor(private readonly defaultService: DefaultService) {}

  @ApiTags('block')
  @ApiOperation({ summary: 'Fetch block list' })
  @ApiQuery({ name: 'last', required: false, type: String })
  @Get('/block')
  async blockList(@Query('last') last: string) {
    return this.defaultService.blockList(last);
  }

  @ApiTags('block')
  @ApiOperation({ summary: 'Fetch block info' })
  @Get('/block/info')
  async blockInfo() {
    return this.defaultService.blockInfo();
  }

  @ApiTags('block')
  @ApiOperation({ summary: 'Fetch block detail' })
  @ApiParam({ name: 'hash', required: true, type: String })
  @Get('/block/:hash')
  async blockDetail(@Param('hash') hash: string) {
    return this.defaultService.blockDetail(hash);
  }

  @ApiTags('block')
  @ApiOperation({ summary: 'Fetch block transactions' })
  @ApiParam({ name: 'hash', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @Get('/block/:hash/tx')
  async blockTx(
    @Param('hash') hash: string,
    @Query('cursor') cursor: number,
    @Query('size') size: number,
  ) {
    return this.defaultService.blockTx(hash, cursor, size);
  }
}
