import { Module } from '@nestjs/common';
import { ApproximationsController } from './approximations.controller';
import { ApproximationsService } from './approximations.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ApproximationsController],
  providers: [ApproximationsService, PrismaService],
})
export class ApproximationsModule {}
