import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { static as expressStatic } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
