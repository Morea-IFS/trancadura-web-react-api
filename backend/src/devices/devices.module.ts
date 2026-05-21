import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesGateway } from './devices.gateway';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, PrismaService, DevicesGateway],
  exports: [DevicesGateway],
})
export class DevicesModule {}
