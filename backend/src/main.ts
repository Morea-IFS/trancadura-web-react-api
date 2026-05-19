import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cookieParser = require('cookie-parser');

  const configService = app.get(ConfigService);
  //const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Security
  app.use(helmet());

  // Cookie parser
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Shutdown hooks
  app.enableShutdownHooks();

  process.on('SIGINT', () => {
    app.close();
  });

  process.on('SIGTERM', () => {
    app.close();
  });

  const port = Number(configService.get<string>('PORT')) || 8080;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on http://localhost:${port}/api`);
}

bootstrap();