import { Module, Res } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { RolesModule } from './roles/roles.module';
import { ApproximationsModule } from './approximations/approximations.module';
import { LabsModule } from './labs/labs.module';
import { ReservationsModule } from './reservations/reservations.module';
import { MeteringModule } from './metering/metering.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    RolesModule,
    ApproximationsModule,
    LabsModule,
    ReservationsModule,
    MeteringModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
