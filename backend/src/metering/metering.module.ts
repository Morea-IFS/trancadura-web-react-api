import { Module } from '@nestjs/common';
import { MeteringService } from './metering.service';
import { MeteringController } from './metering.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MeteringController],
  providers: [MeteringService, PrismaService],
})
export class MeteringModule {}