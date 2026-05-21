import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { PrismaService } from '../prisma/prisma.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  controllers: [LabsController],
  providers: [LabsService, PrismaService],
})
export class LabsModule {}
