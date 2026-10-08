import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { static as expressStatic } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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

  const config = new DocumentBuilder().setTitle('Blogs API').setDescription('Vidriera API description').setVersion('1.0').build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: '/swagger/json',
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  const uploadsRoot = resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.use('/uploads', expressStatic(uploadsRoot));

  const corsOrigin = process.env.CORS_ORIGIN ?? '*';
  const origin = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((item) => item.trim());
  app.enableCors({
    origin,
  });

  // Detras de un unico nginx: req.ip toma la IP que ese proxy agrego a X-Forwarded-For.
  // Necesario para el limite por IP de /contact. Si se suma otro proxy/CDN, subir el valor.
  app.set('trust proxy', 1);

  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
