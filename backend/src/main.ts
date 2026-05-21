import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cookieParser = require('cookie-parser');

  const configService = app.get(ConfigService);

  // Suporta múltiplas origens separadas por vírgula no CORS_ORIGIN
  // Ex: "https://trancadura.morea-ifs.org,http://localhost:3000"
  const rawOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
  const allowedOrigins = rawOrigin.split(',').map((o) => o.trim());

  console.log('🔐 CORS Origins permitidas:', allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (ex: Postman, chamadas server-side)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`❌ CORS bloqueado para origin: ${origin}`);
      return callback(new Error(`CORS bloqueado: origem não permitida - ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookie parser
  app.use(cookieParser());

  // Security (aplicado DEPOIS do CORS para não interferir nos headers)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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

  // WebSocket Adapter
  app.useWebSocketAdapter(new WsAdapter(app));

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
