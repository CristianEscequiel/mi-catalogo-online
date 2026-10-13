import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  // abortOnError:false deja que el error de configuración llegue al catch de abajo en vez de la traza de Nest.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { abortOnError: false });
  configureApp(app);
  await app.listen(Number(process.env.PORT ?? 3000));
}

// Una configuración inválida debe verse como un mensaje claro y terminar con código distinto de 0.
bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
