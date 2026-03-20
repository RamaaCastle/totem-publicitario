import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const host = configService.get<string>('app.host', '0.0.0.0');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', ['http://localhost:3000']);
  const nodeEnv = configService.get<string>('app.env', 'development');

  // Security headers
  app.use(helmet.default({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow media files
    contentSecurityPolicy: false, // Next.js static export uses inline scripts
  }));

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: true, // throw on unknown properties
      transform: true,          // auto-transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global serializer (respects @Exclude decorators)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger (only in development)
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Signage Platform API')
      .setDescription('Professional Digital Signage Platform REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('organizations', 'Organization management')
      .addTag('screens', 'Screen/device management')
      .addTag('media', 'Media file management')
      .addTag('playlists', 'Playlist management')
      .addTag('campaigns', 'Campaign management')
      .addTag('devices', 'Player device endpoints')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs available at http://${host}:${port}/api/docs`);
  }

  // SPA fallback: serve index.html for any non-API, non-asset route not found by serve-static.
  // This allows Next.js client-side router to handle dynamic routes like /screens/:id.
  const publicDir = nodeEnv === 'production'
    ? join(__dirname, 'public')
    : join(__dirname, '../../admin/out');

  const server = app.getHttpAdapter().getInstance();
  server.get('*', (req: any, res: any, next: any) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/socket.io') ||
      /\.[^/]+$/.test(req.path)   // has file extension (js, css, png, etc.)
    ) {
      return next();
    }
    res.sendFile('index.html', { root: publicDir }, (err: any) => {
      if (err) next();
    });
  });

  await app.listen(port, host);
  logger.log(`🚀 Backend running on http://${host}:${port}/api/v1`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap();
