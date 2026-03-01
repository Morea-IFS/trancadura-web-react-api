import { Module } from '@nestjs/common';
import { LabsService } from './labs.service';
import { LabsController } from './labs.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LabsController],
  providers: [LabsService, PrismaService],
})
export class LabsModule {}
