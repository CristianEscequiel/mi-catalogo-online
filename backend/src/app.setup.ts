import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { static as expressStatic } from 'express';
import { Env } from './env.model';
import { resolveCorsOrigins } from './config/cors';

// Cableado común de la aplicación: lo usan `main.ts` y las pruebas de integración,
// para que las pruebas armen exactamente la misma app que corre en producción.
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env>>(ConfigService);
  const nodeEnv = config.get('NODE_ENV', { infer: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // La documentación de la API no se publica en producción.
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder().setTitle('Blogs API').setDescription('Vidriera API description').setVersion('1.0').build();
    const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, documentFactory, {
      jsonDocumentUrl: '/swagger/json',
    });
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  const uploadsRoot = resolve(process.cwd(), config.get('UPLOADS_DIR', { infer: true }) ?? 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.use('/uploads', expressStatic(uploadsRoot));

  app.enableCors({
    origin: resolveCorsOrigins(config.get('CORS_ORIGIN', { infer: true }), nodeEnv),
  });

  // Detras de un unico nginx: req.ip toma la IP que ese proxy agrego a X-Forwarded-For.
  // Necesario para el limite por IP de /contact. Si se suma otro proxy/CDN, subir el valor.
  app.set('trust proxy', 1);
}
