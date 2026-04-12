import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MeteringService } from './metering.service';
import { StoreDataDto } from './dto/store-data.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@Controller()
export class MeteringController {
  constructor(private readonly meteringService: MeteringService) {}

  // URL Final: POST http://SEU_IP:8080/api/store-data
  @Post('store-data')
  async storeData(@Body() dto: StoreDataDto) {
    return this.meteringService.storeData(dto);
  }

  // URL Final: GET http://SEU_IP:8080/api/metering/1/chart
  @Get('metering/:deviceId/chart')
  @UseGuards(JwtAuthGuard)
  async getChartData(@Param('deviceId', ParseIntPipe) deviceId: number) {
    return this.meteringService.getChartData(deviceId);
  }
}